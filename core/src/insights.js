// M2 Core: Insights. Every chart answers one question and ends in one thing to do.
// Built from M2 Core's own copy of GymMaster (members, visits, payments, failed payments).
// Money charts (billing health, billing cost, point of sale) are Taylor and Tim only.
// The report library underneath can email a link to a report on a schedule: the email holds a link
// to M2 Core (which needs a staff sign-in), never the member data itself.

export function makeInsights(L) {
  const { nzDateTime, passportPay, B } = L;
  const all = (env, sql, ...a) => env.DB.prepare(sql).bind(...a).all().then(r => r.results || []);
  const one = (env, sql, ...a) => env.DB.prepare(sql).bind(...a).first();
  const todayNz = () => nzDateTime(new Date()).slice(0, 10);
  const addDays = (iso, n) => new Date(Date.parse(iso + "T12:00:00Z") + n * 864e5).toISOString().slice(0, 10);
  const setting = async (env, k, d) => { const r = await one(env, "SELECT value FROM settings WHERE key = ?", k); return r ? r.value : d; };
  const REAL = `m.status = 'active' AND EXISTS (SELECT 1 FROM memberships rm JOIN plans rp ON rp.id = rm.plan_id WHERE rm.member_id = m.id AND rm.status IN ('current', 'frozen') AND rp.family NOT IN ('staff', 'trial', 'pass'))`;
  const PAYING = `m.status = 'active' AND EXISTS (SELECT 1 FROM memberships x JOIN plans y ON y.id = x.plan_id WHERE x.member_id = m.id AND x.status = 'current'
                    AND x.billed_by = 'ezidebit' AND y.family NOT IN ('staff', 'trial', 'pass', 'passport'))`;
  const bucket = (rows, key, edges) => edges.map(([label, lo, hi]) => ({ label, n: rows.filter(r => r[key] >= lo && r[key] <= hi).length }));

  async function view(env, who, can) {
    if (can.members !== true) return { error: "No access" };
    const t = todayNz();
    // Last full calendar month.
    const d = new Date(Date.UTC(+t.slice(0, 4), +t.slice(5, 7) - 2, 1)), lm = d.toISOString().slice(0, 7);
    const lmFrom = lm + "-01", lmTo = new Date(Date.UTC(+lm.slice(0, 4), +lm.slice(5, 7), 1)).toISOString().slice(0, 10);
    const monthName = d.toLocaleDateString("en-NZ", { month: "long", timeZone: "UTC" });
    const VB = [["0", 0, 0], ["1 to 3", 1, 3], ["4 to 7", 4, 7], ["8 to 12", 8, 12], ["13+", 13, 1e9]];
    const out = { month: lm, month_name: monthName, owner: !!can.business };

    // 1. Paying members by visits last month.
    const pay = await all(env, `SELECT m.id, (SELECT count(*) FROM visits v WHERE v.member_id = m.id AND v.at >= ? AND v.at < ?) n FROM members m
                                WHERE ${PAYING} AND coalesce(m.joined_on, '2000-01-01') < ?`, lmFrom, lmTo, lmFrom);
    out.paying = { total: pay.length, buckets: bucket(pay, "n", VB) };

    // 2. Passport members by visits last month, and what one visit from each non-visitor would pay.
    const fp = await all(env, `SELECT m.id, (SELECT count(*) FROM visits v WHERE v.member_id = m.id AND v.at >= ? AND v.at < ?) n FROM members m
                               JOIN member_flags f ON f.member_id = m.id AND f.flag = 'passport' WHERE m.status = 'active' AND coalesce(m.joined_on, '2000-01-01') < ?`, lmFrom, lmTo, lmFrom);
    const tiers = await setting(env, "fp_tiers", "");
    const fpVisits = fp.reduce((a, r) => a + r.n, 0), zero = fp.filter(r => !r.n).length;
    out.passport = { total: fp.length, zero, visits: fpVisits, buckets: bucket(fp, "n", VB),
                     extra: Math.round(passportPay(fpVisits + zero, tiers).total - passportPay(fpVisits, tiers).total) };

    // 3. When the club is busy: entries by weekday and hour, last 8 weeks.
    const heat = await all(env, `SELECT CAST(strftime('%w', at) AS INTEGER) dow, CAST(substr(at, 12, 2) AS INTEGER) hr, count(*) n FROM visits WHERE at >= ? GROUP BY 1, 2`, addDays(t, -56));
    out.heat = heat;

    // 6. Tenure of current members.
    const ten = await all(env, `SELECT m.id, CAST((julianday(?) - julianday(m.joined_on)) / 30.44 AS INTEGER) mo FROM members m WHERE ${REAL} AND m.joined_on IS NOT NULL`, t);
    out.tenure = bucket(ten, "mo", [["Under 1 month", -1e9, 0], ["1 to 2 months", 1, 2], ["3 to 5 months", 3, 5], ["6 to 11 months", 6, 11], ["1 to 2 years", 12, 23], ["2 years +", 24, 1e9]]);
    // Who left lately, by how long they'd been members (cancellations in the last 6 months).
    const left = await all(env, `SELECT CAST((julianday(c.cancel_date) - julianday(m.joined_on)) / 30.44 AS INTEGER) mo FROM gm_cancels c JOIN members m ON m.id = c.member_id
                                 WHERE c.cancel_date >= ? AND m.joined_on IS NOT NULL GROUP BY c.member_id`, addDays(t, -183));
    out.left = bucket(left, "mo", [["Under 1 month", -1e9, 0], ["1 to 2 months", 1, 2], ["3 to 5 months", 3, 5], ["6 to 11 months", 6, 11], ["1 to 2 years", 12, 23], ["2 years +", 24, 1e9]]);

    // 7. Who the members are.
    const ppl = await all(env, `SELECT m.dob, lower(coalesce(m.gender, '')) g FROM members m WHERE ${REAL}`);
    const age = r => r.dob && /^\d{4}-/.test(r.dob) ? Math.floor((Date.parse(t) - Date.parse(r.dob)) / (365.25 * 864e5)) : -1;
    const ages = ppl.map(r => ({ a: age(r) }));
    out.ages = { known: ages.filter(r => r.a > 0).length, buckets: bucket(ages, "a", [["Under 18", 1, 17], ["18 to 24", 18, 24], ["25 to 34", 25, 34], ["35 to 44", 35, 44], ["45 to 54", 45, 54], ["55 +", 55, 120]]) };
    out.gender = [["Women", /^(f|female|woman)$/], ["Men", /^(m|male|man)$/]].map(([label, re]) => ({ label, n: ppl.filter(r => re.test(r.g)).length }));
    out.gender.push({ label: "Other or not recorded", n: ppl.length - out.gender.reduce((a, x) => a + x.n, 0) });

    // 8. Where members come from.
    out.sources = (await all(env, `SELECT coalesce(nullif(lower(trim(m.lead_source)), ''), 'not recorded') label, count(*) n FROM members m WHERE ${REAL} GROUP BY 1 ORDER BY 2 DESC LIMIT 10`))
      .map(r => ({ ...r, label: r.label.charAt(0).toUpperCase() + r.label.slice(1) }));

    // 9. Current members by the month they joined (last 12 months).
    out.cohorts = await all(env, `SELECT substr(m.joined_on, 1, 7) label, count(*) n FROM members m WHERE ${REAL} AND m.joined_on >= ? GROUP BY 1 ORDER BY 1`, addDays(t.slice(0, 7) + "-01", -335).slice(0, 7) + "-01");

    // 10. Denied entries, by reason, last 30 days.
    out.denied = await all(env, `SELECT coalesce(nullif(reason, ''), 'No reason given') label, count(*) n FROM visit_denied WHERE at >= ? GROUP BY 1 ORDER BY 2 DESC LIMIT 8`, addDays(t, -30)).catch(() => []);

    if (can.business) {
      // 4. Billing health: collected vs failed, by day, last 30 days.
      const from = addDays(t, -30);
      const coll = await all(env, "SELECT occurred_at d, round(sum(amount), 2) v, count(*) n FROM payments WHERE source = 'gymmaster' AND kind = 'debit' AND occurred_at >= ? GROUP BY 1", from);
      const fail = await all(env, "SELECT billing_date d, round(sum(amount), 2) v, count(*) n FROM gm_failed WHERE billing_date >= ? GROUP BY 1", from);
      const days = []; for (let i = 0; i < 30; i++) { const x = addDays(from, i); const c = coll.find(r => r.d === x) || {}, f = fail.find(r => r.d === x) || {}; days.push({ d: x, collected: c.v || 0, n: c.n || 0, failed: f.v || 0, nf: f.n || 0 }); }
      const nC = days.reduce((a, x) => a + x.n, 0), nF = days.reduce((a, x) => a + x.nf, 0);
      out.billing = { days, collected: Math.round(days.reduce((a, x) => a + x.collected, 0)), failed: Math.round(days.reduce((a, x) => a + x.failed, 0)), n: nC, nf: nF, rate: nC + nF ? Math.round(nF / (nC + nF) * 1000) / 10 : 0 };
      // 5. What billing costs.
      try { const o = await B.overview(env, who, can); out.cost = o.cost || null; } catch { out.cost = null; }
      // 11. Point of sale, by product type, last 30 days.
      const pos = await all(env, `SELECT external_ref r, round(sum(amount), 2) v, count(*) n FROM payments WHERE source = 'gymmaster' AND kind <> 'debit' AND occurred_at >= ? GROUP BY 1`, from);
      const g = {};
      for (const r of pos) { const k = (String(r.r).split("|")[2] || "").replace(/^\s*(Product Type|Membership Category|Product):\s*/i, "").trim() || "Other"; g[k] = g[k] || { label: k, v: 0, n: 0 }; g[k].v += r.v; g[k].n += r.n; }
      out.pos = Object.values(g).map(x => ({ ...x, v: Math.round(x.v) })).sort((a, b) => b.v - a.v).slice(0, 10);
      const tri = await one(env, `SELECT count(*) n FROM members m WHERE m.joined_on >= ? AND EXISTS (SELECT 1 FROM memberships x JOIN plans y ON y.id = x.plan_id WHERE x.member_id = m.id AND y.family IN ('trial','pass'))`, from);
      const joi = await one(env, `SELECT count(*) n FROM members m WHERE m.joined_on >= ? AND ${REAL}`, from);
      out.trials_vs_joins = { trials: tri.n, joins: joi.n };
    }

    out.kpis = { members: (await one(env, `SELECT count(*) n FROM members m WHERE ${REAL}`)).n, paying: pay.length, passport: fp.length,
                 source_pct: out.sources.length ? Math.round(100 - (out.sources.find(s => s.label === "Not recorded")?.n || 0) / Math.max(1, out.sources.reduce((a, s) => a + s.n, 0)) * 100) : 0 };
    out.schedules = JSON.parse(await setting(env, "report_schedules", "{}"));
    out.email_on = !!env.RESEND_API_KEY;
    return out;
  }

  async function saveSchedule(env, who, can, b) {
    if (!can.business) return { error: "Owners only" };
    const s = JSON.parse(await setting(env, "report_schedules", "{}"));
    if (!/^[a-z_]+$/.test(b.kind || "")) return { error: "Unknown report" };
    if (["weekly", "monthly"].includes(b.every)) s[b.kind] = { every: b.every, to: who.email || null, title: String(b.title || b.kind).slice(0, 60) }; else delete s[b.kind];
    await env.DB.prepare("INSERT INTO settings(key, value) VALUES ('report_schedules', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value").bind(JSON.stringify(s)).run();
    return { ok: true, schedules: s };
  }

  // 9am NZ: weekly ones on Mondays, monthly ones on the 1st. The email is a link, never the data.
  async function sendDue(env, base) {
    if (!env.RESEND_API_KEY) return { sent: 0, why: "email not connected" };
    const t = todayNz(), mon = new Date(t + "T12:00:00Z").getUTCDay() === 1, first = t.slice(8) === "01";
    const s = JSON.parse(await setting(env, "report_schedules", "{}"));
    let sent = 0;
    for (const [kind, x] of Object.entries(s)) {
      if (!x.to || !((x.every === "weekly" && mon) || (x.every === "monthly" && first))) continue;
      const url = (base || "https://m2-core.taylor-3e5.workers.dev") + "/#reports";
      const html = `<div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;padding:24px;background:#0A0A0A;color:#fff;border-radius:16px">
        <div style="color:#DFFF00;font-size:12px;letter-spacing:2px;text-transform:uppercase">M2 Core</div>
        <h1 style="font-size:24px;margin:8px 0 12px">${x.title}</h1>
        <p style="color:#BDBDB5;margin:0 0 18px">Your ${x.every} report is ready. It opens in M2 Core, so you'll sign in as usual.</p>
        <a href="${url}" style="display:inline-block;background:#DFFF00;color:#0A0A0A;padding:12px 20px;border-radius:999px;text-decoration:none;font-weight:bold">Open the report</a></div>`;
      const r = await fetch("https://api.resend.com/emails", { method: "POST", headers: { Authorization: "Bearer " + env.RESEND_API_KEY, "Content-Type": "application/json" },
        body: JSON.stringify({ from: env.EMAIL_FROM || "M2 Training Club <reception@m2club.co.nz>", to: [x.to], subject: "M2 Core: " + x.title, html }) });
      if (r.ok) sent++;
    }
    return { sent };
  }

  // "Why M2 Core": the living business case. Owners only. Real numbers come from M2 Core; the rest are dials.
  async function why(env, who, can) {
    if (!can.business) return { error: "Only Taylor and Tim see this page." };
    const t = todayNz();
    const members = (await one(env, `SELECT count(*) n FROM members m WHERE ${REAL}`)).n;
    const paying = await one(env, `SELECT count(*) n, round(avg((SELECT sum(ms.weekly_value) FROM memberships ms WHERE ms.member_id = m.id AND ms.status = 'current')), 2) wk FROM members m WHERE ${PAYING}`);
    const passport = (await one(env, "SELECT count(*) n FROM member_flags f JOIN members m ON m.id = f.member_id AND m.status = 'active' WHERE f.flag = 'passport'")).n;
    const fin = await all(env, "SELECT month, income FROM finance_months WHERE month < ? ORDER BY month DESC LIMIT 12", t.slice(0, 7));
    let R = {}; try { const o = await B.overview(env, who, can); R = { ...(o.cost || {}), rules: o.rules }; } catch {}
    const tiers = await setting(env, "fp_tiers", "");
    const lastFp = await one(env, "SELECT visits FROM passport_months ORDER BY month DESC LIMIT 1");
    const fpRate = passportPay((lastFp?.visits || 3000) + 1, tiers).rate;
    const plays = JSON.parse(await setting(env, "plays_cache", "{}"));
    return { members, paying: paying.n, avg_week: paying.wk || 0, passport, revenue12: Math.round(fin.reduce((a, r) => a + (r.income || 0), 0)), revenue_months: fin.length,
             revenue_from: fin.length ? fin[fin.length - 1].month : null, revenue_to: fin.length ? fin[0].month : null,
             gm_cost: R.gm_now ?? 793.5, gm_doors: R.gm_doors ?? null, debit_fee: R.debit_fee ?? 0.99, fee_confirmed: !!R.fee_confirmed, debits_month: R.debits_month || null,
             fp_rate: fpRate, on_table: plays.total || null };
  }

  return { view, saveSchedule, sendDue, why };
}
