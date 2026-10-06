/* ---------- owners: yesterday at a glance ---------- */
function loadMorning(){get("/api/morning").then(function(d){if(d.error)return;var el=$("#morning");el.hidden=false;
 var dd=new Date(d.day+"T12:00:00"),dl=dd.toLocaleDateString("en-NZ",{weekday:"long",day:"numeric",month:"long"});
 var paying=d.joins.filter(function(j){return !j.passport}).length,fpj=d.joins.length-paying;
 var pos=0;(d.pos||[]).forEach(function(p){pos+=p.total});
 var fill=function(c){return c&&c.spots?Math.round(c.booked/c.spots*100)+"%":"-"};
 var ld=(d.leads||[]).reduce(function(a,l){return a+l.n},0);
 var h='<div style="display:flex;gap:10px;align-items:baseline;flex-wrap:wrap"><h2 style="margin-right:auto">Yesterday, '+esc(dl)+'</h2><span class="muted" style="font-size:13px">Only you and Tim see this</span></div>';
 h+='<div class="tiles" style="margin-top:10px">'+tile(paying+(fpj?" + "+fpj+" FP":""),"Joined")+tile((d.trials||[]).length,"Trials and passes started")+tile(d.cancels.length,"Gave notice")+tile(d.failed.length,"Payments failed"+(d.failed.length?", "+money(d.failed_total):""))+tile(d.people+(d.people_week_ago?" ("+(d.people>=d.people_week_ago?"+":"")+(d.people-d.people_week_ago)+")":""),"Came in (vs last week)")
  +tile(ld,"New leads")+tile(d.pt_waiting,"PT leads waiting for Tim")+tile(fill(d.classes_yesterday),"Classes full yesterday")+tile(money(pos),"Point of sale")+'</div>';
 var fp=d.passport;h+='<div class="ok" style="margin-top:12px">Fitness Passport this month: <b>'+fp.visits.toLocaleString("en-NZ")+' visits</b> in '+fp.days_counted+' days'+(fp.pace?', on pace for <b>'+fp.pace.toLocaleString("en-NZ")+'</b> (about '+money(fp.at_pace)+')':"")+(fp.last_month&&fp.last_month.visits?'. Last month '+fp.last_month.visits.toLocaleString("en-NZ"):"")+'.</div>';
 var lst=function(title,rows,f){return rows.length?'<div style="margin-top:12px"><b>'+title+'</b><div class="list">'+rows.slice(0,8).map(function(r){return '<div data-member="'+r.id+'" style="cursor:pointer;display:flex;gap:14px;align-items:baseline;padding:10px 6px;border-top:1px solid var(--line)"><span style="flex:0 0 auto;max-width:45%">'+esc(r.name)+'</span><span class="muted" style="font-size:13px;flex:1 1 auto;min-width:0;text-align:right;overflow-wrap:anywhere">'+f(r)+'</span></div>'}).join("")+(rows.length>8?'<div class="muted" style="font-size:13px">and '+(rows.length-8)+' more</div>':"")+'</div></div>':""};
 h+='<div class="row2" style="margin-top:4px"><div>'+lst("Joined",d.joins,function(r){return esc(r.plan||"")})+lst("Trials and passes",d.trials||[],function(r){return esc(r.plan||"")})+lst("Gave notice",d.cancels,function(r){return esc((r.plan||"")+(r.reason?", "+r.reason:"")+(r.from?", from "+r.from:""))})+'</div><div>'+lst("Payments failed",d.failed,function(r){var why=String(r.reason||"");if(/only active customers/i.test(why))why="Not active in Ezidebit, payment couldn't be added";return money(r.amount)+(why?", "+esc(why):"")})+
  (d.today_classes.length?'<div style="margin-top:12px"><b>Classes today</b><div class="list">'+d.today_classes.map(function(c){return '<div class="lrow"><span>'+esc(String(c.start||"").slice(0,5))+' '+esc(c.name)+'</span><span class="muted" style="font-size:13px">'+c.booked+' of '+c.max+(c.waitlist?", "+c.waitlist+" waiting":"")+'</span></div>'}).join("")+'</div></div>':"")+'</div></div>';
 if(d.app_requests)h+='<p class="muted" style="margin-top:10px">'+d.app_requests+' request'+(d.app_requests>1?"s":"")+' from the app waiting. <a href="#" data-go="app">See them</a></p>';
 el.innerHTML=h})}


