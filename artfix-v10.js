(() => {
  const $=s=>document.querySelector(s);
  const LOGO=window.TRILHEIROS_LOGO_DATA||'';
  const old=$('#generateBtn');
  if(!old) return;
  const btn=old.cloneNode(true);
  old.replaceWith(btn);

  function rr(ctx,x,y,w,h,r){r=Math.min(r,w/2,h/2);ctx.beginPath();ctx.moveTo(x+r,y);ctx.arcTo(x+w,y,x+w,y+h,r);ctx.arcTo(x+w,y+h,x,y+h,r);ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+w,y,r);ctx.closePath()}
  function route(ctx,pts,x,y,w,h){if(!pts||pts.length<2)return;const la=pts.map(p=>p.lat),lo=pts.map(p=>p.lon),a=Math.min(...la),b=Math.max(...la),c=Math.min(...lo),d=Math.max(...lo),dx=Math.max(.000001,d-c),dy=Math.max(.000001,b-a),pad=12,xy=p=>[x+pad+(p.lon-c)/dx*(w-pad*2),y+h-pad-(p.lat-a)/dy*(h-pad*2)];ctx.save();ctx.lineCap='round';ctx.lineJoin='round';ctx.strokeStyle='#f1c66f';ctx.lineWidth=6;ctx.shadowColor='rgba(241,198,111,.35)';ctx.shadowBlur=10;ctx.beginPath();pts.forEach((p,i)=>{const[q,r]=xy(p);i?ctx.lineTo(q,r):ctx.moveTo(q,r)});ctx.stroke();ctx.shadowBlur=0;const[sx,sy]=xy(pts[0]),[ex,ey]=xy(pts[pts.length-1]);ctx.fillStyle='#6ed4c1';ctx.beginPath();ctx.arc(sx,sy,7,0,Math.PI*2);ctx.fill();ctx.fillStyle='#fff8e8';ctx.beginPath();ctx.arc(ex,ey,8,0,Math.PI*2);ctx.fill();ctx.restore()}
  function loadLogo(){return new Promise(resolve=>{if(!LOGO)return resolve(null);const im=new Image();im.onload=()=>resolve(im);im.onerror=()=>resolve(null);im.src=LOGO;if(im.complete&&im.naturalWidth)resolve(im)})}

  btn.addEventListener('click',async e=>{
    e.preventDefault();e.stopImmediatePropagation();
    if(!photoImage){toast('Escolha uma foto primeiro.');return}
    btn.disabled=true;const prev=btn.textContent;btn.textContent='✨ GERANDO SUA CONQUISTA...';
    try{
      const logo=await loadLogo();
      const canvas=$('#artCanvas'),ctx=canvas.getContext('2d'),size=selectedFormat==='feed'?[1080,1350]:selectedFormat==='square'?[1080,1080]:[1080,1920],[w,h]=size;canvas.width=w;canvas.height=h;
      cropCover(ctx,photoImage,w,h);
      const shade=ctx.createLinearGradient(0,0,0,h);shade.addColorStop(0,'rgba(2,12,10,.18)');shade.addColorStop(.48,'rgba(2,12,10,.07)');shade.addColorStop(.68,'rgba(2,16,13,.58)');shade.addColorStop(1,'rgba(2,12,10,.98)');ctx.fillStyle=shade;ctx.fillRect(0,0,w,h);
      const gold=ctx.createLinearGradient(0,0,w,0);gold.addColorStop(0,'#ffe6a4');gold.addColorStop(.5,'#f1c66f');gold.addColorStop(1,'#b87931');ctx.fillStyle=gold;ctx.fillRect(0,0,w,14);
      if(logo){const ls=Math.round(Math.min(w,h)*.165);ctx.save();ctx.shadowColor='rgba(0,0,0,.55)';ctx.shadowBlur=25;ctx.drawImage(logo,48,42,ls,ls);ctx.restore()}
      ctx.textAlign='right';ctx.fillStyle='#fff8e8';ctx.font='800 24px Arial';ctx.fillText('TRILHEIROS DE RONDONÓPOLIS',w-52,73);ctx.fillStyle='#f1c66f';ctx.font='900 18px Arial';ctx.fillText('FINISHER OFICIAL',w-52,108);
      const s=state.summary||{name:state.name,distanceM:state.distanceM,elapsed:elapsedSeconds(),elevationGain:state.elevationGain,avg:avgKmh(),date:Date.now()},ph=Math.min(h*.39,565),py=h-ph;
      const pg=ctx.createLinearGradient(0,py,0,h);pg.addColorStop(0,'rgba(4,28,23,.42)');pg.addColorStop(.12,'rgba(4,28,23,.84)');pg.addColorStop(1,'rgba(2,13,11,.99)');ctx.fillStyle=pg;ctx.fillRect(0,py,w,ph);
      ctx.textAlign='left';ctx.fillStyle='#f1c66f';ctx.font='900 22px Arial';ctx.fillText('TRILHA CONCLUÍDA',52,py+58);ctx.fillStyle='#fff8e8';ctx.font='900 56px Arial';let nm=(s.name||'MINHA TRILHA').toUpperCase();if(nm.length>26)nm=nm.slice(0,26)+'…';ctx.fillText(nm,52,py+120);
      ctx.fillStyle='#f1c66f';ctx.font='900 142px Arial';const km=fmtKm(s.distanceM||0);ctx.fillText(km,48,py+268);const kmw=ctx.measureText(km).width;ctx.font='900 33px Arial';ctx.fillText('KM',62+kmw,py+268);
      const rw=285,rh=125,rx=w-rw-52,ry=py+142;ctx.fillStyle='rgba(255,255,255,.055)';rr(ctx,rx,ry,rw,rh,22);ctx.fill();route(ctx,state.points,rx+8,ry+8,rw-16,rh-16);
      const sy=py+328,g=13,bw=(w-104-g*2)/3,stats=[['TEMPO',formatTime(s.elapsed||0)],['ELEVAÇÃO','+'+Math.round(s.elevationGain||0)+' m'],['MÉDIA',((s.avg??avgKmh()).toFixed(1).replace('.',','))+' km/h']];stats.forEach((it,i)=>{const x=52+i*(bw+g);ctx.fillStyle='rgba(255,255,255,.055)';rr(ctx,x,sy,bw,92,18);ctx.fill();ctx.fillStyle='#8fa59d';ctx.font='800 15px Arial';ctx.fillText(it[0],x+16,sy+30);ctx.fillStyle='#fff8e8';ctx.font='900 27px Arial';ctx.fillText(it[1],x+16,sy+68)});
      ctx.fillStyle='#789087';ctx.font='700 16px Arial';ctx.fillText(new Date(s.date||Date.now()).toLocaleDateString('pt-BR')+' • A aventura te chama.',52,h-42);showView('art');
    }catch(err){console.error(err);toast('Não foi possível gerar a arte. Tente outra foto.')}finally{btn.disabled=false;btn.textContent=prev}
  },true);
})();
