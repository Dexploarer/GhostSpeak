import { test, expect } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'
import { ConvexHttpClient } from 'convex/browser'
import { api } from '../convex/_generated/api'

function getConvexUrlFromDotenv(): string | null {
  const direct = process.env.NEXT_PUBLIC_CONVEX_URL
  if (direct && direct.trim()) return direct.trim()

  // Playwright runs from packages/web in normal usage, but keep it resilient.
  const candidates = [
    path.resolve(process.cwd(), '.env.local'),
    path.resolve(process.cwd(), '.env'),
    path.resolve(process.cwd(), 'apps/web/.env.local'),
    path.resolve(process.cwd(), 'apps/web/.env'),
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

async function seedUserForDashboard(walletAddress: string, convexUrl: string) {
  const convex = new ConvexHttpClient(convexUrl)

  // Dashboard requires a user row. The agent chat mutation auto-creates a user record.
  await convex.mutation(api.agent.storeUserMessage, {
    walletAddress,
    message: 'e2e seed: create user for dashboard',
  })

  // Avoid the username onboarding modal by marking onboarding as completed.
  await convex.mutation(api.onboarding.completeOnboarding, {
    walletAddress,
    // onboarding.completeOnboarding enforces 3-20 chars.
    username: `e2e${Date.now()}${Math.round(Math.random() * 1000)}`.slice(0, 20),
  })
}

async function getUserIdForWalletAddress(
  walletAddress: string,
  convexUrl: string
): Promise<string> {
  const convex = new ConvexHttpClient(convexUrl)
  const user = await convex.query(api.solanaAuth.getUserByWallet, { walletAddress })
  if (!user?._id) {
    throw new Error(
      `Failed to seed user for walletAddress=${walletAddress} (no user returned from getUserByWallet)`
    )
  }
  return user._id
}

async function ensureApiKeySlotAvailable({
  userId,
  convexUrl,
}: {
  userId: string
  convexUrl: string
}): Promise<void> {
  const convex = new ConvexHttpClient(convexUrl)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const keys = await convex.query(api.apiKeys.listMyApiKeys, { userId: userId as any })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const activeKeys = (keys ?? []).filter((k: any) => k?.isActive)

  // createApiKey enforces max 10 active keys. If the local Convex DB is reused across runs,
  // proactively revoke enough keys to ensure we can create at least one.
  if (activeKeys.length < 10) return

  const toRevoke = activeKeys.slice(9) // keep 9 active, revoke the rest
  for (const k of toRevoke) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await convex.mutation(api.apiKeys.revokeApiKey, { userId: userId as any, apiKeyId: k.id })
  }
}

type MockWalletOptions = {
  includeVerifiedSession: boolean
  includeSignMessage: boolean
}

async function installMockWalletStandard(
  page: import('@playwright/test').Page,
  walletAddress: string,
  { includeVerifiedSession, includeSignMessage }: MockWalletOptions
) {
  // Improved wallet mock registration for better reliability
  await page.addInitScript(
    ({ walletAddress, includeVerifiedSession, includeSignMessage }) => {
      const walletName = 'E2E Test Wallet'

      // Set up localStorage BEFORE wallet provider initialization
      try {
        window.localStorage.setItem('walletName', walletName)
        window.localStorage.setItem('ghostspeak_onboarding_completed', 'true')

        // For tests with verified session, set it up early
        if (includeVerifiedSession) {
          window.localStorage.setItem(
            'ghostspeak_auth',
            JSON.stringify({
              userId: 'e2e-user',
              sessionToken: 'e2e-session-token',
              walletAddress,
            })
          )
        } else {
          window.localStorage.removeItem('ghostspeak_auth')
        }
      } catch {
        // ignore
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const features: Record<string, any> = {
        'standard:connect': {
          version: '1.0.0',
          connect: async () => {
            return {
              accounts: [
                {
                  address: walletAddress,
                  publicKey: new Uint8Array(32),
                  chains: ['solana:mainnet', 'solana:devnet'],
                  features: [
                    'solana:signTransaction',
                    ...(includeSignMessage ? ['solana:signMessage'] : []),
                    'solana:signAndSendTransaction',
                  ],
                },
              ],
            }
          },
        },
        'standard:disconnect': {
          version: '1.0.0',
          disconnect: async () => {
            /* empty */
          },
        },
        'solana:signTransaction': {
          version: '1.0.0',
          signTransaction: async ({ transaction }: { transaction: Uint8Array }) => {
            return [{ signedTransaction: transaction }]
          },
        },
        'solana:signAndSendTransaction': {
          version: '1.0.0',
          signAndSendTransaction: async () => {
            return [{ signature: 'e2e_signature' }]
          },
        },
      }

      if (includeSignMessage) {
        features['solana:signMessage'] = {
          version: '1.0.0',
          signMessage: async ({ message }: { message: Uint8Array }) => {
            return [{ signature: message }]
          },
        }
      }

      const wallet = {
        name: walletName,
        version: '1.0.0',
        icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg"/>',
        chains: ['solana:mainnet', 'solana:devnet'],
        features,
        accounts: [],
      }

      // Store for early access
      if (typeof window !== 'undefined') {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ;(window as any).__E2E_MOCK_WALLET__ = {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          register: (register: (...wallets: any[]) => unknown) => register(wallet),
          wallet,
        }
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const callback = ({ register }: { register: (...wallets: any[]) => unknown }) =>
        register(wallet)

      // Multiple registration methods
      const registerMethods = [
        () => {
          try {
            window.dispatchEvent(
              new CustomEvent('wallet-standard:register-wallet', {
                detail: callback,
              })
            )
          } catch {}
        },
        () => {
          try {
            document.dispatchEvent(
              new CustomEvent('wallet-standard:register-wallet', {
                detail: callback,
              })
            )
          } catch {}
        },
      ]

      registerMethods.forEach((method: any) => method())

      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        window.addEventListener('wallet-standard:app-ready', (event: any) => {
          if (event?.detail) callback(event.detail)
        })
      } catch {
        // ignore
      }
    },
    { walletAddress, includeVerifiedSession, includeSignMessage }
  )

  // Additional injection after page load
  await page.evaluate(
    ({ walletAddress, includeVerifiedSession: _includeVerifiedSession }) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if ((window as any).__E2E_MOCK_WALLET__) return

      const walletName = 'E2E Test Wallet'
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const features: Record<string, any> = {
        'standard:connect': {
          version: '1.0.0',
          connect: async () => ({
            accounts: [
              {
                address: walletAddress,
                publicKey: new Uint8Array(32),
                chains: ['solana:mainnet', 'solana:devnet'],
                features: ['solana:signTransaction', 'solana:signAndSendTransaction'],
              },
            ],
          }),
        },
        'standard:disconnect': {
          version: '1.0.0',
          disconnect: async () => {
            /* empty */
          },
        },
        'solana:signTransaction': {
          version: '1.0.0',
          signTransaction: async ({ transaction }: { transaction: Uint8Array }) => ({
            signedTransaction: transaction,
          }),
        },
        'solana:signAndSendTransaction': {
          version: '1.0.0',
          signAndSendTransaction: async () => ({ signature: 'e2e_signature' }),
        },
      }

      const wallet = {
        name: walletName,
        version: '1.0.0',
        icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg"/>',
        chains: ['solana:mainnet', 'solana:devnet'],
        features,
        accounts: [],
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(window as any).__E2E_MOCK_WALLET__ = {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        register: (register: (...wallets: any[]) => unknown) => register(wallet),
        wallet,
      }
    },
    { walletAddress, includeVerifiedSession }
  )

  await page.waitForTimeout(200)
}

async function injectVerifiedSession(
  page: import('@playwright/test').Page,
  {
    walletAddress,
    userId = 'e2e-user',
  }: {
    walletAddress: string
    userId?: string
  }
) {
  await page.evaluate(
    ({ walletAddress, userId }) => {
      window.localStorage.setItem(
        'ghostspeak_auth',
        JSON.stringify({
          userId,
          sessionToken: 'e2e-session-token',
          walletAddress,
        })
      )
    },
    { walletAddress, userId }
  )
}

async function ensureWalletAutoConnected(
  page: import('@playwright/test').Page,
  { walletAddress }: { walletAddress: string }
) {
  // Connect wallet on a non-redirecting page first, so /dashboard doesn't immediately push us back to '/'.
  await page.goto('/', { waitUntil: 'domcontentloaded' })

  // Wait for page to stabilize
  await page.waitForLoadState('networkidle')

  const formatted = `${walletAddress.slice(0, 4)}...${walletAddress.slice(-4)}`
  const formattedEscaped = formatted.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

  // Try multiple selectors for better reliability
  const walletButton = page
    .getByRole('button')
    .filter({
      hasText: new RegExp(
        `${formattedEscaped}|Sign to authenticate\\.\\.\\.|Connecting\\.\\.\\.|Connect Wallet`
      ),
    })
    .first()

  await expect(
    walletButton,
    `Expected wallet button to be visible (${formatted}, "Sign to authenticate...", "Connecting...", or "Connect Wallet")`
  ).toBeVisible({ timeout: 30000 })
}

async function gotoDashboardViaPortal(page: import('@playwright/test').Page) {
  // Wait for page to be ready
  await page.waitForLoadState('domcontentloaded')

  const portalButton = page.getByRole('button', { name: 'Portal' })

  // Wait for portal button to be visible with retry
  try {
    await portalButton.waitFor({ state: 'visible', timeout: 15000 })
  } catch {
    const currentUrl = page.url()
    if (/\/dashboard/.test(currentUrl)) {
      await expect(
        page.getByRole('heading', { name: 'Dashboard', exact: true }),
        'Expected /dashboard heading'
      ).toBeVisible({ timeout: 10000 })
      return
    }
    throw new Error('Portal button not visible and not on dashboard')
  }

  await Promise.all([
    page.waitForURL(/\/dashboard(\?.*)?$/, { timeout: 30000 }),
    portalButton.click(),
  ])

  await expect(
    page.getByRole('heading', { name: 'Dashboard', exact: true }),
    'Expected /dashboard heading after navigating via Portal CTA'
  ).toBeVisible({ timeout: 30000 })
}

test.describe
  .serial('Dashboard routes + Observatory voting (Wallet Standard + verified session gating)', () => {
  test('new dashboard routes load under a verified session and render a heading', async ({
    page,
  }) => {
    const walletAddress = '2wKupLR9q6wXYppw8Gr2NvWxKBUqm4PPJKkQfoxHDBg4'

    const convexUrl = getConvexUrlFromDotenv()
    test.skip(!convexUrl, 'Missing NEXT_PUBLIC_CONVEX_URL; cannot seed Convex user for dashboard')

    await seedUserForDashboard(walletAddress, convexUrl!)
    await installMockWalletStandard(page, walletAddress, {
      includeVerifiedSession: true,
      // Prevent ConnectWalletButton from auto-signing and triggering competing navigations.
      includeSignMessage: false,
    })
    await ensureWalletAutoConnected(page, { walletAddress })

    await injectVerifiedSession(page, { walletAddress })

    await gotoDashboardViaPortal(page)

    // Confirm the dashboard sees the injected SIWS session.
    await expect(
      page.getByTestId('verification-contract-card').getByText('Signed in (SIWS) (yes)'),
      'Expected dashboard to recognize the injected verified session'
    ).toBeVisible({ timeout: 15000 })

    const cases = [
      { path: '/dashboard/analytics', heading: 'Analytics' },
      { path: '/dashboard/api-keys', heading: 'API Keys' },
      { path: '/dashboard/credentials', heading: 'Credentials' },
      { path: '/dashboard/privacy', heading: 'Privacy' },
    ] as const

    for (const c of cases) {
      // Use client-side navigation to keep the connected wallet state.
      const contractCard = page.getByTestId('verification-contract-card')
      await contractCard.getByRole('link', { name: c.heading, exact: true }).click()
      await expect(page, `Expected navigation to ${c.path} via contract card link`).toHaveURL(
        new RegExp(`${c.path.replaceAll('/', '\\/')}(\\?.*)?$`),
        { timeout: 30000 }
      )
      await expect(
        page.getByRole('heading', { level: 1, name: c.heading, exact: true }),
        `Expected ${c.path} to render an <h1> heading with text "${c.heading}" under a verified session`
      ).toBeVisible({ timeout: 30000 })

      await expect(
        page.getByText(/To continue, approve the.*Sign to authenticate/i),
        `Expected ${c.path} to be unlocked (verified-session gating copy should not render)`
      ).toHaveCount(0)

      await page.getByRole('link', { name: 'Back', exact: true }).click()
      await expect(page, 'Expected Back link to return to /dashboard').toHaveURL(
        /\/dashboard(\?.*)?$/,
        {
          timeout: 30000,
        }
      )
    }
  })

  test('Observatory: verified session allows access and does not show the vote-blocked prompt', async ({
    page,
  }) => {
    const walletAddress = '2wKupLR9q6wXYppw8Gr2NvWxKBUqm4PPJKkQfoxHDBg4'

    const convexUrl = getConvexUrlFromDotenv()
    test.skip(!convexUrl, 'Missing NEXT_PUBLIC_CONVEX_URL; cannot seed Convex user for observatory')

    await seedUserForDashboard(walletAddress, convexUrl!)
    await installMockWalletStandard(page, walletAddress, {
      includeVerifiedSession: true,
      // Prevent ConnectWalletButton from auto-signing and triggering competing navigations.
      includeSignMessage: false,
    })
    await ensureWalletAutoConnected(page, { walletAddress })

    await injectVerifiedSession(page, { walletAddress })

    await gotoDashboardViaPortal(page)

    await page
      .getByTestId('verification-contract-card')
      .getByRole('link', { name: 'Observe' })
      .click()
    await expect(page, 'Expected navigation to /dashboard/observe').toHaveURL(
      /\/dashboard\/observe(\?.*)?$/,
      {
        timeout: 30000,
      }
    )
    await expect(
      page.getByRole('heading', { name: 'Agent Observatory' }),
      'Expected /dashboard/observe to load for a connected + verified session'
    ).toBeVisible({ timeout: 15000 })

    await expect(
      page.getByRole('button', { name: 'Directory' }),
      'Expected verified session to unlock the observatory view switcher'
    ).toBeVisible({ timeout: 15000 })

    await expect(
      page.getByText('Sign in to vote.', { exact: true }),
      'Verified session should not be blocked by the "Sign in to vote" prompt'
    ).toHaveCount(0, { timeout: 15000 })

    // Switch to the live feed view; vote buttons exist only there.
    await page.getByRole('button', { name: 'Live Feed' }).click()

    // If the seeded Convex DB already has endpoint tests, ensure at least the first vote control is enabled.
    // If the feed is empty, still assert we are not gated by the verified-session prompt.
    const upvote = page.locator('button[title="Good result (fast/correct)"]')
    if ((await upvote.count()) > 0) {
      await expect(
        upvote.first(),
        'Expected upvote control to be enabled when session is verified'
      ).toBeEnabled({ timeout: 15000 })
    }
  })

  test('Observatory: wallet connected but NOT verified shows vote prompt and blocks vote controls', async ({
    page,
  }) => {
    const walletAddress = '2wKupLR9q6wXYppw8Gr2NvWxKBUqm4PPJKkQfoxHDBg4'

    const convexUrl = getConvexUrlFromDotenv()
    test.skip(!convexUrl, 'Missing NEXT_PUBLIC_CONVEX_URL; cannot run observatory gating test')

    await seedUserForDashboard(walletAddress, convexUrl!)
    await installMockWalletStandard(page, walletAddress, {
      includeVerifiedSession: false,
      // Prevent ConnectWalletButton from auto-signing and creating a session.
      includeSignMessage: false,
    })
    await ensureWalletAutoConnected(page, { walletAddress })

    await gotoDashboardViaPortal(page)

    await page
      .getByTestId('verification-contract-card')
      .getByRole('link', { name: 'Observe' })
      .click()
    await expect(page, 'Expected navigation to /dashboard/observe').toHaveURL(
      /\/dashboard\/observe(\?.*)?$/,
      {
        timeout: 30000,
      }
    )

    await expect(
      page.getByRole('heading', { name: 'Agent Observatory' }),
      'Expected /dashboard/observe to render the session-gated observatory wrapper for connected wallets'
    ).toBeVisible({ timeout: 15000 })

    await expect(
      page.getByTestId('verification-contract-card'),
      'Expected the verified-session helper card to appear when session is not verified'
    ).toBeVisible({ timeout: 15000 })

    await expect(
      page.getByText('Sign in to vote.', { exact: true }),
      'Expected /dashboard/observe to show the verified-session prompt when no SIWS session exists'
    ).toBeVisible({ timeout: 15000 })

    // When not verified, the observe page renders only the gating UI (no view switcher or live feed).
    await expect(
      page.getByRole('button', { name: 'Live Feed' }),
      'Expected the observe page to block access to the live feed controls when not verified'
    ).toHaveCount(0)
    await expect(
      page.locator('button[title="Good result (fast/correct)"]'),
      'Vote buttons should not be interactive/available when not verified'
    ).toHaveCount(0)
  })

  test('API Keys: create → reveal → list → revoke (verified session)', async ({ page }) => {
    const walletAddress = '2wKupLR9q6wXYppw8Gr2NvWxKBUqm4PPJKkQfoxHDBg4'

    const convexUrl = getConvexUrlFromDotenv()
    test.skip(
      !convexUrl,
      'Missing NEXT_PUBLIC_CONVEX_URL; cannot seed Convex user for API key management'
    )

    await seedUserForDashboard(walletAddress, convexUrl!)
    await installMockWalletStandard(page, walletAddress, {
      includeVerifiedSession: true,
      // Prevent ConnectWalletButton from auto-signing and triggering competing navigations.
      includeSignMessage: false,
    })
    await ensureWalletAutoConnected(page, { walletAddress })

    const userId = await getUserIdForWalletAddress(walletAddress, convexUrl!)
    await ensureApiKeySlotAvailable({ userId, convexUrl: convexUrl! })
    await injectVerifiedSession(page, { walletAddress, userId })

    await gotoDashboardViaPortal(page)
    await page
      .getByTestId('verification-contract-card')
      .getByRole('link', { name: 'API Keys' })
      .click()
    await expect(page, 'Expected navigation to /dashboard/api-keys').toHaveURL(
      /\/dashboard\/api-keys(\?.*)?$/,
      {
        timeout: 30000,
      }
    )

    await expect(
      page.getByTestId('api-keys-page'),
      'Expected API key management UI wrapper to render'
    ).toBeVisible({ timeout: 30000 })
    await expect(
      page.getByRole('heading', { level: 1, name: 'API Keys', exact: true }),
      'Expected /dashboard/api-keys to render an <h1> heading'
    ).toBeVisible({ timeout: 30000 })

    await expect(
      page.getByTestId('api-keys-session-error'),
      'Expected verified session to provide a userId (session error should not render)'
    ).toHaveCount(0)

    const name = `e2e api key ${Date.now()}`

    await page.getByTestId('api-key-name-input').fill(name)
    await page.getByTestId('api-key-create-submit').click()

    const revealDialog = page.getByTestId('api-key-reveal-dialog')
    await expect(
      revealDialog,
      'Expected one-time reveal modal after creating an API key'
    ).toBeVisible({ timeout: 30000 })

    const revealedKey = (await page.getByTestId('api-key-reveal-value').innerText()).trim()
    await expect(
      page.getByTestId('api-key-reveal-value'),
      'Expected revealed key to start with gs_live_'
    ).toHaveText(/^gs_live_/, { timeout: 15000 })
    expect(
      revealedKey,
      `Expected revealed key to match the gs_live_ base62 format, got: ${revealedKey}`
    ).toMatch(/^gs_live_[0-9A-Za-z]{40}$/)

    await expect(
      page.getByTestId('api-key-copy-button'),
      'Expected copy button to exist in reveal modal'
    ).toBeVisible()

    // Close reveal modal (it should never show the plaintext key again).
    await page.keyboard.press('Escape')
    await expect(revealDialog, 'Expected reveal modal to close after Escape').toHaveCount(0)

    const expectedPrefix = revealedKey.slice(0, 'gs_live_'.length + 8)
    const list = page.getByTestId('api-keys-list')
    const createdRow = list.locator('li').filter({ hasText: name }).first()
    await expect(
      createdRow,
      'Expected newly created key to appear in the list with its name'
    ).toBeVisible({ timeout: 30000 })
    await expect(
      createdRow,
      `Expected list row to include key prefix ${expectedPrefix}`
    ).toContainText(expectedPrefix)

    await createdRow.getByRole('button', { name: 'Revoke' }).click()
    const revokeDialog = page.getByTestId('api-key-revoke-dialog')
    await expect(revokeDialog, 'Expected revoke confirmation modal').toBeVisible({
      timeout: 15000,
    })
    await expect(
      revokeDialog,
      'Expected revoke modal target to include the key name'
    ).toContainText(name)

    await revokeDialog.getByTestId('api-key-revoke-confirm').click()
    await expect(revokeDialog, 'Expected revoke modal to close after confirmation').toHaveCount(0)

    await expect
      .poll(
        async () => {
          const count = await createdRow.count()
          if (count === 0) return 'disappeared'
          const text = await createdRow.innerText()
          if (/\bRevoked\b/.test(text)) return 'revoked'
          return 'pending'
        },
        {
          timeout: 30000,
          message:
            'Expected revoked key to either show Revoked status or disappear from the active list',
        }
      )
      .toMatch(/revoked|disappeared/)
  })
})
