(()=>{
  const PHOTO_ORIGIN='https://galeria-trilheiros.netlify.app';
  const optimize=(raw,w=640,q=78)=>`/_vercel/image?url=${encodeURIComponent(raw)}&w=${w}&q=${q}`;
  const toRaw=(src)=>src.startsWith('/api/photo?')?PHOTO_ORIGIN+src:src;

  const nativeFetch=window.fetch.bind(window);
  window.fetch=async(input,options={})=>{
    const url=typeof input==='string'?input:(input&&input.url)||'';
    const method=String(options.method||'GET').toUpperCase();
    if(url.startsWith('/api/posts')&&method==='POST'&&options.body instanceof FormData){
      const d=String(options.body.get('description')||'').trim();
      if(!d) options.body.set('description','-');
    }
    let target=url;
    if(url.startsWith('/api/posts?')&&method==='DELETE') target=url.replace('/api/posts?','/api/admin-delete?');
    const res=await nativeFetch(target===url?input:target,options);
    if(url.startsWith('/api/posts')&&method==='GET'&&res.ok){
      try{const j=await res.clone().json();if(Array.isArray(j.posts))j.posts.forEach(p=>{if(p.description==='-')p.description=''});return new Response(JSON.stringify(j),{status:res.status,headers:res.headers})}catch{}
    }
    return res;
  };

  const descriptor=Object.getOwnPropertyDescriptor(HTMLImageElement.prototype,'src');
  if(descriptor?.set&&descriptor?.get){
    Object.defineProperty(HTMLImageElement.prototype,'src',{configurable:descriptor.configurable,enumerable:descriptor.enumerable,get:descriptor.get,set(value){
      let v=value;
      if(typeof v==='string'&&v.startsWith('/api/photo?')){this.dataset.rawPhoto=v;v=optimize(toRaw(v),this.id==='featuredImage'?828:640,78)}
      return descriptor.set.call(this,v);
    }});
  }

  const bind=(img)=>{
    if(!img||img.dataset.pulseBound)return;
    const src=(img.getAttribute('src')||'').trim();
    if(!src||img.hidden)return;
    img.dataset.pulseBound='1';
    const parent=img.parentElement;if(!parent)return;
    parent.classList.add('image-loading');parent.classList.remove('image-loaded');
    const done=()=>{parent.classList.remove('image-loading');parent.classList.add('image-loaded')};
    if(img.complete&&img.naturalWidth){done();return}
    img.addEventListener('load',done,{once:true});img.addEventListener('error',done,{once:true});
  };
  const scan=(root=document)=>root.querySelectorAll?.('img')?.forEach(bind);
  scan();
  new MutationObserver(records=>records.forEach(r=>r.addedNodes.forEach(n=>{if(n.nodeType!==1)return;if(n.matches?.('img'))bind(n);scan(n)}))).observe(document.documentElement,{childList:true,subtree:true});

  // Compatibilidade com navegadores internos (Instagram/Facebook): o input real
  // fica sobre a área de seleção, invisível, para que o toque do usuário abra
  // diretamente a galeria/câmera sem depender de input.click() programático.
  const input=document.getElementById('photoInput');
  const preview=document.getElementById('uploadPreview');
  const picker=document.getElementById('photoPicker');
  if(input&&preview){
    input.hidden=false;
    input.setAttribute('aria-label','Escolher foto');
    Object.assign(input.style,{
      position:'absolute',inset:'0',width:'100%',height:'100%',opacity:'0',
      zIndex:'6',cursor:'pointer',display:'block'
    });
    if(picker){picker.style.position='relative';picker.style.zIndex='2';}
    preview.style.cursor='pointer';
  }
})();