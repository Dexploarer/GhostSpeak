/**
 * Token Configuration
 * 
 * Single source of truth for token mint addresses across all networks.
 * Centralizes token addresses to avoid hardcoding throughout the codebase.
 */

import { address, type Address } from '@solana/addresses'
import type { NetworkEnvironment } from './program-ids'

/**
 * GHOST Token Mint Addresses
 * 
 * - Devnet: Test token for development
 * - Mainnet: Real GHOST token deployed on pump.fun (Dec 26, 2025)
 */
export const GHOST_TOKEN_MINTS = {
  devnet: address('BV4uhhMJ84zjwRomS15JMH5wdXVrMP8o9E1URS4xtYoh'),
  mainnet: address('DFQ9ejBt1T192Xnru1J21bFq9FSU7gjRRRYJkehvpump'),
  testnet: address('BV4uhhMJ84zjwRomS15JMH5wdXVrMP8o9E1URS4xtYoh'), // Same as devnet for now
  localnet: address('BV4uhhMJ84zjwRomS15JMH5wdXVrMP8o9E1URS4xtYoh'), // Same as devnet for now
} as const

/**
 * GHOST Token Configuration
 */
export const GHOST_TOKEN_CONFIG = {
  symbol: 'GHOST',
  name: 'Ghostspeak',
  decimals: 6,
  mainnet: {
    mint: GHOST_TOKEN_MINTS.mainnet,
    supplyLamports: 999753007258579n,
    supplyTokens: 999753007.258579,
    mintAuthority: null, // Revoked (immutable)
    freezeAuthority: null, // Revoked (decentralized)
    launchedAt: new Date('2025-12-26'),
    dexPair: 'https://dexscreener.com/solana/e44xj7jyjxyermlqqwrpu4nekcphawfjf3ppn2uokgdb',
  },
} as const

/**
 * USDC Token Mint Addresses
 * 
 * Official Circle USDC mints for each network
 */
export const USDC_TOKEN_MINTS = {
  mainnet: address('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'),
  devnet: address('4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU'),
  testnet: address('4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU'), // Same as devnet
  localnet: address('4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU'), // Same as devnet
} as const

/**
 * USDC Token Configuration
 */
export const USDC_TOKEN_CONFIG = {
  symbol: 'USDC',
  name: 'USD Coin',
  decimals: 6,
} as const

/**
 * USDT Token Mint Addresses (if needed)
 */
export const USDT_TOKEN_MINTS = {
  mainnet: address('Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB'),
  devnet: address('Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB'), // Same as mainnet
  testnet: address('Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB'),
  localnet: address('Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB'),
} as const

/**
 * SOL Native Mint (wrapped SOL)
 */
export const SOL_MINT = address('So11111111111111111111111111111111111111112')

/**
 * Get GHOST token mint for the specified network
 * 
 * @param network - Network environment (defaults to 'devnet')
 * @returns GHOST token mint address
 */
export function getGhostTokenMint(network: NetworkEnvironment = 'devnet'): Address {
  return GHOST_TOKEN_MINTS[network]
}

/**
 * Get USDC token mint for the specified network
 * 
 * @param network - Network environment (defaults to 'devnet')
 * @returns USDC token mint address
 */
export function getUSDCTokenMint(network: NetworkEnvironment = 'devnet'): Address {
  return USDC_TOKEN_MINTS[network]
}

/**
 * Get USDT token mint for the specified network
 * 
 * @param network - Network environment (defaults to 'devnet')
 * @returns USDT token mint address
 */
export function getUSDTTokenMint(network: NetworkEnvironment = 'devnet'): Address {
  return USDT_TOKEN_MINTS[network]
}

/**
 * Token configuration helper
 */
export const TOKEN_CONFIG = {
  GHOST: {
    mints: GHOST_TOKEN_MINTS,
    config: GHOST_TOKEN_CONFIG,
    getMint: getGhostTokenMint,
  },
  USDC: {
    mints: USDC_TOKEN_MINTS,
    config: USDC_TOKEN_CONFIG,
    getMint: getUSDCTokenMint,
  },
  USDT: {
    mints: USDT_TOKEN_MINTS,
    getMint: getUSDTTokenMint,
  },
  SOL: {
    mint: SOL_MINT,
  },
} as const
