import { defineConfig, devices } from '@playwright/test'
// BASE_URL targets an already running deployment (e.g. the Docker image) instead of the local preview.
const baseURL = process.env.BASE_URL ?? 'http://localhost:4173'
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  retries: 0,
  reporter: 'list',
  use: { baseURL, trace: 'retain-on-failure' },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
    { name: 'mobile', use: { ...devices['iPhone 13'], defaultBrowserType: 'chromium' } },
  ],
  webServer: process.env.BASE_URL
    ? undefined
    : {
        command: 'npm run preview',
        url: baseURL,
        reuseExistingServer: !process.env.CI,
      },
})
