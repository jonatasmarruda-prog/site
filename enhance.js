(() => {
  const $ = s => document.querySelector(s);
  const startBtn = $('#startBtn');
  const installBtn = $('#installBtn');
  if (!startBtn || !installBtn) return;

  const style = document.createElement('style');
  style.textContent = `
    .tr-modal{position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,.74);backdrop-filter:blur(10px);display:none;align-items:flex-end;justify-content:center;padding:14px}.tr-modal.show{display:flex}.tr-sheet{width:min(560px,100%);background:linear-gradient(160deg,#10372f,#061b17);border:1px solid rgba(241,197,107,.25);border-radius:28px;padding:18px;color:#f7f1df;box-shadow:0 35px 90px rgba(0,0,0,.65)}.tr-handle{width:44px;height:4px;border-radius:99px;background:#ffffff22;margin:0 auto 14px}.tr-icon{font-size:36px}.tr-sheet h3{font-size:22px;margin:8px 0 6px}.tr-sheet>p{color:#9fb0ab;font-size:12px;line-height:1.5;margin:0}.tr-steps{display:grid;gap:8px;margin:14px 0}.tr-step{display:flex;gap:10px;padding:11px;border-radius:14px;background:#ffffff09;border:1px solid #ffffff0d}.tr-num{width:27px;height:27px;border-radius:9px;display:grid;place-items:center;background:#f1c56b18;color:#f1c56b;font-size:10px;font-weight:900;flex:none}.tr-step b{display:block;font-size:11px}.tr-step span{display:block;color:#879b95;font-size:9px;margin-top:2px;line-height:1.4}.tr-close{width:100%;height:50px;border:1px solid #ffffff12;border-radius:15px;background:#14382f;color:#fff;font-weight:900}.install-card{display:flex!important}.install-card.installed{border-color:rgba(70,218,148,.28)!important;background:rgba(70,218,148,.08)!important}
  `;
  document.head.appendChild(style);

  const modal = document.createElement('div');
  modal.className = 'tr-modal';
  modal.innerHTML = `<div class="tr-sheet"><div class="tr-handle"></div><div class="tr-icon">📲</div><h3></h3><p></p><div class="tr-steps"></div><button class="tr-close">ENTENDI</button></div>`;
  document.body.appendChild(modal);
  const openModal = (icon,title,text,steps=[]) => {
    modal.querySelector('.tr-icon').textContent = icon;
    modal.querySelector('h3').textContent = title;
    modal.querySelector('p').textContent = text;
    modal.querySelector('.tr-steps').innerHTML = steps.map((s,i)=>`<div class="tr-step"><span class="tr-num">${i+1}</span><div><b>${s[0]}</b><span>${s[1]}</span></div></div>`).join('');
    modal.classList.add('show');
  };
  const closeModal = () => modal.classList.remove('show');
  modal.querySelector('.tr-close').onclick = closeModal;
  modal.addEventListener('click', e => { if (e.target === modal) closeModal(); });

  const standalone = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  const updateInstall = () => {
    if (standalone()) {
      installBtn.classList.add('installed');
      installBtn.querySelector('.install-icon').textContent = '✓';
      installBtn.querySelector('strong').textContent = 'TRILHEIROS GPS INSTALADO';
      installBtn.querySelector('span').textContent = 'Você já está usando como aplicativo';
      installBtn.querySelector('.install-arrow').textContent = '';
    }
  };
  updateInstall();
  addEventListener('appinstalled', updateInstall);

  installBtn.addEventListener('click', () => {
    if (standalone()) return;
    setTimeout(() => {
      if (typeof deferredInstall !== 'undefined' && deferredInstall) return;
      const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
      if (ios) {
        openModal('📱','Instalar no iPhone','No iPhone, use o Safari para adicionar o Trilheiros GPS à tela inicial.',[
          ['Abra no Safari','Se este link estiver dentro de outro aplicativo, escolha Abrir no Safari.'],
          ['Toque em Compartilhar','Use o ícone do quadrado com a seta para cima.'],
          ['Adicionar à Tela de Início','Confirme em Adicionar.']
        ]);
      } else {
        openModal('📲','Instalar no Android','Se a instalação automática não aparecer, faça pelo Google Chrome.',[
          ['Abra no Google Chrome','Se estiver dentro de WhatsApp, ChatGPT ou Instagram, toque em ⋮ e escolha Abrir no Chrome.'],
          ['Toque no menu ⋮','Fica no canto superior direito do Chrome.'],
          ['Escolha Instalar app','Também pode aparecer como Adicionar à tela inicial.']
        ]);
      }
    }, 100);
  });

  let allowStart = false;
  const getPos = opts => new Promise((resolve,reject)=>navigator.geolocation.getCurrentPosition(resolve,reject,opts));
  async function preflight() {
    if (!isSecureContext || !navigator.geolocation) throw {code:'unsupported'};
    try {
      if (navigator.permissions?.query) {
        const p = await navigator.permissions.query({name:'geolocation'});
        if (p.state === 'denied') throw {code:1};
      }
    } catch (e) { if (e?.code === 1) throw e; }
    try { return await getPos({enableHighAccuracy:true,maximumAge:0,timeout:18000}); }
    catch (e) {
      if (e.code === 1) throw e;
      return await getPos({enableHighAccuracy:false,maximumAge:30000,timeout:10000});
    }
  }
  function gpsError(err) {
    if (err?.code === 1) return openModal('🔒','Permita a localização','O Trilheiros GPS precisa da localização para medir a trilha.',[
      ['Abra as permissões do site','No Chrome, toque no cadeado ou em ⋮ > Configurações do site.'],
      ['Permita Localização','Ative também a localização precisa, se aparecer.'],
      ['Tente novamente','Volte e toque em Iniciar Trilha.']
    ]);
    if (err?.code === 2) return openModal('🛰️','GPS sem posição','O celular não conseguiu determinar sua localização agora.',[
      ['Ative a Localização','Confira o botão Localização/GPS nas configurações rápidas.'],
      ['Vá para uma área aberta','Telhados e paredes podem atrasar o primeiro sinal.'],
      ['Tente novamente','Aguarde alguns segundos e inicie outra vez.']
    ]);
    if (err?.code === 3) return openModal('⏱️','GPS demorou para responder','O primeiro sinal pode demorar alguns segundos.',[
      ['Use localização precisa','Autorize quando o Android perguntar.'],
      ['Fique em área aberta','Depois toque em Iniciar Trilha novamente.']
    ]);
    openModal('🛰️','Não foi possível acessar o GPS','Abra o link no Google Chrome e confirme que a localização do celular está ligada.',[
      ['Abra no Chrome','Navegadores internos podem limitar o GPS.'],
      ['Permita localização','Autorize o acesso quando for solicitado.']
    ]);
  }

  startBtn.addEventListener('click', async e => {
    if (allowStart) { allowStart = false; return; }
    e.preventDefault(); e.stopImmediatePropagation();
    if (startBtn.disabled) return;
    const icon = startBtn.querySelector('.start-icon');
    const title = startBtn.querySelector('strong');
    const sub = startBtn.querySelector('small');
    startBtn.disabled = true; icon.textContent = '🛰️'; title.textContent = 'CONFIRMANDO GPS...'; sub.textContent = 'Aguarde alguns segundos';
    try {
      await preflight();
      allowStart = true;
      startBtn.disabled = false;
      icon.textContent = '🥾'; title.textContent = 'INICIAR TRILHA'; sub.textContent = 'GPS confirmado — iniciando';
      startBtn.click();
      setTimeout(()=>{ sub.textContent = 'Primeiro confirmamos o GPS do seu celular'; },1200);
    } catch (err) {
      startBtn.disabled = false; icon.textContent = '🥾'; title.textContent = 'INICIAR TRILHA'; sub.textContent = 'Primeiro confirmamos o GPS do seu celular';
      gpsError(err);
    }
  }, true);

  if (typeof onGpsError === 'function') {
    onGpsError = err => {
      const b = $('#gpsBadge');
      if (b) { b.className = 'badge gps-search'; b.textContent = err.code === 1 ? 'PERMISSÃO GPS' : 'RECONECTANDO GPS'; }
      if (err.code === 1) gpsError(err);
    };
  }
})();
