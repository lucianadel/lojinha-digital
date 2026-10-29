import { defineConfig } from "vitest/config";
import { loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => ({
  define: {"import.meta.env.VITE_VISUAL_PREVIEW": JSON.stringify(loadEnv(mode, ".", "VERCEL_").VERCEL_ENV === "preview" ? "true" : "false")},
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: "./src/test/setup.ts",
  },
}));
