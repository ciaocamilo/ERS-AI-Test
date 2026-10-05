import * as THREE from './three.module.js';

// A conservative envelope includes the ears, trunk and flight bobbing in any heading.
export function hitsObstacle(p, obstacles) {
  return obstacles.some(b => p.x + 3.35 > b.min.x && p.x - 3.35 < b.max.x &&
    p.z + 3.35 > b.min.z && p.z - 3.35 < b.max.z &&
    p.y + 1.7 > b.min.y && p.y - 1.85 < b.max.y);
}
export function moveWithCollisions(position, target, obstacles) {
  const result = position.clone(), delta = target.clone().sub(position);
  const steps = Math.max(1, Math.ceil(delta.length() / .2));
  const blocked = {x: false, y: false, z: false};
  for (let i = 0; i < steps; i++) {
    for (const axis of ['y', 'x', 'z']) {
      const previous = result[axis];
      result[axis] += delta[axis] / steps;
      if (hitsObstacle(result, obstacles)) {
        result[axis] = previous;
        blocked[axis] = true;
      }
    }
  }
  return {position: result, blocked};
}

// Reuse geometry/material batches for the static city and moving cars.
export function batchMeshes(scene, roots, dynamic = false) {
  scene.updateMatrixWorld(true);
  const groups = new Map();
  for (const root of roots) root.traverse(mesh => {
    if (!mesh.isMesh || mesh.isInstancedMesh || Array.isArray(mesh.material)) return;
    const key = mesh.geometry.uuid + ':' + mesh.material.uuid;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(mesh);
  });
  const batches = [];
  for (const meshes of groups.values()) {
    if (!dynamic && meshes.length < 3) continue;
    const batch = new THREE.InstancedMesh(meshes[0].geometry, meshes[0].material, meshes.length);
    batch.castShadow = meshes.some(m => m.castShadow);
    batch.receiveShadow = meshes.some(m => m.receiveShadow);
    if (dynamic) {
      batch.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      batch.frustumCulled = false;
    }
    meshes.forEach((m, i) => {
      batch.setMatrixAt(i, m.matrixWorld);
      m.visible = false;
    });
    batch.computeBoundingSphere();
    scene.add(batch);
    batches.push({batch, meshes});
  }
  return () => {
    for (const root of roots) root.updateMatrixWorld(true);
    for (const {batch, meshes} of batches) {
      meshes.forEach((m, i) => batch.setMatrixAt(i, m.matrixWorld));
      batch.instanceMatrix.needsUpdate = true;
    }
  };
}

export function createPedestrians(scene, sidewalks) {
  const people = sidewalks.flatMap((block, index) => [0, 1].map(lane => ({
    x: block.x, z: block.z, lane, type: (index * 2 + lane) % 3,
    phase: (index * .271 + lane * .45) % 1, speed: .6 + (index % 4) * .12,
  })));
  const material = new THREE.MeshStandardMaterial({roughness: .85});
  const geometries = [new THREE.BoxGeometry(1, 1, 1), new THREE.SphereGeometry(1, 10, 8)];
  const body = new THREE.InstancedMesh(geometries[0], material, people.length * 5);
  const heads = new THREE.InstancedMesh(geometries[1], material, people.length * 2);
  for (const mesh of [body, heads]) {
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    mesh.frustumCulled = false;
    scene.add(mesh);
  }
  const dummy = new THREE.Object3D();
  const root = new THREE.Object3D();
  const matrix = new THREE.Matrix4();
  const skin = [0xe6b08a, 0xad7452, 0x784b35, 0xf1c8aa];
  const shirts = [0x477fa9, 0xdc7978, 0x73a16a, 0xd4ac55, 0x866ca4, 0x49a2a0];
  function part(mesh, index, x, y, z, sx, sy, sz, color, swing = 0) {
    dummy.position.set(x, y, z);
    dummy.scale.set(sx, sy, sz);
    dummy.rotation.set(swing, 0, 0);
    dummy.updateMatrix();
    matrix.multiplyMatrices(root.matrix, dummy.matrix);
    mesh.setMatrixAt(index, matrix);
    if (color !== undefined) mesh.setColorAt(index, new THREE.Color(color));
  }
  function update(time, initialize = false) {
    people.forEach((p, i) => {
      const child = p.type === 2, woman = p.type === 1;
      const size = child ? .65 : 1;
      // Shuttle along the north/east sidewalks; never enter roads or buildings.
      const phase = (p.phase + time * p.speed / 18) % 1;
      const t = phase < .5 ? phase * 2 : 2 - phase * 2;
      const travel = -4.5 + t * 9;
      root.position.set(p.x + (p.lane ? 6.25 : travel), .34, p.z + (p.lane ? travel : -6.25));
      root.scale.setScalar(size);
      root.rotation.y = (p.lane ? 0 : Math.PI / 2) + (phase < .5 ? 0 : Math.PI);
      root.updateMatrix();
      const step = Math.sin(time * (child ? 7 : 5) + i) * .35;
      const shirt = initialize ? shirts[i % shirts.length] : undefined;
      const trousers = initialize ? 0x394858 : undefined;
      const complexion = initialize ? skin[i % skin.length] : undefined;
      part(body, i * 5, 0, 1.02, 0, woman ? .40 : .44, .58, .26, shirt);
      part(body, i * 5 + 1, -.12, .38, 0, .16, .65, .19, trousers, step);
      part(body, i * 5 + 2, .12, .38, 0, .16, .65, .19, trousers, -step);
      part(body, i * 5 + 3, -.29, .95, 0, .13, .53, .15, complexion, -step);
      part(body, i * 5 + 4, .29, .95, 0, .13, .53, .15, complexion, step);
      part(heads, i * 2, 0, 1.52, 0, .22, .25, .21, complexion);
      part(heads, i * 2 + 1, 0, woman ? 1.60 : 1.69, woman ? -.05 : 0, .23, woman ? .24 : .12, .22, initialize ? [0x49352a, 0x9a6b38, 0x2d2826][i % 3] : undefined);
    });
    body.instanceMatrix.needsUpdate = heads.instanceMatrix.needsUpdate = true;
    if (initialize) body.instanceColor.needsUpdate = heads.instanceColor.needsUpdate = true;
  }
  update(0, true);
  return {update, count: people.length};
}
