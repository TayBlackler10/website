// M2 Core: Xero, Meta and Google Analytics feeding themselves every night,
// plus a nightly backup of the whole database.

export function makeFeeds(L) {
  const { nzDateTime } = L;
  const todayNz = () => nzDateTime(new Date()).slice(0, 10);
  const one = (env, sql, ...a) => env.DB.prepare(sql).bind(...a).first();
  const setting = async (env, key) => (await one(env, "SELECT value FROM settings WHERE key = ?", key))?.value ?? null;
  const setSetting = (env, key, v) => env.DB.prepare("INSERT INTO settings(key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value").bind(key, v).run();
  const log = (env, source, ok, rows, error) => env.DB.prepare("INSERT INTO sync_log(source, started_at, finished_at, rows_in, rows_changed, ok, error) VALUES (?, datetime('now'), datetime('now'), ?, ?, ?, ?)")
    .bind(source, rows || 0, rows || 0, ok ? 1 : 0, error ? String(error).slice(0, 400) : null).run();

  /* ---------------- Xero ---------------- */
  const XERO_AUTH = "https://login.xero.com/identity/connect/authorize";
  const XERO_TOKEN = "https://identity.xero.com/connect/token";
  const XERO_API = "https://api.xero.com/api.xro/2.0";
  const redirect = origin => origin + "/xero/callback";

  async function xeroConnect(env, url) {
    if (!env.XERO_CLIENT_ID || !env.XERO_CLIENT_SECRET) return new Response("Add XERO_CLIENT_ID and XERO_CLIENT_SECRET in Cloudflare first.", { status: 400 });
    const state = crypto.randomUUID();
    await setSetting(env, "xero_state", state);
    const u = new URL(XERO_AUTH);
    u.search = new URLSearchParams({ response_type: "code", client_id: env.XERO_CLIENT_ID, redirect_uri: redirect(url.origin),
      scope: env.XERO_SCOPES || "offline_access accounting.reports.profitandloss.read accounting.reports.balancesheet.read", state }).toString();
    return Response.redirect(u.toString(), 302);
  }
  async function tokenRequest(env, params) {
    const r = await fetch(XERO_TOKEN, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded",
      Authorization: "Basic " + btoa(env.XERO_CLIENT_ID + ":" + env.XERO_CLIENT_SECRET) }, body: new URLSearchParams(params).toString() });
    const d = await r.json();
    if (!r.ok) throw new Error("Xero sign-in: " + (d.error || r.status));
    return d;
  }
  async function saveTokens(env, tok, tenant) {
    const prev = JSON.parse((await setting(env, "xero_tokens")) || "{}");
    await setSetting(env, "xero_tokens", JSON.stringify({ access: tok.access_token, refresh: tok.refresh_token, exp: Date.now() + (tok.expires_in - 60) * 1000,
      tenantId: tenant?.tenantId || prev.tenantId, tenantName: tenant?.tenantName || prev.tenantName }));
  }
  async function xeroCallback(env, url) {
    if (!url.searchParams.get("state") || url.searchParams.get("state") !== (await setting(env, "xero_state"))) return new Response("That Xero sign-in expired. Start again from Settings.", { status: 400 });
    const tok = await tokenRequest(env, { grant_type: "authorization_code", code: url.searchParams.get("code"), redirect_uri: redirect(url.origin) });
    const conns = await (await fetch("https://api.xero.com/connections", { headers: { Authorization: "Bearer " + tok.access_token } })).json();
    const org = (conns || []).find(c => /M2 Training/i.test(c.tenantName)) || (conns || [])[0];
    if (!org) return new Response("No Xero organisation was connected.", { status: 400 });
    await saveTokens(env, tok, org);
    let res = null;
    try { res = await xeroSync(env, 13); } catch (e) { res = { error: String(e.message || e) }; }
    return Response.redirect(url.origin + "/?xero=" + (res && res.error ? "error" : "connected") + "#settings", 302);
  }
  async function access(env) {
    const t = JSON.parse((await setting(env, "xero_tokens")) || "null");
    if (!t) throw new Error("Xero isn't connected yet");
    if (Date.now() < t.exp) return t;
    const tok = await tokenRequest(env, { grant_type: "refresh_token", refresh_token: t.refresh });
    await saveTokens(env, tok);
    return { ...t, access: tok.access_token };
  }
  async function xget(env, path) {
    const t = await access(env);
    const r = await fetch(XERO_API + path, { headers: { Authorization: "Bearer " + t.access, "xero-tenant-id": t.tenantId, Accept: "application/json" } });
    if (!r.ok) throw new Error("Xero " + path.split("?")[0] + " replied " + r.status);
    return r.json();
  }
  // Walks Xero's report rows, keeping which section each line sits in.
  function readPnl(rep) {
    const lines = { income: [], expenses: [] }, totals = {};
    const walk = (rows, section) => (rows || []).forEach(r => {
      if (r.RowType === "Section") return walk(r.Rows, r.Title || section);
      if (!r.Cells) return;
      const name = r.Cells[0]?.Value || "", val = parseFloat(r.Cells[1]?.Value) || 0;
      if (r.RowType === "SummaryRow" || /^Total |^Gross Profit$|^Net Profit$/i.test(name)) { totals[name.toLowerCase()] = val; return; }
      if (!val) return;
      if (/income|revenue|trading/i.test(section || "")) lines.income.push([name, val]);
      else if (/expense|cost/i.test(section || "")) lines.expenses.push([name, val]);
    });
    walk(rep.Reports[0].Rows, "");
    const t = k => Object.entries(totals).find(([n]) => k.test(n))?.[1] || 0;
    const income = t(/^total (trading )?income$/) + t(/^total other income$/), cos = t(/^total cost of sales$/), expenses = t(/^total (operating )?expenses$/);
    const net = Object.keys(totals).includes("net profit") ? totals["net profit"] : income - cos - expenses;
    lines.income.sort((a, b) => b[1] - a[1]); lines.expenses.sort((a, b) => b[1] - a[1]);
    return { income, cost_of_sales: cos, expenses, net, lines };
  }
  function readBalance(rep) {
    const rows = [];
    const walk = rs => (rs || []).forEach(r => { if (r.Rows) walk(r.Rows); else if (r.Cells) rows.push([r.Cells[0]?.Value || "", parseFloat(r.Cells[1]?.Value) || 0]); });
    walk(rep.Reports[0].Rows);
    const f = re => { const x = rows.find(([n]) => re.test(n)); return x ? x[1] : null; };
    return { cash: f(/^Total Bank$/i), receivables: f(/^Accounts Receivable$/i), payables: f(/^Accounts Payable$/i), gst: f(/^GST$/i) };
  }
  // The last `months` closed months plus this month so far.
  async function xeroSync(env, months = 2) {
    const t = todayNz(), y = +t.slice(0, 4), m = +t.slice(5, 7);
    const stmts = [];
    for (let i = 0; i <= months; i++) {
      const d = new Date(Date.UTC(y, m - 1 - i, 1)), from = d.toISOString().slice(0, 10);
      const to = i === 0 ? t : new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).toISOString().slice(0, 10);
      if (i === 0 && +t.slice(8, 10) < 5) continue;   // a few days into the month the numbers mean little
      const p = readPnl(await xget(env, `/Reports/ProfitAndLoss?fromDate=${from}&toDate=${to}`));
      stmts.push(env.DB.prepare(`INSERT INTO finance_months(month, income, cost_of_sales, expenses, net, lines, source, updated_at) VALUES (?, ?, ?, ?, ?, ?, 'xero', datetime('now'))
        ON CONFLICT(month) DO UPDATE SET income = excluded.income, cost_of_sales = excluded.cost_of_sales, expenses = excluded.expenses, net = excluded.net,
          lines = excluded.lines, source = excluded.source, updated_at = excluded.updated_at`)
        .bind(from.slice(0, 7), p.income, p.cost_of_sales, p.expenses, p.net, JSON.stringify(p.lines)));
    }
    const b = readBalance(await xget(env, `/Reports/BalanceSheet?date=${t}`));
    const pts = [["cash", "Cash in the bank", b.cash], ["receivables", "Owed to M2 (invoices)", b.receivables], ["payables", "Bills M2 owes", b.payables], ["gst", "GST owed", b.gst]];
    for (const [k, label, v] of pts) if (v !== null) stmts.push(env.DB.prepare(`INSERT INTO finance_points(key, label, value, as_of) VALUES (?, ?, ?, ?)
      ON CONFLICT(key) DO UPDATE SET label = excluded.label, value = excluded.value, as_of = excluded.as_of`).bind(k, label, v, t));
    await env.DB.batch(stmts);
    await log(env, "xero", true, stmts.length);
    return { ok: true, rows: stmts.length };
  }

  /* ---------------- Meta and Google Analytics (Windsor) ---------------- */
  async function windsor(env, connector, fields, from, to) {
    const u = new URL("https://connectors.windsor.ai/" + connector);
    u.search = new URLSearchParams({ api_key: env.WINDSOR_API_KEY, date_from: from, date_to: to, fields: fields.join(",") }).toString();
    const r = await fetch(u.toString());
    const d = await r.json().catch(() => ({}));
    if (!r.ok || !Array.isArray(d.data)) throw new Error("Windsor " + connector + ": " + (d.error || d.detail || r.status));
    return d.data;
  }
  async function marketingSync(env, days = 10) {
    if (!env.WINDSOR_API_KEY) throw new Error("WINDSOR_API_KEY is not set");
    const to = todayNz(), from = new Date(Date.now() - days * 86400_000).toISOString().slice(0, 10);
    const meta = await windsor(env, "facebook", ["date", "campaign", "spend", "impressions", "clicks", "actions_lead", "actions_landing_page_view"], from, to);
    const agg = {};
    for (const r of meta) { const k = r.date + "|" + r.campaign; const a = agg[k] = agg[k] || [r.date, r.campaign, 0, 0, 0, 0, 0];
      a[2] += +r.spend || 0; a[3] += +r.impressions || 0; a[4] += +r.clicks || 0; a[5] += +r.actions_lead || 0; a[6] += +r.actions_landing_page_view || 0; }
    const stmts = Object.values(agg).filter(a => a[2] > 0 || a[5] > 0).map(a => env.DB.prepare(`INSERT INTO marketing_days(day, source, campaign, spend, impressions, clicks, leads, landing_views)
      VALUES (?, 'meta', ?, ?, ?, ?, ?, ?) ON CONFLICT(day, source, campaign) DO UPDATE SET spend = excluded.spend, impressions = excluded.impressions,
      clicks = excluded.clicks, leads = excluded.leads, landing_views = excluded.landing_views`).bind(a[0], a[1], Math.round(a[2] * 100) / 100, a[3], a[4], a[5], a[6]));
    const ga = await windsor(env, "googleanalytics4", ["date", "session_default_channel_group", "sessions", "conversions"], from, to);
    const wa = {};
    for (const r of ga) { const k = r.date + "|" + (r.session_default_channel_group || "Unassigned"); const a = wa[k] = wa[k] || [r.date, r.session_default_channel_group || "Unassigned", 0, 0];
      a[2] += +r.sessions || 0; a[3] += +r.conversions || 0; }
    for (const a of Object.values(wa)) stmts.push(env.DB.prepare(`INSERT INTO web_days(day, channel, sessions, conversions) VALUES (?, ?, ?, ?)
      ON CONFLICT(day, channel) DO UPDATE SET sessions = excluded.sessions, conversions = excluded.conversions`).bind(a[0], a[1], Math.round(a[2]), Math.round(a[3])));
    for (let i = 0; i < stmts.length; i += 80) await env.DB.batch(stmts.slice(i, i + 80));
    await log(env, "windsor", true, stmts.length);
    return { ok: true, rows: stmts.length };
  }

  /* ---------------- nightly backup ---------------- */
  // Every table as JSON, gzipped, into the R2 bucket. 35 days are kept.
  async function backup(env) {
    if (!env.BACKUPS) throw new Error("No backup bucket bound");
    const tables = (await env.DB.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_cf_%' AND name <> 'roster_chunks'").all()).results.map(r => r.name);
    const out = { taken_at: new Date().toISOString(), tables: {} };
    for (const t of tables) {
      const rows = [];
      for (let off = 0; ; off += 5000) {
        const r = (await env.DB.prepare(`SELECT * FROM "${t}" LIMIT 5000 OFFSET ${off}`).all()).results;
        rows.push(...r); if (r.length < 5000) break;
      }
      out.tables[t] = rows;
    }
    const gz = new Response(new Blob([JSON.stringify(out)]).stream().pipeThrough(new CompressionStream("gzip")));
    const key = "m2-core-" + todayNz() + ".json.gz";
    await env.BACKUPS.put(key, await gz.arrayBuffer(), { httpMetadata: { contentType: "application/gzip" } });
    const list = await env.BACKUPS.list({ prefix: "m2-core-" });
    const old = list.objects.map(o => o.key).sort().slice(0, -35);
    for (const k of old) await env.BACKUPS.delete(k);
    await log(env, "backup", true, Object.values(out.tables).reduce((a, r) => a + r.length, 0));
    return { ok: true, key, tables: tables.length };
  }
  async function backupList(env) {
    if (!env.BACKUPS) return [];
    return (await env.BACKUPS.list({ prefix: "m2-core-" })).objects.map(o => ({ key: o.key, size: o.size, at: o.uploaded })).sort((a, b) => b.key.localeCompare(a.key));
  }
  async function backupGet(env, key) {
    if (!env.BACKUPS || !/^m2-core-\d{4}-\d{2}-\d{2}\.json\.gz$/.test(key || "")) return new Response("Not found", { status: 404 });
    const o = await env.BACKUPS.get(key);
    if (!o) return new Response("Not found", { status: 404 });
    return new Response(o.body, { headers: { "Content-Type": "application/gzip", "Content-Disposition": `attachment; filename="${key}"` } });
  }

  async function status(env) {
    const x = JSON.parse((await setting(env, "xero_tokens")) || "null");
    const last = async s => (await one(env, "SELECT finished_at, ok, error FROM sync_log WHERE source = ? ORDER BY id DESC LIMIT 1", s)) || null;
    return { xero: { keys: !!(env.XERO_CLIENT_ID && env.XERO_CLIENT_SECRET), connected: !!x, org: x?.tenantName || null, last: await last("xero") },
             windsor: { key: !!env.WINDSOR_API_KEY, last: await last("windsor") },
             backup: { bucket: !!env.BACKUPS, last: await last("backup"), files: (await backupList(env)).slice(0, 5) } };
  }

  return { xeroConnect, xeroCallback, xeroSync, marketingSync, backup, backupList, backupGet, status };
}
