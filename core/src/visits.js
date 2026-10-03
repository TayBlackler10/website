// M2 Core: Recent visits, for the front desk. Everyone who came through the gate on a day, newest first,
// with what reception needs to know at a glance: owes money, first visit, back after a long break,
// birthday, trial or pass, Passport ID missing. Visits copy from GymMaster every 15 minutes, and staff
// can ask for a fresh copy (at most once a minute).

export function makeVisits(L) {
  const { nzDateTime, pullVisits } = L;
  const todayNz = () => nzDateTime(new Date()).slice(0, 10);
  const addDays = (iso, n) => new Date(Date.parse(iso + "T12:00:00Z") + n * 864e5).toISOString().slice(0, 10);
  const all = (env, sql, ...a) => env.DB.prepare(sql).bind(...a).all().then(r => r.results || []);
  const one = (env, sql, ...a) => env.DB.prepare(sql).bind(...a).first();

  async function day(env, who, can, q) {
    if (!can.members) return { error: "No access" };
    const t = todayNz(), d = /^\d{4}-\d{2}-\d{2}$/.test(q.get("day") || "") ? q.get("day") : t;
    const own = can.members === "own";
    const rows = await all(env, `SELECT v.member_id id, v.at, v.door, m.first_name, m.last_name, m.dob, m.joined_on, m.fp_id,
        m.photo_url IS NOT NULL OR EXISTS (SELECT 1 FROM member_photos p WHERE p.member_id = m.id) has_photo,
        (SELECT p.gm_type_name FROM memberships ms JOIN plans p ON p.id = ms.plan_id WHERE ms.member_id = m.id AND ms.status = 'current' ORDER BY ms.start_date DESC LIMIT 1) plan,
        (SELECT p.family FROM memberships ms JOIN plans p ON p.id = ms.plan_id WHERE ms.member_id = m.id AND ms.status = 'current' ORDER BY ms.start_date DESC LIMIT 1) family,
        (SELECT max(x.at) FROM visits x WHERE x.member_id = v.member_id AND x.at < ?) prev,
        (SELECT group_concat(flag) FROM member_flags f WHERE f.member_id = m.id) flags,
        (SELECT balance_owing FROM billing_accounts b WHERE b.member_id = m.id) owing
      FROM visits v JOIN members m ON m.id = v.member_id
      WHERE v.at >= ? AND v.at < ? ${own ? "AND m.trainer_id = ?" : ""}
      ORDER BY v.at DESC LIMIT 600`, d, d, addDays(d, 1), ...(own ? [who.id] : []));
    // Doors opened from the M2 App are known straight away; GymMaster's visitor report can run hours behind.
    const appOpens = await all(env, `SELECT d.member_id id, d.at, d.door, m.first_name, m.last_name, m.dob, m.joined_on, m.fp_id,
        m.photo_url IS NOT NULL OR EXISTS (SELECT 1 FROM member_photos p WHERE p.member_id = m.id) has_photo,
        (SELECT p.gm_type_name FROM memberships ms JOIN plans p ON p.id = ms.plan_id WHERE ms.member_id = m.id AND ms.status = 'current' ORDER BY ms.start_date DESC LIMIT 1) plan,
        (SELECT p.family FROM memberships ms JOIN plans p ON p.id = ms.plan_id WHERE ms.member_id = m.id AND ms.status = 'current' ORDER BY ms.start_date DESC LIMIT 1) family,
        (SELECT max(x.at) FROM visits x WHERE x.member_id = d.member_id AND x.at < ?) prev,
        (SELECT group_concat(flag) FROM member_flags f WHERE f.member_id = m.id) flags,
        (SELECT balance_owing FROM billing_accounts b WHERE b.member_id = m.id) owing
      FROM app_doors d JOIN members m ON m.id = d.member_id WHERE d.opened = 1 AND d.at >= datetime(?, '-14 hours') AND d.at < datetime(?, '+1 day') ${own ? "AND m.trainer_id = ?" : ""}`,
      d, d, d, ...(own ? [who.id] : []));
    for (const o of appOpens) {
      o.at = nzDateTime(new Date(Date.parse(o.at.replace(" ", "T") + "Z")));
      if (o.at.slice(0, 10) !== d) continue;
      const t0 = Date.parse(o.at.replace(" ", "T") + "Z");
      if (rows.some(r => r.id === o.id && Math.abs(Date.parse(r.at.replace(" ", "T") + "Z") - t0) < 10 * 60000)) continue;
      rows.push({ ...o, door: "App, " + (o.door || "door") });
    }
    rows.sort((a, b) => String(b.at).localeCompare(String(a.at)));
    const limit = +((await one(env, "SELECT value FROM settings WHERE key = 'block_at_balance'"))?.value || 250);
    const md = d.slice(5);
    const out = rows.map(r => {
      const flags = r.flags ? r.flags.split(",") : [], tags = [];
      if (can.balances && !flags.includes("gifted_time") && (flags.includes("blocked") || (r.owing && r.owing >= limit))) tags.push(["warn", "Owes $" + Math.round(r.owing || 0)]);
      else if (can.balances && r.owing > 0) tags.push(["", "Owes $" + Math.round(r.owing)]);
      // Visit history in the Core only goes back a few months, so "first visit" is only for people who joined recently.
      if (!r.prev && r.joined_on && r.joined_on >= addDays(d, -60)) tags.push(["ok", "First visit"]);
      else if (r.prev) { const gap = Math.round((Date.parse(d) - Date.parse(r.prev.slice(0, 10))) / 864e5); if (gap >= 30) tags.push(["ok", "Back after " + gap + " days"]); }
      if (r.dob && r.dob.slice(5, 10) === md) tags.push(["ok", "Birthday"]);
      if (r.family === "trial" || r.family === "pass") tags.push(["", r.family === "trial" ? "Trial" : "Pass"]);
      if (flags.includes("passport") && !r.fp_id) tags.push(["warn", "No Passport ID"]);
      if (!r.plan) tags.push(["warn", "No current membership"]);
      return { id: r.id, name: [r.first_name, r.last_name].filter(Boolean).join(" "), at: r.at, door: r.door || "", plan: r.plan || "", has_photo: !!r.has_photo, tags };
    });
    const people = new Set(out.map(r => r.id)).size;
    const last = await one(env, "SELECT max(at) at FROM visits WHERE via = 'gymmaster'");
    const weekAgo = (await one(env, "SELECT count(DISTINCT member_id) n FROM visits WHERE at >= ? AND at < ?", addDays(d, -7), addDays(d, -6))).n;
    return { day: d, today: t, rows: out, visits: out.length, people, week_ago: weekAgo, latest: last && last.at, can_pull: !!env.GM_REPORT_KEY };
  }

  async function pull(env, can) {
    if (!can.members || can.members === "own") return { ok: false, error: "No access" };
    const last = await one(env, "SELECT value FROM settings WHERE key = 'visits_pulled_at'");
    if (last && Date.now() - +last.value < 60_000) return { ok: true, waited: true };
    await env.DB.prepare("INSERT INTO settings(key, value) VALUES ('visits_pulled_at', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value").bind(String(Date.now())).run();
    const r = await pullVisits(env);
    return { ok: !r.error, rows: r.rows, error: r.error || null };
  }

  return { day, pull };
}
