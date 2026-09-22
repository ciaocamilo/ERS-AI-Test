import { setMusicPaused } from './music.js';
import * as THREE from './three.module.js';

const canvas = document.querySelector('#world');

let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
} catch (e) {
  document.querySelector('#error').hidden = false;
  throw e;
}

renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.setClearColor(0xafdfea);

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0xafdfea, 95, 225);

const camera = new THREE.PerspectiveCamera(48, 1, .1, 400);
scene.add(new THREE.HemisphereLight(0xffffff, 0x729991, 2.3));

const sun = new THREE.DirectionalLight(0xfff1dc, 3.2);
sun.position.set(-35, 70, 25);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -90, right: 90, top: 90, bottom: -90, far: 200 });
sun.shadow.bias = -.0005;
scene.add(sun);

const mats = new Map();
function mat(c) {
  if (!mats.has(c)) mats.set(c, new THREE.MeshStandardMaterial({ color: c, roughness: .83 }));
  return mats.get(c);
}

const cube = new THREE.BoxGeometry(1, 1, 1);
const sphere = new THREE.SphereGeometry(1, 20, 14);

function box(w, h, d, c, x = 0, y = 0, z = 0, parent = scene) {
  const m = new THREE.Mesh(cube, mat(c));
  m.scale.set(w, h, d);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  parent.add(m);
  return m;
}

function ball(x, y, z, sx, sy, sz, c, parent = scene) {
  const m = new THREE.Mesh(sphere, mat(c));
  m.position.set(x, y, z);
  m.scale.set(sx, sy, sz);
  m.castShadow = true;
  parent.add(m);
  return m;
}

box(230, .5, 230, 0x80b9a1, 0, -.4, 0);

const blocks = [];
const signals = [];
let seed = 7;
function rand() {
  seed = (seed * 16807) % 2147483647;
  return (seed - 1) / 2147483646;
}

const roads = [-72, -48, -24, 0, 24, 48, 72];

for (const n of roads) {
  box(10, .08, 170, 0x526876, n, 0, 0);
  box(170, .08, 10, 0x526876, 0, .01, n);
  for (let t = -82; t < 83; t += 6) {
    if (roads.some(r => Math.abs(t - r) < 6)) continue;
    box(.14, .015, 2.5, 0xffe9a3, n, .052, t);
    box(2.5, .015, .14, 0xffe9a3, t, .063, n);
  }
}

function signal(x, z, rot) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  g.rotation.y = rot;
  scene.add(g);
  box(.16, 3.6, .16, 0x263f50, 0, 1.8, 0, g);
  box(.6, 1.4, .4, 0x233e4e, 0, 3.5, 0, g);
  const lights = [0xf66066, 0xffd875, 0x80efbd].map((c, i) => {
    const m = ball(0, 3.94 - i * .43, .23, .17, .17, .09, c, g);
    m.material = new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 0 });
    return m;
  });
  signals.push({ lights, offset: rot ? 6 : 0 });
}

for (const x of roads) {
  for (const z of roads) {
    for (let j = -3; j <= 3; j++) {
      box(.65, .025, 2.1, 0xf3eadb, x + j * 1.05, .075, z + 6);
      box(.65, .025, 2.1, 0xf3eadb, x + j * 1.05, .075, z - 6);
      box(2.1, .025, .65, 0xf3eadb, x + 6, .075, z + j * 1.05);
      box(2.1, .025, .65, 0xf3eadb, x - 6, .075, z + j * 1.05);
    }
    signal(x + 5.8, z + 5.8, Math.PI);
    signal(x - 5.8, z - 5.8, 0);
    signal(x + 5.8, z - 5.8, Math.PI / 2);
  }
}

const colors = [0xf2b496, 0xf5d68a, 0x8dc6c6, 0x93adc7, 0xe7a9b9, 0xc1c6db];

function tree(x, z) {
  box(.4, 1.7, .4, 0x8f7160, x, .95, z);
  ball(x, 2.7, z, 1.3, 1.8, 1.3, 0x458d77);
}

for (let ix = 0; ix < 6; ix++) {
  for (let iz = 0; iz < 6; iz++) {
    const x = -60 + ix * 24;
    const z = -60 + iz * 24;
    box(14, .35, 14, 0xd7d5c6, x, .16, z);
    if ((ix + iz * 3) % 8 === 0) {
      box(12, .1, 12, 0x8cbd92, x, .4, z);
      for (let k = 0; k < 5; k++) tree(x + (rand() - .5) * 10, z + (rand() - .5) * 10);
      box(3, .35, 1, 0xa47e58, x, 1, z);
      continue;
    }
    const h = 5 + rand() * 12;
    box(10, h, 10, colors[(ix * 3 + iz) % colors.length], x, h / 2 + .35, z);
    blocks.push({ x, z, h: h + .35 });
    box(10.5, .4, 10.5, 0xf8e9cf, x, h + .45, z);
    box(3, .7, 2, 0x799096, x + 2, h + 1, z);
    for (let y = 2; y < h - 1; y += 2.4) {
      for (let a = -3; a <= 3; a += 3) {
        box(1.1, 1.3, .06, 0x42687b, x + a, y, z + 5.035);
        box(.06, 1.3, 1.1, 0x42687b, x + 5.035, y, z + a);
        box(1.1, 1.3, .06, 0x678696, x + a, y, z - 5.035);
      }
    }
    tree(x - 6, z + 5.5);
  }
}

// An articulated elephant built from true 3D meshes.
const elephant = new THREE.Group();
scene.add(elephant);
const pink = 0xf695c4;
const lightPink = 0xffb1d5;

ball(0, 0, 0, 1.22, 1, 1.75, pink, elephant);
ball(0, .45, -1.35, 1, .95, .98, lightPink, elephant);
ball(0, 1.04, -1.25, .75, .45, .7, lightPink, elephant);

const ears = [];
for (const side of [-1, 1]) {
  const ear = new THREE.Group();
  ear.position.set(side * .74, .55, -1.15);
  elephant.add(ear);
  ball(side * .85, 0, 0, 1.18, .91, .21, pink, ear);
  ball(side * .85, 0, -.16, .87, .66, .06, 0xe776ac, ear);
  ears.push(ear);
  ball(side * .62, .65, -2.08, .22, .25, .13, 0xfff9ed, elephant);
  ball(side * .61, .65, -2.19, .105, .13, .06, 0x203449, elephant);
  ball(side * .58, .70, -2.24, .035, .045, .025, 0xffffff, elephant);
  ball(side * .76, .24, -2.04, .22, .13, .06, 0xf276aa, elephant);
  for (const z of [-.75, .95]) {
    ball(side * .78, -.91, z, .34, .62, .38, pink, elephant);
    ball(side * .78, -1.38, z - .07, .35, .18, .35, lightPink, elephant);
  }
}

const trunkCurve = new THREE.CatmullRomCurve3([
  new THREE.Vector3(0, .22, -2),
  new THREE.Vector3(0, -.25, -2.42),
  new THREE.Vector3(0, -.73, -2.55),
  new THREE.Vector3(0, -.88, -3),
  new THREE.Vector3(0, -.56, -3.25),
]);
const trunk = new THREE.Mesh(new THREE.TubeGeometry(trunkCurve, 24, .23, 12, false), mat(lightPink));
trunk.castShadow = true;
elephant.add(trunk);
ball(0, -.5, -3.25, .19, .13, .12, 0xd96d9f, elephant);

const tail = new THREE.Mesh(
  new THREE.TubeGeometry(
    new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, .1, 1.5),
      new THREE.Vector3(.1, .2, 2.1),
      new THREE.Vector3(.35, .5, 2.3),
    ]),
    10, .07, 6, false,
  ),
  mat(pink),
);
elephant.add(tail);
ball(.35, .5, 2.3, .14, .15, .18, 0xdb6ca0, elephant);

const cars = [];
for (let i = 0; i < 17; i++) {
  const g = new THREE.Group();
  scene.add(g);
  box(1.5, .65, 2.7, [0xffca69, 0xe67e86, 0xe9ede0, 0x77b8d4][i % 4], 0, .65, 0, g);
  box(1.25, .6, 1.35, 0xc5e4e7, 0, 1.2, -.15, g);
  for (const x of [-.75, .75]) {
    for (const z of [-.85, .85]) ball(x, .4, z, .19, .3, .3, 0x314353, g);
  }
  cars.push({ g, road: roads[i % 7], p: -80 + rand() * 160, speed: 2 + rand() * 2, axis: i % 2 });
}

for (let i = 0; i < 18; i++) {
  const x = (rand() - .5) * 260;
  const z = (rand() - .5) * 260;
  const y = 35 + rand() * 22;
  for (let j = 0; j < 3; j++) ball(x + j * 3, y + (j === 1 ? 1 : 0), z, 4, 1.8, 2.4, 0xf5faf6);
}

const keys = new Set();
const pos = new THREE.Vector3(0, 9, 12);
const velocity = new THREE.Vector3();
let heading = 0;
let paused = false;
let time = 0;
let noticeTimer = 7;

const notice = document.querySelector('#notice');
function say(t) {
  notice.textContent = t;
  noticeTimer = 3;
  notice.style.opacity = 1;
}

function setPause(v) {
  paused = v;
  setMusicPaused(v);
  keys.clear();
  document.querySelector('#overlay').hidden = !v;
  document.querySelector('#pause').innerHTML = v ? '▶ <span>Continuar</span>' : 'Ⅱ <span>Pausa</span>';
}

document.querySelector('#pause').onclick = () => setPause(!paused);
document.querySelector('#resume').onclick = () => setPause(false);
document.querySelector('#reset').onclick = () => {
  pos.set(0, 9, 12);
  velocity.set(0, 0, 0);
  heading = 0;
  setPause(false);
  say('¡Listo para otro paseo!');
};

const allowed = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'KeyC'];
addEventListener('keydown', e => {
  if (allowed.includes(e.code)) {
    e.preventDefault();
    keys.add(e.code);
  }
  if (e.code === 'Escape' && !e.repeat) setPause(!paused);
});
addEventListener('keyup', e => keys.delete(e.code));
addEventListener('blur', () => {
  keys.clear();
  if (!paused) setPause(true);
});
document.addEventListener('visibilitychange', () => {
  if (document.hidden) setPause(true);
});

for (const b of document.querySelectorAll('[data-key]')) {
  b.addEventListener('pointerdown', e => {
    e.preventDefault();
    b.setPointerCapture(e.pointerId);
    keys.add(b.dataset.key);
    b.classList.add('held');
  });
  for (const ev of ['pointerup', 'pointercancel', 'lostpointercapture']) {
    b.addEventListener(ev, () => {
      keys.delete(b.dataset.key);
      b.classList.remove('held');
    });
  }
}

function resize() {
  renderer.setSize(innerWidth, innerHeight);
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
}
addEventListener('resize', resize);
resize();
camera.position.copy(pos).add(new THREE.Vector3(15, 14, 22));

const clock = new THREE.Clock();
const aim = new THREE.Vector3();
const next = new THREE.Vector3();
const offset = new THREE.Vector3(15, 14, 22);

function frame() {
  requestAnimationFrame(frame);
  const dt = Math.min(clock.getDelta(), .05);

  if (!paused) {
    time += dt;
    let x = Number(keys.has('ArrowRight')) - Number(keys.has('ArrowLeft'));
    let z = Number(keys.has('ArrowDown')) - Number(keys.has('ArrowUp'));
    const len = Math.hypot(x, z) || 1;
    x /= len;
    z /= len;

    // Directions follow the screen, using the horizontal camera basis.
    const dx = (x * .826 + z * .563) * 10;
    const dz = (-x * .563 + z * .826) * 10;
    velocity.x = THREE.MathUtils.damp(velocity.x, dx, 5, dt);
    velocity.z = THREE.MathUtils.damp(velocity.z, dz, 5, dt);
    velocity.y = THREE.MathUtils.damp(velocity.y, (Number(keys.has('Space')) - Number(keys.has('KeyC'))) * 7, 5, dt);
    next.copy(pos).addScaledVector(velocity, dt);
    next.x = THREE.MathUtils.clamp(next.x, -83, 83);
    next.z = THREE.MathUtils.clamp(next.z, -83, 83);
    next.y = THREE.MathUtils.clamp(next.y, 3, 32);

    const hit = blocks.some(b => Math.abs(next.x - b.x) < 6.8 && Math.abs(next.z - b.z) < 6.8 && next.y - 1.7 < b.h);
    if (hit) {
      velocity.x = velocity.z = 0;
      if (velocity.y > 0) pos.y = next.y;
      say('Hay un edificio: sube con Espacio o rodéalo.');
    } else {
      pos.copy(next);
    }

    if (Math.hypot(velocity.x, velocity.z) > .3) {
      const desired = Math.atan2(-velocity.x, -velocity.z);
      heading += Math.atan2(Math.sin(desired - heading), Math.cos(desired - heading)) * Math.min(dt * 6, 1);
    }
    elephant.rotation.set(Math.sin(time * 2) * .035, heading, -x * .09);
    elephant.position.copy(pos);
    elephant.position.y += Math.sin(time * 3) * .16;
    ears[0].rotation.z = Math.sin(time * 6) * .32;
    ears[1].rotation.z = -Math.sin(time * 6) * .32;

    for (const { lights, offset: o } of signals) {
      const phase = (time + o) % 12;
      const active = phase < 5 ? 2 : phase < 6 ? 1 : 0;
      lights.forEach((l, i) => {
        l.material.emissiveIntensity = i === active ? 1.9 : 0;
        l.material.color.setHex(i === active ? [0xff4b60, 0xffd268, 0x5bf7b6][i] : [0x823c49, 0x827148, 0x315f55][i]);
      });
    }

    for (const c of cars) {
      const phase = (time + (c.axis ? 6 : 0)) % 12;
      const nearCross = roads.some(r => c.p < r - 7 && c.p > r - 11);
      if (!(nearCross && phase >= 5)) c.p += dt * c.speed;
      if (c.p > 85) c.p = -85;
      c.g.position.set(c.axis ? c.p : c.road + 2.4, 0, c.axis ? c.road - 2.4 : c.p);
      c.g.rotation.y = c.axis ? Math.PI / 2 : 0;
    }

    noticeTimer -= dt;
    if (noticeTimer < 0) notice.style.opacity = 0;
    document.querySelector('#height').innerHTML = Math.round(pos.y) + ' <small>m</small>';
  }

  camera.position.lerp(aim.copy(pos).add(offset), 1 - Math.exp(-4 * dt));
  camera.lookAt(pos.x, pos.y - .5, pos.z);
  renderer.render(scene, camera);
}
frame();