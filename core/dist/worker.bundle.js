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
[hidden]{display:none!important}a.btn,label.btn{text-decoration:none;display:inline-flex;align-items:center}
.sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)}
@media (max-width:900px){.app{grid-template-columns:1fr}aside{position:static;height:auto;flex-direction:column;align-items:stretch;gap:10px;padding:12px}nav{flex-direction:row;overflow-x:auto;gap:4px;padding-bottom:2px;min-width:0;max-width:100%}aside{min-width:0;max-width:100vw}.nav{width:auto;white-space:nowrap;padding:8px 12px}.me{display:none}.row2{grid-template-columns:1fr}.board{grid-template-columns:repeat(2,minmax(0,1fr))}main{padding:18px 14px 40px}}
@media (prefers-reduced-motion:no-preference){.card{animation:none}}
</style></head><body>
<div class="app">
<aside>
<img src="https://m2club.co.nz/assets/img/m2-logo-lime.png" alt="M2 Training Club">
<nav aria-label="Main">
<button class="nav on" data-go="today">Today<span class="ct" id="ctToday" hidden></span></button>
<button class="nav" data-go="members">Members</button>
<button class="nav" data-go="leads">Leads<span class="ct" id="ctLeads" hidden></span></button>
<button class="nav" data-go="add" id="navAdd" hidden>Add member</button>
<button class="nav" data-go="tag">Key tag lookup</button>
<button class="nav" data-go="passport" id="navFp" hidden>Fitness Passport</button>
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
 if(v==="today")loadToday();
 if(v==="leads")loadLeads();
 if(v==="add")startAdd();
 if(v==="tag")setTimeout(function(){$("#lookTag").focus()},50);
 if(v==="passport")loadPassport();
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
  (vis.length?'<section class="card"><h2>Visits</h2><div class="bars">'+weeks.map(function(n,i){return '<i class="'+(i===11?"last":"")+'" style="height:'+Math.max(4,Math.round(n/mx*100))+'%" title="'+n+' visits"></i>'}).join("")+'</div><div class="muted">Last 12 weeks</div></section>':"")+
  bill+
  '<section class="card"><h2>Notes and history</h2><div style="display:flex;gap:8px"><label class="sr" for="noteIn">Add a note</label><input id="noteIn" class="fld" style="flex:1;height:44px;border:1px solid var(--line);border-radius:12px;padding:0 12px" placeholder="Add a note, like what they said at the desk"><button class="btn dark sm" data-note="'+id+'" style="height:44px">Save</button></div>'+
  '<div class="hist">'+(d.activity.map(function(a){return '<div><span>'+esc(day(a.at))+'</span><span>'+esc(a.detail)+(a.staff?' <span class="muted">'+esc(a.staff)+'</span>':"")+'</span></div>'}).join("")||'<p class="muted" style="margin:0">Nothing yet.</p>')+'</div></section>'+
  (tagRows?'<section class="card"><h2>Key tags</h2><div class="hist">'+tagRows+'</div></section>':"");
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
      // One-off data load during setup. Only works while the IMPORT_KEY secret exists; delete it after.
      if (url.pathname === "/admin/import" && req.method === "POST") return adminImport(req, env);
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
      if (url.pathname === "/api/passport.csv") return passportCsv(env, can, url.searchParams.get("month"));
      if (url.pathname === "/api/members" && req.method === "POST") return json(await addMember(env, who, can, await req.json()));
      if (url.pathname === "/api/members") return json(await searchMembers(env, who, can, url.searchParams.get("q") || ""));
      const ph = url.pathname.match(/^\/api\/members\/(\d+)\/photo$/);
      if (ph && req.method === "POST") return json(await savePhoto(env, who, can, +ph[1], await req.json()));
      if (ph) return memberPhoto(env, who, can, +ph[1]);
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

/* ---------------- setup import ---------------- */
// Loads the GymMaster export into D1 during setup. Locked by the IMPORT_KEY secret,
// which is deleted straight after, so this route answers 404 the rest of the time.
async function adminImport(req, env) {
  const key = req.headers.get("X-M2-Import") || "";
  if (!env.IMPORT_KEY || key.length !== env.IMPORT_KEY.length || key !== env.IMPORT_KEY) return new Response("Not found", { status: 404 });
  const b = await req.json();
  const list = Array.isArray(b.statements) ? b.statements.filter(x => typeof x === "string" && x.trim()) : [];
  let done = 0;
  for (let i = 0; i < list.length; i += 100) {
    await env.DB.batch(list.slice(i, i + 100).map(x => env.DB.prepare(x)));
    done += Math.min(100, list.length - i);
  }
  return json({ ok: true, done });
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

