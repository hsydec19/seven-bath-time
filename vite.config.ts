import vinext from "vinext";
import { defineConfig, type PluginOption } from "vite";

// macOS Seatbelt blocks FSEvents, so Codex previews need polling for HMR.
const isCodexSeatbeltSandbox = process.env.CODEX_SANDBOX === "seatbelt";

const localBindingConfig = {
  main: "./worker/index.ts",
  compatibility_flags: ["nodejs_compat"],
};

export default defineConfig(async () => {
  const deployTarget = process.env.DEPLOY_TARGET ?? "cloudflare";
  const isGitHubPages = deployTarget === "github";
  const publicBasePath = isGitHubPages ? "/seven-bath-time" : "";

  if (deployTarget !== "cloudflare" && deployTarget !== "github") {
    throw new Error(`Unsupported DEPLOY_TARGET: ${deployTarget}`);
  }

  // Keep Wrangler and Miniflare state project-local. These are non-secret tool
  // settings; application environment belongs in ignored `.env*` files.
  const platformPlugins: PluginOption[] = [];

  if (!isGitHubPages) {
    process.env.WRANGLER_WRITE_LOGS ??= "false";
    process.env.WRANGLER_LOG_PATH ??= ".wrangler/logs";
    process.env.MINIFLARE_REGISTRY_PATH ??= ".wrangler/registry";

    // Wrangler snapshots its log path while the Cloudflare plugin is imported.
    const { cloudflare } = await import("@cloudflare/vite-plugin");
    platformPlugins.push(
      cloudflare({
        viteEnvironment: { name: "rsc", childEnvironments: ["ssr"] },
        config: localBindingConfig,
      }),
    );
  }

  return {
    define: {
      __PUBLIC_BASE_PATH__: JSON.stringify(publicBasePath),
    },
    server: isCodexSeatbeltSandbox
      ? { watch: { useFsEvents: false, usePolling: true } }
      : undefined,
    plugins: [
      vinext({
        nextConfig: isGitHubPages
          ? {
              output: "export",
              assetPrefix: publicBasePath,
              trailingSlash: true,
              images: { unoptimized: true },
            }
          : {},
      }),
      ...platformPlugins,
    ],
  };
});
