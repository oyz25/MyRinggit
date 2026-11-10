import { readdirSync } from "node:fs";
import { resolve } from "node:path";
import { defineConfig } from "vite";

// Multi-page app: index.html plus every page in pages/ is its own entry point.
const pagesDir = resolve(import.meta.dirname, "pages");
const pageEntries = Object.fromEntries(
  readdirSync(pagesDir)
    .filter((file) => file.endsWith(".html"))
    .map((file) => [`pages/${file.replace(/\.html$/, "")}`, resolve(pagesDir, file)]),
);

export default defineConfig({
  base: "./",
  build: {
    rollupOptions: {
      input: {
        index: resolve(import.meta.dirname, "index.html"),
        ...pageEntries,
      },
    },
  },
});