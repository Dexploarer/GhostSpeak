import { test, expect, type Page, type TestInfo } from '@playwright/test'

type StorageSnapshot = {
  localStorage: Record<string, string>
  sessionStorage: Record<string, string>
}

type JourneySnapshot = {
  name: string
  url: string
  title: string
  timestamp: string
  cookies: Array<{ name: string; value: string; domain: string; path: string }>
  storage: StorageSnapshot
  notes?: string
}

const INTERACTIVE = process.env.INTERACTIVE === '1'
const MANUAL_WAIT_MS = Number(process.env.MANUAL_WAIT_MS ?? 90_000)

async function snapshotState(page: Page, testInfo: TestInfo, name: string, notes?: string) {
  const cookies = await page.context().cookies()
  const storage = await page.evaluate<StorageSnapshot>(() => {
    const toObject = (s: Storage) => {
      const out: Record<string, string> = {}
      for (let i = 0; i < s.length; i++) {
        const key = s.key(i)
        if (!key) continue
        out[key] = s.getItem(key) ?? ''
      }
      return out
    }
    return {
      localStorage: toObject(window.localStorage),
      sessionStorage: toObject(window.sessionStorage),
    }
  })

  const data: JourneySnapshot = {
    name,
    url: page.url(),
    title: await page.title(),
    timestamp: new Date().toISOString(),
    cookies: cookies.map((c) => ({ name: c.name, value: c.value, domain: c.domain, path: c.path })),
    storage,
    notes,
  }

  await testInfo.attach(`${name}.json`, {
    body: Buffer.from(JSON.stringify(data, null, 2)),
    contentType: 'application/json',
  })

  await testInfo.attach(`${name}.png`, {
    body: await page.screenshot({ fullPage: true }),
    contentType: 'image/png',
  })

  return data
}

async function manualCheckpoint(page: Page, testInfo: TestInfo, instructions: string) {
  if (!INTERACTIVE) {
    await testInfo.attach('manual-checkpoint.txt', {
      body: Buffer.from(
        `INTERACTIVE=0, skipping manual checkpoint.\nInstructions:\n${instructions}\n`
      ),
      contentType: 'text/plain',
    })
    return
  }

  // Keep the browser open for a bit so a human can complete wallet / signing flows.
  // This is intentionally time-based since we can't reliably automate wallet popups.
  // Increase via MANUAL_WAIT_MS if needed.
  await testInfo.attach('manual-checkpoint.txt', {
    body: Buffer.from(
      `Manual checkpoint (waiting ${MANUAL_WAIT_MS}ms).\nInstructions:\n${instructions}\n`
    ),
    contentType: 'text/plain',
  })
  await page.waitForTimeout(MANUAL_WAIT_MS)
}

async function gotoAndSnapshot(
  page: Page,
  testInfo: TestInfo,
  name: string,
  path: string,
  notes?: string
) {
  await page.goto(path, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(500)
  return snapshotState(page, testInfo, name, notes)
}

test.describe.serial('User journeys runner (manual-friendly)', () => {
  test('Journey 1: Visit dashboard and open Connect Wallet modal', async ({ page }, testInfo) => {
    await gotoAndSnapshot(page, testInfo, '01-dashboard-initial', '/dashboard')

    const connectButton = page.getByRole('button', { name: /connect wallet/i })
    await expect(connectButton).toBeVisible()
    await connectButton.click()

    await manualCheckpoint(
      page,
      testInfo,
      [
        'In the opened wallet modal, connect a wallet.',
        'If prompted, sign the authentication message.',
        'Expected persistence: localStorage key "ghostspeak_auth" after successful auth.',
      ].join('\n')
    )

    await snapshotState(page, testInfo, '01-dashboard-after-connect')
  })

  test('Journey 2: Disconnect wallet (if connected)', async ({ page }, testInfo) => {
    await gotoAndSnapshot(page, testInfo, '02-dashboard-before-disconnect', '/dashboard')

    // If connected, the ConnectWalletButton renders the formatted address instead of “Connect Wallet”.
    // We look for the dropdown trigger by finding the wallet button and attempting to click it.
    const walletButton = page.getByRole('button').filter({ hasText: /\w{2,4}\.\.\.\w{2,4}/ })
    if (await walletButton.first().isVisible()) {
      await walletButton.first().click()
      const disconnect = page.getByRole('button', { name: /disconnect wallet/i })
      if (await disconnect.isVisible()) {
        await disconnect.click()
      }
      await snapshotState(page, testInfo, '02-dashboard-after-disconnect')
      return
    }

    await snapshotState(
      page,
      testInfo,
      '02-dashboard-not-connected',
      'Wallet did not appear connected in UI; no disconnect action performed.'
    )
  })

  test('Journey 3: Navigate core public pages (sanity)', async ({ page }, testInfo) => {
    await gotoAndSnapshot(page, testInfo, '03-home', '/')
    await gotoAndSnapshot(page, testInfo, '03-caisper', '/caisper')
    await gotoAndSnapshot(page, testInfo, '03-cookies', '/cookies')
    await gotoAndSnapshot(page, testInfo, '03-terms', '/terms')
    await gotoAndSnapshot(page, testInfo, '03-settings', '/settings')
  })

  test('Journey 4: Attempt agent registration flow (manual submit)', async ({ page }, testInfo) => {
    await gotoAndSnapshot(page, testInfo, '04-agents-register', '/agents/register')

    await manualCheckpoint(
      page,
      testInfo,
      [
        'If the agent registration form is available, fill required fields and submit.',
        'If a wallet signature is required, approve it.',
        'Record any transaction signature shown in UI/logs.',
      ].join('\n')
    )

    await snapshotState(page, testInfo, '04-agents-register-after')
  })

  test('Journey 5: Attempt dashboard subroutes from docs (record missing pages)', async ({ page }, testInfo) => {
    // These are documented routes; they may not exist in the local app build.
    await gotoAndSnapshot(page, testInfo, '05-dashboard-root', '/dashboard')
    await gotoAndSnapshot(page, testInfo, '05-dashboard-analytics', '/dashboard/analytics', 'May be 404 if not implemented')
    await gotoAndSnapshot(page, testInfo, '05-dashboard-credentials', '/dashboard/credentials', 'May be 404 if not implemented')
    await gotoAndSnapshot(page, testInfo, '05-dashboard-privacy', '/dashboard/privacy', 'May be 404 if not implemented')
    await gotoAndSnapshot(page, testInfo, '05-dashboard-api-keys', '/dashboard/api-keys', 'May be 404 if not implemented')
  })

  test('Journey 6: Privacy page (implemented route) - unauthenticated empty-state check', async ({ page }, testInfo) => {
    await gotoAndSnapshot(page, testInfo, '06-privacy', '/privacy')
    await snapshotState(
      page,
      testInfo,
      '06-privacy-note',
      'If wallet is not connected, expect an empty-state / connect-wallet requirement.'
    )
  })

  test('Journey 7: Inspect storage keys relevant to sessions', async ({ page }, testInfo) => {
    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' })

    const authValue = await page.evaluate(() => localStorage.getItem('ghostspeak_auth'))
    await testInfo.attach('07-ghostspeak_auth.txt', {
      body: Buffer.from(authValue ?? 'null'),
      contentType: 'text/plain',
    })

    await snapshotState(page, testInfo, '07-storage-snapshot')
  })

  test('Journey 8: API routes sanity (local)', async ({ page }, testInfo) => {
    // These are local Next.js API routes; we just ensure they respond with some content.
    await gotoAndSnapshot(page, testInfo, '08-api-v1-health', '/api/v1/health')
    await gotoAndSnapshot(page, testInfo, '08-api-v1-stats', '/api/v1/stats')
  })

  test('Journey 9: Cookie policy expectations (manual verification points)', async ({ page }, testInfo) => {
    await gotoAndSnapshot(page, testInfo, '09-cookies-page', '/cookies')
    await testInfo.attach('09-cookie-policy-notes.txt', {
      body: Buffer.from(
        [
          'Verify presence/absence of cookies listed in policy, depending on auth state:',
          '- ghost_session (session)',
          '- csrf_token (24h)',
          '- theme_preference (1 year)',
          '- _va (analytics, if enabled)',
          'Verify localStorage caching per policy (wallet prefs, UI state, recent txs).',
        ].join('\n')
      ),
      contentType: 'text/plain',
    })
  })

  test('Journey 10: Wrap-up report pointer', async ({ page }, testInfo) => {
    await gotoAndSnapshot(page, testInfo, '10-final-dashboard', '/dashboard')
    await testInfo.attach('10-how-to-run.txt', {
      body: Buffer.from(
        [
          'Run this suite in interactive mode (recommended):',
          '  cd packages/web && INTERACTIVE=1 MANUAL_WAIT_MS=120000 bun run test:e2e:headed --project=chromium',
          '',
          'Non-interactive (skips manual steps, still records snapshots):',
          '  cd packages/web && bun run test:e2e --project=chromium',
          '',
          'Artifacts are attached to the Playwright HTML report: bun run test:e2e:report',
        ].join('\n')
      ),
      contentType: 'text/plain',
    })
  })
})

