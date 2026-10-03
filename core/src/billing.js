// M2 Core: billing, ready for Ezidebit.
//
// How it works
//   Every member on a direct debit plan gets a schedule: amount, how often, next debit date.
//   Each night the Core works out who is due in the next couple of days, sends those debits to
//   Ezidebit, then reads back what was paid and what failed. Failed debits get a retry (and a fee
//   if M2 sets one), and the balance feeds the $250 block and Money owed.
//
// Safety
//   GymMaster keeps billing everyone until a member is switched to the Core (billed_by_system =
//   'core'), one by one or in a pilot group. Until then the Core only records what it WOULD have
//   debited (status 'preview'), so the two can be compared and nobody is ever charged twice.
//   Real debits also need the Ezidebit key in Cloudflare and BILLING_MODE = "ezidebit" (the
//   sandbox works without that switch).

export function makeBilling(L) {
  const { nzDateTime, E } = L;
  const todayNz = () => nzDateTime(new Date()).slice(0, 10);
  const all = (env, sql, ...a) => env.DB.prepare(sql).bind(...a).all().then(r => r.results || []);
  const one = (env, sql, ...a) => env.DB.prepare(sql).bind(...a).first();
  const run = (env, sql, ...a) => env.DB.prepare(sql).bind(...a).run();
  const r2 = n => Math.round((+n || 0) * 100) / 100;
  const addDays = (iso, n) => new Date(new Date(iso + "T12:00:00Z").getTime() + n * 86400_000).toISOString().slice(0, 10);
  const addMonths = (iso, n) => {
    const [y, m, d] = iso.split("-").map(Number);
    const t = new Date(Date.UTC(y, m - 1 + n, 1));
    const last = new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth() + 1, 0)).getUTCDate();
    t.setUTCDate(Math.min(d, last));
    return t.toISOString().slice(0, 10);
  };
  const STEP = { weekly: d => addDays(d, 7), fortnightly: d => addDays(d, 14), monthly: d => addMonths(d, 1), quarterly: d => addMonths(d, 3), yearly: d => addMonths(d, 12) };
  const PER_WEEK = { weekly: 1, fortnightly: 0.5, monthly: 12 / 52, quarterly: 4 / 52, yearly: 1 / 52 };
  const INFO = ["gifted", "arrears", "credit"];   // worth knowing, but not a reason to hold back a move
  const MON = { Jan: 1, Feb: 2, Mar: 3, Apr: 4, May: 5, Jun: 6, Jul: 7, Aug: 8, Sep: 9, Oct: 10, Nov: 11, Dec: 12 };

  // GymMaster says things like "$54.50 on Mon 5 Oct 2026" or "Unable to bill - No Default Billing Method Selected".
  function readGm(s) {
    const m = String(s || "").match(/\$([\d,]+(?:\.\d{1,2})?)\s+on\s+\w{3}\s+(\d{1,2})\s+(\w{3})\s+(\d{4})/);
    if (!m || !MON[m[3]]) return null;
    return { amount: +m[1].replace(/,/g, ""), date: m[4] + "-" + String(MON[m[3]]).padStart(2, "0") + "-" + m[2].padStart(2, "0") };
  }

  async function rules(env) {
    const rows = await all(env, "SELECT key, value FROM settings WHERE key LIKE 'bill_%' OR key = 'block_at_balance'");
    const v = Object.fromEntries(rows.map(r => [r.key, r.value]));
    return { lead_days: +(v.bill_lead_days ?? 2), failed_fee: +(v.bill_failed_fee ?? 0), retry_days: +(v.bill_retry_days ?? 3),
             max_retries: +(v.bill_max_retries ?? 2), block_at: +(v.block_at_balance ?? 250),
             // What billing costs M2 (owners fill these in from Ezidebit's and GymMaster's actual quotes).
             debit_fee: +(v.bill_debit_fee ?? 0.99), dishonour_fee: +(v.bill_dishonour_fee ?? 0), gm_cost: +(v.bill_gm_cost ?? 793.5), gm_doors_cost: v.bill_gm_doors_cost != null ? +v.bill_gm_doors_cost : null,
             fee_confirmed: v.bill_fee_confirmed === "1" };
  }

  function mode(env) {
    const key = E.ready(env), sandbox = E.sandbox(env);
    const canSend = key && (sandbox || env.BILLING_MODE === "ezidebit");
    return { kind: !key ? "preview" : sandbox ? "sandbox" : canSend ? "live" : "ready", key, sandbox, can_send: canSend };
  }

  /* ---------------- who gets billed, and when ---------------- */

  // Every current member on a debit plan, or with a debit coming in GymMaster.
  async function billable(env, onlyId) {
    const rows = await all(env, `
      WITH ms AS (
        SELECT ms.member_id, ms.price, ms.start_date, ms.min_term_end, ms.end_date, p.frequency, p.gm_type_name plan, p.family,
               row_number() OVER (PARTITION BY ms.member_id ORDER BY ms.start_date DESC, ms.id DESC) rn
        FROM memberships ms JOIN plans p ON p.id = ms.plan_id
        WHERE ms.status = 'current' AND ms.billed_by = 'ezidebit' AND p.paid_in_full = 0
          AND coalesce(p.frequency, '') NOT IN ('upfront', 'in_person') AND p.family NOT IN ('trial', 'pass', 'passport', 'challenge'))
      SELECT m.id, m.first_name, m.last_name, m.mobile, m.email, ms.price, ms.frequency, ms.plan, ms.family, ms.start_date, ms.min_term_end, ms.end_date,
             coalesce(b.billed_by_system, 'gymmaster') billed_by, b.next_debit_date, b.next_debit_amount, coalesce(b.balance_owing, 0) owing,
             bc.next_bill gm_next, coalesce(bc.no_billing, 0) no_billing, bc.checked_at,
             bp.state, bp.hold_from, bp.hold_to, bp.hold_reason, bp.amount_override, bp.amount_from, bp.arrangement_extra, bp.arrangement_note, bp.method, bp.method_label,
             EXISTS (SELECT 1 FROM member_flags f WHERE f.member_id = m.id AND f.flag = 'gifted_time') gifted
      FROM members m
      LEFT JOIN ms ON ms.member_id = m.id AND ms.rn = 1
      LEFT JOIN billing_accounts b ON b.member_id = m.id
      LEFT JOIN balance_checks bc ON bc.member_id = m.id
      LEFT JOIN billing_profiles bp ON bp.member_id = m.id
      WHERE m.status IN ('active','frozen') ${onlyId ? "AND m.id = " + (+onlyId) : ""}
        AND (ms.member_id IS NOT NULL OR bc.next_bill LIKE '$%' OR b.billed_by_system = 'core')`);
    // A GymMaster "next bill" of $0 (Passport, gifted, paid up front) isn't a debit.
    return rows.filter(r => r.price > 0 || r.billed_by === "core" || (readGm(r.gm_next) || {}).amount > 0);
  }

  // One member's schedule: what, how often, the next date, and anything stopping it.
  function schedule(m, today) {
    const gm = readGm(m.gm_next);
    const issues = [];
    const freq = STEP[m.frequency] ? m.frequency : null;
    let base = m.price > 0 ? r2(m.price) : null, source = "core";
    if (base == null && gm) { base = gm.amount; source = "gymmaster"; issues.push({ k: "no_plan", t: m.plan ? "GymMaster debits " + money(gm.amount) + " but the Core has no price for " + m.plan : "No plan in the Core. GymMaster debits " + money(gm.amount) }); }
    else if (base == null) issues.push({ k: "no_price", t: "No price to debit" });
    if (!freq && m.plan) issues.push({ k: "no_freq", t: "Not sure how often " + m.plan + " is billed" });
    let next = null, from = "";
    if (m.billed_by === "core" && m.next_debit_date) { next = m.next_debit_date; from = "core"; }
    else if (gm) { next = gm.date; from = "gymmaster"; }
    else if (freq && m.start_date) { next = m.start_date.slice(0, 10); while (next < today) next = STEP[freq](next); from = "start"; }
    if (/unable to bill|no default billing/i.test(m.gm_next || "") || m.no_billing) issues.push({ k: "no_method", t: "No bank or card details in GymMaster" });
    if (gm && base != null && source === "core" && Math.abs(gm.amount - base) > 0.01 && !(m.amount_override > 0)) {
      const diff = r2(gm.amount - base);
      // GymMaster adds money owed to the next debit, and takes less when there's credit, free weeks or a part week.
      if (diff > 0 && m.owing > 0 && diff <= r2(m.owing) + 0.05) issues.push({ k: "arrears", t: "GymMaster's next debit of " + money(gm.amount) + " includes " + money(diff) + " they owe (plan " + money(base) + ")" });
      else if (diff < 0) issues.push({ k: "credit", t: "GymMaster will take " + money(-diff) + " less than the plan this time (" + money(gm.amount) + " instead of " + money(base) + "): free weeks, credit or a part week" });
      else issues.push({ k: "amount", t: "GymMaster will take " + money(gm.amount) + ", the Core plan says " + money(base) + ", and it isn't money owed" });
    }
    if (!next) issues.push({ k: "no_date", t: "No next debit date" });
    if (m.gifted) issues.push({ k: "gifted", t: "Gifted time: not billed" });
    const state = m.state || "active";
    return { base, freq, next, from, source, state, issues, gm };
  }

  function amountOn(m, s, date) {
    let a = s.base || 0;
    if (m.amount_override > 0 && (!m.amount_from || date >= m.amount_from)) a = m.amount_override;
    return r2(a);
  }
  const onHold = (m, date) => m.state === "hold" && (!m.hold_from || date >= m.hold_from) && (!m.hold_to || date <= m.hold_to);

  // Every regular debit between two dates (inclusive) for one member, with why any is skipped.
  function debitsBetween(m, s, from, to) {
    const out = [];
    if (!s.next || !s.base) return out;
    let d = s.next, guard = 0;
    while (d < from && s.freq && guard++ < 400) d = STEP[s.freq](d);
    while (d <= to && guard++ < 400) {
      let skip = null;
      if (s.state === "cancelled") skip = "Billing cancelled";
      else if (m.end_date && d > m.end_date) skip = "Membership has ended";
      else if (onHold(m, d)) skip = "On hold" + (m.hold_to ? " to " + m.hold_to : "");
      else if (m.gifted) skip = "Gifted time";
      else if (s.issues.some(i => i.k === "no_method")) skip = "No bank or card details";
      out.push({ date: d, amount: amountOn(m, s, d), skip });
      if (!s.freq) break;
      d = STEP[s.freq](d);
    }
    return out;
  }

  /* ---------------- the nightly run ---------------- */

  async function nightly(env) {
    const today = todayNz(), R = await rules(env), M = mode(env);
    const out = { mode: M.kind, reconciled: null, planned: 0, sent: 0, preview: 0, errors: [] };
    if (M.can_send) {
      try { out.reconciled = await reconcile(env, R); } catch (e) { out.errors.push("reconcile: " + e.message); }
    }
    const until = addDays(today, Math.max(0, R.lead_days));
    const people = await billable(env);
    const have = new Set((await all(env, "SELECT member_id || '|' || debit_date k FROM billing_items WHERE kind = 'regular' AND debit_date BETWEEN ? AND ?", today, until)).map(r => r.k));
    const inserts = [], advance = [];
    for (const m of people) {
      const s = schedule(m, today);
      const list = debitsBetween(m, s, today, until).filter(x => !x.skip && !have.has(m.id + "|" + x.date));
      for (const x of list) {
        const core = m.billed_by === "core";
        inserts.push(env.DB.prepare("INSERT OR IGNORE INTO billing_items(member_id, debit_date, amount, kind, status, note) VALUES (?, ?, ?, 'regular', ?, ?)")
          .bind(m.id, x.date, x.amount, core ? "planned" : "preview", core ? null : "GymMaster bills this member"));
        if (core) out.planned++; else out.preview++;
        if (core && m.owing > 0 && m.arrangement_extra > 0)
          inserts.push(env.DB.prepare("INSERT INTO billing_items(member_id, debit_date, amount, kind, status, note) VALUES (?, ?, ?, 'arrangement', 'planned', ?)")
            .bind(m.id, x.date, r2(Math.min(m.arrangement_extra, m.owing)), m.arrangement_note || "Payment arrangement"));
      }
      if (m.billed_by === "core" && s.next && s.freq) {
        let n = s.next; while (n <= until) n = STEP[s.freq](n);
        if (n !== m.next_debit_date) advance.push(env.DB.prepare("UPDATE billing_accounts SET next_debit_date = ?, next_debit_amount = ?, updated_at = datetime('now') WHERE member_id = ?").bind(n, amountOn(m, s, n), m.id));
      }
    }
    for (let i = 0; i < inserts.length; i += 100) await env.DB.batch(inserts.slice(i, i + 100));
    for (let i = 0; i < advance.length; i += 100) await env.DB.batch(advance.slice(i, i + 100));
    if (M.can_send) {
      const due = await all(env, `SELECT i.id, i.member_id, i.debit_date, i.amount, i.kind FROM billing_items i JOIN billing_accounts b ON b.member_id = i.member_id AND b.billed_by_system = 'core'
                                  WHERE i.status = 'planned' AND i.debit_date <= ? ORDER BY i.debit_date LIMIT 400`, until);
      for (const it of due) {
        const date = it.debit_date < addDays(today, 1) ? addDays(today, 1) : it.debit_date;
        try {
          await E.addPayment(env, it.member_id, date, it.amount, "M2-" + it.id);
          await run(env, "UPDATE billing_items SET status = 'sent', debit_date = ?, sent_at = datetime('now'), ezi_ref = ? WHERE id = ?", date, "M2-" + it.id, it.id);
          out.sent++;
        } catch (e) { out.errors.push(it.member_id + ": " + e.message); }
      }
    }
    await run(env, "DELETE FROM billing_items WHERE status = 'preview' AND debit_date < ?", addDays(today, -90));
    await run(env, "INSERT INTO billing_events(kind, detail, ezidebit) VALUES ('run', ?, ?)",
      `Nightly run: ${out.planned} planned, ${out.sent} sent, ${out.preview} preview` + (out.reconciled ? `, ${out.reconciled.paid} paid, ${out.reconciled.failed} failed` : "") + (out.errors.length ? `, ${out.errors.length} errors` : ""),
      M.kind);
    await run(env, "INSERT INTO settings(key, value) VALUES ('bill_last_run', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value", JSON.stringify({ at: new Date().toISOString(), ...out, errors: out.errors.slice(0, 10) }));
    return out;
  }

  // Read the last fortnight back from Ezidebit and settle our rows.
  async function reconcile(env, R) {
    const today = todayNz();
    const pays = await E.getPayments(env, addDays(today, -14), addDays(today, 3));
    let paid = 0, failed = 0;
    for (const p of pays) {
      const id = +String(p.reference || "").replace(/^M2-/, "");
      if (!id || p.status === "processing") continue;
      const it = await one(env, "SELECT * FROM billing_items WHERE id = ? AND status = 'sent'", id);
      if (!it) continue;
      if (p.status === "paid") {
        await env.DB.batch([
          env.DB.prepare("UPDATE billing_items SET status = 'paid', settled_at = ? WHERE id = ?").bind(p.settled || today, id),
          env.DB.prepare("INSERT INTO payments(member_id, amount, kind, status, occurred_at, source, external_ref) VALUES (?, ?, ?, 'paid', ?, 'ezidebit', ?)")
            .bind(it.member_id, it.amount, it.kind === "retry" ? "retry" : "debit", p.settled || today, p.ezi_id || it.ezi_ref),
          ...(["retry", "arrangement", "fee"].includes(it.kind) ? [env.DB.prepare("UPDATE billing_accounts SET balance_owing = max(0, balance_owing - ?) WHERE member_id = ?").bind(it.amount, it.member_id)] : []),
        ]);
        paid++;
      } else {
        const tries = (await one(env, "SELECT count(*) n FROM billing_items WHERE retry_of = ?", it.retry_of || it.id)).n;
        const stmts = [
          env.DB.prepare("UPDATE billing_items SET status = 'failed', failure_reason = ?, settled_at = ? WHERE id = ?").bind(p.reason || "Declined by the bank", today, id),
          env.DB.prepare("INSERT INTO payments(member_id, amount, kind, status, failure_reason, occurred_at, source, external_ref) VALUES (?, ?, 'failed_debit', 'failed', ?, ?, 'ezidebit', ?)")
            .bind(it.member_id, it.amount, p.reason, today, p.ezi_id || it.ezi_ref),
          env.DB.prepare("INSERT INTO billing_events(member_id, kind, detail, ezidebit) VALUES (?, 'failed', ?, 'sent')").bind(it.member_id, money(it.amount) + " failed: " + (p.reason || "declined")),
        ];
        if (it.kind === "regular" || it.kind === "one_off") stmts.push(env.DB.prepare("UPDATE billing_accounts SET balance_owing = balance_owing + ? WHERE member_id = ?").bind(it.amount, it.member_id));
        if (it.kind !== "fee" && tries < R.max_retries)
          stmts.push(env.DB.prepare("INSERT INTO billing_items(member_id, debit_date, amount, kind, status, retry_of, note) VALUES (?, ?, ?, 'retry', 'planned', ?, ?)")
            .bind(it.member_id, addDays(today, R.retry_days), it.amount, it.retry_of || it.id, "Retry " + (tries + 1) + " of " + R.max_retries));
        if (R.failed_fee > 0 && it.kind !== "fee")
          stmts.push(env.DB.prepare("INSERT OR IGNORE INTO billing_items(member_id, debit_date, amount, kind, status, note) VALUES (?, ?, ?, 'fee', 'planned', 'Failed payment fee')")
            .bind(it.member_id, addDays(today, R.retry_days), R.failed_fee),
            env.DB.prepare("UPDATE billing_accounts SET balance_owing = balance_owing + ? WHERE member_id = ?").bind(R.failed_fee, it.member_id));
        await env.DB.batch(stmts);
        failed++;
      }
    }
    return { checked: pays.length, paid, failed };
  }

  /* ---------------- pages ---------------- */

  async function overview(env, who, can) {
    if (!can.collections) return { error: "No access" };
    const today = todayNz(), R = await rules(env), M = mode(env);
    const people = await billable(env);
    const days = {};
    for (let i = 0; i < 28; i++) days[addDays(today, i)] = { date: addDays(today, i), n: 0, total: 0, core: 0, skipped: 0 };
    const counts = { members: people.length, core: 0, gymmaster: 0, no_method: 0, issues: 0, hold: 0, cancelled: 0 };
    let weekly = 0;
    for (const m of people) {
      const s = schedule(m, today);
      counts[m.billed_by === "core" ? "core" : "gymmaster"]++;
      if (s.issues.some(i => i.k === "no_method")) counts.no_method++;
      if (s.issues.some(i => !INFO.includes(i.k))) counts.issues++;
      if (s.state === "hold") counts.hold++;
      if (s.state === "cancelled") counts.cancelled++;
      if (s.base && s.freq && s.state === "active" && !m.gifted) weekly += s.base * PER_WEEK[s.freq];
      for (const x of debitsBetween(m, s, today, addDays(today, 27))) {
        const d = days[x.date]; if (!d) continue;
        if (x.skip) { d.skipped++; continue; }
        d.n++; d.total += x.amount; if (m.billed_by === "core") d.core++;
      }
    }
    const list = Object.values(days).map(d => ({ ...d, total: r2(d.total) }));
    const failed = await all(env, `SELECT i.id, i.member_id, i.debit_date, i.amount, i.kind, i.failure_reason, m.first_name, m.last_name, m.mobile,
                                     (SELECT count(*) FROM billing_items r WHERE r.retry_of = coalesce(i.retry_of, i.id) AND r.status IN ('planned','sent')) retry_pending
                                   FROM billing_items i JOIN members m ON m.id = i.member_id WHERE i.status = 'failed' AND i.debit_date >= ? ORDER BY i.debit_date DESC LIMIT 100`, addDays(today, -60));
    const events = await all(env, `SELECT e.at, e.kind, e.detail, e.ezidebit, e.member_id, m.first_name, m.last_name, s.name staff FROM billing_events e
                                   LEFT JOIN members m ON m.id = e.member_id LEFT JOIN staff s ON s.id = e.staff_id ORDER BY e.id DESC LIMIT 25`);
    const last = await one(env, "SELECT value FROM settings WHERE key = 'bill_last_run'");
    const out = { today, mode: M, rules: R, counts, days: list.map(d => can.business ? d : { ...d, total: undefined }), failed, events, last_run: last ? JSON.parse(last.value) : null,
                  steps: [
                    { t: "Billing engine built and running each night in preview", done: true },
                    { t: "Ezidebit API access and a sandbox key", done: M.key },
                    { t: "Test debits in the sandbox (Taylor and Tim as test members)", done: M.key && M.sandbox && counts.core > 0 },
                    { t: "Live key in, BILLING_MODE switched to ezidebit", done: M.kind === "live" },
                    { t: "Pilot: 20 members moved from GymMaster to the Core", done: counts.core >= 20 && M.kind === "live" },
                    { t: "Everyone moved, GymMaster billing turned off", done: counts.gymmaster === 0 && counts.core > 0 },
                  ] };
    // What moving billing would cost: debits a month from the real schedule, at the fee per debit.
    if (can.business) {
      const debits28 = list.reduce((a, d) => a + d.n, 0), perMonth = debits28 * (365 / 12) / 28;
      const byFreq = {}; for (const m of people) { const s = schedule(m, today); if (s.state === "active" && s.freq) byFreq[s.freq] = (byFreq[s.freq] || 0) + 1; }
      const weeklyPayers = byFreq.weekly || 0, savedIfFortnightly = weeklyPayers * (52 / 12) / 2;
      const failRate = (await one(env, `SELECT count(*) n FROM gm_failed WHERE billing_date >= ?`, addDays(today, -30))).n / Math.max(1, perMonth);
      const fees = perMonth * R.debit_fee + perMonth * failRate * R.dishonour_fee;
      const fn = (perMonth - savedIfFortnightly);
      out.cost = { debits_month: Math.round(perMonth), by_freq: byFreq, fail_rate: Math.round(failRate * 1000) / 10,
        fees_month: r2(fees), per_member: r2(fees / Math.max(1, counts.members)),
        fortnightly: { debits_month: Math.round(fn), fees_month: r2(fn * R.debit_fee + fn * failRate * R.dishonour_fee) },
        gm_now: R.gm_cost, gm_doors: R.gm_doors_cost, fee_confirmed: R.fee_confirmed, debit_fee: R.debit_fee, dishonour_fee: R.dishonour_fee,
        after: R.gm_doors_cost != null ? r2(fees + R.gm_doors_cost) : null };
    }
    if (can.business) out.money = { weekly: r2(weekly), next7: r2(list.slice(0, 7).reduce((a, d) => a + d.total, 0)), next28: r2(list.reduce((a, d) => a + d.total, 0)),
                                     failed_sum: r2(failed.reduce((a, f) => a + f.amount, 0)) };
    return out;
  }

  // Everyone due on one day, and everyone who would have been but is skipped.
  async function day(env, who, can, date) {
    if (!can.collections) return { error: "No access" };
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date || "")) date = todayNz();
    const today = todayNz(), people = await billable(env), rows = [], skipped = [];
    for (const m of people) {
      const s = schedule(m, today);
      for (const x of debitsBetween(m, s, date, date)) {
        const r = { id: m.id, first_name: m.first_name, last_name: m.last_name, plan: m.plan, freq: s.freq, amount: x.amount, by: m.billed_by, from: s.from };
        if (x.skip) skipped.push({ ...r, why: x.skip }); else rows.push(r);
      }
    }
    const items = await all(env, `SELECT i.id, i.member_id id_m, i.amount, i.kind, i.status, i.note, i.failure_reason, m.first_name, m.last_name FROM billing_items i
                                  JOIN members m ON m.id = i.member_id WHERE i.debit_date = ? AND i.kind <> 'regular' ORDER BY m.first_name`, date);
    const done = Object.fromEntries((await all(env, "SELECT member_id, status FROM billing_items WHERE debit_date = ? AND kind = 'regular'", date)).map(r => [r.member_id, r.status]));
    for (const r of rows) r.status = done[r.id] || (date < today ? "" : "due");
    rows.sort((a, b) => (a.first_name || "").localeCompare(b.first_name || ""));
    return { date, rows, skipped, extras: items, total: can.business ? r2(rows.reduce((a, r) => a + r.amount, 0)) : undefined };
  }

  // Everything that would stop a clean switch from GymMaster.
  async function ready(env, who, can) {
    if (!can.collections) return { error: "No access" };
    const today = todayNz(), people = await billable(env), rows = [], kinds = {};
    for (const m of people) {
      const s = schedule(m, today);
      for (const i of s.issues) {
        if (i.k === "gifted") continue;
        kinds[i.k] = (kinds[i.k] || 0) + 1;
        rows.push({ id: m.id, first_name: m.first_name, last_name: m.last_name, plan: m.plan, k: i.k, t: i.t, gm: m.gm_next, checked: m.checked_at });
      }
    }
    return { total: people.length, clean: people.length - new Set(rows.filter(r => !INFO.includes(r.k)).map(r => r.id)).size, kinds, rows: rows.slice(0, 600) };
  }

  async function member(env, who, can, id) {
    if (!can.balances) return { error: "No access" };
    const today = todayNz(), M = mode(env);
    const [m] = await billable(env, id);
    const items = await all(env, "SELECT id, debit_date, amount, kind, status, note, failure_reason FROM billing_items WHERE member_id = ? ORDER BY debit_date DESC, id DESC LIMIT 30", id);
    const events = await all(env, `SELECT e.at, e.kind, e.detail, e.ezidebit, s.name staff FROM billing_events e LEFT JOIN staff s ON s.id = e.staff_id WHERE e.member_id = ? ORDER BY e.id DESC LIMIT 20`, id);
    if (!m) return { none: true, mode: M.kind, items, events };
    const s = schedule(m, today);
    const coming = debitsBetween(m, s, today, addDays(today, s.freq === "monthly" ? 120 : s.freq === "quarterly" ? 200 : 45)).slice(0, 6);
    return { mode: M.kind, can_act: !!can.collections, can_switch: !!can.settings, billed_by: m.billed_by, plan: m.plan, freq: s.freq, base: s.base, next: s.next, next_from: s.from,
             state: s.state, hold_from: m.hold_from, hold_to: m.hold_to, hold_reason: m.hold_reason, amount_override: m.amount_override, amount_from: m.amount_from,
             arrangement_extra: m.arrangement_extra, arrangement_note: m.arrangement_note, owing: m.owing, method: m.method_label || m.method,
             gm_next: m.gm_next, issues: s.issues, coming, items, events, min_term_end: m.min_term_end };
  }

  /* ---------------- changes ---------------- */

  async function act(env, who, can, id, b) {
    if (!can.collections) return { ok: false, error: "Only Bekka and the owners can change billing." };
    const M = mode(env), today = todayNz(), a = String(b.action || "");
    const acct = await one(env, "SELECT billed_by_system FROM billing_accounts WHERE member_id = ?", id);
    const core = acct && acct.billed_by_system === "core", live = core && M.can_send;
    const date = v => /^\d{4}-\d{2}-\d{2}$/.test(v || "") ? v : null;
    const amt = v => { const n = r2(parseFloat(String(v || "").replace(/[^0-9.]/g, ""))); return n > 0 && n < 5000 ? n : null; };
    const ensure = () => run(env, "INSERT OR IGNORE INTO billing_profiles(member_id) VALUES (?)", id);
    const log = (kind, detail, ezi) => run(env, "INSERT INTO billing_events(member_id, kind, detail, staff_id, ezidebit) VALUES (?, ?, ?, ?, ?)", id, kind, detail, who.id, ezi || (core ? (live ? "sent" : "waiting") : "preview"));
    // Pull back anything already sent to Ezidebit for dates we no longer want to debit.
    async function unsend(from, to) {
      const sent = await all(env, "SELECT id, debit_date, amount FROM billing_items WHERE member_id = ? AND status IN ('planned','sent') AND kind IN ('regular','arrangement') AND debit_date >= ? AND (? IS NULL OR debit_date <= ?)", id, from, to, to);
      for (const it of sent) {
        if (live) { try { await E.deletePayment(env, id, it.debit_date, it.amount, "M2-" + it.id); } catch (e) { return "error: " + e.message; } }
        await run(env, "UPDATE billing_items SET status = 'cancelled' WHERE id = ?", it.id);
      }
      return sent.length;
    }
    if (a === "hold") {
      const from = date(b.from) || today, to = date(b.to);
      if (to && to < from) return { ok: false, error: "The hold ends before it starts." };
      await ensure();
      await run(env, "UPDATE billing_profiles SET state = 'hold', hold_from = ?, hold_to = ?, hold_reason = ?, updated_at = datetime('now') WHERE member_id = ?", from, to, String(b.reason || "").slice(0, 200) || null, id);
      const n = await unsend(from, to);
      await log("hold", "On hold from " + from + (to ? " to " + to : " until further notice") + (b.reason ? " (" + b.reason + ")" : ""));
      return { ok: true, pulled: n };
    }
    if (a === "resume") {
      await ensure();
      await run(env, "UPDATE billing_profiles SET state = 'active', hold_from = NULL, hold_to = NULL, hold_reason = NULL, updated_at = datetime('now') WHERE member_id = ?", id);
      await log("resume", "Billing back on");
      return { ok: true };
    }
    if (a === "amount") {
      const n = b.reset ? null : amt(b.amount), from = date(b.from) || today;
      if (!b.reset && !n) return { ok: false, error: "Type the new amount, like 49.50." };
      await ensure();
      await run(env, "UPDATE billing_profiles SET amount_override = ?, amount_from = ?, updated_at = datetime('now') WHERE member_id = ?", n, n ? from : null, id);
      if (core) await run(env, "UPDATE billing_items SET amount = ? WHERE member_id = ? AND kind = 'regular' AND status = 'planned' AND debit_date >= ?", n || 0, id, from).catch(() => {});
      await log("amount", n ? "Debit changed to " + money(n) + " from " + from : "Back to the plan price");
      return { ok: true };
    }
    if (a === "one_off") {
      const n = amt(b.amount), d = date(b.date) || addDays(today, 2);
      if (!n) return { ok: false, error: "Type the amount, like 25.00." };
      if (d < addDays(today, 1)) return { ok: false, error: "Pick tomorrow or later. Ezidebit needs a day's notice." };
      await run(env, "INSERT INTO billing_items(member_id, debit_date, amount, kind, status, note, created_by) VALUES (?, ?, ?, 'one_off', ?, ?, ?)", id, d, n, core ? "planned" : "preview", String(b.note || "One-off charge").slice(0, 120), who.id);
      await log("one_off", "One-off " + money(n) + " on " + d + (b.note ? " (" + b.note + ")" : ""));
      return { ok: true };
    }
    if (a === "arrangement") {
      const n = b.end ? null : amt(b.extra);
      if (!b.end && !n) return { ok: false, error: "Type the extra to add to each debit, like 20.00." };
      await ensure();
      await run(env, "UPDATE billing_profiles SET arrangement_extra = ?, arrangement_note = ?, updated_at = datetime('now') WHERE member_id = ?", n, n ? String(b.note || "").slice(0, 200) || null : null, id);
      await log("arrangement", n ? "Payment plan: an extra " + money(n) + " each debit until the balance is cleared" + (b.note ? " (" + b.note + ")" : "") : "Payment plan ended");
      return { ok: true };
    }
    if (a === "cancel") {
      if (!String(b.reason || "").trim()) return { ok: false, error: "Say why billing is stopping." };
      await ensure();
      await run(env, "UPDATE billing_profiles SET state = 'cancelled', cancel_reason = ?, updated_at = datetime('now') WHERE member_id = ?", String(b.reason).slice(0, 200), id);
      const n = await unsend(today, null);
      let ezi = core ? (live ? "sent" : "waiting") : "preview";
      if (live) { try { await E.changeStatus(env, id, "C", b.reason); } catch (e) { ezi = "error: " + e.message; } }
      await log("cancel", "Billing stopped: " + b.reason, ezi);
      return { ok: true, pulled: n };
    }
    if (a === "restart") {
      await ensure();
      await run(env, "UPDATE billing_profiles SET state = 'active', cancel_reason = NULL, updated_at = datetime('now') WHERE member_id = ?", id);
      let ezi;
      if (live) { try { await E.changeStatus(env, id, "A"); ezi = "sent"; } catch (e) { ezi = "error: " + e.message; } }
      await log("resume", "Billing restarted", ezi);
      return { ok: true };
    }
    if (a === "retry" || a === "fee" || a === "waive") {
      const it = await one(env, "SELECT * FROM billing_items WHERE id = ? AND member_id = ?", +b.item, id);
      if (!it || it.status !== "failed") return { ok: false, error: "That debit isn't a failed one." };
      if (a === "retry") {
        const d = date(b.date) || addDays(today, 2);
        if (d < addDays(today, 1)) return { ok: false, error: "Pick tomorrow or later." };
        await run(env, "INSERT INTO billing_items(member_id, debit_date, amount, kind, status, retry_of, note, created_by) VALUES (?, ?, ?, 'retry', 'planned', ?, 'Retry set by staff', ?)", id, d, it.amount, it.retry_of || it.id, who.id);
        await log("retry", "Retry " + money(it.amount) + " on " + d);
      } else if (a === "fee") {
        const R = await rules(env), n = amt(b.amount) || R.failed_fee;
        if (!n) return { ok: false, error: "Type the fee amount." };
        const ins = await run(env, "INSERT OR IGNORE INTO billing_items(member_id, debit_date, amount, kind, status, note, created_by) VALUES (?, ?, ?, 'fee', ?, 'Failed payment fee', ?)", id, addDays(today, 2), n, core ? "planned" : "preview", who.id);
        if (!(ins.meta && ins.meta.changes)) return { ok: false, error: "There's already a fee on that day." };
        await run(env, "UPDATE billing_accounts SET balance_owing = balance_owing + ? WHERE member_id = ?", n, id);
        await log("fee", "Failed payment fee " + money(n));
      } else {
        await env.DB.batch([
          env.DB.prepare("UPDATE billing_items SET status = 'waived', note = coalesce(note || '. ', '') || ? WHERE id = ?").bind("Waived by " + who.name, it.id),
          env.DB.prepare("UPDATE billing_items SET status = 'cancelled' WHERE retry_of = ? AND status = 'planned'").bind(it.retry_of || it.id),
          env.DB.prepare("UPDATE billing_accounts SET balance_owing = max(0, balance_owing - ?) WHERE member_id = ?").bind(it.amount, id),
        ]);
        await log("waive", "Waived " + money(it.amount) + (b.note ? " (" + b.note + ")" : ""));
      }
      return { ok: true };
    }
    if (a === "switch") {
      if (!can.settings) return { ok: false, error: "Only Taylor and Tim can move a member's billing." };
      const to = b.to === "core" ? "core" : "gymmaster";
      if (to === "core") {
        const [m] = await billable(env, id);
        if (!m) return { ok: false, error: "They're not on a debit plan." };
        const s = schedule(m, today);
        if (!s.next || !s.base || !s.freq) return { ok: false, error: "Fix this first: " + s.issues.map(i => i.t).join(". ") };
        let n = s.next; while (n < addDays(today, 1)) n = STEP[s.freq](n);
        await run(env, `INSERT INTO billing_accounts(member_id, billed_by_system, next_debit_date, next_debit_amount) VALUES (?, 'core', ?, ?)
                        ON CONFLICT(member_id) DO UPDATE SET billed_by_system = 'core', next_debit_date = excluded.next_debit_date, next_debit_amount = excluded.next_debit_amount, updated_at = datetime('now')`,
          id, n, amountOn(m, s, n));
        await run(env, "DELETE FROM billing_items WHERE member_id = ? AND status = 'preview' AND debit_date >= ?", id, today);
        await log("switch", "Billing moved to the M2 Core. Next debit " + money(amountOn(m, s, n)) + " on " + n + ". Stop their billing in GymMaster now.", M.can_send ? "sent" : "waiting");
        return { ok: true, next: n };
      }
      await unsend(today, null);
      await run(env, "UPDATE billing_accounts SET billed_by_system = 'gymmaster', updated_at = datetime('now') WHERE member_id = ?", id);
      await log("switch", "Billing moved back to GymMaster. Turn their billing back on there.", "not_needed");
      return { ok: true };
    }
    if (a === "method") {
      if (!M.key) return { ok: false, error: "Ezidebit isn't connected yet." };
      try {
        const c = await E.customer(env, id);
        const label = { DR: "Bank account", CR: "Card" }[c.method] || c.method || "None";
        await ensure();
        await run(env, "UPDATE billing_profiles SET method = ?, method_label = ?, updated_at = datetime('now') WHERE member_id = ?", c.method === "CR" ? "card" : c.method === "DR" ? "bank" : "none", label, id);
        return { ok: true, method: label, status: c.status };
      } catch (e) { return { ok: false, error: e.message }; }
    }
    return { ok: false, error: "Unknown change" };
  }

  async function saveRules(env, who, can, b) {
    if (!can.settings) return { ok: false, error: "Owners only" };
    const ok = { bill_lead_days: [1, 7], bill_failed_fee: [0, 50], bill_retry_days: [1, 14], bill_max_retries: [0, 5],
                 bill_debit_fee: [0, 5], bill_dishonour_fee: [0, 50], bill_gm_cost: [0, 5000], bill_gm_doors_cost: [0, 5000], bill_fee_confirmed: [0, 1] };
    const stmts = [];
    for (const [k, [lo, hi]] of Object.entries(ok)) {
      if (b[k] === undefined || b[k] === "") continue;
      const v = +b[k];
      if (!(v >= lo && v <= hi)) return { ok: false, error: k.replace("bill_", "").replace(/_/g, " ") + " must be between " + lo + " and " + hi };
      stmts.push(env.DB.prepare("INSERT INTO settings(key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value").bind(k, String(v)));
    }
    if (stmts.length) await env.DB.batch(stmts);
    await run(env, "INSERT INTO billing_events(kind, detail, staff_id, ezidebit) VALUES ('run', 'Billing rules changed', ?, 'not_needed')", who.id);
    return { ok: true, rules: await rules(env) };
  }

  async function test(env, can) {
    if (!can.settings) return { error: "Owners only" };
    return { ...(await E.test(env)), mode: mode(env), url: E.url(env) };
  }

  function money(n) { return "$" + (+n || 0).toLocaleString("en-NZ", { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }

  return { nightly, overview, day, ready, member, act, saveRules, test, readGm, schedule, mode };
}
