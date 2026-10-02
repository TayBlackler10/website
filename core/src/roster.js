// M2 Core: the reception roster (replaces Deputy). Bekka builds the week, publishes it,
// and everyone sees their own shifts. Pay stays in Smartpay; the Core only plans who is on.

export function makeRoster(L) {
  const { nzDateTime } = L;
  const todayNz = () => nzDateTime(new Date()).slice(0, 10);
  const addDays = (iso, n) => new Date(new Date(iso + "T12:00:00Z").getTime() + n * 86400_000).toISOString().slice(0, 10);
  const mondayOf = iso => { const d = new Date(iso + "T12:00:00Z"); return addDays(iso, -((d.getUTCDay() + 6) % 7)); };
  const all = (env, sql, ...a) => env.DB.prepare(sql).bind(...a).all().then(r => r.results || []);
  const canEdit = who => ["owner", "manager"].includes(who.role);
  const hours = s => { const [a, b] = [s.start, s.end].map(t => +t.slice(0, 2) + +t.slice(3, 5) / 60); return Math.max(0, (b < a ? b + 24 : b) - a - (s.break_min || 0) / 60); };

  async function week(env, who, q) {
    const asked = q.get("week");
    const wk = mondayOf(/^\d{4}-\d{2}-\d{2}$/.test(asked || "") ? asked : todayNz());
    const end = addDays(wk, 7);
    const edit = canEdit(who);
    const people = await all(env, `SELECT id, name, role FROM staff WHERE active = 1 AND role IN ('owner','manager','reception')
                                   ORDER BY CASE role WHEN 'reception' THEN 0 WHEN 'manager' THEN 1 ELSE 2 END, list_order, name`);
    const shifts = await all(env, `SELECT s.id, s.staff_id, s.day, s.start, s.end, s.break_min, s.area, s.note, s.published, st.name
                                   FROM shifts s JOIN staff st ON st.id = s.staff_id WHERE s.day >= ? AND s.day < ? ${edit ? "" : "AND s.published = 1"}
                                   ORDER BY s.day, s.start`, wk, end);
    for (const s of shifts) s.hours = Math.round(hours(s) * 100) / 100;
    const requests = await all(env, `SELECT r.id, r.staff_id, st.name, r.kind, r.day, r.note, r.status, r.created_at FROM shift_requests r JOIN staff st ON st.id = r.staff_id
                                     WHERE (r.status = 'pending' OR r.day >= ?) ${edit ? "" : "AND r.staff_id = " + (+who.id)} ORDER BY r.day LIMIT 50`, wk);
    const unpublished = shifts.filter(s => !s.published).length;
    return { week: wk, prev: addDays(wk, -7), next: end, today: todayNz(), can_edit: edit, me: who.id, people, shifts, requests, unpublished };
  }

  async function save(env, who, b) {
    if (!canEdit(who)) return { ok: false, error: "Only Bekka and the owners can change the roster." };
    const db = env.DB;
    if (b.action === "delete") { await db.prepare("DELETE FROM shifts WHERE id = ?").bind(+b.id).run(); return { ok: true }; }
    if (b.action === "publish") {
      const wk = mondayOf(String(b.week || todayNz()));
      const r = await db.prepare("UPDATE shifts SET published = 1 WHERE day >= ? AND day < ? AND published = 0").bind(wk, addDays(wk, 7)).run();
      return { ok: true, published: r.meta?.changes ?? null };
    }
    if (b.action === "copy") {
      const wk = mondayOf(String(b.week || todayNz())), from = addDays(wk, -7);
      const have = await db.prepare("SELECT count(*) n FROM shifts WHERE day >= ? AND day < ?").bind(wk, addDays(wk, 7)).first();
      if (have.n && !b.force) return { ok: false, error: "This week already has shifts. Clear them first, or copy anyway.", canForce: true };
      await db.prepare(`INSERT INTO shifts(staff_id, day, start, end, break_min, area, note, published, created_by)
                        SELECT staff_id, date(day, '+7 days'), start, end, break_min, area, note, 0, ? FROM shifts WHERE day >= ? AND day < ?`)
        .bind(who.id, from, wk).run();
      return { ok: true };
    }
    if (b.action === "request") {
      const s = String(b.status || "");
      if (!["approved", "declined"].includes(s)) return { ok: false, error: "Approve or decline" };
      await db.prepare("UPDATE shift_requests SET status = ?, decided_by = ?, decided_at = datetime('now') WHERE id = ?").bind(s, who.id, +b.id).run();
      return { ok: true };
    }
    const t = v => /^\d{2}:\d{2}$/.test(String(v || "")) ? v : null;
    const day = /^\d{4}-\d{2}-\d{2}$/.test(b.day || "") ? b.day : null, start = t(b.start), end = t(b.end);
    if (!day || !start || !end || !+b.staff_id) return { ok: false, error: "Pick the person, the day and the start and finish times." };
    const vals = [+b.staff_id, day, start, end, Math.max(0, Math.min(120, +b.break_min || 0)), String(b.area || "Reception").slice(0, 40), String(b.note || "").slice(0, 200) || null];
    if (b.id) await db.prepare("UPDATE shifts SET staff_id = ?, day = ?, start = ?, end = ?, break_min = ?, area = ?, note = ?, published = 0 WHERE id = ?").bind(...vals, +b.id).run();
    else await db.prepare("INSERT INTO shifts(staff_id, day, start, end, break_min, area, note, published, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?)").bind(...vals, who.id).run();
    return { ok: true };
  }

  // Anyone on the roster can ask for a day off or a swap; Bekka approves.
  async function ask(env, who, b) {
    const kind = ["leave", "swap", "available"].includes(b.kind) ? b.kind : "leave";
    if (!/^\d{4}-\d{2}-\d{2}$/.test(b.day || "")) return { ok: false, error: "Pick the day." };
    await env.DB.prepare("INSERT INTO shift_requests(staff_id, kind, day, note) VALUES (?, ?, ?, ?)").bind(who.id, kind, b.day, String(b.note || "").slice(0, 300) || null).run();
    return { ok: true };
  }

  async function onNow(env) {
    const now = nzDateTime(new Date()), d = now.slice(0, 10), hm = now.slice(11, 16);
    const rows = await all(env, `SELECT s.start, s.end, s.area, st.name FROM shifts s JOIN staff st ON st.id = s.staff_id
                                 WHERE s.day = ? AND s.published = 1 ORDER BY s.start`, d);
    return rows.map(r => ({ ...r, now: r.start <= hm && (r.end > hm || r.end < r.start) }));
  }

  async function csv(env, who, q) {
    if (!canEdit(who)) return new Response("No access", { status: 403 });
    const from = q.get("from"), to = q.get("to");
    const rows = await all(env, `SELECT st.name, s.day, s.start, s.end, s.break_min, s.area FROM shifts s JOIN staff st ON st.id = s.staff_id
                                 WHERE s.day >= ? AND s.day <= ? AND s.published = 1 ORDER BY st.name, s.day`, from, to);
    const out = [["Name", "Date", "Start", "Finish", "Break (min)", "Hours", "Area"].join(",")]
      .concat(rows.map(r => [r.name, r.day, r.start, r.end, r.break_min || 0, hours(r).toFixed(2), r.area].map(v => /[",]/.test(String(v)) ? '"' + String(v).replace(/"/g, '""') + '"' : v).join(",")));
    return new Response(out.join("\r\n") + "\r\n", { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="m2-roster-${from}-to-${to}.csv"` } });
  }

  return { week, save, ask, onNow, csv };
}
