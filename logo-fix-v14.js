(() => {
  'use strict';
  const LOGO = window.TRILHEIROS_LOGO_DATA || '';
  if (!LOGO) return;

  function applyLogoFix(){
    const selectors = [
      '.brand-logo-mini',
      '.hero-logo',
      '.tracking-logo img',
      'footer img'
    ];
    document.querySelectorAll(selectors.join(',')).forEach(img => {
      img.src = LOGO;
      img.style.display = 'block';
      img.style.opacity = '1';
      img.style.visibility = 'visible';
      img.style.background = 'transparent';
      img.style.borderRadius = '50%';
      img.style.objectFit = 'cover';
      img.style.clipPath = 'circle(49% at 50% 50%)';
      img.style.webkitClipPath = 'circle(49% at 50% 50%)';
    });

    const heroWrap = document.querySelector('.hero-logo-wrap');
    const hero = document.querySelector('.hero-logo');
    if (heroWrap) {
      heroWrap.style.width = '190px';
      heroWrap.style.height = '190px';
      heroWrap.style.margin = '0 auto 16px';
    }
    if (hero) {
      hero.style.width = '176px';
      hero.style.height = '176px';
      hero.style.opacity = '1';
      hero.style.transform = 'none';
      hero.style.animation = 'logoPremiumFloat 4s ease-in-out infinite';
      hero.style.filter = 'drop-shadow(0 16px 30px rgba(0,0,0,.42)) drop-shadow(0 0 20px rgba(241,198,111,.18))';
    }
  }

  const style = document.createElement('style');
  style.textContent = `
    .hero-logo-wrap{width:190px!important;height:190px!important;margin:0 auto 16px!important;overflow:visible!important}
    .hero-logo{width:176px!important;height:176px!important;display:block!important;opacity:1!important;visibility:visible!important;border-radius:50%!important;object-fit:cover!important;clip-path:circle(49% at 50% 50%)!important;-webkit-clip-path:circle(49% at 50% 50%)!important;background:transparent!important;transform:none!important;animation:logoPremiumFloat 4s ease-in-out infinite!important}
    .brand-logo-mini,.tracking-logo img,footer img{display:block!important;opacity:1!important;visibility:visible!important;border-radius:50%!important;object-fit:cover!important;clip-path:circle(49% at 50% 50%)!important;-webkit-clip-path:circle(49% at 50% 50%)!important;background:transparent!important}
    .brand-logo-mini{width:56px!important;height:56px!important}
    .tracking-logo img{width:44px!important;height:44px!important}
    @keyframes logoPremiumFloat{0%,100%{transform:translateY(0) scale(1)}50%{transform:translateY(-5px) scale(1.015)}}
  `;
  document.head.appendChild(style);

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', applyLogoFix, {once:true});
  else applyLogoFix();
  window.addEventListener('load', applyLogoFix, {once:true});
  setTimeout(applyLogoFix, 500);
})();
