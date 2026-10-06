var $=function(s){return document.querySelector(s)};
var $$=function(s){return Array.prototype.slice.call(document.querySelectorAll(s))};
function esc(s){return String(s==null?"":s).replace(/[&<>"]/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]})}
function get(u){return fetch(u).then(function(r){return r.json()})}
function post(u,b){return fetch(u,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(b||{})}).then(function(r){return r.json()})}
function money(n){return "$"+Number(n||0).toLocaleString("en-NZ",{minimumFractionDigits:2,maximumFractionDigits:2})}
function day(s){if(!s)return "";var d=new Date(String(s).replace(" ","T")+(String(s).length>10?"Z":"T00:00:00"));if(isNaN(d))return String(s).slice(0,10);return d.toLocaleDateString("en-NZ",{day:"numeric",month:"short",year:(new Date().getFullYear()===d.getFullYear()?undefined:"2-digit")})}
function nm(r){return ((r.first_name||"")+" "+(r.last_name||"")).trim()||r.name||"No name"}
var ME=null, VIEW="today";
var OUT_LABEL={joined:"Joined",joining_at_desk:"Joining at the desk",call_back:"Call back",no_answer:"No answer",not_interested:"Not for them",paid:"Paid",billing_in:"Bank details in",tag_given:"Tag given",fp_in_gm:"It's in GymMaster",done:"Done",hold_set:"Hold put on",cancel_set:"Cancelled",kept:"They're staying"};
var JOB_OUTS={new_lead:["joined","call_back","no_answer","not_interested"],missing_billing:["billing_in","call_back","no_answer"],trial_ending:["joined","joining_at_desk","call_back","no_answer","not_interested"],failed_payment:["paid","call_back","no_answer"],cancel_save:["call_back","no_answer","not_interested","done"],hold_ending:["done","call_back"],blocked:["paid","call_back","no_answer"],call_back:["joined","paid","call_back","no_answer","not_interested","done"],no_tag:["tag_given","done"],fp_id_gm:["fp_in_gm"],fp_missing:["call_back","no_answer"],no_photo:["done"],app_hold:["hold_set","call_back","no_answer"],trial_welcome:["done","no_answer"],trial_call:["done","call_back","no_answer"],at_risk:["done","call_back","no_answer","not_interested"],app_cancel:["kept","cancel_set","call_back","no_answer"],app_delete:["done","call_back","no_answer"]};
var KIND={prospect:"Started online or enquired",trial:"5 Days for $5",free_pt:"Free PT",unfinished_signup:"Unfinished sign-up",bring_a_mate:"Bring a Mate",app_upgrade:"App upgrade",website_form:"Enquiry",meta_form:"Meta form",walk_in:"Walk in"};

function show(v){
 VIEW=v;
 $$("[data-view]").forEach(function(s){s.hidden=s.dataset.view!==v});
 $$(".nav").forEach(function(b){b.classList.toggle("on",b.dataset.go===v)});
 window.scrollTo(0,0);
 if(v==="today"){loadToday();loadHome();if(ME&&ME.can.business){loadBiz();loadMorning()}}
 if(v==="plays")loadPlays();
 if(v==="insights")loadIns();
 if(v==="why")loadWhy();
 if(v==="leads")loadLeads();
 if(v==="add")startAdd();
 if(v==="tag")setTimeout(function(){$("#lookTag").focus()},50);
 if(v==="passport"){loadPassport();loadFpMore();setTimeout(function(){loadFpCheck(false);loadFpNudge()},50)}
 if(v==="reports")loadReport();
 if(v==="staff")loadStaff();
 if(v==="activity")loadAct();
 if(v==="settings")loadSettings();
 if(v==="classes"){loadClasses(CLS.week);loadClassStats();loadTT()}
 if(v==="roster")loadRoster(RO.week);
 if(v==="collections")loadCol();
 if(v==="billing")loadBill();
 if(v==="ptleads")loadPt();
 if(v==="catalog")loadCat();
 if(v==="pos")loadPos();
 if(v==="visits")loadVisits();
 if(v==="app")loadApp();
 if(v==="emails")loadEm();
 if(v==="mypt")loadMyPt();
 if(v==="money")loadMoney();
 if(v==="growth")loadGrowth();
 if(v==="marketing"){loadMkt();loadMktMore()}
 if(v==="members"){$("#mProf").hidden=true;$("#mList").hidden=false;loadWall(false);setTimeout(function(){$("#q").focus()},50)}
}
document.addEventListener("click",function(e){var b=e.target.closest("[data-go]");if(b){e.preventDefault();show(b.dataset.go)}});

