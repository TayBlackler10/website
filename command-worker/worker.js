// M2 Command Centre worker
// Password-protected home for the Command Centre and the PT admin board,
// plus live feeds for GymMaster, Xero, GA4 and PT leads, and a nightly
// month-end snapshot. Separate from m2-gymmaster so a bug here can never
// take down the existing GymMaster / Meta feed.
//
// Bindings
//   KV:      M2CC                 pages, Xero tokens, caches, snapshots
//   Secrets: DASH_PASSWORD        the login password
//            SESSION_SECRET       signs the login cookie
//            PT_ADMIN_KEY         must match ADMIN_KEY in the PT Apps Script
//            GM_PROXY_KEY         sent to m2-gymmaster as X-M2-Key
//            XERO_CLIENT_ID, XERO_CLIENT_SECRET
//            WINDSOR_API_KEY
//   Vars:    GM_WORKER, PT_SCRIPT, XERO_SCOPES (optional)

const COOKIE = "m2cc";
const SESSION_DAYS = 30;
const TZ = "Pacific/Auckland";

export default {
  async fetch(req, env, ctx) {
    const url = new URL(req.url);
    const path = url.pathname;
    try {
      if (path === "/login") return req.method === "POST" ? doLogin(req, env, url) : loginPage(url);
      if (path === "/logout") return new Response(null, { status: 302, headers: { Location: "/login", "Set-Cookie": `${COOKIE}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax` } });
      if (path === "/robots.txt") return new Response("User-agent: *\nDisallow: /\n", { headers: { "Content-Type": "text/plain" } });
      if (path.startsWith("/assets/")) return fetch("https://m2club.co.nz" + path, { cf: { cacheTtl: 86400 } });

      if (!(await isAuthed(req, env))) {
        if (path.startsWith("/api/")) return json({ error: "Not signed in" }, 401);
        return new Response(null, { status: 302, headers: { Location: "/login?next=" + encodeURIComponent(path + url.search) } });
      }

      if (path === "/" || path === "/index.html") return page(env, "page:command");
      if (path === "/pt") return page(env, "page:pt");
      if (path === "/billing") return page(env, "page:billing");
      if (path === "/api/gm" || path === "/api/gm/") return gmProxy(url, env);
      if (path === "/api/pt") return ptProxy(req, env);
      if (path === "/api/xero") return json(await xeroSummary(env, url.searchParams.has("fresh")));
      if (path === "/api/ga4") return json(await ga4Summary(env, url.searchParams.has("fresh")));
      if (path === "/api/snapshots") return json(await listSnapshots(env));
      if (path === "/api/snapshot-now") { const s = await takeSnapshot(env); return json(s); }
      if (path === "/xero/connect") return xeroConnect(env, url);
      if (path === "/xero/callback") return xeroCallback(env, url);
      return new Response("Not found", { status: 404 });
    } catch (e) {
      return json({ error: String(e && e.message || e) }, 500);
    }
  },

  async scheduled(event, env, ctx) {
    ctx.waitUntil(takeSnapshot(env));
  }
};

/* ---------------- helpers ---------------- */
const json = (d, status = 200) => new Response(JSON.stringify(d), { status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });
const enc = new TextEncoder();
async function hmac(secret, msg) {
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(msg));
  return btoa(String.fromCharCode(...new Uint8Array(sig))).replace(/[+/=]/g, c => ({ "+": "-", "/": "_", "=": "" }[c]));
}
function safeEqual(a, b) {
  a = String(a); b = String(b);
  let diff = a.length ^ b.length;
  for (let i = 0; i < Math.max(a.length, b.length); i++) diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  return diff === 0;
}
function getCookie(req, name) {
  const m = (req.headers.get("Cookie") || "").match(new RegExp("(?:^|;\\s*)" + name + "=([^;]+)"));
  return m ? m[1] : null;
}
async function isAuthed(req, env) {
  const c = getCookie(req, COOKIE);
  if (!c) return false;
  const [exp, sig] = c.split(".");
  if (!exp || !sig || Date.now() > Number(exp)) return false;
  return safeEqual(sig, await hmac(env.SESSION_SECRET, "v1." + exp));
}
function nzDate(d = new Date()) {
  const p = Object.fromEntries(new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(d).map(x => [x.type, x.value]));
  return { y: +p.year, m: +p.month, d: +p.day, iso: `${p.year}-${p.month}-${p.day}`, ym: `${p.year}-${p.month}` };
}
const pad = n => String(n).padStart(2, "0");
const lastDay = (y, m) => new Date(Date.UTC(y, m, 0)).getUTCDate();

async function page(env, key) {
  const html = await env.M2CC.get(key);
  if (!html) return new Response("Page not uploaded yet", { status: 503 });
  return new Response(html, { headers: { "Content-Type": "text/html;charset=utf-8", "Cache-Control": "no-store", "X-Robots-Tag": "noindex, nofollow", "X-Frame-Options": "DENY", "Referrer-Policy": "same-origin" } });
}

/* ---------------- login ---------------- */
function loginPage(url, error) {
  const next = url.searchParams.get("next") || "/";
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex">
<meta name="theme-color" content="#0A0A0A"><meta name="apple-mobile-web-app-capable" content="yes"><meta name="apple-mobile-web-app-title" content="M2 Command">
<title>M2 Command Centre</title><link rel="icon" href="/assets/favicon.ico"><link rel="apple-touch-icon" href="/assets/apple-touch-icon.png">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>*{box-sizing:border-box;margin:0}body{font-family:Inter,-apple-system,Helvetica,Arial,sans-serif;background:#EDEDEA;color:#3D3D3A;min-height:100vh;display:flex;flex-direction:column}
header{background:#0A0A0A;padding:14px 24px}header img{height:24px;display:block}
main{flex:1;display:flex;align-items:center;justify-content:center;padding:24px 16px}
.card{background:#fff;border-radius:14px;box-shadow:0 1px 2px rgba(0,0,0,.04),0 4px 14px rgba(0,0,0,.04);padding:28px;width:100%;max-width:360px}
h1{font-size:22px;color:#111;letter-spacing:-.02em;margin-bottom:4px}p{font-size:13.5px;color:#7A7A74;margin-bottom:20px}
input{width:100%;font:inherit;font-size:15px;padding:11px 13px;border:1px solid #D6D6D0;border-radius:10px;margin-bottom:12px}
input:focus{outline:none;border-color:#0A0A0A;box-shadow:0 0 0 3px rgba(10,10,10,.07)}
button{width:100%;font:inherit;font-size:15px;font-weight:600;padding:11px;border:0;border-radius:999px;background:#0A0A0A;color:#DFFF00;cursor:pointer}
.err{color:#B8402F;font-size:13px;margin-bottom:12px}</style></head><body>
<header><img src="/assets/M2_ICON_YELLOW%20(5).png" alt="M2 Training Club"></header>
<main><form class="card" method="post" action="/login"><h1>Command Centre</h1><p>Sign in to continue.</p>
${error ? `<div class="err">${error}</div>` : ""}
<input type="hidden" name="next" value="${next.replace(/"/g, "")}">
<input type="password" name="password" placeholder="Password" autocomplete="current-password" autofocus required>
<button type="submit">Sign in</button></form></main></body></html>`;
  return new Response(html, { status: error ? 401 : 200, headers: { "Content-Type": "text/html;charset=utf-8", "Cache-Control": "no-store" } });
}
async function doLogin(req, env, url) {
  const form = await req.formData();
  const pw = form.get("password") || "";
  let next = String(form.get("next") || "/");
  if (!next.startsWith("/") || next.startsWith("//")) next = "/";
  if (!env.DASH_PASSWORD || !safeEqual(pw, env.DASH_PASSWORD)) {
    await new Promise(r => setTimeout(r, 800));
    const u = new URL(url); u.searchParams.set("next", next);
    return loginPage(u, "That password isn't right.");
  }
  const exp = Date.now() + SESSION_DAYS * 864e5;
  const val = `${exp}.${await hmac(env.SESSION_SECRET, "v1." + exp)}`;
  return new Response(null, { status: 302, headers: { Location: next, "Set-Cookie": `${COOKIE}=${val}; Path=/; Max-Age=${SESSION_DAYS * 86400}; HttpOnly; Secure; SameSite=Lax` } });
}

/* ---------------- GymMaster / Meta (via m2-gymmaster) ---------------- */
async function gmProxy(url, env) {
  const r = await gmFetch(env, `/${url.search}`);
  return new Response(r.body, { status: r.status, headers: { "Content-Type": r.headers.get("Content-Type") || "application/json", "Cache-Control": "no-store" } });
}
// Workers on the same account can't call each other by URL, so this uses a service binding.
function gmFetch(env, pathAndQuery) {
  const req = new Request(env.GM_WORKER + pathAndQuery, { headers: { "X-M2-Key": env.GM_PROXY_KEY || "" } });
  return env.GM ? env.GM.fetch(req) : fetch(req);
}
async function gmKpi(env, ep) {
  try {
    const r = await gmFetch(env, `/?endpoint=${ep}`);
    const d = await r.json();
    return d && !d.error ? d.result : null;
  } catch { return null; }
}

/* ---------------- PT leads (Apps Script, admin key added here) ---------------- */
async function ptProxy(req, env) {
  if (req.method === "POST") {
    let body = {};
    try { body = JSON.parse(await req.text()); } catch {}
    body.key = env.PT_ADMIN_KEY;
    const r = await fetch(env.PT_SCRIPT, { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify(body), redirect: "follow" });
    return new Response(await r.text(), { headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });
  }
  const r = await fetch(`${env.PT_SCRIPT}?action=list&key=${encodeURIComponent(env.PT_ADMIN_KEY)}`, { redirect: "follow" });
  return new Response(await r.text(), { headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });
}
function dedupeLeads(raw) {
  const g = new Map();
  for (const l of raw || []) {
    const k = [l.name, l.phone, l.reasonForJoining, l.trainerPreference, l.trainingStyle, l.preferredTime].map(v => (v || "").toString().trim().toLowerCase()).join("|");
    if (!g.has(k)) g.set(k, []);
    g.get(k).push(l);
  }
  return [...g.values()].map(x => x.sort((a, b) => ((b.trainer ? 1 : 0) - (a.trainer ? 1 : 0)) || (new Date(b.lastUpdated || b.receivedAt) - new Date(a.lastUpdated || a.receivedAt)))[0]);
}

/* ---------------- Xero ---------------- */
const XERO_AUTH = "https://login.xero.com/identity/connect/authorize";
const XERO_TOKEN = "https://identity.xero.com/connect/token";
const XERO_API = "https://api.xero.com/api.xro/2.0";
const redirectUri = url => `${url.origin}/xero/callback`;

async function xeroConnect(env, url) {
  const state = crypto.randomUUID();
  await env.M2CC.put("xero:state:" + state, "1", { expirationTtl: 600 });
  const scopes = env.XERO_SCOPES || "openid profile email offline_access accounting.reports.read accounting.settings.read";
  const u = new URL(XERO_AUTH);
  u.search = new URLSearchParams({ response_type: "code", client_id: env.XERO_CLIENT_ID, redirect_uri: redirectUri(url), scope: scopes, state }).toString();
  return Response.redirect(u.toString(), 302);
}
async function xeroCallback(env, url) {
  const state = url.searchParams.get("state");
  if (!state || !(await env.M2CC.get("xero:state:" + state))) return new Response("Xero sign-in expired, start again from /xero/connect", { status: 400 });
  const tok = await xeroTokenRequest(env, { grant_type: "authorization_code", code: url.searchParams.get("code"), redirect_uri: redirectUri(url) });
  const conns = await (await fetch("https://api.xero.com/connections", { headers: { Authorization: "Bearer " + tok.access_token } })).json();
  const org = (conns || []).find(c => /M2 Training/i.test(c.tenantName)) || (conns || [])[0];
  if (!org) return new Response("No Xero organisation was connected", { status: 400 });
  await saveXeroTokens(env, tok, org.tenantId, org.tenantName);
  await env.M2CC.delete("xero:cache");
  return new Response(`<p style="font-family:Inter,Arial;padding:24px">Xero connected to <b>${org.tenantName}</b>. <a href="/">Back to the Command Centre</a></p>`, { headers: { "Content-Type": "text/html" } });
}
async function xeroTokenRequest(env, params) {
  const r = await fetch(XERO_TOKEN, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Authorization: "Basic " + btoa(`${env.XERO_CLIENT_ID}:${env.XERO_CLIENT_SECRET}`) },
    body: new URLSearchParams(params).toString()
  });
  const d = await r.json();
  if (!r.ok) throw new Error("Xero token error: " + (d.error || r.status));
  return d;
}
async function saveXeroTokens(env, tok, tenantId, tenantName) {
  const prev = JSON.parse((await env.M2CC.get("xero:tokens")) || "{}");
  await env.M2CC.put("xero:tokens", JSON.stringify({
    access: tok.access_token, refresh: tok.refresh_token, exp: Date.now() + (tok.expires_in - 60) * 1000,
    tenantId: tenantId || prev.tenantId, tenantName: tenantName || prev.tenantName
  }));
}
async function xeroAccess(env) {
  const t = JSON.parse((await env.M2CC.get("xero:tokens")) || "null");
  if (!t) throw new Error("Xero not connected yet, open /xero/connect");
  if (Date.now() < t.exp) return t;
  const tok = await xeroTokenRequest(env, { grant_type: "refresh_token", refresh_token: t.refresh });
  await saveXeroTokens(env, tok);
  return { ...t, access: tok.access_token };
}
async function xeroGet(env, path) {
  const t = await xeroAccess(env);
  const r = await fetch(XERO_API + path, { headers: { Authorization: "Bearer " + t.access, "xero-tenant-id": t.tenantId, Accept: "application/json" } });
  if (!r.ok) throw new Error("Xero " + path.split("?")[0] + " " + r.status);
  return r.json();
}
function pnlTotals(rep) {
  const rows = [];
  const walk = rs => (rs || []).forEach(r => { if (r.Rows) walk(r.Rows); else if (r.Cells) rows.push(r.Cells); });
  walk(rep.Reports[0].Rows);
  const find = re => { const c = rows.find(c => re.test(c[0].Value || "")); return c ? parseFloat(c[1].Value) || 0 : 0; };
  const income = find(/^Total (Trading )?Income$/i);
  const cos = find(/^Total Cost of Sales$/i);
  const other = find(/^Total Other Income$/i);
  const expenses = find(/^Total (Operating )?Expenses$/i);
  const net = rows.some(c => /^Net Profit$/i.test(c[0].Value || "")) ? find(/^Net Profit$/i) : income + other - cos - expenses;
  return { income: income + other, costOfSales: cos, expenses, net };
}
async function xeroPnl(env, from, to) {
  return pnlTotals(await xeroGet(env, `/Reports/ProfitAndLoss?fromDate=${from}&toDate=${to}`));
}
async function xeroCash(env, date) {
  const rep = await xeroGet(env, `/Reports/BankSummary?fromDate=${date}&toDate=${date}`);
  let total = null;
  const walk = rs => (rs || []).forEach(r => {
    if (r.Rows) walk(r.Rows);
    else if (r.Cells && /^Total$/i.test(r.Cells[0].Value || "")) total = parseFloat(r.Cells[r.Cells.length - 1].Value) || 0;
  });
  walk(rep.Reports[0].Rows);
  return total;
}
async function xeroSummary(env, fresh) {
  if (!fresh) {
    const c = JSON.parse((await env.M2CC.get("xero:cache")) || "null");
    if (c && Date.now() - c.at < 15 * 60 * 1000) return c;
  }
  try {
    const n = nzDate();
    const from = `${n.y}-${pad(n.m)}-01`;
    const pm = n.m === 1 ? 12 : n.m - 1, py = n.m === 1 ? n.y - 1 : n.y;
    const pmDay = Math.min(n.d, lastDay(py, pm));
    const [month, lastMonthToDate, lastMonth, cash] = await Promise.all([
      xeroPnl(env, from, n.iso),
      xeroPnl(env, `${py}-${pad(pm)}-01`, `${py}-${pad(pm)}-${pad(pmDay)}`),
      xeroPnl(env, `${py}-${pad(pm)}-01`, `${py}-${pad(pm)}-${pad(lastDay(py, pm))}`),
      xeroCash(env, n.iso)
    ]);
    lastMonth.label = new Date(Date.UTC(py, pm - 1, 1)).toLocaleDateString("en-NZ", { month: "short", timeZone: "UTC" });
    const out = { at: Date.now(), month, lastMonthToDate, lastMonth, cash };
    await env.M2CC.put("xero:cache", JSON.stringify(out));
    return out;
  } catch (e) {
    return { error: String(e.message || e) };
  }
}

/* ---------------- GA4 via Windsor ---------------- */
async function windsor(env, fields, preset) {
  const u = new URL("https://connectors.windsor.ai/googleanalytics4");
  u.search = new URLSearchParams({ api_key: env.WINDSOR_API_KEY, date_preset: preset, fields: fields.join(",") }).toString();
  const r = await fetch(u.toString());
  if (!r.ok) throw new Error("Windsor " + r.status);
  const d = await r.json();
  return d.data || d.result || [];
}
async function ga4Summary(env, fresh) {
  if (!fresh) {
    const c = JSON.parse((await env.M2CC.get("ga4:cache")) || "null");
    if (c && Date.now() - c.at < 60 * 60 * 1000) return c;
  }
  try {
    const [ch, pg] = await Promise.all([
      windsor(env, ["session_default_channel_group", "sessions", "engagement_rate", "conversions"], "last_30d"),
      windsor(env, ["landing_page", "sessions"], "last_30d")
    ]);
    const channels = ch.map(r => ({ channel: r.session_default_channel_group || "Other", sessions: +r.sessions || 0, engagement: +r.engagement_rate || 0, conversions: +r.conversions || 0 }));
    const pages = pg.filter(r => r.landing_page && !/^\/portal\/(payment|account|setpassword|confirm|recover)/.test(r.landing_page) && r.landing_page !== "(not set)")
      .map(r => ({ page: r.landing_page.replace(/^\/portal\/membership\/.*/, "Trial sign-up"), sessions: +r.sessions || 0 }))
      .sort((a, b) => b.sessions - a.sessions).slice(0, 8);
    const out = { at: Date.now(), channels, pages };
    await env.M2CC.put("ga4:cache", JSON.stringify(out));
    return out;
  } catch (e) {
    return { error: String(e.message || e) };
  }
}

/* ---------------- month-end snapshots ---------------- */
async function takeSnapshot(env) {
  const n = nzDate();
  const [mem, newM, cancels, visits, trials] = await Promise.all(["kpi.member_today", "kpi.member_new", "kpi.member_cancel", "kpi.visit_month", "kpi.prospects_month"].map(ep => gmKpi(env, ep)));
  let ptLeads = null, net = null, income = null, cash = null;
  try {
    const r = await fetch(`${env.PT_SCRIPT}?action=list&key=${encodeURIComponent(env.PT_ADMIN_KEY)}`, { redirect: "follow" });
    const leads = dedupeLeads((await r.json()).leads);
    ptLeads = leads.filter(l => nzDate(new Date(l.receivedAt)).ym === n.ym).length;
  } catch {}
  const x = await xeroSummary(env, true);
  if (x && !x.error) { net = x.month.net; income = x.month.income; cash = x.cash; }
  const snap = {
    month: n.ym, takenOn: n.iso, final: n.d === lastDay(n.y, n.m),
    members: mem ? +mem.primary : null, visiting: mem ? +mem.subset : null,
    newMembers: newM ? +newM.primary : null, cancels: cancels ? +cancels.primary : null,
    visits: visits ? +visits.primary : null, trials: trials ? +trials.primary : null,
    ptLeads, income, net, cash
  };
  await env.M2CC.put("snap:" + n.ym, JSON.stringify(snap));
  return snap;
}
async function listSnapshots(env) {
  const out = [];
  let cursor;
  do {
    const l = await env.M2CC.list({ prefix: "snap:", cursor });
    for (const k of l.keys) { const v = await env.M2CC.get(k.name); if (v) out.push(JSON.parse(v)); }
    cursor = l.list_complete ? null : l.cursor;
  } while (cursor);
  return out;
}
