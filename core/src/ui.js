// The staff app page served by the M2 Core worker.
// Plain HTML, CSS and JS in one string. No backticks or ${ inside, so it can live in a template literal.

export const APP_HTML = String.raw`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
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
  $("#monGoal").innerHTML='<div style="display:flex;gap:10px;align-items:baseline;flex-wrap:wrap"><span class="eyebrow">This financial year, from '+esc(ml(d.fy))+'</span><span style="margin-left:auto;color:var(--soft);font-size:13px">'+whole$(d.ytd)+' of '+whole$(d.target)+' ('+pct+'%). On plan would be '+whole$(d.target_to_date)+' by the end of '+(d.last_month?MON[+d.last_month.slice(5,7)-1]:"this month")+'.</span></div><div class="goal" style="position:relative"><i style="width:'+Math.min(100,pct)+'%"></i><span style="position:absolute;top:-3px;bottom:-3px;left:'+Math.min(100,due)+'%;width:2px;background:#fff"></span></div>';
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
  $("#mkTiles").innerHTML=tile(whole$(d.all_spend),"Ad spend")+(d.platform_leads>=10?tile(d.platform_leads,"Leads Meta counted")+tile(money(d.cpl),"Cost per lead"):tile((d.landing_views||0).toLocaleString("en-NZ"),"People who reached the website from ads")+tile(d.cost_per_view!=null?money(d.cost_per_view):"-","Cost per website visit from ads"))+tile(d.social_leads,"Leads in the Core from Instagram and Facebook")+tile(d.social_joins,"Joined from Instagram and Facebook")+tile(d.cost_per_join!=null?whole$(d.cost_per_join):"-","Meta spend per member who joined")+tile(sess.toLocaleString("en-NZ"),"Website visits")+tile(conv.toLocaleString("en-NZ"),"Website conversions");
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
