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
  await assert.rejects(access(new URL("seven-bath-time/_next", outputUrl)));
});
