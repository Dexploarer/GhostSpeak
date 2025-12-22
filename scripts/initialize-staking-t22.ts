#!/usr/bin/env npx ts-node
/**
 * Initialize Token-2022 Staking Infrastructure
 * 
 * Sets up the staking infrastructure for GHOST Token-2022:
 * 1. Creates staking vault ATA (Token-2022)
 * 2. Creates rewards treasury ATA (Token-2022)
 * 3. Calls initialize_staking_config_t22 instruction
 * 
 * Usage:
 *   npx ts-node scripts/initialize-staking-t22.ts --network devnet --mint <MINT_ADDRESS>
 */

import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  sendAndConfirmTransaction,
  LAMPORTS_PER_SOL,
} from '@solana/web3.js';
import {
  TOKEN_2022_PROGRAM_ID,
  createAssociatedTokenAccountInstruction,
  getAssociatedTokenAddressSync,
  ASSOCIATED_TOKEN_PROGRAM_ID,
} from '@solana/spl-token';
import { Program, AnchorProvider, Wallet, BN } from '@coral-xyz/anchor';
import * as fs from 'fs';
import * as path from 'path';

// Default staking configuration
const DEFAULT_BASE_APY = 1000; // 10% base APY (in basis points)
const DEFAULT_MIN_STAKE = BigInt(1_000) * BigInt(10 ** 6); // 1,000 tokens minimum
const DEFAULT_MAX_STAKE = BigInt(10_000_000) * BigInt(10 ** 6); // 10M tokens maximum

// Network configurations
const NETWORKS: Record<string, { rpc: string }> = {
  devnet: {
    rpc: 'https://api.devnet.solana.com',
  },
  localnet: {
    rpc: 'http://127.0.0.1:8899',
  },
};

interface StakingConfig {
  network: string;
  ghostMint: string;
  stakingConfig: string;
  stakingVault: string;
  stakingVaultAuthority: string;
  rewardsTreasury: string;
  rewardsTreasuryAuthority: string;
  baseApy: number;
  minStake: string;
  maxStake: string;
  timestamp: string;
}

function loadKeypair(filePath: string): Keypair {
  const secretKey = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  return Keypair.fromSecretKey(new Uint8Array(secretKey));
}

function parseArgs(): { 
  network: string; 
  mint: string; 
  baseApy: number; 
  minStake: bigint; 
  maxStake: bigint; 
} {
  const args = process.argv.slice(2);
  
  let network = 'devnet';
  let mint = '';
  let baseApy = DEFAULT_BASE_APY;
  let minStake = DEFAULT_MIN_STAKE;
  let maxStake = DEFAULT_MAX_STAKE;

  for (const arg of args) {
    if (arg.startsWith('--network=')) {
      network = arg.split('=')[1];
    } else if (arg.startsWith('--mint=')) {
      mint = arg.split('=')[1];
    } else if (arg.startsWith('--base-apy=')) {
      baseApy = parseInt(arg.split('=')[1], 10);
    } else if (arg.startsWith('--min-stake=')) {
      minStake = BigInt(arg.split('=')[1]) * BigInt(10 ** 6);
    } else if (arg.startsWith('--max-stake=')) {
      maxStake = BigInt(arg.split('=')[1]) * BigInt(10 ** 6);
    }
  }

  return { network, mint, baseApy, minStake, maxStake };
}

async function findPda(seeds: (Buffer | Uint8Array)[], programId: PublicKey): Promise<[PublicKey, number]> {
  return PublicKey.findProgramAddressSync(seeds, programId);
}

async function initializeStakingT22() {
  const { network, mint, baseApy, minStake, maxStake } = parseArgs();

  if (!NETWORKS[network]) {
    console.error(`Invalid network: ${network}. Use: devnet or localnet`);
    process.exit(1);
  }

  if (!mint) {
    console.error('❌ Missing --mint argument');
    console.error('Usage: npx ts-node scripts/initialize-staking-t22.ts --network devnet --mint <MINT_ADDRESS>');
    process.exit(1);
  }

  const ghostMint = new PublicKey(mint);

  console.log(`\n🔧 Initializing Token-2022 Staking on ${network}\n`);
  console.log('Configuration:');
  console.log(`  GHOST Mint: ${ghostMint.toBase58()}`);
  console.log(`  Base APY: ${baseApy / 100}%`);
  console.log(`  Min Stake: ${Number(minStake) / 10 ** 6} tokens`);
  console.log(`  Max Stake: ${Number(maxStake) / 10 ** 6} tokens`);
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
    process.exit(1);
  }

  const deployer = loadKeypair(deployerPath);
  console.log(`Authority: ${deployer.publicKey.toBase58()}`);

  // Check balance
  const balance = await connection.getBalance(deployer.publicKey);
  const balanceSol = balance / LAMPORTS_PER_SOL;
  console.log(`Balance: ${balanceSol.toFixed(4)} SOL`);

  if (balanceSol < 0.1) {
    console.error('❌ Insufficient balance. Need at least 0.1 SOL');
    process.exit(1);
  }

  // Load program ID from deployment
  const programIdPath = path.join(process.cwd(), 'target', 'deploy', 'ghostspeak_marketplace-keypair.json');
  let programId: PublicKey;

  if (fs.existsSync(programIdPath)) {
    const programKeypair = loadKeypair(programIdPath);
    programId = programKeypair.publicKey;
  } else {
    console.error('❌ Program keypair not found. Run: anchor build && anchor deploy');
    process.exit(1);
  }

  console.log(`Program ID: ${programId.toBase58()}`);

  // Derive PDAs
  const [stakingConfig, configBump] = await findPda(
    [Buffer.from('staking_config_t22')],
    programId
  );
  console.log(`\nStaking Config PDA: ${stakingConfig.toBase58()}`);

  const [vaultAuthority, vaultBump] = await findPda(
    [Buffer.from('staking_vault_authority_t22')],
    programId
  );
  console.log(`Vault Authority PDA: ${vaultAuthority.toBase58()}`);

  const [treasuryAuthority, treasuryBump] = await findPda(
    [Buffer.from('rewards_treasury_authority_t22')],
    programId
  );
  console.log(`Treasury Authority PDA: ${treasuryAuthority.toBase58()}`);

  // Create vault and treasury ATAs
  const stakingVault = getAssociatedTokenAddressSync(
    ghostMint,
    vaultAuthority,
    true, // allowOwnerOffCurve (PDA)
    TOKEN_2022_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID
  );
  console.log(`Staking Vault ATA: ${stakingVault.toBase58()}`);

  const rewardsTreasury = getAssociatedTokenAddressSync(
    ghostMint,
    treasuryAuthority,
    true, // allowOwnerOffCurve (PDA)
    TOKEN_2022_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID
  );
  console.log(`Rewards Treasury ATA: ${rewardsTreasury.toBase58()}`);

  // Check if accounts already exist
  const stakingConfigInfo = await connection.getAccountInfo(stakingConfig);
  if (stakingConfigInfo) {
    console.log('\n⚠️  Staking config already initialized!');
    console.log('   If you need to reinitialize, close the account first.');
    
    // Still save the config info
    const configInfo: StakingConfig = {
      network,
      ghostMint: ghostMint.toBase58(),
      stakingConfig: stakingConfig.toBase58(),
      stakingVault: stakingVault.toBase58(),
      stakingVaultAuthority: vaultAuthority.toBase58(),
      rewardsTreasury: rewardsTreasury.toBase58(),
      rewardsTreasuryAuthority: treasuryAuthority.toBase58(),
      baseApy,
      minStake: minStake.toString(),
      maxStake: maxStake.toString(),
      timestamp: new Date().toISOString(),
    };
    
    const outputDir = path.join(process.cwd(), 'deployments');
    const outputPath = path.join(outputDir, `staking-config-t22-${network}.json`);
    fs.writeFileSync(outputPath, JSON.stringify(configInfo, null, 2));
    console.log(`\n✅ Config info saved to: ${outputPath}`);
    return;
  }

  // Create ATAs if they don't exist
  console.log('\n📦 Creating Token-2022 ATAs...');
  const createAtasTx = new Transaction();

  const vaultInfo = await connection.getAccountInfo(stakingVault);
  if (!vaultInfo) {
    console.log('  Creating staking vault ATA...');
    createAtasTx.add(
      createAssociatedTokenAccountInstruction(
        deployer.publicKey,
        stakingVault,
        vaultAuthority,
        ghostMint,
        TOKEN_2022_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID
      )
    );
  }

  const treasuryInfo = await connection.getAccountInfo(rewardsTreasury);
  if (!treasuryInfo) {
    console.log('  Creating rewards treasury ATA...');
    createAtasTx.add(
      createAssociatedTokenAccountInstruction(
        deployer.publicKey,
        rewardsTreasury,
        treasuryAuthority,
        ghostMint,
        TOKEN_2022_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID
      )
    );
  }

  if (createAtasTx.instructions.length > 0) {
    const { blockhash } = await connection.getLatestBlockhash();
    createAtasTx.recentBlockhash = blockhash;
    createAtasTx.feePayer = deployer.publicKey;

    const ataSig = await sendAndConfirmTransaction(connection, createAtasTx, [deployer]);
    console.log(`✅ ATAs created! Signature: ${ataSig}`);
  } else {
    console.log('  ATAs already exist');
  }

  // Load IDL and initialize staking config
  const idlPath = path.join(process.cwd(), 'target', 'idl', 'ghostspeak_marketplace.json');
  if (!fs.existsSync(idlPath)) {
    console.error('❌ IDL not found. Run: anchor build');
    process.exit(1);
  }

  const idl = JSON.parse(fs.readFileSync(idlPath, 'utf-8'));
  const wallet = new Wallet(deployer);
  const provider = new AnchorProvider(connection, wallet, { commitment: 'confirmed' });
  const program = new Program(idl, provider);

  console.log('\n🚀 Initializing staking config...');

  try {
    const tx = await program.methods
      .initializeStakingConfigT22(
        baseApy,
        new BN(minStake.toString()),
        new BN(maxStake.toString())
      )
      .accounts({
        stakingConfig: stakingConfig,
        ghostTokenMint: ghostMint,
        rewardsTreasury: rewardsTreasury,
        authority: deployer.publicKey,
        systemProgram: PublicKey.default,
      })
      .rpc();

    console.log(`✅ Staking config initialized! Signature: ${tx}`);
  } catch (error: any) {
    console.error('❌ Failed to initialize staking config:', error.message);
    throw error;
  }

  // Save deployment info
  const outputDir = path.join(process.cwd(), 'deployments');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const configInfo: StakingConfig = {
    network,
    ghostMint: ghostMint.toBase58(),
    stakingConfig: stakingConfig.toBase58(),
    stakingVault: stakingVault.toBase58(),
    stakingVaultAuthority: vaultAuthority.toBase58(),
    rewardsTreasury: rewardsTreasury.toBase58(),
    rewardsTreasuryAuthority: treasuryAuthority.toBase58(),
    baseApy,
    minStake: minStake.toString(),
    maxStake: maxStake.toString(),
    timestamp: new Date().toISOString(),
  };

  const outputPath = path.join(outputDir, `staking-config-t22-${network}.json`);
  fs.writeFileSync(outputPath, JSON.stringify(configInfo, null, 2));
  console.log(`\n✅ Staking config saved to: ${outputPath}`);

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('🎉 Token-2022 Staking Infrastructure Ready!');
  console.log('='.repeat(60));
  console.log(`\nGHOST Mint: ${ghostMint.toBase58()}`);
  console.log(`Staking Config: ${stakingConfig.toBase58()}`);
  console.log(`Staking Vault: ${stakingVault.toBase58()}`);
  console.log(`Rewards Treasury: ${rewardsTreasury.toBase58()}`);
  console.log(`Base APY: ${baseApy / 100}%`);
  
  console.log('\n📋 Next Steps:');
  console.log('1. Fund the rewards treasury with GHOST tokens');
  console.log('2. Test staking: Create staking account → Stake tokens → Check transfer fees');
  console.log('3. Verify transfer fees are being deducted correctly');
  console.log('');
}

initializeStakingT22().catch((error) => {
  console.error('Error:', error);
  process.exit(1);
});
