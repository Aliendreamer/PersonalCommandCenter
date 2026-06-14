import { defineConfig } from '@playwright/test'

// Standalone E2E suite (not part of the pnpm workspace): it drives the live stack, so it is
// run on demand, not in the unit-test gates. See README.md.
export default defineConfig({
  testDir: '.',
  timeout: 60_000,
  fullyParallel: false,
  // One worker: the suite drives a single shared live stack, and the dev Radicale drops
  // connections under concurrent load — run the specs serially.
  workers: 1,
  reporter: [['list']],
  use: {
    headless: true,
    screenshot: 'only-on-failure',
  },
})
