import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const rootDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@": rootDir,
      // NextAuth ships ESM that imports extensionless Next subpaths. Vitest
      // externalises node_modules by default, so point them at the real files.
      "next/server": "next/server.js",
      "next/headers": "next/headers.js",
      "next/navigation": "next/navigation.js",
      "next/cache": "next/cache.js",
    },
  },
  test: {
    environment: "node",
    globals: true,
    include: ["__tests__/integration/**/*.test.ts"],
    globalSetup: ["__tests__/integration/global-setup.ts"],
    setupFiles: ["__tests__/integration/setup.ts"],
    server: {
      deps: {
        inline: ["next-auth", "@auth/core"],
      },
    },
    // Every test file truncates shared PostgreSQL tables, so files must not
    // run in parallel against the same database.
    fileParallelism: false,
    pool: "forks",
    testTimeout: 30_000,
    hookTimeout: 90_000,
    clearMocks: true,
    restoreMocks: true,
  },
});
