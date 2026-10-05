import { createFlightControls } from './controls.js';
import { setMusicPaused } from './music.js';
import * as THREE from './three.module.js';
import { createClouds, createStarQuest, createPrizeSound } from './star-quest.js';
import { moveWithCollisions, batchMeshes, createPedestrians } from './city-life.js';
import { createSceneryMaterials, createLake } from './scenery.js?v=life-20261004';
import { createBodyGeometry, createTrunkGeometry } from './elephant-shape.js?v=gentle-20261003';
import { createEye, blinkAmount } from './elephant-eyes.js?v=gentle-20261003';
import { createSmile } from './elephant-smile.js?v=gentle-20261003';

const canvas = document.querySelector('#world');

let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
} catch (e) {
  document.querySelector('#error').hidden = false;
  throw e;
}

const coarsePointer = matchMedia('(any-pointer: coarse)').matches;
renderer.setPixelRatio(Math.min(devicePixelRatio, coarsePointer ? 1.5 : 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.setClearColor(0xafdfea);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xafdfea);
scene.fog = new THREE.Fog(0xafdfea, 110, 310);

const camera = new THREE.PerspectiveCamera(48, 1, .1, 500);
scene.add(new THREE.HemisphereLight(0xffffff, 0x729991, 2.3));

const sun = new THREE.DirectionalLight(0xfff1dc, 3.2);
sun.position.set(-60, 140, 60);
sun.castShadow = true;
sun.shadow.mapSize.set(coarsePointer ? 1024 : 2048, coarsePointer ? 1024 : 2048);
Object.assign(sun.shadow.camera, { left: -180, right: 180, top: 160, bottom: -160, far: 420 });
sun.shadow.bias = -.0005;
scene.add(sun);

const scenery = createSceneryMaterials(renderer);
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

box(460, .5, 230, 0x80b9a1, 0, -.4, 0).material = scenery.surface('grass', 0x78a95c, 200, 100);

const blocks = [];
const obstacles = [];
const sidewalks = [];
function obstacleFor(object) {
  object.updateWorldMatrix(true, true);
  obstacles.push(new THREE.Box3().setFromObject(object));
}
const signals = [];
let seed = 7;
function rand() {
  seed = (seed * 16807) % 2147483647;
  return (seed - 1) / 2147483646;
}

const roads = [-72, -48, -24, 0, 24, 48, 72];

const roadsX = Array.from({length: 13}, (_, i) => -144 + i * 24);
for (const axis of [0, 1]) {
  for (const n of axis ? roads : roadsX) {
    const limit = axis ? 170 : 85;
    const segments = n === 24 ? [[-limit, 5], [43, limit]] : [[-limit, limit]];
    for (const [start, end] of segments) {
      const length = end - start, center = (start + end) / 2;
      const road = axis ? box(length, .08, 10, 0x526876, center, .01, n) : box(10, .08, length, 0x526876, n, 0, center);
      road.material = scenery.surface('asphalt', 0x667581, axis ? length / 3 : 3, axis ? 3 : length / 3);
    }
    for (let t = -limit + 3; t < limit - 2; t += 6) {
      if ((axis ? roadsX : roads).some(r => Math.abs(t - r) < 6) || (n === 24 && t > 5 && t < 43)) continue;
      if (axis) box(2.5, .015, .14, 0xffe9a3, t, .063, n);
      else box(.14, .015, 2.5, 0xffe9a3, n, .052, t);
    }
  }
}

function insideLakePark(x, z, w = 0, d = 0) {
  return x + w / 2 > 5 && x - w / 2 < 43 && z + d / 2 > 5 && z - d / 2 < 43;
}
function crossing(w, d, x, z) {
  if (!insideLakePark(x, z, w, d)) box(w, .025, d, 0xf3eadb, x, .075, z);
}
function signal(x, z, rot) {
  if (insideLakePark(x, z)) return;
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
  obstacleFor(g);
}

for (const x of roadsX) {
  for (const z of roads) {
    if (x === 24 && z === 24) continue;
    for (let j = -3; j <= 3; j++) {
      crossing(.65, 2.1, x + j * 1.05, z + 6);
      crossing(.65, 2.1, x + j * 1.05, z - 6);
      crossing(2.1, .65, x + 6, z + j * 1.05);
      crossing(2.1, .65, x - 6, z + j * 1.05);
    }
    signal(x + 5.8, z + 5.8, Math.PI);
    signal(x - 5.8, z - 5.8, 0);
    signal(x + 5.8, z - 5.8, Math.PI / 2);
  }
}

const colors = [0xf2b496, 0xf5d68a, 0x8dc6c6, 0x93adc7, 0xe7a9b9, 0xc1c6db];

let treeNumber = 0;
const trunkGeometry = new THREE.CylinderGeometry(.18, .27, 2.2, 8);
const pineGeometry = new THREE.ConeGeometry(1, 2.1, 12);
function tree(x, z) {
  const type = treeNumber++ % 3;
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  const scale = .9 + (treeNumber % 5) * .055;
  group.scale.setScalar(scale);
  group.rotation.y = treeNumber * 1.7;
  scene.add(group);
  const trunk = new THREE.Mesh(trunkGeometry, scenery.surface('bark', 0x967050, 2, 3));
  trunk.position.y = 1.1;
  trunk.castShadow = true;
  group.add(trunk);
  if (type === 1) {
    // Pine: three distinct tiers of evergreen foliage.
    for (let tier = 0; tier < 3; tier++) {
      const crown = new THREE.Mesh(pineGeometry, scenery.surface('leaves', [0x326a45, 0x3f7c50, 0x508b57][tier], 3));
      crown.position.y = 2 + tier * .8;
      crown.scale.setScalar(1.25 - tier * .25);
      crown.castShadow = true;
      crown.receiveShadow = true;
      group.add(crown);
    }
  } else {
    // Broad, spreading shade tree or tall, narrow poplar.
    const crowns = type === 0
      ? [[0, 3.1, 0, 1.25, 1.35, 1.25, 0x55994d], [-.65, 2.55, .2, .95, 1, .95, 0x478841], [.65, 2.65, -.15, 1, 1.1, 1, 0x6ba652]]
      : [[0, 3.35, 0, .72, 2.15, .72, 0x769e4d], [-.22, 2.4, .1, .58, 1.05, .55, 0x668d40]];
    for (const [dx, dy, dz, sx, sy, sz, color] of crowns) {
      const crown = ball(dx, dy, dz, sx, sy, sz, color, group);
      crown.material = scenery.surface('leaves', color, 3);
      crown.receiveShadow = true;
    }
  }
  obstacleFor(group);
}

for (let ix = 0; ix < 12; ix++) {
  for (let iz = 0; iz < 6; iz++) {
    const x = -132 + ix * 24;
    const z = -60 + iz * 24;
    if ((x === 12 || x === 36) && (z === 12 || z === 36)) continue;
    sidewalks.push({x, z});
    box(14, .35, 14, 0xd7d5c6, x, .16, z).material = scenery.surface('paving', 0xd7d5c6, 6);
    if ((ix + iz * 3) % 8 === 0) {
      box(12, .1, 12, 0x8cbd92, x, .4, z).material = scenery.surface('grass', 0x82b361, 6);
      for (let k = 0; k < 5; k++) tree(x + (rand() - .5) * 10, z + (rand() - .5) * 10);
      box(3, .35, 1, 0xa47e58, x, 1, z);
      continue;
    }
    const h = 5 + rand() * 12;
    box(10, h, 10, colors[(ix * 3 + iz) % colors.length], x, h / 2 + .35, z).material = scenery.surface('brick', colors[(ix * 3 + iz) % colors.length], 4, Math.round(h / 2));
    blocks.push({ x, z, h: h + .35 });
    obstacles.push(new THREE.Box3(new THREE.Vector3(x - 5.3, 0, z - 5.3), new THREE.Vector3(x + 5.3, h + 1.4, z + 5.3)));
    box(10.5, .4, 10.5, 0xf8e9cf, x, h + .45, z).material = scenery.surface('paving', 0xd9d6c9, 5);
    box(3, .7, 2, 0x799096, x + 2, h + 1, z);
    for (let y = 2; y < h - 1; y += 2.4) {
      for (let a = -3; a <= 3; a += 3) {
        box(1.1, 1.3, .06, 0x42687b, x + a, y, z + 5.035).material = scenery.glass;
        box(.06, 1.3, 1.1, 0x42687b, x + 5.035, y, z + a).material = scenery.glass;
        box(1.1, 1.3, .06, 0x678696, x + a, y, z - 5.035).material = scenery.glass;
      }
    }
    tree(x - 6, z + 5.5);
  }
}

const lake = createLake(scene, renderer, coarsePointer, scenery);
for (let i = 0; i < 16; i++) {
  const angle = i / 16 * Math.PI * 2;
  tree(24 + Math.cos(angle) * 20, 24 + Math.sin(angle) * 20);
}
// Park benches sit outside the shoreline.
for (const x of [5, 43]) {
  box(1, .18, 3, 0xa27c50, x, .75, 24).material = scenery.surface('bark', 0xa27c50, 2);
  for (const z of [23, 25]) box(.15, .7, .15, 0x394d51, x, .35, z);
}

const staticCityRoots = [...scene.children];
const pedestrians = createPedestrians(scene, sidewalks);

// An articulated elephant built from true 3D meshes.
const elephant = new THREE.Group();
scene.add(elephant);
const pink = 0xf695c4;
const lightPink = 0xffb1d5;

const body = new THREE.Mesh(createBodyGeometry(), mat(pink));
body.castShadow = true;
elephant.add(body);
elephant.add(createSmile(body));

const ears = [];
const eyes = [];
// Tops extend inside the torso; no exposed cap or flared shoulder rim.
const legProfile = [
  [0, -1.60], [.20, -1.60], [.28, -1.57], [.31, -1.50],
  [.31, -1.36], [.30, -1.10], [.31, -.85], [.32, -.60],
  [.33, -.30], [.32, 0], [.28, .22], [0, .27],
].map(([r, y]) => new THREE.Vector2(r, y));
const legGeometry = new THREE.LatheGeometry(legProfile, 32);
for (const side of [-1, 1]) {
  const ear = new THREE.Group();
  ear.position.set(side * .74, .55, -1.15);
  elephant.add(ear);
  ball(side * .85, 0, 0, 1.18, .91, .21, pink, ear);
  ball(side * .85, 0, -.16, .87, .66, .06, 0xe776ac, ear);
  ears.push(ear);
  const eye = createEye(side, pink);
  eyes.push(eye);
  elephant.add(eye.group);
  ball(side * .72, .42, -2.02, .14, .075, .025, 0xf18bb6, elephant);
  for (const z of [-.60, .95]) {
    const leg = new THREE.Mesh(legGeometry, mat(pink));
    leg.position.set(side * .60, 0, z);
    leg.castShadow = true;
    elephant.add(leg);
    for (const toe of [-1, 0, 1]) {
      ball(side * .60 + toe * .13, -1.48, z - .28, .064, .084, .035, 0xffdce9, elephant);
    }
  }
}

const trunkCurve = new THREE.CatmullRomCurve3([
  new THREE.Vector3(0, .44, -2.03),
  new THREE.Vector3(0, .15, -2.45),
  new THREE.Vector3(0, -.18, -2.78),
  new THREE.Vector3(0, -.18, -3.10),
  new THREE.Vector3(0, .12, -3.30),
]);
const trunk = new THREE.Mesh(createTrunkGeometry(trunkCurve), mat(pink));
trunk.castShadow = true;
elephant.add(trunk);
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
// No spherical ornament at the tail tip either.

const cars = [];
const trafficLanes = [
  ...roadsX.filter(r => r !== 24).map(road => ({road, axis: 0, limit: 85})),
  ...roads.filter(r => r !== 24).map(road => ({road, axis: 1, limit: 170})),
];
for (let i = 0; i < 108; i++) {
  const g = new THREE.Group();
  scene.add(g);
  box(1.5, .65, 2.7, [0xffca69, 0xe67e86, 0xe9ede0, 0x77b8d4][i % 4], 0, .65, 0, g).material = scenery.paint([0xffca69, 0xe67e86, 0xe9ede0, 0x77b8d4][i % 4]);
  box(1.25, .6, 1.35, 0xc5e4e7, 0, 1.2, -.15, g).material = scenery.glass;
  box(1.27, .09, 1.38, 0xffffff, 0, 1.53, -.15, g).material = scenery.paint([0xffca69, 0xe67e86, 0xe9ede0, 0x77b8d4][i % 4]);
  for (const side of [-1, 1]) {
    box(.32, .18, .05, 0xfff3bb, side * .46, .71, 1.37, g);
    box(.28, .16, .05, 0xe85760, side * .46, .71, -1.37, g);
  }
  box(1.1, .12, .08, 0xb9c7cc, 0, .45, 1.38, g);
  for (const x of [-.75, .75]) {
    for (const z of [-.85, .85]) ball(x, .4, z, .19, .3, .3, 0x314353, g);
  }
  const {road, axis, limit} = trafficLanes[i % trafficLanes.length];
  const p = -limit + 4 + Math.floor(i / trafficLanes.length) * (2 * limit / 6);
  g.position.set(axis ? p : road + 2.4, 0, axis ? road - 2.4 : p);
  g.rotation.y = axis ? Math.PI / 2 : 0;
  cars.push({g, road, axis, p, limit, speed: 2.8 + (i % trafficLanes.length) * .08});
}

const clouds = createClouds(scene);

const updateCarBatches = batchMeshes(scene, cars.map(c => c.g), true);
batchMeshes(scene, staticCityRoots);

// Capture reflections after the complete city is present; hide the player.
elephant.visible = false;
lake.capture();
elephant.visible = true;

const keys = createFlightControls({ onPause: () => setPause(!paused), isPaused: () => paused });
const pos = new THREE.Vector3(0, 9, 12);
const velocity = new THREE.Vector3();
let heading = 0;
let paused = false;
let won = false;
let time = 0;
let noticeTimer = 7;

const notice = document.querySelector('#notice');
function say(t) {
  notice.textContent = t;
  noticeTimer = 3;
  notice.style.opacity = 1;
}

function setPause(v) {
  if (won && !v) return;
  paused = v;
  setMusicPaused(v);
  keys.clear();
  document.querySelector('#overlay').hidden = !v;
  document.querySelector('#overlay h2').textContent = won ? '¡Felicitaciones, lo lograste!' : 'Un respiro en el cielo';
  document.querySelector('#overlay p').textContent = won ? 'Recolectaste las 7 estrellas. ¡La ciudad brilla gracias a ti!' : 'Tu elefante te está esperando.';
  document.querySelector('#resume').textContent = won ? 'Jugar de nuevo' : 'Seguir volando';
  if (v) document.querySelector('#resume').focus();
  document.querySelector('#pause').setAttribute('aria-label', v ? 'Continuar juego' : 'Pausar juego');
  document.querySelector('#pause').innerHTML = v ? '▶ <span>Continuar</span>' : 'Ⅱ <span>Pausa</span>';
}

const prizeSound = createPrizeSound();
const quest = createStarQuest(scene, obstacles, score => {
  document.querySelector('#star-count').textContent = `${score} / 7`;
  prizeSound(score === 7);
  if (score === 7) {
    won = true;
    velocity.set(0, 0, 0);
    setPause(true);
    document.querySelector('#star-hint').textContent = '¡Objetivo completado!';
  } else say(`¡Estrella conseguida! Llevas ${score} de 7.`);
});
function restartGame() {
  won = false;
  pos.set(0, 9, 12);
  velocity.set(0, 0, 0);
  heading = 0;
  quest.reset();
  document.querySelector('#star-count').textContent = '0 / 7';
  document.querySelector('#star-hint').textContent = 'Busca las estrellas doradas';
  setPause(false);
  say('¡Nueva aventura! Recolecta las 7 estrellas.');
}
document.querySelector('#pause').onclick = () => setPause(!paused);
document.querySelector('#resume').onclick = () => won ? restartGame() : setPause(false);
document.querySelector('#reset').onclick = restartGame;

addEventListener('blur', () => { if (!paused) setPause(true); });
document.addEventListener('visibilitychange', () => { if (document.hidden) setPause(true); });

function resize() {
  const { width, height } = document.querySelector('#game').getBoundingClientRect();
  if (!width || !height) return;
  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  // More vertical space in portrait keeps the elephant and nearby corners in view.
  camera.fov = camera.aspect < 1 ? 60 : 48;
  camera.updateProjectionMatrix();
}
new ResizeObserver(resize).observe(document.querySelector('#game'));
addEventListener('resize', resize);
window.visualViewport?.addEventListener('resize', resize);
resize();
if (keys.isTouchLayout()) {
  notice.textContent = 'Recolecta 7 estrellas. Flechas para volar; + y − para la altura.';
}
camera.position.copy(pos).add(new THREE.Vector3(15, 14, 22));

const clock = new THREE.Clock();
const aim = new THREE.Vector3();
const next = new THREE.Vector3();
const previous = new THREE.Vector3();
const offset = new THREE.Vector3(15, 14, 22);

function frame() {
  requestAnimationFrame(frame);
  const dt = Math.min(clock.getDelta(), .05);

  if (!paused) {
    time += dt;
    clouds.update(time);
    previous.copy(pos);
    pedestrians.update(time);
    const blink = blinkAmount(time);
    for (const eye of eyes) eye.update(blink);
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
    next.x = THREE.MathUtils.clamp(next.x, -166, 166);
    next.z = THREE.MathUtils.clamp(next.z, -83, 83);
    next.y = THREE.MathUtils.clamp(next.y, 3, 32);

    const motion = moveWithCollisions(pos, next, obstacles);
    pos.copy(motion.position);
    for (const axis of ['x', 'y', 'z']) {
      if (motion.blocked[axis]) velocity[axis] = 0;
    }
    if (motion.blocked.x || motion.blocked.y || motion.blocked.z) {
      say(keys.isTouchLayout() ? 'Hay un obstáculo: rodéalo o pulsa + para subir.' : 'Hay un obstáculo: rodéalo o sube con Espacio.');
    }

    if (Math.hypot(velocity.x, velocity.z) > .3) {
      const desired = Math.atan2(-velocity.x, -velocity.z);
      heading += Math.atan2(Math.sin(desired - heading), Math.cos(desired - heading)) * Math.min(dt * 6, 1);
    }
    elephant.rotation.set(Math.sin(time * 2) * .035, heading, -x * .09);
    elephant.position.copy(pos);
    elephant.position.y += Math.sin(time * 3) * .16;
    lake.update(time, elephant.position);
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
      const nearCross = (c.axis ? roadsX : roads).some(r => c.p < r - 7 && c.p > r - 11);
      const following = cars.some(other => other !== c && other.axis === c.axis && other.road === c.road && (other.p - c.p + 2 * c.limit) % (2 * c.limit) < 4.5);
      if (!(nearCross && phase >= 5) && !following) c.p += dt * c.speed;
      if (c.p > c.limit) c.p -= 2 * c.limit;
      c.g.position.set(c.axis ? c.p : c.road + 2.4, 0, c.axis ? c.road - 2.4 : c.p);
      c.g.rotation.y = c.axis ? Math.PI / 2 : 0;
    }

    const nearest = quest.update(time, previous, pos);
    if (nearest) {
      const dx = nearest.position.x - pos.x, dz = nearest.position.z - pos.z;
      const direction = Math.atan2(dx * .826 - dz * .563, -(dx * .563 + dz * .826));
      document.querySelector('#star-direction').style.transform = `rotate(${direction}rad)`;
      document.querySelector('#star-hint').textContent = `${Math.round(nearest.distance)} m · altura ${Math.round(nearest.position.y)} m`;
    }
    updateCarBatches();
    noticeTimer -= dt;
    if (noticeTimer < 0) notice.style.opacity = 0;
    document.querySelector('#height').innerHTML = Math.round(pos.y) + ' <small>m</small>';
  }

  camera.position.lerp(aim.copy(pos).add(offset), 1 - Math.exp(-4 * dt));
  camera.lookAt(pos.x, pos.y - .5, pos.z);
  renderer.render(scene, camera);
}
frame();