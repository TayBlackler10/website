/* ---------- point of sale ---------- */
var POS={items:[],cats:[],cat:"",q:"",cart:[],member:null,customer:"",edit:false};
function loadPos(){
 get("/api/pos").then(function(d){if(d.error){$("#posGrid").innerHTML='<div class="err">'+esc(d.error)+'</div>';return}POS.items=d.items;POS.cats=d.cats;drawPos();drawCart()});
 if(!$("#posDay").value)$("#posDay").value=new Date().toLocaleDateString("en-CA",{timeZone:"Pacific/Auckland"});
 loadPosSales();
}
function drawPos(){
 var have={};POS.items.forEach(function(p){if(p.active||POS.edit)have[p.category]=1});
 $("#posCats").innerHTML='<button class="chip'+(POS.cat?"":" on")+'" data-pc="">Everything</button>'+POS.cats.filter(function(c){return have[c]}).map(function(c){return '<button class="chip'+(POS.cat===c?" on":"")+'" data-pc="'+esc(c)+'">'+esc(c)+'</button>'}).join("");
 var q=POS.q.toLowerCase(),L=POS.items.filter(function(p){return (POS.edit||p.active)&&(!POS.cat||p.category===POS.cat)&&(!q||p.name.toLowerCase().indexOf(q)>=0)});
 $("#posGrid").innerHTML=L.map(function(p){return '<button class="pbtn'+(p.active?"":" off")+(POS.edit?" edit":"")+'" data-pp="'+p.id+'"><b>'+esc(p.name)+'</b><span>'+money(p.price)+'</span></button>'}).join("")||'<div class="muted">Nothing matches.</div>';
 $("#posEditBar").hidden=!POS.edit;$("#posEditBtn").textContent=POS.edit?"Done editing":"Edit products";
}
function cartTotal(){return POS.cart.reduce(function(a,l){return a+l.qty*l.price},0)}
function drawCart(msg){
 var h='<h2>Sale</h2>';
 h+=POS.member?'<div class="ok" style="display:flex;justify-content:space-between;gap:8px;align-items:center"><span>For <b>'+esc(POS.member.name)+'</b></span><button class="btn line sm" data-pm="clear">Change</button></div>':
  '<label class="search" for="posMem" style="height:44px"><span class="sr">Find the member</span><input id="posMem" autocomplete="off" placeholder="Member name, mobile or scan their tag (optional)"></label><div id="posMemRes"></div>';
 if(!POS.cart.length)h+='<div class="muted">Tap products to add them.</div>';
 else{h+=POS.cart.map(function(l,i){return '<div class="cline"><span>'+esc(l.name)+'<br><a href="#" class="muted" style="font-size:12px" data-cp="'+i+'">'+money(l.price)+' each</a></span><span class="q"><button data-cq="'+i+'" data-d="-1" aria-label="One less">-</button>'+l.qty+'<button data-cq="'+i+'" data-d="1" aria-label="One more">+</button></span><b>'+money(l.qty*l.price)+'</b></div>'}).join("");
  h+='<div class="ctot"><span>Total</span><span>'+money(cartTotal())+'</span></div>'+
   '<input id="posNote" placeholder="Note (optional)" style="height:40px;border:1px solid var(--line);border-radius:12px;padding:0 12px">'+
   '<div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn dark" data-pay="eftpos" style="flex:1">EFTPOS</button><button class="btn line" data-pay="cash" style="flex:1">Cash</button></div><button class="btn line sm" data-pm="empty" style="align-self:flex-start">Clear the sale</button>'}
 if(msg)h+=msg;
 $("#posCart").innerHTML=h;
 var mi=$("#posMem");if(mi){var t2;mi.addEventListener("input",function(){clearTimeout(t2);var v=mi.value.trim();t2=setTimeout(function(){if(v.length<2){$("#posMemRes").innerHTML="";return}get("/api/members?q="+encodeURIComponent(v)).then(function(r){$("#posMemRes").innerHTML=(r.results||[]).slice(0,6).map(function(m){return '<button class="lrow" data-pmid="'+m.id+'" data-pmn="'+esc(nm(m))+'"><span><b>'+esc(nm(m))+'</b> <span class="muted" style="font-size:13px">'+esc(m.plan||m.status||"")+'</span></span><span></span></button>'}).join("")||'<div class="muted" style="font-size:13px">No one found. You can still sell without a member.</div>'})},250)});
  mi.addEventListener("keydown",function(e){if(e.key==="Enter"){e.preventDefault();var b=$("#posMemRes [data-pmid]");if(b)b.click()}})}
}
function posEditProduct(p){
 p=p||{name:"",price:"",category:POS.cat||"Other",active:1};
 $("#posCart").innerHTML='<h2>'+(p.id?"Change "+esc(p.name):"Add a product")+'</h2><label class="fld">Name<input id="ppN" value="'+esc(p.name)+'"></label><label class="fld">Price ($, incl GST)<input id="ppP" inputmode="decimal" value="'+(p.price===""?"":(+p.price).toFixed(2))+'"></label><label class="fld">Group<select id="ppC">'+POS.cats.map(function(c){return '<option'+(c===p.category?" selected":"")+'>'+esc(c)+'</option>'}).join("")+'</select></label>'+(p.id?'<label class="chk"><input type="checkbox" id="ppA"'+(p.active?" checked":"")+'> On sale</label>':"")+'<div style="display:flex;gap:8px"><button class="btn dark" id="ppSave">Save</button><button class="btn line" id="ppBack">Back to the sale</button></div><div id="ppMsg"></div>';
 $("#ppBack").onclick=function(){drawCart()};
 $("#ppSave").onclick=function(){post("/api/pos/product",{id:p.id,name:$("#ppN").value,price:$("#ppP").value,category:$("#ppC").value,active:p.id?$("#ppA").checked:true}).then(function(r){if(!r.ok){$("#ppMsg").innerHTML='<div class="err">'+esc(r.error)+'</div>';return}get("/api/pos").then(function(d){POS.items=d.items;drawPos();drawCart('<div class="ok">Saved.</div>')})})};
}
function loadPosSales(){
 get("/api/pos/sales?day="+$("#posDay").value).then(function(d){if(d.error)return;
  var t=d.totals,sum=(t.eftpos||0)+(t.cash||0);
  $("#posTotals").innerHTML=tile(money(sum),"Taken")+tile(money(t.eftpos||0),"EFTPOS")+tile(money(t.cash||0),"Cash")+tile(d.rows.filter(function(r){return !r.voided}).length,"Sales");
  $("#posSales").innerHTML=d.rows.length?table([["Time",function(r){return new Date(String(r.at).replace(" ","T")+"Z").toLocaleTimeString("en-NZ",{hour:"numeric",minute:"2-digit"})}],["Who",function(r){return r.member_id?'<a href="#" data-member="'+r.member_id+'">'+esc(nm(r))+'</a>':esc(r.customer||"Walk in")},0,1],["What","items"],["Paid",function(r){return r.paid_by==="eftpos"?"EFTPOS":"Cash"}],["Total",function(r){return r.voided?'<s>'+money(r.total)+'</s> <span class="pill warn">Voided</span>':money(r.total)},1,1],["By","staff"],["",function(r){return d.can_void&&!r.voided?'<a href="#" data-pv="'+r.id+'">Void</a>':""},0,1]],d.rows):'<div class="muted">No sales this day.</div>';
 });
}
$("#posDay").addEventListener("change",loadPosSales);
$("#posCats").addEventListener("click",function(e){var b=e.target.closest("[data-pc]");if(!b)return;POS.cat=b.dataset.pc;drawPos()});
$("#posQ").addEventListener("input",function(e){POS.q=e.target.value;drawPos()});
$("#posEditBtn").addEventListener("click",function(){POS.edit=!POS.edit;drawPos();if(!POS.edit)drawCart()});
$("#posAdd").addEventListener("click",function(){posEditProduct(null)});
$("#posGrid").addEventListener("click",function(e){var b=e.target.closest("[data-pp]");if(!b)return;var p=POS.items.find(function(x){return x.id===+b.dataset.pp});if(!p)return;
 if(POS.edit){posEditProduct(p);return}
 var l=POS.cart.find(function(x){return x.id===p.id&&x.price===p.price});if(l)l.qty++;else POS.cart.push({id:p.id,name:p.name,price:p.price,qty:1});drawCart()});
$("#posSales").addEventListener("click",function(e){var a=e.target.closest("[data-pv]");if(!a)return;e.preventDefault();var why=prompt("Why is this sale being voided?","");if(!why)return;post("/api/pos/sale/"+a.dataset.pv+"/void",{reason:why}).then(function(r){if(!r.ok)alert(r.error);loadPosSales()})});
$("#posCart").addEventListener("click",function(e){var t;
 if((t=e.target.closest("[data-pmid]"))){POS.member={id:+t.dataset.pmid,name:t.dataset.pmn};drawCart();return}
 if((t=e.target.closest("[data-pm]"))){if(t.dataset.pm==="clear")POS.member=null;else POS.cart=[];drawCart();return}
 if((t=e.target.closest("[data-cq]"))){var l=POS.cart[+t.dataset.cq];l.qty+=+t.dataset.d;if(l.qty<1)POS.cart.splice(+t.dataset.cq,1);drawCart();return}
 if((t=e.target.closest("[data-cp]"))){e.preventDefault();var l2=POS.cart[+t.dataset.cp],np=prompt("Price for "+l2.name+" this time (for a discount)",l2.price.toFixed(2));if(np===null)return;var n=parseFloat(np);if(!isNaN(n)&&n>=0){l2.price=Math.round(n*100)/100;drawCart()}return}
 if((t=e.target.closest("[data-pay]"))){var pay=t.dataset.pay;t.disabled=true;
  post("/api/pos/sale",{paid_by:pay,member_id:POS.member&&POS.member.id,note:($("#posNote")||{}).value,lines:POS.cart.map(function(l){return {id:l.id,qty:l.qty,price:l.price}})}).then(function(r){
   if(!r.ok){t.disabled=false;drawCart('<div class="err">'+esc(r.error)+'</div>');return}
   var who=POS.member;POS.cart=[];POS.member=null;
   drawCart('<div class="ok">Sold. '+money(r.total)+' by '+(pay==="eftpos"?"EFTPOS":"cash")+(who?" for "+esc(who.name):"")+'.'+(r.key_tag&&who?' <a href="#" data-member="'+who.id+'">Give them their key tag</a>':"")+'</div>');loadPosSales()})}
});

