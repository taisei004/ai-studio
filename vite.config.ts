import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";
export default defineConfig({
  plugins: [tailwindcss()],
  server: {
    host: "127.0.0.1",
    port: 5176,
    strictPort: true,
    proxy: {
      "/api": { target: "http://127.0.0.1:4317", changeOrigin: false },
      "/auth": { target: "http://127.0.0.1:4317", changeOrigin: false },
    },
  },
  build: { chunkSizeWarningLimit: 600 },
});
