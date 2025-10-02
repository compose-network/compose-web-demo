import react from "@vitejs/plugin-react";
import path from "path";
import { defineConfig } from "vite";
import { nodePolyfills } from "vite-plugin-node-polyfills";
import svgr from "vite-plugin-svgr";

export default defineConfig(({ mode }) => {
  return {
    worker: {
      format: "es",
    },
    build: {
      target: "es2022",
      outDir: "build",
      sourcemap: true,
      rollupOptions: {
        output: {
          sourcemapExcludeSources: true, // Ignore sources in node_modules
        },
      },
    },
    server: {
      port: 3000,
      open: true,
    },
    plugins: [
      react(),
      nodePolyfills({
        globals: {
          Buffer: mode === "production",
        },
      }),
      svgr(),
    ],
    define: {
      APP_VERSION: JSON.stringify(process.env.npm_package_version),
      ...(mode === "development" ? { global: {} } : undefined),
    },
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "src"),
      },
    },
    optimizeDeps: {
      esbuildOptions: {
        define: {
          "process.env.NODE_OPTIONS": '"--max-old-space-size=4096"',
        },
      },
    },
  };
});
