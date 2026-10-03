// M2 Core: class bookings run by the Core, from the Core's own weekly timetable (class_templates).
// Off until the owners switch "Class bookings" to the Core (setting classes_source = core). Until then
// GymMaster runs classes and this module only gets used for previews.
//
// Rules (same as M2's class rules): book up to 7 days ahead, cap from the timetable (20 unless set),
// waitlist when full and the first person on it moves up when someone cancels, 12 hours' notice to
// cancel (later counts as a late cancel), memberships without classes can't book, and anyone owing
// $250 or more can't book until it's paid.

export function makeClasses(L) {
  const { nzDateTime } = L;
  const todayNz = () => nzDateTime(new Date()).slice(0, 10);
  const addDays = (iso, n) => new Date(Date.parse(iso + "T12:00:00Z") + n * 864e5).toISOString().slice(0, 10);
  const all = (env, sql, ...a) => env.DB.prepare(sql).bind(...a).all().then(r => r.results || []);
  const one = (env, sql, ...a) => env.DB.prepare(sql).bind(...a).first();
  const run = (env, sql, ...a) => env.DB.prepare(sql).bind(...a).run();
  const AHEAD = 7, LATE_HOURS = 12;
  const nzMs = (day, hhmm) => {
    const m = String(hhmm || "").match(/(\d{1,2}):(\d{2})/); if (!m) return null;
    const guess = Date.parse(day + "T" + m[1].padStart(2, "0") + ":" + m[2] + ":00Z");
    return guess - (Date.parse(nzDateTime(new Date(guess)).replace(" ", "T") + "Z") - guess);
  };

  async function on(env) { return (await one(env, "SELECT value FROM settings WHERE key = 'classes_source'"))?.value === "core"; }

  // Make sure every timetable class exists as a dated session for the next two weeks.
  async function ensure(env) {
    const t = todayNz(), tpl = await all(env, "SELECT * FROM class_templates WHERE active = 1");
    const stmts = [];
    for (let i = 0; i <= AHEAD + 7; i++) {
      const day = addDays(t, i), wd = new Date(day + "T12:00:00Z").getUTCDay();
      for (const c of tpl.filter(x => x.weekday === wd))
        stmts.push(env.DB.prepare(`INSERT OR IGNORE INTO class_sessions(template_id, day, start, end_time, name, coach_id, coach_name, cap) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
          .bind(c.id, day, c.start, c.end_time, c.name, c.coach_id, c.coach_name, c.cap));
    }
    for (let i = 0; i < stmts.length; i += 100) await env.DB.batch(stmts.slice(i, i + 100));
  }

  async function sessions(env, from, to) {
    await ensure(env);
    return all(env, `SELECT s.*, (SELECT count(*) FROM class_bookings b WHERE b.session_id = s.id AND b.status = 'booked') booked,
                       (SELECT count(*) FROM class_bookings b WHERE b.session_id = s.id AND b.status = 'waitlist') waiting
                     FROM class_sessions s WHERE s.day >= ? AND s.day <= ? AND s.cancelled = 0 ORDER BY s.day, s.start`, from, to);
  }

  async function canBook(env, memberId) {
    const ms = await all(env, `SELECT p.family, p.includes_classes FROM memberships ms JOIN plans p ON p.id = ms.plan_id WHERE ms.member_id = ? AND ms.status = 'current'`, memberId);
    if (!ms.some(x => x.includes_classes || ["perform", "classes", "transporter", "passport", "trial", "pass", "staff"].includes(x.family)))
      return "Your membership doesn't include classes. Reception can help you add them.";
    const limit = +((await one(env, "SELECT value FROM settings WHERE key = 'block_at_balance'"))?.value || 250);
    const flags = (await all(env, "SELECT flag FROM member_flags WHERE member_id = ?", memberId)).map(f => f.flag);
    const owes = await one(env, "SELECT balance_owing FROM billing_accounts WHERE member_id = ?", memberId);
    if (!flags.includes("gifted_time") && (flags.includes("blocked") || (owes && owes.balance_owing >= limit))) return "Please see reception before booking.";
    return null;
  }

  // The app's class list, in the same shape the M2 App already uses.
  async function forApp(env, memberId) {
    const t = todayNz(), list = await sessions(env, t, addDays(t, AHEAD - 1));
    const mine = await all(env, `SELECT b.id, b.session_id, b.status, s.day, s.start, s.name FROM class_bookings b JOIN class_sessions s ON s.id = b.session_id
                                 WHERE b.member_id = ? AND b.status IN ('booked', 'waitlist') AND s.day >= ?`, memberId, t);
    const byS = new Map(mine.map(b => [b.session_id, b]));
    return { ok: true, source: "core",
      classes: list.map(s => { const b = byS.get(s.id); return { id: s.id, name: s.name, classid: s.template_id, day: s.day, start: s.start, end: s.end_time || "",
        coach: s.coach_name || "", coachPhoto: "", desc: "", max: s.cap, num: s.booked, free: Math.max(0, s.cap - s.booked), bookedId: b && b.status === "booked" ? b.id : null,
        bookable: true, avail: "", waitCount: s.waiting, maxWait: 10, loc: "" }; }),
      booked: mine.filter(b => b.status === "booked").map(b => ({ id: b.id, day: b.day, start: b.start, name: b.name, parent: b.session_id })),
      waits: mine.filter(b => b.status === "waitlist").map(b => ({ id: b.id, day: b.day, start: b.start, name: b.name })) };
  }

  async function book(env, memberId, sessionId, by) {
    const s = await one(env, "SELECT * FROM class_sessions WHERE id = ? AND cancelled = 0", +sessionId);
    if (!s) return { ok: false, message: "That class isn't on any more." };
    const t = todayNz(), startMs = nzMs(s.day, s.start);
    if (s.day > addDays(t, AHEAD - 1)) return { ok: false, message: "Classes open for booking 7 days ahead." };
    if (startMs && startMs < Date.now()) return { ok: false, message: "That class has already started." };
    const stop = await canBook(env, memberId); if (stop) return { ok: false, message: stop };
    const cur = await one(env, "SELECT id, status FROM class_bookings WHERE session_id = ? AND member_id = ?", s.id, memberId);
    if (cur && ["booked", "waitlist"].includes(cur.status)) return { ok: true, already: true, id: cur.id, waitlist: cur.status === "waitlist" };
    const taken = (await one(env, "SELECT count(*) n FROM class_bookings WHERE session_id = ? AND status = 'booked'", s.id)).n;
    const status = taken < s.cap ? "booked" : "waitlist";
    if (status === "waitlist" && (await one(env, "SELECT count(*) n FROM class_bookings WHERE session_id = ? AND status = 'waitlist'", s.id)).n >= 10)
      return { ok: false, message: "That class and its waitlist are full." };
    const row = await one(env, `INSERT INTO class_bookings(session_id, member_id, status, booked_by) VALUES (?, ?, ?, ?)
      ON CONFLICT(session_id, member_id) DO UPDATE SET status = excluded.status, booked_by = excluded.booked_by, booked_at = datetime('now'), cancelled_at = NULL RETURNING id`, s.id, memberId, status, by || "app");
    await run(env, "INSERT INTO activity(member_id, kind, detail) VALUES (?, 'note', ?)", memberId, (status === "booked" ? "Booked into " : "Joined the waitlist for ") + s.name + " " + s.day + " " + s.start);
    return { ok: true, id: row.id, waitlist: status === "waitlist" };
  }

  async function cancel(env, memberId, bookingId, by) {
    const b = await one(env, `SELECT b.*, s.day, s.start, s.name, s.cap FROM class_bookings b JOIN class_sessions s ON s.id = b.session_id WHERE b.id = ? AND b.member_id = ?`, +bookingId, memberId);
    if (!b || !["booked", "waitlist"].includes(b.status)) return { ok: true };
    const startMs = nzMs(b.day, b.start), late = b.status === "booked" && startMs && startMs > Date.now() && startMs - Date.now() < LATE_HOURS * 3600e3;
    await run(env, "UPDATE class_bookings SET status = ?, cancelled_at = datetime('now') WHERE id = ?", late ? "late_cancel" : "cancelled", b.id);
    await run(env, "INSERT INTO activity(member_id, kind, detail) VALUES (?, 'note', ?)", memberId, (late ? "Late cancel: " : "Cancelled ") + b.name + " " + b.day + " " + b.start + (by && by !== "app" ? " (by " + by + ")" : ""));
    // First on the waitlist moves up.
    if (b.status === "booked") {
      const next = await one(env, "SELECT id, member_id FROM class_bookings WHERE session_id = ? AND status = 'waitlist' ORDER BY booked_at LIMIT 1", b.session_id);
      if (next) {
        await run(env, "UPDATE class_bookings SET status = 'booked' WHERE id = ?", next.id);
        await run(env, "INSERT INTO activity(member_id, kind, detail) VALUES (?, 'note', ?)", next.member_id, "Moved off the waitlist into " + b.name + " " + b.day + " " + b.start);
      }
    }
    return { ok: true, late: !!late };
  }

  // Coach mode and the Classes page: who's in a session.
  async function people(env, sessionId) {
    return all(env, `SELECT b.id bid, b.member_id mid, b.status, m.first_name, m.last_name,
                        (SELECT p.gm_type_name FROM memberships ms JOIN plans p ON p.id = ms.plan_id WHERE ms.member_id = m.id AND ms.status = 'current' ORDER BY ms.start_date DESC LIMIT 1) plan
                      FROM class_bookings b JOIN members m ON m.id = b.member_id WHERE b.session_id = ? AND b.status IN ('booked', 'waitlist') ORDER BY b.booked_at`, +sessionId);
  }

  // Owners: switch class bookings between GymMaster and the Core.
  async function setSource(env, who, can, b) {
    if (!can.settings) return { ok: false, error: "Owners only" };
    const v = b.source === "core" ? "core" : "gymmaster";
    if (v === "core" && !(await one(env, "SELECT count(*) n FROM class_templates WHERE active = 1")).n) return { ok: false, error: "Set up the weekly timetable first." };
    await run(env, "INSERT INTO settings(key, value) VALUES ('classes_source', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value", v);
    await run(env, "INSERT INTO timetable_changes(staff_id, what) VALUES (?, ?)", who.id, "Class bookings now run in " + (v === "core" ? "the M2 Core" : "GymMaster"));
    if (v === "core") await ensure(env);
    return { ok: true };
  }

  return { on, ensure, sessions, forApp, book, cancel, people, setSource, nzMs };
}
