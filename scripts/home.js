import { BUDGET, END, TODAY, dayName, euros, exampleLines, makeChart, model, reading } from './balance-chart.js';
import './pointing.js';

const reduceMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const signed = v => (v > 0 ? '+' : '') + euros.format(v);

// Demo: chips add or remove lines, the big figure follows the finger and rests on the last day
const lines = exampleLines();
const amount = document.getElementById('demo-amount');
const when = document.getElementById('demo-when');
const readout = document.getElementById('demo-readout');
const chips = document.getElementById('demo-chips');
const chart = makeChart(document.getElementById('demo-chart'), { interactive: true });
let current = model(lines), shown = current.end, counter;

function countTo(value, instant) {
  cancelAnimationFrame(counter);
  const from = shown, started = performance.now();
  const tick = now => {
    const t = instant || reduceMotion() ? 1 : Math.min(1, (now - started) / 420), e = 1 - Math.pow(1 - t, 3);
    shown = from + (value - from) * e;
    amount.textContent = euros.format(Math.round(shown));
    amount.classList.toggle('negative', shown < 0);
    if (t < 1) counter = requestAnimationFrame(tick);
  };
  counter = requestAnimationFrame(tick);
}

function scrubTo(d) {
  const r = reading(current, d);
  const day = d === TODAY ? "Aujourd'hui" : 'Le ' + dayName(d);
  if (r.exact != null) {
    when.textContent = d < TODAY ? `${day}, déjà passé` : d === TODAY ? "Solde aujourd'hui" : `Solde prévu le ${dayName(d)}`;
    countTo(r.exact, true);
    readout.innerHTML = d < TODAY ? 'Ce que votre banque vous montre aussi.' : `<b>${day}</b> : montant exact, rien n'est laissé au hasard.`;
  } else {
    when.textContent = `Solde prévu le ${dayName(d)}, environ`;
    countTo(r.ex, true);
    readout.innerHTML = `<b>Entre ${euros.format(Math.round(r.lo))} et ${euros.format(Math.round(r.hi))}</b>, selon le rythme de vos courses.`;
  }
}

function rest(instant) {
  when.textContent = `Solde prévu le ${dayName(END)}`;
  countTo(current.end, instant);
  readout.innerHTML = current.left
    ? `<b>Courses : ${euros.format(BUDGET.total)} par mois</b>, un montant qui varie. Il en reste ${euros.format(BUDGET.left)}, la zone montre où vous finirez.`
    : `<b>Le ${dayName(END)}</b> : exact, au centime près.`;
}

function update(animate) {
  current = model(lines);
  chart.show(current.points, animate);
  rest(!animate);
}

chart.onScrub = scrubTo;
chart.onLeave = () => rest(false);

for (const line of lines) {
  const chip = document.createElement('button');
  chip.type = 'button';
  chip.className = 'chip';
  chip.setAttribute('aria-pressed', line.on);
  const value = line.budget ? `${euros.format(BUDGET.total)}/mois` : signed(line.amount);
  chip.innerHTML = `<span class="sign" aria-hidden="true">${line.on ? '✓' : '+'}</span>${line.label} <span class="amt">${value}</span>`;
  chip.addEventListener('click', () => {
    line.on = !line.on;
    chip.setAttribute('aria-pressed', line.on);
    chip.querySelector('.sign').textContent = line.on ? '✓' : '+';
    update(true);
  });
  chips.appendChild(chip);
}
update(false);

// The icon draws itself once the closing comes into view
const signature = document.querySelector('.sig');
if (signature && !reduceMotion() && 'IntersectionObserver' in window) {
  signature.classList.add('armed');
  new IntersectionObserver((entries, observer) => {
    if (!entries[0].isIntersecting) return;
    signature.classList.add('play');
    observer.disconnect();
  }, { threshold: .6 }).observe(signature);
}
