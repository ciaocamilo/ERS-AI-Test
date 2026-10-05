import * as THREE from './three.module.js';

// A small, closed smile without teeth, fitted to the face.
export function createSmile(body) {
  const smile = new THREE.Group();
  smile.name = 'gentle-closed-smile';
  body.updateMatrixWorld(true);
  const ray = new THREE.Raycaster();
  const points = [];
  for (let i = 0; i <= 32; i++) {
    const u = i / 16 - 1;
    const x = u * .39, y = -.17 + .14 * u * u;
    ray.set(new THREE.Vector3(x, y, -5), new THREE.Vector3(0, 0, 1));
    const hit = ray.intersectObject(body, false)[0];
    if (!hit) throw new Error('Smile must lie on the face');
    points.push(new THREE.Vector3(x, y, hit.point.z - .022));
  }
  smile.add(new THREE.Mesh(
    new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 48, .014, 8, false),
    new THREE.MeshStandardMaterial({color: 0xc775a1, roughness: .85}),
  ));
  return smile;
}
