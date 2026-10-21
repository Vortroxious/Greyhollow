import type { Item, ItemKind } from "@/game/types";

export const COLS = 8;
export const ROWS = 4;

export function sizeOf(kind: ItemKind): { w: number; h: number } {
  if (kind === "knife") return { w: 1, h: 2 };
  if (kind === "pistol") return { w: 2, h: 1 };
  if (kind === "shotgun") return { w: 3, h: 1 };
  return { w: 1, h: 1 };
}

export const ITEM_INFO: Record<ItemKind, { name: string; blurb: string }> = {
  knife: {
    name: "Field knife",
    blurb: "Bureau issue. Quiet, close, and the only thing that never runs dry. Press F to cut.",
  },
  pistol: {
    name: "Service pistol",
    blurb: "Twelve-round sidearm. Head wounds drop the hollowed faster. Aim before you spend a bullet.",
  },
  shotgun: {
    name: "Scattergun",
    blurb: "Short rural shotgun. Brutal inside a room, useless if you miss the spread. Four shells in the tube.",
  },
  pistolAmmo: {
    name: "Handgun rounds",
    blurb: "Loose cartridges. Reloading the pistol draws from every box in the pack.",
  },
  shells: {
    name: "Shotgun shells",
    blurb: "Brass and black powder. The scattergun will not feed without them.",
  },
  herb: {
    name: "Bitter green",
    blurb: "A parish poultice. Use it to knit flesh. It will not bring you past whole.",
  },
  barnKey: {
    name: "Barn key",
    blurb: "Heavy iron, stamped with a wheat sheaf. The harrow barn on the north edge of the square.",
  },
  sigil: {
    name: "Chapel sigil",
    blurb: "A cold disc of parish silver. The chapel doors know it.",
  },
  note: {
    name: "Sexton's scrap",
    blurb:
      "The mural is an order, not a decoration. Light dawn first, then dusk, then the one between. I, then III, then II. Any other flame and the chest stays shut.",
  },
};

let seq = 1;
export function makeItem(kind: ItemKind, x: number, y: number, qty = 1): Item {
  return { id: `${kind}-${seq++}`, kind, x, y, qty };
}

export function overlaps(a: Item, b: Item): boolean {
  const as = sizeOf(a.kind);
  const bs = sizeOf(b.kind);
  return a.x < b.x + bs.w && a.x + as.w > b.x && a.y < b.y + bs.h && a.y + as.h > b.y;
}

export function inBounds(kind: ItemKind, x: number, y: number): boolean {
  const s = sizeOf(kind);
  return x >= 0 && y >= 0 && x + s.w <= COLS && y + s.h <= ROWS;
}

export function canPlace(items: Item[], kind: ItemKind, x: number, y: number, ignoreId?: string): boolean {
  if (!inBounds(kind, x, y)) return false;
  const ghost = { id: "_", kind, x, y, qty: 1 };
  return !items.some((it) => it.id !== ignoreId && overlaps(ghost, it));
}

export function findSpot(items: Item[], kind: ItemKind): { x: number; y: number } | null {
  const s = sizeOf(kind);
  for (let y = 0; y <= ROWS - s.h; y++) {
    for (let x = 0; x <= COLS - s.w; x++) {
      if (canPlace(items, kind, x, y)) return { x, y };
    }
  }
  return null;
}

export function tryAdd(items: Item[], kind: ItemKind, qty = 1): Item[] | null {
  if (kind === "pistolAmmo" || kind === "shells") {
    const existing = items.find((it) => it.kind === kind && it.qty < 48);
    if (existing) {
      return items.map((it) => (it.id === existing.id ? { ...it, qty: Math.min(48, it.qty + qty) } : it));
    }
  }
  const spot = findSpot(items, kind);
  if (!spot) return null;
  return [...items, makeItem(kind, spot.x, spot.y, qty)];
}

export function moveItem(items: Item[], id: string, x: number, y: number): Item[] | null {
  const item = items.find((it) => it.id === id);
  if (!item) return null;
  if (!canPlace(items, item.kind, x, y, id)) return null;
  return items.map((it) => (it.id === id ? { ...it, x, y } : it));
}

export function removeItem(items: Item[], id: string): Item[] {
  return items.filter((it) => it.id !== id);
}

export function ammoQty(items: Item[], kind: "pistolAmmo" | "shells"): number {
  return items.reduce((n, it) => (it.kind === kind ? n + it.qty : n), 0);
}

export function takeAmmo(items: Item[], kind: "pistolAmmo" | "shells", amount: number): { items: Item[]; took: number } {
  let need = amount;
  const next = items.map((it) => ({ ...it }));
  for (const it of next) {
    if (need <= 0) break;
    if (it.kind !== kind || it.qty <= 0) continue;
    const take = Math.min(it.qty, need);
    it.qty -= take;
    need -= take;
  }
  return { items: next.filter((it) => it.kind !== kind || it.qty > 0), took: amount - need };
}

export function startingPack(): Item[] {
  return [
    makeItem("knife", 0, 0),
    makeItem("pistol", 1, 0),
    makeItem("pistolAmmo", 3, 0, 30),
    makeItem("herb", 4, 0),
  ];
}

export function neighborId(items: Item[], current: string | null, dir: "left" | "right" | "up" | "down"): string | null {
  if (!items.length) return null;
  const cur = items.find((it) => it.id === current) ?? items[0]!;
  let best: Item | null = null;
  let bestScore = Infinity;
  for (const it of items) {
    if (it.id === cur.id) continue;
    const dx = it.x - cur.x;
    const dy = it.y - cur.y;
    const ok =
      (dir === "left" && dx < 0) ||
      (dir === "right" && dx > 0) ||
      (dir === "up" && dy < 0) ||
      (dir === "down" && dy > 0);
    if (!ok) continue;
    const score = Math.abs(dx) + Math.abs(dy) * 1.2;
    if (score < bestScore) {
      bestScore = score;
      best = it;
    }
  }
  return best?.id ?? cur.id;
}

export function cellsUsed(items: Item[]): number {
  return items.reduce((n, it) => {
    const s = sizeOf(it.kind);
    return n + s.w * s.h;
  }, 0);
}
