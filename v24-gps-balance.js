(() => {
  'use strict';
  const $ = s => document.querySelector(s);
  let moveCandidates = [];
  let jumpCandidates = [];

  function setLive(mode,text){
    const live=$('.live-dot');
    if(!live)return;
    live.classList.remove('stationary','protected');
    if(mode)live.classList.add(mode);
    live.innerHTML='<i></i> '+text;
  }

  function setSpeed(kmh){
    const el=$('#speedValue');
    if(el)el.textContent=`${Math.max(0,kmh).toFixed(1).replace('.',',')} km/h`;
  }

  function movementThreshold(a,b){
    const noise=((a.acc||8)+(b.acc||8))*0.42;
    return Math.max(6,Math.min(16,noise));
  }

  function validPair(anchor,list,minMove){
    if(list.length<2)return false;
    const a=list[list.length-2], b=list[list.length-1];
    const da=hav(anchor,a), db=hav(anchor,b), dab=hav(a,b);
    return db>=minMove && db>da+1.5 && dab>=2;
  }

  function maybeReanchor(p){
    if(state.distanceM>3 || elapsedSeconds()>30)return false;
    jumpCandidates.push(p);
    if(jumpCandidates.length>3)jumpCandidates.shift();
    if(jumpCandidates.length<3)return false;
    const [a,b,c]=jumpCandidates;
    if(hav(a,b)<=12 && hav(b,c)<=12 && hav(a,c)<=18){
      state.lastAccepted=c;
      state.startPoint=c;
      state.points=[c];
      moveCandidates=[];
      jumpCandidates=[];
      saveActive();
      setSpeed(0);
      setLive('stationary','GPS RECALIBRADO • PRONTO PARA CAMINHAR');
      try{drawTrack();}catch(_){}
      return true;
    }
    return false;
  }

  renderTracking = function(){
    state.elapsed=elapsedSeconds();
    const d=$('#distanceValue');
    const unit=document.querySelector('.distance-number small');
    if(state.distanceM<1000){
      if(d)d.textContent=String(Math.max(0,Math.round(state.distanceM)));
      if(unit)unit.textContent='M';
    }else{
      if(d)d.textContent=fmtKm(state.distanceM);
      if(unit)unit.textContent='KM';
    }
    const t=$('#timeValue'); if(t)t.textContent=formatTime(state.elapsed);
    const a=$('#avgValue'); if(a)a.textContent=`${avgKmh().toFixed(1).replace('.',',')} km/h`;
    const e=$('#elevationValue'); if(e)e.textContent=`+${Math.round(state.elevationGain)} m`;
    saveActive();
  };

  onPosition = function(pos){
    const c=pos.coords;
    const p={
      lat:c.latitude,
      lon:c.longitude,
      alt:Number.isFinite(c.altitude)?c.altitude:null,
      altAcc:Number.isFinite(c.altitudeAccuracy)?c.altitudeAccuracy:null,
      acc:c.accuracy||999,
      time:pos.timestamp||Date.now()
    };

    const acc=$('#accuracyValue'); if(acc)acc.textContent=`Precisão: ${Math.round(p.acc)} m`;
    const badge=$('#gpsBadge');
    if(badge){
      if(p.acc<=10){badge.className='badge gps-good';badge.textContent='GPS EXCELENTE';}
      else if(p.acc<=18){badge.className='badge gps-good';badge.textContent='GPS BOM';}
      else{badge.className='badge gps-search';badge.textContent='GPS PROTEGIDO';}
    }
    if(state.paused)return;

    if(p.acc>25){
      moveCandidates=[];
      jumpCandidates=[];
      setSpeed(0);
      setLive('protected','SINAL FRACO • DISTÂNCIA CONGELADA');
      return;
    }

    if(!state.lastAccepted){
      state.lastAccepted=p;
      state.startPoint=p;
      state.points=[p];
      saveActive();
      setSpeed(0);
      setLive('stationary','PONTO INICIAL FIXADO');
      return;
    }

    const anchor=state.lastAccepted;
    const seg=hav(anchor,p);
    const dt=Math.max(1,(p.time-anchor.time)/1000);
    const calcSpeed=seg/dt;
    const rawSpeed=Number.isFinite(c.speed)?Math.max(0,c.speed):null;
    const minMove=movementThreshold(anchor,p);

    if(seg<minMove){
      moveCandidates=[];
      jumpCandidates=[];
      setSpeed(0);
      setLive('stationary','PARADO • DISTÂNCIA NÃO SOMADA');
      return;
    }

    if(rawSpeed!==null && rawSpeed<0.25 && seg<minMove*1.8){
      moveCandidates=[];
      jumpCandidates=[];
      setSpeed(0);
      setLive('stationary','PARADO • DISTÂNCIA NÃO SOMADA');
      return;
    }

    // Picos impossíveis para caminhada/trilha são ignorados e nunca aparecem como velocidade atual.
    if(calcSpeed>5.5 || seg>100 || (rawSpeed!==null && rawSpeed>7.0 && calcSpeed>4.0)){
      moveCandidates=[];
      setSpeed(0);
      if(!maybeReanchor(p))setLive('protected','SALTO DE GPS IGNORADO');
      return;
    }

    jumpCandidates=[];
    moveCandidates.push(p);
    if(moveCandidates.length>2)moveCandidates.shift();

    if(!validPair(anchor,moveCandidates,minMove)){
      setSpeed(Math.min(calcSpeed*3.6,18));
      setLive('stationary','CONFIRMANDO MOVIMENTO...');
      return;
    }

    const accepted=moveCandidates[moveCandidates.length-1];
    const acceptedDistance=hav(anchor,accepted);
    const acceptedDt=Math.max(1,(accepted.time-anchor.time)/1000);
    const acceptedSpeed=acceptedDistance/acceptedDt;

    if(acceptedSpeed>5.5 || acceptedDistance<minMove){
      moveCandidates=[];
      setSpeed(0);
      setLive('protected','MOVIMENTO INCERTO • AGUARDANDO GPS');
      return;
    }

    state.distanceM+=acceptedDistance;
    if(accepted.alt!==null && anchor.alt!==null){
      const dAlt=accepted.alt-anchor.alt;
      const altOk=(accepted.altAcc==null || accepted.altAcc<=18) && Math.abs(dAlt)<=18;
      if(altOk && dAlt>2.5)state.elevationGain+=dAlt;
    }
    if(accepted.alt!==null)state.maxAltitude=state.maxAltitude===null?accepted.alt:Math.max(state.maxAltitude,accepted.alt);

    state.points.push(accepted);
    state.lastAccepted=accepted;
    moveCandidates=[];
    saveActive();
    $('#waitingGps')?.classList.add('hidden');
    setSpeed(acceptedSpeed*3.6);
    try{drawTrack();}catch(_){}
    try{updateTerrain();}catch(_){}
    renderTracking();
    setLive('', 'MOVIMENTO CONFIRMADO');
  };

  onGpsError = function(err){
    const b=$('#gpsBadge');
    if(b){b.className='badge gps-search';b.textContent=err.code===1?'PERMISSÃO GPS':'GPS RECONECTANDO';}
    setSpeed(0);
    setLive('protected','GPS SEM POSIÇÃO • DISTÂNCIA CONGELADA');
    if(err.code===1)toast('Permita a localização precisa para continuar registrando.');
  };
})();
