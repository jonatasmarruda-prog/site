(() => {
  'use strict';
  const LOGO = window.TRILHEIROS_LOGO_DATA || '';
  const $ = s => document.querySelector(s);
  const $$ = s => [...document.querySelectorAll(s)];

  function applyBrand(){
    if (LOGO) {
      $$('.brand-logo-mini,.hero-logo,.tracking-logo img,footer img').forEach(img => {
        img.src = LOGO;
        img.removeAttribute('crossorigin');
        img.style.opacity = '1';
      });
    }

    const heroTitle = $('.hero-title');
    if (heroTitle) heroTitle.innerHTML = 'Pra onde vamos<br><span>hoje?</span>';

    let welcome = $('.welcome-kicker');
    if (!welcome && heroTitle) {
      welcome = document.createElement('div');
      welcome.className = 'welcome-kicker';
      heroTitle.parentNode.insertBefore(welcome, heroTitle);
    }
    if (welcome) {
      welcome.innerHTML = '<span class="welcome-hand">👋</span><div><b>BEM-VINDO, TRILHEIRO(A)!</b><small>Sua próxima aventura começa aqui.</small></div>';
    }
  }

  const style = document.createElement('style');
  style.textContent = `
    .hero-logo-wrap{width:170px!important;height:170px!important;margin:4px auto 14px!important;isolation:isolate}
    .hero-logo{width:154px!important;height:154px!important;object-fit:contain!important;border-radius:50%;opacity:0;transform:scale(.72) rotate(-7deg);animation:brandReveal .9s cubic-bezier(.2,.9,.25,1.15) .06s forwards,brandFloat 4.5s ease-in-out 1.1s infinite;filter:drop-shadow(0 16px 30px rgba(0,0,0,.52)) drop-shadow(0 0 22px rgba(241,198,111,.20))}
    .hero-ring{inset:1px!important;border:1px solid rgba(241,198,111,.62)!important;box-shadow:0 0 0 7px rgba(241,198,111,.035),0 0 48px rgba(241,198,111,.20)!important;animation:ringPulse 3.2s ease-in-out infinite}
    .hero-logo-wrap:after{content:"";position:absolute;inset:-14px;border-radius:50%;background:conic-gradient(from 210deg,transparent 0 64%,rgba(255,231,167,.38) 72%,transparent 82%);filter:blur(2px);animation:ringSpin 9s linear infinite;pointer-events:none;z-index:-1}
    .welcome-kicker{position:relative;z-index:3;display:flex;align-items:center;justify-content:center;gap:10px;width:max-content;max-width:96%;margin:4px auto 10px;padding:9px 13px;border:1px solid rgba(241,198,111,.20);border-radius:999px;background:linear-gradient(135deg,rgba(241,198,111,.10),rgba(110,212,193,.06));box-shadow:inset 0 1px rgba(255,255,255,.045),0 9px 24px rgba(0,0,0,.12);opacity:0;animation:welcomeRise .65s ease .3s forwards}
    .welcome-hand{font-size:18px;animation:wave 2.6s ease-in-out 1.1s infinite;transform-origin:70% 70%}
    .welcome-kicker b{display:block;font-size:9px;letter-spacing:.11em;color:#fff3cc}
    .welcome-kicker small{display:block;font-size:8px;color:#91a69e;margin-top:2px}
    .hero-title{font-size:clamp(40px,10.5vw,58px)!important;line-height:.93!important;letter-spacing:-.045em!important;margin:8px auto 13px!important}
    .hero-title span{background:linear-gradient(90deg,#fff0b2,#f1c66f,#dc9e44)!important;-webkit-background-clip:text!important;background-clip:text!important;color:transparent!important}
    .primary-btn{position:relative;overflow:hidden}
    #startBtn:after{content:"";position:absolute;top:-25%;left:-48%;width:26%;height:150%;background:linear-gradient(90deg,transparent,rgba(255,255,255,.18),transparent);transform:skewX(-17deg);animation:buttonShine 4.4s ease-in-out infinite;pointer-events:none}
    .install-card{display:flex!important;position:relative;overflow:hidden;border-color:rgba(241,198,111,.28)!important}
    .install-card:before{content:"";position:absolute;top:0;left:-55%;width:34%;height:100%;background:linear-gradient(90deg,transparent,rgba(255,255,255,.09),transparent);transform:skewX(-18deg);animation:installShine 5.2s ease-in-out infinite;pointer-events:none}
    .brand-logo-mini,.tracking-logo img,footer img{transition:opacity .3s ease,transform .3s ease}
    .brand-logo-mini{filter:drop-shadow(0 6px 18px rgba(0,0,0,.45)) drop-shadow(0 0 9px rgba(241,198,111,.12))}
    @keyframes brandReveal{to{opacity:1;transform:scale(1) rotate(0)}}
    @keyframes brandFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}
    @keyframes ringPulse{0%,100%{transform:scale(1);opacity:.78}50%{transform:scale(1.045);opacity:1}}
    @keyframes ringSpin{to{transform:rotate(360deg)}}
    @keyframes welcomeRise{from{opacity:0;transform:translateY(9px)}to{opacity:1;transform:none}}
    @keyframes wave{0%,70%,100%{transform:rotate(0)}76%{transform:rotate(18deg)}82%{transform:rotate(-8deg)}88%{transform:rotate(12deg)}}
    @keyframes buttonShine{0%,65%{left:-48%}84%,100%{left:128%}}
    @keyframes installShine{0%,66%{left:-55%}84%,100%{left:130%}}
    @media(prefers-reduced-motion:reduce){.hero-logo,.hero-ring,.hero-logo-wrap:after,.welcome-kicker,.welcome-hand,#startBtn:after,.install-card:before{animation:none!important;opacity:1!important;transform:none!important}}
  `;
  document.head.appendChild(style);

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', applyBrand, {once:true});
  } else {
    applyBrand();
  }
  window.addEventListener('load', applyBrand, {once:true});
})();