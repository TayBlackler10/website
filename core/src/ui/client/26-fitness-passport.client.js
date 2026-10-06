/* ---------- fitness passport ---------- */
function loadPassport(){
 var mi=$("#fpMonth");if(!mi.value){var n=new Date();mi.value=n.getFullYear()+"-"+String(n.getMonth()+1).padStart(2,"0")}
 $("#fpCsv").href="/api/passport.csv?month="+mi.value;
 get("/api/passport?month="+mi.value).then(function(d){
  if(d.error){$("#fpRows").innerHTML='<div class="err">'+esc(d.error)+'</div>';return}
  var t=[["Passport visits",d.visits.toLocaleString("en-NZ")],["Members who trained",d.members_visiting],["Visits with no Passport ID",d.visits_no_id],
   ["Passport members",d.passport_members.toLocaleString("en-NZ")],["Missing a Passport ID",d.members_no_id==null?"Not known yet":d.members_no_id],["ID not in GymMaster yet",d.members_not_in_gm]];
  if(d.money){t.unshift(["Estimated payout",money(d.money.total)],["Rate per visit now",money(d.money.rate)],["Visits to the next rate",d.money.visits_to_next_tier==null?"Top rate":d.money.visits_to_next_tier]);if(d.money.at_risk)t.push(["Lost to missing IDs",money(d.money.at_risk)])}
  $("#fpTiles").innerHTML=t.map(function(x){return '<div class="tile"><div class="n">'+esc(x[1])+'</div><div class="l">'+esc(x[0])+'</div></div>'}).join("");
  $("#fpNote").textContent=(d.ids_loaded?"":"Passport IDs from GymMaster aren't loaded yet. Add the Fitness Passport ID column to the GymMaster member export and import it. ")+
   "GymMaster reports each Passport check-in to Fitness Passport. This page is M2's own check"+(d.money?". Payout is an estimate from the tier rates, paid the month after.":".");
  var more=function(n,shown){return n>shown?'<div class="muted" style="padding:6px">'+(n-shown)+' more. Download the CSV for the full list.</div>':""};
  $("#fpNoId").innerHTML=d.no_id.slice(0,30).map(function(r,i){return '<div class="person" data-i="'+i+'"><div class="top"><a href="#" data-member="'+r.member_id+'"><b>'+esc(nm(r))+'</b></a> <span class="pill warn">'+r.visits+' visits</span></div><div style="display:flex;gap:8px;flex-wrap:wrap"><label class="sr" for="fpn'+i+'">Fitness Passport ID</label><input id="fpn'+i+'" class="fpIn" inputmode="numeric" placeholder="Fitness Passport ID" style="flex:1;min-width:160px;height:40px;border:1px solid var(--line);border-radius:12px;padding:0 12px"><button class="btn dark sm" data-fpadd="'+r.member_id+'">Save ID</button></div></div>'}).join("")+more(d.no_id.length,30)||'<div class="ok">Every Passport visit this month has an ID.</div>';
  $("#fpDupCard").hidden=!d.duplicate_ids.length;
  $("#fpDup").innerHTML=d.duplicate_ids.map(function(x){return '<div class="r"><span><b>'+esc(x.fp_id)+'</b> <span class="muted">'+esc(x.names)+'</span></span><span class="pill warn">'+x.n+' people</span></div>'}).join("");
  $("#fpRows").innerHTML=d.rows.slice(0,40).map(function(r){return '<div class="r" data-member="'+r.member_id+'"><span><b>'+esc(nm(r))+'</b> <span class="muted">'+(r.fp_id?esc(r.fp_id):"No ID")+'</span></span><span class="pill'+(r.fp_id?"":" warn")+'">'+r.visits+'</span></div>'}).join("")+more(d.rows.length,40)||'<div class="muted">No Passport visits recorded for this month yet. Visits arrive once the Core copies check-ins from GymMaster or the M2 App opens the doors.</div>';
 });
}
$("#fpMonth").addEventListener("change",function(){loadPassport();loadFpCheck(false)});
function loadFpMore(){
 get("/api/passport/insights").then(function(d){
  if(d.error)return;
  var tm=d.this_month,cv=d.cover||{n:0,swept:0};
  var t=[[tm.visits.toLocaleString("en-NZ"),"Passport visits so far this month"],[tm.pace.toLocaleString("en-NZ"),"Heading for, at this pace"]];
  if(d.money){t.push([money(d.money.pace.total),"Pay at this pace (incl GST)"],[money(d.money.pace.rate),"Rate per visit at that level"],[d.money.pace.visits_to_next_tier==null?"Top rate":d.money.pace.visits_to_next_tier.toLocaleString("en-NZ"),"More visits for the next rate"])}
  t.push([(d.sleeper_count||0).toLocaleString("en-NZ"),"Passport members with no visits last month"]);
  $("#fpNowTiles").innerHTML=t.map(function(x){return tile(x[0],x[1])}).join("");
  $("#fpNowNote").textContent=cv.n?("Counts copied for "+(cv.swept||0)+" of "+cv.n+" Passport members so far. The Core refreshes them through the day."):"";
  var months=d.months||[],mm={};months.forEach(function(m){mm[m.month]=m});(d.sweep||[]).forEach(function(s){mm[s.month]=mm[s.month]||{month:s.month};mm[s.month].swept=s.visits});
  var keys=Object.keys(mm).sort().slice(-12),est={};if(d.money)d.money.months.forEach(function(x){est[x.month]=x});
  $("#fpMonthsChart").innerHTML=keys.length?bars(keys.map(function(k){var x=mm[k];return {label:ml(k),vals:[x.visits||x.swept||0]}}),[{name:"Visits",cls:""}],function(v){return v+" visits"}):'<div class="muted">Nothing yet.</div>';
  $("#fpMonthsTbl").innerHTML=keys.length?table([["Month",function(x){return MON[+x.month.slice(5,7)-1]+" "+x.month.slice(0,4)}],["Visits",function(x){return (x.visits||x.swept||0).toLocaleString("en-NZ")},1],["New members",function(x){return x.signups==null?"":x.signups},1]].concat(d.money?[["Pay from tiers",function(x){var e=est[x.month];return e&&e.estimate?money(e.estimate):""},1],["Paid",function(x){return x.paid?money(x.paid):""},1]]:[]),keys.slice().reverse().map(function(k){return mm[k]})):"";
  var f=d.freq||[],tot=f.reduce(function(a,x){return a+x.n},0);
  $("#fpFreqNote").textContent=tot?("Visits in "+MON[+d.last_ym.slice(5,7)-1]+" by "+tot.toLocaleString("en-NZ")+" Passport members with counts copied. More visits means Passport pays more per visit for everyone."):"Visit counts are still being copied from GymMaster.";
  $("#fpFreq").innerHTML=hbars(f.map(function(x){return [x.band+" visits",x.n]}),function(n){return n.toLocaleString("en-NZ")});
  $("#fpJoins").innerHTML=(d.joins||[]).length?bars(d.joins.slice(-12).map(function(x){return {label:ml(x.month),vals:[x.n]}}),[{name:"New",cls:""}]):'<div class="muted">Nothing yet.</div>';
  $("#fpSleepNote").textContent=(d.sleeper_count||0)+" Passport members didn't come in last month and haven't been in this month. Every visit they make earns M2 money: a quick text or call brings some back.";
  $("#fpSleep").innerHTML=(d.sleepers||[]).slice(0,40).map(function(r){return '<div class="r" data-member="'+r.id+'"><span><b>'+esc(nm(r))+'</b> <span class="muted">'+(r.last_month?"last came in "+ml(r.last_month):"no visits in a year")+'</span></span>'+(r.mobile?'<a class="pill" href="tel:'+esc(r.mobile)+'">'+esc(r.mobile)+'</a>':"")+'</div>'}).join("")||'<div class="muted">Nobody yet, or counts are still being copied.</div>';
  $("#fpTop").innerHTML=(d.top||[]).map(function(r){return '<div class="r" data-member="'+r.id+'"><span><b>'+esc(nm(r))+'</b></span><span class="pill ok">'+r.visits+' visits</span></div>'}).join("")||'<div class="muted">Nothing yet.</div>';
 });
}
$("#fpNoId").addEventListener("click",function(e){
 var b=e.target.closest("[data-fpadd]");if(!b)return;e.stopPropagation();
 var box=b.closest(".person");
 post("/api/members/"+b.dataset.fpadd+"/details",{fp_id:box.querySelector(".fpIn").value}).then(function(r){
  if(!r.ok){alertIn(box,r.error);return}loadPassport();
 });
});

