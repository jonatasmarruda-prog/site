(() => {
  'use strict';
  const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
  const Engine=window.TrilheirosGpsV26;
  if(!Engine){console.error('GPS engine V26 não carregou');return;}

  let tracker=new Engine.Tracker({maxAccuracy:45,maxKmh:22});
  let gpsWatchV26=null;
  let lastAcceptedAltitude=null;
  let selectedPhoto=null;

  function stopAllGps(){
    try{if(gpsWatchV26!==null){navigator.geolocation.clearWatch(gpsWatchV26);gpsWatchV26=null;}}catch(_){}
    try{if(typeof watchId!=='undefined'&&watchId!==null){navigator.geolocation.clearWatch(watchId);watchId=null;}}catch(_){}
  }

  function setBadge(acc){
    const b=$('#gpsBadge');if(!b)return;
    if(acc<=10){b.className='badge gps-good';b.textContent='GPS EXCELENTE';}
    else if(acc<=20){b.className='badge gps-good';b.textContent='GPS BOM';}
    else if(acc<=35){b.className='badge gps-search';b.textContent='GPS OK';}
    else{b.className='badge gps-search';b.textContent='GPS FRACO';}
  }
  function setLive(text,mode=''){
    const el=$('.live-dot');if(!el)return;
    el.classList.remove('stationary','protected');if(mode)el.classList.add(mode);
    el.innerHTML='<i></i> '+text;
  }
  function setSpeed(kmh){const el=$('#speedValue');if(el)el.textContent=`${(Number(kmh)||0).toFixed(1).replace('.',',')} km/h`;}
  function renderV26(){
    state.elapsed=elapsedSeconds();
    const d=$('#distanceValue'),u=document.querySelector('.distance-number small');
    if(state.distanceM<1000){if(d)d.textContent=String(Math.round(state.distanceM));if(u)u.textContent='M';}
    else{if(d)d.textContent=fmtKm(state.distanceM);if(u)u.textContent='KM';}
    const t=$('#timeValue');if(t)t.textContent=formatTime(state.elapsed);
    const a=$('#avgValue');if(a)a.textContent=`${avgKmh().toFixed(1).replace('.',',')} km/h`;
    const e=$('#elevationValue');if(e)e.textContent=`+${Math.round(state.elevationGain||0)} m`;
    saveActive();
  }

  function pointFromPosition(pos){
    const c=pos.coords;
    return {lat:c.latitude,lon:c.longitude,acc:c.accuracy||999,time:pos.timestamp||Date.now(),speed:Number.isFinite(c.speed)?c.speed:null,alt:Number.isFinite(c.altitude)?c.altitude:null,altAcc:Number.isFinite(c.altitudeAccuracy)?c.altitudeAccuracy:null};
  }

  function handlePosition(pos){
    if(!state.active||state.paused)return;
    const p=pointFromPosition(pos);
    $('#accuracyValue').textContent=`Precisão: ${Math.round(p.acc)} m`;
    setBadge(p.acc);
    const out=tracker.process(p);
    setSpeed(out.speedKmh||0);

    if(out.reason==='weak'){setLive('SINAL FRACO • AGUARDANDO GPS','protected');return;}
    if(out.reason==='spike'){setLive('SALTO DE GPS IGNORADO','protected');return;}
    if(out.reason==='stationary'){setLive('PARADO • DISTÂNCIA NÃO SOMADA','stationary');state.lastAccepted=tracker.lastAccepted||state.lastAccepted;saveActive();return;}
    if(out.reason==='moving-small'){setLive('MOVIMENTO DETECTADO');return;}
    if(out.reason==='initial'){setLive('GPS PRONTO • COMECE A CAMINHAR','stationary');return;}

    if(out.accepted){
      state.distanceM+=(out.distanceDelta||0);
      const accepted=out.point;
      if(accepted.alt!==null&&lastAcceptedAltitude!==null){
        const dAlt=accepted.alt-lastAcceptedAltitude;
        const ok=(accepted.altAcc==null||accepted.altAcc<=25)&&Math.abs(dAlt)<=20;
        if(ok&&dAlt>2.5)state.elevationGain=(state.elevationGain||0)+dAlt;
      }
      if(accepted.alt!==null){lastAcceptedAltitude=accepted.alt;state.maxAltitude=state.maxAltitude===null?accepted.alt:Math.max(state.maxAltitude,accepted.alt);}
      state.lastAccepted={...accepted};
      state.points=Array.isArray(state.points)?state.points:[];
      state.points.push({...accepted});
      if(state.points.length>6000)state.points=state.points.slice(-6000);
      $('#waitingGps')?.classList.add('hidden');
      try{drawTrack();}catch(_){}
      renderV26();
      setLive('REGISTRANDO MOVIMENTO');
    }
  }

  function handleGpsError(err){
    const b=$('#gpsBadge');if(b){b.className='badge gps-search';b.textContent=err.code===1?'PERMISSÃO GPS':'GPS RECONECTANDO';}
    setSpeed(0);setLive('GPS SEM POSIÇÃO','protected');
    if(err.code===1)toast('Permita a localização precisa para registrar a trilha.');
  }

  function startWatch(){
    stopAllGps();
    gpsWatchV26=navigator.geolocation.watchPosition(handlePosition,handleGpsError,{enableHighAccuracy:true,maximumAge:0,timeout:20000});
  }

  function getFix(){
    return new Promise((resolve,reject)=>navigator.geolocation.getCurrentPosition(resolve,reject,{enableHighAccuracy:true,maximumAge:0,timeout:20000}));
  }

  // Remove listeners antigos dos botões críticos e instala um único controlador.
  function freshButton(selector){
    const old=$(selector);if(!old)return null;const n=old.cloneNode(true);old.replaceWith(n);return n;
  }
  const startBtn=freshButton('#startBtn');
  const pauseBtn=freshButton('#pauseBtn');
  const finishBtn=freshButton('#finishBtn');

  if(startBtn)startBtn.addEventListener('click',async()=>{
    if(!navigator.geolocation){toast('Este celular não disponibilizou GPS.');return;}
    const name=$('#trailName')?.value.trim()||'Minha Trilha';
    startBtn.disabled=true;
    const oldText=startBtn.innerHTML;
    startBtn.innerHTML='<span class="start-icon">🛰️</span><span class="btn-copy"><strong>LOCALIZANDO...</strong><small>Fixando seu ponto de partida</small></span>';
    try{
      const fix=await getFix();
      const p=pointFromPosition(fix);
      state=freshState();state.active=true;state.name=name;state.startedAt=Date.now();state.points=[{...p}];state.lastAccepted={...p};
      tracker=new Engine.Tracker({maxAccuracy:45,maxKmh:22});tracker.reset(p);lastAcceptedAltitude=p.alt;
      saveActive();
      $('#trackingTrailName').textContent=name;$('#accuracyValue').textContent=`Precisão: ${Math.round(p.acc)} m`;setBadge(p.acc);
      $('#waitingGps')?.classList.add('hidden');
      showView('track');startClock();await requestWake();startWatch();renderV26();
      setLive('GPS PRONTO • COMECE A CAMINHAR','stationary');
      try{drawTrack();}catch(_){}
    }catch(err){
      const msg=err?.code===1?'Permita a localização precisa para este site.':'Não consegui fixar o GPS. Ative a localização e tente em área aberta.';
      alert(msg);
    }finally{startBtn.disabled=false;startBtn.innerHTML=oldText;}
  });

  if(pauseBtn)pauseBtn.addEventListener('click',()=>{
    if(!state.active)return;
    if(!state.paused){state.paused=true;state.pausedAt=Date.now();pauseBtn.textContent='▶️ CONTINUAR';setSpeed(0);setLive('PAUSADO','stationary');}
    else{state.totalPaused+=Date.now()-state.pausedAt;state.pausedAt=0;state.paused=false;pauseBtn.textContent='⏸️ PAUSAR';tracker.reset(state.lastAccepted||null);startWatch();setLive('REGISTRANDO');}
    saveActive();renderV26();
  });

  if(finishBtn)finishBtn.addEventListener('click',()=>{
    if(!confirm('Finalizar esta trilha?'))return;
    stopAllGps();clearInterval(timerId);try{if(wakeLock){wakeLock.release().catch(()=>{});wakeLock=null;}}catch(_){}
    state.elapsed=elapsedSeconds();state.active=false;state.endedAt=Date.now();
    const item={id:Date.now(),name:state.name,date:state.endedAt,distanceM:state.distanceM,elapsed:state.elapsed,elevationGain:state.elevationGain||0,points:state.points?.length||0,avg:avgKmh()};
    saveHistory(item);clearActive();renderSummary(item);showView('summary');
  });

  // FOTO / FINISHER local e offline.
  const oldInput=$('#photoInput');
  let photoInput=oldInput;
  if(oldInput){photoInput=oldInput.cloneNode(true);oldInput.replaceWith(photoInput);}
  const oldGenerate=$('#generateBtn');
  let generateBtn=oldGenerate;
  if(oldGenerate){generateBtn=oldGenerate.cloneNode(true);oldGenerate.replaceWith(generateBtn);generateBtn.disabled=true;}

  function loadPhoto(file){return new Promise((resolve,reject)=>{const r=new FileReader();r.onerror=reject;r.onload=()=>{const im=new Image();im.onload=()=>resolve(im);im.onerror=reject;im.src=r.result};r.readAsDataURL(file)});}
  if(photoInput)photoInput.addEventListener('change',async e=>{
    const file=e.target.files?.[0];if(!file)return;
    try{selectedPhoto=await loadPhoto(file);photoImage=selectedPhoto;const p=$('#photoPreview');p.src=selectedPhoto.src;p.classList.remove('hidden');generateBtn.disabled=false;toast('Foto pronta para gerar a arte.');}
    catch(_){selectedPhoto=null;generateBtn.disabled=true;toast('Não consegui abrir essa foto. Tente JPG ou PNG.');}
  });

  function cover(ctx,img,w,h){const iw=img.naturalWidth||img.width,ih=img.naturalHeight||img.height,ir=iw/ih,cr=w/h;let sx=0,sy=0,sw=iw,sh=ih;if(ir>cr){sw=ih*cr;sx=(iw-sw)/2}else{sh=iw/cr;sy=(ih-sh)/2}ctx.drawImage(img,sx,sy,sw,sh,0,0,w,h);}
  function rr(ctx,x,y,w,h,r){ctx.beginPath();ctx.moveTo(x+r,y);ctx.arcTo(x+w,y,x+w,y+h,r);ctx.arcTo(x+w,y+h,x,y+h,r);ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+w,y,r);ctx.closePath();}
  function miniRoute(ctx,pts,x,y,w,h){if(!pts||pts.length<2)return;const la=pts.map(p=>p.lat),lo=pts.map(p=>p.lon),a=Math.min(...la),b=Math.max(...la),c=Math.min(...lo),d=Math.max(...lo),dx=Math.max(.000001,d-c),dy=Math.max(.000001,b-a),pad=10,xy=p=>[x+pad+(p.lon-c)/dx*(w-pad*2),y+h-pad-(p.lat-a)/dy*(h-pad*2)];ctx.save();ctx.lineCap='round';ctx.lineJoin='round';ctx.strokeStyle='#f1c66f';ctx.lineWidth=5;ctx.beginPath();pts.forEach((p,i)=>{const[q,r]=xy(p);i?ctx.lineTo(q,r):ctx.moveTo(q,r)});ctx.stroke();ctx.restore();}

  if(generateBtn)generateBtn.addEventListener('click',()=>{
    if(!selectedPhoto){toast('Escolha uma foto primeiro.');return;}
    try{
      const fmt=document.querySelector('.format-btn.active')?.dataset.format||'story';const [w,h]=fmt==='feed'?[1080,1350]:fmt==='square'?[1080,1080]:[1080,1920];
      const canvas=$('#artCanvas'),ctx=canvas.getContext('2d');canvas.width=w;canvas.height=h;cover(ctx,selectedPhoto,w,h);
      const shade=ctx.createLinearGradient(0,0,0,h);shade.addColorStop(0,'rgba(3,18,14,.08)');shade.addColorStop(.55,'rgba(3,18,14,.15)');shade.addColorStop(1,'rgba(3,18,14,.95)');ctx.fillStyle=shade;ctx.fillRect(0,0,w,h);
      ctx.fillStyle='#f1c66f';ctx.fillRect(0,0,w,14);
      const s=state.summary||{name:state.name,distanceM:state.distanceM,elapsed:elapsedSeconds(),elevationGain:state.elevationGain||0,avg:avgKmh(),date:Date.now()};
      const ph=Math.min(520,h*.38),py=h-ph;ctx.fillStyle='rgba(3,22,17,.88)';ctx.fillRect(0,py,w,ph);
      ctx.textAlign='left';ctx.fillStyle='#f1c66f';ctx.font='900 22px Arial';ctx.fillText('TRILHA CONCLUÍDA',52,py+56);
      ctx.fillStyle='#fff9e8';ctx.font='900 54px Arial';let nm=(s.name||'MINHA TRILHA').toUpperCase();if(nm.length>25)nm=nm.slice(0,25)+'…';ctx.fillText(nm,52,py+118);
      ctx.fillStyle='#f1c66f';ctx.font='900 136px Arial';const km=fmtKm(s.distanceM||0);ctx.fillText(km,48,py+265);const mw=ctx.measureText(km).width;ctx.font='900 32px Arial';ctx.fillText('KM',62+mw,py+265);
      const rx=w-332,ry=py+142;ctx.fillStyle='rgba(255,255,255,.06)';rr(ctx,rx,ry,280,118,20);ctx.fill();miniRoute(ctx,state.points,rx+8,ry+8,264,102);
      const stats=[['TEMPO',formatTime(s.elapsed||0)],['ELEVAÇÃO','+'+Math.round(s.elevationGain||0)+' m'],['MÉDIA',`${(s.avg||0).toFixed(1).replace('.',',')} km/h`]];const sy=py+325,g=12,bw=(w-104-g*2)/3;
      stats.forEach((it,i)=>{const x=52+i*(bw+g);ctx.fillStyle='rgba(255,255,255,.06)';rr(ctx,x,sy,bw,92,18);ctx.fill();ctx.fillStyle='#91a79f';ctx.font='800 15px Arial';ctx.fillText(it[0],x+16,sy+30);ctx.fillStyle='#fff9e8';ctx.font='900 27px Arial';ctx.fillText(it[1],x+16,sy+68)});
      ctx.fillStyle='#f1c66f';ctx.font='900 19px Arial';ctx.fillText('TRILHEIROS DE RONDONÓPOLIS',52,h-42);showView('art');
    }catch(err){console.error(err);toast('Falha ao gerar a arte. Tente outra foto.');}
  });

  // Recupera atividade em andamento usando somente o motor V26.
  setTimeout(()=>{
    try{
      stopAllGps();
      if(state.active){tracker.reset(state.lastAccepted||null);lastAcceptedAltitude=state.lastAccepted?.alt??null;$('#trackingTrailName').textContent=state.name||'Minha Trilha';showView('track');startClock();startWatch();renderV26();}
    }catch(err){console.error(err);}
  },300);

  try{navigator.storage?.persist?.();}catch(_){}
})();
