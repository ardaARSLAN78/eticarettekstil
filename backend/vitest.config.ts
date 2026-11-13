import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: {
    alias: [
      {
        find: /^graphql$/,
        replacement: fileURLToPath(new URL("../node_modules/graphql/index.js", import.meta.url)),
      },
    ],
  },
  test: {
    environment: "node",
    setupFiles: ["./tests/environment.ts"],
    fileParallelism: false,
    testTimeout: 30000,
    hookTimeout: 60000,
    include: ["tests/**/*.test.ts"],
  },
});
