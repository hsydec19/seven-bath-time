import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
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
  assert.match(html, /<title>seven该洗澡了<\/title>/i);
  assert.match(html, /准备好洗澡了吗？/);
  assert.match(html, /开始第一关/);
  assert.match(html, /清洁度/);
  assert.doesNotMatch(html, /codex-preview|Your site is taking shape|react-loading-skeleton/i);
});

test("includes the complete risk-and-reward game loop", async () => {
  const source = await readFile(new URL("../app/BathGame.tsx", import.meta.url), "utf8");
  assert.match(source, /type CatMood = "safe" \| "watching"/);
  assert.match(source, /type GameStatus = .*"paused"/);
  assert.match(source, /finishGame\("gameover"/);
  assert.match(source, /levelRef\.current === 1 \? "levelcomplete" : "won"/);
  assert.match(source, /finishGame\(result, 100\)/);
  assert.match(source, /seven-bath-best/);
  assert.match(source, /onPointerMove/);
  assert.match(source, /onKeyDown/);
});
