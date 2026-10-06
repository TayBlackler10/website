/* ---------- live member panel ---------- */
function loadLive(id){
 get("/api/members/"+id+"/live").then(function(d){
  var B=$("#liveBox");if(!B)return;
  if(d.error){B.innerHTML='<section class="card"><h2>Live from GymMaster</h2><div class="muted">'+esc(d.error)+'</div></section>';return}
  var h='<section class="card"><div style="display:flex;align-items:baseline;gap:10px;flex-wrap:wrap"><h2>Live from GymMaster</h2><span class="muted">Checked just now</span></div>';
  if(d.owing!=null)h+=(d.owing>0?'<div class="warnbox">Owes <b>'+money(d.owing)+'</b> right now.'+(d.owing>=250?" Blocked at the doors, in the app and from classes until it's paid.":"")+'</div>':'<div class="ok">Nothing owing.</div>');
  if(d.next_bill)h+='<div class="muted">'+esc(d.next_bill)+'</div>';
  if(d.memberships&&d.memberships.length)h+='<div class="hist">'+d.memberships.map(function(x){return '<div><span>'+esc(day(x.start))+'</span><span><b>'+esc(x.name)+'</b>'+(x.price?" "+esc(x.price):"")+(x.on_hold?' <span class="pill warn">On hold</span>':"")+(x.hold_coming?' <span class="pill">Hold coming</span>':"")+(x.in_min_term?' <span class="pill">In lock-in</span>':"")+'<br><span>'+[x.next_payment?"Next payment "+day(x.next_payment):"",x.end?"Ends "+day(x.end):"",x.earliest_cancel?"Can cancel from "+day(x.earliest_cancel):"",x.visit_limit?x.visits_used+" of "+x.visit_limit+" visits used":""].filter(Boolean).map(esc).join(". ")+'</span></span></div>'}).join("")+'</div>';
  if(d.bookings&&d.bookings.length)h+='<h3>Booked in</h3><div class="hist">'+d.bookings.map(function(b){return '<div><span>'+esc(day(b.day))+" "+esc(b.time)+'</span><span>'+esc(b.name)+(b.waitlist?' <span class="pill warn">Waitlist</span>':"")+'</span></div>'}).join("")+'</div>';
  if(d.visits&&d.visits.length){h+='<h3>Visits by month</h3>'+bars(d.visits.map(function(v){return {label:MON[(v.month-1+12)%12]||v.month,vals:[v.visits]}}),[{name:"Visits",cls:""}],function(x){return x+" visits"})}
  if(d.history&&d.history.length)h+='<h3>Account</h3><div style="overflow-x:auto">'+table([["When","when"],["What","note"],["Charged","debit",1],["Paid",function(r){return r.credit||""},1],["Balance","total",1]],d.history)+'</div>';
  B.innerHTML=h+'</section>'+(d.contracts&&d.contracts.length?'<section class="card"><h2>Signed contracts</h2><div class="hist">'+d.contracts.map(function(c){return '<div><span>'+esc(day(c.signed_at))+'</span><span>'+esc(c.plan||"Membership")+(c.staff?' <span class="muted">with '+esc(c.staff)+'</span>':"")+' <a href="/api/members/'+id+'/contracts/'+c.id+'" target="_blank" rel="noopener">View or save as PDF</a></span></div>'}).join("")+'</div></section>':"");
  var p=d.profile,G=$("#gmBox");
  if(p&&G){
   var age=p.dob?Math.floor((Date.now()-new Date(p.dob+"T00:00:00").getTime())/31557600000):null;
   var t=p.totals||{};
   G.innerHTML='<section class="card"><h2>From their GymMaster profile</h2><div class="tiles">'+tile((t.visits||0).toLocaleString("en-NZ"),"Visits")+tile(t.classes||0,"Classes")+tile(t.bookings||0,"Bookings")+(p.streak?tile(p.streak,"Week streak"):"")+'</div>'+
    '<dl class="kv">'+(age!=null?'<dt>Age</dt><dd>'+age+' ('+esc(day(p.dob))+')</dd>':"")+(p.address?'<dt>Address</dt><dd>'+esc(p.address)+'</dd>':"")+(p.occupation?'<dt>Work</dt><dd>'+esc(p.occupation)+'</dd>':"")+
    (p.emergency&&p.emergency.length?'<dt>Emergency</dt><dd>'+p.emergency.map(function(e){return esc([e.name,e.relationship&&"("+e.relationship+")"].filter(Boolean).join(" "))+(e.phone?' <a href="tel:'+esc(e.phone)+'">'+esc(e.phone)+'</a>':"")}).join("<br>")+'</dd>':'<dt>Emergency</dt><dd><span class="pill warn">None on file</span></dd>')+
    (p.medical?'<dt>Medical</dt><dd>'+esc(p.medical)+'</dd>':"")+(p.has_billing!==undefined?'<dt>Bank or card</dt><dd>'+(p.has_billing?'<span class="pill ok">On file</span>':'<span class="pill warn">None on file</span>')+'</dd>':"")+
    (p.tag?'<dt>Tag in GymMaster</dt><dd>'+esc(p.tag)+'</dd>':"")+(p.staff?'<dt>Added by</dt><dd>'+esc(p.staff)+(p.created?", "+esc(day(p.created)):"")+'</dd>':"")+
    (p.linked&&p.linked.length?'<dt>Linked</dt><dd>'+p.linked.map(function(x){return '<a href="#" data-member="'+x.id+'">'+esc(x.name||("#"+x.id))+'</a>'}).join(", ")+'</dd>':"")+'</dl></section>';
  }
 });
}

