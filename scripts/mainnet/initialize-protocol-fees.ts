/**
 * Initialize Protocol Fees on Mainnet
 *
 * WARNING: This script configures production protocol fees.
 * Requires multisig approval for mainnet deployment.
 *
 * IMPORTANT: Do NOT run this script until:
 * 1. Smart contract audit is complete
 * 2. All security reviews passed
 * 3. Multisig wallet is configured
 * 4. Treasury addresses are verified
 * 5. Team has approved fee structure
 *
 * Fee Structure (Mainnet):
 * - Escrow completion: 0.5% (50 bps)
 *   - 80% to treasury (40 bps)
 *   - 20% to buyback pool (10 bps)
 * - Dispute resolution: 1% (100 bps) to moderator pool
 * - Agent registration: 0.01 SOL to treasury
 * - Marketplace listing: 0.001 SOL to treasury
 *
 * Usage:
 *   bun scripts/mainnet/initialize-protocol-fees.ts --cluster mainnet --dry-run
 *   bun scripts/mainnet/initialize-protocol-fees.ts --cluster mainnet --execute
 */

import { Connection, Keypair, PublicKey, Transaction } from '@solana/web3.js';
import { address, createKeyPairSignerFromBytes, createSolanaRpc, createSolanaRpcSubscriptions, generateKeyPairSigner, getAddressEncoder } from '@solana/kit';
import {
  getInitializeProtocolConfigInstructionAsync,
  getEnableProtocolFeesInstructionAsync,
  fetchProtocolConfig,
  type ProtocolConfig
} from '@ghostspeak/sdk';

// CONFIGURATION - VERIFY THESE ADDRESSES BEFORE MAINNET DEPLOYMENT
const MAINNET_CONFIG = {
  // Program ID - UPDATE THIS after mainnet deployment
  programId: 'GpvFxus2eecFKcqa2bhxXeRjpstPeCEJNX216TQCcNC9' as const, // PLACEHOLDER - Update with mainnet program ID

  // Treasury addresses - VERIFY THESE ARE MULTISIG-CONTROLLED
  treasury: 'TREASURY_ADDRESS_HERE' as const, // TODO: Replace with actual multisig treasury
  buybackPool: 'BUYBACK_POOL_ADDRESS_HERE' as const, // TODO: Replace with actual multisig buyback pool
  moderatorPool: 'MODERATOR_POOL_ADDRESS_HERE' as const, // TODO: Replace with actual multisig moderator pool

  // Multisig authority - VERIFY THIS IS THE SQUADS MULTISIG
  authority: 'MULTISIG_AUTHORITY_ADDRESS_HERE' as const, // TODO: Replace with actual multisig address

  // Fee structure (basis points: 100 = 1%)
  fees: {
    escrowFeeBps: 50, // 0.5%
    disputeFeeBps: 100, // 1%
    agentRegistrationFee: 10_000_000n, // 0.01 SOL in lamports
    listingFee: 1_000_000n, // 0.001 SOL in lamports
  }
};

const DEVNET_CONFIG = {
  programId: 'GpvFxus2eecFKcqa2bhxXeRjpstPeCEJNX216TQCcNC9' as const,
  treasury: 'DEVNET_TREASURY_ADDRESS' as const,
  buybackPool: 'DEVNET_BUYBACK_ADDRESS' as const,
  moderatorPool: 'DEVNET_MODERATOR_ADDRESS' as const,
  authority: 'DEVNET_AUTHORITY_ADDRESS' as const,
  fees: {
    escrowFeeBps: 0, // Disabled on devnet
    disputeFeeBps: 0,
    agentRegistrationFee: 0n,
    listingFee: 0n,
  }
};

interface ProtocolConfigParams {
  cluster: 'mainnet' | 'devnet';
  dryRun: boolean;
  execute: boolean;
}

async function getProtocolConfigPDA(programId: string): Promise<string> {
  const seeds = [Buffer.from('protocol_config')];
  const encoder = getAddressEncoder();

  // This is simplified - in production use the SDK's PDA derivation
  const [pda] = await PublicKey.findProgramAddress(
    seeds,
    new PublicKey(programId)
  );

  return pda.toString();
}

async function checkProtocolConfigExists(
  rpc: ReturnType<typeof createSolanaRpc>,
  configAddress: string
): Promise<ProtocolConfig | null> {
  try {
    const config = await fetchProtocolConfig(rpc, address(configAddress));
    return config.data;
  } catch (error) {
    return null;
  }
}

async function initializeProtocolConfig(params: ProtocolConfigParams): Promise<void> {
  const config = params.cluster === 'mainnet' ? MAINNET_CONFIG : DEVNET_CONFIG;

  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║   GhostSpeak Protocol Fee Initialization                   ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  console.log(`Cluster: ${params.cluster.toUpperCase()}`);
  console.log(`Mode: ${params.dryRun ? 'DRY RUN (no transactions)' : 'EXECUTE (real transactions)'}\n`);

  // Validate configuration
  console.log('🔍 Validating configuration...\n');

  if (config.treasury.includes('_HERE') || config.treasury.includes('DEVNET_')) {
    console.error('❌ ERROR: Treasury address not configured!');
    console.error('   Please update the addresses in MAINNET_CONFIG or DEVNET_CONFIG');
    process.exit(1);
  }

  console.log('Configuration:');
  console.log(`  Program ID:        ${config.programId}`);
  console.log(`  Authority:         ${config.authority}`);
  console.log(`  Treasury:          ${config.treasury}`);
  console.log(`  Buyback Pool:      ${config.buybackPool}`);
  console.log(`  Moderator Pool:    ${config.moderatorPool}\n`);

  console.log('Fee Structure:');
  console.log(`  Escrow Fee:        ${config.fees.escrowFeeBps} bps (${config.fees.escrowFeeBps / 100}%)`);
  console.log(`  Dispute Fee:       ${config.fees.disputeFeeBps} bps (${config.fees.disputeFeeBps / 100}%)`);
  console.log(`  Registration Fee:  ${config.fees.agentRegistrationFee} lamports (${Number(config.fees.agentRegistrationFee) / 1e9} SOL)`);
  console.log(`  Listing Fee:       ${config.fees.listingFee} lamports (${Number(config.fees.listingFee) / 1e9} SOL)\n`);

  // Calculate fee distribution
  const escrowToTreasury = (config.fees.escrowFeeBps * 0.8).toFixed(1);
  const escrowToBuyback = (config.fees.escrowFeeBps * 0.2).toFixed(1);

  console.log('Fee Distribution:');
  console.log(`  Escrow fees:       ${escrowToTreasury} bps → Treasury, ${escrowToBuyback} bps → Buyback`);
  console.log(`  Dispute fees:      ${config.fees.disputeFeeBps} bps → Moderator Pool`);
  console.log(`  Registration fees: 100% → Treasury`);
  console.log(`  Listing fees:      100% → Treasury\n`);

  if (params.dryRun) {
    console.log('✅ DRY RUN COMPLETE - No transactions executed');
    console.log('\nTo execute for real, run:');
    console.log(`  bun scripts/mainnet/initialize-protocol-fees.ts --cluster ${params.cluster} --execute\n`);
    return;
  }

  if (!params.execute) {
    console.error('❌ ERROR: Must specify --dry-run or --execute');
    process.exit(1);
  }

  // MAINNET SAFETY CHECK
  if (params.cluster === 'mainnet') {
    console.log('⚠️  WARNING: You are about to execute on MAINNET ⚠️\n');
    console.log('This will:');
    console.log('  1. Initialize the protocol_config account');
    console.log('  2. Enable protocol fees for all users');
    console.log('  3. Start collecting fees immediately\n');

    console.log('Before proceeding, verify:');
    console.log('  ✓ Smart contract audit is complete');
    console.log('  ✓ All addresses are controlled by multisig');
    console.log('  ✓ Fee structure is approved by team');
    console.log('  ✓ You have multisig signing authority\n');

    // Require manual confirmation
    const readline = await import('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    const answer = await new Promise<string>((resolve) => {
      rl.question('Type "I UNDERSTAND THE RISKS" to proceed: ', resolve);
    });
    rl.close();

    if (answer !== 'I UNDERSTAND THE RISKS') {
      console.log('\n❌ Aborted - confirmation not received');
      process.exit(0);
    }
  }

  console.log('\n📡 Connecting to Solana...\n');

  // Setup connection
  const rpcUrl = params.cluster === 'mainnet'
    ? process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com'
    : 'https://api.devnet.solana.com';

  const rpc = createSolanaRpc(rpcUrl);
  const rpcSubscriptions = createSolanaRpcSubscriptions(rpcUrl.replace('https', 'wss'));

  console.log(`Connected to: ${rpcUrl}\n`);

  // Check if protocol config already exists
  const configPDA = await getProtocolConfigPDA(config.programId);
  console.log(`Protocol Config PDA: ${configPDA}\n`);

  const existingConfig = await checkProtocolConfigExists(rpc, configPDA);

  if (existingConfig) {
    console.log('⚠️  Protocol config already exists!');
    console.log('\nExisting configuration:');
    console.log(`  Authority:         ${existingConfig.authority}`);
    console.log(`  Treasury:          ${existingConfig.treasury}`);
    console.log(`  Buyback Pool:      ${existingConfig.buybackPool}`);
    console.log(`  Moderator Pool:    ${existingConfig.moderatorPool}`);
    console.log(`  Escrow Fee:        ${existingConfig.escrowFeeBps} bps`);
    console.log(`  Dispute Fee:       ${existingConfig.disputeFeeBps} bps`);
    console.log(`  Registration Fee:  ${existingConfig.agentRegistrationFee} lamports`);
    console.log(`  Listing Fee:       ${existingConfig.listingFee} lamports`);
    console.log(`  Fees Enabled:      ${existingConfig.feesEnabled}\n`);

    if (existingConfig.feesEnabled) {
      console.log('❌ ERROR: Fees are already enabled!');
      console.log('   Use update_protocol_config instruction to modify fees.');
      process.exit(1);
    }

    console.log('ℹ️  Config exists but fees are disabled.');
    console.log('   Proceeding to enable fees...\n');
  }

  // Load authority keypair
  // NOTE: For mainnet, this should be a multisig transaction
  const authorityKeypair = await loadAuthorityKeypair(params.cluster);

  if (!authorityKeypair) {
    console.error('❌ ERROR: Could not load authority keypair');
    console.error('   Set AUTHORITY_KEYPAIR_PATH environment variable');
    process.exit(1);
  }

  const authoritySigner = await createKeyPairSignerFromBytes(authorityKeypair.secretKey);

  console.log(`Authority: ${authoritySigner.address}\n`);

  try {
    if (!existingConfig) {
      // Step 1: Initialize protocol config
      console.log('📝 Step 1: Initializing protocol config...\n');

      const initIx = await getInitializeProtocolConfigInstructionAsync({
        authority: authoritySigner,
        treasury: address(config.treasury),
        buybackPool: address(config.buybackPool),
        moderatorPool: address(config.moderatorPool),
      });

      console.log('   Instruction created:');
      console.log(`   - Accounts: ${initIx.accounts.length}`);
      console.log(`   - Program: ${initIx.programAddress}\n`);

      // Here you would create and send the transaction
      // For mainnet, this should create a Squads multisig proposal
      console.log('   ⚠️  TRANSACTION NOT IMPLEMENTED');
      console.log('   For mainnet, create a Squads multisig proposal with this instruction\n');
    }

    // Step 2: Enable protocol fees
    console.log('📝 Step 2: Enabling protocol fees...\n');

    const enableIx = await getEnableProtocolFeesInstructionAsync({
      authority: authoritySigner,
    });

    console.log('   Instruction created:');
    console.log(`   - Accounts: ${enableIx.accounts.length}`);
    console.log(`   - Program: ${enableIx.programAddress}\n`);

    console.log('   ⚠️  TRANSACTION NOT IMPLEMENTED');
    console.log('   For mainnet, create a Squads multisig proposal with this instruction\n');

    console.log('✅ Instructions prepared successfully!\n');
    console.log('Next steps:');
    console.log('  1. Create Squads multisig proposal with these instructions');
    console.log('  2. Get 3-of-5 signers to approve');
    console.log('  3. Execute the proposal');
    console.log('  4. Verify fees are enabled on-chain');
    console.log('  5. Test fee collection with a small transaction\n');

  } catch (error) {
    console.error('❌ ERROR:', error);
    process.exit(1);
  }
}

async function loadAuthorityKeypair(cluster: string): Promise<Keypair | null> {
  const keypairPath = cluster === 'mainnet'
    ? process.env.MAINNET_AUTHORITY_KEYPAIR_PATH
    : process.env.DEVNET_AUTHORITY_KEYPAIR_PATH || '~/.config/solana/id.json';

  if (!keypairPath) {
    return null;
  }

  try {
    const fs = await import('fs');
    const path = await import('path');
    const os = await import('os');

    const expandedPath = keypairPath.startsWith('~')
      ? path.join(os.homedir(), keypairPath.slice(1))
      : keypairPath;

    const keypairData = JSON.parse(fs.readFileSync(expandedPath, 'utf-8'));
    return Keypair.fromSecretKey(new Uint8Array(keypairData));
  } catch (error) {
    console.error(`Failed to load keypair from ${keypairPath}:`, error);
    return null;
  }
}

// Parse CLI arguments
const args = process.argv.slice(2);
const cluster = args.find(arg => arg.startsWith('--cluster='))?.split('=')[1] as 'mainnet' | 'devnet' || 'devnet';
const dryRun = args.includes('--dry-run');
const execute = args.includes('--execute');

if (!dryRun && !execute) {
  console.log('Usage:');
  console.log('  bun scripts/mainnet/initialize-protocol-fees.ts [options]\n');
  console.log('Options:');
  console.log('  --cluster=<mainnet|devnet>  Target cluster (default: devnet)');
  console.log('  --dry-run                   Simulate without executing transactions');
  console.log('  --execute                   Execute transactions (requires confirmation)\n');
  console.log('Examples:');
  console.log('  bun scripts/mainnet/initialize-protocol-fees.ts --cluster devnet --dry-run');
  console.log('  bun scripts/mainnet/initialize-protocol-fees.ts --cluster mainnet --execute\n');
  process.exit(1);
}

// Run the initialization
initializeProtocolConfig({ cluster, dryRun, execute })
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
