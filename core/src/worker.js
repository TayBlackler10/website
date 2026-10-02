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
      const who = await signedIn(req, env);
      if (!who) return new Response("Sign in through M2 Core to continue.", { status: 401 });
      const can = CAN[who.role] || {};

      if (url.pathname === "/" || url.pathname === "/index.html") return html(APP_HTML);
      if (url.pathname === "/api/me") return json({ name: who.name, role: who.role, can });
      if (url.pathname === "/api/summary") return json(await summary(env, can));
      if (url.pathname === "/api/plans") return json(await sellablePlans(env, can));
      if (url.pathname === "/api/members" && req.method === "POST") return json(await addMember(env, who, can, await req.json()));
      if (url.pathname === "/api/members") return json(await searchMembers(env, who, can, url.searchParams.get("q") || ""));
      const kt = url.pathname.match(/^\/api\/members\/(\d+)\/key-tag$/);
      if (kt && req.method === "POST") return json(await assignKeyTag(env, who, can, +kt[1], await req.json()));
      const bl = url.pathname.match(/^\/api\/members\/(\d+)\/billing-link$/);
      if (bl) return json(await billingLink(env, can, +bl[1], url.origin));
      const tg = url.pathname.match(/^\/api\/key-tags\/([^/]+)$/);
      if (tg) return json(await whoHasTag(env, can, decodeURIComponent(tg[1])));
      if (url.pathname === "/billing-done") return html(BILLING_DONE_HTML);
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
  const memberships = (await db.prepare(`SELECT ms.*, p.family, p.gm_type_name plan, p.frequency, p.flexi, p.paid_in_full
                                         FROM memberships ms JOIN plans p ON p.id = ms.plan_id
                                         WHERE ms.member_id = ? ORDER BY ms.start_date DESC`).bind(id).all()).results;
  const flags = (await db.prepare("SELECT flag, detail FROM member_flags WHERE member_id = ?").bind(id).all()).results;
  const visits = (await db.prepare(`SELECT substr(at,1,10) day, count(*) n FROM visits WHERE member_id = ?
                                    AND at >= date('now','-84 days') GROUP BY day ORDER BY day`).bind(id).all()).results;
  const activity = (await db.prepare("SELECT kind, detail, at FROM activity WHERE member_id = ? ORDER BY at DESC LIMIT 20").bind(id).all()).results;
  const out = { member: m, memberships, flags, visits, activity };
  if (can.balances) {
    out.billing = await db.prepare("SELECT balance_owing, next_debit_date, next_debit_amount, billed_by_system FROM billing_accounts WHERE member_id = ?").bind(id).first();
  } else {
    for (const ms of memberships) { delete ms.price; delete ms.weekly_value; delete ms.gm_billing_note; }
  }
  return out;
}

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
    return { ok: false, duplicate: dupe, error: `${dupe.first_name} ${dupe.last_name || ""} is already in the system (${dupe.status}). Open their profile instead.` };
  }

  // 1. GymMaster first, while it runs billing and doors.
  if (!env.GM_API_KEY) return { ok: false, error: "GM_API_KEY is not set, so members can't be added yet." };
  const ex = await gmMember(env, "GET", "/v2/member/exists", { email: f.email });
  if (ex && ex.result && ex.result.id && !b.confirmDuplicate) {
    return { ok: false, duplicate: { id: ex.result.id }, error: "That email is already in GymMaster." };
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

/* ---------------- the first screen ---------------- */
// Phase 1 screen: the business summary for owners, and member search with a
// profile panel for everyone allowed to see members. The full staff CRM
// (designs in the M2 Staff CRM canvas) replaces this screen by screen.

const APP_HTML = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex"><title>M2 Core</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Archivo:wght@800&family=DM+Sans:opsz,wght@9..40,400;9..40,600&display=swap">
<style>
:root{--lime:#DFFF00;--ink:#0A0A0A;--paper:#F3F3F0;--tile:#F1F1EC;--olive:#5E6B00;--muted:#5B5B55;--line:#E2E2DC}
*{box-sizing:border-box}body{margin:0;background:var(--paper);color:var(--ink);font:15px/1.5 "DM Sans",Arial,sans-serif}
header{background:var(--ink);color:#fff;padding:14px 20px;display:flex;align-items:center;gap:12px}
header b{background:var(--lime);color:var(--ink);padding:2px 7px;border-radius:4px;font-family:Archivo,Arial,sans-serif}
header span{margin-left:auto;color:#B9B9B0;font-size:13px}
main{max-width:1100px;margin:0 auto;padding:24px 16px;display:flex;flex-direction:column;gap:20px}
h1,h2{font-family:Archivo,Arial,sans-serif;font-weight:800;letter-spacing:-.02em;margin:0}h1{font-size:30px}h2{font-size:20px}
.card{background:#fff;border-radius:20px;padding:20px;display:flex;flex-direction:column;gap:12px}
.tiles{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:12px}
.tile{background:var(--tile);border-radius:14px;padding:14px}.tile.dark{background:var(--ink);color:#fff}
.tile .n{font-family:Archivo,Arial,sans-serif;font-weight:800;font-size:26px}.tile.dark .n{color:var(--lime)}
.tile .l{font-size:13px;color:var(--muted)}.tile.dark .l{color:#B9B9B0}
input{height:46px;border:1px solid var(--line);border-radius:999px;padding:0 18px;font:inherit;width:100%}
.row{display:flex;justify-content:space-between;gap:10px;padding:10px 4px;border-top:1px solid var(--line);cursor:pointer}
.row:hover{background:var(--tile)}.pill{font-size:12px;background:var(--tile);border-radius:999px;padding:2px 10px;font-weight:600}
.pill.dark{background:var(--ink);color:var(--lime)}.muted{color:var(--muted);font-size:13px}
.err{color:#A33A00}
.chips{display:flex;flex-wrap:wrap;gap:6px}.chip{border:1px solid var(--line);background:#fff;border-radius:999px;padding:8px 14px;font:inherit;font-size:14px;cursor:pointer}
.chip.on{background:var(--ink);color:var(--lime);border-color:var(--ink)}
.plans{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:10px}
.plan{border:1px solid var(--line);background:#fff;border-radius:14px;padding:14px;text-align:left;font:inherit;cursor:pointer}
.plan.on{border-color:var(--ink);box-shadow:inset 0 0 0 1px var(--ink)}.plan b{display:block}.plan span{font-size:13px;color:var(--muted)}
.grid2{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px}
.fld{display:flex;flex-direction:column;gap:4px;font-size:13px;color:var(--muted)}.fld input,.fld select{height:44px;border:1px solid var(--line);border-radius:12px;padding:0 12px;font:inherit;color:var(--ink);background:#fff;width:100%}
.btn{height:46px;padding:0 22px;border:0;border-radius:999px;background:var(--lime);color:var(--ink);font:inherit;font-weight:600;cursor:pointer}
.btn.dark{background:var(--ink);color:var(--lime)}.btn.line{background:transparent;border:1px solid var(--ink)}
.stepn{width:28px;height:28px;border-radius:50%;background:var(--ink);color:var(--lime);display:inline-grid;place-items:center;font-size:13px;font-weight:600;margin-right:8px}
canvas#sig{width:100%;height:140px;border:1px dashed var(--muted);border-radius:12px;background:#fff;touch-action:none}
.ok{background:#F7FBD9;border-radius:12px;padding:12px 14px;font-size:14px}
.tagbox{font-size:28px;height:64px;text-align:center;letter-spacing:.1em;font-family:Archivo,Arial,sans-serif}
</style></head><body>
<header><b>M2</b><strong>Core</strong><span id="me"></span><button class="btn" id="addBtn" hidden style="height:38px;margin-left:12px">Add member</button></header>
<main>
<div><span class="muted" id="sync"></span><h1>Today<span style="color:var(--olive)">.</span></h1></div>
<section class="card" id="biz" hidden><div class="muted">Only you and Tim see this</div><div class="tiles" id="tiles"></div></section>
<section class="card"><h2>Find a member</h2><label for="q" class="muted">Name, email, mobile or key tag</label><input id="q" autocomplete="off"><div id="results"></div></section>
<section class="card" id="profile" hidden></section>
<section class="card" id="add" hidden>
<div style="display:flex;align-items:center;gap:10px"><h2 style="margin-right:auto">Add a member</h2><button class="btn line" id="addClose" style="height:38px">Close</button></div>
<div id="a1">
<h3 style="margin:0 0 8px"><span class="stepn">1</span>Membership</h3>
<div class="chips" id="fam"></div>
<div class="chips" id="freq" style="margin-top:8px"></div>
<label style="display:flex;gap:8px;align-items:center;margin-top:8px;font-size:14px"><input type="checkbox" id="flexi"> Flexi (+$5 a week, 30 days notice, no lock-in)</label>
<div class="plans" id="plans" style="margin-top:10px"></div>
<h3 style="margin:18px 0 8px"><span class="stepn">2</span>Their details</h3>
<div class="grid2">
<label class="fld">First name<input id="first" autocomplete="off"></label>
<label class="fld">Last name<input id="last" autocomplete="off"></label>
<label class="fld">Email<input id="email" type="email" autocomplete="off"></label>
<label class="fld">Mobile<input id="mobile" inputmode="tel" autocomplete="off"></label>
<label class="fld">Date of birth<input id="dob" type="date"></label>
<label class="fld">Gender<select id="gender"><option value="">Prefer not to say</option><option value="F">Female</option><option value="M">Male</option><option value="O">Other</option></select></label>
<label class="fld">Main goal<select id="goal"><option value="">Pick one</option></select></label>
<label class="fld">Where did they hear about us<select id="source"><option value="">Pick one</option></select></label>
<label class="fld">Emergency contact name<input id="ename" autocomplete="off"></label>
<label class="fld">Emergency contact phone<input id="ephone" inputmode="tel" autocomplete="off"></label>
</div>
<label style="display:flex;gap:8px;align-items:center;margin-top:12px;font-size:14px"><input type="checkbox" id="passport"> Fitness Passport member (no M2 offers or trials)</label>
<div id="mateWrap" style="margin-top:10px"><label class="fld">Brought by a member? (Bring a Mate)<input id="mate" placeholder="Search the member who brought them" autocomplete="off"></label><div id="mateRes"></div><div id="mateSel" class="muted"></div></div>
<h3 style="margin:18px 0 8px"><span class="stepn">3</span>Terms and signature</h3>
<p class="muted" style="margin:0 0 8px">Talk them through the membership terms, then they sign below.</p>
<canvas id="sig"></canvas>
<div style="display:flex;gap:10px;align-items:center;margin-top:8px"><label style="display:flex;gap:8px;align-items:center;font-size:14px"><input type="checkbox" id="agreed"> They've agreed to the terms</label><button class="btn line" id="sigClear" style="height:34px;margin-left:auto">Clear signature</button></div>
<div class="err" id="aErr" style="margin-top:10px"></div>
<button class="btn dark" id="aSave" style="margin-top:12px">Add member</button>
</div>
<div id="a2" hidden>
<div class="ok" id="aDone"></div>
<h3 style="margin:16px 0 8px"><span class="stepn">4</span>Bank details</h3>
<p class="muted" id="billNote" style="margin:0 0 10px"></p>
<div style="display:flex;gap:16px;align-items:center;flex-wrap:wrap"><button class="btn dark" id="billOpen">Enter bank details</button><div id="qr"></div></div>
<label style="display:flex;gap:8px;align-items:center;margin-top:10px;font-size:14px"><input type="checkbox" id="billDone"> Bank details are in</label>
<h3 style="margin:18px 0 8px"><span class="stepn">5</span>Key tag</h3>
<p class="muted" style="margin:0 0 8px">Scan the new tag. The reader types the number for you.</p>
<input id="tag" class="tagbox" autocomplete="off" placeholder="Scan tag">
<div class="err" id="tagErr" style="margin-top:8px"></div>
<div id="tagOk"></div>
<button class="btn" id="aFinish" style="margin-top:14px">Done</button>
</div>
</section>
</main>
<script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"></script>
<script>
const $=s=>document.querySelector(s);
const esc=s=>String(s??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const get=u=>fetch(u).then(r=>r.json());
(async()=>{
 const me=await get("/api/me"); $("#me").textContent=me.name+", "+me.role;
 const s=await get("/api/summary");
 if(s.last_sync) $("#sync").textContent="Last copy from GymMaster: "+(s.last_sync.finished_at||"running")+(s.last_sync.ok===0?" (failed)":"");
 const fam=Object.fromEntries((s.by_family||[]).map(f=>[f.family,f.n]));
 const t=[["Members",s.members,1],["Fitness Passport",s.passport],["Perform",fam.perform||0],["Daily",fam.daily||0],
  ["Lead source recorded",s.lead_source_pct+"%"],["Trials that joined",s.trials&&s.trials.total?Math.round(100*s.trials.joined/s.trials.total)+"%":"-"],["Blocked at the door",s.blocked]];
 if(me.can.business){t.push(["Billed weekly by Ezidebit","$"+Math.round(s.weekly_billed||0).toLocaleString(),1]);t.push(["Owed to M2","$"+Math.round(s.owed_total||0).toLocaleString()]);}
 $("#tiles").innerHTML=t.map(([l,n,d])=>'<div class="tile'+(d?" dark":"")+'"><div class="n">'+esc(typeof n==="number"?n.toLocaleString():n)+'</div><div class="l">'+esc(l)+'</div></div>').join("");
 $("#biz").hidden=false;
})().catch(e=>{$("#sync").innerHTML='<span class="err">'+esc(e)+'</span>'});
let timer;
$("#q").addEventListener("input",e=>{clearTimeout(timer);timer=setTimeout(async()=>{
 const d=await get("/api/members?q="+encodeURIComponent(e.target.value));
 $("#results").innerHTML=(d.results||[]).map(m=>'<div class="row" data-id="'+m.id+'"><span><b>'+esc(m.first_name+" "+(m.last_name||""))+'</b> <span class="muted">'+esc(m.plan||"")+'</span></span><span class="pill'+(m.family==="perform"?" dark":"")+'">'+esc(m.family||m.status)+'</span></div>').join("")||(e.target.value.length>1?'<div class="muted">No one found</div>':"");
},250)});
$("#results").addEventListener("click",async e=>{const r=e.target.closest(".row");if(!r)return;
 const d=await get("/api/members/"+r.dataset.id);const p=$("#profile");p.hidden=false;
 if(d.error){p.innerHTML='<div class="err">'+esc(d.error)+'</div>';return}
 const m=d.member,ms=d.memberships[0]||{};
 p.innerHTML='<h2>'+esc(m.first_name+" "+(m.last_name||""))+'</h2>'+
  '<div>'+d.flags.map(f=>'<span class="pill">'+esc(f.flag+(f.detail?": "+f.detail:""))+'</span> ').join("")+'</div>'+
  '<div class="tiles">'+
  '<div class="tile"><div class="l">Plan</div><div>'+esc(ms.plan||"-")+'</div></div>'+
  '<div class="tile"><div class="l">Since</div><div>'+esc(ms.start_date||m.joined_on||"-")+'</div></div>'+
  '<div class="tile"><div class="l">Visits, all time</div><div>'+esc(m.total_visits_gm)+'</div></div>'+
  '<div class="tile"><div class="l">Came from</div><div>'+esc(m.lead_source||"Not recorded")+'</div></div>'+
  (d.billing?'<div class="tile"><div class="l">Owes</div><div>$'+esc((d.billing.balance_owing||0).toFixed(2))+'</div></div>':"")+
  '</div><div class="muted">Mobile '+esc(m.mobile||"-")+', email '+esc(m.email||"-")+'</div>';
 p.scrollIntoView({behavior:"smooth"});
});
/* ---------- add a member ---------- */
let PL=null,pick={fam:"perform",freq:"weekly"},sel=null,mate=null,newId=null;
const FAMN={perform:"Perform",classes:"Classes",daily:"Daily",recovery:"Recovery",trial:"Trial or pass"};
const FREQN={weekly:"Weekly",fortnightly:"Fortnightly",monthly:"Monthly",quarterly:"Quarterly",upfront:"Paid upfront"};
fetch("/api/me").then(r=>r.json()).then(me=>{ if(me.can&&me.can.add) $("#addBtn").hidden=false; });
$("#addBtn").addEventListener("click",async()=>{ $("#add").hidden=false; $("#a1").hidden=false; $("#a2").hidden=true; $("#add").scrollIntoView({behavior:"smooth"}); if(!PL) await loadPlans(); });
$("#addClose").addEventListener("click",()=>{ $("#add").hidden=true; });
async function loadPlans(){
 const d=await get("/api/plans"); if(d.error){ $("#plans").innerHTML='<div class="err">'+esc(d.error)+'</div>'; return; }
 PL=d.plans;
 $("#goal").innerHTML+=d.goals.map(g=>'<option>'+esc(g)+'</option>').join("");
 $("#source").innerHTML+=d.sources.map(g=>'<option>'+esc(g)+'</option>').join("");
 drawPlans();
}
function drawPlans(){
 const fams=[...new Set(PL.map(p=>p.family))];
 $("#fam").innerHTML=fams.map(f=>'<button type="button" class="chip'+(f===pick.fam?" on":"")+'" data-f="'+f+'">'+FAMN[f]+'</button>').join("");
 const freqs=[...new Set(PL.filter(p=>p.family===pick.fam).map(p=>p.frequency))];
 if(!freqs.includes(pick.freq)) pick.freq=freqs[0];
 $("#freq").innerHTML=pick.fam==="trial"?"":freqs.map(f=>'<button type="button" class="chip'+(f===pick.freq?" on":"")+'" data-q="'+f+'">'+FREQN[f]+'</button>').join("");
 const fx=$("#flexi").checked;
 const list=PL.filter(p=>p.family===pick.fam&&(pick.fam==="trial"||(p.frequency===pick.freq&&(p.frequency==="upfront"||p.frequency==="quarterly"||p.flexi===fx))));
 $("#plans").innerHTML=list.map(p=>'<button type="button" class="plan'+(sel&&sel.id===p.id?" on":"")+'" data-p="'+p.id+'"><b>'+esc(p.name)+'</b><span>'+esc(p.price+" "+(p.priceDescription||""))+(p.signupFee?", joining fee $"+p.signupFee:"")+'</span></button>').join("")||'<div class="muted">Nothing for that combination.</div>';
}
$("#fam").addEventListener("click",e=>{const b=e.target.closest("[data-f]");if(!b)return;pick.fam=b.dataset.f;sel=null;drawPlans();});
$("#freq").addEventListener("click",e=>{const b=e.target.closest("[data-q]");if(!b)return;pick.freq=b.dataset.q;sel=null;drawPlans();});
$("#flexi").addEventListener("change",()=>{sel=null;drawPlans();});
$("#plans").addEventListener("click",e=>{const b=e.target.closest("[data-p]");if(!b)return;sel=PL.find(p=>p.id===+b.dataset.p);drawPlans();});
$("#passport").addEventListener("change",e=>{ $("#mateWrap").hidden=e.target.checked; if(e.target.checked){mate=null;$("#mateSel").textContent="";} });
let mt; $("#mate").addEventListener("input",e=>{clearTimeout(mt);mt=setTimeout(async()=>{
 if(e.target.value.length<2){$("#mateRes").innerHTML="";return;}
 const d=await get("/api/members?q="+encodeURIComponent(e.target.value));
 $("#mateRes").innerHTML=(d.results||[]).slice(0,6).map(m=>'<div class="row" data-m="'+m.id+'" data-n="'+esc(m.first_name+" "+(m.last_name||""))+'"><span>'+esc(m.first_name+" "+(m.last_name||""))+'</span><span class="pill">'+esc(m.family||"")+'</span></div>').join("");
},250)});
$("#mateRes").addEventListener("click",e=>{const r=e.target.closest("[data-m]");if(!r)return;mate=+r.dataset.m;$("#mateSel").textContent="Brought by "+r.dataset.n+". Both get 4 weeks free.";$("#mateRes").innerHTML="";$("#mate").value="";});
// signature pad
const cv=$("#sig"),cx=cv.getContext("2d");let drawing=false,signed=false;
function sizeSig(){const r=cv.getBoundingClientRect();if(!r.width)return;cv.width=r.width*2;cv.height=r.height*2;cx.scale(2,2);cx.lineWidth=2;cx.lineCap="round";cx.strokeStyle="#0A0A0A";signed=false;}
new ResizeObserver(sizeSig).observe(cv);
const pt=e=>{const r=cv.getBoundingClientRect();return[e.clientX-r.left,e.clientY-r.top]};
cv.addEventListener("pointerdown",e=>{drawing=true;cv.setPointerCapture(e.pointerId);const[x,y]=pt(e);cx.beginPath();cx.moveTo(x,y);});
cv.addEventListener("pointermove",e=>{if(!drawing)return;const[x,y]=pt(e);cx.lineTo(x,y);cx.stroke();signed=true;});
cv.addEventListener("pointerup",()=>{drawing=false;});
$("#sigClear").addEventListener("click",()=>{cx.clearRect(0,0,cv.width,cv.height);signed=false;});
$("#aSave").addEventListener("click",async()=>{
 $("#aErr").textContent="";
 if(!sel){$("#aErr").textContent="Pick a membership first.";return;}
 if(!signed){$("#aErr").textContent="They need to sign first.";return;}
 const body={planId:sel.id,planName:sel.name,first:$("#first").value,last:$("#last").value,email:$("#email").value,mobile:$("#mobile").value,
  dob:$("#dob").value,gender:$("#gender").value,goal:$("#goal").value,source:$("#source").value,emergencyName:$("#ename").value,emergencyPhone:$("#ephone").value,
  passport:$("#passport").checked,referredBy:mate,agreed:$("#agreed").checked,signature:cv.toDataURL("image/png")};
 $("#aSave").disabled=true;$("#aSave").textContent="Adding...";
 let d; try{ d=await fetch("/api/members",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)}).then(r=>r.json()); }catch(e){ d={error:String(e)}; }
 $("#aSave").disabled=false;$("#aSave").textContent="Add member";
 if(!d.ok){$("#aErr").textContent=d.error||"Something went wrong.";return;}
 newId=d.id;$("#a1").hidden=true;$("#a2").hidden=false;
 $("#aDone").innerHTML="<b>"+esc(body.first+" "+body.last)+"</b> is in, on "+esc(sel.name)+"."+(d.warnings&&d.warnings.length?"<br>"+d.warnings.map(esc).join("<br>"):"");
 const bl=await get("/api/members/"+newId+"/billing-link");
 if(!d.needsBilling){$("#billNote").textContent="No bank details needed for this one.";$("#billOpen").hidden=true;}
 else{$("#billNote").textContent=bl.note||"";$("#billOpen").hidden=false;$("#billOpen").dataset.url=bl.url||"";
  if(bl.mode==="ezidebit"&&window.QRCode){$("#qr").innerHTML="";new QRCode($("#qr"),{text:bl.url,width:120,height:120});}}
 setTimeout(()=>$("#tag").focus(),100);
});
$("#billOpen").addEventListener("click",e=>{const u=e.currentTarget.dataset.url;if(u)window.open(u,"m2billing","width=900,height=900");});
async function saveTag(){
 $("#tagErr").textContent="";const t=$("#tag").value.trim();if(!t)return;
 const d=await fetch("/api/members/"+newId+"/key-tag",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({tag:t})}).then(r=>r.json());
 if(!d.ok){$("#tagErr").textContent=d.error;$("#tag").select();return;}
 $("#tagOk").innerHTML='<div class="ok">Tag '+esc(d.tag)+' saved. '+esc(d.note||"")+' <a href="'+esc(d.gymmasterUrl)+'" target="_blank" rel="noopener">Open in GymMaster</a></div>';
}
$("#tag").addEventListener("keydown",e=>{if(e.key==="Enter"){e.preventDefault();saveTag();}});
$("#tag").addEventListener("change",saveTag);
$("#aFinish").addEventListener("click",()=>{
 if(newId&&!$("#billDone").checked&&!$("#billOpen").hidden&&!confirm("Bank details aren't ticked off. It'll stay on the Today list until they are. Finish anyway?"))return;
 location.reload();
});
</script></body></html>`;
