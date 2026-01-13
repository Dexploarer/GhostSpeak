/**
 * Jupiter Ultra API Client
 *
 * Handles interactions with Jupiter's Tokens V2, Shield, and Ultra APIs
 * for token analysis, organic scores, and wallet holdings.
 */

// Types for Jupiter Tokens API V2
export interface TokenInfo {
  id: string
  name: string
  symbol: string
  icon: string | null
  decimals: number
  circSupply?: number
  totalSupply?: number
  // Market stats
  fdv?: number
  mcap?: number
  liquidity?: number
  price?: number // Derived or from usdPrice
  usdPrice?: number
  // Verification & Trust
  organicScore?: number // 0-100
  organicScoreLabel?: 'high' | 'medium' | 'low'
  isVerified?: boolean
  tags?: string[]
  // Audit Info
  audit?: {
    isSus?: boolean
    mintAuthorityDisabled?: boolean
    freezeAuthorityDisabled?: boolean
    topHoldersPercentage?: number
    devBalancePercentage?: number
    devMigrations?: number
  }
  // Trading Stats
  stats24h?: SwapStats
  stats1h?: SwapStats
}

export interface SwapStats {
  volumeChange?: number
  priceChange?: number
  buyOrganicVolume?: number
  sellOrganicVolume?: number
  numOrganicBuyers?: number
}

// Types for Shield API
export type ShieldWarningType =
  | 'NOT_VERIFIED'
  | 'LOW_LIQUIDITY'
  | 'NOT_SELLABLE'
  | 'LOW_ORGANIC_ACTIVITY'
  | 'HAS_MINT_AUTHORITY'
  | 'HAS_FREEZE_AUTHORITY'
  | 'HAS_PERMANENT_DELEGATE'
  | 'NEW_LISTING'
  | 'VERY_LOW_TRADING_ACTIVITY'
  | 'HIGH_SUPPLY_CONCENTRATION'
  | 'NON_TRANSFERABLE'
  | 'MUTABLE_TRANSFER_FEES'
  | 'SUSPICIOUS_DEV_ACTIVITY'
  | 'SUSPICIOUS_TOP_HOLDER_ACTIVITY'
  | 'HIGH_SINGLE_OWNERSHIP'

export interface ShieldWarning {
  type: ShieldWarningType
  message: string
  severity: 'info' | 'warning' | 'critical'
  source?: string
}

export interface ShieldResponse {
  warnings: Record<string, ShieldWarning[]> // Key is mint address
}

// Types for Ultra Holdings API
export interface TokenAccount {
  account: string
  amount: string
  uiAmount: number
  uiAmountString: string
  isFrozen: boolean
  isAssociatedTokenAccount: boolean
  decimals: number
  programId: string
}

export interface HoldingsResponse {
  amount: string
  uiAmount: number
  uiAmountString: string
  tokens: Record<string, TokenAccount[]> // Key is mint address
}

export class JupiterUltraClient {
  private apiKey: string
  private baseUrl = 'https://api.jup.ag'

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.JUP_API_KEY || ''
  }

  private async fetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const headers = {
      Accept: 'application/json',
      'x-api-key': this.apiKey,
      ...options.headers,
    }

    const url = `${this.baseUrl}${endpoint}`

    try {
      const response = await fetch(url, { ...options, headers })

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Jupiter API Unauthorized - Invalid API Key')
        }
        if (response.status === 429) {
          throw new Error('Jupiter API Rate Limit Exceeded')
        }
        const errorText = await response.text()
        throw new Error(`Jupiter API Error ${response.status}: ${errorText}`)
      }

      const data = await response.json()
      return data as T
    } catch (error) {
      console.error(`Error fetching ${url}:`, error)
      throw error
    }
  }

  /**
   * Search for tokens by symbol, name, or address
   */
  async searchTokens(query: string): Promise<TokenInfo[]> {
    if (!query) return []
    // TokenV2 Search
    return this.fetch<TokenInfo[]>(`/tokens/v2/search?query=${encodeURIComponent(query)}`)
  }

  /**
   * Get specific token info by mint address
   * Uses search endpoint restricted to 1 result logic or simple filter
   */
  async getTokenInfo(mint: string): Promise<TokenInfo | null> {
    const results = await this.searchTokens(mint)
    // Find exact match
    return results.find((t) => t.id === mint) || null
  }

  /**
   * Get warning flags for a list of tokens
   */
  async getTokenShield(mints: string[]): Promise<ShieldResponse> {
    if (mints.length === 0) return { warnings: {} }
    const mintsParam = mints.slice(0, 50).join(',') // Max 50 usually
    return this.fetch<ShieldResponse>(`/ultra/v1/shield?mints=${mintsParam}`)
  }

  /**
   * Get wallet holdings
   */
  async getWalletHoldings(address: string): Promise<HoldingsResponse> {
    return this.fetch<HoldingsResponse>(`/ultra/v1/holdings/${address}`)
  }

  /**
   * Get top organic tokens by category
   */
  async getTopOrganicTokens(interval: '5m' | '1h' | '6h' | '24h' = '24h'): Promise<TokenInfo[]> {
    // /tokens/v2/toporganicscore/24h
    return this.fetch<TokenInfo[]>(`/tokens/v2/toporganicscore/${interval}`)
  }
}

// Helper to analyze token risk
export const analyzeTokenRisk = (token: TokenInfo, warnings: ShieldWarning[] = []) => {
  const flags = {
    red: [] as string[],
    yellow: [] as string[],
    green: [] as string[],
  }

  // Organic Score Analysis
  if (token.organicScore !== undefined) {
    if (token.organicScore >= 80) flags.green.push('High Organic Score')
    else if (token.organicScore < 30) flags.yellow.push('Low Organic Score')
  }

  // Audit Flags
  if (token.audit) {
    if (token.audit.mintAuthorityDisabled === false) flags.yellow.push('Mint Authority Enabled')
    if (token.audit.freezeAuthorityDisabled === false) flags.yellow.push('Freeze Authority Enabled')
    if (token.audit.isSus) flags.red.push('Flagged as Suspicious by Jupiter')
    if (token.audit.topHoldersPercentage && token.audit.topHoldersPercentage > 0.5) {
      flags.yellow.push('High Holder Concentration (>50%)')
    }
  }

  // Verification
  if (!token.isVerified) {
    flags.yellow.push('Unverified Token')
  } else {
    flags.green.push('Verified Token')
  }

  // Shield Warnings
  warnings.forEach((w: any) => {
    if (w.severity === 'critical') flags.red.push(w.message)
    else if (w.severity === 'warning') flags.yellow.push(w.message)
    else flags.green.push(w.message) // unlikely for warnings but handled
  })

  // Calculate generic risk score (0-100, where 100 is SAFEST)
  let riskScore = 50 // Start neutral

  if (token.organicScore) riskScore = token.organicScore

  // Adjust based on hard flags
  if (flags.red.length > 0) riskScore -= flags.red.length * 20
  if (flags.yellow.length > 0) riskScore -= flags.yellow.length * 5
  if (flags.green.length > 0) riskScore += flags.green.length * 5

  return {
    riskScore: Math.max(0, Math.min(100, riskScore)),
    flags,
  }
}
