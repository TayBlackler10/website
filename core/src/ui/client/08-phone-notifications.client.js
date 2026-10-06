/* ---------- phone notifications ---------- */
function b64k(s){s=s.replace(/-/g,"+").replace(/_/g,"/");while(s.length%4)s+="=";var r=atob(s),o=new Uint8Array(r.length);for(var i=0;i<r.length;i++)o[i]=r.charCodeAt(i);return o}
function pushBox(el){
 var ios=/iphone|ipad|ipod/i.test(navigator.userAgent),standalone=window.navigator.standalone||window.matchMedia("(display-mode: standalone)").matches;
 if(!("serviceWorker" in navigator)||!("PushManager" in window)){
  el.innerHTML=ios&&!standalone?'<p style="margin:0">On an iPhone, notifications work once M2 Core is on your home screen:</p><ol style="margin:6px 0 0;padding-left:20px;font-size:14px;line-height:1.6"><li>Open M2 Core in Safari</li><li>Tap the Share button, then <b>Add to Home Screen</b></li><li>Open M2 Core from the new icon and come back here</li></ol>':'<div class="muted">This browser can\'t do notifications. Open M2 Core on your phone instead.</div>';return}
 get("/api/push").then(function(st){
  var on=Notification.permission==="granted"&&st.phones>0;
  el.innerHTML=(on?'<div class="ok">Notifications are on for '+st.phones+(st.phones===1?" phone":" phones")+'.</div>':Notification.permission==="denied"?'<div class="warnbox">Notifications are blocked for M2 Core. Turn them on in your phone\'s settings, then come back.</div>':'<p class="muted" style="margin:0">Your phone will buzz the moment something comes in, even when M2 Core is closed.</p>')+
   '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px"><button class="btn '+(on?"line":"dark")+' sm" data-push="1">'+(on?"Send me a test":"Turn on notifications")+'</button></div><div data-pmsg></div>';
  el.querySelector("[data-push]").onclick=function(){var b=this,m=el.querySelector("[data-pmsg]");b.disabled=true;m.innerHTML='<div class="muted">Asking your phone...</div>';
   Notification.requestPermission().then(function(p){
    if(p!=="granted")throw new Error("Notifications weren't allowed.");
    return navigator.serviceWorker.register("/sw.js").then(function(){return navigator.serviceWorker.ready});
   }).then(function(reg){return reg.pushManager.getSubscription().then(function(old){return old||reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:b64k(st.key)})})})
   .then(function(sub){return post("/api/push",{sub:sub.toJSON(),ua:navigator.userAgent,test:true})})
   .then(function(r){b.disabled=false;if(!r.ok)throw new Error(r.error);m.innerHTML='<div class="ok">Done. A test notification is on its way.</div>';setTimeout(function(){pushBox(el)},2500)})
   .catch(function(e){b.disabled=false;m.innerHTML='<div class="err">'+esc(e.message||e)+'</div>'})};
 });
}

