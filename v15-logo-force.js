(() => {
  'use strict';

  function getLogo(){
    const d=window.TRILHEIROS_LOGO_DATA;
    if(typeof d==='string' && d.startsWith('data:image/')) return d;
    return 'https://raw.githubusercontent.com/jonatasmarruda-prog/site/main/assets/logo-trilheiros.png';
  }

  const style=document.createElement('style');
  style.textContent=`
    .hero-logo-wrap{
      position:relative!important;
      width:240px!important;
      height:240px!important;
      margin:4px auto 20px!important;
      display:grid!important;
      place-items:center!important;
      overflow:visible!important;
      isolation:isolate!important;
    }
    .hero-logo-wrap::before{
      content:"";
      position:absolute;
      inset:2px;
      border-radius:50%;
      background:radial-gradient(circle,rgba(241,198,111,.18) 0,rgba(241,198,111,.06) 48%,transparent 72%);
      box-shadow:0 0 34px rgba(241,198,111,.18),0 0 72px rgba(77,201,160,.08);
      animation:trLogoPulse 3.2s ease-in-out infinite;
      z-index:-2;
    }
    .hero-logo-wrap::after{
      content:"";
      position:absolute;
      inset:12px;
      border-radius:50%;
      border:1.5px solid rgba(241,198,111,.55);
      box-shadow:inset 0 0 24px rgba(241,198,111,.08),0 0 20px rgba(241,198,111,.12);
      z-index:-1;
    }
    .hero-ring{display:none!important;}
    .hero-logo{
      width:205px!important;
      height:205px!important;
      display:block!important;
      opacity:1!important;
      visibility:visible!important;
      border-radius:50%!important;
      object-fit:cover!important;
      object-position:center!important;
      background:transparent!important;
      clip-path:circle(48% at 50% 50%)!important;
      -webkit-clip-path:circle(48% at 50% 50%)!important;
      transform:scale(1.18)!important;
      filter:drop-shadow(0 16px 28px rgba(0,0,0,.38)) drop-shadow(0 0 20px rgba(241,198,111,.18))!important;
      animation:trLogoFloat 4s ease-in-out infinite!important;
    }
    .brand-logo-mini,
    .tracking-logo img,
    footer img{
      display:block!important;
      opacity:1!important;
      visibility:visible!important;
      border-radius:50%!important;
      object-fit:cover!important;
      object-position:center!important;
      background:transparent!important;
      clip-path:circle(48% at 50% 50%)!important;
      -webkit-clip-path:circle(48% at 50% 50%)!important;
      transform:scale(1.16)!important;
    }
    .brand-logo-mini{width:58px!important;height:58px!important;}
    .tracking-logo img{width:48px!important;height:48px!important;}
    @keyframes trLogoFloat{0%,100%{translate:0 0}50%{translate:0 -6px}}
    @keyframes trLogoPulse{0%,100%{transform:scale(.98);opacity:.78}50%{transform:scale(1.04);opacity:1}}
  `;
  document.head.appendChild(style);

  function forceLogo(){
    const src=getLogo();

    const wrap=document.querySelector('.hero-logo-wrap');
    if(wrap){
      let img=wrap.querySelector('.hero-logo');
      if(!img){
        img=document.createElement('img');
        img.className='hero-logo';
        img.alt='Trilheiros de Rondonópolis';
        wrap.appendChild(img);
      }
      img.removeAttribute('crossorigin');
      img.src=src;
      img.style.display='block';
      img.style.opacity='1';
      img.style.visibility='visible';
      img.onerror=()=>{img.onerror=null;img.src='https://raw.githubusercontent.com/jonatasmarruda-prog/site/main/assets/logo-trilheiros.png'};
    }

    document.querySelectorAll('.brand-logo-mini,.tracking-logo img,footer img').forEach(img=>{
      img.removeAttribute('crossorigin');
      img.src=src;
      img.style.display='block';
      img.style.opacity='1';
      img.style.visibility='visible';
      img.onerror=()=>{img.onerror=null;img.src='https://raw.githubusercontent.com/jonatasmarruda-prog/site/main/assets/logo-trilheiros.png'};
    });

    try{
      if(typeof logoImg!=='undefined'){
        logoImg.removeAttribute?.('crossorigin');
        logoImg.src=src;
      }
    }catch(_){ }
  }

  function waitAndForce(attempt=0){
    const d=window.TRILHEIROS_LOGO_DATA;
    if((typeof d==='string'&&d.startsWith('data:image/')) || attempt>=20){
      forceLogo();
      setTimeout(forceLogo,300);
      setTimeout(forceLogo,1200);
      return;
    }
    setTimeout(()=>waitAndForce(attempt+1),100);
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',()=>waitAndForce(),{once:true});
  else waitAndForce();
  window.addEventListener('load',forceLogo,{once:true});
})();
