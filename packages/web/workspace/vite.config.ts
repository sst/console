import { defineConfig } from "vite";
import solidPlugin from "vite-plugin-solid";
import { macaronVitePlugin } from "@macaron-css/vite";
import path from "path";

export default defineConfig({
  plugins: [macaronVitePlugin(), solidPlugin() as any],
  server: {
    port: 3000,
  },
  optimizeDeps: {
    esbuildOptions: {
      target: "es2020",
    },
  },
  build: {
    target: "esnext",
  },
  resolve: {
    alias: {
      "@console/functions": path.resolve(__dirname, "../../functions/src"),
      "@console/core": path.resolve(__dirname, "../../core/src"),
      $: path.resolve(__dirname, "./src"),
    },
  },
});
