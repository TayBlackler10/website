// M2 Core: the owners' morning summary. Yesterday in one look, plus where the month is heading.
// Owners only (it has money in it).

export function makeMorning(L) {
  const { nzDateTime, passportPay } = L;
  const all = (env, sql, ...a) => env.DB.prepare(sql).bind(...a).all().then(r => r.results || []);
  const one = (env, sql, ...a) => env.DB.prepare(sql).bind(...a).first();
  const addDays = (iso, n) => new Date(Date.parse(iso + "T12:00:00Z") + n * 864e5).toISOString().slice(0, 10);

  async function summary(env, can) {
    if (!can.business) return { error: "Owners only" };
    const now = new Date(), nz = nzDateTime(now), t = nz.slice(0, 10), y = addDays(t, -1), ym = t.slice(0, 7);
    // NZ midnight as UTC, for created_at columns stored in UTC.
    const off = Math.round((Date.parse(nz.replace(" ", "T") + "Z") - now.getTime()) / 36e5);
    const utc = d => new Date(Date.parse(d + "T00:00:00Z") - off * 36e5).toISOString().slice(0, 19).replace("T", " ");
    const yFrom = utc(y), yTo = utc(t);

    const joins = await all(env, `SELECT m.id, m.first_name, m.last_name, (SELECT p.gm_type_name FROM memberships ms JOIN plans p ON p.id = ms.plan_id
                                     WHERE ms.member_id = m.id ORDER BY ms.start_date DESC LIMIT 1) plan,
                                     (SELECT p.family FROM memberships ms JOIN plans p ON p.id = ms.plan_id WHERE ms.member_id = m.id ORDER BY ms.start_date DESC LIMIT 1) family
                                  FROM members m WHERE m.joined_on = ? ORDER BY m.id`, y);
    const cancels = await all(env, `SELECT c.member_id id, m.first_name, m.last_name, c.type_name plan, c.cancel_date, c.reason FROM gm_cancels c JOIN members m ON m.id = c.member_id
                                    WHERE c.first_seen >= ? GROUP BY c.member_id ORDER BY c.cancel_date`, y);
    const failed = await all(env, `SELECT f.member_id id, m.first_name, m.last_name, f.amount, f.reason FROM gm_failed f JOIN members m ON m.id = f.member_id
                                   WHERE f.first_seen >= ? ORDER BY f.amount DESC`, y);
    const holds = await one(env, "SELECT count(DISTINCT member_id) n FROM gm_holds WHERE starts BETWEEN ? AND ?", y, t);
    const visits = await one(env, "SELECT count(*) n, count(DISTINCT member_id) people FROM visits WHERE at >= ? AND at < ?", y, t);
    const lastWeekSameDay = await one(env, "SELECT count(DISTINCT member_id) people FROM visits WHERE at >= ? AND at < ?", addDays(y, -7), addDays(y, -6));
    const leads = await all(env, "SELECT kind, count(*) n FROM leads WHERE created_at >= ? AND created_at < ? AND coalesce(notes, '') <> 'gymmaster_import' GROUP BY kind ORDER BY n DESC", yFrom, yTo);
    const pt = await one(env, "SELECT count(*) n, min(l.created_at) oldest FROM pt_leads p JOIN leads l ON l.id = p.lead_id WHERE p.pt_status = 'new'");
    const cls = d => one(env, "SELECT count(*) classes, coalesce(sum(booked), 0) booked, coalesce(sum(max), 0) spots FROM class_counts WHERE day = ?", d);
    const [clsY, clsT] = [await cls(y), await cls(t)];
    const fullToday = await all(env, "SELECT name, start, booked, max, waitlist FROM class_counts WHERE day = ? ORDER BY start", t);
    const pos = await all(env, "SELECT paid_by, round(sum(total), 2) total, count(*) n FROM pos_sales WHERE day = ? AND voided = 0 GROUP BY paid_by", y);
    const appReq = await one(env, "SELECT count(*) n FROM app_requests WHERE done_at IS NULL");

    // Passport this month: distinct visit days by anyone on Passport, pace to month end, and what that pays.
    const fpVisits = (await one(env, `SELECT count(*) n FROM (SELECT DISTINCT v.member_id, substr(v.at, 1, 10) d FROM visits v
                                       WHERE v.at >= ? AND v.at < ? AND coalesce(v.door, '') NOT LIKE '%Not Counted%'
                                         AND EXISTS (SELECT 1 FROM member_flags f WHERE f.member_id = v.member_id AND f.flag = 'passport'))`, ym + "-01", t)).n;
    const day = +t.slice(8, 10) - 1, dim = new Date(Date.UTC(+ym.slice(0, 4), +ym.slice(5, 7), 0)).getUTCDate();
    const pace = day > 0 ? Math.round(fpVisits / day * dim) : null;
    const tiers = (await one(env, "SELECT value FROM settings WHERE key = 'fp_tiers'"))?.value || "";
    const last = await one(env, "SELECT visits, paid FROM passport_months WHERE month = ?", addDays(ym + "-01", -1).slice(0, 7));

    const nm = r => [r.first_name, r.last_name].filter(Boolean).join(" ");
    return {
      day: y, today: t,
      joins: joins.map(r => ({ id: r.id, name: nm(r), plan: r.plan, passport: r.family === "passport" })),
      cancels: cancels.map(r => ({ id: r.id, name: nm(r), plan: r.plan, from: r.cancel_date, reason: r.reason })),
      failed: failed.map(r => ({ id: r.id, name: nm(r), amount: r.amount, reason: r.reason })),
      failed_total: Math.round(failed.reduce((a, r) => a + (+r.amount || 0), 0) * 100) / 100,
      holds: holds.n, visits: visits.n, people: visits.people, people_week_ago: lastWeekSameDay.people,
      leads, pt_waiting: pt.n, pt_oldest: pt.oldest,
      classes_yesterday: clsY, classes_today: clsT, today_classes: fullToday,
      pos, app_requests: appReq.n,
      passport: { visits: fpVisits, pace, days_counted: day, days: dim, so_far: passportPay(fpVisits, tiers).total, at_pace: pace ? passportPay(pace, tiers).total : null,
                  last_month: last ? { visits: last.visits, paid: last.paid } : null },
    };
  }

  return { summary };
}
