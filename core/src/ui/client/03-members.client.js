/* ---------- members ---------- */
var MW={tab:"current",sort:"updated",view:"grid",offset:0,q:""};
var qt;
$("#q").addEventListener("input",function(e){clearTimeout(qt);qt=setTimeout(function(){MW.q=e.target.value.trim();loadWall(false)},280)});
function search(v){MW.q=v;loadWall(false)}
$("#mSort").addEventListener("change",function(e){MW.sort=e.target.value;loadWall(false)});
$$("[data-mv]").forEach(function(b){b.addEventListener("click",function(){MW.view=b.dataset.mv;$$("[data-mv]").forEach(function(x){x.classList.toggle("on",x===b)});$("#mWall").classList.toggle("list",MW.view==="list")})});
$("#mTabs").addEventListener("click",function(e){var b=e.target.closest("[data-mt]");if(!b)return;MW.tab=b.dataset.mt;loadWall(false)});
$("#mMore").addEventListener("click",function(){loadWall(true)});
$("#mBack").addEventListener("click",function(){$("#mProf").hidden=true;$("#mList").hidden=false;window.scrollTo(0,MW.scroll||0)});
var MTABS=[["current","Current members"],["visited","Visited this month"],["passport","Fitness Passport"],["owing","Owing"],["prospects","Prospects"],["expired","Expired"],["everyone","Everyone"]];
var MCOUNT={};
function mcard(m){
 var fl=m.flags||[],pills=[];
 if(m.status==="active"&&m.gm_status==="Hold")pills.push('<span class="pill">On hold</span>');
 if(m.status==="former")pills.push('<span class="pill">Left</span>');
 if(m.status==="prospect")pills.push('<span class="pill">Prospect</span>');
 if(fl.indexOf("passport")>=0)pills.push('<span class="pill">Passport</span>');
 if(fl.indexOf("gifted_time")>=0)pills.push('<span class="pill">Gifted time</span>');
 if(m.owing>0)pills.push('<span class="pill warn">Owes '+money(m.owing)+'</span>');
 if(m.visits_month)pills.push('<span class="pill ok">'+m.visits_month+' visit'+(m.visits_month===1?"":"s")+' this month</span>');
 var ini=initials(nm(m));
 return '<button class="mcard" data-member="'+m.id+'"><span class="mph">'+(m.has_photo?'<img loading="lazy" src="/api/members/'+m.id+'/photo" alt="" data-ini="'+esc(ini)+'">':'<i>'+esc(ini)+'</i>')+'</span><span class="mb"><b>'+esc(nm(m))+'</b><span class="muted">#'+m.id+(m.joined_on&&m.status!=="prospect"?", joined "+esc(day(m.joined_on)):"")+'</span><span>'+esc(m.plan||(m.status==="prospect"?"Created "+day(m.created):""))+'</span><span class="mft">'+pills.join("")+'</span></span></button>';
}
function loadWall(more){
 if(!more){MW.offset=0}
 var u="/api/members/browse?tab="+MW.tab+"&sort="+MW.sort+"&offset="+MW.offset+"&limit=48"+(MW.q?"&q="+encodeURIComponent(MW.q):"");
 if(!more)$("#mWall").innerHTML='<div class="muted">Loading...</div>';
 get(u).then(function(d){
  if(d.error){$("#mWall").innerHTML='<div class="err">'+esc(d.error)+'</div>';return}
  if(d.counts&&d.counts.everyone!=null)MCOUNT=d.counts;
  $("#mTabs").innerHTML=MTABS.map(function(t){var n=MCOUNT[t[0]];return '<button class="chip'+(t[0]===MW.tab?" on":"")+'" data-mt="'+t[0]+'">'+t[1]+(n!=null?" "+Number(n).toLocaleString("en-NZ"):"")+'</button>'}).join("");
  var html=d.rows.map(mcard).join("");
  if(more)$("#mWall").insertAdjacentHTML("beforeend",html);else $("#mWall").innerHTML=html||'<div class="muted">No one here.</div>';
  MW.offset=d.offset+d.rows.length;
  $("#mMore").hidden=MW.offset>=d.total;$("#mMore").textContent="Show more ("+(d.total-MW.offset).toLocaleString("en-NZ")+" left)";
  $("#mCount").textContent=d.total.toLocaleString("en-NZ")+" people";
 });
}
document.addEventListener("error",function(e){var t=e.target;if(t&&t.tagName==="IMG"&&t.dataset&&t.dataset.ini!==undefined){var i=document.createElement("i");i.textContent=t.dataset.ini;t.parentNode.replaceChild(i,t)}},true);
document.addEventListener("click",function(e){var r=e.target.closest("[data-member]");if(!r)return;e.preventDefault();openMember(+r.dataset.member)});
function openMember(id){
 if(VIEW!=="members"){VIEW="members";$$("[data-view]").forEach(function(s){s.hidden=s.dataset.view!=="members"});$$(".nav").forEach(function(b){b.classList.toggle("on",b.dataset.go==="members")})}
 else MW.scroll=window.scrollY;
 $("#mList").hidden=true;$("#mProf").hidden=false;window.scrollTo(0,0);
 $("#profile").innerHTML='<section class="card"><div class="muted">Loading...</div></section>';
 get("/api/members/"+id).then(function(d){renderMember(d,id)});
}
function renderMember(d,id){
 var P=$("#profile");
 if(d.error){P.innerHTML='<section class="card"><div class="err">'+esc(d.error)+'</div></section>';return}
 var m=d.member,ms=d.memberships.filter(function(x){return x.status==="current"})[0]||d.memberships[0]||{};
 var isFp=ms.family==="passport"||d.flags.some(function(f){return f.flag==="passport"});
 var flags=d.flags.filter(function(f){return !(f.flag==="passport"&&ms.family==="passport")}).map(function(f){return '<span class="pill'+(f.flag==="blocked"?" warn":"")+'">'+esc(f.flag.replace(/_/g," ")+(f.detail?": "+f.detail:""))+'</span>'}).join(" ");
 var vis=d.visits||[],weeks=[];for(var w=11;w>=0;w--){var s=0;vis.forEach(function(v){var age=(Date.now()-new Date(v.day+"T00:00:00").getTime())/864e5;if(age>=w*7&&age<(w+1)*7)s+=v.n});weeks.push(s)}
 var mx=Math.max.apply(null,weeks.concat([1]));
 var st={active:"Current member",former:"Left M2",prospect:"Prospect",frozen:"On hold"}[m.status]||m.status;
 var ini=initials(nm(m)),hasPh=d.photo_at||m.photo_url;
 var bill=d.billing?'<section class="card"><h2>Billing</h2>'+(d.billing.balance_owing>0?'<div class="warnbox">Owes <b>'+money(d.billing.balance_owing)+'</b></div>':'<div class="muted">Nothing owing.</div>')+
   '<dl class="kv"><dt>Plan</dt><dd>'+esc(ms.plan||"-")+(ms.price?", "+money(ms.price)+" "+esc(ms.frequency||""):"")+'</dd><dt>Billed by</dt><dd>'+esc(d.billing.billed_by_system==="core"?"M2 Core":"GymMaster")+'</dd>'+(d.billing.free_weeks_credit?'<dt>Free weeks</dt><dd>'+d.billing.free_weeks_credit+' to apply</dd>':"")+(ms.min_term_end?'<dt>Lock-in ends</dt><dd>'+esc(day(ms.min_term_end))+'</dd>':"")+(ms.end_date?'<dt>Ends</dt><dd>'+esc(day(ms.end_date))+'</dd>':"")+'</dl>'+
   (ME.can.add?'<button class="btn line sm" data-bill="'+id+'" style="align-self:flex-start">Enter or update bank details</button>':"")+'</section>':"";
 var tagRows=d.tags.map(function(t){return '<div><span>'+esc(day(t.assigned_at))+'</span><span>'+esc(t.tag)+' <span class="pill'+(t.status==="active"?" ok":"")+'">'+esc(t.status)+'</span></span></div>'}).join("");
 var head='<section class="card"><div style="display:flex;gap:18px;align-items:flex-start;flex-wrap:wrap"><div class="face xl" id="pFace">'+(hasPh?'<img src="/api/members/'+id+'/photo?t='+encodeURIComponent(d.photo_at||"gm")+'" alt="Photo of '+esc(nm(m))+'" data-ini="'+esc(ini)+'">':esc(ini))+'</div>'+
  '<div style="flex:1;min-width:200px"><div class="eyebrow">#'+id+', '+esc(st)+'</div><h2 style="font-size:28px;margin-top:2px">'+esc(nm(m))+'</h2><div style="margin-top:8px;display:flex;gap:6px;flex-wrap:wrap"><span class="pill dark">'+esc(ms.plan||st)+'</span>'+flags+'</div>'+
  (ME.can.add?'<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:12px"><button class="btn '+(hasPh?"line":"dark")+' sm" data-photo="'+id+'" data-name="'+esc(nm(m))+'">'+(d.photo_at?"Retake photo":"Take photo")+'</button><button class="btn line sm" data-edit="'+id+'">Edit details</button><a class="btn line sm" href="/api/members/'+id+'/privacy" title="Everything we hold on this member, for a Privacy Act request. Check it before sending.">Privacy request file</a><button class="btn line sm" data-tagfor="'+id+'">'+(m.key_tag?"Replace key tag":"Give key tag")+'</button><button class="btn line sm" data-flagfor="'+id+'">Flags</button><a class="btn line sm" href="'+esc((window.GM_SITE||"https://m2trainingclub.gymmasteronline.com")+"/member/view/"+id)+'" target="_blank" rel="noopener">Open in GymMaster</a></div>':"")+'</div></div>'+
  '<dl class="kv"><dt>Member since</dt><dd>'+esc(day(m.joined_on)||"-")+'</dd><dt>Mobile</dt><dd>'+(m.mobile?'<a href="tel:'+esc(m.mobile)+'">'+esc(m.mobile)+'</a>':'<span class="muted">None</span>')+'</dd><dt>Email</dt><dd>'+esc(m.email||"None")+'</dd><dt>Goal</dt><dd>'+esc(m.goal||"Not recorded")+'</dd><dt>Came from</dt><dd>'+esc(m.lead_source||"Not recorded")+'</dd>'+(d.referrer?'<dt>Brought by</dt><dd><a href="#" data-member="'+d.referrer.id+'">'+esc(nm(d.referrer))+'</a></dd>':"")+(d.trainer?'<dt>Trainer</dt><dd>'+esc(d.trainer.name)+'</dd>':"")+(isFp?'<dt>Fitness Passport ID</dt><dd>'+(m.fp_id?esc(m.fp_id)+(m.fp_id_in_gm?"":' <span class="pill warn">Not in GymMaster yet</span>'):'<span class="pill warn">Missing. Passport can\'t pay for their visits</span>')+'</dd>':"")+(m.passport_number&&m.passport_number!==m.fp_id?'<dt>Old number in surname</dt><dd>'+esc(m.passport_number)+'</dd>':"")+'<dt>Visits, all time</dt><dd>'+esc(m.total_visits_gm||0)+'</dd>'+(d.last_visit?'<dt>Last visit</dt><dd>'+esc(day(d.last_visit))+'</dd>':"")+'<dt>Key tag</dt><dd>'+esc(m.key_tag||"None")+'</dd></dl>'+
  '<div id="editBox"></div></section>';
 var next='<section class="card dark"><div class="next"><div><div class="eyebrow">Best next step</div><div style="font-size:16px;margin-top:4px">'+esc(d.next_step.text)+'</div></div></div></section>';
 var visits=vis.length?'<section class="card"><h2>Visits</h2><div class="bars">'+weeks.map(function(n,i){return '<i class="'+(i===11?"last":"")+'" style="height:'+Math.max(4,Math.round(n/mx*100))+'%" title="'+n+' visits"></i>'}).join("")+'</div><div class="muted">Last 12 weeks</div></section>':"";
 var notes='<section class="card"><h2>Notes and history</h2><div style="display:flex;gap:8px"><label class="sr" for="noteIn">Add a note</label><input id="noteIn" class="fld" style="flex:1;height:44px;border:1px solid var(--line);border-radius:12px;padding:0 12px" placeholder="Add a note, like what they said at the desk"><button class="btn dark sm" data-note="'+id+'" style="height:44px">Save</button></div>'+
  '<div class="hist">'+(d.activity.map(function(a){return '<div><span>'+esc(day(a.at))+'</span><span>'+esc(a.detail)+(a.staff?' <span class="muted">'+esc(a.staff)+'</span>':"")+'</span></div>'}).join("")||'<p class="muted" style="margin:0">Nothing yet.</p>')+'</div></section>';
 P.innerHTML='<div class="pcol">'+head+next+'<div id="gmBox"></div>'+(tagRows?'<section class="card"><h2>Key tags</h2><div class="hist">'+tagRows+'</div></section>':"")+'</div>'+
  '<div class="pcol"><div id="liveBox"><section class="card"><h2>Live from GymMaster</h2><div class="muted">Checking GymMaster...</div></section></div>'+visits+(d.billing?'<div id="billBox"></div>':"")+notes+'</div>';
 loadLive(id);if(d.billing)loadMemberBill(id);
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

