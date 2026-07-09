import { defineConfig } from "vite";
import { copyFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";

export default defineConfig({
  build: { outDir: "dist", emptyOutDir: true, rollupOptions: { input: { background: resolve(__dirname,"src/background.ts"), content: resolve(__dirname,"src/content.ts"), offscreen: resolve(__dirname,"src/offscreen.html") }, output: { entryFileNames: "[name].js", chunkFileNames: "chunks/[name]-[hash].js" } } },
  plugins: [{ name: "copy-manifest", closeBundle() { mkdirSync(resolve(__dirname,"dist"),{recursive:true});copyFileSync(resolve(__dirname,"manifest.json"),resolve(__dirname,"dist/manifest.json")); } }]
});
