const audio = document.querySelector('#music');
const button = document.querySelector('#music-toggle');
const volume = document.querySelector('#music-volume');

let enabled = false;
let paused = false;

audio.volume = Number(volume.value) / 100;

function label() {
  button.setAttribute('aria-pressed', String(enabled));
  button.setAttribute('aria-label', enabled ? 'Silenciar música' : 'Activar música');
  button.innerHTML = enabled ? '♫ <span>Música activada</span>' : '♫ <span>Activar música</span>';
}

function failed() {
  enabled = false;
  audio.pause();
  label();
  button.innerHTML = '♫ <span>Reintentar música</span>';
  button.setAttribute('aria-label', 'No se pudo reproducir la música. Reintentar');
}

async function sync() {
  if (!enabled || paused) {
    audio.pause();
    return;
  }
  try {
    await audio.play();
    if (!enabled || paused) audio.pause();
  } catch {
    failed();
  }
}

button.addEventListener('click', () => {
  enabled = !enabled;
  label();
  sync();
});

volume.addEventListener('input', () => {
  audio.volume = Number(volume.value) / 100;
});

audio.addEventListener('error', failed);

export function setMusicPaused(value) {
  paused = value;
  sync();
}
