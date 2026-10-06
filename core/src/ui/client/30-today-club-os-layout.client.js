/* ---------- Today: Club OS layout ---------- */
function kfmt(n){n=Math.round(+n||0);return n>=1e6?"$"+(n/1e6).toFixed(1)+"m":n>=1e4?"$"+Math.round(n/1e3)+"k":n>=1e3?"$"+(n/1e3).toFixed(1)+"k":"$"+n}
function ini(n){return String(n||"").split(" ").map(function(x){return x[0]||""}).join("").slice(0,2).toUpperCase()}
function hhmm(s){return String(s||"").slice(11,16)}
var ASKS=["Who owes money but trained this week?","Perform members who haven't been in 14 days","Daily members ready for Perform","Passport members under once a week","How much do overdue members owe?","Who has a one-year anniversary this week?","Newer members who haven't used their free PT","What's the debit run this week?"];
function loadHome(){
 $("#todayDate").textContent=new Date().toLocaleDateString("en-NZ",{weekday:"long",day:"numeric",month:"long"});
 var biz=ME&&ME.can.business, col=ME&&ME.can.collections;
 $("#tAsk").innerHTML=ASKS.filter(function(q){return biz||!/debit run|how much/i.test(q)}).slice(0,5).map(function(q){return '<button class="chipq" data-ask="'+esc(q)+'">'+esc(q)+'</button>'}).join("");
 get("/api/home").then(function(d){
  if(d.error)return;
  var st='<div class="hs"><b>'+d.in_now+'</b><span>In the club now</span><small>Last 90 minutes'+(d.last_checkin?", last tap "+hhmm(d.last_checkin):"")+'</small></div><div class="hs"><b>'+d.checkins.toLocaleString("en-NZ")+'</b><span>Check-ins today</span><small>Gate and app</small></div>';
  if(d.debit_run)st+='<div class="hs"><b>'+kfmt(d.debit_run.total)+'</b><span>Debits next 7 days</span><small>'+d.debit_run.n.toLocaleString("en-NZ")+' debits'+(d.debit_run.tomorrow?", tomorrow "+kfmt(d.debit_run.tomorrow.total):"")+'</small></div>';
  if(d.money)st+='<div class="hs"><b class="l">'+kfmt(d.money.total)+'</b><span>On the table this year</span><small>'+d.money.plays.length+' plays ready to run</small></div>';
  $("#hStats").innerHTML=st;
  if(d.money){$("#tMoney").hidden=false;$("#tMoneyL").innerHTML=d.money.plays.map(function(p){return '<div class="prow" data-play="'+p.id+'" style="cursor:pointer"><div class="g"><div class="t">'+esc(p.title)+'</div><div class="s">'+p.n.toLocaleString("en-NZ")+' members</div></div><span class="pv">'+kfmt(p.value)+'</span></div>'}).join("")}
  else{$("#tRow1").classList.add("even")}
  $("#tDoorL").innerHTML=(d.feed||[]).map(function(r){return '<div class="prow" data-member="'+r.id+'" style="cursor:pointer"><div class="avi">'+esc(ini(r.name))+'</div><div class="g"><div class="t" style="color:#fff">'+esc(r.name)+'</div><div class="s">'+esc(r.plan||"")+(r.owes?' · <span style="color:#FF8A7A">owes '+money(r.owes)+'</span>':"")+(r.anniversary?' · <span style="color:var(--lime)">1 year this week</span>':"")+'</div></div><span class="muted" style="color:#9A9A92;white-space:nowrap">'+esc(hhmm(r.at))+'</span></div>'}).join("")||'<div class="muted" style="color:#9A9A92">No check-ins in the last two days.</div>';
  if(d.calls){$("#tCalls").hidden=false;$("#tCallsN").textContent=d.red_total?d.red_total+" on the red list":"Highest risk first";
   $("#tCallsL").innerHTML=d.calls.length?d.calls.map(callRow).join(""):'<div class="ok">Nobody on the red list needs a call right now.</div>'}
  if(d.weekly){$("#tRev").hidden=false;drawRev(d.weekly)}
  if(d.heads){var h=d.heads,a=[];
   if(h.anniversaries)a.push('<div class="alert lime"><b>'+h.anniversaries+' one-year anniversar'+(h.anniversaries>1?"ies":"y")+' this week</b>Passport members are left out.</div>');
   if(h.no_pt)a.push('<div class="alert amber"><b>'+h.no_pt+' newer members haven\'t used their free PT</b>'+(biz?'Send them to Tim from Money on the table.':'Mention it when they come in.')+'</div>');
   (h.events||[]).forEach(function(e){a.push('<div class="alert blue"><b>Coming up</b>'+esc(e)+'</div>')});
   if(h.big_debts)a.push('<div class="alert red"><b>'+h.big_debts+' members owe more than $1,000</b>Settlement offers first. Never refer anyone under $1,000 to Marshall Freeman.</div>');
   $("#tHeads").hidden=!a.length;$("#tHeadsL").innerHTML=a.join("")}
 });
 get("/api/classes").then(function(c){
  if(c.error){$("#tNext").innerHTML='<div class="muted">'+esc(c.error)+'</div>';return}
  var now=new Date().toTimeString().slice(0,5),td=(c.classes||[]).filter(function(x){return x.day===c.today&&String(x.start)>=now}).sort(function(a,b){return String(a.start).localeCompare(String(b.start))});
  var n=td[0];if(!n){$("#tNext").innerHTML='<div class="muted">No more classes today.</div>';return}
  var full=n.max&&n.booked>=n.max;
  $("#tNext").innerHTML='<div style="font:900 40px/1 Archivo,Arial,sans-serif">'+esc(String(n.start).slice(0,5))+'</div><div style="font-weight:600;margin-top:6px">'+esc(n.name)+(n.coach?" · "+esc(n.coach):"")+'</div><div class="capbar"><i class="'+(full?"full":"")+'" style="width:'+(n.max?Math.min(100,Math.round(n.booked/n.max*100)):0)+'%"></i></div><div class="muted" style="margin-top:8px">'+n.booked+' of '+n.max+' booked'+(n.waitlist?", "+n.waitlist+" on the waitlist":"")+'</div><div class="alert amber" style="margin-top:4px"><b>Cap enforced</b>Booking stops at '+n.max+'. The waitlist gets the spot if someone cancels.</div>';
 });
}
function callRow(m){return '<div class="prow" data-callrow="'+m.id+'"><div class="avi">'+esc(ini(m.name))+'</div><div class="g"><div class="t" data-member="'+m.id+'" style="cursor:pointer">'+esc(m.name)+'</div><div class="s">'+esc((m.reasons||[]).join(", ")||m.why||"")+'</div></div>'+(m.mobile?'<a class="btn line sm" href="tel:'+esc(m.mobile)+'">Call</a>':"")+'<button class="btn sm dark" data-log="'+m.id+'">Log</button></div>'}
function drawRev(w){
 var max=Math.max.apply(null,w.map(function(x){return x.total}).concat([1])),H=150,bars="";
 w.forEach(function(x,i){var h=Math.max(2,x.total/max*H),X=i*50+6,last=i===w.length-1;
  bars+='<rect x="'+X+'" y="'+(170-h)+'" width="38" height="'+h+'" rx="6" fill="'+(last?"#0A0A0A":"#E2E2DC")+'"><title>'+esc(day(x.from))+": "+money(x.total)+'</title></rect>'+(last?'<circle cx="'+(X+19)+'" cy="'+(170-h+12)+'" r="4" fill="#DFFF00"/>':"")+'<text x="'+(X+19)+'" y="190" text-anchor="middle" font-size="11" fill="#5B5B55">'+esc(day(x.from).replace(/ \d{2}$/,""))+'</text>'});
 var cur=w[w.length-1],prev=w[w.length-2];
 $("#tRevC").innerHTML='<svg viewBox="0 0 600 200" role="img" aria-label="Weekly revenue, last 12 weeks" style="width:100%;height:auto;display:block">'+bars+'</svg><div class="muted">This week so far '+money(cur.total)+(prev?", last week "+money(prev.total):"")+'</div>';
}
document.addEventListener("click",function(e){
 var b=e.target.closest("[data-log]");if(b){var id=b.dataset.log,row=b.closest(".prow");
  if(row.querySelector(".logouts"))return;
  var o=document.createElement("div");o.className="logouts";o.style.cssText="display:flex;gap:6px;flex-wrap:wrap;flex-basis:100%;margin-top:6px";
  o.innerHTML=[["answered","Spoke to them"],["no_answer","No answer"],["message","Left a message"]].map(function(x){return '<button class="btn sm line" data-logout="'+x[0]+'" data-id="'+id+'">'+x[1]+'</button>'}).join("");
  row.style.flexWrap="wrap";row.appendChild(o);return}
 var lo=e.target.closest("[data-logout]");if(lo){var r=lo.closest(".prow");lo.disabled=true;
  post("/api/members/"+lo.dataset.id+"/call",{outcome:lo.dataset.logout,from:document.querySelector("#pm:not([hidden])")?$("#pmTitle").textContent:"Bekka's calls"}).then(function(x){
   if(x.error){lo.disabled=false;alert(x.error);return}r.querySelector(".logouts").outerHTML='<span class="pill ok" style="margin-top:6px">Logged</span>';var lb=r.querySelector("[data-log]");if(lb)lb.remove()});return}
 var ak=e.target.closest("[data-ask]");if(ak){openAsk(ak.dataset.ask);return}
 var pl=e.target.closest("[data-play]");if(pl&&!e.target.closest("[data-act]")){openPlay(pl.dataset.play);return}
});

