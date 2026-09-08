(() => {
  const $ = (s) => document.querySelector(s);
  let currentLatestId = '';

  const formatDatePremium = (iso) => {
    try { return new Intl.DateTimeFormat('pt-BR',{day:'2-digit',month:'long',year:'numeric'}).format(new Date(iso)); }
    catch { return ''; }
  };

  function markNewestCard(){
    const cards = [...document.querySelectorAll('#galleryGrid .album-item')];
    cards.forEach(card => { card.classList.remove('is-newest'); card.querySelector('.newest-ribbon')?.remove(); });
    const first = cards[0];
    if (!first) return;
    first.classList.add('is-newest');
    const media = first.querySelector('.album-image');
    if (media && !media.querySelector('.newest-ribbon')) {
      const ribbon = document.createElement('span');
      ribbon.className = 'newest-ribbon';
      ribbon.textContent = 'Mais recente';
      media.appendChild(ribbon);
    }
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
        return;
      }

      placeholder.hidden = true;
      if (currentLatestId !== latest.id) {
        img.hidden = true;
        img.src = `/api/photo?id=${encodeURIComponent(latest.photoKey)}&v=${encodeURIComponent(latest.id)}`;
        img.alt = `Foto de ${latest.name} em ${latest.trip}`;
        img.onload = () => { img.hidden = false; };
        currentLatestId = latest.id;
      } else {
        img.hidden = false;
      }

      $('#latestTrip').textContent = latest.trip;
      $('#latestName').textContent = latest.name;
      $('#latestDescription').textContent = latest.description;
      $('#latestDate').textContent = formatDatePremium(latest.createdAt);
    } catch (err) {
      console.warn(err);
    }
  }

  const grid = $('#galleryGrid');
  if (grid) new MutationObserver(markNewestCard).observe(grid,{childList:true});

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

  refreshLatest();
  setInterval(() => {
    if (!document.hidden) refreshLatest();
  }, 30000);
})();
