(() => {
  const $ = s => document.querySelector(s);
  const $$ = s => [...document.querySelectorAll(s)];
  const LOGO = window.TRILHEIROS_LOGO_DATA || '';

  // ---------- IDENTIDADE / LOGO ----------
  if (LOGO) {
    $$('img').forEach(img => {
      const alt = (img.alt || '').toLowerCase();
      if (img.classList.contains('hero-logo') || img.classList.contains('brand-logo-mini') || img.closest('.tracking-logo') || img.closest('footer') || alt.includes('trilheiro') || alt === 'logo') {
        img.src = LOGO;
      }
    });
    try { logoImg.src = LOGO; } catch (_) {}
  }

  const hero = $('.hero-card');
  const heroTitle = $('.hero-title');
  if (hero && heroTitle && !$('.welcome-premium')) {
    const welcome = document.createElement('div');
    welcome.className = 'welcome-premium';
    welcome.innerHTML = '<span class="welcome-hand">👋</span><div><strong>Bem-vindo(a), Trilheiro(a)!</strong><small>Sua próxima conquista começa aqui.</small></div>';
    hero.insertBefore(welcome, heroTitle);
  }

  const style = document.createElement('style');
  style.textContent = `
    .hero-logo-wrap{animation:logoEntrance .8s cubic-bezier(.2,.8,.2,1) both}
    .hero-logo{animation:logoFloat 4s ease-in-out infinite;filter:drop-shadow(0 16px 28px rgba(0,0,0,.5)) drop-shadow(0 0 18px rgba(241,198,111,.12))!important}
    .hero-ring{animation:ringPulse 3s ease-in-out infinite}
    .hero-logo-wrap:after{content:"";position:absolute;inset:-8px;border-radius:50%;background:conic-gradient(from 0deg,transparent 0 58%,rgba(241,198,111,.5) 66%,transparent 75%);mask:radial-gradient(circle,transparent 63%,#000 65%);-webkit-mask:radial-gradient(circle,transparent 63%,#000 65%);animation:ringSpin 7s linear infinite;pointer-events:none}
    @keyframes logoEntrance{from{opacity:0;transform:translateY(-12px) scale(.82)}to{opacity:1;transform:none}}
    @keyframes logoFloat{50%{transform:translateY(-5px) scale(1.018)}}
    @keyframes ringPulse{50%{box-shadow:0 0 0 9px rgba(241,198,111,.03),0 0 55px rgba(241,198,111,.22)}}
    @keyframes ringSpin{to{transform:rotate(360deg)}}
    .welcome-premium{position:relative;z-index:2;display:flex;align-items:center;justify-content:center;gap:10px;margin:7px auto 9px;text-align:left;animation:welcomeIn .65s .22s both}
    .welcome-premium strong{display:block;color:#fff8e8;font-size:15px;letter-spacing:-.01em}
    .welcome-premium small{display:block;color:#91a79f;font-size:9px;margin-top:3px;font-weight:700}
    .welcome-hand{font-size:25px;transform-origin:70% 70%;animation:wave 2.4s 1s ease-in-out 2}
    @keyframes welcomeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
    @keyframes wave{0%,60%,100%{transform:rotate(0)}10%{transform:rotate(16deg)}20%{transform:rotate(-10deg)}30%{transform:rotate(14deg)}40%{transform:rotate(-7deg)}50%{transform:rotate(8deg)}}
    .map-mode-bar{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:10px 13px;border-top:1px solid rgba(255,255,255,.05);background:rgba(0,0,0,.12)}
    .map-mode-copy{display:flex;flex-direction:column}.map-mode-copy strong{font-size:11px}.map-mode-copy small{font-size:8px;color:#849991;margin-top:2px}
    .map-toggle{display:flex;padding:3px;border-radius:12px;background:#03110f;border:1px solid rgba(255,255,255,.07)}
    .map-toggle button{border:0;border-radius:9px;background:transparent;color:#738980;font-size:8px;font-weight:950;padding:8px 10px;letter-spacing:.06em}
    .map-toggle button.active{background:linear-gradient(135deg,#f7db91,#d39b47);color:#10231d}
    #terrainMap{height:310px;width:100%;display:none;background:#0a211d;z-index:1}
    #terrainMap.show{display:block}
    #trackCanvas.map-hidden{display:none}
    .leaflet-container{font-family:inherit;background:#0a211d}.leaflet-control-attribution{font-size:7px!important}
    .gps-calibrated{color:#8ce6b7!important;background:rgba(41,161,109,.15)!important}
    .drift-info{margin-top:7px;text-align:center;color:#768b83;font-size:8px;line-height:1.4}
    .drift-info b{color:#a9bbb4}
    .generate-error{margin-top:8px;text-align:center;color:#ffaaa8;font-size:9px}
  `;
  document.head.appendChild(style);

  // ---------- INSTALAÇÃO ----------
  const installBtn = $('#installBtn');
  let deferredV10 = null;
  addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferredV10 = e; });
  const standalone = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;

  function installHelp() {
    const android = !/iphone|ipad|ipod/i.test(navigator.userAgent);
    alert(android
      ? 'Para instalar: abra este link no Google Chrome, toque em ⋮ e escolha “Instalar app” ou “Adicionar à tela inicial”.'
      : 'No iPhone: abra no Safari, toque em Compartilhar e depois em “Adicionar à Tela de Início”.');
  }

  if (installBtn) {
    installBtn.addEventListener('click', async e => {
      e.preventDefault(); e.stopImmediatePropagation();
      if (standalone()) return;
      if (deferredV10) {
        deferredV10.prompt();
        await deferredV10.userChoice;
        deferredV10 = null;
      } else installHelp();
    }, true);
    if (standalone()) {
      installBtn.classList.add('installed');
      const strong = installBtn.querySelector('strong');
      const span = installBtn.querySelector('span');
      if (strong) strong.textContent = 'TRILHEIROS GPS INSTALADO';
      if (span) span.textContent = 'Você está usando como aplicativo';
    }
  }

  // ---------- MAPA RELEVO GRATUITO ----------
  let terrainMap = null, terrainLine = null, terrainMarker = null, mapMode = navigator.onLine ? 'terrain' : 'offline';
  const trackCard = $('.track-card');
  const trackCanvas = $('#trackCanvas');
  if (trackCard && trackCanvas && !$('#terrainMap')) {
    const bar = document.createElement('div');
    bar.className = 'map-mode-bar';
    bar.innerHTML = '<div class="map-mode-copy"><strong>Mapa da aventura</strong><small>Relevo online • percurso offline</small></div><div class="map-toggle"><button id="terrainBtn">RELEVO</button><button id="offlineBtn">OFFLINE</button></div>';
    trackCanvas.insertAdjacentElement('beforebegin', bar);
    const map = document.createElement('div'); map.id = 'terrainMap'; trackCanvas.insertAdjacentElement('beforebegin', map);
    const info = document.createElement('div'); info.className = 'drift-info'; info.innerHTML = '🛰️ <b>Filtro anti-drift ativo:</b> parado não deve somar distância.'; trackCard.insertAdjacentElement('afterend', info);
    $('#terrainBtn').onclick = () => setMapMode('terrain');
    $('#offlineBtn').onclick = () => setMapMode('offline');
    setMapMode(mapMode);
  }

  function loadLeaflet() {
    if (window.L) return Promise.resolve();
    return new Promise((resolve, reject) => {
      if (!document.querySelector('link[data-leaflet]')) {
        const l = document.createElement('link'); l.rel='stylesheet'; l.href='https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'; l.dataset.leaflet='1'; document.head.appendChild(l);
      }
      const s = document.createElement('script'); s.src='https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'; s.onload=resolve; s.onerror=reject; document.head.appendChild(s);
    });
  }

  async function setMapMode(mode) {
    if (mode === 'terrain' && !navigator.onLine) { toast('Sem internet: usando mapa offline do percurso.'); mode='offline'; }
    mapMode = mode;
    const tb=$('#terrainBtn'), ob=$('#offlineBtn'), md=$('#terrainMap');
    if (tb) tb.classList.toggle('active', mode==='terrain');
    if (ob) ob.classList.toggle('active', mode==='offline');
    if (mode === 'offline') {
      md?.classList.remove('show'); trackCanvas?.classList.remove('map-hidden'); drawTrack(); return;
    }
    try {
      await loadLeaflet();
      md.classList.add('show'); trackCanvas.classList.add('map-hidden');
      if (!terrainMap) {
        terrainMap = L.map('terrainMap',{zoomControl:true,attributionControl:true}).setView([-16.47,-54.64],13);
        L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',{maxZoom:17,attribution:'© OpenStreetMap contributors • OpenTopoMap'}).addTo(terrainMap);
      }
      setTimeout(()=>terrainMap.invalidateSize(),80);
      updateTerrain();
    } catch (_) {
      toast('Mapa de relevo indisponível agora. Usando modo offline.'); setMapMode('offline');
    }
  }

  function updateTerrain() {
    if (!terrainMap || mapMode !== 'terrain' || !state?.points?.length) return;
    const latlngs = state.points.map(p=>[p.lat,p.lon]);
    if (!terrainLine) terrainLine = L.polyline(latlngs,{color:'#f1c66f',weight:5,opacity:.95}).addTo(terrainMap);
    else terrainLine.setLatLngs(latlngs);
    const last = latlngs[latlngs.length-1];
    if (!terrainMarker) terrainMarker = L.circleMarker(last,{radius:7,color:'#fff8e8',weight:3,fillColor:'#2eb97b',fillOpacity:1}).addTo(terrainMap);
    else terrainMarker.setLatLng(last);
    if (latlngs.length === 1) terrainMap.setView(last,16);
    else terrainMap.panTo(last,{animate:true,duration:.35});
  }

  addEventListener('offline',()=>setMapMode('offline'));

  // ---------- GPS: PONTO INICIAL + FILTRO ANTI-DRIFT ----------
  const startBtn = $('#startBtn');
  let starting = false;

  const geo = opts => new Promise((resolve,reject)=>navigator.geolocation.getCurrentPosition(resolve,reject,opts));
  const toPoint = pos => ({
    lat:pos.coords.latitude, lon:pos.coords.longitude,
    alt:Number.isFinite(pos.coords.altitude)?pos.coords.altitude:null,
    altAcc:Number.isFinite(pos.coords.altitudeAccuracy)?pos.coords.altitudeAccuracy:null,
    acc:pos.coords.accuracy||999, time:pos.timestamp||Date.now()
  });

  async function firstFix() {
    if (!isSecureContext || !navigator.geolocation) throw {code:0};
    let p;
    try { p = await geo({enableHighAccuracy:true,maximumAge:0,timeout:18000}); }
    catch (e) { if (e.code===1) throw e; p = await geo({enableHighAccuracy:false,maximumAge:10000,timeout:10000}); }
    return p;
  }

  function gpsMessage(err) {
    if (err?.code===1) return 'Localização bloqueada. No Chrome, permita a localização precisa para este site.';
    if (err?.code===2) return 'O celular ainda não encontrou sua posição. Ative a Localização e tente em uma área aberta.';
    if (err?.code===3) return 'O GPS demorou para responder. Aguarde alguns segundos em área aberta e tente novamente.';
    return 'Não foi possível acessar o GPS. Abra no Google Chrome e confirme que a Localização está ligada.';
  }

  if (startBtn) startBtn.addEventListener('click', async e => {
    e.preventDefault(); e.stopImmediatePropagation();
    if (starting) return;
    starting = true;
    const icon=startBtn.querySelector('.start-icon'), title=startBtn.querySelector('strong'), sub=startBtn.querySelector('small');
    const old=[icon?.textContent,title?.textContent,sub?.textContent];
    if(icon)icon.textContent='🛰️'; if(title)title.textContent='CALIBRANDO GPS...'; if(sub)sub.textContent='Fixando seu ponto de partida'; startBtn.disabled=true;
    try {
      const fix = await firstFix(); const p = toPoint(fix);
      state = freshState();
      state.active=true; state.name=$('#trailName')?.value.trim()||'Minha Trilha'; state.startedAt=Date.now();
      state.lastAccepted=p; state.startPoint=p; state.points=[p]; state.pendingMove=null; state.rejectedDrift=0;
      saveActive();
      $('#trackingTrailName').textContent=state.name;
      $('#accuracyValue').textContent=`Precisão inicial: ${Math.round(p.acc)} m`;
      const badge=$('#gpsBadge'); if(badge){badge.className='badge gps-good gps-calibrated';badge.textContent='GPS CALIBRADO'}
      $('#waitingGps')?.classList.add('hidden');
      drawTrack(); showView('track'); startClock(); await requestWake(); startGps();
      if (navigator.onLine) setMapMode('terrain'); else setMapMode('offline');
      toast('Ponto de partida definido. Boa trilha! 🥾');
    } catch(err) { alert(gpsMessage(err)); }
    finally {
      starting=false; startBtn.disabled=false;
      if(icon)icon.textContent=old[0]||'🥾'; if(title)title.textContent=old[1]||'INICIAR TRILHA'; if(sub)sub.textContent=old[2]||'Primeiro confirmamos o GPS do seu celular';
    }
  }, true);

  function movementThreshold(prev,p) {
    const accuracyNoise = ((prev.acc||25)+(p.acc||25))*0.45;
    return Math.max(7, Math.min(26, accuracyNoise));
  }

  // Substitui o coletor original: só soma deslocamento confirmado.
  onPosition = function(pos) {
    const c=pos.coords, p=toPoint(pos), badge=$('#gpsBadge');
    $('#accuracyValue').textContent=`Precisão: ${Math.round(p.acc)} m`;
    const deviceSpeed=Number.isFinite(c.speed)?Math.max(0,c.speed):null;
    $('#speedValue').textContent=`${((deviceSpeed||0)*3.6).toFixed(1).replace('.',',')} km/h`;
    if (p.acc<=20){badge.className='badge gps-good';badge.textContent='GPS EXCELENTE'}
    else if(p.acc<=35){badge.className='badge gps-good';badge.textContent='GPS BOM'}
    else {badge.className='badge gps-search';badge.textContent='GPS FRACO'}
    if(state.paused || p.acc>40) return;
    if(!state.lastAccepted){state.lastAccepted=p;state.points.push(p);saveActive();return;}

    const prev=state.lastAccepted;
    const seg=hav(prev,p);
    const dt=Math.max(1,(p.time-prev.time)/1000);
    const calcSpeed=seg/dt;
    const threshold=movementThreshold(prev,p);

    // Voltou para dentro da bolha de precisão: era oscilação, não caminhada.
    if(seg < threshold){ state.pendingMove=null; state.rejectedDrift=(state.rejectedDrift||0)+1; return; }
    // O próprio GPS informa que o aparelho está parado/lento e o salto é pequeno.
    if(deviceSpeed!==null && deviceSpeed<0.45 && seg < threshold*1.9){ state.pendingMove=null; state.rejectedDrift=(state.rejectedDrift||0)+1; return; }
    // Salto impossível para caminhada.
    if(calcSpeed>5.5 || seg>250){ state.pendingMove=null; return; }

    let confirmed=false;
    // Quando o GNSS fornece velocidade confiável de caminhada, resposta mais rápida.
    if(deviceSpeed!==null && deviceSpeed>=0.75 && seg>=Math.max(5,threshold*.7)) confirmed=true;
    else if(calcSpeed>=0.85 && seg>=threshold*1.25) confirmed=true;
    else {
      if(!state.pendingMove){ state.pendingMove=p; return; }
      const stillAway=hav(prev,p);
      const progressed=hav(state.pendingMove,p);
      if(stillAway>=threshold && progressed>=3) confirmed=true;
      else { if(stillAway<threshold) state.pendingMove=null; return; }
    }
    if(!confirmed) return;

    const acceptedDistance=hav(prev,p);
    state.distanceM += acceptedDistance;
    if(p.alt!==null && prev.alt!==null){
      const dAlt=p.alt-prev.alt;
      const altOk=(p.altAcc==null || p.altAcc<=25) && Math.abs(dAlt)<=25;
      if(altOk && dAlt>2) state.elevationGain+=dAlt;
    }
    if(p.alt!==null) state.maxAltitude=state.maxAltitude===null?p.alt:Math.max(state.maxAltitude,p.alt);
    state.points.push(p); state.lastAccepted=p; state.pendingMove=null;
    saveActive(); drawTrack(); updateTerrain(); renderTracking();
  };

  onGpsError = function(err) {
    const b=$('#gpsBadge'); if(b){b.className='badge gps-search';b.textContent=err.code===1?'PERMISSÃO GPS':'RECONECTANDO'}
    if(err.code===1) toast('Permita a localização para continuar registrando.');
  };

  // ---------- GERADOR DE ARTE PREMIUM ROBUSTO ----------
  function rounded(ctx,x,y,w,h,r){
    r=Math.min(r,w/2,h/2); ctx.beginPath(); ctx.moveTo(x+r,y); ctx.arcTo(x+w,y,x+w,y+h,r); ctx.arcTo(x+w,y+h,x,y+h,r); ctx.arcTo(x,y+h,x,y,r); ctx.arcTo(x,y,x+w,y,r); ctx.closePath();
  }
  function drawRouteMini(ctx,pts,x,y,w,h){
    if(!pts || pts.length<2) return;
    const lats=pts.map(p=>p.lat), lons=pts.map(p=>p.lon), minLat=Math.min(...lats), maxLat=Math.max(...lats), minLon=Math.min(...lons), maxLon=Math.max(...lons);
    const dx=Math.max(.000001,maxLon-minLon), dy=Math.max(.000001,maxLat-minLat), pad=12;
    const xy=p=>[x+pad+(p.lon-minLon)/dx*(w-pad*2),y+h-pad-(p.lat-minLat)/dy*(h-pad*2)];
    ctx.save(); ctx.lineCap='round';ctx.lineJoin='round';ctx.strokeStyle='#f1c66f';ctx.lineWidth=6;ctx.shadowColor='rgba(241,198,111,.3)';ctx.shadowBlur=10;ctx.beginPath();pts.forEach((p,i)=>{const [a,b]=xy(p);i?ctx.lineTo(a,b):ctx.moveTo(a,b)});ctx.stroke();ctx.shadowBlur=0;const [sx,sy]=xy(pts[0]),[ex,ey]=xy(pts[pts.length-1]);ctx.fillStyle='#6ed4c1';ctx.beginPath();ctx.arc(sx,sy,7,0,Math.PI*2);ctx.fill();ctx.fillStyle='#fff8e8';ctx.beginPath();ctx.arc(ex,ey,8,0,Math.PI*2);ctx.fill();ctx.restore();
  }

  function artNow(){
    if(!photoImage) { toast('Escolha uma foto primeiro.'); return false; }
    try {
      const canvas=$('#artCanvas'),ctx=canvas.getContext('2d'),sz=selectedFormat==='feed'?[1080,1350]:selectedFormat==='square'?[1080,1080]:[1080,1920],w=sz[0],h=sz[1];
      canvas.width=w;canvas.height=h; cropCover(ctx,photoImage,w,h);
      const shade=ctx.createLinearGradient(0,0,0,h);shade.addColorStop(0,'rgba(2,12,10,.16)');shade.addColorStop(.48,'rgba(2,12,10,.06)');shade.addColorStop(.68,'rgba(2,16,13,.55)');shade.addColorStop(1,'rgba(2,12,10,.97)');ctx.fillStyle=shade;ctx.fillRect(0,0,w,h);
      const gold=ctx.createLinearGradient(0,0,w,0);gold.addColorStop(0,'#ffe6a4');gold.addColorStop(.5,'#f1c66f');gold.addColorStop(1,'#b87931');ctx.fillStyle=gold;ctx.fillRect(0,0,w,14);

      if(LOGO){
        const im=new Image(); im.src=LOGO;
        if(im.complete){const ls=Math.round(Math.min(w,h)*.165);ctx.save();ctx.shadowColor='rgba(0,0,0,.5)';ctx.shadowBlur=24;ctx.drawImage(im,48,44,ls,ls);ctx.restore();}
      } else if(logoImg?.complete){ctx.drawImage(logoImg,48,44,180,180)}

      ctx.textAlign='right';ctx.fillStyle='#fff8e8';ctx.font='800 24px Arial';ctx.fillText('TRILHEIROS DE RONDONÓPOLIS',w-52,73);ctx.fillStyle='#f1c66f';ctx.font='900 18px Arial';ctx.fillText('FINISHER OFICIAL',w-52,108);

      const s=state.summary||{name:state.name,distanceM:state.distanceM,elapsed:elapsedSeconds(),elevationGain:state.elevationGain,avg:avgKmh(),date:Date.now()};
      const panelH=Math.min(h*.39,565),py=h-panelH;
      const pg=ctx.createLinearGradient(0,py,0,h);pg.addColorStop(0,'rgba(4,28,23,.45)');pg.addColorStop(.12,'rgba(4,28,23,.82)');pg.addColorStop(1,'rgba(2,13,11,.98)');ctx.fillStyle=pg;ctx.fillRect(0,py,w,panelH);
      ctx.fillStyle='#f1c66f';ctx.font='900 22px Arial';ctx.textAlign='left';ctx.fillText('TRILHA CONCLUÍDA',52,py+58);
      ctx.fillStyle='#fff8e8';ctx.font='900 56px Arial';let nm=(s.name||'MINHA TRILHA').toUpperCase();if(nm.length>26)nm=nm.slice(0,26)+'…';ctx.fillText(nm,52,py+120);
      ctx.fillStyle='#f1c66f';ctx.font='900 142px Arial';const km=fmtKm(s.distanceM||0);ctx.fillText(km,48,py+268);const kmw=ctx.measureText(km).width;ctx.font='900 33px Arial';ctx.fillText('KM',62+kmw,py+268);

      const routeW=285,routeH=125,routeX=w-routeW-52,routeY=py+142;
      ctx.fillStyle='rgba(255,255,255,.055)';rounded(ctx,routeX,routeY,routeW,routeH,22);ctx.fill();drawRouteMini(ctx,state.points,routeX+8,routeY+8,routeW-16,routeH-16);

      const statsY=py+328,gap=13,boxW=(w-104-gap*2)/3;
      const stats=[['TEMPO',formatTime(s.elapsed||0)],['ELEVAÇÃO','+'+Math.round(s.elevationGain||0)+' m'],['MÉDIA',((s.avg??avgKmh()).toFixed(1).replace('.',','))+' km/h']];
      stats.forEach((it,i)=>{const x=52+i*(boxW+gap);ctx.fillStyle='rgba(255,255,255,.055)';rounded(ctx,x,statsY,boxW,92,18);ctx.fill();ctx.fillStyle='#8fa59d';ctx.font='800 15px Arial';ctx.fillText(it[0],x+16,statsY+30);ctx.fillStyle='#fff8e8';ctx.font='900 27px Arial';ctx.fillText(it[1],x+16,statsY+68)});
      ctx.fillStyle='#789087';ctx.font='700 16px Arial';ctx.fillText(new Date(s.date||Date.now()).toLocaleDateString('pt-BR')+' • A aventura te chama.',52,h-42);
      return true;
    } catch(err){ console.error(err); toast('Não foi possível gerar a arte. Tente outra foto.'); return false; }
  }

  const generateBtn=$('#generateBtn');
  if(generateBtn) generateBtn.addEventListener('click',e=>{e.preventDefault();e.stopImmediatePropagation();if(artNow())showView('art')},true);

  // Reaplica a logo depois que tudo terminou de carregar.
  requestAnimationFrame(()=>{if(LOGO)$$('img').forEach(img=>{if(img.classList.contains('hero-logo')||img.classList.contains('brand-logo-mini')||img.closest('.tracking-logo')||img.closest('footer'))img.src=LOGO})});
})();
