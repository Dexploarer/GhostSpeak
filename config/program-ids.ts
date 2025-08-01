/**
 * Program ID Configuration
 */

import type { Address } from '@solana/addresses';

export type NetworkEnvironment = 'mainnet' | 'devnet' | 'testnet' | 'localnet';

export const PROGRAM_IDS = {
  mainnet: 'Ga2aEq5HQeBMUd7AzCcjLaTTLHqigcTQkxcCt4ET9YuS' as Address,
  devnet: 'Ga2aEq5HQeBMUd7AzCcjLaTTLHqigcTQkxcCt4ET9YuS' as Address,
  testnet: 'Ga2aEq5HQeBMUd7AzCcjLaTTLHqigcTQkxcCt4ET9YuS' as Address,
  localnet: 'Ga2aEq5HQeBMUd7AzCcjLaTTLHqigcTQkxcCt4ET9YuS' as Address,
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