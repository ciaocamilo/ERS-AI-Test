// Keep physical keys and each finger independent: releasing one never cancels another.
export function createFlightControls({ onPause, isPaused }) {
  const keyboard = new Set();
  const pointers = new Map();
  const buttons = [...document.querySelectorAll('[data-key]')];
  const allowed = new Set(buttons.map(button => button.dataset.key));
  const touchLayout = matchMedia('(any-pointer: coarse), (max-width: 900px)');
  const paint = () => {
    for (const button of buttons) {
      const held = [...pointers.values()].includes(button);
      button.classList.toggle('held', held);
      button.setAttribute('aria-pressed', String(held));
    }
  };
  const clear = () => {
    keyboard.clear();
    const captured = [...pointers];
    pointers.clear();
    for (const [id, button] of captured) {
      if (button.hasPointerCapture(id)) button.releasePointerCapture(id);
    }
    paint();
  };
  const editing = target => target?.closest('input, textarea, select, [contenteditable="true"]');
  addEventListener('keydown', event => {
    if (event.code === 'Escape' && !event.repeat) onPause();
    if (editing(event.target) || isPaused()) return;
    if (event.code === 'Space' && event.target?.closest('button')) return;
    if (allowed.has(event.code)) {
      event.preventDefault();
      keyboard.add(event.code);
    }
  });
  addEventListener('keyup', event => keyboard.delete(event.code));
  for (const button of buttons) {
    button.addEventListener('contextmenu', event => event.preventDefault());
    button.addEventListener('pointerdown', event => {
      if (isPaused() || (event.pointerType === 'mouse' && event.button !== 0)) return;
      event.preventDefault();
      button.setPointerCapture(event.pointerId);
      pointers.set(event.pointerId, button);
      paint();
    });
    const release = event => {
      pointers.delete(event.pointerId);
      paint();
    };
    for (const name of ['pointerup', 'pointercancel', 'lostpointercapture']) {
      button.addEventListener(name, release);
    }
  }
  addEventListener('blur', clear);
  addEventListener('orientationchange', clear);
  document.addEventListener('visibilitychange', () => { if (document.hidden) clear(); });
  touchLayout.addEventListener('change', clear);
  return {
    has: key => keyboard.has(key) || [...pointers.values()].some(button => button.dataset.key === key),
    clear,
    isTouchLayout: () => touchLayout.matches,
  };
}
