/* ---------- billing ---------- */
var BIL={day:null,data:null,ready:null,rk:"all"};
var BMODE={preview:["Preview","Not connected to Ezidebit yet. GymMaster still takes every debit. This page shows exactly what the Core would take, so the two can be compared before anyone moves."],sandbox:["Sandbox","Connected to Ezidebit's test system. Only members moved to the Core get test debits. No real money moves."],ready:["Live key in","The live Ezidebit key is in. Debits start once BILLING_MODE is switched to ezidebit in Cloudflare."],live:["Live","The Core sends real debits to Ezidebit for members moved across. Everyone else is still billed by GymMaster."]};
var BKIND={regular:"Debit",one_off:"One-off",retry:"Retry",fee:"Fee",arrangement:"Payment plan"};
var BSTAT={preview:"Would debit",planned:"Planned",sending:"Sending",sent:"With Ezidebit",paid:"Paid",failed:"Failed",unknown:"Check in Ezidebit",reversed:"Taken back",cancelled:"Cancelled",waived:"Waived",due:"Due"};
var FREQ={weekly:"weekly",fortnightly:"fortnightly",monthly:"monthly",quarterly:"quarterly",yearly:"yearly"};
var RKIND={no_method:"No bank details",amount:"Amount differs, unexplained",arrears:"Collecting money owed",credit:"Credit or free weeks",no_plan:"No plan in the Core",no_price:"No price",no_freq:"How often unknown",no_date:"No date",ezi_stopped:"Ezidebit stopped debiting",ezi_unchecked:"Not confirmed in Ezidebit"};
function wd(iso){return new Date(iso+"T12:00:00").toLocaleDateString("en-NZ",{weekday:"short",day:"numeric",month:"short"})}
function loadBill(){
 get("/api/billing").then(function(d){
  if(d.error){$("#bilTiles").innerHTML='<div class="err">'+esc(d.error)+'</div>';return}
  BIL.data=d;var M=BMODE[d.mode.kind]||[d.mode.kind,""],c=d.counts;
  $("#bilMode").textContent=M[0];$("#bilBanner").textContent=M[1];
  var t=tile(c.members.toLocaleString("en-NZ"),"Members on a debit")+tile(c.core,"Billed by the Core")+tile(c.no_method,"No bank or card details")+tile(c.issues,"Need a look before the move");
  if(d.money)t=tile(whole$(d.money.weekly),"Billed per week")+tile(whole$(d.money.next7),"Next 7 days")+tile(whole$(d.money.next28),"Next 4 weeks")+t+(d.money.failed_sum?tile(whole$(d.money.failed_sum),"Failed, last 60 days"):"");
  $("#bilTiles").innerHTML=t;
  if(d.cost){var C=d.cost;$("#bilCostCard").hidden=false;
   var verdict=C.after==null?'<div class="warnbox" style="margin-top:10px">Waiting on GymMaster\'s doors-only price to compare.</div>':(C.after<C.gm_now?'<div class="ok" style="margin-top:10px">Cheaper: '+money(C.after)+' a month (Ezidebit fees plus GymMaster doors) against '+money(C.gm_now)+' now. Saves '+money(C.gm_now-C.after)+' a month.</div>':'<div class="err" style="margin-top:10px">Dearer: '+money(C.after)+' a month (Ezidebit fees plus GymMaster doors) against '+money(C.gm_now)+' now. Don\'t switch until this changes.</div>');
   $("#bilCost").innerHTML='<div class="tiles">'+tile(C.debits_month.toLocaleString("en-NZ"),"Debits a month")+tile(money(C.fees_month),"Ezidebit fees a month"+(C.fee_confirmed?"":" (published fee)"))+tile(money(C.per_member),"Per member a month")+tile(money(C.fortnightly.fees_month),"If weekly payers went fortnightly")+'</div>'+
    '<p class="muted" style="font-size:13px;margin-top:8px">'+Object.keys(C.by_freq).map(function(k){return C.by_freq[k]+" "+k}).join(", ")+'. Failed debits about '+C.fail_rate+'% of debits.</p>'+verdict+
    (ME.can.settings?'<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:10px;margin-top:12px"><label class="fld">Fee per debit ($)<input id="bcFee" inputmode="decimal" value="'+C.debit_fee+'"></label><label class="fld">Fee per failed debit ($)<input id="bcDis" inputmode="decimal" value="'+C.dishonour_fee+'"></label><label class="fld">GymMaster now ($/month)<input id="bcGm" inputmode="decimal" value="'+C.gm_now+'"></label><label class="fld">GymMaster doors only ($/month)<input id="bcDoors" inputmode="decimal" value="'+(C.gm_doors==null?"":C.gm_doors)+'" placeholder="Waiting on quote"></label></div><label class="chk" style="margin-top:6px"><input type="checkbox" id="bcConf"'+(C.fee_confirmed?" checked":"")+'> Ezidebit has confirmed M2\'s fee</label><button class="btn dark sm" id="bcSave" style="margin-top:8px">Save</button><span id="bcMsg"></span>':"");
   var sv=$("#bcSave");if(sv)sv.onclick=function(){post("/api/billing/rules",{bill_debit_fee:$("#bcFee").value,bill_dishonour_fee:$("#bcDis").value,bill_gm_cost:$("#bcGm").value,bill_gm_doors_cost:$("#bcDoors").value,bill_fee_confirmed:$("#bcConf").checked?1:0}).then(function(r){if(!r.ok){$("#bcMsg").innerHTML=' <span class="err">'+esc(r.error)+'</span>';return}loadBill()})}}
  $("#bilSteps").innerHTML=d.steps.map(function(s){return '<div class="'+(s.done?"y":"")+'"><i>'+(s.done?"&#10003;":"")+'</i><span>'+esc(s.t)+'</span></div>'}).join("")+(d.last_run?'<div class="muted" style="font-size:13px">Last run '+esc(ago(d.last_run.at.replace("T"," ").slice(0,16)))+': '+(d.last_run.preview||0)+' previewed, '+(d.last_run.sent||0)+' sent'+(d.last_run.errors&&d.last_run.errors.length?', '+d.last_run.errors.length+' problems':"")+'.</div>':'<div class="muted" style="font-size:13px">First run tonight at 2:15am.</div>');
  var wkStart=new Date(d.today+"T12:00:00").getDay();
  $("#bilCal").innerHTML=d.days.map(function(x,i){var dt=new Date(x.date+"T12:00:00");return '<button class="bd'+(x.date===(BIL.day||d.today)?" on":"")+(x.n?"":" zero")+(dt.getDay()===1?" wk":"")+'" data-bday="'+x.date+'"><b>'+esc(wd(x.date))+'</b><span class="c">'+x.n+'</span><span class="t">'+(x.total!=null?whole$(x.total):(x.n===1?"debit":"debits"))+(x.skipped?" &middot; "+x.skipped+" skipped":"")+'</span></button>'}).join("");
  var fl=d.failed||[];
  $("#bilFailed").innerHTML=fl.length?table([["Name",function(x){return '<a href="#" data-member="'+x.member_id+'">'+esc(nm(x))+'</a>'},0,1],["Date",function(x){return day(x.debit_date)}],["Amount",function(x){return money(x.amount)},1],["Why",function(x){return x.failure_reason||""}],["Retry",function(x){return x.retry_pending?'<span class="pill">Booked</span>':'<span class="pill warn">None</span>'},0,1]],fl):'<div class="ok">No failed debits. '+(d.mode.kind==="preview"?"They'll show here once Ezidebit is connected. Until then GymMaster's failed payments are in Money owed.":"")+'</div>';
  $("#bilLog").innerHTML=(d.events||[]).map(function(e){return '<div><span>'+esc(day(e.at))+'</span><span>'+(e.member_id?'<a href="#" data-member="'+e.member_id+'">'+esc(nm(e))+'</a>: ':"")+esc(e.detail)+(e.staff?' <span class="muted">'+esc(e.staff)+'</span>':"")+'</span></div>'}).join("")||'<p class="muted" style="margin:0">Nothing yet.</p>';
  if(ME.can.settings){var r=d.rules;$("#bilRulesCard").hidden=false;$("#brLead").value=r.lead_days;$("#brFee").value=r.failed_fee;$("#brRetry").value=r.retry_days;$("#brMax").value=r.max_retries}
  loadBillDay(BIL.day||d.today);
 });
 get("/api/billing/ready").then(function(r){BIL.ready=r;drawReady()});
}
function drawReady(){
 var r=BIL.ready;if(!r)return;if(r.error){$("#bilReady").innerHTML='<div class="err">'+esc(r.error)+'</div>';return}
 $("#bilReadyNote").textContent=r.clean.toLocaleString("en-NZ")+" of "+r.total.toLocaleString("en-NZ")+" members are ready to move";
 var tabs=[["all","Everything",r.rows.length]].concat(Object.keys(r.kinds).map(function(k){return [k,RKIND[k]||k,r.kinds[k]]}));
 $("#bilReadyTabs").innerHTML=tabs.map(function(t){return '<button class="chip'+(BIL.rk===t[0]?" on":"")+'" data-rk="'+t[0]+'">'+esc(t[1])+' '+t[2]+'</button>'}).join("");
 var rows=r.rows.filter(function(x){return BIL.rk==="all"||x.k===BIL.rk});
 var lim=BIL.rall?600:25;
 $("#bilReady").innerHTML=rows.length?table([["Name",function(x){return '<a href="#" data-member="'+x.id+'">'+esc(nm(x))+'</a>'},0,1],["Plan","plan"],["What's wrong","t"],["GymMaster says",function(x){return x.gm||""}]],rows.slice(0,lim))+(rows.length>lim?'<button class="btn line sm" id="bilAll" style="margin-top:8px">Show all '+rows.length+'</button>':""):'<div class="ok">Everyone is ready.</div>';
 var ba=$("#bilAll");if(ba)ba.onclick=function(){BIL.rall=true;drawReady()};
}
function loadBillDay(dt){
 BIL.day=dt;$$("#bilCal .bd").forEach(function(b){b.classList.toggle("on",b.dataset.bday===dt)});
 $("#bilDay").innerHTML='<div class="muted">Loading...</div>';
 get("/api/billing/day?date="+dt).then(function(d){
  if(d.error){$("#bilDay").innerHTML='<div class="err">'+esc(d.error)+'</div>';return}
  var h='<h3 style="margin:8px 0 0">'+esc(wd(dt))+': '+d.rows.length+' debits'+(d.total!=null?", "+money(d.total):"")+'</h3>';
  h+=d.rows.length?table([["Name",function(x){return '<a href="#" data-member="'+x.id+'">'+esc(nm(x))+'</a>'},0,1],["Plan",function(x){return (x.plan||"")+(x.freq?", "+FREQ[x.freq]:"")}],["Amount",function(x){return money(x.amount)},1],["Billed by",function(x){return x.by==="core"?'<span class="pill dark">Core</span>':'<span class="pill">GymMaster</span>'},0,1],["",function(x){return x.status?'<span class="pill'+(x.status==="paid"?" ok":x.status==="failed"?" warn":"")+'">'+esc(BSTAT[x.status]||x.status)+'</span>':""},0,1]],d.rows):'<div class="muted">No debits this day.</div>';
  if(d.extras&&d.extras.length)h+='<h3 style="margin:10px 0 0">Extras</h3>'+table([["Name",function(x){return '<a href="#" data-member="'+x.id_m+'">'+esc(nm(x))+'</a>'},0,1],["What",function(x){return BKIND[x.kind]+(x.note?": "+x.note:"")}],["Amount",function(x){return money(x.amount)},1],["",function(x){return '<span class="pill">'+esc(BSTAT[x.status]||x.status)+'</span>'},0,1]],d.extras);
  if(d.skipped.length)h+='<details style="margin-top:8px"><summary class="muted" style="cursor:pointer">'+d.skipped.length+' skipped this day</summary>'+table([["Name",function(x){return '<a href="#" data-member="'+x.id+'">'+esc(nm(x))+'</a>'},0,1],["Would have been",function(x){return money(x.amount)},1],["Why not","why"]],d.skipped)+'</details>';
  $("#bilDay").innerHTML=h;
 });
}
$("#bilCal").addEventListener("click",function(e){var b=e.target.closest("[data-bday]");if(b)loadBillDay(b.dataset.bday)});
$("#bilReadyTabs").addEventListener("click",function(e){var b=e.target.closest("[data-rk]");if(!b)return;BIL.rk=b.dataset.rk;BIL.rall=false;drawReady()});
function brMsg(h){$("#brMsg").innerHTML=h}
$("#brSave").addEventListener("click",function(){post("/api/billing/rules",{bill_lead_days:$("#brLead").value,bill_failed_fee:$("#brFee").value,bill_retry_days:$("#brRetry").value,bill_max_retries:$("#brMax").value}).then(function(r){brMsg(r.ok?'<div class="ok">Saved.</div>':'<div class="err">'+esc(r.error)+'</div>')})});
$("#brTest").addEventListener("click",function(){brMsg('<div class="muted">Asking Ezidebit...</div>');post("/api/billing/test").then(function(r){brMsg(r.ok?'<div class="ok">Ezidebit answered'+(r.sandbox?" (sandbox)":" (live)")+'. The key works.</div>':'<div class="err">'+esc(r.error||"No answer")+'</div>')})});
$("#brRun").addEventListener("click",function(){var b=this;b.disabled=true;brMsg('<div class="muted">Running...</div>');post("/api/billing/run").then(function(r){b.disabled=false;brMsg('<div class="ok">Done: '+(r.preview||0)+' previewed, '+(r.planned||0)+' planned, '+(r.sent||0)+' sent'+(r.errors&&r.errors.length?'. Problems: '+esc(r.errors.slice(0,3).join("; ")):"")+'.</div>');loadBill()})});

/* member billing card */
function loadMemberBill(id){
 var box=$("#billBox");if(!box)return;box.innerHTML='<section class="card"><h2>Billing</h2><div class="muted">Loading...</div></section>';
 get("/api/billing/member/"+id).then(function(b){drawMemberBill(id,b)});
}
function drawMemberBill(id,b){
 var box=$("#billBox");if(!box)return;
 if(b.error){box.innerHTML='';return}
 var bank=ME.can.add?'<button class="btn line sm" data-bill="'+id+'">Enter or update bank details</button>':"";
 if(b.none){box.innerHTML='<section class="card"><h2>Billing</h2><div class="muted">Not on a direct debit plan.</div>'+(b.items.length?billHist(b):"")+bank+'</section>';return}
 var core=b.billed_by==="core",st=b.state==="hold"?'<span class="pill warn">On hold</span>':b.state==="cancelled"?'<span class="pill warn">Billing stopped</span>':'<span class="pill ok">Active</span>';
 var h='<section class="card"><div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap"><h2 style="margin-right:auto">Billing</h2>'+st+(core?'<span class="pill dark">Billed by the Core</span>':'<span class="pill">Billed by GymMaster</span>')+'</div>';
 if(b.owing>0)h+='<div class="warnbox">Owes <b>'+money(b.owing)+'</b></div>';
 if(!core)h+='<div class="muted" style="font-size:13px">GymMaster still takes this member\'s debits. Changes here are planned in the Core only, so make the same change in GymMaster until they move across.</div>';
 h+='<dl class="kv"><dt>Plan</dt><dd>'+esc(b.plan||"-")+'</dd><dt>Debit</dt><dd>'+(b.base?money(b.amount_override||b.base)+" "+esc(FREQ[b.freq]||"")+(b.amount_override?' <span class="pill">Changed from '+money(b.base)+'</span>':""):"-")+'</dd><dt>Next debit</dt><dd>'+(b.coming[0]?esc(wd(b.coming[0].date))+", "+money(b.coming[0].amount)+(b.coming[0].skip?' <span class="pill warn">'+esc(b.coming[0].skip)+'</span>':""):"-")+'</dd>'+(b.gm_next&&!core?'<dt>GymMaster says</dt><dd>'+esc(b.gm_next)+'</dd>':"")+(b.method?'<dt>Paying by</dt><dd>'+esc(b.method)+'</dd>':"")+(b.state==="hold"?'<dt>Hold</dt><dd>'+esc((b.hold_from?day(b.hold_from):"Now")+" to "+(b.hold_to?day(b.hold_to):"further notice"))+(b.hold_reason?". "+esc(b.hold_reason):"")+'</dd>':"")+(b.arrangement_extra?'<dt>Payment plan</dt><dd>Extra '+money(b.arrangement_extra)+' each debit'+(b.arrangement_note?". "+esc(b.arrangement_note):"")+'</dd>':"")+(b.min_term_end&&b.min_term_end>=new Date().toISOString().slice(0,10)?'<dt>Lock-in ends</dt><dd>'+esc(day(b.min_term_end))+'</dd>':"")+'</dl>';
 b.issues.filter(function(i){return i.k!=="gifted"}).forEach(function(i){h+='<div class="warnbox" style="padding:8px 12px">'+esc(i.t)+'</div>'});
 if(b.coming.length>1)h+='<div class="muted" style="font-size:13px">Coming up: '+b.coming.slice(1).map(function(x){return esc(wd(x.date))+" "+money(x.amount)+(x.skip?" (skipped)":"")}).join(", ")+'</div>';
 if(b.can_act){
  h+='<div style="display:flex;gap:6px;flex-wrap:wrap">'+(b.state==="hold"?'<button class="btn line sm" data-ba="resume">Take off hold</button>':'<button class="btn line sm" data-ba="hold">Put on hold</button>')+'<button class="btn line sm" data-ba="amount">Change amount</button><button class="btn line sm" data-ba="one_off">One-off charge</button><button class="btn line sm" data-ba="arrangement">'+(b.arrangement_extra?"Change payment plan":"Payment plan")+'</button>'+(b.state==="cancelled"?'<button class="btn line sm" data-ba="restart">Restart billing</button>':'<button class="btn line sm" data-ba="cancel">Stop billing</button>')+(b.can_switch?(core?'<button class="btn line sm" data-ba="back">Move back to GymMaster</button>':'<button class="btn dark sm" data-ba="switch">Move billing to the Core</button>'):"")+(b.mode!=="preview"?'<button class="btn line sm" data-ba="method">Check Ezidebit</button>':"")+bank+'</div><div id="billForm"></div>';
 } else h+=bank;
 h+=billHist(b)+'</section>';
 box.innerHTML=h;box.dataset.id=id;BIL.cur=b;
}
function billHist(b){
 var rows=(b.items||[]).map(function(x){return '<div><span>'+esc(day(x.debit_date))+'</span><span>'+esc(BKIND[x.kind]||x.kind)+' '+money(x.amount)+' <span class="pill'+(x.status==="paid"?" ok":x.status==="failed"?" warn":"")+'">'+esc(BSTAT[x.status]||x.status)+'</span>'+(x.failure_reason?' <span class="muted">'+esc(x.failure_reason)+'</span>':"")+((x.status==="failed"||x.status==="reversed")&&b.can_act?' <a href="#" data-bi="'+x.id+'" data-bia="retry">Retry</a> &middot; <a href="#" data-bi="'+x.id+'" data-bia="fee">Add fee</a> &middot; <a href="#" data-bi="'+x.id+'" data-bia="waive">Waive</a>':"")+'</span></div>'}).join("");
 var ev=(b.events||[]).map(function(e){return '<div><span>'+esc(day(e.at))+'</span><span>'+esc(e.detail)+(e.staff?' <span class="muted">'+esc(e.staff)+'</span>':"")+'</span></div>'}).join("");
 return (rows||ev)?'<details><summary class="muted" style="cursor:pointer">Debits and changes</summary><div class="hist">'+rows+ev+'</div></details>':"";
}
var BFORM={
 hold:'<label class="fld">From<input type="date" id="bf1"></label><label class="fld">Until (blank for no end)<input type="date" id="bf2"></label><label class="fld">Why<input id="bf3" placeholder="Injury, travel"></label>',
 amount:'<label class="fld">New amount ($)<input id="bf1" inputmode="decimal" placeholder="49.50"></label><label class="fld">From<input type="date" id="bf2"></label>',
 one_off:'<label class="fld">Amount ($)<input id="bf1" inputmode="decimal"></label><label class="fld">Date<input type="date" id="bf2"></label><label class="fld">For<input id="bf3" placeholder="PT session, merch"></label>',
 arrangement:'<label class="fld">Extra each debit ($)<input id="bf1" inputmode="decimal" placeholder="20.00"></label><label class="fld">Note<input id="bf3" placeholder="Agreed with Bekka"></label>',
 cancel:'<label class="fld">Why is billing stopping?<input id="bf3" placeholder="Cancelled after lock-in"></label>',
 retry:'<label class="fld">Try again on<input type="date" id="bf2"></label>',
 fee:'<label class="fld">Fee ($)<input id="bf1" inputmode="decimal"></label>',
 waive:'<label class="fld">Why<input id="bf3"></label>'
};
function billGo(id,body,form){post("/api/billing/member/"+id,body).then(function(r){if(!r.ok){var e=$("#bfErr");if(e)e.textContent=r.error;else alert(r.error);return}if(r.warning)alert(r.warning);loadMemberBill(id)})}
// Moving to the Core: the server looks the member up in Ezidebit first. If it can't find them, ask for their Ezidebit customer ID;
// if the name on the Ezidebit record differs, ask staff to confirm.
function billSwitch(id,extra){
 var body={action:"switch",to:"core"};for(var k in extra)body[k]=extra[k];
 post("/api/billing/member/"+id,body).then(function(r){
  if(r.ok){if(r.warning)alert(r.warning);loadMemberBill(id);return}
  if(r.confirm_name){if(confirm(r.error))billSwitch(id,{ezidebit_id:body.ezidebit_id,name_ok:1});return}
  if(r.ask_id){var v=prompt(r.error+"\n\nEzidebit customer ID:");if(v&&v.trim())billSwitch(id,{ezidebit_id:v.trim()});return}
  alert(r.error)})
}
document.addEventListener("click",function(e){
 var t=e.target.closest("[data-ba]"),u=e.target.closest("[data-bia]");if(!t&&!u)return;e.preventDefault();
 var box=$("#billBox"),id=+box.dataset.id,a=t?t.dataset.ba:u.dataset.bia,item=u?+u.dataset.bi:null;
 if(a==="resume"||a==="restart"){billGo(id,{action:a});return}
 if(a==="method"){post("/api/billing/member/"+id,{action:"method"}).then(function(r){alert(r.ok?"Ezidebit: "+r.method+(r.status?", "+r.status:"")+(r.processing===false?". Ezidebit won't debit them until their details are fixed.":""):r.error);loadMemberBill(id)});return}
 if(a==="switch"){if(!confirm("Move this member's billing to the Core? The Core checks them in Ezidebit first. Turn their billing off in GymMaster straight after, or they'll be charged twice."))return;billSwitch(id,{});return}
 if(a==="back"){if(!confirm("Move billing back to GymMaster? Anything already sent to Ezidebit for them is pulled back."))return;billGo(id,{action:"switch",to:"gymmaster"});return}
 if(a==="fee"&&BIL.data&&BIL.data.rules)BFORM.fee='<label class="fld">Fee ($)<input id="bf1" inputmode="decimal" value="'+(BIL.data.rules.failed_fee||"")+'"></label>';
 $("#billForm").innerHTML='<div class="bform">'+BFORM[a]+'<button class="btn dark sm" id="bfGo">Save</button><button class="btn line sm" id="bfNo">Cancel</button><div class="err" id="bfErr" style="width:100%"></div></div>';
 $("#bfNo").onclick=function(){$("#billForm").innerHTML=""};
 $("#bfGo").onclick=function(){var v=function(k){var el=$("#"+k);return el?el.value:""};
  var body={action:a,item:item};
  if(a==="hold"){body.from=v("bf1");body.to=v("bf2");body.reason=v("bf3")}
  if(a==="amount"){body.amount=v("bf1");body.from=v("bf2")}
  if(a==="one_off"){body.amount=v("bf1");body.date=v("bf2");body.note=v("bf3")}
  if(a==="arrangement"){body.extra=v("bf1");body.note=v("bf3")}
  if(a==="cancel"){body.reason=v("bf3")}
  if(a==="retry"){body.date=v("bf2")}
  if(a==="fee"){body.amount=v("bf1")}
  if(a==="waive"){body.note=v("bf3")}
  billGo(id,body)};
});

