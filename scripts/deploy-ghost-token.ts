#!/usr/bin/env bun
/**
 * Deploy Dev GHOST Token (SPL Token-2022)
 * 
 * This script deploys a development GHOST governance token on devnet/localnet.
 * The real GHOST token will be launched on pump.fun later.
 * 
 * Token Specifications:
 * - Name: GHOST
 * - Symbol: GHOST
 * - Standard: SPL Token-2022
 * - Total Supply: 1,000,000,000 (1B)
 * - Decimals: 6
 * 
 * Usage:
 *   bun run scripts/deploy-ghost-token.ts --network devnet
 *   bun run scripts/deploy-ghost-token.ts --network localnet
 */

import {
  createSolanaRpc,
  createSolanaRpcSubscriptions,
  generateKeyPair,
  createKeyPairFromBytes,
  getAddressFromPublicKey,
  signTransaction,
  sendAndConfirmTransaction,
  address,
  lamports,
  pipe,
  createTransactionMessage,
  setTransactionMessageFeePayer,
  setTransactionMessageLifetimeUsingBlockhash,
  appendTransactionMessageInstruction,
  compileTransaction,
} from '@solana/kit';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

// Constants
const TOKEN_NAME = 'GHOST';
const TOKEN_SYMBOL = 'GHOST';
const TOKEN_DECIMALS = 6;
const TOTAL_SUPPLY = BigInt(1_000_000_000) * BigInt(10 ** TOKEN_DECIMALS); // 1B tokens

// Network configurations
const NETWORKS = {
  devnet: {
    rpc: 'https://api.devnet.solana.com',
    ws: 'wss://api.devnet.solana.com',
  },
  localnet: {
    rpc: 'http://127.0.0.1:8899',
    ws: 'ws://127.0.0.1:8900',
  },
  mainnet: {
    rpc: 'https://api.mainnet-beta.solana.com',
    ws: 'wss://api.mainnet-beta.solana.com',
  },
};

interface DeploymentResult {
  network: string;
  mintAddress: string;
  mintAuthority: string;
  freezeAuthority: string;
  decimals: number;
  totalSupply: string;
  timestamp: string;
}

async function loadOrCreateKeypair(path: string): Promise<CryptoKeyPair> {
  if (existsSync(path)) {
    const secretKey = JSON.parse(readFileSync(path, 'utf-8'));
    return createKeyPairFromBytes(new Uint8Array(secretKey));
  }
  return generateKeyPair();
}

async function main() {
  // Parse arguments
  const args = process.argv.slice(2);
  const networkArg = args.find(arg => arg.startsWith('--network='));
  const networkName = networkArg?.split('=')[1] ?? 'devnet';

  if (!['devnet', 'localnet', 'mainnet'].includes(networkName)) {
    console.error('Invalid network. Use: devnet, localnet, or mainnet');
    process.exit(1);
  }

  if (networkName === 'mainnet') {
    console.error('⚠️  WARNING: This script is for dev tokens only!');
    console.error('   The real GHOST token will be launched on pump.fun');
    process.exit(1);
  }

  console.log(`\n🔮 Deploying Dev GHOST Token on ${networkName}\n`);
  console.log('Token Specifications:');
  console.log(`  Name: ${TOKEN_NAME}`);
  console.log(`  Symbol: ${TOKEN_SYMBOL}`);
  console.log(`  Decimals: ${TOKEN_DECIMALS}`);
  console.log(`  Total Supply: ${(Number(TOTAL_SUPPLY) / 10 ** TOKEN_DECIMALS).toLocaleString()}`);
  console.log('');

  const network = NETWORKS[networkName as keyof typeof NETWORKS];

  // Connect to RPC
  console.log(`Connecting to ${network.rpc}...`);
  const rpc = createSolanaRpc(network.rpc);
  const rpcSubscriptions = createSolanaRpcSubscriptions(network.ws);

  // Load deployer keypair
  const deployerPath = join(process.env.HOME ?? '', '.config', 'solana', 'id.json');
  
  if (!existsSync(deployerPath)) {
    console.error('❌ Deployer keypair not found at ~/.config/solana/id.json');
    console.error('   Run: solana-keygen new');
    process.exit(1);
  }

  const deployerSecretKey = JSON.parse(readFileSync(deployerPath, 'utf-8'));
  const deployerKeypair = await createKeyPairFromBytes(new Uint8Array(deployerSecretKey));
  const deployerAddress = await getAddressFromPublicKey(deployerKeypair.publicKey);

  console.log(`Deployer: ${deployerAddress}`);

  // Check balance
  const balanceResult = await rpc.getBalance(deployerAddress).send();
  const balanceSol = Number(balanceResult.value) / 1e9;
  console.log(`Balance: ${balanceSol.toFixed(4)} SOL`);

  if (balanceSol < 0.1) {
    console.error('❌ Insufficient balance. Need at least 0.1 SOL');
    if (networkName === 'devnet') {
      console.log('   Run: solana airdrop 2 --url devnet');
    }
    process.exit(1);
  }

  // Generate mint keypair
  const mintKeypair = await generateKeyPair();
  const mintAddress = await getAddressFromPublicKey(mintKeypair.publicKey);

  console.log(`\nMint Address: ${mintAddress}`);

  // Note: In production, you would use the SPL Token-2022 program
  // For this dev script, we'll output the configuration needed
  console.log('\n📋 Token Configuration for SPL Token-2022 CLI:');
  console.log('');
  console.log('# Create the token mint:');
  console.log(`spl-token create-token \\`);
  console.log(`  --program-id TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb \\`);
  console.log(`  --decimals ${TOKEN_DECIMALS} \\`);
  console.log(`  --url ${networkName}`);
  console.log('');
  console.log('# Create token account and mint supply:');
  console.log(`spl-token create-account <MINT_ADDRESS> --url ${networkName}`);
  console.log(`spl-token mint <MINT_ADDRESS> ${Number(TOTAL_SUPPLY) / 10 ** TOKEN_DECIMALS} --url ${networkName}`);
  console.log('');

  // Save deployment info
  const outputDir = join(process.cwd(), 'deployments');
  if (!existsSync(outputDir)) {
    const { mkdirSync } = await import('fs');
    mkdirSync(outputDir, { recursive: true });
  }

  const deploymentInfo: DeploymentResult = {
    network: networkName,
    mintAddress: mintAddress,
    mintAuthority: deployerAddress,
    freezeAuthority: deployerAddress,
    decimals: TOKEN_DECIMALS,
    totalSupply: TOTAL_SUPPLY.toString(),
    timestamp: new Date().toISOString(),
  };

  const outputPath = join(outputDir, `ghost-token-${networkName}.json`);
  writeFileSync(outputPath, JSON.stringify(deploymentInfo, null, 2));
  console.log(`\n✅ Deployment config saved to: ${outputPath}`);

  // Also create a constants file for the SDK
  const constantsContent = `
// GHOST Token Configuration - ${networkName.toUpperCase()}
// Generated: ${new Date().toISOString()}
// NOTE: This is a DEV token. Real GHOST will be launched on pump.fun

export const GHOST_TOKEN_${networkName.toUpperCase()} = {
  mint: '${mintAddress}' as const,
  name: '${TOKEN_NAME}',
  symbol: '${TOKEN_SYMBOL}',
  decimals: ${TOKEN_DECIMALS},
  totalSupply: ${TOTAL_SUPPLY}n,
} as const;
`;

  const constantsPath = join(process.cwd(), 'packages', 'sdk-typescript', 'src', 'constants', `ghost-token-${networkName}.ts`);
  writeFileSync(constantsPath, constantsContent.trim());
  console.log(`✅ Token constants saved to: ${constantsPath}`);

  console.log('\n🎉 Dev GHOST Token ready for deployment!');
  console.log('');
  console.log('Next steps:');
  console.log('1. Run the spl-token commands above to create the token');
  console.log('2. Update the mint address in the constants file');
  console.log('3. Initialize staking config with the token mint');
  console.log('');
  console.log('⚠️  Remember: This is a DEV token for testing.');
  console.log('   The real GHOST token will be launched on pump.fun.');
}

main().catch((error) => {
  console.error('Error:', error);
  process.exit(1);
});
