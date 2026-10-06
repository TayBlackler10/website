/* ---------- weekly timetable (owned by the Core) ---------- */
var TTD=null;
function loadTT(){get("/api/timetable").then(function(d){if(d.error){$("#ttBody").innerHTML='<div class="err">'+esc(d.error)+'</div>';return}TTD=d;$("#ttAdd").hidden=!d.can_edit;drawTT()})}
function drawTT(){var d=TTD,order=[1,2,3,4,5,6,0],h="";
 order.forEach(function(w){var L=d.classes.filter(function(c){return c.weekday===w&&c.active});if(!L.length)return;
  h+='<div style="margin-top:10px"><b>'+d.days[w]+'</b><div class="list">'+L.map(function(c){return '<div class="lrow"'+(d.can_edit?' data-tt="'+c.id+'" style="cursor:pointer"':"")+'><span>'+esc(c.start)+' to '+esc(c.end_time||"")+' <b>'+esc(c.name)+'</b></span><span class="muted" style="font-size:13px">'+esc(c.coach_name||"No coach")+', cap '+c.cap+'</span></div>'}).join("")+'</div></div>'});
 var off=d.classes.filter(function(c){return !c.active});
 if(off.length)h+='<details style="margin-top:12px"><summary class="muted">Off the timetable ('+off.length+')</summary><div class="list">'+off.map(function(c){return '<div class="lrow"'+(d.can_edit?' data-tt="'+c.id+'" style="cursor:pointer"':"")+'><span>'+d.days[c.weekday]+' '+esc(c.start)+' '+esc(c.name)+'</span><span></span></div>'}).join("")+'</div></details>';
 h+=d.diffs.length?'<div class="warnbox" style="margin-top:14px"><b>Different in GymMaster</b><ul style="margin:6px 0 0 18px">'+d.diffs.map(function(x){return '<li>'+esc(x.what)+'</li>'}).join("")+'</ul></div>':'<div class="ok" style="margin-top:14px">GymMaster\'s next two weeks match this timetable.</div>';
 if(d.log.length)h+='<details style="margin-top:12px"><summary class="muted">Changes</summary><div class="list">'+d.log.map(function(l){return '<div class="lrow"><span>'+esc(l.what)+'</span><span class="muted" style="font-size:13px">'+esc(l.staff||"Core")+', '+fmtWhen(l.at)+'</span></div>'}).join("")+'</div></details>';
 if(d.can_switch)h+='<div class="card" style="background:var(--paper);margin-top:14px"><b>Class bookings run in</b>'+[["gymmaster","GymMaster","As now. The app, coach mode and this page read GymMaster."],["core","M2 Core","Members book from this timetable in the app; coach mode and this page use the Core. Bookings already made in GymMaster don\'t move across, so switch on a quiet day and tell members to rebook."]].map(function(m){return '<label style="display:flex;gap:10px;align-items:flex-start;margin:8px 0;cursor:pointer"><input type="radio" name="clsSrc" value="'+m[0]+'"'+(d.source===m[0]?" checked":"")+' style="margin-top:4px"> <span><b>'+m[1]+'</b><br><span class="muted" style="font-size:13px">'+m[2]+'</span></span></label>'}).join("")+'<div id="clsSrcMsg"></div></div>';
 $("#ttBody").innerHTML=h||'<div class="muted">No classes yet.</div>'}
$("#ttBody").addEventListener("change",function(e){if(e.target.name!=="clsSrc")return;var v=e.target.value;if(v==="core"&&!confirm("Switch class bookings to the M2 Core? Members book from the Core timetable from now on."))return loadTT();post("/api/classes/source",{source:v}).then(function(r){if(!r.ok){$("#clsSrcMsg").innerHTML='<div class="err">'+esc(r.error)+'</div>';return}loadTT();loadClasses(CLS.week)})});
function ttEdit(c){c=c||{weekday:1,start:"",end_time:"",name:"",coach_id:"",cap:20,active:1};
 $("#ttForm").innerHTML='<div class="card" style="background:var(--paper);margin-bottom:12px"><h3 style="margin:0 0 8px">'+(c.id?"Change "+esc(c.name):"Add a class")+'</h3><div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:10px">'+
  '<label class="fld">Day<select id="ttDay">'+[1,2,3,4,5,6,0].map(function(w){return '<option value="'+w+'"'+(w===c.weekday?" selected":"")+'>'+TTD.days[w]+'</option>'}).join("")+'</select></label>'+
  '<label class="fld">Starts<input id="ttStart" type="time" value="'+esc(c.start)+'"></label><label class="fld">Ends<input id="ttEnd" type="time" value="'+esc(c.end_time||"")+'"></label>'+
  '<label class="fld">Class<input id="ttName" value="'+esc(c.name)+'" placeholder="HYROX Strength"></label>'+
  '<label class="fld">Coach<select id="ttCoach"><option value="">No coach</option>'+TTD.coaches.map(function(s){return '<option value="'+s.id+'"'+(s.id===c.coach_id?" selected":"")+'>'+esc(s.name)+'</option>'}).join("")+'</select></label>'+
  '<label class="fld">Cap<input id="ttCap" inputmode="numeric" value="'+c.cap+'"></label></div>'+
  (c.id?'<label class="chk" style="margin-top:8px"><input type="checkbox" id="ttActive"'+(c.active?" checked":"")+'> On the timetable</label>':"")+
  '<div style="display:flex;gap:8px;margin-top:10px"><button class="btn dark" id="ttSave">Save</button><button class="btn line" id="ttCancel">Cancel</button></div><div id="ttMsg"></div></div>';
 $("#ttCancel").onclick=function(){$("#ttForm").innerHTML=""};
 $("#ttSave").onclick=function(){post("/api/timetable",{id:c.id,weekday:+$("#ttDay").value,start:$("#ttStart").value,end:$("#ttEnd").value,name:$("#ttName").value,coach_id:$("#ttCoach").value,cap:$("#ttCap").value,active:c.id?$("#ttActive").checked:true}).then(function(r){if(!r.ok){$("#ttMsg").innerHTML='<div class="err">'+esc(r.error)+'</div>';return}$("#ttForm").innerHTML="";loadTT()})};
 $("#ttForm").scrollIntoView({behavior:"smooth",block:"nearest"})}
$("#ttAdd").addEventListener("click",function(){ttEdit(null)});
$("#ttBody").addEventListener("click",function(e){var r=e.target.closest("[data-tt]");if(!r||!TTD)return;ttEdit(TTD.classes.find(function(c){return c.id===+r.dataset.tt}))});

