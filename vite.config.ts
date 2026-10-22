import { defineConfig } from "vite";

export default defineConfig({
  // Relative base so the built site works from any folder or static host.
  base: "./",
  build: { chunkSizeWarningLimit: 1500 },
});
