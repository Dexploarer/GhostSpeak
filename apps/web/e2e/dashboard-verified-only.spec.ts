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
  // Use a unique username per run to avoid collisions if the local Convex DB is reused.
  await convex.mutation(api.onboarding.completeOnboarding, {
    walletAddress,
    // onboarding.completeOnboarding enforces 3-20 chars.
    username: `e2e${String(Date.now()).slice(-10)}`,
  })
}

async function installMockWalletStandard(
  page: import('@playwright/test').Page,
  walletAddress: string
) {
  // Improved wallet mock for better reliability
  await page.addInitScript(
    ({ walletAddress }) => {
      const walletName = 'E2E Test Wallet'

      try {
        window.localStorage.setItem('walletName', walletName)
        window.localStorage.setItem('ghostspeak_onboarding_completed', 'true')

        // Set verified session for this test
        window.localStorage.setItem(
          'ghostspeak_auth',
          JSON.stringify({
            userId: 'e2e-user',
            sessionToken: 'e2e-session-token',
            walletAddress,
          })
        )
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
                    'solana:signMessage',
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
        'solana:signMessage': {
          version: '1.0.0',
          signMessage: async ({ message }: { message: Uint8Array }) => {
            return [{ signature: message }]
          },
        },
        'solana:signAndSendTransaction': {
          version: '1.0.0',
          signAndSendTransaction: async () => {
            return [{ signature: 'e2e_signature' }]
          },
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

      // Store for early access by wallet provider
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

      registerMethods.forEach((method) => method())

      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        window.addEventListener('wallet-standard:app-ready', (event: any) => {
          if (event?.detail) callback(event.detail)
        })
      } catch {
        // ignore
      }
    },
    { walletAddress }
  )

  // Additional injection after page load
  await page.evaluate(
    ({ walletAddress }) => {
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
                features: [
                  'solana:signTransaction',
                  'solana:signMessage',
                  'solana:signAndSendTransaction',
                ],
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
        'solana:signMessage': {
          version: '1.0.0',
          signMessage: async ({ message }: { message: Uint8Array }) => ({
            signature: message,
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
    { walletAddress }
  )

  await page.waitForTimeout(200)
}

test.describe('Dashboard (verified-only) - minimalist behavior', () => {
  test('shows only verified actions, hides removed CTAs, and navigation targets are correct', async ({
    page,
  }) => {
    // Use a deterministic valid-length base58-ish address. It does not need to be a real key.
    // Note: address() parsing happens in WalletStandardProvider and will reject invalid formats.
    const walletAddress = '2wKupLR9q6wXYppw8Gr2NvWxKBUqm4PPJKkQfoxHDBg4'

    const convexUrl = getConvexUrlFromDotenv()
    test.skip(!convexUrl, 'Missing NEXT_PUBLIC_CONVEX_URL; cannot seed Convex user for dashboard')

    await seedUserForDashboard(walletAddress, convexUrl!)
    await installMockWalletStandard(page, walletAddress)

    // Connect wallet on a non-redirecting page first, so /dashboard doesn't immediately push us back to '/'.
    await page.goto('/', { waitUntil: 'domcontentloaded' })

    // Wait for page to stabilize
    await page.waitForLoadState('networkidle')

    const formatted = `${walletAddress.slice(0, 4)}...${walletAddress.slice(-4)}`

    // Wait for wallet button with multiple possible states
    const walletButton = page
      .getByRole('button')
      .filter({
        hasText: new RegExp(
          `${formatted}|Sign to authenticate\\.\\.\\.|Connecting\\.\\.\\.|Connect Wallet`
        ),
      })
      .first()

    await expect(
      walletButton,
      `Expected mock wallet to auto-connect (wallet button should show ${formatted} or one of the connection states)`
    ).toBeVisible({ timeout: 30000 })

    // Check if we're already on dashboard
    const currentUrl = page.url()
    if (!/\/dashboard/.test(currentUrl)) {
      // Use client-side navigation to keep the connected wallet state.
      await Promise.all([
        page.waitForURL(/\/dashboard(\?.*)?$/, { timeout: 30000 }),
        page.getByRole('button', { name: 'Portal' }).click(),
      ])
    }

    // Ensure the new verified-only UI is present (wait for wallet auto-connect + Convex data).
    await expect(
      page.getByRole('heading', { name: 'Dashboard', exact: true }),
      'Dashboard header should render for connected users'
    ).toBeVisible({ timeout: 30000 })

    // Removed/stub CTAs should not appear.
    const removedCtas = ['Manage Payments', 'Verify First Agent', 'Stake GHOST', 'Verify an Agent']
    for (const label of removedCtas) {
      await expect(
        page.getByText(label, { exact: true }),
        `CTA "${label}" should be removed from /dashboard`
      ).toHaveCount(0)
    }

    // Verified action bar routes.
    // These labels can appear in multiple places, so scope to the action bar for stability.
    const actionBar = page.getByTestId('verified-action-bar')
    const chatLink = actionBar.getByRole('link', { name: 'Chat with Caisper' })
    const registerLink = actionBar.getByRole('link', { name: 'Register Agent' })
    const observeLink = actionBar.getByRole('link', { name: 'Observe' })
    const settingsLink = actionBar.getByRole('link', { name: 'Settings' })

    await expect(chatLink, 'Verified action bar should expose Chat entrypoint').toBeVisible()
    await expect(
      registerLink,
      'Verified action bar should expose Register Agent entrypoint'
    ).toBeVisible()
    await expect(observeLink, 'Verified action bar should expose Observe entrypoint').toBeVisible()
    await expect(
      settingsLink,
      'Verified action bar should expose Settings entrypoint'
    ).toBeVisible()

    await chatLink.click()
    await expect(page).toHaveURL(/\/caisper(\?.*)?$/, { timeout: 15000 })
    await page.goBack()
    await expect(page).toHaveURL(/\/dashboard(\?.*)?$/)

    await registerLink.click()
    await expect(page).toHaveURL(/\/agents\/register(\?.*)?$/, { timeout: 15000 })
    await page.goBack()
    await expect(page).toHaveURL(/\/dashboard(\?.*)?$/)

    await settingsLink.click()
    await expect(page).toHaveURL(/\/settings(\?.*)?$/, { timeout: 15000 })
    await page.goBack()
    await expect(page).toHaveURL(/\/dashboard(\?.*)?$/)

    await observeLink.click()
    await expect(page).toHaveURL(/\/dashboard\/observe(\?.*)?$/, { timeout: 15000 })
    await page.goBack()
    await expect(page).toHaveURL(/\/dashboard(\?.*)?$/)

    // Verification contract panel/card (should be present on the dashboard page).
    const contractCard = page.getByTestId('verification-contract-card')
    await expect(
      contractCard.getByText('Verified Session', { exact: true }),
      'Verified session panel should be present on /dashboard'
    ).toBeVisible({ timeout: 15000 })
    await expect(
      contractCard.getByRole('heading', { name: 'Session status' }),
      'Verified session panel should communicate session-gated dashboard framing'
    ).toBeVisible({ timeout: 15000 })
  })
})
