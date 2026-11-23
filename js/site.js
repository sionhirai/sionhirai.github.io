// Shared by every page: cursor spotlight, DC clock, scroll reveal, scrollspy, and the ⌘K command palette.
const root = document.documentElement;
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

// Cursor spotlight
addEventListener('pointermove', (e) => {
  root.style.setProperty('--x', e.clientX + 'px');
  root.style.setProperty('--y', e.clientY + 'px');
}, { passive: true });

// Live Washington, DC clock
const clock = document.getElementById('clock');
if (clock) {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
  });
  const tick = () => { clock.textContent = fmt.format(new Date()); };
  tick();
  setInterval(tick, 1000);
}

// Scrollspy for the side nav
const navLinks = [...document.querySelectorAll('.nav a')];
if (navLinks.length) {
  const spy = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      navLinks.forEach((a) => a.classList.toggle('active', a.getAttribute('href') === '#' + entry.target.id));
    });
  }, { rootMargin: '-35% 0px -60% 0px' });
  navLinks.forEach((a) => {
    const target = document.querySelector(a.getAttribute('href'));
    if (target) spy.observe(target);
  });
}

// Reveal blocks and charts as they scroll into view
document.querySelectorAll('.block').forEach((el) => el.classList.add('reveal'));
const reveal = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (!entry.isIntersecting) return;
    entry.target.classList.add('in');
    reveal.unobserve(entry.target);
  });
}, { threshold: 0, rootMargin: '0px 0px -8% 0px' });
document.querySelectorAll('.block, .chart').forEach((el) => reveal.observe(el));

// ⌘K command palette
const EMAIL = 'skh93@georgetown.edu';
const COMMANDS = [
  { group: 'Projects', label: 'Valdris case study', hint: 'Defense procurement intel', href: 'valdris.html' },
  { group: 'Projects', label: 'Canterra case study', hint: 'Attrition model, scroll story', href: 'canterra.html' },
  { group: 'Projects', label: 'Open Valdris live', hint: 'valdris-intel.vercel.app', href: 'https://valdris-intel.vercel.app/', external: true },
  { group: 'Navigate', label: 'Home', hint: 'Back to the top', href: 'index.html' },
  { group: 'Navigate', label: 'About', href: 'index.html#about' },
  { group: 'Navigate', label: 'Experience', href: 'index.html#experience' },
  { group: 'Navigate', label: 'Education and credentials', href: 'index.html#education' },
  { group: 'Contact', label: 'Download resume', hint: 'PDF', href: 'assets/Sion_Hirai_Resume.pdf', external: true },
  { group: 'Contact', label: 'Copy email address', hint: EMAIL, copy: EMAIL },
  { group: 'Contact', label: 'Send an email', hint: EMAIL, href: 'mailto:' + EMAIL },
  { group: 'Contact', label: 'LinkedIn', hint: 'linkedin.com/in/sionhirai', href: 'https://www.linkedin.com/in/sionhirai', external: true },
  { group: 'Contact', label: 'GitHub', hint: 'github.com/sionhirai', href: 'https://github.com/sionhirai', external: true },
];

const dialog = document.createElement('dialog');
dialog.className = 'palette';
dialog.setAttribute('aria-label', 'Command palette');
dialog.innerHTML = `
  <div class="pal-box">
    <div class="pal-input-row">
      <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
      <input type="text" placeholder="Search projects, resume, contact" aria-label="Search commands" autocomplete="off" spellcheck="false">
      <kbd class="mono">esc</kbd>
    </div>
    <ul class="pal-list" role="listbox"></ul>
    <div class="pal-foot mono"><span>↑↓ move</span><span>↵ open</span><span class="pal-toast" aria-live="polite"></span></div>
  </div>`;
document.body.appendChild(dialog);

const input = dialog.querySelector('input');
const list = dialog.querySelector('.pal-list');
const toast = dialog.querySelector('.pal-toast');
let results = COMMANDS;
let active = 0;

function score(cmd, q) {
  if (!q) return 1;
  const text = (cmd.label + ' ' + (cmd.hint || '') + ' ' + cmd.group).toLowerCase();
  if (text.includes(q)) return 2 + (cmd.label.toLowerCase().startsWith(q) ? 1 : 0);
  let i = 0;
  for (const ch of text) if (ch === q[i]) i++;
  return i === q.length ? 1 : 0;
}

function render() {
  const q = input.value.trim().toLowerCase();
  results = COMMANDS.map((c) => [c, score(c, q)]).filter(([, s]) => s > 0)
    .sort((a, b) => b[1] - a[1]).map(([c]) => c);
  if (!q) results = COMMANDS;
  active = Math.min(active, Math.max(results.length - 1, 0));
  let lastGroup = '';
  list.innerHTML = results.length ? results.map((c, i) => {
    const head = !q && c.group !== lastGroup ? `<li class="pal-group mono">${c.group}</li>` : '';
    lastGroup = c.group;
    return `${head}<li role="option" data-i="${i}" class="pal-item${i === active ? ' on' : ''}" aria-selected="${i === active}">
      <span>${c.label}</span>${c.hint ? `<span class="pal-hint">${c.hint}</span>` : ''}${c.external ? '<span class="pal-ext">↗</span>' : ''}</li>`;
  }).join('') : '<li class="pal-empty">No matches. Try "resume" or "Valdris".</li>';
  list.querySelector('.on')?.scrollIntoView({ block: 'nearest' });
}

function run(cmd) {
  if (!cmd) return;
  if (cmd.copy) {
    navigator.clipboard?.writeText(cmd.copy).then(() => {
      toast.textContent = 'Copied';
      setTimeout(() => { toast.textContent = ''; dialog.close(); }, 700);
    });
    return;
  }
  dialog.close();
  if (cmd.external) window.open(cmd.href, '_blank', 'noopener');
  else location.href = cmd.href;
}

function openPalette() {
  if (dialog.open) return;
  input.value = '';
  active = 0;
  render();
  dialog.showModal();
  input.focus();
}

input.addEventListener('input', () => { active = 0; render(); });
dialog.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowDown') { e.preventDefault(); active = (active + 1) % results.length; render(); }
  else if (e.key === 'ArrowUp') { e.preventDefault(); active = (active - 1 + results.length) % results.length; render(); }
  else if (e.key === 'Enter') { e.preventDefault(); run(results[active]); }
});
list.addEventListener('click', (e) => {
  const item = e.target.closest('.pal-item');
  if (item) run(results[+item.dataset.i]);
});
list.addEventListener('pointermove', (e) => {
  const item = e.target.closest('.pal-item');
  if (item && +item.dataset.i !== active) { active = +item.dataset.i; render(); }
});
dialog.addEventListener('click', (e) => { if (e.target === dialog) dialog.close(); });

addEventListener('keydown', (e) => {
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); dialog.open ? dialog.close() : openPalette(); }
  else if (e.key === '/' && !dialog.open && !/input|textarea/i.test(document.activeElement.tagName)) { e.preventDefault(); openPalette(); }
});
document.querySelectorAll('[data-palette]').forEach((b) => b.addEventListener('click', openPalette));

// Show the right shortcut for the platform
if (!/mac|iphone|ipad/i.test(navigator.platform || navigator.userAgent)) {
  document.querySelectorAll('.kbd-mod').forEach((el) => { el.textContent = 'Ctrl'; });
}

export { reduceMotion };
