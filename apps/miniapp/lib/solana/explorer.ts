/**
 * Solana Explorer Utilities
 *
 * Provides network detection and explorer URL generation for Solana
 */

import { config } from '@/lib/config'

export type SolanaNetwork = 'mainnet' | 'devnet' | 'testnet'

/**
 * Get the current Solana network from environment variables
 * Defaults to mainnet if not specified
 */
export function getSolanaNetwork(): SolanaNetwork {
  const network = config.solana.network.toLowerCase()

  if (network === 'devnet') return 'devnet'
  if (network === 'testnet') return 'testnet'

  // Also check RPC URL for network hints
  const rpcUrl = config.solana.rpcUrl.toLowerCase()
  if (rpcUrl.includes('devnet')) return 'devnet'
  if (rpcUrl.includes('testnet')) return 'testnet'

  return 'mainnet'
}

/**
 * Check if the current network is mainnet
 */
export function isMainnet(): boolean {
  return getSolanaNetwork() === 'mainnet'
}

/**
 * Get the Solscan base URL for the current network
 */
export function getSolscanBaseUrl(): string {
  const network = getSolanaNetwork()
  const baseUrl = 'https://solscan.io'

  if (network === 'devnet') {
    return `${baseUrl}?cluster=devnet`
  }
  if (network === 'testnet') {
    return `${baseUrl}?cluster=testnet`
  }

  return baseUrl
}

/**
 * Get a Solscan URL for a transaction signature
 */
export function getTransactionExplorerUrl(signature: string): string {
  const network = getSolanaNetwork()
  const baseUrl = 'https://solscan.io/tx'

  if (network === 'devnet') {
    return `${baseUrl}/${signature}?cluster=devnet`
  }
  if (network === 'testnet') {
    return `${baseUrl}/${signature}?cluster=testnet`
  }

  return `${baseUrl}/${signature}`
}

/**
 * Get a Solscan URL for an account/address
 */
export function getAddressExplorerUrl(address: string): string {
  const network = getSolanaNetwork()
  const baseUrl = 'https://solscan.io/account'

  if (network === 'devnet') {
    return `${baseUrl}/${address}?cluster=devnet`
  }
  if (network === 'testnet') {
    return `${baseUrl}/${address}?cluster=testnet`
  }

  return `${baseUrl}/${address}`
}

/**
 * Get a Solscan URL for a token
 */
export function getTokenExplorerUrl(mintAddress: string): string {
  const network = getSolanaNetwork()
  const baseUrl = 'https://solscan.io/token'

  if (network === 'devnet') {
    return `${baseUrl}/${mintAddress}?cluster=devnet`
  }
  if (network === 'testnet') {
    return `${baseUrl}/${mintAddress}?cluster=testnet`
  }

  return `${baseUrl}/${mintAddress}`
}

/**
 * Network display configuration
 */
export interface NetworkDisplayConfig {
  name: string
  shortName: string
  color: 'green' | 'yellow' | 'orange'
  bgClass: string
  textClass: string
  dotClass: string
}

/**
 * Get display configuration for the current network
 */
export function getNetworkDisplayConfig(): NetworkDisplayConfig {
  const network = getSolanaNetwork()

  switch (network) {
    case 'mainnet':
      return {
        name: 'Mainnet',
        shortName: 'MAINNET',
        color: 'green',
        bgClass: 'bg-green-500/10',
        textClass: 'text-green-500',
        dotClass: 'bg-green-500',
      }
    case 'devnet':
      return {
        name: 'Devnet',
        shortName: 'DEVNET',
        color: 'yellow',
        bgClass: 'bg-yellow-500/10',
        textClass: 'text-yellow-500',
        dotClass: 'bg-yellow-500',
      }
    case 'testnet':
      return {
        name: 'Testnet',
        shortName: 'TESTNET',
        color: 'orange',
        bgClass: 'bg-orange-500/10',
        textClass: 'text-orange-500',
        dotClass: 'bg-orange-500',
      }
  }
}
