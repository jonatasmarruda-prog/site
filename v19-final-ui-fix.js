(() => {
  'use strict';
  const PROFILE_KEY='trilheiros_profile_name';

  function applyFinalFix(){
    const savedName=(localStorage.getItem(PROFILE_KEY)||'').trim();

    // A saudacao generica antiga nao deve coexistir com a personalizada.
    document.querySelectorAll('.welcome-premium').forEach(el=>el.remove());

    const box=document.querySelector('#welcomeUser');
    if(box){
      const n=box.querySelector('#welcomeName');
      if(savedName){
        if(n)n.textContent=savedName;
        box.style.display='block';
      }
    }

    // Logo original: enquadramento circular sem deformar a arte.
    const heroWrap=document.querySelector('.hero-logo-wrap');
    const hero=document.querySelector('.hero-logo');
    if(heroWrap){
      heroWrap.style.width='205px';
      heroWrap.style.height='205px';
      heroWrap.style.margin='4px auto 18px';
      heroWrap.style.overflow='hidden';
      heroWrap.style.borderRadius='50%';
      heroWrap.style.position='relative';
      heroWrap.style.boxShadow='0 0 0 1px rgba(241,198,111,.28), 0 0 34px rgba(241,198,111,.16)';
    }
    if(hero){
      hero.style.width='224px';
      hero.style.height='228px';
      hero.style.maxWidth='none';
      hero.style.objectFit='cover';
      hero.style.objectPosition='center';
      hero.style.position='absolute';
      hero.style.left='50%';
      hero.style.top='50%';
      hero.style.borderRadius='0';
      hero.style.clipPath='none';
      hero.style.webkitClipPath='none';
      hero.style.background='transparent';
      hero.style.transform='translate(-50%,-50%)';
      hero.style.filter='drop-shadow(0 0 18px rgba(241,198,111,.20))';
      hero.style.imageRendering='auto';
    }

    // Mesmo principio nas marcas menores: recorta o quadrado, preserva o desenho.
    document.querySelectorAll('.brand-logo-mini,.tracking-logo img,footer img').forEach(img=>{
      const parent=img.parentElement;
      if(parent){
        parent.style.overflow='hidden';
        parent.style.borderRadius='50%';
        parent.style.position='relative';
      }
      img.style.width='112%';
      img.style.height='114%';
      img.style.maxWidth='none';
      img.style.objectFit='cover';
      img.style.objectPosition='center';
      img.style.position='absolute';
      img.style.left='50%';
      img.style.top='50%';
      img.style.borderRadius='0';
      img.style.clipPath='none';
      img.style.webkitClipPath='none';
      img.style.transform='translate(-50%,-50%)';
      img.style.imageRendering='auto';
      img.style.background='transparent';
      img.style.filter='none';
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
  setTimeout(applyFinalFix,120);
  setTimeout(applyFinalFix,500);
  setTimeout(applyFinalFix,1200);
})();