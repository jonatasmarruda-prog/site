(() => {
  'use strict';
  const PROFILE_KEY='trilheiros_profile_name';
  const HISTORY_KEY='trilheiros_history';
  const $=s=>document.querySelector(s);

  const style=document.createElement('style');
  style.textContent=`
    .welcome-user{margin:14px auto 2px;text-align:center;font-weight:900;font-size:clamp(17px,5vw,24px);color:#fff8e8;letter-spacing:-.02em}
    .welcome-user span{color:#f1c66f}
    .welcome-sub{margin:0 auto 10px;text-align:center;color:#8fa59d;font-size:11px;font-weight:700}
    .profile-modal{position:fixed;inset:0;z-index:9999;display:grid;place-items:center;padding:20px;background:rgba(2,12,10,.88);backdrop-filter:blur(14px)}
    .profile-modal.hidden{display:none}
    .profile-card{width:min(420px,100%);border-radius:30px;padding:26px 20px 20px;background:linear-gradient(155deg,#103229,#071c17);border:1px solid rgba(241,198,111,.32);box-shadow:0 30px 100px rgba(0,0,0,.65);text-align:center}
    .profile-mark{width:74px;height:74px;margin:0 auto 13px;border-radius:50%;display:grid;place-items:center;font-size:34px;background:radial-gradient(circle,rgba(241,198,111,.22),rgba(241,198,111,.06));border:1px solid rgba(241,198,111,.4);box-shadow:0 0 35px rgba(241,198,111,.16)}
    .profile-card h2{margin:0 0 7px;font-size:25px;color:#fff8e8;letter-spacing:-.03em}
    .profile-card p{margin:0 auto 18px;max-width:310px;color:#96aaa2;font-size:12px;line-height:1.55}
    .profile-field{width:100%;height:58px;border-radius:16px;border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.06);color:#fff8e8;padding:0 16px;outline:none;font-size:16px;font-weight:800;text-align:center}
    .profile-field:focus{border-color:rgba(241,198,111,.65);box-shadow:0 0 0 4px rgba(241,198,111,.08)}
    .profile-save{width:100%;height:58px;margin-top:10px;border:0;border-radius:16px;cursor:pointer;background:linear-gradient(135deg,#38b97c,#1b7654);color:white;font-weight:950;box-shadow:0 14px 35px rgba(29,125,87,.28)}
    .history-item{position:relative;padding-right:78px!important}
    .history-delete{position:absolute;right:10px;top:50%;transform:translateY(-50%);width:48px;height:48px;border-radius:14px;border:1px solid rgba(255,112,99,.23);background:rgba(204,67,57,.11);color:#ff9e96;font-size:18px;cursor:pointer;display:grid;place-items:center}
    .history-delete:active{transform:translateY(-50%) scale(.95)}
    .art-name-badge{display:none}
  `;
  document.head.appendChild(style);

  function cleanName(v){return String(v||'').trim().replace(/\s+/g,' ').slice(0,45)}
  function getName(){return cleanName(localStorage.getItem(PROFILE_KEY)||'')}
  function setName(v){const n=cleanName(v);if(n)localStorage.setItem(PROFILE_KEY,n);return n}

  function ensureWelcome(){
    const hero=$('.hero-card'); if(!hero) return;
    let box=$('#welcomeUser');
    if(!box){
      box=document.createElement('div');
      box.id='welcomeUser';
      box.innerHTML='<div class="welcome-user">Bem-vindo, <span id="welcomeName">Trilheiro(a)</span>!</div><div class="welcome-sub">Pra onde vamos hoje?</div>';
      const status=hero.querySelector('.status-strip');
      if(status) status.insertAdjacentElement('afterend',box); else hero.prepend(box);
    }
    const n=getName(); const t=$('#welcomeName'); if(t)t.textContent=n||'Trilheiro(a)';
  }

  function ensureModal(){
    if($('#profileModal')) return;
    const modal=document.createElement('div'); modal.id='profileModal'; modal.className='profile-modal hidden';
    modal.innerHTML=`<div class="profile-card"><div class="profile-mark">🥾</div><h2>Bem-vindo, Trilheiro(a)!</h2><p>Antes da primeira aventura, diga seu nome. Ele ficará salvo somente neste celular.</p><input id="profileNameInput" class="profile-field" maxlength="45" autocomplete="name" placeholder="Coloque o seu nome"><button id="profileSaveBtn" class="profile-save">CONTINUAR PARA O APP</button></div>`;
    document.body.appendChild(modal);
    const save=()=>{const n=setName($('#profileNameInput')?.value);if(!n){$('#profileNameInput')?.focus();return}modal.classList.add('hidden');ensureWelcome();try{toast('Bem-vindo, '+n+'!')}catch(_){}};
    $('#profileSaveBtn').addEventListener('click',save);
    $('#profileNameInput').addEventListener('keydown',e=>{if(e.key==='Enter')save()});
  }

  function showOnboardingIfNeeded(){ensureModal();ensureWelcome();if(!getName()){const m=$('#profileModal');m?.classList.remove('hidden');setTimeout(()=>$('#profileNameInput')?.focus(),250)}}

  function safeHist(){try{return JSON.parse(localStorage.getItem(HISTORY_KEY)||'[]')}catch{return[]}}
  function writeHist(a){localStorage.setItem(HISTORY_KEY,JSON.stringify(a))}
  function esc(s=''){return String(s).replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]))}
  function time(sec){sec=Math.max(0,Math.floor(sec||0));const h=String(Math.floor(sec/3600)).padStart(2,'0'),m=String(Math.floor((sec%3600)/60)).padStart(2,'0'),s=String(sec%60).padStart(2,'0');return `${h}:${m}:${s}`}
  function km(m){return ((m||0)/1000).toFixed(2).replace('.',',')}

  function premiumRenderHistory(){
    const arr=safeHist(),list=$('#historyList'),count=$('#historyCount'); if(!list||!count)return;
    count.textContent=`${arr.length} ${arr.length===1?'trilha':'trilhas'}`;
    if(!arr.length){list.innerHTML='<div class="history-empty">Sua próxima aventura vai aparecer aqui. 🥾</div>';return}
    list.innerHTML=arr.slice(0,50).map((i,idx)=>`<div class="history-item" data-history-index="${idx}"><div><h4>${esc(i.name||'Minha Trilha')}</h4><p>${new Date(i.date||Date.now()).toLocaleDateString('pt-BR')} • ${time(i.elapsed)}</p></div><div class="history-km"><strong>${km(i.distanceM)} km</strong><small>+${Math.round(i.elevationGain||0)} m</small></div><button class="history-delete" data-delete-index="${idx}" aria-label="Excluir trilha" title="Excluir trilha">🗑️</button></div>`).join('');
  }

  window.renderHistory=premiumRenderHistory;
  document.addEventListener('click',e=>{
    const b=e.target.closest?.('[data-delete-index]'); if(!b)return;
    const idx=Number(b.dataset.deleteIndex),arr=safeHist(),item=arr[idx]; if(!item)return;
    if(!confirm(`Excluir \"${item.name||'esta trilha'}\" do histórico?`))return;
    arr.splice(idx,1);writeHist(arr);premiumRenderHistory();try{toast('Trilha excluída do histórico.')}catch(_){ }
  });

  function decorateArt(){
    const c=$('#artCanvas'); if(!c)return; const n=getName(); if(!n)return;
    const ctx=c.getContext('2d'),w=c.width,h=c.height; if(!w||!h)return;
    const label=('TRILHEIRO • '+n).toUpperCase();
    ctx.save();ctx.font=`800 ${Math.max(18,Math.round(w*.018))}px Arial`;const tw=ctx.measureText(label).width,padX=22,bh=48,x=52,y=Math.max(140,Math.round(h*.11));
    ctx.fillStyle='rgba(3,20,16,.72)';ctx.strokeStyle='rgba(241,198,111,.58)';ctx.lineWidth=1.5;
    const rw=tw+padX*2,r=24;ctx.beginPath();ctx.moveTo(x+r,y);ctx.arcTo(x+rw,y,x+rw,y+bh,r);ctx.arcTo(x+rw,y+bh,x,y+bh,r);ctx.arcTo(x,y+bh,x,y,r);ctx.arcTo(x,y,x+rw,y,r);ctx.closePath();ctx.fill();ctx.stroke();
    ctx.fillStyle='#f1c66f';ctx.textAlign='left';ctx.textBaseline='middle';ctx.fillText(label,x+padX,y+bh/2+1);ctx.restore();
  }

  const oldShow=window.showView;
  if(typeof oldShow==='function'){
    window.showView=function(name){oldShow(name);if(name==='art')setTimeout(decorateArt,40)};
  }

  function boot(){showOnboardingIfNeeded();premiumRenderHistory()}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
  window.addEventListener('pageshow',()=>{ensureWelcome();premiumRenderHistory()});
})();
