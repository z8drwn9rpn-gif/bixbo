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
import { mcpPlugin } from "@lovable.dev/mcp-js/stacks/tanstack/vite";

export default defineConfig({
  plugins: [mcpPlugin()],
  tanstackStart: {
    server: {
      entry: "server",
    },
  },
});
