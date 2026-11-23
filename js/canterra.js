// Scroll-driven chart for the Canterra case study. Every number comes from the team's final report.
const STEPS = [
  {
    title: 'Share of employees who left, by group (training data)',
    bars: [
      { label: '0–2 yrs experience', v: 46, hot: true },
      { label: '1st year w/ manager', v: 33, hot: true },
      { label: 'Single', v: 26 },
      { label: 'Frequent travel', v: 25 },
      { label: 'Everyone', v: 16 },
    ],
    max: 50, fmt: (v) => v + '%', base: { v: 16, label: '16% overall' },
  },
  { title: '20 example profiles × 3 rows · random row split', dots: 'random' },
  { title: '20 example profiles × 3 rows · split by profile', dots: 'grouped' },
  {
    title: 'AUC: how well each model ranks leavers above stayers',
    bars: [
      { label: 'Logistic · CV', v: 0.741, hot: true },
      { label: 'Tree · CV', v: 0.674 },
      { label: 'Logistic · test', v: 0.727, hot: true },
      { label: 'Tree · test', v: 0.666 },
    ],
    min: 0.45, max: 0.8, fmt: (v) => v.toFixed(3), base: { v: 0.5, label: '0.5 = coin flip' },
  },
  {
    title: 'Actual attrition by predicted-risk group · test set',
    bars: [
      { label: 'Lowest', v: 5 }, { label: '2', v: 7 }, { label: '3', v: 12 }, { label: '4', v: 15 },
      { label: 'Highest', v: 41, hot: true },
    ],
    max: 45, fmt: (v) => v + '%', base: { v: 16, label: '16% base rate' },
  },
  {
    title: 'Model-implied chance of leaving · illustrative employees',
    bars: [
      { label: 'New, new manager', v: 60 },
      { label: 'Travels, low sat.', v: 40 },
      { label: 'Same, after action', v: 14, hot: true },
      { label: 'Established', v: 3 },
    ],
    max: 65, fmt: (v) => v + '%', base: { v: 17, label: '17% check-in cutoff' },
  },
];

const title = document.getElementById('stage-title');
const barsEl = document.getElementById('stage-bars');
const dotsEl = document.getElementById('stage-dots');
const xEl = document.getElementById('stage-x');
const legend = document.getElementById('stage-legend');

// Five bar slots that morph between steps, plus one baseline.
barsEl.innerHTML = Array.from({ length: 5 }, () => '<div class="bar"><i></i></div>').join('') +
  '<div class="base"><span class="mono"></span></div>';
const slots = [...barsEl.querySelectorAll('.bar')];
const base = barsEl.querySelector('.base');

// 20 profiles of three rows each. "Random" assigns rows independently; "grouped" keeps a profile together.
dotsEl.innerHTML = Array.from({ length: 20 }, () => '<div class="trip"><i></i><i></i><i></i></div>').join('');
const trips = [...dotsEl.querySelectorAll('.trip')];
const randomPattern = [
  [1, 0, 0], [0, 0, 0], [0, 1, 0], [0, 0, 0], [0, 0, 1], [0, 0, 0], [1, 0, 0], [0, 0, 0], [0, 0, 0], [0, 1, 0],
  [0, 0, 0], [0, 0, 1], [0, 0, 0], [0, 0, 0], [1, 0, 0], [0, 0, 0], [0, 0, 0], [0, 1, 0], [0, 0, 0], [0, 0, 0],
];
const groupedTest = new Set([3, 11, 16, 7]);

function show(i) {
  const s = STEPS[i];
  title.textContent = s.title;
  if (s.dots) {
    barsEl.hidden = true;
    dotsEl.hidden = false;
    legend.hidden = false;
    xEl.innerHTML = '';
    trips.forEach((t, p) => {
      const cells = [...t.children];
      const pattern = s.dots === 'random' ? randomPattern[p] : [0, 1, 2].map(() => (groupedTest.has(p) ? 1 : 0));
      cells.forEach((c, k) => c.classList.toggle('test', pattern[k] === 1));
      const mixed = pattern.some(Boolean) && !pattern.every(Boolean);
      t.classList.toggle('leak', mixed);
    });
    legend.innerHTML = '<span><i style="background:rgba(91,140,255,.3)"></i>Training row</span><span><i style="background:#e6ebf5"></i>Test row</span>' +
      (s.dots === 'random' ? '<span><i style="outline:1px dashed #ff8a5b;background:none"></i>Profile on both sides (leak)</span>' : '<span>No profile on both sides</span>');
    return;
  }
  barsEl.hidden = false;
  dotsEl.hidden = true;
  legend.hidden = true;
  const lo = s.min ?? 0;
  const pct = (v) => Math.max(0, ((v - lo) / (s.max - lo)) * 100);
  slots.forEach((el, k) => {
    const b = s.bars[k];
    el.classList.toggle('off', !b);
    el.classList.toggle('hot', !!b?.hot);
    el.style.setProperty('--h', b ? pct(b.v) + '%' : '0%');
    el.querySelector('i').textContent = b ? s.fmt(b.v) : '';
    el.style.display = b ? '' : 'none';
  });
  base.style.bottom = pct(s.base.v) + '%';
  base.querySelector('span').textContent = s.base.label;
  xEl.innerHTML = s.bars.map((b) => `<span>${b.label}</span>`).join('');
}

const steps = [...document.querySelectorAll('.step')];
const io = new IntersectionObserver((entries) => {
  entries.forEach((e) => {
    if (!e.isIntersecting) return;
    steps.forEach((s) => s.classList.toggle('on', s === e.target));
    show(+e.target.dataset.step);
  });
}, { rootMargin: '-45% 0px -45% 0px' });
steps.forEach((s) => io.observe(s));
show(0);
steps[0].classList.add('on');
