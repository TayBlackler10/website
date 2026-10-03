// M2 Core worker
// The engine behind the staff CRM, the M2 App and the website: one member record,
// one set of rules. Phase 1 is read only. GymMaster keeps running the club and
// this worker copies from it nightly, so nothing staff or members do changes yet.
//
// Bindings
//   D1:      DB              the M2 Core database (schema.sql)
//   Vars:    GM_BASE         https://m2trainingclub.gymmasteronline.com/portal/api
//            ACCESS_TEAM     Cloudflare Zero Trust team name (the part before .cloudflareaccess.com)
//   Secrets: GM_STAFF_KEY    GymMaster staff API key (set with wrangler, never in chat or git)
//            ACCESS_AUD      Application Audience tag from Cloudflare Access
//
// Sign-in is Cloudflare Access with email one-time codes: no passwords.
// The worker checks the Access token on every request, then looks the email
// up in the staff table to get the person's role.

import { APP_HTML } from "./ui.js";
import { SCHEMA, STAFF_SEED, SCHEMA_VERSION } from "./schema_sql.js";
import { makeHub } from "./hub.js";
import { makeHub2 } from "./hub2.js";
import { makeRoster } from "./roster.js";
import { makeFeeds } from "./feeds.js";
import { makeEzidebit } from "./ezidebit.js";
import { makeBilling } from "./billing.js";
import { makePush, SW_JS } from "./push.js";
import { makePt } from "./pt.js";
import { makeCatalog } from "./catalog.js";
import { makeEmail } from "./email.js";
import { makeGmSync } from "./gmsync.js";
import { makePos } from "./pos.js";
import { makeApp } from "./app.js";

const TZ = "Pacific/Auckland";
const H = makeHub({ json, nzDateTime, gmCall, applyBlockRule, passportPay });
const R = makeRoster({ nzDateTime });
const F = makeFeeds({ nzDateTime });
const H2 = makeHub2({ nzDateTime, gmCall, gmMemberToken, passportPay, normMobile });
const B = makeBilling({ nzDateTime, E: makeEzidebit() });
const P = makePush();
const PT = makePt({ nzDateTime, normMobile, P });
const C = makeCatalog({ gmLive });
const EM = makeEmail({ nzDateTime });
const GS = makeGmSync({ nzDateTime });
const POS = makePos({ nzDateTime });
const APP = makeApp({ nzDateTime, P });

// What each role can see. Business numbers (totals, revenue, Xero) are owners only.
// Reception and the manager can see what a single member owes.
const CAN = {
  owner:     { members: true, balances: true, business: true, collections: true, settings: true, add: true },
  manager:   { members: true, balances: true, business: false, collections: true, settings: false, add: true },
  reception: { members: true, balances: true, business: false, collections: false, settings: false, add: true },
  trainer:   { members: "own", balances: false, business: false, collections: false, settings: false, add: false },
  coach:     { members: "own", balances: false, business: false, collections: false, settings: false, add: false },
};

export default {
  async fetch(req, env, ctx) {
    const url = new URL(req.url);
    try {
      if (url.pathname === "/health") return json({ ok: true });
      // Public: the member lands here on their own phone after Ezidebit's form.
      if (url.pathname === "/billing-done") return html(BILLING_DONE_HTML);
      // Public: website forms post leads here with the shared intake key.
      if (url.pathname === "/api/intake") return intake(req, env);
      await ensureSchema(env);
      // Public: the unsubscribe link in members' emails (needs an Access bypass for this path).
      if (url.pathname === "/unsubscribe") return await EM.unsubscribe(env, url, req);
      // Public (only reachable through m2-join): the one-time copy of GymMaster's automations.
      if (url.pathname === "/gm-import" && req.method === "POST") return json(await EM.importGm(env, await req.json().catch(() => null)));
      // Public (only reachable through m2-join's /app): the M2 member app's backend.
      if (url.pathname === "/app-api" && req.method === "POST") return json(await APP.handle(env, await req.json().catch(() => null), ctx));
      const who = await signedIn(req, env);
      if (!who) return new Response("Sign in through M2 Core to continue.", { status: 401 });
      const can = CAN[who.role] || {};

      if (url.pathname === "/" || url.pathname === "/index.html") return html(APP_HTML);
      if (url.pathname === "/sw.js") return new Response(SW_JS, { headers: { "Content-Type": "text/javascript; charset=utf-8", "Cache-Control": "no-cache", "Service-Worker-Allowed": "/" } });
      if (url.pathname === "/api/push") return json(req.method === "POST" ? await P.subscribe(env, who, await req.json()) : await P.status(env, who));
      if (url.pathname === "/api/pt") return json(await PT.board(env, who, can));
      if (url.pathname === "/api/pt/sync" && req.method === "POST" && can.settings) return json(await PT.sync(env));
      if (url.pathname === "/api/pt/mine") return json(await PT.mine(env, who));
      const ptm = url.pathname.match(/^\/api\/pt\/(\d+)(\/assign)?$/);
      if (ptm && ptm[2] && req.method === "POST") return json(await PT.assign(env, who, can, +ptm[1], await req.json()));
      if (ptm && req.method === "POST") return json(await PT.update(env, who, can, +ptm[1], await req.json()));
      if (ptm) return json(await PT.history(env, who, can, +ptm[1]));
      if (url.pathname === "/manifest.webmanifest") return new Response(JSON.stringify({
        name: "M2 Core", short_name: "M2 Core", start_url: "/", display: "standalone", background_color: "#0A0A0A", theme_color: "#0A0A0A",
        icons: [192, 512].map(n => ({ src: "https://m2club.co.nz/assets/icon-" + n + ".png", sizes: n + "x" + n, type: "image/png" })),
      }), { headers: { "Content-Type": "application/manifest+json" } });
      if (url.pathname === "/api/me") return json({ name: who.name, role: who.role, can });
      if (url.pathname === "/api/summary") return json(await summary(env, can));
      if (url.pathname === "/api/today") return json(await today(env, who, can));
      if (url.pathname === "/api/jobs" && req.method === "POST") return json(await recordOutcome(env, who, can, await req.json()));
      if (url.pathname === "/api/staff") return json(await staffList(env, can));
      if (url.pathname === "/api/leads" && req.method === "POST") return json(await addLead(env, who, can, await req.json()));
      if (url.pathname === "/api/leads") return json(await listLeads(env, who, can, url.searchParams));
      const ld = url.pathname.match(/^\/api\/leads\/(\d+)$/);
      if (ld && req.method === "POST") return json(await updateLead(env, who, can, +ld[1], await req.json()));
      if (ld) return json(await leadDetail(env, who, can, +ld[1]));
      const mn = url.pathname.match(/^\/api\/members\/(\d+)\/(notes|flags|details)$/);
      if (mn && req.method === "POST") return json(await updateMember(env, who, can, +mn[1], mn[2], await req.json()));
      if (url.pathname === "/api/plans") return json(await sellablePlans(env, can));
      if (url.pathname === "/api/emails") return json(await EM.overview(env, who, can));
      if (url.pathname === "/api/emails/run" && req.method === "POST" && can.settings) return json(await EM.daily(env));
      if (url.pathname === "/api/emails/import-token" && req.method === "POST") return json(await EM.importToken(env, can));
      if (url.pathname === "/api/gm-sync" && req.method === "POST" && can.settings) return json({ memberships: await GS.memberships(env).catch(e => String(e)), events: await GS.events(env).catch(e => String(e)) });
      const em = url.pathname.match(/^\/api\/emails\/([a-z0-9_]+)(\/preview|\/source)?$/);
      if (em && em[2] === "/source") return json(await EM.source(env, can, em[1]));
      if (em && em[2]) return await EM.preview(env, who, can, em[1]);
      if (em && req.method === "POST") return json(await EM.save(env, who, can, em[1], await req.json()));
      if (url.pathname === "/api/app") return json(req.method === "POST" ? await APP.save(env, who, can, await req.json()) : await APP.overview(env, can));
      const apt = url.pathname.match(/^\/api\/app\/test\/(\d+)$/);
      if (apt) return json(await APP.test(env, can, +apt[1], url.searchParams.get("action") || "classes"));
      const apr = url.pathname.match(/^\/api\/app\/(request|preview)\/(\d+)$/);
      if (apr) return json(apr[1] === "request" && req.method === "POST" ? await APP.doneRequest(env, who, can, +apr[2]) : await APP.preview(env, can, +apr[2]));
      if (url.pathname === "/api/pos") return json(await POS.products(env, who, can));
      if (url.pathname === "/api/pos/product" && req.method === "POST") return json(await POS.saveProduct(env, who, can, await req.json()));
      if (url.pathname === "/api/pos/sale" && req.method === "POST") return json(await POS.sell(env, who, can, await req.json()));
      if (url.pathname === "/api/pos/sales") return json(await POS.sales(env, who, can, url.searchParams));
      const pv = url.pathname.match(/^\/api\/pos\/sale\/(\d+)\/void$/);
      if (pv && req.method === "POST") return json(await POS.voidSale(env, who, can, +pv[1], await req.json()));
      if (url.pathname === "/api/catalog") return json(req.method === "POST" ? await C.save(env, who, can, await req.json()) : await C.list(env, who, can));
      if (url.pathname === "/api/passport") return json(await passportReport(env, can, url.searchParams.get("month")));
      if (url.pathname === "/api/passport.csv") return await passportCsv(env, can, url.searchParams.get("month"));
      if (url.pathname === "/api/members" && req.method === "POST") return json(await addMember(env, who, can, await req.json()));
      if (url.pathname === "/api/members") return json(await searchMembers(env, who, can, url.searchParams.get("q") || ""));
      const ph = url.pathname.match(/^\/api\/members\/(\d+)\/photo$/);
      if (ph && req.method === "POST") return json(await savePhoto(env, who, can, +ph[1], await req.json()));
      if (ph) return await memberPhoto(env, who, can, +ph[1]);
      const kt = url.pathname.match(/^\/api\/members\/(\d+)\/key-tag$/);
      if (kt && req.method === "POST") return json(await assignKeyTag(env, who, can, +kt[1], await req.json()));
      const bl = url.pathname.match(/^\/api\/members\/(\d+)\/billing-link$/);
      if (bl) return json(await billingLink(env, can, +bl[1], url.origin));
      const tg = url.pathname.match(/^\/api\/key-tags\/([^/]+)$/);
      if (tg) return json(await whoHasTag(env, can, decodeURIComponent(tg[1])));
      const m = url.pathname.match(/^\/api\/members\/(\d+)$/);
      if (m) return json(await memberDetail(env, who, can, +m[1]));
      if (url.pathname === "/api/staff-admin") return json(req.method === "POST" ? await saveStaff(env, who, can, await req.json()) : await staffAdmin(env, can));
      if (url.pathname === "/api/report") return await report(env, can, url.searchParams);
      if (url.pathname === "/api/gm-report-probe" && can.settings) return json(await gmReportProbe(env, url.searchParams));
      if (url.pathname === "/api/gm-probe") return json(await gmProbe(env, can, url.searchParams));
      if (url.pathname === "/api/settings") return json(req.method === "POST" ? await saveSetting(env, who, can, await req.json()) : await settingsView(env, can));
      if (url.pathname === "/api/import" && req.method === "POST") return json(await importRows(env, who, can, await req.json()));
      if (url.pathname === "/api/classes") {
        const w = await H.classesWeek(env, who, can, url.searchParams);
        if (w.classes) { const job = H2.saveClassCounts(env, w.classes).catch(() => {}); if (ctx && ctx.waitUntil) ctx.waitUntil(job); else await job; }
        return json(w);
      }
      if (can.settings) {
        if (url.pathname === "/xero/connect") return await F.xeroConnect(env, url);
        if (url.pathname === "/xero/callback") return await F.xeroCallback(env, url);
        if (url.pathname === "/api/feeds") return json(await F.status(env));
        if (url.pathname === "/api/feeds/run" && req.method === "POST") {
          const what = (await req.json()).what;
          try { return json(what === "xero" ? await F.xeroSync(env, 13) : what === "marketing" ? await F.marketingSync(env, 60) : what === "backup" ? await F.backup(env) : { error: "Unknown" }); }
          catch (e) { return json({ ok: false, error: String(e.message || e) }); }
        }
        const bk = url.pathname.match(/^\/api\/backups\/(m2-core-[\d-]+\.json\.gz)$/);
        if (bk) return await F.backupGet(env, bk[1]);
      }
      if (url.pathname === "/api/billing") return json(await B.overview(env, who, can));
      if (url.pathname === "/api/billing/day") return json(await B.day(env, who, can, url.searchParams.get("date")));
      if (url.pathname === "/api/billing/ready") return json(await B.ready(env, who, can));
      if (url.pathname === "/api/billing/rules" && req.method === "POST") return json(await B.saveRules(env, who, can, await req.json()));
      if (url.pathname === "/api/billing/test" && req.method === "POST") return json(await B.test(env, can));
      if (url.pathname === "/api/billing/run" && req.method === "POST" && can.settings) return json(await B.nightly(env));
      const bm = url.pathname.match(/^\/api\/billing\/member\/(\d+)$/);
      if (bm) return json(req.method === "POST" ? await B.act(env, who, can, +bm[1], await req.json()) : await B.member(env, who, can, +bm[1]));
      if (url.pathname === "/api/roster") return json(req.method === "POST" ? await R.save(env, who, await req.json()) : await R.week(env, who, url.searchParams));
      if (url.pathname === "/api/roster/ask" && req.method === "POST") return json(await R.ask(env, who, await req.json()));
      if (url.pathname === "/api/roster/now") return json(await R.onNow(env));
      if (url.pathname === "/api/roster.csv") return await R.csv(env, who, url.searchParams);
      if (url.pathname === "/api/classes/stats") return json(await H2.classStats(env, can));
      if (url.pathname === "/api/members/browse") return json(await H2.browse(env, who, can, url.searchParams));
      if (url.pathname === "/api/visits/recent") return json(await H2.recentVisits(env, who, can));
      if (url.pathname === "/api/leads/stats") return json(await H2.leadStats(env, who, can));
      if (url.pathname === "/api/passport/insights") return json(await H2.passportInsights(env, can));
      if (url.pathname === "/api/growth/more") return json(await H2.growthMore(env, can));
      if (url.pathname === "/api/marketing/more") return json(await H2.marketingMore(env, can, url.searchParams.get("month")));
      if (url.pathname === "/api/agreement") return json(await H2.agreement(env, url.searchParams.get("plan")));
      if (url.pathname === "/contract") return new Response(await H2.contractPreview(env, url.searchParams.get("plan"), url.searchParams.get("name"), url.searchParams.get("price")),
        { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } });
      const ct = url.pathname.match(/^\/api\/members\/(\d+)\/contracts\/(\d+)$/);
      if (ct) return await H2.contractView(env, can, +ct[1], +ct[2]);
      if (can.settings && req.method === "POST") {
        if (url.pathname === "/api/roster/start") return json(await H2.rosterStart(env));
        if (url.pathname === "/api/roster/apply") return json(await H2.rosterApply(env, (await req.json()).chunk));
        if (url.pathname === "/api/roster/finish") return json(await H2.rosterFinish(env));
        if (url.pathname === "/api/leads/rebuild") { const r = await H2.rebuildLeads(env); r.pt = await PT.sync(env); return json(r); }
        if (url.pathname === "/api/visits/pull") return json(await H2.pullVisits(env, (await req.json().catch(() => ({}))).day));
        if (url.pathname === "/api/sweep") return json(await H.sweepStep(env, (await req.json()).after, H2.sweepVisits));
      }
      const cl = url.pathname.match(/^\/api\/classes\/(\d+)(?:\/(book|cancel))?$/);
      if (cl && cl[2] === "book" && req.method === "POST") return json(await H.bookMember(env, who, can, cl[1], await req.json()));
      if (cl && cl[2] === "cancel" && req.method === "POST") return json(await H.cancelBooking(env, who, can, cl[1], await req.json()));
      if (cl && !cl[2]) return json(await H.classDetail(env, who, can, cl[1]));
      const lv = url.pathname.match(/^\/api\/members\/(\d+)\/live$/);
      if (lv) {
        const [live, prof, contracts] = await Promise.all([H.memberLive(env, who, can, +lv[1]), H2.gmProfile(env, +lv[1]).catch(() => null), H2.contractList(env, can, +lv[1])]);
        if (!live.error && prof) { live.profile = prof; if (!can.balances) delete live.profile.has_billing; }
        live.contracts = contracts;
        return json(live);
      }
      if (url.pathname === "/api/collections") return json(req.method === "POST" ? await H.collectionAction(env, who, can, await req.json()) : await H.collections(env, can));
      if (url.pathname === "/api/money") return json(await H.money(env, can));
      if (url.pathname === "/api/growth") return json(await H.growth(env, can));
      if (url.pathname === "/api/marketing") return json(await H.marketing(env, can, url.searchParams));
      if (url.pathname === "/api/push" && req.method === "POST") return json(await H.pushData(env, who, can, await req.json()));
      if (url.pathname === "/api/refresh-balances" && can.settings && req.method === "POST") return json(await H.refreshBalances(env));
      if (url.pathname === "/api/sync-now" && can.settings && req.method === "POST") {
        return json(await syncMembers(env));
      }
      return json({ error: "Not found" }, 404);
    } catch (e) {
      return json({ error: String(e && e.message || e) }, 500);
    }
  },

  // Two schedules (wrangler.toml): 2:15am NZ for the nightly copy and the day's snapshot,
  // and every 15 minutes for live balances from GymMaster.
  async scheduled(event, env, ctx) {
    ctx.waitUntil((async () => {
      await ensureSchema(env);
      if (event.cron === "0 20 * * *") {
        console.log("emails", JSON.stringify(await EM.daily(env).catch(e => String(e))));
        return;
      }
      if (event.cron === "*/15 * * * *") {
        const b = await H.refreshBalances(env);
        const v = b.lap ? await H2.sweepVisits(env, b.lap) : 0;
        const p = env.GM_REPORT_KEY ? await H2.pullVisits(env).catch(e => ({ error: String(e) })) : null;
        console.log("pt", JSON.stringify(await PT.sync(env)));
        // Once an hour: new and changed members, every membership's dates, then the automations
        // (each person gets each email once a day at most, so running hourly only makes them prompt).
        const nz = nzDateTime(new Date()), hr = +nz.slice(11, 13);
        if (+nz.slice(14, 16) < 15) {
          console.log("hourly members", JSON.stringify(await syncMembers(env).catch(e => String(e))));
          if (env.GM_REPORT_KEY) console.log("hourly memberships", JSON.stringify(await GS.memberships(env).catch(e => String(e))));
          if (hr >= 7 && hr <= 20) console.log("emails", JSON.stringify(await EM.daily(env).catch(e => String(e))));
        }
        console.log("quarter", JSON.stringify({ done: b.done, failed: b.failed, visits: v, checkins: p }));
        return;
      }
      console.log("nightly", event.cron, JSON.stringify(await syncMembers(env)));
      await applyBlockRule(env);
      console.log("snapshot", JSON.stringify(await H.takeSnapshot(env)));
      console.log("leads", JSON.stringify(await H2.rebuildLeads(env).catch(e => String(e))));
      if (env.XERO_CLIENT_ID) console.log("xero", JSON.stringify(await F.xeroSync(env, 2).catch(e => String(e))));
      if (env.WINDSOR_API_KEY) console.log("marketing", JSON.stringify(await F.marketingSync(env, 10).catch(e => String(e))));
      if (env.GM_REPORT_KEY) {
        console.log("gm memberships", JSON.stringify(await GS.memberships(env).catch(e => String(e))));
        console.log("gm events", JSON.stringify(await GS.events(env).catch(e => String(e))));
      }
      console.log("billing", JSON.stringify(await B.nightly(env).catch(e => String(e))));
      console.log("email goals", JSON.stringify(await EM.goals(env).catch(e => String(e))));
      if (env.BACKUPS) console.log("backup", JSON.stringify(await F.backup(env).catch(e => String(e))));
      if (env.GM_REPORT_KEY) console.log("yesterday", JSON.stringify(await H2.pullVisits(env, nzDateTime(new Date(Date.now() - 86400_000)).slice(0, 10)).catch(e => String(e))));
      try {
        const t = nzDateTime(new Date()).slice(0, 10);
        for (const wk of [t, nzDateTime(new Date(Date.now() + 7 * 86400_000)).slice(0, 10)]) {
          const w = await H.classesWeek(env, { id: 0 }, CAN.owner, new URLSearchParams({ week: wk }));
          if (w.classes) await H2.saveClassCounts(env, w.classes);
        }
      } catch (e) { console.log("classes", String(e)); }
    })());
  },
};

/* ---------------- sign-in (Cloudflare Access) ---------------- */

let certCache = { at: 0, keys: [] };

async function signedIn(req, env) {
  // Local testing only: wrangler dev on localhost with DEV_EMAIL in .dev.vars.
  const host = new URL(req.url).hostname;
  if (env.DEV_EMAIL && (host === "localhost" || host === "127.0.0.1")) {
    return env.DB.prepare("SELECT id, name, email, role FROM staff WHERE lower(email) = lower(?) AND active = 1").bind(env.DEV_EMAIL).first();
  }
  const token = req.headers.get("Cf-Access-Jwt-Assertion");
  if (!token || !env.ACCESS_TEAM || !env.ACCESS_AUD) return null;
  const claims = await verifyAccessJwt(token, env);
  if (!claims || !claims.email) return null;
  const row = await env.DB.prepare("SELECT id, name, email, role FROM staff WHERE lower(email) = lower(?) AND active = 1")
    .bind(claims.email).first();
  return row || null;
}

async function verifyAccessJwt(token, env) {
  const [h, p, s] = token.split(".");
  if (!h || !p || !s) return null;
  const header = JSON.parse(b64urlText(h));
  const payload = JSON.parse(b64urlText(p));
  const now = Math.floor(Date.now() / 1000);
  const aud = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
  if (!aud.includes(env.ACCESS_AUD)) return null;
  if (payload.exp && payload.exp < now) return null;
  if (payload.iss !== `https://${env.ACCESS_TEAM}.cloudflareaccess.com`) return null;

  if (Date.now() - certCache.at > 3600_000 || !certCache.keys.length) {
    const r = await fetch(`https://${env.ACCESS_TEAM}.cloudflareaccess.com/cdn-cgi/access/certs`);
    certCache = { at: Date.now(), keys: (await r.json()).keys || [] };
  }
  const jwk = certCache.keys.find(k => k.kid === header.kid);
  if (!jwk) return null;
  const key = await crypto.subtle.importKey("jwk", jwk, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["verify"]);
  const ok = await crypto.subtle.verify("RSASSA-PKCS1-v1_5", key, b64urlBytes(s), new TextEncoder().encode(h + "." + p));
  return ok ? payload : null;
}

function b64urlBytes(s) {
  const b = atob(s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4));
  return Uint8Array.from(b, c => c.charCodeAt(0));
}
function b64urlText(s) { return new TextDecoder().decode(b64urlBytes(s)); }

/* ---------------- reads ---------------- */

async function summary(env, can) {
  const db = env.DB;
  const one = (sql, ...a) => db.prepare(sql).bind(...a).first();
  const all = (sql, ...a) => db.prepare(sql).bind(...a).all().then(r => r.results);

  const out = {
    members: (await one("SELECT count(*) n FROM members WHERE status = 'active'")).n,
    passport: (await one("SELECT count(*) n FROM member_flags WHERE flag = 'passport'")).n,
    by_family: await all(`SELECT p.family, count(*) n FROM memberships m JOIN plans p ON p.id = m.plan_id
                          WHERE m.status = 'current' GROUP BY p.family ORDER BY n DESC`),
    lead_source_pct: (await one(`SELECT round(100.0 * sum(CASE WHEN coalesce(lead_source,'') <> '' THEN 1 ELSE 0 END) / max(count(*),1), 1) pct
                                 FROM members WHERE status = 'active'`)).pct,
    trials: await one(`SELECT count(*) total, sum(CASE WHEN stage = 'joined' THEN 1 ELSE 0 END) joined
                       FROM leads WHERE kind = 'trial'`),
    blocked: (await one("SELECT count(*) n FROM member_flags WHERE flag = 'blocked'")).n,
    last_sync: await one("SELECT source, finished_at, rows_in, rows_changed, ok, error FROM sync_log ORDER BY id DESC LIMIT 1"),
  };
  if (can.business) {
    out.weekly_billed = (await one(`SELECT round(sum(weekly_value), 2) v FROM memberships
                                    WHERE status = 'current' AND billed_by = 'ezidebit'`)).v;
    out.owed_total = (await one("SELECT round(sum(balance_owing), 2) v FROM billing_accounts WHERE balance_owing > 0")).v || 0;
  }
  return out;
}

async function searchMembers(env, who, can, q) {
  if (!can.members) return { error: "No access" };
  q = q.trim();
  if (q.length < 2) return { results: [] };
  const like = "%" + q.toLowerCase() + "%";
  const digits = q.replace(/\D/g, "");
  let sql = `SELECT m.id, m.first_name, m.last_name, m.status, p.family, p.gm_type_name plan
             FROM members m
             LEFT JOIN memberships ms ON ms.member_id = m.id AND ms.status = 'current'
             LEFT JOIN plans p ON p.id = ms.plan_id
             WHERE (lower(m.first_name || ' ' || coalesce(m.last_name,'')) LIKE ? OR lower(coalesce(m.email,'')) LIKE ?
                    ${digits.length >= 4 ? "OR m.mobile LIKE ? OR m.key_tag = ?" : ""})`;
  const binds = [like, like];
  if (digits.length >= 4) binds.push("%" + digits + "%", q);
  if (can.members === "own") { sql += " AND m.trainer_id = ?"; binds.push(who.id); }
  sql += " ORDER BY m.first_name LIMIT 25";
  return { results: (await env.DB.prepare(sql).bind(...binds).all()).results };
}

async function memberDetail(env, who, can, id) {
  if (!can.members) return { error: "No access" };
  const db = env.DB;
  const m = await db.prepare("SELECT * FROM members WHERE id = ?").bind(id).first();
  if (!m) return { error: "Member not found" };
  if (can.members === "own" && m.trainer_id !== who.id) return { error: "Not one of your clients" };
  const all = (sql, ...a) => db.prepare(sql).bind(...a).all().then(r => r.results);
  const memberships = await all(`SELECT ms.*, p.family, p.gm_type_name plan, p.frequency, p.flexi, p.paid_in_full, p.corporate, p.employer,
                                 p.includes_classes, p.includes_recovery
                                 FROM memberships ms JOIN plans p ON p.id = ms.plan_id
                                 WHERE ms.member_id = ? ORDER BY ms.start_date DESC`, id);
  const flags = await all("SELECT flag, detail, set_at FROM member_flags WHERE member_id = ?", id);
  const visits = await all(`SELECT substr(at,1,10) day, count(*) n FROM visits WHERE member_id = ?
                            AND at >= date('now','-84 days') GROUP BY day ORDER BY day`, id);
  const lastVisit = await db.prepare("SELECT max(at) at FROM visits WHERE member_id = ?").bind(id).first();
  const activity = await all(`SELECT a.kind, a.detail, a.at, s.name staff FROM activity a LEFT JOIN staff s ON s.id = a.staff_id
                              WHERE a.member_id = ? ORDER BY a.at DESC, a.id DESC LIMIT 30`, id);
  const tags = await all("SELECT tag, status, assigned_at, ended_at FROM key_tags WHERE member_id = ? ORDER BY id DESC", id);
  const leads = await all("SELECT id, kind, stage, created_at FROM leads WHERE member_id = ? ORDER BY created_at DESC LIMIT 5", id);
  const referrer = m.referred_by ? await db.prepare("SELECT id, first_name, last_name FROM members WHERE id = ?").bind(m.referred_by).first() : null;
  const trainer = m.trainer_id ? await db.prepare("SELECT id, name FROM staff WHERE id = ?").bind(m.trainer_id).first() : null;
  const photo = await db.prepare("SELECT taken_at FROM member_photos WHERE member_id = ?").bind(id).first();
  const out = { member: m, memberships, flags, visits, last_visit: lastVisit && lastVisit.at, activity, tags, leads, referrer, trainer,
                photo_at: photo ? photo.taken_at : null };
  if (can.balances) {
    out.billing = await db.prepare("SELECT balance_owing, next_debit_date, next_debit_amount, billed_by_system, free_weeks_credit FROM billing_accounts WHERE member_id = ?").bind(id).first();
  } else {
    for (const ms of memberships) { delete ms.price; delete ms.weekly_value; delete ms.gm_billing_note; }
  }
  out.next_step = nextStep(out, can);
  return out;
}

// The one most useful thing to do with this person right now.
function nextStep(d, can) {
  const m = d.member, ms = d.memberships.find(x => x.status === "current");
  const flag = f => d.flags.some(x => x.flag === f);
  if (flag("blocked") && can.balances) return { text: `Owes $${(d.billing && d.billing.balance_owing || 0).toFixed(2)}. Blocked at the doors, in the app and from classes until it's paid.`, action: "billing" };
  if (d.billing && d.billing.balance_owing > 0 && can.balances) return { text: `Owes $${d.billing.balance_owing.toFixed(2)}. Ask about it next time they're in.`, action: "billing" };
  const isPassport = flag("passport") || (ms && ms.family === "passport");
  if (isPassport && !m.fp_id) return { text: "No Fitness Passport ID. Passport only pays us for visits it can match to this number. Ask for their Passport card or app and add it.", action: "fp" };
  if (isPassport && !m.fp_id_in_gm) return { text: `Type Fitness Passport ID ${m.fp_id} into GymMaster (Additional Details). GymMaster reports their visits to Passport.`, action: "fp_gm" };
  if (ms && ms.billed_by === "ezidebit" && d.activity.every(a => !/bank details/i.test(a.detail || "")) && m.joined_on && m.joined_on >= isoDaysAgo(14)) {
    return { text: "New member. Check their bank details are in.", action: "billing" };
  }
  if (!m.key_tag && ms && ms.family !== "passport" && (d.tags.length || d.activity.some(a => a.kind === "sale"))) return { text: "No key tag on record. Scan one next time they're in.", action: "tag" };
  if (!d.photo_at && d.activity.some(a => a.kind === "sale")) return { text: "No photo yet. Take one next time they're at the desk, so everyone knows the face.", action: "photo" };
  if (!m.lead_source) return { text: "We don't know how they found us. Ask, and record it.", action: "details" };
  if (ms && ms.family === "perform" && !d.leads.some(l => l.kind === "free_pt") && !m.trainer_id) return { text: "Perform member who hasn't had their free PT. Book one.", action: "pt" };
  if (ms && ms.family === "daily" && (m.total_visits_gm || 0) >= 100) return { text: "Trains a lot on Daily. Perform adds classes and recovery for $22 more a week.", action: "upgrade" };
  if (!m.goal) return { text: "No goal recorded. Ask what they're training for.", action: "details" };
  return { text: "Nothing outstanding. Say hi.", action: null };
}

function isoDaysAgo(n) { return nzDateTime(new Date(Date.now() - n * 86400_000)).slice(0, 10); }

/* ---------------- add a member ---------------- */
// Reception adds members here. While GymMaster still bills and runs the doors,
// every new member is created in GymMaster first (same signup API the join page
// uses), then saved in the Core with the same id, so the two never disagree.

// Memberships reception can sell, by GymMaster membership type id. Perform first.
// Prices come live from GymMaster so they're never out of date here.
const SELLABLE = [
  ["perform", "weekly", 0, 844762], ["perform", "weekly", 1, 844772], ["perform", "fortnightly", 0, 844766], ["perform", "fortnightly", 1, 844773],
  ["perform", "monthly", 0, 844778], ["perform", "monthly", 1, 844782], ["perform", "upfront", 0, 844786],
  ["classes", "weekly", 0, 844761], ["classes", "weekly", 1, 844768], ["classes", "fortnightly", 0, 844765], ["classes", "fortnightly", 1, 844769],
  ["classes", "monthly", 0, 844776], ["classes", "monthly", 1, 844781],
  ["daily", "weekly", 0, 844760], ["daily", "weekly", 1, 844770], ["daily", "fortnightly", 0, 844764], ["daily", "fortnightly", 1, 844771],
  ["daily", "monthly", 0, 844777], ["daily", "monthly", 1, 844780], ["daily", "quarterly", 0, 844784], ["daily", "upfront", 0, 844785],
  ["recovery", "weekly", 0, 844763], ["recovery", "weekly", 1, 844774], ["recovery", "fortnightly", 0, 844767], ["recovery", "fortnightly", 1, 844775],
  ["recovery", "monthly", 0, 844779], ["recovery", "monthly", 1, 844783],
  ["trial", "upfront", 0, 844624], ["trial", "upfront", 0, 844673], ["trial", "upfront", 0, 844524],
].map(([family, frequency, flexi, id], i) => ({ id, family, frequency, flexi: !!flexi, sort: i }));

const GOALS = ["Strength", "Weight loss", "HYROX or racing", "Fitness and health", "Recovery and wellbeing", "Running", "Muscle gain", "Other"];
const SOURCES = ["Instagram", "Facebook", "Google", "Referred by a member", "Walked past", "Fitness Passport", "Work or corporate", "Word of mouth", "Event", "Other"];

async function gmMember(env, method, path, fields = {}) {
  const u = new URL(env.GM_BASE + path);
  if (method === "GET") {
    u.searchParams.set("api_key", env.GM_API_KEY);
    for (const [k, v] of Object.entries(fields)) if (v !== undefined && v !== null && v !== "") u.searchParams.set(k, v);
    return (await fetch(u.toString())).json();
  }
  const body = new URLSearchParams({ api_key: env.GM_API_KEY });
  for (const [k, v] of Object.entries(fields)) if (v !== undefined && v !== null && v !== "") body.set(k, v);
  const r = await fetch(u.toString(), { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body });
  const t = await r.text();
  try { return JSON.parse(t); } catch { return { error: "Unexpected reply from GymMaster (" + r.status + ")" }; }
}

// GymMaster's membership list, kept for 5 minutes.
let gmLiveCache = { at: 0, map: null };
async function gmLive(env) {
  if (gmLiveCache.map && Date.now() - gmLiveCache.at < 300_000) return gmLiveCache.map;
  if (!env.GM_API_KEY) throw new Error("GM_API_KEY is not set");
  const d = await gmMember(env, "GET", "/v1/memberships");
  if (d.error) throw new Error("GymMaster: " + d.error);
  gmLiveCache = { at: Date.now(), map: new Map((d.result || []).map(m => [Number(m.id), m])) };
  return gmLiveCache.map;
}

async function sellablePlans(env, can) {
  if (!can.add) return { error: "No access" };
  if (!env.GM_API_KEY) return { error: "GM_API_KEY is not set" };
  let live;
  try { live = await gmLive(env); } catch (e) { return { error: String(e.message || e) }; }
  // The team's own list decides what's sold at the desk, once it's been started.
  const cat = await C.forSale(env).catch(() => null);
  const source = cat ? cat.map((c, i) => ({ id: +c.gm_id, family: c.kind === "trial" || c.kind === "pass" ? "trial" : c.family,
                                             frequency: c.billing === "once" ? "upfront" : c.billing, flexi: !!c.flexi, sort: i })) : SELLABLE;
  const plans = source.filter(p => live.has(p.id)).map(p => {
    const m = live.get(p.id);
    return { ...p, name: String(m.name || "").trim(), price: m.price, priceDescription: m.pricedescription,
             signupFee: parseFloat(String(m.signupfee || "0").replace(/[^0-9.]/g, "")) || 0 };
  });
  for (const id of passportTypeIds(env, live)) {
    const m = live.get(id);
    plans.push({ id, family: "passport", frequency: "yearly", flexi: false, sort: 99, name: m ? String(m.name || "").trim() : "Fitness Passport",
                 price: "Paid by Fitness Passport", priceDescription: "", signupFee: 0 });
  }
  return { plans, goals: GOALS, sources: SOURCES };
}

// The GymMaster membership type(s) for Fitness Passport. Found by name in the live
// list, or set FP_MEMBERSHIP_ID in wrangler.toml if GymMaster doesn't list it.
function passportTypeIds(env, live) {
  const ids = new Set();
  if (env.FP_MEMBERSHIP_ID) ids.add(Number(env.FP_MEMBERSHIP_ID));
  for (const [id, m] of live) if (/fitness\s*passport/i.test(String(m.name || ""))) ids.add(id);
  return [...ids].filter(Boolean);
}

// Fitness Passport IDs are the number on the member's Passport card or app.
function cleanFpId(v) {
  const d = String(v ?? "").replace(/\D/g, "");
  return d.length >= 5 && d.length <= 12 ? d : "";
}

async function addMember(env, who, can, b) {
  if (!can.add) return { ok: false, error: "Only reception, the manager and owners can add members." };
  const db = env.DB;
  const clean = s => String(s ?? "").trim().replace(/\s+/g, " ");
  const f = {
    first: clean(b.first), last: clean(b.last), email: clean(b.email).toLowerCase(), mobile: normMobile(b.mobile),
    dob: clean(b.dob), gender: ["M", "F", "O"].includes(b.gender) ? b.gender : "", goal: clean(b.goal), source: clean(b.source),
    campaign: clean(b.campaign), planId: Number(b.planId), referredBy: b.referredBy ? Number(b.referredBy) : null,
    passport: !!b.passport, signature: typeof b.signature === "string" ? b.signature : "",
    emergencyName: clean(b.emergencyName), emergencyPhone: normMobile(b.emergencyPhone),
    fpId: cleanFpId(b.fpId), fpIdRaw: clean(b.fpId),
  };
  const missing = [["first", "first name"], ["last", "last name"], ["email", "email"], ["mobile", "mobile"], ["dob", "date of birth"],
                   ["goal", "goal"], ["source", "where they heard about us"]].filter(([k]) => !f[k]).map(([, l]) => l);
  if (!f.planId) missing.unshift("membership");
  if (missing.length) return { ok: false, error: "Still needed: " + missing.join(", ") + "." };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email)) return { ok: false, error: "That email address doesn't look right." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(f.dob)) return { ok: false, error: "Check the date of birth." };
  if (!b.agreed) return { ok: false, error: "The member needs to agree to the terms and sign." };

  if (!env.GM_API_KEY) return { ok: false, error: "GM_API_KEY is not set, so members can't be added yet." };
  const liveList = await gmMember(env, "GET", "/v1/memberships");
  const liveMap = new Map((liveList.result || []).map(m => [Number(m.id), m]));
  let plan = SELLABLE.find(p => p.id === f.planId);
  if (!plan && passportTypeIds(env, liveMap).includes(f.planId)) plan = { id: f.planId, family: "passport", frequency: "yearly", flexi: false };
  if (!plan) return { ok: false, error: "That membership can't be sold here." };
  if (plan.family === "passport") f.passport = true;
  // Passport pays M2 per visit, matched on this ID. No ID, no money, so it's compulsory.
  if (f.passport && !f.fpId) {
    return { ok: false, error: f.fpIdRaw ? "That Fitness Passport ID doesn't look right. It's the number on their Passport card or app."
                                         : "Fitness Passport ID is compulsory for Passport members. It's on their Passport card or app. Without it Passport can't pay us for their visits." };
  }
  if (f.fpId) {
    const taken = await db.prepare("SELECT id, first_name, last_name FROM members WHERE fp_id = ? LIMIT 1").bind(f.fpId).first();
    if (taken) return { ok: false, error: `Fitness Passport ID ${f.fpId} is already on ${taken.first_name} ${taken.last_name || ""}. Check the card: every person has their own.` };
  }
  // Fitness Passport members are excluded from every offer, trials included.
  if (f.passport && plan.family === "trial") return { ok: false, error: "Fitness Passport members can't take M2 trials or offers." };

  // Already here? Match on email or mobile so the same person never gets two records.
  const dupe = await db.prepare("SELECT id, first_name, last_name, status FROM members WHERE lower(email) = ? OR (mobile IS NOT NULL AND mobile = ?) LIMIT 1")
    .bind(f.email, f.mobile).first();
  if (f.referredBy) {
    const ref = await db.prepare("SELECT 1 FROM member_flags WHERE member_id = ? AND flag = 'passport'").bind(f.referredBy).first();
    if (ref) return { ok: false, error: "Fitness Passport members can't use Bring a Mate. Take the referral off, or pick the right member." };
  }
  if (dupe && !b.confirmDuplicate) {
    // Families often share one email (lots of Passport households do), so it's a warning, not a wall.
    const same = String(dupe.first_name || "").toLowerCase() === f.first.toLowerCase();
    return { ok: false, duplicate: dupe, canOverride: !same,
             error: same ? `${dupe.first_name} ${dupe.last_name || ""} is already in the system (${dupe.status}). Open their profile instead.`
                         : `That email or mobile belongs to ${dupe.first_name} ${dupe.last_name || ""}. If they're family sharing it, add anyway.` };
  }

  // 1. GymMaster first, while it runs billing and doors.
  const ex = await gmMember(env, "GET", "/v2/member/exists", { email: f.email });
  if (ex && ex.result && ex.result.id && !b.confirmDuplicate) {
    return { ok: false, duplicate: { id: ex.result.id }, canOverride: true,
             error: "That email is already in GymMaster. If it's a family member sharing it, add anyway." };
  }
  const today = nzDateTime(new Date()).slice(0, 10);
  const password = Array.from(crypto.getRandomValues(new Uint8Array(12)), x => (x % 36).toString(36)).join("");
  const res = await gmMember(env, "POST", "/v1/signup", {
    firstname: f.first, surname: f.last, email: f.email, phonecell: f.mobile, dob: f.dob, gender: f.gender,
    password, membershiptypeid: String(f.planId), companyid: env.COMPANY_ID || "4", startdate: today,
  });
  if (res.error || !res.memberid) return { ok: false, error: "GymMaster said: " + (res.error || "no member id came back") };
  const id = Number(res.memberid);
  const lm = liveMap.get(f.planId);
  const price = lm ? (parseFloat(String(lm.price || "").replace(/[^0-9.]/g, "")) || null) : null;
  const WK = { weekly: 1, fortnightly: 2, monthly: 52 / 12, quarterly: 13 };
  const weekly = price && WK[plan.frequency] ? Math.round(price / WK[plan.frequency] * 100) / 100 : null;
  const warnings = [];
  if (res.membershipid) {
    const a = await gmMember(env, "POST", `/v2/member/membership/${res.membershipid}/agreement`, { token: res.token });
    if (a.error) warnings.push("Terms not logged in GymMaster: " + a.error);
    if (/^data:image\/png;base64,/.test(f.signature)) {
      const s = await gmMember(env, "POST", "/v2/member/signature", { token: res.token, membershipid: res.membershipid, file: f.signature, source: "M2 Core, added by " + who.name });
      if (s.error) warnings.push("Signature not saved in GymMaster: " + s.error);
    }
  }

  // 2. The Core record, same id as GymMaster.
  const planRow = await db.prepare("SELECT id FROM plans WHERE gm_join_id = ?").bind(f.planId).first();
  let planDbId = planRow && planRow.id;
  if (!planDbId) {
    const p = await db.prepare(`INSERT INTO plans(gm_type_name, gm_category, family, frequency, flexi, paid_in_full, gm_join_id,
                                includes_classes, includes_recovery) VALUES (?, 'Sold in M2 Core', ?, ?, ?, ?, ?, ?, ?) RETURNING id`)
      .bind(b.planName || ("Membership " + f.planId), plan.family, plan.frequency, plan.flexi ? 1 : 0, plan.frequency === "upfront" && plan.family !== "trial" ? 1 : 0,
            f.planId, ["perform", "classes", "trial", "passport"].includes(plan.family) ? 1 : 0, ["perform", "recovery", "trial", "passport"].includes(plan.family) ? 1 : 0).first();
    planDbId = p.id;
  }
  const billedBy = plan.family === "trial" ? "none" : plan.family === "passport" ? "passport" : "ezidebit";
  const stmts = [
    db.prepare(`INSERT INTO members(id, gm_id, first_name, last_name, email, mobile, dob, gender, goal, lead_source, lead_campaign,
                referred_by, emergency_name, emergency_phone, status, joined_on, terms_signed_on, fp_id)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?, ?)
                ON CONFLICT(id) DO UPDATE SET goal = excluded.goal, lead_source = excluded.lead_source, fp_id = coalesce(excluded.fp_id, members.fp_id),
                  status = 'active', updated_at = datetime('now')`)
      .bind(id, id, f.first, f.last, f.email, f.mobile, f.dob, f.gender || null, f.goal, f.source, f.campaign || null, f.passport ? null : f.referredBy,
            f.emergencyName || null, f.emergencyPhone || null, today, today, f.fpId || null),
    db.prepare("INSERT INTO memberships(member_id, plan_id, price, weekly_value, start_date, status, billed_by, sold_by) VALUES (?, ?, ?, ?, ?, 'current', ?, ?)")
      .bind(id, planDbId, price, weekly, today, billedBy, who.name),
    db.prepare("INSERT INTO activity(member_id, staff_id, kind, detail) VALUES (?, ?, 'sale', ?)")
      .bind(id, who.id, "Added at reception: " + (b.planName || plan.family) + (f.referredBy ? ", Bring a Mate" : "")),
  ];
  if (billedBy === "ezidebit") stmts.push(db.prepare("INSERT OR IGNORE INTO billing_accounts(member_id, billed_by_system) VALUES (?, 'gymmaster')").bind(id));
  if (f.passport) {
    stmts.push(db.prepare("INSERT OR IGNORE INTO member_flags(member_id, flag, set_by) VALUES (?, 'passport', ?)").bind(id, who.id));
    // GymMaster's sign-up doesn't take the Passport ID, and GymMaster is what reports visits to
    // Passport, so reception types it in there. Stays on Today until it's done.
    stmts.push(db.prepare("INSERT INTO tasks(kind, member_id, owner_role, due_on) VALUES ('fp_id_gm', ?, 'reception', ?)").bind(id, today));
  }
  if (f.referredBy && !f.passport) {
    // Bring a Mate: both get 4 weeks free. Applied in GymMaster at the desk until billing moves.
    stmts.push(db.prepare("UPDATE billing_accounts SET free_weeks_credit = free_weeks_credit + 4 WHERE member_id IN (?, ?)").bind(id, f.referredBy));
    stmts.push(db.prepare("INSERT INTO activity(member_id, staff_id, kind, detail) VALUES (?, ?, 'note', ?)")
      .bind(f.referredBy, who.id, `Brought a mate: ${f.first} ${f.last}. 4 weeks free to apply in GymMaster.`));
  }
  if (billedBy === "ezidebit") {
    stmts.push(db.prepare("INSERT INTO tasks(kind, member_id, owner_role, due_on, value_at_stake) VALUES ('missing_billing', ?, 'reception', ?, ?)")
      .bind(id, today, null));
  }
  // Any open lead for this person is now a join (or a trial if that's what they took).
  stmts.push(db.prepare(`UPDATE leads SET member_id = ?, stage = ?, closed_at = CASE WHEN ? = 'joined' THEN datetime('now') ELSE closed_at END
                         WHERE stage NOT IN ('joined','lost') AND (lower(email) = ? OR mobile = ?)`)
    .bind(id, plan.family === "trial" ? "trial" : "joined", plan.family === "trial" ? "trial" : "joined", f.email, f.mobile));
  if (plan.family === "trial") {
    stmts.push(db.prepare(`INSERT INTO leads(member_id, name, email, mobile, kind, source, campaign, stage, goal)
                           SELECT ?, ?, ?, ?, 'trial', ?, ?, 'trial', ?
                           WHERE NOT EXISTS (SELECT 1 FROM leads WHERE member_id = ? AND kind = 'trial' AND stage = 'trial')`)
      .bind(id, f.first + " " + f.last, f.email, f.mobile, f.source, f.campaign || null, f.goal, id));
  }
  await db.batch(stmts);
  try { await H2.saveSignedContract(env, who, id, f.planId, b.planName || plan.family, b.planPrice || (lm && lm.price) || null, f.signature); }
  catch (e) { warnings.push("Signed contract not saved: " + String(e.message || e)); }
  return { ok: true, id, needsBilling: billedBy === "ezidebit", warnings, gymmasterUrl: (env.GM_SITE || "") + "/member/view/" + id,
           fpId: f.passport ? f.fpId : null };
}

// Where reception enters bank details for a member.
// Now: GymMaster's own billing page for that member (GymMaster still bills, so the
// details must live there). After the billing pilot: Ezidebit's hosted form, so
// M2 never sees the numbers. Switch with BILLING_MODE = "ezidebit".
async function billingLink(env, can, id, origin) {
  if (!can.add) return { error: "No access" };
  const m = await env.DB.prepare("SELECT id, gm_id, first_name, last_name, email, mobile FROM members WHERE id = ?").bind(id).first();
  if (!m) return { error: "Member not found" };
  if ((env.BILLING_MODE || "gymmaster") !== "ezidebit") {
    return { mode: "gymmaster", url: (env.GM_SITE || "") + "/member/view/" + (m.gm_id || m.id),
             note: "Opens their GymMaster profile. Go to Billing and enter the bank or card details with the member." };
  }
  if (!env.EZIDEBIT_EDDR_BASE || !env.EZIDEBIT_PUBLIC_KEY) return { error: "Ezidebit form not set up yet" };
  const ms = await env.DB.prepare(`SELECT ms.price, p.frequency FROM memberships ms JOIN plans p ON p.id = ms.plan_id
                                   WHERE ms.member_id = ? AND ms.status = 'current' ORDER BY ms.id DESC LIMIT 1`).bind(id).first();
  const FREQ = { weekly: 1, fortnightly: 2, monthly: 4, quarterly: 16 };
  const u = new URL(env.EZIDEBIT_EDDR_BASE);
  const set = (k, v) => { if (v !== undefined && v !== null && v !== "") u.searchParams.set(k, String(v)); };
  set("a", env.EZIDEBIT_PUBLIC_KEY); set("uRef", "M2-" + m.id); set("businessOrPerson", 1);
  set("fName", m.first_name); set("lName", m.last_name); set("email", m.email); set("mobile", m.mobile);
  set("debits", 2); set("rAmount", ms && ms.price); set("freq", ms && FREQ[ms.frequency]); set("rDate", 0);
  set("callback", (env.PUBLIC_URL || "https://m2-join.taylor-3e5.workers.dev").replace(/\/$/, "") + "/billing-done?member=" + m.id); set("ed", 1);
  return { mode: "ezidebit", url: u.toString(), note: "Hand the screen to the member, or scan the code with their phone." };
}

// Assign a key tag. Tag readers type the number and press Enter, so the screen
// just needs a focused box. A tag can only belong to one person at a time.
async function assignKeyTag(env, who, can, id, b) {
  if (!can.add) return { ok: false, error: "No access" };
  const db = env.DB;
  const tag = String(b.tag || "").trim().replace(/\s+/g, "");
  if (!/^[A-Za-z0-9]{4,24}$/.test(tag)) return { ok: false, error: "That doesn't look like a key tag number. Scan it again." };
  const m = await db.prepare("SELECT id, first_name, last_name, key_tag FROM members WHERE id = ?").bind(id).first();
  if (!m) return { ok: false, error: "Member not found" };
  const owner = await db.prepare("SELECT id, first_name, last_name FROM members WHERE key_tag = ? AND id <> ?").bind(tag, id).first();
  if (owner) return { ok: false, error: `That tag belongs to ${owner.first_name} ${owner.last_name || ""}. Use a new tag.` };
  if (m.key_tag === tag) return { ok: true, tag, unchanged: true };
  const reason = ["lost", "replaced", "returned"].includes(b.oldStatus) ? b.oldStatus : "replaced";
  const stmts = [];
  if (m.key_tag) stmts.push(db.prepare("UPDATE key_tags SET status = ?, ended_at = datetime('now') WHERE member_id = ? AND tag = ? AND status = 'active'")
    .bind(reason, id, m.key_tag));
  stmts.push(db.prepare("UPDATE members SET key_tag = ?, updated_at = datetime('now') WHERE id = ?").bind(tag, id));
  stmts.push(db.prepare("INSERT INTO key_tags(tag, member_id, assigned_by) VALUES (?, ?, ?)").bind(tag, id, who.id));
  stmts.push(db.prepare("INSERT INTO activity(member_id, staff_id, kind, detail) VALUES (?, ?, 'note', ?)")
    .bind(id, who.id, m.key_tag ? `Key tag ${tag} given, old tag ${m.key_tag} marked ${reason}` : `Key tag ${tag} given`));
  await db.batch(stmts);
  // Doors read GymMaster until January, so the tag also has to be on the GymMaster member.
  return { ok: true, tag, replaced: m.key_tag || null, inGymMaster: false,
           gymmasterUrl: (env.GM_SITE || "") + "/member/view/" + id,
           note: "Also add this tag on their GymMaster profile so the doors open, until doors move to the Core." };
}

async function whoHasTag(env, can, tag) {
  if (!can.members) return { error: "No access" };
  const cur = await env.DB.prepare("SELECT id, first_name, last_name FROM members WHERE key_tag = ?").bind(tag).first();
  const history = (await env.DB.prepare(`SELECT k.member_id, m.first_name, m.last_name, k.status, k.assigned_at, k.ended_at
                                         FROM key_tags k JOIN members m ON m.id = k.member_id WHERE k.tag = ? ORDER BY k.id DESC`).bind(tag).all()).results;
  return { tag, current: cur || null, history };
}

/* ---------------- Today: the ranked job list ---------------- */
// Every job is worked from this list, and every finished job records what happened,
// so after a month we know which jobs actually make money.

const JOBS = {
  new_lead:        { label: "New leads to contact",             one: "new lead to contact",            owner: "reception", order: 1 },
  missing_billing: { label: "New members with no bank details", one: "new member with no bank details", owner: "reception", order: 2 },
  trial_ending:    { label: "Trials finishing",                 one: "trial finishing",                owner: "reception", order: 3 },
  blocked:         { label: "Blocked for money owing",          one: "member blocked for money owing", owner: "manager",   order: 4 },
  call_back:       { label: "Call backs due",                   one: "call back due",                  owner: "reception", order: 5 },
  fp_id_gm:        { label: "Passport IDs to type into GymMaster", one: "Passport ID to type into GymMaster", owner: "reception", order: 2.2 },
  fp_missing:      { label: "Passport members with no Passport ID", one: "Passport member with no Passport ID", owner: "reception", order: 2.4 },
  no_tag:          { label: "Paying members with no key tag",   one: "paying member with no key tag",  owner: "reception", order: 6 },
  no_photo:        { label: "New members with no photo",        one: "new member with no photo",       owner: "reception", order: 7 },
  failed_payment:  { label: "Payments that failed",             one: "payment that failed",            owner: "reception", order: 2.6 },
  cancel_save:     { label: "Gave notice to cancel",            one: "member who gave notice to cancel", owner: "manager", order: 3.5 },
  hold_ending:     { label: "Holds ending soon",                one: "hold ending soon",               owner: "reception", order: 6.5 },
};
const OUTCOMES = ["joined", "joining_at_desk", "call_back", "no_answer", "not_interested", "paid", "billing_in", "tag_given", "fp_in_gm", "done"];

async function today(env, who, can) {
  const db = env.DB;
  const all = (sql, ...a) => db.prepare(sql).bind(...a).all().then(r => r.results);
  const one = (sql, ...a) => db.prepare(sql).bind(...a).first();
  const nzToday = nzDateTime(new Date()).slice(0, 10);
  const own = can.members === "own";
  const jobs = [];
  const push = (kind, items) => { if (items.length) jobs.push({ kind, ...JOBS[kind], count: items.length, items: items.slice(0, 50) }); };

  // Leads nobody has contacted yet, oldest first. Trainers see the ones assigned to them.
  push("new_lead", (await all(`SELECT l.id lead_id, l.member_id, coalesce(l.name, m.first_name || ' ' || coalesce(m.last_name,'')) name,
                                 l.kind, l.source, l.goal, l.notes, l.created_at, l.mobile
                               FROM leads l LEFT JOIN members m ON m.id = l.member_id
                               WHERE l.stage = 'new' AND (l.notes IS NULL OR l.notes <> 'gymmaster_import') ${own ? "AND l.assigned_to = ?" : ""}
                               ORDER BY l.created_at LIMIT 100`, ...(own ? [who.id] : [])))
    .map(r => ({ ...r, detail: leadKindLabel(r.kind) + (r.goal ? ", goal: " + r.goal : "") + (r.source ? ", from " + r.source : "") + (r.notes ? ". " + r.notes : "") })));

  if (!own) {
    push("missing_billing", (await all(`SELECT t.id task_id, t.member_id, m.first_name || ' ' || coalesce(m.last_name,'') name, m.mobile, t.due_on
                                        FROM tasks t JOIN members m ON m.id = t.member_id
                                        WHERE t.kind = 'missing_billing' AND t.outcome IS NULL ORDER BY t.due_on`))
      .map(r => ({ ...r, detail: "Joined " + r.due_on + ". Get their bank details in." })));

    // Anyone handled for this job in the last week drops off the list.
    const handled = kind => `NOT EXISTS (SELECT 1 FROM tasks t WHERE t.kind = '${kind}' AND t.member_id = m.id AND t.outcome IS NOT NULL AND t.done_at >= datetime('now','-7 days'))`;
    // Trials finishing today or tomorrow, from GymMaster's own dates, who haven't joined.
    push("trial_ending", (await all(`SELECT DISTINCT m.id member_id, m.first_name || ' ' || coalesce(m.last_name,'') name, m.mobile, s.type_name, s.end_date
                                     FROM mship_seen s JOIN members m ON m.id = s.member_id JOIN plans p ON p.gm_type_name = s.type_name AND p.family = 'trial'
                                     WHERE s.end_date BETWEEN ? AND date(?, '+1 day') AND ${handled("trial_ending")}
                                       AND NOT EXISTS (SELECT 1 FROM memberships ms JOIN plans px ON px.id = ms.plan_id WHERE ms.member_id = m.id AND ms.status = 'current' AND px.family NOT IN ('trial','pass'))
                                     ORDER BY s.end_date`, nzToday, nzToday))
      .map(r => ({ ...r, detail: r.type_name + " finishes " + (r.end_date === nzToday ? "today" : "tomorrow") + ". Best time to ask them to join." })));

    // Debits that failed in the last couple of days (GymMaster's failed payments report).
    push("failed_payment", (await all(`SELECT m.id member_id, m.first_name || ' ' || coalesce(m.last_name,'') name, m.mobile, f.amount, f.reason, f.billing_date,
                                         (SELECT balance_owing FROM billing_accounts b WHERE b.member_id = m.id) owing
                                       FROM gm_failed f JOIN members m ON m.id = f.member_id
                                       WHERE f.first_seen >= date(?, '-2 days') AND f.billing_date >= date(?, '-7 days') AND ${handled("failed_payment")}
                                         AND NOT EXISTS (SELECT 1 FROM member_flags g WHERE g.member_id = m.id AND g.flag = 'gifted_time')
                                       GROUP BY m.id ORDER BY f.billing_date DESC`, nzToday, nzToday))
      .map(r => ({ ...r, detail: "$" + (+r.amount || 0).toFixed(2) + " failed on " + r.billing_date + (r.reason ? " (" + r.reason + ")" : "") + (r.owing > 0 ? ". Owes $" + (+r.owing).toFixed(2) + " in total." : ".") })));
    // Call backs promised for today or earlier.
    push("call_back", (await all(`SELECT t.id task_id, t.member_id, t.lead_id, coalesce(m.first_name || ' ' || coalesce(m.last_name,''), l.name) name,
                                    coalesce(m.mobile, l.mobile) mobile, t.outcome_note, t.due_on
                                  FROM tasks t LEFT JOIN members m ON m.id = t.member_id LEFT JOIN leads l ON l.id = t.lead_id
                                  WHERE t.kind = 'call_back' AND t.outcome IS NULL AND t.due_on <= ? ORDER BY t.due_on`, nzToday))
      .map(r => ({ ...r, detail: r.outcome_note || "Promised a call back" })));
  }

  if (!own) {
    // Passport pays per visit, matched on the Fitness Passport ID. These two lists stop visits going unpaid.
    push("fp_id_gm", (await all(`SELECT t.id task_id, t.member_id, m.first_name || ' ' || coalesce(m.last_name,'') name, m.mobile, m.fp_id, t.due_on
                                 FROM tasks t JOIN members m ON m.id = t.member_id
                                 WHERE t.kind = 'fp_id_gm' AND t.outcome IS NULL ORDER BY t.due_on`))
      .map(r => ({ ...r, gm_url: (env.GM_SITE || "") + "/member/view/" + r.member_id,
                   detail: r.fp_id ? `Type ${r.fp_id} into GymMaster: their profile, Additional Details, Fitness Passport ID.` : "Get their Passport ID first, then type it into GymMaster." })));
    const loaded = (await one("SELECT value FROM settings WHERE key = 'fp_ids_loaded'"))?.value === "1";
    push("fp_missing", (await all(`SELECT m.id member_id, m.first_name || ' ' || coalesce(m.last_name,'') name, m.mobile,
                                     (SELECT count(*) FROM visits v WHERE v.member_id = m.id AND v.at >= date('now','-30 days')) recent
                                   FROM members m JOIN member_flags f ON f.member_id = m.id AND f.flag = 'passport'
                                   WHERE m.status = 'active' AND (m.fp_id IS NULL OR m.fp_id = '')
                                     ${loaded ? "" : "AND EXISTS (SELECT 1 FROM activity a WHERE a.member_id = m.id AND a.kind = 'sale')"}
                                   ORDER BY recent DESC, m.joined_on DESC LIMIT 200`))
      .map(r => ({ ...r, need_fp: true,
                   detail: (r.recent ? r.recent + " visits in the last 30 days that Passport can't pay for. " : "") + "Ask for their Passport card or app and add the ID." })));
  }

  if (!own) {
    // Gave notice in the last few days: a call can keep some of them.
    push("cancel_save", (await all(`SELECT m.id member_id, m.first_name || ' ' || coalesce(m.last_name,'') name, m.mobile, c.type_name, c.cancel_date, c.reason
                                    FROM gm_cancels c JOIN members m ON m.id = c.member_id
                                    WHERE c.first_seen >= date(?, '-3 days') AND m.status = 'active'
                                      AND NOT EXISTS (SELECT 1 FROM tasks t WHERE t.kind = 'cancel_save' AND t.member_id = m.id AND t.outcome IS NOT NULL AND t.done_at >= datetime('now','-7 days'))
                                    GROUP BY m.id ORDER BY c.first_seen DESC`, nzToday))
      .map(r => ({ ...r, detail: "Cancelling " + r.type_name + (r.cancel_date ? " from " + r.cancel_date : "") + (r.reason ? ". Reason: " + r.reason : "") + ". Worth a call to see if a hold or a cheaper plan keeps them." })));
    // Holds finishing in the next 3 days: welcome them back.
    push("hold_ending", (await all(`SELECT m.id member_id, m.first_name || ' ' || coalesce(m.last_name,'') name, m.mobile, h.ends, h.reason
                                    FROM gm_holds h JOIN members m ON m.id = h.member_id
                                    WHERE h.ends BETWEEN ? AND date(?, '+3 days')
                                      AND NOT EXISTS (SELECT 1 FROM tasks t WHERE t.kind = 'hold_ending' AND t.member_id = m.id AND t.outcome IS NOT NULL AND t.done_at >= datetime('now','-14 days'))
                                    GROUP BY m.id ORDER BY h.ends`, nzToday, nzToday))
      .map(r => ({ ...r, detail: "Hold ends " + r.ends + (r.reason ? " (" + r.reason + ")" : "") + ". A quick welcome back message helps." })));
  }

  if (can.collections) {
    push("blocked", (await all(`SELECT f.member_id, m.first_name || ' ' || coalesce(m.last_name,'') name, m.mobile, f.detail
                                FROM member_flags f JOIN members m ON m.id = f.member_id WHERE f.flag = 'blocked' ORDER BY f.set_at`)));
  }

  if (!own) {
    push("no_tag", (await all(`SELECT m.id member_id, m.first_name || ' ' || coalesce(m.last_name,'') name, m.mobile, p.gm_type_name plan
                               FROM members m JOIN memberships ms ON ms.member_id = m.id AND ms.status = 'current'
                               JOIN plans p ON p.id = ms.plan_id
                               WHERE m.status = 'active' AND m.key_tag IS NULL AND p.family IN ('perform','classes','daily','recovery','transporter')
                                 AND m.joined_on >= date(?, '-30 days')
                                 -- Only people added in the Core: GymMaster's export doesn't include tag numbers yet.
                                 AND EXISTS (SELECT 1 FROM activity a WHERE a.member_id = m.id AND a.kind = 'sale')
                               ORDER BY m.joined_on DESC`, nzToday))
      .map(r => ({ ...r, detail: "Joined recently on " + r.plan + ". Give them a tag when they're in." })));
  }

  if (!own) {
    // Added in the Core in the last 30 days without a photo.
    push("no_photo", (await all(`SELECT m.id member_id, m.first_name || ' ' || coalesce(m.last_name,'') name, m.mobile, m.joined_on
                                 FROM members m
                                 WHERE m.status = 'active' AND m.joined_on >= date(?, '-30 days')
                                   AND EXISTS (SELECT 1 FROM activity a WHERE a.member_id = m.id AND a.kind = 'sale')
                                   AND NOT EXISTS (SELECT 1 FROM member_photos p WHERE p.member_id = m.id)
                                   AND NOT EXISTS (SELECT 1 FROM tasks t WHERE t.kind = 'no_photo' AND t.member_id = m.id AND t.outcome IS NOT NULL)
                                 ORDER BY m.joined_on DESC`, nzToday))
      .map(r => ({ ...r, need_photo: true, detail: "Joined " + r.joined_on + ". Take their photo next time they're in." })));
  }

  jobs.sort((a, b) => a.order - b.order);
  const doneToday = await one(`SELECT count(*) n FROM tasks WHERE outcome IS NOT NULL AND date(done_at) = date('now') ${own ? "AND done_by = ?" : ""}`, ...(own ? [who.id] : []));
  const joinedToday = await one("SELECT count(*) n FROM members WHERE joined_on = ?", nzToday);
  const out = { date: nzToday, jobs, done_today: doneToday.n, joined_today: joinedToday.n };
  if (!own) {
    out.recent = await all(`SELECT m.id, m.first_name, m.last_name, m.joined_on, p.gm_type_name plan, m.lead_source
                            FROM members m LEFT JOIN memberships ms ON ms.member_id = m.id AND ms.status = 'current'
                            LEFT JOIN plans p ON p.id = ms.plan_id
                            WHERE m.joined_on IS NOT NULL ORDER BY m.joined_on DESC, m.id DESC LIMIT 8`);
  }
  return out;
}

function leadKindLabel(k) {
  return ({ trial: "Trial", free_pt: "Free PT", unfinished_signup: "Started signing up online", bring_a_mate: "Bring a Mate",
            app_upgrade: "Upgrade request in the app", prospect: "Prospect in GymMaster", website_form: "Website enquiry", meta_form: "Meta ad form", walk_in: "Walk in" })[k] || k;
}

// One tap after a call or a job. Moves the lead along and logs who did what.
async function recordOutcome(env, who, can, b) {
  const db = env.DB;
  const outcome = String(b.outcome || "");
  if (!OUTCOMES.includes(outcome)) return { ok: false, error: "Pick what happened." };
  const kind = String(b.kind || "");
  if (!JOBS[kind]) return { ok: false, error: "Unknown job." };
  if (can.members === "own" && kind !== "new_lead") return { ok: false, error: "No access" };
  const memberId = b.member_id ? Number(b.member_id) : null, leadId = b.lead_id ? Number(b.lead_id) : null;
  if (leadId && can.members === "own") {
    const l = await db.prepare("SELECT assigned_to FROM leads WHERE id = ?").bind(leadId).first();
    if (!l || l.assigned_to !== who.id) return { ok: false, error: "Not one of your leads" };
  }
  const note = String(b.note || "").trim().slice(0, 500) || null;
  const nzToday = nzDateTime(new Date()).slice(0, 10);
  const stmts = [];
  if (b.task_id) {
    stmts.push(db.prepare("UPDATE tasks SET outcome = ?, outcome_note = coalesce(?, outcome_note), done_by = ?, done_at = datetime('now') WHERE id = ? AND outcome IS NULL")
      .bind(outcome, note, who.id, Number(b.task_id)));
  } else if (memberId && ["missing_billing", "fp_id_gm"].includes(kind)
             && await db.prepare("SELECT 1 FROM tasks WHERE kind = ? AND member_id = ? AND outcome IS NULL").bind(kind, memberId).first()) {
    // Ticked off from the add member screen: close the open task rather than adding another.
    stmts.push(db.prepare("UPDATE tasks SET outcome = ?, outcome_note = coalesce(?, outcome_note), done_by = ?, done_at = datetime('now') WHERE kind = ? AND member_id = ? AND outcome IS NULL")
      .bind(outcome, note, who.id, kind, memberId));
  } else {
    stmts.push(db.prepare(`INSERT INTO tasks(kind, member_id, lead_id, owner_role, assigned_to, due_on, outcome, outcome_note, done_by, done_at)
                           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`)
      .bind(kind, memberId, leadId, JOBS[kind].owner, who.id, nzToday, outcome, note, who.id));
  }
  if (leadId) {
    const stage = { joined: "joined", not_interested: "lost", joining_at_desk: "trial" }[outcome] || "contacted";
    stmts.push(db.prepare(`UPDATE leads SET stage = CASE WHEN stage IN ('joined','lost') THEN stage ELSE ? END,
                           contacted_at = coalesce(contacted_at, datetime('now')),
                           closed_at = CASE WHEN ? IN ('joined','lost') THEN datetime('now') ELSE closed_at END WHERE id = ?`)
      .bind(stage, stage, leadId));
  }
  if (kind === "fp_id_gm" && (outcome === "fp_in_gm" || outcome === "done") && memberId) {
    stmts.push(db.prepare("UPDATE members SET fp_id_in_gm = 1, updated_at = datetime('now') WHERE id = ? AND fp_id IS NOT NULL").bind(memberId));
  }
  if (outcome === "call_back") {
    const when = /^\d{4}-\d{2}-\d{2}$/.test(b.call_back_on || "") ? b.call_back_on : nzDateTime(new Date(Date.now() + 86400_000)).slice(0, 10);
    stmts.push(db.prepare("INSERT INTO tasks(kind, member_id, lead_id, owner_role, assigned_to, due_on, outcome_note) VALUES ('call_back', ?, ?, 'reception', ?, ?, ?)")
      .bind(memberId, leadId, who.id, when, note || "Call back"));
  }
  stmts.push(db.prepare("INSERT INTO activity(member_id, lead_id, staff_id, kind, detail) VALUES (?, ?, ?, 'call', ?)")
    .bind(memberId, leadId, who.id, `${JOBS[kind].label}: ${outcome.replace(/_/g, " ")}${note ? ". " + note : ""}`));
  await db.batch(stmts);
  return { ok: true };
}

/* ---------------- leads ---------------- */

async function staffList(env, can) {
  if (!can.members) return { error: "No access" };
  return { staff: (await env.DB.prepare("SELECT id, name, role FROM staff WHERE active = 1 ORDER BY list_order, name").all()).results };
}

async function listLeads(env, who, can, q) {
  if (!can.members) return { error: "No access" };
  const where = ["(l.notes IS NULL OR l.notes <> 'gymmaster_import')", "l.kind <> 'free_pt'"], binds = [];
  if (can.members === "own") { where.push("l.assigned_to = ?"); binds.push(who.id); }
  const kind = q.get("kind"); if (kind) { where.push("l.kind = ?"); binds.push(kind); }
  const days = Math.min(+(q.get("days") || 30), 365);
  const stage = q.get("stage");
  if (stage) { where.push("l.stage = ?"); binds.push(stage); }
  else where.push("((l.stage NOT IN ('joined','lost','cold')) OR coalesce(l.closed_at, l.created_at) >= datetime('now', ?))"), binds.push(`-${days} days`);
  const s = String(q.get("q") || "").trim().toLowerCase();
  if (s.length >= 2) { where.push("(lower(coalesce(l.name,'')) LIKE ? OR lower(coalesce(l.email,'')) LIKE ? OR coalesce(l.mobile,'') LIKE ?)"); binds.push("%" + s + "%", "%" + s + "%", "%" + s.replace(/\D/g, "") + "%"); }
  const rows = (await env.DB.prepare(`SELECT l.id, l.member_id, l.name, l.email, l.mobile, l.kind, l.source, l.campaign, l.stage, l.goal,
                                        l.created_at, l.contacted_at, l.assigned_to, s.name assigned_name, l.notes
                                      FROM leads l LEFT JOIN staff s ON s.id = l.assigned_to
                                      WHERE ${where.join(" AND ")} ORDER BY l.created_at DESC LIMIT 600`).bind(...binds).all()).results;
  const counts = {};
  for (const r of rows) counts[r.kind] = (counts[r.kind] || 0) + 1;
  return { leads: rows, counts };
}

async function leadDetail(env, who, can, id) {
  if (!can.members) return { error: "No access" };
  const l = await env.DB.prepare("SELECT l.*, s.name assigned_name FROM leads l LEFT JOIN staff s ON s.id = l.assigned_to WHERE l.id = ?").bind(id).first();
  if (!l) return { error: "Lead not found" };
  if (can.members === "own" && l.assigned_to !== who.id) return { error: "Not one of your leads" };
  const activity = (await env.DB.prepare(`SELECT a.kind, a.detail, a.at, s.name staff FROM activity a LEFT JOIN staff s ON s.id = a.staff_id
                                          WHERE a.lead_id = ? ORDER BY a.at DESC LIMIT 20`).bind(id).all()).results;
  return { lead: l, activity };
}

const LEAD_KINDS = ["prospect", "trial", "free_pt", "unfinished_signup", "bring_a_mate", "app_upgrade", "website_form", "meta_form", "walk_in"];

async function addLead(env, who, can, b) {
  if (!can.add) return { ok: false, error: "No access" };
  const r = await saveLead(env, { ...b, kind: b.kind || "walk_in" }, who);
  return r;
}

async function updateLead(env, who, can, id, b) {
  if (!can.members) return { ok: false, error: "No access" };
  const db = env.DB;
  const l = await db.prepare("SELECT * FROM leads WHERE id = ?").bind(id).first();
  if (!l) return { ok: false, error: "Lead not found" };
  if (can.members === "own" && l.assigned_to !== who.id) return { ok: false, error: "Not one of your leads" };
  const stmts = [];
  if (b.assigned_to !== undefined && can.add) {
    stmts.push(db.prepare("UPDATE leads SET assigned_to = ? WHERE id = ?").bind(b.assigned_to ? Number(b.assigned_to) : null, id));
    stmts.push(db.prepare("INSERT INTO activity(lead_id, member_id, staff_id, kind, detail) VALUES (?, ?, ?, 'note', ?)")
      .bind(id, l.member_id, who.id, "Assigned to " + (b.assigned_name || "nobody")));
  }
  if (b.stage && ["new", "contacted", "trial", "joined", "lost", "cold"].includes(b.stage)) {
    stmts.push(db.prepare(`UPDATE leads SET stage = ?, closed_at = CASE WHEN ? IN ('joined','lost') THEN datetime('now') ELSE NULL END WHERE id = ?`)
      .bind(b.stage, b.stage, id));
  }
  if (b.note) stmts.push(db.prepare("INSERT INTO activity(lead_id, member_id, staff_id, kind, detail) VALUES (?, ?, ?, 'note', ?)")
    .bind(id, l.member_id, who.id, String(b.note).slice(0, 500)));
  if (!stmts.length) return { ok: false, error: "Nothing to change" };
  await db.batch(stmts);
  return { ok: true };
}

// Shared by the staff "add lead" button and the public intake.
async function saveLead(env, b, who) {
  const db = env.DB;
  const clean = s => String(s ?? "").trim().replace(/\s+/g, " ").slice(0, 200);
  const kind = LEAD_KINDS.includes(b.kind) ? b.kind : "website_form";
  const name = clean(b.name || [b.first, b.last].filter(Boolean).join(" "));
  const email = clean(b.email).toLowerCase() || null;
  const mobile = normMobile(b.mobile || b.phone);
  if (!name && !email && !mobile) return { ok: false, error: "Need at least a name and a way to contact them." };
  // Match to an existing member so the lead lands on the right profile.
  let member = null;
  if (email || mobile) {
    member = await db.prepare("SELECT id, first_name, last_name FROM members WHERE (? IS NOT NULL AND lower(email) = ?) OR (? IS NOT NULL AND mobile = ?) LIMIT 1")
      .bind(email, email, mobile, mobile).first();
  }
  // Same person, same kind, still open in the last 14 days: update it instead of making a second lead.
  const open = await db.prepare(`SELECT id FROM leads WHERE kind = ? AND stage NOT IN ('joined','lost') AND created_at >= datetime('now','-14 days')
                                 AND ((? IS NOT NULL AND lower(email) = ?) OR (? IS NOT NULL AND mobile = ?)) LIMIT 1`)
    .bind(kind, email, email, mobile, mobile).first();
  if (open) {
    await db.prepare("INSERT INTO activity(lead_id, member_id, staff_id, kind, detail) VALUES (?, ?, ?, 'note', ?)")
      .bind(open.id, member && member.id, who ? who.id : null, "Came in again: " + leadKindLabel(kind) + (b.notes ? ". " + clean(b.notes) : "")).run();
    return { ok: true, id: open.id, repeat: true };
  }
  let assigned = b.assigned_to ? Number(b.assigned_to) : null;
  // Free PT leads wait for Tim to hand them out on the PT leads page.
  if (kind === "free_pt") assigned = null;
  const stage = kind === "trial" ? "trial" : "new";
  const row = await db.prepare(`INSERT INTO leads(member_id, name, email, mobile, kind, source, campaign, stage, assigned_to, goal, notes)
                                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING id`)
    .bind(member && member.id, name || null, email, mobile, kind, clean(b.source) || null, clean(b.campaign) || null, stage, assigned,
          clean(b.goal) || null, clean(b.notes) || null).first();
  await db.prepare("INSERT INTO activity(lead_id, member_id, staff_id, kind, detail) VALUES (?, ?, ?, 'note', ?)")
    .bind(row.id, member && member.id, who ? who.id : null, (who ? "Added by " + who.name : "Came in from the website") + ": " + leadKindLabel(kind)).run();
  if (kind === "free_pt") await db.prepare("INSERT OR IGNORE INTO pt_leads(lead_id, reason, pt_status, updated_at) VALUES (?, ?, 'new', datetime('now'))").bind(row.id, clean(b.notes || b.goal) || null).run();
  return { ok: true, id: row.id, member_id: member && member.id, assigned_to: assigned };
}

// New trainers first, then whoever has the fewest open leads.
async function nextTrainer(db) {
  const r = await db.prepare(`SELECT s.id FROM staff s
                              WHERE s.active = 1 AND s.role = 'trainer'
                              ORDER BY (SELECT count(*) FROM leads l WHERE l.assigned_to = s.id AND l.stage IN ('new','contacted')), s.list_order, s.id
                              LIMIT 1`).first();
  return r ? r.id : null;
}

// Website forms (join page drop-offs, free PT, enquiries) post here.
// Needs the X-M2-Key header to match INTAKE_KEY, and only accepts M2's own sites.
async function intake(req, env) {
  const origin = req.headers.get("Origin") || "";
  const allowed = (env.ALLOWED_ORIGINS || "https://m2club.co.nz,https://www.m2club.co.nz").split(",").map(s => s.trim());
  const cors = allowed.includes(origin) ? { "Access-Control-Allow-Origin": origin, "Vary": "Origin" } : {};
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: { ...cors, "Access-Control-Allow-Methods": "POST", "Access-Control-Allow-Headers": "Content-Type, X-M2-Key", "Access-Control-Max-Age": "86400" } });
  }
  const reply = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { ...cors, "Content-Type": "application/json", "Cache-Control": "no-store" } });
  if (req.method !== "POST") return reply({ error: "POST only" }, 405);
  if (!env.INTAKE_KEY || req.headers.get("X-M2-Key") !== env.INTAKE_KEY) return reply({ error: "Not allowed" }, 403);
  let b;
  try { b = await req.json(); } catch { return reply({ error: "Bad request" }, 400); }
  if (b.m2_check) return reply({ ok: true });   // bot trap field filled in
  if (b.kind === "passport_join") {
    const pr = await passportJoin(env, b);
    return reply(pr, pr.ok ? 200 : 400);
  }
  const r = await saveLead(env, b, null);
  return reply(r.ok ? { ok: true } : { ok: false, error: r.error }, r.ok ? 200 : 400);
}

// The join worker (m2club.co.nz/join.html) posts here after a Fitness Passport member
// signs up online. GymMaster's sign-up can't take the Fitness Passport ID, so the Core
// keeps it and puts "type the ID into GymMaster" on reception's Today list.
// Member ids in the Core are the GymMaster ids, so the nightly copy lands on the same row.
async function passportJoin(env, b) {
  const db = env.DB;
  const gmId = Number(b.gm_id);
  const fpId = cleanFpId(b.fp_id);
  const clean = s => String(s ?? "").trim().replace(/\s+/g, " ").slice(0, 120);
  if (!Number.isInteger(gmId) || gmId <= 0) return { ok: false, error: "Missing GymMaster member id" };
  if (!fpId) return { ok: false, error: "Missing or invalid Fitness Passport ID" };
  const first = clean(b.first) || "Unknown";
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Pacific/Auckland" }).format(new Date());
  const taken = await db.prepare("SELECT id, first_name, last_name FROM members WHERE fp_id = ? AND id <> ? LIMIT 1").bind(fpId, gmId).first();
  const stmts = [
    db.prepare(`INSERT INTO members(id, gm_id, first_name, last_name, email, mobile, dob, lead_source, status, joined_on, fp_id)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?)
                ON CONFLICT(id) DO UPDATE SET fp_id = coalesce(members.fp_id, excluded.fp_id), updated_at = datetime('now')`)
      .bind(gmId, gmId, first, clean(b.last) || null, clean(b.email).toLowerCase() || null, normMobile(b.mobile), clean(b.dob) || null,
            clean(b.source) || "Online signup", today, fpId),
    db.prepare("INSERT OR IGNORE INTO member_flags(member_id, flag, detail) VALUES (?, 'passport', 'Joined online')").bind(gmId),
    db.prepare("INSERT INTO activity(member_id, kind, detail) VALUES (?, 'note', ?)")
      .bind(gmId, "Joined online with Fitness Passport, ID " + fpId + (taken ? ". Same ID is already on " + [taken.first_name, taken.last_name].filter(Boolean).join(" ") + ", check their card" : "")),
  ];
  const open = await db.prepare("SELECT 1 FROM tasks WHERE kind = 'fp_id_gm' AND member_id = ? AND outcome IS NULL").bind(gmId).first();
  if (!open) stmts.push(db.prepare("INSERT INTO tasks(kind, member_id, owner_role, due_on) VALUES ('fp_id_gm', ?, 'reception', ?)").bind(gmId, today));
  await db.batch(stmts);
  return { ok: true, member_id: gmId, duplicate_id: !!taken };
}

/* ---------------- member edits ---------------- */

const EDITABLE_FLAGS = { gifted_time: "owner_manager", do_not_contact: "staff", corporate: "owner_manager", student: "staff", passport: "staff" };

async function updateMember(env, who, can, id, what, b) {
  if (!can.members) return { ok: false, error: "No access" };
  const db = env.DB;
  const m = await db.prepare("SELECT * FROM members WHERE id = ?").bind(id).first();
  if (!m) return { ok: false, error: "Member not found" };
  if (can.members === "own" && m.trainer_id !== who.id) return { ok: false, error: "Not one of your clients" };
  if (what === "notes") {
    const text = String(b.text || "").trim().slice(0, 1000);
    if (!text) return { ok: false, error: "Write a note first." };
    await db.prepare("INSERT INTO activity(member_id, staff_id, kind, detail) VALUES (?, ?, ?, ?)")
      .bind(id, who.id, b.kind === "call" ? "call" : "note", text).run();
    return { ok: true };
  }
  if (!can.add) return { ok: false, error: "Trainers can add notes only." };
  if (what === "flags") {
    const flag = String(b.flag || ""), rule = EDITABLE_FLAGS[flag];
    if (!rule) return { ok: false, error: "That flag can't be changed here." };
    if (rule === "owner_manager" && !can.collections) return { ok: false, error: "Only owners and the manager can change that." };
    if (b.on) {
      await db.batch([
        db.prepare("INSERT OR REPLACE INTO member_flags(member_id, flag, detail, set_by) VALUES (?, ?, ?, ?)").bind(id, flag, String(b.detail || "").slice(0, 100) || null, who.id),
        db.prepare("INSERT INTO activity(member_id, staff_id, kind, detail) VALUES (?, ?, 'note', ?)").bind(id, who.id, "Flag on: " + flag.replace(/_/g, " ")),
      ]);
    } else {
      await db.batch([
        db.prepare("DELETE FROM member_flags WHERE member_id = ? AND flag = ?").bind(id, flag),
        db.prepare("INSERT INTO activity(member_id, staff_id, kind, detail) VALUES (?, ?, 'note', ?)").bind(id, who.id, "Flag off: " + flag.replace(/_/g, " ")),
      ]);
    }
    return { ok: true };
  }
  if (what === "details") {
    const fields = { email: v => String(v).trim().toLowerCase(), mobile: normMobile, goal: v => String(v).trim(), lead_source: v => String(v).trim(),
                     preferred_name: v => String(v).trim(), emergency_name: v => String(v).trim(), emergency_phone: normMobile };
    const sets = [], binds = [], changed = [];
    let fpChanged = false;
    if (b.fp_id !== undefined) {
      const fp = cleanFpId(b.fp_id);
      if (String(b.fp_id).trim() && !fp) return { ok: false, error: "That Fitness Passport ID doesn't look right. It's the number on their Passport card or app." };
      if (fp && fp !== m.fp_id) {
        const taken = await db.prepare("SELECT first_name, last_name FROM members WHERE fp_id = ? AND id <> ? LIMIT 1").bind(fp, id).first();
        if (taken) return { ok: false, error: `Fitness Passport ID ${fp} is already on ${taken.first_name} ${taken.last_name || ""}. Check the card.` };
        sets.push("fp_id = ?", "fp_id_in_gm = 0"); binds.push(fp); changed.push("Fitness Passport ID"); fpChanged = true;
      }
    }
    for (const [k, fn] of Object.entries(fields)) {
      if (b[k] === undefined) continue;
      const v = fn(b[k]) || null;
      if (k === "email" && v && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return { ok: false, error: "That email address doesn't look right." };
      if (v === m[k]) continue;
      sets.push(k + " = ?"); binds.push(v); changed.push(k.replace(/_/g, " "));
    }
    if (!sets.length) return { ok: true, unchanged: true };
    const batch = [
      db.prepare(`UPDATE members SET ${sets.join(", ")}, updated_at = datetime('now') WHERE id = ?`).bind(...binds, id),
      db.prepare("INSERT INTO activity(member_id, staff_id, kind, detail) VALUES (?, ?, 'note', ?)").bind(id, who.id, "Updated " + changed.join(", ")),
    ];
    if (fpChanged) {
      // Close any older reminder for this person, then one fresh reminder to put it in GymMaster.
      batch.push(db.prepare("UPDATE tasks SET outcome = 'done', outcome_note = 'Replaced by a newer Passport ID', done_by = ?, done_at = datetime('now') WHERE kind = 'fp_id_gm' AND member_id = ? AND outcome IS NULL").bind(who.id, id));
      batch.push(db.prepare("INSERT INTO tasks(kind, member_id, owner_role, due_on) VALUES ('fp_id_gm', ?, 'reception', date('now'))").bind(id));
      batch.push(db.prepare("INSERT OR IGNORE INTO member_flags(member_id, flag, set_by) VALUES (?, 'passport', ?)").bind(id, who.id));
    }
    await db.batch(batch);
    const notes = [];
    if (changed.includes("email") || changed.includes("mobile")) notes.push("Change it in GymMaster too, so emails and texts still reach them.");
    if (fpChanged) notes.push("Now type the Passport ID into GymMaster (Additional Details). It's on Today until it's done.");
    return { ok: true, note: notes.join(" ") || null };
  }
  return { ok: false, error: "Unknown change" };
}

/* ---------------- nightly sync from GymMaster ---------------- */

async function syncMembers(env) {
  const db = env.DB;
  const started = new Date().toISOString();
  const log = await db.prepare("INSERT INTO sync_log(source, started_at) VALUES ('gymmaster_members', ?) RETURNING id").bind(started).first();
  try {
    if (!env.GM_STAFF_KEY) throw new Error("GM_STAFF_KEY is not set");
    const last = await db.prepare(`SELECT max(started_at) t FROM sync_log WHERE source = 'gymmaster_members' AND ok = 1`).first();
    // Look back a day past the last good run so nothing slips between runs.
    const since = last && last.t ? new Date(new Date(last.t).getTime() - 86400_000) : new Date(Date.now() - 7 * 86400_000);
    const when = nzDateTime(since);
    const n = await H2.rosterDelta(env, when);
    const list = [];
    const stmts = [];
    for (const g of list) {
      const id = +g.id;
      if (!id) continue;
      const first = g.firstname ?? g.first_name ?? "";
      const last = g.surname ?? g.lastname ?? g.last_name ?? "";
      const email = (g.email || "").toLowerCase() || null;
      const mobile = normMobile(g.cellphone ?? g.mobile ?? g.phone ?? "");
      // GymMaster's name for the Fitness Passport ID field: confirm on the first real sync.
      const fp = cleanFpId(g.fitnesspassportid ?? g.fitness_passport_id ?? g.fitnesspassport_id ?? g.fpid ?? "") || null;
      stmts.push(db.prepare(`INSERT INTO members(id, gm_id, first_name, last_name, email, mobile, joined_on, status, fp_id, fp_id_in_gm)
                             VALUES (?, ?, ?, ?, ?, ?, ?, 'prospect', ?, ?)
                             ON CONFLICT(id) DO UPDATE SET first_name = excluded.first_name, last_name = excluded.last_name,
                               email = coalesce(excluded.email, members.email), mobile = coalesce(excluded.mobile, members.mobile),
                               -- GymMaster is what Passport is paid from, so its ID wins while it runs the doors.
                               fp_id_in_gm = CASE WHEN excluded.fp_id IS NOT NULL THEN 1 ELSE members.fp_id_in_gm END,
                               fp_id = coalesce(excluded.fp_id, members.fp_id),
                               updated_at = datetime('now')`)
        .bind(id, id, first || "Unknown", last, email, mobile, g.joindate || null, fp, fp ? 1 : 0));
    }
    for (let i = 0; i < stmts.length; i += 50) await db.batch(stmts.slice(i, i + 50));
    await db.prepare("UPDATE sync_log SET finished_at = ?, rows_in = ?, rows_changed = ?, ok = 1 WHERE id = ?")
      .bind(new Date().toISOString(), n, n, log.id).run();
    return { ok: true, rows: n, since: when };
  } catch (e) {
    await db.prepare("UPDATE sync_log SET finished_at = ?, ok = 0, error = ? WHERE id = ?")
      .bind(new Date().toISOString(), String(e.message || e).slice(0, 500), log.id).run();
    return { ok: false, error: String(e.message || e) };
  }
}

// $250 or more owing: blocked at the doors, in the app and from class bookings,
// until paid. Gifted-time members are never blocked or chased.
async function applyBlockRule(env) {
  const db = env.DB;
  const limit = +((await db.prepare("SELECT value FROM settings WHERE key = 'block_at_balance'").first())?.value || 250);
  await db.batch([
    db.prepare(`INSERT OR IGNORE INTO member_flags(member_id, flag, detail)
                SELECT b.member_id, 'blocked', 'Owes $' || printf('%.2f', b.balance_owing)
                FROM billing_accounts b
                WHERE b.balance_owing >= ?
                  AND NOT EXISTS (SELECT 1 FROM member_flags f WHERE f.member_id = b.member_id AND f.flag = 'gifted_time')`).bind(limit),
    db.prepare(`DELETE FROM member_flags WHERE flag = 'blocked' AND member_id IN
                (SELECT member_id FROM billing_accounts WHERE balance_owing < ?)`).bind(limit),
  ]);
}

/* ---------------- staff and access (owners) ---------------- */
const ROLES = ["owner", "manager", "reception", "trainer", "coach"];

async function staffAdmin(env, can) {
  if (!can.settings) return { error: "Only Taylor and Tim can manage staff." };
  const staff = (await env.DB.prepare(`SELECT s.id, s.name, s.email, s.role, s.active, s.list_order,
                                         (SELECT count(*) FROM leads l WHERE l.assigned_to = s.id AND l.stage IN ('new','contacted')) open_leads
                                       FROM staff s ORDER BY s.active DESC, s.list_order, s.name`).all()).results;
  return { staff, roles: ROLES };
}

async function saveStaff(env, who, can, b) {
  if (!can.settings) return { ok: false, error: "Only Taylor and Tim can manage staff." };
  if (b.action === "remove") {
    // Someone who has left: take them out completely. Their history stays, just without their name on it.
    const id = +b.id;
    if (!id || id === who.id) return { ok: false, error: "You can't remove yourself." };
    const st = await env.DB.prepare("SELECT id, role FROM staff WHERE id = ?").bind(id).first();
    if (!st) return { ok: false, error: "Not found" };
    if (st.role === "owner") return { ok: false, error: "Owners can't be removed here." };
    const db = env.DB, n = (t, c) => db.prepare(`UPDATE ${t} SET ${c} = NULL WHERE ${c} = ?`).bind(id);
    await db.batch([
      db.prepare("DELETE FROM shifts WHERE staff_id = ?").bind(id), db.prepare("DELETE FROM shift_requests WHERE staff_id = ?").bind(id),
      n("shifts", "created_by"), n("shift_requests", "decided_by"), n("leads", "assigned_to"), n("tasks", "assigned_to"), n("tasks", "done_by"),
      n("activity", "staff_id"), n("member_flags", "set_by"), n("key_tags", "assigned_by"), n("sales", "staff_id"), n("members", "trainer_id"),
      n("member_photos", "taken_by"), db.prepare("DELETE FROM staff WHERE id = ?").bind(id),
    ]);
    return { ok: true, removed: true };
  }
  const name = String(b.name || "").trim(), email = String(b.email || "").trim().toLowerCase(), role = String(b.role || "");
  const active = b.active === false || b.active === 0 ? 0 : 1, order = Number.isFinite(+b.list_order) ? +b.list_order : 100;
  if (!name) return { ok: false, error: "Add their name." };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, error: "That email doesn't look right. It's what they sign in with." };
  if (!ROLES.includes(role)) return { ok: false, error: "Pick a role." };
  if (b.id && +b.id === who.id && (role !== "owner" || !active)) return { ok: false, error: "You can't take away your own owner access." };
  const clash = await env.DB.prepare("SELECT id FROM staff WHERE lower(email) = ? AND id <> ?").bind(email, +b.id || 0).first();
  if (clash) return { ok: false, error: "Someone already signs in with that email." };
  if (b.id) {
    await env.DB.prepare("UPDATE staff SET name = ?, email = ?, role = ?, active = ?, list_order = ? WHERE id = ?").bind(name, email, role, active, order, +b.id).run();
  } else {
    await env.DB.prepare("INSERT INTO staff(name, email, role, active, list_order) VALUES (?, ?, ?, ?, ?)").bind(name, email, role, active, order).run();
  }
  return { ok: true, outsideDomain: !email.endsWith("@m2club.co.nz") };
}

/* ---------------- GymMaster live access ---------------- */
// Portal API calls. "low" = GM_API_KEY, "high" = GM_STAFF_KEY, "token" = act as a member
// (high key + member id -> short-lived member token, like the join worker's chase).
const GM_ROOT = "https://m2trainingclub.gymmasteronline.com/portal/api";
async function gmCall(env, version, path, { auth = "low", member = null, params = {}, method = "GET", body = null } = {}) {
  const u = new URL(GM_ROOT + "/" + version + path);
  const key = auth === "low" ? env.GM_API_KEY : env.GM_STAFF_KEY;
  if (!key) throw new Error(auth === "low" ? "GM_API_KEY is not set" : "GM_STAFF_KEY is not set");
  let token = null;
  if (member) token = await gmMemberToken(env, member);
  const all = { api_key: key, ...(token ? { token } : {}), ...params };
  let init = { method };
  if (method === "GET") for (const [k, v] of Object.entries(all)) { if (v !== undefined && v !== null && v !== "") u.searchParams.set(k, v); }
  else {
    // GymMaster's documented way: keys in headers, JSON body (the keys go in the body too for older endpoints).
    const headers = { "Content-Type": "application/json", "X-GM-API-KEY": key };
    if (token) headers["X-GM-AUTH"] = token;
    init = { method, headers, body: JSON.stringify({ ...all, ...(body || {}) }) };
  }
  const r = await fetch(u.toString(), init);
  const t = await r.text();
  try { return JSON.parse(t); } catch { return { error: "GymMaster replied " + r.status }; }
}
const tokenCache = new Map();
async function gmMemberToken(env, memberId) {
  const hit = tokenCache.get(memberId);
  if (hit && hit.exp > Date.now()) return hit.token;
  const f = new URLSearchParams({ api_key: env.GM_STAFF_KEY, memberid: String(memberId) });
  const d = await fetch(GM_ROOT + "/v1/login", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: f }).then(r => r.json());
  const token = d && d.result && d.result.token;
  if (!token) throw new Error("GymMaster wouldn't open that member (" + (d.error || "no token") + ")");
  tokenCache.set(memberId, { token, exp: Date.now() + 10 * 60_000 });
  return token;
}

// Owner-only window into GymMaster's raw replies, for building and fixing the data feeds.
const PROBE_PATHS = ["/booking/classes/schedule", "/booking/classes/filter_options", "/booking/classes", "/member/outstandingbalance", "/member/memberships",
  "/member/bookings", "/member/bookings/past", "/member/visits/monthly", "/member/visits", "/member/accounthistory", "/member/profile", "/settings", "/companies", "/memberships", "/members", "/prospects", "/visits"];
async function gmProbe(env, can, q) {
  if (!can.settings) return { error: "Owners only" };
  const v = q.get("v") === "v2" ? "v2" : "v1", path = q.get("path") || "";
  const ok = PROBE_PATHS.includes(path) || /^\/booking\/classes\/\d+(\/attendees)?$/.test(path);
  if (!ok) return { error: "Path not allowed" };
  const params = {};
  for (const [k, val] of q) if (!["v", "path", "auth", "member"].includes(k)) params[k] = val;
  try {
    const d = await gmCall(env, v, path, { auth: q.get("auth") === "high" ? "high" : "low", member: q.get("member") ? +q.get("member") : null, params });
    return { ok: true, data: d };
  } catch (e) { return { ok: false, error: String(e.message || e) }; }
}

// Owner-only: does the GymMaster Report API answer with the keys we already have?
async function gmReportProbe(env, q) {
  const out = {};
  const path = q.get("path") || "/api/v2/report/standard_report/list?predefined_only=true";
  if (!/^\/api\/v2\/report\//.test(path)) return { error: "Report paths only" };
  for (const [name, key] of [["low", env.GM_API_KEY], ["high", env.GM_STAFF_KEY], ["report", env.GM_REPORT_KEY]]) {
    if (!key) { out[name] = "not set"; continue; }
    try {
      const init = { headers: { "X-GM-API-KEY": key, "Accept": "application/json" } };
      if (q.get("body")) { init.method = "POST"; init.body = q.get("body"); init.headers["Content-Type"] = "application/json"; }
      const r = await fetch(env.GM_SITE + path, init);
      const t = await r.text();
      out[name] = { status: r.status, body: t.slice(0, +(q.get("n") || 1500)) };
    } catch (e) { out[name] = String(e.message || e); }
  }
  return out;
}

/* ---------------- settings (owners) ---------------- */
// The club's rules live in the settings table so they can change without new code.
const SETTINGS = [
  { key: "block_at_balance", group: "Money owed", label: "Block at the doors, in the app and from classes when a member owes ($)", type: "money" },
  { key: "settle_pct_upto_1500", group: "Money owed", label: "Settlement offer when owing $1,500 or less (% of the debt)", type: "pct" },
  { key: "settle_pct_over_1500", group: "Money owed", label: "Settlement offer when owing more than $1,500 (% of the debt)", type: "pct" },
  { key: "referral_min_amount", group: "Money owed", label: "Only refer to Marshall Freeman from ($)", type: "money" },
  { key: "class_capacity", group: "Classes", label: "Spots per class", type: "int" },
  { key: "late_cancel_hours", group: "Classes", label: "Cancel at least this many hours before, or it's a late cancel", type: "int" },
  { key: "no_show_after_minutes", group: "Classes", label: "Mark a no-show this many minutes after the start", type: "int" },
  { key: "fy_target_ex_gst", group: "Targets", label: "Income target this financial year, excluding GST ($)", type: "money" },
  { key: "meta_budget_month", group: "Targets", label: "Meta ads budget per month ($)", type: "money" },
  { key: "fp_tiers", group: "Fitness Passport", label: "Pay rates per visit (up to visit:rate, comma between tiers, last one open)", type: "tiers" },
];

async function settingsView(env, can) {
  if (!can.settings) return { error: "Only Taylor and Tim can change settings." };
  const db = env.DB;
  const vals = Object.fromEntries((await db.prepare("SELECT key, value FROM settings").all()).results.map(r => [r.key, r.value]));
  const plans = (await db.prepare(`SELECT p.id, p.gm_type_name name, p.gm_category category, p.family, p.frequency, p.flexi, p.legacy, p.corporate, p.employer,
                                     p.includes_classes, p.includes_recovery,
                                     (SELECT count(*) FROM memberships ms WHERE ms.plan_id = p.id AND ms.status = 'current') members
                                   FROM plans p ORDER BY members DESC, p.family, p.gm_type_name`).all()).results;
  const sync = (await db.prepare("SELECT source, finished_at, ok, rows_changed, error FROM sync_log ORDER BY id DESC LIMIT 6").all()).results;
  const club = { name: "M2 Training Club", address: "8 Nugent Street, Grafton, Auckland 1023", phone: "09 558 1408", email: "reception@m2club.co.nz",
                 hours: "Mon to Fri 5am to 10pm, Sat and Sun 7am to 7pm" };
  const integrations = [
    { name: "GymMaster", status: env.GM_API_KEY && env.GM_STAFF_KEY ? "Connected" : "Keys missing", detail: "Members copied nightly at 2:15am. Sign-ups go into GymMaster first while it runs billing and doors." },
    { name: "Fitness Passport", status: env.FP_MEMBERSHIP_ID ? "Set up" : "Not set", detail: "GymMaster reports Passport check-ins until the doors move. Passport membership type " + (env.FP_MEMBERSHIP_ID || "not set") + "." },
    { name: "Ezidebit", status: { preview: "Not connected. Billing runs in preview", sandbox: "Sandbox (test money only)", ready: "Live key in, waiting for the switch", live: "Live" }[B.mode(env).kind], detail: "The Billing page shows every debit the Core would take. GymMaster keeps billing until members are moved across." },
    { name: "Xero", status: "Pushed in by Claude", detail: "Profit and loss by month, cash and bills land on Money. Ask Claude to refresh them any time." },
    { name: "Meta ads and Google Analytics", status: "Pushed in by Claude", detail: "Spend, leads and website visits by day land on Marketing." },
    { name: "Live balances", status: env.GM_STAFF_KEY ? "Connected" : "Keys missing", detail: "Every 15 minutes the Core checks 20 members' balances in GymMaster, so the $250 block and Collections stay true." },
    { name: "Live check-ins", status: env.GM_REPORT_KEY ? "Connected" : "Needs the Report API key", detail: "GymMaster's visitor log every 15 minutes, for Recent visits on Today and exact Passport counts. Add it as secret GM_REPORT_KEY." },
    { name: "PT lead form", status: "Connected", detail: "Free PT requests from the M2 PT Leads sheet are copied into Leads every night, and when an owner presses Pull in on Leads." },
    { name: "Website forms", status: env.INTAKE_KEY ? "Connected" : "Not connected yet", detail: "Leads from the website land in Leads once the intake key is set." },
    { name: "Sign-in", status: env.ACCESS_TEAM ? "Cloudflare Access, email codes" : "Not set", detail: "Who can sign in is managed in Staff and access." },
  ];
  return { settings: SETTINGS.map(s => ({ ...s, value: vals[s.key] ?? "" })), plans, sync, club, integrations };
}

async function saveSetting(env, who, can, b) {
  if (!can.settings) return { ok: false, error: "Only Taylor and Tim can change settings." };
  const def = SETTINGS.find(s => s.key === b.key);
  if (!def) return { ok: false, error: "That setting can't be changed here." };
  let v = String(b.value ?? "").trim();
  if (def.type === "tiers") {
    if (!/^(\d+:\d+(\.\d+)?)(,\s*\d+:\d+(\.\d+)?)*$/.test(v)) return { ok: false, error: "Write it like 458:7.39,919:8.21,0:11.04 (0 means no top)." };
    v = v.replace(/\s+/g, "");
  } else {
    const n = Number(v.replace(/[$,%]/g, ""));
    if (!Number.isFinite(n) || n < 0) return { ok: false, error: "That needs to be a number." };
    if (def.type === "pct" && n > 100) return { ok: false, error: "A percentage can't be more than 100." };
    v = String(def.type === "int" ? Math.round(n) : n);
  }
  await env.DB.batch([
    env.DB.prepare("INSERT INTO settings(key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value").bind(def.key, v),
    env.DB.prepare("INSERT INTO activity(staff_id, kind, detail) VALUES (?, 'note', ?)").bind(who.id, "Setting changed: " + def.label + " = " + v),
  ]);
  return { ok: true, value: v };
}

/* ---------------- reports ---------------- */
// Taylor's GymMaster favourites, rebuilt on Core data. Owners and the manager.
// Prices only show for owners.
const REPORTS = {
  current_members: { title: "Current members", dates: false,
    sql: `SELECT m.id "ID", m.first_name "First name", m.last_name "Last name", m.email "Email", m.mobile "Mobile", p.gm_type_name "Membership",
                 p.family "Plan", m.joined_on "Joined", m.total_visits_gm "Visits" #MONEY#
          FROM members m LEFT JOIN memberships ms ON ms.member_id = m.id AND ms.status = 'current' LEFT JOIN plans p ON p.id = ms.plan_id
          WHERE m.status = 'active' ORDER BY m.first_name, m.last_name` },
  new_members: { title: "New members", dates: true,
    sql: `SELECT m.id "ID", m.first_name "First name", m.last_name "Last name", m.mobile "Mobile", p.gm_type_name "Membership", m.joined_on "Joined",
                 m.lead_source "Came from", ms.sold_by "Sold by" #MONEY#
          FROM members m LEFT JOIN memberships ms ON ms.member_id = m.id AND ms.status = 'current' LEFT JOIN plans p ON p.id = ms.plan_id
          WHERE m.joined_on >= ? AND m.joined_on <= ? ORDER BY m.joined_on DESC` },
  expiring: { title: "Lock-ins and paid in full ending", dates: true, pairs: 2,
    sql: `SELECT m.id "ID", m.first_name "First name", m.last_name "Last name", m.mobile "Mobile", p.gm_type_name "Membership",
                 ms.min_term_end "Lock-in ends", ms.end_date "Membership ends" #MONEY#
          FROM members m JOIN memberships ms ON ms.member_id = m.id AND ms.status = 'current' JOIN plans p ON p.id = ms.plan_id
          WHERE (ms.min_term_end >= ? AND ms.min_term_end <= ?) OR (ms.end_date >= ? AND ms.end_date <= ?)
          ORDER BY coalesce(ms.end_date, ms.min_term_end)` },
  passport: { title: "Fitness Passport members", dates: false,
    sql: `SELECT m.id "ID", m.first_name "First name", m.last_name "Last name", m.fp_id "Fitness Passport ID",
                 CASE WHEN m.fp_id_in_gm = 1 THEN 'Yes' ELSE 'No' END "In GymMaster", m.joined_on "Joined", m.total_visits_gm "Visits"
          FROM members m JOIN member_flags f ON f.member_id = m.id AND f.flag = 'passport'
          WHERE m.status = 'active' ORDER BY (m.fp_id IS NULL) DESC, m.first_name` },
  linked: { title: "Linked members (shared email or mobile)", dates: false,
    sql: `SELECT m.id "ID", m.first_name "First name", m.last_name "Last name", m.email "Email", m.mobile "Mobile", p.gm_type_name "Membership"
          FROM members m LEFT JOIN memberships ms ON ms.member_id = m.id AND ms.status = 'current' LEFT JOIN plans p ON p.id = ms.plan_id
          WHERE m.status = 'active' AND (
            (m.email IS NOT NULL AND m.email <> '' AND m.email IN (SELECT email FROM members WHERE status = 'active' AND email <> '' GROUP BY email HAVING count(*) > 1))
            OR (m.mobile IS NOT NULL AND m.mobile IN (SELECT mobile FROM members WHERE status = 'active' AND mobile IS NOT NULL GROUP BY mobile HAVING count(*) > 1)))
          ORDER BY m.email, m.mobile` },
  missing_contact: { title: "No email or mobile", dates: false,
    sql: `SELECT m.id "ID", m.first_name "First name", m.last_name "Last name", m.email "Email", m.mobile "Mobile", p.gm_type_name "Membership"
          FROM members m LEFT JOIN memberships ms ON ms.member_id = m.id AND ms.status = 'current' LEFT JOIN plans p ON p.id = ms.plan_id
          WHERE m.status = 'active' AND (coalesce(m.email,'') = '' OR coalesce(m.mobile,'') = '') ORDER BY m.first_name` },
  never_visited: { title: "Never visited", dates: false,
    sql: `SELECT m.id "ID", m.first_name "First name", m.last_name "Last name", m.mobile "Mobile", p.gm_type_name "Membership", m.joined_on "Joined"
          FROM members m LEFT JOIN memberships ms ON ms.member_id = m.id AND ms.status = 'current' LEFT JOIN plans p ON p.id = ms.plan_id
          WHERE m.status = 'active' AND coalesce(m.total_visits_gm, 0) = 0 AND NOT EXISTS (SELECT 1 FROM visits v WHERE v.member_id = m.id)
          ORDER BY m.joined_on` },
  lead_sources: { title: "Where members came from", dates: false,
    sql: `SELECT coalesce(nullif(m.lead_source, ''), 'Not recorded') "Source", count(*) "Members"
          FROM members m WHERE m.status = 'active' GROUP BY 1 ORDER BY 2 DESC` },
  current_memberships: { title: "Current memberships", dates: false,
    sql: `SELECT m.id "ID", m.first_name "First name", m.last_name "Last name", p.gm_type_name "Membership", p.gm_category "Category", ms.start_date "Started",
                 ms.min_term_end "Lock-in ends", ms.end_date "Ends", ms.billed_by "Billed by", m.fp_id "Fitness Passport ID" #MONEY#
          FROM memberships ms JOIN members m ON m.id = ms.member_id JOIN plans p ON p.id = ms.plan_id
          WHERE ms.status = 'current' ORDER BY p.gm_type_name, m.first_name` },
  visitor_log: { title: "Visitor log", dates: true,
    sql: `SELECT substr(v.at, 1, 10) "Date", substr(v.at, 12, 5) "Time", m.id "ID", m.first_name || ' ' || coalesce(m.last_name, '') "Name",
                 (SELECT p.gm_type_name FROM memberships ms JOIN plans p ON p.id = ms.plan_id WHERE ms.member_id = m.id AND ms.status = 'current' LIMIT 1) "Membership", v.door "Door"
          FROM visits v JOIN members m ON m.id = v.member_id WHERE substr(v.at, 1, 10) >= ? AND substr(v.at, 1, 10) <= ? ORDER BY v.at DESC` },
  passport_visits: { title: "Visitor log, Fitness Passport", dates: true,
    sql: `SELECT substr(v.at, 1, 10) "Date", substr(v.at, 12, 5) "Time", m.id "ID", m.first_name || ' ' || coalesce(m.last_name, '') "Name", m.fp_id "Fitness Passport ID"
          FROM visits v JOIN members m ON m.id = v.member_id JOIN member_flags f ON f.member_id = m.id AND f.flag = 'passport'
          WHERE substr(v.at, 1, 10) >= ? AND substr(v.at, 1, 10) <= ? AND coalesce(v.door, '') NOT LIKE '%Not Counted%' ORDER BY v.at DESC` },
  holds: { title: "Members on hold", dates: false,
    sql: `SELECT m.id "ID", m.first_name "First name", m.last_name "Last name", m.mobile "Mobile", h.starts "Hold starts", h.ends "Hold ends", h.reason "Reason"
          FROM gm_holds h JOIN members m ON m.id = h.member_id ORDER BY h.ends` },
  cancellations: { title: "Cancellation notices", dates: true,
    sql: `SELECT m.id "ID", m.first_name "First name", m.last_name "Last name", m.mobile "Mobile", c.type_name "Membership", c.cancel_date "Cancels on", c.reason "Reason"
          FROM gm_cancels c JOIN members m ON m.id = c.member_id WHERE c.cancel_date >= ? AND c.cancel_date <= ? ORDER BY c.cancel_date` },
  failed_payments: { title: "Failed payments", dates: true,
    sql: `SELECT f.billing_date "Date", m.id "ID", m.first_name || ' ' || coalesce(m.last_name, '') "Name", m.mobile "Mobile", f.amount "Amount", f.reason "Reason"
          FROM gm_failed f JOIN members m ON m.id = f.member_id WHERE f.billing_date >= ? AND f.billing_date <= ? ORDER BY f.billing_date DESC` },
  all_payments: { title: "All payments", dates: true, gm: 103, business: true },
  all_sales: { title: "All sales", dates: true, gm: 14, business: true },
  product_sales: { title: "Product sales", dates: true, gm: 120, business: true },
  payment_methods: { title: "Payments by payment method", dates: true, gm: 138, business: true },
  trials: { title: "Trials and how many joined", dates: true,
    sql: `SELECT substr(l.created_at, 1, 7) "Month", count(*) "Trials", sum(CASE WHEN l.stage = 'joined' THEN 1 ELSE 0 END) "Joined",
                 round(100.0 * sum(CASE WHEN l.stage = 'joined' THEN 1 ELSE 0 END) / count(*), 1) "Joined %"
          FROM leads l WHERE l.kind = 'trial' AND l.created_at >= ? AND l.created_at <= ? || ' 23:59:59'
          GROUP BY 1 ORDER BY 1 DESC` },
};

async function report(env, can, q) {
  if (!can.collections) return json({ error: "Reports are for owners and the manager." }, 403);
  const kind = q.get("kind") || "current_members", r = REPORTS[kind];
  if (!r) return json({ error: "Unknown report" }, 404);
  const today = nzDateTime(new Date()).slice(0, 10);
  const from = /^\d{4}-\d{2}-\d{2}$/.test(q.get("from") || "") ? q.get("from") : (kind === "expiring" ? today : isoDaysAgo(30));
  const to = /^\d{4}-\d{2}-\d{2}$/.test(q.get("to") || "") ? q.get("to") : (kind === "expiring" ? nzDateTime(new Date(Date.now() + 60 * 86400_000)).slice(0, 10) : today);
  let rows;
  if (r.gm) {
    // Straight from GymMaster's own report, so the numbers match it exactly. Owners only (money).
    if (r.business && !can.business) return json({ error: "This report is for Taylor and Tim." }, 403);
    if (!env.GM_REPORT_KEY) return json({ error: "GM_REPORT_KEY is not set" }, 400);
    const gr = await fetch((env.GM_SITE || "https://m2trainingclub.gymmasteronline.com") + "/api/v2/report/standard_report", {
      method: "POST", headers: { "X-GM-API-KEY": String(env.GM_REPORT_KEY).trim(), "Accept": "application/json", "Content-Type": "application/json" },
      body: JSON.stringify({ start_date: from, end_date: to, report_id: r.gm, company_id: +(env.COMPANY_ID || 4), displaymode: "ALL" }) });
    const gd = await gr.json().catch(() => ({}));
    if (!Array.isArray(gd.result)) return json({ error: "GymMaster didn't send the report (" + (gd.error || gr.status) + ")" }, 502);
    rows = gd.result.map(x => Object.fromEntries(Object.entries(x).filter(([k]) => !/^sorted_/.test(k))));
  } else {
    const sql = r.sql.replace("#MONEY#", can.business ? `, ms.price "Price", ms.weekly_value "Per week"` : "");
    const stmt = env.DB.prepare(sql);
    const binds = r.dates ? Array.from({ length: r.pairs || 1 }, () => [from, to]).flat() : [];
    const res = await (binds.length ? stmt.bind(...binds) : stmt).all();
    rows = res.results || [];
  }
  const columns = rows.length ? Object.keys(rows[0]) : [];
  if (q.get("format") === "csv") {
    const cell = v => { const t = String(v ?? ""); return /[",\n]/.test(t) ? '"' + t.replace(/"/g, '""') + '"' : t; };
    const body = [columns.map(cell).join(",")].concat(rows.map(x => columns.map(c => cell(x[c])).join(","))).join("\r\n") + "\r\n";
    return new Response(body, { headers: { "Content-Type": "text/csv; charset=utf-8", "Cache-Control": "no-store",
      "Content-Disposition": `attachment; filename="m2-${kind}-${today}.csv"` } });
  }
  return json({ kind, title: r.title, dates: r.dates, from, to, columns, rows: rows.slice(0, 500), total: rows.length,
                reports: Object.entries(REPORTS).filter(([, v]) => !v.business || can.business).map(([k, v]) => ({ kind: k, title: v.title, gm: !!v.gm })) });
}

/* ---------------- first run: the database sets itself up ---------------- */
// Every table uses CREATE ... IF NOT EXISTS and every seed uses INSERT OR IGNORE,
// so running it again is harmless. Checked once per worker start.
let schemaReady = false;
async function ensureSchema(env) {
  if (schemaReady) return;
  // New tables and settings are added automatically when the schema changes (all IF NOT EXISTS / OR IGNORE).
  let current = null;
  try { current = (await env.DB.prepare("SELECT value FROM settings WHERE key = 'schema_version'").first())?.value; } catch { current = null; }
  if (current !== SCHEMA_VERSION) {
    const all = SCHEMA.concat(STAFF_SEED);
    for (let i = 0; i < all.length; i += 40) await env.DB.batch(all.slice(i, i + 40).map(x => env.DB.prepare(x)));
    await env.DB.prepare("INSERT INTO settings(key, value) VALUES ('schema_version', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value").bind(SCHEMA_VERSION).run();
  }
  schemaReady = true;
}

/* ---------------- importing a GymMaster export ---------------- */
// Owners upload GymMaster's "Current Memberships" CSV on the Import page. The browser reads
// it and sends rows here in small batches; member data goes straight from the file to the
// database. Safe to run again: members are updated in place, imported memberships replaced.
const IMPORT_SQL = {
  plans: `INSERT INTO plans(gm_type_name, gm_category, family, frequency, flexi, paid_in_full, corporate, employer, student, legacy, includes_classes, includes_recovery)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(gm_type_name, gm_category) DO UPDATE SET family = excluded.family, frequency = excluded.frequency, flexi = excluded.flexi,
            paid_in_full = excluded.paid_in_full, corporate = excluded.corporate, employer = excluded.employer, student = excluded.student,
            legacy = excluded.legacy, includes_classes = excluded.includes_classes, includes_recovery = excluded.includes_recovery`,
  members: `INSERT INTO members(id, gm_id, first_name, last_name, passport_number, fp_id, fp_id_in_gm, email, mobile, gender, lead_source, status, joined_on, total_visits_gm)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?)
            ON CONFLICT(id) DO UPDATE SET first_name = excluded.first_name, last_name = excluded.last_name,
              passport_number = coalesce(excluded.passport_number, members.passport_number),
              fp_id = coalesce(excluded.fp_id, members.fp_id), fp_id_in_gm = CASE WHEN excluded.fp_id IS NOT NULL THEN 1 ELSE members.fp_id_in_gm END,
              email = coalesce(excluded.email, members.email), mobile = coalesce(excluded.mobile, members.mobile),
              gender = coalesce(excluded.gender, members.gender), lead_source = coalesce(members.lead_source, excluded.lead_source),
              status = 'active', joined_on = coalesce(members.joined_on, excluded.joined_on), total_visits_gm = excluded.total_visits_gm,
              updated_at = datetime('now')`,
  memberships: `INSERT INTO memberships(member_id, plan_id, price, weekly_value, start_date, min_term_end, end_date, status, billed_by, gm_billing_note, discount_code, sold_by)
                SELECT ?, p.id, ?, ?, ?, ?, ?, 'current', ?, ?, ?, ? FROM plans p WHERE p.gm_type_name = ? AND p.gm_category = ?`,
  billing: `INSERT OR IGNORE INTO billing_accounts(member_id, billed_by_system) VALUES (?, 'gymmaster')`,
  flags: `INSERT OR IGNORE INTO member_flags(member_id, flag, detail) VALUES (?, ?, ?)`,
  trials: `INSERT INTO leads(member_id, name, email, mobile, kind, source, stage, created_at, notes) VALUES (?, ?, ?, ?, 'trial', ?, ?, ?, 'gymmaster_import')`,
};
const IMPORT_COLS = { plans: 12, members: 13, memberships: 12, billing: 1, flags: 3, trials: 7 };

async function importRows(env, who, can, b) {
  if (!can.settings) return { ok: false, error: "Only Taylor and Tim can import." };
  const db = env.DB;
  if (b.step === "start") {
    // Clear what the last import loaded, keeping everything staff have done in the Core.
    await db.batch([
      db.prepare(`DELETE FROM memberships WHERE plan_id IN (SELECT id FROM plans WHERE coalesce(gm_category,'') <> 'Sold in M2 Core')`),
      db.prepare(`DELETE FROM member_flags WHERE flag IN ('passport','corporate','student') AND set_by IS NULL`),
      b.history ? db.prepare(`DELETE FROM leads WHERE notes = 'gymmaster_import'`) : db.prepare("SELECT 1"),
    ]);
    const log = await db.prepare("INSERT INTO sync_log(source, started_at) VALUES ('gymmaster_csv', datetime('now')) RETURNING id").first();
    return { ok: true, log: log.id };
  }
  if (b.step === "rows") {
    const sql = IMPORT_SQL[b.table], n = IMPORT_COLS[b.table];
    if (!sql || !Array.isArray(b.rows) || b.rows.length > 200) return { ok: false, error: "Bad import batch" };
    const stmts = [];
    for (const r of b.rows) {
      if (!Array.isArray(r) || r.length !== n) return { ok: false, error: "Bad row in " + b.table };
      stmts.push(db.prepare(sql).bind(...r.map(v => (v === undefined || v === "") ? null : v)));
    }
    if (stmts.length) await db.batch(stmts);
    return { ok: true, done: stmts.length };
  }
  if (b.step === "finish") {
    const stmts = [db.prepare("UPDATE sync_log SET finished_at = datetime('now'), rows_in = ?, rows_changed = ?, ok = 1 WHERE id = ?").bind(+b.rowsIn || 0, +b.rowsChanged || 0, +b.log || 0)];
    if (b.fpLoaded) stmts.push(db.prepare("UPDATE settings SET value = '1' WHERE key = 'fp_ids_loaded'"));
    // Anyone active with no current membership after a full import has left M2. Their balance stays for Collections.
    const gone = `SELECT id FROM members WHERE status = 'active' AND NOT EXISTS (SELECT 1 FROM memberships ms WHERE ms.member_id = members.id AND ms.status = 'current')`;
    stmts.push(db.prepare(`INSERT INTO activity(member_id, kind, detail) SELECT id, 'cancel', 'Left M2 (no longer current in GymMaster)' FROM (${gone})`));
    stmts.push(db.prepare(`UPDATE members SET status = 'former', updated_at = datetime('now') WHERE id IN (${gone})`));
    await db.batch(stmts);
    const n = await db.prepare("SELECT count(*) n FROM members WHERE status = 'active'").first();
    return { ok: true, members: n.n };
  }
  return { ok: false, error: "Unknown step" };
}

/* ---------------- member photos ---------------- */
// Taken in the browser from the reception USB camera (or a phone or tablet camera),
// cropped square and shrunk to about 40 KB before it's sent.

async function savePhoto(env, who, can, id, b) {
  if (!can.add) return { ok: false, error: "Only reception, the manager and owners can take photos." };
  const jpeg = String(b.jpeg || "");
  if (!/^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(jpeg)) return { ok: false, error: "That photo didn't come through. Take it again." };
  if (jpeg.length > 600_000) return { ok: false, error: "That photo is too big. Take it again." };
  const m = await env.DB.prepare("SELECT id FROM members WHERE id = ?").bind(id).first();
  if (!m) return { ok: false, error: "Member not found" };
  await env.DB.batch([
    env.DB.prepare(`INSERT INTO member_photos(member_id, jpeg, taken_by) VALUES (?, ?, ?)
                    ON CONFLICT(member_id) DO UPDATE SET jpeg = excluded.jpeg, taken_at = datetime('now'), taken_by = excluded.taken_by`).bind(id, jpeg, who.id),
    env.DB.prepare("INSERT INTO activity(member_id, staff_id, kind, detail) VALUES (?, ?, 'note', 'Photo taken')").bind(id, who.id),
  ]);
  return { ok: true };
}

async function memberPhoto(env, who, can, id) {
  if (!can.members) return new Response("No access", { status: 403 });
  if (can.members === "own") {
    const m = await env.DB.prepare("SELECT trainer_id FROM members WHERE id = ?").bind(id).first();
    if (!m || m.trainer_id !== who.id) return new Response("No access", { status: 403 });
  }
  const p = await env.DB.prepare("SELECT jpeg FROM member_photos WHERE member_id = ?").bind(id).first();
  if (!p) {
    const m = await env.DB.prepare("SELECT photo_url FROM members WHERE id = ?").bind(id).first();
    const r = m && m.photo_url ? await H2.gmPhoto(env, m.photo_url).catch(() => null) : null;
    return r || new Response("No photo", { status: 404 });
  }
  const bin = atob(p.jpeg.split(",")[1]);
  const bytes = Uint8Array.from(bin, c => c.charCodeAt(0));
  return new Response(bytes, { headers: { "Content-Type": "image/jpeg", "Cache-Control": "private, max-age=60" } });
}

/* ---------------- Fitness Passport ---------------- */
// Passport pays M2 per visit on monthly tiers that reset each month, matched on each
// member's Fitness Passport ID. While GymMaster runs the doors it reports the visits to
// Passport itself (Settings > Integrations > Fitness Passport, with M2's site and device
// tokens). This page is M2's own check: every Passport visit, the ID it will be paid on,
// the visits that can't be paid because the ID is missing, and (owners only) the money.

function monthRange(month) {
  const now = nzDateTime(new Date());
  const m = /^\d{4}-\d{2}$/.test(month || "") ? month : now.slice(0, 7);
  const [y, mo] = m.split("-").map(Number);
  const next = mo === 12 ? `${y + 1}-01` : `${y}-${String(mo + 1).padStart(2, "0")}`;
  return { month: m, from: m + "-01", to: next + "-01" };
}

// Graduated, like tax brackets: visit 1 to 458 at the first rate, 459 to 919 at the next, and so on.
function passportPay(visits, tiersText) {
  const tiers = String(tiersText || "").split(",").map(t => t.split(":")).map(([upTo, rate]) => ({ upTo: Number(upTo) || Infinity, rate: Number(rate) }));
  let total = 0, from = 0, rate = tiers[0] ? tiers[0].rate : 0, nextAt = null;
  for (const t of tiers) {
    total += Math.max(0, Math.min(visits, t.upTo) - from) * t.rate;
    if (visits > from || from === 0) { rate = t.rate; nextAt = t.upTo === Infinity ? null : t.upTo + 1; }
    from = t.upTo;
    if (visits <= t.upTo) break;
  }
  return { total: Math.round(total * 100) / 100, rate, next_tier_at: nextAt,
           visits_to_next_tier: nextAt ? nextAt - visits : null, tiers: tiers.map(t => ({ up_to: t.upTo === Infinity ? null : t.upTo, rate: t.rate })) };
}

async function passportRows(env, from, to) {
  return (await env.DB.prepare(`SELECT m.id member_id, m.first_name, m.last_name, coalesce(v.fp_id, m.fp_id) fp_id, m.fp_id_in_gm,
                                  count(DISTINCT substr(v.at, 1, 10)) visits, min(v.at) first_visit, max(v.at) last_visit
                                FROM visits v JOIN members m ON m.id = v.member_id
                                WHERE v.at >= ? AND v.at < ? AND coalesce(v.door, '') NOT LIKE '%Not Counted%'
                                  AND EXISTS (SELECT 1 FROM member_flags f WHERE f.member_id = m.id AND f.flag = 'passport')
                                GROUP BY m.id ORDER BY visits DESC, m.first_name`).bind(from, to).all()).results;
}

async function passportReport(env, can, month) {
  if (can.members !== true) return { error: "No access" };
  const db = env.DB;
  const r = monthRange(month);
  const rows = await passportRows(env, r.from, r.to);
  const visits = rows.reduce((a, x) => a + x.visits, 0);
  const noId = rows.filter(x => !x.fp_id);
  const noIdVisits = noId.reduce((a, x) => a + x.visits, 0);
  const members = (await db.prepare(`SELECT count(*) n, sum(CASE WHEN coalesce(m.fp_id,'') = '' THEN 1 ELSE 0 END) no_id,
                                       sum(CASE WHEN coalesce(m.fp_id,'') <> '' AND m.fp_id_in_gm = 0 THEN 1 ELSE 0 END) not_in_gm
                                     FROM members m JOIN member_flags f ON f.member_id = m.id AND f.flag = 'passport'
                                     WHERE m.status = 'active'`).first());
  const dupes = (await db.prepare(`SELECT m.fp_id, group_concat(m.first_name || ' ' || coalesce(m.last_name,''), ', ') names, count(*) n
                                   FROM members m WHERE coalesce(m.fp_id,'') <> '' GROUP BY m.fp_id HAVING count(*) > 1`).all()).results;
  const history = (await db.prepare(`SELECT substr(v.at,1,7) month, count(*) visits FROM visits v
                                     WHERE v.at >= date(?, '-5 months') AND v.at < ?
                                       AND EXISTS (SELECT 1 FROM member_flags f WHERE f.member_id = v.member_id AND f.flag = 'passport')
                                     GROUP BY month ORDER BY month`).bind(r.from, r.to).all()).results;
  const idsLoaded = (await db.prepare("SELECT value FROM settings WHERE key = 'fp_ids_loaded'").first())?.value === "1";
  const out = { month: r.month, visits, members_visiting: rows.length, visits_no_id: noIdVisits, rows, no_id: noId,
                passport_members: members.n, members_no_id: idsLoaded ? members.no_id : null, members_not_in_gm: members.not_in_gm,
                duplicate_ids: dupes, history, ids_loaded: idsLoaded };
  if (can.business) {
    const tiers = (await db.prepare("SELECT value FROM settings WHERE key = 'fp_tiers'").first())?.value;
    const pay = passportPay(visits, tiers);
    out.money = { ...pay, at_risk: Math.round((pay.total - passportPay(visits - noIdVisits, tiers).total) * 100) / 100,
                  history: history.map(h => ({ ...h, estimate: passportPay(h.visits, tiers).total })) };
  }
  return out;
}

async function passportCsv(env, can, month) {
  if (can.members !== true) return new Response("No access", { status: 403 });
  const r = monthRange(month);
  const rows = await passportRows(env, r.from, r.to);
  const cell = v => { const t = String(v ?? ""); return /[",\n]/.test(t) ? '"' + t.replace(/"/g, '""') + '"' : t; };
  const lines = [["Fitness Passport ID", "First name", "Last name", "M2 member ID", "Visits", "First visit", "Last visit"].join(",")]
    .concat(rows.map(x => [x.fp_id || "MISSING", x.first_name, x.last_name, x.member_id, x.visits, x.first_visit, x.last_visit].map(cell).join(",")));
  return new Response(lines.join("\r\n") + "\r\n", { headers: { "Content-Type": "text/csv; charset=utf-8",
    "Content-Disposition": `attachment; filename="m2-fitness-passport-${r.month}.csv"`, "Cache-Control": "no-store" } });
}

/* ---------------- helpers ---------------- */

function nzDateTime(d) {
  const p = Object.fromEntries(new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }).formatToParts(d).map(x => [x.type, x.value]));
  return `${p.year}-${p.month}-${p.day} ${p.hour === "24" ? "00" : p.hour}:${p.minute}:${p.second}`;
}

function normMobile(v) {
  let d = String(v || "").replace(/\D/g, "");
  if (d.startsWith("64")) d = "0" + d.slice(2);
  return d || null;
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });
}

function html(body) {
  return new Response(body, { headers: { "Content-Type": "text/html;charset=utf-8", "Cache-Control": "no-store",
    "X-Robots-Tag": "noindex, nofollow", "X-Frame-Options": "DENY", "Referrer-Policy": "same-origin" } });
}

const BILLING_DONE_HTML = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Thanks</title></head>
<body style="margin:0;font:16px/1.5 Arial,sans-serif;background:#0A0A0A;color:#fff;display:grid;place-items:center;min-height:100vh;text-align:center;padding:24px">
<div><div style="color:#DFFF00;font-weight:800;font-size:28px">You're all set.</div><p>Your bank details have gone straight to Ezidebit. Welcome to M2.</p><p style="color:#B9B9B0">You can hand the screen back now.</p></div></body></html>`;

