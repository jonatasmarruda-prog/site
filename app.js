const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const views={home:$('#homeView'),track:$('#trackView'),summary:$('#summaryView'),art:$('#artView')};
let deferredInstall=null, watchId=null, timerId=null, wakeLock=null, photoImage=null, selectedFormat='story';
let state=loadActive()||freshState();
const logoImg=new Image(); logoImg.src='assets/logo-trilheiros.png';

function freshState(){return {active:false,paused:false,name:'',startedAt:0,pausedAt:0,totalPaused:0,distanceM:0,elevationGain:0,maxAltitude:null,lastAccepted:null,points:[],elapsed:0}}
function saveActive(){localStorage.setItem('trilheiros_active',JSON.stringify(state))}
function loadActive(){try{return JSON.parse(localStorage.getItem('trilheiros_active')||'null')}catch{return null}}
function clearActive(){localStorage.removeItem('trilheiros_active')}
function history(){try{return JSON.parse(localStorage.getItem('trilheiros_history')||'[]')}catch{return []}}
function saveHistory(item){const arr=history();arr.unshift(item);localStorage.setItem('trilheiros_history',JSON.stringify(arr.slice(0,50)));renderHistory()}
function showView(name){Object.values(views).forEach(v=>v.classList.remove('active'));views[name].classList.add('active');window.scrollTo({top:0,behavior:'instant'})}
function toast(msg){const el=$('#toast');el.textContent=msg;el.classList.add('show');clearTimeout(el._t);el._t=setTimeout(()=>el.classList.remove('show'),2500)}
function formatTime(sec){sec=Math.max(0,Math.floor(sec));const h=String(Math.floor(sec/3600)).padStart(2,'0'),m=String(Math.floor((sec%3600)/60)).padStart(2,'0'),s=String(sec%60).padStart(2,'0');return `${h}:${m}:${s}`}
function fmtKm(m){return (m/1000).toFixed(2).replace('.',',')}
function hav(a,b){const R=6371000,r=x=>x*Math.PI/180,dLat=r(b.lat-a.lat),dLon=r(b.lon-a.lon),x=Math.sin(dLat/2)**2+Math.cos(r(a.lat))*Math.cos(r(b.lat))*Math.sin(dLon/2)**2;return 2*R*Math.atan2(Math.sqrt(x),Math.sqrt(1-x))}
function elapsedSeconds(){if(!state.startedAt)return 0;const end=state.active?Date.now():(state.endedAt||Date.now());const currentPause=state.paused&&state.pausedAt?end-state.pausedAt:0;return Math.max(0,(end-state.startedAt-state.totalPaused-currentPause)/1000)}
function avgKmh(){const h=elapsedSeconds()/3600;return h>0?(state.distanceM/1000)/h:0}

function renderHistory(){const arr=history(),list=$('#historyList');$('#historyCount').textContent=`${arr.length} ${arr.length===1?'trilha':'trilhas'}`;if(!arr.length){list.innerHTML='<div class="history-empty">Sua próxima aventura vai aparecer aqui. 🥾</div>';return}list.innerHTML=arr.slice(0,8).map(i=>`<div class="history-item"><div><h4>${escapeHtml(i.name)}</h4><p>${new Date(i.date).toLocaleDateString('pt-BR')} • ${formatTime(i.elapsed)}</p></div><div class="history-km"><strong>${fmtKm(i.distanceM)} km</strong><small>+${Math.round(i.elevationGain||0)} m</small></div></div>`).join('')}
function escapeHtml(s=''){return s.replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]))}

function updateNetwork(){const b=$('#networkBadge');if(navigator.onLine){b.className='badge online';b.textContent='● Online'}else{b.className='badge offline';b.textContent='● Offline'}}
window.addEventListener('online',updateNetwork);window.addEventListener('offline',updateNetwork);updateNetwork();

window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferredInstall=e;$('#installBtn').classList.remove('hidden')});
$('#installBtn').addEventListener('click',async()=>{if(!deferredInstall)return;deferredInstall.prompt();await deferredInstall.userChoice;deferredInstall=null;$('#installBtn').classList.add('hidden')});
const isiOS=/iphone|ipad|ipod/i.test(navigator.userAgent),standalone=window.matchMedia('(display-mode: standalone)').matches||navigator.standalone;
if(isiOS&&!standalone)$('#iosInstallHelp').classList.remove('hidden');

async function requestWake(){try{if('wakeLock'in navigator&&!wakeLock){wakeLock=await navigator.wakeLock.request('screen');wakeLock.addEventListener('release',()=>wakeLock=null)}}catch{}}
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'&&state.active&&!state.paused)requestWake()});

$('#startBtn').addEventListener('click',async()=>{
  const name=$('#trailName').value.trim()||'Minha Trilha';
  if(!('geolocation'in navigator)){toast('Este celular não disponibilizou GPS.');return}
  state=freshState();state.active=true;state.name=name;state.startedAt=Date.now();saveActive();
  $('#trackingTrailName').textContent=name;showView('track');startClock();await requestWake();startGps();
});

function startClock(){clearInterval(timerId);timerId=setInterval(renderTracking,1000);renderTracking()}
function renderTracking(){state.elapsed=elapsedSeconds();$('#distanceValue').textContent=fmtKm(state.distanceM);$('#timeValue').textContent=formatTime(state.elapsed);$('#avgValue').textContent=`${avgKmh().toFixed(1).replace('.',',')} km/h`;$('#elevationValue').textContent=`+${Math.round(state.elevationGain)} m`;saveActive()}

function startGps(){if(watchId!==null)navigator.geolocation.clearWatch(watchId);$('#gpsBadge').className='badge gps-search';$('#gpsBadge').textContent='GPS...';watchId=navigator.geolocation.watchPosition(onPosition,onGpsError,{enableHighAccuracy:true,maximumAge:0,timeout:20000})}
function onGpsError(err){$('#gpsBadge').className='badge gps-search';$('#gpsBadge').textContent='GPS indisponível';if(err.code===1)toast('Permita a localização para registrar a trilha.');else toast('Aguardando sinal GPS...')}
function onPosition(pos){
  const c=pos.coords, now=pos.timestamp||Date.now(), p={lat:c.latitude,lon:c.longitude,alt:Number.isFinite(c.altitude)?c.altitude:null,acc:c.accuracy||999,time:now};
  $('#accuracyValue').textContent=`Precisão: ${Math.round(p.acc)} m`;$('#speedValue').textContent=`${Math.max(0,(c.speed||0)*3.6).toFixed(1).replace('.',',')} km/h`;
  if(p.acc<=25){$('#gpsBadge').className='badge gps-good';$('#gpsBadge').textContent='GPS excelente'}else if(p.acc<=50){$('#gpsBadge').className='badge gps-good';$('#gpsBadge').textContent='GPS bom'}else{$('#gpsBadge').className='badge gps-search';$('#gpsBadge').textContent='GPS fraco'}
  if(state.paused||p.acc>65)return;
  let accept=false,seg=0;
  if(!state.lastAccepted)accept=true;else{
    seg=hav(state.lastAccepted,p);const dt=Math.max(1,(p.time-state.lastAccepted.time)/1000),calcSpeed=seg/dt;
    if(seg>=2&&calcSpeed<=6&&seg<=220)accept=true;
  }
  if(!accept)return;
  if(state.lastAccepted){state.distanceM+=seg;if(p.alt!==null&&state.lastAccepted.alt!==null){const dAlt=p.alt-state.lastAccepted.alt;if(dAlt>1&&dAlt<35)state.elevationGain+=dAlt}}
  if(p.alt!==null)state.maxAltitude=state.maxAltitude===null?p.alt:Math.max(state.maxAltitude,p.alt);
  state.points.push(p);state.lastAccepted=p;saveActive();$('#waitingGps').classList.add('hidden');drawTrack();renderTracking();
}

function drawTrack(){const canvas=$('#trackCanvas'),ctx=canvas.getContext('2d'),pts=state.points;ctx.clearRect(0,0,canvas.width,canvas.height);const g=ctx.createRadialGradient(canvas.width/2,canvas.height/2,20,canvas.width/2,canvas.height/2,canvas.width/2);g.addColorStop(0,'#123438');g.addColorStop(1,'#06161a');ctx.fillStyle=g;ctx.fillRect(0,0,canvas.width,canvas.height);ctx.strokeStyle='rgba(241,197,107,.08)';ctx.lineWidth=1;for(let x=0;x<canvas.width;x+=90){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,canvas.height);ctx.stroke()}for(let y=0;y<canvas.height;y+=90){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(canvas.width,y);ctx.stroke()}if(pts.length<2)return;const lats=pts.map(p=>p.lat),lons=pts.map(p=>p.lon),minLat=Math.min(...lats),maxLat=Math.max(...lats),minLon=Math.min(...lons),maxLon=Math.max(...lons),pad=55,w=Math.max(.000001,maxLon-minLon),h=Math.max(.000001,maxLat-minLat);const xy=p=>[pad+(p.lon-minLon)/w*(canvas.width-pad*2),canvas.height-pad-(p.lat-minLat)/h*(canvas.height-pad*2)];ctx.lineCap='round';ctx.lineJoin='round';ctx.shadowBlur=18;ctx.shadowColor='rgba(99,199,189,.45)';ctx.strokeStyle='#63c7bd';ctx.lineWidth=8;ctx.beginPath();pts.forEach((p,i)=>{const [x,y]=xy(p);i?ctx.lineTo(x,y):ctx.moveTo(x,y)});ctx.stroke();ctx.shadowBlur=0;const [sx,sy]=xy(pts[0]),[ex,ey]=xy(pts[pts.length-1]);ctx.fillStyle='#f1c56b';ctx.beginPath();ctx.arc(sx,sy,10,0,Math.PI*2);ctx.fill();ctx.fillStyle='#f6f2df';ctx.beginPath();ctx.arc(ex,ey,12,0,Math.PI*2);ctx.fill()}

$('#pauseBtn').addEventListener('click',()=>{if(!state.active)return;if(!state.paused){state.paused=true;state.pausedAt=Date.now();$('#pauseBtn').textContent='▶️ CONTINUAR';toast('Trilha pausada')}else{state.totalPaused+=Date.now()-state.pausedAt;state.pausedAt=0;state.paused=false;$('#pauseBtn').textContent='⏸️ PAUSAR';requestWake();toast('Trilha continuada')}saveActive();renderTracking()});

$('#finishBtn').addEventListener('click',()=>{if(!confirm('Finalizar esta trilha?'))return;finishTrail()});
function finishTrail(){
  if(watchId!==null){navigator.geolocation.clearWatch(watchId);watchId=null}clearInterval(timerId);if(wakeLock){wakeLock.release().catch(()=>{});wakeLock=null}
  state.elapsed=elapsedSeconds();state.active=false;state.endedAt=Date.now();
  const item={id:Date.now(),name:state.name,date:state.endedAt,distanceM:state.distanceM,elapsed:state.elapsed,elevationGain:state.elevationGain,points:state.points.length,avg:avgKmh()};saveHistory(item);clearActive();renderSummary(item);showView('summary')
}
function renderSummary(item){$('#summaryTrailName').textContent=item.name;$('#summaryDistance').textContent=fmtKm(item.distanceM);$('#summaryTime').textContent=formatTime(item.elapsed);$('#summaryAvg').textContent=`${item.avg.toFixed(1).replace('.',',')} km/h`;$('#summaryElevation').textContent=`+${Math.round(item.elevationGain)} m`;$('#summaryPoints').textContent=item.points;state.summary=item}

$('#photoInput').addEventListener('change',e=>{const file=e.target.files?.[0];if(!file)return;const url=URL.createObjectURL(file),img=new Image();img.onload=()=>{photoImage=img;$('#photoPreview').src=url;$('#photoPreview').classList.remove('hidden');$('#generateBtn').disabled=false};img.src=url});
$$('.format-btn').forEach(btn=>btn.addEventListener('click',()=>{$$('.format-btn').forEach(b=>b.classList.remove('active'));btn.classList.add('active');selectedFormat=btn.dataset.format}));
$('#generateBtn').addEventListener('click',()=>{if(!photoImage)return;generateArt();showView('art')});
$('#backSummaryBtn').addEventListener('click',()=>showView('summary'));
$('#newTrailBtn').addEventListener('click',()=>{photoImage=null;$('#photoInput').value='';$('#photoPreview').classList.add('hidden');$('#generateBtn').disabled=true;showView('home')});

function canvasSize(){if(selectedFormat==='feed')return[1080,1350];if(selectedFormat==='square')return[1080,1080];return[1080,1920]}
function cropCover(ctx,img,w,h){const ir=img.width/img.height,cr=w/h;let sw,sh,sx,sy;if(ir>cr){sh=img.height;sw=sh*cr;sx=(img.width-sw)/2;sy=0}else{sw=img.width;sh=sw/cr;sx=0;sy=(img.height-sh)/2}ctx.drawImage(img,sx,sy,sw,sh,0,0,w,h)}
function roundRect(ctx,x,y,w,h,r){ctx.beginPath();ctx.roundRect(x,y,w,h,r)}
function generateArt(){
  const canvas=$('#artCanvas'),ctx=canvas.getContext('2d'),[w,h]=canvasSize();canvas.width=w;canvas.height=h;cropCover(ctx,photoImage,w,h);
  const overlay=ctx.createLinearGradient(0,0,0,h);overlay.addColorStop(0,'rgba(3,14,17,.30)');overlay.addColorStop(.45,'rgba(3,14,17,.18)');overlay.addColorStop(.72,'rgba(3,14,17,.68)');overlay.addColorStop(1,'rgba(3,14,17,.96)');ctx.fillStyle=overlay;ctx.fillRect(0,0,w,h);
  const gold=ctx.createLinearGradient(0,0,w,0);gold.addColorStop(0,'#f5d98e');gold.addColorStop(.5,'#f0bb5a');gold.addColorStop(1,'#b9772d');ctx.fillStyle=gold;ctx.fillRect(0,0,w,14);
  const logoSize=Math.round(Math.min(w,h)*.19);if(logoImg.complete)ctx.drawImage(logoImg,48,48,logoSize,logoSize);
  ctx.textAlign='right';ctx.fillStyle='#f6f2df';ctx.font=`800 ${Math.round(w*.025)}px Arial`;ctx.fillText('TRILHEIROS DE RONDONÓPOLIS',w-52,78);ctx.fillStyle='#f1c56b';ctx.font=`900 ${Math.round(w*.017)}px Arial`;ctx.fillText('TRILHA CONCLUÍDA',w-52,112);
  const s=state.summary, bottom=h-70, panelH=Math.min(520,h*.36), panelY=h-panelH;
  const panelGrad=ctx.createLinearGradient(0,panelY,0,h);panelGrad.addColorStop(0,'rgba(5,24,29,.45)');panelGrad.addColorStop(1,'rgba(4,16,20,.96)');ctx.fillStyle=panelGrad;ctx.fillRect(0,panelY,w,panelH);
  ctx.textAlign='left';ctx.fillStyle='#f1c56b';ctx.font=`900 ${Math.round(w*.025)}px Arial`;ctx.fillText('TRILHA CONCLUÍDA',52,panelY+72);
  ctx.fillStyle='#f6f2df';ctx.font=`900 ${Math.round(w*.055)}px Arial`;const name=(s.name||'MINHA TRILHA').toUpperCase();ctx.fillText(name.length>26?name.slice(0,26)+'…':name,52,panelY+138);
  ctx.fillStyle='#f1c56b';ctx.font=`900 ${Math.round(w*.145)}px Arial`;ctx.fillText(fmtKm(s.distanceM),48,panelY+285);const kmX=48+ctx.measureText(fmtKm(s.distanceM)).width+18;ctx.font=`900 ${Math.round(w*.033)}px Arial`;ctx.fillText('KM',kmX,panelY+285);
  const statsY=panelY+360, boxGap=14, boxW=(w-104-boxGap*2)/3, labels=[['TEMPO',formatTime(s.elapsed)],['ELEVAÇÃO',`+${Math.round(s.elevationGain)} m`],['MÉDIA',`${s.avg.toFixed(1).replace('.',',')} km/h`]];
  labels.forEach((it,i)=>{const x=52+i*(boxW+boxGap);ctx.fillStyle='rgba(255,255,255,.065)';roundRect(ctx,x,statsY,boxW,92,18);ctx.fill();ctx.fillStyle='#93aaa9';ctx.font=`800 ${Math.round(w*.014)}px Arial`;ctx.fillText(it[0],x+16,statsY+31);ctx.fillStyle='#f6f2df';ctx.font=`900 ${Math.round(w*.022)}px Arial`;ctx.fillText(it[1],x+16,statsY+65)});
  ctx.fillStyle='#9cb0af';ctx.font=`700 ${Math.round(w*.014)}px Arial`;ctx.fillText(`${new Date(s.date).toLocaleDateString('pt-BR')}  •  Mais uma aventura com os Trilheiros`,52,bottom);
}
async function artBlob(){return new Promise(res=>$('#artCanvas').toBlob(res,'image/jpeg',.94))}
$('#shareBtn').addEventListener('click',async()=>{const blob=await artBlob(),file=new File([blob],'trilha-concluida-trilheiros.jpg',{type:'image/jpeg'});if(navigator.canShare?.({files:[file]})){try{await navigator.share({files:[file],title:'Trilha concluída',text:'Mais uma aventura concluída com os Trilheiros de Rondonópolis! 🥾'});return}catch(e){if(e.name==='AbortError')return}}downloadBlob(blob);toast('Imagem salva para compartilhar.')});
$('#downloadBtn').addEventListener('click',async()=>downloadBlob(await artBlob()));
function downloadBlob(blob){const a=document.createElement('a'),url=URL.createObjectURL(blob);a.href=url;a.download='trilha-concluida-trilheiros.jpg';a.click();setTimeout(()=>URL.revokeObjectURL(url),3000)}

if('serviceWorker'in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register('sw.js').catch(()=>{}));
renderHistory();
if(state.active){$('#trackingTrailName').textContent=state.name||'Minha Trilha';showView('track');drawTrack();startClock();requestWake();startGps()}
