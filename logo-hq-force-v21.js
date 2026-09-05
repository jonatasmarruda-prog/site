(() => {
  'use strict';
  const LOGO = window.TRILHEIROS_LOGO_DATA;
  if (!LOGO || !LOGO.startsWith('data:image/')) return;

  function applyLogo(){
    document.querySelectorAll('.brand-logo-mini,.hero-logo,.tracking-logo img,footer img').forEach(img=>{
      img.removeAttribute('srcset');
      img.removeAttribute('crossorigin');
      img.src = LOGO;
      img.style.display='block';
      img.style.opacity='1';
      img.style.visibility='visible';
      img.style.background='transparent';
      img.style.imageRendering='auto';
    });
    try { if (typeof logoImg !== 'undefined') logoImg.src = LOGO; } catch(_){}
  }

  const style=document.createElement('style');
  style.textContent=`
    .hero-logo-wrap{
      width:215px!important;height:215px!important;
      margin:4px auto 18px!important;
      overflow:hidden!important;border-radius:50%!important;
      display:grid!important;place-items:center!important;
      background:transparent!important;
      box-shadow:0 0 0 1px rgba(241,198,111,.34),0 0 34px rgba(241,198,111,.18)!important;
    }
    .hero-logo{
      width:256px!important;height:256px!important;max-width:none!important;
      object-fit:contain!important;object-position:center!important;
      position:static!important;transform:none!important;
      border-radius:0!important;clip-path:none!important;-webkit-clip-path:none!important;
      background:transparent!important;
      filter:drop-shadow(0 8px 18px rgba(0,0,0,.24))!important;
    }
    .brand-mini,.tracking-logo,footer{overflow:visible!important}
    .brand-logo-mini,.tracking-logo img,footer img{
      object-fit:contain!important;object-position:center!important;
      border-radius:50%!important;background:transparent!important;
    }
    .brand-logo-mini{transform:scale(1.19)!important;clip-path:circle(42% at 50% 50%)!important;-webkit-clip-path:circle(42% at 50% 50%)!important}
    .tracking-logo img,footer img{transform:scale(1.19)!important;clip-path:circle(42% at 50% 50%)!important;-webkit-clip-path:circle(42% at 50% 50%)!important}
  `;
  document.head.appendChild(style);
  applyLogo();
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',applyLogo,{once:true});
  window.addEventListener('load',applyLogo,{once:true});
  window.addEventListener('pageshow',applyLogo);
  setTimeout(applyLogo,150);
  setTimeout(applyLogo,700);
})();