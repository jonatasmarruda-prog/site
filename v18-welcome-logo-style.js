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

  const style=document.createElement('style');
  style.textContent=`
    .hero-logo-wrap{width:250px!important;height:250px!important;margin:0 auto 18px!important;}
    .hero-logo{
      width:225px!important;height:225px!important;
      object-fit:contain!important;
      object-position:center!important;
      background:transparent!important;
      border-radius:50%!important;
      clip-path:circle(49.5% at 50% 50%)!important;
      -webkit-clip-path:circle(49.5% at 50% 50%)!important;
      image-rendering:auto!important;
      filter:drop-shadow(0 18px 32px rgba(0,0,0,.42)) drop-shadow(0 0 25px rgba(241,198,111,.22))!important;
    }
    .brand-logo-mini,.tracking-logo img,footer img{
      object-fit:contain!important;
      background:transparent!important;
      border-radius:50%!important;
      clip-path:circle(49.5% at 50% 50%)!important;
      -webkit-clip-path:circle(49.5% at 50% 50%)!important;
      image-rendering:auto!important;
    }
    .welcome-premium{display:none!important;}
    #welcomeUser{margin-top:10px!important;}
  `;
  document.head.appendChild(style);

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',fixWelcome,{once:true});
  else fixWelcome();
  window.addEventListener('pageshow',fixWelcome);
  setTimeout(fixWelcome,300);
  setTimeout(fixWelcome,1000);
})();
