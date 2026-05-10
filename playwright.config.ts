import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright E2E Test Configuration
 *
 * Runs end-to-end tests against the Next.js application.
 * The webServer option starts the dev server automatically before tests run.
 *
 * Usage:
 *   docker compose exec web npx playwright test
 *   docker compose exec web npx playwright test --ui
 */
export default defineConfig({
  testDir: './e2e',
  outputDir: './e2e/test-results',

  /* Maximum time one test can run */
  timeout: 30_000,

  /* Fail the build on CI if you accidentally left test.only in the source code */
  forbidOnly: !!process.env.CI,

  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,

  /* Reporter */
  reporter: process.env.CI ? 'github' : 'html',

  /* Shared settings for all projects */
  use: {
    baseURL: 'http://localhost:3000',
    /* Collect trace on first retry */
    trace: 'on-first-retry',
    /* Screenshot on failure */
    screenshot: 'only-on-failure',
  },

  /* Run the Next.js dev server before starting tests */
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
