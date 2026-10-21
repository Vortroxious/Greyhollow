import type { Difficulty, Flags, Item, Settings } from "@/game/types";
import { DEFAULT_SETTINGS } from "@/game/types";

const SAVE_KEY = "greyhollow-save-v1";
const SETTINGS_KEY = "greyhollow-settings-v1";

export type EnemySnap = {
  id: string
  hp: number
  x: number
  y: number
  z: number
  alive: boolean
};

export type SaveData = {
  version: 1
  checkpoint: "ash" | "square" | "chapel"
  x: number
  y: number
  z: number
  yaw: number
  health: number
  stamina: number
  equipped: "pistol" | "shotgun"
  magPistol: number
  magShotgun: number
  items: Item[]
  flags: Flags
  lit: [boolean, boolean, boolean]
  puzzleStep: number
  looted: string[]
  enemies: EnemySnap[]
  difficulty: Difficulty
};

export function emptyFlags(): Flags {
  return {
    enteredSquare: false,
    hasBarnKey: false,
    barnOpen: false,
    puzzleSolved: false,
    hasSigil: false,
    chapelOpen: false,
    bossStarted: false,
    bossDefeated: false,
    hasShotgun: false,
    hasNote: false,
  };
}

export function loadSave(): SaveData | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as SaveData;
    if (!data || data.version !== 1 || !data.flags) return null;
    return data;
  } catch {
    return null;
  }
}

export function writeSave(data: SaveData): void {
  localStorage.setItem(SAVE_KEY, JSON.stringify(data));
}

export function hasSave(): boolean {
  return loadSave() !== null;
}

export function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    return { ...DEFAULT_SETTINGS, ...(JSON.parse(raw) as Partial<Settings>) };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function writeSettings(settings: Settings): void {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}
