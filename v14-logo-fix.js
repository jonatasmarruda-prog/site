(()=>{
  function applyLogo(){
    const data=window.TRILHEIROS_LOGO_DATA;
    if(!data)return;
    const selectors=['.brand-logo-mini','.hero-logo','.tracking-logo img','footer img'];
    document.querySelectorAll(selectors.join(',')).forEach(img=>{
      img.src=data;
      img.removeAttribute('srcset');
      img.style.background='transparent';
      img.style.objectFit='cover';
      img.style.borderRadius='50%';
      img.style.clipPath='circle(49% at 50% 50%)';
    });
    const hero=document.querySelector('.hero-logo');
    if(hero){
      hero.style.width='178px';hero.style.height='178px';
      hero.style.maxWidth='178px';hero.style.maxHeight='178px';
      hero.style.filter='drop-shadow(0 14px 30px rgba(0,0,0,.35))';
    }
    const wrap=document.querySelector('.hero-logo-wrap');
    if(wrap){wrap.style.width='196px';wrap.style.height='196px';}
    const mini=document.querySelector('.brand-logo-mini');
    if(mini){mini.style.width='58px';mini.style.height='58px';}
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',applyLogo,{once:true}); else applyLogo();
  setTimeout(applyLogo,300);
})();