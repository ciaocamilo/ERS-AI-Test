import * as THREE from './three.module.js';

// Small reusable, seamless material textures; no network downloads per frame.
export function createSceneryMaterials(renderer) {
  const maps = new Map(), materials = new Map();
  function texture(kind) {
    if (maps.has(kind)) return maps.get(kind);
    const size = 128, bytes = new Uint8Array(size * size * 4);
    let seed = 193;
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        seed = (seed * 16807) % 2147483647;
        const n = seed / 2147483647;
        let v = 218 + n * 35;
        if (kind === 'grass') v = 160 + n * 80 + 12 * Math.sin(x * 1.8 + y * .7);
        if (kind === 'leaves') v = 160 + n * 70 + 18 * Math.sin(x * .5) * Math.cos(y * .7);
        if (kind === 'bark') v = 160 + n * 30 + 35 * Math.sin(x * .8 + Math.sin(y * .12));
        if (kind === 'asphalt') v = 160 + n * 65;
        if (kind === 'brick' && (y % 16 < 1 || (x + (Math.floor(y / 16) % 2) * 16) % 32 < 1)) v = 150;
        if (kind === 'paving' && (x % 32 < 2 || y % 32 < 2)) v = 155;
        const i = (y * size + x) * 4;
        bytes[i] = bytes[i + 1] = bytes[i + 2] = v;
        bytes[i + 3] = 255;
      }
    }
    const map = new THREE.DataTexture(bytes, size, size, THREE.RGBAFormat);
    map.wrapS = map.wrapT = THREE.RepeatWrapping;
    map.magFilter = THREE.LinearFilter;
    map.minFilter = THREE.LinearMipmapLinearFilter;
    map.generateMipmaps = true;
    map.colorSpace = THREE.SRGBColorSpace;
    map.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
    map.needsUpdate = true;
    maps.set(kind, map);
    return map;
  }
  function surface(kind, color, repeatX = 1, repeatY = repeatX) {
    const key = [kind, color, repeatX, repeatY].join(':');
    if (!materials.has(key)) {
      const map = texture(kind).clone();
      map.repeat.set(repeatX, repeatY);
      map.needsUpdate = true;
      materials.set(key, new THREE.MeshStandardMaterial({color, map, bumpMap: map, bumpScale: kind === 'grass' ? .05 : .025, roughness: .9}));
    }
    return materials.get(key);
  }
  const glass = new THREE.MeshStandardMaterial({color: 0x779da9, metalness: .65, roughness: .2});
  const paints = new Map();
  function paint(color) {
    if (!paints.has(color)) paints.set(color, new THREE.MeshStandardMaterial({color, metalness: .45, roughness: .27}));
    return paints.get(color);
  }
  return {
    surface,
    glass,
    paint,
    reflect(envMap) {
      for (const material of [glass, ...paints.values()]) {
        material.envMap = envMap;
        material.envMapIntensity = .8;
        material.needsUpdate = true;
      }
    },
  };
}

export function createLake(scene, renderer, coarsePointer, materials) {
  const group = new THREE.Group();
  group.position.set(24, 0, 24);
  scene.add(group);
  const bank = new THREE.Mesh(new THREE.CircleGeometry(18.4, 96), materials.surface('paving', 0xd6cba3, 12));
  bank.rotation.x = -Math.PI / 2;
  bank.position.y = .04;
  bank.receiveShadow = true;
  group.add(bank);
  const size = 128, bytes = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = x / size * Math.PI * 2, v = y / size * Math.PI * 2;
      // Several wave directions and wavelengths avoid regular stripes.
      let nx = 0, ny = 0;
      for (const [a, b, strength, phase] of [[2, 1, .12, .3], [1, -3, .09, 1.8], [5, 2, .055, 2.9], [-3, 7, .04, .9], [9, -5, .028, 4.2], [13, 8, .018, 5.1]]) {
        const wave = Math.cos(a * u + b * v + phase) * strength;
        const length = Math.hypot(a, b);
        nx += wave * a / length;
        ny += wave * b / length;
      }
      const n = new THREE.Vector3(nx, ny, 1).normalize(), i = (y * size + x) * 4;
      bytes[i] = (n.x * .5 + .5) * 255;
      bytes[i + 1] = (n.y * .5 + .5) * 255;
      bytes[i + 2] = (n.z * .5 + .5) * 255;
      bytes[i + 3] = 255;
    }
  }
  const normals = new THREE.DataTexture(bytes, size, size, THREE.RGBAFormat);
  normals.wrapS = normals.wrapT = THREE.RepeatWrapping;
  normals.magFilter = normals.minFilter = THREE.LinearFilter;
  normals.repeat.set(2.3, 2.3);
  normals.needsUpdate = true;
  const material = new THREE.MeshPhysicalMaterial({color: 0xffffff, vertexColors: true, metalness: 0, roughness: .24, ior: 1.333, clearcoat: 1, clearcoatRoughness: .18, normalMap: normals, clearcoatNormalMap: normals, normalScale: new THREE.Vector2(.75, .75), envMapIntensity: 1.1});
  const water = new THREE.Mesh(new THREE.CircleGeometry(17.2, 96, 0, Math.PI * 2), material);
  const positions = water.geometry.attributes.position;
  const colors = [];
  const deep = new THREE.Color(0x18464b), shallow = new THREE.Color(0x528578);
  for (let i = 0; i < positions.count; i++) {
    const radius = Math.hypot(positions.getX(i), positions.getY(i)) / 17.2;
    const color = deep.clone().lerp(shallow, Math.pow(radius, 3));
    colors.push(color.r, color.g, color.b);
  }
  water.geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  water.rotation.x = -Math.PI / 2;
  water.position.y = .10;
  group.add(water);
  // A fixed-size pool of expanding ripples under a low-flying elephant.
  const rippleGeometry = new THREE.RingGeometry(.90, 1, 64);
  const ripples = Array.from({length: 8}, () => {
    const rippleMaterial = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false,
      uniforms: {opacity: {value: 0}},
      vertexShader: `varying vec2 worldXZ; varying float ringRadius;
        void main() { vec4 world = modelMatrix * vec4(position, 1.0);
          worldXZ = world.xz; ringRadius = length(position.xy);
          gl_Position = projectionMatrix * viewMatrix * world; }`,
      fragmentShader: `uniform float opacity; varying vec2 worldXZ; varying float ringRadius;
        void main() { if (distance(worldXZ, vec2(24.0)) > 17.15) discard;
          float edge = sin(clamp((ringRadius - .90) * 10.0, 0.0, 1.0) * 3.14159265);
          gl_FragColor = vec4(.65, .86, .82, opacity * edge); }`,
    });
    const mesh = new THREE.Mesh(rippleGeometry, rippleMaterial);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.y = .13;
    mesh.visible = false;
    group.add(mesh);
    return {mesh, birth: -100, strength: 0};
  });
  let lastRipple = -100, nextRipple = 0;
  const target = new THREE.WebGLCubeRenderTarget(coarsePointer ? 128 : 256, {generateMipmaps: true, minFilter: THREE.LinearMipmapLinearFilter});
  const reflectionCamera = new THREE.CubeCamera(.1, 190, target);
  reflectionCamera.position.set(24, .6, 24);
  return {
    capture() {
      // Capture the actual city once; moving wave normals animate its reflection.
      group.visible = false;
      reflectionCamera.update(renderer, scene);
      group.visible = true;
      material.envMap = target.texture;
      material.needsUpdate = true;
      materials.reflect(target.texture);
    },
    update(time, elephant) {
      normals.offset.set(time * .006, time * .004);
      if (elephant) {
        const overWater = Math.hypot(elephant.x - 24, elephant.z - 24) < 17.1;
        const clearance = elephant.y - 1.6 - .10;
        const strength = THREE.MathUtils.clamp(1 - clearance / 3.2, 0, 1);
        if (overWater && strength > 0 && time - lastRipple >= .30) {
          const ripple = ripples[nextRipple++ % ripples.length];
          ripple.birth = time;
          ripple.strength = strength;
          ripple.mesh.position.set(elephant.x - 24, .13, elephant.z - 24);
          lastRipple = time;
        }
      }
      for (const ripple of ripples) {
        const age = time - ripple.birth;
        ripple.mesh.visible = age >= 0 && age < 2.4;
        if (!ripple.mesh.visible) continue;
        ripple.mesh.scale.setScalar(.5 + age * 1.9);
        ripple.mesh.material.uniforms.opacity.value = ripple.strength * .55 * Math.sin(Math.PI * age / 2.4);
      }
    },
  };
}
