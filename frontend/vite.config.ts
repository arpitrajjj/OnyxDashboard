import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// Vite config: build to ../static/dist so the Flask backend serves the SPA
// at the root path. Same-origin in production; dev proxy to localhost:5000.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    outDir: path.resolve(__dirname, "../static/dist"),
    emptyOutDir: true,
    sourcemap: false,
    chunkSizeWarningLimit: 1200,
  },
  server: {
    port: 5173,
    proxy: {
      "/api": "http://localhost:5000",
      "/healthz": "http://localhost:5000",
    },
  },
});
