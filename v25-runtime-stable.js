(() => {
  'use strict';

  const $ = s => document.querySelector(s);
  const $$ = s => [...document.querySelectorAll(s)];

  // =========================================================
  // V25 — GPS DE CAMINHADA: VELOCIDADE SUAVIZADA + ANTI-SPIKE
  // =========================================================
  let candidate = null;
  let smoothKmh = 0;
  let lastMotionAt = 0;
  let movingUntil = 0;

  function liveEl(){ return $('.live-dot'); }
  function setLive(mode, text){
    const el = liveEl();
    if(!el) return;
    el.classList.remove('stationary','protected');
    if(mode) el.classList.add(mode);
    el.innerHTML = '<i></i> ' + text;
  }

  function paintSpeed(kmh, hard=false){
    const el = $('#speedValue');
    if(!el) return;
    let v = Number.isFinite(kmh) ? Math.max(0, kmh) : 0;
    if(v > 14.5) v = 0; // pico incompatível com caminhada/trilha normal
    if(hard) smoothKmh = v;
    else smoothKmh = smoothKmh <= 0 ? v : (smoothKmh * 0.62 + v * 0.38);
    if(smoothKmh < 0.25) smoothKmh = 0;
    el.textContent = `${smoothKmh.toFixed(1).replace('.',',')} km/h`;
  }

  function minMovement(a,b){
    const noise = ((a.acc || 8) + (b.acc || 8));
    const moving = Date.now() < movingUntil;
    return moving
      ? Math.max(2.8, Math.min(7, noise * 0.18))
      : Math.max(4.5, Math.min(12, noise * 0.28));
  }

  function plausibleRawKmh(coords){
    if(!Number.isFinite(coords.speed)) return null;
    const kmh = Math.max(0, coords.speed * 3.6);
    return kmh <= 14.5 ? kmh : null;
  }

  function updateBadge(acc){
    const badge = $('#gpsBadge');
    if(!badge) return;
    if(acc <= 10){ badge.className='badge gps-good'; badge.textContent='GPS EXCELENTE'; }
    else if(acc <= 18){ badge.className='badge gps-good'; badge.textContent='GPS BOM'; }
    else if(acc <= 30){ badge.className='badge gps-search'; badge.textContent='GPS PROTEGIDO'; }
    else { badge.className='badge gps-search'; badge.textContent='GPS FRACO'; }
  }

  // Mantém velocidade visual estável entre leituras do GNSS e zera quando realmente parou.
  setInterval(() => {
    if(!state?.active || state?.paused) return;
    const idle = Date.now() - lastMotionAt;
    if(lastMotionAt && idle > 4200 && idle <= 7500){
      smoothKmh *= 0.72;
      paintSpeed(smoothKmh, true);
    } else if(!lastMotionAt || idle > 7500){
      paintSpeed(0, true);
    }
  }, 1400);

  renderTracking = function(){
    state.elapsed = elapsedSeconds();
    const d = $('#distanceValue');
    const unit = document.querySelector('.distance-number small');
    if(state.distanceM < 1000){
      if(d) d.textContent = String(Math.max(0, Math.round(state.distanceM)));
      if(unit) unit.textContent = 'M';
    }else{
      if(d) d.textContent = fmtKm(state.distanceM);
      if(unit) unit.textContent = 'KM';
    }
    const t=$('#timeValue'); if(t)t.textContent=formatTime(state.elapsed);
    const a=$('#avgValue'); if(a)a.textContent=`${avgKmh().toFixed(1).replace('.',',')} km/h`;
    const e=$('#elevationValue'); if(e)e.textContent=`+${Math.round(state.elevationGain)} m`;
    saveActive();
  };

  onPosition = function(pos){
    const c = pos.coords;
    const p = {
      lat:c.latitude,
      lon:c.longitude,
      alt:Number.isFinite(c.altitude) ? c.altitude : null,
      altAcc:Number.isFinite(c.altitudeAccuracy) ? c.altitudeAccuracy : null,
      acc:c.accuracy || 999,
      time:pos.timestamp || Date.now()
    };

    const acc = $('#accuracyValue');
    if(acc) acc.textContent = `Precisão: ${Math.round(p.acc)} m`;
    updateBadge(p.acc);
    if(state.paused) return;

    const rawKmh = plausibleRawKmh(c);

    // Sinal ruim: não soma. Mantém a última velocidade por alguns segundos para não piscar.
    if(p.acc > 30){
      candidate = null;
      if(Date.now()-lastMotionAt > 4500) paintSpeed(0,true);
      setLive('protected','SINAL FRACO • DISTÂNCIA CONGELADA');
      return;
    }

    if(!state.lastAccepted){
      state.lastAccepted = p;
      state.startPoint = p;
      state.points = [p];
      saveActive();
      paintSpeed(0,true);
      setLive('stationary','PONTO INICIAL FIXADO');
      return;
    }

    const anchor = state.lastAccepted;
    const seg = hav(anchor,p);
    const dt = Math.max(0.8,(p.time-anchor.time)/1000);
    const calcKmh = (seg/dt) * 3.6;
    const threshold = minMovement(anchor,p);

    // Salto impossível: não altera distância e não mostra velocidade falsa.
    if(seg > 90 || calcKmh > 16 || (Number.isFinite(c.speed) && c.speed*3.6 > 22)){
      candidate = null;
      if(Date.now()-lastMotionAt > 4500) paintSpeed(0,true);
      setLive('protected','SALTO DE GPS IGNORADO');
      return;
    }

    // Pequena distância entre atualizações. Durante caminhada, velocidade do GNSS pode ser útil.
    if(seg < threshold){
      if(rawKmh !== null && rawKmh >= 0.8){
        lastMotionAt = Date.now();
        movingUntil = Date.now()+5500;
        paintSpeed(rawKmh);
        setLive('', 'MOVIMENTO DETECTADO');
      }else if(Date.now()-lastMotionAt > 6000){
        paintSpeed(0,true);
        setLive('stationary','PARADO • DISTÂNCIA NÃO SOMADA');
      }
      return;
    }

    // Primeira leitura fora da bolha: guarda e confirma na próxima para evitar drift.
    if(!candidate){
      candidate = p;
      const provisional = rawKmh !== null && rawKmh >= 0.8 ? rawKmh : Math.min(calcKmh,14.5);
      if(provisional >= 0.8){
        lastMotionAt = Date.now();
        paintSpeed(provisional);
      }
      setLive('stationary','CONFIRMANDO MOVIMENTO...');
      return;
    }

    const d1 = hav(anchor,candidate);
    const d2 = hav(anchor,p);
    const dc = hav(candidate,p);
    const progressive = d2 >= threshold && d2 >= d1 - 1.2 && dc >= 1.3;

    if(!progressive){
      candidate = p;
      if(rawKmh !== null && rawKmh >= 0.8){
        lastMotionAt = Date.now();
        paintSpeed(rawKmh);
      }
      setLive('stationary','CONFIRMANDO MOVIMENTO...');
      return;
    }

    const accepted = p;
    const acceptedDistance = hav(anchor,accepted);
    const acceptedDt = Math.max(0.8,(accepted.time-anchor.time)/1000);
    const acceptedKmh = acceptedDistance/acceptedDt*3.6;

    if(acceptedDistance > 90 || acceptedKmh > 14.5){
      candidate = null;
      setLive('protected','MOVIMENTO INCERTO • AGUARDANDO GPS');
      return;
    }

    state.distanceM += acceptedDistance;

    if(accepted.alt !== null && anchor.alt !== null){
      const dAlt = accepted.alt - anchor.alt;
      const altOk = (accepted.altAcc == null || accepted.altAcc <= 18) && Math.abs(dAlt) <= 15;
      if(altOk && dAlt > 2.5) state.elevationGain += dAlt;
    }
    if(accepted.alt !== null){
      state.maxAltitude = state.maxAltitude===null ? accepted.alt : Math.max(state.maxAltitude,accepted.alt);
    }

    state.points.push(accepted);
    state.lastAccepted = accepted;
    candidate = null;
    lastMotionAt = Date.now();
    movingUntil = Date.now()+6500;
    saveActive();
    $('#waitingGps')?.classList.add('hidden');

    // Combina velocidade calculada com a fornecida pelo GNSS quando ambas são plausíveis.
    let liveKmh = acceptedKmh;
    if(rawKmh !== null && rawKmh >= 0.8) liveKmh = acceptedKmh*0.58 + rawKmh*0.42;
    paintSpeed(liveKmh);

    try{ drawTrack(); }catch(_){}
    try{ updateTerrain(); }catch(_){}
    renderTracking();
    setLive('', 'MOVIMENTO CONFIRMADO');
  };

  onGpsError = function(err){
    const b=$('#gpsBadge');
    if(b){ b.className='badge gps-search'; b.textContent=err.code===1?'PERMISSÃO GPS':'GPS RECONECTANDO'; }
    if(Date.now()-lastMotionAt > 4500) paintSpeed(0,true);
    setLive('protected','GPS SEM POSIÇÃO • DISTÂNCIA CONGELADA');
    if(err.code===1) toast('Permita a localização precisa para continuar registrando.');
  };

  // Se uma trilha foi retomada do armazenamento, reinicia o watch para garantir o callback V25.
  setTimeout(() => {
    try{
      if(state.active && !state.paused){
        if(watchId !== null){ navigator.geolocation.clearWatch(watchId); watchId=null; }
        startGps();
      }
    }catch(_){}
  }, 250);

  // =========================================================
  // FOTO + ARTE: 100% LOCAL / OFFLINE
  // =========================================================
  let selectedPhotoV25 = null;
  let previewUrlV25 = null;

  function rounded(ctx,x,y,w,h,r){
    r=Math.min(r,w/2,h/2);
    ctx.beginPath();
    ctx.moveTo(x+r,y);
    ctx.arcTo(x+w,y,x+w,y+h,r);
    ctx.arcTo(x+w,y+h,x,y+h,r);
    ctx.arcTo(x,y+h,x,y,r);
    ctx.arcTo(x,y,x+w,y,r);
    ctx.closePath();
  }

  function cover(ctx,img,w,h){
    const iw=img.naturalWidth||img.width, ih=img.naturalHeight||img.height;
    const ir=iw/ih, cr=w/h;
    let sx=0,sy=0,sw=iw,sh=ih;
    if(ir>cr){ sw=ih*cr; sx=(iw-sw)/2; }
    else{ sh=iw/cr; sy=(ih-sh)/2; }
    ctx.drawImage(img,sx,sy,sw,sh,0,0,w,h);
  }

  function drawMiniRoute(ctx, pts, x, y, w, h){
    if(!pts || pts.length<2) return;
    const lats=pts.map(p=>p.lat), lons=pts.map(p=>p.lon);
    const minLat=Math.min(...lats),maxLat=Math.max(...lats),minLon=Math.min(...lons),maxLon=Math.max(...lons);
    const dx=Math.max(.000001,maxLon-minLon),dy=Math.max(.000001,maxLat-minLat),pad=12;
    const xy=p=>[x+pad+(p.lon-minLon)/dx*(w-pad*2),y+h-pad-(p.lat-minLat)/dy*(h-pad*2)];
    ctx.save();
    ctx.lineCap='round';ctx.lineJoin='round';ctx.strokeStyle='#f1c66f';ctx.lineWidth=5;ctx.shadowColor='rgba(241,198,111,.3)';ctx.shadowBlur=8;
    ctx.beginPath();pts.forEach((p,i)=>{const [px,py]=xy(p);i?ctx.lineTo(px,py):ctx.moveTo(px,py)});ctx.stroke();ctx.shadowBlur=0;
    ctx.restore();
  }

  function loadLocalImage(file){
    return new Promise((resolve,reject)=>{
      const reader=new FileReader();
      reader.onerror=()=>reject(new Error('Falha ao ler a foto'));
      reader.onload=()=>{
        const img=new Image();
        img.onload=()=>resolve({img,url:reader.result});
        img.onerror=()=>reject(new Error('Formato de foto não suportado'));
        img.src=reader.result;
      };
      reader.readAsDataURL(file);
    });
  }

  const oldInput=$('#photoInput');
  let photoInput=oldInput;
  if(oldInput){
    const fresh=oldInput.cloneNode(true);
    oldInput.replaceWith(fresh);
    photoInput=fresh;
    photoInput.accept='image/jpeg,image/png,image/webp,image/*';
  }

  const oldGenerate=$('#generateBtn');
  let generateBtn=oldGenerate;
  if(oldGenerate){
    const fresh=oldGenerate.cloneNode(true);
    oldGenerate.replaceWith(fresh);
    generateBtn=fresh;
    generateBtn.disabled=true;
  }

  if(photoInput){
    photoInput.addEventListener('change',async e=>{
      const file=e.target.files?.[0];
      if(!file) return;
      if(!file.type.startsWith('image/')){ toast('Escolha uma foto JPG, PNG ou WebP.'); return; }
      const label=document.querySelector('label[for="photoInput"]');
      const oldLabel=label?.textContent;
      if(label) label.textContent='CARREGANDO FOTO...';
      try{
        const loaded=await loadLocalImage(file);
        selectedPhotoV25=loaded.img;
        photoImage=loaded.img; // mantém compatibilidade com o restante do app
        if(previewUrlV25 && previewUrlV25.startsWith('blob:')) URL.revokeObjectURL(previewUrlV25);
        previewUrlV25=loaded.url;
        const preview=$('#photoPreview');
        if(preview){ preview.src=loaded.url; preview.classList.remove('hidden'); }
        if(generateBtn){ generateBtn.disabled=false; generateBtn.textContent='✨ GERAR ARTE PREMIUM'; }
        toast('Foto pronta. Agora gere sua arte.');
      }catch(err){
        console.error(err);
        selectedPhotoV25=null;
        if(generateBtn) generateBtn.disabled=true;
        toast('Não consegui abrir essa foto. Tente JPG, PNG ou WebP.');
      }finally{
        if(label) label.textContent=oldLabel||'ESCOLHER FOTO';
      }
    });
  }

  if(generateBtn){
    generateBtn.addEventListener('click',e=>{
      e.preventDefault();e.stopImmediatePropagation();
      if(!selectedPhotoV25){ toast('Escolha uma foto primeiro.'); return; }
      const oldText=generateBtn.textContent;
      generateBtn.disabled=true;
      generateBtn.textContent='✨ GERANDO ARTE...';
      try{
        const format=document.querySelector('.format-btn.active')?.dataset.format || 'story';
        const size=format==='feed'?[1080,1350]:format==='square'?[1080,1080]:[1080,1920];
        const [w,h]=size;
        const canvas=$('#artCanvas');
        const ctx=canvas.getContext('2d');
        canvas.width=w;canvas.height=h;
        cover(ctx,selectedPhotoV25,w,h);

        const shade=ctx.createLinearGradient(0,0,0,h);
        shade.addColorStop(0,'rgba(2,14,11,.16)');
        shade.addColorStop(.50,'rgba(2,14,11,.08)');
        shade.addColorStop(.70,'rgba(2,20,16,.60)');
        shade.addColorStop(1,'rgba(2,12,10,.98)');
        ctx.fillStyle=shade;ctx.fillRect(0,0,w,h);

        const gold=ctx.createLinearGradient(0,0,w,0);
        gold.addColorStop(0,'#ffe4a0');gold.addColorStop(.5,'#f1c66f');gold.addColorStop(1,'#b8782d');
        ctx.fillStyle=gold;ctx.fillRect(0,0,w,12);

        ctx.textAlign='left';
        ctx.fillStyle='#fff8e8';ctx.font='900 25px Arial';ctx.fillText('TRILHEIROS DE RONDONÓPOLIS',52,68);
        ctx.fillStyle='#f1c66f';ctx.font='900 18px Arial';ctx.fillText('FINISHER OFICIAL',52,103);

        const s=state.summary || {name:state.name,distanceM:state.distanceM,elapsed:elapsedSeconds(),elevationGain:state.elevationGain,avg:avgKmh(),date:Date.now()};
        const ph=Math.min(560,h*.40), py=h-ph;
        const panel=ctx.createLinearGradient(0,py,0,h);
        panel.addColorStop(0,'rgba(4,28,23,.30)');panel.addColorStop(.13,'rgba(4,28,23,.88)');panel.addColorStop(1,'rgba(2,13,11,.995)');
        ctx.fillStyle=panel;ctx.fillRect(0,py,w,ph);

        ctx.fillStyle='#f1c66f';ctx.font='900 22px Arial';ctx.fillText('TRILHA CONCLUÍDA',52,py+58);
        ctx.fillStyle='#fff8e8';ctx.font='900 54px Arial';
        let name=(s.name||'MINHA TRILHA').toUpperCase();if(name.length>27)name=name.slice(0,27)+'…';
        ctx.fillText(name,52,py+120);

        const km=fmtKm(s.distanceM||0);
        ctx.fillStyle='#f1c66f';ctx.font='900 140px Arial';ctx.fillText(km,48,py+274);
        const kmw=ctx.measureText(km).width;ctx.font='900 32px Arial';ctx.fillText('KM',62+kmw,py+274);

        const routeW=285,routeH=120,routeX=w-routeW-52,routeY=py+150;
        ctx.fillStyle='rgba(255,255,255,.055)';rounded(ctx,routeX,routeY,routeW,routeH,22);ctx.fill();
        drawMiniRoute(ctx,state.points,routeX+8,routeY+8,routeW-16,routeH-16);

        const sy=py+330,gap=13,bw=(w-104-gap*2)/3;
        const stats=[
          ['TEMPO',formatTime(s.elapsed||0)],
          ['ELEVAÇÃO','+'+Math.round(s.elevationGain||0)+' m'],
          ['MÉDIA',((s.avg??avgKmh()).toFixed(1).replace('.',','))+' km/h']
        ];
        stats.forEach((it,i)=>{
          const x=52+i*(bw+gap);
          ctx.fillStyle='rgba(255,255,255,.055)';rounded(ctx,x,sy,bw,94,18);ctx.fill();
          ctx.fillStyle='#8fa59d';ctx.font='800 15px Arial';ctx.fillText(it[0],x+16,sy+31);
          ctx.fillStyle='#fff8e8';ctx.font='900 27px Arial';ctx.fillText(it[1],x+16,sy+69);
        });

        const person=(localStorage.getItem('trilheiros_profile_name')||'').trim();
        ctx.fillStyle='#81958d';ctx.font='700 16px Arial';
        const footer=(person?person+' • ':'')+new Date(s.date||Date.now()).toLocaleDateString('pt-BR')+' • A aventura te chama.';
        ctx.fillText(footer,52,h-42);

        showView('art');
      }catch(err){
        console.error(err);
        toast('Erro ao gerar a arte. A foto continua selecionada; tente novamente.');
      }finally{
        generateBtn.disabled=false;
        generateBtn.textContent=oldText;
      }
    },true);
  }

  // Aviso discreto de modo offline funcional.
  window.addEventListener('offline',()=>{
    try{ toast('Modo offline ativo: GPS, histórico e arte continuam funcionando.'); }catch(_){}
  });
})();
