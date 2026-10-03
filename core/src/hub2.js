// M2 Core: everyone in GymMaster, leads from every source, visits, classes history,
// Passport insights, the member card wall, contracts and the owners' deeper pages.

export function makeHub2(L) {
  const { nzDateTime, gmCall, gmMemberToken, passportPay, normMobile } = L;
  const todayNz = () => nzDateTime(new Date()).slice(0, 10);
  const addDays = (iso, n) => new Date(new Date(iso.slice(0, 10) + "T12:00:00Z").getTime() + n * 86400_000).toISOString().slice(0, 10);
  const all = (env, sql, ...a) => env.DB.prepare(sql).bind(...a).all().then(r => r.results || []);
  const one = (env, sql, ...a) => env.DB.prepare(sql).bind(...a).first();
  const setting = async (env, key, dflt) => (await one(env, "SELECT value FROM settings WHERE key = ?", key))?.value ?? dflt;
  const setSetting = (env, key, v) => env.DB.prepare("INSERT INTO settings(key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value").bind(key, String(v)).run();
  const num = v => { const n = parseFloat(String(v ?? "").replace(/[^0-9.\-]/g, "")); return Number.isFinite(n) ? n : 0; };

  /* ---------------- everyone in GymMaster ---------------- */
  // GymMaster's member list (staff key) has every person ever: members, people who left and
  // prospects, with their status and photo. The full list is about 7,000 people and 4 MB,
  // so the browser drives it in chunks: start (fetch and park it), apply each chunk, finish.

  const ACTIVE = ["Current", "Gifted Time", "Concession Pack", "Hold"];
  function rosterRow(g) {
    const photo = g.memberphoto && !/m-img\/?$/.test(g.memberphoto) ? g.memberphoto : null;
    return [+g.id, g.firstname ?? g.first_name ?? "", g.surname ?? g.last_name ?? "", (g.email || "").toLowerCase() || null,
            normMobile(g.phonecell ?? g.cellphone ?? g.mobile ?? "") || null, g.dob || null, g.gender || null,
            g.joindate || null, g.created || null, g.isprospect ? 1 : 0, g.status || null, g.addresssuburb || null,
            photo, g.goal || null, g.company_name || null];
  }
  function rosterStatements(db, r) {
    const [id, first, last, email, mobile, dob, gender, joined, created, prospect, gmStatus, suburb, photo, goal, company] = r;
    const status = ACTIVE.includes(gmStatus) ? "active" : prospect ? "prospect" : /expired/i.test(gmStatus || "") ? "former" : "prospect";
    return [
      db.prepare(`INSERT INTO members(id, gm_id, first_name, last_name, email, mobile, dob, gender, suburb, photo_url, joined_on, status)
                  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                  ON CONFLICT(id) DO UPDATE SET first_name = excluded.first_name, last_name = excluded.last_name,
                    email = coalesce(excluded.email, members.email), mobile = coalesce(excluded.mobile, members.mobile),
                    dob = coalesce(excluded.dob, members.dob), gender = coalesce(excluded.gender, members.gender),
                    suburb = coalesce(excluded.suburb, members.suburb), photo_url = excluded.photo_url,
                    joined_on = coalesce(members.joined_on, excluded.joined_on), status = excluded.status,
                    updated_at = CASE WHEN members.status <> excluded.status OR coalesce(members.photo_url,'') <> coalesce(excluded.photo_url,'')
                                      THEN datetime('now') ELSE members.updated_at END`)
        .bind(id, id, first || "Unknown", last, email, mobile, dob, gender, suburb, photo, prospect && !ACTIVE.includes(gmStatus) ? null : joined, status),
      db.prepare(`INSERT INTO member_gm(member_id, gm_status, is_prospect, created, goal, company, updated_at) VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
                  ON CONFLICT(member_id) DO UPDATE SET gm_status = excluded.gm_status, is_prospect = excluded.is_prospect,
                    created = coalesce(excluded.created, member_gm.created), goal = excluded.goal, company = excluded.company, updated_at = excluded.updated_at`)
        .bind(id, gmStatus, prospect, created, goal, company),
    ];
  }
  async function applyRows(env, rows) {
    const stmts = [];
    for (const r of rows) if (r[0]) stmts.push(...rosterStatements(env.DB, r));
    for (let i = 0; i < stmts.length; i += 100) await env.DB.batch(stmts.slice(i, i + 100));
    return rows.length;
  }

  async function rosterStart(env) {
    if (!env.GM_STAFF_KEY) return { ok: false, error: "GM_STAFF_KEY is not set" };
    const d = await gmCall(env, "v1", "/members", { auth: "high", params: { when: "2015-01-01 00:00:00" } });
    if (!Array.isArray(d.result)) return { ok: false, error: "GymMaster: " + (d.error || "no list came back") };
    const rows = d.result.map(rosterRow).filter(r => r[0]);
    const size = 150, stmts = [env.DB.prepare("DELETE FROM roster_chunks")];
    for (let i = 0; i < rows.length; i += size) stmts.push(env.DB.prepare("INSERT INTO roster_chunks(id, json) VALUES (?, ?)").bind(i / size, JSON.stringify(rows.slice(i, i + size))));
    for (let i = 0; i < stmts.length; i += 40) await env.DB.batch(stmts.slice(i, i + 40));
    const statuses = {};
    for (const r of rows) { const k = r[9] && !ACTIVE.includes(r[10]) ? "Prospect" : (r[10] || "Unknown"); statuses[k] = (statuses[k] || 0) + 1; }
    return { ok: true, chunks: Math.ceil(rows.length / size), people: rows.length, statuses };
  }
  async function rosterApply(env, chunk) {
    const c = await one(env, "SELECT json FROM roster_chunks WHERE id = ?", +chunk);
    if (!c) return { ok: false, error: "That chunk isn't there. Start again." };
    return { ok: true, done: await applyRows(env, JSON.parse(c.json)) };
  }
  async function rosterFinish(env) {
    await env.DB.prepare("DELETE FROM roster_chunks").run();
    await env.DB.prepare("INSERT INTO sync_log(source, started_at, finished_at, ok) VALUES ('gymmaster_everyone', datetime('now'), datetime('now'), 1)").run();
    const leads = await rebuildLeads(env);
    const n = await one(env, "SELECT sum(status = 'active') active, sum(status = 'prospect') prospects, sum(status = 'former') former FROM members");
    return { ok: true, ...n, leads };
  }
  // Nightly: only people changed since the last good copy.
  async function rosterDelta(env, since) {
    const d = await gmCall(env, "v1", "/members", { auth: "high", params: { when: since } });
    if (!Array.isArray(d.result)) throw new Error("GymMaster: " + (d.error || "no list came back"));
    const rows = d.result.map(rosterRow).filter(r => r[0]);
    await applyRows(env, rows);
    return rows.length;
  }

  /* ---------------- leads from every source ---------------- */
  async function rebuildLeads(env) {
    const db = env.DB;
    const res = {};
    // 1. GymMaster prospects from the last 6 months (online sign-ups that didn't finish, enquiries, walk-ins).
    res.prospects = (await db.prepare(`INSERT INTO leads(member_id, name, email, mobile, kind, source, stage, created_at)
        SELECT m.id, trim(m.first_name || ' ' || coalesce(m.last_name,'')), m.email, m.mobile, 'prospect', 'GymMaster prospect',
               CASE WHEN g.created >= date('now','-14 days') THEN 'new' ELSE 'cold' END, coalesce(g.created, datetime('now'))
        FROM members m JOIN member_gm g ON g.member_id = m.id
        WHERE m.status = 'prospect' AND g.is_prospect = 1 AND coalesce(g.created, '') >= date('now','-183 days')
          AND NOT EXISTS (SELECT 1 FROM leads l WHERE l.member_id = m.id AND l.kind = 'prospect')`).run()).meta?.changes ?? null;
    // 2. Everyone on a trial right now.
    res.trials = (await db.prepare(`INSERT INTO leads(member_id, name, email, mobile, kind, source, stage, created_at)
        SELECT m.id, trim(m.first_name || ' ' || coalesce(m.last_name,'')), m.email, m.mobile, 'trial', coalesce(m.lead_source, p.gm_type_name), 'trial',
               coalesce(ms.start_date, m.joined_on, date('now'))
        FROM members m JOIN memberships ms ON ms.member_id = m.id AND ms.status = 'current' JOIN plans p ON p.id = ms.plan_id AND p.family = 'trial'
        WHERE NOT EXISTS (SELECT 1 FROM leads l WHERE l.member_id = m.id AND l.kind = 'trial')`).run()).meta?.changes ?? null;
    // 3. Anyone who has since joined on a real membership (matched on id, email or mobile).
    res.joined = (await db.prepare(`UPDATE leads SET stage = 'joined', closed_at = coalesce(closed_at, datetime('now'))
        WHERE stage NOT IN ('joined','lost') AND EXISTS (
          SELECT 1 FROM members m JOIN memberships ms ON ms.member_id = m.id AND ms.status = 'current'
            JOIN plans p ON p.id = ms.plan_id AND p.family NOT IN ('trial','pass')
          WHERE m.status = 'active' AND coalesce(ms.start_date, m.joined_on, '9999') >= substr(leads.created_at, 1, 10)
            AND (m.id = leads.member_id OR (leads.email IS NOT NULL AND lower(m.email) = lower(leads.email))
                 OR (leads.mobile IS NOT NULL AND m.mobile = leads.mobile)))`).run()).meta?.changes ?? null;
    // 4. Old untouched leads go cold rather than clogging the board.
    await db.batch([
      db.prepare("UPDATE leads SET stage = 'cold' WHERE stage = 'new' AND kind IN ('prospect','free_pt') AND created_at < datetime('now','-14 days')"),
      db.prepare(`UPDATE leads SET stage = 'cold' WHERE stage = 'trial' AND created_at < datetime('now','-12 days')
                  AND NOT EXISTS (SELECT 1 FROM memberships ms JOIN plans p ON p.id = ms.plan_id AND p.family = 'trial'
                                  WHERE ms.member_id = leads.member_id AND ms.status = 'current')`),
    ]);
    try { res.pt = await syncPtLeads(env); } catch (e) { res.pt = String(e.message || e); }
    return res;
  }

  const PT_SCRIPT_DEFAULT = "https://script.google.com/macros/s/AKfycbzd4BypnwjEdvToljlvMUpvfDMjmSAdSHaS7nnygv6TCulkC7Rax21Ure9flx_eLfpW/exec";
  async function syncPtLeads(env) {
    const r = await fetch((env.PT_SCRIPT || PT_SCRIPT_DEFAULT) + "?action=list" + (env.PT_ADMIN_KEY ? "&key=" + encodeURIComponent(env.PT_ADMIN_KEY) : ""), { redirect: "follow" });
    const d = await r.json();
    const list = (d.leads || []).filter(l => l.name || l.phone || l.email);
    const staff = await all(env, "SELECT id, name FROM staff WHERE active = 1");
    const findStaff = n => { n = String(n || "").toLowerCase().trim(); if (!n) return null; const s = staff.find(x => x.name.toLowerCase().split(" ")[0] === n.split(" ")[0]); return s ? s.id : null; };
    const stmts = [];
    for (const l of list.slice(-400)) {
      const at = l.receivedAt ? nzDateTime(new Date(l.receivedAt)) : nzDateTime(new Date());
      const trainer = findStaff(l.trainer);
      const notes = [l.reasonForJoining, l.trainingStyle && "Style: " + l.trainingStyle, l.preferredTime && "Best time: " + l.preferredTime,
                     l.trainerPreference && "Wants: " + l.trainerPreference].filter(Boolean).join(". ").slice(0, 400) || null;
      const stage = /join|signed|client/i.test(l.status || "") ? "joined" : /lost|no/i.test(l.status || "") ? "lost" : trainer ? "contacted" : "new";
      stmts.push(env.DB.prepare(`INSERT INTO leads(name, email, mobile, kind, source, campaign, stage, assigned_to, notes, created_at)
                                 SELECT ?, ?, ?, 'free_pt', 'PT lead form', ?, ?, ?, ?, ?
                                 WHERE NOT EXISTS (SELECT 1 FROM leads WHERE kind = 'free_pt' AND created_at = ? AND coalesce(name,'') = ?)`)
        .bind(String(l.name || "").slice(0, 120) || null, (l.email || "").toLowerCase() || null, normMobile(l.phone || "") || null, l.source || null,
              stage, trainer, notes, at, at, String(l.name || "").slice(0, 120)));
    }
    for (let i = 0; i < stmts.length; i += 100) await env.DB.batch(stmts.slice(i, i + 100));
    return list.length;
  }

  const KIND_LABEL = { trial: "5 Days for $5 and trials", prospect: "GymMaster prospects", free_pt: "Free PT", unfinished_signup: "Unfinished online sign-ups",
                       bring_a_mate: "Bring a Mate", website_form: "Website enquiries", meta_form: "Meta forms", walk_in: "Walk ins", app_upgrade: "App upgrades" };
  async function leadStats(env, who, can) {
    if (!can.members) return { error: "No access" };
    const own = can.members === "own" ? " AND assigned_to = " + (+who.id) : "";
    const since = addDays(todayNz(), -30);
    const by = await all(env, `SELECT kind, count(*) n, sum(stage = 'joined') joined, sum(stage IN ('contacted','trial','joined','lost')) touched,
                                 sum(stage = 'new') waiting FROM leads WHERE created_at >= ?${own} GROUP BY kind ORDER BY n DESC`, since);
    const src = await all(env, `SELECT coalesce(nullif(source,''),'Not recorded') source, count(*) n, sum(stage = 'joined') joined FROM leads
                                WHERE created_at >= ?${own} GROUP BY 1 ORDER BY 2 DESC LIMIT 12`, since);
    const weeks = await all(env, `SELECT strftime('%Y-%W', created_at) wk, min(substr(created_at,1,10)) day, count(*) n, sum(stage = 'joined') joined
                                  FROM leads WHERE created_at >= ?${own} GROUP BY 1 ORDER BY 1`, addDays(todayNz(), -84));
    const resp = await one(env, `SELECT avg((julianday(contacted_at) - julianday(created_at)) * 24) h FROM leads
                                 WHERE contacted_at IS NOT NULL AND created_at >= ?${own}`, since);
    const stages = await all(env, `SELECT stage, count(*) n FROM leads WHERE (stage NOT IN ('joined','lost','cold') OR created_at >= ?)${own} GROUP BY stage`, since);
    const tot = by.reduce((a, x) => ({ n: a.n + x.n, joined: a.joined + (x.joined || 0), touched: a.touched + (x.touched || 0) }), { n: 0, joined: 0, touched: 0 });
    return { by: by.map(x => ({ ...x, label: KIND_LABEL[x.kind] || x.kind })), sources: src, weeks, response_hours: resp?.h ? Math.round(resp.h * 10) / 10 : null,
             stages, total: tot, pt_connected: true };
  }

  /* ---------------- the member wall ---------------- */
  const TABS = {
    everyone: "1 = 1", current: "m.status = 'active'", visited: "vm.visits > 0", expired: "m.status = 'former'", prospects: "m.status = 'prospect'",
    passport: "EXISTS (SELECT 1 FROM member_flags f WHERE f.member_id = m.id AND f.flag = 'passport') AND m.status = 'active'",
    owing: "b.balance_owing > 0",
  };
  const SORTS = { updated: "m.updated_at DESC, m.id DESC", name: "lower(m.first_name), lower(m.last_name)", joined: "coalesce(m.joined_on,'') DESC, m.id DESC",
                  visits: "coalesce(vm.visits,0) DESC, m.total_visits_gm DESC", newest: "coalesce(g.created, m.created_at) DESC" };
  async function browse(env, who, can, q) {
    if (!can.members) return { error: "No access" };
    const tab = TABS[q.get("tab")] ? q.get("tab") : "current";
    const sort = SORTS[q.get("sort")] ? q.get("sort") : "updated";
    const limit = Math.min(96, +(q.get("limit") || 48)), offset = Math.max(0, +(q.get("offset") || 0));
    const ym = todayNz().slice(0, 7);
    const where = [TABS[tab]], binds = [ym];
    if (can.members === "own") { where.push("m.trainer_id = ?"); binds.push(who.id); }
    const s = String(q.get("q") || "").trim().toLowerCase();
    if (s.length >= 2) {
      const d = s.replace(/\D/g, "");
      where.push("(lower(m.first_name || ' ' || coalesce(m.last_name,'')) LIKE ? OR lower(coalesce(m.email,'')) LIKE ?" + (d.length >= 3 ? " OR m.mobile LIKE ? OR CAST(m.id AS TEXT) = ?" : "") + ")");
      binds.push("%" + s + "%", "%" + s + "%"); if (d.length >= 3) binds.push("%" + d + "%", d);
    }
    const from = `FROM members m LEFT JOIN member_gm g ON g.member_id = m.id
                  LEFT JOIN member_visit_months vm ON vm.member_id = m.id AND vm.month = ?
                  LEFT JOIN billing_accounts b ON b.member_id = m.id
                  WHERE ${where.join(" AND ")}`;
    const rows = await all(env, `SELECT m.id, m.first_name, m.last_name, m.status, m.joined_on, g.gm_status, g.created, m.total_visits_gm,
          coalesce(vm.visits, 0) visits_month, m.photo_url IS NOT NULL OR EXISTS (SELECT 1 FROM member_photos p WHERE p.member_id = m.id) has_photo,
          (SELECT p.gm_type_name FROM memberships ms JOIN plans p ON p.id = ms.plan_id WHERE ms.member_id = m.id ORDER BY ms.status = 'current' DESC, ms.start_date DESC LIMIT 1) plan,
          (SELECT group_concat(flag) FROM member_flags f WHERE f.member_id = m.id) flags,
          ${can.balances ? "coalesce(b.balance_owing, 0)" : "0"} owing
        ${from} ORDER BY ${SORTS[sort]} LIMIT ? OFFSET ?`, ...binds, limit, offset);
    const total = (await one(env, `SELECT count(*) n ${from}`, ...binds)).n;
    const counts = {};
    if (!offset && !s) {
      const c = await one(env, `SELECT count(*) everyone, sum(m.status = 'active') current, sum(m.status = 'former') expired, sum(m.status = 'prospect') prospects,
                                  sum(vm.visits > 0) visited FROM members m LEFT JOIN member_visit_months vm ON vm.member_id = m.id AND vm.month = ?
                                  ${can.members === "own" ? "WHERE m.trainer_id = " + (+who.id) : ""}`, ym);
      Object.assign(counts, c);
    }
    return { tab, sort, rows: rows.map(r => ({ ...r, flags: r.flags ? r.flags.split(",") : [] })), total, offset, limit, counts };
  }

  // GymMaster's own photo, fetched by the Core so it works on any screen.
  async function gmPhoto(env, url) {
    if (!/^https:\/\/[a-z0-9.-]+\.gymmasteronline\.com\//.test(url || "")) return null;
    const r = await fetch(url, { cf: { cacheTtl: 86400, cacheEverything: true } });
    if (!r.ok) return null;
    return new Response(r.body, { headers: { "Content-Type": r.headers.get("Content-Type") || "image/jpeg", "Cache-Control": "private, max-age=86400" } });
  }

  // More from GymMaster's profile for the member page.
  async function gmProfile(env, id) {
    const d = await gmCall(env, "v1", "/member/profile", { member: id });
    const p = d.result || {};
    if (!p.id) return null;
    return { address: [p.addressstreet, p.addresssuburb, p.addresscity, p.addressareacode].filter(Boolean).join(", ") || null,
             dob: p.dob || null, gender: p.gender || null, goal: p.goal || null, created: p.created || null, staff: p.staffname || null,
             emergency: (p.emergency_contacts && p.emergency_contacts.length ? p.emergency_contacts : [{ name: [p.emergencyfirstname, p.emergencysurname].filter(Boolean).join(" ") || p.emergencyname, phone: p.emergencycell, relationship: p.emergencyrelationship }])
               .filter(e => e && (e.name || e.phone)).map(e => ({ name: e.name || [e.firstname, e.surname].filter(Boolean).join(" "), phone: e.phone || e.cell || e.phonecell, relationship: e.relationship })),
             totals: { visits: p.totalvisits, classes: p.totalclasses, bookings: p.totalbookings, pts: p.totalpts }, streak: p.visit_streak,
             has_billing: !!p.has_billing_token, tag: p.tagserial || null, medical: p.medicalconditions || null, occupation: p.occupation || null,
             linked: (p.linked_members || []).map(x => ({ id: x.id || x.memberid, name: x.name || [x.firstname, x.surname].filter(Boolean).join(" ") })).filter(x => x.id) };
  }

  /* ---------------- visits ---------------- */
  // Monthly visit counts per member (GymMaster's portal gives the last 12 months). Swept
  // alongside balances, so every member is refreshed about once a day.
  function monthKey(m) {
    const t = todayNz(), y = +t.slice(0, 4), cur = +t.slice(5, 7);
    return (m <= cur ? y : y - 1) + "-" + String(m).padStart(2, "0");
  }
  async function saveVisitMonths(env, id, res) {
    const rows = (res || []).filter(v => v && v.month >= 1 && v.month <= 12);
    if (!rows.length) return;
    await env.DB.batch(rows.map(v => env.DB.prepare(`INSERT INTO member_visit_months(member_id, month, visits) VALUES (?, ?, ?)
                                                      ON CONFLICT(member_id, month) DO UPDATE SET visits = excluded.visits`).bind(id, monthKey(v.month), +v.visits || 0)));
  }
  async function sweepVisits(env, ids) {
    let done = 0;
    for (let i = 0; i < ids.length; i += 4) {
      await Promise.all(ids.slice(i, i + 4).map(async id => {
        try { const d = await gmCall(env, "v1", "/member/visits/monthly", { member: id }); if (Array.isArray(d.result)) { await saveVisitMonths(env, id, d.result); done++; } } catch {}
      }));
    }
    return done;
  }

  // Check-ins as they happen, from GymMaster's Report API visitor log (needs GM_REPORT_KEY).
  async function reportCall(env, path, body) {
    const init = { headers: { "X-GM-API-KEY": env.GM_REPORT_KEY, "Content-Type": "application/json" } };
    if (body) { init.method = "POST"; init.body = JSON.stringify(body); }
    const r = await fetch((env.GM_SITE || "https://m2trainingclub.gymmasteronline.com") + path, init);
    const t = await r.text();
    try { return JSON.parse(t); } catch { return { error: "Report API replied " + r.status }; }
  }
  async function pullVisits(env, day) {
    if (!env.GM_REPORT_KEY) return { ok: false, error: "GM_REPORT_KEY is not set" };
    day = day || todayNz();
    let rid = await setting(env, "visit_report_id", "");
    if (!rid) {
      const l = await reportCall(env, "/api/v2/report/standard_report/list?predefined_only=true");
      const list = [].concat(l.result || l.reports || []);
      const hit = list.find(x => /visitor/i.test(x.name || x.title || "") && !/passport|summary|count/i.test(x.name || x.title || "")) || list.find(x => /visit/i.test(x.name || x.title || ""));
      if (!hit) return { ok: false, error: "No visitor log report found", reports: list.slice(0, 40).map(x => x.name || x.title) };
      rid = String(hit.id ?? hit.report_id);
      await setSetting(env, "visit_report_id", rid);
    }
    const d = await reportCall(env, "/api/v2/report/standard_report", { start_date: day, end_date: day, report_id: +rid, company_id: +(env.COMPANY_ID || 4), displaymode: "ALL" });
    const rows = [].concat(d.result?.result || d.result?.rows || (Array.isArray(d.result) ? d.result : []));
    if (!rows.length) return { ok: true, rows: 0, error: d.error || null };
    const keys = Object.keys(rows[0]);
    const pick = re => keys.find(k => re.test(k));
    const kId = pick(/member.?id|^id$|member.?no|^#$/i), kTime = pick(/time|arriv|check.?in|date/i), kDoor = pick(/door|gate|location|resource|area|kiosk/i);
    if (!kId || !kTime) return { ok: false, error: "Couldn't read the visitor log columns", columns: keys };
    const stmts = [];
    for (const r of rows) {
      const mid = parseInt(String(r[kId]).replace(/\D/g, ""), 10); if (!mid) continue;
      let at = String(r[kTime] || "").trim(); if (/^\d{1,2}:\d{2}/.test(at)) at = day + " " + at; at = at.replace("T", " ").slice(0, 19);
      stmts.push(env.DB.prepare(`INSERT INTO visits(member_id, at, door, via, gm_visit_id) SELECT ?, ?, ?, 'gymmaster', ? WHERE EXISTS (SELECT 1 FROM members WHERE id = ?)
                                 ON CONFLICT(gm_visit_id) DO NOTHING`).bind(mid, at, kDoor ? String(r[kDoor] || "").slice(0, 40) : null, mid + "|" + at, mid));
    }
    for (let i = 0; i < stmts.length; i += 100) await env.DB.batch(stmts.slice(i, i + 100));
    return { ok: true, rows: stmts.length };
  }

  async function recentVisits(env, who, can) {
    if (!can.members) return { error: "No access" };
    const rows = await all(env, `SELECT v.member_id id, v.at, v.door, m.first_name, m.last_name, m.status,
        m.photo_url IS NOT NULL OR EXISTS (SELECT 1 FROM member_photos p WHERE p.member_id = m.id) has_photo,
        (SELECT p.gm_type_name FROM memberships ms JOIN plans p ON p.id = ms.plan_id WHERE ms.member_id = m.id AND ms.status = 'current' LIMIT 1) plan,
        (SELECT group_concat(flag) FROM member_flags f WHERE f.member_id = m.id) flags
      FROM visits v JOIN members m ON m.id = v.member_id ${can.members === "own" ? "WHERE m.trainer_id = " + (+who.id) : ""}
      ORDER BY v.at DESC LIMIT 30`);
    const today = (await one(env, "SELECT count(*) n FROM visits WHERE at >= ?", todayNz())).n;
    const birthdays = await all(env, `SELECT id, first_name, last_name, dob, m.photo_url IS NOT NULL has_photo FROM members m
                                      WHERE status = 'active' AND substr(dob, 6, 5) = ? ORDER BY first_name LIMIT 20`, todayNz().slice(5));
    return { rows: rows.map(r => ({ ...r, flags: r.flags ? r.flags.split(",") : [] })), today, live: !!env.GM_REPORT_KEY, birthdays };
  }

  /* ---------------- classes history ---------------- */
  async function saveClassCounts(env, classes) {
    if (!classes || !classes.length) return;
    const stmts = classes.map(c => env.DB.prepare(`INSERT INTO class_counts(gm_class_id, day, start, name, coach, booked, max, waitlist, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now')) ON CONFLICT(gm_class_id) DO UPDATE SET booked = excluded.booked, max = excluded.max,
        waitlist = excluded.waitlist, coach = excluded.coach, name = excluded.name, start = excluded.start, updated_at = excluded.updated_at`)
      .bind(+c.id, c.day, c.start, c.name, c.coach || null, c.booked || 0, c.max || 0, c.waitlist || 0));
    for (let i = 0; i < stmts.length; i += 50) await env.DB.batch(stmts.slice(i, i + 50));
  }
  async function classStats(env, can) {
    const since = addDays(todayNz(), -84);
    const q = (by) => all(env, `SELECT ${by} k, count(*) classes, sum(booked) booked, sum(max) spots, round(100.0 * sum(booked) / max(sum(max), 1)) fill,
                                  sum(booked >= max AND max > 0) full, sum(waitlist) waitlist FROM class_counts WHERE day >= ? GROUP BY 1 ORDER BY booked DESC`, since);
    const [byName, byCoach, byHour, byDay, byWeek] = await Promise.all([q("name"), q("coalesce(coach,'No coach')"), q("substr(start,1,2) || ':00'"),
      q("CASE strftime('%w', day) WHEN '0' THEN '7 Sun' WHEN '1' THEN '1 Mon' WHEN '2' THEN '2 Tue' WHEN '3' THEN '3 Wed' WHEN '4' THEN '4 Thu' WHEN '5' THEN '5 Fri' ELSE '6 Sat' END"),
      q("date(day, 'weekday 1', '-7 days')")]);
    const first = await one(env, "SELECT min(day) d, count(*) n FROM class_counts");
    return { byName, byCoach, byHour: byHour.sort((a, b) => a.k.localeCompare(b.k)), byDay: byDay.sort((a, b) => a.k.localeCompare(b.k)),
             byWeek: byWeek.sort((a, b) => a.k.localeCompare(b.k)), since: first?.d || null, tracked: first?.n || 0 };
  }

  /* ---------------- Fitness Passport insights ---------------- */
  async function passportInsights(env, can) {
    if (can.members !== true) return { error: "No access" };
    const t = todayNz(), ym = t.slice(0, 7);
    const lastYm = addDays(ym + "-01", -1).slice(0, 7);
    const tiers = await setting(env, "fp_tiers", "");
    const fp = "EXISTS (SELECT 1 FROM member_flags f WHERE f.member_id = m.id AND f.flag = 'passport')";
    const months = await all(env, "SELECT month, visits, signups, paid, source FROM passport_months ORDER BY month");
    const sweep = await all(env, `SELECT vm.month, sum(vm.visits) visits, count(*) members, sum(vm.visits > 0) visiting
                                  FROM member_visit_months vm JOIN members m ON m.id = vm.member_id AND m.status = 'active' AND ${fp}
                                  WHERE vm.month >= ? GROUP BY vm.month ORDER BY vm.month`, addDays(ym + "-01", -370).slice(0, 7));
    const cover = await one(env, `SELECT count(*) n, sum(EXISTS (SELECT 1 FROM member_visit_months vm WHERE vm.member_id = m.id AND vm.month = ?)) swept
                                  FROM members m WHERE m.status = 'active' AND ${fp}`, ym);
    const freq = await all(env, `SELECT CASE WHEN coalesce(vm.visits,0) = 0 THEN '0' WHEN vm.visits <= 2 THEN '1 to 2' WHEN vm.visits <= 4 THEN '3 to 4'
                                  WHEN vm.visits <= 8 THEN '5 to 8' WHEN vm.visits <= 12 THEN '9 to 12' ELSE '13+' END band, count(*) n, sum(coalesce(vm.visits,0)) visits
                                 FROM members m LEFT JOIN member_visit_months vm ON vm.member_id = m.id AND vm.month = ?
                                 WHERE m.status = 'active' AND ${fp} AND EXISTS (SELECT 1 FROM member_visit_months x WHERE x.member_id = m.id)
                                 GROUP BY band ORDER BY min(coalesce(vm.visits,0))`, lastYm);
    const sleepers = await all(env, `SELECT m.id, m.first_name, m.last_name, m.mobile, m.joined_on,
                                       (SELECT max(month) FROM member_visit_months x WHERE x.member_id = m.id AND x.visits > 0) last_month
                                     FROM members m JOIN member_visit_months a ON a.member_id = m.id AND a.month = ? AND a.visits = 0
                                     LEFT JOIN member_visit_months b ON b.member_id = m.id AND b.month = ?
                                     WHERE m.status = 'active' AND ${fp} AND coalesce(b.visits, 0) = 0
                                     ORDER BY last_month DESC LIMIT 60`, lastYm, ym);
    const sleeperCount = (await one(env, `SELECT count(*) n FROM members m JOIN member_visit_months a ON a.member_id = m.id AND a.month = ? AND a.visits = 0
                                           WHERE m.status = 'active' AND ${fp}`, lastYm)).n;
    const top = await all(env, `SELECT m.id, m.first_name, m.last_name, vm.visits FROM member_visit_months vm JOIN members m ON m.id = vm.member_id
                                WHERE vm.month = ? AND m.status = 'active' AND ${fp} ORDER BY vm.visits DESC LIMIT 10`, lastYm);
    const joins = await all(env, `SELECT substr(m.joined_on,1,7) month, count(*) n FROM members m WHERE ${fp} AND m.joined_on >= ? GROUP BY 1 ORDER BY 1`,
                            addDays(ym + "-01", -370).slice(0, 10));
    const nowSwept = sweep.find(s => s.month === ym);
    const day = +t.slice(8, 10), dim = new Date(Date.UTC(+ym.slice(0, 4), +ym.slice(5, 7), 0)).getUTCDate();
    const soFar = nowSwept ? nowSwept.visits : 0;
    const pace = day ? Math.round(soFar / day * dim) : 0;
    const out = { ym, last_ym: lastYm, months, sweep, cover, freq, sleepers, sleeper_count: sleeperCount, top, joins,
                  this_month: { visits: soFar, pace, day, days: dim } };
    if (can.business) {
      out.money = { pace: passportPay(pace, tiers), so_far: passportPay(soFar, tiers),
                    months: months.map(m => ({ month: m.month, estimate: m.visits ? passportPay(m.visits, tiers).total : null, paid: m.paid })) };
    }
    return out;
  }

  /* ---------------- contracts ---------------- */
  function cleanHtml(h) {
    return String(h || "").replace(/<script[\s\S]*?<\/script>/gi, "").replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "").replace(/javascript:/gi, "");
  }
  async function agreement(env, planId) {
    if (!/^\d+$/.test(String(planId || ""))) return { ok: false, error: "Pick a membership first" };
    const d = await gmCall(env, "v2", "/membership/" + planId + "/agreement", {});
    if (d.error && !d.result) return { ok: false, error: "GymMaster: " + d.error };
    const list = (d.result || []).filter(a => (a.points || []).length || (a.body || "").replace(/<[^>]+>/g, "").trim().length > 40)
      .map(a => ({ name: String(a.name || "Membership terms").replace(/^Auckland\s+/i, ""), body: cleanHtml(a.body), points: (a.points || []).map(p => p.label || String(p)) }));
    return { ok: true, agreements: list };
  }
  function esc(s) { return String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])); }
  function contractPage({ title, member, plan, price, body, signature, signedAt, staff, print }) {
    return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Archivo:wght@800&family=DM+Sans:wght@400;600&display=swap">
<style>body{margin:0;background:#F3F3F0;font:14px/1.55 "DM Sans",Arial,sans-serif;color:#0A0A0A}.page{max-width:800px;margin:0 auto;background:#fff;min-height:100vh}
header{background:#0A0A0A;color:#fff;padding:22px 32px;display:flex;align-items:center;gap:16px}header img{height:20px}header span{margin-left:auto;font-size:12px;color:#B9B9B0}
main{padding:28px 32px 40px}h1{font:800 26px Archivo,Arial,sans-serif;margin:0 0 4px;letter-spacing:-.02em}h1 i{color:#5E6B00;font-style:normal}.sub{color:#5B5B55;margin:0 0 20px}
dl{display:grid;grid-template-columns:150px 1fr;gap:4px 12px;background:#F1F1EC;border-radius:14px;padding:14px 18px;margin:0 0 22px}dt{color:#5B5B55}dd{margin:0}
.terms h2,.terms h3{font:800 16px Archivo,Arial,sans-serif;margin:18px 0 6px}.sig{margin-top:26px;border-top:1px solid #E2E2DC;padding-top:16px;display:flex;gap:24px;align-items:flex-end;flex-wrap:wrap}
.sig img{height:90px;border-bottom:1px solid #0A0A0A}.btn{position:fixed;right:18px;bottom:18px;background:#DFFF00;border:0;border-radius:999px;padding:12px 20px;font-weight:600;cursor:pointer}
@media print{.btn{display:none}body{background:#fff}header{-webkit-print-color-adjust:exact;print-color-adjust:exact}}</style></head><body><div class="page">
<header><img src="https://m2club.co.nz/assets/img/m2-logo-lime.png" alt="M2 Training Club"><span>8 Nugent Street, Grafton, Auckland. 09 558 1408</span></header>
<main><h1>${esc(title)}<i>.</i></h1><p class="sub">${signedAt ? "Signed " + esc(signedAt) : "Please read before signing"}</p>
<dl>${member ? `<dt>Member</dt><dd>${esc(member)}</dd>` : ""}<dt>Membership</dt><dd>${esc(plan || "")}</dd>${price ? `<dt>Price</dt><dd>${esc(price)}</dd>` : ""}${staff ? `<dt>Signed with</dt><dd>${esc(staff)}</dd>` : ""}</dl>
<div class="terms">${body || "<p>The M2 Training Club membership terms and conditions.</p>"}</div>
${signature ? `<div class="sig"><div><img src="${esc(signature)}" alt="Member signature"><div>Member signature</div></div><div>${esc(signedAt || "")}</div></div>` : ""}
</main></div><button class="btn" onclick="window.print()">Save as PDF or print</button>${print ? "<script>setTimeout(function(){window.print()},600)</script>" : ""}</body></html>`;
  }
  async function contractPreview(env, planId, planName, price) {
    const a = await agreement(env, planId);
    const body = a.ok && a.agreements.length ? a.agreements.map(x => `<h2>${esc(x.name)}</h2>${x.body}${x.points.length ? "<ul>" + x.points.map(p => `<li>${esc(p)}</li>`).join("") + "</ul>" : ""}`).join("") : null;
    return contractPage({ title: "Membership agreement", plan: planName, price, body, print: true });
  }
  async function saveSignedContract(env, who, memberId, planId, planName, price, signature) {
    const a = await agreement(env, planId);
    const body = a.ok && a.agreements.length ? a.agreements.map(x => `<h2>${esc(x.name)}</h2>${x.body}${x.points.length ? "<ul>" + x.points.map(p => `<li>${esc(p)}</li>`).join("") + "</ul>" : ""}`).join("") : null;
    await env.DB.prepare("INSERT INTO member_agreements(member_id, plan, body, signature, staff_id) VALUES (?, ?, ?, ?, ?)")
      .bind(memberId, (planName || "") + (price ? " (" + price + ")" : ""), body, /^data:image\/png;base64,/.test(signature || "") ? signature : null, who.id).run();
  }
  async function contractList(env, can, memberId) {
    if (!can.members) return [];
    return all(env, "SELECT a.id, a.plan, a.signed_at, s.name staff FROM member_agreements a LEFT JOIN staff s ON s.id = a.staff_id WHERE a.member_id = ? ORDER BY a.id DESC", memberId);
  }
  async function contractView(env, can, memberId, aid) {
    if (can.members !== true) return new Response("No access", { status: 403 });
    const a = await one(env, `SELECT a.*, s.name staff, m.first_name, m.last_name FROM member_agreements a JOIN members m ON m.id = a.member_id
                              LEFT JOIN staff s ON s.id = a.staff_id WHERE a.id = ? AND a.member_id = ?`, aid, memberId);
    if (!a) return new Response("Not found", { status: 404 });
    return new Response(contractPage({ title: "Membership agreement", member: (a.first_name + " " + (a.last_name || "")).trim() + " (#" + memberId + ")", plan: a.plan,
      body: a.body, signature: a.signature, signedAt: a.signed_at + " UTC", staff: a.staff }), { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } });
  }

  /* ---------------- Growth extras ---------------- */
  async function growthMore(env, can) {
    if (!can.business) return { error: "Owners only" };
    const t = todayNz(), ym = t.slice(0, 7), lastYm = addDays(ym + "-01", -1).slice(0, 7);
    const age = await all(env, `SELECT CASE WHEN dob IS NULL OR dob = '' THEN 'Unknown' ELSE
                                   CASE WHEN (julianday(?) - julianday(dob)) / 365.25 < 18 THEN 'Under 18' WHEN (julianday(?) - julianday(dob)) / 365.25 < 25 THEN '18 to 24'
                                        WHEN (julianday(?) - julianday(dob)) / 365.25 < 35 THEN '25 to 34' WHEN (julianday(?) - julianday(dob)) / 365.25 < 45 THEN '35 to 44'
                                        WHEN (julianday(?) - julianday(dob)) / 365.25 < 55 THEN '45 to 54' ELSE '55+' END END band, count(*) n
                                 FROM members WHERE status = 'active' GROUP BY band ORDER BY band`, t, t, t, t, t);
    const gender = await all(env, `SELECT CASE upper(substr(coalesce(gender,''),1,1)) WHEN 'F' THEN 'Women' WHEN 'M' THEN 'Men' WHEN '' THEN 'Not recorded' ELSE 'Other' END g, count(*) n
                                   FROM members WHERE status = 'active' GROUP BY g ORDER BY n DESC`);
    const suburbs = await all(env, `SELECT trim(suburb) s, count(*) n FROM members WHERE status = 'active' AND coalesce(trim(suburb),'') <> '' GROUP BY lower(trim(suburb)) ORDER BY n DESC LIMIT 12`);
    const tenure = await all(env, `SELECT CASE WHEN joined_on IS NULL THEN 'Unknown' WHEN joined_on >= date(?, '-3 months') THEN 'Under 3 months'
                                     WHEN joined_on >= date(?, '-6 months') THEN '3 to 6 months' WHEN joined_on >= date(?, '-12 months') THEN '6 to 12 months'
                                     WHEN joined_on >= date(?, '-24 months') THEN '1 to 2 years' ELSE '2 years plus' END band, count(*) n
                                   FROM members WHERE status = 'active' GROUP BY band`, t, t, t, t);
    const revenue = await all(env, `SELECT p.family, round(sum(ms.weekly_value)) weekly, count(*) n FROM memberships ms JOIN plans p ON p.id = ms.plan_id
                                    JOIN members m ON m.id = ms.member_id AND m.status = 'active' WHERE ms.status = 'current' AND ms.weekly_value > 0 GROUP BY 1 ORDER BY 2 DESC`);
    const usage = await all(env, `SELECT CASE WHEN EXISTS (SELECT 1 FROM member_flags f WHERE f.member_id = m.id AND f.flag = 'passport') THEN 'Fitness Passport' ELSE 'Paying' END who,
                                    sum(coalesce(vm.visits,0) = 0) none, sum(vm.visits BETWEEN 1 AND 4) light, sum(vm.visits BETWEEN 5 AND 11) regular, sum(vm.visits >= 12) keen, count(*) n
                                  FROM members m JOIN member_visit_months vm ON vm.member_id = m.id AND vm.month = ? WHERE m.status = 'active' GROUP BY who`, lastYm);
    const joinsByFamily = await all(env, `SELECT substr(m.joined_on,1,7) month, coalesce(p.family,'other') family, count(*) n FROM members m
                                          LEFT JOIN memberships ms ON ms.member_id = m.id AND ms.status = 'current' LEFT JOIN plans p ON p.id = ms.plan_id
                                          WHERE m.joined_on >= ? GROUP BY 1, 2 ORDER BY 1`, addDays(ym + "-01", -183).slice(0, 10));
    const people = await one(env, "SELECT sum(status = 'active') active, sum(status = 'prospect') prospects, sum(status = 'former') former FROM members");
    const expiring = await one(env, `SELECT count(*) n FROM memberships ms JOIN members m ON m.id = ms.member_id AND m.status = 'active'
                                     WHERE ms.status = 'current' AND ((ms.min_term_end BETWEEN ? AND date(?, '+30 days')) OR (ms.end_date BETWEEN ? AND date(?, '+30 days')))`, t, t, t, t);
    return { age, gender, suburbs, tenure, revenue, usage, joins_by_family: joinsByFamily, people, expiring: expiring.n, last_ym: lastYm };
  }

  /* ---------------- Marketing extras ---------------- */
  async function marketingMore(env, can, month) {
    if (!can.business) return { error: "Owners only" };
    const ym = /^\d{4}-\d{2}$/.test(month || "") ? month : todayNz().slice(0, 7);
    const prev = addDays(ym + "-01", -1).slice(0, 7);
    const sum = m => one(env, `SELECT round(sum(spend),2) spend, sum(impressions) impressions, sum(clicks) clicks, sum(landing_views) views, sum(leads) leads
                               FROM marketing_days WHERE day >= ? AND day < ?`, m + "-01", m + "-32");
    const web = m => one(env, "SELECT sum(sessions) sessions, sum(conversions) conversions FROM web_days WHERE day >= ? AND day < ?", m + "-01", m + "-32");
    const paidWeb = m => one(env, "SELECT sum(sessions) sessions, sum(conversions) conversions FROM web_days WHERE channel LIKE 'Paid%' AND day >= ? AND day < ?", m + "-01", m + "-32");
    const leadsM = m => one(env, `SELECT count(*) n, sum(lower(coalesce(source,'')) LIKE '%instagram%' OR lower(coalesce(source,'')) LIKE '%facebook%' OR lower(coalesce(source,'')) LIKE '%meta%') social
                                  FROM leads WHERE created_at >= ? AND created_at < ?`, m + "-01", m + "-32");
    const joinsM = m => one(env, `SELECT count(*) n, sum(lower(coalesce(lead_source,'')) IN ('instagram','facebook')) social, sum(coalesce(lead_source,'') = '') unknown
                                  FROM members WHERE joined_on >= ? AND joined_on < ?`, m + "-01", m + "-32");
    const [a, b, w, wp, pw, l, lp, j, jp] = await Promise.all([sum(ym), sum(prev), web(ym), web(prev), paidWeb(ym), leadsM(ym), leadsM(prev), joinsM(ym), joinsM(prev)]);
    const weekday = await all(env, `SELECT strftime('%w', day) d, round(sum(spend),2) spend, sum(landing_views) views, sum(clicks) clicks FROM marketing_days
                                    WHERE day >= ? GROUP BY 1 ORDER BY 1`, addDays(todayNz(), -56));
    const camps = await all(env, `SELECT campaign, round(sum(spend),2) spend, sum(impressions) impressions, sum(clicks) clicks, sum(landing_views) views, min(day) first, max(day) last
                                  FROM marketing_days WHERE day >= ? AND day < ? GROUP BY 1 HAVING sum(spend) > 0 ORDER BY 2 DESC`, ym + "-01", ym + "-32");
    const tips = [];
    const cpv = c => c.views ? c.spend / c.views : null;
    const ranked = camps.filter(c => c.views >= 50).sort((x, y) => cpv(x) - cpv(y));
    if (ranked.length >= 2) {
      const best = ranked[0], worst = ranked[ranked.length - 1];
      tips.push(`${best.campaign} is the cheapest way onto the website at $${cpv(best).toFixed(2)} a visit. ${worst.campaign} costs $${cpv(worst).toFixed(2)}, ${Math.round(cpv(worst) / cpv(best))} times as much.`);
    }
    if (j && j.n && j.unknown) tips.push(`${j.unknown} of ${j.n} people who joined this month have no "where did you hear about us". Without it the cost per join is a guess.`);
    if (a && b && b.spend && a.views && b.views) {
      const ch = Math.round((a.spend / a.views) / (b.spend / b.views) * 100 - 100);
      tips.push(`Cost per website visit from ads is ${ch >= 0 ? "up" : "down"} ${Math.abs(ch)}% on last month.`);
    }
    if (w && w.sessions && pw && pw.sessions) tips.push(`${Math.round(pw.sessions / w.sessions * 100)}% of website visits this month came from paid ads.`);
    return { month: ym, prev, now: a, before: b, web: w, web_prev: wp, paid_web: pw, leads: l, leads_prev: lp, joins: j, joins_prev: jp, weekday, campaigns: camps, tips };
  }

  return { rosterStart, rosterApply, rosterFinish, rosterDelta, rebuildLeads, leadStats, browse, gmPhoto, gmProfile, sweepVisits, pullVisits, recentVisits,
           saveClassCounts, classStats, passportInsights, agreement, contractPreview, saveSignedContract, contractList, contractView, growthMore, marketingMore };
}
