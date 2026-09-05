import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const supportedTargets = new Set(["cloudflare", "github"]);
const target = process.argv[2] ?? "cloudflare";

if (!supportedTargets.has(target)) {
  console.error(`Unsupported deployment target: ${target}`);
  process.exit(1);
}

const vinextCli = fileURLToPath(
  new URL("../node_modules/vinext/dist/cli.js", import.meta.url),
);
const result = spawnSync(process.execPath, [vinextCli, "build"], {
  env: { ...process.env, DEPLOY_TARGET: target },
  stdio: "inherit",
});

if (result.error) {
  throw result.error;
}

process.exit(result.status ?? 1);
