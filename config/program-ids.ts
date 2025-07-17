/**
 * Program ID Configuration
 */

import type { Address } from '@solana/addresses';

export type NetworkEnvironment = 'mainnet' | 'devnet' | 'testnet' | 'localnet';

export const PROGRAM_IDS = {
  mainnet: 'AJVoWJ4JC1xJR9ufGBGuMgFpHMLouB29sFRTJRvEK1ZR' as Address,
  devnet: 'AJVoWJ4JC1xJR9ufGBGuMgFpHMLouB29sFRTJRvEK1ZR' as Address,
  testnet: 'AJVoWJ4JC1xJR9ufGBGuMgFpHMLouB29sFRTJRvEK1ZR' as Address,
  localnet: 'AJVoWJ4JC1xJR9ufGBGuMgFpHMLouB29sFRTJRvEK1ZR' as Address,
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