import { defineConfig } from '@playwright/test';

// Scenario tests: a real browser clicks through the built app and checks what a person would see.
// No AI is involved and nothing is sent anywhere. The app runs on the made-up league in
// src/sample, whose clock is frozen, so every run sees exactly the same league and the checks
// can be exact ("Left & Right are 5th with 17 points").
//
//   npm test               build the app, then run every scenario
//   npm run test:report    open the report from the last run (screenshots of any failure)
const PORT = 4173;

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  // A scenario that only passes on a second try is hiding a real problem, so there are no retries.
  retries: 0,
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'test-report' }]],
  outputDir: 'test-results',
  timeout: 30_000,
  expect: { timeout: 5_000 },
  use: {
    baseURL: `http://localhost:${PORT}`,
    // A phone, because that is what players and the organizer hold on league night.
    viewport: { width: 390, height: 844 },
    colorScheme: 'dark',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure'
  },
  // Builds the app (which also type-checks it) and serves the result, the same files that get published.
  webServer: {
    command: `npm run build && npx vite preview --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: false,
    timeout: 180_000
  }
});
