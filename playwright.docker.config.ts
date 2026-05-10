import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright E2E Configuration — Docker Environment
 *
 * This config is used when running e2e tests inside Docker via:
 *   docker compose run --rm e2e
 *
 * Key differences from the local config:
 * - baseURL points to the `dev` service (Docker internal network)
 * - No webServer option (the dev service is managed by docker-compose)
 */
export default defineConfig({
  testDir: './e2e',
  outputDir: './e2e/test-results',

  timeout: 30_000,
  forbidOnly: true,
  retries: 1,
  reporter: 'list',

  use: {
    baseURL: process.env.BASE_URL || 'http://dev:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  /* No webServer — the dev service is started by docker-compose */

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
