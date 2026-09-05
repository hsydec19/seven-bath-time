import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const outputUrl = new URL("../dist/client/", import.meta.url);
const siteBasePath = "/seven-bath-time";

test("creates a GitHub Pages export under the repository base path", async () => {
  const html = await readFile(new URL("index.html", outputUrl), "utf8");

  assert.match(html, /准备好洗澡了吗？/);
  assert.match(html, /\/seven-bath-time\/_next\/static\//);
  assert.match(html, /\/seven-bath-time\/assets\/seven\/cat-body\.webp/);
  assert.match(html, /\/seven-bath-time\/assets\/bath\/shower-fixture\.svg/);
  assert.match(html, /\/seven-bath-time\/assets\/bath\/rubber-duck\.svg/);
  assert.match(html, /\/seven-bath-time\/assets\/brand\/game-icon-64\.png/);
  assert.match(html, /\/seven-bath-time\/assets\/brand\/apple-touch-icon\.png/);
  assert.match(html, /\/seven-bath-time\/assets\/audio\/background-music\.mp3/);
  assert.match(html, /\/seven-bath-time\/assets\/audio\/scrubbing\.mp3/);
  assert.match(html, /\/seven-bath-time\/assets\/audio\/level-complete\.mp3/);
  assert.match(html, /\/seven-bath-time\/assets\/audio\/final-victory\.mp3/);
  assert.match(html, /\/seven-bath-time\/assets\/audio\/game-over\.mp3/);
  assert.match(html, /\/seven-bath-time\/assets\/audio\/button-pop\.mp3/);
  assert.doesNotMatch(html, /(?:src|href)="\/_next\//);

  const publishedResources = [
    ...html.matchAll(/(?:src|href)="(\/seven-bath-time\/[^"?]+(?:\.css|\.js|\.woff2))[^"\s]*"/g),
  ].map((match) => match[1]);

  assert.ok(publishedResources.length > 0, "expected generated CSS, JavaScript, or font URLs");
  for (const resource of new Set(publishedResources)) {
    await access(new URL(resource.slice(siteBasePath.length + 1), outputUrl));
  }

  await access(new URL("assets/seven/cat-body.webp", outputUrl));
  await access(new URL("assets/seven/cat-head-turn.webp", outputUrl));
  await access(new URL("assets/bath/shower-fixture.svg", outputUrl));
  await access(new URL("assets/bath/rubber-duck.svg", outputUrl));
  await access(new URL("assets/brand/game-icon-64.png", outputUrl));
  await access(new URL("assets/brand/game-icon-192.png", outputUrl));
  await access(new URL("assets/brand/apple-touch-icon.png", outputUrl));
  await access(new URL("assets/audio/background-music.mp3", outputUrl));
  await access(new URL("assets/audio/scrubbing.mp3", outputUrl));
  await access(new URL("assets/audio/level-complete.mp3", outputUrl));
  await access(new URL("assets/audio/final-victory.mp3", outputUrl));
  await access(new URL("assets/audio/game-over.mp3", outputUrl));
  await access(new URL("assets/audio/button-pop.mp3", outputUrl));
  await assert.rejects(access(new URL("seven-bath-time/_next", outputUrl)));
});
