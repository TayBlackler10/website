/* ---------- email automations ---------- */
var EMD=null;
function loadEm(){
 get("/api/emails").then(function(d){
  if(d.error){$("#emList").innerHTML='<div class="err">'+esc(d.error)+'</div>';return}
  EMD=d;var on=d.autos.filter(function(a){return a.sending}).length,today=0,sent=0,prev=0,met=0;
  d.autos.forEach(function(a){today+=a.today.length;sent+=a.stats.sent||0;prev+=a.stats.preview||0;met+=a.stats.met||0});
  $("#emMode").textContent=!d.connected?"Preview":on?on+" sending from the Core":"Connected, all in preview";
  $("#emBanner").textContent=!d.connected?"Email sending isn't connected yet, so GymMaster keeps sending everything. Each morning at 9am the Core works out who every automation would email, so you can compare before switching over.":"Sending from "+d.from+". An automation only sends from the Core once it's switched on here, so turn the GymMaster one off at the same time.";
  $("#emTiles").innerHTML=tile(today,"Would email today")+tile((sent+prev).toLocaleString("en-NZ"),"Emails, last 30 days"+(sent?" ("+sent+" sent)":""))+tile(sent+prev?Math.round(met/(sent+prev)*100)+"%":"-","Did what the email asked")+tile(d.unsubs,"Unsubscribed");
  var GO=["Joining","Trials","Bringing people back","Payments","Holds, cancelling and leaving","Milestones and upgrades","Staff alerts","Other"],grp={};
  d.autos.forEach(function(a){var g=a.group||"Other";(grp[g]=grp[g]||[]).push(a)});
  $("#emList").innerHTML=GO.filter(function(g){return grp[g]}).map(function(g){return '<div class="lgrp" style="padding-left:2px">'+esc(g)+' ('+grp[g].length+')</div>'+grp[g].map(emCard).join("")}).join("");
 });
}
function emCard(a){var d=EMD,st=a.stats,n=(st.sent||0)+(st.preview||0),rate=n?Math.round((st.met||0)/n*100):null,hrate=st.held?Math.round((st.held_met||0)/st.held*100):null;
   return '<div class="emc"><div class="top"><h3 style="margin:0;font-size:17px;margin-right:auto">'+esc(a.name)+'</h3>'+(!a.supported?'<span class="pill warn">Not in the Core yet</span>':a.sending?'<span class="pill dark">The Core sends this</span>':'<span class="pill">Preview. GymMaster still sends</span>')+'</div>'+
    '<div class="muted" style="font-size:13px">'+esc(a.when)+(a.types?" \u00b7 "+a.types+" membership types":"")+(a.to==="staff"?" \u00b7 goes to reception":"")+(a.goal_label?". Goal: they "+esc(a.goal_label):"")+'</div>'+
    (a.supported?'<div class="nums"><span><b>'+a.today.length+'</b>today</span><span><b>'+n+'</b>last 30 days</span>'+(a.goal_label?'<span><b>'+(rate==null?"-":rate+"%")+'</b>'+esc(a.goal_label)+'</span>':"")+(hrate!=null?'<span><b>'+hrate+'%</b>without the email</span>':"")+'</div>'+
     (a.today.length?'<details><summary class="muted" style="cursor:pointer;font-size:13px">Who it\'s for today</summary><div style="font-size:14px;margin-top:6px">'+a.today.map(function(p){return '<a href="#" data-member="'+p.id+'">'+esc(p.name)+'</a>'}).join(", ")+'</div></details>':"")+
     '<div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn line sm" data-emk="'+a.key+'">'+(a.designed?"See and edit the email":"Edit the email")+'</button>'+(d.can_switch?'<button class="btn line sm" data-emsw="'+a.key+'">'+(a.sending?"Hand back to GymMaster":"Send from the Core")+'</button>':"")+'</div>':'<div style="display:flex;gap:8px"><button class="btn line sm" data-emk="'+a.key+'">See the email</button></div>')+'</div>'
}
function emEdit(key){
 var a=EMD.autos.find(function(x){return x.key===key});if(!a)return;
 if(a.designed)return emEditHtml(a);var v=function(k){return esc(a[k]==null?"":a[k])};
 $("#emEdit").innerHTML='<div style="display:flex;gap:10px;align-items:baseline"><h2 style="margin-right:auto">'+esc(a.name)+'</h2><button class="btn line sm" id="emClose">Close</button></div>'+
  '<label class="fld">Subject<input id="emS" value="'+v("subject")+'"></label><label class="fld">Heading<input id="emH" value="'+v("heading")+'"></label>'+
  '<label class="fld">The email (a blank line starts a new paragraph, {first} is their first name)<textarea id="emB" style="min-height:220px">'+v("body")+'</textarea></label>'+
  '<div class="grid2"><label class="fld">Button<input id="emBt" value="'+v("button")+'"></label><label class="fld">Button link<input id="emU" value="'+v("url")+'"></label>'+(EMD.can_switch?'<label class="fld">Comparison group (% who don\'t get it)<input id="emHo" inputmode="numeric" value="'+(a.holdout_pct||0)+'"></label>':"")+'</div>'+
  '<div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn dark" id="emSave">Save</button>'+(EMD.connected?'<button class="btn line" id="emTest">Send me a test</button>':"")+'</div><div id="emMsg"></div>'+
  (a.updated_by?'<div class="muted" style="font-size:13px">Last changed by '+esc(a.updated_by)+', '+esc(day(a.updated_at))+'</div>':"")+
  '<iframe class="emframe" id="emFrame" title="How the email looks" src="/api/emails/'+key+'/preview?t='+Date.now()+'"></iframe>';
 $("#emClose").onclick=function(){$("#emEdit").innerHTML='<h2>Pick an automation</h2><p class="muted" style="margin:0">Change the words, see exactly how it looks, and send yourself a test.</p>'};
 $("#emSave").onclick=function(){var b={subject:$("#emS").value,heading:$("#emH").value,body:$("#emB").value,button:$("#emBt").value,url:$("#emU").value};if($("#emHo"))b.holdout_pct=$("#emHo").value;
  post("/api/emails/"+key,b).then(function(r){if(!r.ok){$("#emMsg").innerHTML='<div class="err">'+esc(r.error)+'</div>';return}$("#emMsg").innerHTML='<div class="ok">Saved.</div>';$("#emFrame").src="/api/emails/"+key+"/preview?t="+Date.now();get("/api/emails").then(function(d){EMD=d})})};
 var t=$("#emTest");if(t)t.onclick=function(){post("/api/emails/"+key,{action:"test"}).then(function(r){$("#emMsg").innerHTML=r.ok?'<div class="ok">Sent to '+esc(r.to)+'.</div>':'<div class="err">'+esc(r.error)+'</div>'})};
 if(window.innerWidth<900)$("#emEdit").scrollIntoView({behavior:"smooth"});
}
function emEditHtml(a){var key=a.key;
 $("#emEdit").innerHTML='<div style="display:flex;gap:10px;align-items:baseline"><h2 style="margin-right:auto">'+esc(a.name)+'</h2><button class="btn line sm" id="emClose">Close</button></div><div class="muted" style="font-size:13px">The designed email copied from GymMaster. Fields like {58:Member Firstname} fill in for each person.</div><div class="muted">Loading...</div>';
 get("/api/emails/"+key+"/source").then(function(c){
  $("#emEdit").innerHTML='<div style="display:flex;gap:10px;align-items:baseline"><h2 style="margin-right:auto">'+esc(a.name)+'</h2><button class="btn line sm" id="emClose">Close</button></div>'+
   '<label class="fld">Subject<input id="emS" value="'+esc(c.subject||"")+'"></label>'+
   '<iframe class="emframe" id="emFrame" title="How the email looks" src="/api/emails/'+key+'/preview?t='+Date.now()+'"></iframe>'+
   '<details><summary class="muted" style="cursor:pointer;font-size:13px">Change the email itself (HTML)</summary><textarea id="emHtml" style="min-height:260px;font:12px/1.4 monospace;width:100%;margin-top:8px">'+esc(c.html||"")+'</textarea></details>'+
   (EMD.can_switch?'<label class="fld" style="max-width:280px">Comparison group (% who don\'t get it)<input id="emHo" inputmode="numeric" value="'+(a.holdout_pct||0)+'"></label>':"")+
   '<div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn dark" id="emSave">Save</button>'+(EMD.connected?'<button class="btn line" id="emTest">Send me a test</button>':"")+'</div><div id="emMsg"></div>'+
   (a.updated_by?'<div class="muted" style="font-size:13px">Last changed by '+esc(a.updated_by)+', '+esc(day(a.updated_at))+'</div>':"");
  $("#emClose").onclick=function(){$("#emEdit").innerHTML='<h2>Pick an automation</h2>'};
  $("#emSave").onclick=function(){var b={subject:$("#emS").value,html:$("#emHtml").value};if($("#emHo"))b.holdout_pct=$("#emHo").value;
   post("/api/emails/"+key,b).then(function(r){$("#emMsg").innerHTML=r.ok?'<div class="ok">Saved.</div>':'<div class="err">'+esc(r.error)+'</div>';if(r.ok)$("#emFrame").src="/api/emails/"+key+"/preview?t="+Date.now()})};
  var t=$("#emTest");if(t)t.onclick=function(){post("/api/emails/"+key,{action:"test"}).then(function(r){$("#emMsg").innerHTML=r.ok?'<div class="ok">Sent to '+esc(r.to)+'.</div>':'<div class="err">'+esc(r.error)+'</div>'})};
 });
 if(window.innerWidth<900)$("#emEdit").scrollIntoView({behavior:"smooth"});
}
$("#emList").addEventListener("click",function(e){var b=e.target.closest("[data-emk]");if(b){emEdit(b.dataset.emk);return}
 var w=e.target.closest("[data-emsw]");if(!w)return;var a=EMD.autos.find(function(x){return x.key===w.dataset.emsw}),on=!a.sending;
 if(on&&!confirm("Send "+a.name+" from the Core from tomorrow 9am? Turn the GymMaster version off now so nobody gets two."))return;
 post("/api/emails/"+a.key,{action:"sending",on:on}).then(function(r){if(!r.ok){alert(r.error);return}loadEm()})});

