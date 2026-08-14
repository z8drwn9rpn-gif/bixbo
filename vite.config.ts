import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";
import tsconfigPaths from "vite-tsconfig-paths";
import { suksukFixPlugin } from "./src/build/suksukFixPlugin";
import { bixboIconMigrationPlugin } from "./src/build/bixboIconMigrationPlugin";

export default defineConfig({
  plugins: [
    tsconfigPaths(),
    tailwindcss(),
    tanstackStart({
      server: {
        entry: "server",
      },
    }),
    nitro(),
    viteReact(),
    suksukFixPlugin(),
    bixboIconMigrationPlugin(),
  ],
});
