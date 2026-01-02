import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { existsSync } from 'fs';
import { fileURLToPath } from 'url';
// July 2025 @solana/kit patterns
import { address, type Address } from '@solana/kit';
// Import canonical program IDs
import { PROGRAM_IDS } from '../../../../config/program-ids.js';

// Load environment variables from multiple possible locations
function loadEnvFiles() {
  const envLocations = [
    // 1. Current working directory
    resolve(process.cwd(), '.env'),
    // 2. Project root (two levels up from CLI package)
    resolve(process.cwd(), '../../.env'),
    // 3. CLI package directory (same as this file)
    (() => {
      try {
        const __filename = fileURLToPath(import.meta.url);
        const __dirname = dirname(__filename);
        return resolve(__dirname, '../../.env');
      } catch (error) {
        return '';
      }
    })(),
    // 4. Parent of CLI package directory
    (() => {
      try {
        const __filename = fileURLToPath(import.meta.url);
        const __dirname = dirname(__filename);
        return resolve(__dirname, '../../../.env');
      } catch (error) {
        return '';
      }
    })()
  ].filter(Boolean);

  for (const envPath of envLocations) {
    if (existsSync(envPath)) {
      config({ path: envPath });
      // Env loaded silently
      break;
    }
  }
}

loadEnvFiles();

export interface EnvironmentConfig {
  network: 'mainnet-beta' | 'devnet' | 'testnet' | 'localnet';
  rpcUrl: string;
  programId: Address | null;
  walletPath: string;
  usdcMint: Address;
  debug: boolean;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  encryptionSalt?: string;
  keyDerivationIterations: number;
}

/**
 * Get the current network from environment
 */
function getCurrentNetwork(): 'mainnet-beta' | 'devnet' | 'testnet' | 'localnet' {
  const network = process.env.GHOSTSPEAK_NETWORK ?? 'devnet';
  if (!['mainnet-beta', 'devnet', 'testnet', 'localnet'].includes(network)) {
    throw new Error(`Invalid network: ${network}`);
  }
  return network as 'mainnet-beta' | 'devnet' | 'testnet' | 'localnet';
}

/**
 * Get program ID for the current network using July 2025 patterns
 * Uses canonical program IDs from config/program-ids.ts as source of truth
 * Environment variables can override for testing, but mismatches trigger warnings
 */
function getProgramId(): Address | null {
  const network = getCurrentNetwork();

  // Get canonical program ID from config
  const networkKey = network === 'mainnet-beta' ? 'mainnet' : network;
  const canonicalId = PROGRAM_IDS[networkKey as keyof typeof PROGRAM_IDS];

  // Check for environment variable override
  let envProgramIdStr: string | undefined;
  switch (network) {
    case 'mainnet-beta':
      envProgramIdStr = process.env.GHOSTSPEAK_PROGRAM_ID_MAINNET;
      break;
    case 'devnet':
      envProgramIdStr = process.env.GHOSTSPEAK_PROGRAM_ID_DEVNET;
      break;
    case 'testnet':
      envProgramIdStr = process.env.GHOSTSPEAK_PROGRAM_ID_TESTNET;
      break;
    case 'localnet':
      envProgramIdStr = process.env.GHOSTSPEAK_PROGRAM_ID_LOCALNET;
      break;
  }

  // If environment variable is set, validate it matches canonical
  if (envProgramIdStr) {
    try {
      const envProgramId = address(envProgramIdStr);
      if (envProgramId !== canonicalId) {
        console.warn('⚠️  WARNING: Program ID mismatch detected!');
        console.warn(`   Environment: ${envProgramId}`);
        console.warn(`   Canonical:   ${canonicalId}`);
        console.warn(`   Using canonical program ID from config/program-ids.ts`);
        console.warn(`   To fix: Update GHOSTSPEAK_PROGRAM_ID_${network.toUpperCase().replace('-', '_')} in .env`);
      }
      // Always use canonical ID to prevent mismatches
      return canonicalId;
    } catch (error) {
      console.warn(`Invalid program ID in environment for ${network}: ${envProgramIdStr}`);
      console.warn(`Using canonical program ID: ${canonicalId}`);
      return canonicalId;
    }
  }

  // Return canonical ID
  return canonicalId;
}

/**
 * Get USDC mint for the current network using July 2025 patterns
 */
function getUsdcMint(): Address {
  const network = getCurrentNetwork();
  let mintStr: string | undefined;
  
  switch (network) {
    case 'mainnet-beta':
      mintStr = process.env.GHOSTSPEAK_USDC_MINT_MAINNET ?? 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
      break;
    case 'devnet':
      mintStr = process.env.GHOSTSPEAK_USDC_MINT_DEVNET ?? '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU';
      break;
    case 'testnet':
    case 'localnet':
      // For testnet/localnet, we'll use a mock USDC or create our own
      mintStr = process.env.GHOSTSPEAK_USDC_MINT_TESTNET ?? '11111111111111111111111111111111';
      break;
  }
  
  return address(mintStr);
}

/**
 * Load environment configuration
 */
export function loadEnvironmentConfig(): EnvironmentConfig {
  const network = getCurrentNetwork();
  
  return {
    network,
    rpcUrl: process.env.GHOSTSPEAK_RPC_URL ?? getDefaultRpcUrl(network),
    programId: getProgramId(),
    walletPath: process.env.GHOSTSPEAK_WALLET_PATH ?? '~/.config/solana/ghostspeak.json',
    usdcMint: getUsdcMint(),
    debug: process.env.GHOSTSPEAK_DEBUG === 'true',
    logLevel: (process.env.GHOSTSPEAK_LOG_LEVEL as 'debug' | 'info' | 'warn' | 'error' | undefined) ?? 'info',
    encryptionSalt: process.env.GHOSTSPEAK_ENCRYPTION_SALT,
    keyDerivationIterations: parseInt(process.env.GHOSTSPEAK_KEY_DERIVATION_ITERATIONS ?? '100000', 10),
  };
}

/**
 * Get default RPC URL for a network
 */
function getDefaultRpcUrl(network: string): string {
  switch (network) {
    case 'mainnet-beta':
      return 'https://api.mainnet-beta.solana.com';
    case 'devnet':
      return 'https://api.devnet.solana.com';
    case 'testnet':
      return 'https://api.testnet.solana.com';
    case 'localnet':
      return 'http://localhost:8899';
    default:
      return 'https://api.devnet.solana.com';
  }
}

/**
 * Validate environment configuration
 */
export function validateEnvironmentConfig(config: EnvironmentConfig): void {
  if (!config.rpcUrl) {
    throw new Error('RPC URL is required');
  }
  
  if (config.network === 'mainnet-beta' && !config.encryptionSalt) {
    console.warn('WARNING: Running on mainnet without encryption salt configured');
  }
}

// Lazy-loaded configuration to prevent startup crashes
let _envConfig: EnvironmentConfig | null = null;

export function getEnvConfig(): EnvironmentConfig {
  if (!_envConfig) {
    _envConfig = loadEnvironmentConfig();
  }
  return _envConfig;
}

// For backwards compatibility - lazy getter
export const envConfig: EnvironmentConfig = new Proxy({} as EnvironmentConfig, {
  get(_target, prop) {
    return getEnvConfig()[prop as keyof EnvironmentConfig];
  }
});