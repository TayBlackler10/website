// M2 Core: the joined-up parts.
// Classes and bookings, the live GymMaster panel on a member, collections with real balances,
// and the owners' Money, Growth and Marketing pages. Everything here reads the same database
// as the rest of the Core, plus GymMaster live, plus figures pushed in from Xero, Meta and GA4.

export function makeHub(L) {
  const { json, nzDateTime, gmCall, applyBlockRule } = L;
  const todayNz = () => nzDateTime(new Date()).slice(0, 10);
  const num = v => { const n = parseFloat(String(v ?? "").replace(/[^0-9.\-]/g, "")); return Number.isFinite(n) ? n : 0; };
  const setting = async (env, key, dflt) => (await env.DB.prepare("SELECT value FROM settings WHERE key = ?").bind(key).first())?.value ?? dflt;
  const all = (env, sql, ...a) => env.DB.prepare(sql).bind(...a).all().then(r => r.results || []);
  const one = (env, sql, ...a) => env.DB.prepare(sql).bind(...a).first();

  function mondayOf(iso) {
    const d = new Date(iso + "T12:00:00Z");
    const back = (d.getUTCDay() + 6) % 7;
    return new Date(d.getTime() - back * 86400_000).toISOString().slice(0, 10);
  }
  const addDays = (iso, n) => new Date(new Date(iso + "T12:00:00Z").getTime() + n * 86400_000).toISOString().slice(0, 10);

  async function canSeeMember(env, who, can, id) {
    if (!can.members) return false;
    if (can.members === true) return true;
    const m = await one(env, "SELECT trainer_id FROM members WHERE id = ?", id);
    return !!m && m.trainer_id === who.id;
  }

  /* ---------------- classes ---------------- */
  // The timetable comes live from GymMaster, so a booking made in the M2 App shows here straight away.

  async function classesWeek(env, who, can, q) {
    const asked = q.get("week");
    const week = mondayOf(/^\d{4}-\d{2}-\d{2}$/.test(asked || "") ? asked : todayNz());
    const d = await gmCall(env, "v1", "/booking/classes/schedule", { params: { week } });
    if (!Array.isArray(d.result)) return { error: "GymMaster didn't send the timetable (" + (d.error || "no reply") + ")." };
    const classes = d.result.map(c => ({
      id: c.id, day: c.arrival, start: String(c.starttime || "").slice(0, 5), end: String(c.endtime || "").slice(0, 5),
      time: c.start_str, name: c.classname || c.bookingname, coach: c.staffname, location: c.location,
      booked: c.num_students || 0, max: c.max_students || 0, free: c.spacesfree ?? null, waitlist: c.waitlist_count || 0,
      colour: c.bgcolour || null,
    })).filter(c => c.day >= week && c.day < addDays(week, 7)).sort((a, b) => (a.day + a.start).localeCompare(b.day + b.start));
    return { week, prev: addDays(week, -7), next: addDays(week, 7), today: todayNz(), classes, can_book: !!can.add };
  }

  function readAttendee(a) {
    const member_id = +(a.memberid ?? a.member_id ?? a.memberID ?? a.member ?? 0) || null;
    const name = a.name || a.membername || a.fullname || [a.firstname, a.surname].filter(Boolean).join(" ") || "Member";
    const wait = a.waitlist === true || a.is_waitlist === true || a.waitinglist === true || /wait/i.test(a.status || "");
    const attended = a.attended === true || a.attended === 1 || /attend|arrived|checked/i.test(a.status || "");
    const status = wait ? "waitlist" : attended ? "attended" : /cancel/i.test(a.status || "") ? "cancelled" : "booked";
    return { member_id, name, status, booking_id: a.bookingid ?? a.booking_id ?? a.id ?? null };
  }

  async function classDetail(env, who, can, classId) {
    const d = await gmCall(env, "v2", "/booking/classes/" + classId + "/attendees", { auth: "high" });
    if (!Array.isArray(d.result)) return { error: "GymMaster didn't send the class list (" + (d.error || "no reply") + ")." };
    const people = d.result.map(readAttendee);
    const ids = people.map(p => p.member_id).filter(Boolean);
    const core = {};
    if (ids.length) {
      const rows = await all(env, `SELECT m.id, m.first_name, m.last_name, m.trainer_id,
          EXISTS (SELECT 1 FROM member_photos p WHERE p.member_id = m.id) has_photo,
          (SELECT group_concat(flag) FROM member_flags f WHERE f.member_id = m.id) flags
        FROM members m WHERE m.id IN (${ids.map(() => "?").join(",")})`, ...ids);
      for (const r of rows) core[r.id] = r;
    }
    const out = people.map(p => {
      const c = p.member_id && core[p.member_id];
      const flags = c && c.flags ? c.flags.split(",") : [];
      return { ...p, in_core: !!c, name: c ? (c.first_name + " " + (c.last_name || "")).trim() : p.name, has_photo: !!(c && c.has_photo),
               blocked: flags.includes("blocked") && can.balances, passport: flags.includes("passport"),
               open: !!c && (can.members === true || (can.members === "own" && c.trainer_id === who.id)) };
    });
    const unknownShape = d.result.length && !people.some(p => p.member_id) ? Object.keys(d.result[0]) : null;
    return { attendees: out, unknown_fields: can.settings ? unknownShape : null };
  }

  async function blockReason(env, memberId) {
    const f = await all(env, "SELECT flag FROM member_flags WHERE member_id = ?", memberId);
    if (f.some(x => x.flag === "gifted_time")) return null;
    const limit = +(await setting(env, "block_at_balance", 250));
    const b = await one(env, "SELECT balance_owing FROM billing_accounts WHERE member_id = ?", memberId);
    if (f.some(x => x.flag === "blocked") || (b && b.balance_owing >= limit)) {
      return "Owes $" + (b ? b.balance_owing.toFixed(2) : "money") + ", so they can't book until it's paid (the $" + limit + " rule).";
    }
    return null;
  }

  async function bookMember(env, who, can, classId, b) {
    if (!can.add) return { ok: false, error: "Only reception, the manager and owners can book people in." };
    const mid = +b.member_id;
    const m = await one(env, "SELECT id, first_name, last_name FROM members WHERE id = ?", mid);
    if (!m) return { ok: false, error: "Pick a member first." };
    const stop = await blockReason(env, mid);
    if (stop) return { ok: false, error: stop };
    const d = await gmCall(env, "v2", "/booking/classes", { member: mid, method: "POST", body: { bookingid: +classId } });
    if (d.error) return { ok: false, error: "GymMaster said: " + (typeof d.error === "string" ? d.error : JSON.stringify(d.error)) };
    await env.DB.prepare("INSERT INTO activity(member_id, staff_id, kind, detail) VALUES (?, ?, 'note', ?)")
      .bind(mid, who.id, "Booked into " + String(b.label || "a class").slice(0, 120)).run();
    return { ok: true, waitlist: /wait/i.test(JSON.stringify(d.result || "")) };
  }

  async function cancelBooking(env, who, can, classId, b) {
    if (!can.add) return { ok: false, error: "Only reception, the manager and owners can cancel bookings." };
    const mid = +b.member_id;
    if (!mid) return { ok: false, error: "This person isn't matched to a member, so cancel them in GymMaster." };
    let bookingId = null;
    const mine = await gmCall(env, "v2", "/member/bookings", { member: mid });
    const list = [].concat(mine.result?.classbookings || [], mine.result?.classwaitlists || []);
    const hit = list.find(x => [x.bookingid, x.classid, x.class_id, x.sessionid, x.booking_id, x.classbookingid].map(String).includes(String(classId)));
    if (hit) bookingId = hit.id ?? hit.booking_id ?? hit.bookingid;
    if (!bookingId) bookingId = b.booking_id;
    if (!bookingId) return { ok: false, error: "Couldn't find their booking in GymMaster." };
    const d = await gmCall(env, "v1", "/member/cancelbooking", { member: mid, method: "POST", body: { bookingid: bookingId } });
    if (d.error) return { ok: false, error: "GymMaster said: " + (typeof d.error === "string" ? d.error : JSON.stringify(d.error)) };
    await env.DB.prepare("INSERT INTO activity(member_id, staff_id, kind, detail) VALUES (?, ?, 'note', ?)")
      .bind(mid, who.id, "Cancelled from " + String(b.label || "a class").slice(0, 120)).run();
    return { ok: true };
  }

  /* ---------------- live member panel ---------------- */

  async function saveBalance(env, id, bal) {
    const owing = num(bal.owingamount);
    const next = bal.next_bill || null;
    const noBill = /no (billing|payment|direct)/i.test(next || "") ? 1 : 0;
    await env.DB.batch([
      env.DB.prepare(`INSERT INTO balance_checks(member_id, owing, next_bill, no_billing, checked_at) VALUES (?, ?, ?, ?, datetime('now'))
                      ON CONFLICT(member_id) DO UPDATE SET owing = excluded.owing, next_bill = excluded.next_bill, no_billing = excluded.no_billing, checked_at = excluded.checked_at`)
        .bind(id, owing, next, noBill),
      env.DB.prepare(`INSERT INTO billing_accounts(member_id, balance_owing) VALUES (?, ?)
                      ON CONFLICT(member_id) DO UPDATE SET balance_owing = excluded.balance_owing, updated_at = datetime('now')
                      WHERE billing_accounts.billed_by_system <> 'core'`).bind(id, owing),
    ]);
    return owing;
  }

  async function memberLive(env, who, can, id) {
    if (!(await canSeeMember(env, who, can, id))) return { error: "No access" };
    const safe = p => p.catch(e => ({ error: String(e.message || e) }));
    const [bal, mships, books, visits, hist] = await Promise.all([
      can.balances ? safe(gmCall(env, "v1", "/member/outstandingbalance", { member: id })) : null,
      safe(gmCall(env, "v1", "/member/memberships", { member: id })),
      safe(gmCall(env, "v2", "/member/bookings", { member: id })),
      safe(gmCall(env, "v1", "/member/visits/monthly", { member: id })),
      can.balances ? safe(gmCall(env, "v1", "/member/accounthistory", { member: id })) : null,
    ]);
    if (mships.error && /wouldn't open/.test(mships.error)) return { error: "This person isn't in GymMaster, so there's nothing live to show." };
    const out = { checked_at: new Date().toISOString() };
    if (bal && !bal.error) {
      out.owing = await saveBalance(env, id, bal);
      out.next_bill = bal.next_bill || null;
      await applyBlockRule(env);
    }
    out.memberships = (mships.result || []).map(x => ({
      name: x.name, start: x.startdate, end: x.enddate, next_payment: x.nextpaymentdate, on_hold: !!x.onhold, hold_coming: !!x.upcoming_hold_exists,
      in_min_term: !!x.within_min_term, earliest_cancel: x.earliest_cancellation_date, visits_used: x.visitsused, visit_limit: x.visitlimit,
      price: can.balances ? x.price : undefined,
    }));
    const cb = books.result || {};
    out.bookings = [].concat((cb.classbookings || []).map(x => ({ ...x, _w: false })), (cb.classwaitlists || []).map(x => ({ ...x, _w: true })))
      .map(x => ({ name: x.classname || x.bookingname || x.name || "Class", day: x.arrival || x.day || x.date || "", time: x.start_str || String(x.starttime || "").slice(0, 5),
                   waitlist: x._w })).slice(0, 10);
    out.services = (cb.servicebookings || []).length;
    out.visits = (visits.result || []).map(v => ({ month: v.month, visits: v.visits }));
    if (hist && Array.isArray(hist.result)) {
      out.history = hist.result.slice(0, 12).map(h => ({ when: h.occurred_str || h.occurred, note: h.note, debit: h.debit, credit: h.credit, unpaid: !!h.unpaid, total: h.running_total }));
    }
    return out;
  }

  /* ---------------- balances, all day ---------------- */
  // Every 15 minutes: 15 members in turn plus the 5 owing longest since a check. A full lap of the
  // club takes about a day, and anyone owing is rechecked often, so the $250 block stays true.

  async function refreshBalances(env) {
    if (!env.GM_STAFF_KEY || !env.GM_API_KEY) return { ok: false, error: "GymMaster keys missing" };
    const cursor = +(await setting(env, "balance_cursor", 0));
    const size = Math.max(1, +(env.LAP_SIZE || 10));
    const lap = (await all(env, "SELECT id FROM members WHERE status = 'active' AND id > ? ORDER BY id LIMIT ?", cursor, size)).map(r => r.id);
    const owing = (await all(env, "SELECT member_id id FROM balance_checks WHERE owing > 0 ORDER BY checked_at LIMIT 5")).map(r => r.id);
    const ids = [...new Set(lap.concat(owing))];
    let done = 0, failed = 0;
    for (let i = 0; i < ids.length; i += 5) {
      await Promise.all(ids.slice(i, i + 5).map(async id => {
        try {
          const b = await gmCall(env, "v1", "/member/outstandingbalance", { member: id });
          if (b.error && b.owingamount === undefined) { failed++; return; }
          await saveBalance(env, id, b); done++;
        } catch { failed++; }
      }));
    }
    await env.DB.prepare("INSERT INTO settings(key, value) VALUES ('balance_cursor', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value")
      .bind(String(lap.length < size ? 0 : lap[lap.length - 1])).run();
    await applyBlockRule(env);
    return { ok: true, done, failed, lap };
  }

  // Owners can run the same check across the whole club from the browser, 10 members a call.
  async function sweepStep(env, after, visitsFn) {
    const ids = (await all(env, "SELECT id FROM members WHERE status = 'active' AND id > ? ORDER BY id LIMIT 10", +after || 0)).map(r => r.id);
    let done = 0;
    await Promise.all(ids.map(async id => {
      try {
        const b = await gmCall(env, "v1", "/member/outstandingbalance", { member: id });
        if (b.owingamount !== undefined) { await saveBalance(env, id, b); done++; }
      } catch {}
    }));
    const v = await visitsFn(env, ids);
    const left = (await one(env, "SELECT count(*) n FROM members WHERE status = 'active' AND id > ?", ids.length ? ids[ids.length - 1] : 1e12)).n;
    if (!left) await applyBlockRule(env);
    return { ok: true, done, visits: v, next: ids.length ? ids[ids.length - 1] : null, left };
  }

  /* ---------------- daily snapshot ---------------- */

  async function takeSnapshot(env) {
    const day = todayNz();
    const fam = Object.fromEntries((await all(env, `SELECT p.family, count(DISTINCT ms.member_id) n FROM memberships ms JOIN plans p ON p.id = ms.plan_id
                                                   JOIN members m ON m.id = ms.member_id AND m.status = 'active'
                                                   WHERE ms.status = 'current' AND p.family NOT IN ('staff', 'trial', 'pass') GROUP BY p.family`)).map(r => [r.family, r.n]));
    // Staff, trials and passes are never counted as members.
    const members = (await one(env, `SELECT count(*) n FROM members m WHERE m.status = 'active' AND ${L.realMember()}`)).n;
    const passport = (await one(env, `SELECT count(*) n FROM member_flags f JOIN members m ON m.id = f.member_id AND m.status = 'active' WHERE f.flag = 'passport' AND ${L.realMember()}`)).n;
    const weekly = (await one(env, "SELECT round(sum(weekly_value), 2) v FROM memberships WHERE status = 'current' AND billed_by <> 'passport'")).v || 0;
    const owed = (await one(env, "SELECT round(sum(balance_owing), 2) v FROM billing_accounts WHERE balance_owing > 0")).v || 0;
    const named = ["perform", "daily", "classes", "recovery"].reduce((a, k) => a + (fam[k] || 0), 0);
    await env.DB.prepare(`INSERT INTO member_snapshots(day, members, passport, perform, daily, classes, recovery, other, weekly_billed, owed)
                          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                          ON CONFLICT(day) DO UPDATE SET members = excluded.members, passport = excluded.passport, perform = excluded.perform,
                            daily = excluded.daily, classes = excluded.classes, recovery = excluded.recovery, other = excluded.other,
                            weekly_billed = excluded.weekly_billed, owed = excluded.owed`)
      .bind(day, members, passport, fam.perform || 0, fam.daily || 0, fam.classes || 0, fam.recovery || 0, Math.max(0, members - named - passport), weekly, owed).run();
    return { day, members };
  }

  /* ---------------- collections ---------------- */

  async function collections(env, can) {
    if (!can.collections) return { error: "Collections are for owners and the manager." };
    const [p1, p2, refMin, limit] = await Promise.all([setting(env, "settle_pct_upto_1500", 50), setting(env, "settle_pct_over_1500", 30),
      setting(env, "referral_min_amount", 1000), setting(env, "block_at_balance", 250)]);
    const rows = await all(env, `SELECT m.id, m.first_name, m.last_name, m.mobile, m.email, m.status, b.balance_owing owing,
        bc.checked_at, bc.next_bill, c.id case_id, c.status case_status, c.referred_on, c.opened_on,
        (SELECT a.detail FROM activity a WHERE a.member_id = m.id AND a.kind IN ('call','note') ORDER BY a.at DESC, a.id DESC LIMIT 1) last_note,
        (SELECT a.at FROM activity a WHERE a.member_id = m.id AND a.kind IN ('call','note') ORDER BY a.at DESC, a.id DESC LIMIT 1) last_at,
        (SELECT p.gm_type_name FROM memberships ms JOIN plans p ON p.id = ms.plan_id WHERE ms.member_id = m.id ORDER BY ms.status = 'current' DESC, ms.start_date DESC LIMIT 1) plan
      FROM billing_accounts b JOIN members m ON m.id = b.member_id
      LEFT JOIN balance_checks bc ON bc.member_id = m.id
      LEFT JOIN collections_cases c ON c.member_id = m.id AND c.status IN ('open','promised','referred')
      WHERE b.balance_owing > 0
        AND NOT EXISTS (SELECT 1 FROM member_flags f WHERE f.member_id = m.id AND f.flag = 'gifted_time')
      ORDER BY b.balance_owing DESC LIMIT 600`);
    for (const r of rows) {
      r.left = r.status !== "active";
      r.offer = Math.round(r.owing * (r.owing <= 1500 ? +p1 : +p2)) / 100;
      r.can_refer = r.owing >= +refMin;
      r.blocked = r.owing >= +limit;
    }
    const sum = l => Math.round(l.reduce((a, r) => a + r.owing, 0) * 100) / 100;
    const cur = rows.filter(r => !r.left), left = rows.filter(r => r.left);
    const cover = await one(env, `SELECT count(*) n, sum(CASE WHEN bc.checked_at >= datetime('now','-2 days') THEN 1 ELSE 0 END) recent, max(bc.checked_at) last
                                  FROM members m LEFT JOIN balance_checks bc ON bc.member_id = m.id WHERE m.status = 'active'`);
    return { rows, totals: { current: cur.length, current_sum: sum(cur), left: left.length, left_sum: sum(left), blocked: rows.filter(r => r.blocked && !r.left).length,
             referable: rows.filter(r => r.can_refer && !r.case_status).length },
             rules: { p1: +p1, p2: +p2, refMin: +refMin, limit: +limit }, coverage: cover };
  }

  const CASE_ACTIONS = { called: "Called about the balance", promised: "Promised to pay", settled: "Settled", referred: "Referred to Marshall Freeman",
                         written_off: "Written off", note: "Note" };
  async function collectionAction(env, who, can, b) {
    if (!can.collections) return { ok: false, error: "Collections are for owners and the manager." };
    const mid = +b.member_id, act = String(b.action || "");
    if (!CASE_ACTIONS[act]) return { ok: false, error: "Unknown action" };
    const m = await one(env, `SELECT m.id, m.status, b.balance_owing owing FROM members m LEFT JOIN billing_accounts b ON b.member_id = m.id WHERE m.id = ?`, mid);
    if (!m) return { ok: false, error: "Member not found" };
    const gifted = await one(env, "SELECT 1 x FROM member_flags WHERE member_id = ? AND flag = 'gifted_time'", mid);
    if (gifted) return { ok: false, error: "Gifted time: never chased for money." };
    const owing = m.owing || 0;
    if (act === "referred") {
      const min = +(await setting(env, "referral_min_amount", 1000));
      if (owing < min) return { ok: false, error: "Only debts of $" + min + " or more go to Marshall Freeman." };
    }
    if ((act === "written_off" || act === "referred") && !can.settings) return { ok: false, error: "Only Taylor and Tim can refer or write off a debt." };
    const note = String(b.note || "").trim().slice(0, 500);
    const pct = owing <= 1500 ? +(await setting(env, "settle_pct_upto_1500", 50)) : +(await setting(env, "settle_pct_over_1500", 30));
    const open = await one(env, "SELECT id FROM collections_cases WHERE member_id = ? AND status IN ('open','promised','referred') ORDER BY id DESC LIMIT 1", mid);
    const status = { called: "open", note: "open", promised: "promised", settled: "settled", referred: "referred", written_off: "written_off" }[act];
    const closed = ["settled", "written_off"].includes(status);
    const stmts = [];
    if (open) {
      stmts.push(env.DB.prepare(`UPDATE collections_cases SET status = ?, amount_owed = ?, settle_offer = ?, referred_on = CASE WHEN ? = 'referred' THEN date('now') ELSE referred_on END,
                                 closed_on = CASE WHEN ? = 1 THEN date('now') ELSE NULL END WHERE id = ?`)
        .bind(status, owing, Math.round(owing * pct) / 100, status, closed ? 1 : 0, open.id));
    } else {
      stmts.push(env.DB.prepare(`INSERT INTO collections_cases(member_id, opened_on, amount_owed, is_former, status, settle_offer, referred_on, closed_on)
                                 VALUES (?, date('now'), ?, ?, ?, ?, CASE WHEN ? = 'referred' THEN date('now') END, CASE WHEN ? = 1 THEN date('now') END)`)
        .bind(mid, owing, m.status === "active" ? 0 : 1, status, Math.round(owing * pct) / 100, status, closed ? 1 : 0));
    }
    const amt = b.amount ? " $" + num(b.amount).toFixed(2) : "";
    stmts.push(env.DB.prepare("INSERT INTO activity(member_id, staff_id, kind, detail) VALUES (?, ?, ?, ?)")
      .bind(mid, who.id, act === "called" ? "call" : "note", CASE_ACTIONS[act] + amt + (b.when ? " by " + String(b.when).slice(0, 10) : "") + (note ? ": " + note : "")));
    await env.DB.batch(stmts);
    return { ok: true };
  }

  /* ---------------- data pushed in (Xero, Meta, GA4) ---------------- */
  const PUSH = {
    finance_months: { cols: ["month", "income", "cost_of_sales", "expenses", "net", "lines", "source"], key: r => /^\d{4}-\d{2}$/.test(r.month),
      sql: `INSERT INTO finance_months(month, income, cost_of_sales, expenses, net, lines, source, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
            ON CONFLICT(month) DO UPDATE SET income = excluded.income, cost_of_sales = excluded.cost_of_sales, expenses = excluded.expenses, net = excluded.net,
              lines = excluded.lines, source = excluded.source, updated_at = excluded.updated_at` },
    finance_points: { cols: ["key", "label", "value", "as_of"], key: r => /^[a-z_]{2,40}$/.test(r.key),
      sql: `INSERT INTO finance_points(key, label, value, as_of) VALUES (?, ?, ?, ?)
            ON CONFLICT(key) DO UPDATE SET label = excluded.label, value = excluded.value, as_of = excluded.as_of` },
    marketing_days: { cols: ["day", "source", "campaign", "spend", "impressions", "clicks", "leads", "landing_views"], key: r => /^\d{4}-\d{2}-\d{2}$/.test(r.day) && r.source && r.campaign,
      sql: `INSERT INTO marketing_days(day, source, campaign, spend, impressions, clicks, leads, landing_views) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(day, source, campaign) DO UPDATE SET spend = excluded.spend, impressions = excluded.impressions, clicks = excluded.clicks,
              leads = excluded.leads, landing_views = excluded.landing_views` },
    passport_months: { cols: ["month", "visits", "signups", "paid", "source"], key: r => /^\d{4}-\d{2}$/.test(r.month),
      sql: `INSERT INTO passport_months(month, visits, signups, paid, source) VALUES (?, ?, ?, ?, ?)
            ON CONFLICT(month) DO UPDATE SET visits = coalesce(excluded.visits, passport_months.visits), signups = coalesce(excluded.signups, passport_months.signups),
              paid = coalesce(excluded.paid, passport_months.paid), source = excluded.source` },
    web_days: { cols: ["day", "channel", "sessions", "conversions"], key: r => /^\d{4}-\d{2}-\d{2}$/.test(r.day) && r.channel,
      sql: `INSERT INTO web_days(day, channel, sessions, conversions) VALUES (?, ?, ?, ?)
            ON CONFLICT(day, channel) DO UPDATE SET sessions = excluded.sessions, conversions = excluded.conversions` },
  };
  async function pushData(env, who, can, b) {
    if (!can.settings) return { ok: false, error: "Owners only" };
    const p = PUSH[b.kind];
    if (!p) return { ok: false, error: "Unknown kind" };
    const rows = Array.isArray(b.rows) ? b.rows : [];
    if (!rows.length || rows.length > 3000) return { ok: false, error: "Send 1 to 3,000 rows" };
    const stmts = [];
    for (const r of rows) {
      if (!r || !p.key(r)) return { ok: false, error: "Bad row: " + JSON.stringify(r).slice(0, 120) };
      stmts.push(env.DB.prepare(p.sql).bind(...p.cols.map(c => {
        const v = r[c];
        if (v === undefined || v === null || v === "") return null;
        return typeof v === "object" ? JSON.stringify(v) : v;
      })));
    }
    for (let i = 0; i < stmts.length; i += 80) await env.DB.batch(stmts.slice(i, i + 80));
    await env.DB.prepare("INSERT INTO sync_log(source, started_at, finished_at, rows_in, rows_changed, ok) VALUES (?, datetime('now'), datetime('now'), ?, ?, 1)")
      .bind("push_" + b.kind, rows.length, stmts.length).run();
    return { ok: true, rows: stmts.length };
  }

  /* ---------------- Money (owners) ---------------- */
  function fyStart(iso) { const y = +iso.slice(0, 4), m = +iso.slice(5, 7); return (m >= 4 ? y : y - 1) + "-04"; }

  async function money(env, can) {
    if (!can.business) return { error: "Owners only" };
    const now = todayNz(), ym = now.slice(0, 7), fy = fyStart(now);
    const months = (await all(env, "SELECT month, income, cost_of_sales, expenses, net, lines, source, updated_at FROM finance_months ORDER BY month DESC LIMIT 24"))
      .map(r => ({ ...r, lines: (() => { try { return JSON.parse(r.lines || "null"); } catch { return null; } })() }));
    const points = await all(env, "SELECT key, label, value, as_of FROM finance_points ORDER BY key");
    const target = +(await setting(env, "fy_target_ex_gst", 1235600));
    const fyRows = months.filter(r => r.month >= fy && r.month <= ym);
    const ytd = fyRows.reduce((a, r) => a + (r.income || 0), 0);
    const ytdNet = fyRows.reduce((a, r) => a + (r.net || 0), 0);
    const closed = fyRows.filter(r => r.month < ym);
    const pace = closed.length ? closed.reduce((a, r) => a + (r.income || 0), 0) / closed.length * 12 : null;
    const fyMonthsGone = ((+ym.slice(0, 4) - +fy.slice(0, 4)) * 12 + (+ym.slice(5, 7) - 4)) + 1;
    const weekly = (await one(env, "SELECT round(sum(weekly_value), 2) v FROM memberships WHERE status = 'current' AND billed_by <> 'passport'")).v || 0;
    const owed = await one(env, `SELECT round(sum(CASE WHEN m.status = 'active' THEN b.balance_owing ELSE 0 END), 2) cur,
                                        round(sum(CASE WHEN m.status <> 'active' THEN b.balance_owing ELSE 0 END), 2) left_
                                 FROM billing_accounts b JOIN members m ON m.id = b.member_id WHERE b.balance_owing > 0`);
    const fpVisits = (await one(env, `SELECT count(*) n FROM visits v JOIN member_flags f ON f.member_id = v.member_id AND f.flag = 'passport'
                                      WHERE v.at >= ? AND v.at < ?`, ym + "-01", ym + "-32")).n;
    const fpTiers = await setting(env, "fp_tiers", "");
    return { ym, fy, target, ytd: Math.round(ytd), ytd_net: Math.round(ytdNet), pace: pace && Math.round(pace), fy_months_gone: fyMonthsGone,
             target_to_date: Math.round(target / 12 * Math.min(12, fyRows.length || fyMonthsGone)), last_month: fyRows.length ? fyRows.map(r => r.month).sort().pop() : null, months, points,
             weekly_billed: weekly, yearly_billed_ex_gst: Math.round(weekly * 52 / 1.15),
             owed_current: owed?.cur || 0, owed_left: owed?.left_ || 0,
             passport_visits: fpVisits, passport_estimate: fpVisits ? L.passportPay(fpVisits, fpTiers).total : null,
             updated: months[0]?.updated_at || null };
  }

  /* ---------------- Growth (owners) ---------------- */
  async function growth(env, can) {
    if (!can.business) return { error: "Owners only" };
    const today = todayNz();
    if (!(await one(env, "SELECT 1 x FROM member_snapshots WHERE day = ?", today))) await takeSnapshot(env);
    const snaps = await all(env, "SELECT * FROM member_snapshots WHERE day >= ? ORDER BY day", addDays(today, -400));
    const from = addDays(today.slice(0, 7) + "-01", -366).slice(0, 7);
    const joins = await all(env, "SELECT substr(joined_on, 1, 7) month, count(*) n FROM members WHERE joined_on >= ? GROUP BY 1 ORDER BY 1", from + "-01");
    const leaves = await all(env, "SELECT substr(at, 1, 7) month, count(*) n FROM activity WHERE kind = 'cancel' AND at >= ? GROUP BY 1 ORDER BY 1", from + "-01");
    const trials = await all(env, `SELECT substr(created_at, 1, 7) month, count(*) n, sum(CASE WHEN stage = 'joined' THEN 1 ELSE 0 END) joined
                                   FROM leads WHERE kind = 'trial' AND created_at >= ? GROUP BY 1 ORDER BY 1`, from + "-01");
    const sources = await all(env, `SELECT coalesce(nullif(lead_source, ''), 'Not recorded') source, count(*) n FROM members
                                    WHERE joined_on >= ? GROUP BY 1 ORDER BY 2 DESC`, addDays(today, -90));
    const mix = await all(env, `SELECT p.family, count(DISTINCT ms.member_id) n FROM memberships ms JOIN plans p ON p.id = ms.plan_id
                                JOIN members m ON m.id = ms.member_id AND m.status = 'active' WHERE ms.status = 'current' GROUP BY 1 ORDER BY 2 DESC`);
    const leads = await all(env, `SELECT kind, count(*) n, sum(CASE WHEN stage = 'joined' THEN 1 ELSE 0 END) joined FROM leads
                                  WHERE created_at >= ? GROUP BY 1 ORDER BY 2 DESC`, addDays(today, -90));
    let history = [];
    if (env.M2CC) {
      try {
        let cursor;
        do {
          const l = await env.M2CC.list({ prefix: "snap:", cursor });
          for (const k of l.keys) { const v = await env.M2CC.get(k.name, "json"); if (v) history.push({ month: v.month, members: v.members, joins: v.newMembers, cancels: v.cancels, visits: v.visits, trials: v.trials, pt_leads: v.ptLeads }); }
          cursor = l.list_complete ? null : l.cursor;
        } while (cursor && history.length < 60);
      } catch { history = []; }
    }
    return { snaps, joins, leaves, trials, sources, mix, leads, history: history.sort((a, b) => String(a.month).localeCompare(String(b.month))) };
  }

  /* ---------------- Marketing (owners) ---------------- */
  const SOCIAL = ["instagram", "facebook", "meta"];
  async function marketing(env, can, q) {
    if (!can.business) return { error: "Owners only" };
    const today = todayNz();
    const month = /^\d{4}-\d{2}$/.test(q.get("month") || "") ? q.get("month") : today.slice(0, 7);
    const lo = month + "-01", hi = month + "-32";
    const campaigns = await all(env, `SELECT source, campaign, round(sum(spend), 2) spend, sum(impressions) impressions, sum(clicks) clicks, sum(leads) leads,
                                        sum(landing_views) landing_views FROM marketing_days WHERE day >= ? AND day < ? GROUP BY 1, 2 ORDER BY 3 DESC`, lo, hi);
    const daily = await all(env, "SELECT day, round(sum(spend), 2) spend, sum(leads) leads FROM marketing_days WHERE day >= ? AND day < ? GROUP BY 1 ORDER BY 1", lo, hi);
    const web = await all(env, "SELECT channel, sum(sessions) sessions, sum(conversions) conversions FROM web_days WHERE day >= ? AND day < ? GROUP BY 1 ORDER BY 2 DESC", lo, hi);
    const coreLeads = await all(env, `SELECT coalesce(nullif(source, ''), 'Not recorded') source, count(*) n, sum(CASE WHEN stage = 'joined' THEN 1 ELSE 0 END) joined
                                      FROM leads WHERE created_at >= ? AND created_at < ? GROUP BY 1 ORDER BY 2 DESC`, lo, hi);
    const joins = await all(env, `SELECT coalesce(nullif(lead_source, ''), 'Not recorded') source, count(*) n FROM members
                                  WHERE joined_on >= ? AND joined_on < ? GROUP BY 1 ORDER BY 2 DESC`, lo, hi);
    const trend = await all(env, `SELECT substr(day, 1, 7) month, round(sum(spend), 2) spend, sum(leads) leads FROM marketing_days
                                  WHERE day >= ? GROUP BY 1 ORDER BY 1`, addDays(lo, -190).slice(0, 7) + "-01");
    const joinsTrend = await all(env, `SELECT substr(joined_on, 1, 7) month, count(*) n FROM members WHERE joined_on >= ?
                                       AND lower(coalesce(lead_source, '')) IN ('instagram','facebook') GROUP BY 1`, addDays(lo, -190).slice(0, 7) + "-01");
    const budget = +(await setting(env, "meta_budget_month", 3500));
    const spend = campaigns.filter(c => c.source === "meta").reduce((a, c) => a + (c.spend || 0), 0);
    const allSpend = campaigns.reduce((a, c) => a + (c.spend || 0), 0);
    const platformLeads = campaigns.reduce((a, c) => a + (c.leads || 0), 0);
    const views = campaigns.reduce((a, c) => a + (c.landing_views || 0), 0);
    const socialJoins = joins.filter(j => SOCIAL.includes(j.source.toLowerCase())).reduce((a, j) => a + j.n, 0);
    const socialLeads = coreLeads.filter(j => SOCIAL.includes(j.source.toLowerCase())).reduce((a, j) => a + j.n, 0);
    const dim = new Date(Date.UTC(+month.slice(0, 4), +month.slice(5, 7), 0)).getUTCDate();
    const daysIn = month === today.slice(0, 7) ? +today.slice(8, 10) : dim;
    const last = await one(env, "SELECT max(day) d FROM marketing_days");
    return { month, budget, meta_spend: Math.round(spend * 100) / 100, all_spend: Math.round(allSpend * 100) / 100,
             projected: daysIn ? Math.round(spend / daysIn * dim) : 0, platform_leads: platformLeads, landing_views: views, cost_per_view: views ? Math.round(allSpend / views * 100) / 100 : null, social_leads: socialLeads, social_joins: socialJoins,
             cpl: platformLeads ? Math.round(allSpend / platformLeads * 100) / 100 : null,
             cost_per_join: socialJoins ? Math.round(spend / socialJoins * 100) / 100 : null,
             campaigns, daily, web, core_leads: coreLeads, joins, trend: trend.map(t => ({ ...t, joins: (joinsTrend.find(j => j.month === t.month) || {}).n || 0 })),
             data_to: last?.d || null };
  }

  return { sweepStep, classesWeek, classDetail, bookMember, cancelBooking, memberLive, refreshBalances, takeSnapshot, collections, collectionAction, pushData, money, growth, marketing };
}
