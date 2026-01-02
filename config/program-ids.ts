/**
 * Program ID Configuration
 * 
 * Single source of truth for GhostSpeak program IDs across all networks.
 * These IDs match the program ID declared in programs/src/lib.rs
 */

import { address, type Address } from '@solana/addresses';

export type NetworkEnvironment = 'mainnet' | 'devnet' | 'testnet' | 'localnet';

/**
 * Program IDs for each network
 * 
 * Current deployment:
 * - Devnet: 4wHjA2a5YC4twZb4NQpwZpixo5FgxxzuJUrCG7UnF9pB (deployed Dec 30, 2025)
 * - Mainnet: TBD (not yet deployed)
 */
export const PROGRAM_IDS = {
  devnet: address('4wHjA2a5YC4twZb4NQpwZpixo5FgxxzuJUrCG7UnF9pB'),
  localnet: address('4wHjA2a5YC4twZb4NQpwZpixo5FgxxzuJUrCG7UnF9pB'),
  testnet: address('4wHjA2a5YC4twZb4NQpwZpixo5FgxxzuJUrCG7UnF9pB'), // Same as devnet for now
  mainnet: address('4wHjA2a5YC4twZb4NQpwZpixo5FgxxzuJUrCG7UnF9pB'), // TODO: Update after mainnet deployment
} as const;

/**
 * Get program ID for the specified network
 * 
 * @param network - Network environment (defaults to 'devnet')
 * @returns Program ID as Address
 */
export function getCurrentProgramId(network: NetworkEnvironment = 'devnet'): Address {
  return PROGRAM_IDS[network];
}

/**
 * Get network configuration including RPC endpoint and program ID
 * 
 * @param network - Network environment (defaults to 'devnet')
 * @returns Network configuration object
 */
export function getNetworkConfig(network: NetworkEnvironment = 'devnet') {
  const endpoints = {
    mainnet: 'https://api.mainnet-beta.solana.com',
    devnet: 'https://api.devnet.solana.com',
    testnet: 'https://api.testnet.solana.com',
    localnet: 'http://localhost:8899',
  } as const;

  return {
    endpoint: endpoints[network],
    programId: PROGRAM_IDS[network],
    network,
  };
}