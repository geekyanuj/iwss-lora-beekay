import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
export default defineConfig({
  base: "/",
  plugins: [react(), tailwindcss()],
  preview: {
    port: 3000,
    strictPort: false,
    host: "0.0.0.0",
  },
  server: {
    port: 3000,
    strictPort: false,
    host: "0.0.0.0",
    origin: "http://0.0.0.0:3000",
    // HMR configuration for Docker hot-reload
    hmr: {
      host: "localhost",
      port: 3000,
      protocol: "ws",
    },
  },
});
