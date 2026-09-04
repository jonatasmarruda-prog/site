(() => {
  'use strict';
  const $ = s => document.querySelector(s);
  const $$ = s => [...document.querySelectorAll(s)];
  const LOGO_DATA = "__LOGO_PLACEHOLDER__";
  const startBtn = $('#startBtn');
  const installBtn = $('#installBtn');
  if (!startBtn || !installBtn) return;

  const logoSelectors = ['.brand-logo-mini','.hero-logo','.tracking-logo img','footer img'];
  logoSelectors.forEach(sel => $$(sel).forEach(img => {img.src = LOGO_DATA; img.removeAttribute('crossorigin');}));

  const heroTitle = $('.hero-title');
  const heroCopy = $('.hero-copy');
  if (heroTitle && !$('.welcome-kicker')) {
    const welcome = document.createElement('div');
    welcome.className = 'welcome-kicker';
    welcome.innerHTML = '<span>👋</span><div><b>BEM-VINDO(A), TRILHEIRO(A)!</b><small>Sua próxima conquista começa aqui.</small></div>';
    heroTitle.parentNode.insertBefore(welcome, heroTitle);
    heroTitle.innerHTML = 'Pra onde vamos<br><span>hoje?</span>';
  }
  if (heroCopy) heroCopy.textContent = 'Escolha seu destino, confirme o GPS e comece a caminhar. O Trilheiros GPS registra distância, tempo, elevação e seu percurso para transformar a aventura em conquista.';

  const home = $('#homeView');
  const hero = $('.hero-card');
  if (home && hero && installBtn) home.insertBefore(installBtn, hero);

  const style = document.createElement('style');
  style.textContent = `
    .hero-logo-wrap{width:164px!important;height:164px!important;margin:4px auto 16px!important}
    .hero-logo{width:148px!important;height:148px!important;object-fit:contain!important;border-radius:50%;opacity:0;transform:scale(.72) rotate(-7deg);animation:trLogoReveal .9s cubic-bezier(.2,.9,.25,1.15) .08s forwards,trLogoFloat 4.2s ease-in-out 1.1s infinite;filter:drop-shadow(0 16px 28px rgba(0,0,0,.48)) drop-shadow(0 0 20px rgba(241,198,111,.16))}
    .hero-ring{inset:2px!important;border:1px solid rgba(241,198,111,.58)!important;box-shadow:0 0 0 7px rgba(241,198,111,.035),0 0 46px rgba(241,198,111,.19)!important;animation:trRingPulse 3.1s ease-in-out infinite}
    .hero-logo-wrap::after{content:"";position:absolute;inset:-12px;border-radius:50%;background:conic-gradient(from 210deg,transparent 0 66%,rgba(255,231,167,.35) 73%,transparent 81%);filter:blur(2px);animation:trSpin 8s linear infinite;pointer-events:none;z-index:-1}
    .welcome-kicker{position:relative;z-index:2;display:flex;align-items:center;justify-content:center;gap:10px;width:max-content;max-width:96%;margin:5px auto 10px;padding:8px 12px;border:1px solid rgba(241,198,111,.17);border-radius:999px;background:linear-gradient(135deg,rgba(241,198,111,.085),rgba(110,212,193,.055));box-shadow:inset 0 1px rgba(255,255,255,.04);opacity:0;animation:trRise .65s ease .35s forwards}
    .welcome-kicker>span{font-size:17px;animation:trWave 2.5s ease-in-out 1.1s infinite;transform-origin:70% 70%}
    .welcome-kicker b{display:block;font-size:9px;letter-spacing:.105em;color:#fff3cc}
    .welcome-kicker small{display:block;font-size:8px;color:#91a69e;margin-top:2px}
    .hero-title{font-size:clamp(38px,10vw,56px)!important;line-height:.94!important;margin-top:8px!important}
    .hero-copy{max-width:455px!important;font-size:12px!important}
    .install-card{margin-top:0!important;margin-bottom:12px!important;position:relative!important;overflow:hidden!important;border-color:rgba(241,198,111,.27)!important;background:linear-gradient(125deg,rgba(46,185,123,.14),rgba(241,198,111,.08))!important}
    .install-card::before{content:"";position:absolute;top:0;left:-55%;width:36%;height:100%;background:linear-gradient(90deg,transparent,rgba(255,255,255,.09),transparent);transform:skewX(-18deg);animation:trShine 4.8s ease-in-out infinite}
    .install-icon{background:linear-gradient(135deg,rgba(241,198,111,.15),rgba(110,212,193,.10))!important}
    .tr-modal{position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,.76);backdrop-filter:blur(11px);display:none;align-items:flex-end;justify-content:center;padding:14px}.tr-modal.show{display:flex}
    .tr-sheet{width:min(560px,100%);background:linear-gradient(160deg,#10372f,#061b17);border:1px solid rgba(241,197,107,.25);border-radius:28px;padding:18px;color:#f7f1df;box-shadow:0 35px 90px rgba(0,0,0,.65)}
    .tr-handle{width:44px;height:4px;border-radius:99px;background:#ffffff22;margin:0 auto 14px}.tr-icon{font-size:36px}.tr-sheet h3{font-size:22px;margin:8px 0 6px}.tr-sheet>p{color:#9fb0ab;font-size:12px;line-height:1.5;margin:0}
    .tr-steps{display:grid;gap:8px;margin:14px 0}.tr-step{display:flex;gap:10px;padding:11px;border-radius:14px;background:#ffffff09;border:1px solid #ffffff0d}.tr-num{width:27px;height:27px;border-radius:9px;display:grid;place-items:center;background:#f1c56b18;color:#f1c56b;font-size:10px;font-weight:900;flex:none}.tr-step b{display:block;font-size:11px}.tr-step span{display:block;color:#879b95;font-size:9px;margin-top:2px;line-height:1.4}.tr-close{width:100%;height:50px;border:1px solid #ffffff12;border-radius:15px;background:#14382f;color:#fff;font-weight:900}
    .install-card{display:flex!important}.install-card.installed{border-color:rgba(70,218,148,.28)!important;background:rgba(70,218,148,.08)!important}
    @keyframes trLogoReveal{to{opacity:1;transform:scale(1) rotate(0)}}@keyframes trLogoFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}@keyframes trRingPulse{0%,100%{transform:scale(1);opacity:.78}50%{transform:scale(1.045);opacity:1}}@keyframes trSpin{to{transform:rotate(360deg)}}@keyframes trRise{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}@keyframes trWave{0%,70%,100%{transform:rotate(0)}76%{transform:rotate(18deg)}82%{transform:rotate(-8deg)}88%{transform:rotate(12deg)}}@keyframes trShine{0%,64%{left:-55%}82%,100%{left:125%}}
    @media (prefers-reduced-motion:reduce){.hero-logo,.hero-ring,.hero-logo-wrap::after,.welcome-kicker,.welcome-kicker>span,.install-card::before{animation:none!important;opacity:1!important;transform:none!important}}
  `;
  document.head.appendChild(style);

  const modal = document.createElement('div');
  modal.className = 'tr-modal';
  modal.innerHTML = `<div class="tr-sheet"><div class="tr-handle"></div><div class="tr-icon">📲</div><h3></h3><p></p><div class="tr-steps"></div><button class="tr-close">ENTENDI</button></div>`;
  document.body.appendChild(modal);
  const openModal = (icon,title,text,steps=[]) => {modal.querySelector('.tr-icon').textContent=icon;modal.querySelector('h3').textContent=title;modal.querySelector('p').textContent=text;modal.querySelector('.tr-steps').innerHTML=steps.map((s,i)=>`<div class="tr-step"><span class="tr-num">${i+1}</span><div><b>${s[0]}</b><span>${s[1]}</span></div></div>`).join('');modal.classList.add('show');};
  const closeModal = () => modal.classList.remove('show'); modal.querySelector('.tr-close').onclick=closeModal; modal.addEventListener('click',e=>{if(e.target===modal)closeModal();});

  const standalone = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  const updateInstall = () => {if(standalone()){installBtn.classList.add('installed');installBtn.querySelector('.install-icon').textContent='✓';installBtn.querySelector('strong').textContent='TRILHEIROS GPS INSTALADO';installBtn.querySelector('span').textContent='Você já está usando como aplicativo';installBtn.querySelector('.install-arrow').textContent='';}};
  updateInstall(); addEventListener('appinstalled',updateInstall);

  installBtn.addEventListener('click',()=>{if(standalone())return;setTimeout(()=>{if(typeof deferredInstall!=='undefined'&&deferredInstall)return;const ios=/iphone|ipad|ipod/i.test(navigator.userAgent);if(ios){openModal('📱','Instalar no iPhone','Use o Safari para colocar o Trilheiros GPS na tela inicial.',[['Abra no Safari','Se o link estiver dentro de outro aplicativo, escolha Abrir no Safari.'],['Toque em Compartilhar','Use o ícone do quadrado com a seta para cima.'],['Adicionar à Tela de Início','Confirme em Adicionar.']]);}else{openModal('📲','Instalar no Android','Para usar como aplicativo, abra este link no Google Chrome.',[['Abra no Google Chrome','No WhatsApp, ChatGPT ou Instagram, toque em ⋮ e escolha Abrir no Chrome.'],['Toque no menu ⋮','Fica no canto superior direito do Chrome.'],['Escolha Instalar app','Também pode aparecer como Adicionar à tela inicial.']]);}},120);});

  let allowStart=false; const getPos=opts=>new Promise((resolve,reject)=>navigator.geolocation.getCurrentPosition(resolve,reject,opts));
  async function preflight(){if(!isSecureContext||!navigator.geolocation)throw{code:'unsupported'};try{if(navigator.permissions?.query){const p=await navigator.permissions.query({name:'geolocation'});if(p.state==='denied')throw{code:1};}}catch(e){if(e?.code===1)throw e;}try{return await getPos({enableHighAccuracy:true,maximumAge:0,timeout:18000});}catch(e){if(e.code===1)throw e;return await getPos({enableHighAccuracy:false,maximumAge:30000,timeout:10000});}}
  function gpsError(err){if(err?.code===1)return openModal('🔒','Permita a localização','O Trilheiros GPS precisa da localização para medir a trilha.',[['Abra as permissões do site','No Chrome, toque no ícone ao lado do endereço ou em ⋮ > Configurações do site.'],['Permita Localização','Ative também a localização precisa, se aparecer.'],['Tente novamente','Volte e toque em Iniciar Trilha.']]);if(err?.code===2)return openModal('🛰️','GPS sem posição','O celular ainda não conseguiu determinar sua localização.',[['Ative a Localização','Confira o botão Localização/GPS nas configurações rápidas.'],['Vá para uma área aberta','Paredes e telhados podem atrasar o primeiro sinal.'],['Tente novamente','Aguarde alguns segundos e inicie outra vez.']]);if(err?.code===3)return openModal('⏱️','GPS demorou para responder','O primeiro sinal pode levar alguns segundos.',[['Use localização precisa','Autorize quando o Android perguntar.'],['Fique em área aberta','Depois toque em Iniciar Trilha novamente.']]);openModal('🛰️','Não foi possível acessar o GPS','Abra o link no Google Chrome e confirme que a localização do celular está ligada.',[['Abra no Chrome','Navegadores internos podem limitar o GPS.'],['Permita localização','Autorize o acesso quando for solicitado.']]);}
  startBtn.addEventListener('click',async e=>{if(allowStart){allowStart=false;return;}e.preventDefault();e.stopImmediatePropagation();if(startBtn.disabled)return;const icon=startBtn.querySelector('.start-icon'),title=startBtn.querySelector('strong'),sub=startBtn.querySelector('small');startBtn.disabled=true;icon.textContent='🛰️';title.textContent='CONFIRMANDO GPS...';sub.textContent='Aguarde alguns segundos';try{await preflight();allowStart=true;startBtn.disabled=false;icon.textContent='🥾';title.textContent='INICIAR TRILHA';sub.textContent='GPS confirmado — iniciando';startBtn.click();setTimeout(()=>{sub.textContent='Primeiro confirmamos o GPS do seu celular';},1200);}catch(err){startBtn.disabled=false;icon.textContent='🥾';title.textContent='INICIAR TRILHA';sub.textContent='Primeiro confirmamos o GPS do seu celular';gpsError(err);}},true);

  const embeddedLogo=new Image(); embeddedLogo.src=LOGO_DATA; const generateBtn=$('#generateBtn');
  if(generateBtn)generateBtn.addEventListener('click',()=>{setTimeout(()=>{const canvas=$('#artCanvas');if(!canvas||!embeddedLogo.complete)return;const ctx=canvas.getContext('2d'),w=canvas.width,h=canvas.height,size=Math.round(Math.min(w,h)*.18),pad=Math.round(w*.045);ctx.save();ctx.shadowColor='rgba(0,0,0,.48)';ctx.shadowBlur=24;ctx.drawImage(embeddedLogo,pad,pad,size,size);ctx.restore();},120);},false);
})();
