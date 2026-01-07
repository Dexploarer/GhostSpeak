import { test, expect, type Page } from '@playwright/test'
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

  // Avoid onboarding overlays by marking onboarding as completed.
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

async function seedAgentProfileAndCredential({
  agentAddress,
  convexUrl,
}: {
  agentAddress: string
  convexUrl: string
}): Promise<{ credentialId: string | null }> {
  const convex = new ConvexHttpClient(convexUrl)

  // Ensure the "agent card" can render a status row (requires a discoveredAgents record).
  await convex.mutation(api.ghostDiscovery.bulkImportDiscoveredAgents, {
    agents: [
      {
        ghostAddress: agentAddress,
        firstTxSignature: `e2e_discovery_${Date.now()}`,
        // ghostDiscovery.bulkImportDiscoveredAgents treats this as seconds-ish; it's not user-visible in this test.
        firstSeenTimestamp: Math.floor(Date.now() / 1000),
        discoverySource: 'e2e',
        facilitatorAddress: undefined,
        slot: 0,
      },
    ],
  })

  // Seed an easy, dependency-free VC (agent identity).
  // If it already exists in a reused local DB, the mutation returns { success: false, reason: 'already_issued', credentialId }.
  const issued = await convex.mutation(api.credentials.issueAgentIdentityCredentialPublic, {
    agentAddress,
    did: `did:sol:devnet:${agentAddress}`,
  })

  return { credentialId: issued?.credentialId ?? null }
}

type MockWalletOptions = {
  includeSignMessage: boolean
}

async function installMockWalletStandard(
  page: Page,
  walletAddress: string,
  { includeSignMessage }: MockWalletOptions
) {
  await page.addInitScript(
    ({ walletAddress, includeSignMessage }) => {
      const walletName = 'E2E Test Wallet'

      // Ensure WalletStandardProvider auto-connects.
      try {
        window.localStorage.setItem('walletName', walletName)
        // Suppress the dashboard onboarding wizard overlay.
        window.localStorage.setItem('ghostspeak_onboarding_completed', 'true')

        // NOTE: We do NOT set ghostspeak_auth here.
        // ConnectWalletButton clears ghostspeak_auth whenever the wallet is disconnected,
        // which can happen during initial hydration before auto-connect completes.
        window.localStorage.removeItem('ghostspeak_auth')
      } catch {
        // ignore
      }

      const features: Record<string, any> = {
        'standard:connect': {
          version: '1.0.0',
          connect: async () => {
            return {
              accounts: [
                {
                  address: walletAddress,
                  publicKey: new Uint8Array(32),
                  // Support both common clusters so the UI doesn't reject the wallet as "wrong network".
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
          disconnect: async () => {},
        },
        // Minimal Solana feature stubs (required so the wallet is considered a Solana wallet).
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

      // Correct Wallet Standard registration sequence:
      // - Dispatch "wallet-standard:register-wallet" with a callback
      // - Also listen for "wallet-standard:app-ready" so we can register even if the app loads after us.
      const callback = ({ register }: { register: (...wallets: any[]) => unknown }) =>
        register(wallet)

      try {
        window.dispatchEvent(
          new CustomEvent('wallet-standard:register-wallet', {
            detail: callback,
          })
        )
      } catch {
        // ignore
      }

      try {
        window.addEventListener('wallet-standard:app-ready', (event: any) => {
          if (event?.detail) callback(event.detail)
        })
      } catch {
        // ignore
      }
    },
    { walletAddress, includeSignMessage }
  )
}

async function ensureWalletAutoConnected(page: Page, { walletAddress }: { walletAddress: string }) {
  // Connect wallet on a non-redirecting page first, so /dashboard/* doesn't immediately push us back to '/'.
  await page.goto('/', { waitUntil: 'domcontentloaded' })

  const formatted = `${walletAddress.slice(0, 4)}...${walletAddress.slice(-4)}`
  const formattedEscaped = formatted.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  await expect(
    page
      .getByRole('button')
      .filter({ hasText: new RegExp(`${formattedEscaped}|Sign to authenticate\\.\\.\\.`) })
      .first(),
    `Expected mock wallet to connect (showing either ${formatted} or "Sign to authenticate...")`
  ).toBeVisible({ timeout: 30_000 })
}

async function injectVerifiedSession(
  page: Page,
  { walletAddress, userId }: { walletAddress: string; userId: string }
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

async function gotoDashboardViaPortal(page: Page) {
  // Use in-app navigation to preserve wallet connection state.
  const portalButton = page.getByRole('button', { name: 'Portal' })
  await portalButton.scrollIntoViewIfNeeded()
  await portalButton.click()
  await expect(page, 'Expected Portal CTA to navigate to /dashboard').toHaveURL(
    /\/dashboard(\?.*)?$/,
    {
      timeout: 30_000,
    }
  )
  await expect(
    page.getByRole('heading', { name: 'Dashboard', exact: true }),
    'Expected /dashboard heading after navigating via Portal CTA'
  ).toBeVisible({ timeout: 30_000 })
}

test.describe('Dashboard /credentials - VC lookup UX', () => {
  test('agent address input → agent card → VC list → VC details panel', async ({ page }) => {
    const convexUrl = getConvexUrlFromDotenv()
    test.skip(
      !convexUrl,
      'Missing NEXT_PUBLIC_CONVEX_URL; cannot seed Convex data for credentials lookup'
    )

    // Connected wallet (viewer) for the dashboard session.
    const walletAddress = '2wKupLR9q6wXYppw8Gr2NvWxKBUqm4PPJKkQfoxHDBg4'

    // Lookup subject agent address (does not need to match connected wallet).
    // This is a known-valid 32-byte base58 address (Serum DEX program on Solana).
    const agentAddress = '9xQeWvG816bUx9EPfYcGJp6G7G6uFi7qSogn8CA9nV2'

    await seedUserForDashboard(walletAddress, convexUrl!)
    const { credentialId } = await seedAgentProfileAndCredential({
      agentAddress,
      convexUrl: convexUrl!,
    })

    await installMockWalletStandard(page, walletAddress, {
      // Prevent ConnectWalletButton from auto-signing and triggering competing navigations.
      includeSignMessage: false,
    })
    await ensureWalletAutoConnected(page, { walletAddress })

    const userId = await getUserIdForWalletAddress(walletAddress, convexUrl!)
    await injectVerifiedSession(page, { walletAddress, userId })

    await gotoDashboardViaPortal(page)
    await page
      .getByTestId('verification-contract-card')
      .getByRole('link', { name: 'Credentials' })
      .click()
    await expect(page, 'Expected navigation to /dashboard/credentials').toHaveURL(
      /\/dashboard\/credentials(\?.*)?$/,
      {
        timeout: 30_000,
      }
    )

    await expect(
      page.getByRole('heading', { level: 1, name: 'Credentials', exact: true }),
      'Expected /dashboard/credentials to render an <h1> heading under a verified session'
    ).toBeVisible({ timeout: 30_000 })

    // Lookup UX (input + button).
    await expect(page.getByTestId('credentials-lookup-section')).toBeVisible({ timeout: 30_000 })
    await page.getByTestId('credentials-agent-address-input').fill(agentAddress)
    await page.getByTestId('credentials-agent-submit').click()

    // Agent card renders, including status and external IDs section.
    const agentCard = page.getByTestId('credentials-agent-card')
    await expect(agentCard, 'Expected agent card to render after Lookup').toBeVisible({
      timeout: 30_000,
    })
    await expect(
      agentCard.getByTestId('credentials-agent-address'),
      'Expected agent card to display the normalized lookup address'
    ).toHaveText(agentAddress)

    await expect(
      agentCard.getByTestId('credentials-agent-status'),
      'Expected agent profile status field to render (requires discoveredAgents row)'
    ).toHaveText(/\w+/, { timeout: 30_000 })
    await expect(
      agentCard.getByText('External IDs & reputation', { exact: true }),
      'Expected External IDs & reputation section header to render'
    ).toBeVisible()

    const externalIdsList = agentCard.getByTestId('credentials-agent-external-ids')
    if ((await externalIdsList.count()) > 0) {
      await expect(
        externalIdsList,
        'Expected external IDs list to render when mappings exist'
      ).toBeVisible()
    } else {
      await expect(
        agentCard.getByText('None found.', { exact: true }),
        'Expected stable external IDs empty state when no mappings exist'
      ).toBeVisible()
    }

    // Credentials list renders (either as list or stable empty state).
    const listSection = page.getByTestId('credentials-list-section')
    await expect(
      listSection,
      'Expected Credentials list section to render after Lookup'
    ).toBeVisible({
      timeout: 30_000,
    })

    const credentialRows = page.getByTestId('credential-row')
    if ((await credentialRows.count()) === 0) {
      await expect(
        page.getByTestId('credentials-empty'),
        'Expected stable empty state when agent has zero credentials'
      ).toBeVisible({ timeout: 30_000 })
      return
    }

    await expect(credentialRows.first(), 'Expected at least one credential row').toBeVisible({
      timeout: 30_000,
    })
    await credentialRows.first().click()

    // Details panel opens and shows evidence + proof disclaimer.
    const detailsPanel = page.getByTestId('credential-details-panel')
    await expect(
      detailsPanel,
      'Expected credential details panel to open after clicking a row'
    ).toBeVisible({
      timeout: 30_000,
    })
    await expect(
      detailsPanel.getByTestId('credential-details-proof'),
      'Expected proof disclaimer panel to render in details view'
    ).toContainText('Proof: not available in web yet', { timeout: 30_000 })

    // Evidence block should render concrete evidence fields (for agent_identity this includes did + crossmintCredentialId).
    await expect(detailsPanel.getByTestId('credential-details-evidence')).toBeVisible({
      timeout: 30_000,
    })
    const evidenceList = detailsPanel.getByTestId('credential-details-evidence-list')
    await expect(
      evidenceList,
      'Expected evidence list to be visible once details are loaded'
    ).toBeVisible({
      timeout: 30_000,
    })
    await expect(
      evidenceList,
      'Expected evidence list to include "did" field for agent identity credentials'
    ).toContainText('did:', { timeout: 30_000 })

    // If we successfully seeded an identity credential, prefer asserting the exact credential ID.
    if (credentialId) {
      await expect(
        detailsPanel.getByTestId('credential-details-id'),
        'Expected details panel to show the seeded credentialId'
      ).toHaveText(credentialId, { timeout: 30_000 })
    }
  })
})
