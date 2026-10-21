import * as THREE from "three";
import RAPIER from "@dimforge/rapier3d-compat";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { AudioBus } from "@/game/audio";
import { hurtEnemy, planEnemy, resolveEnemy, setNavGrid, type Enemy } from "@/game/ai";
import {
  ammoQty,
  moveItem,
  removeItem,
  startingPack,
  takeAmmo,
  tryAdd,
} from "@/game/inventory";
import { animateFigure, makeFigure } from "@/game/meshes";
import {
  bakeNav,
  buildLevel,
  CHECKPOINTS,
  groundY,
  GROUP_ACTOR,
  GROUP_WORLD,
  groups,
  type Interactable,
  type Level,
  type Spawn,
} from "@/game/level";
import {
  emptyFlags,
  hasSave,
  loadSave,
  loadSettings,
  writeSave,
  writeSettings,
  type EnemySnap,
  type SaveData,
} from "@/game/save";
import { useGame } from "@/game/store";
import type { Difficulty, Flags, Gun, Item, Quality, Settings } from "@/game/types";

const STEP = 1 / 60;
const ORDER = [0, 2, 1] as const;

type Shot = {
  x: number
  y: number
  z: number
  vx: number
  vy: number
  vz: number
  life: number
  dmg: number
  mesh: THREE.Mesh
};

type Wave = { x: number; z: number; r: number; dmg: number; mesh: THREE.Mesh; alive: boolean };

export class Engine {
  readonly audio = new AudioBus();
  private canvas: HTMLCanvasElement;
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(62, 1, 0.08, 160);
  private composer: EffectComposer | null = null;
  private bloom: UnrealBloomPass | null = null;
  private world: RAPIER.World;
  private level: Level;
  private playerBody: RAPIER.RigidBody;
  private playerCol: RAPIER.Collider;
  private playerCtl: RAPIER.KinematicCharacterController;
  private playerMesh: THREE.Group;
  private playerParts: ReturnType<typeof makeFigure>["parts"];
  private enemies: Enemy[] = [];
  private shots: Shot[] = [];
  private waves: Wave[] = [];
  private sparks: { mesh: THREE.Mesh; life: number }[] = [];
  private actorCols = new Set<number>();
  private keys = new Set<string>();
  private mouseX = 0;
  private mouseY = 0;
  private fireDown = false;
  private fireEdge = false;
  private meleeEdge = false;
  private interactEdge = false;
  private reloadEdge = false;
  private dodgeEdge = false;
  private touchX = 0;
  private touchY = 0;
  private touchActive = false;
  private lookDrag = false;
  private fallbackLook = false;
  private yaw = 0;
  private pitch = 0;
  private recoil = 0;
  private yawKick = 0;
  private vx = 0;
  private vz = 0;
  private vy = 0;
  private speed = 0;
  private bob = 0;
  private shake = 0;
  private iframe = 0;
  private dodgeT = 0;
  private dodgeCd = 0;
  private dodgeX = 0;
  private dodgeZ = 0;
  private stamina = 100;
  private health = 100;
  private equipped: Gun = "pistol";
  private magPistol = 12;
  private magShotgun = 0;
  private fireCd = 0;
  private reloadT = 0;
  private reloading = false;
  private foot = 0;
  private items: Item[] = [];
  private flags: Flags = emptyFlags();
  private lit: [boolean, boolean, boolean] = [false, false, false];
  private puzzleStep = 0;
  private looted = new Set<string>();
  private checkpoint: SaveData["checkpoint"] = "ash";
  private difficulty: Difficulty = "normal";
  private noises: { x: number; z: number; r: number; life: number }[] = [];
  private mode: "attract" | "play" | "frozen" = "attract";
  private attract = 0;
  private clock = 0;
  private acc = 0;
  private last = 0;
  private raf = 0;
  private subtitleT = 0;
  private toastT = 0;
  private winT = 0;
  private objective = "";
  private pubAt = 0;
  private settings: Settings;
  private ray: RAPIER.Ray;
  private forward = new THREE.Vector3();
  private right = new THREE.Vector3();
  private wish = new THREE.Vector3();
  private camDesired = new THREE.Vector3();
  private look = new THREE.Vector3();
  private head = new THREE.Vector3();
  private dummy = new THREE.Object3D();
  private muzzleLocal = new THREE.Vector3();
  private aimHot = false;
  private alive = true;
  private onKeyDown!: (e: KeyboardEvent) => void;
  private onKeyUp!: (e: KeyboardEvent) => void;
  private onMouseDown!: (e: MouseEvent) => void;
  private onMouseUp!: (e: MouseEvent) => void;
  private onMouseMove!: (e: MouseEvent) => void;
  private onWheel!: (e: WheelEvent) => void;
  private onLock = () => this.publish(true);
  private onVis = () => this.audio.resume();
  private onContext!: (e: Event) => void;
  private onBlur = () => this.keys.clear();

  private constructor(canvas: HTMLCanvasElement, renderer: THREE.WebGLRenderer, world: RAPIER.World) {
    this.canvas = canvas;
    this.renderer = renderer;
    this.world = world;
    this.settings = loadSettings();
    this.ray = new RAPIER.Ray({ x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: -1 });
    this.level = buildLevel(this.scene, world);
    setNavGrid(this.level.blocked);
    const feet = 0.77;
    const spawn = CHECKPOINTS.ash;
    this.playerBody = world.createRigidBody(
      RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(spawn.x, spawn.y, spawn.z),
    );
    this.playerCol = world.createCollider(
      RAPIER.ColliderDesc.capsule(0.45, 0.32).setCollisionGroups(groups(GROUP_ACTOR, GROUP_WORLD | GROUP_ACTOR)),
      this.playerBody,
    );
    this.actorCols.add(this.playerCol.handle);
    this.playerCtl = world.createCharacterController(0.03);
    this.playerCtl.enableAutostep(0.34, 0.2, true);
    this.playerCtl.enableSnapToGround(0.42);
    this.playerCtl.setSlideEnabled(true);
    this.playerCtl.setMaxSlopeClimbAngle((48 * Math.PI) / 180);
    const fig = makeFigure({ coat: 0x3c4c5e, skin: 0xd7c3ae, eyes: 0x9ec7d6, scale: 1 });
    this.playerMesh = fig.group;
    this.playerParts = fig.parts;
    this.scene.add(this.playerMesh);
    void feet;
    this.spawnAll(this.level.spawns, "normal");
    this.resize();
    this.makeFx();
    this.bind();
    this.applyQuality(this.settings.quality);
    useGame.setState({
      settings: this.settings,
      hasSave: hasSave(),
      showTouch: this.touchWanted(),
      ready: true,
      screen: "menu",
      bootLabel: "",
    });
    this.installProbe();
    this.last = performance.now();
    this.raf = requestAnimationFrame(this.frame);
  }

  static async create(canvas: HTMLCanvasElement) {
    useGame.setState({ screen: "boot", bootLabel: "Binding the physics of the parish…" });
    await RAPIER.init();
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    const world = new RAPIER.World({ x: 0, y: -12, z: 0 });
    world.timestep = STEP;
    return new Engine(canvas, renderer, world);
  }

  dispose() {
    this.alive = false;
    cancelAnimationFrame(this.raf);
    this.unbind();
    this.renderer.dispose();
    this.world.free();
  }

  unlockAudio() {
    this.audio.unlock(this.settings);
  }

  newGame() {
    this.difficulty = this.settings.difficulty;
    this.flags = emptyFlags();
    this.items = startingPack();
    this.lit = [false, false, false];
    this.puzzleStep = 0;
    this.looted.clear();
    this.checkpoint = "ash";
    this.health = 100;
    this.stamina = 100;
    this.equipped = "pistol";
    this.magPistol = 12;
    this.magShotgun = 0;
    this.reloadT = 0;
    this.fireCd = 0;
    this.iframe = 0;
    this.winT = 0;
    this.resetDoors();
    this.syncBraziers();
    this.level.chestLid.rotation.x = 0;
    for (const e of this.enemies) this.restoreEnemy(e, true);
    const s = CHECKPOINTS.ash;
    this.placePlayer(s.x, s.y, s.z, s.yaw);
    this.mode = "play";
    this.objective = "";
    this.say("Mara Voss. The parish went dark three nights ago. Find out why the bells won't stop.", 6);
    this.toast("Service pistol ready. Ammunition is not a suggestion.");
    useGame.setState({ screen: "play", selected: null });
    this.capturePointer();
    this.writeCheckpoint("ash");
    this.publish(true);
  }

  continueGame() {
    const data = loadSave();
    if (!data) return;
    this.applySave(data);
    this.mode = "play";
    useGame.setState({ screen: "play" });
    this.say("The radio still has your last report.", 3.5);
    this.capturePointer();
    this.publish(true);
  }

  pause() {
    if (this.mode !== "play") return;
    this.mode = "frozen";
    this.releasePointer();
    useGame.setState({ screen: "pause" });
    this.publish(true);
  }

  resume() {
    this.mode = "play";
    useGame.setState({ screen: "play" });
    this.capturePointer();
    this.publish(true);
  }

  openInventory() {
    if (this.mode === "attract") return;
    this.mode = "frozen";
    this.releasePointer();
    useGame.setState({ screen: "inventory", items: this.items.map((it) => ({ ...it })) });
    this.publish(true);
  }

  openSettings(back: "menu" | "pause") {
    if (back === "pause") this.mode = "frozen";
    this.releasePointer();
    useGame.setState({ screen: "settings", settingsBack: back });
  }

  closeSettings() {
    const back = useGame.getState().settingsBack;
    if (back === "pause") useGame.setState({ screen: "pause" });
    else {
      this.mode = "attract";
      useGame.setState({ screen: "menu" });
    }
  }

  quitToMenu() {
    this.mode = "attract";
    this.releasePointer();
    this.shots.forEach((s) => (s.life = 0));
    useGame.setState({ screen: "menu", hasSave: hasSave(), boss: false });
    this.publish(true);
  }

  retry() {
    const data = loadSave();
    if (!data) {
      this.newGame();
      return;
    }
    this.applySave(data);
    this.mode = "play";
    this.health = Math.max(this.health, 40);
    useGame.setState({ screen: "play" });
    this.say("You pull yourself up where the radio last heard you.", 3.5);
    this.capturePointer();
    this.publish(true);
  }

  updateSettings(partial: Partial<Settings>) {
    this.settings = { ...this.settings, ...partial };
    writeSettings(this.settings);
    this.audio.apply(this.settings);
    if (partial.quality) this.applyQuality(partial.quality);
    useGame.setState({ settings: this.settings, showTouch: this.touchWanted() });
  }

  moveInventory(id: string, x: number, y: number) {
    const next = moveItem(this.items, id, x, y);
    if (!next) return false;
    this.items = next;
    this.publish(true);
    return true;
  }

  useSelected(id: string) {
    const item = this.items.find((it) => it.id === id);
    if (!item || this.mode === "attract") return;
    if (item.kind === "herb") {
      if (this.health >= 100) {
        this.toast("You are already whole.");
        return;
      }
      this.health = Math.min(100, this.health + 42);
      this.items = removeItem(this.items, id);
      this.audio.pickup();
      this.toast("The bitter green burns, then knits.");
      this.publish(true);
      return;
    }
    if (item.kind === "pistol" || item.kind === "shotgun") {
      this.equipped = item.kind;
      this.reloadT = 0;
      this.toast(item.kind === "pistol" ? "Pistol drawn." : "Scattergun drawn.");
      this.publish(true);
    }
  }

  setTouchMove(x: number, y: number) {
    this.touchActive = Math.hypot(x, y) > 0.08;
    this.touchX = x;
    this.touchY = y;
  }

  pointerLook(dx: number, dy: number) {
    this.mouseX += dx;
    this.mouseY += dy;
  }

  setFire(down: boolean) {
    if (down && !this.fireDown) this.fireEdge = true;
    this.fireDown = down;
  }

  tap(action: "reload" | "interact" | "dodge" | "melee" | "pause" | "inv") {
    if (action === "pause") {
      if (useGame.getState().screen === "play") this.pause();
      else if (useGame.getState().screen === "pause") this.resume();
      return;
    }
    if (action === "inv") {
      if (useGame.getState().screen === "inventory") this.resume();
      else this.openInventory();
      return;
    }
    if (this.mode !== "play") return;
    if (action === "reload") this.reloadEdge = true;
    if (action === "interact") this.interactEdge = true;
    if (action === "dodge") this.dodgeEdge = true;
    if (action === "melee") this.meleeEdge = true;
  }

  setDebugKeys(codes: string[]) {
    this.keys.clear();
    for (const code of codes) this.keys.add(code);
  }

  getYaw() {
    return this.yaw;
  }

  getSpeed() {
    return this.speed;
  }

  getPos() {
    const p = this.playerBody.translation();
    return { x: p.x, y: p.y, z: p.z };
  }

  private separateActors() {
    const p = this.playerBody.translation();
    const pr = 0.36;
    for (const e of this.enemies) {
      if (e.state === "dead" || (!e.active && e.kind === "boss")) continue;
      const t = e.body.translation();
      let dx = t.x - p.x;
      let dz = t.z - p.z;
      let d = Math.hypot(dx, dz);
      const min = pr + e.radius + (e.kind === "boss" ? 0.35 : 0.5);
      if (d < 0.0008) {
        dx = 1;
        dz = 0;
        d = 1;
      }
      if (d >= min) continue;
      const push = min - d;
      const nx = t.x + (dx / d) * push;
      const nz = t.z + (dz / d) * push;
      e.body.setTranslation({ x: nx, y: t.y, z: nz }, true);
      e.body.setNextKinematicTranslation({ x: nx, y: t.y, z: nz });
    }
  }

  private frame = (now: number) => {
    if (!this.alive) return;
    const dt = Math.min(0.1, (now - this.last) / 1000);
    this.last = now;
    this.clock += dt;
    if (this.mode === "play") {
      this.applyMouse();
      this.acc += dt;
      let steps = 0;
      while (this.acc >= STEP && steps < 4) {
        this.simulate(STEP);
        this.acc -= STEP;
        steps++;
      }
    } else if (this.mode === "attract") {
      this.attract += dt;
      const a = this.attract * 0.08;
      this.camera.position.set(Math.sin(a) * 18, 7.2 + Math.sin(a * 0.4) * 0.5, 6 + Math.cos(a) * 16);
      this.camera.lookAt(0, 2.4, 4);
    }
    this.dress(dt);
    this.render();
    if (now - this.pubAt > 120) this.publish(false);
    this.raf = requestAnimationFrame(this.frame);
  };

  private applyMouse() {
    const sens = this.settings.sensitivity;
    const invert = this.settings.invertY ? -1 : 1;
    this.yaw -= this.mouseX * sens;
    this.pitch -= this.mouseY * sens * invert;
    this.pitch = Math.max(-0.95, Math.min(0.7, this.pitch));
    this.mouseX = 0;
    this.mouseY = 0;
  }

  private simulate(dt: number) {
    this.fireCd = Math.max(0, this.fireCd - dt);
    this.dodgeCd = Math.max(0, this.dodgeCd - dt);
    this.iframe = Math.max(0, this.iframe - dt);
    if (this.reloading) {
      this.reloadT = Math.max(0, this.reloadT - dt);
      if (this.reloadT <= 0) {
        this.reloading = false;
        this.commitReload();
      }
    }
    this.recoil *= Math.exp(-6 * dt);
    this.yawKick *= Math.exp(-7 * dt);
    if (this.subtitleT > 0) {
      this.subtitleT -= dt;
      if (this.subtitleT <= 0) useGame.setState({ subtitle: "" });
    }
    if (this.toastT > 0) {
      this.toastT -= dt;
      if (this.toastT <= 0) useGame.setState({ toast: "" });
    }

    this.separateActors();
    this.stepPlayer(dt);
    const allies = this.enemies
      .filter((e) => e.state !== "dead")
      .map((e) => {
        const t = e.body.translation();
        return { id: e.id, x: t.x, z: t.z };
      });
    const playerT = this.playerBody.translation();
    const ctxBase = {
      player: { x: playerT.x, y: playerT.y, z: playerT.z },
      dt,
      noises: this.noises,
      allies,
      los: this.los,
      damagePlayer: this.damagePlayer,
      spawnShot: this.spawnShot,
      startWave: this.startWave,
      onGroan: (e: Enemy, deep: boolean) => {
        const t = e.body.translation();
        this.audio.groan(t.x, t.y, t.z, deep);
      },
      onPhase: (phase: number) => {
        this.audio.bell();
        this.say(phase === 2 ? "The Warden splits the floor." : "It lowers its head and charges.", 2.4);
      },
    };
    for (const e of this.enemies) planEnemy(e, ctxBase);
    for (const e of this.enemies) {
      if (e.state === "dead") continue;
      const p = e.body.translation();
      const disp = { x: e.wishX * dt, y: e.vy * dt, z: e.wishZ * dt };
      e.controller.computeColliderMovement(e.collider, disp);
      const m = e.controller.computedMovement();
      const nx = p.x + m.x;
      const ny = p.y + m.y;
      const nz = p.z + m.z;
      if (e.controller.computedGrounded() && e.vy < 0) e.vy = -2;
      e.body.setNextKinematicTranslation({ x: nx, y: ny, z: nz });
    }
    this.world.step();
    this.separateActors();
    for (const e of this.enemies) {
      const t = e.body.translation();
      if (t.y < -8) {
        e.body.setTranslation({ x: e.lastX, y: e.feet, z: e.lastZ }, true);
      }
      resolveEnemy(e, ctxBase);
      e.mesh.position.set(t.x, t.y - e.feet, t.z);
      e.mesh.rotation.set(Math.min(1.25, e.deadT * 1.5), e.yaw + Math.PI, 0);
      const moving = Math.hypot(e.wishX, e.wishZ);
      e.walk += moving * dt * 2.4;
      animateFigure(e.parts, e.walk, Math.min(1, moving / 2), e.state === "attack" ? 1 : 0, e.deadT);
      e.parts.coatMat.emissive.setHex(0xfff2ea);
      e.parts.coatMat.emissiveIntensity = e.flash > 0 ? 0.85 : 0;
      if (e.kind === "boss") {
        e.parts.eyeMat.emissiveIntensity = 0.6 + Math.sin(this.clock * (e.phase === 3 ? 14 : 6)) * 0.35;
      }
    }
    if (this.fireEdge) this.shoot();
    this.fireEdge = false;
    if (this.meleeEdge) this.melee();
    this.meleeEdge = false;
    if (this.reloadEdge) this.startReload();
    this.reloadEdge = false;
    if (this.interactEdge) this.interact();
    this.interactEdge = false;
    this.updateShots(dt);
    this.updateWaves(dt);
    this.updateSparks(dt);
    for (const n of this.noises) n.life -= dt;
    this.noises = this.noises.filter((n) => n.life > 0);
    this.updateObjective();
    this.updatePrompt();
    if (this.winT > 0) {
      this.winT -= dt;
      if (this.winT <= 0) {
        this.mode = "frozen";
        this.releasePointer();
        useGame.setState({ screen: "won" });
        this.publish(true);
      }
    }
    const nearest = this.nearestEnemyDist();
    this.audio.setTension(this.flags.bossStarted && !this.flags.bossDefeated ? 1 : nearest < 8 ? 0.75 : nearest < 16 ? 0.4 : 0.1);
    this.audio.tick(dt, this.health < 35 && this.health > 0);
    this.syncGuns();
  }

  private stepPlayer(dt: number) {
    let ix = 0;
    let iz = 0;
    if (this.keys.has("KeyW") || this.keys.has("ArrowUp")) iz += 1;
    if (this.keys.has("KeyS") || this.keys.has("ArrowDown")) iz -= 1;
    if (this.keys.has("KeyD") || this.keys.has("ArrowRight")) ix += 1;
    if (this.keys.has("KeyA") || this.keys.has("ArrowLeft")) ix -= 1;
    if (this.touchActive) {
      ix = this.touchX;
      iz = this.touchY;
    }
    this.forward.set(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
    this.right.set(Math.cos(this.yaw), 0, -Math.sin(this.yaw));
    this.wish.set(0, 0, 0).addScaledVector(this.forward, iz).addScaledVector(this.right, ix);
    const mag = Math.hypot(this.wish.x, this.wish.z);
    if (mag > 1) this.wish.multiplyScalar(1 / mag);
    const sprinting =
      (this.keys.has("ShiftLeft") || this.keys.has("ShiftRight") || this.touchY > 0.92) &&
      this.stamina > 4 &&
      mag > 0.2 &&
      this.dodgeT <= 0;
    if (this.dodgeEdge && this.dodgeCd <= 0 && this.stamina >= 18) {
      this.dodgeT = 0.28;
      this.iframe = Math.max(this.iframe, 0.32);
      this.dodgeCd = 0.9;
      this.stamina -= 18;
      if (mag > 0.15) {
        this.dodgeX = this.wish.x;
        this.dodgeZ = this.wish.z;
      } else {
        this.dodgeX = -this.forward.x;
        this.dodgeZ = -this.forward.z;
      }
    }
    this.dodgeEdge = false;
    let target = sprinting ? 5.55 : 3.3;
    if (this.dodgeT > 0) {
      this.dodgeT -= dt;
      this.wish.set(this.dodgeX, 0, this.dodgeZ);
      target = 9.2;
    }
    if (sprinting) this.stamina = Math.max(0, this.stamina - 16 * dt);
    else this.stamina = Math.min(100, this.stamina + 14 * dt);
    const tx = this.wish.x * target;
    const tz = this.wish.z * target;
    const accel = 30;
    this.vx = approach(this.vx, tx, accel * dt);
    this.vz = approach(this.vz, tz, accel * dt);
    this.speed = Math.hypot(this.vx, this.vz);
    this.vy += -24 * dt;
    if (this.vy < -30) this.vy = -30;
    const p = this.playerBody.translation();
    this.playerCtl.computeColliderMovement(this.playerCol, { x: this.vx * dt, y: this.vy * dt, z: this.vz * dt });
    const m = this.playerCtl.computedMovement();
    let nx = p.x + m.x;
    let ny = p.y + m.y;
    let nz = p.z + m.z;
    if (this.playerCtl.computedGrounded() && this.vy < 0) this.vy = -2.4;
    if (ny < -7) {
      const c = CHECKPOINTS[this.checkpoint];
      nx = c.x;
      ny = c.y;
      nz = c.z;
      this.vy = 0;
    }
    this.playerBody.setNextKinematicTranslation({ x: nx, y: ny, z: nz });
    if (this.speed > 0.4 && this.playerCtl.computedGrounded()) {
      this.foot -= dt;
      if (this.foot <= 0) {
        this.foot = sprinting ? 0.32 : 0.46;
        this.audio.foot(nx, ny, nz);
      }
      this.bob += dt * (sprinting ? 10 : 7);
    }
  }

  private shoot() {
    if (this.reloadT > 0) return;
    const gun = this.equipped;
    if (gun === "shotgun" && !this.flags.hasShotgun) return;
    const mag = gun === "pistol" ? this.magPistol : this.magShotgun;
    if (mag <= 0) {
      if (ammoQty(this.items, gun === "pistol" ? "pistolAmmo" : "shells") > 0) this.startReload();
      else this.audio.dry();
      return;
    }
    if (this.fireCd > 0) return;
    if (gun === "pistol") this.magPistol--;
    else this.magShotgun--;
    this.fireCd = gun === "pistol" ? 0.28 : 0.72;
    this.recoil += gun === "pistol" ? 0.02 : 0.045;
    this.yawKick += (Math.random() - 0.5) * (gun === "pistol" ? 0.006 : 0.02);
    this.shake = Math.min(0.35, this.shake + (gun === "pistol" ? 0.05 : 0.1));
    this.audio.gun(gun);
    this.level.muzzle.intensity = gun === "pistol" ? 6 : 10;
    const origin = this.camera.position.clone();
    const dir = new THREE.Vector3();
    this.camera.getWorldDirection(dir);
    origin.addScaledVector(dir, 0.35);
    const pellets = gun === "pistol" ? 1 : 7;
    const spread = gun === "pistol" ? 0.006 + (this.speed > 2 ? 0.012 : 0) : 0.075;
    const p = this.playerBody.translation();
    this.noises.push({ x: p.x, z: p.z, r: gun === "pistol" ? 18 : 24, life: 0.4 });
    let any = false;
    for (let i = 0; i < pellets; i++) {
      const d = dir.clone();
      d.x += (Math.random() - 0.5) * spread;
      d.y += (Math.random() - 0.5) * spread;
      d.z += (Math.random() - 0.5) * spread;
      d.normalize();
      if (this.castShot(origin, d, gun === "pistol" ? 22 : 9)) any = true;
    }
    if (any) {
      this.audio.hit(true);
      useGame.setState({ hit: performance.now() });
    }
    this.publish(true);
  }

  private castShot(origin: THREE.Vector3, dir: THREE.Vector3, dmg: number) {
    this.ray.origin.x = origin.x;
    this.ray.origin.y = origin.y;
    this.ray.origin.z = origin.z;
    this.ray.dir.x = dir.x;
    this.ray.dir.y = dir.y;
    this.ray.dir.z = dir.z;
    const worldHit = this.world.castRay(this.ray, 80, true, undefined, undefined, undefined, undefined, (c) => !this.actorCols.has(c.handle));
    let best = worldHit ? worldHit.timeOfImpact : 80;
    let hitEnemy: { e: Enemy; head: boolean } | null = null;
    for (const e of this.enemies) {
      if (e.state === "dead" || (!e.active && e.kind === "boss")) continue;
      const t = e.body.translation();
      const feetY = t.y - e.feet;
      const headC = new THREE.Vector3(t.x, feetY + (e.kind === "boss" ? 2.05 : 1.55), t.z);
      const bodyC = new THREE.Vector3(t.x, feetY + (e.kind === "boss" ? 1.15 : 0.95), t.z);
      const th = raySphere(origin, dir, headC, e.kind === "boss" ? 0.28 : 0.2);
      const tb = raySphere(origin, dir, bodyC, e.kind === "boss" ? 0.72 : 0.42);
      const head = th !== null && (tb === null || th <= tb);
      const te = head ? th : tb;
      if (te !== null && te < best && te > 0.05) {
        best = te;
        hitEnemy = { e, head };
      }
    }
    const point = origin.clone().addScaledVector(dir, Math.min(best, 40));
    this.burst(point, hitEnemy ? 0x6a1a14 : 0xc8b49a);
    if (!hitEnemy) {
      this.audio.hit(false);
      return false;
    }
    const mult = hitEnemy.head ? (hitEnemy.e.kind === "boss" ? 1.8 : 2.5) : 1;
    const died = hurtEnemy(hitEnemy.e, dmg * mult * (this.difficulty === "hard" ? 1 : 1), hitEnemy.head);
    if (hitEnemy.head) this.toast(hitEnemy.e.kind === "boss" ? "The crown cracks." : "Headshot.");
    if (died) this.onDeath(hitEnemy.e);
    return true;
  }

  private melee() {
    if (this.fireCd > 0.15) return;
    this.fireCd = 0.48;
    this.audio.melee();
    this.playerParts.rightArm.rotation.x = -1.4;
    const p = this.playerBody.translation();
    let hit = false;
    for (const e of this.enemies) {
      if (e.state === "dead") continue;
      const t = e.body.translation();
      const dx = t.x - p.x;
      const dz = t.z - p.z;
      const dist = Math.hypot(dx, dz);
      if (dist > 1.85) continue;
      const fwd = dx * -Math.sin(this.yaw) + dz * -Math.cos(this.yaw);
      if (fwd < 0.2) continue;
      hit = true;
      const died = hurtEnemy(e, 36, false);
      if (died) this.onDeath(e);
    }
    if (hit) {
      this.audio.hit(true);
      useGame.setState({ hit: performance.now() });
      this.shake = Math.min(0.3, this.shake + 0.06);
    }
  }

  private startReload() {
    if (this.reloadT > 0) return;
    const gun = this.equipped;
    if (gun === "shotgun" && !this.flags.hasShotgun) return;
    const mag = gun === "pistol" ? this.magPistol : this.magShotgun;
    const size = gun === "pistol" ? 12 : 4;
    const kind = gun === "pistol" ? "pistolAmmo" : "shells";
    if (mag >= size || ammoQty(this.items, kind) <= 0) {
      if (mag <= 0) this.audio.dry();
      return;
    }
    this.reloading = true;
    this.reloadT = gun === "pistol" ? 1.25 : 1.85;
    this.audio.reload();
  }

  private commitReload() {
    const gun = this.equipped;
    const size = gun === "pistol" ? 12 : 4;
    const mag = gun === "pistol" ? this.magPistol : this.magShotgun;
    const kind = gun === "pistol" ? "pistolAmmo" : "shells";
    const { items, took } = takeAmmo(this.items, kind, size - mag);
    this.items = items;
    if (gun === "pistol") this.magPistol += took;
    else this.magShotgun += took;
    this.publish(true);
  }

  private los = (x: number, y: number, z: number, x2: number, y2: number, z2: number) => {
    const dx = x2 - x;
    const dy = y2 - y;
    const dz = z2 - z;
    const len = Math.hypot(dx, dy, dz);
    if (len < 0.05) return true;
    this.ray.origin.x = x;
    this.ray.origin.y = y;
    this.ray.origin.z = z;
    this.ray.dir.x = dx / len;
    this.ray.dir.y = dy / len;
    this.ray.dir.z = dz / len;
    const hit = this.world.castRay(this.ray, len, true, undefined, undefined, undefined, undefined, (c) => !this.actorCols.has(c.handle));
    return !hit || hit.timeOfImpact > len - 0.35;
  };

  private damagePlayer = (amount: number, x: number, z: number) => {
    if (this.iframe > 0 || this.health <= 0 || this.mode !== "play") return;
    const mult = this.difficulty === "hard" ? 1.25 : 1;
    this.health = Math.max(0, this.health - amount * mult);
    this.iframe = 0.55;
    this.shake = Math.min(0.45, this.shake + 0.14);
    this.audio.hurt();
    useGame.setState({ hurt: performance.now() });
    const p = this.playerBody.translation();
    const dx = p.x - x;
    const dz = p.z - z;
    const len = Math.hypot(dx, dz) || 1;
    this.vx += (dx / len) * 3.5;
    this.vz += (dz / len) * 3.5;
    if (this.health <= 0) {
      this.mode = "frozen";
      this.releasePointer();
      this.say("The parish keeps what it takes.", 4);
      useGame.setState({ screen: "dead" });
    }
    this.publish(true);
  };

  private spawnShot = (x: number, y: number, z: number, dx: number, dy: number, dz: number, dmg: number) => {
    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.1, 6, 6),
      new THREE.MeshBasicMaterial({ color: 0xff6a3a }),
    );
    mesh.position.set(x, y, z);
    this.scene.add(mesh);
    const speed = 16;
    this.shots.push({ x, y, z, vx: dx * speed, vy: dy * speed, vz: dz * speed, life: 2, dmg, mesh });
    this.audio.shotIncoming(x, y, z);
  };

  private startWave = (x: number, z: number, dmg: number) => {
    const mesh = new THREE.Mesh(
      new THREE.TorusGeometry(1, 0.07, 6, 28),
      new THREE.MeshBasicMaterial({ color: 0xff5a32, transparent: true, opacity: 0.75 }),
    );
    mesh.rotation.x = Math.PI / 2;
    mesh.position.set(x, 0.15, z);
    this.scene.add(mesh);
    this.waves.push({ x, z, r: 0.8, dmg, mesh, alive: true });
    this.audio.bell();
  };

  private updateShots(dt: number) {
    const p = this.playerBody.translation();
    for (const s of this.shots) {
      s.life -= dt;
      const nx = s.x + s.vx * dt;
      const ny = s.y + s.vy * dt;
      const nz = s.z + s.vz * dt;
      const len = Math.hypot(nx - s.x, ny - s.y, nz - s.z) || 0.0001;
      this.ray.origin.x = s.x;
      this.ray.origin.y = s.y;
      this.ray.origin.z = s.z;
      this.ray.dir.x = (nx - s.x) / len;
      this.ray.dir.y = (ny - s.y) / len;
      this.ray.dir.z = (nz - s.z) / len;
      const hit = this.world.castRay(this.ray, len, true, undefined, undefined, undefined, undefined, (c) => !this.actorCols.has(c.handle));
      const pd = Math.hypot(nx - p.x, nz - p.z);
      if (hit && hit.timeOfImpact < len) {
        s.life = 0;
        this.burst(new THREE.Vector3(s.x, s.y, s.z), 0xffb080);
      } else if (pd < 0.7 && Math.abs(ny - p.y) < 1.1) {
        s.life = 0;
        this.damagePlayer(s.dmg, s.x, s.z);
      } else {
        s.x = nx;
        s.y = ny;
        s.z = nz;
        s.mesh.position.set(nx, ny, nz);
      }
      if (s.life <= 0) {
        this.scene.remove(s.mesh);
        s.mesh.geometry.dispose();
        (s.mesh.material as THREE.Material).dispose();
      }
    }
    this.shots = this.shots.filter((s) => s.life > 0);
  }

  private updateWaves(dt: number) {
    const p = this.playerBody.translation();
    for (const w of this.waves) {
      w.r += 8.5 * dt;
      w.mesh.scale.setScalar(w.r);
      w.mesh.position.y = 0.12 + groundY(w.x, w.z);
      const mat = w.mesh.material as THREE.MeshBasicMaterial;
      mat.opacity = Math.max(0, 0.75 * (1 - w.r / 14));
      const d = Math.hypot(p.x - w.x, p.z - w.z);
      if (w.alive && w.r > 1.2 && Math.abs(d - w.r) < 0.55) {
        w.alive = false;
        this.damagePlayer(w.dmg * 0.7, w.x, w.z);
      }
      if (w.r > 14) {
        this.scene.remove(w.mesh);
        w.mesh.geometry.dispose();
        mat.dispose();
        w.r = 99;
      }
    }
    this.waves = this.waves.filter((w) => w.r < 20);
  }

  private updateSparks(dt: number) {
    for (const s of this.sparks) {
      s.life -= dt;
      const mat = s.mesh.material as THREE.MeshBasicMaterial;
      mat.opacity = Math.max(0, s.life * 4);
      s.mesh.scale.setScalar(0.4 + (0.25 - Math.max(0, s.life)) * 3);
    }
  }

  private burst(point: THREE.Vector3, color: number) {
    const spark = this.sparks.find((s) => s.life <= 0) ?? this.sparks[0];
    if (!spark) return;
    spark.life = 0.22;
    spark.mesh.position.copy(point);
    (spark.mesh.material as THREE.MeshBasicMaterial).color.setHex(color);
    (spark.mesh.material as THREE.MeshBasicMaterial).opacity = 0.9;
  }

  private interact() {
    const it = this.focused();
    if (!it) return;
    if (it.kind === "radio" && it.checkpoint) {
      this.checkpoint = it.checkpoint;
      this.health = Math.min(100, this.health + 8);
      this.writeCheckpoint(it.checkpoint);
      this.audio.radio();
      this.say("Progress recorded. The bureau will deny they heard this.", 3.2);
      this.publish(true);
      return;
    }
    if (it.kind === "door" && it.door) {
      this.tryDoor(it.door);
      return;
    }
    if (it.kind === "brazier" && it.brazier !== undefined) {
      this.lightBrazier(it.brazier);
      return;
    }
    if (it.kind === "chest") {
      if (!this.flags.puzzleSolved) {
        this.say("The chest is shut. The mural is an order, not a painting.", 3);
        this.audio.locked();
        return;
      }
      if (this.looted.has(it.id)) return;
      if (!this.giveLoot(it)) return;
      this.looted.add(it.id);
      this.level.chestLid.rotation.x = -1.15;
      this.audio.pickup();
      return;
    }
    if (it.loot) {
      if (this.looted.has(it.id)) return;
      if (!this.giveLoot(it)) return;
      this.looted.add(it.id);
      this.audio.pickup();
    }
  }

  private giveLoot(it: Interactable) {
    if (!it.loot) return true;
    let next = this.items;
    for (const drop of it.loot) {
      if (drop.kind === "shotgun") {
        if (!this.flags.hasShotgun) {
          const added = tryAdd(next, "shotgun");
          if (!added) {
            this.toast("The pack is full.");
            return false;
          }
          next = added;
          this.flags.hasShotgun = true;
          this.magShotgun = 4;
          this.equipped = "shotgun";
          this.toast("Scattergun. Four shells already in the tube.");
        }
        continue;
      }
      if (drop.kind === "barnKey") this.flags.hasBarnKey = true;
      if (drop.kind === "sigil") this.flags.hasSigil = true;
      if (drop.kind === "note") this.flags.hasNote = true;
      const added = tryAdd(next, drop.kind, drop.qty ?? 1);
      if (!added) {
        this.toast("The pack is full.");
        return false;
      }
      next = added;
    }
    this.items = next;
    if (it.kind === "note" || it.loot.some((l) => l.kind === "note")) {
      this.say("Dawn, then dusk, then the one between. I · III · II.", 4.5);
    } else if (this.flags.hasBarnKey && it.loot.some((l) => l.kind === "barnKey")) {
      this.say("An iron key. The barn on the north edge.", 3);
    } else if (this.flags.hasSigil && it.loot.some((l) => l.kind === "sigil")) {
      this.say("The chapel sigil is cold enough to bite.", 3);
    } else this.toast("Taken.");
    this.publish(true);
    return true;
  }

  private tryDoor(which: "barn" | "chapel") {
    if (which === "barn") {
      if (!this.flags.hasBarnKey) {
        this.audio.locked();
        this.say("The barn is barred. It wants a heavy iron key.", 2.6);
        return;
      }
      if (!this.flags.barnOpen) {
        this.flags.barnOpen = true;
        this.openDoor("barn");
        this.audio.pickup();
        this.say("The harrow barn groans open. Something moves under the floor.", 3);
      }
      return;
    }
    if (this.flags.bossStarted && !this.flags.bossDefeated) {
      this.audio.locked();
      this.say("The doors have shut behind you.", 2);
      return;
    }
    if (!this.flags.hasSigil) {
      this.audio.locked();
      this.say("The chapel will not take an empty hand.", 2.6);
      return;
    }
    if (!this.flags.chapelOpen) {
      this.flags.chapelOpen = true;
      this.openDoor("chapel");
      this.audio.bell();
      this.say("The sigil burns cold. The doors give.", 2.8);
    }
  }

  private lightBrazier(index: 0 | 1 | 2) {
    if (this.flags.puzzleSolved) {
      this.toast("The order is already satisfied.");
      return;
    }
    const expect = ORDER[this.puzzleStep];
    if (index !== expect || this.lit[index]) {
      this.lit = [false, false, false];
      this.puzzleStep = 0;
      this.syncBraziers();
      this.audio.brazier(false);
      this.say("The flames die together. Read the order again.", 2.6);
      return;
    }
    this.lit[index] = true;
    this.puzzleStep++;
    this.syncBraziers();
    this.audio.brazier(true);
    if (this.puzzleStep >= 3) {
      this.flags.puzzleSolved = true;
      this.say("The chest lock answers. Take what the sexton buried.", 3);
    }
    this.publish(true);
  }

  private onDeath(e: Enemy) {
    this.audio.groan(e.mesh.position.x, e.mesh.position.y, e.mesh.position.z, e.kind === "boss");
    if (e.kind === "boss") {
      this.flags.bossDefeated = true;
      this.flags.bossStarted = true;
      this.openDoor("chapel");
      this.audio.bossDie();
      this.say("The Warden folds. The bells crack, and then nothing.", 4);
      this.winT = 2.4;
      this.writeCheckpoint(this.checkpoint);
    }
  }

  private maybeStartBoss() {
    if (this.flags.bossStarted || !this.flags.chapelOpen || this.flags.bossDefeated) return;
    const p = this.playerBody.translation();
    if (p.z < -30.2 && Math.abs(p.x) < 7.5) {
      this.flags.bossStarted = true;
      this.level.doors.chapel.collider.setSensor(false);
      this.level.doors.chapel.hinge.rotation.y = 0;
      this.rebuildNav();
      const boss = this.enemies.find((e) => e.kind === "boss");
      if (boss) boss.active = true;
      this.audio.bell();
      this.say("The doors seal. The Warden of Greyhollow looks up.", 3.2);
    }
  }

  private updateObjective() {
    this.maybeStartBoss();
    const p = this.playerBody.translation();
    if (!this.flags.enteredSquare && p.z < 20 && Math.abs(p.x) < 16) {
      this.flags.enteredSquare = true;
      this.say("Parish square. The well is still warm.", 2.6);
    }
    const text = !this.flags.enteredSquare
      ? "Follow the ash road into the parish square."
      : !this.flags.hasBarnKey
        ? "Search the sexton's mill for the barn key."
        : !this.flags.barnOpen
          ? "Unlock the harrow barn on the north edge."
          : !this.flags.puzzleSolved
            ? "Cellar braziers: light I, then III, then II."
            : !this.flags.hasSigil
              ? "Take the chapel sigil from the iron chest."
              : !this.flags.chapelOpen
                ? "Open the chapel with the sigil."
                : !this.flags.bossDefeated
                  ? "Destroy the Warden of Greyhollow."
                  : "The bells are still. The parish is only silenced.";
    if (text !== this.objective) {
      this.objective = text;
      this.publish(true);
    }
  }

  private updatePrompt() {
    const it = this.focused();
    let prompt = "";
    if (it) {
      if (it.kind === "door" && it.door === "barn") {
        prompt = this.flags.barnOpen ? "" : this.flags.hasBarnKey ? "Unlock the barn" : "Barn door — locked";
      } else if (it.kind === "door" && it.door === "chapel") {
        prompt =
          this.flags.bossStarted && !this.flags.bossDefeated
            ? "Sealed"
            : this.flags.chapelOpen
              ? ""
              : this.flags.hasSigil
                ? "Offer the chapel sigil"
                : "Chapel doors — sealed";
      } else if (it.kind === "chest") {
        prompt = this.looted.has(it.id) ? "" : this.flags.puzzleSolved ? "Open the iron chest" : "Iron chest — shut";
      } else if (it.loot && this.looted.has(it.id)) prompt = "";
      else prompt = it.prompt;
    }
    const prev = useGame.getState().prompt;
    if (prev !== prompt) useGame.setState({ prompt });
    let hot = false;
    const origin = this.camera.position;
    const dir = this.look.clone();
    this.camera.getWorldDirection(dir);
    for (const e of this.enemies) {
      if (e.state === "dead" || !e.active) continue;
      const t = e.body.translation();
      const c = new THREE.Vector3(t.x, t.y, t.z);
      if (raySphere(origin, dir, c, 0.7) !== null) {
        hot = true;
        break;
      }
    }
    if (hot !== this.aimHot) {
      this.aimHot = hot;
      useGame.setState({ aimHot: hot });
    }
  }

  private focused(): Interactable | null {
    const p = this.playerBody.translation();
    let best: Interactable | null = null;
    let bestD = 99;
    for (const it of this.level.interacts) {
      const dx = it.x - p.x;
      const dz = it.z - p.z;
      const dy = it.y - p.y;
      if (Math.abs(dy) > 2.4) continue;
      const d = Math.hypot(dx, dz);
      if (d > it.radius) continue;
      const dot = dx * -Math.sin(this.yaw) + dz * -Math.cos(this.yaw);
      if (dot < -0.2 && d > 0.8) continue;
      if (d < bestD) {
        bestD = d;
        best = it;
      }
    }
    return best;
  }

  private dress(dt: number) {
    const p = this.playerBody.translation();
    this.playerMesh.position.set(p.x, p.y - 0.77, p.z);
    this.playerMesh.rotation.y = this.yaw + Math.PI;
    this.playerMesh.visible = true;
    animateFigure(this.playerParts, this.bob, Math.min(1, this.speed / 2.2), 0, 0);
    const lookYaw = this.yaw + this.yawKick;
    const lookPitch = this.pitch + this.recoil;
    this.forward.set(-Math.sin(lookYaw), 0, -Math.cos(lookYaw));
    this.right.set(Math.cos(lookYaw), 0, -Math.sin(lookYaw));
    const dist = 3.25;
    const back = dist * Math.cos(lookPitch * 0.85);
    this.camDesired.set(
      p.x + Math.sin(lookYaw) * back + this.right.x * 0.48,
      p.y + 0.72 - Math.sin(lookPitch) * 0.55,
      p.z + Math.cos(lookYaw) * back + this.right.z * 0.48,
    );
    if (this.mode === "play" || this.mode === "frozen") {
      const k = 1 - Math.exp(-10 * Math.max(dt, 0.016));
      this.camera.position.lerp(this.camDesired, this.mode === "play" ? k : 1);
      this.head.set(p.x, p.y + 0.55, p.z);
      this.ray.origin.x = this.head.x;
      this.ray.origin.y = this.head.y;
      this.ray.origin.z = this.head.z;
      const to = this.camera.position.clone().sub(this.head);
      const len = to.length();
      if (len > 0.05) {
        to.multiplyScalar(1 / len);
        this.ray.dir.x = to.x;
        this.ray.dir.y = to.y;
        this.ray.dir.z = to.z;
        const hit = this.world.castRay(this.ray, len, true, undefined, groups(GROUP_ACTOR, GROUP_WORLD));
        if (hit && hit.timeOfImpact < len - 0.15) {
          const pull = Math.max(0.25, hit.timeOfImpact - 0.18);
          this.camera.position.copy(this.head).addScaledVector(to, pull);
        }
      }
      this.look.set(
        p.x - Math.sin(lookYaw) * Math.cos(lookPitch) * 8,
        p.y + 0.45 + Math.sin(lookPitch) * 8,
        p.z - Math.cos(lookYaw) * Math.cos(lookPitch) * 8,
      );
      this.shake *= Math.exp(-4 * Math.max(dt, 0.016));
      if (this.shake > 0.004) {
        this.camera.position.x += (Math.random() - 0.5) * this.shake;
        this.camera.position.y += (Math.random() - 0.5) * this.shake;
      }
      this.camera.lookAt(this.look);
      const floor = groundY(this.camera.position.x, this.camera.position.z) + 0.55;
      if (this.camera.position.y < floor) this.camera.position.y = floor;
      const camDist = this.camera.position.distanceTo(this.head);
      this.playerMesh.visible = camDist > 0.65;
    }
    this.level.playerLight.position.set(p.x, p.y + 0.4, p.z);
    this.muzzleLocal.set(0.35, 1.15, 0.35);
    this.playerMesh.localToWorld(this.muzzleLocal);
    this.level.muzzle.position.copy(this.muzzleLocal);
    this.level.muzzle.intensity *= Math.exp(-18 * Math.max(dt, 0.016));
    this.level.sun.position.set(p.x + 16, 26, p.z + 10);
    this.level.sunTarget.position.set(p.x, 0, p.z);
    const bases = this.level.dust.userData.bases as THREE.Vector3[];
    for (let i = 0; i < bases.length; i++) {
      const b = bases[i]!;
      this.dummy.position.set(
        p.x + wrap(b.x + this.clock * 0.25, 24) - 12,
        b.y + Math.sin(this.clock * 0.8 + i) * 0.15,
        p.z + wrap(b.z + this.clock * 0.18, 24) - 12,
      );
      const cam = this.camera.position;
      const dd = Math.hypot(this.dummy.position.x - cam.x, this.dummy.position.y - cam.y, this.dummy.position.z - cam.z);
      this.dummy.scale.setScalar(dd < 1.6 ? 0.001 : 1);
      this.dummy.updateMatrix();
      this.level.dust.setMatrixAt(i, this.dummy.matrix);
    }
    this.level.dust.instanceMatrix.needsUpdate = true;
    const dir = new THREE.Vector3();
    this.camera.getWorldDirection(dir);
    this.audio.setListener(this.camera.position.x, this.camera.position.y, this.camera.position.z, dir.x, dir.y, dir.z);
  }

  private render() {
    if (this.composer && this.settings.quality !== "low") this.composer.render();
    else this.renderer.render(this.scene, this.camera);
  }

  private syncGuns() {
    const shot = this.equipped === "shotgun" && this.flags.hasShotgun;
    this.playerParts.pistol.visible = !shot;
    this.playerParts.shotgun.visible = shot;
  }

  private publish(force: boolean) {
    this.pubAt = performance.now();
    const gun = this.equipped;
    const reserve = ammoQty(this.items, gun === "pistol" ? "pistolAmmo" : "shells");
    const boss = this.enemies.find((e) => e.kind === "boss");
    const goals = [
      { text: "Reach the parish square", done: this.flags.enteredSquare },
      { text: "Find the barn key", done: this.flags.hasBarnKey },
      { text: "Light the cellar braziers", done: this.flags.puzzleSolved },
      { text: "Claim the chapel sigil", done: this.flags.hasSigil },
      { text: "Silence the Warden", done: this.flags.bossDefeated },
    ];
    useGame.setState({
      health: this.health,
      stamina: this.stamina,
      mag: gun === "pistol" ? this.magPistol : this.magShotgun,
      reserve,
      weapon: gun === "pistol" ? "Pistol" : "Scattergun",
      reloading: this.reloadT > 0,
      objective: this.objective || "Follow the ash road into the parish square.",
      items: this.items.map((it) => ({ ...it })),
      boss: Boolean(boss && boss.active && boss.state !== "dead"),
      bossHp: boss?.hp ?? 0,
      bossMax: boss?.maxHp ?? 1,
      goals,
      flags: { ...this.flags },
      hasSave: hasSave(),
      showTouch: this.touchWanted(),
      lookHint: this.fallbackLook ? "Right-drag to look · Left-click to shoot" : "",
    });
    void force;
  }

  private writeCheckpoint(id: SaveData["checkpoint"]) {
    const spot = CHECKPOINTS[id];
    const data: SaveData = {
      version: 1,
      checkpoint: id,
      x: spot.x,
      y: spot.y,
      z: spot.z,
      yaw: spot.yaw,
      health: this.health,
      stamina: this.stamina,
      equipped: this.equipped,
      magPistol: this.magPistol,
      magShotgun: this.magShotgun,
      items: this.items,
      flags: this.flags,
      lit: this.lit,
      puzzleStep: this.puzzleStep,
      looted: [...this.looted],
      enemies: this.enemies.map((e) => {
        const t = e.body.translation();
        return { id: e.id, hp: e.hp, x: t.x, y: t.y, z: t.z, alive: e.state !== "dead" } satisfies EnemySnap;
      }),
      difficulty: this.difficulty,
    };
    writeSave(data);
    useGame.setState({ hasSave: true });
  }

  private applySave(data: SaveData) {
    this.flags = { ...emptyFlags(), ...data.flags };
    this.items = data.items.map((it) => ({ ...it }));
    this.lit = data.lit ?? [false, false, false];
    this.puzzleStep = data.puzzleStep ?? 0;
    this.looted = new Set(data.looted ?? []);
    this.checkpoint = data.checkpoint;
    this.health = data.health;
    this.stamina = data.stamina;
    this.equipped = data.equipped;
    this.magPistol = data.magPistol;
    this.magShotgun = data.magShotgun;
    this.difficulty = data.difficulty;
    this.reloadT = 0;
    this.winT = 0;
    this.placePlayer(data.x, data.y, data.z, data.yaw);
    this.resetDoors();
    if (this.flags.barnOpen) this.openDoor("barn");
    if (this.flags.chapelOpen && !(this.flags.bossStarted && !this.flags.bossDefeated)) this.openDoor("chapel");
    this.syncBraziers();
    this.level.chestLid.rotation.x = this.looted.has("chest") ? -1.15 : 0;
    const byId = new Map(data.enemies.map((e) => [e.id, e]));
    for (const e of this.enemies) {
      const snap = byId.get(e.id);
      this.restoreEnemy(e, false);
      if (!snap) continue;
      e.hp = snap.hp;
      e.body.setTranslation({ x: snap.x, y: snap.y, z: snap.z }, true);
      if (!snap.alive) {
        e.state = "dead";
        e.hp = 0;
        e.collider.setSensor(true);
        e.deadT = 1.2;
      }
      if (e.kind === "boss") e.active = this.flags.bossStarted && snap.alive;
    }
    this.rebuildNav();
  }

  private placePlayer(x: number, y: number, z: number, yaw: number) {
    this.yaw = yaw;
    this.pitch = 0;
    this.vx = 0;
    this.vz = 0;
    this.vy = 0;
    this.playerBody.setTranslation({ x, y, z }, true);
    this.playerBody.setNextKinematicTranslation({ x, y, z });
  }

  private spawnAll(spawns: Spawn[], diff: Difficulty) {
    for (const s of spawns) this.enemies.push(this.makeEnemy(s, diff));
  }

  private makeEnemy(s: Spawn, diff: Difficulty): Enemy {
    const boss = s.kind === "boss";
    const mark = s.kind === "marksman";
    const mult = diff === "hard" ? 1.35 : 1;
    const feet = boss ? 1.15 : 0.77;
    const radius = boss ? 0.48 : 0.32;
    const half = boss ? 0.62 : 0.45;
    const y = groundY(s.x, s.z) + feet;
    const body = this.world.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(s.x, y, s.z));
    const collider = this.world.createCollider(
      RAPIER.ColliderDesc.capsule(half, radius).setCollisionGroups(groups(GROUP_ACTOR, GROUP_WORLD | GROUP_ACTOR)),
      body,
    );
    this.actorCols.add(collider.handle);
    const controller = this.world.createCharacterController(0.04);
    controller.enableAutostep(0.32, 0.18, true);
    controller.enableSnapToGround(0.5);
    controller.setSlideEnabled(true);
    controller.setMaxSlopeClimbAngle((50 * Math.PI) / 180);
    const fig = makeFigure({
      coat: boss ? 0x3a241c : mark ? 0x3d3424 : 0x5a4034,
      skin: boss ? 0xb7a898 : 0xcbb8a4,
      eyes: boss ? 0xff4a2a : 0x8c1c18,
      scale: boss ? 1.38 : mark ? 1.05 : 1,
      hunched: !mark,
      spikes: boss,
      rifle: mark,
    });
    fig.group.position.set(s.x, groundY(s.x, s.z), s.z);
    this.scene.add(fig.group);
    return {
      id: s.id,
      kind: s.kind,
      hp: Math.round((boss ? 480 : mark ? 50 : 74) * mult),
      maxHp: Math.round((boss ? 480 : mark ? 50 : 74) * mult),
      speed: (boss ? 2.45 : mark ? 1.85 : 2.15) * (diff === "hard" ? 1.08 : 1),
      damage: (boss ? 26 : mark ? 13 : 15) * (diff === "hard" ? 1.15 : 1),
      range: boss ? 2.45 : mark ? 16 : 1.7,
      vision: boss ? 20 : mark ? 18 : 12,
      yaw: s.yaw,
      waypoints: s.waypoints,
      wp: 0,
      wait: 0,
      state: "patrol",
      stateTime: 0,
      strikeAt: 0.4,
      struck: false,
      attack: "melee",
      cooldown: 0.4,
      investigate: null,
      path: [],
      pathI: 0,
      pathCd: 0,
      flash: 0,
      deadT: 0,
      phase: 1,
      chargeX: 0,
      chargeZ: 1,
      body,
      collider,
      controller,
      mesh: fig.group,
      parts: fig.parts,
      wishX: 0,
      wishZ: 0,
      vy: 0,
      feet,
      radius,
      headR: boss ? 0.28 : 0.2,
      groan: 0,
      stuck: 0,
      lastX: s.x,
      lastZ: s.z,
      active: s.kind !== "boss",
      walk: Math.random() * 4,
    };
  }

  private restoreEnemy(e: Enemy, full: boolean) {
    const spawn = this.level.spawns.find((s) => s.id === e.id);
    if (!spawn) return;
    const mult = this.difficulty === "hard" ? 1.35 : 1;
    const base = e.kind === "boss" ? 480 : e.kind === "marksman" ? 50 : 74;
    e.maxHp = Math.round(base * mult);
    e.hp = e.maxHp;
    e.state = "patrol";
    e.stateTime = 0;
    e.deadT = 0;
    e.flash = 0;
    e.cooldown = 0.5;
    e.phase = 1;
    e.active = e.kind !== "boss";
    e.collider.setSensor(false);
    e.wp = 0;
    const y = groundY(spawn.x, spawn.z) + e.feet;
    e.body.setTranslation({ x: spawn.x, y, z: spawn.z }, true);
    e.mesh.rotation.x = 0;
    if (!full) void full;
  }

  private resetDoors() {
    for (const door of [this.level.doors.barn, this.level.doors.chapel]) {
      door.collider.setSensor(false);
      door.hinge.rotation.y = 0;
    }
    this.rebuildNav();
  }

  private openDoor(which: "barn" | "chapel") {
    const door = this.level.doors[which];
    door.collider.setSensor(true);
    door.hinge.rotation.y = -1.35;
    this.rebuildNav();
  }

  private rebuildNav() {
    const gaps = [];
    if (this.flags.barnOpen) gaps.push(this.level.doors.barn.gap);
    if (this.flags.chapelOpen && !(this.flags.bossStarted && !this.flags.bossDefeated)) gaps.push(this.level.doors.chapel.gap);
    this.level.blocked = bakeNav(this.level.solids, gaps);
    setNavGrid(this.level.blocked);
  }

  private syncBraziers() {
    this.level.braziers.forEach((b, i) => {
      const on = this.lit[i] === true;
      b.light.intensity = on ? 2.4 : 0;
      b.mat.emissiveIntensity = on ? 2.2 : 0.12;
    });
  }

  private say(text: string, seconds: number) {
    this.subtitleT = seconds;
    useGame.setState({ subtitle: text });
  }

  private toast(text: string) {
    this.toastT = 2.6;
    useGame.setState({ toast: text });
  }

  private nearestEnemyDist() {
    const p = this.playerBody.translation();
    let best = 99;
    for (const e of this.enemies) {
      if (e.state === "dead" || !e.active) continue;
      const t = e.body.translation();
      best = Math.min(best, Math.hypot(t.x - p.x, t.z - p.z));
    }
    return best;
  }

  private makeFx() {
    const geo = new THREE.SphereGeometry(0.12, 6, 6);
    for (let i = 0; i < 16; i++) {
      const mesh = new THREE.Mesh(
        geo,
        new THREE.MeshBasicMaterial({ color: 0xffe0c0, transparent: true, opacity: 0 }),
      );
      mesh.visible = true;
      this.scene.add(mesh);
      this.sparks.push({ mesh, life: 0 });
    }
    try {
      this.composer = new EffectComposer(this.renderer);
      this.composer.addPass(new RenderPass(this.scene, this.camera));
      this.bloom = new UnrealBloomPass(new THREE.Vector2(800, 600), 0.22, 0.4, 0.72);
      this.composer.addPass(this.bloom);
      this.composer.addPass(new OutputPass());
    } catch {
      this.composer = null;
    }
  }

  private applyQuality(q: Quality) {
    const dpr = q === "low" ? 1 : q === "high" ? Math.min(1.6, window.devicePixelRatio || 1) : Math.min(1.25, window.devicePixelRatio || 1);
    this.renderer.setPixelRatio(dpr);
    this.renderer.shadowMap.enabled = q !== "low";
    const size = q === "high" ? 2048 : 1024;
    this.level.sun.shadow.mapSize.set(size, size);
    this.level.sun.shadow.map?.dispose();
    if (this.bloom) this.bloom.enabled = q !== "low";
    this.resize();
  }

  private resize = () => {
    const w = this.canvas.clientWidth || window.innerWidth;
    const h = this.canvas.clientHeight || window.innerHeight;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / Math.max(1, h);
    this.camera.updateProjectionMatrix();
    this.composer?.setSize(w, h);
  };

  private onResize = () => this.resize();

  private touchWanted() {
    if (this.settings.touch === "on") return true;
    if (this.settings.touch === "off") return false;
    return window.matchMedia("(pointer: coarse)").matches || window.innerWidth < 760;
  }

  private capturePointer() {
    if (this.touchWanted()) return;
    const req = this.canvas.requestPointerLock?.({ unadjustedMovement: true } as PointerLockOptions);
    if (req && typeof (req as Promise<void>).catch === "function") {
      void (req as Promise<void>).catch(() => {
        this.fallbackLook = true;
        this.publish(true);
      });
    }
  }

  private releasePointer() {
    if (document.pointerLockElement) document.exitPointerLock();
  }

  private bind() {
    this.onKeyDown = (e) => {
      if (e.code === "Tab" || e.code === "Space") e.preventDefault();
      if (e.repeat) return;
      this.keys.add(e.code);
      const screen = useGame.getState().screen;
      if (e.code === "Escape") {
        if (screen === "play") this.pause();
        else if (screen === "pause" || screen === "inventory") this.resume();
        else if (screen === "settings") this.closeSettings();
        return;
      }
      if (e.code === "Tab") {
        if (screen === "play") this.openInventory();
        else if (screen === "inventory") this.resume();
        return;
      }
      if (screen !== "play") return;
      if (e.code === "KeyE") this.interactEdge = true;
      if (e.code === "KeyR") this.reloadEdge = true;
      if (e.code === "KeyF") this.meleeEdge = true;
      if (e.code === "Space") this.dodgeEdge = true;
      if (e.code === "Digit1") this.equipped = "pistol";
      if (e.code === "Digit2" && this.flags.hasShotgun) this.equipped = "shotgun";
    };
    this.onKeyUp = (e) => this.keys.delete(e.code);
    this.onMouseDown = (e) => {
      if (useGame.getState().screen !== "play") return;
      if (e.button === 0) {
        if (document.pointerLockElement !== this.canvas && !this.touchWanted()) this.capturePointer();
        this.setFire(true);
      }
      if (e.button === 2) {
        if (document.pointerLockElement === this.canvas) this.meleeEdge = true;
        else this.lookDrag = true;
      }
    };
    this.onMouseUp = (e) => {
      if (e.button === 0) this.setFire(false);
      if (e.button === 2) this.lookDrag = false;
    };
    this.onMouseMove = (e) => {
      if (document.pointerLockElement === this.canvas || this.lookDrag) {
        this.mouseX += e.movementX;
        this.mouseY += e.movementY;
      }
    };
    this.onWheel = (e) => {
      if (useGame.getState().screen !== "play") return;
      if (e.deltaY > 0 && this.flags.hasShotgun) this.equipped = "shotgun";
      if (e.deltaY < 0) this.equipped = "pistol";
    };
    this.onContext = (e) => e.preventDefault();
    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("keyup", this.onKeyUp);
    window.addEventListener("mousedown", this.onMouseDown);
    window.addEventListener("mouseup", this.onMouseUp);
    window.addEventListener("mousemove", this.onMouseMove);
    window.addEventListener("wheel", this.onWheel, { passive: true });
    window.addEventListener("resize", this.onResize);
    window.addEventListener("blur", this.onBlur);
    document.addEventListener("pointerlockchange", this.onLock);
    document.addEventListener("visibilitychange", this.onVis);
    this.canvas.addEventListener("contextmenu", this.onContext);
  }

  private unbind() {
    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("keyup", this.onKeyUp);
    window.removeEventListener("mousedown", this.onMouseDown);
    window.removeEventListener("mouseup", this.onMouseUp);
    window.removeEventListener("mousemove", this.onMouseMove);
    window.removeEventListener("wheel", this.onWheel);
    window.removeEventListener("resize", this.onResize);
    window.removeEventListener("blur", this.onBlur);
    document.removeEventListener("pointerlockchange", this.onLock);
    document.removeEventListener("visibilitychange", this.onVis);
    this.canvas.removeEventListener("contextmenu", this.onContext);
  }

  private installProbe() {
    const dev = import.meta.env.DEV || new URLSearchParams(location.search).has("qa");
    if (!dev) return;
    window.__controlsTest = {
      getYaw: () => this.getYaw(),
      getSpeed: () => this.getSpeed(),
      getPos: () => this.getPos(),
      setKeys: (codes) => this.setDebugKeys(codes),
      setPos: (x, y, z, yaw) => this.placePlayer(x, y, z, yaw ?? this.yaw),
      setSteer: () => undefined,
    };
  }
}

function approach(v: number, target: number, max: number) {
  const d = target - v;
  if (Math.abs(d) <= max) return target;
  return v + Math.sign(d) * max;
}

function wrap(v: number, size: number) {
  return ((v % size) + size) % size;
}

function raySphere(o: THREE.Vector3, d: THREE.Vector3, c: THREE.Vector3, r: number) {
  const ocx = o.x - c.x;
  const ocy = o.y - c.y;
  const ocz = o.z - c.z;
  const b = ocx * d.x + ocy * d.y + ocz * d.z;
  const c2 = ocx * ocx + ocy * ocy + ocz * ocz - r * r;
  const disc = b * b - c2;
  if (disc < 0) return null;
  const s = Math.sqrt(disc);
  const t = -b - s;
  if (t > 0.01) return t;
  const t2 = -b + s;
  return t2 > 0.01 ? t2 : null;
}
