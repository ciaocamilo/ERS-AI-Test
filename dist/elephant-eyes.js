import * as THREE from './three.module.js';

export function blinkAmount(seconds) {
  // One short, synchronized blink every ten seconds of active play.
  const phase = ((seconds % 10) + 10) % 10;
  if (seconds < 10 || phase > .32) return 0;
  return Math.sin(Math.PI * phase / .32) ** 2;
}

export function createEye(side, pink) {
  const group = new THREE.Group();
  group.position.set(side * .58, .76, -2.09);
  const skin = new THREE.MeshStandardMaterial({color: pink, roughness: .83});
  const rimMaterial = new THREE.MeshStandardMaterial({color: 0xec91bc, roughness: .83});
  const socket = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 16), skin);
  socket.scale.set(.225, .205, .055);
  group.add(socket);
  const opening = new THREE.Group();
  opening.position.z = -.059;
  group.add(opening);
  // A soft oval opening with large pupils and a fine pink eyelid rim.
  const vertices = [0, 0, -.04], indices = [];
  const count = 48;
  for (let i = 0; i <= count; i++) {
    const t = i / count * Math.PI * 2;
    const x = .18 * Math.cos(t);
    const y = .165 * Math.sin(t);
    vertices.push(x, y, 0);
    if (i < count) indices.push(0, i + 2, i + 1);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  opening.add(new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({color: 0xfff9ed, roughness: .65})));
  const pupil = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 12), new THREE.MeshStandardMaterial({color: 0x203449, roughness: .5}));
  pupil.position.set(-side * .012, 0, -.041);
  pupil.scale.set(.109, .136, .025);
  opening.add(pupil);
  const glint = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 8), new THREE.MeshBasicMaterial({color: 0xffffff}));
  glint.position.set(-.022, .035, -.065);
  glint.scale.set(.024, .03, .01);
  opening.add(glint);
  for (const direction of [-1, 1]) {
    const points = Array.from({length: 25}, (_, i) => {
      const u = i / 12 - 1;
      return new THREE.Vector3(u * .18, direction * .165 * Math.sqrt(Math.max(0, 1 - u * u)), -.009);
    });
    opening.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 32, direction === 1 ? .018 : .012, 8, false), rimMaterial));
  }
  return {
    group,
    update(amount) {
      opening.scale.y = Math.max(.015, 1 - amount);
    },
  };
}
