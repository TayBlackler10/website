/* ---------- growth (owners) ---------- */
function loadGrowth(){
 get("/api/growth").then(function(d){
  if(d.error){$("#grTiles").innerHTML='<div class="err">'+esc(d.error)+'</div>';return}
  var sn=d.snaps||[],last=sn[sn.length-1]||{},ym=new Date().toISOString().slice(0,7);
  var ago=sn.filter(function(s){return s.day<=new Date(Date.now()-30*864e5).toISOString().slice(0,10)}).pop();
  var j=(d.joins.find(function(x){return x.month===ym})||{}).n||0,l=(d.leaves.find(function(x){return x.month===ym})||{}).n||0;
  var tr=d.trials.slice(-4,-1),tn=tr.reduce(function(a,x){return a+x.n},0),tj=tr.reduce(function(a,x){return a+(x.joined||0)},0);
  var perf=(d.mix.find(function(x){return x.family==="perform"})||{}).n||0;
  $("#grTiles").innerHTML=tile((last.members||0).toLocaleString("en-NZ"),"Members today")+tile(ago?((last.members-ago.members>=0?"+":"")+(last.members-ago.members)):"-","Change in 30 days")+tile(j,"Joined this month")+tile(l,"Left this month")+tile(tn?Math.round(tj/tn*100)+"%":"-","Trials who joined (3 months)")+tile(last.members?Math.round(perf/last.members*100)+"%":"-","On Perform");
  var pts=sn.map(function(s){return [day(s.day),s.members]});var note="Counted nightly";
  if(pts.length<5&&d.history&&d.history.length>1){pts=d.history.filter(function(h){return h.members}).map(function(h){return [MON[+String(h.month).slice(5,7)-1]+" "+String(h.month).slice(0,4),h.members]});note="Month-end counts from GymMaster"}
  $("#grLineNote").textContent=note;$("#grLine").innerHTML=lineChart(pts);
  var F={perform:"Perform",classes:"Classes",daily:"Daily",recovery:"Recovery",passport:"Fitness Passport",transporter:"Transporter",pass:"Visit pass",pool:"Pool",trial:"Trial",staff:"Staff",other:"Other",challenge:"Challenge"};
  $("#grMix").innerHTML=hbars(d.mix.map(function(x){return [F[x.family]||x.family,x.n]}),function(n){return n.toLocaleString("en-NZ")});
  var months={};d.joins.forEach(function(x){(months[x.month]=months[x.month]||[0,0])[0]=x.n});d.leaves.forEach(function(x){(months[x.month]=months[x.month]||[0,0])[1]=x.n});
  (d.history||[]).forEach(function(h){if(!months[h.month]&&h.joins!=null)months[h.month]=[h.joins,h.cancels||0]});
  var mk=Object.keys(months).sort().slice(-12);
  $("#grJoins").innerHTML=mk.length?bars(mk.map(function(m){return {label:ml(m),vals:months[m]}}),[{name:"Joined",cls:""},{name:"Left",cls:"s2"}]):'<div class="muted">Nothing yet.</div>';
  $("#grSources").innerHTML=hbars(d.sources.map(function(x){return [x.source,x.n]}));
  $("#grTrials").innerHTML=d.trials.length?table([["Month",function(x){return MON[+x.month.slice(5,7)-1]+" "+x.month.slice(0,4)}],["Trials","n",1],["Joined","joined",1],["Joined %",function(x){return x.n?Math.round((x.joined||0)/x.n*100)+"%":""},1]],d.trials.slice().reverse()):'<div class="muted">No trials yet.</div>';
  $("#grLeads").innerHTML=hbars(d.leads.map(function(x){return [(KIND[x.kind]||x.kind)+(x.joined?" ("+x.joined+" joined)":""),x.n]}));
 });
 get("/api/growth/more").then(function(d){
  if(d.error)return;
  var n=function(v){return Number(v||0).toLocaleString("en-NZ")};
  $("#grAge").innerHTML=hbars(d.age.map(function(x){return [x.band,x.n]}),n);
  $("#grGender").innerHTML=hbars(d.gender.map(function(x){return [x.g,x.n]}),n);
  $("#grSuburbs").innerHTML=hbars(d.suburbs.map(function(x){return [x.s,x.n]}),n);
  var order=["Under 3 months","3 to 6 months","6 to 12 months","1 to 2 years","2 years plus","Unknown"];
  $("#grTenure").innerHTML=hbars(d.tenure.slice().sort(function(a,b){return order.indexOf(a.band)-order.indexOf(b.band)}).map(function(x){return [x.band,x.n]}),n);
  var F={perform:"Perform",classes:"Classes",daily:"Daily",recovery:"Recovery",transporter:"Transporter",passport:"Fitness Passport",pass:"Visit pass",pool:"Pool",trial:"Trial",staff:"Staff",other:"Other",challenge:"Challenge"};
  $("#grRevenue").innerHTML=hbars(d.revenue.map(function(x){return [(F[x.family]||x.family)+" ("+x.n+")",x.weekly]}),whole$);
  $("#grUsageNote").textContent="Visits in "+MON[+d.last_ym.slice(5,7)-1]+", for members whose counts have been copied from GymMaster.";
  $("#grUsage").innerHTML=d.usage.length?table([["",function(x){return x.who}],["None",function(x){return n(x.none)+" ("+Math.round(x.none/x.n*100)+"%)"},1],["1 to 4",function(x){return n(x.light)},1],["5 to 11",function(x){return n(x.regular)},1],["12 plus",function(x){return n(x.keen)},1]],d.usage):'<div class="muted">Visit counts are still being copied.</div>';
  var fams={},ms={};d.joins_by_family.forEach(function(x){fams[x.family]=1;(ms[x.month]=ms[x.month]||{})[x.family]=x.n});
  var fk=Object.keys(fams).sort(),mk=Object.keys(ms).sort();
  $("#grJoinFam").innerHTML=mk.length?table([["Month",function(m){return MON[+m.slice(5,7)-1]}]].concat(fk.map(function(f){return [F[f]||f,function(m){return ms[m][f]||""},1]})),mk):'<div class="muted">Nothing yet.</div>';
 });
}

