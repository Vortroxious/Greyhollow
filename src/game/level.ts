import * as THREE from "three";
import RAPIER from "@dimforge/rapier3d-compat";
import { NAV } from "@/game/nav";
import { makeFigure, makeTextures, plaque, type TexSet } from "@/game/meshes";

export const GROUP_WORLD = 0x0001;
export const GROUP_ACTOR = 0x0002;

export function groups(member: number, filter: number) {
  return ((member & 0xffff) << 16) | (filter & 0xffff);
}

export type Rect = { minX: number; maxX: number; minZ: number; maxZ: number };

export type Spawn = {
  id: string
  kind: "shambler" | "marksman" | "boss"
  x: number
  z: number
  yaw: number
  waypoints: { x: number; z: number }[]
};

export type InteractKind = "radio" | "loot" | "door" | "brazier" | "chest" | "note";

export type Interactable = {
  id: string
  kind: InteractKind
  x: number
  y: number
  z: number
  radius: number
  prompt: string
  loot?: { kind: "pistolAmmo" | "shells" | "herb" | "barnKey" | "sigil" | "note" | "shotgun"; qty?: number }[]
  checkpoint?: "ash" | "square" | "chapel"
  door?: "barn" | "chapel"
  brazier?: 0 | 1 | 2
};

export type Level = {
  textures: TexSet
  blocked: Uint8Array
  solids: Rect[]
  interacts: Interactable[]
  doors: {
    barn: { hinge: THREE.Group; collider: RAPIER.Collider; gap: Rect }
    chapel: { hinge: THREE.Group; collider: RAPIER.Collider; gap: Rect }
  }
  braziers: { light: THREE.PointLight; mat: THREE.MeshStandardMaterial }[]
  chestLid: THREE.Object3D
  spawns: Spawn[]
  playerLight: THREE.PointLight
  muzzle: THREE.PointLight
  sun: THREE.DirectionalLight
  sunTarget: THREE.Object3D
  dust: THREE.InstancedMesh
};

const WORLD_FILTER = groups(GROUP_WORLD, GROUP_ACTOR);

export function groundY(x: number, z: number): number {
  if (x > 20.15 && x < 23.85 && z <= -18.7 && z >= -26.3) {
    const t = (-18.7 - z) / (-18.7 - -26.3);
    return -3.6 * Math.min(1, Math.max(0, t));
  }
  if (x > 15.3 && x < 28.7 && z < -24.1 && z > -35.7) return -3.6;
  return 0;
}

function inPit(x: number, z: number) {
  return x > 15 && x < 29 && z < -19.55 && z > -36;
}

function onWalkablePit(x: number, z: number) {
  return groundY(x, z) < -0.05;
}

export function buildLevel(scene: THREE.Scene, world: RAPIER.World): Level {
  const tex = makeTextures();
  const body = world.createRigidBody(RAPIER.RigidBodyDesc.fixed());
  const solids: Rect[] = [];
  const fog = 0x1a1618;
  scene.background = new THREE.Color(fog);
  scene.fog = new THREE.FogExp2(fog, 0.03);

  const hemi = new THREE.HemisphereLight(0x9aafc4, 0x3a2c22, 0.78);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xd5e0ee, 1.25);
  sun.position.set(18, 28, 14);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 70;
  sun.shadow.camera.left = -22;
  sun.shadow.camera.right = 22;
  sun.shadow.camera.top = 22;
  sun.shadow.camera.bottom = -22;
  sun.shadow.bias = -0.00035;
  const sunTarget = new THREE.Object3D();
  scene.add(sunTarget);
  sun.target = sunTarget;
  scene.add(sun);

  const moon = new THREE.Mesh(
    new THREE.SphereGeometry(2.2, 16, 12),
    new THREE.MeshBasicMaterial({ color: 0xd5deea }),
  );
  moon.position.set(-30, 28, -40);
  scene.add(moon);

  function addBox(
    mat: THREE.Material,
    x: number,
    y: number,
    z: number,
    hx: number,
    hy: number,
    hz: number,
    opts?: { solid?: boolean; rotX?: number; shadow?: boolean },
  ) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(hx * 2, hy * 2, hz * 2), mat);
    mesh.position.set(x, y, z);
    if (opts?.rotX) mesh.rotation.x = opts.rotX;
    mesh.castShadow = opts?.shadow !== false;
    mesh.receiveShadow = true;
    scene.add(mesh);
    const desc = RAPIER.ColliderDesc.cuboid(hx, hy, hz).setTranslation(x, y, z).setCollisionGroups(WORLD_FILTER);
    if (opts?.rotX) {
      const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(opts.rotX, 0, 0));
      desc.setRotation({ x: q.x, y: q.y, z: q.z, w: q.w });
    }
    world.createCollider(desc, body);
    if (opts?.solid !== false && !opts?.rotX) {
      solids.push({ minX: x - hx, maxX: x + hx, minZ: z - hz, maxZ: z + hz });
    }
    return mesh;
  }

  function addCylinder(
    mat: THREE.Material,
    x: number,
    y: number,
    z: number,
    r: number,
    hy: number,
    segs = 8,
    visual = true,
  ) {
    if (visual) {
      const mesh = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 1.05, hy * 2, segs), mat);
      mesh.position.set(x, y, z);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      scene.add(mesh);
    }
    world.createCollider(
      RAPIER.ColliderDesc.cylinder(hy, r).setTranslation(x, y, z).setCollisionGroups(WORLD_FILTER),
      body,
    );
    solids.push({ minX: x - r, maxX: x + r, minZ: z - r, maxZ: z + r });
  }

  // Ground slabs around the cellar pit.
  const slab = (
    x0: number,
    x1: number,
    z0: number,
    z1: number,
  ) => {
    const hx = (x1 - x0) / 2;
    const hz = (z1 - z0) / 2;
    addBox(tex.dirt, (x0 + x1) / 2, -0.5, (z0 + z1) / 2, hx, 0.5, hz, { solid: false, shadow: false });
  };
  slab(-44, 15, -50, 56);
  slab(29, 44, -50, 56);
  slab(15, 29, -50, -36);
  slab(15, 29, -19.55, 56);
  addBox(tex.stone, 22, -3.75, -30, 7, 0.15, 6, { solid: false, shadow: false });

  const rampAngle = -Math.atan2(3.6, 7.6);
  addBox(tex.wood, 22, -1.85, -22.5, 1.15, 0.12, 3.85, { solid: false, rotX: rampAngle, shadow: false });

  // Bounds
  addBox(tex.bark, -40, 1.6, 2, 0.4, 1.6, 52, { shadow: false });
  addBox(tex.bark, 40, 1.6, 2, 0.4, 1.6, 52, { shadow: false });
  addBox(tex.bark, 0, 1.6, -48, 40, 1.6, 0.4, { shadow: false });
  addBox(tex.bark, 0, 1.6, 52, 40, 1.6, 0.4, { shadow: false });

  // Ash-road fences
  addBox(tex.woodDark, -7.2, 0.7, 35, 0.12, 0.7, 13);
  addBox(tex.woodDark, 7.2, 0.7, 35, 0.12, 0.7, 13);

  // Visual path + square
  const path = new THREE.Mesh(new THREE.BoxGeometry(5.2, 0.04, 30), tex.path);
  path.position.set(0, 0.03, 36);
  path.receiveShadow = true;
  scene.add(path);
  const square = new THREE.Mesh(new THREE.BoxGeometry(26, 0.04, 24), tex.stone);
  square.position.set(0, 0.025, 8);
  square.receiveShadow = true;
  scene.add(square);

  function building(
    minX: number,
    maxX: number,
    minZ: number,
    maxZ: number,
    height: number,
    wall: THREE.Material,
    roof: THREE.Material,
    door: { side: "n" | "s" | "e" | "w"; center: number; width: number } | null,
    wallBottom = 0,
  ) {
    const t = 0.28;
    const hy = (height - wallBottom) / 2;
    const y = wallBottom + hy;
    const spanX = maxX - minX;
    const spanZ = maxZ - minZ;
    const place = (x: number, z: number, hx: number, hz: number, y0 = y, h = hy) => {
      if (hx < 0.05 || hz < 0.05 || h < 0.05) return;
      addBox(wall, x, y0, z, hx, h, hz);
    };
    const south = door?.side === "s";
    const north = door?.side === "n";
    const east = door?.side === "e";
    const west = door?.side === "w";
    if (!south) place((minX + maxX) / 2, maxZ - t / 2, spanX / 2, t / 2);
    else splitZ(maxZ - t / 2, t / 2, "x");
    if (!north) place((minX + maxX) / 2, minZ + t / 2, spanX / 2, t / 2);
    else splitZ(minZ + t / 2, t / 2, "x");
    if (!east) place(maxX - t / 2, (minZ + maxZ) / 2, t / 2, spanZ / 2);
    else splitZ(maxX - t / 2, t / 2, "z");
    if (!west) place(minX + t / 2, (minZ + maxZ) / 2, t / 2, spanZ / 2);
    else splitZ(minX + t / 2, t / 2, "z");

    function splitZ(fixed: number, thick: number, axis: "x" | "z") {
      if (!door) return;
      const along0 = axis === "x" ? minX : minZ;
      const along1 = axis === "x" ? maxX : maxZ;
      const a = door.center - door.width / 2;
      const b = door.center + door.width / 2;
      const segs: [number, number][] = [
        [along0, a],
        [b, along1],
      ];
      for (const [s0, s1] of segs) {
        if (s1 - s0 < 0.1) continue;
        const mid = (s0 + s1) / 2;
        const half = (s1 - s0) / 2;
        if (axis === "x") place(mid, fixed, half, thick);
        else place(fixed, mid, thick, half);
      }
      const lintelH = height - 2.45;
      if (lintelH > 0.1) {
        const ly = 2.45 + lintelH / 2;
        if (axis === "x") place(door.center, fixed, door.width / 2, thick, ly, lintelH / 2);
        else place(fixed, door.center, thick, door.width / 2, ly, lintelH / 2);
      }
    }

    addBox(roof, (minX + maxX) / 2, height + 0.12, (minZ + maxZ) / 2, spanX / 2 + 0.4, 0.14, spanZ / 2 + 0.4, {
      solid: false,
    });
  }

  // Start shelter
  building(-8.2, -2.2, 43.2, 49.2, 3.1, tex.plasterDark, tex.roof, { side: "e", center: 46.2, width: 2.2 });
  addBox(tex.wood, -6.4, 0.45, 47.4, 0.55, 0.45, 0.35);

  // Mill
  building(-28, -16, 0.4, 12.2, 4.3, tex.plaster, tex.roof, { side: "e", center: 6.2, width: 1.8 });
  addBox(tex.wood, -24.2, 0.75, 8.2, 0.7, 0.4, 0.4);
  addBox(tex.woodDark, -25.2, 0.35, 3.2, 0.4, 0.35, 0.4);
  const millWin = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.7, 1), tex.window);
  millWin.position.set(-28.05, 2.1, 6);
  scene.add(millWin);
  const millLight = new THREE.PointLight(0xffb15a, 1.3, 8, 1.6);
  millLight.position.set(-24, 2.2, 6);
  scene.add(millLight);

  // Cottage
  building(12.2, 22.4, 3.6, 14.2, 3.8, tex.plaster, tex.roof, { side: "w", center: 9, width: 1.8 });
  addBox(tex.wood, 18.2, 0.7, 10.2, 0.8, 0.45, 0.35);
  addBox(tex.woodDark, 16.4, 0.4, 6.2, 0.35, 0.4, 0.35);
  const cotWin = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.7, 1.1), tex.window);
  cotWin.position.set(22.45, 1.9, 8);
  scene.add(cotWin);
  const cotLight = new THREE.PointLight(0xffb15a, 1.1, 7, 1.6);
  cotLight.position.set(18, 2, 9);
  scene.add(cotLight);

  // Barn, including the cellar shell. Walls drop to the pit.
  building(14, 30, -36, -8, 5.2, tex.woodDark, tex.roof, { side: "s", center: 22, width: 2.3 }, -4);
  addBox(tex.woodDark, 19.65, -1.3, -22.6, 0.16, 1.7, 3.5);
  addBox(tex.woodDark, 24.35, -1.3, -22.6, 0.16, 1.7, 3.5);
  addBox(tex.hay, 26.4, 0.55, -15.2, 0.8, 0.55, 0.6);
  addBox(tex.wood, 26.2, 0.4, -11.2, 0.45, 0.4, 0.4);
  const barnLight = new THREE.PointLight(0xffa050, 1.2, 10, 1.5);
  barnLight.position.set(22, 2.4, -14);
  scene.add(barnLight);

  // Cellar dressing
  const mural = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 1.8), tex.mural);
  mural.position.set(15.35, -2.1, -30);
  mural.rotation.y = Math.PI / 2;
  scene.add(mural);

  const braziers: Level["braziers"] = [];
  const brazierPos: [number, number, string][] = [
    [18, -28.2, "I"],
    [22, -33.2, "II"],
    [26, -28.2, "III"],
  ];
  for (const [x, z, label] of brazierPos) {
    addBox(tex.stone, x, -3.15, z, 0.28, 0.45, 0.28, { solid: false });
    const bowlMat = tex.ember.clone();
    const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.16, 0.16, 8), bowlMat);
    bowl.position.set(x, -2.62, z);
    scene.add(bowl);
    const light = new THREE.PointLight(0xff6a2a, 0, 6, 2);
    light.position.set(x, -2.2, z);
    scene.add(light);
    const tag = plaque(label);
    tag.position.set(x, -2.15, z + 0.42);
    scene.add(tag);
    braziers.push({ light, mat: bowlMat });
  }

  const chest = new THREE.Group();
  chest.position.set(22, -3.25, -30.4);
  const chestBase = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.45, 0.55), tex.woodDark);
  chestBase.castShadow = true;
  chest.add(chestBase);
  const chestLid = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.12, 0.57), tex.metal);
  chestLid.position.set(0, 0.28, -0.2);
  chestLid.geometry.translate(0, 0, 0.28);
  chest.add(chestLid);
  scene.add(chest);
  world.createCollider(
    RAPIER.ColliderDesc.cuboid(0.5, 0.3, 0.32).setTranslation(22, -3.2, -30.4).setCollisionGroups(WORLD_FILTER),
    body,
  );
  solids.push({ minX: 21.4, maxX: 22.6, minZ: -30.8, maxZ: -30 });

  // Chapel
  building(-9, 9, -46, -28, 6.2, tex.plasterDark, tex.roof, { side: "s", center: 0, width: 2.3 });
  const steeple = new THREE.Mesh(new THREE.BoxGeometry(1.6, 8, 1.6), tex.plaster);
  steeple.position.set(0, 10, -40);
  steeple.castShadow = true;
  scene.add(steeple);
  const spire = new THREE.Mesh(new THREE.ConeGeometry(1.3, 3.2, 4), tex.roof);
  spire.position.set(0, 15.2, -40);
  spire.castShadow = true;
  scene.add(spire);
  for (const z of [-34.2, -37.4, -40.6]) {
    addBox(tex.wood, -4.1, 0.45, z, 1.5, 0.45, 0.32);
    addBox(tex.wood, 4.1, 0.45, z, 1.5, 0.45, 0.32);
  }
  addBox(tex.stone, 0, 0.55, -43.6, 1.3, 0.55, 0.5);
  const altarLight = new THREE.PointLight(0xffb15a, 1.6, 12, 1.4);
  altarLight.position.set(0, 2.2, -43);
  scene.add(altarLight);
  const chapelWin = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1.6, 0.12), tex.window);
  chapelWin.position.set(-9.05, 3, -38);
  scene.add(chapelWin);

  // Doors
  function makeDoor(
    x: number,
    z: number,
    rotY: number,
    hx: number,
    hz: number,
    gap: Rect,
  ): { hinge: THREE.Group; collider: RAPIER.Collider; gap: Rect } {
    const hinge = new THREE.Group();
    hinge.position.set(x, 0, z);
    hinge.rotation.y = rotY;
    const panel = new THREE.Mesh(new THREE.BoxGeometry(hx * 2, 2.4, 0.12), tex.woodDark);
    panel.position.set(hx, 1.2, 0);
    panel.castShadow = true;
    hinge.add(panel);
    scene.add(hinge);
    const collider = world.createCollider(
      RAPIER.ColliderDesc.cuboid(Math.max(hx, hz), 1.2, Math.max(0.12, Math.min(hx, hz) + 0.05))
        .setTranslation(x + Math.sin(rotY) * hx, 1.2, z + Math.cos(rotY) * hx)
        .setCollisionGroups(WORLD_FILTER),
      body,
    );
    // The cuboid above is a rough block; replace with an axis-aligned door slab matching the gap.
    world.removeCollider(collider, true);
    const cx = (gap.minX + gap.maxX) / 2;
    const cz = (gap.minZ + gap.maxZ) / 2;
    const chx = (gap.maxX - gap.minX) / 2;
    const chz = (gap.maxZ - gap.minZ) / 2;
    const doorCol = world.createCollider(
      RAPIER.ColliderDesc.cuboid(chx, 1.2, chz).setTranslation(cx, 1.2, cz).setCollisionGroups(WORLD_FILTER),
      body,
    );
    solids.push({ ...gap });
    return { hinge, collider: doorCol, gap };
  }

  const barnDoor = makeDoor(20.85, -8.15, 0, 1.15, 0.08, {
    minX: 20.85,
    maxX: 23.15,
    minZ: -8.45,
    maxZ: -7.75,
  });
  const chapelDoor = makeDoor(-1.15, -28.15, 0, 1.15, 0.08, {
    minX: -1.15,
    maxX: 1.15,
    minZ: -28.5,
    maxZ: -27.75,
  });

  // Square props
  addCylinder(tex.stone, 1.2, 0.45, 7.6, 0.85, 0.45, 10);
  const wellRoof = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.12, 0.2), tex.wood);
  wellRoof.position.set(1.2, 1.7, 7.6);
  scene.add(wellRoof);
  addBox(tex.wood, 1.2, 1.15, 6.9, 0.08, 0.7, 0.08, { solid: false });
  addBox(tex.wood, 1.2, 1.15, 8.3, 0.08, 0.7, 0.08, { solid: false });
  const wellLight = new THREE.PointLight(0xffc27a, 1.5, 9, 1.6);
  wellLight.position.set(1.2, 1.8, 7.6);
  scene.add(wellLight);

  addBox(tex.wood, 6.6, 0.4, 11.2, 0.45, 0.4, 0.45);
  addBox(tex.woodDark, -8.2, 0.35, 12.4, 0.9, 0.35, 0.4);
  addBox(tex.wood, 3.2, 0.35, 37.2, 0.4, 0.35, 0.4);
  addBox(tex.wood, -2.4, 0.9, 4.2, 0.15, 0.9, 0.15);

  for (const [x, z] of [
    [-6.2, -22.5],
    [-3.4, -23.2],
    [2.8, -22.8],
    [5.6, -23.4],
    [-1, -21.6],
  ] as const) {
    addBox(tex.stone, x, 0.45, z, 0.28, 0.45, 0.12);
  }

  // Trees
  const trunkGeo = new THREE.CylinderGeometry(0.18, 0.28, 2.4, 5);
  const crownGeo = new THREE.ConeGeometry(1.25, 3.1, 6);
  const count = 70;
  const trunks = new THREE.InstancedMesh(trunkGeo, tex.bark, count);
  const crowns = new THREE.InstancedMesh(crownGeo, tex.leaf, count);
  trunks.castShadow = true;
  crowns.castShadow = true;
  const dummy = new THREE.Object3D();
  const cover: [number, number][] = [
    [-9.5, 16],
    [9.2, 17.5],
    [-5.5, -1.5],
    [11.5, -3.5],
    [-12, -12],
    [8, -16],
  ];
  let ti = 0;
  const placeTree = (x: number, z: number, s: number, collide: boolean) => {
    dummy.position.set(x, 1.2, z);
    dummy.scale.setScalar(s);
    dummy.rotation.set(0, 0, 0);
    dummy.updateMatrix();
    trunks.setMatrixAt(ti, dummy.matrix);
    dummy.position.set(x, 3.1 * s, z);
    dummy.updateMatrix();
    crowns.setMatrixAt(ti, dummy.matrix);
    ti++;
    if (collide) addCylinder(tex.bark, x, 1.1, z, 0.28, 1.1, 6, false);
  };
  for (const [x, z] of cover) placeTree(x, z, 1, true);
  for (; ti < count; ti++) {
    const ring = ti / count;
    const ang = ring * Math.PI * 10.5;
    const rad = 22 + (ti % 7) * 2.4;
    let x = Math.cos(ang) * rad;
    let z = Math.sin(ang) * rad * 0.85 + 4;
    if (Math.abs(x) < 12 && z > 20 && z < 50) x += x < 0 ? -8 : 8;
    dummy.position.set(x, 1.2, z);
    const s = 0.8 + (ti % 5) * 0.12;
    dummy.scale.setScalar(s);
    dummy.rotation.y = ang;
    dummy.updateMatrix();
    trunks.setMatrixAt(ti, dummy.matrix);
    dummy.position.y = 3 * s;
    dummy.updateMatrix();
    crowns.setMatrixAt(ti, dummy.matrix);
  }
  trunks.instanceMatrix.needsUpdate = true;
  crowns.instanceMatrix.needsUpdate = true;
  scene.add(trunks, crowns);

  const dustGeo = new THREE.SphereGeometry(0.04, 4, 4);
  const dustMat = new THREE.MeshBasicMaterial({ color: 0xc8beb2, transparent: true, opacity: 0.28 });
  const dust = new THREE.InstancedMesh(dustGeo, dustMat, 40);
  const dustBase: THREE.Vector3[] = [];
  for (let i = 0; i < 40; i++) {
    const v = new THREE.Vector3((Math.random() - 0.5) * 30, 0.4 + Math.random() * 3, (Math.random() - 0.5) * 30);
    dustBase.push(v);
    dummy.position.copy(v);
    dummy.scale.setScalar(0.6 + Math.random());
    dummy.updateMatrix();
    dust.setMatrixAt(i, dummy.matrix);
  }
  dust.instanceMatrix.needsUpdate = true;
  dust.userData.bases = dustBase;
  scene.add(dust);

  const blocked = bakeNav(solids);
  const playerLight = new THREE.PointLight(0xffc089, 1.55, 12, 1.6);
  scene.add(playerLight);
  const muzzle = new THREE.PointLight(0xffe0b0, 0, 6, 2);
  scene.add(muzzle);

  const interacts: Interactable[] = [
    {
      id: "radio-ash",
      kind: "radio",
      x: -5.6,
      y: 1.1,
      z: 47.2,
      radius: 1.6,
      prompt: "Field radio — record progress",
      checkpoint: "ash",
    },
    {
      id: "crate-road",
      kind: "loot",
      x: 3.2,
      y: 0.7,
      z: 37.2,
      radius: 1.5,
      prompt: "Pry the roadside crate",
      loot: [{ kind: "pistolAmmo", qty: 18 }],
    },
    {
      id: "crate-square",
      kind: "loot",
      x: 6.6,
      y: 0.8,
      z: 11.2,
      radius: 1.5,
      prompt: "Search the square crate",
      loot: [{ kind: "herb" }, { kind: "pistolAmmo", qty: 12 }],
    },
    {
      id: "radio-square",
      kind: "radio",
      x: -2.4,
      y: 1.4,
      z: 4.2,
      radius: 1.6,
      prompt: "Notice-board radio — record progress",
      checkpoint: "square",
    },
    {
      id: "desk-mill",
      kind: "loot",
      x: -24.2,
      y: 1.1,
      z: 8.2,
      radius: 1.5,
      prompt: "Search the sexton’s desk",
      loot: [{ kind: "barnKey" }, { kind: "pistolAmmo", qty: 18 }],
    },
    {
      id: "note-mill",
      kind: "note",
      x: -23.2,
      y: 1.15,
      z: 8.6,
      radius: 1.4,
      prompt: "Read the scrap on the desk",
      loot: [{ kind: "note" }],
    },
    {
      id: "cabinet-cottage",
      kind: "loot",
      x: 18.2,
      y: 1.05,
      z: 10.2,
      radius: 1.5,
      prompt: "Open the cottage cabinet",
      loot: [{ kind: "shotgun" }, { kind: "shells", qty: 12 }],
    },
    {
      id: "herb-cottage",
      kind: "loot",
      x: 16.4,
      y: 0.9,
      z: 6.2,
      radius: 1.4,
      prompt: "Take the bitter green",
      loot: [{ kind: "herb" }],
    },
    {
      id: "door-barn",
      kind: "door",
      x: 22,
      y: 1.2,
      z: -8.2,
      radius: 1.8,
      prompt: "Barn door",
      door: "barn",
    },
    {
      id: "crate-barn",
      kind: "loot",
      x: 26.2,
      y: 0.8,
      z: -11.2,
      radius: 1.5,
      prompt: "Search the barn crate",
      loot: [{ kind: "shells", qty: 8 }],
    },
    {
      id: "brazier-1",
      kind: "brazier",
      x: 18,
      y: -2.4,
      z: -28.2,
      radius: 1.4,
      prompt: "Light the dawn brazier (I)",
      brazier: 0,
    },
    {
      id: "brazier-2",
      kind: "brazier",
      x: 22,
      y: -2.4,
      z: -33.2,
      radius: 1.4,
      prompt: "Light the middle brazier (II)",
      brazier: 1,
    },
    {
      id: "brazier-3",
      kind: "brazier",
      x: 26,
      y: -2.4,
      z: -28.2,
      radius: 1.4,
      prompt: "Light the dusk brazier (III)",
      brazier: 2,
    },
    {
      id: "chest",
      kind: "chest",
      x: 22,
      y: -2.8,
      z: -30.4,
      radius: 1.6,
      prompt: "Iron chest",
      loot: [
        { kind: "sigil" },
        { kind: "herb" },
        { kind: "shells", qty: 8 },
        { kind: "pistolAmmo", qty: 18 },
      ],
    },
    {
      id: "radio-chapel",
      kind: "radio",
      x: 5.2,
      y: 1.1,
      z: -25.4,
      radius: 1.6,
      prompt: "Gate radio — record progress",
      checkpoint: "chapel",
    },
    {
      id: "door-chapel",
      kind: "door",
      x: 0,
      y: 1.2,
      z: -28.1,
      radius: 1.8,
      prompt: "Chapel doors",
      door: "chapel",
    },
  ];

  const spawns: Spawn[] = [
    { id: "e-road", kind: "shambler", x: 2.8, z: 31.2, yaw: Math.PI, waypoints: [{ x: 2.4, z: 34 }, { x: -2.2, z: 29.5 }, { x: 1.8, z: 27.5 }] },
    { id: "e-road2", kind: "shambler", x: -3.4, z: 23.6, yaw: 0, waypoints: [{ x: -2.2, z: 21.5 }, { x: 2.4, z: 24.5 }] },
    { id: "e-sq1", kind: "shambler", x: -6, z: 9, yaw: 0.4, waypoints: [{ x: -6, z: 12 }, { x: -2, z: 8 }, { x: -8, z: 5 }] },
    { id: "e-sq2", kind: "shambler", x: 7, z: 6, yaw: -0.6, waypoints: [{ x: 8, z: 10 }, { x: 4, z: 5 }, { x: 9, z: 3 }] },
    { id: "e-sq3", kind: "shambler", x: -1, z: 1.5, yaw: 1, waypoints: [{ x: -3, z: 2 }, { x: 2, z: -1 }, { x: 0, z: 4 }] },
    { id: "e-mark", kind: "marksman", x: 16.5, z: -3.5, yaw: Math.PI, waypoints: [{ x: 16, z: -2 }, { x: 12.5, z: -5 }, { x: 18, z: -1 }] },
    { id: "e-mill", kind: "shambler", x: -22, z: 6, yaw: 0, waypoints: [{ x: -24, z: 4 }, { x: -20, z: 8 }, { x: -25, z: 9 }] },
    { id: "e-cot", kind: "shambler", x: 17, z: 8, yaw: Math.PI, waypoints: [{ x: 16, z: 7 }, { x: 19, z: 11 }] },
    { id: "e-barn", kind: "shambler", x: 20, z: -13, yaw: 0, waypoints: [{ x: 19, z: -12 }, { x: 24, z: -15 }] },
    { id: "e-barn2", kind: "shambler", x: 25, z: -16, yaw: 1, waypoints: [{ x: 24, z: -14 }, { x: 21, z: -17 }] },
    { id: "e-cellar", kind: "shambler", x: 24, z: -31, yaw: Math.PI, waypoints: [{ x: 20, z: -29 }, { x: 25, z: -33 }] },
    { id: "boss", kind: "boss", x: 0, z: -40.5, yaw: 0, waypoints: [{ x: 0, z: -40 }] },
  ];

  return {
    textures: tex,
    blocked,
    solids,
    interacts,
    doors: { barn: barnDoor, chapel: chapelDoor },
    braziers,
    chestLid,
    spawns,
    playerLight,
    muzzle,
    sun,
    sunTarget,
  dust,
  };
}

export function bakeNav(extra: Rect[], openGaps: Rect[] = []): Uint8Array {
  const blocked = new Uint8Array(NAV.cols * NAV.rows);
  for (let r = 0; r < NAV.rows; r++) {
    for (let c = 0; c < NAV.cols; c++) {
      const x = NAV.originX + (c + 0.5) * NAV.cell;
      const z = NAV.originZ + (r + 0.5) * NAV.cell;
      let hit = false;
      if (inPit(x, z) && !onWalkablePit(x, z)) hit = true;
      if (!hit) {
        for (const s of extra) {
          if (x > s.minX - 0.35 && x < s.maxX + 0.35 && z > s.minZ - 0.35 && z < s.maxZ + 0.35) {
            hit = true;
            break;
          }
        }
      }
      if (hit) {
        for (const g of openGaps) {
          if (x > g.minX && x < g.maxX && z > g.minZ && z < g.maxZ) {
            hit = false;
            break;
          }
        }
      }
      if (hit) blocked[r * NAV.cols + c] = 1;
    }
  }
  return blocked;
}

export const CHECKPOINTS: Record<"ash" | "square" | "chapel", { x: number; y: number; z: number; yaw: number }> = {
  ash: { x: -1.1, y: 0.8, z: 44.6, yaw: 0 },
  square: { x: -1.2, y: 0.8, z: 5.4, yaw: 0 },
  chapel: { x: 4.4, y: 0.8, z: -25.2, yaw: 0.35 },
};
