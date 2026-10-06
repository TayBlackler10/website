/* ---------- key tag lookup ---------- */
$("#lookTag").addEventListener("keydown",function(e){
 if(e.key!=="Enter")return;e.preventDefault();var v=e.target.value.trim().replace(/\s+/g,"");if(!v)return;
 get("/api/key-tags/"+encodeURIComponent(v)).then(function(d){
  var h=d.current?'<div class="ok">Belongs to <a href="#" data-member="'+d.current.id+'"><b>'+esc(nm(d.current))+'</b></a>.</div>':'<div class="warnbox">Not on anyone right now.</div>';
  if(d.history&&d.history.length)h+='<div class="hist">'+d.history.map(function(x){return '<div><span>'+esc(day(x.assigned_at))+'</span><span>'+esc(nm(x))+' <span class="pill">'+esc(x.status)+'</span></span></div>'}).join("")+'</div>';
  $("#lookRes").innerHTML=h;e.target.select();
 });
});

