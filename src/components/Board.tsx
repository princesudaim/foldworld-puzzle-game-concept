import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { Crease, Grid, Items, Npc, Pos } from '../game/types';
import { creaseGeometry, passable, type Ghost } from '../game/fold';
import { GateGlyph, terrainTexture, tileStyle, Wanderer } from './TileView';

export interface FoldAnim {
  grid: Grid;
  crease: Crease;
  flipped: boolean;
  player: Pos;
  npcs: Npc[];
}

interface Props {
  grid: Grid;
  player: Pos;
  npcs: Npc[];
  crease: Crease | null;
  ghosts: Ghost[];
  items: Items;
  anim: FoldAnim | null;
  onPick: (x: number, y: number) => void;
}

function TileLayer({ grid, cell }: { grid: Grid; cell: number }) {
  return (
    <>
      {grid.map((row, y) =>
        row.map((t, x) => {
          const st = tileStyle(t.t);
          const tex = terrainTexture(t.t);
          return (
            <div
              key={`${x}-${y}`}
              className={`absolute rounded-[3px] ${st.cls}`}
              style={{
                left: x * cell + 1,
                top: y * cell + 1,
                width: cell - 2,
                height: cell - 2,
                backgroundImage: tex ?? undefined,
              }}
            >
              {t.ink && (
                <span className="absolute -left-0.5 -top-1 text-[10px] leading-none text-violet-700 drop-shadow">
                  ✒
                </span>
              )}
              {st.glyph && (
                <span
                  className="flex h-full w-full items-center justify-center"
                  style={{ fontSize: cell * 0.5, lineHeight: 1 }}
                >
                  {st.glyph}
                </span>
              )}
              {t.t === 'goal' && (
                <>
                  <span className="absolute inset-[12%]">
                    <GateGlyph />
                  </span>
                  <span className="fw-glow pointer-events-none absolute inset-0 rounded-[3px]" />
                </>
              )}
            </div>
          );
        }),
      )}
    </>
  );
}

function Token({
  p,
  cell,
  z,
  children,
}: {
  p: Pos;
  cell: number;
  z: number;
  children: React.ReactNode;
}) {
  return (
    <div
      className="pointer-events-none absolute left-0 top-0 flex items-end justify-center"
      style={{
        width: cell,
        height: cell,
        transform: `translate3d(${p.x * cell}px, ${p.y * cell}px, 0)`,
        zIndex: z,
      }}
    >
      {children}
    </div>
  );
}

const npcEmoji = (n: Npc) => (n.type === 'cat' ? '🐈' : n.type === 'chaser' ? '🕵️' : '💂');

export default function Board({ grid, player, npcs, crease, ghosts, items, anim, onPick }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const boardRef = useRef<HTMLDivElement>(null);
  const [avail, setAvail] = useState({ w: 760, h: 460 });
  const dragging = useRef(false);

  const H = grid.length;
  const W = grid[0].length;

  useLayoutEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const update = () =>
      setAvail({ w: el.clientWidth, h: Math.max(230, window.innerHeight - 340) });
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    window.addEventListener('resize', update);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', update);
    };
  }, []);

  const cell = Math.max(
    22,
    Math.min(56, Math.floor(Math.min((avail.w - 12) / W, (avail.h - 8) / H))),
  );

  const geo = crease ? creaseGeometry(crease, W, H, cell) : null;
  const animGeo = anim ? creaseGeometry(anim.crease, W, H, cell) : null;
  const flapOf = (p: Pos) => (animGeo ? animGeo.onFlap(p.x, p.y) : false);
  const lifted = new Set<number>();
  if (anim) for (const n of anim.npcs) if (flapOf(n.cells[n.i])) lifted.add(n.id);
  const playerLifted = !!(anim && flapOf(anim.player));

  // the crease segment is the pair of polygon vertices that lie on the crease
  let creaseSeg: [{ x: number; y: number }, { x: number; y: number }] | null = null;
  if (geo) {
    const n = Math.hypot(geo.axis3d[0], geo.axis3d[1]) || 1;
    const nx = -geo.axis3d[1] / n;
    const ny = geo.axis3d[0] / n;
    const onLine = geo.polygon.filter(
      (p) => Math.abs((p.x - geo.origin.x) * nx + (p.y - geo.origin.y) * ny) < 0.01,
    );
    if (onLine.length >= 2) creaseSeg = [onLine[0], onLine[onLine.length - 1]];
  }

  const handle = (e: React.PointerEvent) => {
    const el = boardRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    onPick(((e.clientX - r.left) / r.width) * W, ((e.clientY - r.top) / r.height) * H);
  };

  useEffect(() => {
    const up = () => (dragging.current = false);
    window.addEventListener('pointerup', up);
    return () => window.removeEventListener('pointerup', up);
  }, []);

  const playerNode = (
    <div className="fw-bob flex h-full items-end justify-center">
      <Wanderer cell={cell} />
    </div>
  );

  return (
    <div ref={wrapRef} className="flex w-full justify-center">
      <div
        ref={boardRef}
        className="relative touch-none select-none rounded-xl"
        style={{
          width: W * cell,
          height: H * cell,
          background: 'linear-gradient(160deg,#f7f0dc,#e8dcc0)',
          boxShadow:
            '0 1px 0 rgba(255,255,255,.7) inset, 0 14px 30px -12px rgba(60,40,10,.5), 0 2px 6px rgba(60,40,10,.18)',
          cursor: 'crosshair',
        }}
        onPointerDown={(e) => {
          dragging.current = true;
          handle(e);
        }}
        onPointerMove={(e) => {
          if (dragging.current) handle(e);
        }}
      >
        <div
          className="pointer-events-none absolute inset-0 rounded-xl"
          style={{
            backgroundImage:
              'linear-gradient(rgba(130,110,70,.16) 1px, transparent 1px), linear-gradient(90deg, rgba(130,110,70,.16) 1px, transparent 1px)',
            backgroundSize: `${cell}px ${cell}px`,
          }}
        />

        <div className="absolute inset-0">
          <TileLayer grid={grid} cell={cell} />
        </div>

        {/* what would land where */}
        {ghosts.map((g) => {
          const before = passable({ t: g.before }, items);
          const after = passable(g.tile, items);
          const good = !before && after;
          const bad = before && !after;
          return (
            <div
              key={`g-${g.x}-${g.y}`}
              className="pointer-events-none absolute"
              style={{
                left: g.x * cell + 1,
                top: g.y * cell + 1,
                width: cell - 2,
                height: cell - 2,
                zIndex: 12,
              }}
            >
              <div
                className={`relative h-full w-full rounded-[3px] ${tileStyle(g.tile.t).cls} ${
                  good
                    ? 'ring-2 ring-emerald-500'
                    : bad
                      ? 'ring-2 ring-rose-500'
                      : 'ring-1 ring-slate-500/50'
                }`}
                style={{ opacity: 0.75, backgroundImage: terrainTexture(g.tile.t) ?? undefined }}
              >
                {g.player && (
                  <span className="absolute inset-0 flex items-center justify-center text-[11px] font-black text-violet-700">
                    ★
                  </span>
                )}
              </div>
            </div>
          );
        })}

        {/* the half that will be lifted */}
        {geo && geo.polygon.length > 2 && !anim && (
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              zIndex: 14,
              clipPath: `polygon(${geo.polygon.map((p) => `${p.x}px ${p.y}px`).join(', ')})`,
              background: 'linear-gradient(135deg, rgba(99,102,241,.22), rgba(168,85,247,.10))',
            }}
          />
        )}

        {/* the crease */}
        {creaseSeg && !anim && (
          <svg
            className="pointer-events-none absolute inset-0"
            style={{ zIndex: 16 }}
            width={W * cell}
            height={H * cell}
          >
            <line
              x1={creaseSeg[0].x}
              y1={creaseSeg[0].y}
              x2={creaseSeg[1].x}
              y2={creaseSeg[1].y}
              stroke="rgba(255,255,255,.95)"
              strokeWidth="5"
              strokeLinecap="round"
            />
            <line
              x1={creaseSeg[0].x}
              y1={creaseSeg[0].y}
              x2={creaseSeg[1].x}
              y2={creaseSeg[1].y}
              stroke="#4c1d95"
              strokeWidth="2.5"
              strokeDasharray="9 6"
              strokeLinecap="round"
            />
          </svg>
        )}

        {/* people that stay put */}
        {npcs
          .filter((n) => !lifted.has(n.id))
          .map((n) => (
            <Token key={`npc-${n.id}`} p={n.cells[n.i]} cell={cell} z={20}>
              <span className="drop-shadow" style={{ fontSize: cell * 0.62, lineHeight: 1, paddingBottom: 2 }}>
                {npcEmoji(n)}
              </span>
            </Token>
          ))}
        {!playerLifted && (
          <Token p={player} cell={cell} z={22}>
            {playerNode}
          </Token>
        )}

        {/* the fold itself */}
        {anim && animGeo && (
          <div className="pointer-events-none absolute inset-0" style={{ zIndex: 30, perspective: 1500 }}>
            <div
              style={{
                position: 'absolute',
                inset: 0,
                clipPath: `polygon(${animGeo.polygon.map((p) => `${p.x}px ${p.y}px`).join(', ')})`,
                transformOrigin: `${animGeo.origin.x}px ${animGeo.origin.y}px`,
                transform: `rotate3d(${animGeo.axis3d[0]},${animGeo.axis3d[1]},0,${anim.flipped ? 180 : 0}deg)`,
                transition: 'transform 620ms cubic-bezier(.6,.02,.4,1)',
                filter: 'drop-shadow(0 10px 12px rgba(40,25,5,.35))',
              }}
            >
              <TileLayer grid={anim.grid} cell={cell} />
              {anim.npcs
                .filter((n) => flapOf(n.cells[n.i]))
                .map((n) => (
                  <Token key={`anpc-${n.id}`} p={n.cells[n.i]} cell={cell} z={20}>
                    <span className="drop-shadow" style={{ fontSize: cell * 0.62, lineHeight: 1, paddingBottom: 2 }}>
                      {npcEmoji(n)}
                    </span>
                  </Token>
                ))}
              {flapOf(anim.player) && (
                <Token p={anim.player} cell={cell} z={22}>
                  {playerNode}
                </Token>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
