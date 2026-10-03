// M2 Core: free PT leads.
// The free PT questionnaire (m2club.co.nz/free-pt.html) still writes to the PT Leads sheet, and the
// Core copies it every 15 minutes. New leads wait for Tim (owners only see this page). Tim gives
// each one to a trainer, the trainer's phone buzzes, and they work it from "My PT leads".
// While trainers still use the old PT board, the Core writes assignments back to the sheet too
// (needs the PT_ADMIN_KEY secret, the same one the Command Centre uses), which also sends the
// trainer the usual email.

export function makePt(L) {
  const { nzDateTime, normMobile, P } = L;
  const all = (env, sql, ...a) => env.DB.prepare(sql).bind(...a).all().then(r => r.results || []);
  const one = (env, sql, ...a) => env.DB.prepare(sql).bind(...a).first();
  const run = (env, sql, ...a) => env.DB.prepare(sql).bind(...a).run();
  const SCRIPT = env => env.PT_SCRIPT || "https://script.google.com/macros/s/AKfycbzd4BypnwjEdvToljlvMUpvfDMjmSAdSHaS7nnygv6TCulkC7Rax21Ure9flx_eLfpW/exec";

  // Sheet status <-> Core status
  const FROM_SHEET = { "new": "new", contacted: "contacted", "trial booked": "booked", won: "client", lost: "lost" };
  const TO_SHEET = { new: "New", assigned: "New", contacted: "Contacted", booked: "Trial Booked", client: "Won", lost: "Lost" };
  const RANK = { new: 0, assigned: 1, contacted: 2, booked: 3, client: 4, lost: 4 };
  const STAGE = { new: "new", assigned: "new", contacted: "contacted", booked: "trial", client: "joined", lost: "lost" };
  const LABEL = { new: "Waiting for Tim", assigned: "With the trainer", contacted: "Contacted", booked: "Session booked", client: "Became a client", lost: "Not going ahead" };
  // Names the sheet uses for people whose staff record says something else.
  const ALIAS = { "te ao": "te ao kura", te: "te ao kura", joe: "jo", dave: "david", foxxy: "tim", matty: "matthew", rod: "rodney" };

  async function trainers(env) {
    return all(env, `SELECT s.id, s.name, s.role, s.list_order,
                       (SELECT count(*) FROM leads l JOIN pt_leads p ON p.lead_id = l.id WHERE l.assigned_to = s.id AND p.pt_status IN ('assigned','contacted','booked')) open,
                       (SELECT count(*) FROM leads l JOIN pt_leads p ON p.lead_id = l.id WHERE l.assigned_to = s.id AND p.pt_status = 'client' AND p.updated_at >= datetime('now','-90 days')) won,
                       (SELECT count(*) FROM leads l JOIN pt_leads p ON p.lead_id = l.id WHERE l.assigned_to = s.id AND p.assigned_at >= datetime('now','-30 days')) month,
                       (SELECT count(*) FROM push_subs ps WHERE ps.staff_id = s.id) phones
                     FROM staff s WHERE s.active = 1 AND s.role IN ('trainer','coach','owner','manager')
                     ORDER BY CASE s.role WHEN 'trainer' THEN 0 WHEN 'coach' THEN 1 WHEN 'manager' THEN 2 ELSE 3 END, s.list_order, s.name`);
  }
  function matchStaff(staff, sheetName) {
    let n = String(sheetName || "").toLowerCase().trim();
    if (!n) return null;
    n = ALIAS[n] || n;
    const s = staff.find(x => x.name.toLowerCase() === n) || staff.find(x => x.name.toLowerCase().startsWith(n + " ")) ||
              staff.find(x => x.name.toLowerCase().split(" ")[0] === n.split(" ")[0]);
    return s ? s.id : null;
  }
  async function sheetName(env, staffId) {
    const r = await one(env, `SELECT p.sheet_trainer n, count(*) c FROM pt_leads p JOIN leads l ON l.id = p.lead_id WHERE l.assigned_to = ? AND p.sheet_trainer IS NOT NULL
                              GROUP BY 1 ORDER BY 2 DESC LIMIT 1`, staffId);
    if (r) return r.n;
    const s = await one(env, "SELECT name FROM staff WHERE id = ?", staffId);
    return s ? s.name.split(" ")[0] : "";
  }
  async function toSheet(env, p, status, trainer) {
    if (!env.PT_ADMIN_KEY || !p.sheet_id) return "not_linked";
    try {
      const r = await fetch(SCRIPT(env), { method: "POST", redirect: "follow", headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({ action: "updateLead", id: p.sheet_id, status, trainer, key: env.PT_ADMIN_KEY }) });
      return r.ok ? "sent" : "error " + r.status;
    } catch (e) { return "error " + e.message; }
  }

  /* ---------------- copy from the sheet ---------------- */

  async function sync(env) {
    let list = null;
    try {
      const r = await fetch(SCRIPT(env) + "?action=list" + (env.PT_ADMIN_KEY ? "&key=" + encodeURIComponent(env.PT_ADMIN_KEY) : ""), { redirect: "follow" });
      const d = JSON.parse(await r.text());
      if (Array.isArray(d.leads)) list = d.leads;
    } catch {}
    if (!list && env.M2CC) { try { const t = await env.M2CC.get("pt:last"); if (t) list = JSON.parse(t).leads; } catch {} }
    if (!list) return { ok: false, error: "Couldn't reach the PT lead sheet" };
    const staff = await all(env, "SELECT id, name FROM staff WHERE active = 1");
    const have = Object.fromEntries((await all(env, "SELECT p.sheet_id, p.lead_id, p.pt_status, l.assigned_to FROM pt_leads p JOIN leads l ON l.id = p.lead_id WHERE p.sheet_id IS NOT NULL")).map(r => [r.sheet_id, r]));
    const fresh = [];
    let added = 0, changed = 0;
    for (const l of list) {
      if (!l.id || !(l.name || l.phone || l.email)) continue;
      const at = l.receivedAt ? nzDateTime(new Date(l.receivedAt)) : nzDateTime(new Date());
      const st = FROM_SHEET[String(l.status || "new").toLowerCase()] || "new";
      const tr = matchStaff(staff, l.trainer);
      const ans = [String(l.reasonForJoining || "").slice(0, 500) || null, String(l.trainerPreference || "").slice(0, 200) || null, String(l.trainingStyle || "").slice(0, 200) || null,
                   String(l.preferredTime || "").slice(0, 200) || null, String(l.injuries || "").slice(0, 300) || null];
      const h = have[l.id];
      if (!h) {
        const name = String(l.name || "").trim().slice(0, 120) || null;
        const old = await one(env, "SELECT l.id FROM leads l LEFT JOIN pt_leads p ON p.lead_id = l.id WHERE l.kind = 'free_pt' AND p.lead_id IS NULL AND l.created_at = ? AND coalesce(l.name,'') = ? LIMIT 1", at, name || "");
        const status = st === "new" && tr ? "assigned" : st;
        let id = old && old.id;
        if (id) await run(env, "UPDATE leads SET assigned_to = coalesce(?, assigned_to), stage = ? WHERE id = ?", tr, STAGE[status], id);
        else {
          const row = await one(env, `INSERT INTO leads(name, email, mobile, kind, source, stage, assigned_to, goal, notes, created_at) VALUES (?, ?, ?, 'free_pt', ?, ?, ?, ?, ?, ?) RETURNING id`,
            name, (l.email || "").toLowerCase().trim() || null, normMobile(l.phone || "") || null, String(l.source || "Free PT form").slice(0, 80), STAGE[status], tr,
            ans[0] ? ans[0].slice(0, 120) : null, null, at);
          id = row.id;
        }
        await run(env, `INSERT INTO pt_leads(lead_id, sheet_id, reason, wants, style, best_time, injuries, pt_status, sheet_trainer, assigned_at, notes, updated_at)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
          id, l.id, ...ans, status, l.trainer || null, l.assignedAt ? nzDateTime(new Date(l.assignedAt)) : null, String(l.notes || "").slice(0, 1000) || null);
        added++;
        if (status === "new" && at >= nzDateTime(new Date(Date.now() - 2 * 86400_000))) fresh.push({ id, name, reason: ans[0] });
      } else {
        // The sheet only fills gaps or moves a lead forward. Anything Tim or a trainer set here wins.
        const ups = [];
        if (!h.assigned_to && tr) ups.push(run(env, "UPDATE leads SET assigned_to = ? WHERE id = ?", tr, h.lead_id));
        let status = h.pt_status;
        if (RANK[st] > RANK[status]) status = st;
        if (status === "new" && (h.assigned_to || tr)) status = "assigned";
        if (status !== h.pt_status) ups.push(run(env, "UPDATE pt_leads SET pt_status = ?, updated_at = datetime('now') WHERE lead_id = ?", status, h.lead_id),
                                             run(env, "UPDATE leads SET stage = ? WHERE id = ?", STAGE[status], h.lead_id));
        ups.push(run(env, "UPDATE pt_leads SET sheet_trainer = coalesce(?, sheet_trainer), notes = coalesce(?, notes) WHERE lead_id = ?", l.trainer || null, String(l.notes || "").slice(0, 1000) || null, h.lead_id));
        await Promise.all(ups);
        if (ups.length > 1) changed++;
      }
    }
    if (fresh.length) {
      const owners = (await all(env, "SELECT id FROM staff WHERE role = 'owner' AND active = 1")).map(r => r.id);
      const f = fresh[0];
      await P.toStaff(env, owners, { title: fresh.length > 1 ? fresh.length + " new free PT leads" : "New free PT lead: " + (f.name || "someone"),
        body: fresh.length > 1 ? "Waiting for you to give them to a trainer." : (f.reason || "Waiting for you to give it to a trainer.").slice(0, 140), url: "/#ptleads", tag: "pt-new" });
    }
    return { ok: true, sheet: list.length, added, changed, notified: fresh.length };
  }

  /* ---------------- pages ---------------- */

  const COLS = `l.id, l.name, l.email, l.mobile, l.source, l.created_at, l.assigned_to, s.name trainer, l.member_id,
                p.reason, p.wants, p.style, p.best_time, p.injuries, p.pt_status, p.assigned_at, p.notes, p.updated_at, p.seen_at`;
  const FROM = `FROM leads l JOIN pt_leads p ON p.lead_id = l.id LEFT JOIN staff s ON s.id = l.assigned_to`;

  async function board(env, who, can) {
    if (!can.settings) return { error: "Only Taylor and Tim see the PT leads." };
    const waiting = await all(env, `SELECT ${COLS} ${FROM} WHERE p.pt_status = 'new' ORDER BY l.created_at DESC LIMIT 200`);
    const open = await all(env, `SELECT ${COLS} ${FROM} WHERE p.pt_status IN ('assigned','contacted','booked') ORDER BY coalesce(p.assigned_at, l.created_at) DESC LIMIT 400`);
    const closed = await all(env, `SELECT ${COLS} ${FROM} WHERE p.pt_status IN ('client','lost') AND p.updated_at >= datetime('now','-60 days') ORDER BY p.updated_at DESC LIMIT 100`);
    const stats = await one(env, `SELECT count(*) n, sum(p.pt_status = 'client') won, sum(p.pt_status = 'lost') lost,
                                     avg(CASE WHEN p.assigned_at IS NOT NULL THEN (julianday(p.assigned_at) - julianday(l.created_at)) * 24 END) hours_to_assign
                                   FROM leads l JOIN pt_leads p ON p.lead_id = l.id WHERE l.created_at >= datetime('now','-30 days')`);
    const last = await one(env, "SELECT value FROM settings WHERE key = 'pt_last_sync'");
    return { waiting, open, closed, trainers: await trainers(env), stats, labels: LABEL, sheet_linked: !!env.PT_ADMIN_KEY, last_sync: last ? last.value : null };
  }

  async function assign(env, who, can, id, b) {
    if (!can.settings) return { ok: false, error: "Only Taylor and Tim give out PT leads." };
    const p = await one(env, `SELECT ${COLS}, p.sheet_id ${FROM} WHERE l.id = ?`, id);
    if (!p) return { ok: false, error: "Lead not found" };
    const to = +b.staff_id;
    const t = to ? await one(env, "SELECT id, name FROM staff WHERE id = ? AND active = 1", to) : null;
    if (to && !t) return { ok: false, error: "Pick a trainer" };
    const note = String(b.note || "").trim().slice(0, 300);
    const status = t ? (RANK[p.pt_status] > 1 ? p.pt_status : "assigned") : "new";
    await env.DB.batch([
      env.DB.prepare("UPDATE leads SET assigned_to = ?, stage = ? WHERE id = ?").bind(t ? t.id : null, STAGE[status], id),
      env.DB.prepare("UPDATE pt_leads SET pt_status = ?, assigned_at = CASE WHEN ? THEN datetime('now') ELSE NULL END, assigned_by = ?, seen_at = NULL, tim_note = ?, updated_at = datetime('now') WHERE lead_id = ?")
        .bind(status, t ? 1 : 0, who.id, note || null, id),
      env.DB.prepare("INSERT INTO activity(lead_id, staff_id, kind, detail) VALUES (?, ?, 'note', ?)").bind(id, who.id, t ? "PT lead given to " + t.name + (note ? ": " + note : "") : "PT lead taken back"),
    ]);
    let pushed = null, sheet = null;
    if (t) {
      pushed = await P.toStaff(env, t.id, { title: "New PT lead: " + (p.name || "someone"), body: (note ? note + ". " : "") + (p.reason || "Tap to see their answers and call them.").slice(0, 140),
                                            url: "/#mypt", tag: "pt-" + id });
      sheet = await toSheet(env, p, TO_SHEET[status], await sheetName(env, t.id));
    }
    return { ok: true, pushed, sheet };
  }

  async function mine(env, who) {
    const rows = await all(env, `SELECT ${COLS}, p.tim_note FROM leads l JOIN pt_leads p ON p.lead_id = l.id LEFT JOIN staff s ON s.id = l.assigned_to
                                 WHERE l.assigned_to = ? AND (p.pt_status IN ('assigned','contacted','booked') OR p.updated_at >= datetime('now','-30 days'))
                                 ORDER BY CASE p.pt_status WHEN 'assigned' THEN 0 WHEN 'contacted' THEN 1 WHEN 'booked' THEN 2 ELSE 3 END, p.assigned_at DESC LIMIT 200`, who.id);
    if (rows.some(r => !r.seen_at)) await run(env, "UPDATE pt_leads SET seen_at = datetime('now') WHERE seen_at IS NULL AND lead_id IN (SELECT id FROM leads WHERE assigned_to = ?)", who.id);
    return { leads: rows, labels: LABEL };
  }

  async function update(env, who, can, id, b) {
    const p = await one(env, `SELECT ${COLS}, p.sheet_id ${FROM} WHERE l.id = ?`, id);
    if (!p) return { ok: false, error: "Lead not found" };
    if (p.assigned_to !== who.id && !can.settings) return { ok: false, error: "That lead isn't yours." };
    const status = ["contacted", "booked", "client", "lost", "assigned"].includes(b.status) ? b.status : null;
    const note = String(b.note || "").trim().slice(0, 500);
    if (!status && !note) return { ok: false, error: "Nothing to save" };
    const stmts = [];
    if (status) stmts.push(env.DB.prepare("UPDATE pt_leads SET pt_status = ?, updated_at = datetime('now') WHERE lead_id = ?").bind(status, id),
                           env.DB.prepare("UPDATE leads SET stage = ?, contacted_at = coalesce(contacted_at, CASE WHEN ? <> 'assigned' THEN datetime('now') END), closed_at = CASE WHEN ? IN ('client','lost') THEN datetime('now') ELSE closed_at END WHERE id = ?")
                             .bind(STAGE[status], status, status, id));
    stmts.push(env.DB.prepare("INSERT INTO activity(lead_id, staff_id, kind, detail) VALUES (?, ?, 'note', ?)").bind(id, who.id, (status ? LABEL[status] : "Note") + (note ? ": " + note : "")));
    await env.DB.batch(stmts);
    let sheet = null;
    if (status) sheet = await toSheet(env, p, TO_SHEET[status], p.assigned_to ? await sheetName(env, p.assigned_to) : "");
    return { ok: true, sheet };
  }

  async function history(env, who, can, id) {
    const p = await one(env, `SELECT ${COLS} ${FROM} WHERE l.id = ?`, id);
    if (!p || (p.assigned_to !== who.id && !can.settings)) return { error: "No access" };
    const act = await all(env, "SELECT a.detail, a.at, s.name staff FROM activity a LEFT JOIN staff s ON s.id = a.staff_id WHERE a.lead_id = ? ORDER BY a.at DESC LIMIT 20", id);
    return { lead: p, activity: act };
  }

  async function nightlySync(env) {
    const r = await sync(env).catch(e => ({ ok: false, error: String(e.message || e) }));
    await run(env, "INSERT INTO settings(key, value) VALUES ('pt_last_sync', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value", new Date().toISOString());
    return r;
  }

  return { sync: nightlySync, board, assign, mine, update, history, trainers, LABEL };
}
