import * as THREE from './three.module.js';
import { hitsObstacle } from './city-life.js';

export function starLocations(obstacles, random = Math.random) {
  const points = [];
  for (let i = 0; i < 7; i++) {
    let point;
    for (let attempt = 0; attempt < 100; attempt++) {
      point = new THREE.Vector3(-150 + (i + random()) * (300 / 7), 8 + random() * 18, -70 + random() * 140);
      const lower = point.clone();
      lower.y -= .5;
      if (
        !hitsObstacle(lower, obstacles) &&
        points.every(p => p.distanceTo(point) > 15) &&
        point.distanceTo(new THREE.Vector3(0, 9, 12)) > 8
      ) break;
      point = null;
    }
    // Above the tallest city obstacle, safely within the flight ceiling.
    points.push(point || new THREE.Vector3(-135 + i * 45, 28, 0));
  }
  return points;
}

export function createStarQuest(scene, obstacles, onCollect) {
  const outline = new THREE.Shape();
  for (let i = 0; i < 10; i++) {
    const angle = Math.PI / 2 + i * Math.PI / 5, radius = i % 2 ? .48 : 1.05;
    const x = Math.cos(angle) * radius, y = Math.sin(angle) * radius;
    if (i === 0) outline.moveTo(x, y);
    else outline.lineTo(x, y);
  }
  outline.closePath();
  const geometry = new THREE.ExtrudeGeometry(outline, {
    depth: .22, bevelEnabled: true, bevelSize: .08, bevelThickness: .08, bevelSegments: 2, steps: 1,
  });
  geometry.center();
  const material = new THREE.MeshStandardMaterial({
    color: 0xffd34e, emissive: 0xffb326, emissiveIntensity: .7, metalness: .25, roughness: .3,
  });
  const stars = Array.from({ length: 7 }, () => {
    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);
    return { mesh, base: new THREE.Vector3(), collected: false };
  });

  let score = 0;
  const path = new THREE.Line3();
  const closest = new THREE.Vector3();

  function reset() {
    const points = starLocations(obstacles);
    score = 0;
    stars.forEach((s, i) => {
      s.collected = false;
      s.mesh.visible = true;
      s.base.copy(points[i]);
      s.mesh.position.copy(s.base);
    });
  }

  function update(time, previous, position) {
    path.set(previous, position);
    for (const s of stars) {
      if (s.collected) continue;
      s.mesh.position.copy(s.base);
      s.mesh.position.y += Math.sin(time * 2 + s.base.x) * .25;
      s.mesh.rotation.y = time * .8;
      if (previous.distanceToSquared(position) < 1e-12) closest.copy(position);
      else path.closestPointToPoint(s.mesh.position, true, closest);
      if (closest.distanceTo(s.mesh.position) < 2.7) {
        s.collected = true;
        s.mesh.visible = false;
        score++;
        onCollect(score);
      }
    }
    let nearest = null;
    let distance = Infinity;
    for (const s of stars) {
      if (s.collected) continue;
      const d = s.base.distanceTo(position);
      if (d < distance) {
        distance = d;
        nearest = s.base;
      }
    }
    return nearest ? { position: nearest, distance } : null;
  }

  reset();
  return { reset, update, stars, get score() { return score; } };
}

export function createPrizeSound() {
  let context;
  function unlock() {
    try {
      const Audio = window.AudioContext || window.webkitAudioContext;
      if (!Audio) return;
      context ||= new Audio();
      if (context.state === 'suspended') context.resume().catch(() => {});
    } catch { /* Audio support must not block the game. */ }
  }
  window.addEventListener('pointerdown', unlock, { passive: true });
  window.addEventListener('keydown', unlock);

  return won => {
    if (!context || context.state !== 'running') return;
    const notes = won ? [523.25, 659.25, 783.99, 1046.5, 1318.5] : [783.99, 1046.5, 1318.5];
    notes.forEach((frequency, i) => {
      const at = context.currentTime + i * .10;
      const tone = context.createOscillator();
      const gain = context.createGain();
      tone.type = 'sine';
      tone.frequency.value = frequency;
      gain.gain.setValueAtTime(0, at);
      gain.gain.linearRampToValueAtTime(.14, at + .015);
      gain.gain.exponentialRampToValueAtTime(.001, at + .38);
      tone.connect(gain);
      gain.connect(context.destination);
      tone.start(at);
      tone.stop(at + .4);
      tone.onended = () => {
        tone.disconnect();
        gain.disconnect();
      };
    });
  };
}

export function createClouds(scene) {
  const size = 64;
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const radius = Math.hypot((x + .5) / size * 2 - 1, (y + .5) / size * 2 - 1);
      const fade = THREE.MathUtils.smoothstep(radius, .28, 1);
      const i = (y * size + x) * 4;
      data[i] = data[i + 1] = data[i + 2] = 255;
      data[i + 3] = (1 - fade) * 180;
    }
  }
  const map = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  map.magFilter = map.minFilter = THREE.LinearFilter;
  map.needsUpdate = true;
  const material = new THREE.SpriteMaterial({ map, transparent: true, depthWrite: false, color: 0xf7fbff, opacity: .75 });
  const clouds = Array.from({ length: 20 }, (_, i) => {
    const group = new THREE.Group();
    scene.add(group);
    const x = -200 + Math.random() * 400;
    const z = -110 + Math.random() * 220;
    const y = 37 + Math.random() * 19;
    for (let j = 0; j < 5; j++) {
      const puff = new THREE.Sprite(material);
      puff.position.set((j - 2) * 2.2, j === 2 ? 1 : 0, (j % 2) * .6);
      puff.scale.set(9, j === 2 ? 6 : 4.8, 1);
      group.add(puff);
    }
    return { group, x, y, z, speed: .25 + (i % 4) * .08 };
  });

  function update(time) {
    for (const c of clouds) {
      c.group.position.set(((c.x + 200 + time * c.speed) % 400) - 200, c.y, c.z + Math.sin(time * .02 + c.x) * 2);
    }
  }
  update(0);
  return { update };
}

