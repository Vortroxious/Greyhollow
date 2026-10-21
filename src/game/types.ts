export type Gun = "pistol" | "shotgun";
export type Quality = "low" | "medium" | "high";
export type Difficulty = "normal" | "hard";
export type TouchMode = "auto" | "on" | "off";
export type Screen =
  | "boot"
  | "menu"
  | "settings"
  | "play"
  | "pause"
  | "inventory"
  | "dead"
  | "won"
  | "error";

export type ItemKind =
  | "knife"
  | "pistol"
  | "shotgun"
  | "pistolAmmo"
  | "shells"
  | "herb"
  | "barnKey"
  | "sigil"
  | "note";

export type Item = {
  id: string
  kind: ItemKind
  x: number
  y: number
  qty: number
};

export type Flags = {
  enteredSquare: boolean
  hasBarnKey: boolean
  barnOpen: boolean
  puzzleSolved: boolean
  hasSigil: boolean
  chapelOpen: boolean
  bossStarted: boolean
  bossDefeated: boolean
  hasShotgun: boolean
  hasNote: boolean
};

export type Settings = {
  sensitivity: number
  invertY: boolean
  volume: number
  sfx: number
  music: number
  quality: Quality
  difficulty: Difficulty
  touch: TouchMode
};

export const DEFAULT_SETTINGS: Settings = {
  sensitivity: 0.00215,
  invertY: false,
  volume: 0.8,
  sfx: 0.85,
  music: 0.42,
  quality: "medium",
  difficulty: "normal",
  touch: "auto",
};

export type Goal = { text: string; done: boolean };

export type ControlsProbe = {
  getYaw: () => number
  getSpeed: () => number
  getPos: () => { x: number; y: number; z: number }
  setKeys: (codes: string[]) => void
  setPos?: (x: number, y: number, z: number, yaw?: number) => void
  setSteer?: (v: number) => void
};

declare global {
  interface Window {
    __controlsTest?: ControlsProbe
  }
}
