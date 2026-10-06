// M2 Core: the Today page (Club OS layout), the member health score, and "Money on the table".
//
// Health score (Taylor's retention model, 20 Sep 2026): points for days since the last visit
// (0-7 none, 8-14 10, 15-30 25, 31-60 50, 61+ 75) plus 40 for a failed payment in the last 60 days.
// Red is 70 or more (Bekka calls this week), amber 30 or more.
//
// Money on the table: each night (and at most every 6 hours on demand) every member is scanned and
// the results become "plays". Each play has a yearly dollar value, a plain reason, how it was worked
// out, and the members behind it. Owners only, because the values are business money.
//
// Weekly revenue comes from GymMaster's "All Payments" report, copied into the payments table.

export function makeClub(L) {
  const { nzDateTime, passportPay, B } = L;
  const all = (env, sql, ...a) => env.DB.prepare(sql).bind(...a).all().then(r => r.results || []);
  const one = (env, sql, ...a) => env.DB.prepare(sql).bind(...a).first();
  const todayNz = () => nzDateTime(new Date()).slice(0, 10);
  const addDays = (iso, n) => new Date(Date.parse(iso + "T12:00:00Z") + n * 864e5).toISOString().slice(0, 10);
  const daysBetween = (a, b) => Math.round((Date.parse(b + "T12:00:00Z") - Date.parse(a + "T12:00:00Z")) / 864e5);
  const r0 = n => Math.round(+n || 0);
  // Old GymMaster habit: Passport numbers typed after the surname. Not part of anyone's name.
  const nm = r => [r.first_name, r.last_name].filter(Boolean).join(" ").replace(/\s+\d{5,}$/, "") || "No name";
  const setting = async (env, k, d) => { const r = await one(env, "SELECT value FROM settings WHERE key = ?", k); return r ? r.value : d; };
  const setSetting = (env, k, v) => env.DB.prepare("INSERT INTO settings(key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value").bind(k, v).run();

  // People on a paying direct debit membership (not Passport, staff, trials or passes).
  const PAYING = `m.status = 'active' AND EXISTS (SELECT 1 FROM memberships x JOIN plans y ON y.id = x.plan_id WHERE x.member_id = m.id AND x.status = 'current'
                    AND x.billed_by = 'ezidebit' AND y.family NOT IN ('staff', 'trial', 'pass', 'passport'))`;
  const PLAN = `(SELECT p.gm_type_name FROM memberships ms JOIN plans p ON p.id = ms.plan_id WHERE ms.member_id = m.id AND ms.status = 'current' ORDER BY ms.start_date DESC LIMIT 1)`;
  const FAMILY = `(SELECT p.family FROM memberships ms JOIN plans p ON p.id = ms.plan_id WHERE ms.member_id = m.id AND ms.status = 'current' ORDER BY ms.start_date DESC LIMIT 1)`;

  /* ---------------- payments from GymMaster ---------------- */
  async function report(env, path, body) {
    const init = { headers: { "X-GM-API-KEY": String(env.GM_REPORT_KEY || "").trim(), "Accept": "application/json" } };
    if (body) { init.method = "POST"; init.body = JSON.stringify(body); init.headers["Content-Type"] = "application/json"; }
    const r = await fetch((env.GM_SITE || "https://m2trainingclub.gymmasteronline.com") + path, init);
    const t = await r.text();
    try { return JSON.parse(t); } catch { return { error: "Report API replied " + r.status }; }
  }
  async function pullPayments(env, from, to) {
    if (!env.GM_REPORT_KEY) return { ok: false, error: "GM_REPORT_KEY is not set" };
    to = to || todayNz(); from = from || addDays(to, -9);
    let rid = await setting(env, "payment_report_id", "");
    if (!rid) {
      const l = await report(env, "/api/v2/report/standard_report/list?predefined_only=true");
      const hit = [].concat(l.result || []).find(x => /^all payments$/i.test(x.name || ""));
      if (!hit) return { ok: false, error: "No All Payments report found" };
      rid = String(hit.id ?? hit.report_id); await setSetting(env, "payment_report_id", rid);
    }
    const d = await report(env, "/api/v2/report/standard_report", { start_date: from, end_date: to, report_id: +rid, company_id: +(env.COMPANY_ID || 4), displaymode: "ALL" });
    const rows = [].concat(d.result?.result || (Array.isArray(d.result) ? d.result : []));
    if (d.error && !rows.length) return { ok: false, error: d.error };
    const stmts = [env.DB.prepare("DELETE FROM payments WHERE source = 'gymmaster' AND occurred_at >= ? AND occurred_at <= ?").bind(from, to)];
    for (const r of rows) {
      const sec = +r["sorted_Payment Date"], amt = Number.isFinite(+r["sorted_Payment Amount"]) ? +r["sorted_Payment Amount"] : +String(r["Payment Amount"] || "").replace(/[^\d.-]/g, "");
      if (!Number.isFinite(sec) || !Number.isFinite(amt)) continue;
      const day = new Date(sec * 1000).toISOString().slice(0, 10);
      const origin = String(r["Payment Origin"] || ""), method = String(r["Payment Method"] || "");
      const kind = /billing/i.test(origin) ? "debit" : /pos|sale|product/i.test(origin) ? "sale" : "other";
      stmts.push(env.DB.prepare(`INSERT INTO payments(member_id, amount, kind, status, occurred_at, source, external_ref)
                                 VALUES ((SELECT id FROM members WHERE id = ?), ?, ?, 'paid', ?, 'gymmaster', ?)`)
        .bind(+r["Member ID"] || 0, amt, kind, day, (origin + " | " + method + " | " + String(r["Payment Details"] || "")).slice(0, 160)));
    }
    for (let i = 0; i < stmts.length; i += 100) await env.DB.batch(stmts.slice(i, i + 100));
    return { ok: true, from, to, rows: stmts.length - 1 };
  }

  // Monday to Sunday weeks, newest last.
  async function weeklyRevenue(env, weeks = 12) {
    const t = todayNz(), dow = (new Date(t + "T12:00:00Z").getUTCDay() + 6) % 7, mon = addDays(t, -dow);
    const start = addDays(mon, -7 * (weeks - 1));
    const rows = await all(env, "SELECT occurred_at d, round(sum(amount), 2) v FROM payments WHERE source = 'gymmaster' AND occurred_at >= ? GROUP BY 1", start);
    const out = [];
    for (let i = 0; i < weeks; i++) {
      const a = addDays(start, i * 7), b = addDays(a, 6);
      out.push({ from: a, to: b, total: r0(rows.filter(r => r.d >= a && r.d <= b).reduce((s, r) => s + r.v, 0)) });
    }
    return out;
  }

  /* ---------------- health score ---------------- */
  async function health(env) {
    const t = todayNz();
    const rows = await all(env, `SELECT m.id, m.first_name, m.last_name, m.mobile, m.joined_on, ${PLAN} plan,
        (SELECT max(v.at) FROM visits v WHERE v.member_id = m.id) last_visit,
        (SELECT max(d.at) FROM app_doors d WHERE d.member_id = m.id) last_app,
        (SELECT max(month) FROM member_visit_months mv WHERE mv.member_id = m.id AND mv.visits > 0) last_month,
        (SELECT max(f.billing_date) FROM gm_failed f WHERE f.member_id = m.id AND f.billing_date >= ?) failed_on,
        (SELECT max(a.at) FROM activity a WHERE a.member_id = m.id AND a.kind = 'call') called_at,
        (SELECT round(sum(ms.weekly_value), 2) FROM memberships ms WHERE ms.member_id = m.id AND ms.status = 'current') weekly
      FROM members m WHERE ${PAYING} AND coalesce(m.joined_on, '2000-01-01') <= ?`, addDays(t, -60), addDays(t, -21));
    return rows.map(r => {
      let last = [r.last_visit, r.last_app].filter(Boolean).sort().pop(), approx = false;
      if (last) last = last.slice(0, 10); else if (r.last_month) { last = r.last_month + "-28"; approx = true; }
      const days = last ? Math.max(0, daysBetween(last, t)) : 999;
      const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const pts = days <= 7 ? 0 : days <= 14 ? 10 : days <= 30 ? 25 : days <= 60 ? 50 : 75;
      const score = pts + (r.failed_on ? 40 : 0);
      const reasons = [];
      if (days >= 8) reasons.push(days >= 999 ? "No visits on record" : approx ? "Not in since " + MON[+last.slice(5, 7) - 1] : "Not in for " + days + " days");
      if (r.failed_on) reasons.push("Payment failed " + r.failed_on.slice(8, 10) + "/" + r.failed_on.slice(5, 7));
      return { id: r.id, name: nm(r), mobile: r.mobile, plan: r.plan, score, days, reasons, weekly: r.weekly || 0, called_at: r.called_at };
    }).sort((a, b) => b.score - a.score || b.days - a.days);
  }

  /* ---------------- money on the table ---------------- */
  async function scan(env) {
    const t = todayNz(), ym = t.slice(0, 7), d1 = ym + "-01";
    const dayOfMonth = +t.slice(8, 10), dim = new Date(Date.UTC(+ym.slice(0, 4), +ym.slice(5, 7), 0)).getUTCDate();
    const prev = [1, 2, 3].map(i => { const d = new Date(Date.UTC(+ym.slice(0, 4), +ym.slice(5, 7) - 1 - i, 1)); return d.toISOString().slice(0, 7); });
    const tiers = await setting(env, "fp_tiers", "");

    // 1. Passport members coming in less than their usual.
    const fp = await all(env, `SELECT m.id, m.first_name, m.last_name, ${PLAN} plan,
        (SELECT round(avg(mv.visits), 1) FROM member_visit_months mv WHERE mv.member_id = m.id AND mv.month IN (?, ?, ?)) usual,
        (SELECT count(DISTINCT substr(v.at, 1, 10)) FROM visits v WHERE v.member_id = m.id AND v.at >= ?) now_
      FROM members m JOIN member_flags f ON f.member_id = m.id AND f.flag = 'passport' WHERE m.status = 'active'`, prev[0], prev[1], prev[2], d1);
    const fpLow = fp.filter(r => (r.usual || 0) >= 4 && (dayOfMonth >= 7 ? r.now_ / dayOfMonth * dim : r.now_ + r.usual * (dim - dayOfMonth) / dim) < r.usual * 0.75)
      .map(r => ({ id: r.id, name: nm(r), plan: r.plan, why: "Usually " + r.usual + " visits a month, " + r.now_ + " so far this month" }));
    const fpPace = (await one(env, `SELECT count(*) n FROM (SELECT DISTINCT v.member_id, substr(v.at, 1, 10) FROM visits v
        JOIN member_flags f ON f.member_id = v.member_id AND f.flag = 'passport' WHERE v.at >= ?)`, d1)).n;
    const pace = dayOfMonth > 1 ? Math.round(fpPace / Math.max(1, dayOfMonth - 1) * dim) : fpPace;
    const extra = passportPay(pace + fpLow.length, tiers).total - passportPay(pace, tiers).total;
    const rate = fpLow.length ? extra / fpLow.length : passportPay(pace, tiers).rate;

    // 2. Red list.
    const hs = await health(env);
    const reds = hs.filter(h => h.score >= 70);
    const avgWeekly = hs.length ? hs.reduce((a, h) => a + h.weekly, 0) / hs.length : 0;

    // 3. Daily or Entry members training like Perform members (10+ days in the last 4 weeks).
    const up = await all(env, `SELECT m.id, m.first_name, m.last_name, ${PLAN} plan,
        (SELECT count(DISTINCT substr(v.at, 1, 10)) FROM visits v WHERE v.member_id = m.id AND v.at >= ?) days
      FROM members m WHERE ${PAYING} AND EXISTS (SELECT 1 FROM memberships x JOIN plans y ON y.id = x.plan_id WHERE x.member_id = m.id AND x.status = 'current'
        AND (y.family = 'daily' OR y.gm_type_name LIKE '%Entry%'))`, addDays(t, -28));
    const upg = up.filter(r => r.days >= 10).map(r => ({ id: r.id, name: nm(r), plan: r.plan, why: (Math.round(r.days / 4 * 10) / 10) + " visits a week over the last 4 weeks" }));

    // 4. Owe money but still coming in.
    const owe = await all(env, `SELECT m.id, m.first_name, m.last_name, ${PLAN} plan, b.balance_owing owed,
        (SELECT max(v.at) FROM visits v WHERE v.member_id = m.id) last
      FROM members m JOIN billing_accounts b ON b.member_id = m.id WHERE b.balance_owing > 0
        AND EXISTS (SELECT 1 FROM visits v WHERE v.member_id = m.id AND v.at >= ?)`, addDays(t, -30));
    const settle = o => o <= 1500 ? o * 0.5 : o * 0.7;
    const debt = owe.map(r => ({ id: r.id, name: nm(r), plan: r.plan, owed: r.owed, settle: Math.round(settle(r.owed)),
      why: "Owes $" + Math.round(r.owed).toLocaleString("en-NZ") + ", settle at $" + Math.round(settle(r.owed)).toLocaleString("en-NZ") + ", last in " + String(r.last || "").slice(0, 10) }));

    // 5. Newer members (90 days) who haven't had their free PT. Recovery memberships don't get one.
    const fresh = await all(env, `SELECT m.id, m.first_name, m.last_name, m.joined_on, ${PLAN} plan FROM members m
      WHERE ${PAYING} AND m.joined_on >= ? AND ${FAMILY} NOT IN ('recovery')
        AND NOT EXISTS (SELECT 1 FROM leads l LEFT JOIN pt_leads p ON p.lead_id = l.id WHERE l.kind = 'free_pt' AND coalesce(p.pt_status, '') <> 'duplicate'
          AND (l.member_id = m.id OR (m.email <> '' AND lower(l.email) = lower(m.email)) OR (length(m.mobile) >= 8 AND substr(replace(l.mobile, ' ', ''), -8) = substr(m.mobile, -8))))`, addDays(t, -90));
    const noPt = fresh.map(r => ({ id: r.id, name: nm(r), plan: r.plan, why: "Joined " + r.joined_on + ", no free PT yet" }));

    const plays = [
      { id: "passport", title: "Get Passport members in a little more often", n: fpLow.length, value: r0(extra * 12),
        reason: "These Passport members are coming in less than their own usual this month. Passport pays for every visit, so one extra visit each is real money.",
        how: fpLow.length + " members × 1 extra visit a month × $" + rate.toFixed(2) + " a visit × 12 months", act: "Passport nudges", go: "passport", members: fpLow },
      { id: "red", title: "Save the red list before they cancel", n: reds.length, value: r0(reds.length * 0.3 * avgWeekly * 52),
        reason: "Paying members with a health score of 70 or more: long gaps since their last visit, or a failed payment on top of a gap. A call this week saves some of them.",
        how: reds.length + " members × 30% saved × $" + r0(avgWeekly * 52).toLocaleString("en-NZ") + " average member a year", act: "Open call list", call: true,
        members: reds.map(h => ({ id: h.id, name: h.name, plan: h.plan, why: "Score " + h.score + ": " + h.reasons.join(", ") })) },
      { id: "upgrade", title: "Upgrade Daily members who train like Perform members", n: upg.length, value: r0(upg.length * 0.25 * 20 * 52),
        reason: "They're in 2.5 times a week or more on a Daily or Entry membership. Perform is the natural next step.",
        how: upg.length + " members × 25% take-up × $20 a week more × 52", act: "Open call list", call: true, members: upg },
      { id: "debt", title: "Collect overdue balances while they still visit", n: debt.length, value: r0(debt.reduce((a, d) => a + d.settle, 0) * 0.6),
        reason: "They owe money but still come through the door. Settlement offers: 50% off at $1,500 or less, 30% off above that. Never refer anyone under $1,000 to Marshall Freeman.",
        how: "$" + r0(debt.reduce((a, d) => a + d.settle, 0)).toLocaleString("en-NZ") + " in settlement offers × 60% collected", act: "Open Money owed", go: "collections", members: debt },
      { id: "pt", title: "Fill new trainers with free PT", n: noPt.length, value: r0(noPt.length * 0.15 * 1200),
        reason: "Newer members who haven't had their free PT session. Send them to Tim to hand out, and some become PT clients.",
        how: noPt.length + " members × 15% become clients × about $1,200 a year", act: "Send to Tim", pt: true, members: noPt },
    ];
    const out = { at: nzDateTime(new Date()), ts: Date.now(), plays, total: plays.reduce((a, p) => a + p.value, 0), reds: hs.filter(h => h.score >= 70).slice(0, 40), amber: hs.filter(h => h.score >= 30 && h.score < 70).length };
    await setSetting(env, "plays_cache", JSON.stringify(out));
    return out;
  }
  async function cached(env, fresh) {
    if (!fresh) {
      const c = await setting(env, "plays_cache", "");
      if (c) { try { const j = JSON.parse(c); if (j.ts && Date.now() - j.ts < 6 * 36e5) return j; } catch {} }
    }
    return scan(env);
  }

  async function plays(env, can, q) {
    if (!can.business) return { error: "Only Taylor and Tim see Money on the table." };
    const d = await cached(env, q && q.get("fresh") === "1");
    return { at: d.at, total: d.total, plays: d.plays.map(p => ({ ...p, members: undefined, sample: p.members.slice(0, 3).map(m => m.name) })) };
  }
  async function playMembers(env, can, id) {
    if (!can.business) return { error: "Owners only" };
    const d = await cached(env);
    const p = d.plays.find(x => x.id === id);
    return p ? { id: p.id, title: p.title, call: !!p.call, pt: !!p.pt, members: p.members } : { error: "Not found" };
  }

  /* ---------------- Today ---------------- */
  async function home(env, who, can) {
    if (!can.members) return { error: "No access" };
    const t = todayNz(), now = nzDateTime(new Date());
    const ago90 = nzDateTime(new Date(Date.now() - 90 * 60000));
    const own = can.members === "own";
    const inNow = (await one(env, `SELECT count(DISTINCT member_id) n FROM (SELECT member_id FROM visits WHERE at >= ? UNION ALL SELECT member_id FROM app_doors WHERE at >= ?)`, ago90, ago90)).n;
    const today = (await one(env, `SELECT count(DISTINCT member_id) n FROM (SELECT member_id FROM visits WHERE at >= ? UNION ALL SELECT member_id FROM app_doors WHERE at >= ?)`, t, t)).n;
    const lastSeen = (await one(env, "SELECT max(at) a FROM (SELECT max(at) at FROM visits UNION ALL SELECT max(at) FROM app_doors)")).a;
    const out = { today: t, now, in_now: inNow, checkins: today, last_checkin: lastSeen };

    if (!own) {
      const feed = await all(env, `SELECT x.member_id id, x.at, m.first_name, m.last_name, m.joined_on, ${PLAN} plan,
          (SELECT balance_owing FROM billing_accounts b WHERE b.member_id = m.id) owing
        FROM (SELECT member_id, at FROM visits WHERE at >= ? UNION ALL SELECT member_id, at FROM app_doors WHERE at >= ?) x
        JOIN members m ON m.id = x.member_id ORDER BY x.at DESC LIMIT 14`, addDays(t, -2), addDays(t, -2));
      const md = s => s ? s.slice(5, 10) : "";
      const week = [-3, -2, -1, 0, 1, 2, 3].map(i => md(addDays(t, i)));
      out.feed = feed.filter((r, i) => !i || feed[i - 1].id !== r.id).slice(0, 6).map(r => ({ id: r.id, name: nm(r), plan: r.plan, at: r.at, owes: r.owing > 0 ? r.owing : 0,
        anniversary: !!(r.joined_on && +r.joined_on.slice(0, 4) === +t.slice(0, 4) - 1 && week.includes(md(r.joined_on))) }));
      const hs = await health(env);
      out.calls = hs.filter(h => h.score >= 70 && !(h.called_at && h.called_at >= addDays(t, -14))).slice(0, 5)
        .map(h => ({ id: h.id, name: h.name, mobile: h.mobile, plan: h.plan, score: h.score, reasons: h.reasons }));
      out.red_total = hs.filter(h => h.score >= 70).length;
      const ann = await one(env, `SELECT count(*) n FROM members m WHERE m.status = 'active' AND substr(m.joined_on, 1, 4) = ? AND substr(m.joined_on, 6, 5) IN (${week.map(() => "?").join(",")})
                                   AND NOT EXISTS (SELECT 1 FROM member_flags f WHERE f.member_id = m.id AND f.flag = 'passport')`, String(+t.slice(0, 4) - 1), ...week);
      const d = await cached(env);
      out.heads = { anniversaries: ann.n, no_pt: (d.plays.find(p => p.id === "pt") || {}).n || 0 };
      if (can.collections) out.heads.big_debts = (await one(env, "SELECT count(*) n FROM billing_accounts WHERE balance_owing > 1000")).n;
      const ev = await setting(env, "upcoming_events", "");
      out.heads.events = ev ? ev.split("\n").map(s => s.trim()).filter(Boolean).slice(0, 3) : [];
    }

    if (can.business) {
      // M2 debits every day (each member on their own day), so the useful number is the next 7 days.
      try { const o = await B.overview(env, who, can); const wk = o.days.slice(0, 7);
            out.debit_run = { from: t, n: wk.reduce((a, d) => a + d.n, 0), total: r0(wk.reduce((a, d) => a + d.total, 0)), tomorrow: o.days[1] ? { n: o.days[1].n, total: r0(o.days[1].total) } : null }; } catch (e) { out.debit_run = null; }
      const d = await cached(env);
      out.money = { total: d.total, at: d.at, plays: d.plays.slice().sort((a, b) => b.value - a.value).slice(0, 4).map(p => ({ id: p.id, title: p.title, n: p.n, value: p.value })) };
      out.weekly = await weeklyRevenue(env);
    }
    return out;
  }

  // Log a call or an offer from Today or a play list. Shows on the member's timeline.
  async function logCall(env, who, can, id, b) {
    if (can.members !== true) return { error: "No access" };
    const out = { answered: "Spoke to them", no_answer: "No answer", message: "Left a message", offer: "Made the offer" }[b.outcome] || "Called";
    const note = String(b.note || "").slice(0, 300);
    await env.DB.prepare("INSERT INTO activity(member_id, staff_id, kind, detail) VALUES (?, ?, 'call', ?)")
      .bind(id, who.id, out + (b.from ? " (" + String(b.from).slice(0, 40) + ")" : "") + (note ? ": " + note : "")).run();
    return { ok: true };
  }

  // Hand a newer member to Tim as a free PT lead.
  async function sendToTim(env, who, can, id) {
    if (!can.business) return { error: "Owners only" };
    const m = await one(env, "SELECT id, first_name, last_name, email, mobile, goal FROM members WHERE id = ?", id);
    if (!m) return { error: "Member not found" };
    const dup = await one(env, "SELECT l.id FROM leads l WHERE l.kind = 'free_pt' AND l.member_id = ?", id);
    if (dup) return { ok: true, already: true };
    const r = await env.DB.prepare(`INSERT INTO leads(member_id, name, email, mobile, kind, source, stage, goal, notes) VALUES (?, ?, ?, ?, 'free_pt', 'core', 'new', ?, 'From Money on the table')`)
      .bind(m.id, nm(m), m.email, m.mobile, m.goal).run();
    await env.DB.prepare("INSERT INTO pt_leads(lead_id, reason, pt_status) VALUES (?, 'Newer member, free PT not used yet', 'new')").bind(r.meta.last_row_id).run();
    return { ok: true };
  }

  return { pullPayments, weeklyRevenue, health, scan, cached, plays, playMembers, home, logCall, sendToTim };
}
