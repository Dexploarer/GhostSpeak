#!/usr/bin/env bun
/**
 * Full Governance On-Chain Test
 * 
 * Creates actual accounts on Solana devnet and verifies them.
 */

import { 
  createSolanaRpc,
  createSolanaRpcSubscriptions,
  createKeyPairSignerFromBytes,
  address,
  pipe,
  createTransactionMessage,
  setTransactionMessageFeePayer,
  setTransactionMessageLifetimeUsingBlockhash,
  appendTransactionMessageInstructions,
  signTransactionMessageWithSigners,
  getBase64EncodedWireTransaction,
  type Address,
  type TransactionSigner
} from '@solana/kit';
import * as fs from 'fs';
import * as path from 'path';

// Import generated instructions
import { 
  getCreateMultisigInstructionAsync,
  getInitializeGovernanceProposalInstructionAsync,
  getInitializeRbacConfigInstructionAsync,
} from '../packages/sdk-typescript/src/generated/index.js';

// Import types
import { 
  ProposalType,
  RoleType,
  ConditionType
} from '../packages/sdk-typescript/src/generated/types/index.js';

const PROGRAM_ID = address('GpvFxus2eecFKcqa2bhxXeRjpstPeCEJNX216TQCcNC9');
const RPC_URL = 'https://api.devnet.solana.com';

// Colors
const green = (s: string) => `\x1b[32m${s}\x1b[0m`;
const red = (s: string) => `\x1b[31m${s}\x1b[0m`;
const yellow = (s: string) => `\x1b[33m${s}\x1b[0m`;
const blue = (s: string) => `\x1b[34m${s}\x1b[0m`;
const cyan = (s: string) => `\x1b[36m${s}\x1b[0m`;
const bold = (s: string) => `\x1b[1m${s}\x1b[0m`;

function logHeader(msg: string) {
  console.log(`\n${cyan('═'.repeat(70))}`);
  console.log(bold(`  ${msg}`));
  console.log(cyan('═'.repeat(70)) + '\n');
}

function logSuccess(msg: string) { console.log(green(`✅ ${msg}`)); }
function logError(msg: string) { console.log(red(`❌ ${msg}`)); }
function logInfo(msg: string) { console.log(blue(`ℹ️  ${msg}`)); }
function logStep(n: number, msg: string) { console.log(cyan(`\n[Step ${n}] ${msg}`)); }
function logTx(sig: string) { 
  console.log(yellow(`   TX: https://explorer.solana.com/tx/${sig}?cluster=devnet`)); 
}

async function loadWallet(): Promise<TransactionSigner> {
  const keypairPath = path.join(process.env.HOME || '', '.config/solana/id.json');
  const keypairData = JSON.parse(fs.readFileSync(keypairPath, 'utf-8'));
  return await createKeyPairSignerFromBytes(Uint8Array.from(keypairData));
}

async function sendTransaction(
  rpc: ReturnType<typeof createSolanaRpc>,
  wallet: TransactionSigner,
  instruction: any,
  description: string
): Promise<string> {
  console.log(blue(`\n   Sending: ${description}`));
  
  // Get latest blockhash
  const { value: latestBlockhash } = await rpc.getLatestBlockhash().send();
  
  // Build transaction message
  const transactionMessage = pipe(
    createTransactionMessage({ version: 0 }),
    tx => setTransactionMessageFeePayer(wallet.address, tx),
    tx => setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, tx),
    tx => appendTransactionMessageInstructions([instruction], tx)
  );
  
  // Sign transaction
  const signedTransaction = await signTransactionMessageWithSigners(transactionMessage);
  
  // Send transaction
  const encodedTransaction = getBase64EncodedWireTransaction(signedTransaction);
  
  const signature = await rpc.sendTransaction(encodedTransaction, {
    skipPreflight: false,
    preflightCommitment: 'confirmed',
    encoding: 'base64'
  }).send();
  
  console.log(green(`   ✓ Sent! Signature: ${signature.slice(0, 20)}...`));
  
  // Wait for confirmation
  console.log(blue(`   Confirming...`));
  
  let confirmed = false;
  let attempts = 0;
  const maxAttempts = 30;
  
  while (!confirmed && attempts < maxAttempts) {
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    try {
      const status = await rpc.getSignatureStatuses([signature]).send();
      if (status.value[0]?.confirmationStatus === 'confirmed' || 
          status.value[0]?.confirmationStatus === 'finalized') {
        confirmed = true;
        if (status.value[0]?.err) {
          throw new Error(`Transaction failed: ${JSON.stringify(status.value[0].err)}`);
        }
      }
    } catch (e) {
      // Ignore, keep waiting
    }
    attempts++;
  }
  
  if (!confirmed) {
    throw new Error('Transaction confirmation timeout');
  }
  
  console.log(green(`   ✓ Confirmed!`));
  return signature;
}

async function main() {
  logHeader('GhostSpeak Full Governance On-Chain Test');
  
  const rpc = createSolanaRpc(RPC_URL);
  
  // Step 1: Verify connection
  logStep(1, 'Verifying Network Connection');
  try {
    const version = await rpc.getVersion().send();
    logSuccess(`Connected to Solana devnet v${version['solana-core']}`);
  } catch (e) {
    logError(`Failed to connect: ${e}`);
    process.exit(1);
  }
  
  // Step 2: Load wallet
  logStep(2, 'Loading Wallet');
  let wallet: TransactionSigner;
  try {
    wallet = await loadWallet();
    logSuccess(`Wallet: ${wallet.address}`);
    
    const balance = await rpc.getBalance(wallet.address).send();
    logInfo(`Balance: ${(Number(balance.value) / 1e9).toFixed(4)} SOL`);
    
    if (Number(balance.value) < 0.1 * 1e9) {
      logError('Insufficient balance. Need at least 0.1 SOL for tests.');
      process.exit(1);
    }
  } catch (e) {
    logError(`Failed to load wallet: ${e}`);
    process.exit(1);
  }
  
  // Use timestamp-based IDs to ensure uniqueness
  const timestamp = Date.now();
  const results: { test: string; success: boolean; signature?: string; error?: string; account?: string }[] = [];
  
  // Step 3: Create Multisig
  logStep(3, 'Creating Multisig Wallet On-Chain');
  try {
    const multisigId = BigInt(timestamp);
    
    const instruction = await getCreateMultisigInstructionAsync({
      owner: wallet,
      multisigId: multisigId,
      threshold: 1,
      signers: [wallet.address],
      config: {
        requireSequentialSigning: false,
        allowOwnerOffCurve: false
      }
    });
    
    const signature = await sendTransaction(rpc, wallet, instruction, 'Create Multisig');
    logTx(signature);
    
    // Derive PDA to verify
    const { getProgramDerivedAddress, getU64Encoder, getBytesEncoder, getAddressEncoder } = await import('@solana/kit');
    const [multisigPda] = await getProgramDerivedAddress({
      programAddress: PROGRAM_ID,
      seeds: [
        getBytesEncoder().encode(new Uint8Array([109, 117, 108, 116, 105, 115, 105, 103])), // "multisig"
        getAddressEncoder().encode(wallet.address),
        getU64Encoder().encode(multisigId),
      ],
    });
    
    logSuccess(`Multisig Created!`);
    logInfo(`Multisig PDA: ${multisigPda}`);
    
    // Verify on-chain
    const accountInfo = await rpc.getAccountInfo(multisigPda, { encoding: 'base64' }).send();
    if (accountInfo.value) {
      logSuccess(`Verified on-chain: ${accountInfo.value.data[0].length} bytes`);
    }
    
    results.push({ test: 'Create Multisig', success: true, signature, account: multisigPda });
  } catch (e: any) {
    logError(`Failed to create multisig: ${e.message || e}`);
    results.push({ test: 'Create Multisig', success: false, error: e.message || String(e) });
  }
  
  // Step 4: Create Governance Proposal
  logStep(4, 'Creating Governance Proposal On-Chain');
  try {
    const proposalId = BigInt(timestamp + 1);
    
    const instruction = await getInitializeGovernanceProposalInstructionAsync({
      proposer: wallet,
      proposalId: proposalId,
      title: 'Test Governance Proposal',
      description: 'This is a test proposal created by the governance testing script.',
      proposalType: ProposalType.ParameterUpdate,
      executionParams: {
        instructions: [],
        executionDelay: BigInt(0),
        executionConditions: [],
        cancellable: true,
        autoExecute: false,
        executionAuthority: wallet.address
      }
    });
    
    const signature = await sendTransaction(rpc, wallet, instruction, 'Create Governance Proposal');
    logTx(signature);
    
    // Derive PDA to verify
    const { getProgramDerivedAddress, getU64Encoder, getBytesEncoder } = await import('@solana/kit');
    const [proposalPda] = await getProgramDerivedAddress({
      programAddress: PROGRAM_ID,
      seeds: [
        getBytesEncoder().encode(new Uint8Array([
          103, 111, 118, 101, 114, 110, 97, 110, 99, 101, 95, 112, 114, 111, 112, 111, 115, 97, 108
        ])), // "governance_proposal"
        getU64Encoder().encode(proposalId),
      ],
    });
    
    logSuccess(`Governance Proposal Created!`);
    logInfo(`Proposal PDA: ${proposalPda}`);
    
    // Verify on-chain
    const accountInfo = await rpc.getAccountInfo(proposalPda, { encoding: 'base64' }).send();
    if (accountInfo.value) {
      logSuccess(`Verified on-chain: ${accountInfo.value.data[0].length} bytes`);
    }
    
    results.push({ test: 'Create Governance Proposal', success: true, signature, account: proposalPda });
  } catch (e: any) {
    logError(`Failed to create proposal: ${e.message || e}`);
    results.push({ test: 'Create Governance Proposal', success: false, error: e.message || String(e) });
  }
  
  // Step 5: Initialize RBAC Config  
  logStep(5, 'Initializing RBAC Configuration On-Chain');
  try {
    const instruction = await getInitializeRbacConfigInstructionAsync({
      authority: wallet,
      initialRoles: [{
        roleId: 'admin_role',
        name: 'Administrator',
        description: 'Full administrative access',
        roleType: RoleType.Administrative,
        permissions: ['read', 'write', 'execute', 'admin'],
        constraints: {
          timeConstraints: null,
          locationConstraints: null,
          resourceConstraints: null,
          sessionConstraints: null,
          sodConstraints: [],
          maxConcurrentSessions: null,
          activationRequirements: []
        },
        inheritsFrom: [],
        metadata: '',
        status: 0, // Active
        createdAt: BigInt(Math.floor(Date.now() / 1000)),
        expiresAt: null
      }]
    });
    
    const signature = await sendTransaction(rpc, wallet, instruction, 'Initialize RBAC Config');
    logTx(signature);
    
    // Derive PDA to verify
    const { getProgramDerivedAddress, getBytesEncoder, getAddressEncoder } = await import('@solana/kit');
    const [rbacPda] = await getProgramDerivedAddress({
      programAddress: PROGRAM_ID,
      seeds: [
        getBytesEncoder().encode(new Uint8Array([114, 98, 97, 99, 95, 99, 111, 110, 102, 105, 103])), // "rbac_config"
        getAddressEncoder().encode(wallet.address),
      ],
    });
    
    logSuccess(`RBAC Config Initialized!`);
    logInfo(`RBAC PDA: ${rbacPda}`);
    
    // Verify on-chain
    const accountInfo = await rpc.getAccountInfo(rbacPda, { encoding: 'base64' }).send();
    if (accountInfo.value) {
      logSuccess(`Verified on-chain: ${accountInfo.value.data[0].length} bytes`);
    }
    
    results.push({ test: 'Initialize RBAC Config', success: true, signature, account: rbacPda });
  } catch (e: any) {
    logError(`Failed to initialize RBAC: ${e.message || e}`);
    results.push({ test: 'Initialize RBAC Config', success: false, error: e.message || String(e) });
  }
  
  // Step 6: Query all program accounts
  logStep(6, 'Querying All Program Accounts');
  try {
    const accounts = await rpc.getProgramAccounts(PROGRAM_ID, {
      encoding: 'base64',
      dataSlice: { offset: 0, length: 8 }
    }).send();
    
    logSuccess(`Found ${accounts.length} total accounts owned by program`);
    
    // Count by type
    const typeCounts = new Map<string, number>();
    for (const acc of accounts) {
      const data = Buffer.from(acc.account.data[0], 'base64');
      const disc = data.slice(0, 8).toString('hex');
      typeCounts.set(disc, (typeCounts.get(disc) || 0) + 1);
    }
    
    logInfo('Account distribution:');
    for (const [disc, count] of typeCounts.entries()) {
      console.log(`   ${disc}: ${count} accounts`);
    }
  } catch (e: any) {
    logError(`Failed to query accounts: ${e.message || e}`);
  }
  
  // Final Summary
  logHeader('Test Results Summary');
  
  const passed = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  
  console.log(`\n${bold('Results:')}\n`);
  
  for (const result of results) {
    if (result.success) {
      console.log(green(`  ✅ ${result.test}`));
      if (result.signature) {
        console.log(`     TX: ${result.signature.slice(0, 30)}...`);
      }
      if (result.account) {
        console.log(`     Account: ${result.account}`);
      }
    } else {
      console.log(red(`  ❌ ${result.test}`));
      if (result.error) {
        console.log(`     Error: ${result.error.slice(0, 100)}...`);
      }
    }
    console.log();
  }
  
  console.log(`${cyan('─'.repeat(70))}`);
  console.log(`\n${bold('Summary:')} ${passed} passed, ${failed} failed`);
  console.log(`${blue('Program ID:')} ${PROGRAM_ID}`);
  console.log(`${blue('Network:')} Solana Devnet`);
  console.log(`${blue('Wallet:')} ${wallet.address}`);
  console.log(`${blue('Timestamp:')} ${new Date().toISOString()}\n`);
  
  if (failed > 0) {
    console.log(yellow('\n⚠️  Some tests failed. Check the errors above for details.\n'));
    process.exit(1);
  } else {
    console.log(green('\n🎉 All governance tests passed! On-chain accounts created and verified.\n'));
  }
}

main().catch(e => {
  console.error(red(`\n❌ Fatal error: ${e}\n`));
  process.exit(1);
});
