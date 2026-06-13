import { defineConfig } from '@playwright/test'

// Standalone E2E suite (not part of the pnpm workspace): it drives the live stack, so it is
// run on demand, not in the unit-test gates. See README.md.
export default defineConfig({
  testDir: '.',
  timeout: 60_000,
  fullyParallel: false,
  reporter: [['list']],
  use: {
    headless: true,
    screenshot: 'only-on-failure',
  },
})
