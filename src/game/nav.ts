export const NAV = {
  originX: -42,
  originZ: -50,
  cell: 1.5,
  cols: 56,
  rows: 72,
};

type Open = { i: number; f: number };

export function cellIndex(c: number, r: number): number {
  return r * NAV.cols + c;
}

export function worldToCell(x: number, z: number): { c: number; r: number } {
  return {
    c: Math.floor((x - NAV.originX) / NAV.cell),
    r: Math.floor((z - NAV.originZ) / NAV.cell),
  };
}

export function cellCenter(c: number, r: number): { x: number; z: number } {
  return {
    x: NAV.originX + (c + 0.5) * NAV.cell,
    z: NAV.originZ + (r + 0.5) * NAV.cell,
  };
}

function heapPush(h: Open[], n: Open) {
  h.push(n);
  let i = h.length - 1;
  while (i > 0) {
    const p = (i - 1) >> 1;
    const parent = h[p];
    const cur = h[i];
    if (!parent || !cur || parent.f <= cur.f) break;
    h[p] = cur;
    h[i] = parent;
    i = p;
  }
}

function heapPop(h: Open[]): Open | undefined {
  const top = h[0];
  const last = h.pop();
  if (!last || h.length === 0) return top;
  h[0] = last;
  let i = 0;
  for (;;) {
    const l = i * 2 + 1;
    const r = l + 1;
    let s = i;
    if (l < h.length && h[l]! && h[s]! && h[l]!.f < h[s]!.f) s = l;
    if (r < h.length && h[r]! && h[s]! && h[r]!.f < h[s]!.f) s = r;
    if (s === i) break;
    const a = h[i]!;
    const b = h[s]!;
    h[i] = b;
    h[s] = a;
    i = s;
  }
  return top;
}

const DIRS: readonly [number, number, number][] = [
  [1, 0, 1],
  [-1, 0, 1],
  [0, 1, 1],
  [0, -1, 1],
  [1, 1, 1.414],
  [1, -1, 1.414],
  [-1, 1, 1.414],
  [-1, -1, 1.414],
];

function nearestFree(blocked: Uint8Array, c: number, r: number): number {
  const start = cellIndex(Math.max(0, Math.min(NAV.cols - 1, c)), Math.max(0, Math.min(NAV.rows - 1, r)));
  if (!blocked[start]) return start;
  for (let rad = 1; rad <= 4; rad++) {
    for (let dz = -rad; dz <= rad; dz++) {
      for (let dx = -rad; dx <= rad; dx++) {
        const cc = c + dx;
        const rr = r + dz;
        if (cc < 0 || rr < 0 || cc >= NAV.cols || rr >= NAV.rows) continue;
        const i = cellIndex(cc, rr);
        if (!blocked[i]) return i;
      }
    }
  }
  return start;
}

function lineFree(blocked: Uint8Array, a: number, b: number): boolean {
  let c0 = a % NAV.cols;
  let r0 = (a / NAV.cols) | 0;
  const c1 = b % NAV.cols;
  const r1 = (b / NAV.cols) | 0;
  const dc = Math.abs(c1 - c0);
  const dr = Math.abs(r1 - r0);
  const sc = c0 < c1 ? 1 : -1;
  const sr = r0 < r1 ? 1 : -1;
  let err = dc - dr;
  for (let n = 0; n < 80; n++) {
    if (blocked[cellIndex(c0, r0)]) return false;
    if (c0 === c1 && r0 === r1) return true;
    const e2 = 2 * err;
    if (e2 > -dr) {
      err -= dr;
      c0 += sc;
    }
    if (e2 < dc) {
      err += dc;
      r0 += sr;
    }
  }
  return false;
}

export function findPath(
  blocked: Uint8Array,
  sx: number,
  sz: number,
  gx: number,
  gz: number,
): { x: number; z: number }[] | null {
  const sCell = worldToCell(sx, sz);
  const gCell = worldToCell(gx, gz);
  const start = nearestFree(blocked, sCell.c, sCell.r);
  const goal = nearestFree(blocked, gCell.c, gCell.r);
  if (blocked[start] || blocked[goal]) return null;
  if (start === goal) {
    const p = cellCenter(goal % NAV.cols, (goal / NAV.cols) | 0);
    return [p];
  }

  const gc = goal % NAV.cols;
  const gr = (goal / NAV.cols) | 0;
  const gScore = new Float32Array(blocked.length);
  gScore.fill(1e9);
  gScore[start] = 0;
  const came = new Int32Array(blocked.length);
  came.fill(-1);
  const open = new Uint8Array(blocked.length);
  const heap: Open[] = [];
  heapPush(heap, { i: start, f: 0 });
  open[start] = 1;
  let expansions = 0;

  while (heap.length && expansions < 2500) {
    const cur = heapPop(heap);
    if (!cur) break;
    expansions++;
    if (cur.i === goal) break;
    if (!open[cur.i]) continue;
    open[cur.i] = 0;
    const c = cur.i % NAV.cols;
    const r = (cur.i / NAV.cols) | 0;
    for (const [dc, dr, cost] of DIRS) {
      const nc = c + dc;
      const nr = r + dr;
      if (nc < 0 || nr < 0 || nc >= NAV.cols || nr >= NAV.rows) continue;
      if (dc !== 0 && dr !== 0) {
        if (blocked[cellIndex(c + dc, r)] || blocked[cellIndex(c, r + dr)]) continue;
      }
      const ni = cellIndex(nc, nr);
      if (blocked[ni]) continue;
      const ng = gScore[cur.i]! + cost;
      if (ng >= gScore[ni]!) continue;
      gScore[ni] = ng;
      came[ni] = cur.i;
      const dx = Math.abs(nc - gc);
      const dy = Math.abs(nr - gr);
      const h = Math.max(dx, dy) + 0.414 * Math.min(dx, dy);
      heapPush(heap, { i: ni, f: ng + h });
      open[ni] = 1;
    }
  }

  if (came[goal] === -1 && goal !== start) return null;
  const chain: number[] = [];
  let cur = goal;
  chain.push(cur);
  let guard = 0;
  while (cur !== start && guard++ < 500) {
    const prev = came[cur];
    if (prev === undefined || prev < 0) break;
    cur = prev;
    chain.push(cur);
  }
  chain.reverse();

  const smooth: number[] = [];
  let anchor = 0;
  smooth.push(chain[0]!);
  for (let i = 1; i < chain.length; i++) {
    const last = smooth[smooth.length - 1]!;
    if (!lineFree(blocked, last, chain[i]!)) {
      const mid = chain[i - 1]!;
      if (mid !== last) smooth.push(mid);
      anchor = i - 1;
    }
    void anchor;
  }
  const end = chain[chain.length - 1]!;
  if (smooth[smooth.length - 1] !== end) smooth.push(end);

  return smooth.map((i) => cellCenter(i % NAV.cols, (i / NAV.cols) | 0));
}
