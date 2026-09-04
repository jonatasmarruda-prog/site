(() => {
  'use strict';
  const CDN_LOGO = 'https://cdn.jsdelivr.net/gh/jonatasmarruda-prog/site@main/assets/logo-trilheiros.png';
  const LOGO = window.TRILHEIROS_LOGO_DATA || CDN_LOGO;
  window.TRILHEIROS_LOGO_DATA = LOGO;

  function applyLogoFix(){
    const selectors = ['.brand-logo-mini','.hero-logo','.tracking-logo img','footer img'];
    document.querySelectorAll(selectors.join(',')).forEach(img => {
      img.crossOrigin = 'anonymous';
      img.src = LOGO;
      img.style.display = 'block';
      img.style.opacity = '1';
      img.style.visibility = 'visible';
      img.style.background = 'transparent';
      img.style.borderRadius = '50%';
      img.style.objectFit = 'cover';
      img.style.clipPath = 'circle(48% at 50% 50%)';
      img.style.webkitClipPath = 'circle(48% at 50% 50%)';
    });

    const heroWrap = document.querySelector('.hero-logo-wrap');
    const hero = document.querySelector('.hero-logo');
    if (heroWrap) {
      heroWrap.style.width = '220px';
      heroWrap.style.height = '220px';
      heroWrap.style.margin = '0 auto 16px';
    }
    if (hero) {
      hero.style.width = '202px';
      hero.style.height = '202px';
      hero.style.opacity = '1';
      hero.style.transform = 'none';
      hero.style.animation = 'logoPremiumFloat 4s ease-in-out infinite';
      hero.style.filter = 'drop-shadow(0 16px 30px rgba(0,0,0,.42)) drop-shadow(0 0 20px rgba(241,198,111,.18))';
    }
    try { if (typeof logoImg !== 'undefined') { logoImg.crossOrigin='anonymous'; logoImg.src=LOGO; } } catch(_) {}
  }

  const style = document.createElement('style');
  style.textContent = `
    .hero-logo-wrap{width:220px!important;height:220px!important;margin:0 auto 16px!important;overflow:visible!important}
    .hero-logo{width:202px!important;height:202px!important;display:block!important;opacity:1!important;visibility:visible!important;border-radius:50%!important;object-fit:cover!important;clip-path:circle(48% at 50% 50%)!important;-webkit-clip-path:circle(48% at 50% 50%)!important;background:transparent!important;transform:none!important;animation:logoPremiumFloat 4s ease-in-out infinite!important}
    .brand-logo-mini,.tracking-logo img,footer img{display:block!important;opacity:1!important;visibility:visible!important;border-radius:50%!important;object-fit:cover!important;clip-path:circle(48% at 50% 50%)!important;-webkit-clip-path:circle(48% at 50% 50%)!important;background:transparent!important}
    .brand-logo-mini{width:60px!important;height:60px!important}
    .tracking-logo img{width:46px!important;height:46px!important}
    @keyframes logoPremiumFloat{0%,100%{transform:translateY(0) scale(1)}50%{transform:translateY(-5px) scale(1.015)}}
  `;
  document.head.appendChild(style);

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', applyLogoFix, {once:true});
  else applyLogoFix();
  window.addEventListener('load', applyLogoFix, {once:true});
  setTimeout(applyLogoFix, 300);
  setTimeout(applyLogoFix, 1200);
})();
