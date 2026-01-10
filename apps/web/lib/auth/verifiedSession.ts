export type GhostSpeakAuthSession = {
  userId?: string
  sessionToken: string
  walletAddress: string
}

/**
 * Reads the SIWS auth session stored by ConnectWalletButton.
 *
 * "Verified session" (dashboard terminology) means:
 * - wallet connected (handled by wallet provider)
 * - AND this session is present + matches the connected wallet
 */
export function readGhostSpeakAuthSessionFromLocalStorage(): GhostSpeakAuthSession | null {
  if (typeof window === 'undefined') return null

  try {
    const raw = window.localStorage.getItem('ghostspeak_auth')
    if (!raw) return null

    const parsed = JSON.parse(raw) as Partial<GhostSpeakAuthSession>
    if (!parsed || typeof parsed !== 'object') return null

    if (!parsed.walletAddress || typeof parsed.walletAddress !== 'string') return null
    if (!parsed.sessionToken || typeof parsed.sessionToken !== 'string') return null

    return {
      userId: typeof parsed.userId === 'string' ? parsed.userId : undefined,
      walletAddress: parsed.walletAddress,
      sessionToken: parsed.sessionToken,
    }
  } catch {
    // If it's corrupt, clear it so we don't repeatedly fail to parse.
    try {
      window.localStorage.removeItem('ghostspeak_auth')
    } catch {
      // ignore
    }
    return null
  }
}

/**
 * Client-side check (for UI only, NOT for authorization)
 * This just checks if the session exists locally, but does NOT validate it server-side.
 * IMPORTANT: Do not use this for authorization decisions. Always validate server-side.
 */
export function isVerifiedSessionForWallet(walletAddress?: string | null): boolean {
  if (!walletAddress) return false
  const session = readGhostSpeakAuthSessionFromLocalStorage()
  return !!session && session.walletAddress === walletAddress && !!session.sessionToken
}

/**
 * Server-side session validation using Convex
 * This should be used for ALL authorization decisions
 */
export async function validateSessionServerSide(
  sessionToken: string,
  convexClient: any // ConvexReactClient type
): Promise<{ valid: boolean; userId?: string; walletAddress?: string; error?: string }> {
  try {
    const result = await convexClient.query('sessions:validateSession', {
      sessionToken,
    })
    return result
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Validation failed',
    }
  }
}
