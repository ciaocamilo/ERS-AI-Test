import * as THREE from './three.module.js';

// One continuous skin for the head, neck and body, rather than overlapping balls.
export function createBodyGeometry() {
  // z, half-width, top, bottom. The neck blends into the shoulders.
  const profile = [
    [-2.34, 0, .45, .45],
    [-2.25, .38, .91, -.01],
    [-2.04, .69, 1.22, -.33],
    [-1.65, .91, 1.42, -.48],
    [-1.12, .80, 1.12, -.48],
    [-.60, 1.02, 1.23, -.78],
    [0, 1.10, 1.15, -.94],
    [.76, 1.04, 1.07, -.91],
    [1.34, .87, .92, -.76],
    [1.70, .49, .58, -.40],
    [1.88, 0, .10, .10],
  ];
  const upper = new THREE.CatmullRomCurve3(profile.map(([z, w, top]) => new THREE.Vector3(w, top, z)));
  const lower = new THREE.CatmullRomCurve3(profile.map(([z, w, , bottom]) => new THREE.Vector3(w, bottom, z)));
  const rings = 80, sides = 40;
  const positions = [], indices = [];
  for (let i = 0; i <= rings; i++) {
    const t = i / rings;
    const a = upper.getPoint(t), b = lower.getPoint(t);
    for (let j = 0; j <= sides; j++) {
      const angle = j / sides * Math.PI * 2;
      positions.push(Math.max(0, a.x) * Math.cos(angle), (a.y + b.y) / 2 + (a.y - b.y) / 2 * Math.sin(angle), a.z);
      if (i < rings && j < sides) {
        const p = i * (sides + 1) + j, q = p + sides + 1;
        if (i > 0) indices.push(p, p + 1, q);
        if (i < rings - 1) indices.push(p + 1, q + 1, q);
      }
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  const normals = geometry.attributes.normal;
  for (let i = 0; i <= rings; i++) {
    const first = i * (sides + 1), last = first + sides;
    const n = new THREE.Vector3().fromBufferAttribute(normals, first)
      .add(new THREE.Vector3().fromBufferAttribute(normals, last)).normalize();
    normals.setXYZ(first, n.x, n.y, n.z);
    normals.setXYZ(last, n.x, n.y, n.z);
    if (i === 0 || i === rings) {
      for (let j = 0; j <= sides; j++) normals.setXYZ(first + j, 0, 0, i === 0 ? -1 : 1);
    }
  }
  return geometry;
}

export function createTrunkGeometry(curve) {
  const length = 48, sides = 24;
  const geometry = new THREE.TubeGeometry(curve, length, 1, sides, false);
  const positions = geometry.attributes.position;
  for (let i = 0; i <= length; i++) {
    const t = i / length, center = curve.getPointAt(t);
    const radius = THREE.MathUtils.lerp(.36, .145, t);
    for (let j = 0; j <= sides; j++) {
      const p = i * (sides + 1) + j;
      const point = new THREE.Vector3().fromBufferAttribute(positions, p).sub(center).multiplyScalar(radius).add(center);
      positions.setXYZ(p, point.x, point.y, point.z);
    }
  }
  // Close the end using the existing rim vertices, without a separate round object.
  const array = Array.from(positions.array);
  const end = curve.getPointAt(1);
  const centerIndex = array.length / 3;
  array.push(end.x, end.y, end.z);
  const indices = Array.from(geometry.index.array);
  const rim = length * (sides + 1);
  for (let j = 0; j < sides; j++) indices.push(centerIndex, rim + j + 1, rim + j);
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(array, 3));
  geometry.setIndex(indices);
  // The cap adds a vertex: all GPU attributes must include it.
  const uv = Array.from(geometry.attributes.uv.array);
  uv.push(.5, .5);
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geometry.deleteAttribute('normal');
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  return geometry;
}
