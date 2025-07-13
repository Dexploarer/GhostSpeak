import { z } from 'zod';
import { IAgentRuntime, GhostSpeakConfig, GhostSpeakConfigSchema, ValidationError } from './types';

/**
 * Validates and extracts GhostSpeak configuration from the ElizaOS runtime
 */
export function validateGhostSpeakConfig(runtime: IAgentRuntime): GhostSpeakConfig {
  try {
    const config = {
      SOLANA_RPC_URL: runtime.getSetting('SOLANA_RPC_URL') || 'https://api.devnet.solana.com',
      SOLANA_WALLET_PRIVATE_KEY: runtime.getSetting('SOLANA_WALLET_PRIVATE_KEY'),
      GHOSTSPEAK_PROGRAM_ID: runtime.getSetting('GHOSTSPEAK_PROGRAM_ID') || '367WUUpQTxXYUZqFyo9rDpgfJtH7mfGxX9twahdUmaEK',
      GHOSTSPEAK_NETWORK: runtime.getSetting('GHOSTSPEAK_NETWORK') || 'devnet',
      LIGHT_RPC_URL: runtime.getSetting('LIGHT_RPC_URL'),
      PHOTON_INDEXER_URL: runtime.getSetting('PHOTON_INDEXER_URL'),
    };

    return GhostSpeakConfigSchema.parse(config);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const issues = error.issues.map(issue => `${issue.path.join('.')}: ${issue.message}`).join(', ');
      throw new ValidationError(`Configuration validation failed: ${issues}`, error.issues);
    }
    throw new ValidationError('Failed to validate GhostSpeak configuration', error);
  }
}

/**
 * Gets a required setting from runtime, throwing an error if not found
 */
export function getRequiredSetting(runtime: IAgentRuntime, key: string): string {
  const value = runtime.getSetting(key);
  if (!value) {
    throw new ValidationError(`Required setting '${key}' not found in runtime configuration`);
  }
  return value;
}

/**
 * Gets an optional setting from runtime with a default value
 */
export function getOptionalSetting(runtime: IAgentRuntime, key: string, defaultValue?: string): string | undefined {
  return runtime.getSetting(key) || defaultValue;
}

/**
 * Validates that all required GhostSpeak settings are present
 */
export function validateRequiredSettings(runtime: IAgentRuntime): void {
  const requiredSettings = [
    'SOLANA_WALLET_PRIVATE_KEY'
  ];

  const missingSettings = requiredSettings.filter(setting => !runtime.getSetting(setting));
  
  if (missingSettings.length > 0) {
    throw new ValidationError(
      `Missing required GhostSpeak settings: ${missingSettings.join(', ')}. ` +
      'Please ensure these are configured in your ElizaOS runtime environment.'
    );
  }
}

/**
 * Creates a development configuration for testing
 */
export function createDevConfig(): Partial<GhostSpeakConfig> {
  return {
    SOLANA_RPC_URL: 'https://api.devnet.solana.com',
    GHOSTSPEAK_PROGRAM_ID: '367WUUpQTxXYUZqFyo9rDpgfJtH7mfGxX9twahdUmaEK',
    GHOSTSPEAK_NETWORK: 'devnet' as const,
  };
}

/**
 * Environment-specific configurations
 */
export const NETWORK_CONFIGS = {
  devnet: {
    rpcUrl: 'https://api.devnet.solana.com',
    programId: '367WUUpQTxXYUZqFyo9rDpgfJtH7mfGxX9twahdUmaEK',
    explorerUrl: 'https://explorer.solana.com',
  },
  testnet: {
    rpcUrl: 'https://api.testnet.solana.com',
    programId: '367WUUpQTxXYUZqFyo9rDpgfJtH7mfGxX9twahdUmaEK',
    explorerUrl: 'https://explorer.solana.com',
  },
  'mainnet-beta': {
    rpcUrl: 'https://api.mainnet-beta.solana.com',
    programId: '367WUUpQTxXYUZqFyo9rDpgfJtH7mfGxX9twahdUmaEK',
    explorerUrl: 'https://explorer.solana.com',
  },
} as const;

/**
 * Gets network-specific configuration
 */
export function getNetworkConfig(network: string) {
  const config = NETWORK_CONFIGS[network as keyof typeof NETWORK_CONFIGS];
  if (!config) {
    throw new ValidationError(`Unsupported network: ${network}. Supported networks: ${Object.keys(NETWORK_CONFIGS).join(', ')}`);
  }
  return config;
}

/**
 * Validates Solana private key format
 */
export function validatePrivateKey(privateKey: string): boolean {
  try {
    // Basic validation - should be base58 encoded and appropriate length
    const decoded = Buffer.from(privateKey, 'base64');
    return decoded.length === 64; // Ed25519 private key length
  } catch {
    try {
      // Try base58 decoding
      const bs58 = require('bs58');
      const decoded = bs58.decode(privateKey);
      return decoded.length === 64;
    } catch {
      return false;
    }
  }
}

/**
 * Configuration validation with detailed error messages
 */
export function validateConfigWithDetails(config: Partial<GhostSpeakConfig>): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Validate required fields
  if (!config.SOLANA_WALLET_PRIVATE_KEY) {
    errors.push('SOLANA_WALLET_PRIVATE_KEY is required');
  } else if (!validatePrivateKey(config.SOLANA_WALLET_PRIVATE_KEY)) {
    errors.push('SOLANA_WALLET_PRIVATE_KEY must be a valid base58 or base64 encoded private key');
  }

  // Validate optional fields
  if (config.SOLANA_RPC_URL) {
    try {
      new URL(config.SOLANA_RPC_URL);
    } catch {
      errors.push('SOLANA_RPC_URL must be a valid URL');
    }
  }

  if (config.GHOSTSPEAK_NETWORK && !Object.keys(NETWORK_CONFIGS).includes(config.GHOSTSPEAK_NETWORK)) {
    errors.push(`GHOSTSPEAK_NETWORK must be one of: ${Object.keys(NETWORK_CONFIGS).join(', ')}`);
  }

  // Warnings for optional but recommended settings
  if (!config.LIGHT_RPC_URL) {
    warnings.push('LIGHT_RPC_URL not set - ZK compression features will be unavailable');
  }

  if (!config.PHOTON_INDEXER_URL) {
    warnings.push('PHOTON_INDEXER_URL not set - some indexing features may be limited');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}