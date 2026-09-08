(() => {
  const $ = (s) => document.querySelector(s);
  let latestId = '';
  let adminBusy = false;
  let latestRetry = 0;

  /* Carrega o refinamento V5 depois do CSS anterior, sem depender de cache antigo. */
  if (!document.querySelector('link[data-premium-v5]')) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = './premium-v5.css?v=5.1';
    link.dataset.premiumV5 = 'true';
    document.head.appendChild(link);
  }

  const fmtDate = (iso) => {
    try { return new Intl.DateTimeFormat('pt-BR',{day:'2-digit',month:'long',year:'numeric'}).format(new Date(iso)); }
    catch { return ''; }
  };

  function normalizeAlbumCards(){
    const cards = [...document.querySelectorAll('#galleryGrid .album-item')];
    cards.forEach((card,index) => {
      card.classList.toggle('is-newest', index === 0);
      const media = card.querySelector('.album-image');
      const body = card.querySelector('.album-body');
      if (!media || !body) return;

      let row = body.querySelector('.album-tag-row');
      if (!row) {
        row = document.createElement('div');
        row.className = 'album-tag-row';
        body.prepend(row);
      }

      const trip = media.querySelector(':scope > .trip-tag');
      if (trip) row.appendChild(trip);

      media.querySelectorAll('.newest-ribbon,.newest-pill').forEach(el => el.remove());
      row.querySelectorAll('.newest-ribbon,.newest-pill').forEach(el => el.remove());

      if (index === 0) {
        const newest = document.createElement('span');
        newest.className = 'newest-pill';
        newest.textContent = '✨ Mais recente';
        row.appendChild(newest);
      }
    });
  }

  function showLatestImage(img, placeholder, latest){
    if (!img) return;
    const src = `/api/photo?id=${encodeURIComponent(latest.photoKey)}&v=${encodeURIComponent(latest.id)}`;
    const preload = new Image();
    preload.decoding = 'async';
    preload.fetchPriority = 'high';
    preload.onload = () => {
      img.src = src;
      img.alt = `Foto de ${latest.name} em ${latest.trip}`;
      img.hidden = false;
      if (placeholder) placeholder.hidden = true;
      latestRetry = 0;
    };
    preload.onerror = () => {
      if (latestRetry < 1) {
        latestRetry++;
        setTimeout(() => showLatestImage(img,placeholder,latest),700);
      } else {
        img.hidden = true;
        if (placeholder) placeholder.hidden = false;
      }
    };
    preload.src = src;
  }

  async function refreshLatest(){
    const card = $('#latestCard');
    if (!card) return;
    try {
      const res = await fetch('/api/posts',{headers:{Accept:'application/json'},cache:'no-store'});
      if (!res.ok) throw new Error('Falha ao carregar');
      const data = await res.json();
      const posts = (Array.isArray(data.posts) ? data.posts : []).sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt));
      const latest = posts[0];
      const img = $('#latestPhoto');
      const placeholder = $('#latestPlaceholder');

      document.body.classList.toggle('has-latest-post',Boolean(latest));

      if (!latest) {
        latestId = '';
        if (img) { img.hidden = true; img.removeAttribute('src'); }
        if (placeholder) placeholder.hidden = false;
        $('#latestTrip').textContent = 'GALERIA DOS TRILHEIROS';
        $('#latestName').textContent = 'Compartilhe sua aventura';
        $('#latestDescription').textContent = 'A publicação mais recente ficará em destaque aqui e continuará normalmente no álbum.';
        $('#latestDate').textContent = 'Memórias que ficam';
        normalizeAlbumCards();
        return;
      }

      if (img && latestId !== latest.id) {
        img.hidden = true;
        showLatestImage(img,placeholder,latest);
        latestId = latest.id;
      } else if (img && img.src) {
        img.hidden = false;
        if (placeholder) placeholder.hidden = true;
      }

      $('#latestTrip').textContent = latest.trip || 'GALERIA DOS TRILHEIROS';
      $('#latestName').textContent = latest.name || 'Nova experiência';
      $('#latestDescription').textContent = latest.description || '';
      $('#latestDate').textContent = fmtDate(latest.createdAt);
      normalizeAlbumCards();
    } catch (err) {
      console.warn('Destaque:',err);
    }
  }

  async function validateAdminKey(key){
    const res = await fetch('/api/admin-check',{method:'GET',headers:{'x-admin-key':key},cache:'no-store'});
    const data = await res.json().catch(()=>({}));
    if (!res.ok || !data.ok) throw new Error(data.message || 'Chave de administrador inválida.');
    return true;
  }

  document.addEventListener('click', async (event) => {
    const btn = event.target.closest('#adminToggle');
    if (!btn) return;

    event.preventDefault();
    event.stopImmediatePropagation();

    if (typeof state !== 'undefined' && state.adminMode) {
      if (typeof setAdminMode === 'function') setAdminMode(false);
      if (typeof showToast === 'function') showToast('Modo ADM desativado.');
      return;
    }
    if (adminBusy) return;

    const key = prompt('Digite a chave do administrador:');
    if (!key) return;

    adminBusy = true;
    btn.disabled = true;
    const original = btn.textContent;
    btn.textContent = '⏳ Validando...';
    try {
      await validateAdminKey(key.trim());
      if (typeof setAdminMode === 'function') setAdminMode(true,key.trim());
      if (typeof showToast === 'function') showToast('Modo ADM validado. Agora você pode excluir fotos.');
    } catch (err) {
      if (typeof setAdminMode === 'function') setAdminMode(false);
      alert(err.message || 'Chave de administrador inválida.');
    } finally {
      adminBusy = false;
      btn.disabled = false;
      if (!(typeof state !== 'undefined' && state.adminMode)) btn.textContent = original;
    }
  }, true);

  async function validateRestoredAdmin(){
    if (typeof state === 'undefined' || !state.adminMode || !state.adminKey) return;
    try { await validateAdminKey(state.adminKey); }
    catch { if (typeof setAdminMode === 'function') setAdminMode(false); }
  }

  const grid = $('#galleryGrid');
  if (grid) new MutationObserver(() => setTimeout(normalizeAlbumCards,0)).observe(grid,{childList:true});

  const msg = $('#formMessage');
  if (msg) {
    new MutationObserver(() => {
      if (!msg.hidden && /publicad/i.test(msg.textContent || '')) {
        setTimeout(refreshLatest,220);
        setTimeout(normalizeAlbumCards,420);
      }
    }).observe(msg,{childList:true,subtree:true,attributes:true});
  }

  $('#refreshBtn')?.addEventListener('click',()=>setTimeout(refreshLatest,120));
  window.addEventListener('pageshow',()=>{refreshLatest();validateRestoredAdmin();});
  document.addEventListener('visibilitychange',()=>{if(!document.hidden){refreshLatest();validateRestoredAdmin();}});

  setTimeout(normalizeAlbumCards,200);
  setTimeout(validateRestoredAdmin,250);
  refreshLatest();
  setInterval(()=>{if(!document.hidden) refreshLatest();},15000);
})();
