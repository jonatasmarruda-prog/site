const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const views={home:$('#homeView'),track:$('#trackView'),summary:$('#summaryView'),art:$('#artView')};
let deferredInstall=null,watchId=null,timerId=null,wakeLock=null,photoImage=null,selectedFormat='story',lastGpsToastAt=0;
let state=loadActive()||freshState();
const logoImg=new Image();logoImg.crossOrigin='anonymous';logoImg.src='https://cdn.jsdelivr.net/gh/jonatasmarruda-prog/site@main/assets/logo-trilheiros.png';

function freshState(){return{active:false,paused:false,name:'',startedAt:0,pausedAt:0,totalPaused:0,distanceM:0,elevationGain:0,maxAltitude:null,lastAccepted:null,points:[],elapsed:0}}
function saveActive(){try{localStorage.setItem('trilheiros_active',JSON.stringify(state))}catch{}}
function loadActive(){try{return JSON.parse(localStorage.getItem('trilheiros_active')||'null')}catch{return null}}
function clearActive(){try{localStorage.removeItem('trilheiros_active')}catch{}}
function history(){try{return JSON.parse(localStorage.getItem('trilheiros_history')||'[]')}catch{return []}}
function saveHistory(item){const arr=history();arr.unshift(item);try{localStorage.setItem('trilheiros_history',JSON.stringify(arr.slice(0,50)))}catch{}renderHistory()}
function showView(name){Object.values(views).forEach(v=>v&&v.classList.remove('active'));views[name]?.classList.add('active');window.scrollTo({top:0,behavior:'auto'})}
function toast(msg){const el=$('#toast');if(!el)return;el.textContent=msg;el.classList.add('show');clearTimeout(el._t);el._t=setTimeout(()=>el.classList.remove('show'),2800)}
function formatTime(sec){sec=Math.max(0,Math.floor(sec));const h=String(Math.floor(sec/3600)).padStart(2,'0'),m=String(Math.floor((sec%3600)/60)).padStart(2,'0'),s=String(sec%60).padStart(2,'0');return`${h}:${m}:${s}`}
function fmtKm(m){return(Math.max(0,m)/1000).toFixed(2).replace('.',',')}
function hav(a,b){const R=6371000,r=x=>x*Math.PI/180,dLat=r(b.lat-a.lat),dLon=r(b.lon-a.lon),q=Math.sin(dLat/2)**2+Math.cos(r(a.lat))*Math.cos(r(b.lat))*Math.sin(dLon/2)**2;return 2*R*Math.atan2(Math.sqrt(q),Math.sqrt(1-q))}
function elapsedSeconds(){if(!state.startedAt)return 0;const end=state.active?Date.now():(state.endedAt||Date.now()),currentPause=state.paused&&state.pausedAt?end-state.pausedAt:0;return Math.max(0,(end-state.startedAt-state.totalPaused-currentPause)/1000)}
function avgKmh(){const h=elapsedSeconds()/3600;return h>0?(state.distanceM/1000)/h:0}
function escapeHtml(s=''){return String(s).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]))}

function renderHistory(){const arr=history(),list=$('#historyList'),count=$('#historyCount');if(count)count.textContent=`${arr.length} ${arr.length===1?'trilha':'trilhas'}`;if(!list)return;if(!arr.length){list.innerHTML='<div class="history-empty">Sua próxima aventura vai aparecer aqui. 🥾</div>';return}list.innerHTML=arr.slice(0,8).map(i=>`<div class="history-item"><div><h4>${escapeHtml(i.name)}</h4><p>${new Date(i.date).toLocaleDateString('pt-BR')} • ${formatTime(i.elapsed)}</p></div><div class="history-km"><strong>${fmtKm(i.distanceM)} km</strong><small>+${Math.round(i.elevationGain||0)} m</small></div></div>`).join('')}

function updateNetwork(){const b=$('#networkBadge');if(!b)return;if(navigator.onLine){b.className='badge online';b.textContent='● Online'}else{b.className='badge offline';b.textContent='● Offline'}}
window.addEventListener('online',updateNetwork);window.addEventListener('offline',updateNetwork);updateNetwork();

window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferredInstall=e;$('#installBtn')?.classList.remove('hidden')});
$('#installBtn')?.addEventListener('click',async()=>{if(!deferredInstall)return;deferredInstall.prompt();await deferredInstall.userChoice;deferredInstall=null});
const isiOS=/iphone|ipad|ipod/i.test(navigator.userAgent),standalone=window.matchMedia('(display-mode: standalone)').matches||navigator.standalone;
if(isiOS&&!standalone)$('#iosInstallHelp')?.classList.remove('hidden');

async function requestWake(){try{if('wakeLock'in navigator&&!wakeLock){wakeLock=await navigator.wakeLock.request('screen');wakeLock.addEventListener('release',()=>wakeLock=null)}}catch{}}

class GpsTracker{
  constructor(){this.maxAccuracy=45;this.maxKmh=22;this.recent=[];this.lastFiltered=null;this.lastAccepted=null;this.smoothKmh=0;this.lastMotionAt=0;this.stationarySince=0}
  reset(point=null){this.recent=[];this.lastFiltered=point?{...point}:null;this.lastAccepted=point?{...point}:null;this.smoothKmh=0;this.lastMotionAt=0;this.stationarySince=0}
  median(values){const a=values.filter(Number.isFinite).sort((x,y)=>x-y);if(!a.length)return null;const m=Math.floor(a.length/2);return a.length%2?a[m]:(a[m-1]+a[m])/2}
  filter(sample){this.recent.push(sample);if(this.recent.length>3)this.recent.shift();return{lat:this.median(this.recent.map(p=>p.lat)),lon:this.median(this.recent.map(p=>p.lon)),acc:this.median(this.recent.map(p=>p.acc))??sample.acc,alt:this.median(this.recent.map(p=>p.alt)),altAcc:this.median(this.recent.map(p=>p.altAcc)),time:sample.time}}
  smooth(v){if(!Number.isFinite(v)||v<0||v>this.maxKmh)v=0;this.smoothKmh=this.smoothKmh<=0?v:this.smoothKmh*.58+v*.42;if(this.smoothKmh<.35)this.smoothKmh=0;return this.smoothKmh}
  process(sample){
    if(!sample||!Number.isFinite(sample.lat)||!Number.isFinite(sample.lon))return{accepted:false,reason:'invalid',distanceDelta:0,speedKmh:this.smoothKmh};
    const now=sample.time||Date.now(),acc=Number.isFinite(sample.acc)?sample.acc:999;
    if(acc>this.maxAccuracy){if(this.lastMotionAt&&now-this.lastMotionAt>5000)this.smoothKmh*=.55;if(this.smoothKmh<.35)this.smoothKmh=0;return{accepted:false,reason:'weak',distanceDelta:0,speedKmh:this.smoothKmh}}
    const f=this.filter({...sample,acc,time:now});
    if(!this.lastFiltered){this.lastFiltered={...f};this.lastAccepted={...f};return{accepted:false,reason:'initial',distanceDelta:0,speedKmh:0,point:f}}
    const prevF=this.lastFiltered,anchor=this.lastAccepted||prevF,dt=Math.max(.5,(f.time-prevF.time)/1000),step=hav(prevF,f),calcKmh=step/dt*3.6,anchorDt=Math.max(.5,(f.time-anchor.time)/1000),anchorSeg=hav(anchor,f),anchorKmh=anchorSeg/anchorDt*3.6,prevAnchorSeg=hav(anchor,prevF),rawKmh=Number.isFinite(sample.speed)?sample.speed*3.6:null,rawOk=rawKmh!==null&&rawKmh>=0&&rawKmh<=this.maxKmh?rawKmh:null,calcOk=calcKmh>=0&&calcKmh<=this.maxKmh?calcKmh:null,anchorOk=anchorKmh>=0&&anchorKmh<=this.maxKmh?anchorKmh:null;
    let live=0;if(rawOk!==null&&rawOk>=.7)live=rawOk;else if(calcOk!==null&&step>=1)live=calcOk;else if(anchorOk!==null&&anchorSeg>=2)live=anchorOk;
    const avgAcc=((prevF.acc||acc)+(f.acc||acc))/2,threshold=Math.max(2.5,Math.min(7.5,avgAcc*.28)),rawStopped=rawOk!==null&&rawOk<.55,progressive=anchorSeg>=prevAnchorSeg-.8&&step>=.55,accumulated=anchorSeg>=threshold&&progressive&&anchorOk!==null&&anchorOk>=.6,moving=(rawOk!==null&&rawOk>=.7)||accumulated;
    this.lastFiltered={...f};
    if(!moving){if(!this.stationarySince)this.stationarySince=now;if(rawStopped){this.smoothKmh=0;if(now-this.stationarySince>3500){this.lastAccepted={...f};this.stationarySince=now}}else if(now-this.stationarySince>4500)this.smoothKmh=0;else this.smooth(live);return{accepted:false,reason:'stationary',distanceDelta:0,speedKmh:this.smoothKmh,point:f}}
    this.stationarySince=0;this.lastMotionAt=now;if(anchorSeg>100||anchorKmh>this.maxKmh){this.smoothKmh=0;return{accepted:false,reason:'spike',distanceDelta:0,speedKmh:0,point:f}}
    const moveThreshold=(rawOk!==null&&rawOk>=.7)?1.2:Math.max(2.2,threshold*.9);if(anchorSeg<moveThreshold)return{accepted:false,reason:'moving-small',distanceDelta:0,speedKmh:this.smooth(live||anchorKmh),point:f};
    this.lastAccepted={...f};return{accepted:true,reason:'moving',distanceDelta:anchorSeg,speedKmh:this.smooth(live||anchorKmh),point:f}
  }
}
const gpsTracker=new GpsTracker();
function setLive(text){const el=$('.live-dot');if(el)el.innerHTML=`<i></i> ${text}`}
function setGpsBadge(acc){const b=$('#gpsBadge');if(!b)return;if(acc<=12){b.className='badge gps-good';b.textContent='GPS excelente'}else if(acc<=25){b.className='badge gps-good';b.textContent='GPS bom'}else if(acc<=45){b.className='badge gps-search';b.textContent='GPS regular'}else{b.className='badge gps-search';b.textContent='GPS fraco'}}

$('#startBtn')?.addEventListener('click',async()=>{const name=$('#trailName')?.value.trim()||'Minha Trilha';if(!('geolocation'in navigator)){toast('Este celular não disponibilizou GPS.');return}state=freshState();state.active=true;state.name=name;state.startedAt=Date.now();gpsTracker.reset();saveActive();if($('#trackingTrailName'))$('#trackingTrailName').textContent=name;showView('track');startClock();await requestWake();startGps()});

function startClock(){clearInterval(timerId);timerId=setInterval(renderTracking,1000);renderTracking()}
function renderTracking(){state.elapsed=elapsedSeconds();if($('#distanceValue'))$('#distanceValue').textContent=fmtKm(state.distanceM);if($('#timeValue'))$('#timeValue').textContent=formatTime(state.elapsed);if($('#avgValue'))$('#avgValue').textContent=`${avgKmh().toFixed(1).replace('.',',')} km/h`;if($('#elevationValue'))$('#elevationValue').textContent=`+${Math.round(state.elevationGain)} m`;saveActive()}

function startGps(){if(!state.active||state.paused)return;if(watchId!==null)navigator.geolocation.clearWatch(watchId);setLive('CONFIRMANDO GPS');const b=$('#gpsBadge');if(b){b.className='badge gps-search';b.textContent='GPS...'}watchId=navigator.geolocation.watchPosition(onPosition,onGpsError,{enableHighAccuracy:true,maximumAge:1000,timeout:15000})}
function onGpsError(err){const b=$('#gpsBadge');if(b){b.className='badge gps-search';b.textContent=err.code===1?'Permissão GPS':'GPS reconectando'}if($('#speedValue'))$('#speedValue').textContent='0,0 km/h';setLive(err.code===1?'PERMITA A LOCALIZAÇÃO':'RECONECTANDO GPS');const now=Date.now();if(err.code===1||now-lastGpsToastAt>30000){lastGpsToastAt=now;toast(err.code===1?'Permita a localização precisa para registrar a trilha.':'Aguardando sinal GPS...')}}
function onPosition(pos){
  if(!state.active)return;const c=pos.coords,now=pos.timestamp||Date.now(),sample={lat:c.latitude,lon:c.longitude,alt:Number.isFinite(c.altitude)?c.altitude:null,altAcc:Number.isFinite(c.altitudeAccuracy)?c.altitudeAccuracy:null,acc:c.accuracy||999,speed:Number.isFinite(c.speed)?c.speed:null,time:now};
  if($('#accuracyValue'))$('#accuracyValue').textContent=`Precisão: ${Math.round(sample.acc)} m`;setGpsBadge(sample.acc);window.dispatchEvent(new CustomEvent('trilheiros:gps',{detail:sample}));
  if(state.paused){if($('#speedValue'))$('#speedValue').textContent='0,0 km/h';setLive('PAUSADO');return}
  const result=gpsTracker.process(sample);if($('#speedValue'))$('#speedValue').textContent=`${Math.max(0,result.speedKmh||0).toFixed(1).replace('.',',')} km/h`;
  if(result.reason==='weak'){setLive('SINAL FRACO • AGUARDANDO');return}if(result.reason==='spike'){setLive('SALTO DE GPS IGNORADO');return}if(result.reason==='stationary'){setLive('PARADO • DISTÂNCIA NÃO SOMADA');return}if(result.reason==='moving-small'){setLive('MOVIMENTO DETECTADO');return}
  if(result.reason==='initial'&&result.point){state.lastAccepted=result.point;state.points=[result.point];saveActive();$('#waitingGps')?.classList.add('hidden');setLive('GPS PRONTO • COMECE A CAMINHAR');drawTrack();return}
  if(!result.accepted||!result.point)return;
  const prev=state.lastAccepted;state.distanceM+=result.distanceDelta;if(prev&&result.point.alt!==null&&prev.alt!==null){const dAlt=result.point.alt-prev.alt;if((result.point.altAcc==null||result.point.altAcc<=20)&&dAlt>2.5&&dAlt<20)state.elevationGain+=dAlt}if(result.point.alt!==null)state.maxAltitude=state.maxAltitude===null?result.point.alt:Math.max(state.maxAltitude,result.point.alt);state.points.push(result.point);state.lastAccepted=result.point;saveActive();$('#waitingGps')?.classList.add('hidden');setLive('MOVIMENTO REGISTRADO');drawTrack();renderTracking()
}

function drawTrack(){const canvas=$('#trackCanvas');if(!canvas)return;const ctx=canvas.getContext('2d'),pts=state.points||[];ctx.clearRect(0,0,canvas.width,canvas.height);const g=ctx.createRadialGradient(canvas.width/2,canvas.height/2,20,canvas.width/2,canvas.height/2,canvas.width/2);g.addColorStop(0,'#123438');g.addColorStop(1,'#06161a');ctx.fillStyle=g;ctx.fillRect(0,0,canvas.width,canvas.height);ctx.strokeStyle='rgba(241,197,107,.08)';ctx.lineWidth=1;for(let x=0;x<canvas.width;x+=90){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,canvas.height);ctx.stroke()}for(let y=0;y<canvas.height;y+=90){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(canvas.width,y);ctx.stroke()}if(pts.length<2)return;const lats=pts.map(p=>p.lat),lons=pts.map(p=>p.lon),minLat=Math.min(...lats),maxLat=Math.max(...lats),minLon=Math.min(...lons),maxLon=Math.max(...lons),pad=55,w=Math.max(.000001,maxLon-minLon),h=Math.max(.000001,maxLat-minLat),xy=p=>[pad+(p.lon-minLon)/w*(canvas.width-pad*2),canvas.height-pad-(p.lat-minLat)/h*(canvas.height-pad*2)];ctx.lineCap='round';ctx.lineJoin='round';ctx.shadowBlur=18;ctx.shadowColor='rgba(99,199,189,.45)';ctx.strokeStyle='#63c7bd';ctx.lineWidth=8;ctx.beginPath();pts.forEach((p,i)=>{const[x,y]=xy(p);i?ctx.lineTo(x,y):ctx.moveTo(x,y)});ctx.stroke();ctx.shadowBlur=0;const[sx,sy]=xy(pts[0]),[ex,ey]=xy(pts[pts.length-1]);ctx.fillStyle='#f1c56b';ctx.beginPath();ctx.arc(sx,sy,10,0,Math.PI*2);ctx.fill();ctx.fillStyle='#f6f2df';ctx.beginPath();ctx.arc(ex,ey,12,0,Math.PI*2);ctx.fill()}

$('#pauseBtn')?.addEventListener('click',()=>{if(!state.active)return;if(!state.paused){state.paused=true;state.pausedAt=Date.now();$('#pauseBtn').textContent='▶️ CONTINUAR';setLive('PAUSADO');if($('#speedValue'))$('#speedValue').textContent='0,0 km/h';toast('Trilha pausada')}else{state.totalPaused+=Date.now()-state.pausedAt;state.pausedAt=0;state.paused=false;$('#pauseBtn').textContent='⏸️ PAUSAR';gpsTracker.reset(state.lastAccepted||state.points.at(-1)||null);requestWake();startGps();toast('Trilha continuada')}saveActive();renderTracking()});

$('#finishBtn')?.addEventListener('click',()=>{if(!confirm('Finalizar esta trilha?'))return;finishTrail()});
function finishTrail(){if(watchId!==null){navigator.geolocation.clearWatch(watchId);watchId=null}clearInterval(timerId);if(wakeLock){wakeLock.release().catch(()=>{});wakeLock=null}state.elapsed=elapsedSeconds();state.active=false;state.endedAt=Date.now();const item={id:Date.now(),name:state.name,date:state.endedAt,distanceM:state.distanceM,elapsed:state.elapsed,elevationGain:state.elevationGain,points:state.points.length,avg:avgKmh()};saveHistory(item);clearActive();renderSummary(item);showView('summary')}
function renderSummary(item){if($('#summaryTrailName'))$('#summaryTrailName').textContent=item.name;if($('#summaryDistance'))$('#summaryDistance').textContent=fmtKm(item.distanceM);if($('#summaryTime'))$('#summaryTime').textContent=formatTime(item.elapsed);if($('#summaryAvg'))$('#summaryAvg').textContent=`${item.avg.toFixed(1).replace('.',',')} km/h`;if($('#summaryElevation'))$('#summaryElevation').textContent=`+${Math.round(item.elevationGain)} m`;if($('#summaryPoints'))$('#summaryPoints').textContent=item.points;state.summary=item}

$('#photoInput')?.addEventListener('change',e=>{const file=e.target.files?.[0];if(!file)return;const url=URL.createObjectURL(file),img=new Image();img.onload=()=>{photoImage=img;if($('#photoPreview')){$('#photoPreview').src=url;$('#photoPreview').classList.remove('hidden')}if($('#generateBtn'))$('#generateBtn').disabled=false};img.onerror=()=>{URL.revokeObjectURL(url);toast('Não consegui abrir esta foto.')};img.src=url});
$$('.format-btn').forEach(btn=>btn.addEventListener('click',()=>{$$('.format-btn').forEach(b=>b.classList.remove('active'));btn.classList.add('active');selectedFormat=btn.dataset.format}));
$('#generateBtn')?.addEventListener('click',()=>{if(!photoImage)return;generateArt();showView('art')});
$('#backSummaryBtn')?.addEventListener('click',()=>showView('summary'));
$('#newTrailBtn')?.addEventListener('click',()=>{photoImage=null;if($('#photoInput'))$('#photoInput').value='';$('#photoPreview')?.classList.add('hidden');if($('#generateBtn'))$('#generateBtn').disabled=true;showView('home')});

function canvasSize(){if(selectedFormat==='feed')return[1080,1350];if(selectedFormat==='square')return[1080,1080];return[1080,1920]}
function cropCover(ctx,img,w,h){const ir=img.width/img.height,cr=w/h;let sw,sh,sx,sy;if(ir>cr){sh=img.height;sw=sh*cr;sx=(img.width-sw)/2;sy=0}else{sw=img.width;sh=sw/cr;sx=0;sy=(img.height-sh)/2}ctx.drawImage(img,sx,sy,sw,sh,0,0,w,h)}
function roundRect(ctx,x,y,w,h,r){if(ctx.roundRect){ctx.beginPath();ctx.roundRect(x,y,w,h,r);return}ctx.beginPath();ctx.moveTo(x+r,y);ctx.arcTo(x+w,y,x+w,y+h,r);ctx.arcTo(x+w,y+h,x,y+h,r);ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+w,y,r)}
function generateArt(){const canvas=$('#artCanvas'),ctx=canvas.getContext('2d'),[w,h]=canvasSize();canvas.width=w;canvas.height=h;cropCover(ctx,photoImage,w,h);const overlay=ctx.createLinearGradient(0,0,0,h);overlay.addColorStop(0,'rgba(3,14,17,.30)');overlay.addColorStop(.45,'rgba(3,14,17,.18)');overlay.addColorStop(.72,'rgba(3,14,17,.68)');overlay.addColorStop(1,'rgba(3,14,17,.96)');ctx.fillStyle=overlay;ctx.fillRect(0,0,w,h);const gold=ctx.createLinearGradient(0,0,w,0);gold.addColorStop(0,'#f5d98e');gold.addColorStop(.5,'#f0bb5a');gold.addColorStop(1,'#b9772d');ctx.fillStyle=gold;ctx.fillRect(0,0,w,14);const logoSize=Math.round(Math.min(w,h)*.19);if(logoImg.complete&&logoImg.naturalWidth)try{ctx.drawImage(logoImg,48,48,logoSize,logoSize)}catch{}ctx.textAlign='right';ctx.fillStyle='#f6f2df';ctx.font=`800 ${Math.round(w*.025)}px Arial`;ctx.fillText('TRILHEIROS DE RONDONÓPOLIS',w-52,78);ctx.fillStyle='#f1c56b';ctx.font=`900 ${Math.round(w*.017)}px Arial`;ctx.fillText('TRILHA CONCLUÍDA',w-52,112);const s=state.summary,bottom=h-70,panelH=Math.min(520,h*.36),panelY=h-panelH,panelGrad=ctx.createLinearGradient(0,panelY,0,h);panelGrad.addColorStop(0,'rgba(5,24,29,.45)');panelGrad.addColorStop(1,'rgba(4,16,20,.96)');ctx.fillStyle=panelGrad;ctx.fillRect(0,panelY,w,panelH);ctx.textAlign='left';ctx.fillStyle='#f1c56b';ctx.font=`900 ${Math.round(w*.025)}px Arial`;ctx.fillText('TRILHA CONCLUÍDA',52,panelY+72);ctx.fillStyle='#f6f2df';ctx.font=`900 ${Math.round(w*.055)}px Arial`;const name=(s.name||'MINHA TRILHA').toUpperCase();ctx.fillText(name.length>26?name.slice(0,26)+'…':name,52,panelY+138);ctx.fillStyle='#f1c56b';ctx.font=`900 ${Math.round(w*.145)}px Arial`;ctx.fillText(fmtKm(s.distanceM),48,panelY+285);const kmX=48+ctx.measureText(fmtKm(s.distanceM)).width+18;ctx.font=`900 ${Math.round(w*.033)}px Arial`;ctx.fillText('KM',kmX,panelY+285);const statsY=panelY+360,boxGap=14,boxW=(w-104-boxGap*2)/3,labels=[['TEMPO',formatTime(s.elapsed)],['ELEVAÇÃO',`+${Math.round(s.elevationGain)} m`],['MÉDIA',`${s.avg.toFixed(1).replace('.',',')} km/h`]];labels.forEach((it,i)=>{const x=52+i*(boxW+boxGap);ctx.fillStyle='rgba(255,255,255,.065)';roundRect(ctx,x,statsY,boxW,92,18);ctx.fill();ctx.fillStyle='#93aaa9';ctx.font=`800 ${Math.round(w*.014)}px Arial`;ctx.fillText(it[0],x+16,statsY+31);ctx.fillStyle='#f6f2df';ctx.font=`900 ${Math.round(w*.022)}px Arial`;ctx.fillText(it[1],x+16,statsY+65)});ctx.fillStyle='#9cb0af';ctx.font=`700 ${Math.round(w*.014)}px Arial`;ctx.fillText(`${new Date(s.date).toLocaleDateString('pt-BR')}  •  Mais uma aventura com os Trilheiros`,52,bottom)}
async function artBlob(){return new Promise(res=>$('#artCanvas').toBlob(res,'image/jpeg',.94))}
$('#shareBtn')?.addEventListener('click',async()=>{const blob=await artBlob(),file=new File([blob],'trilha-concluida-trilheiros.jpg',{type:'image/jpeg'});if(navigator.canShare?.({files:[file]})){try{await navigator.share({files:[file],title:'Trilha concluída',text:'Mais uma aventura concluída com os Trilheiros de Rondonópolis! 🥾'});return}catch(e){if(e.name==='AbortError')return}}downloadBlob(blob);toast('Imagem salva para compartilhar.')});
$('#downloadBtn')?.addEventListener('click',async()=>downloadBlob(await artBlob()));
function downloadBlob(blob){const a=document.createElement('a'),url=URL.createObjectURL(blob);a.href=url;a.download='trilha-concluida-trilheiros.jpg';a.click();setTimeout(()=>URL.revokeObjectURL(url),3000)}

function restoreTracker(){const p=state.lastAccepted||state.points?.at(-1)||null;gpsTracker.reset(p)}
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'&&state.active&&!state.paused){requestWake();restoreTracker();startGps()}});
window.addEventListener('pageshow',()=>{if(state.active&&!state.paused){restoreTracker();startGps()}});
window.addEventListener('pagehide',saveActive);
if('serviceWorker'in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register('sw.js').catch(()=>{}));
renderHistory();
if(state.active){if($('#trackingTrailName'))$('#trackingTrailName').textContent=state.name||'Minha Trilha';showView('track');drawTrack();startClock();restoreTracker();requestWake();startGps()}
