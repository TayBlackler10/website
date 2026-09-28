// M2 Join worker
// Backend for m2club.co.nz/join.html. Holds the GymMaster Member Portal API key
// so it never appears in the website code, and does the signup in GymMaster.
//
//   GET  /memberships          online memberships, trimmed for the page (cached 5 min)
//   GET  /agreement?id=844686  terms & conditions for a membership type
//   POST /signup               create the member + membership, log T&Cs, save signature,
//                              then drop them into the PT Leads sheet (emails Tim)
//
// Secrets:  GM_API_KEY     GymMaster "Low Permission API Key" (Settings > Integrations)
// Vars:     GM_BASE        https://m2trainingclub.gymmasteronline.com/portal/api
//           COMPANY_ID     4
//           PT_SCRIPT      PT Leads Apps Script web app URL ("" to switch off)
//           BILLING_GRACE_DAYS  days after start before the first debit (0 = GymMaster default)
//           HIDE_IDS       comma separated membership type ids to keep off the page
//           ALLOWED_ORIGINS comma separated origins allowed to call this worker

const CACHE_SECONDS = 300;
const recent = new Map(); // ip -> [timestamps], simple per-isolate rate limit

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    const origin = req.headers.get("Origin") || "";
    const cors = corsHeaders(origin, env);

    if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });

    try {
      if (url.pathname === "/memberships" && req.method === "GET") return out(await memberships(env), cors, CACHE_SECONDS);
      if (url.pathname === "/agreement" && req.method === "GET") return out(await agreement(env, url.searchParams.get("id")), cors, CACHE_SECONDS);
      if (url.pathname === "/signup" && req.method === "POST") {
        if (!cors["Access-Control-Allow-Origin"]) return out({ ok: false, error: "Not allowed" }, cors, 0, 403);
        const ip = req.headers.get("CF-Connecting-IP") || "?";
        if (limited(ip)) return out({ ok: false, error: "Too many attempts. Please wait a few minutes and try again." }, cors, 0, 429);
        return out(await signup(env, await req.json()), cors);
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

async function memberships(env) {
  const d = await gmGet(env, "/v1/memberships");
  if (d.error) throw new Error(d.error);
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
      sort: m.sortorder
    }));
  return { ok: true, memberships: list };
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

async function signup(env, b) {
  if (b.company) return { ok: true }; // honeypot filled in: quietly drop bots

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
  if (f.password.length < 6) return { ok: false, error: "Your password needs to be at least 6 characters." };
  if (!b.agreed) return { ok: false, error: "Please agree to the terms and conditions." };

  // Make sure the membership is still one we sell online
  const ms = (await memberships(env)).memberships;
  const m = ms.find(x => String(x.id) === f.membershiptypeid);
  if (!m) return { ok: false, error: "That membership isn't available online any more. Please pick another." };

  // Already in GymMaster?
  const ex = await gmGet(env, "/v2/member/exists", { email: f.email });
  if (ex && ex.result && ex.result.id) {
    return { ok: false, exists: true, current: !!ex.result.current,
      error: "You're already in our system with that email." };
  }

  // Create member + membership
  const today = nzToday();
  const grace = parseInt(env.BILLING_GRACE_DAYS || "0", 10);
  const paid = m.priceValue > 0;
  const fields = { ...f, companyid: env.COMPANY_ID, startdate: today };
  if (paid && grace > 0 && !m.length) fields.firstpaymentdate = addDays(today, grace);

  let res = await gmPost(env, "/v1/signup", fields);
  if (res.error && fields.firstpaymentdate && /payment/i.test(res.error)) {
    delete fields.firstpaymentdate; // GymMaster didn't like the date, fall back to its default
    res = await gmPost(env, "/v1/signup", fields);
  }
  if (res.error || !res.memberid) {
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

  // Tell the team: goes into the PT Leads sheet, which emails Tim
  if (env.PT_SCRIPT) {
    const source = "Online signup: " + m.name + (b.source ? " (" + clean(b.source) + ")" : "");
    const note = [
      "Joined online: " + m.name + " (" + m.price + " " + (m.priceDescription || "") + ")",
      paid ? "BILLING DETAILS NEEDED at reception before key tag" : "Free trial, no billing needed",
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

  return { ok: true, memberid, membershipid, paid, membership: m.name, warnings };
}

function friendly(err) {
  const e = String(err || "");
  if (/already/i.test(e) && /email/i.test(e)) return "You're already in our system with that email.";
  if (/age|old|dob|birth/i.test(e)) return "Sorry, we couldn't sign you up online with that date of birth. Please pop in and see us at reception.";
  return e ? "GymMaster said: " + e : "We couldn't finish your signup. Please try again or call reception.";
}
