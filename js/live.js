// Live data straight from USASpending.gov (public API, CORS-open). No numbers are hardcoded:
// if a request fails, the element that needed it stays hidden.
import { STATE_CENTROIDS, PENTAGON } from './states.js';

const API = 'https://api.usaspending.gov/api/v2';
const DOD = [{ type: 'awarding', tier: 'toptier', name: 'Department of Defense' }];
const CONTRACTS = ['A', 'B', 'C', 'D'];

const now = new Date();
export const CURRENT_FY = now.getMonth() >= 9 ? now.getFullYear() + 1 : now.getFullYear();
export const LAST_FY = CURRENT_FY - 1;
const fyStart = (fy) => `${fy - 1}-10-01`;
const fyEnd = (fy) => `${fy}-09-30`;
const iso = (d) => d.toISOString().slice(0, 10);

const cache = new Map();
async function post(path, body) {
  const key = path + JSON.stringify(body);
  if (!cache.has(key)) {
    cache.set(key, fetch(API + path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(20000),
    }).then((r) => { if (!r.ok) throw new Error(r.status); return r.json(); }));
  }
  return cache.get(key);
}

export async function obligationsByFY(firstFY, lastFY) {
  const end = lastFY === CURRENT_FY ? iso(now) : fyEnd(lastFY);
  const data = await post('/search/spending_over_time/', {
    group: 'fiscal_year',
    filters: { agencies: DOD, award_type_codes: CONTRACTS, time_period: [{ start_date: fyStart(firstFY), end_date: end }] },
  });
  return data.results
    .map((r) => ({ fy: +r.time_period.fiscal_year, amount: r.aggregated_amount || 0 }))
    .sort((a, b) => a.fy - b.fy);
}

export async function topStates(fy, n = 8) {
  const data = await post('/search/spending_by_geography/', {
    scope: 'recipient_location', geo_layer: 'state',
    filters: { agencies: DOD, award_type_codes: CONTRACTS, time_period: [{ start_date: fyStart(fy), end_date: fyEnd(fy) }] },
  });
  return data.results
    .filter((r) => r.aggregated_amount > 0 && STATE_CENTROIDS[r.shape_code])
    .sort((a, b) => b.aggregated_amount - a.aggregated_amount)
    .slice(0, n)
    .map((r) => ({ st: r.shape_code, name: r.display_name, amount: r.aggregated_amount }));
}

export async function topRecipient(fy) {
  const data = await post('/search/spending_by_category/recipient/', {
    filters: { agencies: DOD, award_type_codes: CONTRACTS, time_period: [{ start_date: fyStart(fy), end_date: fyEnd(fy) }] },
    limit: 15,
  });
  // One company can report under several registration IDs, so merge by name.
  const byName = new Map();
  for (const r of data.results) byName.set(r.name, (byName.get(r.name) || 0) + (r.amount || 0));
  const [name, amount] = [...byName.entries()].sort((a, b) => b[1] - a[1])[0];
  const pretty = name.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase()).replace(/ Corporation$| Corp\.?$| Inc\.?$| Company$/, '');
  return { name: pretty, amount };
}

export function money(v) {
  if (v >= 1e9) return '$' + (v / 1e9).toFixed(1) + 'B';
  if (v >= 1e6) return '$' + (v / 1e6).toFixed(0) + 'M';
  return '$' + Math.round(v).toLocaleString();
}

export function countUp(el, target, format, ms = 1400) {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) { el.textContent = format(target); return; }
  const t0 = performance.now();
  const step = (t) => {
    const p = Math.min((t - t0) / ms, 1);
    el.textContent = format(target * (1 - Math.pow(1 - p, 3)));
    if (p < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

// Globe: arcs from the Pentagon to the states that received the most DoD contract dollars last FY.
const deg = (d) => (d * Math.PI) / 180;
const PHI_US = Math.PI - (deg(-96) - Math.PI / 2);
const THETA_US = deg(28);

export async function mountGlobe(canvas, statesPromise) {
  const wrap = canvas.parentElement;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let createGlobe;
  try {
    ({ default: createGlobe } = await import('https://esm.sh/cobe@2.0.1'));
  } catch { wrap.hidden = true; return; }

  const dpr = Math.min(devicePixelRatio || 1, 2);
  let width = wrap.offsetWidth;
  let globe;
  try {
    globe = createGlobe(canvas, {
      devicePixelRatio: dpr, width: width * dpr, height: width * dpr,
      phi: PHI_US, theta: THETA_US, dark: 1, diffuse: 1.4,
      mapSamples: width < 400 ? 12000 : 18000, mapBrightness: 5.5, mapBaseBrightness: 0.02,
      baseColor: [0.16, 0.18, 0.23], markerColor: [0.36, 0.55, 1], glowColor: [0.1, 0.16, 0.34],
      arcColor: [0.5, 0.68, 1], arcWidth: 0.5, arcHeight: 0.22, markerElevation: 0.01,
      markers: [], arcs: [], opacity: 0.95, scale: 1,
    });
  } catch { wrap.hidden = true; return; }

  new ResizeObserver(() => {
    width = wrap.offsetWidth;
    globe.update({ width: width * dpr, height: width * dpr });
  }).observe(wrap);

  let targets = [];
  statesPromise.then((states) => {
    const max = Math.max(...states.map((s) => s.amount));
    targets = states.map((s) => ({ loc: STATE_CENTROIDS[s.st], w: Math.sqrt(s.amount / max) }));
  }).catch(() => {});

  const t0 = performance.now();
  let shown = 0;
  let lastAt = t0 + 600;
  const frame = (t) => {
    if (shown < targets.length && t - lastAt > (reduce ? 0 : 320)) { shown = reduce ? targets.length : shown + 1; lastAt = t; }
    const s = (t - t0) / 1000;
    const pulse = reduce ? 0 : (Math.sin(s * 2.4) + 1) / 2;
    globe.update({
      phi: PHI_US + (reduce ? 0 : Math.sin(s * 0.16) * 0.35),
      theta: THETA_US,
      markers: [
        { location: PENTAGON, size: 0.04 + pulse * 0.015, color: [0.92, 0.95, 1] },
        ...targets.slice(0, shown).map((d) => ({ location: d.loc, size: 0.02 + d.w * 0.03 })),
      ],
      arcs: targets.slice(0, shown).map((d) => ({ from: PENTAGON, to: d.loc })),
    });
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
  requestAnimationFrame(() => wrap.classList.add('on'));
}
