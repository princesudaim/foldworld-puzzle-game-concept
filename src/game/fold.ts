import type { Crease, Grid, Items, Npc, Pos, Tile, TileType } from './types';

/* ------------------------------------------------------------------ *
 *  Tile rules
 * ------------------------------------------------------------------ */

export const isHazard = (t: TileType) => t === 'water' || t === 'fire' || t === 'gap';
export const isItem = (t: TileType) => t === 'key' || t === 'costume';

export function passable(t: Tile, items: Items): boolean {
  switch (t.t) {
    case 'wall':
    case 'water':
    case 'fire':
    case 'gap':
    case 'void':
      return false;
    case 'guard':
      return items.costume;
    case 'door':
      return items.key;
    default:
      return true;
  }
}

export function tileName(t: TileType): string {
  switch (t) {
    case 'grass':
      return 'paper ground';
    case 'wall':
      return 'rock';
    case 'water':
      return 'water';
    case 'fire':
      return 'fire';
    case 'gap':
      return 'a hole';
    case 'bridge':
      return 'a bridge';
    case 'slab':
      return 'a stone slab';
    case 'goal':
      return 'the gate';
    case 'start':
      return 'the start';
    case 'key':
      return 'a key';
    case 'door':
      return 'a locked door';
    case 'opendoor':
      return 'an open door';
    case 'costume':
      return 'a costume';
    case 'guard':
      return 'a guard';
    case 'friendly':
      return 'a friendly guard';
    case 'void':
      return 'blank paper';
    default:
      return 'ash';
  }
}

/** base = tile already on the table, over = tile folded on top of it. */
export function mergeTile(base: Tile, over: Tile): Tile {
  const ink = !!(base.ink || over.ink);

  // blank paper never changes anything, and nothing lands on blank paper
  if (over.t === 'void') return { ...base };
  if (base.t === 'void') return { ...over };

  // the exit gate is inked into the map: it never moves and never gets buried
  if (base.t === 'goal' || over.t === 'goal') return { t: 'goal', ink };

  // rock crushes everything
  if (over.t === 'wall' || base.t === 'wall') return { t: 'wall', ink: base.ink };

  // spanning structures
  if (over.t === 'bridge' && (base.t === 'water' || base.t === 'gap')) return { t: 'bridge', ink };
  if (over.t === 'slab' && (base.t === 'gap' || base.t === 'fire')) return { t: 'slab', ink };

  // elemental cancellation
  if ((over.t === 'water' && base.t === 'fire') || (over.t === 'fire' && base.t === 'water'))
    return { t: 'ash', ink };

  // people & locks
  if (over.t === 'costume' && base.t === 'guard') return { t: 'friendly', ink };
  if (over.t === 'key' && base.t === 'door') return { t: 'opendoor', ink };

  // hazards swallow whatever they land on
  if (isHazard(over.t)) return { t: over.t, ink: over.ink };
  // ... and paper folded over a hazard sinks / burns / tears
  if (isHazard(base.t)) return { t: base.t, ink: base.ink };

  // guards and doors are not buried by plain paper
  if (base.t === 'guard') return { t: 'guard', ink: base.ink };
  if (base.t === 'door') return { t: 'door', ink: base.ink };
  // items lying on the table are not buried either
  if (isItem(base.t) && !isItem(over.t)) return { ...base };

  return { ...over, ink };
}

/* ------------------------------------------------------------------ *
 *  Crease geometry
 * ------------------------------------------------------------------ */

export interface Geo {
  mirror: (x: number, y: number) => Pos;
  onFlap: (x: number, y: number) => boolean; // inside grid + on the lifted half
  polygon: { x: number; y: number }[]; // px polygon of the lifted half
  origin: { x: number; y: number }; // px point on the crease (rotation origin)
  axis3d: [number, number, number];
  labelA: string;
  labelB: string;
}

function clipHalfPlane(
  poly: { x: number; y: number }[],
  p: { x: number; y: number },
  n: { x: number; y: number },
) {
  const out: { x: number; y: number }[] = [];
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i];
    const b = poly[(i + 1) % poly.length];
    const da = (a.x - p.x) * n.x + (a.y - p.y) * n.y;
    const db = (b.x - p.x) * n.x + (b.y - p.y) * n.y;
    if (da >= 0) out.push(a);
    if (da >= 0 !== db >= 0) {
      const t = da / (da - db);
      out.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
    }
  }
  return out;
}

export function creaseGeometry(c: Crease, W: number, H: number, cell: number): Geo {
  const inside = (x: number, y: number) => x >= 0 && y >= 0 && x < W && y < H;

  let mirror: (x: number, y: number) => Pos;
  let point: { x: number; y: number }; // px
  let normal: { x: number; y: number }; // points toward B
  let axis3d: [number, number, number];
  let labelA: string;
  let labelB: string;

  switch (c.axis) {
    case 'v':
      mirror = (x, y) => ({ x: 2 * c.k - x - 1, y });
      point = { x: c.k * cell, y: 0 };
      normal = { x: 1, y: 0 };
      axis3d = [0, 1, 0];
      labelA = 'left';
      labelB = 'right';
      break;
    case 'h':
      mirror = (x, y) => ({ x, y: 2 * c.k - y - 1 });
      point = { x: 0, y: c.k * cell };
      normal = { x: 0, y: 1 };
      axis3d = [1, 0, 0];
      labelA = 'top';
      labelB = 'bottom';
      break;
    case 'd1':
      mirror = (x, y) => ({ x: c.k + y, y: x - c.k });
      point = { x: c.k * cell, y: 0 };
      normal = { x: 1, y: -1 };
      axis3d = [1, 1, 0];
      labelA = 'upper-left';
      labelB = 'lower-right';
      break;
    default:
      mirror = (x, y) => ({ x: c.k - y, y: c.k - x });
      point = { x: c.k * cell, y: 0 };
      normal = { x: 1, y: 1 };
      axis3d = [1, -1, 0];
      labelA = 'upper-right';
      labelB = 'lower-left';
      break;
  }

  const n = Math.hypot(normal.x, normal.y) || 1;
  const nn = { x: normal.x / n, y: normal.y / n };
  const rect = [
    { x: 0, y: 0 },
    { x: W * cell, y: 0 },
    { x: W * cell, y: H * cell },
    { x: 0, y: H * cell },
  ];
  const towards = c.flap === 1 ? nn : { x: -nn.x, y: -nn.y };
  const polygon = clipHalfPlane(rect, point, towards);

  return {
    mirror,
    onFlap: (x, y) => {
      if (!inside(x, y)) return false;
      if (c.axis === 'v') return c.flap === 0 ? x + 0.5 < c.k : x + 0.5 > c.k;
      if (c.axis === 'h') return c.flap === 0 ? y + 0.5 < c.k : y + 0.5 > c.k;
      if (c.axis === 'd1') return c.flap === 0 ? x - y < c.k : x - y > c.k;
      return c.flap === 0 ? x + y < c.k : x + y > c.k;
    },
    polygon,
    origin: point,
    axis3d,
    labelA,
    labelB,
  };
}

/* ------------------------------------------------------------------ *
 *  Folding
 * ------------------------------------------------------------------ */

export interface FoldOutcome {
  grid: Grid;
  player: Pos;
  npcs: Npc[];
  notes: string[];
  playerMoved: boolean;
}

export function findGoal(grid: Grid): Pos | null {
  for (let y = 0; y < grid.length; y++)
    for (let x = 0; x < grid[y].length; x++) if (grid[y][x].t === 'goal') return { x, y };
  return null;
}

export function computeFold(
  grid: Grid,
  crease: Crease,
  player: Pos,
  npcs: Npc[],
  items: Items,
): { error?: string; result?: FoldOutcome } {
  const H = grid.length;
  const W = grid[0].length;
  const geo = creaseGeometry(crease, W, H, 1);
  const inside = (x: number, y: number) => x >= 0 && y >= 0 && x < W && y < H;
  const notes: string[] = [];

  const goal = findGoal(grid);
  if (goal && geo.onFlap(goal.x, goal.y))
    return { error: 'The gate is inked into the map — it cannot be folded off the table.' };

  // where does the wanderer land?
  let np = { ...player };
  let playerMoved = false;
  if (geo.onFlap(player.x, player.y)) {
    const m = geo.mirror(player.x, player.y);
    if (!inside(m.x, m.y)) return { error: 'You would fold clean off the edge of the world.' };
    const land = mergeTile(grid[m.y][m.x], grid[player.y][player.x]);
    if (!passable(land, items)) {
      if (land.t === 'wall') return { error: 'You would be folded straight into solid rock.' };
      return { error: `You would land in ${tileName(land.t)} — that would end badly.` };
    }
    np = m;
    playerMoved = true;
  }

  // new grid
  const ng: Grid = grid.map((row) => row.map((t) => ({ ...t })));
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (geo.onFlap(x, y)) {
        const t = grid[y][x];
        // memory ink stays behind
        ng[y][x] = t.ink ? { ...t } : { t: 'void' };
      } else {
        const m = geo.mirror(x, y);
        if (inside(m.x, m.y) && geo.onFlap(m.x, m.y)) {
          const before = grid[y][x].t;
          const after = mergeTile(grid[y][x], grid[m.y][m.x]);
          ng[y][x] = after;
          if (before !== after.t) {
            if (after.t === 'bridge' && (before === 'water' || before === 'gap'))
              notes.push('A bridge now spans the way.');
            else if (after.t === 'slab' && (before === 'gap' || before === 'fire'))
              notes.push('A slab now covers the way.');
            else if (after.t === 'ash') notes.push('Water met fire and left only ash.');
            else if (after.t === 'friendly') notes.push('The guard put on a costume and waved you through.');
            else if (after.t === 'opendoor') notes.push('A key turned in a lock.');
          }
        }
      }
    }
  }

  // people ride the paper
  const newNpcs: Npc[] = [];
  for (const n of npcs) {
    const cur = n.cells[n.i];
    let cells = n.cells.map((c) => ({ ...c }));
    let i = n.i;
    if (geo.onFlap(cur.x, cur.y)) {
      const m = geo.mirror(cur.x, cur.y);
      if (!inside(m.x, m.y)) {
        notes.push('Someone was folded off the map entirely.');
        continue;
      }
      cells = cells.map((c) => {
        const mm = geo.mirror(c.x, c.y);
        return inside(mm.x, mm.y) ? mm : { ...m };
      });
      i = Math.min(n.i, cells.length - 1);
      if (!passable(ng[m.y][m.x], { key: true, costume: true })) {
        notes.push('A guard was swept away by the fold.');
        continue;
      }
      if (ng[m.y][m.x].t === 'costume') {
        notes.push('A guard found a costume and forgot all about you.');
        continue;
      }
    }
    newNpcs.push({ ...n, cells, i });
  }

  for (const n of newNpcs) {
    const c = n.cells[n.i];
    if (n.type !== 'cat' && c.x === np.x && c.y === np.y && !items.costume)
      return { error: 'You would land right on top of a guard.' };
  }

  return { result: { grid: ng, player: np, npcs: newNpcs, notes, playerMoved } };
}

/** Ghost preview of what a crease would do (no validation). */
export interface Ghost {
  x: number;
  y: number;
  tile: Tile;
  before: TileType;
  player: boolean;
}

export function previewFold(grid: Grid, crease: Crease, player: Pos, npcs: Npc[]): Ghost[] {
  const H = grid.length;
  const W = grid[0].length;
  const geo = creaseGeometry(crease, W, H, 1);
  const inside = (x: number, y: number) => x >= 0 && y >= 0 && x < W && y < H;
  const out: Ghost[] = [];
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (geo.onFlap(x, y)) continue;
      const m = geo.mirror(x, y);
      if (!inside(m.x, m.y) || !geo.onFlap(m.x, m.y)) continue;
      const t = mergeTile(grid[y][x], grid[m.y][m.x]);
      out.push({ x, y, tile: t, before: grid[y][x].t, player: false });
    }
  }
  if (geo.onFlap(player.x, player.y)) {
    const m = geo.mirror(player.x, player.y);
    if (inside(m.x, m.y)) {
      const g = out.find((o) => o.x === m.x && o.y === m.y);
      if (g) g.player = true;
      else out.push({ x: m.x, y: m.y, tile: grid[m.y][m.x], before: grid[m.y][m.x].t, player: true });
    }
  }
  for (const n of npcs) {
    const cur = n.cells[n.i];
    if (!geo.onFlap(cur.x, cur.y)) continue;
    const m = geo.mirror(cur.x, cur.y);
    if (!inside(m.x, m.y)) continue;
    const g = out.find((o) => o.x === m.x && o.y === m.y);
    if (g) g.player = true;
  }
  return out;
}
