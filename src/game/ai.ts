import type { FigureParts } from "@/game/meshes";
import { findPath, NAV } from "@/game/nav";
import { groundY } from "@/game/level";
import type RAPIER from "@dimforge/rapier3d-compat";
import type * as THREE from "three";

export type Enemy = {
  id: string
  kind: "shambler" | "marksman" | "boss"
  hp: number
  maxHp: number
  speed: number
  damage: number
  range: number
  vision: number
  yaw: number
  waypoints: { x: number; z: number }[]
  wp: number
  wait: number
  state: "patrol" | "investigate" | "chase" | "attack" | "stagger" | "dead"
  stateTime: number
  strikeAt: number
  struck: boolean
  attack: "melee" | "shot" | "slam" | "wave" | "charge"
  cooldown: number
  investigate: { x: number; z: number } | null
  path: { x: number; z: number }[]
  pathI: number
  pathCd: number
  flash: number
  deadT: number
  phase: number
  chargeX: number
  chargeZ: number
  body: RAPIER.RigidBody
  collider: RAPIER.Collider
  controller: RAPIER.KinematicCharacterController
  mesh: THREE.Group
  parts: FigureParts
  wishX: number
  wishZ: number
  vy: number
  feet: number
  radius: number
  headR: number
  groan: number
  stuck: number
  lastX: number
  lastZ: number
  active: boolean
  walk: number
};

export type AICtx = {
  player: { x: number; y: number; z: number }
  dt: number
  noises: { x: number; z: number; r: number }[]
  allies: { id: string; x: number; z: number }[]
  los: (x: number, y: number, z: number, x2: number, y2: number, z2: number) => boolean
  damagePlayer: (amount: number, x: number, z: number) => void
  spawnShot: (x: number, y: number, z: number, dx: number, dy: number, dz: number, dmg: number) => void
  startWave: (x: number, z: number, dmg: number) => void
  onGroan: (e: Enemy, deep: boolean) => void
  onPhase: (phase: number) => void
};

function face(e: Enemy, x: number, z: number, px: number, pz: number) {
  e.yaw = Math.atan2(-(px - x), -(pz - z));
}

function steer(e: Enemy, x: number, z: number, tx: number, tz: number, ctx: AICtx) {
  if (e.pathCd <= 0) {
    e.path = findPath(ctxBlocked(ctx), x, z, tx, tz) ?? [];
    e.pathI = 0;
    e.pathCd = e.kind === "boss" ? 0.35 : 0.5;
  }
  let gx = tx;
  let gz = tz;
  if (e.path.length) {
    while (e.pathI < e.path.length - 1) {
      const wp = e.path[e.pathI]!;
      if (Math.hypot(wp.x - x, wp.z - z) < 0.85) e.pathI++;
      else break;
    }
    const wp = e.path[Math.min(e.pathI, e.path.length - 1)]!;
    gx = wp.x;
    gz = wp.z;
  }
  let sx = 0;
  let sz = 0;
  for (const a of ctx.allies) {
    if (a.id === e.id) continue;
    const dx = x - a.x;
    const dz = z - a.z;
    const d = Math.hypot(dx, dz);
    if (d > 0.001 && d < 1.15) {
      sx += dx / d;
      sz += dz / d;
    }
  }
  let mx = gx - x + sx * 0.9;
  let mz = gz - z + sz * 0.9;
  const mag = Math.hypot(mx, mz);
  if (mag < 0.08) {
    e.wishX = 0;
    e.wishZ = 0;
    return;
  }
  e.wishX = (mx / mag) * e.speed;
  e.wishZ = (mz / mag) * e.speed;
  e.yaw = Math.atan2(-mx, -mz);
}

const blockedRef: { grid: Uint8Array | null } = { grid: null };
function ctxBlocked(ctx: AICtx): Uint8Array {
  void ctx;
  return blockedRef.grid ?? new Uint8Array(NAV.cols * NAV.rows);
}

export function setNavGrid(grid: Uint8Array) {
  blockedRef.grid = grid;
}

function begin(e: Enemy, kind: Enemy["attack"], windup: number, recover: number) {
  e.state = "attack";
  e.attack = kind;
  e.stateTime = 0;
  e.strikeAt = windup;
  e.struck = false;
  e.cooldown = windup + recover;
  e.wishX = 0;
  e.wishZ = 0;
}

export function planEnemy(e: Enemy, ctx: AICtx) {
  const dt = ctx.dt;
  const p = e.body.translation();
  const x = p.x;
  const z = p.z;
  e.flash = Math.max(0, e.flash - dt);
  if (e.state === "dead") {
    e.deadT += dt;
    e.wishX = 0;
    e.wishZ = 0;
    e.vy = 0;
    return;
  }
  if (!e.active) {
    e.wishX = 0;
    e.wishZ = 0;
    e.vy = 0;
    return;
  }

  e.cooldown = Math.max(0, e.cooldown - dt);
  e.pathCd = Math.max(0, e.pathCd - dt);
  e.groan -= dt;
  e.stateTime += dt;

  const dx = ctx.player.x - x;
  const dz = ctx.player.z - z;
  const dist = Math.hypot(dx, dz) || 0.0001;
  const see =
    dist < e.vision &&
    ctx.los(x, p.y + 0.35, z, ctx.player.x, ctx.player.y + 0.2, ctx.player.z) &&
    dx * -Math.sin(e.yaw) + dz * -Math.cos(e.yaw) > dist * 0.15;

  if ((e.state === "patrol" || e.state === "investigate") && e.kind !== "boss") {
    for (const n of ctx.noises) {
      if (Math.hypot(n.x - x, n.z - z) < n.r) {
        e.state = "investigate";
        e.investigate = { x: n.x, z: n.z };
        e.pathCd = 0;
        e.stateTime = 0;
      }
    }
  }

  if (see && e.state !== "attack" && e.state !== "stagger") {
    if (e.state !== "chase" && e.groan <= 0) {
      ctx.onGroan(e, e.kind === "boss");
      e.groan = e.kind === "boss" ? 4 : 2.4;
    }
    e.state = "chase";
    e.investigate = { x: ctx.player.x, z: ctx.player.z };
  }

  if (e.kind === "boss") {
    const phase = e.hp < e.maxHp * 0.3 ? 3 : e.hp < e.maxHp * 0.6 ? 2 : 1;
    if (phase !== e.phase) {
      e.phase = phase;
      ctx.onPhase(phase);
    }
  }

  if (e.state === "stagger") {
    e.wishX = 0;
    e.wishZ = 0;
    if (e.stateTime > 0.38) {
      e.state = "chase";
      e.stateTime = 0;
    }
  } else if (e.state === "attack") {
    if (e.attack === "charge" && e.stateTime >= e.strikeAt) {
      e.wishX = e.chargeX * (e.phase >= 3 ? 8.5 : 7.2);
      e.wishZ = e.chargeZ * (e.phase >= 3 ? 8.5 : 7.2);
      if (dist < e.radius + 0.85) ctx.damagePlayer(e.damage, x, z);
      if (e.stateTime > e.strikeAt + 0.9) {
        e.state = "chase";
        e.stateTime = 0;
      }
    } else {
      e.wishX = 0;
      e.wishZ = 0;
      face(e, x, z, ctx.player.x, ctx.player.z);
      if (e.attack !== "charge" && e.stateTime > e.strikeAt + 0.4) {
        e.state = "chase";
        e.stateTime = 0;
      }
    }
  } else if (e.state === "investigate" && e.investigate) {
    const d = Math.hypot(e.investigate.x - x, e.investigate.z - z);
    if (d < 1.1) {
      e.wishX = 0;
      e.wishZ = 0;
      if (e.stateTime > 2.2) {
        e.state = "patrol";
        e.stateTime = 0;
        e.investigate = null;
      }
    } else steer(e, x, z, e.investigate.x, e.investigate.z, ctx);
  } else if (e.state === "chase") {
    const wantAttack = e.cooldown <= 0;
    if (e.kind === "marksman") {
      if (dist < 4.5) {
        steer(e, x, z, x - (dx / dist) * 4, z - (dz / dist) * 4, ctx);
      } else if (wantAttack && dist < e.vision && see) {
        const len = dist;
        e.chargeX = dx / len;
        e.chargeZ = dz / len;
        begin(e, "shot", 0.48, 1.15);
        face(e, x, z, ctx.player.x, ctx.player.z);
      } else if (dist > 11) steer(e, x, z, ctx.player.x, ctx.player.z, ctx);
      else {
        e.wishX = 0;
        e.wishZ = 0;
        face(e, x, z, ctx.player.x, ctx.player.z);
      }
    } else if (e.kind === "boss") {
      if (wantAttack && e.phase >= 3 && dist > 3.5 && dist < 11) {
        e.chargeX = dx / dist;
        e.chargeZ = dz / dist;
        begin(e, "charge", 0.62, 1.4);
        face(e, x, z, ctx.player.x, ctx.player.z);
      } else if (wantAttack && e.phase >= 2 && dist > 2.4 && dist < 8.5) {
        begin(e, "wave", 0.5, 1.6);
        face(e, x, z, ctx.player.x, ctx.player.z);
      } else if (wantAttack && dist < e.range) {
        begin(e, "slam", 0.58, 1.05);
        face(e, x, z, ctx.player.x, ctx.player.z);
      } else if (dist < e.radius + 1.05) {
        e.wishX = 0;
        e.wishZ = 0;
        face(e, x, z, ctx.player.x, ctx.player.z);
      } else steer(e, x, z, ctx.player.x, ctx.player.z, ctx);
    } else if (wantAttack && dist < e.range) {
      begin(e, "melee", 0.42, 0.85);
      face(e, x, z, ctx.player.x, ctx.player.z);
    } else if (dist < e.radius + 0.95) {
      e.wishX = 0;
      e.wishZ = 0;
      face(e, x, z, ctx.player.x, ctx.player.z);
    } else steer(e, x, z, ctx.player.x, ctx.player.z, ctx);
  } else {
    const wp = e.waypoints[e.wp] ?? { x, z };
    const d = Math.hypot(wp.x - x, wp.z - z);
    if (d < 0.75) {
      e.wishX = 0;
      e.wishZ = 0;
      e.wait += dt;
      if (e.wait > 1.15) {
        e.wp = (e.wp + 1) % Math.max(1, e.waypoints.length);
        e.wait = 0;
        e.pathCd = 0;
      }
    } else {
      e.wait = 0;
      steer(e, x, z, wp.x, wp.z, ctx);
    }
  }

  if (e.state !== "attack" && e.state !== "stagger") {
    const moved = Math.hypot(x - e.lastX, z - e.lastZ);
    if (e.wishX * e.wishX + e.wishZ * e.wishZ > 0.2 && moved < 0.015) e.stuck += dt;
    else e.stuck = 0;
    if (e.stuck > 0.8) {
      e.stuck = 0;
      e.pathCd = 0;
      e.wishX += (Math.random() - 0.5) * e.speed;
      e.wishZ += (Math.random() - 0.5) * e.speed;
    }
  }
  e.lastX = x;
  e.lastZ = z;

  const gy = groundY(x, z) + e.feet;
  e.vy += -22 * dt;
  if (e.vy < -28) e.vy = -28;
  if (p.y <= gy + 0.08 && e.vy < 0) e.vy = -2.2;
}

export function resolveEnemy(e: Enemy, ctx: AICtx) {
  if (e.state !== "attack" || e.struck || e.stateTime < e.strikeAt) return;
  if (e.attack === "charge") return;
  e.struck = true;
  const p = e.body.translation();
  const dist = Math.hypot(ctx.player.x - p.x, ctx.player.z - p.z);
  if (e.attack === "melee" || e.attack === "slam") {
    if (dist < e.range + 0.25) ctx.damagePlayer(e.damage, p.x, p.z);
  } else if (e.attack === "shot") {
    const dx = ctx.player.x - p.x;
    const dy = ctx.player.y - p.y;
    const dz = ctx.player.z - p.z;
    const len = Math.hypot(dx, dy, dz) || 1;
    ctx.spawnShot(p.x, p.y + 0.4, p.z, dx / len, dy / len, dz / len, e.damage);
  } else if (e.attack === "wave") {
    ctx.startWave(p.x, p.z, e.damage);
  }
}

export function hurtEnemy(e: Enemy, dmg: number, head: boolean) {
  if (e.state === "dead" || !e.active && e.kind === "boss") return false;
  e.hp -= dmg;
  e.flash = 0.14;
  if (e.hp <= 0) {
    e.hp = 0;
    e.state = "dead";
    e.stateTime = 0;
    e.deadT = 0;
    e.wishX = 0;
    e.wishZ = 0;
    e.collider.setSensor(true);
    return true;
  }
  if (e.kind !== "boss" && (head || dmg >= 30)) {
    e.state = "stagger";
    e.stateTime = 0;
  } else if (e.state === "patrol" || e.state === "investigate") {
    e.state = "chase";
    e.stateTime = 0;
  }
  e.active = true;
  return false;
}
