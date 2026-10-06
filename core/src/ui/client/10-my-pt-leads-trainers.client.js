/* ---------- my PT leads (trainers) ---------- */
function myPtCount(){get("/api/pt/mine").then(function(d){var n=(d.leads||[]).filter(function(l){return l.pt_status==="assigned"}).length;$("#ctMyPt").hidden=!n;$("#ctMyPt").textContent=n})}
function loadMyPt(){
 pushBox($("#myPush"));
 get("/api/pt/mine").then(function(d){
  var L=d.leads||[];$("#ctMyPt").hidden=true;
  $("#myPt").innerHTML=L.length?L.map(function(l){var s=PTST[l.pt_status]||[l.pt_status,""],done=l.pt_status==="client"||l.pt_status==="lost";
   return '<div class="ptcard'+(!l.seen_at?" fresh":"")+'" data-my="'+l.id+'"><div style="display:flex;gap:10px;align-items:baseline;flex-wrap:wrap"><h3 style="margin:0;font-size:18px;margin-right:auto">'+esc(l.name||"No name")+'</h3><span class="pill '+s[1]+'">'+esc(s[0])+'</span></div>'+
    (l.tim_note?'<div class="warnbox" style="padding:8px 12px">From Tim: '+esc(l.tim_note)+'</div>':"")+ptAns(l)+
    (l.mobile?'<div style="display:flex;gap:8px;flex-wrap:wrap"><a class="btn dark sm" href="tel:'+esc(l.mobile)+'">Call</a><a class="btn line sm" href="sms:'+esc(l.mobile)+'">Text</a></div>':"")+
    (done?"":'<div class="ptst">'+[["contacted","Contacted"],["booked","Session booked"],["client","Became a client"],["lost","Not going ahead"]].map(function(o){return '<button class="btn sm '+(l.pt_status===o[0]?"dark":"line")+'" data-myst="'+o[0]+'">'+o[1]+'</button>'}).join("")+'</div>')+
    '<div style="display:flex;gap:8px"><input data-mynote placeholder="Add a note" style="flex:1;height:40px;border:1px solid var(--line);border-radius:12px;padding:0 12px"><button class="btn line sm" data-mysave style="height:40px">Save</button></div><div data-myerr></div></div>'}).join(""):'<section class="card"><div class="muted">No PT leads yet. When Tim gives you one, it shows up here'+(Notification&&Notification.permission==="granted"?" and your phone buzzes.":".")+'</div></section>';
 });
}
$("#myPt").addEventListener("click",function(e){
 var c=e.target.closest("[data-my]");if(!c)return;var id=+c.dataset.my,st=e.target.closest("[data-myst]");
 if(!st&&!e.target.closest("[data-mysave]"))return;
 var body={note:c.querySelector("[data-mynote]").value};if(st)body.status=st.dataset.myst;
 post("/api/pt/"+id,body).then(function(r){if(!r.ok){c.querySelector("[data-myerr]").innerHTML='<div class="err">'+esc(r.error)+'</div>';return}loadMyPt()});
});

