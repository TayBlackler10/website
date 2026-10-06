/* ---------- settings ---------- */
var FAMS={perform:"Perform",classes:"Classes",daily:"Daily",recovery:"Recovery",transporter:"Transporter",passport:"Fitness Passport",pass:"Visit pass",pool:"Pool",trial:"Trial",challenge:"Challenge",staff:"Staff",other:"Other"};
function loadFeeds(){
 get("/api/feeds").then(function(f){
  if(f.error){$("#setFeeds").innerHTML='<div class="err">'+esc(f.error)+'</div>';return}
  var last=function(l){return l?(l.ok?'<span class="pill ok">Updated '+esc(day(l.finished_at))+'</span>':'<span class="pill warn">Failed: '+esc(l.error||"")+'</span>'):'<span class="pill">Not run yet</span>'};
  var x=f.xero,w=f.windsor,b=f.backup;
  $("#setFeeds").innerHTML=
   '<div class="person"><div class="top"><b>Xero</b> '+(x.connected?'<span class="pill ok">Connected'+(x.org?" to "+esc(x.org):"")+'</span> '+last(x.last):x.keys?'<span class="pill warn">Ready to connect</span>':'<span class="pill warn">Needs XERO_CLIENT_ID and XERO_CLIENT_SECRET</span>')+'</div><div class="muted">Profit and loss by month, cash, bills and GST, every night at 2:15am.</div><div style="display:flex;gap:8px;flex-wrap:wrap">'+(x.keys?'<a class="btn '+(x.connected?"line":"dark")+' sm" href="/xero/connect">'+(x.connected?"Reconnect Xero":"Connect Xero")+'</a>':"")+(x.connected?'<button class="btn line sm" data-feed="xero">Refresh now</button>':"")+'</div></div>'+
   '<div class="person"><div class="top"><b>Meta ads and Google Analytics</b> '+(w.key?last(w.last):'<span class="pill warn">Needs WINDSOR_API_KEY</span>')+'</div><div class="muted">Spend, website visits and conversions by day, every night through Windsor.</div>'+(w.key?'<div><button class="btn line sm" data-feed="marketing">Refresh now</button></div>':"")+'</div>'+
   '<div class="person"><div class="top"><b>Backups</b> '+(b.bucket?last(b.last):'<span class="pill warn">Backup bucket not set up</span>')+'</div><div class="muted">A full copy of the Core every night, kept for 35 days, separate from the live database.</div>'+(b.bucket?'<div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn line sm" data-feed="backup">Back up now</button><button class="btn dark sm" id="bkVerify">Test restoring the latest</button>'+b.files.map(function(o){return '<a class="btn line sm" href="/api/backups/'+esc(o.key)+'">'+esc(o.key.slice(8,18))+' ('+Math.round(o.size/1024)+' KB)</a>'}).join("")+'</div>':"")+'</div>';
 });
}
$("#setFeeds").addEventListener("click",function(e){var v=e.target.closest("#bkVerify");if(v){v.disabled=true;v.textContent="Testing...";post("/api/backups/verify",{}).then(function(r){v.disabled=false;v.textContent="Test restoring the latest";
  alert(r.ok?"Backup "+r.key+" is good. "+r.tables+" tables, "+r.rows.toLocaleString("en-NZ")+" rows. Restored "+r.drill.map(function(d){return d.restored+" "+d.table}).join(", ")+" into scratch copies and they all matched.":"Backup test found a problem: "+(r.error||r.problems.concat(r.drill.filter(function(d){return !d.ok}).map(function(d){return d.table+" restored "+d.restored+" of "+d.in_backup})).join("; ")))});return}
 var b=e.target.closest("[data-feed]");if(!b)return;b.disabled=true;b.textContent="Working...";post("/api/feeds/run",{what:b.dataset.feed}).then(function(r){if(r&&r.ok===false)alert(r.error);loadFeeds()})});
function loadSettings(){
 loadFeeds();
 get("/api/settings").then(function(d){
  if(d.error){$("#setRules").innerHTML='<div class="err">'+esc(d.error)+'</div>';return}
  var g="";$("#setRules").innerHTML=d.settings.map(function(s){var h=(s.group!==g?'<div class="eyebrow" style="margin-top:14px">'+esc(s.group)+'</div>':"");g=s.group;
   return h+'<div class="person" data-set="'+esc(s.key)+'"><label class="fld">'+esc(s.label)+'<input class="setIn" value="'+esc(s.value)+'"'+(s.type==="tiers"?"":' inputmode="decimal"')+'></label><div style="display:flex;gap:8px;align-items:center"><button class="btn dark sm" data-setsave="1">Save</button><span class="muted setMsg"></span></div></div>'}).join("");
  $("#setClub").innerHTML=[["Name",d.club.name],["Address",d.club.address],["Phone",d.club.phone],["Email",d.club.email],["Hours",d.club.hours]].map(function(x){return '<dt>'+esc(x[0])+'</dt><dd>'+esc(x[1])+'</dd>'}).join("");
  $("#setInt").innerHTML=d.integrations.map(function(i){var good=/^(Connected|Set up|Cloudflare|Pushed)/.test(i.status);return '<div class="person"><div class="top"><b>'+esc(i.name)+'</b> <span class="pill'+(good?" ok":" warn")+'">'+esc(i.status)+'</span></div><div class="muted">'+esc(i.detail)+'</div></div>'}).join("");
  $("#setSync").innerHTML=d.sync.map(function(x){return '<div><span>'+esc(day(x.finished_at))+'</span><span>'+esc(x.source==="gymmaster_csv"?"Import from GymMaster":x.source==="gymmaster_members"?"Nightly GymMaster copy":x.source)+' '+(x.ok?'<span class="pill ok">OK, '+(x.rows_changed||0)+' rows</span>':'<span class="pill warn">'+esc(x.error||"Failed")+'</span>')+'</span></div>'}).join("")||'<p class="muted" style="margin:0">Nothing yet.</p>';
  $("#setPlans").innerHTML='<table class="tbl"><thead><tr><th>GymMaster type</th><th>Category</th><th>Counts as</th><th>Billing</th><th>Members</th><th></th></tr></thead><tbody>'+d.plans.map(function(p){return '<tr><td>'+esc(p.name)+'</td><td>'+esc(p.category||"")+'</td><td>'+esc(FAMS[p.family]||p.family)+(p.flexi?", Flexi":"")+(p.corporate?", Corporate"+(p.employer?" ("+esc(p.employer)+")":""):"")+'</td><td>'+esc(p.frequency||"")+'</td><td>'+p.members+'</td><td>'+(p.legacy?'<span class="pill">Existing only</span>':"")+'</td></tr>'}).join("")+'</tbody></table>';
 });
}
$("#setRules").addEventListener("click",function(e){var b=e.target.closest("[data-setsave]");if(!b)return;var box=b.closest("[data-set]"),m=box.querySelector(".setMsg");
 post("/api/settings",{key:box.dataset.set,value:box.querySelector(".setIn").value}).then(function(r){if(!r.ok){m.textContent=r.error;m.style.color="var(--red)";return}box.querySelector(".setIn").value=r.value;m.style.color="";m.textContent="Saved"})});

