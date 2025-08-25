import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "node:path";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      events: path.resolve(__dirname, "node_modules/events/"),
      stream: path.resolve(
        __dirname,
        "node_modules/stream-browserify/index.js"
      ),
      buffer: path.resolve(__dirname, "node_modules/buffer/index.js"),
      http: path.resolve(__dirname, "node_modules/stream-http/index.js"),
      url: path.resolve(__dirname, "node_modules/url/url.js"),
    },
  },
  optimizeDeps: {
    include: [
      "events",
      "stream-browserify",
      "buffer",
      "process",
      "stream-http",
      "url",
    ],
  },
  define: {
    global: "globalThis",
  },
});
