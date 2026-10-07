const icon = document.querySelector('#game-favicon');
const still = icon.href;
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const elephant = new Image();
let timer;
let frame = 0;
let frames = [];

function updateAnimation() {
  clearInterval(timer);
  icon.type = 'image/svg+xml';
  icon.sizes = 'any';
  icon.href = still;

  if (document.hidden || reducedMotion.matches || !frames.length) return;

  icon.type = 'image/png';
  icon.sizes = '32x32';

  const advance = () => {
    icon.href = frames[frame];
    frame = (frame + 1) % frames.length;
  };

  advance();
  timer = setInterval(advance, 200);
}

elephant.onload = () => {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 32;
  const context = canvas.getContext('2d');
  if (!context) return;

  try {
    frames = Array.from({ length: 20 }, (_, index) => {
      context.clearRect(0, 0, 32, 32);
      const offset = Math.sin(index * Math.PI / 10) * 1.3;
      context.drawImage(elephant, 1, 1 + offset, 30, 30);
      return canvas.toDataURL('image/png');
    });

    updateAnimation();
  } catch {
    frames = [];
  }
};

document.addEventListener('visibilitychange', updateAnimation);
reducedMotion.addEventListener('change', updateAnimation);
window.addEventListener('pagehide', () => clearInterval(timer));
window.addEventListener('pageshow', updateAnimation);
elephant.src = still;