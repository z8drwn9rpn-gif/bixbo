import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import { nitro } from "nitro/vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import viteTsConfigPaths from "vite-tsconfig-paths";
import { bixboIconMigrationPlugin } from "./src/build/bixboIconMigrationPlugin";

export default defineConfig({
  plugins: [
    viteTsConfigPaths({ projects: ["./tsconfig.json"] }),
    bixboIconMigrationPlugin(),
    tanstackStart(),
    nitro({ preset: "cloudflare-module" }),
    viteReact(),
    tailwindcss(),
  ],
});
