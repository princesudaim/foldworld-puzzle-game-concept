import type { Grid, Items, Npc, Pos, Tile, TileType } from './types';
import { passable, tileName } from './fold';

export interface WalkPlan {
  path: Pos[];
  items: Items;
  reachedGoal: boolean;
  message: string;
}

const key = (x: number, y: number, k: number, c: number) => `${x},${y},${k},${c}`;

export function occupiedByGuard(npcs: Npc[], x: number, y: number) {
  return npcs.some(
    (n) => n.type !== 'cat' && n.cells[n.i].x === x && n.cells[n.i].y === y,
  );
}

function blocked(grid: Grid, x: number, y: number, items: Items, npcs: Npc[]) {
  const H = grid.length;
  const W = grid[0].length;
  if (x < 0 || y < 0 || x >= W || y >= H) return true;
  if (!passable(grid[y][x], items)) return true;
  if (occupiedByGuard(npcs, x, y) && !items.costume) return true;
  return false;
}

/** Breadth-first search over position + carried items. */
export function planWalk(
  grid: Grid,
  start: Pos,
  items: Items,
  npcs: Npc[],
  goal: Pos | null,
): WalkPlan {
  const H = grid.length;
  const W = grid[0].length;
  const startKey = key(start.x, start.y, items.key ? 1 : 0, items.costume ? 1 : 0);
  const prev = new Map<string, string | null>();
  const seen = new Set<string>([startKey]);
  prev.set(startKey, null);
  const queue: string[] = [startKey];
  let goalHit: string | null = null;

  const decode = (s: string) => {
    const [x, y, k, c] = s.split(',').map(Number);
    return { x, y, key: !!k, costume: !!c };
  };

  let qi = 0;
  while (qi < queue.length && !goalHit) {
    const cur = queue[qi++];
    const s = decode(cur);
    const it: Items = { key: s.key, costume: s.costume };
    const dirs = [
      { x: 1, y: 0 },
      { x: -1, y: 0 },
      { x: 0, y: 1 },
      { x: 0, y: -1 },
    ];
    for (const d of dirs) {
      const nx = s.x + d.x;
      const ny = s.y + d.y;
      if (blocked(grid, nx, ny, it, npcs)) continue;
      const tile = grid[ny][nx];
      const nit: Items = {
        key: it.key || tile.t === 'key',
        costume: it.costume || tile.t === 'costume',
      };
      const nk = key(nx, ny, nit.key ? 1 : 0, nit.costume ? 1 : 0);
      if (seen.has(nk)) continue;
      seen.add(nk);
      prev.set(nk, cur);
      queue.push(nk);
      if (tile.t === 'goal') {
        goalHit = nk;
        break;
      }
    }
  }

  const build = (end: string) => {
    const path: Pos[] = [];
    let cur: string | null = end;
    while (cur && cur !== startKey) {
      const s = decode(cur);
      path.push({ x: s.x, y: s.y });
      cur = prev.get(cur) ?? null;
    }
    return path.reverse();
  };

  if (goalHit) {
    const p = build(goalHit);
    const last = decode(goalHit);
    return {
      path: p,
      items: { key: last.key, costume: last.costume },
      reachedGoal: true,
      message: '',
    };
  }

  // no route: walk as far as makes sense and explain the problem
  let best = startKey;
  let bestScore = Infinity;
  for (const s of queue) {
    const d = decode(s);
    if (!goal) continue;
    const dist = Math.abs(d.x - goal.x) + Math.abs(d.y - goal.y);
    const order = queue.indexOf(s);
    const score = dist * 100 + order;
    if (score < bestScore) {
      bestScore = score;
      best = s;
    }
  }
  const path = build(best);
  const endState = decode(best);
  const endItems: Items = { key: endState.key, costume: endState.costume };

  let reason = 'There is no way forward.';
  if (goal) {
    const dirs = [
      { x: 1, y: 0 },
      { x: -1, y: 0 },
      { x: 0, y: 1 },
      { x: 0, y: -1 },
    ];
    let bestDist = Infinity;
    let culprit: Tile | null = null;
    let culpritIsNpc = false;
    for (const d of dirs) {
      const nx = endState.x + d.x;
      const ny = endState.y + d.y;
      if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
      const dist = Math.abs(nx - goal.x) + Math.abs(ny - goal.y);
      if (dist >= bestDist) continue;
      if (occupiedByGuard(npcs, nx, ny) && !endItems.costume) {
        bestDist = dist;
        culprit = grid[ny][nx];
        culpritIsNpc = true;
        continue;
      }
      if (!passable(grid[ny][nx], endItems)) {
        bestDist = dist;
        culprit = grid[ny][nx];
        culpritIsNpc = false;
      }
    }
    if (culprit) {
      const t = culprit.t;
      if (culpritIsNpc || t === 'guard') {
        reason = 'A guard blocks the way. You need a costume — or a new street.';
      } else if (t === 'water') reason = 'The river blocks the way. Fold a bridge over it.';
      else if (t === 'fire') reason = 'Fire blocks the way. Fold water or a stone slab onto it.';
      else if (t === 'gap') reason = 'A hole in the map. Fold a bridge or slab across it.';
      else if (t === 'wall') reason = 'Solid rock. Paper cannot fold rock away.';
      else if (t === 'door') reason = 'A locked door. Find a key, or fold one onto the lock.';
      else if (t === 'void') reason = 'The map ends here — that part was folded away.';
      else reason = `${tileName(t)} blocks the way.`;
    }
  }

  return { path, items: endItems, reachedGoal: false, message: reason };
}

/* ------------------------------------------------------------------ *
 *  One step of the journey (moves people, picks things up)
 * ------------------------------------------------------------------ */

export interface StepResult {
  grid: Grid;
  player: Pos;
  npcs: Npc[];
  items: Items;
  events: string[];
  caught: boolean;
  won: boolean;
}

export function stepOnce(
  grid: Grid,
  player: Pos,
  npcs: Npc[],
  items: Items,
  target: Pos,
): StepResult {
  const events: string[] = [];
  let g = grid.map((r) => r.map((t) => ({ ...t })));
  let it = { ...items };
  const from = { ...player };
  let p = { ...target };

  // blocked at the last moment by a walking guard?
  if (occupiedByGuard(npcs, p.x, p.y) && !it.costume) {
    return { grid: g, player: from, npcs, items: it, events: ['A guard stepped into your path!'], caught: false, won: false };
  }

  const tile = g[p.y][p.x];
  if (tile.t === 'key') {
    it.key = true;
    g[p.y][p.x] = { t: 'grass' };
    events.push('Picked up a key.');
  } else if (tile.t === 'costume') {
    it.costume = true;
    g[p.y][p.x] = { t: 'grass' };
    events.push('Picked up a costume — guards will ignore you.');
  }
  const won = tile.t === 'goal';

  // people move after the wanderer
  let npcs2 = npcs.map((n) => ({ ...n, cells: n.cells.map((c) => ({ ...c })) }));
  let caught = false;
  for (const n of npcs2) {
    const cur = n.cells[n.i];
    if (n.type === 'cat') {
      if (cur.x === from.x && cur.y === from.y) continue;
      const free = !npcs2.some(
        (o) => o !== n && o.cells[o.i].x === from.x && o.cells[o.i].y === from.y,
      );
      if (free) {
        n.cells[n.i] = { ...from };
      }
      continue;
    }
    if (n.type === 'patrol') {
      if (n.cells.length < 2) continue;
      let ni = n.i + n.dir;
      if (ni < 0 || ni >= n.cells.length) {
        n.dir = (n.dir * -1) as 1 | -1;
        ni = n.i + n.dir;
      }
      const nx = n.cells[ni];
      const occupied =
        (nx.x === p.x && nx.y === p.y) ||
        npcs2.some((o) => o !== n && o.cells[o.i].x === nx.x && o.cells[o.i].y === nx.y);
      if (!occupied) {
        n.i = ni;
      }
      continue;
    }
    // chaser: greedy pursuit
    const options = [
      { x: 1, y: 0 },
      { x: -1, y: 0 },
      { x: 0, y: 1 },
      { x: 0, y: -1 },
    ];
    let bestD = Math.abs(cur.x - p.x) + Math.abs(cur.y - p.y);
    let bestPos: Pos | null = null;
    for (const d of options) {
      const nx = { x: cur.x + d.x, y: cur.y + d.y };
      if (nx.x < 0 || nx.y < 0 || nx.x >= g[0].length || nx.y >= g.length) continue;
      if (!passable(g[nx.y][nx.x], { key: true, costume: true })) continue;
      if (npcs2.some((o) => o !== n && o.cells[o.i].x === nx.x && o.cells[o.i].y === nx.y)) continue;
      const dd = Math.abs(nx.x - p.x) + Math.abs(nx.y - p.y);
      if (dd < bestD) {
        bestD = dd;
        bestPos = nx;
      }
    }
    if (bestPos) {
      n.cells[n.i] = bestPos;
      if (bestPos.x === p.x && bestPos.y === p.y) caught = true;
    }
  }

  return { grid: g, player: p, npcs: npcs2, items: it, events, caught, won };
}

export function catNearGoal(npcs: Npc[], goal: Pos | null): boolean {
  const cat = npcs.find((n) => n.type === 'cat');
  if (!cat || !goal) return true;
  const c = cat.cells[cat.i];
  return Math.max(Math.abs(c.x - goal.x), Math.abs(c.y - goal.y)) <= 1;
}

export type { TileType };
