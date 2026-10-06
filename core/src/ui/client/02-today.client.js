/* ---------- today ---------- */
var TODAY=null;
function loadToday(){
 get("/api/today").then(function(d){
  if(d.error||!d.jobs){$("#jobs").innerHTML='<div class="err">'+esc(d.error||"Couldn't load today's jobs")+'</div>';return}
  TODAY=d;
  $("#todayDate").textContent=new Date().toLocaleDateString("en-NZ",{weekday:"long",day:"numeric",month:"long"});
  loadTodayMore();
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
function face(id,name,has){var ini=initials(name);return '<div class="face sm">'+(has?'<img loading="lazy" src="/api/members/'+id+'/photo" alt="" data-ini="'+esc(ini)+'">':esc(ini))+'</div>'}
function ago(s){var t=new Date(String(s).replace(" ","T")+(String(s).length>16?"":":00"));var m=Math.round((Date.now()-t.getTime())/60000);if(isNaN(m))return "";if(m<1)return "just now";if(m<60)return m+" min ago";if(m<1440)return Math.round(m/60)+" h ago";return day(s)}
function loadTodayMore(){
 get("/api/roster/now").then(function(r){$("#tdDesk").innerHTML=(Array.isArray(r)?r:[]).map(function(x){return '<div class="vis" data-go="roster" style="grid-template-columns:110px minmax(0,1fr) auto"><b>'+esc(x.start)+' to '+esc(x.end)+'</b><span>'+esc(x.name)+' <span class="muted">'+esc(x.area||"")+'</span></span>'+(x.now?'<span class="pill ok">On now</span>':"")+'</div>'}).join("")||'<div class="muted">Nobody rostered today yet.</div>'});
 get("/api/visits/recent").then(function(d){
  if(d.error){$("#rvList").innerHTML='<div class="muted">'+esc(d.error)+'</div>';return}
  $("#tdBday").innerHTML=(d.birthdays||[]).map(function(b){return '<div class="vis" data-member="'+b.id+'">'+face(b.id,nm(b),b.has_photo)+'<span><b>'+esc(nm(b))+'</b></span><span class="pill ok">Happy birthday</span></div>'}).join("")||'<div class="muted">No birthdays today.</div>';
  if(d.rows.length){
   $("#rvCount").textContent=d.today+" in today";
   $("#rvList").innerHTML=d.rows.slice(0,15).map(function(v){var f=v.flags||[];return '<div class="vis" data-member="'+v.id+'">'+face(v.id,nm(v),v.has_photo)+'<span><b>'+esc(nm(v))+'</b> <span class="muted">'+esc(v.plan||"")+(v.door?", "+esc(v.door):"")+'</span>'+(f.indexOf("blocked")>=0?' <span class="pill warn">Owes money</span>':"")+'</span><span class="muted">'+esc(ago(v.at))+'</span></div>'}).join("");
   return;
  }
  // Until GymMaster's live visitor log is connected: who has trained most this month.
  get("/api/members/browse?tab=visited&sort=visits&limit=12").then(function(b){
   $("#rvCount").textContent=d.live?"No check-ins yet today":"Most visits this month";
   $("#rvList").innerHTML=(!d.live?'<div class="muted" style="margin-bottom:6px">'+(ME.can.settings?"Live check-ins appear here once GymMaster's Report API key is added (Settings, Connections). Until then, this month's regulars:":"This month's regulars:")+'</div>':"")+
    ((b.rows||[]).map(function(v){return '<div class="vis" data-member="'+v.id+'">'+face(v.id,nm(v),v.has_photo)+'<span><b>'+esc(nm(v))+'</b> <span class="muted">'+esc(v.plan||"")+'</span></span><span class="pill">'+v.visits_month+' visits</span></div>'}).join("")||'<div class="muted">Visit counts are still being copied from GymMaster.</div>');
  });
 });
 get("/api/classes").then(function(d){
  if(d.error){$("#tdClasses").innerHTML='<div class="muted">'+esc(d.error)+'</div>';return}
  var td=(d.classes||[]).filter(function(c){return c.day===d.today});
  $("#tdClasses").innerHTML=td.map(function(c){var full=c.max&&c.booked>=c.max;return '<div class="vis" data-go="classes"><b>'+esc(c.start)+'</b><span><b>'+esc(c.name)+'</b> <span class="muted">'+esc(c.coach||"")+'</span><div class="fill"><i class="'+(full?"full":"")+'" style="width:'+(c.max?Math.round(c.booked/c.max*100):0)+'%"></i></div></span><span class="pill'+(full?" dark":"")+'">'+c.booked+'/'+c.max+'</span></div>'}).join("")||'<div class="muted">No classes today.</div>';
 });
}
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
    '<div class="outs">'+outs.map(function(o){return '<button class="btn sm '+(o==="joined"||o==="paid"||o==="billing_in"||o==="tag_given"||o==="fp_in_gm"||o==="hold_set"||o==="kept"?"dark":"line")+'" data-out="'+o+'">'+OUT_LABEL[o]+'</button>'}).join("")+'</div></div>';
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

