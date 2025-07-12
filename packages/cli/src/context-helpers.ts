import { createSolanaRpc } from '@solana/rpc';
import { generateKeyPairSigner, type KeyPairSigner } from '@solana/signers';
import { ConfigManager } from './core/ConfigManager';
// Direct imports for SDK to avoid dynamic import issues
import { loadAdvancedServices } from '../../sdk/dist/esm-fixed/index.js';
import { withTimeout, TIMEOUTS } from './utils/timeout.js';
import { logger } from './utils/logger.js';

// Cache for loaded SDK modules
let cachedSdk: Awaited<ReturnType<typeof loadAdvancedServices>> | null = null;

/**
 * Get a Solana RPC client using the current CLI config
 */
export async function getRpc() {
  // For now, use devnet by default to avoid ConfigManager complexity
  // TODO: Load from config once config loading is stabilized
  const rpcUrl = 'https://api.devnet.solana.com';
  // createSolanaRpc is synchronous, no need for timeout wrapper
  return createSolanaRpc(rpcUrl);
}

/**
 * Get the program ID for a given service
 * @param service - Service name (e.g., 'agent', 'channel', 'message')
 */
export async function getProgramId(service: string): Promise<string> {
  // Use the canonical program ID directly to avoid circular dependencies
  const GHOSTSPEAK_PROGRAM_ID = '4nusKGxuNwK7XggWQHCMEE1Ht7taWrSJMhhNfTqswVFP';
  
  // For now, all core services use the main GhostSpeak program
  // In the future, add more mappings as needed
  switch (service) {
    case 'agent':
    case 'channel':
    case 'message':
    case 'escrow':
      return GHOSTSPEAK_PROGRAM_ID;
    // Add more cases for other programs as needed
    default:
      return GHOSTSPEAK_PROGRAM_ID;
  }
}

/**
 * Get a KeyPairSigner for the CLI user
 * Provides helpful error messages for wallet configuration issues
 */
export async function getKeypair(): Promise<KeyPairSigner> {
  try {
    // Check for wallet configuration
    const walletPath = process.env.ANCHOR_WALLET || 
      process.env.SOLANA_WALLET || 
      `${process.env.HOME}/.config/solana/id.json`;
    
    if (!walletPath) {
      throw new Error(
        'No wallet configured. Please run "ghostspeak quickstart" to set up your wallet.'
      );
    }
    
    // Check if wallet file exists
    const { existsSync, readFileSync } = await import('fs');
    if (!existsSync(walletPath)) {
      throw new Error(
        `Wallet file not found at ${walletPath}.\n` +
        'Please run "ghostspeak quickstart" to create a new wallet, or set ANCHOR_WALLET environment variable.'
      );
    }
    
    // Try to load the wallet
    try {
      const walletData = JSON.parse(readFileSync(walletPath, 'utf-8'));
      
      // Convert numeric array to Uint8Array if needed
      const secretKey = new Uint8Array(walletData);
      
      // Create keypair from secret key
      const { createKeyPairSignerFromBytes } = await import('@solana/signers');
      return await createKeyPairSignerFromBytes(secretKey);
    } catch (parseError) {
      throw new Error(
        `Invalid wallet file at ${walletPath}.\n` +
        'The wallet file appears to be corrupted. Please run "ghostspeak quickstart" to create a new wallet.'
      );
    }
  } catch (error) {
    // If all else fails, provide comprehensive guidance
    logger.general.error('Wallet configuration error:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown wallet error';
    
    // Re-throw with enhanced error message
    throw new Error(
      `${errorMessage}\n\n` +
      '🔧 To fix this issue:\n' +
      '1. Run: ghostspeak quickstart\n' +
      '2. Or set ANCHOR_WALLET environment variable to your wallet path\n' +
      '3. Or run: ghostspeak doctor --verbose for diagnostics'
    );
  }
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
 * Get the Ghostspeak SDK with timeout protection
 * Uses direct import to avoid dynamic import hanging issues
 */
export async function getGhostspeakSdk() {
  if (cachedSdk) {
    return cachedSdk;
  }

  try {
    // Load the SDK services with timeout protection
    logger.general.debug('Loading SDK services...');
    cachedSdk = await withTimeout(
      loadAdvancedServices(),
      TIMEOUTS.SDK_INIT,
      'SDK initialization'
    );
    logger.general.debug('SDK services loaded successfully');
    return cachedSdk;
  } catch (error) {
    logger.general.error('Failed to load SDK services:', error);
    throw error;
  }
}
