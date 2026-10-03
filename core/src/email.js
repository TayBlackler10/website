// M2 Core: email automations, ready to take over from GymMaster.
//
// Every morning at 9am the Core works out who each automation would email today, from its own
// data (trials, visits, joins, billing). Until an automation is switched to "the Core sends this"
// it only records a preview, so GymMaster's version keeps running and nobody gets two emails.
// Results are judged by what people did afterwards (joined, came back, paid, upgraded), not opens.
//
// Sending uses Resend (resend.com) from M2's own address once these are in Cloudflare:
//   RESEND_API_KEY  secret from Resend, after m2club.co.nz is verified there (3 DNS records in GoDaddy)
//   EMAIL_FROM      optional, defaults to "M2 Training Club <reception@m2club.co.nz>"

export function makeEmail(L) {
  const { nzDateTime } = L;
  const todayNz = () => nzDateTime(new Date()).slice(0, 10);
  const addDays = (iso, n) => new Date(new Date(iso + "T12:00:00Z").getTime() + n * 86400_000).toISOString().slice(0, 10);
  const all = (env, sql, ...a) => env.DB.prepare(sql).bind(...a).all().then(r => r.results || []);
  const one = (env, sql, ...a) => env.DB.prepare(sql).bind(...a).first();
  const run = (env, sql, ...a) => env.DB.prepare(sql).bind(...a).run();
  const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const FROM = env => env.EMAIL_FROM || "M2 Training Club <reception@m2club.co.nz>";
  // Member-facing links go through the public join worker (the Core itself is behind staff sign-in).
  const PUBLIC = env => (env.PUBLIC_URL || "https://m2-join.taylor-3e5.workers.dev").replace(/\/$/, "");

  // Who each automation is for. Every list skips people with no email, marked do not contact or staff.
  // "marketing" ones also skip anyone who unsubscribed or said no to marketing email.
  const CUR = `(SELECT p.family FROM memberships ms JOIN plans p ON p.id = ms.plan_id WHERE ms.member_id = m.id AND ms.status = 'current' ORDER BY ms.start_date DESC LIMIT 1)`;
  const LASTV = `(SELECT substr(max(v.at), 1, 10) FROM visits v WHERE v.member_id = m.id)`;
  const RULES = {
    trial_ending: { when: "Their trial finishes tomorrow", every: 30, marketing: false, sql: d => [`
      SELECT DISTINCT m.id FROM members m JOIN memberships ms ON ms.member_id = m.id JOIN plans p ON p.id = ms.plan_id
      WHERE p.family = 'trial' AND ms.status = 'current' AND substr(ms.end_date, 1, 10) = ?`, addDays(d, 1)] },
    trial_comeback: { when: "Their trial ended 3 days ago and they haven't joined", every: 60, marketing: true, sql: d => [`
      SELECT DISTINCT m.id FROM members m JOIN memberships ms ON ms.member_id = m.id JOIN plans p ON p.id = ms.plan_id
      WHERE p.family = 'trial' AND substr(ms.end_date, 1, 10) = ?
        AND NOT EXISTS (SELECT 1 FROM memberships x JOIN plans px ON px.id = x.plan_id WHERE x.member_id = m.id AND x.status = 'current' AND px.family NOT IN ('trial','pass'))`, addDays(d, -3)] },
    new_member_checkin: { when: "They joined a week ago", every: 365, marketing: false, sql: d => [`
      SELECT m.id FROM members m WHERE m.status = 'active' AND m.joined_on = ? AND coalesce(${CUR}, '') NOT IN ('trial','pass','passport')`, addDays(d, -7)] },
    we_miss_you: { when: "A paying member's last visit was 14 days ago", every: 45, marketing: true, sql: d => [`
      SELECT m.id FROM members m WHERE m.status = 'active' AND ${CUR} IN ('perform','classes','daily','recovery','transporter') AND ${LASTV} = ?`, addDays(d, -14)] },
    passport_winback: { when: "A Fitness Passport member's last visit was 14 days ago", every: 45, marketing: true, sql: d => [`
      SELECT m.id FROM members m WHERE m.status = 'active' AND (${CUR} = 'passport' OR EXISTS (SELECT 1 FROM member_flags f WHERE f.member_id = m.id AND f.flag = 'passport'))
        AND ${LASTV} = ?`, addDays(d, -14)] },
    failed_payment: { when: "A debit the Core sent failed yesterday (starts once billing moves to the Core)", every: 5, marketing: false, sql: d => [`
      SELECT DISTINCT i.member_id id FROM billing_items i WHERE i.status = 'failed' AND i.settled_at >= ?
        AND NOT EXISTS (SELECT 1 FROM member_flags f WHERE f.member_id = i.member_id AND f.flag = 'gifted_time')`, addDays(d, -1)] },
    daily_to_perform: { when: "A Daily member has visited 12 or more times in 30 days", every: 120, marketing: true, sql: d => [`
      SELECT m.id FROM members m WHERE m.status = 'active' AND ${CUR} = 'daily' AND m.joined_on <= ?
        AND (SELECT count(DISTINCT substr(v.at,1,10)) FROM visits v WHERE v.member_id = m.id AND v.at >= ?) >= 12`, addDays(d, -30), addDays(d, -30)] },
  };
  const GOAL_LABEL = { joined: "joined", visited: "came back", paid: "paid", upgraded: "upgraded", attended: "came to class" };

  // Starting words, in Taylor's voice. Swap in the GymMaster versions any time from the page.
  const START = {
    trial_ending: ["Your trial finishes tomorrow, {first}", "Keep the momentum going", "Hope you've enjoyed your first few days at M2.\n\nYour trial finishes tomorrow. If you want to keep going, you can join online in a couple of minutes and pick up right where you left off.\n\nAny questions, just reply to this email or have a chat with the team at reception.", "Join M2", "https://m2club.co.nz/#memberships"],
    trial_comeback: ["Still thinking about it, {first}?", "The door's still open", "It was great having you in for your trial.\n\nIf now wasn't the right time, no stress. When you're ready, everything is still here: the gym, classes and the recovery area.\n\nReply to this email if there's anything we can help with.", "See memberships", "https://m2club.co.nz/#memberships"],
    new_member_checkin: ["How's your first week going, {first}?", "One week in", "You've been with us a week now, so I wanted to check in.\n\nIf you haven't booked your free PT session yet, it's the best way to get a plan that suits you. Our coaches will make sure you're getting the most out of the club.\n\nAnything we can do better, just reply and let me know.", "Book your free PT session", "https://m2club.co.nz/free-pt.html"],
    we_miss_you: ["We haven't seen you in a while, {first}", "We miss you at M2", "It's been a couple of weeks since your last visit, so I thought I'd check in.\n\nLife gets busy. Even a 30 minute session or a sauna and ice bath counts, and the team would love to see you back.\n\nIf something's getting in the way, reply to this email and we'll help where we can.", "See the class timetable", "https://m2club.co.nz/classes.html"],
    passport_winback: ["Your Fitness Passport is waiting, {first}", "Come back and train with us", "It's been a couple of weeks since we've seen you at M2.\n\nYour Fitness Passport gets you the full gym, the pool, the sauna and spa. Come in any time we're open: weekdays 5am to 10pm, weekends 7am to 7pm.\n\nSee you soon.", "Plan your next visit", "https://m2club.co.nz/fitness-passport.html"],
    failed_payment: ["Your M2 payment didn't go through", "Quick heads up", "Your latest membership payment didn't go through. It happens, usually a card or account change.\n\nCan you pop in to reception or reply to this email and we'll sort it out together. If it's already sorted, no worries and thanks.", "Update my details", "https://m2club.co.nz/contact.html"],
    daily_to_perform: ["You're in here a lot, {first}", "Ready for Perform?", "You've been training hard lately and it shows.\n\nPerform adds every class and the full recovery area (sauna, spa, ice bath) for just a little more each week. If you're coming in this often, it's the best value we've got.\n\nReply or ask at reception and we'll switch you over.", "See what Perform includes", "https://m2club.co.nz/#memberships"],
  };

  async function ensureContent(env) {
    const have = new Set((await all(env, "SELECT key FROM auto_content")).map(r => r.key));
    const stmts = Object.entries(START).filter(([k]) => !have.has(k)).map(([k, v]) =>
      env.DB.prepare("INSERT OR IGNORE INTO auto_content(key, subject, heading, body, button, url) VALUES (?, ?, ?, ?, ?, ?)").bind(k, ...v));
    if (stmts.length) {
      await env.DB.batch(stmts);
      // No comparison group until Taylor decides (it can be set per automation on the page).
      if (!have.size) await run(env, "UPDATE automations SET holdout_pct = 0");
    }
  }

  async function unsubKey(env) {
    let r = await one(env, "SELECT value FROM settings WHERE key = 'unsub_key'");
    if (!r) { await run(env, "INSERT OR IGNORE INTO settings(key, value) VALUES ('unsub_key', ?)", crypto.randomUUID() + crypto.randomUUID()); r = await one(env, "SELECT value FROM settings WHERE key = 'unsub_key'"); }
    return r.value;
  }
  async function sign(env, email) {
    const k = await crypto.subtle.importKey("raw", new TextEncoder().encode(await unsubKey(env)), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
    const s = new Uint8Array(await crypto.subtle.sign("HMAC", k, new TextEncoder().encode(String(email).toLowerCase())));
    return btoa(String.fromCharCode(...s.slice(0, 18))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }

  // M2 house style: grey background, white card, black header with the lime logo, black button with lime text, no underlined links.
  function render(c, first, unsubUrl) {
    const fill = s => String(s || "").replace(/\{first\}/g, first || "there");
    const paras = fill(c.body).split(/\n\s*\n/).map(p => `<p style="margin:0 0 16px;font:16px/1.6 Arial,Helvetica,sans-serif;color:#1A1A18">${esc(p).replace(/\n/g, "<br>")}</p>`).join("");
    const btn = c.button && c.url ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0 20px"><tr><td style="background:#0A0A0A;border-radius:999px"><a href="${esc(c.url)}" style="display:inline-block;padding:14px 26px;font:700 15px Arial,Helvetica,sans-serif;color:#DFFF00;text-decoration:none">${esc(c.button)}</a></td></tr></table>` : "";
    return `<!doctype html><html><body style="margin:0;background:#F3F3F0"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F3F3F0;padding:24px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#FFFFFF;border-radius:24px;overflow:hidden">
<tr><td style="background:#0A0A0A;padding:18px 28px"><img src="https://m2club.co.nz/assets/img/m2-logo-lime.png" alt="M2 Training Club" height="26" style="display:block;height:26px"></td></tr>
<tr><td style="padding:30px 28px 10px">${c.heading ? `<div style="font:700 11px Arial,Helvetica,sans-serif;letter-spacing:.14em;text-transform:uppercase;color:#5E6B00;margin-bottom:8px">M2 Training Club</div><h1 style="margin:0 0 18px;font:800 26px/1.2 Arial,Helvetica,sans-serif;color:#0A0A0A">${esc(fill(c.heading))}<span style="color:#5E6B00">.</span></h1>` : ""}
<p style="margin:0 0 16px;font:16px/1.6 Arial,Helvetica,sans-serif;color:#1A1A18">Hi ${esc(first || "there")},</p>${paras}${btn}
<p style="margin:0 0 24px;font:16px/1.6 Arial,Helvetica,sans-serif;color:#1A1A18">Kind Regards,<br>Taylor Blackler<br>CEO, M2 Training Club</p></td></tr>
<tr><td style="background:#F1F1EC;padding:18px 28px;font:12px/1.6 Arial,Helvetica,sans-serif;color:#5B5B55">M2 Training Club, 8 Nugent Street, Grafton, Auckland. 09 558 1408.<br>
<a href="https://instagram.com/m2trainingclub" style="color:#5B5B55;text-decoration:none">Instagram</a> &middot; <a href="https://m2club.co.nz" style="color:#5B5B55;text-decoration:none">m2club.co.nz</a>${unsubUrl ? ` &middot; <a href="${esc(unsubUrl)}" style="color:#5B5B55;text-decoration:none">Unsubscribe</a>` : ""}</td></tr>
</table></td></tr></table></body></html>`;
  }
  const textOf = (c, first) => ["Hi " + (first || "there") + ",", String(c.body || "").replace(/\{first\}/g, first || "there"), c.button && c.url ? c.button + ": " + c.url : "", "Kind Regards,\nTaylor Blackler\nCEO, M2 Training Club"].filter(Boolean).join("\n\n");

  async function send(env, to, c, first, unsubUrl, built) {
    if (!env.RESEND_API_KEY) throw new Error("Email sending isn't connected yet");
    if (built) {
      const r0 = await fetch("https://api.resend.com/emails", { method: "POST", headers: { Authorization: "Bearer " + env.RESEND_API_KEY, "Content-Type": "application/json" },
        body: JSON.stringify({ from: FROM(env), to: [to], reply_to: "reception@m2club.co.nz", subject: built.subject, html: built.html, text: strip(built.html),
          headers: unsubUrl ? { "List-Unsubscribe": "<" + unsubUrl + ">", "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" } : undefined }) });
      const d0 = await r0.json().catch(() => ({}));
      if (!r0.ok) throw new Error(d0.message || "Resend said " + r0.status);
      return d0.id;
    }
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST", headers: { Authorization: "Bearer " + env.RESEND_API_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({ from: FROM(env), to: [to], reply_to: "reception@m2club.co.nz", subject: String(c.subject || "").replace(/\{first\}/g, first || "there"),
        html: render(c, first, unsubUrl), text: textOf(c, first),
        headers: unsubUrl ? { "List-Unsubscribe": "<" + unsubUrl + ">", "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" } : undefined }),
    });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(d.message || "Resend said " + r.status);
    return d.id;
  }

  /* ---------------- the GymMaster automations, copied across ---------------- */
  const UNIT = { seconds: 0, minutes: 0, hours: 0, days: 1, weeks: 7, months: 30 };
  const fmtDay = s => { if (!s) return ""; const d = new Date(String(s).slice(0, 10) + "T12:00:00Z"); return isNaN(d) ? String(s) : d.toLocaleDateString("en-NZ", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" }); };
  const TYPEF = col => `(? = '["All Memberships"]' OR ${col} IN (SELECT value FROM json_each(?)))`;
  const CURTYPE = `EXISTS (SELECT 1 FROM memberships ms JOIN plans p ON p.id = ms.plan_id WHERE ms.member_id = m.id AND ms.status = 'current' AND ${TYPEF("p.gm_type_name")})`;
  const NOT_ON_HOLD = `NOT EXISTS (SELECT 1 FROM gm_holds h WHERE h.member_id = m.id AND h.starts <= ? AND (h.ends IS NULL OR h.ends >= ?))`;

  // Turn one GymMaster task into a rule the Core can run on its own data.
  function gmRule(t) {
    const types = t.types || '["All Memberships"]';
    const off = Math.round((+t.qty || 0) * (UNIT[t.unit] ?? 0)), before = /before/i.test(t.sign || ""), x = +t.x || 0;
    const when = (n => n)(t.trigger + (off ? ", " + (t.qty + " " + t.unit) + (before ? " before" : " after") : "") + (x && /X/.test(t.trigger) ? " (X = " + x + ")" : ""));
    const base = { when, every: 7, marketing: false, goal: "none", to: t.recipient === "staff" ? "staff" : "member" };
    const tr = String(t.trigger || "");
    if (tr === "Member First Joined") return { ...base, every: 3650, goal: off ? "visited" : "none", sql: d => [`SELECT m.id FROM members m WHERE m.status = 'active' AND m.joined_on = ? AND ${CURTYPE}`, addDays(d, -off), types, types] };
    if (/^Membership Starting/.test(tr)) return { ...base, every: 30, goal: "joined", sql: d => [`SELECT DISTINCT s.member_id id FROM mship_seen s WHERE s.start_date = ? AND ${TYPEF("s.type_name")}`, addDays(d, -off), types, types] };
    if (tr === "Member Expiry") return before
      ? { ...base, every: 20, goal: "joined", sql: d => [`SELECT DISTINCT s.member_id id FROM mship_seen s WHERE s.end_date = ? AND ${TYPEF("s.type_name")}`, addDays(d, off), types, types] }
      : { ...base, every: 60, marketing: true, goal: "joined", sql: d => [`SELECT DISTINCT s.member_id id FROM mship_seen s JOIN members m ON m.id = s.member_id WHERE s.end_date = ? AND ${TYPEF("s.type_name")}
            AND NOT EXISTS (SELECT 1 FROM memberships ms JOIN plans p ON p.id = ms.plan_id WHERE ms.member_id = s.member_id AND ms.status = 'current' AND p.family NOT IN ('trial','pass'))`, addDays(d, -off), types, types] };
    if (/Birthday/i.test(tr)) return { ...base, every: 300, marketing: true, sql: d => [`SELECT m.id FROM members m WHERE m.status = 'active' AND substr(m.dob, 6, 5) = ? AND ${CURTYPE}`, d.slice(5), types, types] };
    if (tr === "X Days No Visit") return { ...base, every: Math.max(14, x), marketing: true, goal: "visited", sql: d => [`SELECT m.id FROM members m WHERE m.status = 'active' AND ${CURTYPE}
            AND coalesce((SELECT substr(max(v.at), 1, 10) FROM visits v WHERE v.member_id = m.id), m.joined_on) = ? AND ${NOT_ON_HOLD}`, types, types, addDays(d, -x), d, d] };
    if (tr === "Failed Billing - Automatic Batch") return { ...base, every: 1, goal: "paid", sql: d => [`SELECT DISTINCT f.member_id id FROM gm_failed f WHERE f.first_seen = ? AND f.billing_date >= ?`, d, addDays(d, -7)] };
    if (/^Failed Member Payments X/.test(tr)) { const more = /or More/i.test(tr); return { ...base, every: 1, goal: "paid", sql: d => [`SELECT f.member_id id FROM gm_failed f WHERE f.first_seen = ? AND f.billing_date >= ?
            GROUP BY f.member_id HAVING (SELECT count(*) FROM gm_failed g WHERE g.member_id = f.member_id AND g.billing_date >= ?) ${more ? ">=" : "="} ?`, d, addDays(d, -7), addDays(d, -45), x] }; }
    if (tr === "Member First X Visits") return { ...base, every: 3650, marketing: true, sql: d => [`SELECT v.member_id id FROM (
            SELECT member_id, dd, row_number() OVER (PARTITION BY member_id ORDER BY dd) rn FROM (SELECT DISTINCT member_id, substr(at, 1, 10) dd FROM visits)) v
            JOIN members m ON m.id = v.member_id WHERE v.rn = ? AND v.dd = ? AND m.joined_on >= (SELECT substr(min(at), 1, 10) FROM visits)`, x, addDays(d, -off)] };
    if (tr === "Hold Ending") return { ...base, every: 20, sql: d => [`SELECT DISTINCT h.member_id id FROM gm_holds h WHERE h.ends = ?`, addDays(d, before ? off : -off)] };
    if (/Visited X times in a month/i.test(tr)) return { ...base, every: 90, marketing: true, goal: "upgraded", sql: d => [`SELECT m.id FROM members m WHERE m.status = 'active' AND ${CURTYPE}
            AND (SELECT count(DISTINCT substr(v.at,1,10)) FROM visits v WHERE v.member_id = m.id AND v.at >= ?) >= ?`, types, types, addDays(d, -30), x] };
    if (/^Membership Canceled/.test(tr)) return { ...base, every: 30, sql: d => [`SELECT DISTINCT c.member_id id FROM gm_cancels c WHERE c.first_seen = ?`, d] };
    if (/Anniversary/i.test(tr)) return { ...base, every: 300, marketing: true, sql: d => [`SELECT m.id FROM members m WHERE m.status = 'active' AND m.joined_on = date(?, '-' || ? || ' years') AND ${CURTYPE}`, d, Math.max(1, x), types, types] };
    if (/Prospect/i.test(tr)) return { ...base, every: 60, goal: "joined", sql: d => [`SELECT g.member_id id FROM member_gm g JOIN members m ON m.id = g.member_id WHERE g.is_prospect = 1 AND m.status = 'prospect' AND substr(g.created, 1, 10) = ?`, addDays(d, -off)] };
    return null;
  }

  async function rules(env) {
    const tasks = await all(env, "SELECT * FROM gm_tasks");
    const out = {};
    for (const t of tasks) { const r = gmRule(t); out["gm_" + t.task_id] = r ? { ...r, task: t } : { when: t.trigger + " (the Core can't do this one yet)", unsupported: true, task: t }; }
    const useGm = tasks.length > 0;
    if (!useGm) for (const [k, r] of Object.entries(RULES)) out[k] = r;
    return out;
  }

  // GymMaster merge fields like {58:Member Firstname} filled from the member.
  function fill(text, p, unsubUrl, unknown) {
    return String(text || "").replace(/\{(\d+):([^}]+)\}/g, (m0, id, name) => {
      const n = name.toLowerCase();
      if (/first ?name/.test(n)) return p.first_name || "there";
      if (/surname|last ?name/.test(n)) return p.last_name || "";
      if (/full ?name|^member name$/.test(n)) return [p.first_name, p.last_name].filter(Boolean).join(" ");
      if (/e-?mail/.test(n)) return p.email || "";
      if (/membership/.test(n) && /(name|type)/.test(n)) return p.mtype || "membership";
      if (/hold/.test(n) && /(end|finish)/.test(n)) return fmtDay(p.hold_end);
      if (/(expir|end date|finish)/.test(n)) return fmtDay(p.mend);
      if (/unsubscribe/.test(n)) return unsubUrl || "#";
      if (/(owing|balance|amount)/.test(n)) return "$" + (+p.owing || 0).toFixed(2);
      if (/club/.test(n) && /name/.test(n)) return "M2 Training Club";
      if (/phone/.test(n)) return "09 558 1408";
      if (unknown) unknown.add(name);
      return "";
    }).replace(/\{first\}/g, p.first_name || "there");
  }
  function gmPage(html, unsubUrl, marketing) {
    let h = String(html || "");
    if (marketing && unsubUrl && !/unsubscribe/i.test(h)) h += `<div style="text-align:center;font:12px Arial,Helvetica,sans-serif;color:#5B5B55;padding:16px"><a href="${esc(unsubUrl)}" style="color:#5B5B55;text-decoration:none">Unsubscribe</a></div>`;
    return /<html/i.test(h) ? h : `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;background:#F3F3F0">${h}</body></html>`;
  }
  const strip = h => String(h || "").replace(/<style[\s\S]*?<\/style>/gi, "").replace(/<br\s*\/?>/gi, "\n").replace(/<\/(p|div|tr|h\d|li)>/gi, "\n").replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&#39;|&rsquo;/g, "'").replace(/[ \t]+/g, " ").replace(/\n\s*\n\s*\n+/g, "\n\n").trim();

  // One-time code for the GymMaster copy (owners), then the copy itself (comes in through m2-join).
  async function importToken(env, can) {
    if (!can.settings) return { error: "Owners only" };
    const t = crypto.randomUUID();
    await run(env, "INSERT INTO settings(key, value) VALUES ('gm_import_token', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value", JSON.stringify({ t, exp: Date.now() + 3600_000 }));
    return { token: t };
  }
  async function importGm(env, b) {
    const s0 = await one(env, "SELECT value FROM settings WHERE key = 'gm_import_token'");
    const tok = s0 ? JSON.parse(s0.value) : null;
    if (!tok || !b || b.token !== tok.t || Date.now() > tok.exp) return { ok: false, error: "Import code is missing or expired" };
    const tasks = Array.isArray(b.tasks) ? b.tasks : [], tpls = Array.isArray(b.templates) ? b.templates : [];
    const stmts = [];
    for (const x of tpls) stmts.push(env.DB.prepare(`INSERT INTO gm_templates(template_id, name, subject, body) VALUES (?, ?, ?, ?)
      ON CONFLICT(template_id) DO UPDATE SET name = excluded.name, subject = excluded.subject, body = excluded.body, imported_at = datetime('now')`).bind(+x.id, String(x.name || ""), String(x.subject || ""), String(x.body || "")));
    for (const t of tasks) stmts.push(env.DB.prepare(`INSERT INTO gm_tasks(task_id, name, trigger, qty, unit, sign, x, types, template_id, recipient) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(task_id) DO UPDATE SET name = excluded.name, trigger = excluded.trigger, qty = excluded.qty, unit = excluded.unit, sign = excluded.sign, x = excluded.x,
        types = excluded.types, template_id = excluded.template_id, recipient = excluded.recipient, imported_at = datetime('now')`)
      .bind(+t.id, String(t.name || ""), String(t.trigger || ""), +t.qty || 0, String(t.unit || ""), String(t.sign || ""), t.x == null || t.x === "" ? null : +t.x,
            JSON.stringify(t.types && t.types.length ? t.types : ["All Memberships"]), +t.template_id || null, t.recipient === "staff" ? "staff" : "member"));
    for (let i = 0; i < stmts.length; i += 50) await env.DB.batch(stmts.slice(i, i + 50));
    const byTpl = Object.fromEntries(tpls.map(x => [+x.id, x]));
    const unknown = new Set();
    const st2 = [];
    for (const t of tasks) {
      const tp = byTpl[+t.template_id]; if (!tp) continue;
      const key = "gm_" + (+t.id), r = gmRule({ ...t, types: JSON.stringify(t.types || []), qty: t.qty, task_id: t.id }) || {};
      fill(tp.subject + " " + tp.body, {}, "", unknown);
      st2.push(env.DB.prepare("INSERT INTO automations(key, name, goal, goal_window_days, active, holdout_pct) VALUES (?, ?, ?, ?, 0, 0) ON CONFLICT(key) DO UPDATE SET name = excluded.name, goal = excluded.goal")
        .bind(key, String(t.name || tp.name), r.goal || "none", 14));
      st2.push(env.DB.prepare(`INSERT INTO auto_content(key, subject, body) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET subject = excluded.subject, body = excluded.body, updated_at = datetime('now')`)
        .bind(key, String(tp.subject || tp.name), strip(tp.body).slice(0, 4000) || "(designed email)"));
      st2.push(env.DB.prepare("INSERT INTO auto_html(key, html) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET html = excluded.html").bind(key, String(tp.body || "")));
    }
    for (let i = 0; i < st2.length; i += 50) await env.DB.batch(st2.slice(i, i + 50));
    await run(env, "DELETE FROM settings WHERE key = 'gm_import_token'");
    return { ok: true, tasks: tasks.length, templates: tpls.length, unknown_fields: [...unknown] };
  }

  async function people(env, key, d, rule) {
    const [sql, ...args] = rule.sql(d);
    const ids = (await all(env, sql, ...args)).map(r => r.id);
    if (!ids.length) return [];
    const out = [];
    for (let i = 0; i < ids.length; i += 90) {
      const part = ids.slice(i, i + 90);
      out.push(...await all(env, `SELECT m.id, m.first_name, m.last_name, m.email, m.marketing_email,
          EXISTS (SELECT 1 FROM member_flags f WHERE f.member_id = m.id AND f.flag IN ('do_not_contact','staff')) dnc,
          EXISTS (SELECT 1 FROM email_unsubs u WHERE u.email = lower(m.email)) unsub,
          (SELECT max(day) FROM email_log l WHERE l.member_id = m.id AND l.auto_key = ? AND l.status IN ('sent','preview','held_out')) last_sent,
          (SELECT p.gm_type_name FROM memberships ms JOIN plans p ON p.id = ms.plan_id WHERE ms.member_id = m.id AND ms.status = 'current' ORDER BY ms.start_date DESC LIMIT 1) mtype,
          (SELECT max(s.end_date) FROM mship_seen s WHERE s.member_id = m.id) mend,
          (SELECT max(h.ends) FROM gm_holds h WHERE h.member_id = m.id) hold_end,
          (SELECT balance_owing FROM billing_accounts b WHERE b.member_id = m.id) owing
        FROM members m WHERE m.id IN (${part.map(() => "?").join(",")})`, key, ...part));
    }
    return out.map(p => {
      let skip = null;
      if (rule.to === "staff") skip = null;
      else if (!p.email || !/@/.test(p.email)) skip = "No email";
      else if (p.dnc) skip = "Do not contact";
      else if (rule.marketing && (p.unsub || p.marketing_email === 0)) skip = "Unsubscribed";
      else if (p.last_sent && p.last_sent > addDays(d, -rule.every) && p.last_sent !== d) skip = "Had this one lately";
      return { ...p, skip };
    });
  }

  // The 9am run.
  async function daily(env) {
    await ensureContent(env);
    const d = todayNz(), autos = await all(env, "SELECT a.key, a.holdout_pct, c.*, h.html FROM automations a JOIN auto_content c ON c.key = a.key LEFT JOIN auto_html h ON h.key = a.key");
    const R = await rules(env), RECEPTION = env.RECEPTION_EMAIL || "reception@m2club.co.nz";
    const sentToday = new Set((await all(env, "SELECT member_id FROM email_log WHERE day = ? AND status = 'sent'", d)).map(r => r.member_id));
    const out = {};
    for (const a of autos) {
      const rule = R[a.key];
      if (!rule || rule.unsupported) continue;
      const list = await people(env, a.key, d, rule);
      const o = out[a.key] = { due: 0, sent: 0, preview: 0, held: 0, skipped: 0, failed: 0 };
      for (const p of list) {
        if (p.skip || (rule.to !== "staff" && sentToday.has(p.id))) {
          o.skipped++;
          await run(env, "INSERT OR IGNORE INTO email_log(auto_key, member_id, email, subject, status, detail, day) VALUES (?, ?, ?, ?, 'skipped', ?, ?)", a.key, p.id, p.email, a.subject, p.skip || "Already had an email today", d);
          continue;
        }
        o.due++;
        const held = a.holdout_pct > 0 && (p.id * 2654435761 % 100) < a.holdout_pct;
        let status = held ? "held_out" : a.sending && env.RESEND_API_KEY ? "sent" : "preview", pid = null, detail = null;
        const ins = await run(env, "INSERT OR IGNORE INTO email_log(auto_key, member_id, email, subject, status, day) VALUES (?, ?, ?, ?, ?, ?)", a.key, p.id, p.email, a.subject, status === "sent" ? "sending" : status, d);
        if (!(ins.meta && ins.meta.changes)) continue;   // already handled today
        if (status === "sent") {
          try {
            const to = rule.to === "staff" ? RECEPTION : p.email;
            const unsub = rule.marketing && rule.to !== "staff" ? PUBLIC(env) + "/unsubscribe?e=" + encodeURIComponent(p.email) + "&t=" + await sign(env, p.email) : null;
            const built = a.html ? { subject: fill(a.subject, p, unsub), html: gmPage(fill(a.html, p, unsub), unsub, rule.marketing) } : null;
            pid = await send(env, to, a, p.first_name, unsub, built);
            if (rule.to !== "staff") sentToday.add(p.id);
          }
          catch (e) { status = "failed"; detail = String(e.message || e).slice(0, 200); }
          await run(env, "UPDATE email_log SET status = ?, provider_id = ?, detail = ? WHERE auto_key = ? AND member_id = ? AND day = ?", status, pid, detail, a.key, p.id, d);
        }
        o[status === "held_out" ? "held" : status]++;
      }
    }
    await run(env, "INSERT INTO settings(key, value) VALUES ('email_last_run', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value", JSON.stringify({ at: new Date().toISOString(), ...out }));
    return out;
  }

  // Nightly: mark who did the thing each email was meant to get them to do.
  async function goals(env) {
    const rows = await all(env, `SELECT l.id, l.member_id, l.day, a.goal, a.goal_window_days w FROM email_log l JOIN automations a ON a.key = l.auto_key
                                 WHERE l.goal_met_at IS NULL AND l.status IN ('sent','preview','held_out') AND l.day >= date('now', '-' || a.goal_window_days || ' days', '-1 day')`);
    let met = 0;
    for (const r of rows) {
      const until = addDays(r.day, r.w);
      let hit = null;
      if (r.goal === "visited" || r.goal === "attended") hit = await one(env, "SELECT min(at) t FROM visits WHERE member_id = ? AND substr(at,1,10) > ? AND substr(at,1,10) <= ?", r.member_id, r.day, until);
      else if (r.goal === "joined") hit = await one(env, `SELECT min(ms.start_date) t FROM memberships ms JOIN plans p ON p.id = ms.plan_id WHERE ms.member_id = ? AND p.family NOT IN ('trial','pass') AND ms.status = 'current' AND ms.start_date >= ?`, r.member_id, r.day);
      else if (r.goal === "upgraded") hit = await one(env, `SELECT min(ms.start_date) t FROM memberships ms JOIN plans p ON p.id = ms.plan_id WHERE ms.member_id = ? AND p.family = 'perform' AND ms.status = 'current' AND ms.start_date >= ?`, r.member_id, r.day);
      else if (r.goal === "paid") hit = await one(env, `SELECT CASE WHEN coalesce(b.balance_owing, 0) <= 0 THEN b.updated_at END t FROM billing_accounts b WHERE b.member_id = ?`, r.member_id);
      if (hit && hit.t) { await run(env, "UPDATE email_log SET goal_met_at = ? WHERE id = ?", hit.t, r.id); met++; }
    }
    return { checked: rows.length, met };
  }

  /* ---------------- the page ---------------- */

  async function overview(env, who, can) {
    if (!can.collections) return { error: "No access" };
    await ensureContent(env);
    const d = todayNz();
    const R = await rules(env);
    const autos = (await all(env, `SELECT a.key, a.name, a.goal, a.goal_window_days, a.holdout_pct, c.subject, c.heading, c.body, c.button, c.url, c.sending, c.updated_at, s.name updated_by,
                                     (SELECT 1 FROM auto_html h WHERE h.key = a.key) designed
                                  FROM automations a JOIN auto_content c ON c.key = a.key LEFT JOIN staff s ON s.id = c.updated_by ORDER BY a.id`)).filter(a => R[a.key]);
    const stats = Object.fromEntries((await all(env, `SELECT auto_key, sum(status = 'sent') sent, sum(status = 'preview') preview, sum(status = 'held_out') held, sum(status = 'failed') failed,
                                                         sum(goal_met_at IS NOT NULL AND status IN ('sent','preview')) met, sum(goal_met_at IS NOT NULL AND status = 'held_out') held_met
                                                       FROM email_log WHERE day >= ? GROUP BY auto_key`, addDays(d, -30))).map(r => [r.auto_key, r]));
    const out = [];
    for (const a of autos) {
      const rule = R[a.key], ok = rule && !rule.unsupported;
      let today = [];
      try { today = ok ? await people(env, a.key, d, rule) : []; } catch (e) { today = []; }
      const t = rule && rule.task;
      let types = null; try { types = t ? JSON.parse(t.types || "[]") : null; } catch {}
      out.push({ ...a, when: rule ? rule.when : "", supported: !!ok, goal_label: GOAL_LABEL[a.goal] || (a.goal === "none" ? "" : a.goal), to: rule && rule.to, marketing: !!(rule && rule.marketing),
                 group: groupOf(a, t), types: types && types[0] !== "All Memberships" ? types.length : 0,
                 today: today.filter(p => !p.skip).map(p => ({ id: p.id, name: [p.first_name, p.last_name].filter(Boolean).join(" ") })),
                 skipped_today: today.filter(p => p.skip).length, stats: stats[a.key] || {} });
    }
    const last = await one(env, "SELECT value FROM settings WHERE key = 'email_last_run'");
    const unsubs = (await one(env, "SELECT count(*) n FROM email_unsubs")).n;
    return { connected: !!env.RESEND_API_KEY, from: FROM(env), autos: out, last_run: last ? JSON.parse(last.value) : null, unsubs, can_switch: !!can.settings };
  }

  function groupOf(a, t) {
    const n = (a.name + " " + (t ? t.trigger : "")).toLowerCase();
    if (/staff|reception|alert/.test(n)) return "Staff alerts";
    if (/trial|5 days|day 3/.test(n)) return "Trials";
    if (/fail|blocked|arrear|payment/.test(n)) return "Payments";
    if (/hold|cancel|expir|ex-member|win back/.test(n) && !/passport/.test(n)) return "Holds, cancelling and leaving";
    if (/no visit|miss you|passport/.test(n)) return "Bringing people back";
    if (/birthday|anniversary|review|upgrade|visited x/.test(n)) return "Milestones and upgrades";
    if (/join|sign up|welcome|check|app|prospect|pt consult/.test(n)) return "Joining";
    return "Other";
  }

  async function save(env, who, can, key, b) {
    if (!can.collections) return { ok: false, error: "No access" };
    if (!(await one(env, "SELECT key FROM auto_content WHERE key = ?", key))) return { ok: false, error: "Not found" };
    if (b.action === "sending") {
      if (!can.settings) return { ok: false, error: "Only Taylor and Tim can switch who sends an automation." };
      if (b.on && !env.RESEND_API_KEY) return { ok: false, error: "Connect email sending first (Resend key in Cloudflare)." };
      await run(env, "UPDATE auto_content SET sending = ?, updated_by = ?, updated_at = datetime('now') WHERE key = ?", b.on ? 1 : 0, who.id, key);
      return { ok: true };
    }
    if (b.action === "test") {
      const c = await one(env, "SELECT c.*, h.html FROM auto_content c LEFT JOIN auto_html h ON h.key = c.key WHERE c.key = ?", key);
      const me = await one(env, "SELECT email, name FROM staff WHERE id = ?", who.id);
      const p = { first_name: String(me.name).split(" ")[0], last_name: String(me.name).split(" ").slice(1).join(" "), email: me.email, mtype: "M2 Perform - Weekly", mend: addDays(todayNz(), 7), hold_end: addDays(todayNz(), 3) };
      const built = c.html ? { subject: "[Test] " + fill(c.subject, p, "#"), html: gmPage(fill(c.html, p, "#"), "#", false) } : null;
      try { await send(env, me.email, { ...c, subject: "[Test] " + c.subject }, p.first_name, null, built); return { ok: true, to: me.email }; }
      catch (e) { return { ok: false, error: e.message }; }
    }
    const t = (v, n) => String(v ?? "").trim().slice(0, n);
    if (b.html !== undefined) {
      const subject = t(b.subject, 200), html = String(b.html || "");
      if (!subject || html.length < 20) return { ok: false, error: "It needs a subject and the email." };
      if (html.length > 200000) return { ok: false, error: "That email is too big." };
      await run(env, "UPDATE auto_content SET subject = ?, body = ?, updated_by = ?, updated_at = datetime('now') WHERE key = ?", subject, strip(html).slice(0, 4000) || "(designed email)", who.id, key);
      await run(env, "INSERT INTO auto_html(key, html) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET html = excluded.html", key, html);
      if (b.holdout_pct !== undefined && can.settings) await run(env, "UPDATE automations SET holdout_pct = ? WHERE key = ?", Math.max(0, Math.min(50, +b.holdout_pct || 0)), key);
      return { ok: true };
    }
    const subject = t(b.subject, 150), body = t(b.body, 4000);
    if (!subject || !body) return { ok: false, error: "It needs a subject and some words." };
    const url = t(b.url, 300);
    if (url && !/^https:\/\//.test(url)) return { ok: false, error: "The button link should start with https://" };
    await run(env, "UPDATE auto_content SET subject = ?, heading = ?, body = ?, button = ?, url = ?, updated_by = ?, updated_at = datetime('now') WHERE key = ?",
      subject, t(b.heading, 120) || null, body, t(b.button, 60) || null, url || null, who.id, key);
    if (b.holdout_pct !== undefined && can.settings) await run(env, "UPDATE automations SET holdout_pct = ? WHERE key = ?", Math.max(0, Math.min(50, +b.holdout_pct || 0)), key);
    return { ok: true };
  }

  async function preview(env, who, can, key) {
    if (!can.collections) return new Response("No access", { status: 403 });
    await ensureContent(env);
    const c = await one(env, "SELECT c.*, h.html FROM auto_content c LEFT JOIN auto_html h ON h.key = c.key WHERE c.key = ?", key);
    if (!c) return new Response("Not found", { status: 404 });
    const p = { first_name: String(who.name).split(" ")[0], last_name: String(who.name).split(" ").slice(1).join(" "), email: "", mtype: "M2 Perform - Weekly", mend: addDays(todayNz(), 7), hold_end: addDays(todayNz(), 3), owing: 54.5 };
    const html = c.html ? gmPage(fill(c.html, p, "#"), "#", false) : render(c, p.first_name, "#");
    return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
  }

  // Public: the unsubscribe link in every marketing email.
  async function unsubscribe(env, url, req) {
    const e = String(url.searchParams.get("e") || "").toLowerCase().trim(), t = url.searchParams.get("t") || "";
    const page = (h, msg) => new Response(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>M2 Training Club</title></head>
<body style="margin:0;background:#F3F3F0;font:16px/1.6 Arial,Helvetica,sans-serif;color:#0A0A0A"><div style="max-width:520px;margin:40px auto;background:#fff;border-radius:24px;padding:32px"><img src="https://m2club.co.nz/assets/img/m2-logo-lime.png" alt="M2 Training Club" style="height:26px;background:#0A0A0A;padding:10px 14px;border-radius:10px"><h1 style="font-size:24px">${h}</h1><p>${msg}</p></div></body></html>`,
      { headers: { "Content-Type": "text/html; charset=utf-8" } });
    if (!e || t !== await sign(env, e)) return page("That link didn't work", "Reply to any of our emails and we'll take you off the list.");
    await run(env, "INSERT OR IGNORE INTO email_unsubs(email) VALUES (?)", e);
    await run(env, "UPDATE members SET marketing_email = 0 WHERE lower(email) = ?", e);
    return page("You're unsubscribed", "You won't get any more of these emails from M2. You'll still hear from us about your membership and payments.");
  }

  async function source(env, can, key) {
    if (!can.collections) return { error: "No access" };
    const c = await one(env, "SELECT c.subject, h.html FROM auto_content c LEFT JOIN auto_html h ON h.key = c.key WHERE c.key = ?", key);
    return c || { error: "Not found" };
  }

  return { daily, goals, overview, save, preview, unsubscribe, ensureContent, importToken, importGm, source };
}
