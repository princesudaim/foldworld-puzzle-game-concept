import type { TileType } from '../game/types';

export interface Style {
  cls: string;
  glyph?: string;
  glyphCls?: string;
}

const S: Record<TileType, Style> = {
  grass: { cls: 'bg-[#e6dcbf]' },
  ash: { cls: 'bg-[#b9b1a4]', glyph: '·', glyphCls: 'text-[#7d7466] text-[10px]' },
  wall: { cls: 'bg-[#8d8677] shadow-[inset_0_2px_0_rgba(255,255,255,.18),inset_0_-4px_0_rgba(0,0,0,.22)]' },
  water: { cls: 'bg-[#5aa6d6]' },
  fire: { cls: 'bg-[#e0662f]', glyph: '🔥' },
  gap: { cls: 'bg-[#241f1a] shadow-[inset_0_3px_6px_rgba(0,0,0,.6)]' },
  bridge: { cls: 'bg-[#b0763a]' },
  slab: { cls: 'bg-[#c9c2b4] shadow-[inset_0_0_0_2px_rgba(0,0,0,.12)]' },
  goal: { cls: 'bg-[#f4c95d]' },
  start: { cls: 'bg-[#e6dcbf]' },
  key: { cls: 'bg-[#e6dcbf]', glyph: '🔑' },
  door: { cls: 'bg-[#8a5a2b]', glyph: '🚪' },
  opendoor: { cls: 'bg-[#c9a06a]', glyph: '🚪' },
  costume: { cls: 'bg-[#e6dcbf]', glyph: '🎭' },
  guard: { cls: 'bg-[#e6dcbf]', glyph: '💂' },
  friendly: { cls: 'bg-[#cfe3c4]', glyph: '🤝' },
  void: { cls: 'bg-[#f8f5ec]' },
};

export function tileStyle(t: TileType): Style {
  return S[t];
}

export const INK_BADGE = '✒';

/** decorative overlays drawn with pure CSS per terrain type */
export function terrainTexture(t: TileType): string | null {
  switch (t) {
    case 'grass':
      return 'radial-gradient(circle at 30% 35%, rgba(140,120,70,.22) 0 1px, transparent 1.6px), radial-gradient(circle at 70% 70%, rgba(140,120,70,.18) 0 1px, transparent 1.6px)';
    case 'water':
      return 'repeating-linear-gradient(180deg, rgba(255,255,255,.35) 0 2px, transparent 2px 6px)';
    case 'bridge':
      return 'repeating-linear-gradient(90deg, rgba(0,0,0,.18) 0 2px, transparent 2px 8px)';
    case 'slab':
      return 'linear-gradient(135deg, rgba(255,255,255,.5) 0 40%, transparent 40%)';
    case 'void':
      return 'repeating-linear-gradient(45deg, rgba(0,0,0,.035) 0 3px, transparent 3px 7px)';
    case 'gap':
      return 'radial-gradient(ellipse at 50% 45%, rgba(0,0,0,.55), transparent 70%)';
    case 'ash':
      return 'radial-gradient(circle at 40% 40%, rgba(0,0,0,.18) 0 1px, transparent 1.5px)';
    default:
      return null;
  }
}

export function GateGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="h-full w-full">
      <path
        d="M5 21V10a7 7 0 0 1 14 0v11z"
        fill="#fff8e6"
        stroke="#7a4a12"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path d="M12 21V8.5" stroke="#7a4a12" strokeWidth="1.4" />
      <circle cx="12" cy="13" r="1.6" fill="#c8102e" />
    </svg>
  );
}

export function Wanderer({ cell }: { cell: number }) {
  return (
    <svg viewBox="0 0 24 26" style={{ width: cell * 0.92, height: cell * 1.0 }}>
      <ellipse cx="12" cy="24" rx="6" ry="1.6" fill="rgba(0,0,0,.22)" />
      <path d="M5.5 24c0-4.6 2.9-7.4 6.5-7.4s6.5 2.8 6.5 7.4z" fill="#f5c451" stroke="#6b3b16" strokeWidth="1.5" />
      <circle cx="12" cy="8" r="5.2" fill="#fff6e4" stroke="#6b3b16" strokeWidth="1.5" />
      <circle cx="10.2" cy="7.6" r="1" fill="#3b2a19" />
      <circle cx="13.8" cy="7.6" r="1" fill="#3b2a19" />
      <path d="M10.6 10.4q1.4 1.2 2.8 0" stroke="#3b2a19" strokeWidth="1" fill="none" strokeLinecap="round" />
    </svg>
  );
}
