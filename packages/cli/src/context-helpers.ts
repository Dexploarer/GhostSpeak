import { createSolanaRpc } from '@solana/rpc';
import { generateKeyPairSigner, type KeyPairSigner } from '@solana/signers';
import { ConfigManager } from './core/ConfigManager';
import { LazyModules } from '@ghostspeak/sdk';
import { withTimeout, TIMEOUTS } from './utils/timeout.js';
import { logger } from './utils/logger.js';

// Real SDK services loader - connects to actual deployed PodAI program
const loadAdvancedServices = async () => {
  try {
    logger.general.debug('Loading real SDK services from @ghostspeak/sdk...');
    
    // Load real SDK modules
    const [
      agentModule,
      channelModule,
      messageModule,
      analyticsModule,
      marketplaceModule,
      escrowModule
    ] = await Promise.all([
      LazyModules.agent,
      LazyModules.channel,
      LazyModules.message,
      LazyModules.analytics,
      LazyModules.marketplace,
      LazyModules.escrow
    ]);

    return {
      AgentService: agentModule.AgentService,
      ChannelService: channelModule.ChannelService,
      MessageService: messageModule.MessageService,
      AnalyticsService: analyticsModule.AnalyticsService,
      MarketplaceService: marketplaceModule.MarketplaceService,
      EscrowService: escrowModule.EscrowService,
      // Legacy compatibility methods
      getMetrics: async () => {
        try {
          const rpc = await getRpc();
          const programId = await getProgramId('analytics');
          const analyticsService = new analyticsModule.AnalyticsService(rpc, programId);
          return await analyticsService.getMetrics();
        } catch (error) {
          logger.general.warn('Failed to get real metrics, returning defaults:', error);
          return {
            transactions: 0,
            agents: 0,
            channels: 0,
            messages: 0,
            isLive: false
          };
        }
      },
      analyticsService: {
        getMetrics: async () => {
          try {
            const rpc = await getRpc();
            const programId = await getProgramId('analytics');
            const analyticsService = new analyticsModule.AnalyticsService(rpc, programId);
            return await analyticsService.getMetrics();
          } catch (error) {
            logger.general.warn('Failed to get real analytics metrics:', error);
            return {
              transactions: 0,
              agents: 0,
              channels: 0,
              messages: 0,
              isLive: false
            };
          }
        }
      }
    };
  } catch (error) {
    logger.general.error('Failed to load real SDK services:', error);
    throw new Error(`SDK loading failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

// Cache for loaded SDK modules
let cachedSdk: Awaited<ReturnType<typeof loadAdvancedServices>> | null = null;

/**
 * Get a Solana RPC client using the current CLI config
 */
export async function getRpc() {
  // For now, use devnet by default to avoid ConfigManager complexity
  // Configuration is loaded from environment and CLI flags
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
  const GHOSTSPEAK_PROGRAM_ID = '367WUUpQTxXYUZqFyo9rDpgfJtH7mfGxX9twahdUmaEK';
  
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
