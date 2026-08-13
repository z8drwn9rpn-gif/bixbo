// Lovable's TanStack wrapper already configures:
// - tanstackStart()
// - React/Vite integration
// - Tailwind
// - route/plugin wiring
// - @ alias
// - Lovable preview/build settings
//
// Do NOT add tanstackStart() manually here — doing so creates duplicate
// TanStack Start route-tree plugins and can break production builds.

import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import type { Plugin } from "vite";

function bixboBuildVersionPlugin(buildId: string): Plugin {
  return {
    name: "bixbo-build-version",
    apply: "build",
    generateBundle() {
      this.emitFile({
        type: "asset",
        fileName: "bixbo-build.json",
        source: JSON.stringify({ id: buildId }),
      });
    },
  };
}

const buildId =
  process.env.GITHUB_SHA ??
  process.env.VERCEL_GIT_COMMIT_SHA ??
  process.env.COMMIT_SHA ??
  `${Date.now()}`;

export default defineConfig({
  define: {
    __BIXBO_BUILD_ID__: JSON.stringify(buildId),
  },
  plugins: [bixboBuildVersionPlugin(buildId)],
  tanstackStart: {
    server: {
      entry: "server",
    },
  },
});
