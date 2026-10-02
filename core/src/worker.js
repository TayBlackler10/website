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
  owner:     { members: true, balances: true, business: true, collections: true, settings: true },
  manager:   { members: true, balances: true, business: false, collections: true, settings: false },
  reception: { members: true, balances: true, business: false, collections: false, settings: false },
  trainer:   { members: "own", balances: false, business: false, collections: false, settings: false },
  coach:     { members: "own", balances: false, business: false, collections: false, settings: false },
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
      if (url.pathname === "/api/members") return json(await searchMembers(env, who, can, url.searchParams.get("q") || ""));
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
</style></head><body>
<header><b>M2</b><strong>Core</strong><span id="me"></span></header>
<main>
<div><span class="muted" id="sync"></span><h1>Today<span style="color:var(--olive)">.</span></h1></div>
<section class="card" id="biz" hidden><div class="muted">Only you and Tim see this</div><div class="tiles" id="tiles"></div></section>
<section class="card"><h2>Find a member</h2><label for="q" class="muted">Name, email, mobile or key tag</label><input id="q" autocomplete="off"><div id="results"></div></section>
<section class="card" id="profile" hidden></section>
</main>
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
</script></body></html>`;
