/* ---------- PT leads (owners) ---------- */
var PT={data:null,tab:"open",pick:{}};
var PTST={assigned:["With the trainer",""],contacted:["Contacted",""],booked:["Session booked","ok"],client:["Became a client","dark"],lost:["Not going ahead","warn"],"new":["Waiting","warn"]};
function ptCount(){get("/api/pt").then(function(d){if(d.error)return;var n=d.waiting.length;$("#ctPt").hidden=!n;$("#ctPt").textContent=n})}
function ptAns(l){return '<dl class="ptans">'+(l.reason?'<dt>Why</dt><dd>'+esc(l.reason)+'</dd>':"")+(l.wants?'<dt>Wants</dt><dd>'+esc(l.wants)+'</dd>':"")+(l.style?'<dt>Training style</dt><dd>'+esc(l.style)+'</dd>':"")+(l.best_time?'<dt>Best time</dt><dd>'+esc(l.best_time)+'</dd>':"")+(l.injuries?'<dt>Injuries</dt><dd>'+esc(l.injuries)+'</dd>':"")+'<dt>Contact</dt><dd>'+(l.mobile?'<a href="tel:'+esc(l.mobile)+'">'+esc(l.mobile)+'</a>':"No mobile")+(l.email?" \u00b7 "+esc(l.email):"")+'</dd></dl>'}
function ptAgo(s){return s?ago(String(s).slice(0,16)):""}
function loadPt(){
 get("/api/pt").then(function(d){
  if(d.error){$("#ptWait").innerHTML='<div class="err">'+esc(d.error)+'</div>';return}
  PT.data=d;var st=d.stats||{};
  $("#ctPt").hidden=!d.waiting.length;$("#ctPt").textContent=d.waiting.length;
  $("#ptTiles").innerHTML=tile(d.waiting.length,"Waiting for you")+tile(d.open.length,"With trainers now")+tile(st.n||0,"Came in, last 30 days")+tile(st.won||0,"Became clients, last 30 days")+tile(st.hours_to_assign!=null?(st.hours_to_assign<48?Math.round(st.hours_to_assign)+" h":Math.round(st.hours_to_assign/24)+" days"):"-","Average time to hand out");
  $("#ptNote").textContent="New requests come in from the free PT form every 15 minutes"+(d.last_sync?", last checked "+ago(d.last_sync.replace("T"," ").slice(0,16)):"")+". "+(d.sheet_linked?"Trainers also see them on the old PT board until everyone has moved over.":"Trainers using the old PT board won't see Core assignments until the PT_ADMIN_KEY secret is added to m2-core.");
  var T=d.trainers;
  $("#ptWait").innerHTML=d.waiting.length?d.waiting.map(function(l){var fresh=lAge(l)<1;return '<div class="ptcard'+(fresh?" fresh":"")+'" data-pt="'+l.id+'"><div style="display:flex;gap:10px;align-items:baseline;flex-wrap:wrap"><h3 style="margin:0;font-size:18px">'+esc(l.name||"No name")+'</h3><span class="age'+(lAge(l)>1?" late":"")+'">'+esc(ptAgo(l.created_at))+'</span>'+(l.source?'<span class="muted" style="font-size:13px">'+esc(l.source)+'</span>':"")+'</div>'+ptAns(l)+
   '<div class="ptwho">'+T.map(function(t){return '<button data-ptwho="'+t.id+'" class="'+(PT.pick[l.id]===t.id?"on":"")+'">'+esc(t.name.split(" ")[0])+'<span>'+t.open+(t.phones?" \ud83d\udd14":"")+'</span></button>'}).join("")+'</div>'+
   '<div style="display:flex;gap:8px;flex-wrap:wrap"><input data-ptnote placeholder="Note for the trainer (optional)" style="flex:1;min-width:180px;height:42px;border:1px solid var(--line);border-radius:12px;padding:0 12px"><button class="btn dark sm" data-ptgive style="height:42px">Give to '+(PT.pick[l.id]?esc((T.find(function(t){return t.id===PT.pick[l.id]})||{name:"them"}).name.split(" ")[0]):"a trainer")+'</button></div><div data-pterr></div></div>'}).join(""):'<div class="ok">Nothing waiting. Every lead has a trainer.</div>';
  $("#ptTrainers").innerHTML='<div class="tline" style="border:0;color:var(--muted);font-size:12px"><span>Trainer</span><span>Open</span><span>30 days</span><span>Won</span></div>'+T.map(function(t){return '<div class="tline"><span><b>'+esc(t.name)+'</b>'+(t.phones?' <span title="Notifications on">\ud83d\udd14</span>':"")+'</span><span>'+t.open+(t.late?' <span class="pill warn" title="Given out over 24 hours ago and not called">'+t.late+' late</span>':"")+'</span><span>'+t.month+'</span><span>'+t.won+'</span></div>'}).join("");
  drawPtOpen();
  pushBox($("#ptPush"));
 });
}
function drawPtOpen(){
 var d=PT.data,rows=PT.tab==="open"?d.open:d.closed;
 $("#ptTabs").innerHTML='<button class="chip'+(PT.tab==="open"?" on":"")+'" data-ptt="open">Open '+d.open.length+'</button><button class="chip'+(PT.tab==="closed"?" on":"")+'" data-ptt="closed">Finished, 60 days '+d.closed.length+'</button>';
 $("#ptOpen").innerHTML=rows.length?table([["Name",function(x){return '<a href="#" data-ptopen="'+x.id+'">'+esc(x.name||"No name")+'</a>'},0,1],["Trainer",function(x){return x.trainer||""}],["Where it's at",function(x){var s=PTST[x.pt_status]||[x.pt_status,""];return '<span class="pill '+s[1]+'">'+esc(s[0])+'</span>'+(x.pt_status==="assigned"&&!x.seen_at?' <span class="muted" style="font-size:12px">not opened yet</span>':"")},0,1],["Given out",function(x){return ptAgo(x.assigned_at)}],["Came in",function(x){return day(x.created_at)}]],rows):'<div class="muted">Nothing here.</div>';
}
$("#ptTabs").addEventListener("click",function(e){var b=e.target.closest("[data-ptt]");if(!b)return;PT.tab=b.dataset.ptt;drawPtOpen()});
$("#ptWait").addEventListener("click",function(e){
 var c=e.target.closest("[data-pt]");if(!c)return;var id=+c.dataset.pt,w=e.target.closest("[data-ptwho]");
 if(w){PT.pick[id]=+w.dataset.ptwho;c.querySelectorAll("[data-ptwho]").forEach(function(x){x.classList.toggle("on",x===w)});c.querySelector("[data-ptgive]").textContent="Give to "+w.firstChild.textContent;return}
 if(e.target.closest("[data-ptgive]")){var err=c.querySelector("[data-pterr]");if(!PT.pick[id]){err.innerHTML='<div class="err">Pick a trainer first.</div>';return}
  e.target.disabled=true;post("/api/pt/"+id+"/assign",{staff_id:PT.pick[id],note:c.querySelector("[data-ptnote]").value}).then(function(r){if(!r.ok){e.target.disabled=false;err.innerHTML='<div class="err">'+esc(r.error)+'</div>';return}
   c.innerHTML='<div class="ok">Given to '+esc(e.target.textContent.replace("Give to ",""))+'.'+(r.pushed&&r.pushed.sent?" Their phone just buzzed.":" They haven't turned on notifications yet, so let them know.")+'</div>';setTimeout(loadPt,1600)})}
});
$("#ptOpen").addEventListener("click",function(e){var a=e.target.closest("[data-ptopen]");if(!a)return;e.preventDefault();var id=+a.dataset.ptopen;
 get("/api/pt/"+id).then(function(r){if(r.error)return;var l=r.lead,T=PT.data.trainers;
  $("#ptMove").innerHTML='<div class="ptcard" style="border-color:var(--line);margin-top:12px"><div style="display:flex;gap:10px;align-items:baseline;flex-wrap:wrap"><h3 style="margin:0;margin-right:auto">'+esc(l.name||"Lead")+'</h3><button class="btn line sm" data-ptx>Close</button></div>'+ptAns(l)+
   '<label class="fld" style="max-width:300px">Move to<select data-ptre><option value="">Pick a trainer</option>'+T.map(function(t){return '<option value="'+t.id+'"'+(t.id===l.assigned_to?" selected":"")+'>'+esc(t.name)+'</option>'}).join("")+'</select></label>'+
   '<div class="hist">'+r.activity.map(function(a){return '<div><span>'+esc(day(a.at))+'</span><span>'+esc(a.detail)+(a.staff?' <span class="muted">'+esc(a.staff)+'</span>':"")+'</span></div>'}).join("")+'</div></div>';
  var box=$("#ptMove");box.querySelector("[data-ptx]").onclick=function(){box.innerHTML=""};
  box.querySelector("[data-ptre]").onchange=function(){var v=+this.value;if(!v||v===l.assigned_to)return;post("/api/pt/"+id+"/assign",{staff_id:v}).then(function(){box.innerHTML='<div class="ok">Moved.</div>';loadPt()})};
  box.scrollIntoView({behavior:"smooth",block:"nearest"})})});
$("#ptSync").addEventListener("click",function(){var b=this;b.disabled=true;b.textContent="Checking...";post("/api/pt/sync").then(function(r){b.disabled=false;b.textContent="Check for new ones";loadPt()})});

