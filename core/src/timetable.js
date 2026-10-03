// M2 Core: the weekly class timetable, owned by the Core.
// Copied from GymMaster the first time. The owners and the manager edit it here (class, time, coach, cap),
// every change is logged, and the page shows where GymMaster still differs. While GymMaster runs bookings,
// a change here also has to be made in GymMaster; once GymMaster stops, the Core runs classes off this.

export function makeTimetable(L) {
  const { nzDateTime } = L;
  const todayNz = () => nzDateTime(new Date()).slice(0, 10);
  const addDays = (iso, n) => new Date(Date.parse(iso + "T12:00:00Z") + n * 864e5).toISOString().slice(0, 10);
  const all = (env, sql, ...a) => env.DB.prepare(sql).bind(...a).all().then(r => r.results || []);
  const one = (env, sql, ...a) => env.DB.prepare(sql).bind(...a).first();
  const run = (env, sql, ...a) => env.DB.prepare(sql).bind(...a).run();
  const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const wd = iso => new Date(iso + "T12:00:00Z").getUTCDay();
  const hhmm = v => { const m = String(v || "").match(/^(\d{1,2}):(\d{2})/); return m ? m[1].padStart(2, "0") + ":" + m[2] : null; };
  const clean = s => String(s || "").replace(/\s+/g, " ").trim();
  const canEdit = can => !!(can.settings || can.collections);   // owners and the manager

  async function gmWeeks(env) {
    const t = todayNz(), out = [];
    for (const w of [t, addDays(t, 7)]) {
      const u = new URL("https://m2trainingclub.gymmasteronline.com/portal/api/v1/booking/classes/schedule");
      u.searchParams.set("api_key", env.GM_API_KEY); u.searchParams.set("week", w);
      const d = await fetch(u).then(r => r.json()).catch(() => ({}));
      if (Array.isArray(d.result)) out.push(...d.result);
    }
    const seen = new Set();
    return out.filter(x => { const k = x.id; if (seen.has(k)) return false; seen.add(k); return true; })
      .map(x => ({ day: wd(String(x.arrival).slice(0, 10)), date: String(x.arrival).slice(0, 10), start: hhmm(x.starttime), end: hhmm(x.endtime),
                   name: clean(x.classname || x.bookingname), coach: clean(x.staffname), cap: +x.max_students || 0, classid: x.classid || null }));
  }
  const key = c => c.day + "|" + c.start + "|" + c.name.toLowerCase();

  async function staffByName(env, name) {
    if (!name) return null;
    const first = name.split(" ")[0].toLowerCase();
    const rows = await all(env, "SELECT id, name FROM staff WHERE active = 1");
    return rows.find(r => r.name.toLowerCase() === name.toLowerCase()) || rows.find(r => r.name.toLowerCase().split(" ")[0] === first) || null;
  }

  async function seed(env) {
    const list = await gmWeeks(env);
    const seen = new Set();
    let n = 0;
    for (const c of list) {
      if (!c.start || !c.name || seen.has(key(c))) continue;
      seen.add(key(c));
      const st = await staffByName(env, c.coach);
      await run(env, `INSERT OR IGNORE INTO class_templates(weekday, start, end_time, name, coach_id, coach_name, cap, gm_classid, active) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)`,
        c.day, c.start, c.end, c.name, st ? st.id : null, st ? st.name : (c.coach || null), c.cap || 20, c.classid);
      n++;
    }
    if (n) await run(env, "INSERT INTO timetable_changes(staff_id, what) VALUES (NULL, ?)", "Copied " + n + " weekly classes from GymMaster");
    return n;
  }

  async function view(env, can) {
    if (!(await one(env, "SELECT count(*) n FROM class_templates")).n) await seed(env).catch(() => 0);
    const rows = await all(env, "SELECT * FROM class_templates ORDER BY active DESC, CASE weekday WHEN 0 THEN 7 ELSE weekday END, start, name");
    // Where GymMaster's next two weeks differ from the timetable here.
    let gm = [], gmError = null;
    try { gm = await gmWeeks(env); } catch (e) { gmError = String(e); }
    const gmKeys = new Map(); gm.forEach(c => gmKeys.set(key(c), c));
    const coreKeys = new Set(rows.filter(r => r.active).map(r => r.weekday + "|" + r.start + "|" + r.name.toLowerCase()));
    const diffs = [];
    for (const r of rows.filter(r => r.active)) {
      const g = gmKeys.get(r.weekday + "|" + r.start + "|" + r.name.toLowerCase());
      if (!g) diffs.push({ id: r.id, what: DAYS[r.weekday] + " " + r.start + " " + r.name + " isn't in GymMaster's next two weeks" });
      else {
        if (g.cap && g.cap !== r.cap) diffs.push({ id: r.id, what: DAYS[r.weekday] + " " + r.start + " " + r.name + ": cap is " + r.cap + " here, " + g.cap + " in GymMaster" });
        if (r.coach_name && g.coach && g.coach.split(" ")[0].toLowerCase() !== r.coach_name.split(" ")[0].toLowerCase())
          diffs.push({ id: r.id, what: DAYS[r.weekday] + " " + r.start + " " + r.name + ": coach is " + r.coach_name + " here, " + g.coach + " in GymMaster" });
      }
    }
    const extra = new Set();
    for (const g of gm) { const k = key(g); if (!coreKeys.has(k) && !extra.has(k)) { extra.add(k); diffs.push({ what: DAYS[g.day] + " " + g.start + " " + g.name + " (" + g.date + ") is in GymMaster but not on this timetable" }); } }
    const coaches = await all(env, "SELECT id, name, role FROM staff WHERE active = 1 AND role IN ('owner', 'manager', 'coach', 'trainer') ORDER BY name");
    const log = await all(env, "SELECT c.at, c.what, s.name staff FROM timetable_changes c LEFT JOIN staff s ON s.id = c.staff_id ORDER BY c.id DESC LIMIT 20");
    return { classes: rows, days: DAYS, diffs, gm_error: gmError, coaches, log, can_edit: canEdit(can) };
  }

  async function save(env, who, can, b) {
    if (!canEdit(can)) return { ok: false, error: "Only the owners and the manager can change the timetable." };
    const day = +b.weekday, start = hhmm(b.start), end = hhmm(b.end), name = clean(b.name).slice(0, 60), cap = Math.round(+b.cap);
    if (!(day >= 0 && day <= 6)) return { ok: false, error: "Pick a day." };
    if (!start || !end || end <= start) return { ok: false, error: "Check the start and end times." };
    if (!name) return { ok: false, error: "Give the class a name." };
    if (!(cap >= 1 && cap <= 100)) return { ok: false, error: "Cap is the most people, like 20." };
    const coach = b.coach_id ? await one(env, "SELECT id, name FROM staff WHERE id = ? AND active = 1", +b.coach_id) : null;
    const label = DAYS[day] + " " + start + " " + name;
    if (b.id) {
      const cur = await one(env, "SELECT * FROM class_templates WHERE id = ?", +b.id);
      if (!cur) return { ok: false, error: "Not found" };
      const active = b.active === undefined ? cur.active : (b.active ? 1 : 0);
      await run(env, "UPDATE class_templates SET weekday = ?, start = ?, end_time = ?, name = ?, coach_id = ?, coach_name = ?, cap = ?, active = ?, notes = ?, updated_by = ?, updated_at = datetime('now') WHERE id = ?",
        day, start, end, name, coach ? coach.id : null, coach ? coach.name : null, cap, active, clean(b.notes).slice(0, 200) || null, who.id, cur.id);
      const ch = [];
      if (cur.weekday !== day || cur.start !== start) ch.push("moved from " + DAYS[cur.weekday] + " " + cur.start);
      if (cur.end_time !== end) ch.push("ends " + end);
      if (cur.name !== name) ch.push("renamed from " + cur.name);
      if ((cur.coach_id || null) !== (coach ? coach.id : null)) ch.push("coach " + (coach ? coach.name : "none") + " (was " + (cur.coach_name || "none") + ")");
      if (cur.cap !== cap) ch.push("cap " + cap + " (was " + cur.cap + ")");
      if (cur.active !== active) ch.push(active ? "back on the timetable" : "taken off the timetable");
      if (ch.length) await run(env, "INSERT INTO timetable_changes(staff_id, what) VALUES (?, ?)", who.id, label + ": " + ch.join(", "));
      return { ok: true };
    }
    await run(env, "INSERT INTO class_templates(weekday, start, end_time, name, coach_id, coach_name, cap, active, notes, updated_by) VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?)",
      day, start, end, name, coach ? coach.id : null, coach ? coach.name : null, cap, clean(b.notes).slice(0, 200) || null, who.id);
    await run(env, "INSERT INTO timetable_changes(staff_id, what) VALUES (?, ?)", who.id, "Added " + label + (coach ? " with " + coach.name : "") + ", cap " + cap);
    return { ok: true };
  }

  return { view, save, seed };
}
