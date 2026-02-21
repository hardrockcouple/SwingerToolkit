// header-loader.js (ES module)
export async function loadHeader() {
  const mount = document.getElementById('siteHeader');
  if (!mount) return;

  // cache-bust para GH Pages não te baralhar
  const res = await fetch(`./header.html?v=${Date.now()}`, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Failed to load header.html (HTTP ${res.status})`);

  const html = await res.text();
  mount.innerHTML = html;

  // marcar link activo automaticamente
  const path = (location.pathname.split('/').pop() || 'index.html').toLowerCase();

  mount.querySelectorAll('.navLinks a').forEach(a => {
    const href = (a.getAttribute('href') || '').toLowerCase();
    if (href === path) a.classList.add('active');
    else a.classList.remove('active');
  });
}