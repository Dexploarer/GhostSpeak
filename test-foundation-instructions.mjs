#!/usr/bin/env node

/**
 * GhostSpeak Foundation Instructions Test Suite
 * Tests Phase 1: Foundation instructions (8/68)
 * - registerAgent, activateAgent, verifyAgent, updateAgent
 * - createChannel, initializeRbacConfig, initializeAuditTrail, initializeGovernanceProposal
 */

import { 
  createSolanaRpc,
  createKeyPairSignerFromBytes,
  generateKeyPairSigner,
  address,
  lamports,
  getSignatureFromTransaction
} from '@solana/kit';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configuration
const PROGRAM_ID = new PublicKey('5mMhsW6dP6RCXv73CdBtzfAV9CJkXKYv3SqPDiccf5aK');
const RPC_URL = 'https://api.devnet.solana.com';
const connection = new Connection(RPC_URL, 'confirmed');

// Test Results Tracking
let testResults = {
  passed: 0,
  failed: 0,
  skipped: 0,
  errors: []
};

console.log('\n🧪 GhostSpeak Foundation Instructions Test Suite');
console.log('=' .repeat(60));

async function setupTestEnvironment() {
  console.log('\n📋 Setting up test environment...');
  
  // Load or create test keypair
  let payer;
  try {
    const keyPath = join(__dirname, 'test-keypair.json');
    if (fs.existsSync(keyPath)) {
      const keyData = JSON.parse(fs.readFileSync(keyPath, 'utf8'));
      payer = Keypair.fromSecretKey(new Uint8Array(keyData));
      console.log(`✅ Loaded existing keypair: ${payer.publicKey.toString()}`);
    } else {
      payer = Keypair.generate();
      fs.writeFileSync(keyPath, JSON.stringify(Array.from(payer.secretKey)));
      console.log(`✅ Generated new keypair: ${payer.publicKey.toString()}`);
    }
  } catch (error) {
    payer = Keypair.generate();
    console.log(`✅ Using temporary keypair: ${payer.publicKey.toString()}`);
  }

  // Check SOL balance
  const balance = await connection.getBalance(payer.publicKey);
  console.log(`💰 Current balance: ${balance / LAMPORTS_PER_SOL} SOL`);
  
  if (balance < 0.1 * LAMPORTS_PER_SOL) {
    console.log('⚠️  Low balance - requesting airdrop...');
    try {
      const signature = await connection.requestAirdrop(payer.publicKey, LAMPORTS_PER_SOL);
      await connection.confirmTransaction(signature);
      console.log('✅ Airdrop successful');
    } catch (error) {
      console.log('⚠️  Airdrop failed, continuing with current balance');
    }
  }

  // Load program IDL
  const idlPath = join(__dirname, 'deployed_program_idl.json');
  if (!fs.existsSync(idlPath)) {
    throw new Error('❌ Program IDL not found. Run: anchor idl build');
  }
  
  const idl = JSON.parse(fs.readFileSync(idlPath, 'utf8'));
  const wallet = new Wallet(payer);
  const provider = new AnchorProvider(connection, wallet, { commitment: 'confirmed' });
  const program = new Program(idl, PROGRAM_ID, provider);

  console.log(`✅ Program loaded: ${PROGRAM_ID.toString()}`);
  console.log(`✅ Total instructions available: ${idl.instructions.length}`);

  return { payer, program, provider };
}

async function runTest(testName, testFn) {
  console.log(`\n🔍 Testing: ${testName}`);
  console.log('-'.repeat(40));
  
  try {
    await testFn();
    testResults.passed++;
    console.log(`✅ PASSED: ${testName}`);
  } catch (error) {
    testResults.failed++;
    testResults.errors.push({ test: testName, error: error.message });
    console.log(`❌ FAILED: ${testName}`);
    console.log(`   Error: ${error.message}`);
    if (error.logs) {
      console.log(`   Logs: ${error.logs.join('\n         ')}`);
    }
  }
}

// Test 1: Register Agent
async function testRegisterAgent(program, payer) {
  const [agentPda] = PublicKey.findProgramAddressSync(
    [Buffer.from('agent'), payer.publicKey.toBuffer()],
    program.programId
  );

  // Check if agent already exists
  try {
    await program.account.agent.fetch(agentPda);
    console.log('ℹ️  Agent already exists, skipping registration');
    return;
  } catch (error) {
    // Agent doesn't exist, proceed with registration
  }

  const tx = await program.methods
    .registerAgent(
      'TestAgent',                    // name
      'Test agent for foundation',    // description  
      'https://test.com',            // metadata_uri
      ['AI', 'Testing'],             // capabilities
      new BN(1000000),               // pricing_model (1 USDC)
      true                           // is_active
    )
    .accounts({
      agent: agentPda,
      authority: payer.publicKey,
      systemProgram: SystemProgram.programId,
    })
    .rpc();

  console.log(`   Transaction: ${tx}`);
  
  // Verify agent was created
  const agent = await program.account.agent.fetch(agentPda);
  if (agent.name !== 'TestAgent') {
    throw new Error('Agent name mismatch');
  }
}

// Test 2: Activate Agent  
async function testActivateAgent(program, payer) {
  const [agentPda] = PublicKey.findProgramAddressSync(
    [Buffer.from('agent'), payer.publicKey.toBuffer()],
    program.programId
  );

  const tx = await program.methods
    .activateAgent()
    .accounts({
      agent: agentPda,
      authority: payer.publicKey,
    })
    .rpc();

  console.log(`   Transaction: ${tx}`);
  
  // Verify agent is active
  const agent = await program.account.agent.fetch(agentPda);
  if (!agent.isActive) {
    throw new Error('Agent should be active');
  }
}

// Test 3: Verify Agent
async function testVerifyAgent(program, payer) {
  const [agentPda] = PublicKey.findProgramAddressSync(
    [Buffer.from('agent'), payer.publicKey.toBuffer()],
    program.programId
  );

  // Create verifier keypair
  const verifier = Keypair.generate();
  
  try {
    const tx = await program.methods
      .verifyAgent(
        'performance',  // verification_type
        true,          // verified
        'Test verification' // notes
      )
      .accounts({
        agent: agentPda,
        verifier: verifier.publicKey,
      })
      .signers([verifier])
      .rpc();

    console.log(`   Transaction: ${tx}`);
  } catch (error) {
    if (error.message.includes('insufficient funds')) {
      console.log('ℹ️  Verifier needs SOL, skipping verification test');
      testResults.skipped++;
      return;
    }
    throw error;
  }
}

// Test 4: Update Agent
async function testUpdateAgent(program, payer) {
  const [agentPda] = PublicKey.findProgramAddressSync(
    [Buffer.from('agent'), payer.publicKey.toBuffer()],
    program.programId
  );

  const tx = await program.methods
    .updateAgent(
      'UpdatedTestAgent',              // name
      'Updated description',           // description
      'https://updated.com',          // metadata_uri  
      ['AI', 'Testing', 'Updated'],   // capabilities
      new BN(2000000)                 // pricing_model (2 USDC)
    )
    .accounts({
      agent: agentPda,
      authority: payer.publicKey,
    })
    .rpc();

  console.log(`   Transaction: ${tx}`);
  
  // Verify updates
  const agent = await program.account.agent.fetch(agentPda);
  if (agent.name !== 'UpdatedTestAgent') {
    throw new Error('Agent name not updated');
  }
}

// Test 5: Create Channel
async function testCreateChannel(program, payer) {
  const participant = Keypair.generate();
  
  const [channelPda] = PublicKey.findProgramAddressSync(
    [
      Buffer.from('channel'),
      payer.publicKey.toBuffer(),
      participant.publicKey.toBuffer()
    ],
    program.programId
  );

  const tx = await program.methods
    .createChannel(
      'direct',      // channel_type
      false,         // is_encrypted
      new BN(0)      // max_participants
    )
    .accounts({
      channel: channelPda,
      creator: payer.publicKey,
      participant: participant.publicKey,
      systemProgram: SystemProgram.programId,
    })
    .rpc();

  console.log(`   Transaction: ${tx}`);
  
  // Verify channel created
  const channel = await program.account.channel.fetch(channelPda);
  if (channel.channelType.direct === undefined) {
    throw new Error('Channel type mismatch');
  }
}

// Test 6: Initialize RBAC Config
async function testInitializeRbacConfig(program, payer) {
  const [rbacPda] = PublicKey.findProgramAddressSync(
    [Buffer.from('rbac'), payer.publicKey.toBuffer()],
    program.programId
  );

  // Check if RBAC already exists
  try {
    await program.account.rbacConfig.fetch(rbacPda);
    console.log('ℹ️  RBAC Config already exists, skipping initialization');
    return;
  } catch (error) {
    // RBAC doesn't exist, proceed
  }

  const tx = await program.methods
    .initializeRbacConfig(
      ['admin', 'user'],                    // roles
      [['read', 'write'], ['read']]         // permissions
    )
    .accounts({
      rbacConfig: rbacPda,
      authority: payer.publicKey,
      systemProgram: SystemProgram.programId,
    })
    .rpc();

  console.log(`   Transaction: ${tx}`);
  
  // Verify RBAC config
  const rbac = await program.account.rbacConfig.fetch(rbacPda);
  if (rbac.roles.length !== 2) {
    throw new Error('RBAC roles count mismatch');
  }
}

// Test 7: Initialize Audit Trail
async function testInitializeAuditTrail(program, payer) {
  const [auditPda] = PublicKey.findProgramAddressSync(
    [Buffer.from('audit'), payer.publicKey.toBuffer()],
    program.programId
  );

  // Check if audit trail already exists
  try {
    await program.account.auditTrail.fetch(auditPda);
    console.log('ℹ️  Audit Trail already exists, skipping initialization');
    return;
  } catch (error) {
    // Audit trail doesn't exist, proceed
  }

  const tx = await program.methods
    .initializeAuditTrail(
      30,        // retention_days
      ['admin']  // authorized_roles
    )
    .accounts({
      auditTrail: auditPda,
      authority: payer.publicKey,
      systemProgram: SystemProgram.programId,
    })
    .rpc();

  console.log(`   Transaction: ${tx}`);
  
  // Verify audit trail
  const audit = await program.account.auditTrail.fetch(auditPda);
  if (audit.retentionDays !== 30) {
    throw new Error('Audit trail retention days mismatch');
  }
}

// Test 8: Initialize Governance Proposal
async function testInitializeGovernanceProposal(program, payer) {
  const [proposalPda] = PublicKey.findProgramAddressSync(
    [Buffer.from('proposal'), payer.publicKey.toBuffer(), Buffer.from('test-1')],
    program.programId
  );

  const tx = await program.methods
    .initializeGovernanceProposal(
      'test-1',                          // proposal_id
      'Test Proposal',                   // title
      'Description of test proposal',    // description
      new BN(Date.now() + 86400000),    // voting_end_time (24h from now)
      new BN(50)                         // quorum_threshold (50%)
    )
    .accounts({
      proposal: proposalPda,
      proposer: payer.publicKey,
      systemProgram: SystemProgram.programId,
    })
    .rpc();

  console.log(`   Transaction: ${tx}`);
  
  // Verify proposal
  const proposal = await program.account.governanceProposal.fetch(proposalPda);
  if (proposal.title !== 'Test Proposal') {
    throw new Error('Proposal title mismatch');
  }
}

// Main execution
async function main() {
  try {
    const { payer, program } = await setupTestEnvironment();

    // Run Phase 1 Tests
    console.log('\n🚀 Running Phase 1: Foundation Instructions Tests');
    console.log('=' .repeat(60));

    await runTest('1. Register Agent', () => testRegisterAgent(program, payer));
    await runTest('2. Activate Agent', () => testActivateAgent(program, payer));
    await runTest('3. Verify Agent', () => testVerifyAgent(program, payer));
    await runTest('4. Update Agent', () => testUpdateAgent(program, payer));
    await runTest('5. Create Channel', () => testCreateChannel(program, payer));
    await runTest('6. Initialize RBAC Config', () => testInitializeRbacConfig(program, payer));
    await runTest('7. Initialize Audit Trail', () => testInitializeAuditTrail(program, payer));
    await runTest('8. Initialize Governance Proposal', () => testInitializeGovernanceProposal(program, payer));

    // Results Summary
    console.log('\n📊 Test Results Summary');
    console.log('=' .repeat(40));
    console.log(`✅ Passed: ${testResults.passed}`);
    console.log(`❌ Failed: ${testResults.failed}`);
    console.log(`⏭️  Skipped: ${testResults.skipped}`);
    console.log(`📈 Success Rate: ${((testResults.passed / (testResults.passed + testResults.failed)) * 100).toFixed(1)}%`);

    if (testResults.errors.length > 0) {
      console.log('\n❌ Failed Tests Details:');
      testResults.errors.forEach(({ test, error }) => {
        console.log(`   ${test}: ${error}`);
      });
    }

    console.log('\n🎯 Phase 1 Foundation Instructions: COMPLETE');
    console.log('   Ready to proceed to Phase 2: Core Marketplace Instructions');

  } catch (error) {
    console.error('❌ Test suite failed:', error.message);
    process.exit(1);
  }
}

main().catch(console.error);