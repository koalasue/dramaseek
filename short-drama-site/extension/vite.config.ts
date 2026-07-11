import { defineConfig } from "vite";
import { copyFileSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

export default defineConfig({
  build: { outDir: resolve(__dirname, "dist"), emptyOutDir: true, rollupOptions: { input: { background: resolve(__dirname,"src/background.ts"), content: resolve(__dirname,"src/content.ts"), offscreen: resolve(__dirname,"src/offscreen.html") }, output: { entryFileNames: "[name].js", chunkFileNames: "chunks/[name]-[hash].js" } } },
  plugins: [{ name: "copy-extension-assets", closeBundle() { mkdirSync(resolve(__dirname,"dist"),{recursive:true});copyFileSync(resolve(__dirname,"manifest.json"),resolve(__dirname,"dist/manifest.json"));writeFileSync(resolve(__dirname,"dist/offscreen.html"),'<!doctype html><html><head><meta charset="utf-8"></head><body><script type="module" src="./offscreen.js"></script></body></html>'); } }]
});
