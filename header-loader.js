// header-loader.js (normal script, auto-runs)
(async function () {
  const mount = document.getElementById('siteHeader');
  if (!mount) return;

  try {
    // cache-bust para GH Pages
    const res = await fetch(`./header.html?v=${Date.now()}`, { cache: 'no-store' });
    if (!res.ok) throw new Error(`Failed to load header.html (HTTP ${res.status})`);

    const html = await res.text();
    mount.innerHTML = html;

    // Marcar link ativo automaticamente
    const path = (location.pathname.split('/').pop() || 'index.html').toLowerCase();

    // limpar ativos anteriores
    mount.querySelectorAll('.navLinks a').forEach(a => a.classList.remove('active'));

    // ativar anchors normais
    mount.querySelectorAll('.navLinks a').forEach(a => {
      const href = (a.getAttribute('href') || '').toLowerCase();
      if (href && href === path) a.classList.add('active');
    });

    // ✅ se estiveres em destinations.html, marca o botão (nav-trigger) como ativo
    if (path === 'destinations.html') {
      const btn = mount.querySelector('.nav-trigger');
      if (btn) btn.classList.add('active');
    }

    // ✅ se estiveres numa âncora destinations.html#..., continua a marcar o botão
    // (aqui já está coberto porque path continua a ser destinations.html)

    // opcional: quando abres o dropdown via click (mobile no futuro)
    const dropdownWrap = mount.querySelector('.has-dropdown');
    const trigger = mount.querySelector('.nav-trigger');
    if (dropdownWrap && trigger) {
      trigger.addEventListener('click', () => {
        const open = dropdownWrap.classList.toggle('open');
        trigger.setAttribute('aria-expanded', open ? 'true' : 'false');
      });
      // fechar ao clicar fora
      document.addEventListener('click', (e) => {
        if (!dropdownWrap.contains(e.target)) {
          dropdownWrap.classList.remove('open');
          trigger.setAttribute('aria-expanded', 'false');
        }
      });
    }

    // 🔥 dispara um evento para poderes inicializar coisas depois do header existir
    window.dispatchEvent(new CustomEvent('header:loaded'));
  } catch (err) {
    console.error(err);
  }
})();