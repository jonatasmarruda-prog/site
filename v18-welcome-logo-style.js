(() => {
  'use strict';
  const PROFILE_KEY='trilheiros_profile_name';

  function fixWelcome(){
    const name=(localStorage.getItem(PROFILE_KEY)||'').trim();
    if(name){
      document.querySelectorAll('.welcome-premium').forEach(el=>el.remove());
      const box=document.querySelector('#welcomeUser');
      if(box){
        const n=box.querySelector('#welcomeName');
        if(n)n.textContent=name;
      }
    }
  }

  function polishLogo(){
    const logo=window.TRILHEIROS_LOGO_DATA;
    if(!logo)return;
    document.querySelectorAll('.brand-logo-mini,.hero-logo,.tracking-logo img,footer img').forEach(img=>{
      if(img.src!==logo)img.src=logo;
      img.style.opacity='1';
      img.style.visibility='visible';
      img.style.display='block';
    });
  }

  const style=document.createElement('style');
  style.textContent=`
    /* LOGO CENTRAL: recorte interno para eliminar toda a margem preta do arquivo */
    .hero-logo-wrap{
      width:224px!important;
      height:224px!important;
      margin:0 auto 18px!important;
      display:grid!important;
      place-items:center!important;
      border-radius:50%!important;
      overflow:hidden!important;
      background:radial-gradient(circle,rgba(241,198,111,.13),rgba(12,47,38,.04) 66%,transparent 70%)!important;
      border:1px solid rgba(241,198,111,.22)!important;
      box-shadow:0 0 0 8px rgba(241,198,111,.025),0 18px 45px rgba(0,0,0,.22),0 0 42px rgba(241,198,111,.12)!important;
    }
    .hero-logo-wrap::before,.hero-logo-wrap::after,.hero-ring{display:none!important;}
    .hero-logo{
      width:246px!important;
      height:246px!important;
      max-width:none!important;
      flex:none!important;
      object-fit:cover!important;
      object-position:center!important;
      background:transparent!important;
      border:0!important;
      border-radius:50%!important;
      clip-path:none!important;
      -webkit-clip-path:none!important;
      transform:none!important;
      animation:logoCleanFloat 4.2s ease-in-out infinite!important;
      image-rendering:auto!important;
      filter:contrast(1.035) saturate(1.025) drop-shadow(0 14px 25px rgba(0,0,0,.28))!important;
    }
    @keyframes logoCleanFloat{0%,100%{translate:0 0}50%{translate:0 -3px}}

    /* Demais logos: recorte circular mais fechado para não mostrar os cantos pretos */
    .brand-logo-mini,.tracking-logo img,footer img{
      object-fit:cover!important;
      object-position:center!important;
      background:transparent!important;
      border-radius:50%!important;
      clip-path:circle(46% at 50% 50%)!important;
      -webkit-clip-path:circle(46% at 50% 50%)!important;
      image-rendering:auto!important;
      filter:contrast(1.03) saturate(1.02)!important;
    }

    /* Com nome salvo, fica somente uma saudação personalizada. */
    .welcome-premium{display:none!important;}
    #welcomeUser{margin-top:11px!important;margin-bottom:8px!important;}
    #welcomeUser .welcome-user{margin-bottom:2px!important;}
  `;
  document.head.appendChild(style);

  function run(){fixWelcome();polishLogo()}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',run,{once:true});
  else run();
  window.addEventListener('pageshow',run);
  window.addEventListener('load',run,{once:true});
  setTimeout(run,250);
  setTimeout(run,900);
})();
