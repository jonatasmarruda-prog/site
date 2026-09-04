(() => {
  const $ = s => document.querySelector(s);

  // ---------- VISUAL: LOGO MAIOR E SEM FUNDO QUADRADO ----------
  const style = document.createElement('style');
  style.textContent = `
    .brand-logo-mini,
    .tracking-logo img,
    footer img,
    .hero-logo {
      border-radius:50%!important;
      clip-path:circle(48% at 50% 50%)!important;
      background:transparent!important;
      object-fit:cover!important;
    }
    .brand-logo-mini{width:62px!important;height:62px!important;transform:scale(1.08);}
    .hero-logo-wrap{width:210px!important;height:210px!important;margin-bottom:14px!important;}
    .hero-logo{width:188px!important;height:188px!important;transform:scale(1.08);box-shadow:none!important;}
    .hero-ring{inset:6px!important;}
    .tracking-logo{overflow:hidden;border-radius:50%!important;}
    .tracking-logo img{width:100%!important;height:100%!important;transform:scale(1.08);}
    footer img{transform:scale(1.08);}
    .live-dot.stationary{color:#f1c66f!important;}
    .live-dot.stationary i{background:#f1c66f!important;box-shadow:0 0 0 5px rgba(241,198,111,.12)!important;animation:none!important;}
    .live-dot.protected{color:#ffb39e!important;}
    .live-dot.protected i{background:#ff806d!important;box-shadow:0 0 0 5px rgba(255,128,109,.12)!important;animation:none!important;}
  `;
  document.head.appendChild(style);

  const LOGO = window.TRILHEIROS_LOGO_DATA || '';
  if (LOGO) {
    document.querySelectorAll('.brand-logo-mini,.hero-logo,.tracking-logo img,footer img').forEach(img => {
      img.src = LOGO;
    });
    try { logoImg.src = LOGO; } catch (_) {}
  }

  // ---------- GPS HONESTO: ANTI-DRIFT RÍGIDO ----------
  let moveCandidates = [];
  let lastAcceptedSpeed = 0;
  const live = document.querySelector('.live-dot');

  function setLive(mode, text){
    if(!live) return;
    live.classList.remove('stationary','protected');
    if(mode) live.classList.add(mode);
    live.innerHTML = '<i></i> ' + text;
  }

  function threshold(prev,p){
    // A distância mínima cresce junto com a incerteza do GPS.
    const noise = ((prev.acc || 10) + (p.acc || 10)) * 0.65;
    return Math.max(12, Math.min(32, noise));
  }

  function compatibleDirection(anchor, candidates){
    if(candidates.length < 3) return false;
    const a = candidates[candidates.length-3];
    const b = candidates[candidates.length-2];
    const c = candidates[candidates.length-1];
    // Movimento real precisa continuar se afastando do ponto estável,
    // não apenas oscilar de um lado para outro.
    const da = hav(anchor,a), db = hav(anchor,b), dc = hav(anchor,c);
    return db >= da - 2 && dc >= db - 2 && dc > da + 4;
  }

  onPosition = function(pos){
    const c = pos.coords;
    const p = {
      lat:c.latitude,
      lon:c.longitude,
      alt:Number.isFinite(c.altitude)?c.altitude:null,
      altAcc:Number.isFinite(c.altitudeAccuracy)?c.altitudeAccuracy:null,
      acc:c.accuracy || 999,
      time:pos.timestamp || Date.now()
    };

    const badge = $('#gpsBadge');
    $('#accuracyValue').textContent = `Precisão: ${Math.round(p.acc)} m`;
    const deviceSpeed = Number.isFinite(c.speed) ? Math.max(0,c.speed) : null;
    $('#speedValue').textContent = `${((deviceSpeed || 0)*3.6).toFixed(1).replace('.',',')} km/h`;

    if(p.acc <= 10){
      badge.className='badge gps-good'; badge.textContent='GPS EXCELENTE';
    } else if(p.acc <= 18){
      badge.className='badge gps-good'; badge.textContent='GPS BOM';
    } else {
      badge.className='badge gps-search'; badge.textContent='GPS PROTEGIDO';
    }

    if(state.paused) return;

    // Se a precisão está ruim, NÃO soma nada.
    if(p.acc > 22){
      moveCandidates = [];
      setLive('protected','SINAL FRACO • DISTÂNCIA CONGELADA');
      return;
    }

    if(!state.lastAccepted){
      state.lastAccepted=p;
      state.startPoint=p;
      state.points=[p];
      saveActive();
      setLive('stationary','PONTO INICIAL FIXADO');
      return;
    }

    const anchor = state.lastAccepted;
    const seg = hav(anchor,p);
    const dt = Math.max(1,(p.time-anchor.time)/1000);
    const calcSpeed = seg/dt;
    const minMove = threshold(anchor,p);

    // Dentro da bolha de precisão = parado. Nunca soma.
    if(seg < minMove){
      moveCandidates=[];
      lastAcceptedSpeed=0;
      setLive('stationary','PARADO • DISTÂNCIA NÃO SOMADA');
      return;
    }

    // Se o próprio GNSS diz velocidade quase zero, trate como drift.
    if(deviceSpeed !== null && deviceSpeed < 0.35 && seg < minMove*2.2){
      moveCandidates=[];
      lastAcceptedSpeed=0;
      setLive('stationary','PARADO • DISTÂNCIA NÃO SOMADA');
      return;
    }

    // Saltos incompatíveis com caminhada são descartados.
    if(calcSpeed > 3.8 || seg > 120){
      moveCandidates=[];
      setLive('protected','SALTO DE GPS IGNORADO');
      return;
    }

    moveCandidates.push(p);
    if(moveCandidates.length > 3) moveCandidates.shift();

    // Exige 3 leituras consecutivas e progressivas antes de somar.
    if(!compatibleDirection(anchor,moveCandidates)){
      setLive('stationary','CONFIRMANDO MOVIMENTO...');
      return;
    }

    const accepted = moveCandidates[moveCandidates.length-1];
    const acceptedDistance = hav(anchor,accepted);
    const acceptedDt = Math.max(1,(accepted.time-anchor.time)/1000);
    const acceptedSpeed = acceptedDistance/acceptedDt;

    // Caminhada extremamente rápida ou ainda incerta: não aceita.
    if(acceptedSpeed > 3.8 || acceptedDistance < minMove){
      moveCandidates=[];
      return;
    }

    state.distanceM += acceptedDistance;

    if(accepted.alt !== null && anchor.alt !== null){
      const dAlt = accepted.alt - anchor.alt;
      const altOk = (accepted.altAcc == null || accepted.altAcc <= 18) && Math.abs(dAlt) <= 18;
      if(altOk && dAlt > 2.5) state.elevationGain += dAlt;
    }
    if(accepted.alt !== null){
      state.maxAltitude = state.maxAltitude===null ? accepted.alt : Math.max(state.maxAltitude,accepted.alt);
    }

    state.points.push(accepted);
    state.lastAccepted=accepted;
    moveCandidates=[];
    lastAcceptedSpeed=acceptedSpeed;
    saveActive();
    $('#waitingGps')?.classList.add('hidden');
    drawTrack();
    try{ updateTerrain(); }catch(_){}
    renderTracking();
    setLive('', 'MOVIMENTO CONFIRMADO');
  };

  onGpsError = function(err){
    const b=$('#gpsBadge');
    if(b){b.className='badge gps-search';b.textContent=err.code===1?'PERMISSÃO GPS':'GPS RECONECTANDO'}
    setLive('protected','GPS SEM POSIÇÃO • DISTÂNCIA CONGELADA');
    if(err.code===1) toast('Permita a localização precisa para continuar registrando.');
  };
})();
