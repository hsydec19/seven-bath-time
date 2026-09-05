"use client";

import { useCallback, useEffect, useRef, useState } from "react";

declare const __PUBLIC_BASE_PATH__: string;

type GameStatus = "idle" | "playing" | "paused" | "levelcomplete" | "gameover" | "won";
type CatMood = "safe" | "watching";
type Point = { x: number; y: number };
type Bubble = Point & { id: number; size: number; drift: number };

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));
const TURN_REACTION_GRACE_MS = 150;

export default function BathGame() {
  const sceneRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef(false);
  const lastPointRef = useRef<Point>({ x: 28, y: 56 });
  const statusRef = useRef<GameStatus>("idle");
  const moodRef = useRef<CatMood>("safe");
  const cleanlinessRef = useRef(0);
  const levelRef = useRef<1 | 2>(1);
  const bubbleIdRef = useRef(0);
  const turnGraceUntilRef = useRef(0);

  const [status, setStatus] = useState<GameStatus>("idle");
  const [mood, setMood] = useState<CatMood>("safe");
  const [level, setLevel] = useState<1 | 2>(1);
  const [cleanliness, setCleanliness] = useState(0);
  const [best, setBest] = useState(0);
  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  const [sponge, setSponge] = useState({ x: 28, y: 56, angle: -12, active: false });

  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  useEffect(() => {
    moodRef.current = mood;
  }, [mood]);

  useEffect(() => {
    cleanlinessRef.current = cleanliness;
  }, [cleanliness]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const stored = Number(window.localStorage.getItem("seven-bath-best") ?? 0);
      if (Number.isFinite(stored)) setBest(clamp(stored, 0, 100));
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (status !== "playing") return;

    let turnTimer: ReturnType<typeof setTimeout>;
    let watchingTimer: ReturnType<typeof setTimeout>;

    const scheduleTurn = () => {
      const difficulty = cleanlinessRef.current / 100;
      const lateGameRamp = difficulty ** 2.4;
      const isTutorial = levelRef.current === 1;
      const safeWindow = isTutorial
        ? 2800 + Math.random() * 1200
        : 2150 - lateGameRamp * 1500
          + Math.random() ** 1.35 * (1200 - lateGameRamp * 450);
      turnTimer = setTimeout(() => {
        if (statusRef.current !== "playing") return;
        moodRef.current = "watching";
        turnGraceUntilRef.current = performance.now() + TURN_REACTION_GRACE_MS;
        setMood("watching");
        const watchingWindow = isTutorial
          ? 1500 + Math.random() * 300
          : 1700 + lateGameRamp * 1400 + Math.random() * 1100;
        watchingTimer = setTimeout(() => {
          if (statusRef.current !== "playing") return;
          moodRef.current = "safe";
          turnGraceUntilRef.current = 0;
          setMood("safe");
          scheduleTurn();
        }, watchingWindow);
      }, safeWindow);
    };

    scheduleTurn();
    return () => {
      clearTimeout(turnTimer);
      clearTimeout(watchingTimer);
    };
  }, [status]);

  const finishGame = useCallback((nextStatus: "levelcomplete" | "gameover" | "won", score: number) => {
    dragRef.current = false;
    moodRef.current = "safe";
    turnGraceUntilRef.current = 0;
    setSponge((current) => ({ ...current, active: false }));
    setStatus(nextStatus);
    setMood("safe");
    if (nextStatus === "levelcomplete" || levelRef.current === 1) return;
    const rounded = Math.round(score);
    setBest((current) => {
      const nextBest = Math.max(current, rounded);
      window.localStorage.setItem("seven-bath-best", String(nextBest));
      return nextBest;
    });
  }, []);

  const addBubble = useCallback((point: Point) => {
    const id = ++bubbleIdRef.current;
    const bubble: Bubble = {
      id,
      x: point.x + (Math.random() - 0.5) * 8,
      y: point.y + (Math.random() - 0.5) * 8,
      size: 16 + Math.random() * 34,
      drift: -26 + Math.random() * 52,
    };
    setBubbles((current) => [...current.slice(-34), bubble]);
    window.setTimeout(() => {
      setBubbles((current) => current.filter((item) => item.id !== id));
    }, 1800);
  }, []);

  const scrubAt = useCallback((point: Point, distance: number, angle: number) => {
    setSponge({ x: point.x, y: point.y, angle, active: dragRef.current });
    const touchingCat = point.x > 30 && point.x < 70 && point.y > 20 && point.y < 78;
    if (!dragRef.current || !touchingCat || distance < 1.4) return;

    if (moodRef.current === "watching") {
      if (performance.now() < turnGraceUntilRef.current) return;
      finishGame("gameover", cleanlinessRef.current);
      return;
    }
    if (moodRef.current !== "safe") return;

    const gain = levelRef.current === 1
      ? clamp(distance * 0.18, 0.6, 4.5)
      : clamp(distance * 0.03, 0.09, 0.8);
    setCleanliness((current) => {
      const next = clamp(current + gain, 0, 100);
      if (next >= 100) {
        const result = levelRef.current === 1 ? "levelcomplete" : "won";
        window.setTimeout(() => finishGame(result, 100), 0);
      }
      return next;
    });
    addBubble(point);
    if (distance > 12) addBubble({ x: point.x - 3, y: point.y + 2 });
  }, [addBubble, finishGame]);

  const pointFromEvent = (event: React.PointerEvent<HTMLDivElement>) => {
    const rect = sceneRef.current?.getBoundingClientRect();
    if (!rect) return null;
    return {
      x: clamp(((event.clientX - rect.left) / rect.width) * 100, 5, 95),
      y: clamp(((event.clientY - rect.top) / rect.height) * 100, 8, 90),
    };
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (statusRef.current !== "playing") return;
    const point = pointFromEvent(event);
    if (!point) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = true;
    lastPointRef.current = point;
    setSponge((current) => ({ ...current, ...point, active: true }));
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const point = pointFromEvent(event);
    if (!point) return;
    const last = lastPointRef.current;
    const dx = point.x - last.x;
    const dy = point.y - last.y;
    const distance = Math.hypot(dx, dy);
    lastPointRef.current = point;
    scrubAt(point, distance, Math.atan2(dy, dx) * (180 / Math.PI));
  };

  const stopDragging = () => {
    dragRef.current = false;
    setSponge((current) => ({ ...current, active: false }));
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (statusRef.current !== "playing") return;
    const delta: Record<string, Point> = {
      ArrowLeft: { x: -3, y: 0 }, ArrowRight: { x: 3, y: 0 },
      ArrowUp: { x: 0, y: -3 }, ArrowDown: { x: 0, y: 3 },
    };
    const movement = delta[event.key];
    if (!movement) return;
    event.preventDefault();
    dragRef.current = true;
    const point = {
      x: clamp(lastPointRef.current.x + movement.x, 5, 95),
      y: clamp(lastPointRef.current.y + movement.y, 8, 90),
    };
    lastPointRef.current = point;
    scrubAt(point, 6, Math.atan2(movement.y, movement.x) * (180 / Math.PI));
    window.setTimeout(stopDragging, 90);
  };

  const beginLevel = (nextLevel: 1 | 2) => {
    levelRef.current = nextLevel;
    setLevel(nextLevel);
    cleanlinessRef.current = 0;
    setCleanliness(0);
    setBubbles([]);
    moodRef.current = "safe";
    turnGraceUntilRef.current = 0;
    setMood("safe");
    setStatus("playing");
    setSponge({ x: 28, y: 56, angle: -12, active: false });
    lastPointRef.current = { x: 28, y: 56 };
  };

  const returnHome = () => {
    dragRef.current = false;
    levelRef.current = 1;
    cleanlinessRef.current = 0;
    moodRef.current = "safe";
    turnGraceUntilRef.current = 0;
    setLevel(1);
    setCleanliness(0);
    setBubbles([]);
    setMood("safe");
    setStatus("idle");
    setSponge({ x: 28, y: 56, angle: -12, active: false });
    lastPointRef.current = { x: 28, y: 56 };
  };

  const pauseGame = () => {
    stopDragging();
    moodRef.current = "safe";
    turnGraceUntilRef.current = 0;
    setMood("safe");
    setStatus("paused");
  };

  const moodCopy = mood === "safe"
    ? "现在可以洗"
    : "Seven 回头了，快停！";
  const stage = level === 1
    ? { label: "教学", className: "easy" }
    : cleanliness < 40
      ? { label: "警觉", className: "medium" }
      : cleanliness < 75
        ? { label: "危险", className: "hard" }
        : { label: "极限", className: "extreme" };

  return (
    <main className="game-shell">
      <section className="game-card" aria-label="老七，该洗澡了">
        <header className="game-header">
          <div><p className="eyebrow">Seven&apos;s bath time</p><h1>老七，该洗澡了</h1></div>
          <div className="score-group">
            <div className={`stage-meter stage-${stage.className}`}><span>第 {level} 关</span><strong>{stage.label}</strong></div>
            <div className="best-score"><span>最好</span><strong>{best}%</strong></div>
            <div className="clean-meter"><span>清洁度</span><strong>{Math.round(cleanliness)}%</strong></div>
          </div>
        </header>

        {/* This focusable application region is the game's custom pointer and keyboard input surface. */}
        {/* eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions */}
        <div
          ref={sceneRef}
          className={`bath-scene mood-${mood} status-${status}`}
          role="application"
          // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex
          tabIndex={0}
          aria-label="洗澡游戏区域，可拖动浴球或使用方向键"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={stopDragging}
          onPointerCancel={stopDragging}
          onKeyDown={handleKeyDown}
        >
          <div className="progress-track"><span style={{ width: `${cleanliness}%` }} /></div>
          <div className="shower-pipe" />
          <div className="cat" aria-label="浴缸里的 Seven">
            <div
              className="cat-layer cat-body-photo"
              style={{ backgroundImage: `url("${__PUBLIC_BASE_PATH__}/assets/seven/cat-body-neck.png?v=1")` }}
            />
            {mood === "safe"
              ? <div
                  className="cat-layer cat-head-safe"
                  style={{ backgroundImage: `url("${__PUBLIC_BASE_PATH__}/assets/seven/cat-safe-full.png?v=3")` }}
                />
              : <div
                  className="cat-head-turn"
                  style={{ backgroundImage: `url("${__PUBLIC_BASE_PATH__}/assets/seven/cat-head-user-balanced.png?v=2")` }}
                />}
          </div>
          {bubbles.map((bubble) => (
            <i key={bubble.id} className="foam-particle" style={{ left: `${bubble.x}%`, top: `${bubble.y}%`, width: bubble.size, height: bubble.size, "--drift": `${bubble.drift}px` } as React.CSSProperties} />
          ))}
          <div className="sponge" style={{ left: `${sponge.x}%`, top: `${sponge.y}%`, transform: `translate(-50%, -50%) rotate(${sponge.angle}deg)` }} aria-label="浴球"><span /></div>
          <div className="tub"><span className="water-line" /><span className="tub-shine" /></div>
          <div className="duck" aria-hidden="true"><span /></div>
          {status === "playing" && <div className={`mood-badge mood-badge-${mood}`} aria-live="polite">{moodCopy}</div>}
          {status !== "playing" && (
            <div className={`game-overlay overlay-${status}`}>
              <div className="overlay-card">
                <span className="overlay-icon" aria-hidden="true">{status === "won" ? "✨" : status === "levelcomplete" ? "👏" : status === "gameover" ? "😾" : status === "paused" ? "⏸️" : "🫧"}</span>
                <h2>{status === "won" ? "两关全通！" : status === "levelcomplete" ? "第一关完成！" : status === "gameover" ? "Seven 生气了！" : status === "paused" ? "游戏已暂停" : "准备好洗澡了吗？"}</h2>
                <p>{status === "won" ? "你顶住了最后的极限节奏，Seven 终于洗香香了！" : status === "levelcomplete" ? "难度飙升！别笑，你也过不了第二关！！！" : status === "gameover" ? `第 ${level} 关清洁度 ${Math.round(cleanliness)}%。Seven 回头时要立刻停手。` : status === "paused" ? `第 ${level} 关已暂停，当前清洁度 ${Math.round(cleanliness)}%。` : "第一关很轻松，先熟悉搓洗和停手；通过后再挑战高难度第二关。"}</p>
                {status === "paused" ? (
                  <div className="overlay-actions">
                    <button type="button" className="secondary-button" onClick={returnHome}>返回主界面</button>
                    <button type="button" className="secondary-button" onClick={() => beginLevel(level)}>重新开始</button>
                    <button type="button" onClick={() => setStatus("playing")}>继续</button>
                  </div>
                ) : (
                  <button type="button" onClick={() => beginLevel(status === "levelcomplete" ? 2 : status === "won" ? 1 : level)}>{status === "idle" ? "开始第一关" : status === "levelcomplete" ? "挑战第二关" : status === "won" ? "再玩一遍" : `重试第 ${level} 关`}</button>
                )}
              </div>
            </div>
          )}
        </div>

        <footer className="game-footer">
          <p><strong>第 {level} 关：</strong>{level === 1 ? "看到 Seven 回头就停手，会留一点反应时间。" : "难度飙升！别笑，你也过不了第二关！！！"}</p>
          <div className="footer-actions">
            {status === "playing" && <button type="button" className="pause-button" onClick={pauseGame}>暂停</button>}
            <span className={`status-pill status-pill-${mood}`}>{status === "playing" ? moodCopy : "鼠标 · 触屏 · 方向键"}</span>
          </div>
        </footer>
      </section>
    </main>
  );
}
