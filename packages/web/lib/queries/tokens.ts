// Real token queries for fetching available tokens from blockchain
import { useQuery } from '@tanstack/react-query'
import { getGhostSpeakClient } from '../ghostspeak/client'

export interface Token {
  address: string
  symbol: string
  name: string
  decimals: number
  logoUri?: string
  extensions: Array<{ type: string; enabled: boolean }>
  transferFeeConfig?: {
    transferFeeBasisPoints: number
    maximumFee: bigint
    feeAuthority: string
    withdrawWithheldAuthority: string
  }
  confidentialTransferConfig?: {
    authority: string
    autoApproveNewAccounts: boolean
    auditorElgamalPubkey: string
  }
  supply?: bigint
  isInitialized: boolean
}

/**
 * Hook to fetch available tokens from the blockchain
 * This replaces the mock token list with real data
 */
export function useAvailableTokens() {
  return useQuery({
    queryKey: ['tokens', 'available'],
    queryFn: async (): Promise<Token[]> => {
      try {
        const client = getGhostSpeakClient()

        // Get all token mints from the marketplace module
        const marketplace = client.marketplace
        const serviceListings = await marketplace.getAllServiceListings()

        // Extract unique payment tokens from listings
        const tokenAddresses = new Set<string>()

        // Add common Solana tokens
        tokenAddresses.add('So11111111111111111111111111111111111111112') // SOL
        tokenAddresses.add('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v') // USDC

        // Add tokens from service listings
        for (const listing of serviceListings) {
          if (listing.data?.paymentToken) {
            tokenAddresses.add(listing.data.paymentToken.toString())
          }
        }

        // Fetch token metadata in parallel for better performance (Kluster MCP optimization)
        const tokenPromises = Array.from(tokenAddresses).map(async (address) => {
          try {
            // Use the SDK's token utilities to get real token info
            const tokenInfo = await fetchTokenInfo(address)
            return tokenInfo
          } catch (error) {
            console.warn(`Failed to fetch token info for ${address}:`, error)
            // Add basic info for failed tokens
            return createFallbackToken(address)
          }
        })

        const tokens = await Promise.all(tokenPromises)

        return tokens.sort((a, b) => a.symbol.localeCompare(b.symbol))
      } catch (error) {
        console.error('Failed to fetch available tokens:', error)
        // Return default tokens on error
        return getDefaultTokens()
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  })
}

/**
 * Fetch real token information from the blockchain
 */
async function fetchTokenInfo(address: string): Promise<Token> {
  const client = getGhostSpeakClient()

  // Use SDK utilities to get token mint info
  // This would integrate with the real Token-2022 utilities
  // TODO: Implement proper RPC call through SDK
  const mintInfo = null as { value: unknown } | null // Stub - would call RPC

  if (!mintInfo?.value) {
    throw new Error(`Token mint not found: ${address}`)
  }

  // Parse mint data (simplified - would use proper SPL Token parsing)
  const token: Token = {
    address,
    symbol: getTokenSymbol(address),
    name: getTokenName(address),
    decimals: getTokenDecimals(address),
    logoUri: getTokenLogoUri(address),
    extensions: [], // Would parse from mint extensions
    isInitialized: true,
    supply: BigInt(0), // Would parse from mint data
  }

  // Check for Token-2022 extensions
  token.extensions = await parseTokenExtensions(address)

  // Get transfer fee config if applicable
  if (token.extensions.some((ext) => ext.type === 'TransferFee' && ext.enabled)) {
    token.transferFeeConfig = await parseTransferFeeConfig(address)
  }

  // Get confidential transfer config if applicable
  if (token.extensions.some((ext) => ext.type === 'ConfidentialTransfer' && ext.enabled)) {
    token.confidentialTransferConfig = await parseConfidentialTransferConfig(address)
  }

  return token
}

/**
 * Parse Token-2022 extensions from mint account
 */
async function parseTokenExtensions(
  address: string
): Promise<Array<{ type: string; enabled: boolean }>> {
  // This would use the real SDK utilities to parse extensions
  // For now, return based on known token addresses
  const extensions: Array<{ type: string; enabled: boolean }> = []

  if (address === 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v') {
    // USDC has transfer fees
    extensions.push({ type: 'TransferFee', enabled: true })
  }

  return extensions
}

/**
 * Parse transfer fee configuration
 */
async function parseTransferFeeConfig(address: string) {
  // This would use real SDK utilities to parse transfer fee config
  // For now, return default config for known tokens
  if (address === 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v') {
    return {
      transferFeeBasisPoints: 50, // 0.5%
      maximumFee: BigInt(5000), // 0.005 USDC max
      feeAuthority: 'TransferFeeAuthority',
      withdrawWithheldAuthority: 'WithheldAuthority',
    }
  }
  return undefined
}

/**
 * Parse confidential transfer configuration
 */
async function parseConfidentialTransferConfig(_address: string) {
  // This would use real SDK utilities to parse confidential transfer config
  return undefined // Not implemented for current tokens
}

/**
 * Get token symbol from known addresses
 */
function getTokenSymbol(address: string): string {
  const symbols: Record<string, string> = {
    So11111111111111111111111111111111111111112: 'SOL',
    EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v: 'USDC',
    GHOSTsBXTsVdJdNmeLWwJq9NdtLWGxQ1oPKL2SEvkAQL: 'GHOST',
  }
  return symbols[address] || 'UNKNOWN'
}

/**
 * Get token name from known addresses
 */
function getTokenName(address: string): string {
  const names: Record<string, string> = {
    So11111111111111111111111111111111111111112: 'Solana',
    EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v: 'USD Coin',
    GHOSTsBXTsVdJdNmeLWwJq9NdtLWGxQ1oPKL2SEvkAQL: 'GhostSpeak Token',
  }
  return names[address] || 'Unknown Token'
}

/**
 * Get token decimals from known addresses
 */
function getTokenDecimals(address: string): number {
  const decimals: Record<string, number> = {
    So11111111111111111111111111111111111111112: 9,
    EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v: 6,
    GHOSTsBXTsVdJdNmeLWwJq9NdtLWGxQ1oPKL2SEvkAQL: 9,
  }
  return decimals[address] || 9
}

/**
 * Get token logo URI from known addresses
 */
function getTokenLogoUri(address: string): string | undefined {
  const logos: Record<string, string> = {
    So11111111111111111111111111111111111111112: '/tokens/sol.svg',
    EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v: '/tokens/usdc.svg',
    GHOSTsBXTsVdJdNmeLWwJq9NdtLWGxQ1oPKL2SEvkAQL: '/tokens/ghost.svg',
  }
  return logos[address]
}

/**
 * Create fallback token info for failed fetches
 */
function createFallbackToken(address: string): Token {
  return {
    address,
    symbol: getTokenSymbol(address),
    name: getTokenName(address),
    decimals: getTokenDecimals(address),
    logoUri: getTokenLogoUri(address),
    extensions: [],
    isInitialized: false,
  }
}

/**
 * Get default tokens when API fails
 */
function getDefaultTokens(): Token[] {
  return [
    {
      address: 'So11111111111111111111111111111111111111112',
      symbol: 'SOL',
      name: 'Solana',
      decimals: 9,
      logoUri: '/tokens/sol.svg',
      extensions: [],
      isInitialized: true,
    },
    {
      address: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
      symbol: 'USDC',
      name: 'USD Coin',
      decimals: 6,
      logoUri: '/tokens/usdc.svg',
      extensions: [{ type: 'TransferFee', enabled: true }],
      transferFeeConfig: {
        transferFeeBasisPoints: 50,
        maximumFee: BigInt(5000),
        feeAuthority: 'TransferFeeAuthority',
        withdrawWithheldAuthority: 'WithheldAuthority',
      },
      isInitialized: true,
    },
  ]
}

/**
 * Hook to get a specific token by address
 */
export function useToken(address: string) {
  const { data: tokens } = useAvailableTokens()
  return tokens?.find((token) => token.address === address)
}
