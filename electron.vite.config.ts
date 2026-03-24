import { defineConfig } from "electron-vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";

const srcAlias = {
  "@": path.resolve(__dirname, "./src"),
};

const mainExternalDeps = [
  "electron",
  "better-sqlite3",
  "node-pty",
  "@anthropic-ai/claude-agent-sdk",
  "@openai/codex-sdk",
];

const preloadExternalDeps = [
  "electron",
];

export default defineConfig({
  main: {
    resolve: {
      alias: srcAlias,
    },
    build: {
      externalizeDeps: {
        include: mainExternalDeps,
      },
      rolldownOptions: {
        external: mainExternalDeps,
        input: {
          index: path.resolve(__dirname, "electron/main.ts"),
        },
      },
    },
  },
  preload: {
    resolve: {
      alias: srcAlias,
    },
    build: {
      externalizeDeps: {
        include: preloadExternalDeps,
      },
      rolldownOptions: {
        external: preloadExternalDeps,
        input: {
          index: path.resolve(__dirname, "electron/preload.ts"),
        },
        output: {
          format: "cjs",
          entryFileNames: "index.js",
        },
      },
    },
  },
  renderer: {
    root: ".",
    plugins: [react(), tailwindcss()],
    server: {
      host: "127.0.0.1",
      port: 4174,
      strictPort: true,
      watch: {
        ignored: ["**/.stave/**"],
      },
    },
    resolve: {
      alias: srcAlias,
    },
    build: {
      rolldownOptions: {
        input: path.resolve(__dirname, "index.html"),
      },
    },
  },
});
