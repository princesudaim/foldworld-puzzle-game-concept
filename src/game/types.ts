export type TileType =
  | 'grass'
  | 'wall'
  | 'water'
  | 'fire'
  | 'gap'
  | 'bridge'
  | 'slab'
  | 'ash'
  | 'goal'
  | 'start'
  | 'key'
  | 'door'
  | 'opendoor'
  | 'costume'
  | 'guard'
  | 'friendly'
  | 'void';

export interface Tile {
  t: TileType;
  ink?: boolean;
}

export type Grid = Tile[][]; // grid[y][x]

export interface Pos {
  x: number;
  y: number;
}

export interface Items {
  key: boolean;
  costume: boolean;
}

/** Fold axis. v = vertical crease at column boundary k, h = horizontal at row boundary k,
 *  d1 = main diagonal through cell centres where x-y === k, d2 = anti diagonal where x+y === k */
export type Axis = 'v' | 'h' | 'd1' | 'd2';

/** Which half of the paper is lifted. 0 = "A" side, 1 = "B" side. */
export type Flap = 0 | 1;

export interface Crease {
  axis: Axis;
  k: number;
  flap: Flap;
}

export type NpcType = 'patrol' | 'chaser' | 'cat';

export interface Npc {
  id: number;
  type: NpcType;
  cells: Pos[]; // patrol route (single cell = stands still)
  i: number;
  dir: 1 | -1;
}

export interface LevelNpc {
  type: NpcType;
  cells: Pos[];
}

export type Chapter = 1 | 2 | 3 | 4;

export interface Level {
  id: number;
  name: string;
  chapter: Chapter;
  brief: string;
  hint: string;
  rows: string[];
  axes?: Axis[];
  npcs?: LevelNpc[];
}
