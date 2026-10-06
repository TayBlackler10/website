/* ---------- marketing (owners) ---------- */
function loadMkt(){
 var m=$("#mkMonth").value;
 get("/api/marketing"+(m?"?month="+m:"")).then(function(d){
  if(d.error){$("#mkTiles").innerHTML='<div class="err">'+esc(d.error)+'</div>';return}
  if(!m)$("#mkMonth").value=d.month;
  var pct=d.budget?Math.round(d.meta_spend/d.budget*100):0,ppct=d.budget?Math.round(d.projected/d.budget*100):0;
  $("#mkBudget").innerHTML='<div style="display:flex;gap:10px;align-items:baseline;flex-wrap:wrap"><span class="eyebrow">Meta budget</span><span style="margin-left:auto;color:var(--soft);font-size:13px">'+money(d.meta_spend)+' of '+whole$(d.budget)+' ('+pct+'%). Heading for '+whole$(d.projected)+' ('+ppct+'%).</span></div><div class="goal"><i style="width:'+Math.min(100,pct)+'%;'+(ppct>110?"background:#FFB27A":"")+'"></i></div>';
  var sess=(d.web||[]).reduce(function(a,w){return a+(w.sessions||0)},0),conv=(d.web||[]).reduce(function(a,w){return a+(w.conversions||0)},0);
  $("#mkTiles").innerHTML=tile(whole$(d.all_spend),"Ad spend")+(d.platform_leads>=10?tile(d.platform_leads,"Leads Meta counted")+tile(money(d.cpl),"Cost per lead"):tile((d.landing_views||0).toLocaleString("en-NZ"),"People who reached the website from ads")+tile(d.cost_per_view!=null?money(d.cost_per_view):"-","Cost per website visit from ads"))+tile(d.social_leads,"Leads in the Core from Instagram and Facebook")+tile(d.social_joins,"Joined from Instagram and Facebook")+tile(d.cost_per_join!=null?whole$(d.cost_per_join):"-","Meta spend per member who joined")+tile(sess.toLocaleString("en-NZ"),"Website visits")+tile(conv.toLocaleString("en-NZ"),"Website conversions");
  $("#mkNote").textContent=d.data_to?"Ad figures up to "+day(d.data_to)+". Joins count members whose Came from says Instagram or Facebook, so recording it at sign-up matters.":"No ad figures yet. Ask Claude to bring in Meta and Google Analytics.";
  $("#mkDaily").innerHTML=d.daily.length?bars(d.daily.map(function(x){return {label:String(+x.day.slice(8)),vals:[x.spend]}}),[{name:"Spend",cls:""}],money):'<div class="muted">Nothing this month yet.</div>';
  $("#mkTrend").innerHTML=d.trend.length?bars(d.trend.map(function(x){return {label:ml(x.month),vals:[x.spend,x.joins*100]}}),[{name:"Spend",cls:""},{name:"Joins from social (x100)",cls:"s2"}],function(v){return v}):'<div class="muted">Nothing yet.</div>';
  $("#mkCamps").innerHTML=d.campaigns.length?table([["Campaign","campaign"],["Where","source"],["Spend",function(x){return money(x.spend)},1],["Seen by",function(x){return (x.impressions||0).toLocaleString("en-NZ")},1],["Clicks",function(x){return (x.clicks||0).toLocaleString("en-NZ")},1],["Leads",function(x){return x.leads||0},1],["Per lead",function(x){return x.leads?money(x.spend/x.leads):"-"},1]],d.campaigns):'<div class="muted">No campaigns this month yet.</div>';
  $("#mkJoins").innerHTML=hbars(d.joins.map(function(x){return [x.source,x.n]}));
  $("#mkWeb").innerHTML=d.web.length?table([["Channel","channel"],["Visits",function(x){return (x.sessions||0).toLocaleString("en-NZ")},1],["Conversions",function(x){return x.conversions||0},1]],d.web):'<div class="muted">No website figures yet.</div>';
  $("#mkLeads").innerHTML=hbars(d.core_leads.map(function(x){return [x.source+(x.joined?" ("+x.joined+" joined)":""),x.n]}));
 });
}
$("#mkMonth").addEventListener("change",function(){loadMkt();loadMktMore()});
function dl(a,b,inv){if(!b)return "";var c=Math.round((a-b)/b*100);if(!isFinite(c))return "";var good=inv?c<0:c>0;return ' <span class="delta '+(c===0?"":good?"up":"down")+'">'+(c>0?"+":"")+c+'%</span>'}
function loadMktMore(){
 var m=$("#mkMonth").value;
 get("/api/marketing/more"+(m?"?month="+m:"")).then(function(d){
  if(d.error)return;
  var a=d.now||{},b=d.before||{},pw=d.paid_web||{},l=d.leads||{},j=d.joins||{};
  var steps=[["Seen the ads",a.impressions||0],["Clicked",a.clicks||0],["Reached the website",a.views||0],["Website visits from paid",pw.sessions||0],["Leads from Instagram or Facebook",l.social||0],["Joined from Instagram or Facebook",j.social||0]];
  var top=Math.max(1,steps[0][1]);
  $("#mkFunnel").innerHTML=steps.map(function(s){return '<div><span>'+esc(s[0])+'</span><span><i style="width:'+Math.max(1.5,Math.sqrt(s[1]/top)*100)+'%"></i></span><b>'+Number(s[1]).toLocaleString("en-NZ")+'</b></div>'}).join("");
  $("#mkTips").innerHTML=(d.tips||[]).map(function(t){return '<div>'+esc(t)+'</div>'}).join("")||'<div>Not enough data this month yet.</div>';
  var rows=[["Ad spend",money(a.spend),money(b.spend),dl(a.spend,b.spend,true)],["Website visits from ads",(a.views||0).toLocaleString("en-NZ"),(b.views||0).toLocaleString("en-NZ"),dl(a.views,b.views)],
   ["Cost per website visit",a.views?money(a.spend/a.views):"-",b.views?money(b.spend/b.views):"-",a.views&&b.views?dl(a.spend/a.views,b.spend/b.views,true):""],
   ["Click rate",a.impressions?(a.clicks/a.impressions*100).toFixed(2)+"%":"-",b.impressions?(b.clicks/b.impressions*100).toFixed(2)+"%":"-",""],
   ["All website visits",((d.web||{}).sessions||0).toLocaleString("en-NZ"),((d.web_prev||{}).sessions||0).toLocaleString("en-NZ"),dl((d.web||{}).sessions,(d.web_prev||{}).sessions)],
   ["Leads in the Core",l.n||0,(d.leads_prev||{}).n||0,dl(l.n,(d.leads_prev||{}).n)],["New members",j.n||0,(d.joins_prev||{}).n||0,dl(j.n,(d.joins_prev||{}).n)]];
  $("#mkVs").innerHTML='<table class="tbl"><thead><tr><th></th><th class="r">'+esc(ml(d.month))+'</th><th class="r">'+esc(ml(d.prev))+'</th><th class="r">Change</th></tr></thead><tbody>'+rows.map(function(r){return '<tr><td>'+esc(r[0])+'</td><td class="r">'+esc(r[1])+'</td><td class="r">'+esc(r[2])+'</td><td class="r">'+r[3]+'</td></tr>'}).join("")+'</tbody></table>';
  var WD=["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
  $("#mkWeekday").innerHTML=hbars((d.weekday||[]).map(function(x){return [WD[+x.d],x.views?x.spend/x.views:0]}),function(v){return "$"+v.toFixed(2)});
  if(d.campaigns&&d.campaigns.length){var tot=d.campaigns.reduce(function(s,c){return s+c.spend},0);
   $("#mkCamps").innerHTML=table([["Campaign","campaign"],["Spend",function(x){return money(x.spend)},1],["Share",function(x){return Math.round(x.spend/tot*100)+"%"},1],["Seen by",function(x){return (x.impressions||0).toLocaleString("en-NZ")},1],["Click rate",function(x){return x.impressions?(x.clicks/x.impressions*100).toFixed(2)+"%":"-"},1],["Per click",function(x){return x.clicks?money(x.spend/x.clicks):"-"},1],["Website visits",function(x){return (x.views||0).toLocaleString("en-NZ")},1],["Per visit",function(x){return x.views?money(x.spend/x.views):"-"},1]],d.campaigns)}
 });
}

