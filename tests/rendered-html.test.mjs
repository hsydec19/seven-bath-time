import assert from "node:assert/strict";
import { readFile, readdir, stat } from "node:fs/promises";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);
  return worker.fetch(
    new Request("http://localhost/", { headers: { accept: "text/html" } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

test("renders the Seven bath game landing state", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);
  const html = await response.text();
  assert.match(html, /<title>SEVEN 爱洗澡<\/title>/i);
  assert.match(html, /href="\/assets\/brand\/game-icon-64\.png"/i);
  assert.match(html, /href="\/assets\/brand\/apple-touch-icon\.png"/i);
  assert.match(html, /<h1>老七，该洗澡了<\/h1>/i);
  assert.match(html, /aria-haspopup="dialog"[^>]*>关于<\/button>/i);
  assert.match(html, /aria-haspopup="dialog"[^>]*>设置<\/button>/i);
  assert.match(html, /准备好洗澡了吗？/);
  assert.match(html, /开始第一关/);
  assert.match(html, /<strong>第一关<\/strong>/);
  assert.match(html, /清洁度/);
  assert.match(html, /\/assets\/audio\/background-music\.mp3/);
  assert.match(html, /\/assets\/audio\/scrubbing\.mp3/);
  assert.match(html, /\/assets\/audio\/level-complete\.mp3/);
  assert.match(html, /\/assets\/audio\/final-victory\.mp3/);
  assert.match(html, /\/assets\/audio\/game-over\.mp3/);
  assert.match(html, /\/assets\/audio\/button-pop\.mp3/);
  assert.doesNotMatch(html, /codex-preview|Your site is taking shape|react-loading-skeleton/i);
});

test("includes the complete risk-and-reward game loop", async () => {
  const source = await readFile(new URL("../app/BathGame.tsx", import.meta.url), "utf8");
  assert.match(source, /type CatMood = "safe" \| "watching"/);
  assert.match(source, /type GameStatus = .*"paused"/);
  assert.match(source, /finishGame\("gameover"/);
  assert.match(source, /levelRef\.current === 1 \? "levelcomplete" : "won"/);
  assert.match(source, /finishGame\(result, 100\)/);
  assert.match(source, /levelRef\.current === 1\s*\? clamp\(distance \* 0\.18, 0\.6, 4\.5\)/);
  assert.match(source, /: clamp\(distance \* 0\.025, 0\.075, 0\.67\)/);
  assert.match(source, /paceRoll < 0\.65 \? "normal" : paceRoll < 0\.85 \? "sudden" : "long"/);
  assert.match(source, /previousTurnPaceRef\.current === "sudden"/);
  assert.match(source, /isDoubleTurn\s*\? 650 \+ Math\.random\(\) \* 250/);
  assert.match(source, /doubleTurnCountRef\.current < 2/);
  assert.match(source, /Math\.random\(\) < 0\.14/);
  assert.match(source, /FINAL_LEVEL_REACTION_GRACE_MS = 200/);
  assert.doesNotMatch(source, /FIRST_LEVEL_MIN_SCRUB_MS|firstLevelMinimumMet/);
  assert.match(source, /seven-bath-best/);
  assert.match(source, /onPointerMove/);
  assert.match(source, /onKeyDown/);
  assert.match(source, /cat-body\.webp/);
  assert.match(source, /cat-head-turn\.webp/);
  assert.match(source, /mood === "watching"/);
  assert.match(source, /className="progress-value"/);
  assert.match(source, /拖动浴球 · 回头就松手/);
  assert.match(source, /level === 1 \? "第一关" : "最后一关"/);
  assert.match(source, /"挑战最后一关"/);
  assert.doesNotMatch(source, /"挑战第二关"/);
  assert.match(source, /"Seven 终于洗香香了!"/);
  assert.doesNotMatch(source, /你顶住了最后的极限节奏/);
  assert.match(source, /关于 SEVEN 爱洗澡/);
  assert.match(source, /className="about-game-icon"/);
  assert.match(source, /assets\/brand\/game-icon-192\.png/);
  assert.doesNotMatch(source, /className="about-icon"[^>]*>🛁/);
  assert.match(source, /部分素材源自王姐和她的狗，仅供娱乐、交流与学习使用/);
  assert.match(source, /role="dialog" aria-modal="true"/);
  assert.match(source, /seven-bath-music-enabled/);
  assert.match(source, /seven-bath-sfx-enabled/);
  assert.match(source, /backgroundMusicRef/);
  assert.match(source, /audio\.volume = 0\.28/);
  assert.match(source, /assets\/audio\/background-music\.mp3/);
  assert.match(source, /scrubbingSoundRef/);
  assert.match(source, /audio\.volume = 0\.42/);
  assert.match(source, /assets\/audio\/scrubbing\.mp3/);
  assert.match(source, /stopScrubbingSound/);
  assert.match(source, /if \(!touchingCat\) return;/);
  assert.match(source, /levelCompleteSoundRef/);
  assert.match(source, /audio\.volume = 0\.68/);
  assert.match(source, /nextStatus === "levelcomplete"\) playLevelCompleteSound/);
  assert.match(source, /assets\/audio\/level-complete\.mp3/);
  assert.match(source, /finalVictorySoundRef/);
  assert.match(source, /audio\.volume = 0\.72/);
  assert.match(source, /nextStatus === "won"\) playFinalVictorySound/);
  assert.match(source, /assets\/audio\/final-victory\.mp3/);
  assert.match(source, /gameOverSoundRef/);
  assert.match(source, /audio\.volume = 0\.7/);
  assert.match(source, /nextStatus === "gameover"\) playGameOverSound/);
  assert.match(source, /assets\/audio\/game-over\.mp3/);
  assert.match(source, /buttonSoundRef/);
  assert.match(source, /audio\.volume = 0\.3/);
  assert.match(source, /onClickCapture=\{handleButtonClick\}/);
  assert.match(source, /const openAbout = \(\) => \{[^}]*playFinalVictorySound\(\);[^}]*setShowAbout\(true\);/s);
  assert.match(source, /assets\/audio\/button-pop\.mp3/);
  assert.match(source, /loop\s+preload="metadata"/);
  assert.match(source, /role="switch"[^>]*aria-checked=\{musicEnabled\}/);
  assert.match(source, /role="switch"[^>]*aria-checked=\{soundEffectsEnabled\}/);
  assert.doesNotMatch(source, /label: "教学"|label: "警觉"|label: "危险"|label: "极限"/);
  assert.match(source, /assets\/bath\/shower-fixture\.svg/);
  assert.match(source, /assets\/bath\/rubber-duck\.svg/);
  assert.doesNotMatch(source, /assets\/seven\/[^"`]*\.png/);
  assert.doesNotMatch(source, /className="clean-meter"/);
  assert.doesNotMatch(source, /className="shower-pipe"/);
  assert.doesNotMatch(source, /className="duck"/);
});

test("uses sliding sound preference switches", async () => {
  const css = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");
  assert.match(css, /\.sound-toggle\.is-on span\s*\{[^}]*translateX\(22px\)/s);
});

test("keeps the intended light palette when the system uses dark mode", async () => {
  const css = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");
  assert.match(css, /:root\s*\{[^}]*color-scheme:only light;/s);
});

test("adapts the game to mobile browser toolbars and narrow screens", async () => {
  const css = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");
  assert.match(css, /min-height:100dvh/);
  assert.match(css, /height:clamp\(380px,64dvh,440px\)/);
  assert.match(css, /env\(safe-area-inset-bottom\)/);
  assert.doesNotMatch(css, /min-height:480px/);
});

test("uses a compact first-screen overlay that leaves Seven visible", async () => {
  const css = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");
  assert.match(css, /\.overlay-idle\s*\{[^}]*align-items:end;/s);
  assert.match(css, /\.overlay-idle\s+\.overlay-card\s*\{[^}]*360px/s);
});

test("uses distinct display, body, and stable numeric typography", async () => {
  const css = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");
  const layout = await readFile(new URL("../app/layout.tsx", import.meta.url), "utf8");
  assert.match(css, /--font-display:/);
  assert.match(css, /--font-body:/);
  assert.match(css, /--font-number:/);
  assert.match(css, /font-variant-numeric:tabular-nums/);
  assert.match(css, /h1\s*\{[^}]*font-weight:800;[^}]*letter-spacing:-\.035em;/s);
  assert.match(css, /\.game-footer p\s*\{[^}]*font-weight:500;/s);
  assert.doesNotMatch(css, /SFMono-Regular|Consolas|Liberation Mono/);
  assert.match(css, /\.about-trigger\s*\{[^}]*color:#fff;[^}]*background:#f97d1c;/s);
  assert.match(css, /\.pause-button\s*\{[^}]*background:#ffd36a;/s);
  assert.doesNotMatch(layout, /next\/font\/google/);
});

test("aligns the turned head with the replacement body", async () => {
  const css = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");
  assert.match(css, /\.cat-head-turn\s*\{[^}]*left:12%;[^}]*top:7%;[^}]*width:34%;/s);
});

test("anchors the shower fixture behind the bathtub", async () => {
  const css = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");
  const shower = await readFile(new URL("../public/assets/bath/shower-fixture.svg", import.meta.url), "utf8");
  assert.match(css, /\.shower-fixture\s*\{[^}]*right:3%;[^}]*bottom:180px;[^}]*z-index:2;[^}]*width:144px;[^}]*aspect-ratio:190\/310;/s);
  assert.match(css, /@media \(max-width:640px\)[\s\S]*\.shower-fixture\s*\{[^}]*right:0;[^}]*bottom:140px;[^}]*width:84px;/);
  assert.match(shower, /落地式浴缸花洒/);
  assert.match(shower, /M158 286V96/);
  assert.match(shower, /rotate\(-11 78 57\)/);
});

test("ships compact WebP cat assets instead of public PNG sources", async () => {
  const assetUrl = new URL("../public/assets/seven/", import.meta.url);
  const [body, head, files] = await Promise.all([
    stat(new URL("cat-body.webp", assetUrl)),
    stat(new URL("cat-head-turn.webp", assetUrl)),
    readdir(assetUrl),
  ]);
  assert.ok(body.size < 200 * 1024, `cat body is unexpectedly large: ${body.size} bytes`);
  assert.ok(head.size < 150 * 1024, `cat head is unexpectedly large: ${head.size} bytes`);
  assert.deepEqual(files.filter((file) => file.endsWith(".png")), []);
});

test("ships a reasonably sized background music file", async () => {
  const music = await stat(new URL("../public/assets/audio/background-music.mp3", import.meta.url));
  assert.ok(music.size > 0, "background music is empty");
  assert.ok(music.size < 2 * 1024 * 1024, `background music is unexpectedly large: ${music.size} bytes`);
});

test("ships a reasonably sized scrubbing sound effect", async () => {
  const effect = await stat(new URL("../public/assets/audio/scrubbing.mp3", import.meta.url));
  assert.ok(effect.size > 0, "scrubbing sound effect is empty");
  assert.ok(effect.size < 1024 * 1024, `scrubbing sound effect is unexpectedly large: ${effect.size} bytes`);
});

test("ships a reasonably sized first-level completion sound", async () => {
  const effect = await stat(new URL("../public/assets/audio/level-complete.mp3", import.meta.url));
  assert.ok(effect.size > 0, "first-level completion sound is empty");
  assert.ok(effect.size < 1024 * 1024, `first-level completion sound is unexpectedly large: ${effect.size} bytes`);
});

test("ships a reasonably sized final victory sound", async () => {
  const effect = await stat(new URL("../public/assets/audio/final-victory.mp3", import.meta.url));
  assert.ok(effect.size > 0, "final victory sound is empty");
  assert.ok(effect.size < 1024 * 1024, `final victory sound is unexpectedly large: ${effect.size} bytes`);
});

test("ships a reasonably sized game-over sound", async () => {
  const effect = await stat(new URL("../public/assets/audio/game-over.mp3", import.meta.url));
  assert.ok(effect.size > 0, "game-over sound is empty");
  assert.ok(effect.size < 1024 * 1024, `game-over sound is unexpectedly large: ${effect.size} bytes`);
});

test("ships a compact CC0 button sound", async () => {
  const effect = await stat(new URL("../public/assets/audio/button-pop.mp3", import.meta.url));
  assert.ok(effect.size > 0, "button sound is empty");
  assert.ok(effect.size < 64 * 1024, `button sound is unexpectedly large: ${effect.size} bytes`);
});
