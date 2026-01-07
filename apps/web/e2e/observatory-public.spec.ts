import { test, expect } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'

function getConvexUrlFromDotenv(): string | null {
  const direct = process.env.NEXT_PUBLIC_CONVEX_URL
  if (direct && direct.trim()) return direct.trim()

  // Playwright runs from packages/web in normal usage, but keep it resilient.
  const candidates = [
    path.resolve(process.cwd(), '.env.local'),
    path.resolve(process.cwd(), '.env'),
    path.resolve(process.cwd(), 'packages/web/.env.local'),
    path.resolve(process.cwd(), 'packages/web/.env'),
  ]

  for (const file of candidates) {
    if (!fs.existsSync(file)) continue
    const content = fs.readFileSync(file, 'utf8')
    for (const rawLine of content.split(/\r?\n/)) {
      const line = rawLine.trim()
      if (!line || line.startsWith('#')) continue
      const match = line.match(/^NEXT_PUBLIC_CONVEX_URL\s*=\s*(.*)\s*$/)
      if (!match) continue
      const value = match[1].replace(/^['"]|['"]$/g, '').trim()
      if (value) return value
    }
  }

  return null
}

async function openMobileMenuIfNeeded(page: import('@playwright/test').Page) {
  const desktopLink = page.getByRole('link', { name: 'Observatory', exact: true })
  if (await desktopLink.first().isVisible()) return

  const openMenu = page.getByRole('button', { name: /open menu/i })
  if (await openMenu.isVisible()) {
    await openMenu.click()
  }
}

test.describe('Public /observatory terminal UI', () => {
  test('nav link exists → /observatory loads → X402 payer redaction → drawer opens for observation rows', async ({
    page,
  }) => {
    const convexUrl = getConvexUrlFromDotenv()
    test.skip(!convexUrl, 'Missing NEXT_PUBLIC_CONVEX_URL; public /observatory depends on Convex queries')

    await page.goto('/', { waitUntil: 'domcontentloaded' })

    await openMobileMenuIfNeeded(page)

    const observatoryLink = page.getByRole('link', { name: 'Observatory', exact: true })
    await expect(observatoryLink, 'Expected an "Observatory" navigation link to exist on public (marketing) pages').toBeVisible(
      { timeout: 15_000 },
    )

    await observatoryLink.click()
    await expect(page, 'Expected clicking "Observatory" to navigate to /observatory').toHaveURL(/\/observatory(\?.*)?$/, {
      timeout: 30_000,
    })

    await expect(page.getByTestId('observatory-page'), 'Expected /observatory page wrapper to render').toBeVisible({
      timeout: 30_000,
    })
    await expect(page.getByTestId('observatory-terminal'), 'Expected terminal UI container to render on /observatory').toBeVisible({
      timeout: 30_000,
    })

    await expect(page.getByTestId('observatory-tab-live'), 'Expected LIVE tab to exist on the observatory terminal').toBeVisible()

    // X402 tab: assert payer redaction exists when payments are present.
    await page.getByTestId('observatory-tab-x402').click()
    await expect(page.getByTestId('observatory-tabpanel-x402'), 'Expected X402 tabpanel to render after clicking X402 tab').toBeVisible({
      timeout: 15_000,
    })

    const x402List = page.getByTestId('observatory-x402-list')
    const x402Empty = page.getByTestId('observatory-x402-empty')
    const x402Loading = page.getByTestId('observatory-x402-loading')

    await expect
      .poll(
        async () => {
          if ((await x402List.count()) > 0) return 'list'
          if ((await x402Empty.count()) > 0) return 'empty'
          if ((await x402Loading.count()) > 0) return 'loading'
          return 'unknown'
        },
        {
          timeout: 20_000,
          message: 'Expected X402 tab to render a list, an empty state, or a loading state',
        },
      )
      .not.toBe('unknown')

    if ((await x402List.count()) > 0) {
      const firstX402Row = x402List.locator('[data-testid^="observatory-x402-row-"]').first()
      await expect(
        firstX402Row,
        'Expected at least one X402 payment row when list is present',
      ).toBeVisible({
        timeout: 15_000,
      })

      // Requirement: look for the explicit fully-redacted string.
      // Note: some environments may show partial redaction (e.g. 4…4). We keep that as a fallback.
      await expect.soft(firstX402Row, 'Expected X402 payer to be fully redacted as "payer:[redacted]" in the public UI').toContainText(
        'payer:[redacted]',
      )

      await expect(
        firstX402Row,
        'Expected X402 payer to be redacted (either fully "[redacted]" or partially "abcd…wxyz")',
      ).toContainText(/payer:(\[redacted\]|[A-Za-z0-9]{4}…[A-Za-z0-9]{4})/)
    } else {
      await expect(x402Empty, 'If there are no x402 payments, expected an explicit empty state message').toBeVisible({
        timeout: 15_000,
      })
    }

    // LIVE tab: if any observation rows exist, click first and assert drawer opens.
    await page.getByTestId('observatory-tab-live').click()
    await expect(page.getByTestId('observatory-tabpanel-live'), 'Expected LIVE tabpanel to render after returning to LIVE').toBeVisible({
      timeout: 15_000,
    })

    const liveList = page.getByTestId('observatory-live-list')
    const liveEmpty = page.getByTestId('observatory-live-empty')
    const liveLoading = page.getByTestId('observatory-live-loading')

    await expect
      .poll(
        async () => {
          if ((await liveList.count()) > 0) return 'list'
          if ((await liveEmpty.count()) > 0) return 'empty'
          if ((await liveLoading.count()) > 0) return 'loading'
          return 'unknown'
        },
        {
          timeout: 20_000,
          message: 'Expected LIVE tab to render a list, an empty state, or a loading state',
        },
      )
      .not.toBe('unknown')

    const firstObservationButton = liveList.locator('button').first()
    if ((await firstObservationButton.count()) > 0) {
      await firstObservationButton.scrollIntoViewIfNeeded()
      await firstObservationButton.click()

      const drawer = page.getByTestId('observatory-observation-drawer')
      await expect(drawer, 'Expected observation drawer to open after clicking an observation row').toBeVisible({
        timeout: 15_000,
      })
      await expect(
        drawer.getByTestId('observatory-observation-details'),
        'Expected observation drawer to show details content when Convex returns a detail payload',
      ).toBeVisible({ timeout: 30_000 })
    }
  })
})

