/* ---------- charts ---------- */
var MON=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
function ml(ym){var p=String(ym||"").split("-");return p.length>1?MON[+p[1]-1]+(p[1]==="01"?" "+p[0].slice(2):""):String(ym)}
function k$(n){n=Number(n||0);var a=Math.abs(n);return (n<0?"-":"")+"$"+(a>=1e6?(a/1e6).toFixed(2)+"m":a>=1e4?Math.round(a/1e3)+"k":a>=1e3?(a/1e3).toFixed(1)+"k":Math.round(a))}
function whole$(n){return "$"+Math.round(Number(n||0)).toLocaleString("en-NZ")}
// cols: [{label, vals:[...]}], series: [{name, cls}]
function bars(cols,series,fmt){
 fmt=fmt||function(x){return x};
 var mx=1;cols.forEach(function(c){c.vals.forEach(function(v){mx=Math.max(mx,Math.abs(v||0))})});
 return '<div class="chart">'+cols.map(function(c){return '<div class="c">'+c.vals.map(function(v,i){return '<i class="b '+(series[i]&&series[i].cls||"")+(v<0?" neg":"")+'" style="height:'+Math.max(1,Math.round(Math.abs(v||0)/mx*100))+'%" title="'+esc(c.label+": "+(series[i]?series[i].name+" ":"")+fmt(v))+'"></i>'}).join("")+'</div>'}).join("")+'</div>'+
  '<div class="clab">'+cols.map(function(c){return '<span>'+esc(c.label)+'</span>'}).join("")+'</div>'+
  (series.length>1?'<div class="legend">'+series.map(function(s){return '<span><i class="'+s.cls+'" style="background:'+(s.cls==="s1"?"#C9C9BF":s.cls==="s2"?"var(--olive)":"var(--ink)")+'"></i>'+esc(s.name)+'</span>'}).join("")+'</div>':"");
}
function hbars(rows,fmt){fmt=fmt||function(x){return x};var mx=1;rows.forEach(function(r){mx=Math.max(mx,r[1]||0)});
 return rows.length?rows.map(function(r){return '<div class="hb"><span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+esc(r[0])+'</span><span class="bar"><i style="width:'+Math.round((r[1]||0)/mx*100)+'%"></i></span><b>'+esc(fmt(r[1]||0))+'</b></div>'}).join(""):'<div class="muted">Nothing yet.</div>'}
function lineChart(pts){
 if(pts.length<2)return '<div class="muted">Builds up from today: the Core takes a count every night.</div>';
 var ys=pts.map(function(p){return p[1]}),lo=Math.min.apply(null,ys),hi=Math.max.apply(null,ys);if(hi===lo){hi+=1;lo-=1}var pad=(hi-lo)*.15;lo-=pad;hi+=pad;
 var W=600,Hh=150,xy=pts.map(function(p,i){return [Math.round(i/(pts.length-1)*W),Math.round(Hh-(p[1]-lo)/(hi-lo)*Hh)]});
 return '<svg viewBox="0 0 600 170" preserveAspectRatio="none" role="img" aria-label="Members over time"><polyline fill="none" stroke="#0A0A0A" stroke-width="2.5" vector-effect="non-scaling-stroke" points="'+xy.map(function(p){return p.join(",")}).join(" ")+'"/><polygon fill="rgba(223,255,0,.35)" points="0,150 '+xy.map(function(p){return p.join(",")}).join(" ")+' 600,150"/></svg>'+
  '<div class="clab"><span style="text-align:left">'+esc(pts[0][0])+'</span><span style="text-align:right">'+esc(pts[pts.length-1][0])+'</span></div>';
}
function table(cols,rows){return '<table class="tbl"><thead><tr>'+cols.map(function(c){return '<th'+(c[2]?' class="r"':"")+'>'+esc(c[0])+'</th>'}).join("")+'</tr></thead><tbody>'+rows.map(function(r){return '<tr'+(r._member?' data-member="'+r._member+'" style="cursor:pointer"':"")+'>'+cols.map(function(c){var v=typeof c[1]==="function"?c[1](r):r[c[1]];return '<td'+(c[2]?' class="r"':"")+'>'+(c[3]?v:esc(v==null?"":v))+'</td>'}).join("")+'</tr>'}).join("")+'</tbody></table>'}
function tile(n,l){return '<div class="tile"><div class="n">'+esc(n)+'</div><div class="l">'+esc(l)+'</div></div>'}

