import type { Axis, Grid, Level, LevelNpc, Npc, Pos, Tile, TileType } from './types';

const CHARS: Record<string, { t: TileType; ink?: boolean }> = {
  '.': { t: 'grass' },
  '*': { t: 'ash' },
  '#': { t: 'wall' },
  '~': { t: 'water' },
  f: { t: 'fire' },
  o: { t: 'gap' },
  '=': { t: 'bridge' },
  m: { t: 'slab' },
  S: { t: 'grass' },
  G: { t: 'goal' },
  D: { t: 'door' },
  K: { t: 'key' },
  C: { t: 'costume' },
  U: { t: 'guard' },
  ' ': { t: 'void' },
  // memory-ink versions
  i: { t: 'grass', ink: true },
  j: { t: 'bridge', ink: true },
  n: { t: 'slab', ink: true },
  w: { t: 'water', ink: true },
  '2': { t: 'key', ink: true },
  '3': { t: 'costume', ink: true },
  '4': { t: 'water', ink: true },
};

export interface ParsedLevel {
  grid: Grid;
  player: Pos;
  npcs: Npc[];
  W: number;
  H: number;
}

export function parseLevel(l: Level): ParsedLevel {
  const H = l.rows.length;
  const W = Math.max(...l.rows.map((r) => r.length));
  const grid: Grid = [];
  let player: Pos = { x: 0, y: 0 };
  for (let y = 0; y < H; y++) {
    const row: Tile[] = [];
    for (let x = 0; x < W; x++) {
      const ch = l.rows[y][x] ?? ' ';
      const def = CHARS[ch] ?? { t: 'grass' as TileType };
      row.push({ t: def.t, ink: def.ink });
      if (ch === 'S') player = { x, y };
    }
    grid.push(row);
  }
  const npcs: Npc[] = (l.npcs ?? []).map((n: LevelNpc, i) => ({
    id: i + 1,
    type: n.type,
    cells: n.cells.map((c) => ({ ...c })),
    i: 0,
    dir: 1,
  }));
  return { grid, player, npcs, W, H };
}

export const CHAPTERS: Record<number, { name: string; tagline: string; rule: string }> = {
  1: {
    name: 'Chapter One — Flat Country',
    tagline: 'The world is a sheet of paper. You do not walk it; you fold it.',
    rule: 'Draw a crease and fold one half of the map over the other. Tiles that overlap merge: a bridge spans water and holes, a stone slab spans holes and fire, water douses fire. The gate is inked into the map, so it can never be folded away — keep it on the half that stays.',
  },
  2: {
    name: 'Chapter Two — Streets & Strangers',
    tagline: 'Diagonal creases, patrol guards, and a cat named Miso.',
    rule: 'NEW: diagonal creases, walking people. Patrol guards block you unless you carry a costume. Chasers hunt you — keep moving. Miso the cat follows your footsteps and must end up beside the gate. Folding carries people too: fold a guard into water and he is gone.',
  },
  3: {
    name: 'Chapter Three — Memory Ink',
    tagline: 'Some tiles refuse to leave.',
    rule: 'NEW: memory ink. Tiles marked with ink stay behind when you fold, leaving a copy of themselves on whatever they land on. One ink bridge can become two bridges — if you crease in the right places.',
  },
  4: {
    name: 'Bonus Pack — Extra Creases',
    tagline: 'For the stubborn.',
    rule: 'No new rules. Just harder folds. One crease can deliver many tiles at once — and a single ink tile can be relayed across the whole map.',
  },
};

export const LEVELS: Level[] = [
  /* ---------------------------- CHAPTER 1 ---------------------------- */
  {
    id: 1,
    name: 'First Crease',
    chapter: 1,
    brief: 'Cross the river and reach the gate.',
    hint: 'The bridge is on the far side of the river. Fold the right half of the map leftwards so the bridge lands on the water.',
    rows: ['S..~.....', '...~.....', '...~G....', '...~..=..', '...~.....'],
    axes: ['v', 'h'],
  },
  {
    id: 2,
    name: 'Lift',
    chapter: 1,
    brief: 'The river has no bridge at all.',
    hint: 'You are standing on the half that gets lifted. Fold the bottom half upward and let the paper carry you across.',
    rows: ['..G......', '~~~~~~~~~', '.........', '....S....', '.........'],
    axes: ['v', 'h'],
  },
  {
    id: 3,
    name: 'Ash',
    chapter: 1,
    brief: 'A wall of fire, and one bucket of water.',
    hint: 'Water folded onto fire leaves walkable ash. Line the water up with the fire, in the same row.',
    rows: ['S...f....', '....f~~..', '....fG~~.', '....f~~..', '....f....'],
    axes: ['v', 'h'],
  },
  {
    id: 4,
    name: 'The Chasm',
    chapter: 1,
    brief: 'A hole torn in the map, and a stone slab nearby.',
    hint: 'Stone slabs span holes and fire, but they sink in water. Fold the slab onto the hole.',
    rows: ['S..o.~...', '...o.~...', '...oG~m..', '...o.~...', '...o.~...'],
    axes: ['v', 'h'],
  },
  {
    id: 5,
    name: 'Masquerade',
    chapter: 1,
    brief: 'A guard blocks the only gate in the wall.',
    hint: 'Paper folded over a guard does not remove him. Fold the costume tile right on top of the guard.',
    rows: ['S...#....', '....#....', '###U.G..C', '....#....', '....#....'],
    axes: ['v', 'h'],
  },
  {
    id: 6,
    name: 'The Locked Gate',
    chapter: 1,
    brief: 'A river, a key and a locked door — in that order.',
    hint: 'One fold: bring the bridge over the river. Then walk: you will pick up the key on the way to the door.',
    rows: ['....~.#.....', '....~.#.....', 'S...~.DG...=', '....~K#.....', '....~.#.....'],
    axes: ['v', 'h'],
  },
  {
    id: 7,
    name: 'The Envelope',
    chapter: 1,
    brief: 'The gate is sealed inside solid rock. No door. No bridge.',
    hint: 'Rock cannot be folded away — but you can be folded into the room. Two creases: one to move you into line, one to drop you in.',
    rows: [
      '#########',
      '#.......#',
      '#..###..#',
      '#..#G#..#',
      '#..###..#',
      '#.......#',
      '#S......#',
    ],
    axes: ['v', 'h'],
  },

  /* ---------------------------- CHAPTER 2 ---------------------------- */
  {
    id: 8,
    name: 'Corner Crease',
    chapter: 2,
    brief: 'Diagonal creases are now allowed. Cross the river.',
    hint: 'A diagonal fold moves you sideways AND up. Crease from upper-left to lower-right so you land on the far bank.',
    rows: [
      '....~....',
      '....~....',
      '....~....',
      '....~....',
      '....~....',
      '....~....',
      '....~....',
      '....~....',
      'S...~###G',
    ],
    axes: ['v', 'h', 'd1'],
  },
  {
    id: 9,
    name: 'Cross Fold',
    chapter: 2,
    brief: 'A river runs corner to corner. Fold against it.',
    hint: 'Only an anti-diagonal crease can carry you across that river. Fold the lower-right half up and over.',
    rows: [
      '........~',
      '.......~.',
      '......~..',
      '.....~...',
      '....~....',
      '...~.....',
      '..~......',
      '.~.......',
      '~.......S',
    ],
    axes: ['h', 'v', 'd2'],
  },
  {
    id: 10,
    name: 'Miso',
    chapter: 2,
    brief: 'Escort the cat. She follows your footsteps.',
    hint: 'Cross the river with the bridge, pick up the costume on the way, and the patrolling guard will let you both past.',
    rows: ['...~.....', '..C~..=..', 'S..~G....', '...~.....', '...~.....'],
    axes: ['v', 'h'],
    npcs: [
      { type: 'cat', cells: [{ x: 1, y: 2 }] },
      { type: 'patrol', cells: [{ x: 4, y: 1 }, { x: 4, y: 0 }] },
    ],
  },
  {
    id: 11,
    name: 'The Inspector',
    chapter: 2,
    brief: 'An inspector is hunting you. Keep moving.',
    hint: 'The inspector cannot be reasoned with — but he walks exactly as fast as you. Span the hole and do not stop.',
    rows: ['S..o.....', '...o.....', '...oG..m.', '...o.....', '...o.....'],
    axes: ['v', 'h'],
    npcs: [{ type: 'chaser', cells: [{ x: 1, y: 0 }] }],
  },
  {
    id: 12,
    name: 'Four Quarters',
    chapter: 2,
    brief: 'Rock divides the map into four. You are south-west; the gate is north-east.',
    hint: 'Two creases will do it. One crease will also do it, if you can find the diagonal that lands you exactly on the gate.',
    rows: [
      '....#....',
      '....#....',
      '....#....',
      '....#....',
      '#########',
      '....#....',
      '....#....',
      '....#....',
      'S...#...G',
    ],
    axes: ['v', 'h', 'd1', 'd2'],
  },
  {
    id: 13,
    name: 'Convergence',
    chapter: 2,
    brief: 'A river runs corner to corner and the bridge is on the wrong side of it.',
    hint: 'You must stay on the half that does not move. Fold the upper-left half over so the bridge lands on the river.',
    rows: [
      '..=.....~',
      '.......~.',
      '......~..',
      '...S.~...',
      '....~....',
      '...~.....',
      '..~......',
      '.~......G',
      '~........',
    ],
    axes: ['v', 'h', 'd1', 'd2'],
  },

  /* ---------------------------- CHAPTER 3 ---------------------------- */
  {
    id: 14,
    name: 'Memory Ink',
    chapter: 3,
    brief: 'Two rivers. One ink-stained bridge.',
    hint: 'Ink stays behind when folded. Fold the ink bridge onto the first river — the original stays put — then crease again to send it to the second river.',
    rows: [
      '...~.~......',
      'S..~.~....j.',
      '...~.~......',
      '...~.~G.....',
      '...~.~......',
    ],
    axes: ['v', 'h'],
  },
  {
    id: 15,
    name: 'Ink & Iron',
    chapter: 3,
    brief: 'Two locked doors. One ink-stained key.',
    hint: 'Send the ink key to the first door, then crease further right to send it to the second door. The key never runs out.',
    rows: [
      '...#.#.#....',
      '...#.#.#....',
      'S..D.DG#..2.',
      '...#.#.#....',
      '...#.#.#....',
    ],
    axes: ['v', 'h'],
  },
  {
    id: 16,
    name: 'Twin Gates',
    chapter: 3,
    brief: 'Two guards, one ink-stained costume.',
    hint: 'A costume folded onto a guard turns him friendly. The ink costume can be delivered twice.',
    rows: [
      '...#.#......',
      'S..U.UG...3.',
      '...#.#......',
      '...#.#......',
      '...#.#......',
    ],
    axes: ['v', 'h'],
  },
  {
    id: 17,
    name: 'The Last Fold',
    chapter: 3,
    brief: 'Two diagonal rivers, one ink-stained bridge.',
    hint: 'Crease diagonally to drop the bridge on the first river — the paper carries you along, and the ink bridge stays behind for the second crease.',
    rows: [
      '....~...G',
      '.....~...',
      '......~..',
      '.......~.',
      '~.......~',
      '.~.......',
      '..~......',
      '...~.....',
      'jS.~.....',
    ],
    axes: ['v', 'h', 'd1', 'd2'],
  },

  /* ---------------------------- BONUS ---------------------------- */
  {
    id: 18,
    name: 'Bonus: The Vault',
    chapter: 4,
    brief: 'A sealed stone vault, ringed by water.',
    hint: 'Walk the outer rim until you stand exactly opposite the gate, then fold yourself inside.',
    rows: [
      '.........',
      '.........',
      '..~~~~~..',
      '..~###~..',
      '..~#G#~..',
      '..~###~..',
      '..~~~~~..',
      '.........',
      'S........',
    ],
    axes: ['v', 'h', 'd1', 'd2'],
  },
  {
    id: 19,
    name: 'Bonus: Long Crease',
    chapter: 4,
    brief: 'A river and a fire, side by side.',
    hint: 'One crease delivers every tile it passes. Find the single fold that drops the bridge on the river AND the water on the fire.',
    rows: [
      '...~.~......',
      'S..~.~..~.=.',
      '...~.~......',
      '...~.~G.....',
      '...~.~......',
    ],
    axes: ['v', 'h'],
  },
  {
    id: 20,
    name: 'Bonus: Chaperone',
    chapter: 4,
    brief: 'Miso must come home too — and a guard patrols the far bank.',
    hint: 'Grab the costume, span the river, and let the cat trail you through the gate.',
    rows: [
      '....~....',
      '.C..~....',
      '....~..=.',
      'S...~.G..',
      '....~....',
      '....~....',
      '....~....',
    ],
    axes: ['v', 'h'],
    npcs: [
      { type: 'cat', cells: [{ x: 1, y: 3 }] },
      { type: 'patrol', cells: [{ x: 5, y: 2 }, { x: 5, y: 1 }] },
    ],
  },
  {
    id: 21,
    name: 'Bonus: Ink Cascade',
    chapter: 4,
    brief: 'River, fire, river — with one ink bridge and one ink puddle.',
    hint: 'First crease: bridge to the river and water to the fire at the same time. Second crease: relay the ink bridge to the last river.',
    rows: [
      '...~f~......',
      'S..~f~...4j.',
      '...~f~......',
      '...~f~G.....',
      '...~f~......',
    ],
    axes: ['v', 'h'],
  },
];

export const AXES: { id: Axis; label: string; glyph: string; title: string }[] = [
  { id: 'v', label: '|', glyph: '┃', title: 'Vertical crease' },
  { id: 'h', label: '—', glyph: '━', title: 'Horizontal crease' },
  { id: 'd1', label: '\\', glyph: '◣', title: 'Diagonal crease ╲' },
  { id: 'd2', label: '/', glyph: '◤', title: 'Diagonal crease ╱' },
];
