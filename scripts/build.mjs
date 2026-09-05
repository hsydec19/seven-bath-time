import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, renameSync, rmdirSync } from "node:fs";
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

// vinext applies assetPrefix to both URLs and the output directory. GitHub
// Pages already mounts the artifact at /seven-bath-time/, so keeping this
// extra directory would make every _next request resolve one level too deep.
if (target === "github") {
  const clientDir = fileURLToPath(new URL("../dist/client/", import.meta.url));
  const nestedDir = fileURLToPath(
    new URL("../dist/client/seven-bath-time/", import.meta.url),
  );
  const nestedNextDir = fileURLToPath(
    new URL("../dist/client/seven-bath-time/_next/", import.meta.url),
  );
  const publishedNextDir = fileURLToPath(
    new URL("../dist/client/_next/", import.meta.url),
  );

  const windowsVinextShutdownAssertion =
    process.platform === "win32" &&
    (result.status === -1073740791 || result.status === 3221226505);
  const exportCompleted =
    existsSync(`${clientDir}/index.html`) && existsSync(nestedNextDir);

  if ((result.status === 0 || windowsVinextShutdownAssertion) && exportCompleted) {
    if (existsSync(publishedNextDir)) {
      throw new Error(`Unexpected existing GitHub Pages asset directory: ${publishedNextDir}`);
    }

    renameSync(nestedNextDir, publishedNextDir);
    if (readdirSync(nestedDir).length !== 0) {
      throw new Error(`Unexpected files left in GitHub Pages staging directory: ${nestedDir}`);
    }
    rmdirSync(nestedDir);

    if (windowsVinextShutdownAssertion) {
      console.warn("[build] Ignored vinext's Windows shutdown assertion after a complete static export.");
    }
    process.exit(0);
  }
}

process.exit(result.status ?? 1);
