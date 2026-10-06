/* ---------- memberships and prices ---------- */
var CAT={data:null,tab:"membership",cur:null};
var CTABS=[["membership","Memberships"],["trial","Trials and passes"],["paid_in_full","Paid in full"],["corporate","Corporate and other"],["off","Not selling"]];
function catTab(c){if(c.status!=="selling")return "off";if(c.kind==="pass")return "trial";if(c.kind==="other")return "corporate";return c.kind}
function catPrice(c){return c.price==null?"-":money(c.price)}
function loadCat(){
 get("/api/catalog").then(function(d){
  if(d.error){$("#catList").innerHTML='<div class="err">'+esc(d.error)+'</div>';return}
  CAT.data=d;drawCat();
  $("#catLog").innerHTML=d.changes.map(function(c){return '<div><span>'+esc(day(c.at))+'</span><span>'+(c.item?'<b>'+esc(c.item)+'</b>: ':"")+esc(c.what)+(c.staff?' <span class="muted">'+esc(c.staff)+'</span>':"")+'</span></div>'}).join("")||'<p class="muted" style="margin:0">Nothing yet.</p>';
 });
}
function drawCat(){
 var d=CAT.data,cnt={};d.items.forEach(function(c){var t=catTab(c);cnt[t]=(cnt[t]||0)+1});
 $("#catTabs").innerHTML=CTABS.map(function(t){return '<button class="chip'+(CAT.tab===t[0]?" on":"")+'" data-ct2="'+t[0]+'">'+t[1]+" "+(cnt[t[0]]||0)+'</button>'}).join("");
 var fo=Object.keys(d.families),rows=d.items.filter(function(c){return catTab(c)===CAT.tab}).sort(function(a,b){return (fo.indexOf(a.family)-fo.indexOf(b.family))||(a.sort-b.sort)||(a.id-b.id)}),h="",grp="";
 rows.forEach(function(c){
  var g=d.families[c.family]||c.family;if(g!==grp){grp=g;h+='<div class="lgrp">'+esc(g)+'</div>'}
  var bits=[c.flexi?"Flexi, 30 days notice":c.lock_in_months?c.lock_in_months+" month lock-in":"",c.length_days?c.length_days+" days":"",c.visits?c.visits+" visits":"",c.joining_fee?"joining "+money(c.joining_fee):"",c.members?c.members+" on it now":""].filter(Boolean);
  var gmWarn=c.gm_id&&!c.gm_seen?"Not found in GymMaster":c.gm_id&&c.gm_price!=null&&c.price!=null&&Math.abs(c.gm_price-c.price)>0.004?"GymMaster says "+money(c.gm_price):!c.gm_id&&c.status==="selling"?"Not in GymMaster yet":"";
  h+='<button class="citem'+(CAT.cur===c.id?" on":"")+'" data-cat="'+c.id+'"><span><b>'+esc(c.name)+'</b>'+(c.status!=="selling"?' <span class="pill">'+esc(d.statuses[c.status])+'</span>':"")+(gmWarn?' <span class="pill warn">'+esc(gmWarn)+'</span>':"")+'</span><span class="pr">'+catPrice(c)+'<span style="display:block;font:500 12px DM Sans,Arial,sans-serif;color:var(--muted)">'+esc((d.billing[c.billing]||"").toLowerCase())+'</span></span><span class="sub">'+esc(bits.join(" \u00b7 "))+'</span></button>';
 });
 $("#catList").innerHTML=h||'<div class="muted" style="padding:10px 0">Nothing here.</div>';
}
function catOpts(map,val){return Object.keys(map).map(function(k){return '<option value="'+k+'"'+(k===val?" selected":"")+'>'+esc(map[k])+'</option>'}).join("")}
function catEdit(c){
 var d=CAT.data,n=!c;c=c||{kind:CAT.tab==="off"||CAT.tab==="corporate"?"membership":CAT.tab,family:"perform",billing:CAT.tab==="trial"?"once":"weekly",status:"selling",at_desk:1,online:0,joining_fee:0,tag_fee:0};
 var v=function(k){return c[k]==null?"":esc(c[k])},ck=function(k,l){return '<label class="chk"><input type="checkbox" data-cf="'+k+'"'+(c[k]?" checked":"")+'> '+l+'</label>'};
 $("#catForm").innerHTML='<div style="display:flex;gap:10px;align-items:baseline"><h2 style="margin-right:auto">'+(n?"Add something new":esc(c.name))+'</h2><button class="btn line sm" id="cfClose">Close</button></div>'+
  (c.gm_id&&c.gm_price!=null&&c.price!=null&&Math.abs(c.gm_price-c.price)>0.004?'<div class="warnbox">GymMaster still charges '+money(c.gm_price)+' for this. Change it there too until GymMaster is switched off.</div>':"")+
  '<label class="fld">Name<input data-cf="name" value="'+v("name")+'" placeholder="M2 Perform - Weekly"></label>'+
  '<div class="grid2"><label class="fld">Type<select data-cf="kind">'+catOpts(d.kinds,c.kind)+'</select></label><label class="fld">Access<select data-cf="family">'+catOpts(d.families,c.family)+'</select></label>'+
  '<label class="fld">Price ($, incl GST)<input data-cf="price" inputmode="decimal" value="'+v("price")+'"></label><label class="fld">Billed<select data-cf="billing">'+catOpts(d.billing,c.billing)+'</select></label>'+
  '<label class="fld">Joining fee ($)<input data-cf="joining_fee" inputmode="decimal" value="'+v("joining_fee")+'"></label><label class="fld">Key tag fee ($)<input data-cf="tag_fee" inputmode="decimal" value="'+v("tag_fee")+'"></label>'+
  '<label class="fld">Lock-in (months)<input data-cf="lock_in_months" inputmode="numeric" value="'+v("lock_in_months")+'"></label><label class="fld">Lasts (days, trials and passes)<input data-cf="length_days" inputmode="numeric" value="'+v("length_days")+'"></label>'+
  '<label class="fld">Visits included (trip passes)<input data-cf="visits" inputmode="numeric" value="'+v("visits")+'"></label><label class="fld">Status<select data-cf="status">'+catOpts(d.statuses,c.status)+'</select></label></div>'+
  '<div class="grid2">'+ck("flexi","Flexi: 30 days notice, no lock-in")+ck("includes_classes","Includes classes")+ck("includes_recovery","Includes recovery")+ck("at_desk","Sold at the desk")+ck("online","Sold online")+'</div>'+
  '<label class="fld">What members see<textarea data-cf="blurb" placeholder="Gym, classes and recovery. Our best value.">'+v("blurb")+'</textarea></label>'+
  '<label class="fld">Note for staff<input data-cf="staff_note" value="'+v("staff_note")+'" placeholder="Only for people who work at the hospital"></label>'+
  '<details'+(c.gm_id?"":" open")+'><summary class="muted" style="cursor:pointer;font-size:13px">GymMaster link (while GymMaster still runs sign-ups)</summary><label class="fld" style="margin-top:8px">GymMaster membership id<input data-cf="gm_id" inputmode="numeric" value="'+v("gm_id")+'" placeholder="Like 844762"></label><p class="muted" style="font-size:13px;margin:4px 0 0">Make the same membership in GymMaster, then put its id here so it shows in Add member and on the join page.'+(c.gm_name?" GymMaster calls it \u201c"+esc(c.gm_name)+"\u201d.":"")+'</p></details>'+
  '<div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn dark" id="cfSave">'+(n?"Add it":"Save changes")+'</button>'+(!n&&c.status==="selling"?'<button class="btn line" id="cfStop">Stop selling</button>':"")+'</div><div id="cfMsg"></div>';
 $("#cfClose").onclick=function(){CAT.cur=null;$("#catForm").innerHTML='<h2>Pick something to change</h2><p class="muted" style="margin:0">Tap any membership, trial or pass to change it.</p>';drawCat()};
 var send=function(extra){var b={id:c.id};$$("#catForm [data-cf]").forEach(function(el){b[el.dataset.cf]=el.type==="checkbox"?el.checked:el.value});for(var k in extra)b[k]=extra[k];
  post("/api/catalog",b).then(function(r){if(!r.ok){$("#cfMsg").innerHTML='<div class="err">'+esc(r.error)+'</div>';return}var keep=r.id||c.id;CAT.cur=keep;
   get("/api/catalog").then(function(d2){CAT.data=d2;var it=d2.items.find(function(x){return x.id===keep});if(it){CAT.tab=catTab(it);catEdit(it)}drawCat();loadCat();$("#cfMsg").innerHTML='<div class="'+(r.warn?"warnbox":"ok")+'">'+esc(r.warn||(r.unchanged?"Nothing changed.":"Saved."))+'</div>'})})};
 $("#cfSave").onclick=function(){send({})};
 var st=$("#cfStop");if(st)st.onclick=function(){if(confirm("Stop selling "+c.name+"? Members already on it keep it."))send({status:"existing"})};
 if(window.innerWidth<900)$("#catForm").scrollIntoView({behavior:"smooth"});
}
$("#catTabs").addEventListener("click",function(e){var b=e.target.closest("[data-ct2]");if(!b)return;CAT.tab=b.dataset.ct2;drawCat()});
$("#catList").addEventListener("click",function(e){var b=e.target.closest("[data-cat]");if(!b)return;CAT.cur=+b.dataset.cat;drawCat();catEdit(CAT.data.items.find(function(x){return x.id===CAT.cur}))});
$("#catNew").addEventListener("click",function(){CAT.cur=null;drawCat();catEdit(null)});

