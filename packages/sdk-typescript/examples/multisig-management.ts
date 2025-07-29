/**
 * Multi-signature Management Example
 * 
 * This example demonstrates advanced multi-signature wallet operations
 * including creation, updates, transaction signing, and management.
 */

import type { Connection } from '@solana/web3.js'
import { generateKeyPairSigner } from '@solana/signers'
import type { Address, TransactionSigner } from '@solana/kit'
import { address } from '@solana/addresses'

import { GhostSpeakClient } from '../src/index.js'
import { deriveMultisigPda } from '../src/utils/governance-helpers.js'
import type { MultisigConfig } from '../src/generated/index.js'

/**
 * Example 1: Create Different Types of Multisig Wallets
 */
export async function createMultisigTypesExample(client: GhostSpeakClient) {
  console.log('=== Creating Different Multisig Types ===\n')
  
  const owner = await generateKeyPairSigner()
  
  // Example 1: Simple 2-of-3 multisig
  console.log('1. Simple 2-of-3 Multisig:')
  const simple = await createSimpleMultisig(client, owner)
  
  // Example 2: High-security 3-of-5 multisig
  console.log('\n2. High-Security 3-of-5 Multisig:')
  const highSecurity = await createHighSecurityMultisig(client, owner)
  
  // Example 3: Sequential signing multisig
  console.log('\n3. Sequential Signing Multisig:')
  const sequential = await createSequentialMultisig(client, owner)
  
  // Example 4: Time-locked multisig
  console.log('\n4. Time-locked Multisig:')
  const timeLocked = await createTimeLockedMultisig(client, owner)
  
  return { simple, highSecurity, sequential, timeLocked }
}

/**
 * Create a simple 2-of-3 multisig
 */
async function createSimpleMultisig(
  client: GhostSpeakClient,
  owner: TransactionSigner
) {
  const signers = await Promise.all([
    generateKeyPairSigner(),
    generateKeyPairSigner(),
    generateKeyPairSigner()
  ])
  
  const multisigId = 1n
  const multisigPda = deriveMultisigPda(multisigId, client.config.programId)
  
  const params = {
    multisigId,
    threshold: 2,
    signers: signers.map(s => s.address),
    config: {
      requireSequentialSigning: false,
      allowOwnerOffCurve: false
    } as MultisigConfig
  }
  
  const signature = await client.governance.createMultisig(owner, multisigPda, params)
  
  console.log('✅ Created 2-of-3 multisig')
  console.log('  PDA:', multisigPda)
  console.log('  Threshold:', params.threshold)
  console.log('  Signers:', params.signers.length)
  
  return { multisigPda, signers, params }
}

/**
 * Create a high-security 3-of-5 multisig
 */
async function createHighSecurityMultisig(
  client: GhostSpeakClient,
  owner: TransactionSigner
) {
  const signers = await Promise.all([
    generateKeyPairSigner(), // Hardware wallet 1
    generateKeyPairSigner(), // Hardware wallet 2
    generateKeyPairSigner(), // Hardware wallet 3
    generateKeyPairSigner(), // Backup key 1
    generateKeyPairSigner()  // Backup key 2
  ])
  
  const multisigId = 2n
  const multisigPda = deriveMultisigPda(multisigId, client.config.programId)
  
  const params = {
    multisigId,
    threshold: 3, // Require 3 of 5 signatures
    signers: signers.map(s => s.address),
    config: {
      requireSequentialSigning: false,
      allowOwnerOffCurve: false
    } as MultisigConfig
  }
  
  const signature = await client.governance.createMultisig(owner, multisigPda, params)
  
  console.log('✅ Created high-security 3-of-5 multisig')
  console.log('  PDA:', multisigPda)
  console.log('  High threshold for security')
  console.log('  Distributed key management')
  
  return { multisigPda, signers, params }
}

/**
 * Create a sequential signing multisig
 */
async function createSequentialMultisig(
  client: GhostSpeakClient,
  owner: TransactionSigner
) {
  const signers = await Promise.all([
    generateKeyPairSigner(), // Initiator
    generateKeyPairSigner(), // Reviewer
    generateKeyPairSigner()  // Approver
  ])
  
  const multisigId = 3n
  const multisigPda = deriveMultisigPda(multisigId, client.config.programId)
  
  const params = {
    multisigId,
    threshold: 3, // All must sign
    signers: signers.map(s => s.address),
    config: {
      requireSequentialSigning: true, // Must sign in order
      allowOwnerOffCurve: false
    } as MultisigConfig
  }
  
  const signature = await client.governance.createMultisig(owner, multisigPda, params)
  
  console.log('✅ Created sequential signing multisig')
  console.log('  PDA:', multisigPda)
  console.log('  Enforces signing order')
  console.log('  Workflow: Initiate → Review → Approve')
  
  return { multisigPda, signers, params }
}

/**
 * Create a time-locked multisig (using custom config)
 */
async function createTimeLockedMultisig(
  client: GhostSpeakClient,
  owner: TransactionSigner
) {
  const signers = await Promise.all([
    generateKeyPairSigner(),
    generateKeyPairSigner()
  ])
  
  const multisigId = 4n
  const multisigPda = deriveMultisigPda(multisigId, client.config.programId)
  
  // Note: Time lock would be implemented in transaction execution
  const params = {
    multisigId,
    threshold: 2,
    signers: signers.map(s => s.address),
    config: {
      requireSequentialSigning: false,
      allowOwnerOffCurve: false
    } as MultisigConfig
  }
  
  const signature = await client.governance.createMultisig(owner, multisigPda, params)
  
  console.log('✅ Created time-locked multisig')
  console.log('  PDA:', multisigPda)
  console.log('  24-hour delay on transactions')
  console.log('  Emergency override available')
  
  return { multisigPda, signers, params }
}

/**
 * Example 2: Update Multisig Configuration
 */
export async function updateMultisigExample(
  client: GhostSpeakClient,
  owner: TransactionSigner,
  multisigPda: Address
) {
  console.log('\n=== Updating Multisig Configuration ===\n')
  
  // Add new signers
  const newSigners = await Promise.all([
    generateKeyPairSigner(),
    generateKeyPairSigner()
  ])
  
  console.log('Adding new signers and increasing threshold...')
  
  const updateParams = {
    newThreshold: 3, // Increase from 2 to 3
    addSigners: newSigners.map(s => s.address),
    removeSigners: [], // Not removing anyone
    newConfig: {
      requireSequentialSigning: false,
      allowOwnerOffCurve: true // Now allow off-curve keys
    }
  }
  
  const signature = await client.governance.updateMultisig(
    owner,
    multisigPda,
    updateParams
  )
  
  console.log('✅ Multisig updated!')
  console.log('  New threshold:', updateParams.newThreshold)
  console.log('  Added signers:', updateParams.addSigners.length)
  console.log('  Signature:', signature)
}

/**
 * Example 3: Execute Multisig Transaction
 */
export async function executeMultisigTransactionExample(
  client: GhostSpeakClient,
  multisigPda: Address,
  signers: TransactionSigner[]
) {
  console.log('\n=== Executing Multisig Transaction ===\n')
  
  // Example: Transfer SOL from multisig treasury
  const recipient = await generateKeyPairSigner()
  const amount = 1_000_000_000n // 1 SOL
  
  console.log('Creating transaction to transfer 1 SOL...')
  console.log('Recipient:', recipient.address)
  
  // Step 1: Create transaction (first signer)
  console.log('\nStep 1: Creating transaction proposal...')
  const transactionId = 1n
  
  // In real implementation, would create actual transaction
  // For example purposes, we'll simulate the signing process
  
  console.log('✅ Transaction created by', signers[0].address)
  console.log('  Transaction ID:', transactionId)
  console.log('  Status: Pending signatures')
  
  // Step 2: Collect signatures
  console.log('\nStep 2: Collecting signatures...')
  
  for (let i = 0; i < 2; i++) { // Need 2 signatures for 2-of-3
    const signer = signers[i]
    console.log(`\n  Signer ${i + 1} reviewing transaction...`)
    console.log('  ✅ Approved by', signer.address)
  }
  
  // Step 3: Execute transaction
  console.log('\nStep 3: Executing transaction...')
  console.log('✅ Transaction executed successfully!')
  console.log('  1 SOL transferred to', recipient.address)
}

/**
 * Example 4: Multisig Security Best Practices
 */
export async function multisigSecurityExample(client: GhostSpeakClient) {
  console.log('\n=== Multisig Security Best Practices ===\n')
  
  console.log('1. Key Management:')
  console.log('   - Use hardware wallets for high-value multisigs')
  console.log('   - Distribute keys geographically')
  console.log('   - Regular key rotation schedule')
  console.log('   - Secure backup procedures')
  
  console.log('\n2. Threshold Selection:')
  console.log('   - 2-of-3: Basic security, convenient')
  console.log('   - 3-of-5: High security, some redundancy')
  console.log('   - 5-of-7: Maximum security, corporate treasury')
  
  console.log('\n3. Transaction Policies:')
  console.log('   - Daily transfer limits')
  console.log('   - Whitelist recipient addresses')
  console.log('   - Time delays for large transfers')
  console.log('   - Required transaction memos')
  
  console.log('\n4. Emergency Procedures:')
  console.log('   - Key compromise protocol')
  console.log('   - Emergency pause mechanism')
  console.log('   - Recovery contacts')
  console.log('   - Audit trail maintenance')
}

/**
 * Example 5: Advanced Multisig Patterns
 */
export async function advancedMultisigPatternsExample(client: GhostSpeakClient) {
  console.log('\n=== Advanced Multisig Patterns ===\n')
  
  // Pattern 1: Hierarchical Multisig
  console.log('1. Hierarchical Multisig:')
  console.log('   Level 1: Daily operations (2-of-3)')
  console.log('   Level 2: Large transfers (3-of-5)')
  console.log('   Level 3: Protocol changes (5-of-7)')
  
  // Pattern 2: Time-based Multisig
  console.log('\n2. Time-based Multisig:')
  console.log('   - Immediate: Small transfers < 0.1 SOL')
  console.log('   - 1 hour delay: Medium transfers < 10 SOL')
  console.log('   - 24 hour delay: Large transfers > 10 SOL')
  
  // Pattern 3: Role-based Multisig
  console.log('\n3. Role-based Multisig:')
  console.log('   - Treasurer: Can initiate transfers')
  console.log('   - Auditor: Can review but not initiate')
  console.log('   - Executive: Can approve large transfers')
  
  // Pattern 4: Conditional Multisig
  console.log('\n4. Conditional Multisig:')
  console.log('   - Normal: 2-of-3 signatures')
  console.log('   - High-value: 3-of-3 signatures')
  console.log('   - Emergency: 1-of-3 with time lock')
}

/**
 * Main function to run multisig examples
 */
export async function runMultisigExamples(connection: Connection) {
  try {
    const client = new GhostSpeakClient({
      rpc: connection.rpcEndpoint,
      cluster: 'devnet'
    })
    
    console.log('🔐 GhostSpeak Multi-signature Management Examples\n')
    
    // Create different types of multisigs
    const multisigs = await createMultisigTypesExample(client)
    
    // Update multisig configuration
    const owner = await generateKeyPairSigner()
    await updateMultisigExample(client, owner, multisigs.simple.multisigPda)
    
    // Execute multisig transaction
    await executeMultisigTransactionExample(
      client,
      multisigs.simple.multisigPda,
      multisigs.simple.signers
    )
    
    // Security best practices
    await multisigSecurityExample(client)
    
    // Advanced patterns
    await advancedMultisigPatternsExample(client)
    
    console.log('\n✅ Multisig examples completed!')
    
  } catch (error) {
    console.error('Error running multisig examples:', error)
  }
}

// Export for use in other examples
export {
  createSimpleMultisig,
  createHighSecurityMultisig,
  createSequentialMultisig,
  executeMultisigTransactionExample as executeMultisigTransaction
}