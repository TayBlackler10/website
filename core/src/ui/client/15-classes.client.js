/* ---------- classes ---------- */
var CLS={week:null,data:null,cur:null};
function loadClasses(w){
 get("/api/classes"+(w?"?week="+w:"")).then(function(d){
  if(d.error){$("#clsWeek").innerHTML='<div class="err">'+esc(d.error)+'</div>';return}
  CLS.data=d;CLS.week=d.week;$("#clsSrcLab").textContent=d.source==="core"?"Run by the M2 Core, the same as the M2 App":"Live from GymMaster, the same as the M2 App";
  var mon=new Date(d.week+"T12:00:00");
  $("#clsTitle").textContent=(d.today>=d.week&&d.today<d.next?"This week":"Week of "+mon.toLocaleDateString("en-NZ",{day:"numeric",month:"long"}));
  $("#clsCount").textContent=d.classes.length+" classes, "+d.classes.reduce(function(a,c){return a+c.booked},0)+" booked";
  var bk=0,sp=0,fu=0,wl=0,qu=0,top=null;d.classes.forEach(function(c){bk+=c.booked;sp+=c.max;if(c.max&&c.booked>=c.max)fu++;wl+=c.waitlist||0;if(c.day>=d.today&&c.max&&c.booked/c.max<0.25)qu++;if(!top||c.booked>top.booked)top=c});
  var types={};d.classes.forEach(function(c){var t=types[c.name]=types[c.name]||{b:0,s:0};t.b+=c.booked;t.s+=c.max});
  var best=Object.keys(types).sort(function(a,b){return types[b].b/Math.max(types[b].s,1)-types[a].b/Math.max(types[a].s,1)})[0];
  $("#clsTiles").innerHTML=tile(d.classes.length,"Classes this week")+tile(bk,"Spots booked")+tile(sp?Math.round(bk/sp*100)+"%":"-","How full, on average")+tile(fu,"Full classes")+tile(wl,"On waitlists")+tile(qu,"Coming up under a quarter full")+(best?tile(best,"Fullest class type"):"");
  var PAL=["#0A0A0A","#5E6B00","#DFFF00","#8C8C84","#C9A227","#3B6E8F","#A33A00"],names=Object.keys(types).sort(),col={};names.forEach(function(n,i){col[n]=PAL[i%PAL.length]});
  $("#clsLegend").innerHTML=names.map(function(n){return '<span><i style="background:'+col[n]+'"></i>'+esc(n)+' '+d.classes.filter(function(c){return c.name===n}).length+'</span>'}).join("");
  $("#clsNote2").innerHTML=d.classes.length&&!bk?'<div class="warnbox" style="margin-bottom:6px">Nobody has booked through GymMaster this week. Bookings show here as soon as members book in the M2 App or GymMaster, and reception can book people in by tapping a class.</div>':"";
  var days7=[0,1,2,3,4,5,6].map(function(i){var x=new Date(d.week+"T12:00:00Z");x.setUTCDate(x.getUTCDate()+i);return x.toISOString().slice(0,10)});
  $("#clsWeek").className="ccal";
  $("#clsWeek").innerHTML=days7.map(function(dy){var list=d.classes.filter(function(c){return c.day===dy});var dd=new Date(dy+"T12:00:00");
   return '<div class="cd'+(dy===d.today?" today":"")+'"><div class="cdh"><span>'+esc(dd.toLocaleDateString("en-NZ",{weekday:"short"}))+(dy===d.today?", today":"")+'</span><b>'+dd.getDate()+'</b></div>'+
    list.map(function(c){var pct=c.max?Math.round(c.booked/c.max*100):0,full=c.max&&c.booked>=c.max;
     return '<button class="cb'+(dy<d.today?" past":"")+(CLS.cur&&CLS.cur.id===c.id?" on":"")+'" data-cls="'+c.id+'" style="border-left-color:'+col[c.name]+'"><span class="ct2">'+esc(c.time||c.start)+'</span><b>'+esc(c.name)+'</b><span class="co">'+esc(c.coach||"No coach")+'</span><div class="fill"><i class="'+(full?"full":"")+'" style="width:'+pct+'%"></i></div><span class="co">'+c.booked+' of '+c.max+' booked'+(c.waitlist?", "+c.waitlist+" waiting":"")+'</span></button>'}).join("")+(list.length?"":'<div class="muted" style="padding:6px 2px">No classes</div>')+'</div>'}).join("");
 });
}
$("#clsPrev").addEventListener("click",function(){if(CLS.data)loadClasses(CLS.data.prev)});
function pctRows(list){return hbars(list.map(function(x){return [x.k+" ("+x.classes+")",x.fill||0]}),function(v){return v+"%"})}
function loadClassStats(){
 get("/api/classes/stats").then(function(d){
  if(!d.tracked){$("#csNote").textContent="Builds up as classes run.";}
  else $("#csNote").textContent=d.tracked+" classes tracked since "+day(d.since);
  $("#csName").innerHTML=pctRows(d.byName||[]);$("#csCoach").innerHTML=pctRows(d.byCoach||[]);$("#csHour").innerHTML=pctRows(d.byHour||[]);
  $("#csDay").innerHTML=pctRows((d.byDay||[]).map(function(x){return {k:x.k.slice(2),classes:x.classes,fill:x.fill}}));
  $("#csWeek").innerHTML=(d.byWeek||[]).length?bars(d.byWeek.map(function(w){return {label:day(w.k),vals:[w.booked||0,w.spots||0]}}),[{name:"Booked",cls:""},{name:"Spots",cls:"s1"}]):'<div class="muted">Nothing yet.</div>';
 });
}
$("#clsNext").addEventListener("click",function(){if(CLS.data)loadClasses(CLS.data.next)});
$("#clsNow").addEventListener("click",function(){loadClasses(null)});
$("#clsWeek").addEventListener("click",function(e){var b=e.target.closest("[data-cls]");if(!b)return;var c=CLS.data.classes.find(function(x){return String(x.id)===b.dataset.cls});CLS.cur=c;$$(".cb").forEach(function(x){x.classList.toggle("on",x===b)});document.querySelector("#clsPanel").scrollIntoView({behavior:"smooth",block:"nearest"});openClass(c)});
function clsLabel(c){return c.name+", "+new Date(c.day+"T12:00:00").toLocaleDateString("en-NZ",{weekday:"short",day:"numeric",month:"short"})+" "+c.time}
function openClass(c){
 var P=$("#clsPanel");
 P.innerHTML='<div style="display:flex;gap:10px;align-items:baseline;flex-wrap:wrap"><h2>'+esc(c.name)+'</h2><span class="muted">'+esc(clsLabel(c).split(", ")[1])+'</span></div><dl class="kv"><dt>Coach</dt><dd>'+esc(c.coach||"-")+'</dd><dt>Booked</dt><dd>'+c.booked+' of '+c.max+(c.waitlist?", "+c.waitlist+" waiting":"")+'</dd>'+(c.location?'<dt>Where</dt><dd>'+esc(c.location)+'</dd>':"")+'</dl>'+
  (CLS.data.can_book&&c.day>=CLS.data.today?'<div><label class="sr" for="clsQ">Find a member to book</label><div class="search" style="height:42px"><input id="clsQ" autocomplete="off" placeholder="Book someone in: name, mobile or key tag"></div><div class="list" id="clsFind"></div><div class="err" id="clsErr"></div></div>':"")+
  '<div id="clsAtt"><div class="muted">Getting the list from GymMaster...</div></div>';
 var q=$("#clsQ"),t;if(q)q.addEventListener("input",function(){clearTimeout(t);t=setTimeout(function(){var v=q.value;if(v.trim().length<2){$("#clsFind").innerHTML="";return}
  get("/api/members?q="+encodeURIComponent(v)).then(function(d){$("#clsFind").innerHTML=(d.results||[]).slice(0,8).map(function(m){return '<div class="r" style="cursor:default"><span><b>'+esc(nm(m))+'</b> <span class="muted">'+esc(m.plan||m.status)+'</span></span><button class="btn dark sm" data-book="'+m.id+'">Book</button></div>'}).join("")||'<div class="muted">No one found.</div>'})},250)});
 get("/api/classes/"+c.id).then(function(d){
  if(d.error){$("#clsAtt").innerHTML='<div class="err">'+esc(d.error)+'</div>';return}
  var a=d.attendees||[];
  $("#clsAtt").innerHTML=(a.length?'<h3 style="margin-top:6px">Who\'s coming</h3>':'<div class="muted">Nobody booked yet.</div>')+a.map(function(p){
   return '<div class="att"><div class="face sm">'+(p.has_photo?'<img src="/api/members/'+p.member_id+'/photo" alt="">':esc(initials(p.name)))+'</div><div class="who"><b>'+(p.open?'<a href="#" data-member="'+p.member_id+'">'+esc(p.name)+'</a>':esc(p.name))+'</b> '+(p.status!=="booked"?'<span class="pill'+(p.status==="waitlist"?" warn":" ok")+'">'+esc(p.status==="waitlist"?"Waitlist":p.status==="attended"?"Here":p.status)+'</span> ':"")+(p.blocked?'<span class="pill warn">Owes money</span> ':"")+(p.passport?'<span class="pill">Passport</span>':"")+'</div>'+
    (CLS.data.can_book&&c.day>=CLS.data.today&&p.member_id?'<button class="btn line sm" data-unbook="'+p.member_id+'" data-bid="'+esc(p.booking_id||"")+'">Cancel</button>':"")+'</div>'}).join("")+
   (d.unknown_fields?'<div class="muted">GymMaster sent fields the Core doesn\'t know yet: '+esc(d.unknown_fields.join(", "))+'</div>':"");
 });
}
$("#clsPanel").addEventListener("click",function(e){
 var b=e.target.closest("[data-book]"),u=e.target.closest("[data-unbook]"),c=CLS.cur;if(!c||(!b&&!u))return;
 if(b){b.disabled=true;$("#clsErr").textContent="";post("/api/classes/"+c.id+"/book",{member_id:+b.dataset.book,label:clsLabel(c)}).then(function(r){if(!r.ok){b.disabled=false;$("#clsErr").textContent=r.error;return}c.booked++;openClass(c);loadClasses(CLS.week)})}
 if(u){if(!confirm("Cancel this booking?"))return;u.disabled=true;post("/api/classes/"+c.id+"/cancel",{member_id:+u.dataset.unbook,booking_id:u.dataset.bid||null,label:clsLabel(c)}).then(function(r){if(!r.ok){u.disabled=false;alertIn(u.parentNode,r.error);return}c.booked=Math.max(0,c.booked-1);openClass(c);loadClasses(CLS.week)})}
});

