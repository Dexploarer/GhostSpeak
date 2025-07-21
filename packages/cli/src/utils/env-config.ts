import { config } from 'dotenv';
import { resolve } from 'path';
import { PublicKey } from '@solana/web3.js';

// Load environment variables
config({ path: resolve(process.cwd(), '.env') });

export interface EnvironmentConfig {
  network: 'mainnet-beta' | 'devnet' | 'testnet' | 'localnet';
  rpcUrl: string;
  programId: PublicKey;
  walletPath: string;
  usdcMint: PublicKey;
  debug: boolean;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  encryptionSalt?: string;
  keyDerivationIterations: number;
}

/**
 * Get the current network from environment
 */
function getCurrentNetwork(): 'mainnet-beta' | 'devnet' | 'testnet' | 'localnet' {
  const network = process.env.GHOSTSPEAK_NETWORK || 'devnet';
  if (!['mainnet-beta', 'devnet', 'testnet', 'localnet'].includes(network)) {
    throw new Error(`Invalid network: ${network}`);
  }
  return network as 'mainnet-beta' | 'devnet' | 'testnet' | 'localnet';
}

/**
 * Get program ID for the current network
 */
function getProgramId(): PublicKey {
  const network = getCurrentNetwork();
  let programIdStr: string | undefined;
  
  switch (network) {
    case 'mainnet-beta':
      programIdStr = process.env.GHOSTSPEAK_PROGRAM_ID_MAINNET;
      break;
    case 'devnet':
      programIdStr = process.env.GHOSTSPEAK_PROGRAM_ID_DEVNET;
      break;
    case 'testnet':
      programIdStr = process.env.GHOSTSPEAK_PROGRAM_ID_TESTNET;
      break;
    case 'localnet':
      programIdStr = process.env.GHOSTSPEAK_PROGRAM_ID_LOCALNET;
      break;
  }
  
  if (!programIdStr) {
    throw new Error(`Program ID not configured for network: ${network}`);
  }
  
  try {
    return new PublicKey(programIdStr);
  } catch (error) {
    throw new Error(`Invalid program ID for ${network}: ${programIdStr}`);
  }
}

/**
 * Get USDC mint for the current network
 */
function getUsdcMint(): PublicKey {
  const network = getCurrentNetwork();
  let mintStr: string | undefined;
  
  switch (network) {
    case 'mainnet-beta':
      mintStr = process.env.GHOSTSPEAK_USDC_MINT_MAINNET || 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
      break;
    case 'devnet':
      mintStr = process.env.GHOSTSPEAK_USDC_MINT_DEVNET || '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU';
      break;
    case 'testnet':
    case 'localnet':
      // For testnet/localnet, we'll use a mock USDC or create our own
      mintStr = process.env.GHOSTSPEAK_USDC_MINT_TESTNET || '11111111111111111111111111111111';
      break;
  }
  
  return new PublicKey(mintStr);
}

/**
 * Load environment configuration
 */
export function loadEnvironmentConfig(): EnvironmentConfig {
  const network = getCurrentNetwork();
  
  return {
    network,
    rpcUrl: process.env.GHOSTSPEAK_RPC_URL || getDefaultRpcUrl(network),
    programId: getProgramId(),
    walletPath: process.env.GHOSTSPEAK_WALLET_PATH || '~/.config/solana/ghostspeak.json',
    usdcMint: getUsdcMint(),
    debug: process.env.GHOSTSPEAK_DEBUG === 'true',
    logLevel: (process.env.GHOSTSPEAK_LOG_LEVEL as any) || 'info',
    encryptionSalt: process.env.GHOSTSPEAK_ENCRYPTION_SALT,
    keyDerivationIterations: parseInt(process.env.GHOSTSPEAK_KEY_DERIVATION_ITERATIONS || '100000', 10),
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
  if (!config.programId) {
    throw new Error('Program ID is required');
  }
  
  if (!config.rpcUrl) {
    throw new Error('RPC URL is required');
  }
  
  if (config.network === 'mainnet-beta' && !config.encryptionSalt) {
    console.warn('WARNING: Running on mainnet without encryption salt configured');
  }
}

// Export a singleton instance
export const envConfig = loadEnvironmentConfig();