// Cursor spotlight
const root = document.documentElement;
window.addEventListener('pointermove', (e) => {
  root.style.setProperty('--x', e.clientX + 'px');
  root.style.setProperty('--y', e.clientY + 'px');
}, { passive: true });

// Live Washington, DC clock
const clock = document.getElementById('clock');
const fmt = new Intl.DateTimeFormat('en-US', {
  timeZone: 'America/New_York', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
});
const tick = () => { clock.textContent = fmt.format(new Date()); };
tick();
setInterval(tick, 1000);

// Scrollspy for the side nav
const links = [...document.querySelectorAll('.nav a')];
const sections = links.map((a) => document.querySelector(a.getAttribute('href')));
const spy = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (!entry.isIntersecting) return;
    links.forEach((a) => a.classList.toggle('active', a.getAttribute('href') === '#' + entry.target.id));
  });
}, { rootMargin: '-35% 0px -60% 0px' });
sections.forEach((s) => s && spy.observe(s));

// Reveal blocks and animate the chart when they scroll into view
const revealables = document.querySelectorAll('.block, .chart');
document.querySelectorAll('.block').forEach((el) => el.classList.add('reveal'));
const reveal = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add('in');
      reveal.unobserve(entry.target);
    }
  });
}, { threshold: 0, rootMargin: "0px 0px -8% 0px" });
revealables.forEach((el) => reveal.observe(el));
