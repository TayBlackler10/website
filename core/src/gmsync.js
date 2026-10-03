// M2 Core: copies from GymMaster's reports, so the Core knows every membership's dates, holds,
// failed payments and cancellations without CSV exports. Runs every hour (memberships) and
// nightly (the rest). Uses the GymMaster Report API key (GM_REPORT_KEY).

export function makeGmSync(L) {
  const { nzDateTime } = L;
  const todayNz = () => nzDateTime(new Date()).slice(0, 10);
  const addDays = (iso, n) => new Date(new Date(iso + "T12:00:00Z").getTime() + n * 86400_000).toISOString().slice(0, 10);
  const all = (env, sql, ...a) => env.DB.prepare(sql).bind(...a).all().then(r => r.results || []);
  const num = v => { const n = parseFloat(String(v ?? "").replace(/[^0-9.\-]/g, "")); return Number.isFinite(n) ? n : null; };
  const day = v => { const s = String(v || "").trim(); if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
    const m = s.match(/^(\d{1,2})[\/ ](\w+)[\/ ](\d{4})/); if (!m) return null;
    const mon = isNaN(+m[2]) ? ["jan","feb","mar","apr","may","jun","jul","aug","sep","oct","nov","dec"].indexOf(m[2].slice(0, 3).toLowerCase()) + 1 : +m[2];
    return mon ? m[3] + "-" + String(mon).padStart(2, "0") + "-" + m[1].padStart(2, "0") : null; };

  async function report(env, id, from, to) {
    const r = await fetch((env.GM_SITE || "https://m2trainingclub.gymmasteronline.com") + "/api/v2/report/standard_report", {
      method: "POST", headers: { "X-GM-API-KEY": String(env.GM_REPORT_KEY).trim(), "Accept": "application/json", "Content-Type": "application/json" },
      body: JSON.stringify({ start_date: from, end_date: to, report_id: id, company_id: +(env.COMPANY_ID || 4), displaymode: "ALL" }),
    });
    const t = await r.text();
    let d; try { d = JSON.parse(t); } catch { throw new Error("Report " + id + " replied " + r.status); }
    if (!Array.isArray(d.result)) throw new Error("Report " + id + ": " + (d.error || "no rows"));
    return d.result;
  }

  // Same rules as the CSV import, so plans line up.
  function classify(name, cat, pd) {
    const n = String(name || "").toLowerCase().replace(/\s+/g, " "), c = String(cat || "").toLowerCase(), d = String(pd || "").toLowerCase();
    let fam = "other";
    if (n.includes("fitness passport")) fam = "passport";
    else if (n.includes("trip pass") || n.includes("group fitness pass")) fam = "pass";
    else if (n.includes("trial") || n.includes("day pass") || n.includes("hour pass") || /days (for|on us)|days\. \d|free class|bring a friend/.test(n)) fam = "trial";
    else if (c.includes("challenge") || /\b\d?wc\b/.test(n)) fam = "challenge";
    else if (n === "staff" || n === "personal trainer rent" || c.includes("staff")) fam = "staff";
    else if (n.includes("transporter") || n.includes("transpoter")) fam = "transporter";
    else if (n.includes("swimming pool")) fam = "pool";
    else if (n.includes("recovery")) fam = "recovery";
    else if (n.includes("perform") || n.includes("gateway")) fam = "perform";
    else if (n.includes("classes") || n.includes("group fitness")) fam = "classes";
    else if (n.includes("daily") || n.includes("entry")) fam = "daily";
    const pif = /paid in full|pif|lifetime/.test(n) || (d.includes("fixed term") && fam !== "pass" && fam !== "trial") ? 1 : 0;
    let freq = null;
    if (fam === "passport") freq = "yearly"; else if (pif || fam === "pass") freq = "upfront";
    else for (const [f, ks] of [["fortnightly", ["fortnight", "fornight"]], ["monthly", ["month"]], ["quarterly", ["quarter"]], ["weekly", ["week"]]]) if (ks.some(k => n.includes(k) || d.includes(k))) { freq = f; break; }
    return { family: fam, frequency: freq, flexi: n.includes("flexi") ? 1 : 0, paid_in_full: pif,
             includes_classes: ["perform","classes","transporter","passport","pass","trial"].includes(fam) ? 1 : 0,
             includes_recovery: ["perform","recovery","transporter","pass","trial"].includes(fam) ? 1 : 0 };
  }
  const WK = { weekly: 1, fortnightly: 2, monthly: 52 / 12, quarterly: 13 };

  // Every current membership, with start, end and lock-in dates. Replaces what the last copy loaded.
  async function memberships(env) {
    if (!env.GM_REPORT_KEY) return { ok: false, error: "GM_REPORT_KEY is not set" };
    const t = todayNz(), rows = await report(env, 330, t, t);
    if (rows.length < 200) return { ok: false, error: "Only " + rows.length + " memberships came back, so nothing was changed" };
    const plans = new Map((await all(env, "SELECT id, gm_type_name, gm_category FROM plans")).map(p => [p.gm_type_name + "\u0001" + (p.gm_category || ""), p.id]));
    const newPlans = [];
    for (const r of rows) {
      const k = (r["Membership Type Name"] || "") + "\u0001" + (r["Membership Type Category Name"] || "");
      if (!plans.has(k) && !newPlans.some(x => x.k === k)) newPlans.push({ k, r, c: classify(r["Membership Type Name"], r["Membership Type Category Name"], r["Price Description"]) });
    }
    if (newPlans.length) await env.DB.batch(newPlans.map(({ r, c }) => env.DB.prepare(`INSERT OR IGNORE INTO plans(gm_type_name, gm_category, family, frequency, flexi, paid_in_full, includes_classes, includes_recovery)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).bind(r["Membership Type Name"] || "", r["Membership Type Category Name"] || "", c.family, c.frequency, c.flexi, c.paid_in_full, c.includes_classes, c.includes_recovery)));
    const stmts = [
      // Members the Core created itself (number 1,000,000 and up) aren't in GymMaster, so their memberships stay.
      env.DB.prepare("DELETE FROM memberships WHERE status = 'current' AND member_id < 1000000 AND plan_id IN (SELECT id FROM plans WHERE coalesce(gm_category,'') <> 'Sold in M2 Core')"),
    ];
    for (const r of rows) {
      const id = +r["Member ID"]; if (!id) continue;
      const c = classify(r["Membership Type Name"], r["Membership Type Category Name"], r["Price Description"]);
      const price = num(r["Membership Type Price"]), pd = String(r["Price Description"] || "").toLowerCase();
      const by = c.family === "passport" ? "passport" : pd.includes("in person") ? "in_person" : c.family === "trial" || price === 0 ? "none" : "ezidebit";
      const start = day(r["Membership Start Date"]), end = day(r["Membership End Date"]), lock = day(r["Membership Minimum Term End Date"]);
      stmts.push(env.DB.prepare(`INSERT INTO memberships(member_id, plan_id, price, weekly_value, start_date, min_term_end, end_date, status, billed_by, gm_billing_note, discount_code, sold_by)
        SELECT ?, p.id, ?, ?, ?, ?, ?, 'current', ?, ?, ?, ? FROM plans p WHERE p.gm_type_name = ? AND coalesce(p.gm_category,'') = ? AND EXISTS (SELECT 1 FROM members m WHERE m.id = ?)`)
        .bind(id, price, price != null && WK[c.frequency] ? Math.round(price / WK[c.frequency] * 100) / 100 : null, start, lock, end, by, r["Member Billing Comment"] || null,
              r["Discount Code Used"] || null, r["Sales Rep"] || null, r["Membership Type Name"] || "", r["Membership Type Category Name"] || "", id));
      // Keep every membership we've seen with its dates, so "ended 30 days ago" still works after it's gone.
      stmts.push(env.DB.prepare(`INSERT INTO mship_seen(member_id, type_name, category, start_date, end_date, last_seen) VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT(member_id, type_name, start_date) DO UPDATE SET end_date = excluded.end_date, category = excluded.category, last_seen = excluded.last_seen`)
        .bind(id, r["Membership Type Name"] || "", r["Membership Type Category Name"] || "", start || "", end, t));
    }
    for (let i = 0; i < stmts.length; i += 100) await env.DB.batch(stmts.slice(i, i + 100));
    await env.DB.prepare("INSERT INTO sync_log(source, started_at, finished_at, rows_in, ok) VALUES ('gm_memberships', datetime('now'), datetime('now'), ?, 1)").bind(rows.length).run();
    return { ok: true, rows: rows.length, new_plans: newPlans.length };
  }

  // Memberships that ended or end soon (keeps end dates after they drop off), holds, failed payments, cancellations.
  async function events(env) {
    if (!env.GM_REPORT_KEY) return { ok: false, error: "GM_REPORT_KEY is not set" };
    const t = todayNz(), out = {};
    const run = async (name, fn) => { try { out[name] = await fn(); } catch (e) { out[name] = String(e.message || e); } };
    await run("ending", async () => {
      const rows = await report(env, 334, addDays(t, -120), addDays(t, 30));
      const st = rows.filter(r => +r["Member ID"]).map(r => env.DB.prepare(`INSERT INTO mship_seen(member_id, type_name, category, start_date, end_date, last_seen) VALUES (?, ?, NULL, ?, ?, NULL)
        ON CONFLICT(member_id, type_name, start_date) DO UPDATE SET end_date = coalesce(excluded.end_date, mship_seen.end_date)`)
        .bind(+r["Member ID"], r["Membership Type Name"] || "", day(r["Membership Start Date"]) || "", day(r["Membership End Date"]) || day(r["Membership Canceled At"])));
      for (let i = 0; i < st.length; i += 100) await env.DB.batch(st.slice(i, i + 100));
      return rows.length;
    });
    await run("holds", async () => {
      const rows = await report(env, 314, addDays(t, -60), addDays(t, 365));
      const st = [env.DB.prepare("DELETE FROM gm_holds")].concat(rows.filter(r => +r["Member ID"]).map(r =>
        env.DB.prepare("INSERT OR IGNORE INTO gm_holds(member_id, starts, ends, reason) VALUES (?, ?, ?, ?)").bind(+r["Member ID"], day(r["Date Hold Starts"]), day(r["Date Hold Ends"]), r["Reason"] || null)));
      for (let i = 0; i < st.length; i += 100) await env.DB.batch(st.slice(i, i + 100));
      return rows.length;
    });
    await run("failed", async () => {
      const rows = await report(env, 311, addDays(t, -60), t);
      // First copy: date them by when they happened, so old failures don't look new.
      const first = !(await env.DB.prepare("SELECT 1 FROM gm_failed LIMIT 1").first());
      const st = rows.filter(r => +r["Member ID"]).map(r => env.DB.prepare(`INSERT OR IGNORE INTO gm_failed(member_id, billing_date, amount, status, reason, first_seen) VALUES (?, ?, ?, ?, ?, ?)`)
        .bind(+r["Member ID"], day(r["Billing Date"]), num(r["Amount"]), r["Billing Status"] || null, r["Fail Reason"] || null, first ? (day(r["Billing Date"]) || "2000-01-01") : t));
      for (let i = 0; i < st.length; i += 100) await env.DB.batch(st.slice(i, i + 100));
      return rows.length;
    });
    await run("cancels", async () => {
      const rows = await report(env, 131, addDays(t, -60), addDays(t, 120));
      const first = !(await env.DB.prepare("SELECT 1 FROM gm_cancels LIMIT 1").first());
      const st = rows.filter(r => +r["Member ID"]).map(r => env.DB.prepare(`INSERT OR IGNORE INTO gm_cancels(member_id, type_name, cancel_date, reason, first_seen) VALUES (?, ?, ?, ?, ?)`)
        .bind(+r["Member ID"], r["Membership Type Name"] || "", day(r["Membership Cancellation Date"]), r["Cancel Reason"] || null, first ? "2000-01-01" : t));
      for (let i = 0; i < st.length; i += 100) await env.DB.batch(st.slice(i, i + 100));
      return rows.length;
    });
    return out;
  }

  return { memberships, events, classify };
}
