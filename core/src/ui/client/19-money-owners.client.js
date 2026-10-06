/* ---------- money (owners) ---------- */
function loadMoney(){
 get("/api/money").then(function(d){
  if(d.error){$("#monTiles").innerHTML='<div class="err">'+esc(d.error)+'</div>';return}
  var pct=d.target?Math.round(d.ytd/d.target*100):0,due=d.target?Math.round(d.target_to_date/d.target*100):0;
  $("#monGoal").innerHTML='<div style="display:flex;gap:10px;align-items:baseline;flex-wrap:wrap"><span class="eyebrow">This financial year, from '+esc(ml(d.fy))+'</span><span style="margin-left:auto;color:var(--soft);font-size:13px">'+whole$(d.ytd)+' of '+whole$(d.target)+' ('+pct+'%). On plan would be '+whole$(d.target_to_date)+' by the end of '+(d.last_month?MON[+d.last_month.slice(5,7)-1]:"this month")+'.</span></div><div class="goal" style="position:relative"><i style="width:'+Math.min(100,pct)+'%"></i><span style="position:absolute;top:-3px;bottom:-3px;left:'+Math.min(100,due)+'%;width:2px;background:#fff"></span></div>';
  var cash=(d.points||[]).find(function(p){return p.key==="cash"});
  $("#monTiles").innerHTML=tile(k$(d.ytd),"Income this year, excl GST")+tile(k$(d.ytd_net),"Profit this year")+tile(d.pace?k$(d.pace):"-","Year at this pace")+
   tile(whole$(d.weekly_billed),"Billed weekly by direct debit")+tile(k$(d.yearly_billed_ex_gst),"Memberships per year, excl GST")+
   (d.passport_estimate!=null?tile(whole$(d.passport_estimate),"Fitness Passport this month so far"):"")+tile(whole$(d.owed_current),"Owed by members")+(cash?tile(k$(cash.value),"Cash in the bank"):"");
  $("#monUpd").textContent=d.updated?"Xero figures from "+day(d.updated):"No Xero figures yet";
  var ms=(d.months||[]).slice(0,12).reverse();
  $("#monChart").innerHTML=ms.length?bars(ms.map(function(m){return {label:ml(m.month),vals:[m.income||0,(m.cost_of_sales||0)+(m.expenses||0),m.net||0]}}),[{name:"Income",cls:""},{name:"Costs",cls:"s1"},{name:"Profit",cls:"s2"}],whole$):'<div class="muted">Ask Claude to bring in Xero and this fills in.</div>';
  $("#monPoints").innerHTML=(d.points||[]).map(function(p){return '<dt>'+esc(p.label||p.key)+'</dt><dd><b>'+money(p.value)+'</b> <span class="muted">'+esc(day(p.as_of))+'</span></dd>'}).join("")+'<dt>Owed by people who left</dt><dd>'+money(d.owed_left)+'</dd>';
  $("#monTable").innerHTML=(d.months||[]).length?table([["Month",function(m){return MON[+m.month.slice(5,7)-1]+" "+m.month.slice(0,4)}],["Income",function(m){return whole$(m.income)},1],["Cost of sales",function(m){return whole$(m.cost_of_sales)},1],["Expenses",function(m){return whole$(m.expenses)},1],["Profit",function(m){return '<b style="color:'+((m.net||0)<0?"var(--red)":"inherit")+'">'+whole$(m.net)+'</b>'},1,1],["Margin",function(m){return m.income?Math.round((m.net||0)/m.income*100)+"%":""},1]],d.months):'<div class="muted">Nothing yet.</div>';
  var lm=(d.months||[]).find(function(m){return m.lines});
  if(lm){$("#monLinesCard").hidden=false;$("#monLinesTitle").textContent="Where the money came from and went, "+MON[+lm.month.slice(5,7)-1]+" "+lm.month.slice(0,4);
   var inc=(lm.lines.income||[]).slice().sort(function(a,b){return b[1]-a[1]}).slice(0,10),exp=(lm.lines.expenses||[]).slice().sort(function(a,b){return b[1]-a[1]}).slice(0,12);
   $("#monLines").innerHTML='<div><h3>Income</h3>'+hbars(inc,whole$)+'</div><div><h3>Biggest costs</h3>'+hbars(exp,whole$)+'</div>'}
 });
}

