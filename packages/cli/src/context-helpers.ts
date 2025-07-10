import { POD_COM_PROGRAM_ADDRESS } from '@ghostspeak/ghostspeak/generated-v2/programs/podCom';
import { createSolanaRpc } from '@solana/rpc';
import { generateKeyPairSigner, type KeyPairSigner } from '@solana/signers';

import { ConfigManager } from './core/ConfigManager';

/**
 * Get a Solana RPC client using the current CLI config
 */
export async function getRpc() {
  const configManager = await ConfigManager.load();
  const { rpcUrl, network } = configManager.getNetworkConfig();
  // Default URLs for each network
  const urls: Record<string, string> = {
    devnet: 'https://api.devnet.solana.com',
    testnet: 'https://api.testnet.solana.com',
    'mainnet-beta': 'https://api.mainnet-beta.solana.com',
  };
  return createSolanaRpc(rpcUrl || urls[network] || urls['devnet']);
}

/**
 * Get the program ID for a given service
 * @param service - Service name (e.g., 'agent', 'channel', 'message')
 */
export function getProgramId(service: string): string {
  // For now, all core services use the podCom program
  // In the future, add more mappings as needed
  switch (service) {
    case 'agent':
    case 'channel':
    case 'message':
      return POD_COM_PROGRAM_ADDRESS;
    // Add more cases for other programs as needed
    default:
      return POD_COM_PROGRAM_ADDRESS;
  }
}

/**
 * Get a KeyPairSigner for the CLI user
 * (In production, load from disk or wallet integration)
 */
export async function getKeypair(): Promise<KeyPairSigner> {
  // For now, generate a new keypair each time (replace with persistent storage or wallet integration)
  return await generateKeyPairSigner();
}

/**
 * Get the commitment level from config or default
 */
export async function getCommitment(): Promise<
  'confirmed' | 'finalized' | 'processed'
> {
  const configManager = await ConfigManager.load();
  // In the future, allow user to set this in config
  return 'confirmed';
}

/**
 * Stub for RPC subscriptions (not implemented in CLI)
 * Returns null to indicate subscriptions are not available
 */
export function getRpcSubscriptions() {
  // Return null instead of throwing to allow graceful degradation
  // SDKs can check for null and skip subscription features
  return null;
}

/**
 * Dynamically import the Ghostspeak SDK, preferring the published package.
 * Falls back to the local workspace SDK if the published package is not available.
 */
export async function getGhostspeakSdk() {
  try {
    // Try published package first
    return await import('@ghostspeak/ghostspeak');
  } catch (e) {
    try {
      // Fallback to local workspace SDK (for monorepo/dev)
      return await import('../../sdk/src/index.ts');
    } catch (err) {
      throw new Error(
        'Ghostspeak SDK could not be loaded from either published package or workspace.'
      );
    }
  }
}
