import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  base: "./",
  server: {
    host: "::",
    port: 8080,
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          const normalizedId = id.replace(/\\/g, "/");

          if (normalizedId.includes("/node_modules/three/")) {
            return "three";
          }

          if (
            normalizedId.includes("/node_modules/react/") ||
            normalizedId.includes("/node_modules/react-dom/") ||
            normalizedId.includes("/node_modules/react-router/") ||
            normalizedId.includes("/node_modules/react-router-dom/") ||
            normalizedId.includes("/node_modules/@tanstack/")
          ) {
            return "react-vendor";
          }

          if (
            normalizedId.includes("/node_modules/@radix-ui/") ||
            normalizedId.includes("/node_modules/lucide-react/") ||
            normalizedId.includes("/node_modules/class-variance-authority/") ||
            normalizedId.includes("/node_modules/clsx/") ||
            normalizedId.includes("/node_modules/tailwind-merge/")
          ) {
            return "ui-vendor";
          }

          if (
            normalizedId.includes("/src/data/maps.ts") ||
            normalizedId.includes("/src/data/mapGenerator.ts") ||
            normalizedId.includes("/src/content/regions/")
          ) {
            return "game-world-content";
          }

          if (
            normalizedId.includes("/src/data/dialogues.ts") ||
            normalizedId.includes("/src/data/quests.ts") ||
            normalizedId.includes("/src/data/vendors.ts") ||
            normalizedId.includes("/src/content/campaign/")
          ) {
            return "game-interaction-content";
          }

          if (normalizedId.includes("/src/data/")) {
            return "game-runtime-data";
          }
        },
      },
    },
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
