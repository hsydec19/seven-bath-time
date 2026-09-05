"use client";

import { useCallback, useEffect, useRef, useState } from "react";

declare const __PUBLIC_BASE_PATH__: string;

type GameStatus = "idle" | "playing" | "paused" | "levelcomplete" | "gameover" | "won";
type CatMood = "safe" | "watching";
type TurnPace = "normal" | "sudden" | "long";
type Point = { x: number; y: number };
type Bubble = Point & { id: number; size: number; drift: number };

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));
const TUTORIAL_REACTION_GRACE_MS = 150;
const FINAL_LEVEL_REACTION_GRACE_MS = 200;
const BEST_SCORE_STORAGE_KEYS = {
  1: "seven-bath-best-level-1",
  2: "seven-bath-best-level-2",
} as const;
const LEGACY_BEST_SCORE_STORAGE_KEY = "seven-bath-best";

export default function BathGame() {
  const sceneRef = useRef<HTMLDivElement>(null);
  const backgroundMusicRef = useRef<HTMLAudioElement>(null);
  const scrubbingSoundRef = useRef<HTMLAudioElement>(null);
  const levelCompleteSoundRef = useRef<HTMLAudioElement>(null);
  const finalVictorySoundRef = useRef<HTMLAudioElement>(null);
  const gameOverSoundRef = useRef<HTMLAudioElement>(null);
  const buttonSoundRef = useRef<HTMLAudioElement>(null);
  const audioRequestRef = useRef(new WeakMap<HTMLAudioElement, number>());
  const hasStartedRef = useRef(false);
  const soundEffectsEnabledRef = useRef(true);
  const dragRef = useRef(false);
  const lastPointRef = useRef<Point>({ x: 28, y: 56 });
  const statusRef = useRef<GameStatus>("idle");
  const moodRef = useRef<CatMood>("safe");
  const cleanlinessRef = useRef(0);
  const levelRef = useRef<1 | 2>(1);
  const bubbleIdRef = useRef(0);
  const turnGraceUntilRef = useRef(0);
  const previousTurnPaceRef = useRef<TurnPace | null>(null);
  const doubleTurnCountRef = useRef(0);

  const [status, setStatus] = useState<GameStatus>("idle");
  const [mood, setMood] = useState<CatMood>("safe");
  const [level, setLevel] = useState<1 | 2>(1);
  const [cleanliness, setCleanliness] = useState(0);
  const [bestScores, setBestScores] = useState<Record<1 | 2, number>>({ 1: 0, 2: 0 });
  const [showAbout, setShowAbout] = useState(false);
  const [showSoundSettings, setShowSoundSettings] = useState(false);
  const [musicEnabled, setMusicEnabled] = useState(true);
  const [soundEffectsEnabled, setSoundEffectsEnabled] = useState(true);
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
    [
      backgroundMusicRef,
      scrubbingSoundRef,
      levelCompleteSoundRef,
      finalVictorySoundRef,
      gameOverSoundRef,
      buttonSoundRef,
    ].forEach((ref) => {
      const audio = ref.current;
      if (!audio) return;
      audio.preload = "auto";
      audio.load();
    });
  }, []);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const readBestScore = (key: string, fallback = 0) => {
        const stored = Number(window.localStorage.getItem(key) ?? fallback);
        return Number.isFinite(stored) ? clamp(stored, 0, 100) : 0;
      };
      const legacyBest = readBestScore(LEGACY_BEST_SCORE_STORAGE_KEY);
      setBestScores({
        1: readBestScore(BEST_SCORE_STORAGE_KEYS[1]),
        2: readBestScore(BEST_SCORE_STORAGE_KEYS[2], legacyBest),
      });
      const storedMusic = window.localStorage.getItem("seven-bath-music-enabled");
      const storedSoundEffects = window.localStorage.getItem("seven-bath-sfx-enabled");
      if (storedMusic !== null) setMusicEnabled(storedMusic === "true");
      if (storedSoundEffects !== null) {
        const enabled = storedSoundEffects === "true";
        soundEffectsEnabledRef.current = enabled;
        setSoundEffectsEnabled(enabled);
      }
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (status !== "playing" || showAbout || showSoundSettings) return;

    let turnTimer: ReturnType<typeof setTimeout>;
    let watchingTimer: ReturnType<typeof setTimeout>;

    const scheduleTurn = (isDoubleTurn = false) => {
      const difficulty = cleanlinessRef.current / 100;
      const lateGameRamp = difficulty ** 2.4;
      const isTutorial = levelRef.current === 1;
      let pace: TurnPace = "normal";

      if (!isTutorial) {
        if (isDoubleTurn) {
          pace = "sudden";
        } else {
          const paceRoll = Math.random();
          pace = previousTurnPaceRef.current === "sudden"
            ? paceRoll < 0.8 ? "normal" : "long"
            : paceRoll < 0.65 ? "normal" : paceRoll < 0.85 ? "sudden" : "long";
        }
        previousTurnPaceRef.current = pace;
      }

      const safeWindow = isTutorial
        ? 2800 + Math.random() * 1200
        : isDoubleTurn
          ? 650 + Math.random() * 250
          : pace === "sudden"
            ? 900 - lateGameRamp * 250 + Math.random() * 350
            : pace === "long"
              ? 3400 - lateGameRamp * 1200 + Math.random() * 1500
              : 1850 - lateGameRamp * 950
                + Math.random() ** 1.2 * (1300 - lateGameRamp * 400);
      turnTimer = setTimeout(() => {
        if (statusRef.current !== "playing") return;
        moodRef.current = "watching";
        turnGraceUntilRef.current = performance.now()
          + (isTutorial ? TUTORIAL_REACTION_GRACE_MS : FINAL_LEVEL_REACTION_GRACE_MS);
        setMood("watching");
        const watchingWindow = isTutorial
          ? 1500 + Math.random() * 300
          : 1350 + lateGameRamp * 1200 + Math.random() * 1600;
        watchingTimer = setTimeout(() => {
          if (statusRef.current !== "playing") return;
          moodRef.current = "safe";
          turnGraceUntilRef.current = 0;
          setMood("safe");
          const shouldDoubleTurn = !isTutorial
            && !isDoubleTurn
            && pace !== "sudden"
            && doubleTurnCountRef.current < 2
            && Math.random() < 0.14;
          if (shouldDoubleTurn) doubleTurnCountRef.current += 1;
          scheduleTurn(shouldDoubleTurn);
        }, watchingWindow);
      }, safeWindow);
    };

    scheduleTurn();
    return () => {
      clearTimeout(turnTimer);
      clearTimeout(watchingTimer);
    };
  }, [showAbout, showSoundSettings, status]);

  useEffect(() => {
    if (!showAbout && !showSoundSettings) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setShowAbout(false);
      setShowSoundSettings(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [showAbout, showSoundSettings]);

  const stopAudio = useCallback((audio: HTMLAudioElement | null) => {
    if (!audio) return;
    const requestId = (audioRequestRef.current.get(audio) ?? 0) + 1;
    audioRequestRef.current.set(audio, requestId);
    audio.pause();
    if (audio.readyState > 0) audio.currentTime = 0;
  }, []);

  const playAudio = useCallback((audio: HTMLAudioElement | null, volume: number, label: string) => {
    if (!audio) return;
    const requestId = (audioRequestRef.current.get(audio) ?? 0) + 1;
    audioRequestRef.current.set(audio, requestId);
    audio.volume = volume;
    if (audio.readyState > 0) audio.currentTime = 0;

    const attemptPlayback = (canRetry: boolean) => {
      if (audioRequestRef.current.get(audio) !== requestId) return;
      void audio.play().catch((error: unknown) => {
        if (audioRequestRef.current.get(audio) !== requestId) return;
        const errorName = error instanceof DOMException ? error.name : "UnknownError";
        const mediaErrorCode = audio.error?.code;
        const recoverable = errorName !== "NotAllowedError"
          && errorName !== "AbortError"
          && mediaErrorCode !== MediaError.MEDIA_ERR_DECODE
          && mediaErrorCode !== MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED;

        if (canRetry && recoverable) {
          const retryWhenReady = () => attemptPlayback(false);
          audio.addEventListener("canplay", retryWhenReady, { once: true });
          audio.load();
          return;
        }

        console.warn(`[audio] Unable to play ${label}`, error);
      });
    };

    attemptPlayback(true);
  }, []);

  const playBackgroundMusic = useCallback(() => {
    playAudio(backgroundMusicRef.current, 0.28, "background music");
  }, [playAudio]);

  const toggleMusic = () => {
    const nextEnabled = !musicEnabled;
    setMusicEnabled(nextEnabled);
    window.localStorage.setItem("seven-bath-music-enabled", String(nextEnabled));
    if (nextEnabled && hasStartedRef.current) playBackgroundMusic();
    if (!nextEnabled) stopAudio(backgroundMusicRef.current);
  };

  const stopScrubbingSound = useCallback(() => {
    stopAudio(scrubbingSoundRef.current);
  }, [stopAudio]);

  const playScrubbingSound = useCallback(() => {
    if (!soundEffectsEnabledRef.current) return;
    const audio = scrubbingSoundRef.current;
    if (!audio || !audio.paused) return;
    playAudio(audio, 0.42, "scrubbing sound");
  }, [playAudio]);

  const stopLevelCompleteSound = useCallback(() => {
    stopAudio(levelCompleteSoundRef.current);
  }, [stopAudio]);

  const playLevelCompleteSound = useCallback(() => {
    if (!soundEffectsEnabledRef.current) return;
    playAudio(levelCompleteSoundRef.current, 0.68, "level complete sound");
  }, [playAudio]);

  const stopFinalVictorySound = useCallback(() => {
    stopAudio(finalVictorySoundRef.current);
  }, [stopAudio]);

  const playFinalVictorySound = useCallback(() => {
    if (!soundEffectsEnabledRef.current) return;
    playAudio(finalVictorySoundRef.current, 0.72, "final victory sound");
  }, [playAudio]);

  const stopGameOverSound = useCallback(() => {
    stopAudio(gameOverSoundRef.current);
  }, [stopAudio]);

  const playGameOverSound = useCallback(() => {
    if (!soundEffectsEnabledRef.current) return;
    playAudio(gameOverSoundRef.current, 0.7, "game over sound");
  }, [playAudio]);

  const stopButtonSound = useCallback(() => {
    stopAudio(buttonSoundRef.current);
  }, [stopAudio]);

  const playButtonSound = useCallback(() => {
    if (!soundEffectsEnabledRef.current) return;
    playAudio(buttonSoundRef.current, 0.3, "button sound");
  }, [playAudio]);

  const handleButtonClick = (event: React.MouseEvent<HTMLElement>) => {
    if (event.target instanceof Element && event.target.closest("button")) playButtonSound();
  };

  const openAbout = () => {
    stopLevelCompleteSound();
    stopGameOverSound();
    stopFinalVictorySound();
    playFinalVictorySound();
    setShowSoundSettings(false);
    setShowAbout(true);
  };

  const toggleSoundEffects = () => {
    const nextEnabled = !soundEffectsEnabled;
    soundEffectsEnabledRef.current = nextEnabled;
    setSoundEffectsEnabled(nextEnabled);
    window.localStorage.setItem("seven-bath-sfx-enabled", String(nextEnabled));
    if (nextEnabled) {
      playButtonSound();
    } else {
      stopScrubbingSound();
      stopLevelCompleteSound();
      stopFinalVictorySound();
      stopGameOverSound();
      stopButtonSound();
    }
  };

  const finishGame = useCallback((nextStatus: "levelcomplete" | "gameover" | "won", score: number) => {
    if (statusRef.current !== "playing") return;
    statusRef.current = nextStatus;
    dragRef.current = false;
    stopScrubbingSound();
    moodRef.current = "safe";
    turnGraceUntilRef.current = 0;
    setSponge((current) => ({ ...current, active: false }));
    setStatus(nextStatus);
    setMood("safe");
    if (nextStatus === "levelcomplete") playLevelCompleteSound();
    if (nextStatus === "won") playFinalVictorySound();
    if (nextStatus === "gameover") playGameOverSound();
    const finishedLevel = levelRef.current;
    const rounded = Math.round(clamp(score, 0, 100));
    setBestScores((current) => {
      const nextBest = Math.max(current[finishedLevel], rounded);
      window.localStorage.setItem(BEST_SCORE_STORAGE_KEYS[finishedLevel], String(nextBest));
      return { ...current, [finishedLevel]: nextBest };
    });
  }, [playFinalVictorySound, playGameOverSound, playLevelCompleteSound, stopScrubbingSound]);

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
    if (!dragRef.current) {
      stopScrubbingSound();
      return;
    }
    if (!touchingCat) return;
    if (distance < 1.4) return;
    playScrubbingSound();

    if (moodRef.current === "watching") {
      if (performance.now() < turnGraceUntilRef.current) return;
      finishGame("gameover", cleanlinessRef.current);
      return;
    }
    if (moodRef.current !== "safe") return;

    const gain = levelRef.current === 1
      ? clamp(distance * 0.18, 0.6, 4.5)
      : clamp(distance * 0.025, 0.075, 0.67);
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
  }, [addBubble, finishGame, playScrubbingSound, stopScrubbingSound]);

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
    stopScrubbingSound();
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
    hasStartedRef.current = true;
    if (musicEnabled) playBackgroundMusic();
    levelRef.current = nextLevel;
    setLevel(nextLevel);
    cleanlinessRef.current = 0;
    setCleanliness(0);
    setBubbles([]);
    moodRef.current = "safe";
    turnGraceUntilRef.current = 0;
    previousTurnPaceRef.current = null;
    doubleTurnCountRef.current = 0;
    setMood("safe");
    statusRef.current = "playing";
    setStatus("playing");
    stopScrubbingSound();
    stopLevelCompleteSound();
    stopFinalVictorySound();
    stopGameOverSound();
    setSponge({ x: 28, y: 56, angle: -12, active: false });
    lastPointRef.current = { x: 28, y: 56 };
  };

  const returnHome = () => {
    dragRef.current = false;
    levelRef.current = 1;
    cleanlinessRef.current = 0;
    moodRef.current = "safe";
    turnGraceUntilRef.current = 0;
    previousTurnPaceRef.current = null;
    doubleTurnCountRef.current = 0;
    setLevel(1);
    setCleanliness(0);
    setBubbles([]);
    setMood("safe");
    statusRef.current = "idle";
    setStatus("idle");
    stopScrubbingSound();
    stopLevelCompleteSound();
    stopFinalVictorySound();
    stopGameOverSound();
    setSponge({ x: 28, y: 56, angle: -12, active: false });
    lastPointRef.current = { x: 28, y: 56 };
  };

  const pauseGame = () => {
    stopDragging();
    moodRef.current = "safe";
    turnGraceUntilRef.current = 0;
    setMood("safe");
    statusRef.current = "paused";
    setStatus("paused");
  };

  const resumeGame = () => {
    statusRef.current = "playing";
    setStatus("playing");
  };

  const moodCopy = mood === "safe"
    ? "现在可以洗"
    : "Seven 回头了，快停！";
  const stageLabel = level === 1 ? "第一关" : "最后一关";

  return (
    <main className="game-shell" onClickCapture={handleButtonClick}>
      {/* This track is instrumental background music, so captions do not apply. */}
      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
      <audio
        ref={backgroundMusicRef}
        src={`${__PUBLIC_BASE_PATH__}/assets/audio/background-music.mp3`}
        loop
        preload="auto"
        aria-hidden="true"
      />
      {/* This effect contains no speech, so captions do not apply. */}
      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
      <audio
        ref={scrubbingSoundRef}
        src={`${__PUBLIC_BASE_PATH__}/assets/audio/scrubbing.mp3`}
        loop
        preload="auto"
        aria-hidden="true"
      />
      {/* This effect contains no speech, so captions do not apply. */}
      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
      <audio
        ref={levelCompleteSoundRef}
        src={`${__PUBLIC_BASE_PATH__}/assets/audio/level-complete.mp3`}
        preload="auto"
        aria-hidden="true"
      />
      {/* This effect contains no speech, so captions do not apply. */}
      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
      <audio
        ref={finalVictorySoundRef}
        src={`${__PUBLIC_BASE_PATH__}/assets/audio/final-victory.mp3`}
        preload="auto"
        aria-hidden="true"
      />
      {/* This effect contains no speech, so captions do not apply. */}
      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
      <audio
        ref={gameOverSoundRef}
        src={`${__PUBLIC_BASE_PATH__}/assets/audio/game-over.mp3`}
        preload="auto"
        aria-hidden="true"
      />
      {/* CC0 button sound by pauliuw, sourced from OpenGameArt. */}
      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
      <audio
        ref={buttonSoundRef}
        src={`${__PUBLIC_BASE_PATH__}/assets/audio/button-pop.mp3`}
        preload="auto"
        aria-hidden="true"
      />
      <section className="game-card" aria-label="老七，该洗澡了">
        <header className="game-header">
          <div className="title-block">
            <div className="title-meta">
              <p className="eyebrow">Seven&apos;s bath time</p>
              <button type="button" className="about-trigger" aria-haspopup="dialog" onClick={openAbout}>关于</button>
              <button type="button" className="sound-trigger" aria-haspopup="dialog" onClick={() => { setShowAbout(false); setShowSoundSettings(true); }}>设置</button>
            </div>
            <h1>老七，该洗澡了</h1>
          </div>
          <div className="score-group">
            <div className={`stage-meter${level === 2 ? " stage-final" : ""}`}><strong>{stageLabel}</strong></div>
            <div className="best-score"><span>本关最好</span><strong>{bestScores[level]}%</strong></div>
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
          <div className="progress-hud" aria-label={`清洁进度 ${Math.round(cleanliness)}%`}>
            <div className="progress-track" aria-hidden="true"><span style={{ width: `${cleanliness}%` }} /></div>
            <strong className="progress-value"><span>清洁度</span>{Math.round(cleanliness)}%</strong>
          </div>
          <div
            className="shower-fixture"
            style={{ backgroundImage: `url("${__PUBLIC_BASE_PATH__}/assets/bath/shower-fixture.svg?v=1")` }}
            aria-hidden="true"
          />
          <div className="cat" aria-label="浴缸里的 Seven">
            <div
              className="cat-layer cat-body-photo"
              style={{ backgroundImage: `url("${__PUBLIC_BASE_PATH__}/assets/seven/cat-body.webp?v=1")` }}
            />
            {mood === "watching" && <div
              className="cat-head-turn"
              style={{ backgroundImage: `url("${__PUBLIC_BASE_PATH__}/assets/seven/cat-head-turn.webp?v=1")` }}
            />}
          </div>
          {bubbles.map((bubble) => (
            <i key={bubble.id} className="foam-particle" style={{ left: `${bubble.x}%`, top: `${bubble.y}%`, width: bubble.size, height: bubble.size, "--drift": `${bubble.drift}px` } as React.CSSProperties} />
          ))}
          <div className="sponge" style={{ left: `${sponge.x}%`, top: `${sponge.y}%`, transform: `translate(-50%, -50%) rotate(${sponge.angle}deg)` }} aria-label="浴球"><span /></div>
          <div className="tub"><span className="water-line" /><span className="tub-shine" /></div>
          <div
            className="duck-sticker"
            style={{ backgroundImage: `url("${__PUBLIC_BASE_PATH__}/assets/bath/rubber-duck.svg?v=1")` }}
            aria-hidden="true"
          />
          {status === "playing" && <div className={`mood-badge mood-badge-${mood}`} aria-live="polite">{moodCopy}</div>}
          {status !== "playing" && (
            <div className={`game-overlay overlay-${status}`}>
              <div className="overlay-card">
                <span className="overlay-icon" aria-hidden="true">{status === "won" ? "✨" : status === "levelcomplete" ? "👏" : status === "gameover" ? "😾" : status === "paused" ? "⏸️" : "🫧"}</span>
                <h2>{status === "won" ? "两关全通！" : status === "levelcomplete" ? "第一关完成！" : status === "gameover" ? "Seven 生气了！" : status === "paused" ? "游戏已暂停" : "准备好洗澡了吗？"}</h2>
                <p>{status === "won" ? "Seven 终于洗香香了!" : status === "levelcomplete" ? "难度飙升！别笑，你也过不了第二关！！！" : status === "gameover" ? `第 ${level} 关清洁度 ${Math.round(cleanliness)}%。Seven 回头时要立刻停手。` : status === "paused" ? `第 ${level} 关已暂停，当前清洁度 ${Math.round(cleanliness)}%。` : "第一关很轻松，先熟悉搓洗和停手；通过后再挑战高难度第二关。"}</p>
                {status === "paused" ? (
                  <div className="overlay-actions">
                    <button type="button" className="secondary-button" onClick={returnHome}>返回主界面</button>
                    <button type="button" className="secondary-button" onClick={() => beginLevel(level)}>重新开始</button>
                    <button type="button" onClick={resumeGame}>继续</button>
                  </div>
                ) : (
                  <button type="button" onClick={() => beginLevel(status === "levelcomplete" ? 2 : status === "won" ? 1 : level)}>{status === "idle" ? "开始第一关" : status === "levelcomplete" ? "挑战最后一关" : status === "won" ? "再玩一遍" : `重试第 ${level} 关`}</button>
                )}
              </div>
            </div>
          )}
        </div>

        <footer className="game-footer">
          <p><strong>第 {level} 关：</strong>{level === 1 ? "看到 Seven 回头就停手，会留一点反应时间。" : "难度飙升！别笑，你也过不了第二关！！！"}</p>
          <div className="footer-actions">
            {status === "playing" && <button type="button" className="pause-button" onClick={pauseGame}>暂停</button>}
            <span className="status-pill">拖动浴球 · 回头就松手</span>
          </div>
        </footer>
        {showAbout && (
          <div className="about-overlay">
            <section className="about-card" role="dialog" aria-modal="true" aria-labelledby="about-title">
              <span
                className="about-game-icon"
                style={{ backgroundImage: `url("${__PUBLIC_BASE_PATH__}/assets/brand/game-icon-192.png")` }}
                aria-hidden="true"
              />
              <h2 id="about-title">关于 SEVEN 爱洗澡</h2>
              <p>这是一款围绕 Seven 洗澡日常制作的轻量互动小游戏。</p>
              <p className="about-notice">部分素材源自王姐和她的狗，仅供娱乐、交流与学习使用。</p>
              <button type="button" onClick={() => setShowAbout(false)}>知道了</button>
            </section>
          </div>
        )}
        {showSoundSettings && (
          <div className="about-overlay">
            <section className="about-card sound-settings-card" role="dialog" aria-modal="true" aria-labelledby="sound-settings-title">
              <span className="sound-settings-icon" aria-hidden="true">♫</span>
              <h2 id="sound-settings-title">声音设置</h2>
              <div className="sound-settings-list">
                <div className="sound-setting-row">
                  <div><strong>背景音乐</strong><span>控制游戏中的循环音乐</span></div>
                  <button type="button" className={`sound-toggle${musicEnabled ? " is-on" : ""}`} role="switch" aria-label="背景音乐" aria-checked={musicEnabled} onClick={toggleMusic}><span aria-hidden="true" /></button>
                </div>
                <div className="sound-setting-row">
                  <div><strong>游戏音效</strong><span>控制操作和状态提示音</span></div>
                  <button type="button" className={`sound-toggle${soundEffectsEnabled ? " is-on" : ""}`} role="switch" aria-label="游戏音效" aria-checked={soundEffectsEnabled} onClick={toggleSoundEffects}><span aria-hidden="true" /></button>
                </div>
              </div>
              <p className="sound-settings-note">设置会保存在当前浏览器中。</p>
              <button type="button" onClick={() => setShowSoundSettings(false)}>完成</button>
            </section>
          </div>
        )}
      </section>
    </main>
  );
}
