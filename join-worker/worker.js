// M2 Join worker
// Backend for m2club.co.nz/join.html. Holds the GymMaster Member Portal API key
// so it never appears in the website code, and does the signup in GymMaster.
//
//   GET  /memberships[?code=X] online memberships, trimmed for the page (cached 5 min).
//                              With a GymMaster discount code, prices come back discounted.
//   GET  /agreement?id=844686  terms & conditions for a membership type
//   POST /signup               create the member + membership, log T&Cs, save signature,
//                              then optionally drop them into the PT Leads sheet
//   GET  /chase?key=K&offset=0 new members (last CHASE_DAYS) on a paid membership with no
//                              billing method. Checks CHASE_BATCH members per call; call again
//                              with next_offset until done. Used by the daily reception email.
//
// Secrets:  GM_API_KEY     GymMaster "Low Permission API Key" (Settings > Integrations)
//           GM_STAFF_KEY   GymMaster "High Permission API Key" (used by /chase, and to add a membership to
//                          someone already in GymMaster, like a trial member joining properly)
//           CHASE_KEY      shared secret the daily email task sends as ?key=
// Vars:     GM_BASE        https://m2trainingclub.gymmasteronline.com/portal/api
//           COMPANY_ID     4
//           PT_SCRIPT      PT Leads Apps Script web app URL ("" to switch off)
//           BILLING_GRACE_DAYS  days after start before the first debit (0 = GymMaster default)
//           HIDE_IDS       comma separated membership type ids to keep off the page
//           ALLOWED_ORIGINS comma separated origins allowed to call this worker
//           PASSPORT_IDS   comma separated Fitness Passport membership type ids (default 844596).
//                          Signups on these need a Fitness Passport ID and never take promo codes.
//           CORE           service binding to m2-core (wrangler.toml), used ahead of CORE_URL
//           CORE_URL       M2 Core base URL. With the INTAKE_KEY secret set, new Passport members
//                          and their ID go to the Core, which puts "type the ID into GymMaster"
//                          on reception's Today list.
// Secret:   INTAKE_KEY     same value as M2 Core's INTAKE_KEY
// Secret:   META_CAPI_TOKEN Conversions API access token for the M2 Pixel (Events Manager > Settings >
//                          Conversions API > Generate access token). Unset = server purchases off.
// Vars:     META_PIXEL_ID  default 1173983798207057.  META_TEST_CODE  optional, Events Manager test code.

const CACHE_SECONDS = 300;
const recent = new Map(); // ip -> [timestamps], simple per-isolate rate limit

export default {
  async fetch(req, env, ctx) {
    const url = new URL(req.url);
    const origin = req.headers.get("Origin") || "";
    const cors = corsHeaders(origin, env);

    if (req.method === "OPTIONS" && url.pathname !== "/core-import" && url.pathname !== "/app") return new Response(null, { status: 204, headers: cors });

    try {
      if (url.pathname === "/memberships" && req.method === "GET") {
        const code = clean(url.searchParams.get("code")).toUpperCase();
        return out(await memberships(env, code), cors, code ? 60 : CACHE_SECONDS);
      }
      if (url.pathname === "/chase" && req.method === "GET") {
        if (!env.CHASE_KEY || url.searchParams.get("key") !== env.CHASE_KEY) return out({ ok: false, error: "Not allowed" }, cors, 0, 403);
        return out(await chase(env, parseInt(url.searchParams.get("offset") || "0", 10)), cors);
      }
      if (url.pathname === "/agreement" && req.method === "GET") return out(await agreement(env, url.searchParams.get("id")), cors, CACHE_SECONDS);
      if (url.pathname === "/signup" && req.method === "POST") {
        if (!cors["Access-Control-Allow-Origin"]) return out({ ok: false, error: "Not allowed" }, cors, 0, 403);
        const ip = req.headers.get("CF-Connecting-IP") || "?";
        if (limited(ip)) return out({ ok: false, error: "Too many attempts. Please wait a few minutes and try again." }, cors, 0, 429);
        const body = await req.json();
        const r = await signup(env, body);
        // Paid sign-ups also go to Meta from here (Conversions API), so sales still count when the
        // browser blocks the Pixel. Same event id as the Pixel's Purchase, so Meta counts it once.
        if (r && r.ok && r.paid && !r.passport && r.memberid && env.META_CAPI_TOKEN) {
          const job = metaPurchase(env, req, body, r).catch(e => console.log("meta capi", String(e)));
          if (ctx && ctx.waitUntil) ctx.waitUntil(job); else await job;
        }
        return out(r, cors);
      }
      // One-time copy of GymMaster's email automations into the Core, sent from a signed-in
      // GymMaster staff page. The Core checks a one-time code the owners create.
      if (url.pathname === "/core-import" && env.CORE) {
        const gm = { "Access-Control-Allow-Origin": "https://m2trainingclub.gymmasteronline.com", "Access-Control-Allow-Methods": "POST", "Access-Control-Allow-Headers": "Content-Type", "Vary": "Origin" };
        if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: gm });
        if (req.method !== "POST" || origin !== "https://m2trainingclub.gymmasteronline.com") return new Response("Not allowed", { status: 403, headers: gm });
        const r = await env.CORE.fetch(new Request("https://m2-core/gm-import", { method: "POST", headers: { "Content-Type": "application/json" }, body: await req.text() }));
        return new Response(await r.text(), { status: r.status, headers: { ...gm, "Content-Type": "application/json" } });
      }
      // The M2 member app's backend. Members sign in with their own session, so any origin may call it
      // (the app runs on m2club.co.nz and inside the phone app). Plain text body, so no preflight is needed.
      if (url.pathname === "/app" && env.CORE) {
        const ac = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "POST", "Access-Control-Allow-Headers": "Content-Type" };
        if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: ac });
        if (req.method !== "POST") return new Response(JSON.stringify({ ok: true, service: "M2 app" }), { headers: { ...ac, "Content-Type": "application/json" } });
        const r = await env.CORE.fetch(new Request("https://m2-core/app-api", { method: "POST", headers: { "Content-Type": "application/json", "X-Client-IP": req.headers.get("CF-Connecting-IP") || "" }, body: await req.text() }));
        return new Response(await r.text(), { status: r.status, headers: { ...ac, "Content-Type": "application/json", "Cache-Control": "no-store" } });
      }
      // Member-facing M2 Core pages, passed straight through to the Core.
      if ((url.pathname === "/unsubscribe" || url.pathname === "/billing-done") && env.CORE) {
        return env.CORE.fetch(new Request("https://m2-core" + url.pathname + url.search, { method: req.method === "POST" ? "POST" : "GET" }));
      }
      if (url.pathname === "/") return out({ ok: true, service: "m2-join" }, cors);
      return out({ error: "Not found" }, cors, 0, 404);
    } catch (e) {
      return out({ ok: false, error: "Something went wrong on our end. Please try again or call reception." , detail: String(e && e.message || e) }, cors, 0, 500);
    }
  }
};

/* ---------------- helpers ---------------- */

function corsHeaders(origin, env) {
  const allowed = (env.ALLOWED_ORIGINS || "https://m2club.co.nz,https://www.m2club.co.nz").split(",").map(s => s.trim());
  const h = { "Vary": "Origin" };
  if (allowed.includes(origin) || /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
    h["Access-Control-Allow-Origin"] = origin;
    h["Access-Control-Allow-Methods"] = "GET,POST,OPTIONS";
    h["Access-Control-Allow-Headers"] = "Content-Type";
  }
  return h;
}

function out(data, cors, maxAge = 0, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...cors, "Content-Type": "application/json", "Cache-Control": maxAge ? `public, max-age=${maxAge}` : "no-store" }
  });
}

function limited(ip) {
  const now = Date.now(), win = 10 * 60 * 1000;
  const list = (recent.get(ip) || []).filter(t => now - t < win);
  list.push(now);
  recent.set(ip, list);
  return list.length > 6;
}

async function gmGet(env, path, params = {}) {
  const u = new URL(env.GM_BASE + path);
  u.searchParams.set("api_key", env.GM_API_KEY);
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== null && v !== "") u.searchParams.set(k, v);
  const r = await fetch(u.toString(), { cf: { cacheTtl: 60 } });
  return r.json();
}

async function gmPost(env, path, fields, query = {}) {
  const u = new URL(env.GM_BASE + path);
  for (const [k, v] of Object.entries(query)) u.searchParams.set(k, v);
  const body = new URLSearchParams({ api_key: env.GM_API_KEY });
  for (const [k, v] of Object.entries(fields)) if (v !== undefined && v !== null && v !== "") body.set(k, v);
  const r = await fetch(u.toString(), { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body });
  const text = await r.text();
  try { return JSON.parse(text); } catch { return { error: "Unexpected reply from GymMaster (" + r.status + ")", raw: text.slice(0, 300) }; }
}

function nzToday() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Pacific/Auckland" }).format(new Date());
}
function addDays(iso, n) {
  const d = new Date(iso + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
const money = s => parseFloat(String(s || "0").replace(/[^0-9.]/g, "")) || 0;
const clean = s => String(s || "").trim().replace(/\s+/g, " ");

/* ---------------- memberships ---------------- */

async function memberships(env, code) {
  const d = await gmGet(env, "/v1/memberships", code ? { discount_code: code, companyid: env.COMPANY_ID } : {});
  if (d.error) {
    if (code) return { ok: false, badCode: true, error: /not found/i.test(d.error) ? "That promo code isn't valid." : d.error };
    throw new Error(d.error);
  }
  const hide = new Set((env.HIDE_IDS || "").split(",").map(s => s.trim()).filter(Boolean));
  const list = (d.result || [])
    .filter(m => !hide.has(String(m.id)))
    .filter(m => !m.companyids || !m.companyids.length || m.companyids.includes(Number(env.COMPANY_ID)))
    .map(m => ({
      id: m.id,
      name: clean(m.name),
      division: m.divisionname,
      description: String(m.description || "").split(/\r?\n/).map(s => s.trim()).filter(Boolean),
      price: m.price,
      priceValue: money(m.price),
      priceDescription: m.pricedescription,
      signupFee: money(m.signupfee) > 0 ? m.signupfee : null,
      length: m.membership_length,
      promo: m.promotion_period_description || m.promotion_freeuntil_description || null,
      discount: m.discountdescription || null,
      fullPrice: m.prediscountprice && m.prediscountprice !== m.price ? m.prediscountprice : null,
      fullSignupFee: m.prediscountsignupfee && m.prediscountsignupfee !== m.signupfee ? m.prediscountsignupfee : null,
      credit: money(m.account_credit) > 0 ? m.account_credit : null,
      sort: m.sortorder
    }));
  return { ok: true, code: code || null, memberships: list };
}

async function agreement(env, id) {
  if (!/^\d+$/.test(String(id || ""))) return { ok: false, error: "Bad membership id" };
  const d = await gmGet(env, `/v2/membership/${id}/agreement`);
  if (d.error) return { ok: false, error: d.error };
  // Only agreements with something to agree to. The "Default Contract Summary"
  // is a template GymMaster fills in itself, so it shows up blank here.
  const list = (d.result || [])
    .filter(a => (a.points || []).length)
    .map(a => ({ id: a.id, name: a.name, body: stripScripts(a.body || ""), points: (a.points || []).map(p => p.label || String(p)) }));
  return { ok: true, agreements: list };
}

function stripScripts(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/javascript:/gi, "");
}

/* ---------------- signup ---------------- */


// Send something to M2 Core's intake (service binding first, CORE_URL as a fallback). Never throws.
async function core(env, body) {
  if (!(env.CORE || env.CORE_URL) || !env.INTAKE_KEY) return { ok: false, error: "Core not connected" };
  try {
    const url = (env.CORE ? "https://m2-core" : env.CORE_URL.replace(/\/$/, "")) + "/api/intake";
    const r = await (env.CORE ? env.CORE.fetch.bind(env.CORE) : fetch)(url, { method: "POST",
      headers: { "Content-Type": "application/json", "X-M2-Key": env.INTAKE_KEY, "Origin": "https://m2club.co.nz" }, body: JSON.stringify(body) });
    return await r.json().catch(() => ({ ok: false, error: "Core replied " + r.status }));
  } catch (e) { return { ok: false, error: String(e && e.message || e) }; }
}

async function signup(env, b) {
  // Bot checks. Hidden field filled in, or the whole form done in under 8 seconds.
  // (Not called "company": Chrome autofills that with the person's employer.)
  if (b.m2_check || (typeof b.elapsed === "number" && b.elapsed < 8)) return { ok: true };

  const passportIds = (env.PASSPORT_IDS || "844596").split(",").map(s => s.trim()).filter(Boolean);
  const isPassport = passportIds.includes(String(b.membershipId || ""));
  const fpId = String(b.fpId || "").replace(/\D/g, "");

  const f = {
    firstname: clean(b.firstname),
    surname: clean(b.surname),
    email: clean(b.email).toLowerCase(),
    phonecell: clean(b.phone),
    dob: clean(b.dob),
    gender: ["M", "F", "O"].includes(b.gender) ? b.gender : "",
    addressstreet: clean(b.street),
    addresssuburb: clean(b.suburb),
    addresscity: clean(b.city),
    addressareacode: clean(b.postcode),
    password: String(b.password || ""),
    membershiptypeid: String(b.membershipId || "")
  };

  // Validation (the page checks all of this too)
  const missing = ["firstname", "surname", "email", "phonecell", "dob", "password", "membershiptypeid"].filter(k => !f[k]);
  if (missing.length) return { ok: false, error: "Please fill in all the required details." };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email)) return { ok: false, error: "That email address doesn't look right." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(f.dob)) return { ok: false, error: "Please check your date of birth." };
  if (ageOn(f.dob, nzToday()) < 18) return { ok: false, under18: true, error: "Sorry, M2 memberships are for adults 18 and over." };
  if (f.password.length < 6) return { ok: false, error: "Your password needs to be at least 6 characters." };
  if (!b.agreed) return { ok: false, error: "Please agree to the terms and conditions." };
  if (isPassport && (fpId.length < 5 || fpId.length > 12)) return { ok: false, error: "Please enter your Fitness Passport ID. It's the number on your Fitness Passport card or in the app." };

  // Make sure the membership is still one we sell online.
  // Passport members never get promo codes (they're excluded from every M2 offer).
  const code = isPassport ? "" : clean(b.code).toUpperCase();
  const mr = await memberships(env, code);
  if (!mr.ok) return { ok: false, error: mr.error };
  const ms = mr.memberships;
  let m = ms.find(x => String(x.id) === f.membershiptypeid);
  if (!m && isPassport) m = { id: Number(f.membershiptypeid), name: "Fitness Passport", price: "$0.00", priceValue: 0, priceDescription: "", length: null };
  if (!m) return { ok: false, error: "That membership isn't available online any more. Please pick another." };

  // M2 Core first: record them as an unfinished sign-up, so nobody is lost if GymMaster then fails.
  const priceNum = Number(String(m.priceValue ?? "").replace(/[^0-9.]/g, "")) || 0;
  const coreBase = { first: f.firstname, last: f.surname, email: f.email, mobile: f.phonecell, plan_name: m.name, plan_id: m.id, code: code || null,
    source: clean(b.source) || "Online signup", campaign: clean(b.campaign || b.utm_campaign),
    mate: isPassport ? "" : clean(b.mate).slice(0, 80),
    health: b.health && typeof b.health === "object" ? { injury: !!b.health.injury, injury_detail: clean(b.health.injury_detail).slice(0, 300), doctor: !!b.health.doctor,
                                                         doctor_detail: clean(b.health.doctor_detail).slice(0, 300), pregnant: !!b.health.pregnant } : null };
  const started = await core(env, { kind: "join_start", ...coreBase });

  // When GymMaster has been switched off (JOIN_MODE = core), the Core is the only system.
  if (env.JOIN_MODE === "core") {
    const r = await core(env, { kind: "online_join", ...coreBase, lead_id: started.lead_id, price: priceNum, paid: m.priceValue > 0, dob: f.dob, gender: f.gender,
      suburb: f.addresssuburb, fp_id: isPassport ? fpId : null, agreed: !!b.agreed, signature: b.signature, photo: b.photo, password: f.password });
    if (!r.ok) return { ok: false, exists: !!r.exists, error: r.error || "Something went wrong. Please try again or pop in to reception." };
    return { ok: true, memberid: r.member_id, paid: m.priceValue > 0, membership: m.name, code: code || null, passport: isPassport, fpSaved: isPassport, photoSaved: !!b.photo, warnings: [], value: priceNum, membershipTypeId: m.id };
  }

  // Already in GymMaster? Trial members joining properly, and past members coming back, keep their
  // record and just get the new membership added. Current members are sent to reception.
  const ex = await gmGet(env, "/v2/member/exists", { email: f.email });
  if (ex && ex.result && ex.result.id) {
    return existingJoin(env, Number(ex.result.id), f, m, b, { code, isPassport, fpId, coreBase, started, priceNum });
  }

  // Create member + membership
  const today = nzToday();
  const grace = parseInt(env.BILLING_GRACE_DAYS || "0", 10);
  const paid = m.priceValue > 0;
  const fields = { ...f, companyid: env.COMPANY_ID, startdate: today };
  if (code) fields.discount_code = code;
  if (paid && grace > 0 && !m.length) fields.firstpaymentdate = addDays(today, grace);

  let res = await gmPost(env, "/v1/signup", fields);
  if (res.error && fields.firstpaymentdate && /payment/i.test(res.error)) {
    delete fields.firstpaymentdate; // GymMaster didn't like the date, fall back to its default
    res = await gmPost(env, "/v1/signup", fields);
  }
  if (res.error || !res.memberid) {
    if (isPassport && /not available|online|not found|invalid membership/i.test(String(res.error || ""))) {
      return { ok: false, error: "Fitness Passport sign-up isn't open online just yet. Please pop in to reception with your Fitness Passport card and we'll sign you up in a couple of minutes." };
    }
    return { ok: false, error: friendly(res.error) };
  }

  const token = res.token, memberid = res.memberid, membershipid = res.membershipid;
  const warnings = [];

  // Log T&C agreement and save the signature against the membership
  if (membershipid) {
    const a = await gmPost(env, `/v2/member/membership/${membershipid}/agreement`, { token });
    if (a.error) warnings.push("agreement: " + a.error);
    if (b.signature && /^data:image\/png;base64,/.test(b.signature)) {
      const s = await gmPost(env, "/v2/member/signature", { token, membershipid, file: b.signature, source: "m2club.co.nz online signup" });
      if (s.error) warnings.push("signature: " + s.error);
    }
  }

  // Profile photo (selfie from the join page). GymMaster shows it at the desk.
  let photoSaved = false;
  if (!token && b.photo) warnings.push("photo: GymMaster sign-up returned no login token");
  if (token && typeof b.photo === "string" && /^data:image\/(jpeg|png);base64,/.test(b.photo) && b.photo.length < 2_000_000) {
    const pr = await savePhoto(env, token, b.photo);
    photoSaved = pr.ok;
    if (!pr.ok) warnings.push("photo: " + pr.log.join(" | "));
  }

  // Copy the new member into M2 Core straight away (same number as GymMaster): membership, lead source,
  // photo, signed agreement, Passport ID and the "get bank details" job. The Passport ID can't go into
  // GymMaster's online sign-up, so the Core lists it for reception to type in.
  let fpSaved = false;
  const cr = await core(env, { kind: "online_join", ...coreBase, gm_id: memberid, lead_id: started.lead_id, price: priceNum, paid: m.priceValue > 0, dob: f.dob, gender: f.gender,
    suburb: f.addresssuburb, fp_id: isPassport ? fpId : null, agreed: !!b.agreed, signature: b.signature,
    photo: typeof b.photo === "string" && /^data:image\/jpeg/.test(b.photo) ? b.photo : null, password: f.password });
  if (!cr.ok) warnings.push("core: " + (cr.error || "no reply"));
  else fpSaved = isPassport;

  // Tell the team: goes into the PT Leads sheet, which emails Tim
  if (env.PT_SCRIPT) {
    const source = "Online signup: " + m.name + (code ? " [code " + code + "]" : "") + (b.source ? " (" + clean(b.source) + ")" : "");
    const note = [
      "Joined online: " + m.name + " (" + m.price + " " + (m.priceDescription || "") + ")",
      isPassport ? "FITNESS PASSPORT member, ID " + fpId + ". Type it into GymMaster (Additional Details)"
        : paid ? "BILLING DETAILS NEEDED at reception before key tag" : "Free trial, no billing needed",
      /recovery/i.test(m.name) ? "Recovery membership, no free PT" : "",
      "GymMaster member ID " + memberid,
      warnings.length ? "Check in GymMaster: " + warnings.join("; ") : ""
    ].filter(Boolean).join(". ");
    try {
      await fetch(env.PT_SCRIPT, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({
          action: "addLead",
          name: f.firstname + " " + f.surname,
          phone: f.phonecell,
          email: f.email,
          reasonForJoining: note,
          trainerPreference: "", trainingStyle: "", injuries: "", preferredTime: "",
          source
        })
      });
    } catch (e) { /* never fail a signup because the notification didn't send */ }
  }

  return { ok: true, memberid, membershipid, paid, membership: m.name, code: code || null, passport: isPassport, fpSaved, photoSaved, warnings, value: priceNum, membershipTypeId: m.id };
}

// Someone already in GymMaster (a trial, a pass, or a past member) joins online.
// Their identity is checked against the record (date of birth, plus mobile or name) before
// anything is added, so nobody can put a membership on someone else's account with just an email.
async function existingJoin(env, memberid, f, m, b, o) {
  const no = (error, extra = {}) => ({ ok: false, exists: true, error, ...extra });
  const desk = "You're already in our system with that email. Pop in and see us at reception and we'll get you sorted in a couple of minutes.";
  if (!env.GM_STAFF_KEY) return no(desk);

  const lg = await staffPost(env, "/v1/login", { memberid: String(memberid) });
  const token = lg && lg.result && lg.result.token;
  if (!token) return no(desk);

  // Same person? Date of birth must match, plus the mobile or the full name.
  const pr = await staffGet(env, "/v1/member/profile", { token });
  const p = (pr && (pr.result || pr)) || {};
  const digits = s => String(s || "").replace(/\D/g, "").slice(-8);
  const low = s => clean(s).toLowerCase();
  const dobOk = String(p.dob || "").slice(0, 10) === f.dob;
  const phoneOk = digits(p.phonecell) && digits(p.phonecell) === digits(f.phonecell);
  const nameOk = low(p.firstname) === low(f.firstname) && low(p.surname) === low(f.surname);
  if (!dobOk || !(phoneOk || nameOk)) {
    console.log("existing join: details don't match", memberid, { dobOk, phoneOk, nameOk });
    return no("You're already in our system with that email, but some of your details don't match what we have. Pop in and see us at reception and we'll sort it.");
  }

  // Already on a real membership (anything open ended, or ending more than a month away)? Reception handles changes.
  const today = nzToday(), monthOut = addDays(today, 31);
  const ms = await staffGet(env, "/v1/member/memberships", { token });
  const live = (ms.result || []).filter(x => !x.enddate || x.enddate === "Open Ended" || x.enddate >= today);
  const ongoing = live.filter(x => !x.enddate || x.enddate === "Open Ended" || x.enddate > monthOut);
  if (ongoing.length) return no("You're already a member with us (" + clean(ongoing[0].name) + "). To change your membership, pop in and see us at reception.", { current: true });
  const wasTrial = live.length > 0 || (ms.result || []).some(x => /trial|day|pass/i.test(x.name || ""));

  // Add the new membership to their existing record.
  const add = { token, membershiptypeid: f.membershiptypeid, startdate: today };
  let res = await staffPost(env, "/v1/memberships", o.code ? { ...add, discount_code: o.code } : add);
  let codeApplied = !!o.code;
  if ((res.error || !res.membershipid) && o.code) { res = await staffPost(env, "/v1/memberships", add); codeApplied = false; }
  if (res.error || !res.membershipid) {
    console.log("existing join: add membership failed", memberid, res);
    return no("We couldn't add that membership to your account online. Pop in and see us at reception and we'll do it in a couple of minutes.");
  }
  const membershipid = res.membershipid, warnings = [];
  if (o.code) warnings.push("code " + o.code + (codeApplied ? " sent with the membership, check the price in GymMaster" : " not applied, apply it at reception"));

  const a = await staffPost(env, `/v2/member/membership/${membershipid}/agreement`, { token });
  if (a.error) warnings.push("agreement: " + a.error);
  if (b.signature && /^data:image\/png;base64,/.test(b.signature)) {
    const s = await staffPost(env, "/v2/member/signature", { token, membershipid, file: b.signature, source: "m2club.co.nz online signup" });
    if (s.error) warnings.push("signature: " + s.error);
  }
  let photoSaved = false;
  if (typeof b.photo === "string" && /^data:image\/(jpeg|png);base64,/.test(b.photo) && b.photo.length < 2_000_000) {
    const ph = await savePhoto(env, token, b.photo, env.GM_STAFF_KEY);
    photoSaved = ph.ok;
    if (!ph.ok) warnings.push("photo: not saved");
  }

  const cr = await core(env, { kind: "online_join", ...o.coreBase, gm_id: memberid, lead_id: o.started.lead_id, price: o.priceNum, paid: m.priceValue > 0,
    dob: f.dob, gender: f.gender, suburb: f.addresssuburb, fp_id: o.isPassport ? o.fpId : null, agreed: !!b.agreed, signature: b.signature,
    photo: typeof b.photo === "string" && /^data:image\/jpeg/.test(b.photo) ? b.photo : null, password: f.password,
    converted: wasTrial ? "trial" : "returning", notes: warnings });
  if (!cr.ok) warnings.push("core: " + (cr.error || "no reply"));
  console.log("existing join ok", memberid, membershipid, warnings);
  return { ok: true, memberid, membershipid, paid: m.priceValue > 0, membership: m.name, code: o.code || null, passport: o.isPassport, value: o.priceNum, membershipTypeId: m.id,
           fpSaved: o.isPassport && cr.ok, photoSaved, converted: wasTrial ? "trial" : "returning", warnings };
}

function ageOn(dob, today) {
  const [y, mo, d] = dob.split("-").map(Number), [ty, tm, td] = today.split("-").map(Number);
  return ty - y - (tm < mo || (tm === mo && td < d) ? 1 : 0);
}

async function staffPost(env, path, fields) {
  const body = new URLSearchParams({ api_key: env.GM_STAFF_KEY });
  for (const [k, v] of Object.entries(fields)) if (v !== undefined && v !== null && v !== "") body.set(k, v);
  const r = await fetch(env.GM_BASE + path, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body });
  const text = await r.text();
  try { return JSON.parse(text); } catch { return { error: "Unexpected reply from GymMaster (" + r.status + ")" }; }
}

// GymMaster takes the photo on the member's profile (POST /v1/member/profile, multipart,
// field memberphoto: a file or a base64 string). GymMaster can answer "ok" without
// storing the photo, so after each attempt we read the profile back and only call it
// saved once memberphoto has a URL. Every attempt is logged (Cloudflare, m2-join, Logs).
async function savePhoto(env, token, dataUrl, apiKey) {
  const key = apiKey || env.GM_API_KEY;
  const type = dataUrl.slice(5, dataUrl.indexOf(";"));
  const b64 = dataUrl.split(",")[1];
  const bytes = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
  const url = env.GM_BASE + "/v1/member/profile";
  const photoNow = async () => {
    try {
      const u = new URL(url); u.searchParams.set("api_key", key); u.searchParams.set("token", token);
      const j = await (await fetch(u.toString())).json();
      const m = j.result || j;
      return String((m && m.memberphoto) || "");
    } catch (e) { return ""; }
  };
  const before = await photoNow();
  const attempts = [
    ["file", () => { const fd = new FormData(); fd.set("api_key", key); fd.set("token", token);
                     fd.set("memberphoto", new Blob([bytes], { type }), type === "image/png" ? "selfie.png" : "selfie.jpg"); return fd; }],
    ["base64", () => { const fd = new FormData(); fd.set("api_key", key); fd.set("token", token); fd.set("memberphoto", b64); return fd; }],
    ["dataurl", () => { const fd = new FormData(); fd.set("api_key", key); fd.set("token", token); fd.set("memberphoto", dataUrl); return fd; }],
  ];
  const log = [];
  for (const [name, body] of attempts) {
    try {
      const r = await fetch(url, { method: "POST", body: body() });
      const text = (await r.text()).slice(0, 200);
      const after = await photoNow();
      const ok = r.ok && !/"error"\s*:\s*"[^"]/.test(text) && after && after !== before;
      log.push(name + " " + r.status + " " + text.replace(/\s+/g, " ") + (after ? " photo=" + after.slice(0, 80) : " no photo"));
      if (ok) { console.log("photo saved via " + name, log); return { ok: true, via: name, log }; }
    } catch (e) { log.push(name + " threw " + String(e && e.message || e)); }
  }
  console.log("photo NOT saved", log);
  return { ok: false, log };
}

function friendly(err) {
  const e = String(err || "");
  if (/already/i.test(e) && /email/i.test(e)) return "You're already in our system with that email.";
  if (/age|old|dob|birth/i.test(e)) return "Sorry, we couldn't sign you up online with that date of birth. Please pop in and see us at reception.";
  return e ? "GymMaster said: " + e : "We couldn't finish your signup. Please try again or call reception.";
}

/* ---------------- chase: new members with no billing method ---------------- */

async function staffGet(env, path, params = {}) {
  const u = new URL(env.GM_BASE + path);
  u.searchParams.set("api_key", env.GM_STAFF_KEY);
  for (const [k, v] of Object.entries(params)) u.searchParams.set(k, v);
  return (await fetch(u.toString())).json();
}

async function chase(env, offset) {
  const days = parseInt(env.CHASE_DAYS || "21", 10);
  const batch = parseInt(env.CHASE_BATCH || "12", 10);
  const today = nzToday();
  const cutoff = addDays(today, -days);
  // members updated since the cutoff, then keep only people who joined since then
  const d = await staffGet(env, "/v1/members", { when: cutoff + " 00:00:00" });
  if (d.error) return { ok: false, error: d.error };
  const recentJoins = (d.result || [])
    .filter(m => m.joindate && m.joindate >= cutoff)
    .sort((a, b) => a.id - b.id);
  const slice = recentJoins.slice(offset, offset + batch);
  const items = [];
  for (const m of slice) {
    try {
      const lg = await fetch(env.GM_BASE + "/v1/login", {
        method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ api_key: env.GM_STAFF_KEY, memberid: String(m.id) })
      }).then(r => r.json());
      const token = lg.result && lg.result.token;
      if (!token) continue;
      const [ms, bal] = await Promise.all([
        staffGet(env, "/v1/member/memberships", { token }),
        staffGet(env, "/v1/member/outstandingbalance", { token })
      ]);
      const paid = (ms.result || []).filter(x => money(x.price) > 0 && (!x.enddate || x.enddate >= today) && !x.onhold);
      const noBilling = /no default billing|unable to bill/i.test(bal.next_bill || "");
      // Recurring memberships with no billing will fail every debit. Fixed passes only
      // matter if there's money owing (otherwise they've been paid at the desk).
      const owingNow = money(bal.owingamount) > 0;
      const recurring = paid.filter(x => !x.enddate || x.enddate === "Open Ended");
      if (!noBilling || !(recurring.length || owingNow)) continue;
      const first = paid.map(x => x.firstpaymentdate || x.nextpaymentdate).filter(Boolean).sort()[0] || null;
      items.push({
        id: m.id,
        name: (m.firstname + " " + m.surname).trim(),
        phone: m.phonecell || "",
        email: m.email || "",
        joined: m.joindate,
        daysSinceJoin: Math.round((new Date(today) - new Date(m.joindate)) / 86400000),
        membership: paid.map(x => x.name).join(", "),
        firstPayment: first,
        daysToFirstPayment: first ? Math.round((new Date(first) - new Date(today)) / 86400000) : null,
        owing: bal.owingamount || null,
        profile: "https://m2trainingclub.gymmasteronline.com/member/view/" + m.id
      });
    } catch (e) { /* skip this member, carry on */ }
  }
  const next = offset + slice.length;
  return { ok: true, today, cutoff, total: recentJoins.length, checked: slice.length, next_offset: next < recentJoins.length ? next : null, items };
}


/* ---------------- Meta Conversions API ---------------- */

async function sha256(v) {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(v));
  return [...new Uint8Array(d)].map(x => x.toString(16).padStart(2, "0")).join("");
}

function nzPhone(p) {
  let d = String(p || "").replace(/\D/g, "");
  if (!d) return "";
  if (d.startsWith("0")) d = "64" + d.slice(1);
  else if (!d.startsWith("64")) d = "64" + d;
  return d;
}

// One Purchase per paid online sign-up. event_id matches the Pixel's eventID on join.html
// ("join-<member id>-<membership type id>"), so Meta keeps whichever arrives first and drops the other.
async function metaPurchase(env, req, b, r) {
  const pixel = env.META_PIXEL_ID || "1173983798207057";
  const typeId = String(b.membershipId || r.membershipTypeId || "");
  const norm = v => String(v || "").trim().toLowerCase();
  const hashed = async v => (v ? [await sha256(v)] : undefined);
  const phone = nzPhone(b.phone);
  const fbc = clean(b.fbc) || (clean(b.fbclid) ? "fb.1." + Date.now() + "." + clean(b.fbclid) : "");
  const user_data = {
    em: await hashed(norm(b.email)),
    ph: await hashed(phone),
    fn: await hashed(norm(b.firstname)),
    ln: await hashed(norm(b.surname)),
    ct: await hashed(norm(b.city).replace(/\s+/g, "")),
    zp: await hashed(norm(b.postcode).replace(/\s+/g, "")),
    country: await hashed("nz"),
    external_id: await hashed(String(r.memberid)),
    client_ip_address: req.headers.get("CF-Connecting-IP") || undefined,
    client_user_agent: req.headers.get("User-Agent") || undefined,
    fbc: fbc || undefined,
    fbp: clean(b.fbp) || undefined
  };
  const body = {
    data: [{
      event_name: "Purchase",
      event_time: Math.floor(Date.now() / 1000),
      event_id: "join-" + r.memberid + "-" + typeId,
      action_source: "website",
      event_source_url: clean(b.pageUrl) || "https://m2club.co.nz/join.html",
      user_data,
      custom_data: { value: Number(r.value) || 0, currency: "NZD", content_name: r.membership, content_ids: [typeId], content_type: "product" }
    }]
  };
  if (env.META_TEST_CODE) body.test_event_code = env.META_TEST_CODE;
  const ver = env.META_API_VERSION || "v23.0";
  const res = await fetch(`https://graph.facebook.com/${ver}/${pixel}/events?access_token=${encodeURIComponent(env.META_CAPI_TOKEN)}`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body)
  });
  if (!res.ok) console.log("meta capi failed", res.status, (await res.text()).slice(0, 300));
}
