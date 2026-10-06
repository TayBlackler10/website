/* ---------- Ask M2 ---------- */
function openAsk(q){$("#ask").hidden=false;$("#askQ").value=q||"";setTimeout(function(){$("#askQ").focus()},30);if(q)runAsk(q);else runAsk("")}
function runAsk(q){
 $("#askA").innerHTML=q?'<div class="muted">Looking...</div>':"";$("#askL").innerHTML="";
 get("/api/ask?q="+encodeURIComponent(q)).then(function(d){
  var a=esc(d.answer||"");(d.highlight||[]).forEach(function(h){if(h)a=a.split(esc(h)).join('<b style="background:var(--lime);padding:0 4px;border-radius:4px">'+esc(h)+'</b>')});
  $("#askA").innerHTML=q?'<div style="font-size:18px;line-height:1.4">'+a+'</div>':'<div class="muted">'+a+'</div>';
  var act=d.action;
  if(act)$("#askA").innerHTML+='<div style="margin-top:10px">'+(act.go?'<button class="btn dark sm" data-askgo="'+esc(act.go)+'">'+esc(act.label)+'</button>':act.play?'<button class="btn dark sm" data-askplay="'+esc(act.play)+'">'+esc(act.label)+'</button>':"")+'</div>';
  $("#askS").innerHTML=(d.suggestions||[]).map(function(x){return '<button class="chip" data-askq="'+esc(x)+'" style="border:0;background:var(--tile);border-radius:999px;padding:7px 12px;font-size:13px;cursor:pointer">'+esc(x)+'</button>'}).join("");
  var m=d.members||[];
  $("#askL").innerHTML=m.slice(0,200).map(function(r){return '<div class="prow"><div class="avi">'+esc(ini(r.name))+'</div><div class="g"><div class="t" data-member="'+r.id+'" style="cursor:pointer">'+esc(r.name)+' <span class="muted" style="font-weight:400">'+esc(r.plan||"")+'</span></div>'+(r.why?'<div class="s">'+esc(r.why)+'</div>':"")+'</div>'+(act&&act.call?'<button class="btn sm dark" data-log="'+r.id+'">Log</button>':"")+'</div>'}).join("")+(m.length>200?'<div class="muted">and '+(m.length-200)+' more</div>':"");
 });
}
$("#askF").addEventListener("submit",function(e){e.preventDefault();runAsk($("#askQ").value.trim())});
$("#askOpen").addEventListener("click",function(){openAsk("")});
document.addEventListener("keydown",function(e){if((e.metaKey||e.ctrlKey)&&(e.key==="k"||e.key==="K")){e.preventDefault();openAsk("")}});
document.addEventListener("click",function(e){
 if(e.target.id==="ask"){$("#ask").hidden=true;return}
 var q=e.target.closest("[data-askq]");if(q){$("#askQ").value=q.dataset.askq;runAsk(q.dataset.askq);return}
 var g=e.target.closest("[data-askgo]");if(g){$("#ask").hidden=true;show(g.dataset.askgo);return}
 var pl=e.target.closest("[data-askplay]");if(pl){$("#ask").hidden=true;openPlay(pl.dataset.askplay);return}
 if(e.target.closest("#ask [data-member]"))$("#ask").hidden=true;
});

