import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Board, { type FoldAnim } from './components/Board';
import Sidebar, { type Msg } from './components/Sidebar';
import { CHAPTERS, LEVELS, parseLevel } from './game/levels';
import { computeFold, findGoal, previewFold } from './game/fold';
import { catNearGoal, planWalk, stepOnce } from './game/walk';
import type { Axis, Crease, Grid, Items, Npc, Pos } from './game/types';

const STORE = 'foldworld.progress.v1';

function defaultK(axis: Axis, W: number, H: number) {
  switch (axis) {
    case 'v':
      return Math.round(W / 2);
    case 'h':
      return Math.round(H / 2);
    case 'd1':
      return 0;
    default:
      return Math.round((W + H) / 2);
  }
}

function clamp(v: number, a: number, b: number) {
  return Math.max(a, Math.min(b, v));
}

interface Snapshot {
  grid: Grid;
  player: Pos;
  npcs: Npc[];
  items: Items;
  folds: number;
}

export default function App() {
  const [levelIndex, setLevelIndex] = useState(0);
  const level = LEVELS[levelIndex];
  const parsed = useMemo(() => parseLevel(level), [level]);

  const [grid, setGrid] = useState<Grid>(parsed.grid);
  const [player, setPlayer] = useState<Pos>(parsed.player);
  const [npcs, setNpcs] = useState<Npc[]>(parsed.npcs);
  const [items, setItems] = useState<Items>({ key: false, costume: false });
  const [folds, setFolds] = useState(0);
  const [history, setHistory] = useState<Snapshot[]>([]);

  const axes = level.axes ?? ['v', 'h'];
  const [crease, setCrease] = useState<Crease>({
    axis: axes[0],
    k: defaultK(axes[0], parsed.W, parsed.H),
    flap: 1,
  });

  const [phase, setPhase] = useState<'idle' | 'folding' | 'walking' | 'won'>('idle');
  const [anim, setAnim] = useState<FoldAnim | null>(null);
  const [message, setMessage] = useState<Msg>(null);
  const pathRef = useRef<Pos[]>([]);
  const planRef = useRef<{ reachedGoal: boolean; message: string }>({
    reachedGoal: false,
    message: '',
  });

  const [solved, setSolved] = useState<number[]>([]);
  const [unlocked, setUnlocked] = useState(0);
  const [introChapter, setIntroChapter] = useState<number | null>(1);
  const [ending, setEnding] = useState(false);

  /* ---------------- progress ---------------- */
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORE);
      if (raw) {
        const d = JSON.parse(raw);
        setSolved(d.solved ?? []);
        setUnlocked(Math.min(d.unlocked ?? 0, LEVELS.length - 1));
      }
    } catch {
      /* ignore */
    }
  }, []);

  const persist = useCallback((solvedList: number[], unlockedTo: number) => {
    try {
      localStorage.setItem(
        STORE,
        JSON.stringify({ solved: solvedList, unlocked: Math.min(unlockedTo, LEVELS.length - 1) }),
      );
    } catch {
      /* ignore */
    }
  }, []);

  /* ---------------- level loading ---------------- */
  const loadLevel = useCallback(
    (i: number) => {
      const lv = LEVELS[i];
      const p = parseLevel(lv);
      const ax = (lv.axes ?? ['v', 'h'])[0];
      setLevelIndex(i);
      setGrid(p.grid);
      setPlayer(p.player);
      setNpcs(p.npcs);
      setItems({ key: false, costume: false });
      setFolds(0);
      setHistory([]);
      setCrease({ axis: ax, k: defaultK(ax, p.W, p.H), flap: 1 });
      setPhase('idle');
      setAnim(null);
      pathRef.current = [];
      setMessage(null);
      setIntroChapter((c) => (c === lv.chapter ? null : lv.chapter));
    },
    [],
  );

  const reset = useCallback(() => loadLevel(levelIndex), [levelIndex, loadLevel]);

  const newGame = useCallback(() => {
    if (!window.confirm('Start a new game? This will erase your saved puzzle progress.')) return;
    try {
      localStorage.removeItem(STORE);
    } catch {
      setMessage({ text: 'Could not clear saved progress. Your game was not reset.', kind: 'bad' });
      return;
    }
    setSolved([]);
    setUnlocked(0);
    setEnding(false);
    loadLevel(0);
  }, [loadLevel]);

  const unlockNext = useCallback(
    (id: number) => {
      const idx = LEVELS.findIndex((l) => l.id === id);
      const next = solved.includes(id) ? solved : [...solved, id];
      setSolved(next);
      const newUnlocked = Math.max(unlocked, Math.min(idx + 1, LEVELS.length - 1));
      setUnlocked(newUnlocked);
      persist(next, newUnlocked);
      if (next.length >= LEVELS.length) setEnding(true);
    },
    [solved, unlocked, persist],
  );

  /* ---------------- crease picking ---------------- */
  const pick = useCallback(
    (x: number, y: number) => {
      if (phase !== 'idle') return;
      setCrease((c) => {
        switch (c.axis) {
          case 'v':
            return { ...c, k: clamp(Math.round(x), 0, parsed.W) };
          case 'h':
            return { ...c, k: clamp(Math.round(y), 0, parsed.H) };
          case 'd1':
            return { ...c, k: clamp(Math.round(x - y), -(parsed.H - 1), parsed.W - 1) };
          default:
            return { ...c, k: clamp(Math.round(x + y), 0, parsed.W + parsed.H - 2) };
        }
      });
    },
    [phase, parsed.W, parsed.H],
  );

  const changeAxis = useCallback(
    (axis: Axis) => {
      if (!axes.includes(axis)) return;
      setCrease((c) => ({ ...c, axis, k: defaultK(axis, parsed.W, parsed.H) }));
    },
    [axes, parsed.W, parsed.H],
  );

  /* ---------------- winning ---------------- */
  const checkWin = useCallback(
    (g: Grid, ns: Npc[]) => {
      const goal = findGoal(g);
      if (!goal) return false;
      if (!catNearGoal(ns, goal)) {
        setMessage({
          text: 'Miso is still out there — she must end up beside the gate!',
          kind: 'bad',
        });
        return false;
      }
      return true;
    },
    [],
  );

  /* ---------------- folding ---------------- */
  const doFold = useCallback(() => {
    if (phase !== 'idle' || anim) return;
    const res = computeFold(grid, crease, player, npcs, items);
    if (res.error || !res.result) {
      setMessage({ text: res.error ?? 'That fold does nothing.', kind: 'bad' });
      return;
    }
    const r = res.result;
    setHistory((h) => [...h, { grid, player, npcs, items, folds }]);
    setGrid(r.grid);
    setPlayer(r.player);
    setNpcs(r.npcs);
    setFolds((f) => f + 1);
    setMessage(r.notes.length ? { text: r.notes[0], kind: 'info' } : null);
    setAnim({ grid, crease, flipped: false, player, npcs });
    setPhase('folding');
    requestAnimationFrame(() => requestAnimationFrame(() => setAnim((a) => (a ? { ...a, flipped: true } : a))));
    window.setTimeout(() => {
      setAnim(null);
      setPhase('idle');
      if (r.grid[r.player.y][r.player.x].t === 'goal') {
        if (checkWin(r.grid, r.npcs)) {
          setPhase('won');
          unlockNext(level.id);
        }
      }
    }, 660);
  }, [phase, anim, grid, crease, player, npcs, items, folds, checkWin, unlockNext, level.id]);

  const undo = useCallback(() => {
    if (phase !== 'idle' || history.length === 0) return;
    const s = history[history.length - 1];
    setHistory((h) => h.slice(0, -1));
    setGrid(s.grid);
    setPlayer(s.player);
    setNpcs(s.npcs);
    setItems(s.items);
    setFolds(s.folds);
    setMessage({ text: 'Unfolded.', kind: 'info' });
  }, [phase, history]);

  /* ---------------- walking ---------------- */
  const finishWalk = useCallback(
    (g: Grid, p: Pos, ns: Npc[]) => {
      const plan = planRef.current;
      if (!plan.reachedGoal) {
        if (ns.some((n) => n.type === 'chaser')) {
          window.setTimeout(() => {
            const res = stepOnce(g, p, ns, { key: true, costume: true }, p);
            setNpcs(res.npcs);
            const chaser = res.npcs.find((n) => n.type === 'chaser');
            const near =
              chaser &&
              Math.abs(chaser.cells[chaser.i].x - p.x) + Math.abs(chaser.cells[chaser.i].y - p.y) <= 1;
            setMessage({
              text: near
                ? 'The inspector is right behind you — fold the map and keep moving!'
                : plan.message,
              kind: near ? 'bad' : 'info',
            });
          }, 260);
        } else {
          setMessage({ text: plan.message, kind: 'info' });
        }
      }
      setPhase('idle');
    },
    [],
  );

  const go = useCallback(() => {
    if (phase !== 'idle' || anim || introChapter !== null || ending) return;
    if (grid[player.y][player.x].t === 'goal') {
      if (checkWin(grid, npcs)) {
        setPhase('won');
        unlockNext(level.id);
      }
      return;
    }
    const goal = findGoal(grid);
    const plan = planWalk(grid, player, items, npcs, goal);
    planRef.current = plan;
    if (plan.path.length === 0) {
      setMessage({
        text: plan.reachedGoal ? 'You are already at the gate.' : plan.message || 'Nowhere to walk.',
        kind: 'info',
      });
      return;
    }
    pathRef.current = plan.path;
    setMessage(null);
    setPhase('walking');
  }, [phase, anim, grid, player, items, npcs, checkWin, unlockNext, level.id, introChapter, ending]);

  useEffect(() => {
    if (phase !== 'walking') return;
    const t = window.setTimeout(() => {
      const path = pathRef.current;
      if (path.length === 0) {
        finishWalk(grid, player, npcs);
        return;
      }
      const target = path[0];
      const res = stepOnce(grid, player, npcs, items, target);
      const blocked = res.player.x === player.x && res.player.y === player.y;
      pathRef.current = path.slice(1);
      setGrid(res.grid);
      setItems(res.items);
      setPlayer(res.player);
      setNpcs(res.npcs);
      if (blocked) {
        setMessage({ text: res.events[0] ?? 'Something blocked your path.', kind: 'bad' });
        setPhase('idle');
        return;
      }
      if (res.won) {
        if (checkWin(res.grid, res.npcs)) {
          window.setTimeout(() => {
            setPhase('won');
            unlockNext(level.id);
          }, 340);
        } else setPhase('idle');
        return;
      }
      if (res.caught) {
        setMessage({
          text: 'The inspector caught you! Unfold (Z) or reset (R) and try a different route.',
          kind: 'bad',
        });
        setPhase('idle');
        return;
      }
      if (pathRef.current.length === 0) finishWalk(res.grid, res.player, res.npcs);
    }, 165);
    return () => window.clearTimeout(t);
  }, [phase, grid, player, npcs, items, finishWalk, checkWin, unlockNext, level.id]);

  /* ---------------- keyboard ---------------- */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (introChapter !== null || ending) return;
      if (e.key === ' ') {
        e.preventDefault();
        doFold();
      } else if (e.key === 'Enter') go();
      else if (e.key.toLowerCase() === 'z') undo();
      else if (e.key.toLowerCase() === 'r') reset();
      else if (['1', '2', '3', '4'].includes(e.key)) {
        const i = Number(e.key) - 1;
        const ax = (['v', 'h', 'd1', 'd2'] as Axis[])[i];
        changeAxis(ax);
      } else if (e.key.toLowerCase() === 'f') setCrease((c) => ({ ...c, flap: c.flap === 0 ? 1 : 0 }));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [doFold, go, undo, reset, changeAxis, introChapter, ending]);

  const ghosts = useMemo(
    () => (phase === 'idle' && !anim ? previewFold(grid, crease, player, npcs) : []),
    [phase, anim, grid, crease, player, npcs],
  );

  const chap = CHAPTERS[level.chapter];

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#191310] text-amber-50">
      <div
        className="pointer-events-none fixed inset-0"
        style={{
          background:
            'radial-gradient(1100px 620px at 50% -12%, #40301f 0%, #241a12 45%, #14100c 100%)',
        }}
      />
      <div className="relative mx-auto max-w-6xl px-3 py-4 sm:px-5">
        <header className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-black tracking-tight sm:text-3xl">
              FOLD<span className="text-violet-400">WORLD</span>
            </h1>
            <p className="text-[11px] uppercase tracking-[.22em] text-amber-500/70">
              a paper map you crease to change reality
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs text-amber-200/60">
            <span className="rounded-lg border border-amber-900/40 bg-[#2c231d]/70 px-2.5 py-1.5">
              {chap.name}
            </span>
            <button
              onClick={() => setIntroChapter(level.chapter)}
              className="rounded-lg border border-violet-800/50 bg-violet-950/40 px-2.5 py-1.5 font-semibold text-violet-200 transition hover:bg-violet-900/40"
            >
              Rules
            </button>
          </div>
        </header>

        <div className="flex flex-col gap-4 lg:flex-row">
          <div className="min-w-0 flex-1">
            <Board
              grid={grid}
              player={player}
              npcs={npcs}
              crease={crease}
              ghosts={ghosts}
              items={items}
              anim={anim}
              onPick={pick}
            />
          </div>
          <Sidebar
            level={level}
            crease={crease}
            setCrease={(c) => {
              if (c.axis !== crease.axis) changeAxis(c.axis);
              else setCrease(c);
            }}
            onFold={doFold}
            onGo={go}
            onUndo={undo}
            onReset={reset}
            onNewGame={newGame}
            onSkip={() => {
              unlockNext(level.id);
              if (levelIndex < LEVELS.length - 1) loadLevel(levelIndex + 1);
            }}
            canUndo={history.length > 0}
            busy={phase !== 'idle' || !!anim}
            items={items}
            folds={folds}
            message={message}
            solved={solved}
            unlocked={unlocked}
            levelIndex={levelIndex}
            onSelectLevel={loadLevel}
          />
        </div>
      </div>

      {/* chapter intro */}
      {introChapter !== null && !ending && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="max-w-lg rounded-3xl border border-amber-800/50 bg-gradient-to-b from-[#3a2c20] to-[#241a12] p-6 shadow-2xl">
            <div className="text-[11px] font-bold uppercase tracking-[.24em] text-violet-300/80">
              {CHAPTERS[introChapter].name}
            </div>
            <h2 className="mt-1 text-2xl font-black text-amber-50">
              {introChapter === 1 ? 'Welcome to Foldworld' : CHAPTERS[introChapter].tagline}
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-amber-100/80">
              {CHAPTERS[introChapter].tagline}
            </p>
            <p className="mt-3 text-sm leading-relaxed text-amber-100/70">
              {CHAPTERS[introChapter].rule}
            </p>
            <ul className="mt-3 space-y-1 text-xs text-amber-200/60">
              <li>• Tap or drag the map to place a crease.</li>
              <li>• Choose which half lifts, then press Fold.</li>
              <li>• Press Go and the wanderer walks until something stops him.</li>
            </ul>
            <button
              onClick={() => setIntroChapter(null)}
              className="mt-5 w-full rounded-xl bg-amber-500 py-3 font-bold text-[#2b1c07] transition hover:bg-amber-400"
            >
              Begin folding
            </button>
          </div>
        </div>
      )}

      {/* level complete */}
      {phase === 'won' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-3xl border border-emerald-700/50 bg-gradient-to-b from-[#22301f] to-[#161d14] p-6 text-center shadow-2xl">
            <div className="text-4xl">🗺️</div>
            <h2 className="mt-2 text-2xl font-black text-emerald-50">Gate reached</h2>
            <p className="mt-1 text-sm text-emerald-100/70">
              {level.name} cleared in {folds} {folds === 1 ? 'crease' : 'creases'}.
            </p>
            <div className="mt-5 flex gap-2">
              <button
                onClick={reset}
                className="flex-1 rounded-xl border border-emerald-800/60 bg-emerald-950/40 py-2.5 text-sm font-semibold text-emerald-100 transition hover:bg-emerald-900/40"
              >
                Replay
              </button>
              <button
                onClick={() => {
                  if (levelIndex < LEVELS.length - 1) loadLevel(levelIndex + 1);
                  else setEnding(true);
                }}
                className="flex-1 rounded-xl bg-emerald-500 py-2.5 text-sm font-bold text-[#0d1a0c] transition hover:bg-emerald-400"
              >
                {levelIndex < LEVELS.length - 1 ? 'Next fold →' : 'Finish'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ending */}
      {ending && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur">
          <div className="max-w-md rounded-3xl border border-amber-700/50 bg-gradient-to-b from-[#3b2b1c] to-[#1b140e] p-7 text-center shadow-2xl">
            <div className="text-5xl">✒️</div>
            <h2 className="mt-3 text-3xl font-black text-amber-50">The map is folded flat</h2>
            <p className="mt-3 text-sm leading-relaxed text-amber-100/75">
              Every gate reached, every river spanned, every guard befriended. The wanderer tucks the
              world into his pocket — it fits, now. Somewhere in the creases, a cat is purring.
            </p>
            <p className="mt-3 text-xs uppercase tracking-[.2em] text-amber-500/70">
              {solved.length} / {LEVELS.length} puzzles solved
            </p>
            <button
              onClick={() => setEnding(false)}
              className="mt-5 w-full rounded-xl bg-amber-500 py-3 font-bold text-[#2b1c07] transition hover:bg-amber-400"
            >
              Back to the map book
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
