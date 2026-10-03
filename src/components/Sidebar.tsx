import { useState } from 'react';
import type { Axis, Crease, Items, Level, TileType } from '../game/types';
import { AXES, CHAPTERS, LEVELS } from '../game/levels';
import { terrainTexture, tileStyle } from './TileView';

const LEGEND: [TileType, string][] = [
  ['grass', 'paper ground'],
  ['wall', 'rock — nothing folds it away'],
  ['water', 'water — bridges span it'],
  ['fire', 'fire — water or slab'],
  ['gap', 'hole in the map'],
  ['bridge', 'bridge — spans water & holes'],
  ['slab', 'stone slab — spans holes & fire'],
  ['goal', 'the gate (pinned)'],
  ['key', 'key → opens doors'],
  ['door', 'locked door'],
  ['costume', 'costume → guards ignore you'],
  ['guard', 'guard'],
  ['void', 'folded-away paper'],
];

function MiniTile({ t }: { t: TileType }) {
  const st = tileStyle(t);
  return (
    <span
      className={`inline-block h-4 w-4 shrink-0 rounded-[2px] ${st.cls}`}
      style={{ backgroundImage: terrainTexture(t) ?? undefined }}
    />
  );
}

const FLAP_LABEL: Record<Axis, [string, string]> = {
  v: ['Fold left half →', 'Fold right half ←'],
  h: ['Fold top half ↓', 'Fold bottom half ↑'],
  d1: ['Fold upper-left ╲', 'Fold lower-right ╲'],
  d2: ['Fold upper-right ╱', 'Fold lower-left ╱'],
};

export type Msg = { text: string; kind: 'info' | 'bad' | 'good' } | null;

interface Props {
  level: Level;
  crease: Crease;
  setCrease: (c: Crease) => void;
  onFold: () => void;
  onGo: () => void;
  onUndo: () => void;
  onReset: () => void;
  onSkip: () => void;
  canUndo: boolean;
  busy: boolean;
  items: Items;
  folds: number;
  message: Msg;
  solved: number[];
  unlocked: number;
  levelIndex: number;
  onSelectLevel: (i: number) => void;
}

function Btn({
  children,
  onClick,
  tone = 'ghost',
  disabled,
  className = '',
  title,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  tone?: 'ghost' | 'fold' | 'go' | 'warn';
  disabled?: boolean;
  className?: string;
  title?: string;
}) {
  const tones: Record<string, string> = {
    ghost:
      'bg-[#3a2f26]/80 text-amber-100/90 border-amber-900/50 hover:bg-[#4a3c30] hover:text-amber-50',
    fold:
      'bg-violet-600 text-white border-violet-400/60 hover:bg-violet-500 shadow-[0_6px_18px_-8px_rgba(139,92,246,.9)]',
    go: 'bg-amber-500 text-[#2b1c07] border-amber-300/70 hover:bg-amber-400 shadow-[0_6px_18px_-8px_rgba(245,158,11,.9)]',
    warn: 'bg-rose-900/50 text-rose-100 border-rose-700/50 hover:bg-rose-800/60',
  };
  return (
    <button
      title={title}
      disabled={disabled}
      onClick={onClick}
      className={`rounded-lg border px-3 py-2 text-sm font-semibold transition active:scale-[.97] disabled:cursor-not-allowed disabled:opacity-35 ${tones[tone]} ${className}`}
    >
      {children}
    </button>
  );
}

function Card({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-amber-900/40 bg-[#2c231d]/80 p-3 shadow-lg backdrop-blur">
      {title && (
        <div className="mb-2 text-[11px] font-bold uppercase tracking-[.18em] text-amber-500/80">
          {title}
        </div>
      )}
      {children}
    </div>
  );
}

export default function Sidebar(p: Props) {
  const [showHint, setShowHint] = useState(false);
  const [showRules, setShowRules] = useState(false);
  const [showList, setShowList] = useState(false);
  const axes = p.level.axes ?? ['v', 'h'];
  const chap = CHAPTERS[p.level.chapter];

  return (
    <div className="flex w-full flex-col gap-3 lg:w-[352px] lg:shrink-0">
      <Card>
        <div className="flex items-baseline justify-between gap-2">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-[.18em] text-violet-300/80">
              {chap.name}
            </div>
            <h2 className="text-lg font-black leading-tight text-amber-50">
              {p.level.id}. {p.level.name}
            </h2>
          </div>
          <div className="text-right text-[11px] text-amber-200/60">
            <div>creases {p.folds}</div>
            <div>
              {p.solved.length}/{LEVELS.length} solved
            </div>
          </div>
        </div>
        <p className="mt-2 text-sm leading-snug text-amber-100/70">{p.level.brief}</p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <Btn onClick={() => setShowHint((v) => !v)} className="!px-2 !py-1 !text-xs">
            {showHint ? 'Hide hint' : 'Hint'}
          </Btn>
          <div className="flex items-center gap-1.5 text-xs text-amber-100/80">
            <span className="rounded bg-[#1f1913] px-1.5 py-0.5">
              {p.items.key ? '🔑 key held' : '🔑 —'}
            </span>
            <span className="rounded bg-[#1f1913] px-1.5 py-0.5">
              {p.items.costume ? '🎭 disguised' : '🎭 —'}
            </span>
          </div>
        </div>
        {showHint && (
          <p className="mt-2 rounded-lg border border-violet-800/40 bg-violet-950/30 p-2 text-xs leading-snug text-violet-100/90">
            {p.level.hint}
          </p>
        )}
      </Card>

      <Card title="Crease">
        <div className="flex gap-1.5">
          {AXES.map((a) => {
            const on = axes.includes(a.id);
            const active = p.crease.axis === a.id;
            return (
              <button
                key={a.id}
                title={on ? a.title : 'Not allowed in this level'}
                disabled={!on}
                onClick={() => p.setCrease({ ...p.crease, axis: a.id })}
                className={`flex-1 rounded-lg border py-2 text-lg transition disabled:cursor-not-allowed disabled:opacity-25 ${
                  active
                    ? 'border-violet-300/70 bg-violet-600 text-white'
                    : 'border-amber-900/50 bg-[#3a2f26]/70 text-amber-200 hover:bg-[#4a3c30]'
                }`}
              >
                {a.glyph}
              </button>
            );
          })}
        </div>
        <div className="mt-2 grid grid-cols-2 gap-1.5">
          {([0, 1] as const).map((f) => (
            <button
              key={f}
              onClick={() => p.setCrease({ ...p.crease, flap: f })}
              className={`rounded-lg border px-2 py-1.5 text-[11px] font-semibold leading-tight transition ${
                p.crease.flap === f
                  ? 'border-violet-300/70 bg-violet-600 text-white'
                  : 'border-amber-900/50 bg-[#3a2f26]/70 text-amber-200/90 hover:bg-[#4a3c30]'
              }`}
            >
              {FLAP_LABEL[p.crease.axis][f]}
            </button>
          ))}
        </div>
        <p className="mt-2 text-[11px] leading-snug text-amber-200/50">
          Tap or drag on the map to place the crease. Ghost tiles show what lands where.
        </p>
      </Card>

      <div className="grid grid-cols-2 gap-2">
        <Btn tone="fold" onClick={p.onFold} disabled={p.busy} className="!py-3 !text-base">
          Fold<span className="ml-1 text-[10px] opacity-70">space</span>
        </Btn>
        <Btn tone="go" onClick={p.onGo} disabled={p.busy} className="!py-3 !text-base">
          Go<span className="ml-1 text-[10px] opacity-70">enter</span>
        </Btn>
        <Btn onClick={p.onUndo} disabled={!p.canUndo || p.busy}>
          Unfold<span className="ml-1 text-[10px] opacity-60">z</span>
        </Btn>
        <Btn onClick={p.onReset} disabled={p.busy}>
          Reset<span className="ml-1 text-[10px] opacity-60">r</span>
        </Btn>
      </div>

      {p.message && (
        <div
          className={`fw-pop rounded-xl border px-3 py-2 text-sm font-medium leading-snug ${
            p.message.kind === 'bad'
              ? 'border-rose-700/60 bg-rose-950/50 text-rose-100'
              : p.message.kind === 'good'
                ? 'border-emerald-700/60 bg-emerald-950/40 text-emerald-100'
                : 'border-amber-800/60 bg-amber-950/30 text-amber-100/90'
          }`}
        >
          {p.message.text}
        </div>
      )}

      <Card>
        <button
          className="flex w-full items-center justify-between text-[11px] font-bold uppercase tracking-[.18em] text-amber-500/80"
          onClick={() => setShowRules((v) => !v)}
        >
          <span>How folding works</span>
          <span>{showRules ? '−' : '+'}</span>
        </button>
        {showRules && (
          <div className="mt-2 space-y-2 text-xs leading-relaxed text-amber-100/80">
            <p className="text-amber-200/60 italic">{chap.tagline}</p>
            <p>{chap.rule}</p>
            <div className="grid grid-cols-1 gap-x-3 gap-y-1 rounded-lg border border-amber-900/30 bg-black/20 p-2 sm:grid-cols-2">
              {LEGEND.map(([t, label]) => (
                <div key={t} className="flex items-center gap-1.5">
                  <MiniTile t={t} />
                  <span className="truncate text-[10px] text-amber-100/70">{label}</span>
                </div>
              ))}
            </div>
            <ul className="space-y-1">
              <li>
                <b>Bridge</b> + water or hole → walkable crossing.
              </li>
              <li>
                <b>Stone slab</b> + hole or fire → walkable crossing (it sinks in water).
              </li>
              <li>
                <b>Water</b> + fire → ash. <b>Costume</b> + guard → friendly. <b>Key</b> + door → open.
              </li>
              <li>
                <b>Rock</b> beats everything. Plain paper folded over water, fire or a hole is lost.
              </li>
              <li>
                People ride the paper too — including you. Landing in water, fire, a hole or rock is
                refused.
              </li>
              <li>
                ✒ Memory ink stays behind when folded, leaving a copy where it lands.
              </li>
            </ul>
          </div>
        )}
      </Card>

      <Card>
        <button
          className="flex w-full items-center justify-between text-[11px] font-bold uppercase tracking-[.18em] text-amber-500/80"
          onClick={() => setShowList((v) => !v)}
        >
          <span>Map book — {p.solved.length}/{LEVELS.length}</span>
          <span>{showList ? '−' : '+'}</span>
        </button>
        {showList && (
          <div className="mt-2 max-h-64 space-y-2 overflow-y-auto pr-1">
            {[1, 2, 3, 4].map((c) => (
              <div key={c}>
                <div className="mb-1 text-[10px] font-bold uppercase tracking-wider text-amber-600/70">
                  {CHAPTERS[c].name}
                </div>
                <div className="grid grid-cols-2 gap-1">
                  {LEVELS.map((l, i) => ({ l, i }))
                    .filter(({ l }) => l.chapter === c)
                    .map(({ l, i }) => {
                      const done = p.solved.includes(l.id);
                      const locked = i > p.unlocked;
                      return (
                        <button
                          key={l.id}
                          disabled={locked}
                          onClick={() => p.onSelectLevel(i)}
                          className={`flex items-center gap-1.5 rounded-md border px-2 py-1 text-left text-[11px] transition ${
                            i === p.levelIndex
                              ? 'border-amber-400/70 bg-amber-500/20 text-amber-100'
                              : locked
                                ? 'cursor-not-allowed border-amber-900/30 bg-transparent text-amber-200/25'
                                : 'border-amber-900/40 bg-[#241d17]/60 text-amber-100/80 hover:bg-[#332a22]'
                          }`}
                        >
                          <span className="w-3 text-center">{done ? '✓' : locked ? '·' : '·'}</span>
                          <span className="truncate">{l.name}</span>
                        </button>
                      );
                    })}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <div className="flex items-center justify-between gap-2 px-1">
        <Btn onClick={p.onSkip} className="!py-1.5 !text-xs">
          Skip level →
        </Btn>
        <span className="text-[10px] text-amber-200/40">
          space fold · enter go · z unfold · r reset
        </span>
      </div>
    </div>
  );
}
