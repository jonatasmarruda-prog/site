(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports) module.exports=api;
  else root.TrilheirosGpsV26=api;
})(typeof self!=='undefined'?self:this,function(){
  'use strict';

  const R=6371000;
  const rad=v=>v*Math.PI/180;
  function hav(a,b){
    const dLat=rad(b.lat-a.lat),dLon=rad(b.lon-a.lon);
    const q=Math.sin(dLat/2)**2+Math.cos(rad(a.lat))*Math.cos(rad(b.lat))*Math.sin(dLon/2)**2;
    return 2*R*Math.atan2(Math.sqrt(q),Math.sqrt(1-q));
  }
  function median(values){
    const a=values.filter(Number.isFinite).slice().sort((x,y)=>x-y);
    if(!a.length)return null;
    const m=Math.floor(a.length/2);
    return a.length%2?a[m]:(a[m-1]+a[m])/2;
  }
  function clamp(v,min,max){return Math.max(min,Math.min(max,v));}

  class Tracker{
    constructor(opts={}){
      this.maxAccuracy=opts.maxAccuracy||45;
      this.maxKmh=opts.maxKmh||22;
      this.recent=[];
      this.lastFiltered=null;
      this.lastAccepted=null;
      this.smoothKmh=0;
      this.lastMotionAt=0;
      this.stationarySince=0;
    }

    reset(point=null){
      this.recent=[];
      this.lastFiltered=point?{...point}:null;
      this.lastAccepted=point?{...point}:null;
      this.smoothKmh=0;
      this.lastMotionAt=0;
      this.stationarySince=0;
    }

    _filter(sample){
      this.recent.push(sample);
      if(this.recent.length>3)this.recent.shift();
      const lat=median(this.recent.map(p=>p.lat));
      const lon=median(this.recent.map(p=>p.lon));
      const acc=median(this.recent.map(p=>p.acc));
      const alt=median(this.recent.map(p=>p.alt));
      const altAcc=median(this.recent.map(p=>p.altAcc));
      return {lat,lon,acc:acc??sample.acc,alt,altAcc,time:sample.time};
    }

    _smooth(v){
      if(!Number.isFinite(v)||v<0)v=0;
      if(v>this.maxKmh)v=0;
      this.smoothKmh=this.smoothKmh<=0?v:(this.smoothKmh*0.58+v*0.42);
      if(this.smoothKmh<0.25)this.smoothKmh=0;
      return this.smoothKmh;
    }

    process(sample){
      if(!sample||!Number.isFinite(sample.lat)||!Number.isFinite(sample.lon)){
        return {accepted:false,reason:'invalid',distanceDelta:0,speedKmh:this.smoothKmh};
      }
      const now=sample.time||Date.now();
      const acc=Number.isFinite(sample.acc)?sample.acc:999;
      if(acc>this.maxAccuracy){
        if(this.lastMotionAt&&now-this.lastMotionAt>5000)this.smoothKmh*=0.55;
        if(this.smoothKmh<0.3)this.smoothKmh=0;
        return {accepted:false,reason:'weak',distanceDelta:0,speedKmh:this.smoothKmh};
      }

      const f=this._filter({...sample,acc,time:now});
      if(!this.lastFiltered){
        this.lastFiltered={...f};
        this.lastAccepted={...f};
        return {accepted:false,reason:'initial',distanceDelta:0,speedKmh:0,point:f};
      }

      const prevF=this.lastFiltered;
      const dt=Math.max(0.5,(f.time-prevF.time)/1000);
      const step=hav(prevF,f);
      const calcKmh=step/dt*3.6;
      const rawKmh=Number.isFinite(sample.speed)?sample.speed*3.6:null;
      const rawPlausible=rawKmh!==null&&rawKmh>=0&&rawKmh<=this.maxKmh?rawKmh:null;
      const calcPlausible=calcKmh>=0&&calcKmh<=this.maxKmh?calcKmh:null;

      let live=0;
      if(rawPlausible!==null&&calcPlausible!==null){
        live=Math.abs(rawPlausible-calcPlausible)<=8?rawPlausible*0.55+calcPlausible*0.45:calcPlausible;
      }else if(calcPlausible!==null&&step>=1.2) live=calcPlausible;
      else if(rawPlausible!==null) live=rawPlausible;

      const avgAcc=((prevF.acc||acc)+(f.acc||acc))/2;
      const threshold=clamp(avgAcc*0.28,2.5,7.5);
      const movingEvidence=(live>=0.8&&live<=this.maxKmh)||(step>=threshold&&calcPlausible!==null&&calcPlausible>=0.7);

      // Sempre atualiza o ponto filtrado para não acumular deriva parada.
      this.lastFiltered={...f};

      if(!movingEvidence){
        if(!this.stationarySince)this.stationarySince=now;
        if(now-this.stationarySince>3500){
          this.lastAccepted={...f}; // reancora sem somar distância
          this.smoothKmh=0;
        }else this._smooth(live);
        return {accepted:false,reason:'stationary',distanceDelta:0,speedKmh:this.smoothKmh,threshold,point:f};
      }

      this.stationarySince=0;
      this.lastMotionAt=now;
      const anchor=this.lastAccepted||prevF;
      const seg=hav(anchor,f);
      const acceptedDt=Math.max(0.5,(f.time-anchor.time)/1000);
      const acceptedKmh=seg/acceptedDt*3.6;

      // Salto incompatível: não soma, mas reancora após um salto isolado para recuperar rápido.
      if(seg>100||acceptedKmh>this.maxKmh){
        this.lastAccepted={...f};
        this.smoothKmh=0;
        return {accepted:false,reason:'spike',distanceDelta:0,speedKmh:0,point:f};
      }

      // Durante movimento confirmado, libera segmentos menores para não perder passos.
      const moveThreshold=Math.max(1.8,threshold*0.55);
      if(seg<moveThreshold){
        return {accepted:false,reason:'moving-small',distanceDelta:0,speedKmh:this._smooth(live),threshold:moveThreshold,point:f};
      }

      this.lastAccepted={...f};
      const speedOut=this._smooth(live||acceptedKmh);
      return {accepted:true,reason:'moving',distanceDelta:seg,speedKmh:speedOut,point:f,segmentKmh:acceptedKmh};
    }
  }

  return {Tracker,hav};
});
