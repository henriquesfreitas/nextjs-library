import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

/**
 * Vitest Configuration
 *
 * This config mirrors the path aliases defined in tsconfig.json so that
 * test files can use the same `@/` import prefix as application code.
 *
 * The @vitejs/plugin-react plugin enables JSX transformation in tests,
 * which is required for component tests using React Testing Library.
 *
 * jsdom provides a browser-like DOM environment for component tests
 * without needing an actual browser.
 */
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: [],
    include: ["src/**/*.test.{ts,tsx}"],
  },
});
