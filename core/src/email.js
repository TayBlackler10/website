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
  const ORIGIN = "https://m2-core.taylor-3e5.workers.dev";

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

  async function send(env, to, c, first, unsubUrl) {
    if (!env.RESEND_API_KEY) throw new Error("Email sending isn't connected yet");
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

  async function people(env, key, d) {
    const rule = RULES[key];
    const [sql, ...args] = rule.sql(d);
    const ids = (await all(env, sql, ...args)).map(r => r.id);
    if (!ids.length) return [];
    const out = [];
    for (let i = 0; i < ids.length; i += 90) {
      const part = ids.slice(i, i + 90);
      out.push(...await all(env, `SELECT m.id, m.first_name, m.last_name, m.email, m.marketing_email,
          EXISTS (SELECT 1 FROM member_flags f WHERE f.member_id = m.id AND f.flag IN ('do_not_contact','staff')) dnc,
          EXISTS (SELECT 1 FROM email_unsubs u WHERE u.email = lower(m.email)) unsub,
          (SELECT max(day) FROM email_log l WHERE l.member_id = m.id AND l.auto_key = ? AND l.status IN ('sent','preview','held_out')) last_sent
        FROM members m WHERE m.id IN (${part.map(() => "?").join(",")})`, key, ...part));
    }
    return out.map(p => {
      let skip = null;
      if (!p.email || !/@/.test(p.email)) skip = "No email";
      else if (p.dnc) skip = "Do not contact";
      else if (rule.marketing && (p.unsub || p.marketing_email === 0)) skip = "Unsubscribed";
      else if (p.last_sent && p.last_sent > addDays(d, -rule.every) && p.last_sent !== d) skip = "Had this one lately";
      return { ...p, skip };
    });
  }

  // The 9am run.
  async function daily(env) {
    await ensureContent(env);
    const d = todayNz(), autos = await all(env, "SELECT a.key, a.holdout_pct, c.* FROM automations a JOIN auto_content c ON c.key = a.key");
    const sentToday = new Set((await all(env, "SELECT member_id FROM email_log WHERE day = ? AND status = 'sent'", d)).map(r => r.member_id));
    const out = {};
    for (const a of autos) {
      if (!RULES[a.key]) continue;
      const list = await people(env, a.key, d);
      const o = out[a.key] = { due: 0, sent: 0, preview: 0, held: 0, skipped: 0, failed: 0 };
      for (const p of list) {
        if (p.skip || sentToday.has(p.id)) {
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
          try { pid = await send(env, p.email, a, p.first_name, ORIGIN + "/unsubscribe?e=" + encodeURIComponent(p.email) + "&t=" + await sign(env, p.email)); sentToday.add(p.id); }
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
    const autos = await all(env, `SELECT a.key, a.name, a.goal, a.goal_window_days, a.holdout_pct, c.subject, c.heading, c.body, c.button, c.url, c.sending, c.updated_at, s.name updated_by
                                  FROM automations a JOIN auto_content c ON c.key = a.key LEFT JOIN staff s ON s.id = c.updated_by ORDER BY a.id`);
    const stats = Object.fromEntries((await all(env, `SELECT auto_key, sum(status = 'sent') sent, sum(status = 'preview') preview, sum(status = 'held_out') held, sum(status = 'failed') failed,
                                                         sum(goal_met_at IS NOT NULL AND status IN ('sent','preview')) met, sum(goal_met_at IS NOT NULL AND status = 'held_out') held_met
                                                       FROM email_log WHERE day >= ? GROUP BY auto_key`, addDays(d, -30))).map(r => [r.auto_key, r]));
    const out = [];
    for (const a of autos) {
      const rule = RULES[a.key];
      const today = rule ? await people(env, a.key, d) : [];
      out.push({ ...a, when: rule ? rule.when : "Runs in the M2 App coach mode", supported: !!rule, goal_label: GOAL_LABEL[a.goal] || a.goal,
                 today: today.filter(p => !p.skip).map(p => ({ id: p.id, name: [p.first_name, p.last_name].filter(Boolean).join(" ") })),
                 skipped_today: today.filter(p => p.skip).length, stats: stats[a.key] || {} });
    }
    const last = await one(env, "SELECT value FROM settings WHERE key = 'email_last_run'");
    const unsubs = (await one(env, "SELECT count(*) n FROM email_unsubs")).n;
    return { connected: !!env.RESEND_API_KEY, from: FROM(env), autos: out, last_run: last ? JSON.parse(last.value) : null, unsubs, can_switch: !!can.settings };
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
      const c = await one(env, "SELECT * FROM auto_content WHERE key = ?", key);
      const me = await one(env, "SELECT email, name FROM staff WHERE id = ?", who.id);
      try { await send(env, me.email, { ...c, subject: "[Test] " + c.subject }, String(me.name).split(" ")[0], null); return { ok: true, to: me.email }; }
      catch (e) { return { ok: false, error: e.message }; }
    }
    const t = (v, n) => String(v ?? "").trim().slice(0, n);
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
    const c = await one(env, "SELECT * FROM auto_content WHERE key = ?", key);
    if (!c) return new Response("Not found", { status: 404 });
    return new Response(render(c, String(who.name).split(" ")[0], "#"), { headers: { "Content-Type": "text/html; charset=utf-8" } });
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

  return { daily, goals, overview, save, preview, unsubscribe, ensureContent };
}
