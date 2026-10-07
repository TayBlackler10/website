/* ---------- add member ---------- */
var PL=null,pick={fam:"perform",freq:"weekly"},sel=null,mate=null,newId=null;
var FAMN={perform:"Perform",classes:"Classes",daily:"Daily",recovery:"Recovery",trial:"Trial or pass",passport:"Fitness Passport"};
var FREQN={weekly:"Weekly",fortnightly:"Fortnightly",monthly:"Monthly",quarterly:"Quarterly",upfront:"Paid upfront"};
function startAdd(){
 goStep(1);$("#aErr").textContent="";$("#aAnyway").hidden=true;
 if(!$("#aStart").value)$("#aStart").value=new Date(Date.now()-new Date().getTimezoneOffset()*60000).toISOString().slice(0,10);
 if(!PL)get("/api/plans").then(function(d){
  if(d.error){$("#mcards").innerHTML='<div class="err">'+esc(d.error)+'</div>';return}
  PL=d.plans;fillSelect($("#goal"),d.goals,"");fillSelect($("#source"),d.sources,"");drawPlans();
 });else drawPlans();
 setTimeout(sizeSig,50);
}
var STEP=1,HQ={},LASTADD=null;
function goStep(n){STEP=n;$$('section[data-view="add"] [data-step]').forEach(function(x){x.hidden=+x.dataset.step!==n});
 $$("#aSteps li").forEach(function(li){var k=+li.dataset.s;li.className=k===n?"on":k<n?"done":""});
 if(n===3)setTimeout(sizeSig,50);window.scrollTo(0,0);drawSum()}
var GORDER=["perform","classes","daily","recovery","transporter","pif","daily_pif","corporate","pool","other","passport","trial"];
var GNAME={perform:"M2 Perform",classes:"M2 Classes",daily:"M2 Daily",recovery:"M2 Recovery",transporter:"Transporter",pif:"Perform, paid in full",daily_pif:"Daily, paid in full",corporate:"Corporate",pool:"Pool",other:"Other",passport:"Fitness Passport",trial:"Trials and passes"};
var PERW={weekly:1,fortnightly:0.5,monthly:12/52,quarterly:4/52};
// Corporate deals get their own card. Paid in full gets its own card per membership (Perform, Daily).
function grp(p){if(p.cat&&p.cat.corporate)return "corporate";if(p.frequency==="upfront"&&p.family!=="trial"&&p.family!=="passport")return p.family==="perform"?"pif":p.family+"_pif";return p.family}
function isPif(k){return k==="pif"||/_pif$/.test(k)}
function listAll(k){return k==="trial"||k==="passport"||k==="corporate"||isPif(k)}
function pprice(p){if(p.cat&&p.cat.price!=null)return +p.cat.price;var n=parseFloat(String(p.price||"").replace(/[^0-9.]/g,""));return isNaN(n)?null:n}
function pweek(p){var v=pprice(p);return v!=null&&PERW[p.frequency]?v*PERW[p.frequency]:null}
function pname(p){return (p.cat&&p.cat.name)||p.name}
function drawPlans(){
 if(!PL)return;var fx=$("#flexi").checked,G={};
 PL.forEach(function(p){var g=grp(p);(G[g]=G[g]||[]).push(p)});
 var keys=GORDER.filter(function(k){return G[k]}).concat(Object.keys(G).filter(function(k){return GORDER.indexOf(k)<0}));
 $("#mcards").innerHTML=keys.map(function(k){
  var L=G[k],small=k==="trial"||k==="passport";
  var cand=listAll(k)?L:L.filter(function(p){return p.frequency==="upfront"||p.frequency==="yearly"||p.frequency==="quarterly"||!!p.flexi===fx});if(!cand.length)cand=L;
  var wk=cand.map(pweek).filter(function(x){return x!=null}),lo=wk.length?Math.min.apply(null,wk):null,c=(cand[0]&&cand[0].cat)||{};
  var price=k==="passport"?'<div class="pr" style="font-size:16px">Paid by Fitness Passport</div>':k==="trial"?'<div class="pr">'+cand.length+' <small>options</small></div>':isPif(k)?'<div class="pr">'+money(pprice(cand[0]))+' <small>once</small></div>':k==="corporate"?'<div class="pr">'+cand.length+' <small>'+(cand.length===1?"deal":"deals")+'</small></div>':lo!=null?'<div class="pr">$'+lo.toFixed(2).replace(/\.00$/,"")+'<small> a week</small></div>':"";
  var term=isPif(k)?"12 months, paid once":k==="corporate"?"10+ people from one company. Never sold online":k==="trial"?"Short trials and visit passes":k==="passport"?"Their Passport ID is compulsory":fx?"Flexi: 30 days' notice":c.lock_in_months?c.lock_in_months+" month lock-in":"No lock-in";
  var inc=k==="trial"||k==="passport"||k==="corporate"?[]:["Gym floor"].concat(c.includes_classes?["Classes"]:[]).concat(c.includes_recovery?["Sauna, ice bath and pool"]:[]);
  return '<button type="button" class="mc'+(small?" small":"")+(pick.fam===k?" on":"")+'" data-grp="'+k+'">'+(k==="perform"?'<span class="pop">Most popular</span>':"")+'<span class="nm">'+esc(GNAME[k]||k)+'</span>'+price+'<span class="tm">'+esc(term)+'</span>'+(inc.length?'<ul>'+inc.map(function(x){return '<li>'+esc(x)+'</li>'}).join("")+'</ul>':"")+(c.blurb&&!small?'<span class="tm">'+esc(c.blurb)+'</span>':"")+'</button>'}).join("");
 var L=G[pick.fam]||[],list=L.filter(function(p){return listAll(pick.fam)||p.frequency==="quarterly"||!!p.flexi===fx});
 $("#mfreq").hidden=!list.length;
 $("#mfreq").innerHTML=list.map(function(p){var lbl=listAll(pick.fam)?pname(p):(FREQN[p.frequency]||p.frequency);var pr=pprice(p);
  return '<button type="button" class="chip'+(sel&&sel.id===p.id?" on":"")+'" data-p="'+p.id+'">'+esc(lbl)+(pr!=null&&pick.fam!=="passport"?" · "+money(pr):"")+'</button>'}).join("");
 drawSum();
}
$("#mcards").addEventListener("click",function(e){var b=e.target.closest("[data-grp]");if(!b)return;pick.fam=b.dataset.grp;sel=null;
 if(pick.fam==="passport")$("#passport").checked=true;fpToggle();drawPlans();
 var only=$$("#mfreq [data-p]");var wk=only.filter(function(x){var p=PL.find(function(q){return q.id===+x.dataset.p});return p&&p.frequency==="weekly"})[0]||(only.length===1?only[0]:null);
 if(wk){sel=PL.find(function(p){return p.id===+wk.dataset.p});drawPlans();loadTerms()}});
$("#mfreq").addEventListener("click",function(e){var b=e.target.closest("[data-p]");if(!b)return;sel=PL.find(function(p){return p.id===+b.dataset.p});drawPlans();loadTerms()});
function drawSum(){
 if(!sel){$("#sumBody").innerHTML='<div class="muted">Pick a membership.</div>';return}
 var c=sel.cat||{},pr=pprice(sel),once=sel.frequency==="upfront",pass=sel.family==="passport";
 var jf=pass?0:(c.joining_fee!=null?+c.joining_fee:(sel.signupFee||0)),tf=pass?0:(c.tag_fee!=null?+c.tag_fee:0);
 var start=$("#aStart").value,due=jf+tf+(once&&pr?pr:0);
 var ln=function(a,b){return '<div class="ln"><span>'+esc(a)+'</span><b>'+b+'</b></div>'};
 $("#sumBody").innerHTML='<h3 style="margin:4px 0 8px">'+esc(pname(sel))+'</h3>'+
  ln("Price",pass?"Paid by Passport":pr!=null?money(pr)+(once?" once":" "+esc((FREQN[sel.frequency]||"").toLowerCase())):"-")+
  (pweek(sel)!=null&&sel.frequency!=="weekly"?ln("Per week",money(pweek(sel))):"")+
  ln("Term",pass?"Passport":once?"Paid in full":sel.flexi?"Flexi, 30 days' notice":c.lock_in_months?c.lock_in_months+" months":"No lock-in")+
  ln("Joining fee",jf?money(jf):"Waived")+ln("Key tag",tf?money(tf):"Waived")+
  ln("Starts",start?esc(day(start)):"Today")+
  (mate?ln("Bring a Mate","4 weeks free"):"")+
  '<div class="due"><span>Due today</span><b>'+money(due)+'</b></div>'+
  (!once&&!pass&&pr?'<p class="muted" style="margin:8px 0 0">First debit of '+money(pr)+' on their start date, by Ezidebit.</p>':"");
}
$("#aStart").addEventListener("change",drawSum);
document.addEventListener("click",function(e){
 var n=e.target.closest("[data-next]");if(n&&n.closest('section[data-view="add"]')){var to=+n.dataset.next;
  if(to===2&&!sel){$("#s1Err").textContent="Pick a membership first.";return}$("#s1Err").textContent="";
  if(to===3){var need=[["#first","first name"],["#last","last name"],["#email","email"],["#mobile","mobile"],["#dob","date of birth"],["#goal","main goal"],["#source","how they heard about M2"]].filter(function(x){return !$(x[0]).value.trim()}).map(function(x){return x[1]});
   if(need.length){$("#s2Err").textContent="Still needed: "+need.join(", ")+".";return}
   if(!PHOTO&&!$("#aNoPhoto").checked){$("#s2Err").textContent="Take their photo, or tick \"Not today\".";return}
   if(($("#passport").checked||sel.family==="passport")&&!$("#fpid").value.trim()){$("#s2Err").textContent="Add their Fitness Passport ID. Passport can't pay us for their visits without it.";return}
   if($("#passport").checked&&sel.cat&&sel.cat.corporate){$("#s2Err").textContent="Fitness Passport members can't get a corporate deal. Go back and pick Fitness Passport.";return}
   $("#s2Err").textContent=""}
  if(to===5&&!$("#billDone").checked&&!$("#billCard").hidden&&!$("#billOpen").hidden&&!n.dataset.warned){n.dataset.warned="1";n.textContent="Next anyway (bank details stay on Today)";return}
  goStep(to);return}
 var bk=e.target.closest("[data-back]");if(bk){goStep(+bk.dataset.back);return}
 var yn=e.target.closest(".yn button");if(yn){var w=yn.parentNode;w.querySelectorAll("button").forEach(function(x){x.classList.toggle("on",x===yn)});HQ[w.dataset.hq]=yn.dataset.v==="1";
  if(w.dataset.hq==="injury")$("#hqInjury").hidden=!HQ.injury;if(w.dataset.hq==="doctor")$("#hqDoctor").hidden=!HQ.doctor}
});
$("#fam").addEventListener("click",function(e){var b=e.target.closest("[data-f]");if(!b)return;pick.fam=b.dataset.f;sel=null;if(pick.fam==="passport"){$("#passport").checked=true}fpToggle();drawPlans()});
function fpToggle(){var on=$("#passport").checked||pick.fam==="passport";$("#fpWrap").hidden=!on;$("#mateWrap").hidden=on;if(on){mate=null;$("#mateSel").textContent=""}}
$("#freq").addEventListener("click",function(e){var b=e.target.closest("[data-q]");if(!b)return;pick.freq=b.dataset.q;sel=null;drawPlans()});
$("#flexi").addEventListener("change",function(){sel=null;drawPlans()});
$("#plans").addEventListener("click",function(e){var b=e.target.closest("[data-p]");if(!b)return;sel=PL.find(function(p){return p.id===+b.dataset.p});drawPlans();loadTerms()});
function loadTerms(){
 if(!sel){return}
 $("#aRead").checked=false;$("#aTerms").innerHTML='<div class="muted">Loading the contract from GymMaster...</div>';
 var price=sel.price+" "+(sel.priceDescription||"");
 $("#aPdf").href="/contract?plan="+sel.id+"&name="+encodeURIComponent(sel.name)+"&price="+encodeURIComponent(price);$("#aPdf").hidden=false;
 get("/api/agreement?plan="+sel.id).then(function(d){
  if(!d.ok||!d.agreements.length){$("#aTerms").innerHTML='<div>The M2 Training Club membership terms and conditions apply. GymMaster has no separate contract for '+esc(sel.name)+'.</div>';return}
  $("#aTerms").innerHTML='<p><b>'+esc(sel.name)+'</b>, '+esc(price)+'</p>'+d.agreements.map(function(a){return '<h3>'+esc(a.name)+'</h3>'+a.body+(a.points.length?'<ul>'+a.points.map(function(p){return '<li>'+esc(p)+'</li>'}).join("")+'</ul>':"")}).join("");
 });
}
$("#passport").addEventListener("change",fpToggle);
var mt;$("#mate").addEventListener("input",function(e){clearTimeout(mt);mt=setTimeout(function(){
 if(e.target.value.length<2){$("#mateRes").innerHTML="";return}
 get("/api/members?q="+encodeURIComponent(e.target.value)).then(function(d){$("#mateRes").innerHTML=(d.results||[]).slice(0,6).map(function(m){return '<div class="r" data-m="'+m.id+'" data-n="'+esc(nm(m))+'"><span>'+esc(nm(m))+'</span><span class="pill">'+esc(m.family||"")+'</span></div>'}).join("")});
},250)});
$("#mateRes").addEventListener("click",function(e){var r=e.target.closest("[data-m]");if(!r)return;e.stopPropagation();mate=+r.dataset.m;$("#mateSel").textContent="Brought by "+r.dataset.n+". They get 4 weeks free now; "+r.dataset.n.split(" ")[0]+" gets theirs once the first payment clears.";drawSum();$("#mateRes").innerHTML="";$("#mate").value=""});
var cv=$("#sig"),cx=cv.getContext("2d"),drawing=false,signed=false;
function sizeSig(){var r=cv.getBoundingClientRect();if(!r.width)return;cv.width=r.width*2;cv.height=r.height*2;cx.setTransform(2,0,0,2,0,0);cx.lineWidth=2;cx.lineCap="round";cx.strokeStyle="#0A0A0A";signed=false}
window.addEventListener("resize",function(){if(VIEW==="add"&&!signed)sizeSig()});
function pt(e){var r=cv.getBoundingClientRect();return[e.clientX-r.left,e.clientY-r.top]}
cv.addEventListener("pointerdown",function(e){drawing=true;cv.setPointerCapture(e.pointerId);var p=pt(e);cx.beginPath();cx.moveTo(p[0],p[1])});
cv.addEventListener("pointermove",function(e){if(!drawing)return;var p=pt(e);cx.lineTo(p[0],p[1]);cx.stroke();signed=true});
cv.addEventListener("pointerup",function(){drawing=false});
$("#sigClear").addEventListener("click",sizeSig);
function saveMember(force){
 $("#aErr").textContent="";$("#aAnyway").hidden=true;
 if(!sel){$("#aErr").textContent="Pick a membership first.";return}
 if(!$("#aRead").checked){$("#aErr").textContent="They need to read the contract first. Tick \"They've read the contract\".";return}
 if(["injury","doctor","pregnant"].some(function(k){return HQ[k]===undefined})){$("#aErr").textContent="Answer the three health questions first.";return}
 if(!signed){$("#aErr").textContent="They need to sign first.";return}
 if(!PHOTO&&!$("#aNoPhoto").checked){$("#aErr").textContent="Take their photo, or tick \"Not today\".";return}
 if(($("#passport").checked||sel.family==="passport")&&!$("#fpid").value.trim()){$("#aErr").textContent="Add their Fitness Passport ID. Passport can't pay us for their visits without it.";$("#fpid").focus();return}
 var body={planId:sel.id,planName:sel.name,planPrice:sel.price+" "+(sel.priceDescription||""),first:$("#first").value,last:$("#last").value,email:$("#email").value,mobile:$("#mobile").value,dob:$("#dob").value,gender:$("#gender").value,goal:$("#goal").value,source:$("#source").value,emergencyName:$("#ename").value,emergencyPhone:$("#ephone").value,passport:$("#passport").checked||sel.family==="passport",fpId:$("#fpid").value,referredBy:mate,agreed:$("#agreed").checked||$("#aRead").checked,signature:cv.toDataURL("image/png"),confirmDuplicate:!!force,start:$("#aStart").value,health:{injury:!!HQ.injury,injury_detail:$("#hqInjury").value,doctor:!!HQ.doctor,doctor_detail:$("#hqDoctor").value,pregnant:!!HQ.pregnant}};
 $("#aSave").disabled=true;$("#aSave").textContent="Signing them up...";
 post("/api/members",body).then(function(d){
  $("#aSave").disabled=false;$("#aSave").textContent="Sign them up";
  if(!d.ok){$("#aErr").textContent=d.error||"Something went wrong.";if(d.canOverride)$("#aAnyway").hidden=false;return}
  newId=d.id;LASTADD=d;
  $("#dName").textContent=body.first+" "+body.last;$("#dNum").textContent=d.id;$("#dPlan").textContent=pname(sel);
  $("#dList").innerHTML=(d.done||[]).map(function(x){return '<div class="chk"><i class="'+(x.ok?"y":"n")+'">'+(x.ok?"✓":"!")+'</i><div><b>'+esc(x.t)+'</b><div class="muted">'+esc(x.d||"")+'</div></div></div>'}).join("");
  goStep(d.needsBilling||d.fpId?4:5);
  if(PHOTO)post("/api/members/"+newId+"/photo",{jpeg:PHOTO}).then(function(r){if(!r.ok)$("#aDone").insertAdjacentHTML("beforeend",'<br><span class="err">Photo not saved: '+esc(r.error)+'. Take it again from their profile.</span>')});
  $("#aDone").innerHTML="<b>"+esc(body.first+" "+body.last)+"</b> is in, on "+esc(sel.name)+"."+(d.warnings&&d.warnings.length?"<br>"+d.warnings.map(esc).join("<br>"):"");
  $("#fpGm").hidden=!d.fpId;$("#fpGmOk").innerHTML="";$("#fpGmDone").hidden=false;
  if(d.fpId){$("#fpGmId").textContent=d.fpId;$("#fpGmOpen").href=d.gymmasterUrl}
  $("#billCard").hidden=!d.needsBilling;
  if(!d.needsBilling){$("#billNote").textContent="No bank details needed for this one.";$("#billOpen").hidden=true;$("#billDone").checked=true}
  else get("/api/members/"+newId+"/billing-link").then(function(bl){
   $("#billNote").textContent=bl.note||bl.error||"";$("#billOpen").hidden=!bl.url;$("#billOpen").dataset.url=bl.url||"";
   if(bl.mode==="ezidebit"&&window.QRCode){$("#qr").hidden=false;$("#qr").innerHTML="";new QRCode($("#qr"),{text:bl.url,width:120,height:120})}
  });
  if(STEP===5)setTimeout(function(){$("#tag").focus()},150);
 }).catch(function(e){$("#aSave").disabled=false;$("#aSave").textContent="Sign them up";$("#aErr").textContent=String(e)});
}
$("#aSave").addEventListener("click",function(){saveMember(false)});
$("#aAnyway").addEventListener("click",function(){saveMember(true)});
$("#fpGmDone").addEventListener("click",function(){
 post("/api/jobs",{kind:"fp_id_gm",outcome:"fp_in_gm",member_id:newId}).then(function(r){
  if(!r.ok){$("#fpGmOk").innerHTML='<div class="err">'+esc(r.error)+'</div>';return}
  $("#fpGmOk").innerHTML='<div class="ok">Thanks. Passport will be paid for their visits.</div>';$("#fpGmDone").hidden=true;
 });
});
$("#billOpen").addEventListener("click",function(e){var u=e.currentTarget.dataset.url;if(u)window.open(u,"m2billing","width=900,height=900")});
function saveTag(){
 $("#tagErr").textContent="";var t=$("#tag").value.trim();if(!t)return;
 post("/api/members/"+newId+"/key-tag",{tag:t}).then(function(d){
  if(!d.ok){$("#tagErr").textContent=d.error;$("#tag").select();return}
  $("#tagOk").innerHTML='<div class="ok">Tag '+esc(d.tag)+' saved. '+esc(d.note||"")+' <a href="'+esc(d.gymmasterUrl)+'" target="_blank" rel="noopener">Open in GymMaster</a></div>';
 });
}
$("#tag").addEventListener("keydown",function(e){if(e.key==="Enter"){e.preventDefault();saveTag()}});
$("#tag").addEventListener("change",saveTag);
$("#aFinish").addEventListener("click",function(){
 $("#finErr").textContent="";
 if(newId&&$("#billDone").checked&&!$("#billOpen").hidden)post("/api/jobs",{kind:"missing_billing",outcome:"billing_in",member_id:newId});
 if(newId&&!$("#billDone").checked&&!$("#billOpen").hidden&&!$("#finErr").dataset.warned){$("#finErr").textContent="Bank details aren't ticked off. They'll stay on Today until they are. Press Done again to finish.";$("#finErr").dataset.warned="1";return}
 resetAdd();show("today");
});
$("#aProfile").addEventListener("click",function(){var id=newId;resetAdd();openMember(id)});
function resetAdd(){
 ["#first","#last","#email","#mobile","#dob","#ename","#ephone","#tag","#mate"].forEach(function(s){$(s).value=""});
 $("#goal").value="";$("#source").value="";$("#gender").value="";$("#passport").checked=false;$("#fpid").value="";PHOTO=null;$("#aFace").innerHTML="?";$("#aPhotoBtn").textContent="Take photo";$("#aNoPhoto").checked=false;$("#fpWrap").hidden=true;$("#fpGm").hidden=true;$("#billCard").hidden=false;$("#billOpen").hidden=false;$("#agreed").checked=false;$("#billDone").checked=false;$("#mateWrap").hidden=false;
 $("#tagOk").innerHTML="";$("#mateSel").textContent="";$("#qr").hidden=true;$("#finErr").dataset.warned="";sel=null;mate=null;newId=null;
 HQ={};$$(".yn button").forEach(function(x){x.classList.remove("on")});$("#hqInjury").value="";$("#hqDoctor").value="";$("#hqInjury").hidden=true;$("#hqDoctor").hidden=true;$("#aStart").value="";$("#aRead").checked=false;
 $$('[data-next="5"]').forEach(function(x){x.dataset.warned="";x.textContent="Next"});pick.fam="perform";if(PL)drawPlans();sizeSig();goStep(1);
}

