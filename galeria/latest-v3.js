(() => {
  const $ = (s) => document.querySelector(s);
  let currentLatestId = '';

  const formatDatePremium = (iso) => {
    try { return new Intl.DateTimeFormat('pt-BR',{day:'2-digit',month:'long',year:'numeric'}).format(new Date(iso)); }
    catch { return ''; }
  };

  function addSocialLinks(){
    if (!document.querySelector('.hero-social')) {
      const target = document.querySelector('.hero-buttons');
      if (target) {
        const social = document.createElement('div');
        social.className = 'hero-social';
        social.innerHTML = `
          <span class="social-label">SIGA NOSSAS AVENTURAS</span>
          <a class="instagram-link" href="https://www.instagram.com/trilheiros.roomt/" target="_blank" rel="noopener noreferrer" aria-label="Instagram dos Trilheiros de Rondonópolis">
            <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5"></rect><circle cx="12" cy="12" r="4"></circle><circle cx="17.4" cy="6.7" r="1"></circle></svg>
            <span><small>Instagram</small><strong>@trilheiros.roomt</strong></span>
          </a>`;
        target.insertAdjacentElement('afterend', social);
      }
    }

    if (!document.querySelector('.footer-instagram')) {
      const footer = document.querySelector('.footer-copy');
      if (footer) {
        const link = document.createElement('a');
        link.className = 'footer-instagram';
        link.href = 'https://www.instagram.com/trilheiros.roomt/';
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        link.textContent = '📸 Instagram @trilheiros.roomt';
        footer.replaceWith(link);
      }
    }
  }

  function moveLabelsOffImages(){
    const latestBadge = document.querySelector('.latest-badge');
    const latestContent = document.querySelector('.latest-content');
    if (latestBadge && latestContent && latestBadge.parentElement !== latestContent) latestContent.prepend(latestBadge);

    document.querySelectorAll('#galleryGrid .album-item').forEach(card => {
      const media = card.querySelector('.album-image');
      const body = card.querySelector('.album-body');
      const tag = media?.querySelector('.trip-tag');
      if (tag && body) body.prepend(tag);
    });
  }

  function markNewestCard(){
    const cards = [...document.querySelectorAll('#galleryGrid .album-item')];
    cards.forEach(card => {
      card.classList.remove('is-newest');
      card.querySelector('.newest-ribbon')?.remove();
      card.querySelector('.newest-label')?.remove();
    });
    const first = cards[0];
    if (!first) return;
    first.classList.add('is-newest');
    const body = first.querySelector('.album-body');
    if (body) {
      const label = document.createElement('span');
      label.className = 'newest-label';
      label.textContent = '✨ Mais recente';
      body.prepend(label);
    }
    moveLabelsOffImages();
  }

  async function refreshLatest(){
    const card = $('#latestCard');
    if (!card) return;
    try {
      const res = await fetch('/api/posts',{headers:{Accept:'application/json'},cache:'no-store'});
      if (!res.ok) throw new Error('Falha ao carregar a última experiência');
      const data = await res.json();
      const posts = (Array.isArray(data.posts) ? data.posts : []).sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt));
      const latest = posts[0];
      const img = $('#latestPhoto');
      const placeholder = $('#latestPlaceholder');
      if (!latest) {
        img.hidden = true;
        img.removeAttribute('src');
        placeholder.hidden = false;
        $('#latestTrip').textContent = 'GALERIA DOS TRILHEIROS';
        $('#latestName').textContent = 'Compartilhe sua aventura';
        $('#latestDescription').textContent = 'A publicação mais recente ficará em destaque aqui na abertura do site e também continuará no álbum abaixo.';
        $('#latestDate').textContent = 'Memórias que ficam';
        moveLabelsOffImages();
        return;
      }
      placeholder.hidden = true;
      if (currentLatestId !== latest.id) {
        img.hidden = true;
        img.src = `/api/photo?id=${encodeURIComponent(latest.photoKey)}&v=${encodeURIComponent(latest.id)}`;
        img.alt = `Foto de ${latest.name} em ${latest.trip}`;
        img.onload = () => { img.hidden = false; };
        currentLatestId = latest.id;
      } else img.hidden = false;
      $('#latestTrip').textContent = latest.trip;
      $('#latestName').textContent = latest.name;
      $('#latestDescription').textContent = latest.description;
      $('#latestDate').textContent = formatDatePremium(latest.createdAt);
      moveLabelsOffImages();
    } catch (err) { console.warn(err); }
  }

  async function validateAdminKey(key){
    try {
      const res = await fetch('/api/admin-check',{
        method:'GET',
        headers:{'x-admin-key':key,'Accept':'application/json'},
        cache:'no-store'
      });
      const data = await res.json().catch(()=>({}));
      return {ok:res.ok && data.ok === true, message:data.message || 'Chave de administrador incorreta.'};
    } catch {
      return {ok:false,message:'Não foi possível validar o modo administrador agora.'};
    }
  }

  function installAdminValidation(){
    const button = $('#adminToggle');
    if (!button || button.dataset.secureAdmin === '1') return;
    button.dataset.secureAdmin = '1';

    button.addEventListener('click', async (event) => {
      event.preventDefault();
      event.stopImmediatePropagation();
      if (typeof state === 'undefined' || typeof setAdminMode !== 'function') return;

      if (state.adminMode) {
        setAdminMode(false);
        showToast('Modo ADM desativado.');
        return;
      }

      const key = prompt('Digite a chave do administrador:');
      if (!key) return;
      button.disabled = true;
      button.textContent = '⏳ Validando...';
      const result = await validateAdminKey(key.trim());
      button.disabled = false;
      if (!result.ok) {
        setAdminMode(false);
        showToast(result.message);
        return;
      }
      setAdminMode(true,key.trim());
      showToast('Modo ADM validado ✓ Agora você pode excluir fotos.');
    }, true);

    const saved = sessionStorage.getItem('trilheiros-admin-key');
    if (saved) {
      validateAdminKey(saved).then(result => {
        if (!result.ok && typeof setAdminMode === 'function') setAdminMode(false);
      });
    }
  }

  const grid = $('#galleryGrid');
  if (grid) new MutationObserver(()=>{markNewestCard();moveLabelsOffImages();}).observe(grid,{childList:true,subtree:true});

  const msg = $('#formMessage');
  if (msg) new MutationObserver(() => {
    if (!msg.hidden && /publicad/i.test(msg.textContent || '')) {
      setTimeout(refreshLatest,350);
      setTimeout(markNewestCard,700);
    }
  }).observe(msg,{childList:true,subtree:true,attributes:true});

  $('#refreshBtn')?.addEventListener('click',()=>setTimeout(refreshLatest,250));
  window.addEventListener('pageshow',refreshLatest);
  document.addEventListener('visibilitychange',()=>{ if (!document.hidden) refreshLatest(); });

  addSocialLinks();
  moveLabelsOffImages();
  installAdminValidation();
  refreshLatest();
  setInterval(()=>{ if(!document.hidden) refreshLatest(); },30000);
})();