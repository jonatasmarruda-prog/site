(() => {
  'use strict';

  const $ = s => document.querySelector(s);
  const $$ = s => [...document.querySelectorAll(s)];
  const PROFILE_KEY = 'trilheiros_profile_name';
  const ACTIVE_KEY = 'trilheiros_active_v26';
  const HISTORY_KEY = 'trilheiros_history';
  const VERSION = '26.0.0';

  let watchId = null;
  let timerId = null;
  let wakeLock = null;
  let deferredInstall = null;
  let selectedFormat = 'story';
  let selectedPhoto = null;
  let selectedPhotoUrl = null;

  const gps = {anchor:null,pending:null,lastRaw:null,speedKmh:0,lastMotionAt:0,lastGoodAt:0};

  function freshState(){return {active:false,paused:false,name:'',startedAt:0,pausedAt:0,totalPaused:0,endedAt:0,distanceM:0,elevationGain:0,maxAltitude:null,points:[],summary:null}}
  let state = loadActive() || freshState();
  function saveActive(){if(state.active)localStorage.setItem(ACTIVE_KEY,JSON.stringify(state));else localStorage.removeItem(ACTIVE_KEY)}
  function loadActive(){try{return JSON.parse(localStorage.getItem(ACTIVE_KEY)||'null')}catch{return null}}
  function clearActive(){localStorage.removeItem(ACTIVE_KEY)}
  function getHistory(){try{return JSON.parse(localStorage.getItem(HISTORY_KEY)||'[]')}catch{return[]}}
  function setHistory(arr){localStorage.setItem(HISTORY_KEY,JSON.stringify(arr.slice(0,100)))}
  function getProfileName(){return (localStorage.getItem(PROFILE_KEY)||'').trim()}
  function setProfileName(v){const n=String(v||'').trim().replace(/\s+/g,' ').slice(0,45);if(n)localStorage.setItem(PROFILE_KEY,n);return n}

  function escapeHtml(v=''){return String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
  function formatTime(sec){sec=Math.max(0,Math.floor(sec||0));const h=String(Math.floor(sec/3600)).padStart(2,'0'),m=String(Math.floor((sec%3600)/60)).padStart(2,'0'),s=String(sec%60).padStart(2,'0');return `${h}:${m}:${s}`}
  function fmtKm(m){return ((m||0)/1000).toFixed(2).replace('.',',')}
  function hav(a,b){const R=6371000,r=x=>x*Math.PI/180,dLat=r(b.lat-a.lat),dLon=r(b.lon-a.lon),x=Math.sin(dLat/2)**2+Math.cos(r(a.lat))*Math.cos(r(b.lat))*Math.sin(dLon/2)**2;return 2*R*Math.atan2(Math.sqrt(x),Math.sqrt(1-x))}
  function elapsedSeconds(){if(!state.startedAt)return 0;const end=state.active?Date.now():(state.endedAt||Date.now()),openPause=state.paused&&state.pausedAt?end-state.pausedAt:0;return Math.max(0,(end-state.startedAt-state.totalPaused-openPause)/1000)}
  function avgKmh(){const h=elapsedSeconds()/3600;return h>0?(state.distanceM/1000)/h:0}
  function toast(msg){const el=$('#toast');if(!el)return;el.textContent=msg;el.classList.add('show');clearTimeout(el._t);el._t=setTimeout(()=>el.classList.remove('show'),2600)}
  function showView(name){const map={home:$('#homeView'),track:$('#trackView'),summary:$('#summaryView'),art:$('#artView')};Object.values(map).forEach(v=>v?.classList.remove('active'));map[name]?.classList.add('active');window.scrollTo({top:0,behavior:'instant'})}

  function ensureProfile(){
    const hero=$('.hero-card');
    if(hero&&!$('#welcomeUser')){const box=document.createElement('div');box.id='welcomeUser';box.innerHTML='<div class="welcome-user">Bem-vindo, <span id="welcomeName"></span>!</div><div class="welcome-sub">Pra onde vamos hoje?</div>';const status=hero.querySelector('.status-strip');status?status.insertAdjacentElement('afterend',box):hero.prepend(box)}
    const n=getProfileName();if($('#welcomeName'))$('#welcomeName').textContent=n||'Trilheiro(a)';if(n)return;if($('#profileModal'))return;
    const modal=document.createElement('div');modal.id='profileModal';modal.className='profile-modal';modal.innerHTML='<div class="profile-card"><div class="profile-mark">🥾</div><h2>Seu nome</h2><p>Ele fica salvo somente neste celular.</p><input id="profileNameInput" class="profile-field" maxlength="45" autocomplete="name" placeholder="Coloque o seu nome"><button id="profileSaveBtn" class="profile-save">CONTINUAR</button></div>';document.body.appendChild(modal);
    const save=()=>{const value=setProfileName($('#profileNameInput')?.value);if(!value){$('#profileNameInput')?.focus();return}modal.remove();if($('#welcomeName'))$('#welcomeName').textContent=value;toast('Bem-vindo, '+value+'!')};$('#profileSaveBtn').onclick=save;$('#profileNameInput').addEventListener('keydown',e=>{if(e.key==='Enter')save()});setTimeout(()=>$('#profileNameInput')?.focus(),150)
  }

  function renderHistory(){const arr=getHistory(),list=$('#historyList'),count=$('#historyCount');if(!list||!count)return;count.textContent=`${arr.length} ${arr.length===1?'trilha':'trilhas'}`;if(!arr.length){list.innerHTML='<div class="history-empty">Sua próxima aventura vai aparecer aqui. 🥾</div>';return}list.innerHTML=arr.map((i,idx)=>`<div class="history-item"><div><h4>${escapeHtml(i.name||'Minha Trilha')}</h4><p>${new Date(i.date||Date.now()).toLocaleDateString('pt-BR')} • ${formatTime(i.elapsed)}</p></div><div class="history-km"><strong>${fmtKm(i.distanceM)} km</strong><small>${(i.avg||0).toFixed(1).replace('.',',')} km/h</small></div><button class="history-delete" data-delete-index="${idx}" aria-label="Excluir trilha">🗑️</button></div>`).join('')}
  document.addEventListener('click',e=>{const b=e.target.closest?.('[data-delete-index]');if(!b)return;const arr=getHistory(),idx=Number(b.dataset.deleteIndex),item=arr[idx];if(!item)return;if(!confirm(`Excluir “${item.name||'esta trilha'}” do histórico?`))return;arr.splice(idx,1);setHistory(arr);renderHistory();toast('Trilha excluída.')})

  function updateNetwork(){const b=$('#networkBadge');if(!b)return;const on=navigator.onLine;b.className='badge '+(on?'online':'offline');b.textContent=on?'● Online':'● Offline'}
  addEventListener('online',updateNetwork);addEventListener('offline',updateNetwork)
  async function requestWake(){try{if('wakeLock' in navigator&&!wakeLock){wakeLock=await navigator.wakeLock.request('screen');wakeLock.addEventListener('release',()=>wakeLock=null)}}catch{}}
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'&&state.active&&!state.paused)requestWake()})

  function setLive(mode,text){const el=$('.live-dot');if(!el)return;el.classList.remove('stationary','protected');if(mode)el.classList.add(mode);el.innerHTML='<i></i> '+text}
  function setSpeed(v,force=false){let kmh=Number.isFinite(v)?Math.max(0,v):0;if(kmh>14.5)kmh=0;gps.speedKmh=force?kmh:(gps.speedKmh?gps.speedKmh*.58+kmh*.42:kmh);if(gps.speedKmh<.25)gps.speedKmh=0;const el=$('#speedValue');if(el)el.textContent=`${gps.speedKmh.toFixed(1).replace('.',',')} km/h`}
  function updateGpsBadge(acc){const b=$('#gpsBadge');if(!b)return;if(acc<=10){b.className='badge gps-good';b.textContent='GPS EXCELENTE'}else if(acc<=20){b.className='badge gps-good';b.textContent='GPS BOM'}else if(acc<=35){b.className='badge gps-search';b.textContent='GPS PROTEGIDO'}else{b.className='badge gps-search';b.textContent='GPS FRACO'}}
  function movementDeadband(a,b){const noise=((a.acc||8)+(b.acc||8))*.18;return Math.max(3,Math.min(7,noise))}

  function renderTracking(){const d=$('#distanceValue'),unit=document.querySelector('.distance-number small');if(state.distanceM<1000){if(d)d.textContent=String(Math.round(state.distanceM));if(unit)unit.textContent='M'}else{if(d)d.textContent=fmtKm(state.distanceM);if(unit)unit.textContent='KM'}if($('#timeValue'))$('#timeValue').textContent=formatTime(elapsedSeconds());if($('#avgValue'))$('#avgValue').textContent=`${avgKmh().toFixed(1).replace('.',',')} km/h`;if($('#elevationValue'))$('#elevationValue').textContent=`+${Math.round(state.elevationGain||0)} m`;saveActive()}

  function acceptPosition(p,rawKmh){const anchor=gps.anchor,d=hav(anchor,p),dt=Math.max(1,(p.time-anchor.time)/1000),calcKmh=Math.min(14.5,d/dt*3.6);state.distanceM+=d;if(p.alt!==null&&anchor.alt!==null){const da=p.alt-anchor.alt,good=(p.altAcc==null||p.altAcc<=20)&&Math.abs(da)<=15;if(good&&da>2.5)state.elevationGain+=da}if(p.alt!==null)state.maxAltitude=state.maxAltitude===null?p.alt:Math.max(state.maxAltitude,p.alt);state.points.push(p);if(state.points.length>2500)state.points=state.points.slice(-2500);gps.anchor=p;gps.pending=null;gps.lastMotionAt=Date.now();const liveKmh=rawKmh!==null&&rawKmh>=.7?calcKmh*.55+rawKmh*.45:calcKmh;setSpeed(liveKmh);$('#waitingGps')?.classList.add('hidden');drawTrack();renderTracking();setLive('','MOVIMENTO REGISTRADO')}

  function onPosition(pos){
    const c=pos.coords,p={lat:c.latitude,lon:c.longitude,alt:Number.isFinite(c.altitude)?c.altitude:null,altAcc:Number.isFinite(c.altitudeAccuracy)?c.altitudeAccuracy:null,acc:c.accuracy||999,time:pos.timestamp||Date.now()};if($('#accuracyValue'))$('#accuracyValue').textContent=`Precisão: ${Math.round(p.acc)} m`;updateGpsBadge(p.acc);if(state.paused)return;
    if(p.acc>35){gps.pending=null;if(Date.now()-gps.lastMotionAt>4500)setSpeed(0,true);setLive('protected','SINAL FRACO • AGUARDANDO GPS');gps.lastRaw=p;return}gps.lastGoodAt=Date.now();
    if(!gps.anchor){gps.anchor=p;gps.lastRaw=p;state.points=[p];saveActive();setSpeed(0,true);setLive('stationary','GPS FIXADO • PODE CAMINHAR');return}
    const anchor=gps.anchor,d=hav(anchor,p),dt=Math.max(1,(p.time-anchor.time)/1000),calcKmh=d/dt*3.6,deviceKmh=Number.isFinite(c.speed)?c.speed*3.6:null,rawKmh=deviceKmh!==null&&deviceKmh>=0&&deviceKmh<=14.5?deviceKmh:null,dead=movementDeadband(anchor,p);
    if(d>85||calcKmh>16||(deviceKmh!==null&&deviceKmh>22)){gps.pending=null;if(Date.now()-gps.lastMotionAt>4500)setSpeed(0,true);setLive('protected','SALTO DE GPS IGNORADO');gps.lastRaw=p;return}
    if(d<dead){gps.pending=null;if(rawKmh!==null&&rawKmh>=.8){gps.lastMotionAt=Date.now();setSpeed(rawKmh);setLive('','MOVIMENTO DETECTADO')}else if(Date.now()-gps.lastMotionAt>5000){setSpeed(0,true);setLive('stationary','PARADO • DISTÂNCIA NÃO SOMADA')}gps.lastRaw=p;return}
    if(rawKmh!==null&&rawKmh>=.8&&rawKmh<=12){acceptPosition(p,rawKmh);gps.lastRaw=p;return}
    if(!gps.pending){gps.pending=p;const provisional=Math.min(calcKmh,12);if(provisional>=.8)setSpeed(provisional);setLive('stationary','CONFIRMANDO MOVIMENTO...');gps.lastRaw=p;return}
    const advance=hav(gps.pending,p),fromAnchor=hav(anchor,p),pendingFromAnchor=hav(anchor,gps.pending),confirmed=advance>=1.2&&fromAnchor>=dead&&fromAnchor>=pendingFromAnchor-1.5;if(confirmed)acceptPosition(p,rawKmh);else{gps.pending=p;setLive('stationary','CONFIRMANDO MOVIMENTO...')}gps.lastRaw=p
  }

  function onGpsError(err){const b=$('#gpsBadge');if(b){b.className='badge gps-search';b.textContent=err.code===1?'PERMISSÃO GPS':'GPS RECONECTANDO'}if(Date.now()-gps.lastMotionAt>4500)setSpeed(0,true);setLive('protected','GPS SEM POSIÇÃO');if(err.code===1)toast('Ative a localização precisa para registrar a trilha.')}
  function startGps(){if(watchId!==null)navigator.geolocation.clearWatch(watchId);gps.anchor=state.points?.length?state.points[state.points.length-1]:null;gps.pending=null;gps.lastRaw=null;watchId=navigator.geolocation.watchPosition(onPosition,onGpsError,{enableHighAccuracy:true,maximumAge:0,timeout:20000})}
  function startClock(){clearInterval(timerId);timerId=setInterval(()=>{renderTracking();if(state.active&&!state.paused&&Date.now()-gps.lastMotionAt>6500)setSpeed(0,true)},1000);renderTracking()}

  function drawTrack(){const canvas=$('#trackCanvas');if(!canvas)return;const ctx=canvas.getContext('2d'),pts=state.points||[];ctx.clearRect(0,0,canvas.width,canvas.height);const g=ctx.createRadialGradient(canvas.width/2,canvas.height/2,20,canvas.width/2,canvas.height/2,canvas.width/2);g.addColorStop(0,'#19312d');g.addColorStop(1,'#07110f');ctx.fillStyle=g;ctx.fillRect(0,0,canvas.width,canvas.height);if(pts.length<2)return;const lats=pts.map(p=>p.lat),lons=pts.map(p=>p.lon),minLat=Math.min(...lats),maxLat=Math.max(...lats),minLon=Math.min(...lons),maxLon=Math.max(...lons),pad=55,w=Math.max(.000001,maxLon-minLon),h=Math.max(.000001,maxLat-minLat),xy=p=>[pad+(p.lon-minLon)/w*(canvas.width-pad*2),canvas.height-pad-(p.lat-minLat)/h*(canvas.height-pad*2)];ctx.lineCap='round';ctx.lineJoin='round';ctx.strokeStyle='#fc5200';ctx.lineWidth=8;ctx.beginPath();pts.forEach((p,i)=>{const[x,y]=xy(p);i?ctx.lineTo(x,y):ctx.moveTo(x,y)});ctx.stroke();const[sx,sy]=xy(pts[0]),[ex,ey]=xy(pts[pts.length-1]);ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(sx,sy,9,0,Math.PI*2);ctx.fill();ctx.fillStyle='#fc5200';ctx.beginPath();ctx.arc(ex,ey,11,0,Math.PI*2);ctx.fill()}

  function startTrail(){const trail=$('#trailName')?.value.trim()||'Minha Trilha';if(!navigator.geolocation){toast('GPS não disponível neste celular.');return}state=freshState();state.active=true;state.name=trail;state.startedAt=Date.now();gps.anchor=null;gps.pending=null;gps.speedKmh=0;gps.lastMotionAt=0;if($('#trackingTrailName'))$('#trackingTrailName').textContent=trail;showView('track');saveActive();startClock();requestWake();startGps()}
  function togglePause(){if(!state.active)return;if(!state.paused){state.paused=true;state.pausedAt=Date.now();if($('#pauseBtn'))$('#pauseBtn').textContent='▶️ CONTINUAR';setSpeed(0,true);toast('Trilha pausada')}else{state.totalPaused+=Date.now()-state.pausedAt;state.pausedAt=0;state.paused=false;if($('#pauseBtn'))$('#pauseBtn').textContent='⏸️ PAUSAR';requestWake();toast('Trilha continuada')}saveActive();renderTracking()}
  function finishTrail(){if(!state.active)return;if(!confirm('Finalizar esta trilha?'))return;if(watchId!==null){navigator.geolocation.clearWatch(watchId);watchId=null}clearInterval(timerId);timerId=null;if(wakeLock){wakeLock.release().catch(()=>{});wakeLock=null}state.active=false;state.paused=false;state.endedAt=Date.now();const item={id:Date.now(),name:state.name,date:state.endedAt,distanceM:state.distanceM,elapsed:elapsedSeconds(),elevationGain:state.elevationGain,points:state.points.length,avg:avgKmh()};const arr=getHistory();arr.unshift(item);setHistory(arr);state.summary=item;clearActive();renderSummary(item);renderHistory();showView('summary')}
  function renderSummary(item){if($('#summaryTrailName'))$('#summaryTrailName').textContent=item.name;if($('#summaryDistance'))$('#summaryDistance').textContent=fmtKm(item.distanceM);if($('#summaryTime'))$('#summaryTime').textContent=formatTime(item.elapsed);if($('#summaryAvg'))$('#summaryAvg').textContent=`${item.avg.toFixed(1).replace('.',',')} km/h`;if($('#summaryElevation'))$('#summaryElevation').textContent=`+${Math.round(item.elevationGain||0)} m`;if($('#summaryPoints'))$('#summaryPoints').textContent=item.points||0}

  function loadImageFile(file){return new Promise((resolve,reject)=>{if('createImageBitmap'in window){createImageBitmap(file).then(bitmap=>resolve(bitmap)).catch(()=>fallback())}else fallback();function fallback(){const url=URL.createObjectURL(file),img=new Image();img.onload=()=>resolve(img);img.onerror=()=>reject(new Error('imagem'));img.src=url;selectedPhotoUrl=url}})}
  function cropCover(ctx,img,w,h){const iw=img.width||img.naturalWidth,ih=img.height||img.naturalHeight,ir=iw/ih,cr=w/h;let sx=0,sy=0,sw=iw,sh=ih;if(ir>cr){sw=ih*cr;sx=(iw-sw)/2}else{sh=iw/cr;sy=(ih-sh)/2}ctx.drawImage(img,sx,sy,sw,sh,0,0,w,h)}
  function rounded(ctx,x,y,w,h,r){r=Math.min(r,w/2,h/2);ctx.beginPath();ctx.moveTo(x+r,y);ctx.arcTo(x+w,y,x+w,y+h,r);ctx.arcTo(x+w,y+h,x,y+h,r);ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+w,y,r);ctx.closePath()}
  function drawMiniRoute(ctx,pts,x,y,w,h){if(!pts||pts.length<2)return;const la=pts.map(p=>p.lat),lo=pts.map(p=>p.lon),a=Math.min(...la),b=Math.max(...la),c=Math.min(...lo),d=Math.max(...lo),dx=Math.max(.000001,d-c),dy=Math.max(.000001,b-a),pad=10,xy=p=>[x+pad+(p.lon-c)/dx*(w-pad*2),y+h-pad-(p.lat-a)/dy*(h-pad*2)];ctx.save();ctx.lineCap='round';ctx.lineJoin='round';ctx.strokeStyle='#fc5200';ctx.lineWidth=5;ctx.beginPath();pts.forEach((p,i)=>{const[q,r]=xy(p);i?ctx.lineTo(q,r):ctx.moveTo(q,r)});ctx.stroke();ctx.restore()}
  function generateArt(){if(!selectedPhoto){toast('Escolha uma foto primeiro.');return}const canvas=$('#artCanvas'),ctx=canvas.getContext('2d'),size=selectedFormat==='feed'?[1080,1350]:selectedFormat==='square'?[1080,1080]:[1080,1920],[w,h]=size;canvas.width=w;canvas.height=h;cropCover(ctx,selectedPhoto,w,h);const overlay=ctx.createLinearGradient(0,0,0,h);overlay.addColorStop(0,'rgba(0,0,0,.12)');overlay.addColorStop(.55,'rgba(0,0,0,.10)');overlay.addColorStop(.76,'rgba(0,0,0,.72)');overlay.addColorStop(1,'rgba(0,0,0,.96)');ctx.fillStyle=overlay;ctx.fillRect(0,0,w,h);ctx.fillStyle='#fc5200';ctx.fillRect(0,0,w,14);const s=state.summary||{name:state.name,distanceM:state.distanceM,elapsed:elapsedSeconds(),elevationGain:state.elevationGain,avg:avgKmh(),date:Date.now()},py=h-Math.min(520,h*.40);ctx.fillStyle='rgba(8,8,8,.72)';ctx.fillRect(0,py,w,h-py);ctx.textAlign='left';ctx.fillStyle='#fc5200';ctx.font='900 22px Arial';ctx.fillText('TRILHA CONCLUÍDA',52,py+58);ctx.fillStyle='#fff';ctx.font='900 58px Arial';let nm=(s.name||'MINHA TRILHA').toUpperCase();if(nm.length>24)nm=nm.slice(0,24)+'…';ctx.fillText(nm,52,py+126);ctx.fillStyle='#fff';ctx.font='900 138px Arial';const km=fmtKm(s.distanceM||0);ctx.fillText(km,48,py+285);const kw=ctx.measureText(km).width;ctx.fillStyle='#fc5200';ctx.font='900 34px Arial';ctx.fillText('KM',65+kw,py+285);const boxY=py+330,gap=14,bw=(w-104-gap*2)/3,stats=[['TEMPO',formatTime(s.elapsed||0)],['MÉDIA',`${(s.avg||0).toFixed(1).replace('.',',')} km/h`],['ELEVAÇÃO',`+${Math.round(s.elevationGain||0)} m`]];stats.forEach((it,i)=>{const x=52+i*(bw+gap);ctx.fillStyle='rgba(255,255,255,.09)';rounded(ctx,x,boxY,bw,92,18);ctx.fill();ctx.fillStyle='#aaa';ctx.font='800 15px Arial';ctx.fillText(it[0],x+16,boxY+30);ctx.fillStyle='#fff';ctx.font='900 27px Arial';ctx.fillText(it[1],x+16,boxY+66)});rounded(ctx,w-332,py+42,280,118,18);ctx.fillStyle='rgba(255,255,255,.07)';ctx.fill();drawMiniRoute(ctx,state.points,w-322,py+52,260,98);ctx.fillStyle='#bbb';ctx.font='700 16px Arial';ctx.fillText(`${getProfileName()||'Trilheiro(a)'} • ${new Date(s.date||Date.now()).toLocaleDateString('pt-BR')}`,52,h-40);showView('art')}
  async function canvasBlob(){return new Promise(res=>$('#artCanvas').toBlob(res,'image/jpeg',.94))}
  function downloadBlob(blob){const a=document.createElement('a'),url=URL.createObjectURL(blob);a.href=url;a.download='trilha-concluida.jpg';a.click();setTimeout(()=>URL.revokeObjectURL(url),2500)}

  function bind(){
    $('#startBtn')?.addEventListener('click',startTrail);$('#pauseBtn')?.addEventListener('click',togglePause);$('#finishBtn')?.addEventListener('click',finishTrail);$('#newTrailBtn')?.addEventListener('click',()=>{selectedPhoto=null;$('#photoInput').value='';$('#photoPreview')?.classList.add('hidden');$('#generateBtn').disabled=true;showView('home')});
    $$('.format-btn').forEach(btn=>btn.addEventListener('click',()=>{$$('.format-btn').forEach(b=>b.classList.remove('active'));btn.classList.add('active');selectedFormat=btn.dataset.format||'story'}));
    $('#photoInput')?.addEventListener('change',async e=>{const file=e.target.files?.[0];if(!file)return;try{selectedPhoto=await loadImageFile(file);const url=selectedPhotoUrl||URL.createObjectURL(file);if(!selectedPhotoUrl)selectedPhotoUrl=url;const preview=$('#photoPreview');if(preview){preview.src=url;preview.classList.remove('hidden')}$('#generateBtn').disabled=false;toast('Foto pronta para gerar a arte.')}catch{toast('Não consegui abrir essa foto. Tente JPG, PNG ou WebP.')}});$('#generateBtn')?.addEventListener('click',generateArt);$('#backSummaryBtn')?.addEventListener('click',()=>showView('summary'));$('#downloadBtn')?.addEventListener('click',async()=>downloadBlob(await canvasBlob()));$('#shareBtn')?.addEventListener('click',async()=>{const blob=await canvasBlob(),file=new File([blob],'trilha-concluida.jpg',{type:'image/jpeg'});if(navigator.canShare?.({files:[file]})){try{await navigator.share({files:[file],title:'Trilha concluída'});return}catch(e){if(e.name==='AbortError')return}}downloadBlob(blob)});
    addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferredInstall=e});$('#installBtn')?.addEventListener('click',async()=>{if(deferredInstall){deferredInstall.prompt();await deferredInstall.userChoice;deferredInstall=null}else alert('No Android: abra no Chrome, toque em ⋮ e escolha “Instalar app” ou “Adicionar à tela inicial”.')})
  }

  function resumeIfNeeded(){if(!state.active)return;$('#trackingTrailName').textContent=state.name||'Minha Trilha';showView('track');drawTrack();startClock();requestWake();startGps()}
  function runSelfTests(){const one={lat:0,lon:0,acc:5},two={lat:0,lon:0.00008983,acc:5};const distance=hav(one,two),dead=movementDeadband(one,two),ok=distance>9&&distance<11&&dead>=3&&dead<=7;window.__TRILHEIROS_TESTS__={version:VERSION,geometry:ok,distance10m:distance,deadband:dead}}
  function boot(){ensureProfile();renderHistory();updateNetwork();bind();runSelfTests();if('serviceWorker'in navigator)navigator.serviceWorker.register('sw.js?v=26').catch(()=>{});resumeIfNeeded();window.__TRILHEIROS_V26__={version:VERSION,hav,movementDeadband}}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot()
})();
