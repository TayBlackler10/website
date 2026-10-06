/* ---------- camera ---------- */
// Works with the USB camera at reception, a laptop camera, or a phone or tablet.
function initials(n){return String(n||"?").split(/\s+/).filter(Boolean).slice(0,2).map(function(x){return x[0].toUpperCase()}).join("")||"?"}
var CAM={stream:null,done:null,shot:null};
function camStop(){if(CAM.stream){CAM.stream.getTracks().forEach(function(t){t.stop()});CAM.stream=null}}
function camStart(devId){
 camStop();$("#camErr").textContent="";
 if(!navigator.mediaDevices||!navigator.mediaDevices.getUserMedia){$("#camErr").textContent="This browser can't use a camera. Use Upload a photo instead.";return Promise.resolve()}
 var v={width:{ideal:1280},height:{ideal:720}};if(devId)v.deviceId={exact:devId};
 return navigator.mediaDevices.getUserMedia({video:v,audio:false}).then(function(s){
  CAM.stream=s;$("#camVid").srcObject=s;
  var id=s.getVideoTracks()[0].getSettings().deviceId;try{if(id)localStorage.setItem("m2cam",id)}catch(e){}
  return navigator.mediaDevices.enumerateDevices().then(function(list){
   var cams=list.filter(function(d){return d.kind==="videoinput"});
   $("#camDev").innerHTML=cams.map(function(c,i){return '<option value="'+esc(c.deviceId)+'"'+(c.deviceId===id?" selected":"")+'>'+esc(c.label||("Camera "+(i+1)))+'</option>'}).join("");
  });
 }).catch(function(e){$("#camErr").textContent=(e&&e.name==="NotAllowedError")?"Chrome blocked the camera. Click the camera icon in the address bar and allow it.":"Can't find a camera. Check the USB camera is plugged in, or use Upload a photo."});
}
function openCam(who,done){
 CAM.done=done;CAM.shot=null;$("#camWho").textContent=who||"";$("#cam").hidden=false;
 $("#camShot").hidden=true;$("#camVid").hidden=false;$("#camSnap").hidden=false;$("#camRetake").hidden=true;$("#camUse").hidden=true;
 var saved=null;try{saved=localStorage.getItem("m2cam")}catch(e){}
 camStart(saved).then(function(){if(!CAM.stream&&saved)camStart(null)});
}
function closeCam(){camStop();$("#cam").hidden=true}
function squareJpeg(src,w,h){var s=Math.min(w,h),c=document.createElement("canvas");c.width=480;c.height=480;c.getContext("2d").drawImage(src,(w-s)/2,(h-s)/2,s,s,0,0,480,480);return c.toDataURL("image/jpeg",0.82)}
function showShot(url){CAM.shot=url;$("#camShot").src=url;$("#camShot").hidden=false;$("#camVid").hidden=true;$("#camSnap").hidden=true;$("#camRetake").hidden=false;$("#camUse").hidden=false}
$("#camSnap").addEventListener("click",function(){var v=$("#camVid");if(!v.videoWidth){$("#camErr").textContent="The camera isn't ready yet.";return}showShot(squareJpeg(v,v.videoWidth,v.videoHeight))});
$("#camRetake").addEventListener("click",function(){CAM.shot=null;$("#camShot").hidden=true;$("#camVid").hidden=false;$("#camSnap").hidden=false;$("#camRetake").hidden=true;$("#camUse").hidden=true});
$("#camUse").addEventListener("click",function(){var u=CAM.shot,d=CAM.done;closeCam();if(d&&u)d(u)});
$("#camClose").addEventListener("click",closeCam);
$("#cam").addEventListener("click",function(e){if(e.target.id==="cam")closeCam()});
document.addEventListener("keydown",function(e){if(e.key==="Escape"&&!$("#cam").hidden)closeCam()});
$("#camDev").addEventListener("change",function(e){camStart(e.target.value)});
$("#camFile").addEventListener("change",function(e){var f=e.target.files&&e.target.files[0];if(!f)return;var im=new Image();im.onload=function(){showShot(squareJpeg(im,im.naturalWidth,im.naturalHeight));URL.revokeObjectURL(im.src)};im.src=URL.createObjectURL(f);e.target.value=""});
// Profile and Today: take or retake a member's photo.
document.addEventListener("click",function(e){var b=e.target.closest("[data-photo]");if(!b)return;var id=+b.dataset.photo;
 openCam(b.dataset.name,function(url){post("/api/members/"+id+"/photo",{jpeg:url}).then(function(r){if(!r.ok){alert(r.error);return}
  if(VIEW==="today")loadToday();else openMember(id)})})});
// Add member: photo before saving.
var PHOTO=null;
$("#aPhotoBtn").addEventListener("click",function(){openCam(($("#first").value+" "+$("#last").value).trim(),function(url){PHOTO=url;$("#aFace").innerHTML='<img src="'+url+'" alt="New member photo">';$("#aPhotoBtn").textContent="Retake photo";$("#aNoPhoto").checked=false})});

