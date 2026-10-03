// M2 Core: the backend for the M2 member app.
// The app talks to m2-join's /app, which passes the call to the Core. The Core answers what it can
// itself (sign-in, the member's details from the Core's own records, classes and bookings, doors,
// requests to reception) and passes everything else to the old Google service (Strava, Coach mode).
//
// Owners choose who is served by the Core (M2 App page): nobody yet, staff only, or everyone.
// Sessions are signed the same way as the Google service, with the same secret (APP_SESSION_SECRET
// in Cloudflare = SESSION_SECRET in the Google script), so members stay signed in either way and
// the switch can go back and forth at any time. Anything the Core can't do falls back to the old service.

const OLD_SERVICE = "https://script.google.com/macros/s/AKfycbwjnvxCFtmmERRtMVV6lXZBuuaOJxjkAikKKawqTXYJLFsS00v1LNIPb86q3ROPtROn/exec";
const GM = "https://m2trainingclub.gymmasteronline.com";
const GYM = { lat: -36.8658602, lng: 174.7642444 };
const SESSION_DAYS = 60;
const LATE_CANCEL_HOURS = 12;
const DOORS = ["front", "male", "female", "door4"];
const NATIVE = new Set(["login", "reset", "me", "classes", "book", "cancel", "warm", "request", "door", "account", "hold_request", "cancel_request"]);

export function makeApp(L) {
  const { nzDateTime, P } = L;
  const todayNz = () => nzDateTime(new Date()).slice(0, 10);
  const nzDay = ms => nzDateTime(new Date(ms)).slice(0, 10);
  const all = (env, sql, ...a) => env.DB.prepare(sql).bind(...a).all().then(r => r.results || []);
  const one = (env, sql, ...a) => env.DB.prepare(sql).bind(...a).first();
  const run = (env, sql, ...a) => env.DB.prepare(sql).bind(...a).run();
  const setting = async (env, k, d) => { const r = await one(env, "SELECT value FROM settings WHERE key = ?", k); return r ? r.value : d; };
  const setSetting = (env, k, v) => run(env, "INSERT INTO settings(key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value", k, String(v));

  /* ---------- sessions: identical to the Google service (HMAC-SHA256, web-safe base64 with padding) ---------- */
  const b64 = bytes => { let s = ""; for (const b of bytes) s += String.fromCharCode(b); return btoa(s).replace(/\+/g, "-").replace(/\//g, "_"); };
  const unb64 = s => { const t = atob(String(s).replace(/-/g, "+").replace(/_/g, "/")); return new Uint8Array([...t].map(c => c.charCodeAt(0))); };
  async function mac(env, data) {
    const k = await crypto.subtle.importKey("raw", new TextEncoder().encode(env.APP_SESSION_SECRET), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
    return b64(new Uint8Array(await crypto.subtle.sign("HMAC", k, new TextEncoder().encode(data))));
  }
  async function sign(env, obj) { const d = b64(new TextEncoder().encode(JSON.stringify(obj))); return d + "." + await mac(env, d); }
  async function verify(env, tok) {
    if (!env.APP_SESSION_SECRET || !tok || String(tok).indexOf(".") < 0) return null;
    const [d, m] = String(tok).split(".");
    if (await mac(env, d) !== m) return null;
    try { const o = JSON.parse(new TextDecoder().decode(unb64(d))); return o.m && o.exp && o.exp > Date.now() ? o : null; } catch { return null; }
  }

  /* ---------- limits (D1, so they hold across Cloudflare's machines) ---------- */
  async function tooMany(env, key, max, seconds) {
    const now = Math.floor(Date.now() / 1000);
    const r = await one(env, `INSERT INTO app_hits(k, n, until) VALUES (?, 1, ?) ON CONFLICT(k) DO UPDATE SET
      n = CASE WHEN app_hits.until < ? THEN 1 ELSE app_hits.n + 1 END, until = CASE WHEN app_hits.until < ? THEN excluded.until ELSE app_hits.until END RETURNING n`, key, now + seconds, now, now);
    return r && r.n > max;
  }

  /* ---------- GymMaster portal ---------- */
  async function gm(env, method, path, params, type) {
    let url = GM + path, init = { method: method.toUpperCase() };
    if (method === "get") url += "?" + new URLSearchParams(params).toString();
    else if (type === "json") init = { ...init, headers: { "Content-Type": "application/json" }, body: JSON.stringify(params) };
    else init = { ...init, headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams(Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)]))) };
    const r = await fetch(url, init);
    try { return JSON.parse(await r.text()); } catch { return null; }
  }
  async function memberToken(env, id) {
    const hit = await one(env, "SELECT token FROM app_tokens WHERE member_id = ? AND exp > ?", id, Date.now());
    if (hit) return hit.token;
    const r = await gm(env, "post", "/portal/api/v1/login", { api_key: env.GM_STAFF_KEY, memberid: id }, "form");
    const t = r && r.result && r.result.token;
    if (t) await run(env, "INSERT INTO app_tokens(member_id, token, exp) VALUES (?, ?, ?) ON CONFLICT(member_id) DO UPDATE SET token = excluded.token, exp = excluded.exp", id, t, Date.now() + 50 * 60_000);
    return t || null;
  }

  /* ---------- who the Core serves ---------- */
  async function isStaff(env, id) {
    const m = await one(env, "SELECT email FROM members WHERE id = ?", id);
    return !!(await one(env, "SELECT 1 FROM staff WHERE active = 1 AND (member_id = ? OR lower(email) = lower(?))", id, (m && m.email) || "-"));
  }
  async function servedByCore(env, memberId) {
    const mode = await setting(env, "app_mode", "off");
    if (!env.APP_SESSION_SECRET || !env.GM_STAFF_KEY || mode === "off") return false;
    if (mode === "all") return true;
    return memberId ? isStaff(env, memberId) : false;
  }

  async function forward(env, body) {
    const r = await fetch(OLD_SERVICE, { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify(body) });
    const t = await r.text();
    try { return JSON.parse(t); } catch { return { ok: false, message: "Couldn't reach M2. Check your signal and try again." }; }
  }

  // Entry point: one JSON body in, one JSON reply out.
  async function handle(env, body, ctx) {
    if (!body || typeof body !== "object") return { ok: false, message: "Bad request." };
    const a = String(body.action || "");
    const s = body.session ? await verify(env, body.session) : null;
    let core = false;
    if (NATIVE.has(a)) {
      if (a === "login" || a === "reset") core = !!env.APP_SESSION_SECRET && !!env.GM_STAFF_KEY && !!env.GM_API_KEY && (await setting(env, "app_mode", "off")) !== "off";
      else core = !!s && await servedByCore(env, s.m).catch(() => false);
      if (a === "door" && core && !(await doorNo(env, body.door))) core = false;
    }
    let out = null, by = "google";
    if (core) {
      try { out = await native(env, a, body, s); if (out) by = "core"; }
      catch (e) { console.log("app", a, String(e && e.stack || e)); out = null; }
    }
    const t0 = Date.now();
    if (!out) out = await forward(env, body);
    const ms = Date.now() - t0;
    if (ctx && ctx.waitUntil) ctx.waitUntil(Promise.all([note(env, a, s, out, by, !!body.session).catch(() => {}), logCall(env, a, s, out, by, ms).catch(() => {})]));
    else { await note(env, a, s, out, by, !!body.session).catch(() => {}); await logCall(env, a, s, out, by, ms).catch(() => {}); }
    return out;
  }

  // Last week of app calls (no passwords, no message text), for fixing problems.
  async function logCall(env, a, s, out, by, ms) {
    const sum = !out ? "" : a === "classes" ? (out.classes || []).length + " classes, " + (out.classes || []).filter(c => c.bookedId).length + " booked" : String(out.message || "").slice(0, 120);
    await run(env, "INSERT INTO app_log(member_id, action, via, ok, signin, note, ms) VALUES (?, ?, ?, ?, ?, ?, ?)", s ? s.m : null, a.slice(0, 20), by, out && out.ok ? 1 : 0, out && out.signin ? 1 : 0, sum, ms);
    if (Math.random() < 0.02) await run(env, "DELETE FROM app_log WHERE at < datetime('now', '-7 days')");
  }
  // Keep a light record: who uses the app, and which doors the old service has switched on.
  async function note(env, a, s, out, by, hadSession) {
    const id = s ? s.m : (a === "login" && out && out.ok && out.session ? ((await verify(env, out.session)) || {}).m : null);
    if (id) await run(env, "UPDATE members SET app_installed = 1 WHERE id = ? AND coalesce(app_installed, 0) = 0", id);
    if (id && (a === "me" || a === "login")) await run(env, "INSERT INTO app_seen(member_id, day, via) VALUES (?, ?, ?) ON CONFLICT(member_id, day) DO UPDATE SET via = excluded.via", id, todayNz(), by);
    if (a === "me" && by === "google" && out && out.ok && out.doors) await setSetting(env, "app_doors_seen", JSON.stringify(out.doors));
    // Proof the shared secret is right: the Google service accepted a session, and the Core could read it too.
    if (by === "google" && hadSession && out && out.ok && !out.signin && env.APP_SESSION_SECRET) await setSetting(env, "app_secret_check", (s ? "match " : "nomatch ") + new Date().toISOString());
  }

  async function native(env, a, b, s) {
    if (a === "login") return login(env, b);
    if (a === "reset") { if (!b.email) return { ok: false, message: "Pop in your email first." };
      if (await tooMany(env, "reset:" + String(b.email).toLowerCase(), 3, 3600)) return { ok: true };
      await gm(env, "post", "/portal/api/v1/email/resetpassword", { api_key: env.GM_API_KEY, email: b.email }, "form"); return { ok: true }; }
    if (a === "warm") { await memberToken(env, s.m); return { ok: true }; }
    if (a === "me") return me(env, s);
    if (a === "classes") return classes(env, s);
    if (a === "book") return book(env, s, b);
    if (a === "cancel") return cancel(env, s, b);
    if (a === "request") return request(env, s, b);
    if (a === "door") return door(env, s, b);
    if (a === "account") return account(env, s);
    if (a === "hold_request") return holdRequest(env, s, b);
    if (a === "cancel_request") return cancelRequest(env, s, b);
    return null;
  }

  async function login(env, b) {
    if (!b.email || !b.password) return { ok: false, message: "Pop in your email and password." };
    if (await tooMany(env, "login:all", 300, 3600)) return { ok: false, message: "Sign-in is busy right now. Try again in a few minutes." };
    if (await tooMany(env, "login:" + String(b.email).toLowerCase(), 8, 600)) return { ok: false, message: "Too many tries. Give it 10 minutes, or see reception." };
    const r = await gm(env, "post", "/portal/api/v1/login", { api_key: env.GM_API_KEY, email: b.email, password: b.password }, "form");
    if (!r || !r.result || !r.result.token) return null; // let the old service answer, in case it's a key problem rather than the password
    const id = +r.result.memberid;
    if (!(await servedByCore(env, id))) return null; // staff-only test: everyone else signs in through the old service as before
    const m = await one(env, "SELECT gender, email FROM members WHERE id = ?", id);
    const st = await staffOf(env, id, m && m.email);
    return { ok: true, session: await sign(env, { m: id, exp: Date.now() + SESSION_DAYS * 864e5 }), gender: gender(m && m.gender), coach: st.coach, staff: st.staff };
  }
  const gender = g => { g = String(g || "").toLowerCase(); return g[0] === "m" ? "m" : g[0] === "f" || g[0] === "w" ? "f" : null; };
  async function staffOf(env, id, email) {
    const s = await one(env, "SELECT role FROM staff WHERE active = 1 AND (member_id = ? OR lower(email) = lower(?))", id, email || "-");
    const staffPlan = await one(env, "SELECT 1 FROM memberships ms JOIN plans p ON p.id = ms.plan_id WHERE ms.member_id = ? AND ms.status = 'current' AND (p.family = 'staff' OR lower(p.gm_type_name) LIKE '%staff%')", id);
    return { coach: !!s && ["owner", "trainer", "coach"].includes(s.role), staff: !!s || !!staffPlan };
  }

  /* ---------- member details, from the Core's own records ---------- */
  function kindOf(name, custom) {
    let n = String(name); if (custom[n]) return custom[n]; n = n.toLowerCase();
    if (/staff|coach|trainer/.test(n)) return "perform";
    if (/passport/.test(n)) return "fp";
    if (/gateway/.test(n)) return "perform";
    if (/\bentry\b/.test(n)) return "daily";
    if (/trial|days?\b|bucks|free|hour|\$/.test(n)) return "trial";
    if (/trip|pass|8wc|challenge|casual/.test(n)) return "pass";
    if (/perform/.test(n)) return "perform";
    if (/class/.test(n)) return "classes";
    if (/recovery/.test(n)) return "recovery";
    if (/daily|gym/.test(n)) return "daily";
    return null;
  }
  function tierOf(ms, custom) {
    const order = ["perform", "fp", "trial", "pass", "classes", "recovery", "daily"];
    const tagged = ms.map(m => ({ m, k: kindOf(m.name, custom) })).filter(x => x.k);
    let best = null;
    for (const k of order) { best = tagged.find(x => x.k === k); if (best) break; }
    if (!best) return { tier: ms.length ? "daily" : null, pass: null };
    if (best.k !== "trial" && best.k !== "pass") return { tier: best.k, pass: null };
    const m = best.m, t = todayNz();
    const left = m.end && /^\d{4}-\d{2}-\d{2}/.test(m.end) ? Math.round((Date.parse(m.end.slice(0, 10)) - Date.parse(t)) / 864e5) + 1 : null;
    const visitsLeft = +m.limit > 0 ? Math.max(0, +m.limit - (+m.used || 0)) : null;
    return { tier: "trial", pass: { kind: best.k, name: m.name, end: m.end, left, visitsLeft, other: tagged.some(x => x.k !== "trial" && x.k !== "pass") } };
  }
  async function doorFlags(env) {
    const o = {};
    for (const k of DOORS) o[k] = !!(await doorNo(env, k));
    if (DOORS.some(k => o[k])) return o;
    try { return JSON.parse(await setting(env, "app_doors_seen", "null")) || o; } catch { return o; }
  }
  async function me(env, s) {
    const m = await one(env, "SELECT * FROM members WHERE id = ?", s.m);
    if (!m) return null; // joined today and not copied yet: the old service answers
    const ms = (await all(env, `SELECT p.gm_type_name name, ms.start_date start, ms.end_date end FROM memberships ms JOIN plans p ON p.id = ms.plan_id
                                WHERE ms.member_id = ? AND ms.status IN ('current', 'frozen') ORDER BY ms.start_date`, s.m)).map(x => ({ ...x, used: null, limit: null }));
    const since = nzDay(Date.now() - 400 * 864e5);
    const days = (await all(env, `SELECT substr(at, 1, 10) d, count(*) v, sum(CASE WHEN lower(coalesce(door, '')) LIKE '%recovery%' THEN 1 ELSE 0 END) w
                                  FROM visits WHERE member_id = ? AND at >= ? GROUP BY substr(at, 1, 10) ORDER BY d`, s.m, since));
    const total = (await one(env, "SELECT count(*) n FROM visits WHERE member_id = ?", s.m)).n;
    let custom = {}; try { custom = JSON.parse(await setting(env, "app_tier_map", "{}")); } catch {}
    const st = await staffOf(env, s.m, m.email), tr = tierOf(ms, custom);
    return { ok: true,
      member: { id: s.m, first: m.preferred_name || m.first_name || "", last: m.last_name || "", email: m.email || "", phone: m.mobile || "",
        gender: gender(m.gender), photo: /^https?:/.test(m.photo_url || "") ? m.photo_url : "", since: m.joined_on || "",
        totalvisits: Math.max(+m.total_visits_gm || 0, total), totalclasses: 0, totalpts: 0, coach: st.coach, staff: st.staff },
      memberships: ms, doors: await doorFlags(env), tier: tr.tier, pass: tr.pass, days, source: "core" };
  }

  /* ---------- classes and bookings: GymMaster's timetable while it runs the classes ---------- */
  function flatten(r) {
    const out = [];
    (function walk(x, d) {
      if (!x || d > 4) return;
      if (Array.isArray(x)) return x.forEach(i => walk(i, d + 1));
      if (typeof x === "object") { if (x.starttime && (x.arrival || x.day || x.date)) { if (!x.arrival) x.arrival = x.day || x.date; out.push(x); return; } Object.values(x).forEach(v => walk(v, d + 1)); }
    })(r, 0);
    return out;
  }
  // Only real cancel flags. (GymMaster also sends cancelmode, cancelfee and cancelbenefitloss on live bookings.)
  function cancelled(c) {
    const yes = v => v === true || v === 1 || /^(1|t|true|y|yes)$/i.test(String(v ?? ""));
    if (yes(c.is_cancelled) || yes(c.cancelled) || yes(c.deleted) || yes(c.void)) return true;
    return /cancel|void|delet/i.test(String(c.status || "") + " " + String(c.resulttext || ""));
  }
  async function classes(env, s) {
    const tok = await memberToken(env, s.m); if (!tok) return null;
    const key = env.GM_STAFF_KEY, t = todayNz(), nw = nzDay(Date.now() + 7 * 864e5);
    const [r1, r2, mine] = await Promise.all([
      gm(env, "get", "/portal/api/v2/booking/classes", { api_key: key, token: tok, week: t }),
      gm(env, "get", "/portal/api/v2/booking/classes", { api_key: key, token: tok, week: nw }),
      gm(env, "get", "/portal/api/v2/member/bookings", { api_key: key, token: tok })]);
    const seen = {}, list = [];
    for (const c of flatten((r1 || {}).result ?? r1).concat(flatten((r2 || {}).result ?? r2))) { const k = (c.id || "") + "|" + (c.arrival || "") + "|" + (c.starttime || ""); if (!seen[k]) { seen[k] = 1; list.push(c); } }
    if (!list.length) return null;
    const src = (mine && (mine.result || mine)) || {};
    return { ok: true,
      classes: list.map(c => ({ id: c.id, name: c.classname || c.bookingname || c.name, classid: c.classid, day: String(c.arrival || "").slice(0, 10),
        start: String(c.starttime || "").slice(0, 5), end: String(c.endtime || "").slice(0, 5), coach: c.staffname || "", coachPhoto: c.staffphoto || "",
        desc: c.description || c.online_instruction || "", max: +c.max_students || 0, num: +c.num_students || 0, free: c.spacesfree != null ? +c.spacesfree : null,
        bookedId: c.already_booked_id || null, bookable: c.bookable !== false, avail: c.availability || "", waitCount: +c.waitlist_count || 0,
        maxWait: +c.max_waitinglist || 0, loc: c.location || "" })),
      booked: (src.classbookings || []).filter(c => !cancelled(c)).map(c => ({ id: c.id, day: c.day, start: String(c.starttime || "").slice(0, 5), name: c.name, parent: c.parentid })),
      waits: (src.classwaitlists || []).map(w => ({ id: w.id, day: w.day, start: String(w.starttime || "").slice(0, 5), name: w.name, pos: w.priority })), debug: null };
  }
  async function book(env, s, b) {
    if (await tooMany(env, "book:" + s.m, 20, 600)) return { ok: false, message: "Easy, give it a minute and try again." };
    const tok = await memberToken(env, s.m); if (!tok) return null;
    const r = await gm(env, "post", "/portal/api/v2/booking/classes", { api_key: env.GM_STAFF_KEY, token: tok, bookings: [{ bookingparentid: +b.id }] }, "json");
    if (!r) return null;
    if (r.error) return { ok: false, message: String(r.error) };
    return { ok: true, result: r.result };
  }
  async function cancel(env, s, b) {
    // A late cancel goes through the old service, which keeps the no-show and late-cancel tally for Coach mode.
    if (!b.waitlist && b.day && b.start) {
      const [h, mi] = String(b.start).split(":").map(Number), at = Date.parse(b.day + "T" + String(h).padStart(2, "0") + ":" + String(mi || 0).padStart(2, "0") + ":00+13:00");
      if (at > Date.now() && at - Date.now() < (LATE_CANCEL_HOURS + 1) * 3600e3) return null;
    }
    const tok = await memberToken(env, s.m); if (!tok) return null;
    const r = await gm(env, "post", "/portal/api/v1/member/cancelbooking", { api_key: env.GM_STAFF_KEY, token: tok, bookingid: String(b.id).replace(/\D/g, ""), waitlist: b.waitlist ? 1 : 0 }, "form");
    if (!r) return null;
    if (r.error) return { ok: false, message: String(r.error) };
    return { ok: true, late: false };
  }

  /* ---------- requests to reception: land in the Core, with a push to the owners and manager ---------- */
  const KINDS = { delete: "Delete my account", feedback: "App feedback", upgrade: "Membership upgrade request" };
  async function request(env, s, b) {
    if (await tooMany(env, "req:" + s.m, 5, 3600)) return { ok: false, message: "We've got your message already. Reception will be in touch." };
    const kind = KINDS[b.kind] ? b.kind : "feedback", text = String(b.text || "").slice(0, 2000);
    const m = await one(env, "SELECT first_name, last_name FROM members WHERE id = ?", s.m);
    if (!m) return null;
    await run(env, "INSERT INTO app_requests(member_id, kind, text) VALUES (?, ?, ?)", s.m, kind, text);
    await run(env, "INSERT INTO activity(member_id, kind, detail) VALUES (?, 'app', ?)", s.m, KINDS[kind] + " from the app" + (text ? ": " + text.slice(0, 300) : ""));
    const to = (await all(env, "SELECT id FROM staff WHERE active = 1 AND role IN ('owner', 'manager')")).map(r => r.id);
    if (P) await P.toStaff(env, to, { title: KINDS[kind] + ": " + [m.first_name, m.last_name].filter(Boolean).join(" "), body: (text || "Sent from the M2 app.").slice(0, 140), url: "/#app", tag: "app-req" }).catch(() => {});
    return { ok: true };
  }


  /* ---------- the member's own membership: what they owe, next payment, holds and cancelling ---------- */
  const HOLD_WHY = ["Travel", "Injury or illness", "Work", "Money is tight", "Other"];
  const CANCEL_WHY = ["Moving away", "Cost", "Not using it enough", "Injury or illness", "Joined another gym", "Other"];
  const money = v => { const n = parseFloat(String(v ?? "").replace(/[^0-9.\-]/g, "")); return Number.isFinite(n) ? Math.round(n * 100) / 100 : null; };
  async function bankUrl(env, id) {
    if ((env.BILLING_MODE || "gymmaster") !== "ezidebit" || !env.EZIDEBIT_EDDR_BASE || !env.EZIDEBIT_PUBLIC_KEY) return null;
    const m = await one(env, "SELECT id, first_name, last_name, email, mobile FROM members WHERE id = ?", id);
    const u = new URL(env.EZIDEBIT_EDDR_BASE);
    const set = (k, v) => { if (v !== undefined && v !== null && v !== "") u.searchParams.set(k, String(v)); };
    set("a", env.EZIDEBIT_PUBLIC_KEY); set("uRef", "M2-" + m.id); set("businessOrPerson", 1); set("fName", m.first_name); set("lName", m.last_name);
    set("email", m.email); set("mobile", m.mobile); set("ed", 1);
    set("callback", (env.PUBLIC_URL || "https://m2-join.taylor-3e5.workers.dev").replace(/\/$/, "") + "/billing-done?member=" + m.id);
    return u.toString();
  }
  async function account(env, s) {
    const m = await one(env, "SELECT id, first_name FROM members WHERE id = ?", s.m);
    if (!m) return null;
    const ms = await all(env, `SELECT p.gm_type_name name, p.family, p.frequency, p.flexi, ms.price, ms.start_date, ms.min_term_end, ms.end_date, ms.status, ms.freeze_from, ms.freeze_to, ms.billed_by
                               FROM memberships ms JOIN plans p ON p.id = ms.plan_id WHERE ms.member_id = ? AND ms.status IN ('current', 'frozen') ORDER BY ms.start_date`, s.m);
    const t = todayNz();
    let owing = null, next = null, live = false;
    try {
      const tok = await memberToken(env, s.m);
      const r = tok && await gm(env, "get", "/portal/api/v1/member/outstandingbalance", { api_key: env.GM_STAFF_KEY, token: tok });
      if (r && r.owingamount !== undefined) { owing = money(r.owingamount); next = r.next_bill || null; live = true; }
    } catch {}
    if (!live) {
      const b = await one(env, "SELECT a.balance_owing, c.owing, c.next_bill FROM members m LEFT JOIN billing_accounts a ON a.member_id = m.id LEFT JOIN balance_checks c ON c.member_id = m.id WHERE m.id = ?", s.m);
      if (b) { owing = b.owing != null ? b.owing : b.balance_owing; next = b.next_bill || null; }
    }
    if (next && /unable|no default/i.test(next)) next = null;
    const hold = await one(env, "SELECT starts, ends, reason FROM gm_holds WHERE member_id = ? AND (ends IS NULL OR ends >= ?) ORDER BY starts LIMIT 1", s.m, t);
    const open = await all(env, "SELECT kind, text, at FROM app_requests WHERE member_id = ? AND kind IN ('hold', 'cancel') AND done_at IS NULL ORDER BY id DESC", s.m);
    const cancelling = await one(env, "SELECT cancel_date FROM gm_cancels WHERE member_id = ? AND (cancel_date IS NULL OR cancel_date >= ?) ORDER BY cancel_date DESC LIMIT 1", s.m, t);
    const passport = ms.some(x => x.family === "passport"), billed = ms.some(x => x.billed_by === "ezidebit");
    return { ok: true,
      memberships: ms.map(x => ({ name: x.name, price: x.price, frequency: x.frequency, flexi: !!x.flexi, start: x.start_date, lockin: x.min_term_end && x.min_term_end > t ? x.min_term_end : null,
        end: x.end_date, status: x.status })),
      owing: owing && owing > 0 ? owing : 0, next, hold, cancelling: cancelling ? (cancelling.cancel_date || "soon") : null,
      requests: open.map(r => ({ kind: r.kind, at: r.at })),
      can_hold: billed && !passport && !hold, can_cancel: billed && !passport && !cancelling,
      passport, bank_url: billed ? await bankUrl(env, s.m) : null, hold_why: HOLD_WHY, cancel_why: CANCEL_WHY };
  }
  async function newRequest(env, s, kind, text, title) {
    if (await tooMany(env, "req:" + s.m, 5, 3600)) return { ok: false, message: "We've got your request already. Reception will be in touch." };
    if (await one(env, "SELECT 1 FROM app_requests WHERE member_id = ? AND kind = ? AND done_at IS NULL", s.m, kind)) return { ok: false, message: "You've already sent one of these. The team will be in touch." };
    const m = await one(env, "SELECT first_name, last_name FROM members WHERE id = ?", s.m);
    if (!m) return null;
    await run(env, "INSERT INTO app_requests(member_id, kind, text) VALUES (?, ?, ?)", s.m, kind, text);
    await run(env, "INSERT INTO activity(member_id, kind, detail) VALUES (?, 'app', ?)", s.m, title + " from the app: " + text.slice(0, 300));
    const to = (await all(env, "SELECT id FROM staff WHERE active = 1 AND role IN ('owner', 'manager')")).map(r => r.id);
    if (P) await P.toStaff(env, to, { title: title + ": " + [m.first_name, m.last_name].filter(Boolean).join(" "), body: text.slice(0, 140), url: "/#today", tag: "app-" + kind }).catch(() => {});
    return { ok: true };
  }
  const isDay = d => /^\d{4}-\d{2}-\d{2}$/.test(String(d || ""));
  async function holdRequest(env, s, b) {
    const t = todayNz();
    if (!isDay(b.from) || !isDay(b.to)) return { ok: false, message: "Pick the dates for your hold." };
    if (b.from < t) return { ok: false, message: "The hold can start today or later." };
    if (b.to <= b.from) return { ok: false, message: "The end date needs to be after the start." };
    if ((Date.parse(b.to) - Date.parse(b.from)) / 864e5 > 186) return { ok: false, message: "Holds can be up to 6 months. Talk to reception about anything longer." };
    if (!HOLD_WHY.includes(b.reason)) return { ok: false, message: "Pick a reason." };
    const note = String(b.note || "").trim().slice(0, 500);
    if (b.reason === "Other" && !note) return { ok: false, message: "Tell us a bit about why." };
    return newRequest(env, s, "hold", "Hold " + b.from + " to " + b.to + ". Reason: " + b.reason + (note ? ". " + note : ""), "Hold request");
  }
  async function cancelRequest(env, s, b) {
    if (!CANCEL_WHY.includes(b.reason)) return { ok: false, message: "Pick a reason." };
    const note = String(b.note || "").trim().slice(0, 500);
    if (b.reason === "Other" && !note) return { ok: false, message: "Tell us a bit about why." };
    return newRequest(env, s, "cancel", "Reason: " + b.reason + (note ? ". " + note : ""), "Cancel request");
  }

  /* ---------- doors: GymMaster's kiosk check-in while GymMaster runs the gate ---------- */
  async function doorNo(env, k) { if (!DOORS.includes(k)) return null; const v = await setting(env, "app_door_" + k, ""); return +v || null; }
  function distM(a, b, c, d) { const R = 6371e3, r = x => x * Math.PI / 180, x = Math.sin(r(c - a) / 2) ** 2 + Math.cos(r(a)) * Math.cos(r(c)) * Math.sin(r(d - b) / 2) ** 2; return 2 * R * Math.asin(Math.sqrt(x)); }
  async function door(env, s, b) {
    const no = await doorNo(env, b.door); if (!no) return null;
    const radius = +(await setting(env, "app_geo_radius", "150")) || 150;
    const dist = distM(+b.lat, +b.lng, GYM.lat, GYM.lng), slack = Math.min(+b.acc || 0, 150);
    if (!Number.isFinite(dist) || dist - slack > radius) return { ok: false, message: "You need to be at the club to open doors." };
    if (await tooMany(env, "door:" + s.m, 6, 60)) return { ok: false, message: "Easy, give it a few seconds and try again." };
    const tok = await memberToken(env, s.m); if (!tok) return { ok: false, message: "We couldn't reach GymMaster. Reception can let you in." };
    const field = await setting(env, "app_door_field", "doorid");
    const r = await gm(env, "post", "/portal/api/v2/member/kiosk/checkin", { api_key: env.GM_STAFF_KEY, token: tok, [field]: no }, "json");
    const res = r && r.result && (r.result.response || r.result), ok = !!res && +res.access_state === 1;
    const why = res ? (res.denied_reason || res.message || "") : (r && r.error) || "no response";
    await run(env, "INSERT INTO app_doors(member_id, door, opened, note, metres) VALUES (?, ?, ?, ?, ?)", s.m, b.door, ok ? 1 : 0, String(why).slice(0, 200), Math.round(dist));
    if (ok) return { ok: true, message: res.message || "Door open." };
    return { ok: false, message: res && res.denied_reason ? res.denied_reason + ". Reception can help." : "That door didn't open. Reception can help." };
  }

  /* ---------- the owners' M2 App page ---------- */
  async function overview(env, can) {
    if (!can.settings) return { error: "Owners only" };
    const doors = {}; for (const k of DOORS) doors[k] = await setting(env, "app_door_" + k, "");
    const week = nzDay(Date.now() - 6 * 864e5);
    return {
      mode: await setting(env, "app_mode", "off"),
      secret_check: await setting(env, "app_secret_check", ""),
      ready: { secret: !!env.APP_SESSION_SECRET, staff_key: !!env.GM_STAFF_KEY, member_key: !!env.GM_API_KEY },
      doors, door_field: await setting(env, "app_door_field", "doorid"), doors_seen: await setting(env, "app_doors_seen", ""),
      users: { ever: (await one(env, "SELECT count(*) n FROM members WHERE app_installed = 1")).n,
               week: (await one(env, "SELECT count(DISTINCT member_id) n FROM app_seen WHERE day >= ?", week)).n,
               week_core: (await one(env, "SELECT count(DISTINCT member_id) n FROM app_seen WHERE day >= ? AND via = 'core'", week)).n },
      requests: await all(env, `SELECT r.id, r.member_id, r.kind, r.text, r.at, r.done_at, m.first_name, m.last_name, s.name done_by FROM app_requests r
                                LEFT JOIN members m ON m.id = r.member_id LEFT JOIN staff s ON s.id = r.done_by ORDER BY r.done_at IS NOT NULL, r.id DESC LIMIT 60`),
      door_log: await all(env, `SELECT d.at, d.member_id, d.door, d.opened, d.note, d.metres, m.first_name, m.last_name FROM app_doors d LEFT JOIN members m ON m.id = d.member_id ORDER BY d.id DESC LIMIT 40`),
    };
  }
  async function save(env, who, can, b) {
    if (!can.settings) return { ok: false, error: "Owners only" };
    if (b.mode !== undefined) {
      if (!["off", "staff", "all"].includes(b.mode)) return { ok: false, error: "Pick who the Core serves." };
      if (b.mode !== "off" && !env.APP_SESSION_SECRET) return { ok: false, error: "Add the APP_SESSION_SECRET secret in Cloudflare first (see the steps on this page)." };
      if (b.mode !== "off" && /^nomatch/.test(await setting(env, "app_secret_check", ""))) return { ok: false, error: "APP_SESSION_SECRET doesn't match the Google script's SESSION_SECRET yet. Copy it again, open the app once, then switch on." };
      await setSetting(env, "app_mode", b.mode);
    }
    if (b.doors) for (const k of DOORS) if (b.doors[k] !== undefined) {
      const v = String(b.doors[k]).trim();
      if (v && !/^\d{1,6}$/.test(v)) return { ok: false, error: "Door numbers are whole numbers from GymMaster, like 1." };
      await setSetting(env, "app_door_" + k, v);
    }
    if (b.door_field !== undefined) await setSetting(env, "app_door_field", /^[a-z_]{2,20}$/.test(b.door_field) ? b.door_field : "doorid");
    await run(env, "INSERT INTO activity(staff_id, kind, detail) VALUES (?, 'settings', ?)", who.id, "M2 App settings changed" + (b.mode ? ": served by the Core for " + ({ off: "nobody", staff: "staff only", all: "everyone" })[b.mode] : ""));
    return { ok: true };
  }
  async function doneRequest(env, who, can, id) {
    if (!can.settings) return { ok: false, error: "Owners only" };
    await run(env, "UPDATE app_requests SET done_at = datetime('now'), done_by = ? WHERE id = ? AND done_at IS NULL", who.id, id);
    return { ok: true };
  }
  // Owners only: what the app would get from the Core for a member, without signing in as them.
  // Owners only: ask both sides what the app gets for a member (read-only: classes or me), to compare.
  async function test(env, can, id, action) {
    if (!can.settings) return { error: "Owners only" };
    if (!["classes", "me"].includes(action)) return { error: "classes or me only" };
    const session = await sign(env, { m: id, exp: Date.now() + 60_000 });
    const g = await forward(env, { action, session });
    let c = null; try { c = await native(env, action, { action, session }, { m: id }); } catch (e) { c = { error: String(e) }; }
    const sum = r => !r ? null : action === "classes" ? { ok: r.ok, message: r.message, n: (r.classes || []).length, booked: r.booked, waits: r.waits,
      mine: (r.classes || []).filter(x => x.bookedId).map(x => [x.day, x.start, x.name, x.bookedId, x.num + "/" + x.max]) } : { ok: r.ok, tier: r.tier, ms: r.memberships, days: (r.days || []).length, staff: r.member && r.member.staff };
    const seen = await all(env, "SELECT at, member_id, action, via, ok, signin, note FROM app_log ORDER BY id DESC LIMIT 25");
    return { google: sum(g), core: sum(c), seen };
  }
  async function preview(env, can, id) {
    if (!can.settings) return { error: "Owners only" };
    return (await me(env, { m: id })) || { error: "That member isn't in the Core yet." };
  }

  return { handle, overview, save, doneRequest, preview, test, _sign: sign, _verify: verify };
}
