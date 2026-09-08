(() => {
  const $ = (s, root=document) => root.querySelector(s);
  const $$ = (s, root=document) => [...root.querySelectorAll(s)];
  const state = { posts:[], blob:null, previewUrl:'', admin:false, adminKey:'', rating:0 };
  const PROFANITY=['porra','caralho','merda','bosta','puta','puto','fdp','foda','cacete','idiota','imbecil','otario','otário','babaca','arrombado'];
  const NEGATIVE=['nao gostei','não gostei','nao recomendo','não recomendo','nunca mais','muito ruim','horrivel','horrível','pessimo','péssimo','decepcionante','desorganizado','lixo','ridiculo','ridículo','golpe','odiei','detestei'];
  const esc = (text='') => String(text).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const normalize = (text='') => String(text).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9\s]/g,' ').replace(/\s+/g,' ').trim();
  const moderate = (text='') => {const n=normalize(text);if(PROFANITY.some(x=>n.includes(normalize(x))))return{ok:false,message:'A mensagem contém linguagem ofensiva.'};if(NEGATIVE.some(x=>n.includes(normalize(x))))return{ok:false,message:'Reescreva a experiência de forma respeitosa e positiva.'};return{ok:true};};
  const formatDate = (value) => { if(!value) return 'Publicado recentemente'; try{ const d=/^\d{4}-\d{2}-\d{2}$/.test(value)?new Date(value+'T12:00:00'):new Date(value); return new Intl.DateTimeFormat('pt-BR',{day:'2-digit',month:'long',year:'numeric'}).format(d);}catch{return 'Publicado recentemente'} };
  const starsText = (rating) => { const n=Math.max(0,Math.min(5,Number(rating)||0)); return n ? '★'.repeat(n)+'☆'.repeat(5-n) : ''; };
  const showToast = (text) => { const el=$('#toast'); el.textContent=text; el.classList.add('show'); clearTimeout(showToast.t); showToast.t=setTimeout(()=>el.classList.remove('show'),2600); };
  const openModal = (el) => { el.classList.add('open'); el.setAttribute('aria-hidden','false'); document.body.classList.add('modal-open'); };
  const closeModal = (el) => { el.classList.remove('open'); el.setAttribute('aria-hidden','true'); if(!$('.modal-backdrop.open')) document.body.classList.remove('modal-open'); };

  $$('.open-upload').forEach(btn=>btn.addEventListener('click',()=>openModal($('#uploadModal'))));
  $$('.close-modal').forEach(btn=>btn.addEventListener('click',()=>closeModal($('#uploadModal'))));
  $('.close-admin').addEventListener('click',()=>closeModal($('#adminModal')));
  $$('.modal-backdrop').forEach(el=>el.addEventListener('click',e=>{if(e.target===el) closeModal(el)}));
  document.addEventListener('keydown',e=>{if(e.key==='Escape') $$('.modal-backdrop.open').forEach(closeModal)});

  async function decodePhoto(file){
    if(/heic|heif/i.test(file.type)||/\.(heic|heif)$/i.test(file.name)){
      if(!window.heic2any) throw new Error('Não foi possível abrir esta foto.');
      const converted=await heic2any({blob:file,toType:'image/jpeg',quality:.92}); file=Array.isArray(converted)?converted[0]:converted;
    }
    if('createImageBitmap' in window){try{return await createImageBitmap(file,{imageOrientation:'from-image'})}catch{}}
    const url=URL.createObjectURL(file); const img=await new Promise((resolve,reject)=>{const i=new Image();i.onload=()=>resolve(i);i.onerror=reject;i.src=url}); URL.revokeObjectURL(url); return img;
  }
  async function compressPhoto(file){
    const image=await decodePhoto(file), max=2000, ratio=Math.min(1,max/Math.max(image.width,image.height));
    const w=Math.max(1,Math.round(image.width*ratio)),h=Math.max(1,Math.round(image.height*ratio));
    const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;const ctx=canvas.getContext('2d',{alpha:false});ctx.fillStyle='#fff';ctx.fillRect(0,0,w,h);ctx.drawImage(image,0,0,w,h);if(image.close)try{image.close()}catch{}
    const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',.9)); if(!blob) throw new Error('Não foi possível preparar a foto.'); return blob;
  }
  async function sha256(blob){const buffer=await blob.arrayBuffer();const hash=await crypto.subtle.digest('SHA-256',buffer);return [...new Uint8Array(hash)].map(b=>b.toString(16).padStart(2,'0')).join('');}
  function resetPhoto(){if(state.previewUrl)URL.revokeObjectURL(state.previewUrl);state.blob=null;state.previewUrl='';$('#photoInput').value='';$('#previewImage').hidden=true;$('#previewImage').removeAttribute('src');$('#photoPicker').hidden=false;$('#previewActions').hidden=true;$('#photoPicker').innerHTML='<span>📷</span><strong>Escolher foto</strong><small>JPG, PNG, WEBP ou HEIC</small>';}
  async function choosePhoto(file){if(!file)return;try{$('#photoPicker').innerHTML='<span>⏳</span><strong>Preparando foto...</strong><small>Aguarde um instante</small>';const blob=await compressPhoto(file);state.blob=blob;if(state.previewUrl)URL.revokeObjectURL(state.previewUrl);state.previewUrl=URL.createObjectURL(blob);$('#previewImage').src=state.previewUrl;$('#previewImage').hidden=false;$('#photoPicker').hidden=true;$('#previewActions').hidden=false;}catch(err){resetPhoto();showToast(err.message||'Não foi possível abrir a foto.')}}
  $('#photoPicker').addEventListener('click',()=>$('#photoInput').click());
  $('#photoInput').addEventListener('change',e=>choosePhoto(e.target.files?.[0]));
  $('#changePhoto').addEventListener('click',()=>$('#photoInput').click());
  $('#removePhoto').addEventListener('click',()=>{resetPhoto();showToast('Foto removida.');});

  function setRating(value){state.rating=Number(value)||0;$('#adventureRating').value=state.rating||'';$$('#starPicker button').forEach(btn=>btn.classList.toggle('active',Number(btn.dataset.rating)<=state.rating));}
  $$('#starPicker button').forEach(btn=>btn.addEventListener('click',()=>setRating(btn.dataset.rating)));

  function updateModeration(){const result=moderate($('#participantName').value+' '+$('#adventureLocation').value+' '+$('#adventureDescription').value);const line=$('#moderationLine');line.textContent=result.ok?'✓ Conteúdo adequado para publicação.':'⚠ '+result.message;line.style.color=result.ok?'#83bf90':'#ffaaa2';return result;}
  ['participantName','adventureLocation','adventureDescription'].forEach(id=>$('#'+id).addEventListener('input',updateModeration));
  $('#adventureDescription').addEventListener('input',e=>{$('#descriptionCount').textContent=`${e.target.value.length}/320`;});

  function legacyMeta(post){
    const caption=String(post.caption||'');
    const hash=String(post.photoHash||'') || (caption.match(/\|hash:([a-f0-9]{64})$/i)?.[1]||'');
    const date=post.adventureDate||post.date||caption.split('|hash:')[0]||'';
    return {hash,date};
  }
  function normalizePost(post){
    const meta=legacyMeta(post);
    const genericName=['Galeria','Galeria dos Trilheiros'].includes(String(post.name||''))?'':String(post.name||'');
    return {id:post.id,participantName:post.participantName||genericName||'Trilheiro(a)',location:post.location||post.title||post.trip||'Aventura dos Trilheiros',adventureDate:post.adventureDate||meta.date||'',description:post.description||'',rating:Number(post.rating)||0,photoKey:post.photoKey,photoHash:post.photoHash||meta.hash||'',createdAt:post.createdAt||''};
  }
  function dedupe(posts){const seen=new Set();return posts.filter(p=>{const key=p.photoHash||p.photoKey||p.id;if(!key||seen.has(key))return false;seen.add(key);return true;});}
  function renderFeatured(){
    const p=state.posts[0],img=$('#featuredImage'),ph=$('#featuredPlaceholder');
    if(!p){img.hidden=true;ph.hidden=false;$('#featuredAdventure').textContent='Compartilhe sua experiência';$('#featuredAuthor').textContent='Trilheiros de Rondonópolis';$('#featuredStars').textContent='';$('#featuredDescription').textContent='As novas publicações aparecem primeiro e também continuam no mural abaixo.';$('#featuredDate').textContent='Galeria dos Trilheiros';return;}
    ph.hidden=true;img.hidden=true;img.src=`/api/photo?id=${encodeURIComponent(p.photoKey)}&v=${encodeURIComponent(p.id)}`;img.onload=()=>img.hidden=false;
    $('#featuredAdventure').textContent=p.location;$('#featuredAuthor').textContent=p.participantName;$('#featuredStars').textContent=starsText(p.rating);$('#featuredDescription').textContent=p.description||'Uma nova memória compartilhada com os Trilheiros.';$('#featuredDate').textContent=formatDate(p.adventureDate||p.createdAt);
  }
  function renderGallery(){
    const grid=$('#galleryGrid');grid.innerHTML='';$('#photoCount').textContent=state.posts.length;$('#emptyState').hidden=state.posts.length>0;
    state.posts.forEach((p,index)=>{
      const card=document.createElement('article');card.className='gallery-card';
      card.innerHTML=`<div class="gallery-photo-wrap"><div class="gallery-frame"><div class="gallery-image"><img loading="lazy" src="/api/photo?id=${encodeURIComponent(p.photoKey)}&v=${encodeURIComponent(p.id)}" alt="Foto de ${esc(p.participantName)} em ${esc(p.location)}"></div></div>${state.admin?'<button class="delete-card" type="button" aria-label="Excluir publicação">🗑</button>':''}</div><div class="gallery-info"><div class="gallery-topline"><span class="gallery-date">${index===0?'MAIS RECENTE • ':''}${esc(formatDate(p.adventureDate||p.createdAt))}</span><span class="gallery-rating">${esc(starsText(p.rating))}</span></div><h3 class="gallery-author">${esc(p.participantName)}</h3><p class="gallery-location">${esc(p.location)}</p>${p.description?`<p class="gallery-description">${esc(p.description)}</p>`:''}</div>`;
      if(state.admin)card.querySelector('.delete-card').addEventListener('click',()=>deletePost(p));grid.appendChild(card);
    });
  }
  async function loadPosts(){
    const grid=$('#galleryGrid');grid.innerHTML='<div class="skeleton"></div><div class="skeleton"></div><div class="skeleton"></div>';
    try{const res=await fetch('/api/posts',{headers:{Accept:'application/json'},cache:'no-store'});if(!res.ok)throw new Error();const data=await res.json();state.posts=dedupe((Array.isArray(data.posts)?data.posts:[]).map(normalizePost).sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt)));renderFeatured();renderGallery();}
    catch{grid.innerHTML='';$('#emptyState').hidden=false;showToast('Não foi possível atualizar o mural agora.');}
  }

  $('#uploadForm').addEventListener('submit',async e=>{
    e.preventDefault();const error=$('#formError');error.hidden=true;
    const participantName=$('#participantName').value.trim(),location=$('#adventureLocation').value.trim(),date=$('#adventureDate').value,description=$('#adventureDescription').value.trim(),rating=state.rating;
    if(!state.blob){error.textContent='Escolha uma foto antes de publicar.';error.hidden=false;return;}
    if(!participantName){error.textContent='Digite seu nome.';error.hidden=false;return;}
    if(!location){error.textContent='Digite o nome da trilha ou local.';error.hidden=false;return;}
    const moderation=updateModeration();if(!moderation.ok){error.textContent=moderation.message;error.hidden=false;return;}
    const button=$('#publishButton');button.disabled=true;button.textContent='Publicando...';
    try{
      const hash=await sha256(state.blob);
      if(state.posts.some(p=>p.photoHash&&p.photoHash===hash))throw new Error('Esta foto já foi publicada no mural.');
      const form=new FormData();form.append('participantName',participantName);form.append('location',location);form.append('adventureDate',date);form.append('description',description);form.append('rating',rating?String(rating):'');form.append('photoHash',hash);form.append('website',$('#website').value);form.append('photo',state.blob,'foto.jpg');
      const res=await fetch('/api/posts',{method:'POST',body:form});const data=await res.json().catch(()=>({}));if(!res.ok)throw new Error(data.message||'Não foi possível publicar.');
      e.target.reset();$('#descriptionCount').textContent='0/320';setRating(0);resetPhoto();closeModal($('#uploadModal'));showToast('Publicado com sucesso! ✨');await loadPosts();
    }catch(err){error.textContent=err.message||'Não foi possível publicar.';error.hidden=false;}
    finally{button.disabled=false;button.textContent='Publicar';}
  });

  async function validateAdmin(key){const res=await fetch('/api/admin-check',{headers:{'x-admin-key':key},cache:'no-store'});const data=await res.json().catch(()=>({}));if(!res.ok||!data.ok)throw new Error(data.message||'Senha inválida.');}
  function setAdmin(active,key=''){state.admin=active;state.adminKey=key;$('#adminButton').classList.toggle('active',active);$('#adminButton .admin-lock').textContent=active?'🔓':'🔐';$('#adminButton .admin-label').textContent=active?'ADM ON':'ADM';if(active)sessionStorage.setItem('trilheiros-master-admin',key);else sessionStorage.removeItem('trilheiros-master-admin');renderGallery();}
  $('#adminButton').addEventListener('click',()=>{if(state.admin){setAdmin(false);showToast('Modo administrador desativado.');return;}$('#adminPassword').value='';$('#adminError').hidden=true;openModal($('#adminModal'));setTimeout(()=>$('#adminPassword').focus(),120);});
  $('#adminLoginButton').addEventListener('click',async()=>{const key=$('#adminPassword').value.trim(),err=$('#adminError');err.hidden=true;if(!key){err.textContent='Digite a senha.';err.hidden=false;return;}const btn=$('#adminLoginButton');btn.disabled=true;btn.textContent='Validando...';try{await validateAdmin(key);setAdmin(true,key);closeModal($('#adminModal'));showToast('Modo administrador ativado.');}catch(e){err.textContent=e.message;err.hidden=false;}finally{btn.disabled=false;btn.textContent='Entrar';}});
  $('#adminPassword').addEventListener('keydown',e=>{if(e.key==='Enter')$('#adminLoginButton').click();});
  async function deletePost(p){if(!state.admin)return;if(!confirm(`Excluir a publicação de ${p.participantName} em “${p.location}”?`))return;try{const res=await fetch(`/api/posts?id=${encodeURIComponent(p.id)}`,{method:'DELETE',headers:{'x-admin-key':state.adminKey}});const data=await res.json().catch(()=>({}));if(!res.ok)throw new Error(data.message||'Não foi possível excluir.');state.posts=state.posts.filter(x=>x.id!==p.id);renderFeatured();renderGallery();showToast('Publicação excluída.');}catch(e){showToast(e.message||'Erro ao excluir.');}}

  (async()=>{const saved=sessionStorage.getItem('trilheiros-master-admin');if(saved){try{await validateAdmin(saved);setAdmin(true,saved);}catch{sessionStorage.removeItem('trilheiros-master-admin');}}await loadPosts();setInterval(()=>{if(!document.hidden)loadPosts();},30000);})();
})();