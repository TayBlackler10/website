/* ---------- Money on the table ---------- */
var PLAYS=null;
function loadPlays(fresh){
 get("/api/plays"+(fresh?"?fresh=1":"")).then(function(d){
  if(d.error){$("#plList").innerHTML='<div class="err">'+esc(d.error)+'</div>';return}PLAYS=d;
  var top=d.plays.slice().sort(function(a,b){return b.value-a.value});
  $("#plStats").innerHTML='<div class="hs"><b class="l">'+kfmt(d.total)+'</b><span>On the table a year</span><small>Scanned '+esc(String(d.at).slice(0,16))+'</small></div><div class="hs"><b>'+d.plays.length+'</b><span>Plays</span></div><div class="hs"><b>'+d.plays.reduce(function(a,p){return a+p.n},0).toLocaleString("en-NZ")+'</b><span>Members in a play</span></div><div class="hs"><button class="btn sm" id="plRescan">Scan again now</button></div>';
  $("#plList").innerHTML=top.map(function(p){return '<section class="card" data-play="'+p.id+'"><div style="font:900 34px/1 Archivo,Arial,sans-serif;font-variant-numeric:tabular-nums">'+kfmt(p.value)+'<small style="font:600 13px DM Sans,Arial,sans-serif;color:var(--muted);margin-left:6px">a year</small></div><h3>'+esc(p.title)+'</h3><p style="margin:0;color:var(--muted);font-size:14px">'+esc(p.reason)+'</p><div style="font-size:12.5px;color:#9A9A92">'+esc(p.how)+'</div>'+(p.sample.length?'<div class="muted">'+esc(p.sample.join(", "))+(p.n>3?" and "+(p.n-3)+" more":"")+'</div>':"")+'<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:auto">'+(p.go?'<button class="btn dark sm" data-act="1" data-go="'+p.go+'">'+esc(p.act)+'</button>':'<button class="btn dark sm" data-act="1" data-playlist="'+p.id+'">'+esc(p.act)+'</button>')+'<button class="btn line sm" data-act="1" data-playlist="'+p.id+'">See '+p.n.toLocaleString("en-NZ")+' members</button></div></section>'}).join("");
 });
}
document.addEventListener("click",function(e){
 if(e.target.id==="plRescan"){e.target.disabled=true;e.target.textContent="Scanning...";loadPlays(true);return}
 var l=e.target.closest("[data-playlist]");if(l){openPlay(l.dataset.playlist);return}
 var tt=e.target.closest("[data-totim]");if(tt){tt.disabled=true;post("/api/members/"+tt.dataset.totim+"/to-tim",{}).then(function(x){tt.outerHTML=x.error?'<span class="err">'+esc(x.error)+'</span>':'<span class="pill ok">'+(x.already?"Already with Tim":"Sent to Tim")+'</span>'});return}
 if(e.target.id==="pmClose"||e.target.id==="pm"){$("#pm").hidden=true;return}
 if(e.target.closest("#pm [data-member]"))$("#pm").hidden=true;
});
function openPlay(id){
 if(VIEW!=="plays"&&!(ME&&ME.can.business))return;
 $("#pm").hidden=false;$("#pmTitle").textContent="Loading...";$("#pmN").textContent="";$("#pmBody").innerHTML="";
 get("/api/plays/"+id).then(function(d){
  if(d.error){$("#pmBody").innerHTML='<div class="err">'+esc(d.error)+'</div>';return}
  $("#pmTitle").textContent=d.title;$("#pmN").textContent=d.members.length+" members";
  $("#pmBody").innerHTML=d.members.slice(0,300).map(function(m){return '<div class="prow"><div class="avi">'+esc(ini(m.name))+'</div><div class="g"><div class="t" data-member="'+m.id+'" style="cursor:pointer">'+esc(m.name)+' <span class="muted" style="font-weight:400">'+esc(m.plan||"")+'</span></div><div class="s">'+esc(m.why||"")+'</div></div>'+(d.pt?'<button class="btn sm dark" data-totim="'+m.id+'">Send to Tim</button>':'<button class="btn sm dark" data-log="'+m.id+'">Log</button>')+'</div>'}).join("")||'<div class="ok">Nobody in this play right now.</div>';
 });
}
document.addEventListener("keydown",function(e){if(e.key==="Escape"){$("#pm").hidden=true;if($("#ask"))$("#ask").hidden=true}});

