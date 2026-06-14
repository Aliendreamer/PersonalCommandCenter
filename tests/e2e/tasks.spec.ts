import { test, expect } from '@playwright/test'

// Tasks plugin against the live stack (SSR-BFF + Radicale /pcc/tasks/). Browser only talks to app./
// keycloak. Prereqs: `docker compose up -d` with radicale + the realm imported. See README.md.

const APP = process.env.PCC_APP_URL ?? 'http://app.pcc.localhost'
const USER = process.env.PCC_TEST_USER ?? 'testuser'
const PASS = process.env.PCC_TEST_PASS ?? 'Test123!'

test('tasks: SSR page + create / complete / delete through the BFF, app-only', async ({ page }) => {
  const foreign: string[] = []
  page.on('request', (req) => {
    const host = new URL(req.url()).host
    if (!/(^|\.)pcc\.localhost$/.test(host)) {
      return
    }
    if (!host.startsWith('app.') && !host.startsWith('keycloak.')) {
      foreign.push(host)
    }
  })

  // Log in.
  await page.goto(`${APP}/`, { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('#username', { timeout: 30_000 })
  await page.fill('#username', USER)
  await page.fill('#password', PASS)
  await page.click('#kc-login')
  await page.waitForURL(/app\.pcc\.localhost/, { timeout: 30_000 })

  // The plugin contributes a "Tasks" nav entry.
  await expect(page.getByRole('link', { name: 'Tasks' }).first()).toBeVisible({ timeout: 15_000 })

  // /tasks is server-rendered.
  await page.goto(`${APP}/tasks`, { waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('heading', { name: 'Tasks' })).toBeVisible()
  await page.waitForLoadState('networkidle')

  async function addTask(title: string) {
    await expect(async () => {
      await page.getByRole('button', { name: 'Add task' }).click()
      await expect(page.getByLabel('Title')).toBeVisible({ timeout: 2000 })
    }).toPass({ timeout: 20_000 })
    await page.getByLabel('Title').fill(title)
    await page.getByRole('button', { name: 'Add task' }).click()
    await expect(page.getByText(title)).toBeVisible({ timeout: 15_000 })
  }

  // 1. Create then delete (mutation → SSR server → core-api → Radicale) — leaves no residue.
  const toDelete = `E2E del ${Date.now()}`
  await addTask(toDelete)
  await page.locator('li', { hasText: toDelete }).getByRole('button', { name: 'Delete' }).click()
  await expect(page.getByText(toDelete)).toHaveCount(0, { timeout: 15_000 })

  // 2. Create then complete → it drops off the default (open-only) list.
  const toComplete = `E2E done ${Date.now()}`
  await addTask(toComplete)
  // click (not check): completing removes the row from the open-only list, so check()'s
  // post-condition (element stays checked) would never settle.
  await page.getByRole('checkbox', { name: `Complete ${toComplete}` }).click()
  await expect(page.getByText(toComplete)).toHaveCount(0, { timeout: 15_000 })

  expect(foreign, `browser hit non-app hosts: ${foreign.join(', ')}`).toEqual([])
})
