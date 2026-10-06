/* ---------- staff and access ---------- */
var ROLE_N={owner:"Owner",manager:"Manager",reception:"Reception",trainer:"Trainer",coach:"Coach"};
function loadAct(){
 var q=new URLSearchParams();["Staff","Action","Day"].forEach(function(k){var v=$("#act"+k).value;if(v)q.set(k.toLowerCase(),v)});
 get("/api/activity?"+q).then(function(d){
  if(d.error){$("#actRows").innerHTML='<div class="err">'+esc(d.error)+'</div>';return}
  if($("#actStaff").options.length<2){d.people.forEach(function(p){$("#actStaff").insertAdjacentHTML("beforeend",'<option value="'+p.id+'">'+esc(p.name)+'</option>')});
   Object.keys(d.labels).forEach(function(k){$("#actAction").insertAdjacentHTML("beforeend",'<option value="'+k+'">'+esc(d.labels[k])+'</option>')});$("#actAction").insertAdjacentHTML("beforeend",'<option value="alert">Alerts</option>')}
  $("#actToday").innerHTML=(d.alerts_week?'<div class="ok" style="margin-bottom:10px">'+d.alerts_week+' alert'+(d.alerts_week>1?"s":"")+' in the last 7 days. Pick "Alerts" under What to see them.</div>':"")+
   (d.today.length?table([["Who","name"],["Role","role"],["Actions","actions",1],["Members opened","members",1],["Reports and files","reports",1],["Last","last",1]],d.today):'<div class="muted">Nothing yet.</div>');
  $("#actRows").innerHTML=d.rows.length?table([["When",function(r){return r.at.slice(5,16)}],["Who","staff"],["What",function(r){return r.action==="alert"?'<b style="color:#B42318">Alert</b>':esc(r.label)},0,1],["Member or detail",function(r){return esc(r.member||r.detail||"")+(r.member&&r.detail?' <span class="muted">'+esc(r.detail)+'</span>':"")},0,1],["From",function(r){return (r.country||"")+(r.ip?" "+r.ip:"")}]],
   d.rows.map(function(r){if(r.member_id)r._member=r.member_id;return r})):'<div class="muted">Nothing matches.</div>';
 })}
["actStaff","actAction","actDay"].forEach(function(i){document.addEventListener("change",function(e){if(e.target.id===i)loadAct()})});
function loadStaff(){
 get("/api/staff-admin").then(function(d){
  if(d.error){$("#staffList").innerHTML='<div class="err">'+esc(d.error)+'</div>';return}
  $("#staffList").innerHTML=d.staff.map(function(s){return '<div class="r" data-st="'+esc(JSON.stringify(s))+'" style="cursor:pointer'+(s.active?"":";opacity:.5")+'"><span><b>'+esc(s.name)+'</b> <span class="muted">'+esc(s.email)+'</span></span><span class="pill'+(s.role==="owner"?" dark":"")+'">'+esc(ROLE_N[s.role]||s.role)+(s.active?"":", off")+'</span>'+(s.role!=="owner"&&!s.active?'<button class="btn line sm" data-strm="'+s.id+'" data-nm="'+esc(s.name)+'">Remove</button>':"")+'</div>'}).join("");
 });
}
$("#staffList").addEventListener("click",function(e){var b=e.target.closest("[data-strm]");if(!b)return;e.stopPropagation();if(!confirm("Remove "+b.dataset.nm+" completely? Their shifts go, their notes stay without their name."))return;post("/api/staff-admin",{action:"remove",id:+b.dataset.strm}).then(function(r){if(!r.ok)alert(r.error);loadStaff()})},true);
function stFill(s){s=s||{};$("#stId").value=s.id||"";$("#stName").value=s.name||"";$("#stEmail").value=s.email||"";$("#stRole").value=s.role||"reception";$("#stOrder").value=s.list_order==null?100:s.list_order;$("#stActive").checked=s.active!==0;$("#stTitle").textContent=s.id?"Edit "+s.name:"Add someone";$("#stErr").textContent="";$("#stOk").innerHTML=""}
$("#staffList").addEventListener("click",function(e){var r=e.target.closest("[data-st]");if(r)stFill(JSON.parse(r.dataset.st))});
$("#stNew").addEventListener("click",function(){stFill(null)});
$("#stSave").addEventListener("click",function(){
 $("#stErr").textContent="";
 post("/api/staff-admin",{id:$("#stId").value||null,name:$("#stName").value,email:$("#stEmail").value,role:$("#stRole").value,list_order:$("#stOrder").value,active:$("#stActive").checked}).then(function(r){
  if(!r.ok){$("#stErr").textContent=r.error;return}
  var msg='<div class="ok">Saved.'+(r.outsideDomain?" This email isn't @m2club.co.nz, so also add it to the m2-core sign-in rule in Cloudflare.":" They can sign in now with their email and a code.")+'</div>';
  loadStaff();if(!$("#stId").value)stFill(null);$("#stOk").innerHTML=msg;
 });
});

