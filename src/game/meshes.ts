import * as THREE from "three";

export type FigureParts = {
  leftLeg: THREE.Object3D
  rightLeg: THREE.Object3D
  leftArm: THREE.Object3D
  rightArm: THREE.Object3D
  torso: THREE.Object3D
  head: THREE.Object3D
  gun: THREE.Group
  pistol: THREE.Object3D
  shotgun: THREE.Object3D
  coatMat: THREE.MeshStandardMaterial
  eyeMat: THREE.MeshStandardMaterial
};

function box(
  w: number,
  h: number,
  d: number,
  mat: THREE.Material,
  x = 0,
  y = 0,
  z = 0,
): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

export function makeFigure(opts: {
  coat: number
  skin: number
  eyes: number
  scale?: number
  hunched?: boolean
  spikes?: boolean
  rifle?: boolean
}): { group: THREE.Group; parts: FigureParts } {
  const group = new THREE.Group();
  const scale = opts.scale ?? 1;
  const coatMat = new THREE.MeshStandardMaterial({
    color: opts.coat,
    roughness: 0.82,
    metalness: 0.04,
  });
  const skinMat = new THREE.MeshStandardMaterial({
    color: opts.skin,
    roughness: 0.7,
    metalness: 0,
  });
  const eyeMat = new THREE.MeshStandardMaterial({
    color: opts.eyes,
    emissive: opts.eyes,
    emissiveIntensity: 0.85,
    roughness: 0.4,
  });
  const dark = new THREE.MeshStandardMaterial({ color: 0x1a1614, roughness: 0.6, metalness: 0.2 });
  const steel = new THREE.MeshStandardMaterial({ color: 0x8d9294, roughness: 0.35, metalness: 0.7 });
  const wood = new THREE.MeshStandardMaterial({ color: 0x4a3020, roughness: 0.7, metalness: 0.05 });

  const torso = new THREE.Group();
  torso.position.y = 1.05;
  if (opts.hunched) torso.rotation.x = 0.35;
  torso.add(box(0.46, 0.56, 0.28, coatMat, 0, 0.05, 0));
  torso.add(box(0.5, 0.18, 0.3, coatMat, 0, -0.22, 0.02));
  const head = new THREE.Group();
  head.position.set(0, 0.48, opts.hunched ? 0.08 : 0);
  head.add(box(0.26, 0.28, 0.24, skinMat));
  head.add(box(0.3, 0.12, 0.26, coatMat, 0, 0.12, 0));
  head.add(box(0.05, 0.04, 0.03, eyeMat, -0.06, 0.02, 0.12));
  head.add(box(0.05, 0.04, 0.03, eyeMat, 0.06, 0.02, 0.12));
  torso.add(head);

  const leftArm = new THREE.Group();
  leftArm.position.set(-0.32, 0.18, 0);
  leftArm.add(box(0.12, 0.48, 0.12, coatMat, 0, -0.2, 0));
  const rightArm = new THREE.Group();
  rightArm.position.set(0.32, 0.16, 0.04);
  rightArm.add(box(0.12, 0.46, 0.12, coatMat, 0, -0.18, 0));

  const gun = new THREE.Group();
  gun.position.set(0.06, -0.38, 0.16);
  const pistol = new THREE.Group();
  pistol.add(box(0.06, 0.1, 0.22, dark, 0, 0, 0.06));
  pistol.add(box(0.05, 0.12, 0.05, dark, 0, -0.08, -0.02));
  const shotgun = new THREE.Group();
  shotgun.add(box(0.07, 0.08, 0.46, wood, 0, 0, 0.12));
  shotgun.add(box(0.04, 0.04, 0.5, steel, 0, 0.05, 0.14));
  shotgun.visible = false;
  if (opts.rifle) {
    pistol.visible = false;
    shotgun.visible = true;
  }
  gun.add(pistol, shotgun);
  rightArm.add(gun);
  torso.add(leftArm, rightArm);

  if (opts.spikes) {
    const spikeMat = new THREE.MeshStandardMaterial({
      color: 0x2c241c,
      roughness: 0.5,
      metalness: 0.15,
    });
    for (const side of [-1, 1]) {
      const spike = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.55, 5), spikeMat);
      spike.position.set(side * 0.18, 0.72, -0.02);
      spike.rotation.z = side * -0.5;
      spike.castShadow = true;
      torso.add(spike);
    }
    const core = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 8), eyeMat);
    core.position.set(0, 0.05, 0.16);
    torso.add(core);
  }

  const leftLeg = new THREE.Group();
  leftLeg.position.set(-0.12, 0.72, 0);
  leftLeg.add(box(0.14, 0.42, 0.14, dark, 0, -0.2, 0));
  leftLeg.add(box(0.15, 0.08, 0.22, dark, 0, -0.42, 0.04));
  const rightLeg = new THREE.Group();
  rightLeg.position.set(0.12, 0.72, 0);
  rightLeg.add(box(0.14, 0.42, 0.14, dark, 0, -0.2, 0));
  rightLeg.add(box(0.15, 0.08, 0.22, dark, 0, -0.42, 0.04));

  group.add(torso, leftLeg, rightLeg);
  group.scale.setScalar(scale);
  return {
    group,
    parts: { leftLeg, rightLeg, leftArm, rightArm, torso, head, gun, pistol, shotgun, coatMat, eyeMat },
  };
}

export function animateFigure(parts: FigureParts, phase: number, moving: number, attack: number, dead: number) {
  const swing = Math.sin(phase) * moving;
  parts.leftLeg.rotation.x = swing * 0.7;
  parts.rightLeg.rotation.x = -swing * 0.7;
  parts.leftArm.rotation.x = -swing * 0.45 + attack * 0.2;
  parts.rightArm.rotation.x = -0.7 - attack * 0.8;
  parts.torso.rotation.z = swing * 0.05;
  parts.torso.position.y = 1.05 + Math.sin(phase * 2) * 0.015 * moving;
  if (dead > 0) {
    parts.torso.rotation.x = Math.min(1.2, dead * 1.4);
  }
}

export type TexSet = {
  plaster: THREE.MeshStandardMaterial
  plasterDark: THREE.MeshStandardMaterial
  wood: THREE.MeshStandardMaterial
  woodDark: THREE.MeshStandardMaterial
  roof: THREE.MeshStandardMaterial
  stone: THREE.MeshStandardMaterial
  dirt: THREE.MeshStandardMaterial
  path: THREE.MeshStandardMaterial
  metal: THREE.MeshStandardMaterial
  hay: THREE.MeshStandardMaterial
  cloth: THREE.MeshStandardMaterial
  window: THREE.MeshStandardMaterial
  ember: THREE.MeshStandardMaterial
  bark: THREE.MeshStandardMaterial
  leaf: THREE.MeshStandardMaterial
  mural: THREE.MeshStandardMaterial
};

function hash(x: number, y: number) {
  const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return n - Math.floor(n);
}

function makeMaps(paint: (x: number, y: number, n: number) => [number, number, number, number]) {
  const size = 128;
  const color = document.createElement("canvas");
  color.width = color.height = size;
  const cg = color.getContext("2d")!;
  const img = cg.createImageData(size, size);
  const height = new Float32Array(size * size);
  const rough = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const n = hash(x, y);
      const n2 = hash(x * 0.5, y * 0.37);
      const [r, g, b, roughV, h] = [
        ...paint(x, y, n * 0.65 + n2 * 0.35),
        0,
      ] as unknown as number[];
      void roughV;
      const painted = paint(x, y, n * 0.7 + n2 * 0.3);
      const i = (y * size + x) * 4;
      img.data[i] = painted[0];
      img.data[i + 1] = painted[1];
      img.data[i + 2] = painted[2];
      img.data[i + 3] = 255;
      height[y * size + x] = painted[3];
      const rv = Math.max(0, Math.min(255, 150 + painted[3] * 80));
      rough[i] = rough[i + 1] = rough[i + 2] = rv;
      rough[i + 3] = 255;
    }
  }
  cg.putImageData(img, 0, 0);
  const map = new THREE.CanvasTexture(color);
  map.wrapS = map.wrapT = THREE.RepeatWrapping;
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = 4;

  const nd = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const l = height[y * size + ((x + size - 1) % size)]!;
      const r = height[y * size + ((x + 1) % size)]!;
      const d = height[((y + size - 1) % size) * size + x]!;
      const u = height[((y + 1) % size) * size + x]!;
      const dx = (l - r) * 3.2;
      const dy = (d - u) * 3.2;
      const len = Math.hypot(dx, dy, 1);
      const o = (y * size + x) * 4;
      nd[o] = (dx / len) * 127 + 128;
      nd[o + 1] = (dy / len) * 127 + 128;
      nd[o + 2] = (1 / len) * 127 + 128;
      nd[o + 3] = 255;
    }
  }
  const normalMap = new THREE.DataTexture(nd, size, size);
  normalMap.wrapS = normalMap.wrapT = THREE.RepeatWrapping;
  normalMap.colorSpace = THREE.NoColorSpace;
  normalMap.needsUpdate = true;

  const roughMap = new THREE.DataTexture(rough, size, size);
  roughMap.wrapS = roughMap.wrapT = THREE.RepeatWrapping;
  roughMap.colorSpace = THREE.NoColorSpace;
  roughMap.needsUpdate = true;
  return { map, normalMap, roughMap };
}

function std(color: number, maps: ReturnType<typeof makeMaps>, repeat = 1, metal = 0.04, rough = 0.86) {
  const mat = new THREE.MeshStandardMaterial({
    color,
    map: maps.map,
    normalMap: maps.normalMap,
    roughnessMap: maps.roughMap,
    roughness: rough,
    metalness: metal,
  });
  mat.map!.repeat.set(repeat, repeat);
  mat.normalMap!.repeat.set(repeat, repeat);
  mat.roughnessMap!.repeat.set(repeat, repeat);
  mat.normalScale.set(0.55, 0.55);
  return mat;
}

export function makeTextures(): TexSet {
  const plaster = makeMaps((x, y, n) => {
    const crack = (x + y) % 37 < 1 ? -30 : 0;
    const v = 168 + n * 36 + crack;
    return [v, v - 8, v - 18, n];
  });
  const wood = makeMaps((x, _y, n) => {
    const stripe = Math.sin(x * 0.45) * 18;
    const v = 92 + stripe + n * 24;
    return [v + 20, v * 0.62, v * 0.32, n];
  });
  const dirt = makeMaps((x, y, n) => {
    const patch = hash(x >> 3, y >> 3);
    const g = 70 + patch * 30 + n * 20;
    return [g + 8, g + 4, g * 0.55, n];
  });
  const stone = makeMaps((x, y, n) => {
    const block = ((x >> 4) + (y >> 4)) % 2 === 0 ? 12 : -8;
    const v = 120 + block + n * 28;
    return [v, v - 2, v - 6, n];
  });
  const roof = makeMaps((x, y, n) => {
    const row = y % 10 < 2 ? -16 : 0;
    const v = 70 + row + n * 18;
    return [v + 12, v * 0.45, v * 0.38, n];
  });
  const leaf = makeMaps((_x, _y, n) => {
    const v = 48 + n * 30;
    return [v * 0.7, v + 10, v * 0.5, n];
  });
  const bark = makeMaps((x, _y, n) => {
    const v = 54 + (x % 5) * 3 + n * 16;
    return [v + 10, v * 0.7, v * 0.4, n];
  });

  const muralCanvas = document.createElement("canvas");
  muralCanvas.width = 256;
  muralCanvas.height = 256;
  const g = muralCanvas.getContext("2d")!;
  g.fillStyle = "#2a231c";
  g.fillRect(0, 0, 256, 256);
  g.strokeStyle = "#8a7760";
  g.strokeRect(12, 12, 232, 232);
  g.fillStyle = "#e6d7c3";
  g.font = "64px Palatino, serif";
  g.fillText("I", 48, 110);
  g.fillText("III", 138, 168);
  g.fillText("II", 78, 214);
  g.font = "16px Palatino, serif";
  g.fillStyle = "#cbbba4";
  g.fillText("dawn     dusk     between", 36, 48);
  const muralMap = new THREE.CanvasTexture(muralCanvas);
  muralMap.colorSpace = THREE.SRGBColorSpace;
  const mural = new THREE.MeshStandardMaterial({ map: muralMap, roughness: 0.9, metalness: 0 });

  return {
    plaster: std(0xc8b8a4, plaster, 2),
    plasterDark: std(0x8d7d70, plaster, 2),
    wood: std(0x6b4630, wood, 2),
    woodDark: std(0x3a2618, wood, 2),
    roof: std(0x5a3028, roof, 3, 0.08, 0.75),
    stone: std(0x8a847c, stone, 2),
    dirt: std(0x6a5a40, dirt, 6),
    path: std(0x5c5348, stone, 4),
    metal: std(0x6e7378, stone, 1, 0.72, 0.38),
    hay: std(0x8a7040, dirt, 2),
    cloth: std(0x4a3030, plaster, 1),
    bark: std(0x3a2a1e, bark, 1),
    leaf: std(0x243024, leaf, 1),
    window: new THREE.MeshStandardMaterial({
      color: 0x3a2a18,
      emissive: 0xffb15a,
      emissiveIntensity: 1.4,
      roughness: 0.35,
    }),
    ember: new THREE.MeshStandardMaterial({
      color: 0x3a180e,
      emissive: 0xff6a2a,
      emissiveIntensity: 0.15,
      roughness: 0.5,
    }),
    mural,
  };
}

export function plaque(text: string): THREE.Mesh {
  const c = document.createElement("canvas");
  c.width = 128;
  c.height = 64;
  const g = c.getContext("2d")!;
  g.fillStyle = "#241c16";
  g.fillRect(0, 0, 128, 64);
  g.fillStyle = "#f3eadb";
  g.font = "40px Palatino, serif";
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillText(text, 64, 34);
  const map = new THREE.CanvasTexture(c);
  map.colorSpace = THREE.SRGBColorSpace;
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(0.46, 0.24),
    new THREE.MeshStandardMaterial({ map, roughness: 0.8 }),
  );
  return mesh;
}
