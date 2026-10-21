import { create } from "zustand";
import type { Flags, Goal, Item, Screen, Settings } from "@/game/types";
import { DEFAULT_SETTINGS } from "@/game/types";
import { emptyFlags } from "@/game/save";

export type HudState = {
  screen: Screen
  settingsBack: "menu" | "pause"
  bootError: string
  bootLabel: string
  health: number
  maxHealth: number
  stamina: number
  mag: number
  reserve: number
  weapon: string
  reloading: boolean
  prompt: string
  objective: string
  subtitle: string
  toast: string
  hurt: number
  hit: number
  aimHot: boolean
  boss: boolean
  bossHp: number
  bossMax: number
  items: Item[]
  selected: string | null
  hasSave: boolean
  settings: Settings
  showTouch: boolean
  goals: Goal[]
  flags: Flags
  lookHint: string
  ready: boolean
};

export const useGame = create<HudState>(() => ({
  screen: "boot",
  settingsBack: "menu",
  bootError: "",
  bootLabel: "Waking the parish…",
  health: 100,
  maxHealth: 100,
  stamina: 100,
  mag: 0,
  reserve: 0,
  weapon: "Pistol",
  reloading: false,
  prompt: "",
  objective: "Follow the ash road into the parish square.",
  subtitle: "",
  toast: "",
  hurt: 0,
  hit: 0,
  aimHot: false,
  boss: false,
  bossHp: 0,
  bossMax: 1,
  items: [],
  selected: null,
  hasSave: false,
  settings: { ...DEFAULT_SETTINGS },
  showTouch: false,
  goals: [],
  flags: emptyFlags(),
  lookHint: "",
  ready: false,
}));
