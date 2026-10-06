/* ---------- recent visits ---------- */
var VI={data:null,q:"",f:"",timer:null};
function viToday(){return new Date().toLocaleDateString("en-CA",{timeZone:"Pacific/Auckland"})}
function loadVisits(day){if(!$("#viDay").value)$("#viDay").value=viToday();if(day)$("#viDay").value=day;
 get("/api/visits/day?day="+$("#viDay").value).then(function(d){if(d.error){$("#viList").innerHTML='<div class="err">'+esc(d.error)+'</div>';return}VI.data=d;drawVisits()});
 clearInterval(VI.timer);VI.timer=setInterval(function(){if(document.querySelector('section[data-view="visits"]').hidden){clearInterval(VI.timer);return}if($("#viDay").value===viToday())get("/api/visits/day?day="+viToday()).then(function(d){if(!d.error){VI.data=d;drawVisits()}})},60000)}
function drawVisits(){var d=VI.data,isToday=d.day===d.today;
 var diff=d.people-d.week_ago;
 $("#viTiles").innerHTML=tile(d.people,"People"+(isToday?" so far today":""))+tile(d.visits,"Gate entries")+tile((diff>=0?"+":"")+diff,"vs same day last week")+tile(d.rows.filter(function(r){return r.tags.some(function(t){return t[0]==="warn"})}).length,"Need a word at the desk");
 $("#viNote").textContent=d.latest?"GymMaster's visitor report is up to "+new Date(String(d.latest).replace(" ","T")).toLocaleTimeString("en-NZ",{hour:"numeric",minute:"2-digit"})+(isToday?" (it can run a few hours behind; doors opened from the M2 App show straight away)":"")+". Checked every 15 minutes, or tap Check for new visits.":"";
 var F=[["","Everyone"],["warn","Need a word"],["First visit","First visits"],["Back after","Back after a break"],["Birthday","Birthdays"],["Trial","Trials and passes"]];
 $("#viChips").innerHTML=F.map(function(f){return '<button class="chip'+(VI.f===f[0]?" on":"")+'" data-vf="'+esc(f[0])+'">'+f[1]+'</button>'}).join("");
 var q=VI.q.toLowerCase(),L=d.rows.filter(function(r){if(q&&r.name.toLowerCase().indexOf(q)<0)return false;if(!VI.f)return true;
  return r.tags.some(function(t){return VI.f==="warn"?t[0]==="warn":VI.f==="Trial"?(t[1]==="Trial"||t[1]==="Pass"):t[1].indexOf(VI.f)===0})});
 $("#viList").innerHTML=L.length?L.map(function(r){var tm=new Date(String(r.at).replace(" ","T")).toLocaleTimeString("en-NZ",{hour:"numeric",minute:"2-digit"});
  return '<div data-member="'+r.id+'" style="cursor:pointer;display:flex;align-items:center;gap:12px;padding:10px 4px;border-top:1px solid var(--line);text-align:left">'+face(r.id,r.name,r.has_photo)+'<span style="flex:1;min-width:0"><b>'+esc(r.name)+'</b><br><span class="muted" style="font-size:13px">'+esc(r.plan||"")+(r.door&&!/main|front|^entry/i.test(r.door)?" · "+esc(r.door):"")+'</span>'+
   (r.tags.length?'<br>'+r.tags.map(function(t){return '<span class="pill'+(t[0]?" "+t[0]:"")+'" style="margin:4px 4px 0 0">'+esc(t[1])+'</span>'}).join(""):"")+'</span><span class="muted" style="white-space:nowrap">'+tm+'</span></div>'}).join(""):'<div class="muted" style="padding:14px 0">'+(d.rows.length?"Nobody matches.":"No visits copied for this day yet.")+'</div>'}
$("#viDay").addEventListener("change",function(){loadVisits()});
$("#viPrev").addEventListener("click",function(){var x=new Date($("#viDay").value+"T12:00:00Z");x.setUTCDate(x.getUTCDate()-1);loadVisits(x.toISOString().slice(0,10))});
$("#viNext").addEventListener("click",function(){var x=new Date($("#viDay").value+"T12:00:00Z");x.setUTCDate(x.getUTCDate()+1);var v=x.toISOString().slice(0,10);if(v>viToday())return;loadVisits(v)});
$("#viQ").addEventListener("input",function(e){VI.q=e.target.value.trim();if(VI.data)drawVisits()});
$("#viChips").addEventListener("click",function(e){var b=e.target.closest("[data-vf]");if(!b)return;VI.f=b.dataset.vf;drawVisits()});
$("#viPull").addEventListener("click",function(){var b=$("#viPull");b.disabled=true;b.textContent="Checking...";post("/api/visits/refresh",{}).then(function(){b.disabled=false;b.textContent="Check for new visits";$("#viDay").value=viToday();loadVisits()})});

function loadFpNudge(){get("/api/passport/nudges").then(function(d){if(d.error){$("#fpNudgeCard").hidden=true;return}var st=d.state;
 var sent=d.sent.reduce(function(a,x){return a+x.sent},0),came=d.sent.reduce(function(a,x){return a+x.came},0);
 $("#fpNudge").innerHTML='<div class="tiles">'+tile(st.visits.toLocaleString("en-NZ"),"Passport visits this month")+tile(st.to_go!=null?st.to_go.toLocaleString("en-NZ"):"Top tier","To the next tier")+tile(d.quiet_passport.toLocaleString("en-NZ"),"Not in for a week")+tile(d.passport_on_app.toLocaleString("en-NZ"),"Passport members on the app")+'</div>'+
  (st.push_week?'<div class="ok" style="margin-top:10px">Push week: the club is within reach of the next tier with '+st.days_left+' days left, so reminders go out after 4 days.</div>':"")+
  (sent?'<p class="muted" style="margin-top:8px">Last 30 days: '+sent+' reminders, '+came+' came in within 3 days ('+Math.round(came/sent*100)+'%).</p>':"")+
  '<label style="display:flex;gap:10px;align-items:center;margin-top:12px;cursor:pointer"><input type="checkbox" id="fpNudgeOn"'+(d.on?" checked":"")+'> <b>Send come-in reminders to Passport members</b></label><div id="fpNudgeMsg"></div>';
 $("#fpNudgeOn").onchange=function(e){post("/api/passport/nudges",{on:e.target.checked}).then(function(r){$("#fpNudgeMsg").innerHTML=r.ok?'<div class="ok">Saved.</div>':'<div class="err">'+esc(r.error)+'</div>'})}})}
