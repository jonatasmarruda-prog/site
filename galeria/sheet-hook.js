(() => {
  const originalFetch = window.fetch.bind(window);

  window.fetch = async (input, init = {}) => {
    const response = await originalFetch(input, init);
    try {
      const url = typeof input === 'string' ? input : input?.url || '';
      const method = String(init?.method || 'GET').toUpperCase();
      if (method === 'POST' && url.includes('/api/posts') && init.body instanceof FormData && response.ok) {
        const data = await response.clone().json();
        const form = init.body;
        const caption = String(form.get('caption') || '');
        const meta = caption.match(/^([^|]*)\|hash:([a-f0-9]{64})$/i);
        const raw = {
          id: data?.post?.id || '',
          createdAt: data?.post?.createdAt || new Date().toISOString(),
          title: String(form.get('trip') || ''),
          adventureDate: meta ? meta[1] : '',
          description: String(form.get('description') || ''),
          photoKey: data?.post?.photoKey || '',
          photoHash: meta ? meta[2] : ''
        };
        originalFetch('/api/sheet-append', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(raw)
        }).catch(() => {});
      }
    } catch {}
    return response;
  };
})();