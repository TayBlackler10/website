/* ---------- start ---------- */
get("/api/me").then(function(me){
 // Front desk screens lock after 30 minutes with nobody touching them: the next person needs a fresh sign-in code.
 if(["reception","trainer","coach"].indexOf(me.role)>=0){var idleAt=Date.now(),bump=function(){idleAt=Date.now()};
  ["pointerdown","keydown","scroll","touchstart"].forEach(function(ev){document.addEventListener(ev,bump,{passive:true})});
  setInterval(function(){if(Date.now()-idleAt>30*60000){location.href="/cdn-cgi/access/logout"}},30000);
  document.addEventListener("visibilitychange",function(){if(document.visibilityState==="visible"&&Date.now()-idleAt>30*60000)location.href="/cdn-cgi/access/logout"})}
 ME=me;
 $("#meName").textContent=me.name;$("#meRole").textContent=me.role.charAt(0).toUpperCase()+me.role.slice(1);
 $("#meAv").textContent=me.name.split(" ").map(function(x){return x[0]}).join("").slice(0,2);
 var h=new Date().getHours();$("#hello").innerHTML=(h<12?"Morning,":h<17?"Afternoon,":"Evening,")+"<br><em>"+esc(me.name.split(" ")[0])+"</em>";
 if(me.can.members===true)$("#navFp").hidden=false;
 if(me.can.settings){$("#navApp").hidden=false;$("#navImport").hidden=false;$("#navStaff").hidden=false;$("#navActivity").hidden=false;$("#navSettings").hidden=false}
 if(me.can.settings){$("#navPt").hidden=false;ptCount()}
 if(!me.can.settings){get("/api/pt/mine").then(function(d){var L=d.leads||[];if(L.length||["trainer","coach","manager"].indexOf(me.role)>=0){$("#navMyPt").hidden=false;var n=L.filter(function(l){return l.pt_status==="assigned"}).length;$("#ctMyPt").hidden=!n;$("#ctMyPt").textContent=n}})}
 if(me.can.collections){$("#navReports").hidden=false;$("#navCol").hidden=false;$("#navBill").hidden=false;$("#navEm").hidden=false}
 if(me.can.members===true)$("#navIns").hidden=false;
 if(me.can.business){$("#navWhy").hidden=false;$("#navPlays").hidden=false;$("#navMoney").hidden=false;$("#navGrowth").hidden=false;$("#navMkt").hidden=false}
 if(me.can.add){$("#navPos").hidden=false;$("#navCat").hidden=false;$("#navAdd").hidden=false;$("#addTop").hidden=false;$("#newLeadBtn").hidden=false}
 navLabels();
 var hv=(location.hash||"").slice(1);var hb=hv&&document.querySelector('.nav[data-go="'+hv.replace(/[^a-z]/g,"")+'"]');
 if(hb&&!hb.hidden)show(hb.dataset.go);else{loadToday();loadHome();if(me.can.business){loadBiz();loadMorning()}}
 if("serviceWorker" in navigator)navigator.serviceWorker.register("/sw.js").catch(function(){});
}).catch(function(e){$("#jobs").innerHTML='<div class="err">'+esc(e)+'</div>'});

function loadBiz(){
 get("/api/summary").then(function(s){
  var fam={};(s.by_family||[]).forEach(function(f){fam[f.family]=f.n});
  var t=[["Members",s.members],["Fitness Passport",s.passport],["On a trial or pass",s.on_trial||0],["Perform",fam.perform||0],["Daily",fam.daily||0],
   ["Billed weekly by Ezidebit",s.weekly_billed!=null?"$"+Math.round(s.weekly_billed).toLocaleString("en-NZ"):"-"],
   ["Owed to M2",s.owed_total!=null?"$"+Math.round(s.owed_total).toLocaleString("en-NZ"):"-"],
   ["Lead source recorded",(s.lead_source_pct||0)+"%"],["Blocked at the door",s.blocked]];
  $("#bizTiles").innerHTML=t.map(function(x){return '<div class="tile"><div class="n">'+esc(typeof x[1]==="number"?x[1].toLocaleString("en-NZ"):x[1])+'</div><div class="l">'+esc(x[0])+'</div></div>'}).join("");
  if(s.last_sync)$("#sync").textContent="Last copy from GymMaster "+day(s.last_sync.finished_at)+(s.last_sync.ok===0?" (failed: "+(s.last_sync.error||"")+")":"");
  $("#biz").hidden=false;
 });
}

