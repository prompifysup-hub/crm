import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { defineConfig } from "vite";

// https://vitejs.dev/config/
export default defineConfig({
  server: {
    port: 5173,
    host: true,
  },
  plugins: [react(), tailwindcss()],
  resolve: {
    dedupe: ["react-router", "react-router-dom"],
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
});
