// Lovable's TanStack wrapper configures TanStack Start, React/Vite, Tailwind,
// route/plugin wiring, the @ alias, and Lovable preview/publish build settings.
// Keep this wrapper even though production deploys to Cloudflare: the same build
// has already been verified to produce the .output layout consumed by Wrangler.

import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { suksukFixPlugin } from "./src/build/suksukFixPlugin";
import { bixboIconMigrationPlugin } from "./src/build/bixboIconMigrationPlugin";

export default defineConfig({
  plugins: [suksukFixPlugin(), bixboIconMigrationPlugin()],
  tanstackStart: {
    server: {
      entry: "server",
    },
  },
});
