/* ---------- roster ---------- */
var RO={week:null,d:null,view:"week",month:null};
var WDN=["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
function addD(iso,n){var d=new Date(iso+"T12:00:00Z");d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10)}
$$("[data-rv]").forEach(function(b){b.addEventListener("click",function(){RO.view=b.dataset.rv;$$("[data-rv]").forEach(function(x){x.classList.toggle("on",x===b)});if(RO.view==="month"){RO.month=(RO.week?addD(RO.week,3):new Date().toISOString()).slice(0,7);loadRosterMonth(RO.month)}else loadRoster(RO.week)})});
function rn(n,people){var f=String(n).split(" ")[0];var dup=(people||[]).filter(function(p){return p.name.split(" ")[0]===f}).length>1;return dup?short(n):f}
function short(n){var p=String(n).split(" ");return p[0]+(p[1]?" "+p[1][0]:"")}
function hm(t){var h=+t.slice(0,2),m=t.slice(3);return ((h+11)%12+1)+(m!=="00"?":"+m:"")+(h<12?"am":"pm")}
function loadRosterMonth(mo){
 get("/api/roster?month="+mo).then(function(d){
  if(d.error)return;RO.d=d;RO.month=mo;
  var first=new Date(mo+"-01T12:00:00Z"),lead=(first.getUTCDay()+6)%7,days=new Date(Date.UTC(+mo.slice(0,4),+mo.slice(5,7),0)).getUTCDate();
  $("#roTitle").textContent=first.toLocaleDateString("en-NZ",{month:"long",year:"numeric"});
  $("#roTools").hidden=!d.can_edit;$("#roPub").textContent=d.unpublished?"Publish "+d.unpublished+" shifts":"All published";$("#roPub").disabled=!d.unpublished;
  $("#roCsv").href="/api/roster.csv?from="+mo+"-01&to="+mo+"-"+days;$("#roCopy").hidden=true;
  var tot=0,per={},names={};d.shifts.forEach(function(s){tot+=s.hours;per[s.staff_id]=(per[s.staff_id]||0)+s.hours;names[s.staff_id]=s.name});
  $("#roTiles").innerHTML=tile(d.shifts.length,"Shifts")+tile(Math.round(tot),"Hours rostered")+Object.keys(per).sort(function(a,b){return per[b]-per[a]}).slice(0,6).map(function(k){return tile(Math.round(per[k]*10)/10+" h",names[k])}).join("");
  $("#roNote").textContent=d.can_edit?"Tap a day to add a shift, tap a shift to change it.":"Your shifts are outlined.";
  var h=["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map(function(x){return '<div class="dh">'+x+'</div>'}).join("");
  for(var i=0;i<lead;i++)h+='<div class="dc out"></div>';
  for(var dd=1;dd<=days;dd++){var iso=mo+"-"+String(dd).padStart(2,"0");var list=d.shifts.filter(function(s){return s.day===iso});
   h+='<div class="dc'+(iso===d.today?" today":"")+'" data-mday="'+iso+'"><span class="dn">'+dd+'</span>'+list.map(function(s){return '<button class="ms'+(s.area==="Management"?" mg":"")+(s.published?"":" draft")+'" data-shift="'+s.id+'">'+esc(hm(s.start))+' '+esc(short(s.name))+'</button>'}).join("")+'</div>'}
  $("#roGrid").outerHTML='<div class="mcal" id="roGrid">'+h+'</div>';
  $("#roHelp").textContent="Black shifts are management. Download hours gives the whole month for Smartpay.";$("#roHours").innerHTML="";
  $("#roReq").innerHTML=d.requests.map(function(r){return '<div class="r" style="cursor:default"><span><b>'+esc(r.name)+'</b> <span class="muted">'+esc(r.kind)+', '+esc(day(r.day))+'</span></span><span class="pill">'+esc(r.status)+'</span></div>'}).join("")||'<div class="muted">Nothing waiting.</div>';
  bindRoGrid();
 });
}
function loadRoster(w){
 if(RO.view==="month"){loadRosterMonth(RO.month);return}
 if(!$("#roGrid").classList.contains("wcal"))$("#roGrid").outerHTML='<div class="wcal" id="roGrid"></div>',bindRoGrid();
 $("#roCopy").hidden=false;
 get("/api/roster"+(w?"?week="+w:"")).then(function(d){
  if(d.error){$("#roGrid").innerHTML='<tr><td class="err">'+esc(d.error)+'</td></tr>';return}
  RO.d=d;RO.week=d.week;var days=[0,1,2,3,4,5,6].map(function(i){return addD(d.week,i)});
  $("#roTitle").textContent="Week of "+new Date(d.week+"T12:00:00").toLocaleDateString("en-NZ",{day:"numeric",month:"long"});
  $("#roTools").hidden=!d.can_edit;$("#roPub").textContent=d.unpublished?"Publish "+d.unpublished+" shift"+(d.unpublished===1?"":"s"):"All published";$("#roPub").disabled=!d.unpublished;
  $("#roCsv").href="/api/roster.csv?from="+d.week+"&to="+addD(d.week,6);
  $("#roNote").textContent=d.can_edit?(d.unpublished?"Dashed shifts are drafts. Staff only see them once you publish.":""):"Your shifts are outlined.";
  var tot=0,per={};d.shifts.forEach(function(s){tot+=s.hours;per[s.staff_id]=(per[s.staff_id]||0)+s.hours});
  var cover=days.filter(function(x){return d.shifts.some(function(s){return s.day===x})}).length;
  $("#roTiles").innerHTML=tile(d.shifts.length,"Shifts")+tile(Math.round(tot*10)/10,"Hours rostered")+tile(cover+" of 7","Days covered")+tile(d.requests.filter(function(r){return r.status==="pending"}).length,"Requests waiting");
  var BANDS=[["Morning","Opens to 11am",0,11],["Day","11am to 4pm",11,16],["Evening","4pm to close",16,24]];
  var g='<div></div>'+days.map(function(x,i){return '<div class="dh'+(x===d.today?" today":"")+'">'+WDN[i]+' '+(+x.slice(8))+'</div>'}).join("");
  BANDS.forEach(function(b){g+='<div class="band">'+b[0]+'<small>'+b[1]+'</small></div>'+days.map(function(x){var list=d.shifts.filter(function(s){var h=+s.start.slice(0,2);return s.day===x&&h>=b[2]&&h<b[3]}).sort(function(a,c){return a.start.localeCompare(c.start)});
   return '<div class="wc'+(x===d.today?" today":"")+'" data-band="'+b[0]+'|'+x+'">'+list.map(function(s){return '<button class="ws'+(s.area==="Management"?" mg":"")+(s.published?"":" draft")+(s.staff_id===d.me?" mine":"")+'" data-shift="'+s.id+'"><b>'+esc(rn(s.name,d.people))+'</b><span>'+esc(hm(s.start))+' to '+esc(hm(s.end))+(s.area&&s.area!=="Reception"?", "+esc(s.area):"")+'</span></button>'}).join("")+'</div>'}).join("")});
  if($("#roGrid").tagName==="TABLE"){$("#roGrid").outerHTML='<div class="wcal" id="roGrid"></div>';bindRoGrid()}
  $("#roGrid").innerHTML=g;
  $("#roHours").innerHTML=d.people.filter(function(p){return per[p.id]}).sort(function(a,b){return per[b.id]-per[a.id]}).map(function(p){return '<span>'+esc(p.name)+' <b>'+(Math.round(per[p.id]*10)/10)+' h</b></span>'}).join("")||'<span>Nobody rostered this week yet.</span>';

  $("#roHelp").textContent=d.can_edit?"Tap a space to add a shift, tap a shift to change it. Dashed shifts aren't published yet. Black shifts are management.":"Your shifts are outlined in lime.";
  $("#roReq").innerHTML=d.requests.map(function(r){return '<div class="r" style="cursor:default"><span><b>'+esc(r.name)+'</b> <span class="muted">'+esc({leave:"Day off",swap:"Swap",available:"Can do extra"}[r.kind])+', '+esc(day(r.day))+(r.note?". "+esc(r.note):"")+'</span></span>'+(r.status==="pending"&&d.can_edit?'<span style="display:flex;gap:6px"><button class="btn dark sm" data-rq="'+r.id+'" data-st="approved">Approve</button><button class="btn line sm" data-rq="'+r.id+'" data-st="declined">Decline</button></span>':'<span class="pill'+(r.status==="approved"?" ok":r.status==="declined"?" warn":"")+'">'+esc(r.status)+'</span>')+'</div>'}).join("")||'<div class="muted">Nothing waiting.</div>';
 });
}
function roForm(s){
 var d=RO.d,E=$("#roEdit");E.hidden=false;
 E.innerHTML='<h2>'+(s.id?"Change shift":"New shift")+'</h2><div class="grid2"><label class="fld">Who<select id="rfWho">'+d.people.map(function(p){return '<option value="'+p.id+'"'+(p.id===s.staff_id?" selected":"")+'>'+esc(p.name)+'</option>'}).join("")+'</select></label><label class="fld">Day<input type="date" id="rfDay" value="'+esc(s.day)+'"></label><label class="fld">Start<input type="time" id="rfStart" value="'+esc(s.start||"05:30")+'"></label><label class="fld">Finish<input type="time" id="rfEnd" value="'+esc(s.end||"13:30")+'"></label><label class="fld">Unpaid break (minutes)<input type="number" id="rfBreak" value="'+(s.break_min||0)+'"></label><label class="fld">Area<input id="rfArea" value="'+esc(s.area||"Reception")+'"></label></div><label class="fld">Note<input id="rfNote" value="'+esc(s.note||"")+'"></label><div class="err" id="rfErr"></div><div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn dark sm" id="rfSave">Save</button>'+(s.id?'<button class="btn line sm" id="rfDel">Delete</button>':"")+'<button class="btn line sm" id="rfClose">Close</button></div>';
 E.scrollIntoView({behavior:"smooth",block:"nearest"});
 $("#rfClose").onclick=function(){E.hidden=true};
 $("#rfSave").onclick=function(){post("/api/roster",{id:s.id||null,staff_id:$("#rfWho").value,day:$("#rfDay").value,start:$("#rfStart").value,end:$("#rfEnd").value,break_min:$("#rfBreak").value,area:$("#rfArea").value,note:$("#rfNote").value}).then(function(r){if(!r.ok){$("#rfErr").textContent=r.error;return}E.hidden=true;loadRoster(RO.week)})};
 if(s.id)$("#rfDel").onclick=function(){post("/api/roster",{action:"delete",id:s.id}).then(function(){E.hidden=true;loadRoster(RO.week)})};
}
function bindRoGrid(){$("#roGrid").addEventListener("click",function(e){
 var d=RO.d;if(!d||!d.can_edit)return;
 var md=e.target.closest("[data-mday]");if(md&&!e.target.closest("[data-shift]")){roForm({staff_id:(d.people[0]||{}).id,day:md.dataset.mday});return}
 var b=e.target.closest("[data-shift]");if(b){roForm(d.shifts.find(function(s){return String(s.id)===b.dataset.shift}));return}
 var c=e.target.closest("[data-cell]");if(c){var p=c.dataset.cell.split("|");roForm({staff_id:+p[0],day:p[1]})}
 var bd=e.target.closest("[data-band]");if(bd){var q=bd.dataset.band.split("|"),T={Morning:["04:45","09:00"],Day:["08:30","16:00"],Evening:["16:00","22:30"]}[q[0]];roForm({staff_id:(d.people[0]||{}).id,day:q[1],start:T[0],end:T[1]})}
})}
bindRoGrid();
$("#roPrev").addEventListener("click",function(){if(!RO.d)return;if(RO.view==="month")loadRosterMonth(RO.d.prev);else loadRoster(RO.d.prev)});
$("#roNext").addEventListener("click",function(){if(!RO.d)return;if(RO.view==="month")loadRosterMonth(RO.d.next);else loadRoster(RO.d.next)});
$("#roNow").addEventListener("click",function(){if(RO.view==="month")loadRosterMonth(new Date().toISOString().slice(0,7));else loadRoster(null)});
$("#roPub").addEventListener("click",function(){var d=RO.d;if(RO.view==="month"){var ws=[];d.shifts.filter(function(s){return !s.published}).forEach(function(s){ws.push(s.day)});Promise.all(ws.filter(function(x,i){return ws.indexOf(x)===i}).map(function(x){return post("/api/roster",{action:"publish",week:x})})).then(function(){loadRosterMonth(RO.month)});return}post("/api/roster",{action:"publish",week:RO.week}).then(function(){loadRoster(RO.week)})});
$("#roCopy").addEventListener("click",function(){post("/api/roster",{action:"copy",week:RO.week}).then(function(r){if(!r.ok&&r.canForce){if(confirm(r.error+" Copy anyway?"))post("/api/roster",{action:"copy",week:RO.week,force:true}).then(function(){loadRoster(RO.week)});return}loadRoster(RO.week)})});
$("#roReq").addEventListener("click",function(e){var b=e.target.closest("[data-rq]");if(!b)return;post("/api/roster",{action:"request",id:+b.dataset.rq,status:b.dataset.st}).then(function(){loadRoster(RO.week)})});
$("#raSave").addEventListener("click",function(){$("#raErr").textContent="";post("/api/roster/ask",{day:$("#raDay").value,kind:$("#raKind").value,note:$("#raNote").value}).then(function(r){if(!r.ok){$("#raErr").textContent=r.error;return}$("#raNote").value="";loadRoster(RO.week)})});

