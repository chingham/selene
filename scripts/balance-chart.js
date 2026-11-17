// The example month of the home page and the guide, and the chart that draws its balance.

export const euros = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
const reduceMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

// Example month: November, today is the 14th
export const TODAY = 14;
export const END = 30;
export const BUDGET = { total: 400, left: 226 };
const START = 1640;
const PAST = [[1, 2180], [3, 2140], [5, 2020], [7, 1960], [8, 1910], [10, 1860], [12, 1700], [14, 1640]];
const LINES = [
  { id: 'loyer', label: 'Loyer', amount: -780, day: 16, on: true },
  { id: 'edf', label: 'Électricité', amount: -86, day: 18, on: false },
  { id: 'abos', label: 'Abonnements', amount: -25, day: 20, on: false },
  { id: 'assu', label: 'Assurance', amount: -64, day: 24, on: false },
  { id: 'salaire', label: 'Salaire', amount: 2300, day: 28, on: false },
  { id: 'courses', label: 'Courses', budget: true, on: true }
];

export const exampleLines = () => LINES.map(line => ({ ...line }));
export const dayName = d => (d === 1 ? '1er' : String(d)) + ' nov.';
const pastAt = d => PAST.filter(([day]) => day <= d).at(-1)[1];

// Same paces as BudgetBandCurve: lowest spends what is left today, highest on the last day,
// expected in between. Two points a day, before and after that day's lines.
export function model(lines) {
  const active = lines.filter(l => l.on && !l.budget);
  const left = lines.some(l => l.on && l.budget) ? BUDGET.left : 0;
  const base = d => START + active.filter(l => l.day <= d).reduce((sum, l) => sum + l.amount, 0);
  const points = [{ d: TODAY, lo: base(TODAY) - left, ex: base(TODAY), hi: base(TODAY) }];
  for (let d = TODAY + 1; d <= END; d++) {
    const share = left * (d - TODAY) / (END - TODAY);
    const before = base(d - 1), after = base(d);
    points.push({ d, lo: before - left, ex: before - share, hi: before });
    points.push({ d, lo: after - left, ex: after - share, hi: d === END ? after - left : after });
  }
  return { points, left, end: base(END) - left };
}

/** An exact amount, or the band of a day still open to the budget's purchases. */
export function reading(m, d) {
  if (d < TODAY) return { exact: pastAt(d) };
  const p = m.points.filter(p => p.d === d).at(-1);
  return p.hi - p.lo < 1 || d === END ? { exact: p.ex } : p;
}

// SVG helpers
const NS = 'http://www.w3.org/2000/svg';
function el(name, attrs, parent) {
  const node = document.createElementNS(NS, name);
  setAll(node, attrs);
  parent?.appendChild(node);
  return node;
}
const setAll = (node, attrs) => Object.entries(attrs).forEach(([k, v]) => node.setAttribute(k, v));

// Chart, one SVG unit per CSS pixel so the labels keep their size at any width
export function makeChart(svg, { interactive }) {
  const parts = {};
  const state = { points: null, lo: 0, hi: 1, cursor: null };
  const pad = { l: 4, r: 8, t: 24, b: 22 };
  let size = { w: 300, h: 170 };

  const x = d => pad.l + (d - 1) / (END - 1) * (size.w - pad.l - pad.r);
  const y = v => pad.t + (state.hi - v) / (state.hi - state.lo) * (size.h - pad.t - pad.b);
  const line = pts => pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join('');

  function build() {
    svg.textContent = '';
    parts.zero = el('line', { stroke: 'var(--ios-red)', 'stroke-width': 1, 'stroke-dasharray': '2 4', opacity: 0 }, svg);
    parts.band = el('path', { fill: 'var(--blue-soft)' }, svg);
    parts.past = el('path', { fill: 'none', stroke: 'var(--grey-line)', 'stroke-width': 2.6, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' }, svg);
    parts.future = el('path', { fill: 'none', stroke: 'var(--blue)', 'stroke-width': 2.6, 'stroke-dasharray': '6 4', 'stroke-linejoin': 'round' }, svg);
    parts.today = el('line', { stroke: 'var(--ios-secondary)', 'stroke-width': 1, 'stroke-dasharray': '2 3', opacity: .6 }, svg);
    parts.todayLabel = el('text', { 'text-anchor': 'middle' }, svg);
    parts.todayLabel.textContent = "aujourd'hui";
    parts.start = el('text', { 'text-anchor': 'start' }, svg);
    parts.start.textContent = dayName(1);
    parts.endText = el('text', { 'text-anchor': 'end' }, svg);
    parts.endText.textContent = dayName(END);
    parts.endDot = el('circle', { r: 5, fill: 'var(--blue)' }, svg);
    parts.endLabel = el('text', { class: 'end-label', 'text-anchor': 'end' }, svg);
    parts.cursor = el('g', { opacity: 0 }, svg);
    parts.cursorLine = el('line', { stroke: 'var(--text)', 'stroke-width': 1, opacity: .35 }, parts.cursor);
    parts.cursorDot = el('circle', { r: 4.5, fill: 'var(--ios-card)', stroke: 'var(--blue)', 'stroke-width': 2.5 }, parts.cursor);
  }

  function render() {
    const pts = state.points;
    const past = [];
    for (let d = 1; d <= TODAY; d++) {
      if (d > 1) past.push([x(d), y(pastAt(d - 1))]);
      past.push([x(d), y(pastAt(d))]);
    }
    parts.past.setAttribute('d', line(past));
    parts.future.setAttribute('d', line(pts.map(p => [x(p.d), y(p.ex)])));
    parts.band.setAttribute('d', line(pts.map(p => [x(p.d), y(p.hi)]).concat(pts.map(p => [x(p.d), y(p.lo)]).reverse())) + 'Z');

    const tx = x(TODAY), baseline = size.h - 6;
    setAll(parts.today, { x1: tx, x2: tx, y1: pad.t - 6, y2: size.h - pad.b });
    setAll(parts.todayLabel, { x: tx, y: baseline });
    setAll(parts.start, { x: pad.l, y: baseline });
    setAll(parts.endText, { x: size.w - pad.r, y: baseline });

    const last = pts.at(-1);
    setAll(parts.endDot, { cx: x(END), cy: y(last.ex) });
    setAll(parts.endLabel, { x: x(END) - 2, y: Math.max(12, y(last.ex) - 11) });
    parts.endLabel.textContent = euros.format(Math.round(last.ex));

    setAll(parts.zero, { opacity: state.lo < 0 ? .7 : 0, x1: pad.l, x2: size.w - pad.r, y1: y(0), y2: y(0) });
    if (state.cursor != null) placeCursor(state.cursor);
  }

  function placeCursor(d) {
    const value = d < TODAY ? pastAt(d) : state.points.filter(p => p.d === d).at(-1).ex;
    parts.cursor.setAttribute('opacity', 1);
    setAll(parts.cursorLine, { x1: x(d), x2: x(d), y1: pad.t - 6, y2: size.h - pad.b });
    setAll(parts.cursorDot, { cx: x(d), cy: y(value) });
  }

  function bounds(points) {
    const values = PAST.map(p => p[1]).concat(points.flatMap(p => [p.lo, p.hi]));
    const lo = Math.min(...values), hi = Math.max(...values);
    const margin = Math.max(80, (hi - lo) * .1);
    return { lo: lo - margin, hi: hi + margin };
  }

  // Points and scale ease together, so the curve morphs instead of jumping
  let frame;
  function show(points, animate) {
    const target = bounds(points);
    const from = state.points && { points: state.points.map(p => ({ ...p })), lo: state.lo, hi: state.hi };
    cancelAnimationFrame(frame);
    if (!animate || !from || reduceMotion()) {
      Object.assign(state, { points, lo: target.lo, hi: target.hi });
      return render();
    }
    const started = performance.now();
    const mix = (a, b, t) => a + (b - a) * t;
    const step = now => {
      const t = Math.min(1, (now - started) / 480), e = 1 - Math.pow(1 - t, 3);
      state.points = points.map((p, i) => ({ d: p.d, lo: mix(from.points[i].lo, p.lo, e), ex: mix(from.points[i].ex, p.ex, e), hi: mix(from.points[i].hi, p.hi, e) }));
      state.lo = mix(from.lo, target.lo, e);
      state.hi = mix(from.hi, target.hi, e);
      render();
      if (t < 1) frame = requestAnimationFrame(step); else state.points = points;
    };
    frame = requestAnimationFrame(step);
  }

  function resize() {
    const box = svg.getBoundingClientRect();
    if (!box.width) return;
    size = { w: box.width, h: box.height };
    svg.setAttribute('viewBox', `0 0 ${size.w} ${size.h}`);
    if (state.points) render();
  }

  build();
  new ResizeObserver(resize).observe(svg);
  resize();

  // Scrubbing reads a day; vertical swipes still scroll the page (touch-action: pan-y)
  const api = { show, onScrub: null, onLeave: null };
  if (interactive) {
    const dayAt = clientX => {
      const box = svg.getBoundingClientRect();
      const ratio = (clientX - box.left - pad.l) / (box.width - pad.l - pad.r);
      return Math.min(END, Math.max(1, Math.round(1 + ratio * (END - 1))));
    };
    const scrub = e => {
      state.cursor = dayAt(e.clientX);
      placeCursor(state.cursor);
      api.onScrub?.(state.cursor);
    };
    svg.addEventListener('pointerdown', scrub);
    svg.addEventListener('pointermove', scrub);
    svg.addEventListener('pointerleave', () => {
      state.cursor = null;
      parts.cursor.setAttribute('opacity', 0);
      api.onLeave?.();
    });
  }
  return api;
}
