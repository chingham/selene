// Pointing marks: a touch points or unpoints the row, and marks tagged data-autoplay toggle on
// their own until the visitor touches one.

const reduceMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

function setPointed(mark, on) {
  mark.classList.remove('anim-in', 'anim-out');
  void mark.offsetWidth; // restarts the animation when toggled again quickly
  mark.classList.toggle('is-on', on);
  mark.setAttribute('aria-pressed', on);
  mark.closest('.op')?.classList.toggle('planned', !on);
  if (!reduceMotion()) mark.classList.add(on ? 'anim-in' : 'anim-out');
}

let touched = false;
document.querySelectorAll('.mark').forEach(mark => mark.addEventListener('click', () => {
  touched = true;
  setPointed(mark, !mark.classList.contains('is-on'));
}));

if (!reduceMotion()) {
  setInterval(() => {
    if (touched) return;
    document.querySelectorAll('.mark[data-autoplay]').forEach(mark => setPointed(mark, !mark.classList.contains('is-on')));
  }, 2200);
}
