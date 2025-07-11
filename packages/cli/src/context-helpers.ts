import { createSolanaRpc } from '@solana/rpc';
import { generateKeyPairSigner, type KeyPairSigner } from '@solana/signers';

import { ConfigManager } from './core/ConfigManager';

/**
 * Get a Solana RPC client using the current CLI config
 */
export async function getRpc() {
  // For now, use devnet by default to avoid ConfigManager complexity
  // TODO: Load from config once config loading is stabilized
  const rpcUrl = 'https://api.devnet.solana.com';
  return createSolanaRpc(rpcUrl);
}

/**
 * Get the program ID for a given service
 * @param service - Service name (e.g., 'agent', 'channel', 'message')
 */
export async function getProgramId(service: string): Promise<string> {
  // Get the program ID from the SDK
  const sdk = await getGhostspeakSdk();
  
  // For now, all core services use the main GhostSpeak program
  // In the future, add more mappings as needed
  switch (service) {
    case 'agent':
    case 'channel':
    case 'message':
    case 'escrow':
      return sdk.GHOSTSPEAK_PROGRAM_ID;
    // Add more cases for other programs as needed
    default:
      return sdk.GHOSTSPEAK_PROGRAM_ID;
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
  // Use confirmed by default for now
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
      // Fallback to local workspace SDK (for monorepo/dev) - use built files
      return await import('../../sdk/dist/esm-fixed/index.js');
    } catch (err) {
      throw new Error(
        'Ghostspeak SDK could not be loaded from either published package or workspace.'
      );
    }
  }
}
