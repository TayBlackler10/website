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
[hidden]{display:none!important}a.btn{text-decoration:none;display:inline-flex;align-items:center}
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
var JOB_OUTS={new_lead:["joined","call_back","no_answer","not_interested"],missing_billing:["billing_in","call_back","no_answer"],trial_ending:["joined","joining_at_desk","call_back","no_answer","not_interested"],blocked:["paid","call_back","no_answer"],call_back:["joined","paid","call_back","no_answer","not_interested","done"],no_tag:["tag_given","done"],fp_id_gm:["fp_in_gm"],fp_missing:["call_back","no_answer"]};
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
  '<section class="card"><div style="display:flex;gap:12px;align-items:flex-start;flex-wrap:wrap"><div style="margin-right:auto"><h2 style="font-size:26px">'+esc(nm(m))+'</h2><div style="margin-top:6px;display:flex;gap:6px;flex-wrap:wrap"><span class="pill dark">'+esc(ms.plan||m.status)+'</span>'+flags+'</div></div></div>'+
  '<dl class="kv"><dt>Member since</dt><dd>'+esc(day(m.joined_on))+'</dd><dt>Mobile</dt><dd>'+(m.mobile?'<a href="tel:'+esc(m.mobile)+'">'+esc(m.mobile)+'</a>':'<span class="muted">None</span>')+'</dd><dt>Email</dt><dd>'+esc(m.email||"None")+'</dd><dt>Goal</dt><dd>'+esc(m.goal||"Not recorded")+'</dd><dt>Came from</dt><dd>'+esc(m.lead_source||"Not recorded")+'</dd>'+(d.referrer?'<dt>Brought by</dt><dd><a href="#" data-member="'+d.referrer.id+'">'+esc(nm(d.referrer))+'</a></dd>':"")+(d.trainer?'<dt>Trainer</dt><dd>'+esc(d.trainer.name)+'</dd>':"")+(isFp?'<dt>Fitness Passport ID</dt><dd>'+(m.fp_id?esc(m.fp_id)+(m.fp_id_in_gm?"":' <span class="pill warn">Not in GymMaster yet</span>'):'<span class="pill warn">Missing. Passport can\'t pay for their visits</span>')+'</dd>':"")+(m.passport_number&&m.passport_number!==m.fp_id?'<dt>Old number in surname</dt><dd>'+esc(m.passport_number)+'</dd>':"")+'<dt>Visits, all time</dt><dd>'+esc(m.total_visits_gm||0)+'</dd>'+(d.last_visit?'<dt>Last visit</dt><dd>'+esc(day(d.last_visit))+'</dd>':"")+'<dt>Key tag</dt><dd>'+esc(m.key_tag||"None")+'</dd></dl>'+
  (ME.can.add?'<div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn line sm" data-edit="'+id+'">Edit details</button><button class="btn line sm" data-tagfor="'+id+'">'+(m.key_tag?"Replace key tag":"Give key tag")+'</button><button class="btn line sm" data-flagfor="'+id+'">Flags</button></div>':"")+
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
 if(($("#passport").checked||sel.family==="passport")&&!$("#fpid").value.trim()){$("#aErr").textContent="Add their Fitness Passport ID. Passport can't pay us for their visits without it.";$("#fpid").focus();return}
 var body={planId:sel.id,planName:sel.name,first:$("#first").value,last:$("#last").value,email:$("#email").value,mobile:$("#mobile").value,dob:$("#dob").value,gender:$("#gender").value,goal:$("#goal").value,source:$("#source").value,emergencyName:$("#ename").value,emergencyPhone:$("#ephone").value,passport:$("#passport").checked||sel.family==="passport",fpId:$("#fpid").value,referredBy:mate,agreed:$("#agreed").checked,signature:cv.toDataURL("image/png"),confirmDuplicate:!!force};
 $("#aSave").disabled=true;$("#aSave").textContent="Adding...";
 post("/api/members",body).then(function(d){
  $("#aSave").disabled=false;$("#aSave").textContent="Add member";
  if(!d.ok){$("#aErr").textContent=d.error||"Something went wrong.";if(d.canOverride)$("#aAnyway").hidden=false;return}
  newId=d.id;$("#a1").hidden=true;$("#a2").hidden=false;window.scrollTo(0,0);
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
 $("#goal").value="";$("#source").value="";$("#gender").value="";$("#passport").checked=false;$("#fpid").value="";$("#fpWrap").hidden=true;$("#fpGm").hidden=true;$("#billCard").hidden=false;$("#billOpen").hidden=false;$("#agreed").checked=false;$("#billDone").checked=false;$("#mateWrap").hidden=false;
 $("#tagOk").innerHTML="";$("#mateSel").textContent="";$("#qr").hidden=true;$("#finErr").dataset.warned="";sel=null;mate=null;newId=null;if(PL)drawPlans();sizeSig();
}
</script></body></html>`;
