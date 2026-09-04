(() => {
  'use strict';
  const PROFILE_KEY='trilheiros_profile_name';

  function applyFinalFix(){
    const savedName=(localStorage.getItem(PROFILE_KEY)||'').trim();

    // Remove de verdade a saudação genérica criada pela camada antiga.
    document.querySelectorAll('.welcome-premium').forEach(el=>el.remove());

    // Mantém somente a saudação personalizada.
    const box=document.querySelector('#welcomeUser');
    if(box && savedName){
      const n=box.querySelector('#welcomeName');
      if(n)n.textContent=savedName;
      box.style.display='block';
    }

    // Corrige o enquadramento real da logo original sem recriar a arte.
    const heroWrap=document.querySelector('.hero-logo-wrap');
    const hero=document.querySelector('.hero-logo');
    if(heroWrap){
      heroWrap.style.width='238px';
      heroWrap.style.height='238px';
      heroWrap.style.margin='2px auto 18px';
      heroWrap.style.overflow='hidden';
      heroWrap.style.borderRadius='50%';
    }
    if(hero){
      hero.style.width='254px';
      hero.style.height='258px';
      hero.style.maxWidth='none';
      hero.style.objectFit='fill';
      hero.style.objectPosition='center';
      hero.style.position='relative';
      hero.style.left='-8px';
      hero.style.top='-9px';
      hero.style.borderRadius='0';
      hero.style.clipPath='none';
      hero.style.webkitClipPath='none';
      hero.style.background='transparent';
      hero.style.transform='none';
      hero.style.filter='drop-shadow(0 14px 28px rgba(0,0,0,.38)) drop-shadow(0 0 24px rgba(241,198,111,.18))';
      hero.style.imageRendering='auto';
    }

    // Mesmo recorte nas versões menores da marca.
    document.querySelectorAll('.brand-logo-mini,.tracking-logo img,footer img').forEach(img=>{
      const parent=img.parentElement;
      if(parent){ parent.style.overflow='hidden'; parent.style.borderRadius='50%'; }
      img.style.width='108%';
      img.style.height='110%';
      img.style.maxWidth='none';
      img.style.objectFit='fill';
      img.style.position='relative';
      img.style.left='-3.5%';
      img.style.top='-3%';
      img.style.borderRadius='0';
      img.style.clipPath='none';
      img.style.webkitClipPath='none';
      img.style.transform='none';
      img.style.imageRendering='auto';
      img.style.background='transparent';
    });
  }

  const style=document.createElement('style');
  style.textContent=`
    .welcome-premium{display:none!important}
    #welcomeUser{margin-top:10px!important}
    .hero-logo-wrap{overflow:hidden!important;border-radius:50%!important}
  `;
  document.head.appendChild(style);

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',applyFinalFix,{once:true});
  else applyFinalFix();
  window.addEventListener('pageshow',applyFinalFix);
  window.addEventListener('load',applyFinalFix,{once:true});
  setTimeout(applyFinalFix,250);
  setTimeout(applyFinalFix,900);
})();