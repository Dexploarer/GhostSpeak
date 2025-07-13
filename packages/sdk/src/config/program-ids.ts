/**
 * Program IDs and Network Configuration
 * Local configuration for SDK builds
 */

import type { Address } from '@solana/addresses';

export type NetworkEnvironment = 'localnet' | 'devnet' | 'testnet' | 'mainnet-beta';

export interface NetworkConfig {
  name: NetworkEnvironment;
  rpcUrl: string;
  rpcEndpoint: string; // Alias for compatibility
  wsEndpoint?: string; // WebSocket endpoint for subscriptions
  programId: Address;
  commitment: 'processed' | 'confirmed' | 'finalized';
}

// The canonical program ID for GhostSpeak Protocol  
export const GHOSTSPEAK_PROGRAM_ID = '367WUUpQTxXYUZqFyo9rDpgfJtH7mfGxX9twahdUmaEK' as Address;

export const NETWORK_CONFIGS: Record<NetworkEnvironment, NetworkConfig> = {
  localnet: {
    name: 'localnet',
    rpcUrl: 'http://127.0.0.1:8899',
    rpcEndpoint: 'http://127.0.0.1:8899',
    programId: GHOSTSPEAK_PROGRAM_ID,
    commitment: 'processed',
  },
  devnet: {
    name: 'devnet', 
    rpcUrl: 'https://api.devnet.solana.com',
    rpcEndpoint: 'https://api.devnet.solana.com',
    programId: GHOSTSPEAK_PROGRAM_ID,
    commitment: 'confirmed',
  },
  testnet: {
    name: 'testnet',
    rpcUrl: 'https://api.testnet.solana.com',
    rpcEndpoint: 'https://api.testnet.solana.com', 
    programId: GHOSTSPEAK_PROGRAM_ID,
    commitment: 'confirmed',
  },
  'mainnet-beta': {
    name: 'mainnet-beta',
    rpcUrl: 'https://api.mainnet-beta.solana.com',
    rpcEndpoint: 'https://api.mainnet-beta.solana.com',
    programId: GHOSTSPEAK_PROGRAM_ID,
    commitment: 'finalized',
  },
};

export function getCurrentProgramId(network: NetworkEnvironment = 'devnet'): Address {
  return NETWORK_CONFIGS[network].programId;
}

export function getNetworkConfig(network: NetworkEnvironment = 'devnet'): NetworkConfig {
  return NETWORK_CONFIGS[network];
}

export { GHOSTSPEAK_PROGRAM_ID as DEFAULT_PROGRAM_ID };
export default GHOSTSPEAK_PROGRAM_ID;