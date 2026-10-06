/* ---------- money owed ---------- */
var COL={tab:"current",data:null,cur:null};
function loadCol(){
 get("/api/collections").then(function(d){
  if(d.error){$("#colTable").innerHTML='<div class="err">'+esc(d.error)+'</div>';return}
  COL.data=d;var t=d.totals,r=d.rules;
  $("#colTiles").innerHTML=tile(whole$(t.current_sum),t.current+" members owing")+tile(t.blocked,"Blocked at $"+r.limit)+tile(whole$(t.left_sum),t.left+" people who left owing")+tile(t.referable,"Could go to Marshall Freeman");
  var cv=d.coverage||{};$("#colNote").textContent="Balances checked in the last 2 days: "+(cv.recent||0).toLocaleString("en-NZ")+" of "+(cv.n||0).toLocaleString("en-NZ")+" members. The Core checks 20 every 15 minutes"+(cv.last?", last at "+new Date(cv.last.replace(" ","T")+"Z").toLocaleTimeString("en-NZ",{hour:"numeric",minute:"2-digit"}):"")+". Gifted time is never listed.";
  $("#colRules").textContent="Settlement offer: "+r.p1+"% of the debt up to $1,500, "+r.p2+"% above. Only debts of $"+r.refMin.toLocaleString("en-NZ")+" or more go to Marshall Freeman. Change these in Settings.";
  drawCol();
 });
}
function drawCol(){
 var d=COL.data,rows=d.rows.filter(function(x){return COL.tab==="left"?x.left:!x.left});
 $("#colTabs").innerHTML='<button class="chip'+(COL.tab==="current"?" on":"")+'" data-ct="current">Still members '+d.totals.current+'</button><button class="chip'+(COL.tab==="left"?" on":"")+'" data-ct="left">Left M2 '+d.totals.left+'</button>';
 $("#colTable").innerHTML=rows.length?table([["Name",function(x){return '<a href="#" data-col="'+x.id+'">'+esc(nm(x))+'</a>'},0,1],["Owes",function(x){return money(x.owing)},1],["Offer",function(x){return money(x.offer)},1],["Status",function(x){return x.case_status?'<span class="pill">'+esc({open:"Chasing",promised:"Promised",referred:"Marshall Freeman"}[x.case_status]||x.case_status)+'</span>':(x.blocked&&!x.left?'<span class="pill warn">Blocked</span>':"")},0,1],["Last contact",function(x){return x.last_at?day(x.last_at):""}],["Checked",function(x){return x.checked_at?day(x.checked_at):"Import"}]],rows):'<div class="ok">Nobody here. Nice.</div>';
}
$("#colTabs").addEventListener("click",function(e){var b=e.target.closest("[data-ct]");if(!b)return;COL.tab=b.dataset.ct;drawCol()});
$("#colTable").addEventListener("click",function(e){var a=e.target.closest("[data-col]");if(!a)return;e.preventDefault();e.stopPropagation();openCol(+a.dataset.col)});
function openCol(id){
 var x=COL.data.rows.find(function(r){return r.id===id});if(!x)return;COL.cur=x;
 var owner=ME.can.settings;
 $("#colPanel").innerHTML='<div style="display:flex;gap:10px;align-items:baseline;flex-wrap:wrap"><h2>'+esc(nm(x))+'</h2><a href="#" class="muted" data-member="'+x.id+'">Profile</a></div>'+
  '<div class="warnbox">Owes <b>'+money(x.owing)+'</b>. Settle for <b>'+money(x.offer)+'</b> if they pay today.</div>'+
  '<dl class="kv"><dt>Mobile</dt><dd>'+(x.mobile?'<a href="tel:'+esc(x.mobile)+'">'+esc(x.mobile)+'</a>':"None")+'</dd><dt>Email</dt><dd>'+esc(x.email||"None")+'</dd><dt>Membership</dt><dd>'+esc(x.plan||"-")+(x.left?" (left)":"")+'</dd>'+(x.next_bill?'<dt>GymMaster</dt><dd>'+esc(x.next_bill)+'</dd>':"")+(x.last_note?'<dt>Last note</dt><dd>'+esc(x.last_note)+'</dd>':"")+'</dl>'+
  '<label class="fld">Note<input id="colNote2" placeholder="What did they say?"></label>'+
  '<div class="outs"><button class="btn dark sm" data-ca="called">Called</button><button class="btn line sm" data-ca="promised">Promised to pay</button><button class="btn line sm" data-ca="settled">Settled</button>'+
  (owner&&x.can_refer?'<button class="btn line sm" data-ca="referred">Refer to Marshall Freeman</button>':"")+(owner?'<button class="btn line sm" data-ca="written_off">Write off</button>':"")+'<button class="btn line sm" data-ca="check">Check balance now</button></div><div class="err" id="colErr"></div>';
}
$("#colPanel").addEventListener("click",function(e){
 var b=e.target.closest("[data-ca]");if(!b)return;var x=COL.cur,a=b.dataset.ca;$("#colErr").textContent="";
 if(a==="check"){b.disabled=true;get("/api/members/"+x.id+"/live").then(function(r){b.disabled=false;if(r.error){$("#colErr").textContent=r.error;return}loadCol();$("#colErr").textContent="GymMaster says "+money(r.owing||0)+".";$("#colErr").style.color="var(--ink)"});return}
 var body={member_id:x.id,action:a,note:$("#colNote2").value};
 if(a==="promised"){var w=prompt("Pay by what date? (like 2026-10-20)","");if(w===null)return;body.when=w}
 if(a==="settled"){var amt=prompt("How much did they pay?",x.offer.toFixed(2));if(amt===null)return;body.amount=amt}
 if(a==="written_off"&&!confirm("Write off "+money(x.owing)+"?"))return;
 post("/api/collections",body).then(function(r){if(!r.ok){$("#colErr").textContent=r.error;return}$("#colPanel").innerHTML='<div class="ok">Saved for '+esc(nm(x))+'.</div>';loadCol()});
});

