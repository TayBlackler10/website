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

import { MIN_CENTS, OUR_REF } from "./ezidebit.js";

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
             coalesce(b.billed_by_system, 'gymmaster') billed_by, b.ezidebit_ref, b.ezidebit_status, b.ezidebit_checked_at, b.next_debit_date, b.next_debit_amount, coalesce(b.balance_owing, 0) owing,
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
    if (m.billed_by === "core" && stopped(m.ezidebit_status)) issues.push({ k: "ezi_stopped", t: STOPPED_TEXT });
    if (m.billed_by === "core" && !m.ezidebit_checked_at) issues.push({ k: "ezi_unchecked", t: "Not yet confirmed in Ezidebit. Press Check Ezidebit on their billing card before their first debit." });
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
      else if (s.issues.some(i => i.k === "ezi_stopped")) skip = "Ezidebit has stopped debiting them";
      out.push({ date: d, amount: amountOn(m, s, d), skip });
      if (!s.freq) break;
      d = STEP[s.freq](d);
    }
    return out;
  }

  /* ---------------- the nightly run ---------------- */
  // Ezidebit rules this follows (https://www.getpayments.com/docs/):
  //   - one debit per member per day: everything due for a member on a date goes as one AddPaymentUnique
  //   - nothing under $2.00 is sent (it waits to join the member's next debit)
  //   - a debit is marked 'sending' before the call, and resent with the same reference if the answer
  //     was lost; Ezidebit refuses a reference it already has, so it can never be taken twice
  //   - only references the Core made (M2-<item id>) are matched back, and the member and amount must agree

  const cents = n => Math.round((+n || 0) * 100);
  const custOf = (acct, memberId) => acct && acct.ezidebit_ref ? { cid: acct.ezidebit_ref } : { ref: E.ref(memberId) };
  // Ezidebit has stopped debiting this member (a fatal dishonour, or a non-processing status from a check).
  const stopped = st => !!st && !E.processing(st);
  const STOPPED_TEXT = "Ezidebit has stopped debiting them. They need to update their bank or card details, then press Check Ezidebit.";

  // Only one run at a time (the 2:15am run and the Run now button), so nothing is sent twice.
  async function lock(env) {
    const now = Date.now();
    const r = await run(env, "INSERT INTO settings(key, value) VALUES ('bill_lock', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value WHERE CAST(settings.value AS INTEGER) < ?", String(now), now - 15 * 60_000);
    return !!(r.meta && r.meta.changes);
  }
  const unlock = env => run(env, "DELETE FROM settings WHERE key = 'bill_lock'");

  async function nightly(env) {
    const today = todayNz(), R = await rules(env), M = mode(env);
    const out = { mode: M.kind, reconciled: null, planned: 0, sent: 0, preview: 0, waiting: 0, errors: [] };
    if (!(await lock(env))) { out.errors.push("Billing is already running. Try again in a few minutes."); return out; }
    try {
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
      if (M.can_send) await send(env, today, until, out);
      await run(env, "DELETE FROM billing_items WHERE status = 'preview' AND debit_date < ?", addDays(today, -90));
      await run(env, "INSERT INTO billing_events(kind, detail, ezidebit) VALUES ('run', ?, ?)",
        `Nightly run: ${out.planned} planned, ${out.sent} sent, ${out.preview} preview` + (out.reconciled ? `, ${out.reconciled.paid} paid, ${out.reconciled.failed} failed` + (out.reconciled.reversed ? `, ${out.reconciled.reversed} taken back` : "") : "") + (out.errors.length ? `, ${out.errors.length} errors` : ""),
        M.kind);
      await run(env, "INSERT INTO settings(key, value) VALUES ('bill_last_run', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value", JSON.stringify({ at: new Date().toISOString(), ...out, errors: out.errors.slice(0, 10) }));
      return out;
    } finally { await unlock(env); }
  }

  // Send what's due to Ezidebit: one combined debit per member per date.
  async function send(env, today, until, out) {
    const tomorrow = addDays(today, 1);
    const rows = await all(env, `SELECT i.id, i.member_id, i.debit_date, i.amount, i.kind, i.status, i.ezi_ref, i.send_date,
                                        b.ezidebit_ref, b.ezidebit_status, b.gm_clear_at, bp.state, bp.hold_from, bp.hold_to
                                 FROM billing_items i JOIN billing_accounts b ON b.member_id = i.member_id AND b.billed_by_system = 'core'
                                 LEFT JOIN billing_profiles bp ON bp.member_id = i.member_id
                                 WHERE (i.status = 'planned' AND i.debit_date <= ?) OR i.status = 'sending'
                                 ORDER BY i.member_id, i.debit_date, i.id LIMIT 1000`, until);
    const groups = new Map();
    for (const it of rows) {
      if (it.status === "sending") {   // the answer was lost last time: send again with the same reference
        const k = "s|" + it.ezi_ref;
        if (!groups.has(k)) groups.set(k, { resend: true, ref: it.ezi_ref, member: it.member_id, acct: it, date: it.send_date < tomorrow ? tomorrow : it.send_date, items: [] });
        groups.get(k).items.push(it); continue;
      }
      const date = it.debit_date < tomorrow ? tomorrow : it.debit_date;
      if (it.state === "cancelled") { await run(env, "UPDATE billing_items SET status = 'cancelled', note = coalesce(note || '. ', '') || 'Billing stopped' WHERE id = ? AND status = 'planned'", it.id); continue; }
      if (onHold(it, date)) { out.waiting++; continue; }
      if (stopped(it.ezidebit_status)) { out.waiting++; continue; }
      const k = "p|" + it.member_id + "|" + date;
      if (!groups.has(k)) groups.set(k, { resend: false, member: it.member_id, acct: it, date, items: [] });
      groups.get(k).items.push(it);
    }
    const calls = {}, readyFor = {};
    // Before a member's first Core debit: confirm who they are in Ezidebit and that GymMaster left nothing waiting there.
    async function firstCheck(g) {
      if (g.member in readyFor) return readyFor[g.member];
      let ok = true;
      try {
        if (!g.acct.ezidebit_ref) {
          const look = await findInEzidebit(env, g.member);
          if (!look.c || !look.c.cid) { out.errors.push(g.member + ": not found in Ezidebit, nothing sent. Tried " + look.tried.join("; ")); ok = false; }
          else { await run(env, "UPDATE billing_accounts SET ezidebit_ref = ?, ezidebit_status = ?, ezidebit_checked_at = datetime('now') WHERE member_id = ?", look.c.cid, look.c.status, g.member); g.acct.ezidebit_ref = look.c.cid; if (!E.processing(look.c.status)) { out.errors.push(g.member + ": " + STOPPED_TEXT); ok = false; } }
        }
        if (ok && !g.acct.gm_clear_at) {
          const c = await clearForeign(env, g.acct, g.member);
          if (c.left.length) { out.errors.push(g.member + ": Ezidebit still has debits from GymMaster waiting (" + c.left.join(", ") + "). Nothing sent until they're removed in Ezidebit Online."); ok = false; }
        }
      } catch (e) { out.errors.push(g.member + ": couldn't check Ezidebit (" + e.message + ")"); ok = false; }
      return (readyFor[g.member] = ok);
    }
    for (const g of groups.values()) {
      if (!g.resend && !(await firstCheck(g))) continue;
      const total = g.items.reduce((a, x) => a + cents(x.amount), 0), ids = g.items.map(x => x.id);
      if ((calls[g.member] || 0) >= 2) { out.errors.push(g.member + ": already sent two debits for them this run"); continue; }
      if (!g.resend) {
        if (total < MIN_CENTS) {
          // Under Ezidebit's $2.00 minimum: join the member's next planned debit, or wait for one.
          const next = await one(env, "SELECT debit_date d FROM billing_items WHERE member_id = ? AND status = 'planned' AND debit_date > ? AND id NOT IN (" + ids.map(() => "?").join(",") + ") ORDER BY debit_date LIMIT 1", g.member, g.date, ...ids);
          if (next) await env.DB.batch(ids.map(id => env.DB.prepare("UPDATE OR IGNORE billing_items SET debit_date = ? WHERE id = ?").bind(next.d, id)));
          else await env.DB.batch(ids.map(id => env.DB.prepare("UPDATE billing_items SET failure_reason = ? WHERE id = ?").bind("Under Ezidebit's $2.00 minimum. Waits to go with their next debit.", id)));
          out.waiting++; continue;
        }
        const already = (await one(env, "SELECT count(DISTINCT ezi_ref) n FROM billing_items WHERE member_id = ? AND send_date = ? AND status IN ('sending','sent','paid','failed','unknown','reversed')", g.member, g.date)).n;
        if (already >= 2) { out.errors.push(g.member + ": Ezidebit already has two debits for them on " + g.date); continue; }
        // A new reference each time a group goes to Ezidebit; a suffix if any item was sent before.
        g.ref = "M2-" + ids[0] + (g.items.some(x => x.ezi_ref) ? "-" + Date.now().toString(36) : "");
        const claim = await run(env, "UPDATE billing_items SET status = 'sending', ezi_ref = ?, send_date = ?, failure_reason = NULL WHERE status = 'planned' AND id IN (" + ids.map(() => "?").join(",") + ")", g.ref, g.date, ...ids);
        if (!claim.meta || claim.meta.changes !== ids.length) {
          await run(env, "UPDATE billing_items SET status = 'planned' WHERE ezi_ref = ? AND status = 'sending'", g.ref);
          out.errors.push(g.member + ": changed while sending, will try again next run"); continue;
        }
      }
      calls[g.member] = (calls[g.member] || 0) + 1;
      try {
        try { await E.addPayment(env, custOf(g.acct, g.member), g.date, total, g.ref); }
        catch (e) { if (!E.isDuplicate(e)) throw e; }   // Ezidebit already has this reference: it got there last time
        await run(env, "UPDATE billing_items SET status = 'sent', send_date = ?, sent_at = datetime('now') WHERE ezi_ref = ? AND status = 'sending'", g.date, g.ref);
        out.sent++;
      } catch (e) {
        if (e.kind === "network" || e.kind === "unknown") {
          out.errors.push(g.member + ": no clear answer from Ezidebit, will check again next run (" + e.message + ")");
        } else {
          await run(env, "UPDATE billing_items SET status = 'planned', failure_reason = ? WHERE ezi_ref = ? AND status = 'sending'", String(e.message).slice(0, 200), g.ref);
          out.errors.push(g.member + ": " + e.message);
        }
      }
    }
  }

  // Read results back from Ezidebit and settle our rows: paid, failed, and money taken back after it was paid.
  async function reconcile(env, R) {
    const today = todayNz();
    const last = (await one(env, "SELECT value FROM settings WHERE key = 'bill_reconciled_to'"))?.value;
    const from = last ? addDays(last < addDays(today, -10) ? last : addDays(today, -10), -3) : addDays(today, -30);
    const seen = new Set(), pays = [];
    for (const field of ["SETTLEMENT", "PAYMENT"]) {
      for (const p of await E.getPayments(env, { from, to: today, field, reference: "M2-%" })) {
        const k = [p.reference, p.ezi_id, p.code, p.amount, p.debit_date].join("|");
        if (!seen.has(k)) { seen.add(k); pays.push(p); }
      }
    }
    let paid = 0, failed = 0, reversed = 0, mismatched = 0;
    const flag = async (memberId, detail) => {
      if (!(await one(env, "SELECT 1 x FROM billing_events WHERE member_id = ? AND kind = 'mismatch' AND detail = ?", memberId, detail)))
        await run(env, "INSERT INTO billing_events(member_id, kind, detail, ezidebit) VALUES (?, 'mismatch', ?, 'sent')", memberId, detail);
      mismatched++;
    };
    for (const p of pays) {
      if (!OUR_REF.test(p.reference)) continue;   // not a debit the Core sent
      const items = await all(env, "SELECT * FROM billing_items WHERE ezi_ref = ? ORDER BY id", p.reference);
      if (!items.length) continue;
      const mid = items[0].member_id, acct = await one(env, "SELECT ezidebit_ref FROM billing_accounts WHERE member_id = ?", mid);
      // The customer must agree: by Ezidebit customer ID when both sides have it, else by our reference
      // (a member moved from GymMaster keeps GymMaster's reference, so that's only checked when no ID is saved).
      const custOk = acct && acct.ezidebit_ref && p.ezi_customer ? p.ezi_customer === String(acct.ezidebit_ref)
                   : !(acct && acct.ezidebit_ref) && p.system_ref ? p.system_ref === E.ref(mid) : true;
      const sum = r2(items.reduce((a, x) => a + x.amount, 0));
      const reversal = p.amount < 0 || /late return|claim|chargeback/i.test(p.reason || "") || ["90", "91", "92"].includes(String(p.return_code));
      const base = Math.abs(p.scheduled != null ? p.scheduled : reversal ? p.amount : p.amount - p.fee_customer);
      if (!custOk || Math.abs(base - sum) > 0.01) { await flag(mid, `Ezidebit's ${p.reference} (${money(base)}) doesn't match the Core (${money(sum)}${custOk ? "" : ", different customer"}). Not applied. Check it in Ezidebit Online.`); continue; }

      if (reversal) {
        // Paid, then taken back (late return, claim or chargeback): they owe it again.
        const back = items.filter(x => x.status === "paid");
        if (!back.length) continue;
        const why = p.reason || "Taken back after it was paid";
        const stmts = [];
        for (const x of back) {
          stmts.push(env.DB.prepare("UPDATE billing_items SET status = 'reversed', failure_reason = ? WHERE id = ? AND status = 'paid'").bind(why, x.id),
            env.DB.prepare("INSERT INTO payments(member_id, amount, kind, status, failure_reason, occurred_at, source, external_ref) VALUES (?, ?, 'reversal', 'failed', ?, ?, 'ezidebit', ?)").bind(x.member_id, -x.amount, why, p.debit_date || today, p.ezi_id || p.reference),
            env.DB.prepare("UPDATE billing_accounts SET balance_owing = balance_owing + ? WHERE member_id = ?").bind(x.amount, x.member_id));
        }
        stmts.push(env.DB.prepare("INSERT INTO billing_events(member_id, kind, detail, ezidebit) VALUES (?, 'failed', ?, 'sent')").bind(mid, money(sum) + " taken back after it was paid: " + why + ". Added to what they owe."));
        await env.DB.batch(stmts);
        reversed++; continue;
      }
      if (p.status === "waiting" || p.status === "processing") continue;
      const open = items.filter(x => ["sent", "sending", "unknown"].includes(x.status));
      if (!open.length) continue;
      const settle = p.settled || today;
      if (p.status === "paid") {
        const stmts = [];
        open.forEach((it, i) => {
          stmts.push(env.DB.prepare("UPDATE billing_items SET status = 'paid', settled_at = ?, failure_reason = NULL, ezi_payment_id = ?, ezi_invoice = ?, fee_client = ?, fee_customer = ? WHERE id = ?")
              .bind(settle, p.ezi_id || null, p.invoice_id || null, i ? 0 : p.fee_client, i ? 0 : p.fee_customer, it.id),
            env.DB.prepare("INSERT INTO payments(member_id, amount, kind, status, occurred_at, source, external_ref) VALUES (?, ?, ?, 'paid', ?, 'ezidebit', ?)")
              .bind(it.member_id, it.amount, it.kind === "retry" ? "retry" : "debit", settle, p.ezi_id || it.ezi_ref));
          if (["retry", "arrangement", "fee"].includes(it.kind)) stmts.push(env.DB.prepare("UPDATE billing_accounts SET balance_owing = max(0, balance_owing - ?) WHERE member_id = ?").bind(it.amount, it.member_id));
        });
        await env.DB.batch(stmts);
        paid++;
      } else {
        const why = p.reason || "Declined by the bank";
        const stmts = [];
        for (const it of open) {
          stmts.push(env.DB.prepare("UPDATE billing_items SET status = 'failed', failure_reason = ?, settled_at = ?, ezi_payment_id = ? WHERE id = ?").bind(why, settle, p.ezi_id || null, it.id),
            env.DB.prepare("INSERT INTO payments(member_id, amount, kind, status, failure_reason, occurred_at, source, external_ref) VALUES (?, ?, 'failed_debit', 'failed', ?, ?, 'ezidebit', ?)")
              .bind(it.member_id, it.amount, why, settle, p.ezi_id || it.ezi_ref));
          if (it.kind === "regular" || it.kind === "one_off") stmts.push(env.DB.prepare("UPDATE billing_accounts SET balance_owing = balance_owing + ? WHERE member_id = ?").bind(it.amount, it.member_id));
          // A fatal dishonour (wrong or closed account, cancelled card) stops Ezidebit debiting them, so retrying is pointless.
          if (!p.fatal && it.kind !== "fee") {
            const root = it.retry_of || it.id;
            const tries = (await one(env, "SELECT count(*) n FROM billing_items WHERE retry_of = ?", root)).n;
            if (tries < R.max_retries)
              stmts.push(env.DB.prepare("INSERT INTO billing_items(member_id, debit_date, amount, kind, status, retry_of, note) VALUES (?, ?, ?, 'retry', 'planned', ?, ?)")
                .bind(it.member_id, addDays(today, R.retry_days), it.amount, root, "Retry " + (tries + 1) + " of " + R.max_retries));
          }
        }
        if (p.fatal) {
          stmts.push(env.DB.prepare("UPDATE billing_accounts SET ezidebit_status = 'F', ezidebit_checked_at = datetime('now') WHERE member_id = ?").bind(mid),
            env.DB.prepare("INSERT INTO billing_events(member_id, kind, detail, ezidebit) VALUES (?, 'failed', ?, 'sent')").bind(mid, money(sum) + " failed: " + why + ". No retry: " + STOPPED_TEXT));
        } else {
          stmts.push(env.DB.prepare("INSERT INTO billing_events(member_id, kind, detail, ezidebit) VALUES (?, 'failed', ?, 'sent')").bind(mid, money(sum) + " failed: " + why));
        }
        if (R.failed_fee > 0 && !open.every(it => it.kind === "fee"))
          stmts.push(env.DB.prepare("INSERT OR IGNORE INTO billing_items(member_id, debit_date, amount, kind, status, note) VALUES (?, ?, ?, 'fee', 'planned', 'Failed payment fee')")
            .bind(mid, addDays(today, R.retry_days), R.failed_fee),
            env.DB.prepare("UPDATE billing_accounts SET balance_owing = balance_owing + ? WHERE member_id = ?").bind(R.failed_fee, mid));
        await env.DB.batch(stmts);
        failed++;
      }
    }
    // Sent but no result after 10 days: flag it for a person to check, rather than leave it hanging.
    const stale = await run(env, "UPDATE billing_items SET status = 'unknown', failure_reason = 'No result from Ezidebit after 10 days. Check this debit in Ezidebit Online.' WHERE status = 'sent' AND coalesce(send_date, debit_date) < ?", addDays(today, -10));
    const unknown = (stale.meta && stale.meta.changes) || 0;
    if (unknown) await run(env, "INSERT INTO billing_events(kind, detail, ezidebit) VALUES ('failed', ?, 'sent')", unknown + " debits have had no result from Ezidebit for 10 days. They're listed under Failed payments to check.");
    await run(env, "INSERT INTO settings(key, value) VALUES ('bill_reconciled_to', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value", today);
    return { checked: pays.length, paid, failed, reversed, unknown, mismatched };
  }

  // Ezidebit's form sends the member back here with their Ezidebit customer ID. Only kept once Ezidebit
  // confirms that customer carries this member's reference (the page is public, so the link isn't trusted).
  async function signedUp(env, q) {
    const id = +q.get("member"), uref = q.get("uref") || "", cref = q.get("cref") || "";
    if (!id || uref !== E.ref(id) || !/^\d{1,20}$/.test(cref) || !E.ready(env)) return { ok: false };
    const c = await E.customer(env, { cid: cref });
    if (c.ref !== E.ref(id)) return { ok: false };
    await run(env, `INSERT INTO billing_accounts(member_id, ezidebit_ref, ezidebit_status, ezidebit_checked_at) VALUES (?, ?, ?, datetime('now'))
                    ON CONFLICT(member_id) DO UPDATE SET ezidebit_ref = excluded.ezidebit_ref, ezidebit_status = excluded.ezidebit_status, ezidebit_checked_at = excluded.ezidebit_checked_at, updated_at = datetime('now')`, id, cref, c.status);
    await run(env, "INSERT INTO billing_events(member_id, kind, detail, ezidebit) VALUES (?, 'method', ?, 'sent')", id, "Bank or card details added on Ezidebit's form (Ezidebit customer " + cref + ")");
    return { ok: true };
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
                                     (SELECT count(*) FROM billing_items r WHERE r.retry_of = coalesce(i.retry_of, i.id) AND r.status IN ('planned','sending','sent')) retry_pending
                                   FROM billing_items i JOIN members m ON m.id = i.member_id WHERE i.status IN ('failed','unknown','reversed') AND i.debit_date >= ? ORDER BY i.debit_date DESC LIMIT 100`, addDays(today, -60));
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

  /* ---------------- finding a member in Ezidebit ---------------- */
  const nowIso = () => new Date().toISOString().slice(0, 19).replace("T", " ");
  const norm = x => String(x || "").toLowerCase().replace(/[^a-z]/g, "");
  const sameName = (c, m) => !!norm(c.last) && norm(c.last) === norm(m.last_name);

  // Tries what the Core has stored, in order, and reports each try: the Ezidebit customer ID staff typed,
  // the one already saved, the Core's own reference (M2-<id>), and the GymMaster member number GymMaster may have used.
  async function findInEzidebit(env, id, typed) {
    const acct = await one(env, "SELECT ezidebit_ref FROM billing_accounts WHERE member_id = ?", id);
    const mem = await one(env, "SELECT gm_id FROM members WHERE id = ?", id);
    const tries = [];
    const t = String(typed || "").trim();
    if (t) tries.push([/^\d+$/.test(t) ? { cid: t } : { ref: t }, (/^\d+$/.test(t) ? "Ezidebit customer ID " : "reference ") + t + " (typed)"]);
    if (acct && acct.ezidebit_ref) tries.push([{ cid: acct.ezidebit_ref }, "saved Ezidebit customer ID " + acct.ezidebit_ref]);
    tries.push([{ ref: E.ref(id) }, "reference " + E.ref(id)]);
    if (mem && mem.gm_id && String(mem.gm_id) !== String(id)) tries.push([{ ref: String(mem.gm_id) }, "GymMaster member number " + mem.gm_id]);
    tries.push([{ ref: String(id) }, "member number " + id]);
    const tried = [];
    for (const [cust, label] of tries) {
      try {
        const c = await E.customer(env, cust);
        if (c.cid || c.status) { tried.push(label + ": found " + (c.name || "a customer") + " (" + (c.status_text || c.status) + ")"); return { c: { ...c, cid: c.cid || cust.cid || "" }, by: label, tried }; }
        tried.push(label + ": not found");
      } catch (e) {
        if (e.kind === "network" || e.code === 102) { tried.push(label + ": " + e.message); return { c: null, tried }; }
        tried.push(label + ": not found");
      }
    }
    return { c: null, tried };
  }

  // Debits another system (GymMaster) left waiting in Ezidebit for this member. Removes them so the member isn't
  // charged twice. The Core's own (M2-...) are kept. Returns what was removed and what couldn't be.
  async function clearForeign(env, acct, id) {
    const cust = custOf(acct, id), today = todayNz();
    const ps = await E.getPayments(env, { from: today, to: addDays(today, 400), field: "PAYMENT", cust });
    const ours = ps.filter(p => p.status === "waiting" && OUR_REF.test(p.reference));
    const theirs = ps.filter(p => p.status === "waiting" && !OUR_REF.test(p.reference));
    let removed = 0;
    const left = [];
    if (theirs.length) {
      // A repeating schedule GymMaster set up would keep adding debits: clear it (the Core's single payments are kept),
      // then remove any single payments GymMaster added one by one.
      try { await E.clearSchedule(env, cust); } catch (_) { /* no schedule, or nothing to clear */ }
      const after = await E.getPayments(env, { from: today, to: addDays(today, 400), field: "PAYMENT", cust });
      for (const p of after.filter(x => x.status === "waiting" && !OUR_REF.test(x.reference))) {
        const c = Math.round((p.scheduled != null ? p.scheduled : p.amount) * 100);
        // Deleting by date and amount takes the first match, so never when one of ours has the same date and amount.
        if (p.reference) { try { await E.deletePayment(env, cust, { reference: p.reference }); removed++; continue; } catch (_) {} }
        if (ours.some(o => o.debit_date === p.debit_date && Math.round((o.scheduled != null ? o.scheduled : o.amount) * 100) === c)) { left.push(p.debit_date + " " + money(c / 100)); continue; }
        try { await E.deletePayment(env, cust, { date: p.debit_date, cents: c }); removed++; } catch (e) { left.push(p.debit_date + " " + money(c / 100)); }
      }
      if (removed) await run(env, "INSERT INTO billing_events(member_id, kind, detail, ezidebit) VALUES (?, 'switch', ?, 'sent')", id, "Removed " + removed + " debits GymMaster had left waiting in Ezidebit");
    }
    if (!left.length) await run(env, "UPDATE billing_accounts SET gm_clear_at = datetime('now') WHERE member_id = ?", id);
    return { removed, left };
  }

  /* ---------------- changes ---------------- */

  async function act(env, who, can, id, b) {
    if (!can.collections) return { ok: false, error: "Only Bekka and the owners can change billing." };
    const M = mode(env), today = todayNz(), a = String(b.action || "");
    const acct = await one(env, "SELECT billed_by_system, ezidebit_ref, ezidebit_status FROM billing_accounts WHERE member_id = ?", id);
    const core = acct && acct.billed_by_system === "core", live = core && M.can_send;
    const date = v => /^\d{4}-\d{2}-\d{2}$/.test(v || "") ? v : null;
    const amt = v => { const n = r2(parseFloat(String(v || "").replace(/[^0-9.]/g, ""))); return n > 0 && n < 5000 ? n : null; };
    const ensure = () => run(env, "INSERT OR IGNORE INTO billing_profiles(member_id) VALUES (?)", id);
    const log = (kind, detail, ezi) => run(env, "INSERT INTO billing_events(member_id, kind, detail, staff_id, ezidebit) VALUES (?, ?, ?, ?, ?)", id, kind, detail, who.id, ezi || (core ? (live ? "sent" : "waiting") : "preview"));
    // Pull back debits for dates we no longer want to take: every kind (debits, retries, fees, one-offs, payment plans).
    // Only debits Ezidebit has (sent, or sending with no answer yet) are deleted there, by our reference with amount 0.
    // A combined debit is pulled whole and anything in it that should still go is planned again.
    // Ezidebit can only delete a debit still waiting (W). If it has started processing, staff are told.
    async function unsend(from, to) {
      const rows = await all(env, "SELECT id, debit_date, amount, status, ezi_ref FROM billing_items WHERE member_id = ? AND status IN ('planned','sending','sent') AND coalesce(send_date, debit_date) >= ? AND (? IS NULL OR coalesce(send_date, debit_date) <= ?)", id, from, to, to);
      const lost = [];
      let pulled = 0;
      for (const ref of [...new Set(rows.filter(x => x.status !== "planned" && x.ezi_ref).map(x => x.ezi_ref))]) {
        if (M.can_send) {
          try { await E.deletePayment(env, custOf(acct, id), { reference: ref }); }
          catch (e) {
            let gone = false;
            if (E.notFound(e)) {
              // Not deletable: check whether Ezidebit has it at all, or has already started taking it.
              try { const ps = await E.getPayments(env, { from: addDays(today, -40), to: addDays(today, 40), field: "PAYMENT", reference: ref }); gone = !ps.some(p => p.status !== "waiting"); }
              catch (_) { gone = false; }
            }
            if (!gone) { lost.push(ref); continue; }
          }
        }
        // Pulled: items in it that are outside the range go back to planned, to be sent again on their own.
        await run(env, "UPDATE billing_items SET status = CASE WHEN coalesce(send_date, debit_date) >= ? AND (? IS NULL OR coalesce(send_date, debit_date) <= ?) THEN 'cancelled' ELSE 'planned' END WHERE ezi_ref = ? AND status IN ('sending','sent')", from, to, to, ref);
        pulled++;
      }
      for (const it of rows.filter(x => x.status === "planned")) { await run(env, "UPDATE billing_items SET status = 'cancelled' WHERE id = ? AND status = 'planned'", it.id); pulled++; }
      if (lost.length) return { pulled, error: "Ezidebit has already started taking " + lost.length + (lost.length === 1 ? " debit" : " debits") + " (" + lost.join(", ") + "), so they can't be pulled back. Refund it once it clears if needed." };
      return { pulled };
    }
    if (a === "hold") {
      const from = date(b.from) || today, to = date(b.to);
      if (to && to < from) return { ok: false, error: "The hold ends before it starts." };
      await ensure();
      await run(env, "UPDATE billing_profiles SET state = 'hold', hold_from = ?, hold_to = ?, hold_reason = ?, updated_at = datetime('now') WHERE member_id = ?", from, to, String(b.reason || "").slice(0, 200) || null, id);
      const u = await unsend(from, to);
      await log("hold", "On hold from " + from + (to ? " to " + to : " until further notice") + (b.reason ? " (" + b.reason + ")" : "") + (u.error ? ". " + u.error : ""), u.error ? "error: " + u.error : null);
      return { ok: true, pulled: u.pulled, warning: u.error };
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
      const u = await unsend(today, null);
      let ezi = core ? (live ? "sent" : "waiting") : "preview";
      // Hold, not cancel, in Ezidebit: a cancelled Ezidebit customer can never be made active again.
      if (live) { try { await E.changeStatus(env, custOf(acct, id), "H"); await run(env, "UPDATE billing_accounts SET ezidebit_status = 'H', ezidebit_checked_at = datetime('now') WHERE member_id = ?", id); } catch (e) { ezi = "error: " + e.message; } }
      if (u.error) ezi = "error: " + u.error;
      await log("cancel", "Billing stopped: " + b.reason + (u.error ? ". " + u.error : ""), ezi);
      return { ok: true, pulled: u.pulled, warning: u.error || (ezi.startsWith("error") ? ezi.slice(7) : undefined) };
    }
    if (a === "restart") {
      let ezi;
      if (live) {
        if (/^C/i.test(acct.ezidebit_status || "")) return { ok: false, error: "Ezidebit has cancelled this member's direct debit, and a cancelled one can't be restarted. Send them Ezidebit's form to sign up again (Enter or update bank details)." };
        try { await E.changeStatus(env, custOf(acct, id), "A"); ezi = "sent"; }
        catch (e) { return { ok: false, error: "Ezidebit didn't restart them: " + e.message }; }
        // Reactivating in Ezidebit switches off anything it was still holding, so those debits are sent again.
        await run(env, "UPDATE billing_accounts SET ezidebit_status = 'A', ezidebit_checked_at = datetime('now') WHERE member_id = ?", id);
        await run(env, "UPDATE billing_items SET status = 'planned' WHERE member_id = ? AND status = 'sent' AND coalesce(send_date, debit_date) >= ?", id, today);
      }
      await ensure();
      await run(env, "UPDATE billing_profiles SET state = 'active', cancel_reason = NULL, updated_at = datetime('now') WHERE member_id = ?", id);
      await log("resume", "Billing restarted", ezi);
      return { ok: true };
    }
    if (a === "retry" || a === "fee" || a === "waive") {
      const it = await one(env, "SELECT * FROM billing_items WHERE id = ? AND member_id = ?", +b.item, id);
      if (!it || !["failed", "reversed"].includes(it.status)) return { ok: false, error: "That debit isn't a failed one." };
      if (a === "retry") {
        if (core && stopped(acct.ezidebit_status)) return { ok: false, error: STOPPED_TEXT };
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
        // Find them in Ezidebit before moving, so the Core debits the right customer and nothing GymMaster left is taken too.
        let found = null, notes = [];
        if (M.key) {
          const look = await findInEzidebit(env, id, b.ezidebit_id);
          notes = look.tried;
          if (!look.c) return { ok: false, error: "Can't move yet: couldn't find them in Ezidebit. Tried " + look.tried.join("; ") + ". Look them up in Ezidebit Online and type their Ezidebit customer ID.", tried: look.tried, ask_id: true };
          found = look.c;
          if (!E.processing(found.status)) return { ok: false, error: "Can't move yet: Ezidebit has " + (found.name || "them") + " on " + (found.status_text || found.status) + ", so it won't debit them. Get their bank or card details updated first.", tried: notes };
          const dupe = await one(env, "SELECT member_id FROM billing_accounts WHERE ezidebit_ref = ? AND member_id <> ?", found.cid, id);
          if (dupe) return { ok: false, error: "Can't move: Ezidebit customer " + found.cid + " is already linked to member " + dupe.member_id + "." };
          if (!sameName(found, m) && !b.name_ok) return { ok: false, error: "Ezidebit customer " + found.cid + " is called " + (found.name || "nothing") + ", not " + [m.first_name, m.last_name].join(" ") + ". If that's right (a parent or partner pays), press Move again to confirm.", confirm_name: true, tried: notes };
        }
        let n = s.next; while (n < addDays(today, 1)) n = STEP[s.freq](n);
        await run(env, `INSERT INTO billing_accounts(member_id, billed_by_system, next_debit_date, next_debit_amount, ezidebit_ref, ezidebit_status, ezidebit_checked_at, switched_at, gm_clear_at) VALUES (?, 'core', ?, ?, ?, ?, ?, ?, NULL)
                        ON CONFLICT(member_id) DO UPDATE SET billed_by_system = 'core', next_debit_date = excluded.next_debit_date, next_debit_amount = excluded.next_debit_amount,
                          ezidebit_ref = coalesce(excluded.ezidebit_ref, billing_accounts.ezidebit_ref), ezidebit_status = coalesce(excluded.ezidebit_status, billing_accounts.ezidebit_status),
                          ezidebit_checked_at = coalesce(excluded.ezidebit_checked_at, billing_accounts.ezidebit_checked_at), switched_at = excluded.switched_at, gm_clear_at = NULL, updated_at = datetime('now')`,
          id, n, amountOn(m, s, n), found ? found.cid : null, found ? found.status : null, found ? nowIso() : null, today);
        await run(env, "DELETE FROM billing_items WHERE member_id = ? AND status = 'preview' AND debit_date >= ?", id, today);
        let left = "";
        if (found && M.can_send) {
          const g = await clearForeign(env, { ezidebit_ref: found.cid }, id);
          left = g.left.length ? " Ezidebit still has " + g.left.length + " debits from GymMaster waiting (" + g.left.join(", ") + "). The Core won't send theirs until those are gone." : g.removed ? " Removed " + g.removed + " debits GymMaster had left waiting in Ezidebit." : "";
        }
        await log("switch", "Billing moved to the M2 Core" + (found ? " (Ezidebit customer " + found.cid + ", " + (found.name || "no name") + ")" : "") + ". Next debit " + money(amountOn(m, s, n)) + " on " + n + ". Stop their billing in GymMaster now." + left, M.can_send ? "sent" : "waiting");
        return { ok: true, next: n, ezidebit: found, warning: left.trim() || undefined };
      }
      const u = await unsend(today, null);
      await run(env, "UPDATE billing_accounts SET billed_by_system = 'gymmaster', updated_at = datetime('now') WHERE member_id = ?", id);
      await log("switch", "Billing moved back to GymMaster. Turn their billing back on there." + (u.error ? " " + u.error : ""), u.error ? "error: " + u.error : "not_needed");
      return { ok: true, warning: u.error };
    }
    if (a === "method") {
      if (!M.key) return { ok: false, error: "Ezidebit isn't connected yet." };
      const look = await findInEzidebit(env, id, b.ezidebit_id);
      if (!look.c) return { ok: false, error: "Not found in Ezidebit. Tried " + look.tried.join("; ") + "." };
      const c = look.c, label = { DR: "Bank account", CR: "Card" }[c.method] || c.method || "None";
      await ensure();
      await run(env, "UPDATE billing_profiles SET method = ?, method_label = ?, updated_at = datetime('now') WHERE member_id = ?", c.method === "CR" ? "card" : c.method === "DR" ? "bank" : "none", label, id);
      await run(env, `INSERT INTO billing_accounts(member_id, ezidebit_ref, ezidebit_status, ezidebit_checked_at) VALUES (?, ?, ?, datetime('now'))
                      ON CONFLICT(member_id) DO UPDATE SET ezidebit_ref = excluded.ezidebit_ref, ezidebit_status = excluded.ezidebit_status, ezidebit_checked_at = excluded.ezidebit_checked_at, updated_at = datetime('now')`, id, c.cid || null, c.status);
      const was = acct && acct.ezidebit_status;
      if (stopped(was) && E.processing(c.status)) await log("method", "Ezidebit is debiting them again (" + (c.status_text || c.status) + ")", "sent");
      return { ok: true, method: label, status: c.status_text || c.status, processing: E.processing(c.status), cid: c.cid, found_by: look.by };
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

  return { nightly, overview, day, ready, member, act, saveRules, test, readGm, schedule, mode, signedUp };
}
