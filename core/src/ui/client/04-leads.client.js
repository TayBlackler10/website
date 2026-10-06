/* ---------- leads ---------- */
var LEADS=null,LKIND="",STAFF=[];
$("#lsRefresh").addEventListener("click",function(){var b=$("#lsRefresh");b.disabled=true;b.textContent="Pulling in...";post("/api/leads/rebuild",{}).then(function(r){b.disabled=false;b.textContent="Refresh leads";loadLeads()})});
var STG={new:"New",contacted:"Contacted",trial:"On trial",joined:"Joined",cold:"Gone cold",lost:"Not for them"};
function loadLeadStats(){
 get("/api/leads/stats").then(function(d){
  if(d.error)return;
  var t=d.total||{n:0,joined:0,touched:0},w=(d.stages||[]).filter(function(x){return x.stage==="new"}).reduce(function(a,x){return a+x.n},0);
  $("#lsTiles").innerHTML=tile(t.n,"Leads")+tile(w,"Waiting for a first contact")+tile(t.n?Math.round(t.touched/t.n*100)+"%":"-","Contacted")+tile(t.joined,"Joined")+tile(t.n?Math.round(t.joined/t.n*100)+"%":"-","Became members")+tile(d.response_hours!=null?(d.response_hours<48?d.response_hours+" h":Math.round(d.response_hours/24)+" days"):"-","Average time to first contact");
  $("#lsNote").textContent="People who started signing up online or enquired, trials, Bring a Mate, website enquiries and walk ins. Free PT requests are on the PT leads page.";
  $("#lsRefresh").hidden=!ME.can.settings;
  $("#lsKind").innerHTML=hbars((d.by||[]).map(function(x){return [x.label+(x.joined?" ("+x.joined+" joined)":""),x.n]}));
  $("#lsSource").innerHTML=hbars((d.sources||[]).map(function(x){return [x.source,x.n]}));
  $("#lsWeeks").innerHTML=(d.weeks||[]).length?bars(d.weeks.map(function(x){return {label:day(x.day),vals:[x.n,x.joined||0]}}),[{name:"Leads",cls:""},{name:"Joined",cls:"s2"}]):'<div class="muted">Nothing yet.</div>';
 });
}
var LT={tab:"new",kind:"",q:"",n:25,data:[],cur:null};
var LTABS=[["new","To call","Nobody has spoken to them yet"],["contacted","Following up","Spoken to, not decided"],["trial","On a trial","Trial or pass running now"],["joined","Joined","Became members lately"],["cold","Gone cold","Worth one more try"]];
var LPH='<h2>Pick someone</h2><p class="muted" style="margin:0">Tap a lead to see their details, call them and record how it went. Everything is saved on their record.</p>';
function lAge(l){return Math.floor((Date.now()-new Date(String(l.created_at).replace(" ","T")).getTime())/864e5)}
function loadLeads(){
 loadLeadStats();
 if(!$("#leadPanel").dataset.id)$("#leadPanel").innerHTML=LPH;
 get("/api/leads"+(LT.q?"?q="+encodeURIComponent(LT.q)+"&days=365":"?days=45")).then(function(d){LT.data=d.leads||[];LT.n=25;drawLeads()});
 if(!STAFF.length)get("/api/staff").then(function(d){STAFF=d.staff||[]});
}
function drawLeads(){
 var all=LT.data,byKind=all.filter(function(l){return !LT.kind||l.kind===LT.kind});
 var cnt={};byKind.forEach(function(l){cnt[l.stage]=(cnt[l.stage]||0)+1});
 if(!LT.q){var nw=all.filter(function(l){return l.stage==="new"}).length;$("#ctLeads").hidden=!nw;$("#ctLeads").textContent=nw}
 $("#lTabs").className="ltabs"+(LT.q?" dim":"");
 $("#lTabs").innerHTML=LTABS.map(function(t){return '<button class="ltab'+(!LT.q&&LT.tab===t[0]?" on":"")+'" data-lt="'+t[0]+'"><b>'+(cnt[t[0]]||0)+'</b><small>'+t[1]+'</small><span>'+t[2]+'</span></button>'}).join("");
 var kinds={};all.forEach(function(l){kinds[l.kind]=(kinds[l.kind]||0)+1});
 $("#lKind").innerHTML='<option value="">Every type</option>'+Object.keys(kinds).map(function(k){return '<option value="'+k+'"'+(k===LT.kind?" selected":"")+'>'+esc(KIND[k]||k)+' ('+kinds[k]+')</option>'}).join("");
 var rows=LT.q?byKind:byKind.filter(function(l){return l.stage===LT.tab});
 if(LT.tab==="new"&&!LT.q)rows.sort(function(a,b){return String(b.created_at).localeCompare(String(a.created_at))});
 var shown=rows.slice(0,LT.n),h="",grp="";
 shown.forEach(function(l){
  var a=lAge(l),g=LT.q?"":(a<=0?"Today":a<=6?"This week":a<=13?"Last week":"Earlier");
  if(g!==grp){grp=g;if(g)h+='<div class="lgrp">'+g+'</div>'}
  var sub=[l.goal,l.source&&l.source!=="GymMaster prospect"?l.source:"",l.assigned_name?"With "+l.assigned_name:""].filter(Boolean).join(" \u00b7 ");
  h+='<button class="lrow'+(LT.cur===l.id?" on":"")+'" data-lead="'+l.id+'"><span><b>'+esc(l.name||l.email||l.mobile||"No name")+'</b> <span class="pill">'+esc(KIND[l.kind]||l.kind)+'</span>'+(LT.q?' <span class="pill'+(l.stage==="new"?" warn":l.stage==="joined"?" ok":"")+'">'+esc(STG[l.stage]||l.stage)+'</span>':"")+'</span><span class="age'+(l.stage==="new"&&a>2?" late":"")+'">'+(a<=0?"Today":a===1?"1 day":a+" days")+'</span>'+(sub?'<span class="sub">'+esc(sub)+'</span>':"")+'</button>';
 });
 if(!rows.length)h='<div class="ok" style="margin-top:8px">'+(LT.q?"Nobody matches that.":"Nobody here right now. Nice.")+'</div>';
 if(rows.length>LT.n)h+='<button class="btn line sm" id="lMore" style="margin-top:12px">Show '+Math.min(25,rows.length-LT.n)+' more of '+rows.length+'</button>';
 $("#lList").innerHTML=h;
}
$("#lTabs").addEventListener("click",function(e){var b=e.target.closest("[data-lt]");if(!b)return;LT.tab=b.dataset.lt;LT.n=25;if(LT.q){LT.q="";$("#lQ").value="";loadLeads();return}drawLeads()});
$("#lKind").addEventListener("change",function(e){LT.kind=e.target.value;LT.n=25;drawLeads()});
var lqt;$("#lQ").addEventListener("input",function(e){clearTimeout(lqt);lqt=setTimeout(function(){LT.q=e.target.value.trim();if(LT.q.length===1)return;loadLeads()},300)});
$("#lList").addEventListener("click",function(e){if(e.target.id==="lMore"){LT.n+=25;drawLeads();return}var b=e.target.closest("[data-lead]");if(!b)return;LT.cur=+b.dataset.lead;$$("#lList .lrow").forEach(function(x){x.classList.toggle("on",x===b)});openLead(LT.cur)});
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
  p.dataset.id=id;if(window.innerWidth<900)p.scrollIntoView({behavior:"smooth",block:"nearest"});
  var as=$("#lpAssign");if(as)as.addEventListener("change",function(){post("/api/leads/"+id,{assigned_to:as.value||null,assigned_name:as.options[as.selectedIndex].text}).then(function(){loadLeads()})});
 });
}
$("#leadPanel").addEventListener("click",function(e){
 var p=$("#leadPanel"),id=+p.dataset.id;
 if(e.target.id==="lpClose"){p.dataset.id="";LT.cur=null;p.innerHTML=LPH;$$("#lList .lrow").forEach(function(x){x.classList.remove("on")});return}
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

