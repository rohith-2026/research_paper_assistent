import { defineConfig, devices } from '@playwright/test';

const baseURL = process.env.PW_BASE_URL || 'http://127.0.0.1:5173';

export default defineConfig({
  testDir: './tests',
  timeout: 120000,
  expect: { timeout: 20000 },
  retries: 0,
  use: {
    baseURL,
    trace: 'on-first-retry',
  },
  webServer: {
    command: 'npm run dev -- --host 127.0.0.1 --port 5173',
    url: baseURL,
    reuseExistingServer: true,
    timeout: 120000,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
