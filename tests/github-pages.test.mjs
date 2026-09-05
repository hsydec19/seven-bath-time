import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const outputUrl = new URL("../dist/client/", import.meta.url);

test("creates a GitHub Pages export under the repository base path", async () => {
  const html = await readFile(new URL("index.html", outputUrl), "utf8");

  assert.match(html, /准备好洗澡了吗？/);
  assert.match(html, /\/seven-bath-time\/_next\/static\//);
  assert.match(html, /\/seven-bath-time\/assets\/seven\/cat-safe-full\.png/);
  assert.doesNotMatch(html, /(?:src|href)="\/_next\//);
  await access(new URL("assets/seven/cat-safe-full.png", outputUrl));
});
