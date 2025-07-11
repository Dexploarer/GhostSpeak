/**
 * Program ID Configuration
 */

import type { Address } from '@solana/addresses';

export type NetworkEnvironment = 'mainnet' | 'devnet' | 'testnet' | 'localnet';

export const PROGRAM_IDS = {
  mainnet: '4nusKGxuNwK7XggWQHCMEE1Ht7taWrSJMhhNfTqswVFP' as Address,
  devnet: '4nusKGxuNwK7XggWQHCMEE1Ht7taWrSJMhhNfTqswVFP' as Address,
  testnet: '4nusKGxuNwK7XggWQHCMEE1Ht7taWrSJMhhNfTqswVFP' as Address,
  localnet: '4nusKGxuNwK7XggWQHCMEE1Ht7taWrSJMhhNfTqswVFP' as Address,
};

export function getCurrentProgramId(network: NetworkEnvironment = 'devnet'): Address {
  return PROGRAM_IDS[network];
}

export function getNetworkConfig(network: NetworkEnvironment = 'devnet') {
  const endpoints = {
    mainnet: 'https://api.mainnet-beta.solana.com',
    devnet: 'https://api.devnet.solana.com',
    testnet: 'https://api.testnet.solana.com',
    localnet: 'http://localhost:8899',
  };

  return {
    endpoint: endpoints[network],
    programId: PROGRAM_IDS[network],
    network,
  };
}