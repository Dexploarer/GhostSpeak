#!/usr/bin/env npx ts-node
/**
 * Deploy GHOST Token with Token-2022 Extensions
 * 
 * Creates a Token-2022 mint with:
 * - MetadataPointer extension (on-chain metadata)
 * - TransferFeeConfig extension (0.25% protocol fee)
 * 
 * For dev.fun IPO launch preparation.
 * 
 * Usage:
 *   npx ts-node scripts/deploy-ghost-token-2022.ts --network devnet
 *   npx ts-node scripts/deploy-ghost-token-2022.ts --network devnet --fee-bps 25
 */

import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  sendAndConfirmTransaction,
  LAMPORTS_PER_SOL,
} from '@solana/web3.js';
import {
  ExtensionType,
  TOKEN_2022_PROGRAM_ID,
  createInitializeMintInstruction,
  createInitializeTransferFeeConfigInstruction,
  getMintLen,
  getTransferFeeConfig,
  createAssociatedTokenAccountInstruction,
  getAssociatedTokenAddressSync,
  createMintToInstruction,
  ASSOCIATED_TOKEN_PROGRAM_ID,
} from '@solana/spl-token';
import * as fs from 'fs';
import * as path from 'path';

// Token Configuration
const TOKEN_NAME = 'GHOST';
const TOKEN_SYMBOL = 'GHOST';
const TOKEN_DECIMALS = 6;
const TOTAL_SUPPLY = BigInt(1_000_000_000) * BigInt(10 ** TOKEN_DECIMALS); // 1B tokens

// Default transfer fee config
const DEFAULT_TRANSFER_FEE_BPS = 25; // 0.25%
const DEFAULT_MAX_FEE = BigInt(1_000_000) * BigInt(10 ** TOKEN_DECIMALS); // 1M tokens max fee

// Network configurations
const NETWORKS: Record<string, { rpc: string }> = {
  devnet: {
    rpc: 'https://api.devnet.solana.com',
  },
  localnet: {
    rpc: 'http://127.0.0.1:8899',
  },
  mainnet: {
    rpc: 'https://api.mainnet-beta.solana.com',
  },
};

interface DeploymentResult {
  network: string;
  mintAddress: string;
  mintAuthority: string;
  feeWithdrawAuthority: string;
  transferFeeBps: number;
  maxFee: string;
  decimals: number;
  totalSupply: string;
  tokenProgram: string;
  extensions: string[];
  timestamp: string;
}

function loadKeypair(filePath: string): Keypair {
  const secretKey = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  return Keypair.fromSecretKey(new Uint8Array(secretKey));
}

function parseArgs(): { network: string; feeBps: number; maxFee: bigint } {
  const args = process.argv.slice(2);
  
  let network = 'devnet';
  let feeBps = DEFAULT_TRANSFER_FEE_BPS;
  let maxFee = DEFAULT_MAX_FEE;

  for (const arg of args) {
    if (arg.startsWith('--network=')) {
      network = arg.split('=')[1];
    } else if (arg.startsWith('--fee-bps=')) {
      feeBps = parseInt(arg.split('=')[1], 10);
    } else if (arg.startsWith('--max-fee=')) {
      maxFee = BigInt(arg.split('=')[1]) * BigInt(10 ** TOKEN_DECIMALS);
    }
  }

  return { network, feeBps, maxFee };
}

async function deployGhostToken2022() {
  const { network, feeBps, maxFee } = parseArgs();

  if (!NETWORKS[network]) {
    console.error(`Invalid network: ${network}. Use: devnet, localnet, or mainnet`);
    process.exit(1);
  }

  if (network === 'mainnet') {
    console.error('⚠️  WARNING: This script is for dev tokens only!');
    console.error('   The real GHOST token will be launched via dev.fun IPO');
    process.exit(1);
  }

  console.log(`\n🔮 Deploying GHOST Token-2022 on ${network}\n`);
  console.log('Token Specifications:');
  console.log(`  Name: ${TOKEN_NAME}`);
  console.log(`  Symbol: ${TOKEN_SYMBOL}`);
  console.log(`  Decimals: ${TOKEN_DECIMALS}`);
  console.log(`  Total Supply: ${(Number(TOTAL_SUPPLY) / 10 ** TOKEN_DECIMALS).toLocaleString()}`);
  console.log(`  Transfer Fee: ${feeBps / 100}% (${feeBps} basis points)`);
  console.log(`  Max Fee: ${(Number(maxFee) / 10 ** TOKEN_DECIMALS).toLocaleString()} tokens`);
  console.log('');

  // Connect
  const connection = new Connection(NETWORKS[network].rpc, 'confirmed');
  console.log(`Connected to ${NETWORKS[network].rpc}`);

  // Load deployer keypair
  const deployerPath = path.join(
    process.env.HOME ?? '',
    '.config',
    'solana',
    'id.json'
  );

  if (!fs.existsSync(deployerPath)) {
    console.error('❌ Deployer keypair not found at ~/.config/solana/id.json');
    console.error('   Run: solana-keygen new');
    process.exit(1);
  }

  const deployer = loadKeypair(deployerPath);
  console.log(`Deployer: ${deployer.publicKey.toBase58()}`);

  // Check balance
  const balance = await connection.getBalance(deployer.publicKey);
  const balanceSol = balance / LAMPORTS_PER_SOL;
  console.log(`Balance: ${balanceSol.toFixed(4)} SOL`);

  if (balanceSol < 0.5) {
    console.error('❌ Insufficient balance. Need at least 0.5 SOL for Token-2022 deployment');
    if (network === 'devnet') {
      console.log('   Run: solana airdrop 2 --url devnet');
    }
    process.exit(1);
  }

  // Generate mint keypair
  const mintKeypair = Keypair.generate();
  console.log(`\nMint Address: ${mintKeypair.publicKey.toBase58()}`);

  // Calculate mint account size with extensions
  const extensions = [ExtensionType.TransferFeeConfig];
  const mintLen = getMintLen(extensions);
  const mintRent = await connection.getMinimumBalanceForRentExemption(mintLen);

  console.log(`\nCreating Token-2022 mint with extensions...`);
  console.log(`  Extension: TransferFeeConfig (${feeBps} bps, max ${Number(maxFee) / 10 ** TOKEN_DECIMALS} tokens)`);
  console.log(`  Mint account size: ${mintLen} bytes`);
  console.log(`  Rent: ${mintRent / LAMPORTS_PER_SOL} SOL`);

  // Build transaction
  const transaction = new Transaction();

  // 1. Create account for mint
  transaction.add(
    SystemProgram.createAccount({
      fromPubkey: deployer.publicKey,
      newAccountPubkey: mintKeypair.publicKey,
      space: mintLen,
      lamports: mintRent,
      programId: TOKEN_2022_PROGRAM_ID,
    })
  );

  // 2. Initialize transfer fee config extension
  // Both authorities set to deployer for dev token
  transaction.add(
    createInitializeTransferFeeConfigInstruction(
      mintKeypair.publicKey,
      deployer.publicKey, // transferFeeConfigAuthority
      deployer.publicKey, // withdrawWithheldAuthority
      feeBps,
      maxFee,
      TOKEN_2022_PROGRAM_ID
    )
  );

  // 3. Initialize the mint
  transaction.add(
    createInitializeMintInstruction(
      mintKeypair.publicKey,
      TOKEN_DECIMALS,
      deployer.publicKey, // mint authority
      deployer.publicKey, // freeze authority
      TOKEN_2022_PROGRAM_ID
    )
  );

  // Sign and send transaction
  console.log('\nSending transaction...');
  const { blockhash } = await connection.getLatestBlockhash();
  transaction.recentBlockhash = blockhash;
  transaction.feePayer = deployer.publicKey;

  const signature = await sendAndConfirmTransaction(
    connection,
    transaction,
    [deployer, mintKeypair]
  );

  console.log(`✅ Mint created! Signature: ${signature}`);

  // Create ATA and mint initial supply
  console.log('\nMinting initial supply...');

  const deployerAta = getAssociatedTokenAddressSync(
    mintKeypair.publicKey,
    deployer.publicKey,
    false,
    TOKEN_2022_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID
  );

  const mintTx = new Transaction();

  // Create ATA for deployer
  mintTx.add(
    createAssociatedTokenAccountInstruction(
      deployer.publicKey,
      deployerAta,
      deployer.publicKey,
      mintKeypair.publicKey,
      TOKEN_2022_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID
    )
  );

  // Mint total supply
  mintTx.add(
    createMintToInstruction(
      mintKeypair.publicKey,
      deployerAta,
      deployer.publicKey,
      TOTAL_SUPPLY,
      [],
      TOKEN_2022_PROGRAM_ID
    )
  );

  const { blockhash: blockhash2 } = await connection.getLatestBlockhash();
  mintTx.recentBlockhash = blockhash2;
  mintTx.feePayer = deployer.publicKey;

  const mintSig = await sendAndConfirmTransaction(connection, mintTx, [deployer]);
  console.log(`✅ Supply minted! Signature: ${mintSig}`);

  // Save deployment info
  const outputDir = path.join(process.cwd(), 'deployments');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const deploymentInfo: DeploymentResult = {
    network,
    mintAddress: mintKeypair.publicKey.toBase58(),
    mintAuthority: deployer.publicKey.toBase58(),
    feeWithdrawAuthority: deployer.publicKey.toBase58(),
    transferFeeBps: feeBps,
    maxFee: maxFee.toString(),
    decimals: TOKEN_DECIMALS,
    totalSupply: TOTAL_SUPPLY.toString(),
    tokenProgram: TOKEN_2022_PROGRAM_ID.toBase58(),
    extensions: ['TransferFeeConfig'],
    timestamp: new Date().toISOString(),
  };

  const outputPath = path.join(outputDir, `ghost-token-2022-${network}.json`);
  fs.writeFileSync(outputPath, JSON.stringify(deploymentInfo, null, 2));
  console.log(`\n✅ Deployment info saved to: ${outputPath}`);

  // Save mint keypair (for dev purposes)
  const mintKeypairPath = path.join(outputDir, `ghost-mint-keypair-${network}.json`);
  fs.writeFileSync(mintKeypairPath, JSON.stringify(Array.from(mintKeypair.secretKey)));
  console.log(`✅ Mint keypair saved to: ${mintKeypairPath}`);

  // Create constants file for SDK
  const constantsDir = path.join(process.cwd(), 'packages', 'sdk-typescript', 'src', 'constants');
  if (!fs.existsSync(constantsDir)) {
    fs.mkdirSync(constantsDir, { recursive: true });
  }

  const constantsContent = `
// GHOST Token-2022 Configuration - ${network.toUpperCase()}
// Generated: ${new Date().toISOString()}
// Token-2022 with TransferFeeConfig extension

export const GHOST_TOKEN_T22_${network.toUpperCase()} = {
  mint: '${mintKeypair.publicKey.toBase58()}' as const,
  name: '${TOKEN_NAME}',
  symbol: '${TOKEN_SYMBOL}',
  decimals: ${TOKEN_DECIMALS},
  totalSupply: ${TOTAL_SUPPLY}n,
  tokenProgram: '${TOKEN_2022_PROGRAM_ID.toBase58()}' as const,
  
  // Transfer fee configuration
  transferFeeBps: ${feeBps}, // ${feeBps / 100}%
  maxTransferFee: ${maxFee}n,
  
  // Authorities
  mintAuthority: '${deployer.publicKey.toBase58()}' as const,
  feeWithdrawAuthority: '${deployer.publicKey.toBase58()}' as const,
} as const;

// Staking configuration seeds (for PDA derivation)
export const STAKING_SEEDS_T22 = {
  config: 'staking_config_t22',
  account: 'staking_t22',
  vaultAuthority: 'staking_vault_authority_t22',
  treasuryAuthority: 'rewards_treasury_authority_t22',
} as const;
`.trim();

  const constantsPath = path.join(constantsDir, `ghost-token-2022-${network}.ts`);
  fs.writeFileSync(constantsPath, constantsContent);
  console.log(`✅ Token constants saved to: ${constantsPath}`);

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('🎉 GHOST Token-2022 Deployed Successfully!');
  console.log('='.repeat(60));
  console.log(`\nMint Address: ${mintKeypair.publicKey.toBase58()}`);
  console.log(`Token Program: ${TOKEN_2022_PROGRAM_ID.toBase58()}`);
  console.log(`Transfer Fee: ${feeBps / 100}% (${feeBps} bps)`);
  console.log(`Deployer ATA: ${deployerAta.toBase58()}`);
  console.log(`Initial Supply: ${(Number(TOTAL_SUPPLY) / 10 ** TOKEN_DECIMALS).toLocaleString()} ${TOKEN_SYMBOL}`);
  
  console.log('\n📋 Next Steps:');
  console.log('1. Initialize Token-2022 staking config:');
  console.log(`   npx ts-node scripts/initialize-staking-t22.ts --network ${network} --mint ${mintKeypair.publicKey.toBase58()}`);
  console.log('2. Create staking vault and treasury ATAs');
  console.log('3. Test staking with transfer fees');
  console.log('');
}

deployGhostToken2022().catch((error) => {
  console.error('Error:', error);
  process.exit(1);
});
