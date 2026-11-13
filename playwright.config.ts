import { defineConfig } from "@playwright/test";

// Bu takım tarayıcı açmadan Next.js → Express → PostgreSQL zincirini HTTP üzerinden sınar.
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  timeout: 30000,
  use: {
    baseURL: "http://localhost:3200",
    extraHTTPHeaders: { Origin: "http://localhost:3200", "x-quantia-request": "1" },
  },
  reporter: [["list"], ["html", { open: "never" }]],
});
