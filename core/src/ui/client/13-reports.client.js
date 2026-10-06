/* ---------- reports ---------- */
var REP={kind:"current_members"};
function repQuery(){var q="kind="+REP.kind;if(!$("#repDates").hidden&&$("#repFrom").value)q+="&from="+$("#repFrom").value+"&to="+$("#repTo").value;return q}
function loadReport(){
 get("/api/report?"+repQuery()).then(function(d){
  if(d.error){$("#repTable").innerHTML='<div class="err">'+esc(d.error)+'</div>';return}
  $("#repKinds").innerHTML=d.reports.map(function(r){return '<button class="chip'+(r.kind===d.kind?" on":"")+'" data-rk="'+r.kind+'">'+esc(r.title)+'</button>'}).join("");
  $("#repDates").hidden=!d.dates;if(d.dates){$("#repFrom").value=d.from;$("#repTo").value=d.to}
  $("#repTitle").textContent=d.title;$("#repCount").textContent=d.total.toLocaleString("en-NZ")+(d.total>500?" (first 500 shown, all in the CSV)":"");
  $("#repCsv").href="/api/report?"+repQuery()+"&format=csv";
  REP.d=d;REP.sort=null;drawReport();
 });
}
function drawReport(){
 var d=REP.d;if(!d)return;var q=($("#repQ").value||"").trim().toLowerCase(),rows=d.rows;
 if(q)rows=rows.filter(function(r){return d.columns.some(function(c){return String(r[c]==null?"":r[c]).toLowerCase().indexOf(q)>=0})});
 if(REP.sort){var c=REP.sort.c,dir=REP.sort.dir,num=function(v){var n=parseFloat(String(v).replace(/[$,]/g,""));return isNaN(n)?null:n};rows=rows.slice().sort(function(a,b){var x=a[c],y=b[c],nx=num(x),ny=num(y);var r=(nx!=null&&ny!=null)?nx-ny:String(x==null?"":x).localeCompare(String(y==null?"":y));return r*dir})}
 var idc=d.columns.indexOf("ID")>=0?"ID":d.columns.indexOf("Member ID")>=0?"Member ID":null;
 $("#repTable").innerHTML=rows.length?'<table class="tbl"><thead><tr>'+d.columns.map(function(c){return '<th data-rs="'+esc(c)+'" style="cursor:pointer">'+esc(c)+(REP.sort&&REP.sort.c===c?(REP.sort.dir>0?" \u2191":" \u2193"):"")+'</th>'}).join("")+'</tr></thead><tbody>'+rows.map(function(r){var id=idc&&r[idc];return '<tr'+(id?' data-member="'+id+'" style="cursor:pointer"':"")+'>'+d.columns.map(function(c){var v=r[c];return '<td>'+esc(v==null?"":v)+'</td>'}).join("")+'</tr>'}).join("")+'</tbody></table>':'<div class="muted">Nothing for this one.</div>';
 if(q)$("#repCount").textContent=rows.length+" of "+d.total.toLocaleString("en-NZ");
}
$("#repQ").addEventListener("input",drawReport);
$("#repTable").addEventListener("click",function(e){var h=e.target.closest("[data-rs]");if(!h)return;var c=h.dataset.rs;REP.sort=REP.sort&&REP.sort.c===c?{c:c,dir:-REP.sort.dir}:{c:c,dir:1};drawReport()});
$("#repKinds").addEventListener("click",function(e){var b=e.target.closest("[data-rk]");if(!b)return;REP.kind=b.dataset.rk;$("#repFrom").value="";$("#repTo").value="";loadReport()});
$("#repFrom").addEventListener("change",loadReport);$("#repTo").addEventListener("change",loadReport);

