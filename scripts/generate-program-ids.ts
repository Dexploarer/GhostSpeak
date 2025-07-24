#!/usr/bin/env node
import { Keypair } from '@solana/web3.js';
import { writeFileSync } from 'fs';
import { resolve } from 'path';

/**
 * Generate new program IDs for different networks
 * This ensures each network has a unique program ID for security
 */

const networks = ['mainnet', 'devnet', 'testnet', 'localnet'];
const programIds: Record<string, string> = {};

// Generate a new program ID for each network except devnet (keep existing)
networks.forEach((network) => {
  if (network === 'devnet') {
    // Keep existing devnet program ID
    programIds[network] = 'GssMyhkQPePLzByJsJadbQePZc6GtzGi22aQqW5opvUX';
  } else {
    // Generate new program ID
    const keypair = Keypair.generate();
    programIds[network] = keypair.publicKey.toBase58();
    
    // Save keypair for deployment
    const keypairPath = resolve(process.cwd(), `keys/deploy-${network}-keypair.json`);
    writeFileSync(keypairPath, JSON.stringify(Array.from(keypair.secretKey)));
    console.log(`Generated new program ID for ${network}: ${programIds[network]}`);
    console.log(`Saved keypair to: ${keypairPath}`);
  }
});

// Update .env.example with the new program IDs
const envExamplePath = resolve(process.cwd(), '.env.example');
const envContent = `# GhostSpeak Environment Configuration
# Copy this file to .env and fill in your values

# Network Configuration
GHOSTSPEAK_NETWORK=devnet
GHOSTSPEAK_RPC_URL=https://api.devnet.solana.com

# Program IDs (different for each network)
GHOSTSPEAK_PROGRAM_ID_MAINNET=${programIds.mainnet}
GHOSTSPEAK_PROGRAM_ID_DEVNET=${programIds.devnet}
GHOSTSPEAK_PROGRAM_ID_TESTNET=${programIds.testnet}
GHOSTSPEAK_PROGRAM_ID_LOCALNET=${programIds.localnet}

# Wallet Configuration
GHOSTSPEAK_WALLET_PATH=~/.config/solana/ghostspeak.json
GHOSTSPEAK_KEYPAIR_PATH=

# Token Configuration
GHOSTSPEAK_USDC_MINT_DEVNET=4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU
GHOSTSPEAK_USDC_MINT_MAINNET=EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v

# API Configuration
GHOSTSPEAK_API_KEY=
GHOSTSPEAK_API_SECRET=

# Security Configuration
GHOSTSPEAK_ENCRYPTION_SALT=
GHOSTSPEAK_KEY_DERIVATION_ITERATIONS=100000

# Monitoring Configuration
GHOSTSPEAK_MONITORING_ENABLED=false
GHOSTSPEAK_MONITORING_ENDPOINT=

# Development Configuration
GHOSTSPEAK_DEBUG=false
GHOSTSPEAK_LOG_LEVEL=info`;

writeFileSync(envExamplePath, envContent);
console.log('\nUpdated .env.example with new program IDs');

// Create program-ids.ts for TypeScript usage
const programIdsTypescript = `// Auto-generated program IDs for different networks
// Generated on: ${new Date().toISOString()}

export const PROGRAM_IDS = {
  mainnet: '${programIds.mainnet}',
  devnet: '${programIds.devnet}',
  testnet: '${programIds.testnet}',
  localnet: '${programIds.localnet}',
} as const;

export type Network = keyof typeof PROGRAM_IDS;

export function getProgramId(network: Network): string {
  return PROGRAM_IDS[network];
}
`;

const programIdsPath = resolve(process.cwd(), 'config/program-ids.ts');
writeFileSync(programIdsPath, programIdsTypescript);
console.log('\nGenerated config/program-ids.ts');

console.log('\n⚠️  IMPORTANT: Update Anchor.toml with the new program IDs for each network!');
console.log('Program IDs:');
Object.entries(programIds).forEach(([network, id]) => {
  console.log(`  ${network}: ${id}`);
});