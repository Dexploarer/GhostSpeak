/**
 * Network Metadata Helper
 *
 * Provides consistent network information for all Convex responses.
 * Used to add devnet disclaimers to Ghost Score, Observation, and Discovery responses.
 */

/**
 * Network environment type
 */
export type NetworkEnvironment = 'devnet' | 'mainnet-beta'

/**
 * Network metadata included in all responses
 */
export interface NetworkMetadata {
  chain: 'solana'
  environment: NetworkEnvironment
  rpcUrl: string
  notice: string
  programId: string
  ghostTokenMint: string
}

/**
 * Get network metadata based on environment configuration
 *
 * Note: In Convex actions, process.env is available.
 * In queries/mutations, we default to devnet since env vars aren't accessible.
 */
export function getNetworkMetadata(): NetworkMetadata {
  // In Convex queries/mutations, process.env may not be available
  // Default to devnet configuration
  const rpcUrl =
    typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_SOLANA_RPC_URL
      ? process.env.NEXT_PUBLIC_SOLANA_RPC_URL
      : 'https://api.devnet.solana.com'

  const isDevnet = rpcUrl.includes('devnet')
  const environment: NetworkEnvironment = isDevnet ? 'devnet' : 'mainnet-beta'

  // Program and token addresses
  const programId = isDevnet ? '4wHjA2a5YC4twZb4NQpwZpixo5FgxxzuJUrCG7UnF9pB' : '' // Mainnet program not yet deployed

  const ghostTokenMint = isDevnet
    ? 'HaFP2LFWJ8fwe5j837CR6YPJpAwsN27hVqNDAnLcwt81'
    : 'DFQ9ejBt1T192Xnru1J21bFq9FSU7gjRRRYJkehvpump'

  const notice = isDevnet
    ? 'GhostSpeak is operating on Solana Devnet. Data reflects devnet activity only.'
    : 'GhostSpeak is operating on Solana Mainnet.'

  return {
    chain: 'solana',
    environment,
    rpcUrl,
    notice,
    programId,
    ghostTokenMint,
  }
}

/**
 * Get network metadata with discovery-specific note
 * Discovery data comes from mainnet x402 transactions even when on devnet
 */
export function getDiscoveryNetworkMetadata(): NetworkMetadata & { discoveryNote: string } {
  const base = getNetworkMetadata()

  const discoveryNote =
    base.environment === 'devnet'
      ? 'Agent discovery data is sourced from mainnet x402 transactions. GhostSpeak-native operations (registration, credentials, staking) occur on devnet.'
      : 'Agent discovery and all operations occur on Solana Mainnet.'

  return {
    ...base,
    discoveryNote,
  }
}
