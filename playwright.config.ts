import { defineConfig, devices } from "@playwright/test";

/** Dedicated port so e2e does not reuse a stale or foreign dev server on 5173. */
const E2E_WEB_PORT = process.env.PLAYWRIGHT_WEB_PORT ?? "5199";
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? `http://127.0.0.1:${E2E_WEB_PORT}`;

export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  retries: process.env.CI ? 1 : 1,
  workers: process.env.CI ? undefined : 2,
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      testIgnore: [/visual-validation\.spec\.ts$/, /visual-studio-probe\.spec\.ts$/, /studio-manual-screenshots\.spec\.ts$/],
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "chromium-visual",
      testMatch: [/visual-validation\.spec\.ts$/, /visual-studio-probe\.spec\.ts$/, /studio-manual-screenshots\.spec\.ts$/],
      fullyParallel: false,
      workers: 1,
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: process.env.CI
    ? undefined
    : [
        {
          command: "cd apps/api && uv run uvicorn app.main:app --host 127.0.0.1 --port 8000",
          url: "http://127.0.0.1:8000/health",
          reuseExistingServer: true,
          timeout: 120_000,
        },
        {
          command: `pnpm --filter @pumpstation/web dev --host 127.0.0.1 --port ${E2E_WEB_PORT} --strictPort`,
          url: baseURL,
          reuseExistingServer: false,
          timeout: 120_000,
        },
      ],
});
