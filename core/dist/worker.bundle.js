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

// ui.js (bundled)
// The staff app page served by the M2 Core worker.
// Plain HTML, CSS and JS in one string. No backticks or ${ inside, so it can live in a template literal.

const APP_HTML = String.raw`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex"><title>M2 Core</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Archivo:wght@800;900&family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600&display=swap">
<style>
:root{--lime:#DFFF00;--ink:#0A0A0A;--ink2:#1A1A18;--paper:#F3F3F0;--tile:#F1F1EC;--olive:#5E6B00;--muted:#5B5B55;--soft:#B9B9B0;--line:#E2E2DC;--warn:#FFF1CC;--warnInk:#6B4A00;--okbg:#F7FBD9;--red:#A33A00}
*{box-sizing:border-box}
html,body{height:100%}
body{margin:0;background:var(--paper);color:var(--ink);font:15px/1.5 "DM Sans","Helvetica Neue",Arial,sans-serif}
button,input,select,textarea{font:inherit;color:inherit}
a{color:var(--olive)}
.app{min-height:100%;display:grid;grid-template-columns:232px minmax(0,1fr)}
aside{background:var(--ink);color:#fff;padding:22px 14px;display:flex;flex-direction:column;gap:22px;position:sticky;top:0;height:100vh}
aside img{height:20px;width:auto;align-self:flex-start;margin-left:12px}
nav{display:flex;flex-direction:column;gap:2px}
.nav{display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:12px;color:var(--soft);text-decoration:none;font-weight:500;border:0;background:none;text-align:left;cursor:pointer;width:100%}
.nav:hover{background:var(--ink2);color:#fff}
.nav.on{background:var(--lime);color:var(--ink);font-weight:600}
.nav .ct{margin-left:auto;background:var(--lime);color:var(--ink);border-radius:999px;font-size:12px;padding:0 8px;font-weight:600}
.nav.on .ct{background:var(--ink);color:var(--lime)}
.me{margin-top:auto;display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:14px;background:var(--ink2)}
.me .av{width:32px;height:32px;border-radius:50%;background:var(--lime);color:var(--ink);display:grid;place-items:center;font-weight:600;font-size:13px}
.me small{display:block;color:#8C8C84;font-size:12px}
main{padding:26px 32px 48px;display:flex;flex-direction:column;gap:18px;min-width:0;max-width:1240px}
h1,h2,h3{font-family:Archivo,"Helvetica Neue",Arial,sans-serif;font-weight:800;letter-spacing:-.02em;margin:0;text-wrap:balance}
h1{font-size:32px}h2{font-size:21px}h3{font-size:16px}
.dot{color:var(--olive)}
.eyebrow{font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:var(--olive);font-weight:600}
.card{background:#fff;border-radius:22px;padding:22px;display:flex;flex-direction:column;gap:12px;min-width:0}
.card.dark{background:var(--ink);color:#fff}
.card.dark .eyebrow{color:var(--lime)}
.row2{display:grid;grid-template-columns:minmax(0,1.4fr) minmax(0,1fr);gap:18px;align-items:start}
.tiles{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px}
.tile{background:var(--tile);border-radius:14px;padding:14px;min-width:0}
.card.dark .tile{background:var(--ink2)}
.tile .n{font-family:Archivo,Arial,sans-serif;font-weight:800;font-size:26px;line-height:1.1;font-variant-numeric:tabular-nums}
.card.dark .tile .n{color:var(--lime)}
.tile .l{font-size:13px;color:var(--muted)}
.card.dark .tile .l{color:var(--soft)}
.muted{color:var(--muted);font-size:13px}
.err{color:var(--red);font-size:14px}
.ok{background:var(--okbg);border-radius:12px;padding:12px 14px;font-size:14px}
.warnbox{background:var(--warn);color:#4A3300;border-radius:12px;padding:12px 14px;font-size:14px}
.btn{height:44px;padding:0 20px;border:0;border-radius:999px;background:var(--lime);color:var(--ink);font-weight:600;cursor:pointer;white-space:nowrap}
.btn.dark{background:var(--ink);color:var(--lime)}
.btn.line{background:transparent;border:1px solid var(--ink)}
.btn.sm{height:34px;padding:0 14px;font-size:13px}
.btn:disabled{opacity:.5;cursor:default}
.btn:focus-visible,.nav:focus-visible,.chip:focus-visible,.plan:focus-visible,.job:focus-visible{outline:2px solid var(--olive);outline-offset:2px}
.pill{display:inline-block;font-size:12px;background:var(--tile);border-radius:999px;padding:2px 10px;font-weight:600;white-space:nowrap}
.pill.dark{background:var(--ink);color:var(--lime)}
.pill.warn{background:var(--warn);color:var(--warnInk)}
.pill.ok{background:var(--okbg);color:#3C4400}
.face{width:96px;height:96px;border-radius:50%;background:var(--tile);display:grid;place-items:center;overflow:hidden;flex:none;font:800 30px Archivo,Arial,sans-serif;color:var(--muted);border:3px solid var(--lime)}
.face img{width:100%;height:100%;object-fit:cover}
.face.sm{width:40px;height:40px;font-size:14px;border-width:2px}
.cam{position:fixed;inset:0;background:rgba(10,10,10,.72);display:grid;place-items:center;z-index:50;padding:16px}
.cam .box{background:#fff;border-radius:24px;padding:20px;width:min(520px,100%);display:flex;flex-direction:column;gap:12px}
.cam .view{position:relative;width:100%;aspect-ratio:1/1;border-radius:18px;overflow:hidden;background:var(--ink)}
.cam video,.cam canvas,.cam .view img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
.cam .ring{position:absolute;inset:8%;border:3px dashed rgba(223,255,0,.8);border-radius:50%;pointer-events:none}
.photoRow{display:flex;gap:14px;align-items:center;flex-wrap:wrap}
.tbl{border-collapse:collapse;width:100%;font-size:13.5px}
.tbl th{text-align:left;font-size:11.5px;letter-spacing:.06em;text-transform:uppercase;color:var(--muted);padding:8px;border-bottom:1px solid var(--line);white-space:nowrap}
.tbl td{padding:8px;border-bottom:1px solid var(--line);white-space:nowrap}
.tbl tr[data-member]:hover td{background:var(--tile)}
.search{display:flex;align-items:center;gap:8px;background:#fff;border-radius:999px;padding:0 16px;height:48px;border:1px solid var(--line)}
.search input{border:0;outline:0;flex:1;min-width:0;background:transparent}
.list .r{display:flex;justify-content:space-between;gap:10px;align-items:center;padding:11px 6px;border-top:1px solid var(--line);cursor:pointer}
.list .r:hover{background:var(--tile)}
.job{display:grid;grid-template-columns:30px minmax(0,1fr) auto;gap:12px;align-items:center;background:var(--tile);border-radius:16px;padding:12px 14px;border:0;text-align:left;cursor:pointer;width:100%}
.num{width:30px;height:30px;border-radius:50%;background:var(--ink);color:var(--lime);display:grid;place-items:center;font-weight:600;font-size:13px}
.job b{display:block}
.person{border-top:1px solid var(--line);padding:12px 2px;display:flex;flex-direction:column;gap:8px}
.person .top{display:flex;gap:10px;align-items:baseline;flex-wrap:wrap}
.outs{display:flex;gap:6px;flex-wrap:wrap}
.chips{display:flex;flex-wrap:wrap;gap:6px}
.chip{border:1px solid var(--line);background:#fff;border-radius:999px;padding:8px 14px;font-size:14px;cursor:pointer}
.chip.on{background:var(--ink);color:var(--lime);border-color:var(--ink)}
.plans{display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:10px}
.plan{border:1px solid var(--line);background:#fff;border-radius:14px;padding:14px;text-align:left;cursor:pointer}
.plan.on{border-color:var(--ink);box-shadow:inset 0 0 0 1px var(--ink)}
.plan b{display:block}.plan span{font-size:13px;color:var(--muted)}
.grid2{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px}
.fld{display:flex;flex-direction:column;gap:4px;font-size:13px;color:var(--muted)}
.fld input,.fld select,.fld textarea{height:44px;border:1px solid var(--line);border-radius:12px;padding:0 12px;color:var(--ink);background:#fff;width:100%}
.fld textarea{height:80px;padding:10px 12px;resize:vertical}
.stepn{width:28px;height:28px;border-radius:50%;background:var(--ink);color:var(--lime);display:inline-grid;place-items:center;font-size:13px;font-weight:600;margin-right:8px;flex:none}
canvas#sig{width:100%;height:140px;border:1px dashed var(--muted);border-radius:12px;background:#fff;touch-action:none}
.tagbox{font-family:Archivo,Arial,sans-serif;font-weight:800;font-size:26px;height:62px;text-align:center;letter-spacing:.1em;border:2px solid var(--ink);border-radius:14px;width:100%;background:#fff}
.board{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;align-items:start}
.col{background:#E9E9E3;border-radius:18px;padding:12px;display:flex;flex-direction:column;gap:8px;min-width:0}
.col h3{display:flex;justify-content:space-between;padding:2px 6px;font-family:"DM Sans",Arial,sans-serif;font-weight:600;font-size:14px;letter-spacing:0}
.lead{background:#fff;border-radius:14px;padding:12px;display:flex;flex-direction:column;gap:4px;cursor:pointer;border:0;text-align:left;width:100%}
.lead .t{display:flex;justify-content:space-between;gap:6px}
.kv{display:grid;grid-template-columns:140px minmax(0,1fr);gap:4px 12px;font-size:14px}
.kv dt{color:var(--muted)}.kv dd{margin:0;min-width:0;overflow-wrap:anywhere}
.hist{display:flex;flex-direction:column}
.hist div{display:grid;grid-template-columns:110px minmax(0,1fr);gap:12px;padding:8px 0;border-top:1px solid var(--line);font-size:14px}
.hist span{color:var(--muted);font-size:13px}
.bars{display:grid;grid-template-columns:repeat(12,minmax(0,1fr));gap:6px;align-items:end;height:110px;border-bottom:1px solid var(--line)}
.bars i{background:var(--line);border-radius:5px 5px 0 0;display:block}
.bars i.last{background:var(--ink)}
.next{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:14px;align-items:center}
.cls{display:grid;grid-template-columns:70px minmax(0,1fr) auto;gap:12px;align-items:center;padding:10px 8px;border-top:1px solid var(--line);cursor:pointer;border-radius:10px;background:none;border-left:0;border-right:0;border-bottom:0;text-align:left;width:100%}
.cls:hover,.cls.on{background:var(--tile)}
.cls.past{opacity:.55}
.fill{height:6px;border-radius:3px;background:var(--line);overflow:hidden;width:90px;margin-top:4px}.fill i{display:block;height:100%;background:var(--ink)}.fill i.full{background:var(--olive)}
.dayh{font-weight:600;margin:14px 0 4px;font-size:12px;letter-spacing:.1em;text-transform:uppercase;color:var(--olive)}
.dayh:first-child{margin-top:0}
.att{display:flex;gap:10px;align-items:center;padding:8px 2px;border-top:1px solid var(--line)}
.att .who{margin-right:auto;min-width:0}
.chart{display:flex;align-items:flex-end;gap:6px;height:160px;border-bottom:1px solid var(--line);padding-top:8px}
.chart .c{flex:1;display:flex;align-items:flex-end;justify-content:center;gap:2px;min-width:0;height:100%}
.chart .b{flex:1;max-width:28px;border-radius:4px 4px 0 0;background:var(--ink);min-height:2px}
.chart .b.s1{background:#C9C9BF}.chart .b.s2{background:var(--olive)}.chart .b.neg{background:var(--red)}
.clab{display:flex;gap:6px}.clab span{flex:1;text-align:center;font-size:11px;color:var(--muted);min-width:0;overflow:hidden;white-space:nowrap}
.legend{display:flex;gap:14px;flex-wrap:wrap;font-size:12px;color:var(--muted)}.legend i{display:inline-block;width:10px;height:10px;border-radius:3px;margin-right:5px;vertical-align:-1px}
.hb{display:grid;grid-template-columns:minmax(0,150px) minmax(0,1fr) 56px;gap:10px;align-items:center;font-size:13.5px;padding:4px 0}
.hb .bar{height:10px;border-radius:5px;background:var(--line);overflow:hidden}.hb .bar i{display:block;height:100%;background:var(--ink)}
.hb b{text-align:right;font-variant-numeric:tabular-nums}
.goal{height:12px;border-radius:6px;background:var(--ink2);overflow:hidden;margin-top:6px}.goal i{display:block;height:100%;background:var(--lime)}
.goal i.mark{background:transparent}
.line svg{width:100%;height:170px;display:block}
.navlab{font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:#6E6E66;padding:14px 12px 4px}
.tbl td.r,.tbl th.r{text-align:right;font-variant-numeric:tabular-nums}
[hidden]{display:none!important}a.btn,label.btn{text-decoration:none;display:inline-flex;align-items:center}
.sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)}
@media (max-width:900px){.navlab{display:none}.hb{grid-template-columns:minmax(0,110px) minmax(0,1fr) 50px}.app{grid-template-columns:1fr}aside{position:static;height:auto;flex-direction:column;align-items:stretch;gap:10px;padding:12px}nav{flex-direction:row;overflow-x:auto;gap:4px;padding-bottom:2px;min-width:0;max-width:100%}aside{min-width:0;max-width:100vw}.nav{width:auto;white-space:nowrap;padding:8px 12px}.me{display:none}.row2{grid-template-columns:1fr}.board{grid-template-columns:repeat(2,minmax(0,1fr))}main{padding:18px 14px 40px}}
@media (prefers-reduced-motion:no-preference){.card{animation:none}}
</style></head><body>
<div class="app">
<aside>
<img src="https://m2club.co.nz/assets/img/m2-logo-lime.png" alt="M2 Training Club">
<nav aria-label="Main">
<button class="nav on" data-go="today">Today<span class="ct" id="ctToday" hidden></span></button>
<button class="nav" data-go="members">Members</button>
<button class="nav" data-go="leads">Leads<span class="ct" id="ctLeads" hidden></span></button>
<button class="nav" data-go="classes">Classes</button>
<button class="nav" data-go="add" id="navAdd" hidden>Add member</button>
<button class="nav" data-go="tag">Key tag lookup</button>
<button class="nav" data-go="passport" id="navFp" hidden>Fitness Passport</button>
<button class="nav" data-go="collections" id="navCol" hidden>Money owed</button>
<button class="nav" data-go="reports" id="navReports" hidden>Reports</button>
<div class="navlab" id="navBizLab" hidden>The business</div>
<button class="nav" data-go="money" id="navMoney" hidden>Money</button>
<button class="nav" data-go="growth" id="navGrowth" hidden>Growth</button>
<button class="nav" data-go="marketing" id="navMkt" hidden>Marketing</button>
<div class="navlab" id="navAdminLab" hidden>Admin</div>
<button class="nav" data-go="staff" id="navStaff" hidden>Staff and access</button>
<button class="nav" data-go="import" id="navImport" hidden>Import from GymMaster</button>
<button class="nav" data-go="settings" id="navSettings" hidden>Settings</button>
</nav>
<div class="me"><div class="av" id="meAv"></div><div><span id="meName"></span><small id="meRole"></small></div></div>
</aside>

<main>

<!-- TODAY -->
<section data-view="today">
<div style="display:flex;gap:14px;align-items:flex-end;flex-wrap:wrap;margin-bottom:18px">
<div style="margin-right:auto"><div class="eyebrow" id="todayDate"></div><h1 id="hello">Today<span class="dot">.</span></h1></div>
<button class="btn" data-go="add" id="addTop" hidden>Add member</button>
</div>
<section class="card dark" id="biz" hidden style="margin-bottom:18px">
<div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap"><span class="eyebrow">The business</span><span class="muted" style="color:var(--soft)">Only you and Tim see this</span><span class="muted" style="color:#8C8C84;margin-left:auto" id="sync"></span></div>
<div class="tiles" id="bizTiles"></div>
</section>
<div class="row2">
<section class="card">
<div style="display:flex;align-items:baseline;gap:10px;flex-wrap:wrap"><h2>Do this today</h2><span class="muted" id="doneToday"></span></div>
<div id="jobs"><div class="muted">Loading the day...</div></div>
</section>
<div style="display:flex;flex-direction:column;gap:18px;min-width:0">
<section class="card" id="jobPanel" hidden></section>
<section class="card" id="recentCard" hidden><h2>Joined lately</h2><div class="list" id="recent"></div></section>
</div>
</div>
</section>

<!-- MEMBERS -->
<section data-view="members" hidden>
<div style="margin-bottom:16px"><div class="eyebrow">Everyone in one place</div><h1>Members<span class="dot">.</span></h1></div>
<label class="search" for="q"><span class="sr">Search members</span><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#5B5B55" stroke-width="2" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg><input id="q" autocomplete="off" placeholder="Name, email, mobile or key tag"></label>
<div class="row2" style="margin-top:16px">
<section class="card"><div class="list" id="results"><div class="muted">Start typing to find someone.</div></div></section>
<div id="profile" style="display:flex;flex-direction:column;gap:18px;min-width:0"></div>
</div>
</section>

<!-- LEADS -->
<section data-view="leads" hidden>
<div style="display:flex;gap:14px;align-items:flex-end;flex-wrap:wrap;margin-bottom:14px">
<div style="margin-right:auto"><div class="eyebrow">Every source, one inbox</div><h1>Leads<span class="dot">.</span></h1></div>
<button class="btn line" id="newLeadBtn" hidden>Add a lead</button>
</div>
<div class="chips" id="leadKinds" style="margin-bottom:14px"></div>
<section class="card" id="newLeadCard" hidden style="margin-bottom:14px">
<h2>Add a lead</h2>
<div class="grid2">
<label class="fld">Name<input id="nlName" autocomplete="off"></label>
<label class="fld">Mobile<input id="nlMobile" inputmode="tel" autocomplete="off"></label>
<label class="fld">Email<input id="nlEmail" type="email" autocomplete="off"></label>
<label class="fld">Type<select id="nlKind"><option value="walk_in">Walk in</option><option value="free_pt">Free PT</option><option value="website_form">Enquiry</option><option value="bring_a_mate">Bring a Mate</option></select></label>
<label class="fld">Goal<input id="nlGoal" autocomplete="off"></label>
<label class="fld">Where did they hear about us<select id="nlSource"><option value="">Pick one</option></select></label>
</div>
<label class="fld">Notes<textarea id="nlNotes"></textarea></label>
<div class="err" id="nlErr"></div>
<div style="display:flex;gap:8px"><button class="btn dark" id="nlSave">Save lead</button><button class="btn line" id="nlCancel">Cancel</button></div>
</section>
<div class="row2" style="grid-template-columns:minmax(0,1fr)">
<div class="board" id="board"><div class="muted">Loading...</div></div>
</div>
<section class="card" id="leadPanel" hidden style="margin-top:14px"></section>
</section>

<!-- KEY TAG LOOKUP -->
<section data-view="tag" hidden>
<div style="margin-bottom:16px"><div class="eyebrow">Found a tag?</div><h1>Key tag lookup<span class="dot">.</span></h1></div>
<section class="card" style="max-width:560px">
<label class="sr" for="lookTag">Key tag number</label>
<input id="lookTag" class="tagbox" autocomplete="off" placeholder="Scan tag">
<div id="lookRes"></div>
</section>
</section>

<!-- REPORTS -->
<section data-view="reports" hidden>
<div style="display:flex;gap:14px;align-items:flex-end;flex-wrap:wrap;margin-bottom:14px">
<div style="margin-right:auto"><div class="eyebrow">Your GymMaster favourites</div><h1>Reports<span class="dot">.</span></h1></div>
<a class="btn line" id="repCsv" href="#">Download CSV</a>
</div>
<div class="chips" id="repKinds" style="margin-bottom:12px"></div>
<div id="repDates" style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:12px" hidden><label class="fld">From<input type="date" id="repFrom"></label><label class="fld">To<input type="date" id="repTo"></label></div>
<section class="card"><div style="display:flex;align-items:baseline;gap:10px"><h2 id="repTitle">Report</h2><span class="muted" id="repCount"></span></div><div style="overflow-x:auto" id="repTable"><div class="muted">Loading...</div></div></section>
</section>

<!-- STAFF -->
<section data-view="staff" hidden>
<div style="margin-bottom:16px"><div class="eyebrow">Owners only</div><h1>Staff and access<span class="dot">.</span></h1></div>
<div class="row2">
<section class="card"><h2>Team</h2><p class="muted" style="margin:0">Everyone signs in with their own email and a code. Their role decides what they see: only owners see business numbers, trainers see only their own clients.</p><div class="list" id="staffList"><div class="muted">Loading...</div></div></section>
<section class="card"><h2 id="stTitle">Add someone</h2>
<input type="hidden" id="stId">
<label class="fld">Name<input id="stName" autocomplete="off"></label>
<label class="fld">Email they sign in with<input id="stEmail" type="email" autocomplete="off"></label>
<label class="fld">Role<select id="stRole"><option value="reception">Reception</option><option value="trainer">Trainer</option><option value="coach">Coach</option><option value="manager">Manager</option><option value="owner">Owner</option></select></label>
<label class="fld">Order for free PT leads (lower gets them first)<input id="stOrder" type="number" value="100"></label>
<label style="display:flex;gap:8px;align-items:center;font-size:14px"><input type="checkbox" id="stActive" checked> Can sign in</label>
<div class="err" id="stErr"></div><div id="stOk"></div>
<div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn dark" id="stSave">Save</button><button class="btn line" id="stNew">Clear</button></div>
<p class="muted" style="margin:0;font-size:13px">People with an @m2club.co.nz email can sign in straight away. Anyone on Gmail or another address also needs adding to the sign-in rule in Cloudflare (Zero Trust, Access, m2-core policy).</p>
</section>
</div>
</section>

<!-- CLASSES -->
<section data-view="classes" hidden>
<div style="display:flex;gap:10px;align-items:flex-end;flex-wrap:wrap;margin-bottom:16px">
<div style="margin-right:auto"><div class="eyebrow">Live from GymMaster, the same as the M2 App</div><h1>Classes<span class="dot">.</span></h1></div>
<button class="btn line sm" id="clsPrev">Last week</button><button class="btn line sm" id="clsNow">This week</button><button class="btn line sm" id="clsNext">Next week</button>
</div>
<div class="row2">
<section class="card"><div style="display:flex;align-items:baseline;gap:10px;flex-wrap:wrap"><h2 id="clsTitle">This week</h2><span class="muted" id="clsCount"></span></div><div id="clsWeek"><div class="muted">Loading...</div></div></section>
<section class="card" id="clsPanel"><h2>Pick a class</h2><p class="muted" style="margin:0">See who's booked with their photos, and book people in or cancel them. Members who owe $250 or more can't be booked until it's paid.</p></section>
</div>
</section>

<!-- MONEY OWED -->
<section data-view="collections" hidden>
<div style="display:flex;gap:14px;align-items:flex-end;flex-wrap:wrap;margin-bottom:16px">
<div style="margin-right:auto"><div class="eyebrow">Real balances, checked in GymMaster all day</div><h1>Money owed<span class="dot">.</span></h1></div>
</div>
<section class="card dark" style="margin-bottom:18px"><div class="tiles" id="colTiles"></div><div class="muted" style="color:var(--soft)" id="colNote"></div><div class="muted" style="color:var(--soft)" id="colRules"></div></section>
<div class="chips" id="colTabs" style="margin-bottom:12px"></div>
<div class="row2">
<section class="card"><div style="overflow-x:auto" id="colTable"><div class="muted">Loading...</div></div></section>
<section class="card" id="colPanel"><h2>Pick someone</h2><p class="muted" style="margin:0">Call, record what they said, and settle or refer. Everything is logged on their profile.</p></section>
</div>
</section>

<!-- MONEY -->
<section data-view="money" hidden>
<div style="display:flex;gap:14px;align-items:flex-end;flex-wrap:wrap;margin-bottom:16px">
<div style="margin-right:auto"><div class="eyebrow">Xero and the Core. Only you and Tim see this</div><h1>Money<span class="dot">.</span></h1></div>
<span class="muted" id="monUpd"></span>
</div>
<section class="card dark" style="margin-bottom:18px"><div id="monGoal"></div><div class="tiles" id="monTiles"></div></section>
<div class="row2">
<section class="card"><h2>Income and costs by month</h2><div id="monChart"></div></section>
<section class="card"><h2>Cash and bills</h2><dl class="kv" id="monPoints"></dl></section>
</div>
<section class="card" style="margin-top:18px"><h2>Profit and loss</h2><div style="overflow-x:auto" id="monTable"></div></section>
<section class="card" style="margin-top:18px" id="monLinesCard" hidden><h2 id="monLinesTitle">Where the money went</h2><div class="row2" id="monLines"></div></section>
</section>

<!-- GROWTH -->
<section data-view="growth" hidden>
<div style="margin-bottom:16px"><div class="eyebrow">Members, joins, leaves and trials</div><h1>Growth<span class="dot">.</span></h1></div>
<section class="card dark" style="margin-bottom:18px"><div class="tiles" id="grTiles"></div></section>
<div class="row2">
<section class="card"><div style="display:flex;align-items:baseline;gap:10px"><h2>Members</h2><span class="muted" id="grLineNote"></span></div><div class="line" id="grLine"></div></section>
<section class="card"><h2>Membership mix</h2><div id="grMix"></div></section>
</div>
<div class="row2" style="margin-top:18px">
<section class="card"><h2>Joins and leaves by month</h2><div id="grJoins"></div></section>
<section class="card"><h2>Where new members came from</h2><p class="muted" style="margin:0">Last 90 days</p><div id="grSources"></div></section>
</div>
<div class="row2" style="margin-top:18px">
<section class="card"><h2>5 Days for $5</h2><div style="overflow-x:auto" id="grTrials"></div></section>
<section class="card"><h2>Leads, last 90 days</h2><div id="grLeads"></div></section>
</div>
</section>

<!-- MARKETING -->
<section data-view="marketing" hidden>
<div style="display:flex;gap:14px;align-items:flex-end;flex-wrap:wrap;margin-bottom:16px">
<div style="margin-right:auto"><div class="eyebrow">Meta, Google Analytics and who actually joined</div><h1>Marketing<span class="dot">.</span></h1></div>
<label class="fld" style="min-width:170px">Month<input type="month" id="mkMonth"></label>
</div>
<section class="card dark" style="margin-bottom:18px"><div id="mkBudget"></div><div class="tiles" id="mkTiles"></div><div class="muted" style="color:var(--soft)" id="mkNote"></div></section>
<div class="row2">
<section class="card"><h2>Spend by day</h2><div id="mkDaily"></div></section>
<section class="card"><h2>Last 6 months</h2><div id="mkTrend"></div></section>
</div>
<section class="card" style="margin-top:18px"><h2>Campaigns</h2><div style="overflow-x:auto" id="mkCamps"></div></section>
<div class="row2" style="margin-top:18px">
<section class="card"><h2>Who joined, by where they heard about us</h2><div id="mkJoins"></div></section>
<section class="card"><h2>Website visits by channel</h2><div style="overflow-x:auto" id="mkWeb"></div></section>
</div>
<section class="card" style="margin-top:18px"><h2>Leads in the Core by source</h2><div id="mkLeads"></div></section>
</section>

<!-- SETTINGS -->
<section data-view="settings" hidden>
<div style="margin-bottom:16px"><div class="eyebrow">Owners only</div><h1>Settings<span class="dot">.</span></h1></div>
<div class="row2">
<div style="display:flex;flex-direction:column;gap:18px;min-width:0">
<section class="card"><h2>Club rules</h2><p class="muted" style="margin:0">Change a number and press Save. It applies straight away and is logged.</p><div id="setRules"></div></section>
<section class="card"><h2>Club details</h2><dl class="kv" id="setClub"></dl></section>
</div>
<div style="display:flex;flex-direction:column;gap:18px;min-width:0">
<section class="card"><h2>Connections</h2><div class="list" id="setInt"></div></section>
<section class="card"><h2>Last copies</h2><div class="hist" id="setSync"></div></section>
</div>
</div>
<section class="card" style="margin-top:18px"><h2>Membership types</h2><p class="muted" style="margin:0">GymMaster's types and the plan each one counts as in the Core. Prices and new types still come from GymMaster while it bills.</p><div style="overflow-x:auto" id="setPlans"></div></section>
</section>

<!-- IMPORT -->
<section data-view="import" hidden>
<div style="margin-bottom:16px"><div class="eyebrow">Owners only</div><h1>Import from GymMaster<span class="dot">.</span></h1></div>
<section class="card" style="max-width:760px">
<p style="margin:0">In GymMaster run <b>Report &amp; Till → Current Memberships</b> for today, with the <b>Fitness Passport ID</b> column added, and export it as CSV. Pick it below. Run it again any time: members are updated, nothing staff did in the Core is lost.</p>
<label class="fld">Current members (CSV, required)<input type="file" id="impCur" accept=".csv,text/csv"></label>
<label class="fld">Trial history (optional: the same report from 1 Jan 2024 to today)<input type="file" id="impHist" accept=".csv,text/csv"></label>
<div id="impSum" class="muted"></div>
<div class="err" id="impErr"></div>
<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap"><button class="btn dark" id="impGo" disabled>Import</button><span class="muted" id="impProg"></span></div>
<div class="list" id="impDone"></div>
</section>
</section>

<!-- FITNESS PASSPORT -->
<section data-view="passport" hidden>
<div style="display:flex;gap:14px;align-items:flex-end;flex-wrap:wrap;margin-bottom:16px">
<div style="margin-right:auto"><div class="eyebrow">Paid per visit, matched on the Passport ID</div><h1>Fitness Passport<span class="dot">.</span></h1></div>
<label class="fld" style="min-width:170px">Month<input type="month" id="fpMonth"></label>
<a class="btn line" id="fpCsv" href="#">Download visits (CSV)</a>
</div>
<section class="card dark" style="margin-bottom:18px"><div class="tiles" id="fpTiles"></div><div class="muted" style="color:var(--soft)" id="fpNote"></div></section>
<div class="row2">
<div style="display:flex;flex-direction:column;gap:18px;min-width:0">
<section class="card"><h2>Visits Passport can't pay for</h2><p class="muted" style="margin:0">Passport members who trained this month with no Passport ID on file. Add the ID and these visits count.</p><div class="list" id="fpNoId"></div></section>
<section class="card" id="fpDupCard" hidden><h2>Same ID on two people</h2><p class="muted" style="margin:0">Every person has their own Passport ID. Check their cards.</p><div class="list" id="fpDup"></div></section>
</div>
<section class="card"><h2>Every Passport visit</h2><div class="list" id="fpRows"><div class="muted">Loading...</div></div></section>
</div>
</section>

<!-- ADD MEMBER -->
<section data-view="add" hidden>
<div style="margin-bottom:16px"><div class="eyebrow">Goes into GymMaster and the Core together</div><h1>Add a member<span class="dot">.</span></h1></div>
<div id="a1" style="display:flex;flex-direction:column;gap:18px">
<section class="card">
<h2><span class="stepn">1</span>Membership</h2>
<div class="chips" id="fam"></div>
<div class="chips" id="freq"></div>
<label style="display:flex;gap:8px;align-items:center;font-size:14px"><input type="checkbox" id="flexi"> Flexi (+$5 a week, 30 days notice, no lock-in)</label>
<div class="plans" id="plans"><div class="muted">Loading memberships from GymMaster...</div></div>
</section>
<section class="card">
<h2><span class="stepn">2</span>Their details</h2>
<div class="photoRow"><div class="face" id="aFace">?</div><div style="display:flex;flex-direction:column;gap:6px"><b>Photo</b><span class="muted" style="font-size:13px">So every staff member knows the name to the face.</span><div style="display:flex;gap:8px;flex-wrap:wrap"><button type="button" class="btn dark sm" id="aPhotoBtn">Take photo</button><label style="display:flex;gap:6px;align-items:center;font-size:13px"><input type="checkbox" id="aNoPhoto"> Not today, take it next visit</label></div></div></div>
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
<label style="display:flex;gap:8px;align-items:center;font-size:14px"><input type="checkbox" id="passport"> Fitness Passport member (no M2 offers or trials)</label>
<div id="fpWrap" hidden class="warnbox" style="display:flex;flex-direction:column;gap:8px"><label class="fld">Fitness Passport ID (compulsory)<input id="fpid" inputmode="numeric" autocomplete="off" placeholder="The number on their Passport card or app"></label><span style="font-size:13px">Passport pays us for every visit on this number. Check it against their card.</span></div>
<div id="mateWrap"><label class="fld">Brought by a member? (Bring a Mate)<input id="mate" placeholder="Search the member who brought them" autocomplete="off"></label><div class="list" id="mateRes"></div><div id="mateSel" class="muted"></div></div>
</section>
<section class="card">
<h2><span class="stepn">3</span>Terms and signature</h2>
<p class="muted" style="margin:0">Talk them through the membership terms, then they sign below.</p>
<canvas id="sig" aria-label="Signature pad"></canvas>
<div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap"><label style="display:flex;gap:8px;align-items:center;font-size:14px"><input type="checkbox" id="agreed"> They've agreed to the terms</label><button class="btn line sm" id="sigClear" style="margin-left:auto">Clear signature</button></div>
<div class="err" id="aErr"></div>
<div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn dark" id="aSave">Add member</button><button class="btn line" id="aAnyway" hidden>Add anyway</button></div>
</section>
</div>
<div id="a2" hidden style="display:flex;flex-direction:column;gap:18px">
<div class="ok" id="aDone"></div>
<section class="card" id="fpGm" hidden>
<h2>Passport ID into GymMaster</h2>
<p style="margin:0">GymMaster reports their visits to Fitness Passport, so it needs the ID too. Open their GymMaster profile, go to <b>Additional Details</b> and type <b id="fpGmId"></b> into <b>Fitness Passport ID</b>.</p>
<div style="display:flex;gap:8px;flex-wrap:wrap"><a class="btn line" id="fpGmOpen" target="_blank" rel="noopener">Open in GymMaster</a><button class="btn dark" id="fpGmDone">It's in GymMaster</button></div>
<div id="fpGmOk"></div>
</section>
<section class="card dark" id="billCard">
<h2><span class="stepn" style="background:var(--lime);color:var(--ink)">4</span>Bank details</h2>
<p style="margin:0;color:var(--soft);font-size:14px" id="billNote"></p>
<div style="display:flex;gap:16px;align-items:center;flex-wrap:wrap"><button class="btn" id="billOpen">Enter bank details</button><div id="qr" style="background:#fff;border-radius:12px;padding:8px" hidden></div></div>
<label style="display:flex;gap:8px;align-items:center;font-size:14px"><input type="checkbox" id="billDone"> Bank details are in</label>
</section>
<section class="card">
<h2><span class="stepn">5</span>Key tag</h2>
<p class="muted" style="margin:0">Scan the new tag. The reader types the number for you.</p>
<label class="sr" for="tag">Key tag number</label>
<input id="tag" class="tagbox" autocomplete="off" placeholder="Scan tag">
<div class="err" id="tagErr"></div>
<div id="tagOk"></div>
<div class="err" id="finErr"></div>
<div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn" id="aFinish">Done</button><button class="btn line" id="aProfile">Open their profile</button></div>
</section>
</div>
</section>

</main>
</div>

<!-- CAMERA -->
<div class="cam" id="cam" hidden role="dialog" aria-modal="true" aria-labelledby="camTitle">
<div class="box">
<div style="display:flex;align-items:baseline;gap:10px"><h2 id="camTitle" style="margin:0">Take their photo</h2><span class="muted" id="camWho"></span><button class="btn line sm" id="camClose" style="margin-left:auto">Close</button></div>
<label class="fld">Camera<select id="camDev"></select></label>
<div class="view"><video id="camVid" autoplay playsinline muted></video><img id="camShot" alt="" hidden><div class="ring"></div></div>
<div class="err" id="camErr"></div>
<div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn dark" id="camSnap">Take photo</button><button class="btn line" id="camRetake" hidden>Retake</button><button class="btn" id="camUse" hidden>Use this photo</button>
<label class="btn line" style="margin-left:auto;cursor:pointer">Upload a photo<input type="file" accept="image/*" id="camFile" hidden></label></div>
<p class="muted" style="margin:0;font-size:13px">Face in the circle, looking at the camera. Plug the USB camera in before opening this, then pick it above. Chrome remembers your choice.</p>
</div>
</div>

<script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"></script>
<script>
var $=function(s){return document.querySelector(s)};
var $$=function(s){return Array.prototype.slice.call(document.querySelectorAll(s))};
function esc(s){return String(s==null?"":s).replace(/[&<>"]/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]})}
function get(u){return fetch(u).then(function(r){return r.json()})}
function post(u,b){return fetch(u,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(b||{})}).then(function(r){return r.json()})}
function money(n){return "$"+Number(n||0).toLocaleString("en-NZ",{minimumFractionDigits:2,maximumFractionDigits:2})}
function day(s){if(!s)return "";var d=new Date(String(s).replace(" ","T")+(String(s).length>10?"Z":"T00:00:00"));if(isNaN(d))return String(s).slice(0,10);return d.toLocaleDateString("en-NZ",{day:"numeric",month:"short",year:(new Date().getFullYear()===d.getFullYear()?undefined:"2-digit")})}
function nm(r){return ((r.first_name||"")+" "+(r.last_name||"")).trim()||r.name||"No name"}
var ME=null, VIEW="today";
var OUT_LABEL={joined:"Joined",joining_at_desk:"Joining at the desk",call_back:"Call back",no_answer:"No answer",not_interested:"Not for them",paid:"Paid",billing_in:"Bank details in",tag_given:"Tag given",fp_in_gm:"It's in GymMaster",done:"Done"};
var JOB_OUTS={new_lead:["joined","call_back","no_answer","not_interested"],missing_billing:["billing_in","call_back","no_answer"],trial_ending:["joined","joining_at_desk","call_back","no_answer","not_interested"],blocked:["paid","call_back","no_answer"],call_back:["joined","paid","call_back","no_answer","not_interested","done"],no_tag:["tag_given","done"],fp_id_gm:["fp_in_gm"],fp_missing:["call_back","no_answer"],no_photo:["done"]};
var KIND={trial:"5 Days for $5",free_pt:"Free PT",unfinished_signup:"Unfinished sign-up",bring_a_mate:"Bring a Mate",app_upgrade:"App upgrade",website_form:"Enquiry",meta_form:"Meta form",walk_in:"Walk in"};

function show(v){
 VIEW=v;
 $$("[data-view]").forEach(function(s){s.hidden=s.dataset.view!==v});
 $$(".nav").forEach(function(b){b.classList.toggle("on",b.dataset.go===v)});
 window.scrollTo(0,0);
 if(v==="today"){loadToday();if(ME&&ME.can.business)loadBiz()}
 if(v==="leads")loadLeads();
 if(v==="add")startAdd();
 if(v==="tag")setTimeout(function(){$("#lookTag").focus()},50);
 if(v==="passport")loadPassport();
 if(v==="reports")loadReport();
 if(v==="staff")loadStaff();
 if(v==="settings")loadSettings();
 if(v==="classes")loadClasses(CLS.week);
 if(v==="collections")loadCol();
 if(v==="money")loadMoney();
 if(v==="growth")loadGrowth();
 if(v==="marketing")loadMkt();
 if(v==="members")setTimeout(function(){$("#q").focus()},50);
}
document.addEventListener("click",function(e){var b=e.target.closest("[data-go]");if(b){e.preventDefault();show(b.dataset.go)}});

/* ---------- start ---------- */
get("/api/me").then(function(me){
 ME=me;
 $("#meName").textContent=me.name;$("#meRole").textContent=me.role.charAt(0).toUpperCase()+me.role.slice(1);
 $("#meAv").textContent=me.name.split(" ").map(function(x){return x[0]}).join("").slice(0,2);
 $("#hello").innerHTML="Morning, "+esc(me.name.split(" ")[0])+'<span class="dot">.</span>';
 var h=new Date().getHours();if(h>=12)$("#hello").innerHTML=(h<17?"Afternoon, ":"Evening, ")+esc(me.name.split(" ")[0])+'<span class="dot">.</span>';
 if(me.can.members===true)$("#navFp").hidden=false;
 if(me.can.settings){$("#navImport").hidden=false;$("#navStaff").hidden=false;$("#navSettings").hidden=false}
 if(me.can.collections){$("#navReports").hidden=false;$("#navCol").hidden=false}
 if(me.can.business){$("#navBizLab").hidden=false;$("#navMoney").hidden=false;$("#navGrowth").hidden=false;$("#navMkt").hidden=false}
 if(me.can.settings)$("#navAdminLab").hidden=false;
 if(me.can.add){$("#navAdd").hidden=false;$("#addTop").hidden=false;$("#newLeadBtn").hidden=false}
 loadToday();
 if(me.can.business)loadBiz();
}).catch(function(e){$("#jobs").innerHTML='<div class="err">'+esc(e)+'</div>'});

function loadBiz(){
 get("/api/summary").then(function(s){
  var fam={};(s.by_family||[]).forEach(function(f){fam[f.family]=f.n});
  var t=[["Members",s.members],["Fitness Passport",s.passport],["Perform",fam.perform||0],["Daily",fam.daily||0],
   ["Billed weekly by Ezidebit",s.weekly_billed!=null?"$"+Math.round(s.weekly_billed).toLocaleString("en-NZ"):"-"],
   ["Owed to M2",s.owed_total!=null?"$"+Math.round(s.owed_total).toLocaleString("en-NZ"):"-"],
   ["Lead source recorded",(s.lead_source_pct||0)+"%"],["Blocked at the door",s.blocked]];
  $("#bizTiles").innerHTML=t.map(function(x){return '<div class="tile"><div class="n">'+esc(typeof x[1]==="number"?x[1].toLocaleString("en-NZ"):x[1])+'</div><div class="l">'+esc(x[0])+'</div></div>'}).join("");
  if(s.last_sync)$("#sync").textContent="Last copy from GymMaster "+day(s.last_sync.finished_at)+(s.last_sync.ok===0?" (failed: "+(s.last_sync.error||"")+")":"");
  $("#biz").hidden=false;
 });
}

/* ---------- today ---------- */
var TODAY=null;
function loadToday(){
 get("/api/today").then(function(d){
  TODAY=d;
  $("#todayDate").textContent=new Date().toLocaleDateString("en-NZ",{weekday:"long",day:"numeric",month:"long"});
  var total=d.jobs.reduce(function(a,j){return a+j.count},0);
  $("#ctToday").hidden=!total;$("#ctToday").textContent=total;
  $("#doneToday").textContent=(d.done_today?d.done_today+" done today. ":"")+(d.joined_today?d.joined_today+" joined today.":"");
  $("#jobs").innerHTML=d.jobs.length?d.jobs.map(function(j,i){
   return '<button class="job" data-job="'+esc(j.kind)+'"><span class="num">'+(i+1)+'</span><span><b>'+j.count+" "+esc(j.count===1&&j.one?j.one:j.label.charAt(0).toLowerCase()+j.label.slice(1))+'</b><span class="muted">'+esc(j.owner==="manager"?"Manager":"Reception")+(j.items[0]?", starting with "+esc(j.items[0].name):"")+'</span></span><span class="pill dark">Start</span></button>';
  }).join('<div style="height:8px"></div>'):'<div class="ok">Nothing waiting. Nice work.</div>';
  if(d.recent){$("#recentCard").hidden=false;$("#recent").innerHTML=d.recent.map(function(m){return '<div class="r" data-member="'+m.id+'"><span><b>'+esc(nm(m))+'</b> <span class="muted">'+esc(m.plan||"")+'</span></span><span class="pill">'+esc(day(m.joined_on))+'</span></div>'}).join("")}
  if(!$("#jobPanel").hidden&&$("#jobPanel").dataset.kind)openJob($("#jobPanel").dataset.kind);
 });
}
$("#jobs").addEventListener("click",function(e){var b=e.target.closest("[data-job]");if(b)openJob(b.dataset.job)});
function openJob(kind){
 var j=(TODAY.jobs||[]).find(function(x){return x.kind===kind});var p=$("#jobPanel");
 if(!j){p.hidden=true;p.dataset.kind="";return}
 p.hidden=false;p.dataset.kind=kind;
 p.innerHTML='<div style="display:flex;align-items:baseline;gap:10px"><h2>'+esc(j.label)+'</h2><span class="muted">'+j.count+'</span><button class="btn line sm" style="margin-left:auto" id="jpClose">Close</button></div>'+
  j.items.map(function(it,i){
   var outs=JOB_OUTS[kind]||["done"];
   return '<div class="person" data-i="'+i+'"><div class="top"><b>'+esc(it.name)+'</b>'+(it.mobile?' <a href="tel:'+esc(it.mobile)+'" class="muted">'+esc(it.mobile)+'</a>':"")+(it.member_id?' <a href="#" class="muted" data-member="'+it.member_id+'">Profile</a>':"")+(it.gm_url?' <a href="'+esc(it.gm_url)+'" target="_blank" rel="noopener" class="muted">Open in GymMaster</a>':"")+'</div>'+
    '<div class="muted">'+esc(it.detail||"")+'</div>'+
    (it.need_photo?'<div><button class="btn dark sm" data-photo="'+it.member_id+'" data-name="'+esc(it.name)+'">Take photo</button></div>':"")+
    (it.need_fp?'<div style="display:flex;gap:8px;flex-wrap:wrap"><label class="sr" for="fpj'+i+'">Fitness Passport ID</label><input id="fpj'+i+'" class="fpIn" inputmode="numeric" placeholder="Fitness Passport ID" style="flex:1;min-width:160px;height:40px;border:1px solid var(--line);border-radius:12px;padding:0 12px"><button class="btn dark sm" data-fpsave="'+it.member_id+'">Save ID</button></div>':"")+
    '<div class="outs">'+outs.map(function(o){return '<button class="btn sm '+(o==="joined"||o==="paid"||o==="billing_in"||o==="tag_given"||o==="fp_in_gm"?"dark":"line")+'" data-out="'+o+'">'+OUT_LABEL[o]+'</button>'}).join("")+'</div></div>';
  }).join("");
 p.scrollIntoView({behavior:"smooth",block:"nearest"});
}
$("#jobPanel").addEventListener("click",function(e){
 if(e.target.id==="jpClose"){$("#jobPanel").hidden=true;$("#jobPanel").dataset.kind="";return}
 var b=e.target.closest("[data-out]");if(!b)return;
 var box=b.closest("[data-i]"),kind=$("#jobPanel").dataset.kind;
 var it=TODAY.jobs.find(function(x){return x.kind===kind}).items[+box.dataset.i];
 var o=b.dataset.out,note="",when="";
 if(o==="call_back"){
  box.querySelector(".outs").innerHTML='<label class="fld" style="flex:1;min-width:160px">When<input type="date" class="cbDate"></label><label class="fld" style="flex:2;min-width:200px">Note<input class="cbNote" placeholder="What to talk about"></label><button class="btn dark sm" data-cb="1" style="align-self:flex-end">Save</button>';
  return;
 }
 send(it,kind,o,note,when,box);
});
$("#jobPanel").addEventListener("click",function(e){
 var b=e.target.closest("[data-fpsave]");if(!b)return;
 var box=b.closest("[data-i]"),v=box.querySelector(".fpIn").value;
 post("/api/members/"+b.dataset.fpsave+"/details",{fp_id:v}).then(function(r){
  if(!r.ok){alertIn(box,r.error);return}
  box.innerHTML='<div class="muted">Saved. Now type it into GymMaster, it\'s on Today.</div>';setTimeout(loadToday,600);
 });
});
$("#jobPanel").addEventListener("click",function(e){
 var b=e.target.closest("[data-cb]");if(!b)return;
 var box=b.closest("[data-i]"),kind=$("#jobPanel").dataset.kind;
 var it=TODAY.jobs.find(function(x){return x.kind===kind}).items[+box.dataset.i];
 send(it,kind,"call_back",box.querySelector(".cbNote").value,box.querySelector(".cbDate").value,box);
});
function send(it,kind,o,note,when,box){
 box.style.opacity=".5";
 post("/api/jobs",{kind:kind,outcome:o,member_id:it.member_id||null,lead_id:it.lead_id||null,task_id:it.task_id||null,note:note,call_back_on:when}).then(function(r){
  if(!r.ok){box.style.opacity="1";alertIn(box,r.error);return}
  box.innerHTML='<div class="muted">'+esc(it.name)+": "+esc(OUT_LABEL[o])+'</div>';
  setTimeout(loadToday,600);
 });
}
function alertIn(box,msg){var d=document.createElement("div");d.className="err";d.textContent=msg;box.appendChild(d)}

/* ---------- members ---------- */
var qt;
$("#q").addEventListener("input",function(e){clearTimeout(qt);qt=setTimeout(function(){search(e.target.value)},250)});
function search(v){
 if(v.trim().length<2){$("#results").innerHTML='<div class="muted">Start typing to find someone.</div>';return}
 get("/api/members?q="+encodeURIComponent(v)).then(function(d){
  $("#results").innerHTML=(d.results||[]).map(function(m){return '<div class="r" data-member="'+m.id+'"><span><b>'+esc(nm(m))+'</b> <span class="muted">'+esc(m.plan||"")+'</span></span><span class="pill'+(m.family==="perform"?" dark":"")+'">'+esc(m.family||m.status)+'</span></div>'}).join("")||'<div class="muted">No one found.</div>';
 });
}
document.addEventListener("click",function(e){var r=e.target.closest("[data-member]");if(!r)return;e.preventDefault();openMember(+r.dataset.member)});
function openMember(id){
 if(VIEW!=="members"){VIEW="members";$$("[data-view]").forEach(function(s){s.hidden=s.dataset.view!=="members"});$$(".nav").forEach(function(b){b.classList.toggle("on",b.dataset.go==="members")})}
 $("#profile").innerHTML='<section class="card"><div class="muted">Loading...</div></section>';
 get("/api/members/"+id).then(function(d){renderMember(d,id)});
}
function renderMember(d,id){
 var P=$("#profile");
 if(d.error){P.innerHTML='<section class="card"><div class="err">'+esc(d.error)+'</div></section>';return}
 var m=d.member,ms=d.memberships.filter(function(x){return x.status==="current"})[0]||d.memberships[0]||{};
 var isFp=ms.family==="passport"||d.flags.some(function(f){return f.flag==="passport"});
 var flags=d.flags.filter(function(f){return !(f.flag==="passport"&&ms.family==="passport")}).map(function(f){return '<span class="pill'+(f.flag==="blocked"?" warn":f.flag==="passport"?"":" ")+'">'+esc(f.flag.replace(/_/g," ")+(f.detail?": "+f.detail:""))+'</span>'}).join(" ");
 var vis=d.visits||[],weeks=[];for(var w=11;w>=0;w--){var s=0;vis.forEach(function(v){var age=(Date.now()-new Date(v.day+"T00:00:00").getTime())/864e5;if(age>=w*7&&age<(w+1)*7)s+=v.n});weeks.push(s)}
 var mx=Math.max.apply(null,weeks.concat([1]));
 var bill=d.billing?'<section class="card"><h2>Billing</h2>'+(d.billing.balance_owing>0?'<div class="warnbox">Owes <b>'+money(d.billing.balance_owing)+'</b></div>':'<div class="muted">Nothing owing.</div>')+
   '<dl class="kv"><dt>Plan</dt><dd>'+esc(ms.plan||"-")+(ms.price?", "+money(ms.price)+" "+esc(ms.frequency||""):"")+'</dd><dt>Billed by</dt><dd>'+esc(d.billing.billed_by_system==="core"?"M2 Core":"GymMaster")+'</dd>'+(d.billing.free_weeks_credit?'<dt>Free weeks</dt><dd>'+d.billing.free_weeks_credit+' to apply</dd>':"")+(ms.min_term_end?'<dt>Lock-in ends</dt><dd>'+esc(day(ms.min_term_end))+'</dd>':"")+(ms.end_date?'<dt>Ends</dt><dd>'+esc(day(ms.end_date))+'</dd>':"")+'</dl>'+
   (ME.can.add?'<button class="btn line sm" data-bill="'+id+'" style="align-self:flex-start">Enter or update bank details</button>':"")+'</section>':"";
 var tagRows=d.tags.map(function(t){return '<div><span>'+esc(day(t.assigned_at))+'</span><span>'+esc(t.tag)+' <span class="pill'+(t.status==="active"?" ok":"")+'">'+esc(t.status)+'</span></span></div>'}).join("");
 P.innerHTML=
  '<section class="card"><div style="display:flex;gap:16px;align-items:center;flex-wrap:wrap"><div class="face" id="pFace">'+(d.photo_at?'<img src="/api/members/'+id+'/photo?t='+encodeURIComponent(d.photo_at)+'" alt="Photo of '+esc(nm(m))+'">':esc(initials(nm(m))))+'</div><div style="margin-right:auto;min-width:0"><h2 style="font-size:26px">'+esc(nm(m))+'</h2><div style="margin-top:6px;display:flex;gap:6px;flex-wrap:wrap"><span class="pill dark">'+esc(ms.plan||m.status)+'</span>'+flags+'</div></div></div>'+
  '<dl class="kv"><dt>Member since</dt><dd>'+esc(day(m.joined_on))+'</dd><dt>Mobile</dt><dd>'+(m.mobile?'<a href="tel:'+esc(m.mobile)+'">'+esc(m.mobile)+'</a>':'<span class="muted">None</span>')+'</dd><dt>Email</dt><dd>'+esc(m.email||"None")+'</dd><dt>Goal</dt><dd>'+esc(m.goal||"Not recorded")+'</dd><dt>Came from</dt><dd>'+esc(m.lead_source||"Not recorded")+'</dd>'+(d.referrer?'<dt>Brought by</dt><dd><a href="#" data-member="'+d.referrer.id+'">'+esc(nm(d.referrer))+'</a></dd>':"")+(d.trainer?'<dt>Trainer</dt><dd>'+esc(d.trainer.name)+'</dd>':"")+(isFp?'<dt>Fitness Passport ID</dt><dd>'+(m.fp_id?esc(m.fp_id)+(m.fp_id_in_gm?"":' <span class="pill warn">Not in GymMaster yet</span>'):'<span class="pill warn">Missing. Passport can\'t pay for their visits</span>')+'</dd>':"")+(m.passport_number&&m.passport_number!==m.fp_id?'<dt>Old number in surname</dt><dd>'+esc(m.passport_number)+'</dd>':"")+'<dt>Visits, all time</dt><dd>'+esc(m.total_visits_gm||0)+'</dd>'+(d.last_visit?'<dt>Last visit</dt><dd>'+esc(day(d.last_visit))+'</dd>':"")+'<dt>Key tag</dt><dd>'+esc(m.key_tag||"None")+'</dd></dl>'+
  (ME.can.add?'<div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn '+(d.photo_at?"line":"dark")+' sm" data-photo="'+id+'" data-name="'+esc(nm(m))+'">'+(d.photo_at?"Retake photo":"Take photo")+'</button><button class="btn line sm" data-edit="'+id+'">Edit details</button><button class="btn line sm" data-tagfor="'+id+'">'+(m.key_tag?"Replace key tag":"Give key tag")+'</button><button class="btn line sm" data-flagfor="'+id+'">Flags</button></div>':"")+
  '<div id="editBox"></div></section>'+
  '<section class="card dark"><div class="next"><div><div class="eyebrow">Best next step</div><div style="font-size:16px;margin-top:4px">'+esc(d.next_step.text)+'</div></div></div></section>'+
  '<div id="liveBox"><section class="card"><h2>Live from GymMaster</h2><div class="muted">Checking GymMaster...</div></section></div>'+
  (vis.length?'<section class="card"><h2>Visits</h2><div class="bars">'+weeks.map(function(n,i){return '<i class="'+(i===11?"last":"")+'" style="height:'+Math.max(4,Math.round(n/mx*100))+'%" title="'+n+' visits"></i>'}).join("")+'</div><div class="muted">Last 12 weeks</div></section>':"")+
  bill+
  '<section class="card"><h2>Notes and history</h2><div style="display:flex;gap:8px"><label class="sr" for="noteIn">Add a note</label><input id="noteIn" class="fld" style="flex:1;height:44px;border:1px solid var(--line);border-radius:12px;padding:0 12px" placeholder="Add a note, like what they said at the desk"><button class="btn dark sm" data-note="'+id+'" style="height:44px">Save</button></div>'+
  '<div class="hist">'+(d.activity.map(function(a){return '<div><span>'+esc(day(a.at))+'</span><span>'+esc(a.detail)+(a.staff?' <span class="muted">'+esc(a.staff)+'</span>':"")+'</span></div>'}).join("")||'<p class="muted" style="margin:0">Nothing yet.</p>')+'</div></section>'+
  (tagRows?'<section class="card"><h2>Key tags</h2><div class="hist">'+tagRows+'</div></section>':"");
 loadLive(id);
}
document.addEventListener("click",function(e){
 var t;
 if((t=e.target.closest("[data-note]"))){var id=+t.dataset.note,v=$("#noteIn").value;if(!v.trim())return;post("/api/members/"+id+"/notes",{text:v}).then(function(){openMember(id)});}
 if((t=e.target.closest("[data-bill]"))){get("/api/members/"+t.dataset.bill+"/billing-link").then(function(b){if(b.url)window.open(b.url,"m2billing","width=900,height=900");else alert(b.error||"Not set up yet")})}
 if((t=e.target.closest("[data-tagfor]"))){var id2=+t.dataset.tagfor;$("#editBox").innerHTML='<div class="person"><label class="sr" for="ptag">Key tag number</label><input id="ptag" class="tagbox" placeholder="Scan the new tag" autocomplete="off"><label class="fld">If they had one before, it was<select id="pold"><option value="replaced">Swapped for a new one</option><option value="lost">Lost</option><option value="returned">Handed back</option></select></label><div class="err" id="ptErr"></div></div>';var inp=$("#ptag");inp.focus();inp.addEventListener("keydown",function(ev){if(ev.key!=="Enter")return;ev.preventDefault();post("/api/members/"+id2+"/key-tag",{tag:inp.value,oldStatus:$("#pold").value}).then(function(r){if(!r.ok){$("#ptErr").textContent=r.error;inp.select();return}openMember(id2)})})}
 if((t=e.target.closest("[data-flagfor]"))){var id3=+t.dataset.flagfor;var opts=[["gifted_time","Gifted time (never chased for money)"],["do_not_contact","Do not contact"],["passport","Fitness Passport"],["student","Student"],["corporate","Corporate"]];$("#editBox").innerHTML='<div class="person">'+opts.map(function(o){return '<label style="display:flex;gap:8px;align-items:center;font-size:14px"><input type="checkbox" data-flag="'+o[0]+'"> '+o[1]+'</label>'}).join("")+'<div class="err" id="flErr"></div></div>';get("/api/members/"+id3).then(function(d){d.flags.forEach(function(f){var c=document.querySelector('[data-flag="'+f.flag+'"]');if(c)c.checked=true})});$$("[data-flag]").forEach(function(c){c.addEventListener("change",function(){post("/api/members/"+id3+"/flags",{flag:c.dataset.flag,on:c.checked}).then(function(r){if(!r.ok){$("#flErr").textContent=r.error;c.checked=!c.checked}})})})}
 if((t=e.target.closest("[data-edit]"))){var id4=+t.dataset.edit;get("/api/members/"+id4).then(function(d){var m=d.member;$("#editBox").innerHTML='<div class="person"><div class="grid2"><label class="fld">Email<input id="eEmail" value="'+esc(m.email||"")+'"></label><label class="fld">Mobile<input id="eMobile" value="'+esc(m.mobile||"")+'"></label><label class="fld">Goal<select id="eGoal"></select></label><label class="fld">Came from<select id="eSource"></select></label><label class="fld">Emergency contact<input id="eEn" value="'+esc(m.emergency_name||"")+'"></label><label class="fld">Emergency phone<input id="eEp" value="'+esc(m.emergency_phone||"")+'"></label><label class="fld">Fitness Passport ID<input id="eFp" inputmode="numeric" value="'+esc(m.fp_id||"")+'" placeholder="Passport members only"></label></div><div class="err" id="eErr"></div><button class="btn dark sm" id="eSave" style="align-self:flex-start">Save</button></div>';
  fillSelect($("#eGoal"),GOALS,m.goal);fillSelect($("#eSource"),SOURCES,m.lead_source);
  $("#eSave").addEventListener("click",function(){post("/api/members/"+id4+"/details",{email:$("#eEmail").value,mobile:$("#eMobile").value,goal:$("#eGoal").value,lead_source:$("#eSource").value,emergency_name:$("#eEn").value,emergency_phone:$("#eEp").value,fp_id:$("#eFp").value}).then(function(r){if(!r.ok){$("#eErr").textContent=r.error;return}if(r.note)alert(r.note);openMember(id4)})})})}
});
var GOALS=["Strength","Weight loss","HYROX or racing","Fitness and health","Recovery and wellbeing","Running","Muscle gain","Other"];
var SOURCES=["Instagram","Facebook","Google","Referred by a member","Walked past","Fitness Passport","Work or corporate","Word of mouth","Event","Other"];
function fillSelect(el,list,val){el.innerHTML='<option value="">Pick one</option>'+list.map(function(x){return '<option'+(x===val?" selected":"")+'>'+esc(x)+'</option>'}).join("")+(val&&list.indexOf(val)<0?'<option selected>'+esc(val)+'</option>':"")}

/* ---------- leads ---------- */
var LEADS=null,LKIND="",STAFF=[];
function loadLeads(){
 get("/api/leads"+(LKIND?"?kind="+LKIND:"")).then(function(d){
  LEADS=d.leads||[];
  var open=LEADS.filter(function(l){return l.stage==="new"}).length;$("#ctLeads").hidden=!open;$("#ctLeads").textContent=open;
  var kinds=Object.keys(d.counts||{});
  $("#leadKinds").innerHTML='<button class="chip'+(LKIND?"":" on")+'" data-k="">All '+(LKIND?"":LEADS.length)+'</button>'+Object.keys(KIND).filter(function(k){return kinds.indexOf(k)>=0||k===LKIND}).map(function(k){return '<button class="chip'+(k===LKIND?" on":"")+'" data-k="'+k+'">'+KIND[k]+(d.counts[k]?" "+d.counts[k]:"")+'</button>'}).join("");
  var cols=[["new","New"],["contacted","Contacted"],["trial","On trial"],["joined","Joined lately"]];
  $("#board").innerHTML=cols.map(function(c){var list=LEADS.filter(function(l){return l.stage===c[0]});return '<div class="col"><h3><span>'+c[1]+'</span><span class="muted">'+list.length+'</span></h3>'+list.slice(0,60).map(function(l){return '<button class="lead" data-lead="'+l.id+'"><span class="t"><b>'+esc(l.name||l.email||l.mobile)+'</b><span class="muted">'+esc(day(l.created_at))+'</span></span><span class="muted">'+esc(KIND[l.kind]||l.kind)+(l.goal?", "+esc(l.goal):"")+'</span>'+(l.assigned_name?'<span class="pill">'+esc(l.assigned_name)+'</span>':"")+'</button>'}).join("")+(list.length?"":'<div class="muted" style="padding:4px 6px">None</div>')+'</div>'}).join("");
 });
 if(!STAFF.length)get("/api/staff").then(function(d){STAFF=d.staff||[]});
}
$("#leadKinds").addEventListener("click",function(e){var b=e.target.closest("[data-k]");if(!b)return;LKIND=b.dataset.k;loadLeads()});
$("#board").addEventListener("click",function(e){var b=e.target.closest("[data-lead]");if(b)openLead(+b.dataset.lead)});
function openLead(id){
 get("/api/leads/"+id).then(function(d){
  var p=$("#leadPanel");p.hidden=false;
  if(d.error){p.innerHTML='<div class="err">'+esc(d.error)+'</div>';return}
  var l=d.lead;
  p.innerHTML='<div style="display:flex;gap:10px;align-items:baseline;flex-wrap:wrap"><h2>'+esc(l.name||"Lead")+'</h2><span class="pill">'+esc(KIND[l.kind]||l.kind)+'</span><button class="btn line sm" id="lpClose" style="margin-left:auto">Close</button></div>'+
   '<dl class="kv"><dt>Mobile</dt><dd>'+(l.mobile?'<a href="tel:'+esc(l.mobile)+'">'+esc(l.mobile)+'</a>':"None")+'</dd><dt>Email</dt><dd>'+esc(l.email||"None")+'</dd><dt>Goal</dt><dd>'+esc(l.goal||"-")+'</dd><dt>Came from</dt><dd>'+esc([l.source,l.campaign].filter(Boolean).join(", ")||"-")+'</dd><dt>Came in</dt><dd>'+esc(day(l.created_at))+'</dd>'+(l.notes?'<dt>Notes</dt><dd>'+esc(l.notes)+'</dd>':"")+(l.member_id?'<dt>Member</dt><dd><a href="#" data-member="'+l.member_id+'">Open profile</a></dd>':"")+'</dl>'+
   (ME.can.add?'<label class="fld" style="max-width:320px">Assigned to<select id="lpAssign"><option value="">Nobody</option>'+STAFF.map(function(s){return '<option value="'+s.id+'"'+(s.id===l.assigned_to?" selected":"")+'>'+esc(s.name)+'</option>'}).join("")+'</select></label>':"")+
   '<div class="outs">'+["joined","call_back","no_answer","not_interested"].map(function(o){return '<button class="btn sm '+(o==="joined"?"dark":"line")+'" data-lout="'+o+'">'+OUT_LABEL[o]+'</button>'}).join("")+'</div>'+
   '<div style="display:flex;gap:8px"><input id="lpNote" style="flex:1;height:40px;border:1px solid var(--line);border-radius:12px;padding:0 12px" placeholder="Add a note"><button class="btn dark sm" id="lpNoteSave" style="height:40px">Save</button></div>'+
   '<div class="hist">'+d.activity.map(function(a){return '<div><span>'+esc(day(a.at))+'</span><span>'+esc(a.detail)+(a.staff?' <span class="muted">'+esc(a.staff)+'</span>':"")+'</span></div>'}).join("")+'</div>';
  p.dataset.id=id;p.scrollIntoView({behavior:"smooth",block:"nearest"});
  var as=$("#lpAssign");if(as)as.addEventListener("change",function(){post("/api/leads/"+id,{assigned_to:as.value||null,assigned_name:as.options[as.selectedIndex].text}).then(function(){loadLeads()})});
 });
}
$("#leadPanel").addEventListener("click",function(e){
 var p=$("#leadPanel"),id=+p.dataset.id;
 if(e.target.id==="lpClose"){p.hidden=true;return}
 if(e.target.id==="lpNoteSave"){var v=$("#lpNote").value;if(!v.trim())return;post("/api/leads/"+id,{note:v}).then(function(){openLead(id)});return}
 var b=e.target.closest("[data-lout]");if(!b)return;
 post("/api/jobs",{kind:"new_lead",outcome:b.dataset.lout,lead_id:id}).then(function(r){if(!r.ok){alertIn(p,r.error);return}openLead(id);loadLeads()});
});
$("#newLeadBtn").addEventListener("click",function(){$("#newLeadCard").hidden=false;fillSelect($("#nlSource"),SOURCES,"");$("#nlName").focus()});
$("#nlCancel").addEventListener("click",function(){$("#newLeadCard").hidden=true});
$("#nlSave").addEventListener("click",function(){
 $("#nlErr").textContent="";
 post("/api/leads",{name:$("#nlName").value,mobile:$("#nlMobile").value,email:$("#nlEmail").value,kind:$("#nlKind").value,goal:$("#nlGoal").value,source:$("#nlSource").value,notes:$("#nlNotes").value}).then(function(r){
  if(!r.ok){$("#nlErr").textContent=r.error;return}
  ["#nlName","#nlMobile","#nlEmail","#nlGoal","#nlNotes"].forEach(function(s){$(s).value=""});$("#newLeadCard").hidden=true;loadLeads();
 });
});

/* ---------- key tag lookup ---------- */
$("#lookTag").addEventListener("keydown",function(e){
 if(e.key!=="Enter")return;e.preventDefault();var v=e.target.value.trim().replace(/\s+/g,"");if(!v)return;
 get("/api/key-tags/"+encodeURIComponent(v)).then(function(d){
  var h=d.current?'<div class="ok">Belongs to <a href="#" data-member="'+d.current.id+'"><b>'+esc(nm(d.current))+'</b></a>.</div>':'<div class="warnbox">Not on anyone right now.</div>';
  if(d.history&&d.history.length)h+='<div class="hist">'+d.history.map(function(x){return '<div><span>'+esc(day(x.assigned_at))+'</span><span>'+esc(nm(x))+' <span class="pill">'+esc(x.status)+'</span></span></div>'}).join("")+'</div>';
  $("#lookRes").innerHTML=h;e.target.select();
 });
});

/* ---------- camera ---------- */
// Works with the USB camera at reception, a laptop camera, or a phone or tablet.
function initials(n){return String(n||"?").split(/\s+/).filter(Boolean).slice(0,2).map(function(x){return x[0].toUpperCase()}).join("")||"?"}
var CAM={stream:null,done:null,shot:null};
function camStop(){if(CAM.stream){CAM.stream.getTracks().forEach(function(t){t.stop()});CAM.stream=null}}
function camStart(devId){
 camStop();$("#camErr").textContent="";
 if(!navigator.mediaDevices||!navigator.mediaDevices.getUserMedia){$("#camErr").textContent="This browser can't use a camera. Use Upload a photo instead.";return Promise.resolve()}
 var v={width:{ideal:1280},height:{ideal:720}};if(devId)v.deviceId={exact:devId};
 return navigator.mediaDevices.getUserMedia({video:v,audio:false}).then(function(s){
  CAM.stream=s;$("#camVid").srcObject=s;
  var id=s.getVideoTracks()[0].getSettings().deviceId;try{if(id)localStorage.setItem("m2cam",id)}catch(e){}
  return navigator.mediaDevices.enumerateDevices().then(function(list){
   var cams=list.filter(function(d){return d.kind==="videoinput"});
   $("#camDev").innerHTML=cams.map(function(c,i){return '<option value="'+esc(c.deviceId)+'"'+(c.deviceId===id?" selected":"")+'>'+esc(c.label||("Camera "+(i+1)))+'</option>'}).join("");
  });
 }).catch(function(e){$("#camErr").textContent=(e&&e.name==="NotAllowedError")?"Chrome blocked the camera. Click the camera icon in the address bar and allow it.":"Can't find a camera. Check the USB camera is plugged in, or use Upload a photo."});
}
function openCam(who,done){
 CAM.done=done;CAM.shot=null;$("#camWho").textContent=who||"";$("#cam").hidden=false;
 $("#camShot").hidden=true;$("#camVid").hidden=false;$("#camSnap").hidden=false;$("#camRetake").hidden=true;$("#camUse").hidden=true;
 var saved=null;try{saved=localStorage.getItem("m2cam")}catch(e){}
 camStart(saved).then(function(){if(!CAM.stream&&saved)camStart(null)});
}
function closeCam(){camStop();$("#cam").hidden=true}
function squareJpeg(src,w,h){var s=Math.min(w,h),c=document.createElement("canvas");c.width=480;c.height=480;c.getContext("2d").drawImage(src,(w-s)/2,(h-s)/2,s,s,0,0,480,480);return c.toDataURL("image/jpeg",0.82)}
function showShot(url){CAM.shot=url;$("#camShot").src=url;$("#camShot").hidden=false;$("#camVid").hidden=true;$("#camSnap").hidden=true;$("#camRetake").hidden=false;$("#camUse").hidden=false}
$("#camSnap").addEventListener("click",function(){var v=$("#camVid");if(!v.videoWidth){$("#camErr").textContent="The camera isn't ready yet.";return}showShot(squareJpeg(v,v.videoWidth,v.videoHeight))});
$("#camRetake").addEventListener("click",function(){CAM.shot=null;$("#camShot").hidden=true;$("#camVid").hidden=false;$("#camSnap").hidden=false;$("#camRetake").hidden=true;$("#camUse").hidden=true});
$("#camUse").addEventListener("click",function(){var u=CAM.shot,d=CAM.done;closeCam();if(d&&u)d(u)});
$("#camClose").addEventListener("click",closeCam);
$("#cam").addEventListener("click",function(e){if(e.target.id==="cam")closeCam()});
document.addEventListener("keydown",function(e){if(e.key==="Escape"&&!$("#cam").hidden)closeCam()});
$("#camDev").addEventListener("change",function(e){camStart(e.target.value)});
$("#camFile").addEventListener("change",function(e){var f=e.target.files&&e.target.files[0];if(!f)return;var im=new Image();im.onload=function(){showShot(squareJpeg(im,im.naturalWidth,im.naturalHeight));URL.revokeObjectURL(im.src)};im.src=URL.createObjectURL(f);e.target.value=""});
// Profile and Today: take or retake a member's photo.
document.addEventListener("click",function(e){var b=e.target.closest("[data-photo]");if(!b)return;var id=+b.dataset.photo;
 openCam(b.dataset.name,function(url){post("/api/members/"+id+"/photo",{jpeg:url}).then(function(r){if(!r.ok){alert(r.error);return}
  if(VIEW==="today")loadToday();else openMember(id)})})});
// Add member: photo before saving.
var PHOTO=null;
$("#aPhotoBtn").addEventListener("click",function(){openCam(($("#first").value+" "+$("#last").value).trim(),function(url){PHOTO=url;$("#aFace").innerHTML='<img src="'+url+'" alt="New member photo">';$("#aPhotoBtn").textContent="Retake photo";$("#aNoPhoto").checked=false})});

/* ---------- reports ---------- */
var REP={kind:"current_members"};
function repQuery(){var q="kind="+REP.kind;if(!$("#repDates").hidden&&$("#repFrom").value)q+="&from="+$("#repFrom").value+"&to="+$("#repTo").value;return q}
function loadReport(){
 get("/api/report?"+repQuery()).then(function(d){
  if(d.error){$("#repTable").innerHTML='<div class="err">'+esc(d.error)+'</div>';return}
  $("#repKinds").innerHTML=d.reports.map(function(r){return '<button class="chip'+(r.kind===d.kind?" on":"")+'" data-rk="'+r.kind+'">'+esc(r.title)+'</button>'}).join("");
  $("#repDates").hidden=!d.dates;if(d.dates){$("#repFrom").value=d.from;$("#repTo").value=d.to}
  $("#repTitle").textContent=d.title;$("#repCount").textContent=d.total.toLocaleString("en-NZ")+(d.total>500?" (first 500 shown, all in the CSV)":"");
  $("#repCsv").href="/api/report?"+repQuery()+"&format=csv";
  $("#repTable").innerHTML=d.rows.length?'<table class="tbl"><thead><tr>'+d.columns.map(function(c){return '<th>'+esc(c)+'</th>'}).join("")+'</tr></thead><tbody>'+d.rows.map(function(r){return '<tr'+(r.ID?' data-member="'+r.ID+'" style="cursor:pointer"':"")+'>'+d.columns.map(function(c){var v=r[c];return '<td>'+esc(v==null?"":v)+'</td>'}).join("")+'</tr>'}).join("")+'</tbody></table>':'<div class="muted">Nothing for this one.</div>';
 });
}
$("#repKinds").addEventListener("click",function(e){var b=e.target.closest("[data-rk]");if(!b)return;REP.kind=b.dataset.rk;$("#repFrom").value="";$("#repTo").value="";loadReport()});
$("#repFrom").addEventListener("change",loadReport);$("#repTo").addEventListener("change",loadReport);

/* ---------- charts ---------- */
var MON=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
function ml(ym){var p=String(ym||"").split("-");return p.length>1?MON[+p[1]-1]+(p[1]==="01"?" "+p[0].slice(2):""):String(ym)}
function k$(n){n=Number(n||0);var a=Math.abs(n);return (n<0?"-":"")+"$"+(a>=1e6?(a/1e6).toFixed(2)+"m":a>=1e4?Math.round(a/1e3)+"k":a>=1e3?(a/1e3).toFixed(1)+"k":Math.round(a))}
function whole$(n){return "$"+Math.round(Number(n||0)).toLocaleString("en-NZ")}
// cols: [{label, vals:[...]}], series: [{name, cls}]
function bars(cols,series,fmt){
 fmt=fmt||function(x){return x};
 var mx=1;cols.forEach(function(c){c.vals.forEach(function(v){mx=Math.max(mx,Math.abs(v||0))})});
 return '<div class="chart">'+cols.map(function(c){return '<div class="c">'+c.vals.map(function(v,i){return '<i class="b '+(series[i]&&series[i].cls||"")+(v<0?" neg":"")+'" style="height:'+Math.max(1,Math.round(Math.abs(v||0)/mx*100))+'%" title="'+esc(c.label+": "+(series[i]?series[i].name+" ":"")+fmt(v))+'"></i>'}).join("")+'</div>'}).join("")+'</div>'+
  '<div class="clab">'+cols.map(function(c){return '<span>'+esc(c.label)+'</span>'}).join("")+'</div>'+
  (series.length>1?'<div class="legend">'+series.map(function(s){return '<span><i class="'+s.cls+'" style="background:'+(s.cls==="s1"?"#C9C9BF":s.cls==="s2"?"var(--olive)":"var(--ink)")+'"></i>'+esc(s.name)+'</span>'}).join("")+'</div>':"");
}
function hbars(rows,fmt){fmt=fmt||function(x){return x};var mx=1;rows.forEach(function(r){mx=Math.max(mx,r[1]||0)});
 return rows.length?rows.map(function(r){return '<div class="hb"><span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+esc(r[0])+'</span><span class="bar"><i style="width:'+Math.round((r[1]||0)/mx*100)+'%"></i></span><b>'+esc(fmt(r[1]||0))+'</b></div>'}).join(""):'<div class="muted">Nothing yet.</div>'}
function lineChart(pts){
 if(pts.length<2)return '<div class="muted">Builds up from today: the Core takes a count every night.</div>';
 var ys=pts.map(function(p){return p[1]}),lo=Math.min.apply(null,ys),hi=Math.max.apply(null,ys);if(hi===lo){hi+=1;lo-=1}var pad=(hi-lo)*.15;lo-=pad;hi+=pad;
 var W=600,Hh=150,xy=pts.map(function(p,i){return [Math.round(i/(pts.length-1)*W),Math.round(Hh-(p[1]-lo)/(hi-lo)*Hh)]});
 return '<svg viewBox="0 0 600 170" preserveAspectRatio="none" role="img" aria-label="Members over time"><polyline fill="none" stroke="#0A0A0A" stroke-width="2.5" vector-effect="non-scaling-stroke" points="'+xy.map(function(p){return p.join(",")}).join(" ")+'"/><polygon fill="rgba(223,255,0,.35)" points="0,150 '+xy.map(function(p){return p.join(",")}).join(" ")+' 600,150"/></svg>'+
  '<div class="clab"><span style="text-align:left">'+esc(pts[0][0])+'</span><span style="text-align:right">'+esc(pts[pts.length-1][0])+'</span></div>';
}
function table(cols,rows){return '<table class="tbl"><thead><tr>'+cols.map(function(c){return '<th'+(c[2]?' class="r"':"")+'>'+esc(c[0])+'</th>'}).join("")+'</tr></thead><tbody>'+rows.map(function(r){return '<tr'+(r._member?' data-member="'+r._member+'" style="cursor:pointer"':"")+'>'+cols.map(function(c){var v=typeof c[1]==="function"?c[1](r):r[c[1]];return '<td'+(c[2]?' class="r"':"")+'>'+(c[3]?v:esc(v==null?"":v))+'</td>'}).join("")+'</tr>'}).join("")+'</tbody></table>'}
function tile(n,l){return '<div class="tile"><div class="n">'+esc(n)+'</div><div class="l">'+esc(l)+'</div></div>'}

/* ---------- classes ---------- */
var CLS={week:null,data:null,cur:null};
function loadClasses(w){
 get("/api/classes"+(w?"?week="+w:"")).then(function(d){
  if(d.error){$("#clsWeek").innerHTML='<div class="err">'+esc(d.error)+'</div>';return}
  CLS.data=d;CLS.week=d.week;
  var mon=new Date(d.week+"T12:00:00");
  $("#clsTitle").textContent=(d.today>=d.week&&d.today<d.next?"This week":"Week of "+mon.toLocaleDateString("en-NZ",{day:"numeric",month:"long"}));
  $("#clsCount").textContent=d.classes.length+" classes, "+d.classes.reduce(function(a,c){return a+c.booked},0)+" booked";
  var by={};d.classes.forEach(function(c){(by[c.day]=by[c.day]||[]).push(c)});
  $("#clsWeek").innerHTML=Object.keys(by).sort().map(function(dy){
   var dd=new Date(dy+"T12:00:00");
   return '<div class="dayh">'+esc(dd.toLocaleDateString("en-NZ",{weekday:"long",day:"numeric",month:"short"}))+(dy===d.today?" (today)":"")+'</div>'+by[dy].map(function(c){
    var pct=c.max?Math.round(c.booked/c.max*100):0,full=c.max&&c.booked>=c.max;
    return '<button class="cls'+(dy<d.today?" past":"")+(CLS.cur&&CLS.cur.id===c.id?" on":"")+'" data-cls="'+c.id+'"><b>'+esc(c.start)+'</b><span><b>'+esc(c.name)+'</b> <span class="muted">'+esc(c.coach||"")+'</span><div class="fill"><i class="'+(full?"full":"")+'" style="width:'+pct+'%"></i></div></span><span class="pill'+(full?" dark":"")+'">'+c.booked+"/"+c.max+(c.waitlist?" +"+c.waitlist+" waiting":"")+'</span></button>'}).join("")}).join("")||'<div class="muted">No classes this week.</div>';
 });
}
$("#clsPrev").addEventListener("click",function(){if(CLS.data)loadClasses(CLS.data.prev)});
$("#clsNext").addEventListener("click",function(){if(CLS.data)loadClasses(CLS.data.next)});
$("#clsNow").addEventListener("click",function(){loadClasses(null)});
$("#clsWeek").addEventListener("click",function(e){var b=e.target.closest("[data-cls]");if(!b)return;var c=CLS.data.classes.find(function(x){return String(x.id)===b.dataset.cls});CLS.cur=c;$$(".cls").forEach(function(x){x.classList.toggle("on",x===b)});openClass(c)});
function clsLabel(c){return c.name+", "+new Date(c.day+"T12:00:00").toLocaleDateString("en-NZ",{weekday:"short",day:"numeric",month:"short"})+" "+c.time}
function openClass(c){
 var P=$("#clsPanel");
 P.innerHTML='<div style="display:flex;gap:10px;align-items:baseline;flex-wrap:wrap"><h2>'+esc(c.name)+'</h2><span class="muted">'+esc(clsLabel(c).split(", ")[1])+'</span></div><dl class="kv"><dt>Coach</dt><dd>'+esc(c.coach||"-")+'</dd><dt>Booked</dt><dd>'+c.booked+' of '+c.max+(c.waitlist?", "+c.waitlist+" waiting":"")+'</dd>'+(c.location?'<dt>Where</dt><dd>'+esc(c.location)+'</dd>':"")+'</dl>'+
  (CLS.data.can_book&&c.day>=CLS.data.today?'<div><label class="sr" for="clsQ">Find a member to book</label><div class="search" style="height:42px"><input id="clsQ" autocomplete="off" placeholder="Book someone in: name, mobile or key tag"></div><div class="list" id="clsFind"></div><div class="err" id="clsErr"></div></div>':"")+
  '<div id="clsAtt"><div class="muted">Getting the list from GymMaster...</div></div>';
 var q=$("#clsQ"),t;if(q)q.addEventListener("input",function(){clearTimeout(t);t=setTimeout(function(){var v=q.value;if(v.trim().length<2){$("#clsFind").innerHTML="";return}
  get("/api/members?q="+encodeURIComponent(v)).then(function(d){$("#clsFind").innerHTML=(d.results||[]).slice(0,8).map(function(m){return '<div class="r" style="cursor:default"><span><b>'+esc(nm(m))+'</b> <span class="muted">'+esc(m.plan||m.status)+'</span></span><button class="btn dark sm" data-book="'+m.id+'">Book</button></div>'}).join("")||'<div class="muted">No one found.</div>'})},250)});
 get("/api/classes/"+c.id).then(function(d){
  if(d.error){$("#clsAtt").innerHTML='<div class="err">'+esc(d.error)+'</div>';return}
  var a=d.attendees||[];
  $("#clsAtt").innerHTML=(a.length?'<h3 style="margin-top:6px">Who\'s coming</h3>':'<div class="muted">Nobody booked yet.</div>')+a.map(function(p){
   return '<div class="att"><div class="face sm">'+(p.has_photo?'<img src="/api/members/'+p.member_id+'/photo" alt="">':esc(initials(p.name)))+'</div><div class="who"><b>'+(p.open?'<a href="#" data-member="'+p.member_id+'">'+esc(p.name)+'</a>':esc(p.name))+'</b> '+(p.status!=="booked"?'<span class="pill'+(p.status==="waitlist"?" warn":" ok")+'">'+esc(p.status==="waitlist"?"Waitlist":p.status==="attended"?"Here":p.status)+'</span> ':"")+(p.blocked?'<span class="pill warn">Owes money</span> ':"")+(p.passport?'<span class="pill">Passport</span>':"")+'</div>'+
    (CLS.data.can_book&&c.day>=CLS.data.today&&p.member_id?'<button class="btn line sm" data-unbook="'+p.member_id+'" data-bid="'+esc(p.booking_id||"")+'">Cancel</button>':"")+'</div>'}).join("")+
   (d.unknown_fields?'<div class="muted">GymMaster sent fields the Core doesn\'t know yet: '+esc(d.unknown_fields.join(", "))+'</div>':"");
 });
}
$("#clsPanel").addEventListener("click",function(e){
 var b=e.target.closest("[data-book]"),u=e.target.closest("[data-unbook]"),c=CLS.cur;if(!c||(!b&&!u))return;
 if(b){b.disabled=true;$("#clsErr").textContent="";post("/api/classes/"+c.id+"/book",{member_id:+b.dataset.book,label:clsLabel(c)}).then(function(r){if(!r.ok){b.disabled=false;$("#clsErr").textContent=r.error;return}c.booked++;openClass(c);loadClasses(CLS.week)})}
 if(u){if(!confirm("Cancel this booking?"))return;u.disabled=true;post("/api/classes/"+c.id+"/cancel",{member_id:+u.dataset.unbook,booking_id:u.dataset.bid||null,label:clsLabel(c)}).then(function(r){if(!r.ok){u.disabled=false;alertIn(u.parentNode,r.error);return}c.booked=Math.max(0,c.booked-1);openClass(c);loadClasses(CLS.week)})}
});

/* ---------- live member panel ---------- */
function loadLive(id){
 get("/api/members/"+id+"/live").then(function(d){
  var B=$("#liveBox");if(!B)return;
  if(d.error){B.innerHTML='<section class="card"><h2>Live from GymMaster</h2><div class="muted">'+esc(d.error)+'</div></section>';return}
  var h='<section class="card"><div style="display:flex;align-items:baseline;gap:10px;flex-wrap:wrap"><h2>Live from GymMaster</h2><span class="muted">Checked just now</span></div>';
  if(d.owing!=null)h+=(d.owing>0?'<div class="warnbox">Owes <b>'+money(d.owing)+'</b> right now.'+(d.owing>=250?" Blocked at the doors, in the app and from classes until it's paid.":"")+'</div>':'<div class="ok">Nothing owing.</div>');
  if(d.next_bill)h+='<div class="muted">'+esc(d.next_bill)+'</div>';
  if(d.memberships&&d.memberships.length)h+='<div class="hist">'+d.memberships.map(function(x){return '<div><span>'+esc(day(x.start))+'</span><span><b>'+esc(x.name)+'</b>'+(x.price?" "+esc(x.price):"")+(x.on_hold?' <span class="pill warn">On hold</span>':"")+(x.hold_coming?' <span class="pill">Hold coming</span>':"")+(x.in_min_term?' <span class="pill">In lock-in</span>':"")+'<br><span>'+[x.next_payment?"Next payment "+day(x.next_payment):"",x.end?"Ends "+day(x.end):"",x.earliest_cancel?"Can cancel from "+day(x.earliest_cancel):"",x.visit_limit?x.visits_used+" of "+x.visit_limit+" visits used":""].filter(Boolean).map(esc).join(". ")+'</span></span></div>'}).join("")+'</div>';
  if(d.bookings&&d.bookings.length)h+='<h3>Booked in</h3><div class="hist">'+d.bookings.map(function(b){return '<div><span>'+esc(day(b.day))+" "+esc(b.time)+'</span><span>'+esc(b.name)+(b.waitlist?' <span class="pill warn">Waitlist</span>':"")+'</span></div>'}).join("")+'</div>';
  if(d.visits&&d.visits.length){h+='<h3>Visits by month</h3>'+bars(d.visits.map(function(v){return {label:MON[(v.month-1+12)%12]||v.month,vals:[v.visits]}}),[{name:"Visits",cls:""}],function(x){return x+" visits"})}
  if(d.history&&d.history.length)h+='<h3>Account</h3><div style="overflow-x:auto">'+table([["When","when"],["What","note"],["Charged","debit",1],["Paid",function(r){return r.credit||""},1],["Balance","total",1]],d.history)+'</div>';
  B.innerHTML=h+'</section>';
 });
}

/* ---------- money owed ---------- */
var COL={tab:"current",data:null,cur:null};
function loadCol(){
 get("/api/collections").then(function(d){
  if(d.error){$("#colTable").innerHTML='<div class="err">'+esc(d.error)+'</div>';return}
  COL.data=d;var t=d.totals,r=d.rules;
  $("#colTiles").innerHTML=tile(whole$(t.current_sum),t.current+" members owing")+tile(t.blocked,"Blocked at $"+r.limit)+tile(whole$(t.left_sum),t.left+" people who left owing")+tile(t.referable,"Could go to Marshall Freeman");
  var cv=d.coverage||{};$("#colNote").textContent="Balances checked in the last 2 days: "+(cv.recent||0).toLocaleString("en-NZ")+" of "+(cv.n||0).toLocaleString("en-NZ")+" members. The Core checks 20 every 15 minutes"+(cv.last?", last at "+new Date(cv.last.replace(" ","T")+"Z").toLocaleTimeString("en-NZ",{hour:"numeric",minute:"2-digit"}):"")+". Gifted time is never listed.";
  $("#colRules").textContent="Settlement offer: "+r.p1+"% of the debt up to $1,500, "+r.p2+"% above. Only debts of $"+r.refMin.toLocaleString("en-NZ")+" or more go to Marshall Freeman. Change these in Settings.";
  drawCol();
 });
}
function drawCol(){
 var d=COL.data,rows=d.rows.filter(function(x){return COL.tab==="left"?x.left:!x.left});
 $("#colTabs").innerHTML='<button class="chip'+(COL.tab==="current"?" on":"")+'" data-ct="current">Still members '+d.totals.current+'</button><button class="chip'+(COL.tab==="left"?" on":"")+'" data-ct="left">Left M2 '+d.totals.left+'</button>';
 $("#colTable").innerHTML=rows.length?table([["Name",function(x){return '<a href="#" data-col="'+x.id+'">'+esc(nm(x))+'</a>'},0,1],["Owes",function(x){return money(x.owing)},1],["Offer",function(x){return money(x.offer)},1],["Status",function(x){return x.case_status?'<span class="pill">'+esc({open:"Chasing",promised:"Promised",referred:"Marshall Freeman"}[x.case_status]||x.case_status)+'</span>':(x.blocked&&!x.left?'<span class="pill warn">Blocked</span>':"")},0,1],["Last contact",function(x){return x.last_at?day(x.last_at):""}],["Checked",function(x){return x.checked_at?day(x.checked_at):"Import"}]],rows):'<div class="ok">Nobody here. Nice.</div>';
}
$("#colTabs").addEventListener("click",function(e){var b=e.target.closest("[data-ct]");if(!b)return;COL.tab=b.dataset.ct;drawCol()});
$("#colTable").addEventListener("click",function(e){var a=e.target.closest("[data-col]");if(!a)return;e.preventDefault();e.stopPropagation();openCol(+a.dataset.col)});
function openCol(id){
 var x=COL.data.rows.find(function(r){return r.id===id});if(!x)return;COL.cur=x;
 var owner=ME.can.settings;
 $("#colPanel").innerHTML='<div style="display:flex;gap:10px;align-items:baseline;flex-wrap:wrap"><h2>'+esc(nm(x))+'</h2><a href="#" class="muted" data-member="'+x.id+'">Profile</a></div>'+
  '<div class="warnbox">Owes <b>'+money(x.owing)+'</b>. Settle for <b>'+money(x.offer)+'</b> if they pay today.</div>'+
  '<dl class="kv"><dt>Mobile</dt><dd>'+(x.mobile?'<a href="tel:'+esc(x.mobile)+'">'+esc(x.mobile)+'</a>':"None")+'</dd><dt>Email</dt><dd>'+esc(x.email||"None")+'</dd><dt>Membership</dt><dd>'+esc(x.plan||"-")+(x.left?" (left)":"")+'</dd>'+(x.next_bill?'<dt>GymMaster</dt><dd>'+esc(x.next_bill)+'</dd>':"")+(x.last_note?'<dt>Last note</dt><dd>'+esc(x.last_note)+'</dd>':"")+'</dl>'+
  '<label class="fld">Note<input id="colNote2" placeholder="What did they say?"></label>'+
  '<div class="outs"><button class="btn dark sm" data-ca="called">Called</button><button class="btn line sm" data-ca="promised">Promised to pay</button><button class="btn line sm" data-ca="settled">Settled</button>'+
  (owner&&x.can_refer?'<button class="btn line sm" data-ca="referred">Refer to Marshall Freeman</button>':"")+(owner?'<button class="btn line sm" data-ca="written_off">Write off</button>':"")+'<button class="btn line sm" data-ca="check">Check balance now</button></div><div class="err" id="colErr"></div>';
}
$("#colPanel").addEventListener("click",function(e){
 var b=e.target.closest("[data-ca]");if(!b)return;var x=COL.cur,a=b.dataset.ca;$("#colErr").textContent="";
 if(a==="check"){b.disabled=true;get("/api/members/"+x.id+"/live").then(function(r){b.disabled=false;if(r.error){$("#colErr").textContent=r.error;return}loadCol();$("#colErr").textContent="GymMaster says "+money(r.owing||0)+".";$("#colErr").style.color="var(--ink)"});return}
 var body={member_id:x.id,action:a,note:$("#colNote2").value};
 if(a==="promised"){var w=prompt("Pay by what date? (like 2026-10-20)","");if(w===null)return;body.when=w}
 if(a==="settled"){var amt=prompt("How much did they pay?",x.offer.toFixed(2));if(amt===null)return;body.amount=amt}
 if(a==="written_off"&&!confirm("Write off "+money(x.owing)+"?"))return;
 post("/api/collections",body).then(function(r){if(!r.ok){$("#colErr").textContent=r.error;return}$("#colPanel").innerHTML='<div class="ok">Saved for '+esc(nm(x))+'.</div>';loadCol()});
});

/* ---------- money (owners) ---------- */
function loadMoney(){
 get("/api/money").then(function(d){
  if(d.error){$("#monTiles").innerHTML='<div class="err">'+esc(d.error)+'</div>';return}
  var pct=d.target?Math.round(d.ytd/d.target*100):0,due=d.target?Math.round(d.target_to_date/d.target*100):0;
  $("#monGoal").innerHTML='<div style="display:flex;gap:10px;align-items:baseline;flex-wrap:wrap"><span class="eyebrow">This financial year, from '+esc(ml(d.fy))+'</span><span style="margin-left:auto;color:var(--soft);font-size:13px">'+whole$(d.ytd)+' of '+whole$(d.target)+' ('+pct+'%). On plan would be '+whole$(d.target_to_date)+' by the end of this month.</span></div><div class="goal" style="position:relative"><i style="width:'+Math.min(100,pct)+'%"></i><span style="position:absolute;top:-3px;bottom:-3px;left:'+Math.min(100,due)+'%;width:2px;background:#fff"></span></div>';
  var cash=(d.points||[]).find(function(p){return p.key==="cash"});
  $("#monTiles").innerHTML=tile(k$(d.ytd),"Income this year, excl GST")+tile(k$(d.ytd_net),"Profit this year")+tile(d.pace?k$(d.pace):"-","Year at this pace")+
   tile(whole$(d.weekly_billed),"Billed weekly by direct debit")+tile(k$(d.yearly_billed_ex_gst),"Memberships per year, excl GST")+
   (d.passport_estimate!=null?tile(whole$(d.passport_estimate),"Fitness Passport this month so far"):"")+tile(whole$(d.owed_current),"Owed by members")+(cash?tile(k$(cash.value),"Cash in the bank"):"");
  $("#monUpd").textContent=d.updated?"Xero figures from "+day(d.updated):"No Xero figures yet";
  var ms=(d.months||[]).slice(0,12).reverse();
  $("#monChart").innerHTML=ms.length?bars(ms.map(function(m){return {label:ml(m.month),vals:[m.income||0,(m.cost_of_sales||0)+(m.expenses||0),m.net||0]}}),[{name:"Income",cls:""},{name:"Costs",cls:"s1"},{name:"Profit",cls:"s2"}],whole$):'<div class="muted">Ask Claude to bring in Xero and this fills in.</div>';
  $("#monPoints").innerHTML=(d.points||[]).map(function(p){return '<dt>'+esc(p.label||p.key)+'</dt><dd><b>'+money(p.value)+'</b> <span class="muted">'+esc(day(p.as_of))+'</span></dd>'}).join("")+'<dt>Owed by people who left</dt><dd>'+money(d.owed_left)+'</dd>';
  $("#monTable").innerHTML=(d.months||[]).length?table([["Month",function(m){return MON[+m.month.slice(5,7)-1]+" "+m.month.slice(0,4)}],["Income",function(m){return whole$(m.income)},1],["Cost of sales",function(m){return whole$(m.cost_of_sales)},1],["Expenses",function(m){return whole$(m.expenses)},1],["Profit",function(m){return '<b style="color:'+((m.net||0)<0?"var(--red)":"inherit")+'">'+whole$(m.net)+'</b>'},1,1],["Margin",function(m){return m.income?Math.round((m.net||0)/m.income*100)+"%":""},1]],d.months):'<div class="muted">Nothing yet.</div>';
  var lm=(d.months||[]).find(function(m){return m.lines});
  if(lm){$("#monLinesCard").hidden=false;$("#monLinesTitle").textContent="Where the money came from and went, "+MON[+lm.month.slice(5,7)-1]+" "+lm.month.slice(0,4);
   var inc=(lm.lines.income||[]).slice().sort(function(a,b){return b[1]-a[1]}).slice(0,10),exp=(lm.lines.expenses||[]).slice().sort(function(a,b){return b[1]-a[1]}).slice(0,12);
   $("#monLines").innerHTML='<div><h3>Income</h3>'+hbars(inc,whole$)+'</div><div><h3>Biggest costs</h3>'+hbars(exp,whole$)+'</div>'}
 });
}

/* ---------- growth (owners) ---------- */
function loadGrowth(){
 get("/api/growth").then(function(d){
  if(d.error){$("#grTiles").innerHTML='<div class="err">'+esc(d.error)+'</div>';return}
  var sn=d.snaps||[],last=sn[sn.length-1]||{},ym=new Date().toISOString().slice(0,7);
  var ago=sn.filter(function(s){return s.day<=new Date(Date.now()-30*864e5).toISOString().slice(0,10)}).pop();
  var j=(d.joins.find(function(x){return x.month===ym})||{}).n||0,l=(d.leaves.find(function(x){return x.month===ym})||{}).n||0;
  var tr=d.trials.slice(-4,-1),tn=tr.reduce(function(a,x){return a+x.n},0),tj=tr.reduce(function(a,x){return a+(x.joined||0)},0);
  var perf=(d.mix.find(function(x){return x.family==="perform"})||{}).n||0;
  $("#grTiles").innerHTML=tile((last.members||0).toLocaleString("en-NZ"),"Members today")+tile(ago?((last.members-ago.members>=0?"+":"")+(last.members-ago.members)):"-","Change in 30 days")+tile(j,"Joined this month")+tile(l,"Left this month")+tile(tn?Math.round(tj/tn*100)+"%":"-","Trials who joined (3 months)")+tile(last.members?Math.round(perf/last.members*100)+"%":"-","On Perform");
  var pts=sn.map(function(s){return [day(s.day),s.members]});var note="Counted nightly";
  if(pts.length<5&&d.history&&d.history.length>1){pts=d.history.filter(function(h){return h.members}).map(function(h){return [MON[+String(h.month).slice(5,7)-1]+" "+String(h.month).slice(0,4),h.members]});note="Month-end counts from GymMaster"}
  $("#grLineNote").textContent=note;$("#grLine").innerHTML=lineChart(pts);
  var F={perform:"Perform",classes:"Classes",daily:"Daily",recovery:"Recovery",passport:"Fitness Passport",transporter:"Transporter",pass:"Visit pass",pool:"Pool",trial:"Trial",staff:"Staff",other:"Other",challenge:"Challenge"};
  $("#grMix").innerHTML=hbars(d.mix.map(function(x){return [F[x.family]||x.family,x.n]}),function(n){return n.toLocaleString("en-NZ")});
  var months={};d.joins.forEach(function(x){(months[x.month]=months[x.month]||[0,0])[0]=x.n});d.leaves.forEach(function(x){(months[x.month]=months[x.month]||[0,0])[1]=x.n});
  (d.history||[]).forEach(function(h){if(!months[h.month]&&h.joins!=null)months[h.month]=[h.joins,h.cancels||0]});
  var mk=Object.keys(months).sort().slice(-12);
  $("#grJoins").innerHTML=mk.length?bars(mk.map(function(m){return {label:ml(m),vals:months[m]}}),[{name:"Joined",cls:""},{name:"Left",cls:"s2"}]):'<div class="muted">Nothing yet.</div>';
  $("#grSources").innerHTML=hbars(d.sources.map(function(x){return [x.source,x.n]}));
  $("#grTrials").innerHTML=d.trials.length?table([["Month",function(x){return MON[+x.month.slice(5,7)-1]+" "+x.month.slice(0,4)}],["Trials","n",1],["Joined","joined",1],["Joined %",function(x){return x.n?Math.round((x.joined||0)/x.n*100)+"%":""},1]],d.trials.slice().reverse()):'<div class="muted">No trials yet.</div>';
  $("#grLeads").innerHTML=hbars(d.leads.map(function(x){return [(KIND[x.kind]||x.kind)+(x.joined?" ("+x.joined+" joined)":""),x.n]}));
 });
}

/* ---------- marketing (owners) ---------- */
function loadMkt(){
 var m=$("#mkMonth").value;
 get("/api/marketing"+(m?"?month="+m:"")).then(function(d){
  if(d.error){$("#mkTiles").innerHTML='<div class="err">'+esc(d.error)+'</div>';return}
  if(!m)$("#mkMonth").value=d.month;
  var pct=d.budget?Math.round(d.meta_spend/d.budget*100):0,ppct=d.budget?Math.round(d.projected/d.budget*100):0;
  $("#mkBudget").innerHTML='<div style="display:flex;gap:10px;align-items:baseline;flex-wrap:wrap"><span class="eyebrow">Meta budget</span><span style="margin-left:auto;color:var(--soft);font-size:13px">'+money(d.meta_spend)+' of '+whole$(d.budget)+' ('+pct+'%). Heading for '+whole$(d.projected)+' ('+ppct+'%).</span></div><div class="goal"><i style="width:'+Math.min(100,pct)+'%;'+(ppct>110?"background:#FFB27A":"")+'"></i></div>';
  var sess=(d.web||[]).reduce(function(a,w){return a+(w.sessions||0)},0),conv=(d.web||[]).reduce(function(a,w){return a+(w.conversions||0)},0);
  $("#mkTiles").innerHTML=tile(whole$(d.all_spend),"Ad spend")+tile(d.platform_leads,"Leads Meta counted")+tile(d.cpl!=null?money(d.cpl):"-","Cost per lead")+tile(d.social_leads,"Leads in the Core from Instagram and Facebook")+tile(d.social_joins,"Joined from Instagram and Facebook")+tile(d.cost_per_join!=null?whole$(d.cost_per_join):"-","Meta spend per member who joined")+tile(sess.toLocaleString("en-NZ"),"Website visits")+tile(conv.toLocaleString("en-NZ"),"Website conversions");
  $("#mkNote").textContent=d.data_to?"Ad figures up to "+day(d.data_to)+". Joins count members whose Came from says Instagram or Facebook, so recording it at sign-up matters.":"No ad figures yet. Ask Claude to bring in Meta and Google Analytics.";
  $("#mkDaily").innerHTML=d.daily.length?bars(d.daily.map(function(x){return {label:String(+x.day.slice(8)),vals:[x.spend]}}),[{name:"Spend",cls:""}],money):'<div class="muted">Nothing this month yet.</div>';
  $("#mkTrend").innerHTML=d.trend.length?bars(d.trend.map(function(x){return {label:ml(x.month),vals:[x.spend,x.joins*100]}}),[{name:"Spend",cls:""},{name:"Joins from social (x100)",cls:"s2"}],function(v){return v}):'<div class="muted">Nothing yet.</div>';
  $("#mkCamps").innerHTML=d.campaigns.length?table([["Campaign","campaign"],["Where","source"],["Spend",function(x){return money(x.spend)},1],["Seen by",function(x){return (x.impressions||0).toLocaleString("en-NZ")},1],["Clicks",function(x){return (x.clicks||0).toLocaleString("en-NZ")},1],["Leads",function(x){return x.leads||0},1],["Per lead",function(x){return x.leads?money(x.spend/x.leads):"-"},1]],d.campaigns):'<div class="muted">No campaigns this month yet.</div>';
  $("#mkJoins").innerHTML=hbars(d.joins.map(function(x){return [x.source,x.n]}));
  $("#mkWeb").innerHTML=d.web.length?table([["Channel","channel"],["Visits",function(x){return (x.sessions||0).toLocaleString("en-NZ")},1],["Conversions",function(x){return x.conversions||0},1]],d.web):'<div class="muted">No website figures yet.</div>';
  $("#mkLeads").innerHTML=hbars(d.core_leads.map(function(x){return [x.source+(x.joined?" ("+x.joined+" joined)":""),x.n]}));
 });
}
$("#mkMonth").addEventListener("change",loadMkt);

/* ---------- settings ---------- */
var FAMS={perform:"Perform",classes:"Classes",daily:"Daily",recovery:"Recovery",transporter:"Transporter",passport:"Fitness Passport",pass:"Visit pass",pool:"Pool",trial:"Trial",challenge:"Challenge",staff:"Staff",other:"Other"};
function loadSettings(){
 get("/api/settings").then(function(d){
  if(d.error){$("#setRules").innerHTML='<div class="err">'+esc(d.error)+'</div>';return}
  var g="";$("#setRules").innerHTML=d.settings.map(function(s){var h=(s.group!==g?'<div class="eyebrow" style="margin-top:14px">'+esc(s.group)+'</div>':"");g=s.group;
   return h+'<div class="person" data-set="'+esc(s.key)+'"><label class="fld">'+esc(s.label)+'<input class="setIn" value="'+esc(s.value)+'"'+(s.type==="tiers"?"":' inputmode="decimal"')+'></label><div style="display:flex;gap:8px;align-items:center"><button class="btn dark sm" data-setsave="1">Save</button><span class="muted setMsg"></span></div></div>'}).join("");
  $("#setClub").innerHTML=[["Name",d.club.name],["Address",d.club.address],["Phone",d.club.phone],["Email",d.club.email],["Hours",d.club.hours]].map(function(x){return '<dt>'+esc(x[0])+'</dt><dd>'+esc(x[1])+'</dd>'}).join("");
  $("#setInt").innerHTML=d.integrations.map(function(i){var good=/^(Connected|Set up|Cloudflare|Pushed)/.test(i.status);return '<div class="person"><div class="top"><b>'+esc(i.name)+'</b> <span class="pill'+(good?" ok":" warn")+'">'+esc(i.status)+'</span></div><div class="muted">'+esc(i.detail)+'</div></div>'}).join("");
  $("#setSync").innerHTML=d.sync.map(function(x){return '<div><span>'+esc(day(x.finished_at))+'</span><span>'+esc(x.source==="gymmaster_csv"?"Import from GymMaster":x.source==="gymmaster_members"?"Nightly GymMaster copy":x.source)+' '+(x.ok?'<span class="pill ok">OK, '+(x.rows_changed||0)+' rows</span>':'<span class="pill warn">'+esc(x.error||"Failed")+'</span>')+'</span></div>'}).join("")||'<p class="muted" style="margin:0">Nothing yet.</p>';
  $("#setPlans").innerHTML='<table class="tbl"><thead><tr><th>GymMaster type</th><th>Category</th><th>Counts as</th><th>Billing</th><th>Members</th><th></th></tr></thead><tbody>'+d.plans.map(function(p){return '<tr><td>'+esc(p.name)+'</td><td>'+esc(p.category||"")+'</td><td>'+esc(FAMS[p.family]||p.family)+(p.flexi?", Flexi":"")+(p.corporate?", Corporate"+(p.employer?" ("+esc(p.employer)+")":""):"")+'</td><td>'+esc(p.frequency||"")+'</td><td>'+p.members+'</td><td>'+(p.legacy?'<span class="pill">Existing only</span>':"")+'</td></tr>'}).join("")+'</tbody></table>';
 });
}
$("#setRules").addEventListener("click",function(e){var b=e.target.closest("[data-setsave]");if(!b)return;var box=b.closest("[data-set]"),m=box.querySelector(".setMsg");
 post("/api/settings",{key:box.dataset.set,value:box.querySelector(".setIn").value}).then(function(r){if(!r.ok){m.textContent=r.error;m.style.color="var(--red)";return}box.querySelector(".setIn").value=r.value;m.style.color="";m.textContent="Saved"})});

/* ---------- staff and access ---------- */
var ROLE_N={owner:"Owner",manager:"Manager",reception:"Reception",trainer:"Trainer",coach:"Coach"};
function loadStaff(){
 get("/api/staff-admin").then(function(d){
  if(d.error){$("#staffList").innerHTML='<div class="err">'+esc(d.error)+'</div>';return}
  $("#staffList").innerHTML=d.staff.map(function(s){return '<div class="r" data-st="'+esc(JSON.stringify(s))+'" style="cursor:pointer'+(s.active?"":";opacity:.5")+'"><span><b>'+esc(s.name)+'</b> <span class="muted">'+esc(s.email)+'</span></span><span class="pill'+(s.role==="owner"?" dark":"")+'">'+esc(ROLE_N[s.role]||s.role)+(s.active?"":", off")+'</span></div>'}).join("");
 });
}
function stFill(s){s=s||{};$("#stId").value=s.id||"";$("#stName").value=s.name||"";$("#stEmail").value=s.email||"";$("#stRole").value=s.role||"reception";$("#stOrder").value=s.list_order==null?100:s.list_order;$("#stActive").checked=s.active!==0;$("#stTitle").textContent=s.id?"Edit "+s.name:"Add someone";$("#stErr").textContent="";$("#stOk").innerHTML=""}
$("#staffList").addEventListener("click",function(e){var r=e.target.closest("[data-st]");if(r)stFill(JSON.parse(r.dataset.st))});
$("#stNew").addEventListener("click",function(){stFill(null)});
$("#stSave").addEventListener("click",function(){
 $("#stErr").textContent="";
 post("/api/staff-admin",{id:$("#stId").value||null,name:$("#stName").value,email:$("#stEmail").value,role:$("#stRole").value,list_order:$("#stOrder").value,active:$("#stActive").checked}).then(function(r){
  if(!r.ok){$("#stErr").textContent=r.error;return}
  var msg='<div class="ok">Saved.'+(r.outsideDomain?" This email isn't @m2club.co.nz, so also add it to the m2-core sign-in rule in Cloudflare.":" They can sign in now with their email and a code.")+'</div>';
  loadStaff();if(!$("#stId").value)stFill(null);$("#stOk").innerHTML=msg;
 });
});

/* ---------- import from GymMaster ---------- */
// Same rules as scripts/import_gymmaster_csv.py, run in the browser so the file goes
// straight from this computer into the Core.
function parseCSV(t){
 t=t.replace(/^﻿/,"");var rows=[],row=[],f="",q=false;
 for(var i=0;i<t.length;i++){var c=t[i];
  if(q){if(c==='"'){if(t[i+1]==='"'){f+='"';i++}else q=false}else f+=c}
  else if(c==='"')q=true;else if(c===","){row.push(f);f=""}else if(c==="\n"||c==="\r"){if(c==="\r"&&t[i+1]==="\n")i++;row.push(f);f="";if(row.length>1||row[0]!=="")rows.push(row);row=[]}else f+=c}
 if(f!==""||row.length){row.push(f);rows.push(row)}
 var h=rows.shift()||[];return rows.map(function(r){var o={};h.forEach(function(k,j){o[k.trim()]=(r[j]||"").trim()});return o});
}
function impNum(v){var n=parseFloat(String(v||"").replace(/[^0-9.\-]/g,""));return isNaN(n)?null:n}
function impMobile(v){var d=String(v||"").replace(/\D/g,"");if(d.indexOf("64")===0)d="0"+d.slice(2);else if(d.charAt(0)==="2"&&d.length>=8&&d.length<=10)d="0"+d;return d||null}
function impPassport(last){last=String(last||"").trim();var m=last.match(/^(.*?)[\s-]*\(?\s*(?:FP|ID:?)?\s*(\d{6,8})\s*\)?\s*$/i);if(!m)return[last,null];return[m[1].replace(/^[\s-]+|[\s-]+$/g,"")||null,m[2]]}
var EMPLOYERS=["woods","smartfit","hectre","bnb group","red bull","msd","auckland council"];
function impClassify(name,cat,pd){
 var n=String(name||"").toLowerCase().replace(/\s+/g," "),c=String(cat||"").toLowerCase(),d=String(pd||"").toLowerCase(),fam="other";
 if(n.indexOf("fitness passport")>=0)fam="passport";
 else if(n.indexOf("trip pass")>=0||n.indexOf("group fitness pass")>=0)fam="pass";
 else if(n.indexOf("trial")>=0||n.indexOf("day pass")>=0||n.indexOf("hour pass")>=0||/days (for|on us)|days\. \d|free class|bring a friend/.test(n))fam="trial";
 else if(c.indexOf("challenge")>=0||/\b\d?wc\b/.test(n))fam="challenge";
 else if(n==="staff"||n==="personal trainer rent"||c.indexOf("staff")>=0)fam="staff";
 else if(n.indexOf("transporter")>=0||n.indexOf("transpoter")>=0)fam="transporter";
 else if(n.indexOf("swimming pool")>=0)fam="pool";
 else if(n.indexOf("recovery")>=0)fam="recovery";
 else if(n.indexOf("perform")>=0||n.indexOf("gateway")>=0)fam="perform";
 else if(n.indexOf("classes")>=0||n.indexOf("group fitness")>=0)fam="classes";
 else if(n.indexOf("daily")>=0||n.indexOf("entry")>=0)fam="daily";
 var p={family:fam,flexi:n.indexOf("flexi")>=0?1:0,frequency:null};
 p.includes_classes=["perform","classes","transporter","passport","pass","trial"].indexOf(fam)>=0?1:0;
 p.includes_recovery=["perform","recovery","transporter","pass","trial"].indexOf(fam)>=0?1:0;
 p.paid_in_full=(/paid in full|pif|lifetime/.test(n)||(d.indexOf("fixed term")>=0&&fam!=="pass"&&fam!=="trial"))?1:0;
 if(fam==="passport")p.frequency="yearly";else if(p.paid_in_full||fam==="pass")p.frequency="upfront";
 else{var F=[["fortnightly",["fortnight","fornight"]],["monthly",["month"]],["quarterly",["quarter"]],["weekly",["week"]]];
  for(var i=0;i<F.length;i++){if(F[i][1].some(function(k){return n.indexOf(k)>=0||d.indexOf(k)>=0})){p.frequency=F[i][0];break}}}
 var emp=EMPLOYERS.filter(function(e){return n.indexOf(e)>=0})[0]||null;
 p.corporate=(c.indexOf("corporate")>=0||emp||n.indexOf("% off")>=0||n.indexOf("student")>=0)?1:0;
 p.employer=emp?emp.replace(/\b\w/g,function(x){return x.toUpperCase()}):null;
 p.student=n.indexOf("student")>=0?1:0;
 p.legacy=(["old","old corporate memberships","discontinued","promotions"].indexOf(c)>=0||/^(entry|flexi - entry|flexi - gateway|gateway)/.test(n)||n.indexOf("transpoter")>=0)?1:0;
 return p;
}
var IMP={cur:null,hist:null};
function impRead(input,key){var f=input.files&&input.files[0];if(!f){IMP[key]=null;impSummary();return}
 var r=new FileReader();r.onload=function(){try{IMP[key]=parseCSV(String(r.result))}catch(e){IMP[key]=null;$("#impErr").textContent="Couldn't read "+f.name}impSummary()};r.readAsText(f)}
function impSummary(){
 var c=IMP.cur,h=IMP.hist;$("#impErr").textContent="";
 if(c&&c.length&&!("Member ID" in c[0])){$("#impErr").textContent="That file isn't a GymMaster Current Memberships export (no Member ID column).";$("#impGo").disabled=true;return}
 var fp=c&&c.length&&("Fitness Passport ID" in c[0]);
 $("#impSum").textContent=c?(c.length+" rows of current members"+(fp?", with Fitness Passport IDs":", no Fitness Passport ID column")+(h?". "+h.length+" rows of history.":".")):"";
 $("#impGo").disabled=!(c&&c.length);
}
$("#impCur").addEventListener("change",function(e){impRead(e.target,"cur")});
$("#impHist").addEventListener("change",function(e){impRead(e.target,"hist")});
function impBuild(){
 var cur=IMP.cur,hist=IMP.hist||[],plans={},planRows=[],members=[],mships=[],billing=[],flags=[],trials=[],seen={},fpCol=cur.length&&("Fitness Passport ID" in cur[0]);
 cur.concat(hist).forEach(function(r){var k=(r["Membership Type Name"]||"")+"\u0001"+(r["Membership Type Category Name"]||"");
  if(!plans[k]){var p=impClassify(r["Membership Type Name"],r["Membership Type Category Name"],r["Price Description"]);plans[k]=p;
   planRows.push([r["Membership Type Name"]||"",r["Membership Type Category Name"]||"",p.family,p.frequency,p.flexi,p.paid_in_full,p.corporate,p.employer,p.student,p.legacy,p.includes_classes,p.includes_recovery])}});
 var WK={weekly:1,fortnightly:2,monthly:52/12,quarterly:13};
 cur.forEach(function(r){var id=parseInt(r["Member ID"],10);if(!id||seen[id])return;seen[id]=1;
  var k=(r["Membership Type Name"]||"")+"\u0001"+(r["Membership Type Category Name"]||""),p=plans[k];
  var sp=impPassport(r["Member Last Name"]),first=(r["Member First Name"]||"").trim(),last=sp[0];
  if(!last&&first.indexOf(" ")>0){last=first.slice(first.lastIndexOf(" ")+1);first=first.slice(0,first.lastIndexOf(" "))}
  var fpd=fpCol?String(r["Fitness Passport ID"]||"").replace(/\D/g,""):"";var fp=(fpd.length>=5&&fpd.length<=12)?fpd:null;
  var price=impNum(r["Membership Type Price"]),wv=(price!=null&&WK[p.frequency])?Math.round(price/WK[p.frequency]*100)/100:null;
  var pd=String(r["Price Description"]||"").toLowerCase(),by=p.family==="passport"?"passport":(pd.indexOf("in person")>=0?"in_person":"ezidebit");
  members.push([id,id,first||"Unknown",last||null,sp[1],fp,fp?1:0,(r["Member Email"]||"").toLowerCase()||null,impMobile(r["Member Cell"]),r["Member Gender"]||null,r["Member Source Promotion"]||null,r["Membership Start Date"]||null,parseInt(r["Member Total Visit"],10)||0]);
  mships.push([id,price,wv,r["Membership Start Date"]||null,r["Membership Minimum Term End Date"]||null,r["Membership End Date"]||null,by,r["Member Billing Comment"]||null,r["Discount Code Used"]||null,r["Sales Rep"]||null,r["Membership Type Name"]||"",r["Membership Type Category Name"]||""]);
  if(by==="ezidebit")billing.push([id]);
  if(p.family==="passport")flags.push([id,"passport",null]);
  if(p.corporate)flags.push([id,"corporate",p.employer]);
  if(p.student)flags.push([id,"student",null]);
 });
 hist.forEach(function(r){if((r["Membership Type Category Name"]||"")!=="Trials & Limited Passes")return;if(String(r["Membership Type Name"]||"").toLowerCase().indexOf("trip pass")>=0)return;
  var id=parseInt(r["Member ID"],10),here=!!seen[id];
  trials.push([here?id:null,((r["Member First Name"]||"")+" "+(r["Member Last Name"]||"")).trim(),(r["Member Email"]||"").toLowerCase()||null,impMobile(r["Member Cell"]),r["Member Source Promotion"]||null,here?"joined":"lost",r["Membership Start Date"]||null])});
 return {fpCol:fpCol,parts:[["plans",planRows],["members",members],["memberships",mships],["billing",billing],["flags",flags],["trials",trials]]};
}
$("#impGo").addEventListener("click",function(){
 var b=$("#impGo");b.disabled=true;$("#impErr").textContent="";$("#impDone").innerHTML="";
 var data;try{data=impBuild()}catch(e){$("#impErr").textContent="Couldn't read the file: "+e.message;b.disabled=false;return}
 var total=data.parts.reduce(function(a,p){return a+p[1].length},0),sent=0,log=null;
 function fail(m){$("#impErr").textContent=m+" Nothing is broken: fix it and press Import again.";b.disabled=false}
 post("/api/import",{step:"start",history:!!IMP.hist}).then(function(r){if(!r.ok)return fail(r.error||"Couldn't start.");log=r.log;
  var queue=[];data.parts.forEach(function(p){for(var i=0;i<p[1].length;i+=150)queue.push([p[0],p[1].slice(i,i+150)])});
  (function next(){
   if(!queue.length){post("/api/import",{step:"finish",log:log,rowsIn:IMP.cur.length+(IMP.hist?IMP.hist.length:0),rowsChanged:sent,fpLoaded:data.fpCol}).then(function(f){
     $("#impProg").textContent="";b.disabled=false;
     $("#impDone").innerHTML='<div class="ok">Done. '+(f.members||0).toLocaleString("en-NZ")+' current members in the Core.</div>'+data.parts.map(function(p){return '<div class="r"><span>'+esc(p[0])+'</span><span class="pill">'+p[1].length.toLocaleString("en-NZ")+'</span></div>'}).join("")});return}
   var q=queue.shift();
   post("/api/import",{step:"rows",table:q[0],rows:q[1]}).then(function(r){if(!r.ok)return fail(r.error||"A batch failed.");sent+=q[1].length;$("#impProg").textContent="Importing... "+Math.round(sent/total*100)+"%";next()}).catch(function(e){fail(String(e))});
  })();
 }).catch(function(e){fail(String(e))});
});

/* ---------- fitness passport ---------- */
function loadPassport(){
 var mi=$("#fpMonth");if(!mi.value){var n=new Date();mi.value=n.getFullYear()+"-"+String(n.getMonth()+1).padStart(2,"0")}
 $("#fpCsv").href="/api/passport.csv?month="+mi.value;
 get("/api/passport?month="+mi.value).then(function(d){
  if(d.error){$("#fpRows").innerHTML='<div class="err">'+esc(d.error)+'</div>';return}
  var t=[["Passport visits",d.visits.toLocaleString("en-NZ")],["Members who trained",d.members_visiting],["Visits with no Passport ID",d.visits_no_id],
   ["Passport members",d.passport_members.toLocaleString("en-NZ")],["Missing a Passport ID",d.members_no_id==null?"Not known yet":d.members_no_id],["ID not in GymMaster yet",d.members_not_in_gm]];
  if(d.money){t.unshift(["Estimated payout",money(d.money.total)],["Rate per visit now",money(d.money.rate)],["Visits to the next rate",d.money.visits_to_next_tier==null?"Top rate":d.money.visits_to_next_tier]);if(d.money.at_risk)t.push(["Lost to missing IDs",money(d.money.at_risk)])}
  $("#fpTiles").innerHTML=t.map(function(x){return '<div class="tile"><div class="n">'+esc(x[1])+'</div><div class="l">'+esc(x[0])+'</div></div>'}).join("");
  $("#fpNote").textContent=(d.ids_loaded?"":"Passport IDs from GymMaster aren't loaded yet. Add the Fitness Passport ID column to the GymMaster member export and import it. ")+
   "GymMaster reports each Passport check-in to Fitness Passport. This page is M2's own check"+(d.money?". Payout is an estimate from the tier rates, paid the month after.":".");
  var more=function(n,shown){return n>shown?'<div class="muted" style="padding:6px">'+(n-shown)+' more. Download the CSV for the full list.</div>':""};
  $("#fpNoId").innerHTML=d.no_id.slice(0,30).map(function(r,i){return '<div class="person" data-i="'+i+'"><div class="top"><a href="#" data-member="'+r.member_id+'"><b>'+esc(nm(r))+'</b></a> <span class="pill warn">'+r.visits+' visits</span></div><div style="display:flex;gap:8px;flex-wrap:wrap"><label class="sr" for="fpn'+i+'">Fitness Passport ID</label><input id="fpn'+i+'" class="fpIn" inputmode="numeric" placeholder="Fitness Passport ID" style="flex:1;min-width:160px;height:40px;border:1px solid var(--line);border-radius:12px;padding:0 12px"><button class="btn dark sm" data-fpadd="'+r.member_id+'">Save ID</button></div></div>'}).join("")+more(d.no_id.length,30)||'<div class="ok">Every Passport visit this month has an ID.</div>';
  $("#fpDupCard").hidden=!d.duplicate_ids.length;
  $("#fpDup").innerHTML=d.duplicate_ids.map(function(x){return '<div class="r"><span><b>'+esc(x.fp_id)+'</b> <span class="muted">'+esc(x.names)+'</span></span><span class="pill warn">'+x.n+' people</span></div>'}).join("");
  $("#fpRows").innerHTML=d.rows.slice(0,40).map(function(r){return '<div class="r" data-member="'+r.member_id+'"><span><b>'+esc(nm(r))+'</b> <span class="muted">'+(r.fp_id?esc(r.fp_id):"No ID")+'</span></span><span class="pill'+(r.fp_id?"":" warn")+'">'+r.visits+'</span></div>'}).join("")+more(d.rows.length,40)||'<div class="muted">No Passport visits recorded for this month yet. Visits arrive once the Core copies check-ins from GymMaster or the M2 App opens the doors.</div>';
 });
}
$("#fpMonth").addEventListener("change",loadPassport);
$("#fpNoId").addEventListener("click",function(e){
 var b=e.target.closest("[data-fpadd]");if(!b)return;e.stopPropagation();
 var box=b.closest(".person");
 post("/api/members/"+b.dataset.fpadd+"/details",{fp_id:box.querySelector(".fpIn").value}).then(function(r){
  if(!r.ok){alertIn(box,r.error);return}loadPassport();
 });
});

/* ---------- add member ---------- */
var PL=null,pick={fam:"perform",freq:"weekly"},sel=null,mate=null,newId=null;
var FAMN={perform:"Perform",classes:"Classes",daily:"Daily",recovery:"Recovery",trial:"Trial or pass",passport:"Fitness Passport"};
var FREQN={weekly:"Weekly",fortnightly:"Fortnightly",monthly:"Monthly",quarterly:"Quarterly",upfront:"Paid upfront"};
function startAdd(){
 $("#a1").hidden=false;$("#a2").hidden=true;$("#aErr").textContent="";$("#aAnyway").hidden=true;
 if(!PL)get("/api/plans").then(function(d){
  if(d.error){$("#plans").innerHTML='<div class="err">'+esc(d.error)+'</div>';return}
  PL=d.plans;fillSelect($("#goal"),d.goals,"");fillSelect($("#source"),d.sources,"");drawPlans();
 });
 setTimeout(sizeSig,50);
}
function drawPlans(){
 var fams=[];PL.forEach(function(p){if(fams.indexOf(p.family)<0)fams.push(p.family)});
 $("#fam").innerHTML=fams.map(function(f){return '<button type="button" class="chip'+(f===pick.fam?" on":"")+'" data-f="'+f+'">'+FAMN[f]+'</button>'}).join("");
 var freqs=[];PL.filter(function(p){return p.family===pick.fam}).forEach(function(p){if(freqs.indexOf(p.frequency)<0)freqs.push(p.frequency)});
 if(freqs.indexOf(pick.freq)<0)pick.freq=freqs[0];
 $("#freq").innerHTML=(pick.fam==="trial"||pick.fam==="passport")?"":freqs.map(function(f){return '<button type="button" class="chip'+(f===pick.freq?" on":"")+'" data-q="'+f+'">'+FREQN[f]+'</button>'}).join("");
 var fx=$("#flexi").checked;
 var list=PL.filter(function(p){return p.family===pick.fam&&(pick.fam==="trial"||pick.fam==="passport"||(p.frequency===pick.freq&&(p.frequency==="upfront"||p.frequency==="quarterly"||p.flexi===fx)))});
 $("#plans").innerHTML=list.map(function(p){return '<button type="button" class="plan'+(sel&&sel.id===p.id?" on":"")+'" data-p="'+p.id+'"><b>'+esc(p.name)+'</b><span>'+esc(p.price+" "+(p.priceDescription||""))+(p.signupFee?", joining fee $"+p.signupFee:"")+'</span></button>'}).join("")||'<div class="muted">Nothing for that combination.</div>';
}
$("#fam").addEventListener("click",function(e){var b=e.target.closest("[data-f]");if(!b)return;pick.fam=b.dataset.f;sel=null;if(pick.fam==="passport"){$("#passport").checked=true}fpToggle();drawPlans()});
function fpToggle(){var on=$("#passport").checked||pick.fam==="passport";$("#fpWrap").hidden=!on;$("#mateWrap").hidden=on;if(on){mate=null;$("#mateSel").textContent=""}}
$("#freq").addEventListener("click",function(e){var b=e.target.closest("[data-q]");if(!b)return;pick.freq=b.dataset.q;sel=null;drawPlans()});
$("#flexi").addEventListener("change",function(){sel=null;drawPlans()});
$("#plans").addEventListener("click",function(e){var b=e.target.closest("[data-p]");if(!b)return;sel=PL.find(function(p){return p.id===+b.dataset.p});drawPlans()});
$("#passport").addEventListener("change",fpToggle);
var mt;$("#mate").addEventListener("input",function(e){clearTimeout(mt);mt=setTimeout(function(){
 if(e.target.value.length<2){$("#mateRes").innerHTML="";return}
 get("/api/members?q="+encodeURIComponent(e.target.value)).then(function(d){$("#mateRes").innerHTML=(d.results||[]).slice(0,6).map(function(m){return '<div class="r" data-m="'+m.id+'" data-n="'+esc(nm(m))+'"><span>'+esc(nm(m))+'</span><span class="pill">'+esc(m.family||"")+'</span></div>'}).join("")});
},250)});
$("#mateRes").addEventListener("click",function(e){var r=e.target.closest("[data-m]");if(!r)return;e.stopPropagation();mate=+r.dataset.m;$("#mateSel").textContent="Brought by "+r.dataset.n+". Both get 4 weeks free.";$("#mateRes").innerHTML="";$("#mate").value=""});
var cv=$("#sig"),cx=cv.getContext("2d"),drawing=false,signed=false;
function sizeSig(){var r=cv.getBoundingClientRect();if(!r.width)return;cv.width=r.width*2;cv.height=r.height*2;cx.setTransform(2,0,0,2,0,0);cx.lineWidth=2;cx.lineCap="round";cx.strokeStyle="#0A0A0A";signed=false}
window.addEventListener("resize",function(){if(VIEW==="add"&&!signed)sizeSig()});
function pt(e){var r=cv.getBoundingClientRect();return[e.clientX-r.left,e.clientY-r.top]}
cv.addEventListener("pointerdown",function(e){drawing=true;cv.setPointerCapture(e.pointerId);var p=pt(e);cx.beginPath();cx.moveTo(p[0],p[1])});
cv.addEventListener("pointermove",function(e){if(!drawing)return;var p=pt(e);cx.lineTo(p[0],p[1]);cx.stroke();signed=true});
cv.addEventListener("pointerup",function(){drawing=false});
$("#sigClear").addEventListener("click",sizeSig);
function saveMember(force){
 $("#aErr").textContent="";$("#aAnyway").hidden=true;
 if(!sel){$("#aErr").textContent="Pick a membership first.";return}
 if(!signed){$("#aErr").textContent="They need to sign first.";return}
 if(!PHOTO&&!$("#aNoPhoto").checked){$("#aErr").textContent="Take their photo, or tick \"Not today\".";return}
 if(($("#passport").checked||sel.family==="passport")&&!$("#fpid").value.trim()){$("#aErr").textContent="Add their Fitness Passport ID. Passport can't pay us for their visits without it.";$("#fpid").focus();return}
 var body={planId:sel.id,planName:sel.name,first:$("#first").value,last:$("#last").value,email:$("#email").value,mobile:$("#mobile").value,dob:$("#dob").value,gender:$("#gender").value,goal:$("#goal").value,source:$("#source").value,emergencyName:$("#ename").value,emergencyPhone:$("#ephone").value,passport:$("#passport").checked||sel.family==="passport",fpId:$("#fpid").value,referredBy:mate,agreed:$("#agreed").checked,signature:cv.toDataURL("image/png"),confirmDuplicate:!!force};
 $("#aSave").disabled=true;$("#aSave").textContent="Adding...";
 post("/api/members",body).then(function(d){
  $("#aSave").disabled=false;$("#aSave").textContent="Add member";
  if(!d.ok){$("#aErr").textContent=d.error||"Something went wrong.";if(d.canOverride)$("#aAnyway").hidden=false;return}
  newId=d.id;$("#a1").hidden=true;$("#a2").hidden=false;window.scrollTo(0,0);
  if(PHOTO)post("/api/members/"+newId+"/photo",{jpeg:PHOTO}).then(function(r){if(!r.ok)$("#aDone").insertAdjacentHTML("beforeend",'<br><span class="err">Photo not saved: '+esc(r.error)+'. Take it again from their profile.</span>')});
  $("#aDone").innerHTML="<b>"+esc(body.first+" "+body.last)+"</b> is in, on "+esc(sel.name)+"."+(d.warnings&&d.warnings.length?"<br>"+d.warnings.map(esc).join("<br>"):"");
  $("#fpGm").hidden=!d.fpId;$("#fpGmOk").innerHTML="";$("#fpGmDone").hidden=false;
  if(d.fpId){$("#fpGmId").textContent=d.fpId;$("#fpGmOpen").href=d.gymmasterUrl}
  $("#billCard").hidden=!d.needsBilling;
  if(!d.needsBilling){$("#billNote").textContent="No bank details needed for this one.";$("#billOpen").hidden=true;$("#billDone").checked=true}
  else get("/api/members/"+newId+"/billing-link").then(function(bl){
   $("#billNote").textContent=bl.note||bl.error||"";$("#billOpen").hidden=!bl.url;$("#billOpen").dataset.url=bl.url||"";
   if(bl.mode==="ezidebit"&&window.QRCode){$("#qr").hidden=false;$("#qr").innerHTML="";new QRCode($("#qr"),{text:bl.url,width:120,height:120})}
  });
  setTimeout(function(){$("#tag").focus()},150);
 }).catch(function(e){$("#aSave").disabled=false;$("#aSave").textContent="Add member";$("#aErr").textContent=String(e)});
}
$("#aSave").addEventListener("click",function(){saveMember(false)});
$("#aAnyway").addEventListener("click",function(){saveMember(true)});
$("#fpGmDone").addEventListener("click",function(){
 post("/api/jobs",{kind:"fp_id_gm",outcome:"fp_in_gm",member_id:newId}).then(function(r){
  if(!r.ok){$("#fpGmOk").innerHTML='<div class="err">'+esc(r.error)+'</div>';return}
  $("#fpGmOk").innerHTML='<div class="ok">Thanks. Passport will be paid for their visits.</div>';$("#fpGmDone").hidden=true;
 });
});
$("#billOpen").addEventListener("click",function(e){var u=e.currentTarget.dataset.url;if(u)window.open(u,"m2billing","width=900,height=900")});
function saveTag(){
 $("#tagErr").textContent="";var t=$("#tag").value.trim();if(!t)return;
 post("/api/members/"+newId+"/key-tag",{tag:t}).then(function(d){
  if(!d.ok){$("#tagErr").textContent=d.error;$("#tag").select();return}
  $("#tagOk").innerHTML='<div class="ok">Tag '+esc(d.tag)+' saved. '+esc(d.note||"")+' <a href="'+esc(d.gymmasterUrl)+'" target="_blank" rel="noopener">Open in GymMaster</a></div>';
 });
}
$("#tag").addEventListener("keydown",function(e){if(e.key==="Enter"){e.preventDefault();saveTag()}});
$("#tag").addEventListener("change",saveTag);
$("#aFinish").addEventListener("click",function(){
 $("#finErr").textContent="";
 if(newId&&$("#billDone").checked&&!$("#billOpen").hidden)post("/api/jobs",{kind:"missing_billing",outcome:"billing_in",member_id:newId});
 if(newId&&!$("#billDone").checked&&!$("#billOpen").hidden&&!$("#finErr").dataset.warned){$("#finErr").textContent="Bank details aren't ticked off. They'll stay on Today until they are. Press Done again to finish.";$("#finErr").dataset.warned="1";return}
 resetAdd();show("today");
});
$("#aProfile").addEventListener("click",function(){var id=newId;resetAdd();openMember(id)});
function resetAdd(){
 ["#first","#last","#email","#mobile","#dob","#ename","#ephone","#tag","#mate"].forEach(function(s){$(s).value=""});
 $("#goal").value="";$("#source").value="";$("#gender").value="";$("#passport").checked=false;$("#fpid").value="";PHOTO=null;$("#aFace").innerHTML="?";$("#aPhotoBtn").textContent="Take photo";$("#aNoPhoto").checked=false;$("#fpWrap").hidden=true;$("#fpGm").hidden=true;$("#billCard").hidden=false;$("#billOpen").hidden=false;$("#agreed").checked=false;$("#billDone").checked=false;$("#mateWrap").hidden=false;
 $("#tagOk").innerHTML="";$("#mateSel").textContent="";$("#qr").hidden=true;$("#finErr").dataset.warned="";sel=null;mate=null;newId=null;if(PL)drawPlans();sizeSig();
}
</script></body></html>`;

// schema_sql.js (bundled)
// Generated by scripts/gen_schema.py from schema.sql and seed_staff.sql. Do not edit by hand.
const SCHEMA = [
"PRAGMA foreign_keys = ON;",
"CREATE TABLE IF NOT EXISTS members (\n  id              INTEGER PRIMARY KEY,         \n  gm_id           INTEGER UNIQUE,              \n  first_name      TEXT NOT NULL,\n  last_name       TEXT,\n  preferred_name  TEXT,\n  email           TEXT,\n  mobile          TEXT,                        \n  dob             TEXT,\n  gender          TEXT,\n  suburb          TEXT,\n  photo_url       TEXT,\n  emergency_name  TEXT,\n  emergency_phone TEXT,\n  goal            TEXT,                        \n  lead_source     TEXT,                        \n  lead_campaign   TEXT,                        \n  referred_by     INTEGER REFERENCES members(id),\n  trainer_id      INTEGER REFERENCES staff(id),\n  key_tag         TEXT,\n  passport_number TEXT,                        \n  fp_id           TEXT,                        \n  fp_id_in_gm     INTEGER NOT NULL DEFAULT 0,  \n  status          TEXT NOT NULL DEFAULT 'active',  \n  joined_on       TEXT,\n  total_visits_gm INTEGER DEFAULT 0,            \n  marketing_email INTEGER DEFAULT 1,\n  marketing_sms   INTEGER DEFAULT 0,\n  app_installed   INTEGER DEFAULT 0,\n  terms_signed_on TEXT,\n  created_at      TEXT NOT NULL DEFAULT (datetime('now')),\n  updated_at      TEXT NOT NULL DEFAULT (datetime('now'))\n);",
"CREATE INDEX IF NOT EXISTS members_email  ON members(email);",
"CREATE INDEX IF NOT EXISTS members_mobile ON members(mobile);",
"CREATE INDEX IF NOT EXISTS members_status ON members(status);",
"CREATE UNIQUE INDEX IF NOT EXISTS members_key_tag ON members(key_tag) WHERE key_tag IS NOT NULL;",
"CREATE INDEX IF NOT EXISTS members_fp_id ON members(fp_id);",
"CREATE TABLE IF NOT EXISTS key_tags (\n  id           INTEGER PRIMARY KEY,\n  tag          TEXT NOT NULL,\n  member_id    INTEGER NOT NULL REFERENCES members(id),\n  status       TEXT NOT NULL DEFAULT 'active',  \n  assigned_at  TEXT NOT NULL DEFAULT (datetime('now')),\n  assigned_by  INTEGER REFERENCES staff(id),\n  ended_at     TEXT,\n  in_gymmaster INTEGER NOT NULL DEFAULT 0         \n);",
"CREATE INDEX IF NOT EXISTS key_tags_tag ON key_tags(tag);",
"CREATE TABLE IF NOT EXISTS member_flags (\n  member_id  INTEGER NOT NULL REFERENCES members(id) ON DELETE CASCADE,\n  flag       TEXT NOT NULL,  \n  detail     TEXT,           \n  set_by     INTEGER REFERENCES staff(id),\n  set_at     TEXT NOT NULL DEFAULT (datetime('now')),\n  PRIMARY KEY (member_id, flag)\n);",
"CREATE TABLE IF NOT EXISTS member_photos (\n  member_id  INTEGER PRIMARY KEY REFERENCES members(id),\n  jpeg       TEXT NOT NULL,\n  taken_at   TEXT NOT NULL DEFAULT (datetime('now')),\n  taken_by   INTEGER REFERENCES staff(id)\n);",
"CREATE TABLE IF NOT EXISTS member_health_notes (\n  member_id   INTEGER PRIMARY KEY REFERENCES members(id) ON DELETE CASCADE,\n  note        TEXT,\n  consent_on  TEXT NOT NULL\n);",
"CREATE TABLE IF NOT EXISTS staff (\n  id          INTEGER PRIMARY KEY,\n  name        TEXT NOT NULL,\n  email       TEXT UNIQUE NOT NULL,            \n  role        TEXT NOT NULL,                   \n  member_id   INTEGER REFERENCES members(id),  \n  active      INTEGER NOT NULL DEFAULT 1,\n  list_order  INTEGER DEFAULT 100,             \n  created_at  TEXT NOT NULL DEFAULT (datetime('now'))\n);",
"CREATE TABLE IF NOT EXISTS plans (\n  id              INTEGER PRIMARY KEY,\n  gm_type_name    TEXT,                        \n  gm_category     TEXT,                        \n  family          TEXT NOT NULL,               \n  frequency       TEXT,                        \n  flexi           INTEGER NOT NULL DEFAULT 0,\n  paid_in_full    INTEGER NOT NULL DEFAULT 0,\n  corporate       INTEGER NOT NULL DEFAULT 0,\n  employer        TEXT,\n  student         INTEGER NOT NULL DEFAULT 0,\n  legacy          INTEGER NOT NULL DEFAULT 0,  \n  gm_join_id      INTEGER,                     \n  includes_classes  INTEGER NOT NULL DEFAULT 0,\n  includes_recovery INTEGER NOT NULL DEFAULT 0,\n  UNIQUE (gm_type_name, gm_category)\n);",
"CREATE TABLE IF NOT EXISTS memberships (\n  id                INTEGER PRIMARY KEY,\n  member_id         INTEGER NOT NULL REFERENCES members(id) ON DELETE CASCADE,\n  plan_id           INTEGER NOT NULL REFERENCES plans(id),\n  price             REAL,                      \n  weekly_value      REAL,                      \n  start_date        TEXT,\n  min_term_end      TEXT,                      \n  end_date          TEXT,                      \n  status            TEXT NOT NULL DEFAULT 'current', \n  cancel_reason     TEXT,                      \n  freeze_from       TEXT,\n  freeze_to         TEXT,\n  freeze_reason     TEXT,\n  billed_by         TEXT NOT NULL DEFAULT 'ezidebit', \n  gm_billing_note   TEXT,\n  discount_code     TEXT,\n  sold_by           TEXT,\n  created_at        TEXT NOT NULL DEFAULT (datetime('now'))\n);",
"CREATE INDEX IF NOT EXISTS memberships_member ON memberships(member_id);",
"CREATE INDEX IF NOT EXISTS memberships_status ON memberships(status);",
"CREATE TABLE IF NOT EXISTS billing_accounts (\n  member_id         INTEGER PRIMARY KEY REFERENCES members(id) ON DELETE CASCADE,\n  ezidebit_ref      TEXT,                      \n  billed_by_system  TEXT NOT NULL DEFAULT 'gymmaster', \n  next_debit_date   TEXT,\n  next_debit_amount REAL,\n  balance_owing     REAL NOT NULL DEFAULT 0,   \n  free_weeks_credit INTEGER NOT NULL DEFAULT 0,\n  updated_at        TEXT NOT NULL DEFAULT (datetime('now'))\n);",
"CREATE TABLE IF NOT EXISTS payments (\n  id           INTEGER PRIMARY KEY,\n  member_id    INTEGER REFERENCES members(id),\n  amount       REAL NOT NULL,\n  kind         TEXT NOT NULL,    \n  status       TEXT NOT NULL,    \n  failure_reason TEXT,\n  occurred_at  TEXT NOT NULL,\n  source       TEXT,             \n  external_ref TEXT\n);",
"CREATE INDEX IF NOT EXISTS payments_member ON payments(member_id, occurred_at);",
"CREATE TABLE IF NOT EXISTS collections_cases (\n  id             INTEGER PRIMARY KEY,\n  member_id      INTEGER NOT NULL REFERENCES members(id),\n  opened_on      TEXT NOT NULL,\n  amount_owed    REAL NOT NULL,\n  is_former      INTEGER NOT NULL DEFAULT 0,\n  status         TEXT NOT NULL DEFAULT 'open', \n  settle_offer   REAL,                         \n  referred_on    TEXT,                         \n  closed_on      TEXT\n);",
"CREATE TABLE IF NOT EXISTS balance_checks (\n  member_id   INTEGER PRIMARY KEY REFERENCES members(id),\n  owing       REAL NOT NULL DEFAULT 0,\n  next_bill   TEXT,\n  no_billing  INTEGER NOT NULL DEFAULT 0, \n  checked_at  TEXT NOT NULL DEFAULT (datetime('now'))\n);",
"CREATE TABLE IF NOT EXISTS finance_months (\n  month         TEXT PRIMARY KEY,          \n  income        REAL,\n  cost_of_sales REAL,\n  expenses      REAL,\n  net           REAL,\n  lines         TEXT,                      \n  source        TEXT,\n  updated_at    TEXT NOT NULL DEFAULT (datetime('now'))\n);",
"CREATE TABLE IF NOT EXISTS finance_points (\n  key     TEXT PRIMARY KEY,                \n  label   TEXT,\n  value   REAL,\n  as_of   TEXT\n);",
"CREATE TABLE IF NOT EXISTS member_snapshots (\n  day           TEXT PRIMARY KEY,\n  members       INTEGER,\n  passport      INTEGER,\n  perform       INTEGER,\n  daily         INTEGER,\n  classes       INTEGER,\n  recovery      INTEGER,\n  other         INTEGER,\n  weekly_billed REAL,\n  owed          REAL\n);",
"CREATE TABLE IF NOT EXISTS marketing_days (\n  day         TEXT NOT NULL,\n  source      TEXT NOT NULL,               \n  campaign    TEXT NOT NULL,\n  spend       REAL,\n  impressions INTEGER,\n  clicks      INTEGER,\n  leads       INTEGER,\n  landing_views INTEGER,\n  PRIMARY KEY (day, source, campaign)\n);",
"CREATE TABLE IF NOT EXISTS web_days (\n  day         TEXT NOT NULL,\n  channel     TEXT NOT NULL,\n  sessions    INTEGER,\n  conversions INTEGER,\n  PRIMARY KEY (day, channel)\n);",
"CREATE TABLE IF NOT EXISTS visits (\n  id          INTEGER PRIMARY KEY,\n  member_id   INTEGER NOT NULL REFERENCES members(id),\n  at          TEXT NOT NULL,             \n  door        TEXT,                      \n  via         TEXT,                      \n  gm_visit_id TEXT UNIQUE,\n  fp_id       TEXT,                      \n  fp_status   TEXT                       \n);",
"CREATE INDEX IF NOT EXISTS visits_member_at ON visits(member_id, at);",
"CREATE INDEX IF NOT EXISTS visits_at ON visits(at);",
"CREATE TABLE IF NOT EXISTS classes (\n  id          INTEGER PRIMARY KEY,\n  name        TEXT NOT NULL,             \n  starts_at   TEXT NOT NULL,\n  ends_at     TEXT,\n  coach_id    INTEGER REFERENCES staff(id),\n  capacity    INTEGER NOT NULL DEFAULT 20,\n  gm_class_id TEXT UNIQUE\n);",
"CREATE TABLE IF NOT EXISTS bookings (\n  id          INTEGER PRIMARY KEY,\n  class_id    INTEGER NOT NULL REFERENCES classes(id) ON DELETE CASCADE,\n  member_id   INTEGER NOT NULL REFERENCES members(id),\n  status      TEXT NOT NULL DEFAULT 'booked', \n  waitlist_pos INTEGER,\n  booked_by   TEXT,                           \n  booked_at   TEXT NOT NULL DEFAULT (datetime('now')),\n  UNIQUE (class_id, member_id)\n);",
"CREATE TABLE IF NOT EXISTS leads (\n  id           INTEGER PRIMARY KEY,\n  member_id    INTEGER REFERENCES members(id),   \n  name         TEXT,\n  email        TEXT,\n  mobile       TEXT,\n  kind         TEXT NOT NULL,    \n  source       TEXT,             \n  campaign     TEXT,\n  stage        TEXT NOT NULL DEFAULT 'new',  \n  assigned_to  INTEGER REFERENCES staff(id),\n  goal         TEXT,\n  notes        TEXT,\n  created_at   TEXT NOT NULL DEFAULT (datetime('now')),\n  contacted_at TEXT,\n  closed_at    TEXT\n);",
"CREATE INDEX IF NOT EXISTS leads_stage ON leads(stage, created_at);",
"CREATE INDEX IF NOT EXISTS leads_email ON leads(email);",
"CREATE INDEX IF NOT EXISTS leads_mobile ON leads(mobile);",
"CREATE TABLE IF NOT EXISTS tasks (\n  id           INTEGER PRIMARY KEY,\n  kind         TEXT NOT NULL,    \n  member_id    INTEGER REFERENCES members(id),\n  lead_id      INTEGER REFERENCES leads(id),\n  owner_role   TEXT NOT NULL,    \n  assigned_to  INTEGER REFERENCES staff(id),\n  value_at_stake REAL,           \n  due_on       TEXT NOT NULL,\n  outcome      TEXT,             \n  outcome_note TEXT,\n  done_by      INTEGER REFERENCES staff(id),\n  done_at      TEXT\n);",
"CREATE INDEX IF NOT EXISTS tasks_due ON tasks(due_on, outcome);",
"CREATE TABLE IF NOT EXISTS activity (\n  id          INTEGER PRIMARY KEY,\n  member_id   INTEGER REFERENCES members(id),\n  lead_id     INTEGER REFERENCES leads(id),\n  staff_id    INTEGER REFERENCES staff(id),\n  kind        TEXT NOT NULL,     \n  detail      TEXT,\n  at          TEXT NOT NULL DEFAULT (datetime('now'))\n);",
"CREATE INDEX IF NOT EXISTS activity_member ON activity(member_id, at);",
"CREATE INDEX IF NOT EXISTS activity_lead ON activity(lead_id, at);",
"CREATE TABLE IF NOT EXISTS automations (\n  id          INTEGER PRIMARY KEY,\n  key         TEXT UNIQUE NOT NULL,  \n  name        TEXT NOT NULL,\n  goal        TEXT NOT NULL,         \n  goal_window_days INTEGER NOT NULL,\n  holdout_pct INTEGER NOT NULL DEFAULT 10,\n  active      INTEGER NOT NULL DEFAULT 0\n);",
"CREATE TABLE IF NOT EXISTS message_sends (\n  id            INTEGER PRIMARY KEY,\n  automation_id INTEGER REFERENCES automations(id),\n  member_id     INTEGER REFERENCES members(id),\n  channel       TEXT NOT NULL,       \n  held_out      INTEGER NOT NULL DEFAULT 0,  \n  sent_at       TEXT NOT NULL,\n  goal_met_at   TEXT                 \n);",
"CREATE INDEX IF NOT EXISTS sends_auto ON message_sends(automation_id, sent_at);",
"CREATE TABLE IF NOT EXISTS products (\n  id        INTEGER PRIMARY KEY,\n  category  TEXT NOT NULL,    \n  name      TEXT NOT NULL,\n  price     REAL NOT NULL,    \n  active    INTEGER NOT NULL DEFAULT 1\n);",
"CREATE TABLE IF NOT EXISTS sales (\n  id         INTEGER PRIMARY KEY,\n  member_id  INTEGER REFERENCES members(id),\n  staff_id   INTEGER REFERENCES staff(id),\n  total      REAL NOT NULL,\n  paid_by    TEXT NOT NULL,   \n  at         TEXT NOT NULL DEFAULT (datetime('now'))\n);",
"CREATE TABLE IF NOT EXISTS sale_lines (\n  sale_id    INTEGER NOT NULL REFERENCES sales(id) ON DELETE CASCADE,\n  product_id INTEGER REFERENCES products(id),\n  label      TEXT NOT NULL,\n  qty        INTEGER NOT NULL DEFAULT 1,\n  price      REAL NOT NULL\n);",
"CREATE TABLE IF NOT EXISTS sync_log (\n  id          INTEGER PRIMARY KEY,\n  source      TEXT NOT NULL,    \n  started_at  TEXT NOT NULL,\n  finished_at TEXT,\n  rows_in     INTEGER DEFAULT 0,\n  rows_changed INTEGER DEFAULT 0,\n  ok          INTEGER,\n  error       TEXT\n);",
"CREATE TABLE IF NOT EXISTS settings (\n  key   TEXT PRIMARY KEY,\n  value TEXT NOT NULL\n);",
"INSERT OR IGNORE INTO settings(key, value) VALUES\n  ('block_at_balance', '250'),\n  ('settle_pct_upto_1500', '50'),\n  ('settle_pct_over_1500', '30'),\n  ('referral_min_amount', '1000'),\n  ('class_capacity', '20'),\n  ('late_cancel_hours', '12'),\n  ('no_show_after_minutes', '10'),\n  ('fp_tiers', '458:7.39,919:8.21,1380:9.12,1841:10.03,0:11.04'),\n  ('fp_ids_loaded', '0'),\n  ('fy_target_ex_gst', '1235600'),\n  ('meta_budget_month', '3500'),\n  ('balance_cursor', '0');",
"INSERT OR IGNORE INTO automations(key, name, goal, goal_window_days, active) VALUES\n  ('trial_ending',       'Trial ending',          'joined',    7,  0),\n  ('trial_comeback',     'Trial come-back',       'joined',    14, 0),\n  ('passport_winback',   'Fitness Passport win-back', 'visited', 7, 0),\n  ('we_miss_you',        'We miss you',           'visited',   7,  0),\n  ('new_member_checkin', 'New member check-in',   'visited',   7,  0),\n  ('failed_payment',     'Failed payment',        'paid',      7,  0),\n  ('daily_to_perform',   'Daily to Perform',      'upgraded',  14, 0),\n  ('no_show',            'Class no-show',         'attended',  14, 0);"
];
const STAFF_SEED = [
"INSERT OR IGNORE INTO staff(name, email, role, list_order) VALUES\n  ('Taylor Blackler', 'taylor@m2club.co.nz', 'owner', 1),\n  ('Tim Fox',         'tim@m2club.co.nz',    'owner', 2);"
];
const SCHEMA_VERSION = "4a482677fa91";

// hub.js (bundled)
// M2 Core: the joined-up parts.
// Classes and bookings, the live GymMaster panel on a member, collections with real balances,
// and the owners' Money, Growth and Marketing pages. Everything here reads the same database
// as the rest of the Core, plus GymMaster live, plus figures pushed in from Xero, Meta and GA4.

function makeHub(L) {
  const { json, nzDateTime, gmCall, applyBlockRule } = L;
  const todayNz = () => nzDateTime(new Date()).slice(0, 10);
  const num = v => { const n = parseFloat(String(v ?? "").replace(/[^0-9.\-]/g, "")); return Number.isFinite(n) ? n : 0; };
  const setting = async (env, key, dflt) => (await env.DB.prepare("SELECT value FROM settings WHERE key = ?").bind(key).first())?.value ?? dflt;
  const all = (env, sql, ...a) => env.DB.prepare(sql).bind(...a).all().then(r => r.results || []);
  const one = (env, sql, ...a) => env.DB.prepare(sql).bind(...a).first();

  function mondayOf(iso) {
    const d = new Date(iso + "T12:00:00Z");
    const back = (d.getUTCDay() + 6) % 7;
    return new Date(d.getTime() - back * 86400_000).toISOString().slice(0, 10);
  }
  const addDays = (iso, n) => new Date(new Date(iso + "T12:00:00Z").getTime() + n * 86400_000).toISOString().slice(0, 10);

  async function canSeeMember(env, who, can, id) {
    if (!can.members) return false;
    if (can.members === true) return true;
    const m = await one(env, "SELECT trainer_id FROM members WHERE id = ?", id);
    return !!m && m.trainer_id === who.id;
  }

  /* ---------------- classes ---------------- */
  // The timetable comes live from GymMaster, so a booking made in the M2 App shows here straight away.

  async function classesWeek(env, who, can, q) {
    const asked = q.get("week");
    const week = mondayOf(/^\d{4}-\d{2}-\d{2}$/.test(asked || "") ? asked : todayNz());
    const d = await gmCall(env, "v1", "/booking/classes/schedule", { params: { week } });
    if (!Array.isArray(d.result)) return { error: "GymMaster didn't send the timetable (" + (d.error || "no reply") + ")." };
    const classes = d.result.map(c => ({
      id: c.id, day: c.arrival, start: String(c.starttime || "").slice(0, 5), end: String(c.endtime || "").slice(0, 5),
      time: c.start_str, name: c.classname || c.bookingname, coach: c.staffname, location: c.location,
      booked: c.num_students || 0, max: c.max_students || 0, free: c.spacesfree ?? null, waitlist: c.waitlist_count || 0,
      colour: c.bgcolour || null,
    })).filter(c => c.day >= week && c.day < addDays(week, 7)).sort((a, b) => (a.day + a.start).localeCompare(b.day + b.start));
    return { week, prev: addDays(week, -7), next: addDays(week, 7), today: todayNz(), classes, can_book: !!can.add };
  }

  function readAttendee(a) {
    const member_id = +(a.memberid ?? a.member_id ?? a.memberID ?? a.member ?? 0) || null;
    const name = a.name || a.membername || a.fullname || [a.firstname, a.surname].filter(Boolean).join(" ") || "Member";
    const wait = a.waitlist === true || a.is_waitlist === true || a.waitinglist === true || /wait/i.test(a.status || "");
    const attended = a.attended === true || a.attended === 1 || /attend|arrived|checked/i.test(a.status || "");
    const status = wait ? "waitlist" : attended ? "attended" : /cancel/i.test(a.status || "") ? "cancelled" : "booked";
    return { member_id, name, status, booking_id: a.bookingid ?? a.booking_id ?? a.id ?? null };
  }

  async function classDetail(env, who, can, classId) {
    const d = await gmCall(env, "v2", "/booking/classes/" + classId + "/attendees", { auth: "high" });
    if (!Array.isArray(d.result)) return { error: "GymMaster didn't send the class list (" + (d.error || "no reply") + ")." };
    const people = d.result.map(readAttendee);
    const ids = people.map(p => p.member_id).filter(Boolean);
    const core = {};
    if (ids.length) {
      const rows = await all(env, `SELECT m.id, m.first_name, m.last_name, m.trainer_id,
          EXISTS (SELECT 1 FROM member_photos p WHERE p.member_id = m.id) has_photo,
          (SELECT group_concat(flag) FROM member_flags f WHERE f.member_id = m.id) flags
        FROM members m WHERE m.id IN (${ids.map(() => "?").join(",")})`, ...ids);
      for (const r of rows) core[r.id] = r;
    }
    const out = people.map(p => {
      const c = p.member_id && core[p.member_id];
      const flags = c && c.flags ? c.flags.split(",") : [];
      return { ...p, in_core: !!c, name: c ? (c.first_name + " " + (c.last_name || "")).trim() : p.name, has_photo: !!(c && c.has_photo),
               blocked: flags.includes("blocked") && can.balances, passport: flags.includes("passport"),
               open: !!c && (can.members === true || (can.members === "own" && c.trainer_id === who.id)) };
    });
    const unknownShape = d.result.length && !people.some(p => p.member_id) ? Object.keys(d.result[0]) : null;
    return { attendees: out, unknown_fields: can.settings ? unknownShape : null };
  }

  async function blockReason(env, memberId) {
    const f = await all(env, "SELECT flag FROM member_flags WHERE member_id = ?", memberId);
    if (f.some(x => x.flag === "gifted_time")) return null;
    const limit = +(await setting(env, "block_at_balance", 250));
    const b = await one(env, "SELECT balance_owing FROM billing_accounts WHERE member_id = ?", memberId);
    if (f.some(x => x.flag === "blocked") || (b && b.balance_owing >= limit)) {
      return "Owes $" + (b ? b.balance_owing.toFixed(2) : "money") + ", so they can't book until it's paid (the $" + limit + " rule).";
    }
    return null;
  }

  async function bookMember(env, who, can, classId, b) {
    if (!can.add) return { ok: false, error: "Only reception, the manager and owners can book people in." };
    const mid = +b.member_id;
    const m = await one(env, "SELECT id, first_name, last_name FROM members WHERE id = ?", mid);
    if (!m) return { ok: false, error: "Pick a member first." };
    const stop = await blockReason(env, mid);
    if (stop) return { ok: false, error: stop };
    const d = await gmCall(env, "v2", "/booking/classes", { member: mid, method: "POST", body: { bookingid: +classId } });
    if (d.error) return { ok: false, error: "GymMaster said: " + (typeof d.error === "string" ? d.error : JSON.stringify(d.error)) };
    await env.DB.prepare("INSERT INTO activity(member_id, staff_id, kind, detail) VALUES (?, ?, 'note', ?)")
      .bind(mid, who.id, "Booked into " + String(b.label || "a class").slice(0, 120)).run();
    return { ok: true, waitlist: /wait/i.test(JSON.stringify(d.result || "")) };
  }

  async function cancelBooking(env, who, can, classId, b) {
    if (!can.add) return { ok: false, error: "Only reception, the manager and owners can cancel bookings." };
    const mid = +b.member_id;
    if (!mid) return { ok: false, error: "This person isn't matched to a member, so cancel them in GymMaster." };
    let bookingId = null;
    const mine = await gmCall(env, "v2", "/member/bookings", { member: mid });
    const list = [].concat(mine.result?.classbookings || [], mine.result?.classwaitlists || []);
    const hit = list.find(x => [x.bookingid, x.classid, x.class_id, x.sessionid, x.booking_id, x.classbookingid].map(String).includes(String(classId)));
    if (hit) bookingId = hit.id ?? hit.booking_id ?? hit.bookingid;
    if (!bookingId) bookingId = b.booking_id;
    if (!bookingId) return { ok: false, error: "Couldn't find their booking in GymMaster." };
    const d = await gmCall(env, "v1", "/member/cancelbooking", { member: mid, method: "POST", body: { bookingid: bookingId } });
    if (d.error) return { ok: false, error: "GymMaster said: " + (typeof d.error === "string" ? d.error : JSON.stringify(d.error)) };
    await env.DB.prepare("INSERT INTO activity(member_id, staff_id, kind, detail) VALUES (?, ?, 'note', ?)")
      .bind(mid, who.id, "Cancelled from " + String(b.label || "a class").slice(0, 120)).run();
    return { ok: true };
  }

  /* ---------------- live member panel ---------------- */

  async function saveBalance(env, id, bal) {
    const owing = num(bal.owingamount);
    const next = bal.next_bill || null;
    const noBill = /no (billing|payment|direct)/i.test(next || "") ? 1 : 0;
    await env.DB.batch([
      env.DB.prepare(`INSERT INTO balance_checks(member_id, owing, next_bill, no_billing, checked_at) VALUES (?, ?, ?, ?, datetime('now'))
                      ON CONFLICT(member_id) DO UPDATE SET owing = excluded.owing, next_bill = excluded.next_bill, no_billing = excluded.no_billing, checked_at = excluded.checked_at`)
        .bind(id, owing, next, noBill),
      env.DB.prepare(`INSERT INTO billing_accounts(member_id, balance_owing) VALUES (?, ?)
                      ON CONFLICT(member_id) DO UPDATE SET balance_owing = excluded.balance_owing, updated_at = datetime('now')`).bind(id, owing),
    ]);
    return owing;
  }

  async function memberLive(env, who, can, id) {
    if (!(await canSeeMember(env, who, can, id))) return { error: "No access" };
    const safe = p => p.catch(e => ({ error: String(e.message || e) }));
    const [bal, mships, books, visits, hist] = await Promise.all([
      can.balances ? safe(gmCall(env, "v1", "/member/outstandingbalance", { member: id })) : null,
      safe(gmCall(env, "v1", "/member/memberships", { member: id })),
      safe(gmCall(env, "v2", "/member/bookings", { member: id })),
      safe(gmCall(env, "v1", "/member/visits/monthly", { member: id })),
      can.balances ? safe(gmCall(env, "v1", "/member/accounthistory", { member: id })) : null,
    ]);
    if (mships.error && /wouldn't open/.test(mships.error)) return { error: "This person isn't in GymMaster, so there's nothing live to show." };
    const out = { checked_at: new Date().toISOString() };
    if (bal && !bal.error) {
      out.owing = await saveBalance(env, id, bal);
      out.next_bill = bal.next_bill || null;
      await applyBlockRule(env);
    }
    out.memberships = (mships.result || []).map(x => ({
      name: x.name, start: x.startdate, end: x.enddate, next_payment: x.nextpaymentdate, on_hold: !!x.onhold, hold_coming: !!x.upcoming_hold_exists,
      in_min_term: !!x.within_min_term, earliest_cancel: x.earliest_cancellation_date, visits_used: x.visitsused, visit_limit: x.visitlimit,
      price: can.balances ? x.price : undefined,
    }));
    const cb = books.result || {};
    out.bookings = [].concat((cb.classbookings || []).map(x => ({ ...x, _w: false })), (cb.classwaitlists || []).map(x => ({ ...x, _w: true })))
      .map(x => ({ name: x.classname || x.bookingname || x.name || "Class", day: x.arrival || x.day || x.date || "", time: x.start_str || String(x.starttime || "").slice(0, 5),
                   waitlist: x._w })).slice(0, 10);
    out.services = (cb.servicebookings || []).length;
    out.visits = (visits.result || []).map(v => ({ month: v.month, visits: v.visits }));
    if (hist && Array.isArray(hist.result)) {
      out.history = hist.result.slice(0, 12).map(h => ({ when: h.occurred_str || h.occurred, note: h.note, debit: h.debit, credit: h.credit, unpaid: !!h.unpaid, total: h.running_total }));
    }
    return out;
  }

  /* ---------------- balances, all day ---------------- */
  // Every 15 minutes: 15 members in turn plus the 5 owing longest since a check. A full lap of the
  // club takes about a day, and anyone owing is rechecked often, so the $250 block stays true.

  async function refreshBalances(env) {
    if (!env.GM_STAFF_KEY || !env.GM_API_KEY) return { ok: false, error: "GymMaster keys missing" };
    const cursor = +(await setting(env, "balance_cursor", 0));
    const lap = (await all(env, "SELECT id FROM members WHERE status = 'active' AND id > ? ORDER BY id LIMIT 15", cursor)).map(r => r.id);
    const owing = (await all(env, "SELECT member_id id FROM balance_checks WHERE owing > 0 ORDER BY checked_at LIMIT 5")).map(r => r.id);
    const ids = [...new Set(lap.concat(owing))];
    let done = 0, failed = 0;
    for (let i = 0; i < ids.length; i += 5) {
      await Promise.all(ids.slice(i, i + 5).map(async id => {
        try {
          const b = await gmCall(env, "v1", "/member/outstandingbalance", { member: id });
          if (b.error && b.owingamount === undefined) { failed++; return; }
          await saveBalance(env, id, b); done++;
        } catch { failed++; }
      }));
    }
    await env.DB.prepare("INSERT INTO settings(key, value) VALUES ('balance_cursor', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value")
      .bind(String(lap.length < 15 ? 0 : lap[lap.length - 1])).run();
    await applyBlockRule(env);
    return { ok: true, done, failed };
  }

  /* ---------------- daily snapshot ---------------- */

  async function takeSnapshot(env) {
    const day = todayNz();
    const fam = Object.fromEntries((await all(env, `SELECT p.family, count(DISTINCT ms.member_id) n FROM memberships ms JOIN plans p ON p.id = ms.plan_id
                                                   JOIN members m ON m.id = ms.member_id AND m.status = 'active'
                                                   WHERE ms.status = 'current' GROUP BY p.family`)).map(r => [r.family, r.n]));
    const members = (await one(env, "SELECT count(*) n FROM members WHERE status = 'active'")).n;
    const passport = (await one(env, "SELECT count(*) n FROM member_flags f JOIN members m ON m.id = f.member_id AND m.status = 'active' WHERE f.flag = 'passport'")).n;
    const weekly = (await one(env, "SELECT round(sum(weekly_value), 2) v FROM memberships WHERE status = 'current' AND billed_by <> 'passport'")).v || 0;
    const owed = (await one(env, "SELECT round(sum(balance_owing), 2) v FROM billing_accounts WHERE balance_owing > 0")).v || 0;
    const named = ["perform", "daily", "classes", "recovery"].reduce((a, k) => a + (fam[k] || 0), 0);
    await env.DB.prepare(`INSERT INTO member_snapshots(day, members, passport, perform, daily, classes, recovery, other, weekly_billed, owed)
                          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                          ON CONFLICT(day) DO UPDATE SET members = excluded.members, passport = excluded.passport, perform = excluded.perform,
                            daily = excluded.daily, classes = excluded.classes, recovery = excluded.recovery, other = excluded.other,
                            weekly_billed = excluded.weekly_billed, owed = excluded.owed`)
      .bind(day, members, passport, fam.perform || 0, fam.daily || 0, fam.classes || 0, fam.recovery || 0, Math.max(0, members - named - passport), weekly, owed).run();
    return { day, members };
  }

  /* ---------------- collections ---------------- */

  async function collections(env, can) {
    if (!can.collections) return { error: "Collections are for owners and the manager." };
    const [p1, p2, refMin, limit] = await Promise.all([setting(env, "settle_pct_upto_1500", 50), setting(env, "settle_pct_over_1500", 30),
      setting(env, "referral_min_amount", 1000), setting(env, "block_at_balance", 250)]);
    const rows = await all(env, `SELECT m.id, m.first_name, m.last_name, m.mobile, m.email, m.status, b.balance_owing owing,
        bc.checked_at, bc.next_bill, c.id case_id, c.status case_status, c.referred_on, c.opened_on,
        (SELECT a.detail FROM activity a WHERE a.member_id = m.id AND a.kind IN ('call','note') ORDER BY a.at DESC, a.id DESC LIMIT 1) last_note,
        (SELECT a.at FROM activity a WHERE a.member_id = m.id AND a.kind IN ('call','note') ORDER BY a.at DESC, a.id DESC LIMIT 1) last_at,
        (SELECT p.gm_type_name FROM memberships ms JOIN plans p ON p.id = ms.plan_id WHERE ms.member_id = m.id ORDER BY ms.status = 'current' DESC, ms.start_date DESC LIMIT 1) plan
      FROM billing_accounts b JOIN members m ON m.id = b.member_id
      LEFT JOIN balance_checks bc ON bc.member_id = m.id
      LEFT JOIN collections_cases c ON c.member_id = m.id AND c.status IN ('open','promised','referred')
      WHERE b.balance_owing > 0
        AND NOT EXISTS (SELECT 1 FROM member_flags f WHERE f.member_id = m.id AND f.flag = 'gifted_time')
      ORDER BY b.balance_owing DESC LIMIT 600`);
    for (const r of rows) {
      r.left = r.status !== "active";
      r.offer = Math.round(r.owing * (r.owing <= 1500 ? +p1 : +p2)) / 100;
      r.can_refer = r.owing >= +refMin;
      r.blocked = r.owing >= +limit;
    }
    const sum = l => Math.round(l.reduce((a, r) => a + r.owing, 0) * 100) / 100;
    const cur = rows.filter(r => !r.left), left = rows.filter(r => r.left);
    const cover = await one(env, `SELECT count(*) n, sum(CASE WHEN bc.checked_at >= datetime('now','-2 days') THEN 1 ELSE 0 END) recent, max(bc.checked_at) last
                                  FROM members m LEFT JOIN balance_checks bc ON bc.member_id = m.id WHERE m.status = 'active'`);
    return { rows, totals: { current: cur.length, current_sum: sum(cur), left: left.length, left_sum: sum(left), blocked: rows.filter(r => r.blocked && !r.left).length,
             referable: rows.filter(r => r.can_refer && !r.case_status).length },
             rules: { p1: +p1, p2: +p2, refMin: +refMin, limit: +limit }, coverage: cover };
  }

  const CASE_ACTIONS = { called: "Called about the balance", promised: "Promised to pay", settled: "Settled", referred: "Referred to Marshall Freeman",
                         written_off: "Written off", note: "Note" };
  async function collectionAction(env, who, can, b) {
    if (!can.collections) return { ok: false, error: "Collections are for owners and the manager." };
    const mid = +b.member_id, act = String(b.action || "");
    if (!CASE_ACTIONS[act]) return { ok: false, error: "Unknown action" };
    const m = await one(env, `SELECT m.id, m.status, b.balance_owing owing FROM members m LEFT JOIN billing_accounts b ON b.member_id = m.id WHERE m.id = ?`, mid);
    if (!m) return { ok: false, error: "Member not found" };
    const gifted = await one(env, "SELECT 1 x FROM member_flags WHERE member_id = ? AND flag = 'gifted_time'", mid);
    if (gifted) return { ok: false, error: "Gifted time: never chased for money." };
    const owing = m.owing || 0;
    if (act === "referred") {
      const min = +(await setting(env, "referral_min_amount", 1000));
      if (owing < min) return { ok: false, error: "Only debts of $" + min + " or more go to Marshall Freeman." };
    }
    if ((act === "written_off" || act === "referred") && !can.settings) return { ok: false, error: "Only Taylor and Tim can refer or write off a debt." };
    const note = String(b.note || "").trim().slice(0, 500);
    const pct = owing <= 1500 ? +(await setting(env, "settle_pct_upto_1500", 50)) : +(await setting(env, "settle_pct_over_1500", 30));
    const open = await one(env, "SELECT id FROM collections_cases WHERE member_id = ? AND status IN ('open','promised','referred') ORDER BY id DESC LIMIT 1", mid);
    const status = { called: "open", note: "open", promised: "promised", settled: "settled", referred: "referred", written_off: "written_off" }[act];
    const closed = ["settled", "written_off"].includes(status);
    const stmts = [];
    if (open) {
      stmts.push(env.DB.prepare(`UPDATE collections_cases SET status = ?, amount_owed = ?, settle_offer = ?, referred_on = CASE WHEN ? = 'referred' THEN date('now') ELSE referred_on END,
                                 closed_on = CASE WHEN ? = 1 THEN date('now') ELSE NULL END WHERE id = ?`)
        .bind(status, owing, Math.round(owing * pct) / 100, status, closed ? 1 : 0, open.id));
    } else {
      stmts.push(env.DB.prepare(`INSERT INTO collections_cases(member_id, opened_on, amount_owed, is_former, status, settle_offer, referred_on, closed_on)
                                 VALUES (?, date('now'), ?, ?, ?, ?, CASE WHEN ? = 'referred' THEN date('now') END, CASE WHEN ? = 1 THEN date('now') END)`)
        .bind(mid, owing, m.status === "active" ? 0 : 1, status, Math.round(owing * pct) / 100, status, closed ? 1 : 0));
    }
    const amt = b.amount ? " $" + num(b.amount).toFixed(2) : "";
    stmts.push(env.DB.prepare("INSERT INTO activity(member_id, staff_id, kind, detail) VALUES (?, ?, ?, ?)")
      .bind(mid, who.id, act === "called" ? "call" : "note", CASE_ACTIONS[act] + amt + (b.when ? " by " + String(b.when).slice(0, 10) : "") + (note ? ": " + note : "")));
    await env.DB.batch(stmts);
    return { ok: true };
  }

  /* ---------------- data pushed in (Xero, Meta, GA4) ---------------- */
  const PUSH = {
    finance_months: { cols: ["month", "income", "cost_of_sales", "expenses", "net", "lines", "source"], key: r => /^\d{4}-\d{2}$/.test(r.month),
      sql: `INSERT INTO finance_months(month, income, cost_of_sales, expenses, net, lines, source, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
            ON CONFLICT(month) DO UPDATE SET income = excluded.income, cost_of_sales = excluded.cost_of_sales, expenses = excluded.expenses, net = excluded.net,
              lines = excluded.lines, source = excluded.source, updated_at = excluded.updated_at` },
    finance_points: { cols: ["key", "label", "value", "as_of"], key: r => /^[a-z_]{2,40}$/.test(r.key),
      sql: `INSERT INTO finance_points(key, label, value, as_of) VALUES (?, ?, ?, ?)
            ON CONFLICT(key) DO UPDATE SET label = excluded.label, value = excluded.value, as_of = excluded.as_of` },
    marketing_days: { cols: ["day", "source", "campaign", "spend", "impressions", "clicks", "leads", "landing_views"], key: r => /^\d{4}-\d{2}-\d{2}$/.test(r.day) && r.source && r.campaign,
      sql: `INSERT INTO marketing_days(day, source, campaign, spend, impressions, clicks, leads, landing_views) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(day, source, campaign) DO UPDATE SET spend = excluded.spend, impressions = excluded.impressions, clicks = excluded.clicks,
              leads = excluded.leads, landing_views = excluded.landing_views` },
    web_days: { cols: ["day", "channel", "sessions", "conversions"], key: r => /^\d{4}-\d{2}-\d{2}$/.test(r.day) && r.channel,
      sql: `INSERT INTO web_days(day, channel, sessions, conversions) VALUES (?, ?, ?, ?)
            ON CONFLICT(day, channel) DO UPDATE SET sessions = excluded.sessions, conversions = excluded.conversions` },
  };
  async function pushData(env, who, can, b) {
    if (!can.settings) return { ok: false, error: "Owners only" };
    const p = PUSH[b.kind];
    if (!p) return { ok: false, error: "Unknown kind" };
    const rows = Array.isArray(b.rows) ? b.rows : [];
    if (!rows.length || rows.length > 3000) return { ok: false, error: "Send 1 to 3,000 rows" };
    const stmts = [];
    for (const r of rows) {
      if (!r || !p.key(r)) return { ok: false, error: "Bad row: " + JSON.stringify(r).slice(0, 120) };
      stmts.push(env.DB.prepare(p.sql).bind(...p.cols.map(c => {
        const v = r[c];
        if (v === undefined || v === null || v === "") return null;
        return typeof v === "object" ? JSON.stringify(v) : v;
      })));
    }
    for (let i = 0; i < stmts.length; i += 80) await env.DB.batch(stmts.slice(i, i + 80));
    await env.DB.prepare("INSERT INTO sync_log(source, started_at, finished_at, rows_in, rows_changed, ok) VALUES (?, datetime('now'), datetime('now'), ?, ?, 1)")
      .bind("push_" + b.kind, rows.length, stmts.length).run();
    return { ok: true, rows: stmts.length };
  }

  /* ---------------- Money (owners) ---------------- */
  function fyStart(iso) { const y = +iso.slice(0, 4), m = +iso.slice(5, 7); return (m >= 4 ? y : y - 1) + "-04"; }

  async function money(env, can) {
    if (!can.business) return { error: "Owners only" };
    const now = todayNz(), ym = now.slice(0, 7), fy = fyStart(now);
    const months = (await all(env, "SELECT month, income, cost_of_sales, expenses, net, lines, source, updated_at FROM finance_months ORDER BY month DESC LIMIT 24"))
      .map(r => ({ ...r, lines: (() => { try { return JSON.parse(r.lines || "null"); } catch { return null; } })() }));
    const points = await all(env, "SELECT key, label, value, as_of FROM finance_points ORDER BY key");
    const target = +(await setting(env, "fy_target_ex_gst", 1235600));
    const fyRows = months.filter(r => r.month >= fy && r.month <= ym);
    const ytd = fyRows.reduce((a, r) => a + (r.income || 0), 0);
    const ytdNet = fyRows.reduce((a, r) => a + (r.net || 0), 0);
    const closed = fyRows.filter(r => r.month < ym);
    const pace = closed.length ? closed.reduce((a, r) => a + (r.income || 0), 0) / closed.length * 12 : null;
    const fyMonthsGone = ((+ym.slice(0, 4) - +fy.slice(0, 4)) * 12 + (+ym.slice(5, 7) - 4)) + 1;
    const weekly = (await one(env, "SELECT round(sum(weekly_value), 2) v FROM memberships WHERE status = 'current' AND billed_by <> 'passport'")).v || 0;
    const owed = await one(env, `SELECT round(sum(CASE WHEN m.status = 'active' THEN b.balance_owing ELSE 0 END), 2) cur,
                                        round(sum(CASE WHEN m.status <> 'active' THEN b.balance_owing ELSE 0 END), 2) left_
                                 FROM billing_accounts b JOIN members m ON m.id = b.member_id WHERE b.balance_owing > 0`);
    const fpVisits = (await one(env, `SELECT count(*) n FROM visits v JOIN member_flags f ON f.member_id = v.member_id AND f.flag = 'passport'
                                      WHERE v.at >= ? AND v.at < ?`, ym + "-01", ym + "-32")).n;
    const fpTiers = await setting(env, "fp_tiers", "");
    return { ym, fy, target, ytd: Math.round(ytd), ytd_net: Math.round(ytdNet), pace: pace && Math.round(pace), fy_months_gone: fyMonthsGone,
             target_to_date: Math.round(target / 12 * Math.min(12, fyMonthsGone)), months, points,
             weekly_billed: weekly, yearly_billed_ex_gst: Math.round(weekly * 52 / 1.15),
             owed_current: owed?.cur || 0, owed_left: owed?.left_ || 0,
             passport_visits: fpVisits, passport_estimate: fpVisits ? L.passportPay(fpVisits, fpTiers).total : null,
             updated: months[0]?.updated_at || null };
  }

  /* ---------------- Growth (owners) ---------------- */
  async function growth(env, can) {
    if (!can.business) return { error: "Owners only" };
    const today = todayNz();
    if (!(await one(env, "SELECT 1 x FROM member_snapshots WHERE day = ?", today))) await takeSnapshot(env);
    const snaps = await all(env, "SELECT * FROM member_snapshots WHERE day >= ? ORDER BY day", addDays(today, -400));
    const from = addDays(today.slice(0, 7) + "-01", -366).slice(0, 7);
    const joins = await all(env, "SELECT substr(joined_on, 1, 7) month, count(*) n FROM members WHERE joined_on >= ? GROUP BY 1 ORDER BY 1", from + "-01");
    const leaves = await all(env, "SELECT substr(at, 1, 7) month, count(*) n FROM activity WHERE kind = 'cancel' AND at >= ? GROUP BY 1 ORDER BY 1", from + "-01");
    const trials = await all(env, `SELECT substr(created_at, 1, 7) month, count(*) n, sum(CASE WHEN stage = 'joined' THEN 1 ELSE 0 END) joined
                                   FROM leads WHERE kind = 'trial' AND created_at >= ? GROUP BY 1 ORDER BY 1`, from + "-01");
    const sources = await all(env, `SELECT coalesce(nullif(lead_source, ''), 'Not recorded') source, count(*) n FROM members
                                    WHERE joined_on >= ? GROUP BY 1 ORDER BY 2 DESC`, addDays(today, -90));
    const mix = await all(env, `SELECT p.family, count(DISTINCT ms.member_id) n FROM memberships ms JOIN plans p ON p.id = ms.plan_id
                                JOIN members m ON m.id = ms.member_id AND m.status = 'active' WHERE ms.status = 'current' GROUP BY 1 ORDER BY 2 DESC`);
    const leads = await all(env, `SELECT kind, count(*) n, sum(CASE WHEN stage = 'joined' THEN 1 ELSE 0 END) joined FROM leads
                                  WHERE created_at >= ? GROUP BY 1 ORDER BY 2 DESC`, addDays(today, -90));
    let history = [];
    if (env.M2CC) {
      try {
        let cursor;
        do {
          const l = await env.M2CC.list({ prefix: "snap:", cursor });
          for (const k of l.keys) { const v = await env.M2CC.get(k.name, "json"); if (v) history.push({ month: v.month, members: v.members, joins: v.newMembers, cancels: v.cancels, visits: v.visits, trials: v.trials, pt_leads: v.ptLeads }); }
          cursor = l.list_complete ? null : l.cursor;
        } while (cursor && history.length < 60);
      } catch { history = []; }
    }
    return { snaps, joins, leaves, trials, sources, mix, leads, history: history.sort((a, b) => String(a.month).localeCompare(String(b.month))) };
  }

  /* ---------------- Marketing (owners) ---------------- */
  const SOCIAL = ["instagram", "facebook", "meta"];
  async function marketing(env, can, q) {
    if (!can.business) return { error: "Owners only" };
    const today = todayNz();
    const month = /^\d{4}-\d{2}$/.test(q.get("month") || "") ? q.get("month") : today.slice(0, 7);
    const lo = month + "-01", hi = month + "-32";
    const campaigns = await all(env, `SELECT source, campaign, round(sum(spend), 2) spend, sum(impressions) impressions, sum(clicks) clicks, sum(leads) leads,
                                        sum(landing_views) landing_views FROM marketing_days WHERE day >= ? AND day < ? GROUP BY 1, 2 ORDER BY 3 DESC`, lo, hi);
    const daily = await all(env, "SELECT day, round(sum(spend), 2) spend, sum(leads) leads FROM marketing_days WHERE day >= ? AND day < ? GROUP BY 1 ORDER BY 1", lo, hi);
    const web = await all(env, "SELECT channel, sum(sessions) sessions, sum(conversions) conversions FROM web_days WHERE day >= ? AND day < ? GROUP BY 1 ORDER BY 2 DESC", lo, hi);
    const coreLeads = await all(env, `SELECT coalesce(nullif(source, ''), 'Not recorded') source, count(*) n, sum(CASE WHEN stage = 'joined' THEN 1 ELSE 0 END) joined
                                      FROM leads WHERE created_at >= ? AND created_at < ? GROUP BY 1 ORDER BY 2 DESC`, lo, hi);
    const joins = await all(env, `SELECT coalesce(nullif(lead_source, ''), 'Not recorded') source, count(*) n FROM members
                                  WHERE joined_on >= ? AND joined_on < ? GROUP BY 1 ORDER BY 2 DESC`, lo, hi);
    const trend = await all(env, `SELECT substr(day, 1, 7) month, round(sum(spend), 2) spend, sum(leads) leads FROM marketing_days
                                  WHERE day >= ? GROUP BY 1 ORDER BY 1`, addDays(lo, -190).slice(0, 7) + "-01");
    const joinsTrend = await all(env, `SELECT substr(joined_on, 1, 7) month, count(*) n FROM members WHERE joined_on >= ?
                                       AND lower(coalesce(lead_source, '')) IN ('instagram','facebook') GROUP BY 1`, addDays(lo, -190).slice(0, 7) + "-01");
    const budget = +(await setting(env, "meta_budget_month", 3500));
    const spend = campaigns.filter(c => c.source === "meta").reduce((a, c) => a + (c.spend || 0), 0);
    const allSpend = campaigns.reduce((a, c) => a + (c.spend || 0), 0);
    const platformLeads = campaigns.reduce((a, c) => a + (c.leads || 0), 0);
    const socialJoins = joins.filter(j => SOCIAL.includes(j.source.toLowerCase())).reduce((a, j) => a + j.n, 0);
    const socialLeads = coreLeads.filter(j => SOCIAL.includes(j.source.toLowerCase())).reduce((a, j) => a + j.n, 0);
    const dim = new Date(Date.UTC(+month.slice(0, 4), +month.slice(5, 7), 0)).getUTCDate();
    const daysIn = month === today.slice(0, 7) ? +today.slice(8, 10) : dim;
    const last = await one(env, "SELECT max(day) d FROM marketing_days");
    return { month, budget, meta_spend: Math.round(spend * 100) / 100, all_spend: Math.round(allSpend * 100) / 100,
             projected: daysIn ? Math.round(spend / daysIn * dim) : 0, platform_leads: platformLeads, social_leads: socialLeads, social_joins: socialJoins,
             cpl: platformLeads ? Math.round(allSpend / platformLeads * 100) / 100 : null,
             cost_per_join: socialJoins ? Math.round(spend / socialJoins * 100) / 100 : null,
             campaigns, daily, web, core_leads: coreLeads, joins, trend: trend.map(t => ({ ...t, joins: (joinsTrend.find(j => j.month === t.month) || {}).n || 0 })),
             data_to: last?.d || null };
  }

  return { classesWeek, classDetail, bookMember, cancelBooking, memberLive, refreshBalances, takeSnapshot, collections, collectionAction, pushData, money, growth, marketing };
}


const TZ = "Pacific/Auckland";
const H = makeHub({ json, nzDateTime, gmCall, applyBlockRule, passportPay });

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
      if (url.pathname === "/api/gm-probe") return json(await gmProbe(env, can, url.searchParams));
      if (url.pathname === "/api/settings") return json(req.method === "POST" ? await saveSetting(env, who, can, await req.json()) : await settingsView(env, can));
      if (url.pathname === "/api/import" && req.method === "POST") return json(await importRows(env, who, can, await req.json()));
      if (url.pathname === "/api/classes") return json(await H.classesWeek(env, who, can, url.searchParams));
      const cl = url.pathname.match(/^\/api\/classes\/(\d+)(?:\/(book|cancel))?$/);
      if (cl && cl[2] === "book" && req.method === "POST") return json(await H.bookMember(env, who, can, cl[1], await req.json()));
      if (cl && cl[2] === "cancel" && req.method === "POST") return json(await H.cancelBooking(env, who, can, cl[1], await req.json()));
      if (cl && !cl[2]) return json(await H.classDetail(env, who, can, cl[1]));
      const lv = url.pathname.match(/^\/api\/members\/(\d+)\/live$/);
      if (lv) return json(await H.memberLive(env, who, can, +lv[1]));
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
      if (event.cron === "*/15 * * * *") { await H.refreshBalances(env); return; }
      await syncMembers(env);
      await applyBlockRule(env);
      await H.takeSnapshot(env);
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
  fp_id_gm:        { label: "Passport IDs to type into GymMaster", one: "Passport ID to type into GymMaster", owner: "reception", order: 2.2 },
  fp_missing:      { label: "Passport members with no Passport ID", one: "Passport member with no Passport ID", owner: "reception", order: 2.4 },
  no_tag:          { label: "Paying members with no key tag",   one: "paying member with no key tag",  owner: "reception", order: 6 },
  no_photo:        { label: "New members with no photo",        one: "new member with no photo",       owner: "reception", order: 7 },
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
  "/member/bookings", "/member/bookings/past", "/member/visits/monthly", "/member/accounthistory", "/member/profile", "/settings", "/companies", "/memberships"];
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
    { name: "Ezidebit", status: (env.BILLING_MODE || "gymmaster") === "ezidebit" ? "Billing in the Core" : "Billing still in GymMaster", detail: "Switches to Ezidebit's own bank form after the billing pilot." },
    { name: "Xero", status: "Pushed in by Claude", detail: "Profit and loss by month, cash and bills land on Money. Ask Claude to refresh them any time." },
    { name: "Meta ads and Google Analytics", status: "Pushed in by Claude", detail: "Spend, leads and website visits by day land on Marketing." },
    { name: "Live balances", status: env.GM_STAFF_KEY ? "Connected" : "Keys missing", detail: "Every 15 minutes the Core checks 20 members' balances in GymMaster, so the $250 block and Collections stay true." },
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
  const sql = r.sql.replace("#MONEY#", can.business ? `, ms.price "Price", ms.weekly_value "Per week"` : "");
  const stmt = env.DB.prepare(sql);
  const binds = r.dates ? Array.from({ length: r.pairs || 1 }, () => [from, to]).flat() : [];
  const res = await (binds.length ? stmt.bind(...binds) : stmt).all();
  const rows = res.results || [];
  const columns = rows.length ? Object.keys(rows[0]) : [];
  if (q.get("format") === "csv") {
    const cell = v => { const t = String(v ?? ""); return /[",\n]/.test(t) ? '"' + t.replace(/"/g, '""') + '"' : t; };
    const body = [columns.map(cell).join(",")].concat(rows.map(x => columns.map(c => cell(x[c])).join(","))).join("\r\n") + "\r\n";
    return new Response(body, { headers: { "Content-Type": "text/csv; charset=utf-8", "Cache-Control": "no-store",
      "Content-Disposition": `attachment; filename="m2-${kind}-${today}.csv"` } });
  }
  return json({ kind, title: r.title, dates: r.dates, from, to, columns, rows: rows.slice(0, 500), total: rows.length,
                reports: Object.entries(REPORTS).map(([k, v]) => ({ kind: k, title: v.title })) });
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
  if (!p) return new Response("No photo", { status: 404 });
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
                                  count(*) visits, min(v.at) first_visit, max(v.at) last_visit
                                FROM visits v JOIN members m ON m.id = v.member_id
                                WHERE v.at >= ? AND v.at < ?
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

