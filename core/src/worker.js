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

const TZ = "Pacific/Auckland";

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
      const who = await signedIn(req, env);
      if (!who) return new Response("Sign in through M2 Core to continue.", { status: 401 });
      const can = CAN[who.role] || {};

      if (url.pathname === "/" || url.pathname === "/index.html") return html(APP_HTML);
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
      if (url.pathname === "/api/members" && req.method === "POST") return json(await addMember(env, who, can, await req.json()));
      if (url.pathname === "/api/members") return json(await searchMembers(env, who, can, url.searchParams.get("q") || ""));
      const kt = url.pathname.match(/^\/api\/members\/(\d+)\/key-tag$/);
      if (kt && req.method === "POST") return json(await assignKeyTag(env, who, can, +kt[1], await req.json()));
      const bl = url.pathname.match(/^\/api\/members\/(\d+)\/billing-link$/);
      if (bl) return json(await billingLink(env, can, +bl[1], url.origin));
      const tg = url.pathname.match(/^\/api\/key-tags\/([^/]+)$/);
      if (tg) return json(await whoHasTag(env, can, decodeURIComponent(tg[1])));
      const m = url.pathname.match(/^\/api\/members\/(\d+)$/);
      if (m) return json(await memberDetail(env, who, can, +m[1]));
      if (url.pathname === "/api/sync-now" && can.settings && req.method === "POST") {
        return json(await syncMembers(env));
      }
      return json({ error: "Not found" }, 404);
    } catch (e) {
      return json({ error: String(e && e.message || e) }, 500);
    }
  },

  // Nightly copy from GymMaster (see wrangler.toml for the time).
  async scheduled(event, env, ctx) {
    ctx.waitUntil((async () => {
      await syncMembers(env);
      await applyBlockRule(env);
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
  const out = { member: m, memberships, flags, visits, last_visit: lastVisit && lastVisit.at, activity, tags, leads, referrer, trainer };
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
  if (ms && ms.billed_by === "ezidebit" && d.activity.every(a => !/bank details/i.test(a.detail || "")) && m.joined_on && m.joined_on >= isoDaysAgo(14)) {
    return { text: "New member. Check their bank details are in.", action: "billing" };
  }
  if (!m.key_tag && ms && ms.family !== "passport" && (d.tags.length || d.activity.some(a => a.kind === "sale"))) return { text: "No key tag on record. Scan one next time they're in.", action: "tag" };
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

async function sellablePlans(env, can) {
  if (!can.add) return { error: "No access" };
  if (!env.GM_API_KEY) return { error: "GM_API_KEY is not set" };
  const d = await gmMember(env, "GET", "/v1/memberships");
  if (d.error) return { error: "GymMaster: " + d.error };
  const live = new Map((d.result || []).map(m => [Number(m.id), m]));
  const plans = SELLABLE.filter(p => live.has(p.id)).map(p => {
    const m = live.get(p.id);
    return { ...p, name: String(m.name || "").trim(), price: m.price, priceDescription: m.pricedescription,
             signupFee: parseFloat(String(m.signupfee || "0").replace(/[^0-9.]/g, "")) || 0 };
  });
  return { plans, goals: GOALS, sources: SOURCES };
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
  };
  const missing = [["first", "first name"], ["last", "last name"], ["email", "email"], ["mobile", "mobile"], ["dob", "date of birth"],
                   ["goal", "goal"], ["source", "where they heard about us"]].filter(([k]) => !f[k]).map(([, l]) => l);
  if (!f.planId) missing.unshift("membership");
  if (missing.length) return { ok: false, error: "Still needed: " + missing.join(", ") + "." };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email)) return { ok: false, error: "That email address doesn't look right." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(f.dob)) return { ok: false, error: "Check the date of birth." };
  if (!b.agreed) return { ok: false, error: "The member needs to agree to the terms and sign." };

  const plan = SELLABLE.find(p => p.id === f.planId);
  if (!plan) return { ok: false, error: "That membership can't be sold here." };
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
  if (!env.GM_API_KEY) return { ok: false, error: "GM_API_KEY is not set, so members can't be added yet." };
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
  const live = await gmMember(env, "GET", "/v1/memberships");
  const lm = (live.result || []).find(m => Number(m.id) === f.planId);
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
            f.planId, ["perform", "classes", "trial"].includes(plan.family) ? 1 : 0, ["perform", "recovery", "trial"].includes(plan.family) ? 1 : 0).first();
    planDbId = p.id;
  }
  const billedBy = plan.family === "trial" ? "none" : "ezidebit";
  const stmts = [
    db.prepare(`INSERT INTO members(id, gm_id, first_name, last_name, email, mobile, dob, gender, goal, lead_source, lead_campaign,
                referred_by, emergency_name, emergency_phone, status, joined_on, terms_signed_on)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?)
                ON CONFLICT(id) DO UPDATE SET goal = excluded.goal, lead_source = excluded.lead_source, status = 'active', updated_at = datetime('now')`)
      .bind(id, id, f.first, f.last, f.email, f.mobile, f.dob, f.gender || null, f.goal, f.source, f.campaign || null, f.referredBy,
            f.emergencyName || null, f.emergencyPhone || null, today, today),
    db.prepare("INSERT INTO memberships(member_id, plan_id, price, weekly_value, start_date, status, billed_by, sold_by) VALUES (?, ?, ?, ?, ?, 'current', ?, ?)")
      .bind(id, planDbId, price, weekly, today, billedBy, who.name),
    db.prepare("INSERT INTO activity(member_id, staff_id, kind, detail) VALUES (?, ?, 'sale', ?)")
      .bind(id, who.id, "Added at reception: " + (b.planName || plan.family) + (f.referredBy ? ", Bring a Mate" : "")),
  ];
  if (billedBy === "ezidebit") stmts.push(db.prepare("INSERT OR IGNORE INTO billing_accounts(member_id, billed_by_system) VALUES (?, 'gymmaster')").bind(id));
  if (f.passport) stmts.push(db.prepare("INSERT OR IGNORE INTO member_flags(member_id, flag, set_by) VALUES (?, 'passport', ?)").bind(id, who.id));
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
  return { ok: true, id, needsBilling: billedBy === "ezidebit", warnings, gymmasterUrl: (env.GM_SITE || "") + "/member/view/" + id };
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
  set("callback", origin + "/billing-done?member=" + m.id); set("ed", 1);
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
  no_tag:          { label: "Paying members with no key tag",   one: "paying member with no key tag",  owner: "reception", order: 6 },
};
const OUTCOMES = ["joined", "joining_at_desk", "call_back", "no_answer", "not_interested", "paid", "billing_in", "tag_given", "done"];

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

    // 5 Days for $5: on day 4 or later they're about to finish.
    push("trial_ending", (await all(`SELECT l.id lead_id, l.member_id, coalesce(l.name, m.first_name || ' ' || coalesce(m.last_name,'')) name, l.mobile, l.created_at
                                     FROM leads l LEFT JOIN members m ON m.id = l.member_id
                                     WHERE l.kind = 'trial' AND l.stage = 'trial' AND date(l.created_at) <= date(?, '-3 days')
                                       AND (l.notes IS NULL OR l.notes <> 'gymmaster_import')
                                     ORDER BY l.created_at`, nzToday))
      .map(r => ({ ...r, detail: "Trial started " + String(r.created_at).slice(0, 10) + ". Best time to ask them to join." })));

    // Call backs promised for today or earlier.
    push("call_back", (await all(`SELECT t.id task_id, t.member_id, t.lead_id, coalesce(m.first_name || ' ' || coalesce(m.last_name,''), l.name) name,
                                    coalesce(m.mobile, l.mobile) mobile, t.outcome_note, t.due_on
                                  FROM tasks t LEFT JOIN members m ON m.id = t.member_id LEFT JOIN leads l ON l.id = t.lead_id
                                  WHERE t.kind = 'call_back' AND t.outcome IS NULL AND t.due_on <= ? ORDER BY t.due_on`, nzToday))
      .map(r => ({ ...r, detail: r.outcome_note || "Promised a call back" })));
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
            app_upgrade: "Upgrade request in the app", website_form: "Website enquiry", meta_form: "Meta ad form", walk_in: "Walk in" })[k] || k;
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
  const where = ["(l.notes IS NULL OR l.notes <> 'gymmaster_import')"], binds = [];
  if (can.members === "own") { where.push("l.assigned_to = ?"); binds.push(who.id); }
  const kind = q.get("kind"); if (kind) { where.push("l.kind = ?"); binds.push(kind); }
  const days = Math.min(+(q.get("days") || 30), 365);
  where.push("(l.stage NOT IN ('joined','lost') OR l.closed_at >= datetime('now', ?))"); binds.push(`-${days} days`);
  const rows = (await env.DB.prepare(`SELECT l.id, l.member_id, l.name, l.email, l.mobile, l.kind, l.source, l.campaign, l.stage, l.goal,
                                        l.created_at, l.contacted_at, l.assigned_to, s.name assigned_name
                                      FROM leads l LEFT JOIN staff s ON s.id = l.assigned_to
                                      WHERE ${where.join(" AND ")} ORDER BY l.created_at DESC LIMIT 400`).bind(...binds).all()).results;
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

const LEAD_KINDS = ["trial", "free_pt", "unfinished_signup", "bring_a_mate", "app_upgrade", "website_form", "meta_form", "walk_in"];

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
  if (b.stage && ["new", "contacted", "trial", "joined", "lost"].includes(b.stage)) {
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
  if (!assigned && kind === "free_pt") assigned = await nextTrainer(db);
  const stage = kind === "trial" ? "trial" : "new";
  const row = await db.prepare(`INSERT INTO leads(member_id, name, email, mobile, kind, source, campaign, stage, assigned_to, goal, notes)
                                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING id`)
    .bind(member && member.id, name || null, email, mobile, kind, clean(b.source) || null, clean(b.campaign) || null, stage, assigned,
          clean(b.goal) || null, clean(b.notes) || null).first();
  await db.prepare("INSERT INTO activity(lead_id, member_id, staff_id, kind, detail) VALUES (?, ?, ?, 'note', ?)")
    .bind(row.id, member && member.id, who ? who.id : null, (who ? "Added by " + who.name : "Came in from the website") + ": " + leadKindLabel(kind)).run();
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
  const r = await saveLead(env, b, null);
  return reply(r.ok ? { ok: true } : { ok: false, error: r.error }, r.ok ? 200 : 400);
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
    for (const [k, fn] of Object.entries(fields)) {
      if (b[k] === undefined) continue;
      const v = fn(b[k]) || null;
      if (k === "email" && v && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return { ok: false, error: "That email address doesn't look right." };
      if (v === m[k]) continue;
      sets.push(k + " = ?"); binds.push(v); changed.push(k.replace(/_/g, " "));
    }
    if (!sets.length) return { ok: true, unchanged: true };
    await db.batch([
      db.prepare(`UPDATE members SET ${sets.join(", ")}, updated_at = datetime('now') WHERE id = ?`).bind(...binds, id),
      db.prepare("INSERT INTO activity(member_id, staff_id, kind, detail) VALUES (?, ?, 'note', ?)").bind(id, who.id, "Updated " + changed.join(", ")),
    ]);
    return { ok: true, note: changed.includes("email") || changed.includes("mobile") ? "Change it in GymMaster too, so emails and texts still reach them." : null };
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
    const u = new URL(env.GM_BASE + "/v1/members");
    u.searchParams.set("api_key", env.GM_STAFF_KEY);
    u.searchParams.set("when", when);
    const r = await fetch(u.toString());
    const d = await r.json();
    if (d.error) throw new Error("GymMaster: " + d.error);
    const list = d.result || [];
    const stmts = [];
    for (const g of list) {
      const id = +g.id;
      if (!id) continue;
      const first = g.firstname ?? g.first_name ?? "";
      const last = g.surname ?? g.lastname ?? g.last_name ?? "";
      const email = (g.email || "").toLowerCase() || null;
      const mobile = normMobile(g.cellphone ?? g.mobile ?? g.phone ?? "");
      stmts.push(db.prepare(`INSERT INTO members(id, gm_id, first_name, last_name, email, mobile, joined_on, status)
                             VALUES (?, ?, ?, ?, ?, ?, ?, 'prospect')
                             ON CONFLICT(id) DO UPDATE SET first_name = excluded.first_name, last_name = excluded.last_name,
                               email = coalesce(excluded.email, members.email), mobile = coalesce(excluded.mobile, members.mobile),
                               updated_at = datetime('now')`)
        .bind(id, id, first || "Unknown", last, email, mobile, g.joindate || null));
    }
    for (let i = 0; i < stmts.length; i += 50) await db.batch(stmts.slice(i, i + 50));
    await db.prepare("UPDATE sync_log SET finished_at = ?, rows_in = ?, rows_changed = ?, ok = 1 WHERE id = ?")
      .bind(new Date().toISOString(), list.length, stmts.length, log.id).run();
    return { ok: true, rows: stmts.length, since: when };
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

