/* ---------- import from GymMaster ---------- */
// Same rules as scripts/import_gymmaster_csv.py, run in the browser so the file goes
// straight from this computer into the Core.
function parseCSV(t){
 t=t.replace(/^﻿/,"");var rows=[],row=[],f="",q=false;
 for(var i=0;i<t.length;i++){var c=t[i];
  if(q){if(c==='"'){if(t[i+1]==='"'){f+='"';i++}else q=false}else f+=c}
  else if(c==='"')q=true;else if(c===","){row.push(f);f=""}else if(c==="\n"||c==="\r"){if(c==="\r"&&t[i+1]==="\n")i++;row.push(f);f="";if(row.length>1||row[0]!=="")rows.push(row);row=[]}else f+=c}
 if(f!==""||row.length){row.push(f);rows.push(row)}
 var h=rows.shift()||[];return rows.map(function(r){var o={};h.forEach(function(k,j){o[k.trim()]=(r[j]||"").trim()});return o});
}
function impNum(v){var n=parseFloat(String(v||"").replace(/[^0-9.\-]/g,""));return isNaN(n)?null:n}
function impMobile(v){var d=String(v||"").replace(/\D/g,"");if(d.indexOf("64")===0)d="0"+d.slice(2);else if(d.charAt(0)==="2"&&d.length>=8&&d.length<=10)d="0"+d;return d||null}
function impPassport(last){last=String(last||"").trim();var m=last.match(/^(.*?)[\s-]*\(?\s*(?:FP|ID:?)?\s*(\d{6,8})\s*\)?\s*$/i);if(!m)return[last,null];return[m[1].replace(/^[\s-]+|[\s-]+$/g,"")||null,m[2]]}
var EMPLOYERS=["woods","smartfit","hectre","bnb group","red bull","msd","auckland council"];
function impClassify(name,cat,pd){
 var n=String(name||"").toLowerCase().replace(/\s+/g," "),c=String(cat||"").toLowerCase(),d=String(pd||"").toLowerCase(),fam="other";
 if(n.indexOf("fitness passport")>=0)fam="passport";
 else if(n.indexOf("trip pass")>=0||n.indexOf("group fitness pass")>=0)fam="pass";
 else if(n.indexOf("trial")>=0||n.indexOf("day pass")>=0||n.indexOf("hour pass")>=0||/days (for|on us)|days\. \d|free class|bring a friend/.test(n))fam="trial";
 else if(c.indexOf("challenge")>=0||/\b\d?wc\b/.test(n))fam="challenge";
 else if(n==="staff"||n==="personal trainer rent"||c.indexOf("staff")>=0)fam="staff";
 else if(n.indexOf("transporter")>=0||n.indexOf("transpoter")>=0)fam="transporter";
 else if(n.indexOf("swimming pool")>=0)fam="pool";
 else if(n.indexOf("recovery")>=0)fam="recovery";
 else if(n.indexOf("perform")>=0||n.indexOf("gateway")>=0)fam="perform";
 else if(n.indexOf("classes")>=0||n.indexOf("group fitness")>=0)fam="classes";
 else if(n.indexOf("daily")>=0||n.indexOf("entry")>=0)fam="daily";
 var p={family:fam,flexi:n.indexOf("flexi")>=0?1:0,frequency:null};
 p.includes_classes=["perform","classes","transporter","passport","pass","trial"].indexOf(fam)>=0?1:0;
 p.includes_recovery=["perform","recovery","transporter","pass","trial"].indexOf(fam)>=0?1:0;
 p.paid_in_full=(/paid in full|pif|lifetime/.test(n)||(d.indexOf("fixed term")>=0&&fam!=="pass"&&fam!=="trial"))?1:0;
 if(fam==="passport")p.frequency="yearly";else if(p.paid_in_full||fam==="pass")p.frequency="upfront";
 else{var F=[["fortnightly",["fortnight","fornight"]],["monthly",["month"]],["quarterly",["quarter"]],["weekly",["week"]]];
  for(var i=0;i<F.length;i++){if(F[i][1].some(function(k){return n.indexOf(k)>=0||d.indexOf(k)>=0})){p.frequency=F[i][0];break}}}
 var emp=EMPLOYERS.filter(function(e){return n.indexOf(e)>=0})[0]||null;
 p.corporate=(c.indexOf("corporate")>=0||emp||n.indexOf("% off")>=0||n.indexOf("student")>=0)?1:0;
 p.employer=emp?emp.replace(/\b\w/g,function(x){return x.toUpperCase()}):null;
 p.student=n.indexOf("student")>=0?1:0;
 p.legacy=(["old","old corporate memberships","discontinued","promotions"].indexOf(c)>=0||/^(entry|flexi - entry|flexi - gateway|gateway)/.test(n)||n.indexOf("transpoter")>=0)?1:0;
 return p;
}
var IMP={cur:null,hist:null};
function impRead(input,key){var f=input.files&&input.files[0];if(!f){IMP[key]=null;impSummary();return}
 var r=new FileReader();r.onload=function(){try{IMP[key]=parseCSV(String(r.result))}catch(e){IMP[key]=null;$("#impErr").textContent="Couldn't read "+f.name}impSummary()};r.readAsText(f)}
function impSummary(){
 var c=IMP.cur,h=IMP.hist;$("#impErr").textContent="";
 if(c&&c.length&&!("Member ID" in c[0])){$("#impErr").textContent="That file isn't a GymMaster Current Memberships export (no Member ID column).";$("#impGo").disabled=true;return}
 var fp=c&&c.length&&("Fitness Passport ID" in c[0]);
 $("#impSum").textContent=c?(c.length+" rows of current members"+(fp?", with Fitness Passport IDs":", no Fitness Passport ID column")+(h?". "+h.length+" rows of history.":".")):"";
 $("#impGo").disabled=!(c&&c.length);
}
$("#impCur").addEventListener("change",function(e){impRead(e.target,"cur")});
$("#impHist").addEventListener("change",function(e){impRead(e.target,"hist")});
function impBuild(){
 var cur=IMP.cur,hist=IMP.hist||[],plans={},planRows=[],members=[],mships=[],billing=[],flags=[],trials=[],seen={},fpCol=cur.length&&("Fitness Passport ID" in cur[0]);
 cur.concat(hist).forEach(function(r){var k=(r["Membership Type Name"]||"")+"\u0001"+(r["Membership Type Category Name"]||"");
  if(!plans[k]){var p=impClassify(r["Membership Type Name"],r["Membership Type Category Name"],r["Price Description"]);plans[k]=p;
   planRows.push([r["Membership Type Name"]||"",r["Membership Type Category Name"]||"",p.family,p.frequency,p.flexi,p.paid_in_full,p.corporate,p.employer,p.student,p.legacy,p.includes_classes,p.includes_recovery])}});
 var WK={weekly:1,fortnightly:2,monthly:52/12,quarterly:13};
 cur.forEach(function(r){var id=parseInt(r["Member ID"],10);if(!id||seen[id])return;seen[id]=1;
  var k=(r["Membership Type Name"]||"")+"\u0001"+(r["Membership Type Category Name"]||""),p=plans[k];
  var sp=impPassport(r["Member Last Name"]),first=(r["Member First Name"]||"").trim(),last=sp[0];
  if(!last&&first.indexOf(" ")>0){last=first.slice(first.lastIndexOf(" ")+1);first=first.slice(0,first.lastIndexOf(" "))}
  var fpd=fpCol?String(r["Fitness Passport ID"]||"").replace(/\D/g,""):"";var fp=(fpd.length>=5&&fpd.length<=12)?fpd:null;
  var price=impNum(r["Membership Type Price"]),wv=(price!=null&&WK[p.frequency])?Math.round(price/WK[p.frequency]*100)/100:null;
  var pd=String(r["Price Description"]||"").toLowerCase(),by=p.family==="passport"?"passport":(pd.indexOf("in person")>=0?"in_person":"ezidebit");
  members.push([id,id,first||"Unknown",last||null,sp[1],fp,fp?1:0,(r["Member Email"]||"").toLowerCase()||null,impMobile(r["Member Cell"]),r["Member Gender"]||null,r["Member Source Promotion"]||null,r["Membership Start Date"]||null,parseInt(r["Member Total Visit"],10)||0]);
  mships.push([id,price,wv,r["Membership Start Date"]||null,r["Membership Minimum Term End Date"]||null,r["Membership End Date"]||null,by,r["Member Billing Comment"]||null,r["Discount Code Used"]||null,r["Sales Rep"]||null,r["Membership Type Name"]||"",r["Membership Type Category Name"]||""]);
  if(by==="ezidebit")billing.push([id]);
  if(p.family==="passport")flags.push([id,"passport",null]);
  if(p.corporate)flags.push([id,"corporate",p.employer]);
  if(p.student)flags.push([id,"student",null]);
 });
 hist.forEach(function(r){if((r["Membership Type Category Name"]||"")!=="Trials & Limited Passes")return;if(String(r["Membership Type Name"]||"").toLowerCase().indexOf("trip pass")>=0)return;
  var id=parseInt(r["Member ID"],10),here=!!seen[id];
  trials.push([here?id:null,((r["Member First Name"]||"")+" "+(r["Member Last Name"]||"")).trim(),(r["Member Email"]||"").toLowerCase()||null,impMobile(r["Member Cell"]),r["Member Source Promotion"]||null,here?"joined":"lost",r["Membership Start Date"]||null])});
 return {fpCol:fpCol,parts:[["plans",planRows],["members",members],["memberships",mships],["billing",billing],["flags",flags],["trials",trials]]};
}
$("#impGo").addEventListener("click",function(){
 var b=$("#impGo");b.disabled=true;$("#impErr").textContent="";$("#impDone").innerHTML="";
 var data;try{data=impBuild()}catch(e){$("#impErr").textContent="Couldn't read the file: "+e.message;b.disabled=false;return}
 var total=data.parts.reduce(function(a,p){return a+p[1].length},0),sent=0,log=null;
 function fail(m){$("#impErr").textContent=m+" Nothing is broken: fix it and press Import again.";b.disabled=false}
 post("/api/import",{step:"start",history:!!IMP.hist}).then(function(r){if(!r.ok)return fail(r.error||"Couldn't start.");log=r.log;
  var queue=[];data.parts.forEach(function(p){for(var i=0;i<p[1].length;i+=150)queue.push([p[0],p[1].slice(i,i+150)])});
  (function next(){
   if(!queue.length){post("/api/import",{step:"finish",log:log,rowsIn:IMP.cur.length+(IMP.hist?IMP.hist.length:0),rowsChanged:sent,fpLoaded:data.fpCol}).then(function(f){
     $("#impProg").textContent="";b.disabled=false;
     $("#impDone").innerHTML='<div class="ok">Done. '+(f.members||0).toLocaleString("en-NZ")+' current members in the Core.</div>'+data.parts.map(function(p){return '<div class="r"><span>'+esc(p[0])+'</span><span class="pill">'+p[1].length.toLocaleString("en-NZ")+'</span></div>'}).join("")});return}
   var q=queue.shift();
   post("/api/import",{step:"rows",table:q[0],rows:q[1]}).then(function(r){if(!r.ok)return fail(r.error||"A batch failed.");sent+=q[1].length;$("#impProg").textContent="Importing... "+Math.round(sent/total*100)+"%";next()}).catch(function(e){fail(String(e))});
  })();
 }).catch(function(e){fail(String(e))});
});

