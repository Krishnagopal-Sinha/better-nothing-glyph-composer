import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { chunkSplitPlugin } from "vite-plugin-chunk-split";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    chunkSplitPlugin({
      strategy: "unbundle",
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  optimizeDeps: {
    exclude: ["@ffmpeg/ffmpeg"],
  },
});
