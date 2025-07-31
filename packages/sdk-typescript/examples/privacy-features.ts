/**
 * Privacy Features Example
 * 
 * This example demonstrates how to use the privacy features in GhostSpeak SDK,
 * including the hybrid approach that supports both client-side encryption and
 * ZK proofs (when available).
 */

import type { Rpc } from '@solana/kit'
import { generateKeyPairSigner } from '@solana/signers'
import type { Address } from '@solana/kit'

import {
  ConfidentialTransferManager,
  ProofMode,
  ClientEncryptionService,
  PrivateMetadataStorage,
  getFeatureFlags,
  generateElGamalKeypair,
  type ElGamalKeypair
} from '../src/index.js'

/**
 * Example 1: Check Privacy Feature Status
 */
export async function checkPrivacyStatus(connection: Connection) {
  console.log('=== Checking Privacy Feature Status ===\n')
  
  const manager = new ConfidentialTransferManager(connection)
  
  // Get current privacy status
  const status = await manager.getPrivacyStatus()
  console.log('Privacy Mode:', status.mode)
  console.log('Available:', status.available)
  console.log('Message:', status.message)
  
  // Check ZK program specifically
  const zkStatus = await manager.getZkProgramStatus()
  console.log('\nZK Program Status:', zkStatus)
  
  // Check feature flags
  const flags = getFeatureFlags()
  console.log('\nFeature Flags:')
  console.log('- Confidential Transfers:', flags.isEnabled('CONFIDENTIAL_TRANSFERS_ENABLED'))
  console.log('- Use ZK Proofs:', flags.isEnabled('USE_ZK_PROOFS'))
  console.log('- Use Client Encryption:', flags.isEnabled('USE_CLIENT_ENCRYPTION'))
  console.log('- IPFS Storage:', flags.isEnabled('ENABLE_IPFS_STORAGE'))
}

/**
 * Example 2: Client-Side Encryption (Current Beta Feature)
 */
export async function clientSideEncryptionExample() {
  console.log('\n=== Client-Side Encryption Example ===\n')
  
  const encryptionService = new ClientEncryptionService()
  
  // Generate keypair for recipient
  const recipientKeypair = generateElGamalKeypair()
  
  // Encrypt an amount
  const amount = 1_000_000_000n // 1 token
  const encrypted = await encryptionService.encryptAmountForRecipient(
    amount,
    recipientKeypair.publicKey
  )
  
  console.log('Encrypted amount:', {
    commitment: Buffer.from(encrypted.commitment).toString('hex'),
    timestamp: encrypted.timestamp,
    version: encrypted.version
  })
  
  // Decrypt the amount (requires secret key)
  const decrypted = await encryptionService.decryptAmount(
    encrypted,
    recipientKeypair.secretKey
  )
  
  console.log('Decrypted amount:', decrypted)
  console.log('Matches original:', decrypted === amount)
}

/**
 * Example 3: Private Metadata Storage
 */
export async function privateMetadataExample() {
  console.log('\n=== Private Metadata Storage Example ===\n')
  
  const storage = new PrivateMetadataStorage()
  const recipientKeypair = generateElGamalKeypair()
  
  // Private data (will be encrypted)
  const privateData = {
    serviceDetails: 'AI model training on proprietary dataset',
    apiEndpoint: 'https://private.api.example.com',
    credentials: {
      apiKey: 'secret-key-123',
      modelId: 'gpt-custom-v1'
    }
  }
  
  // Public metadata (not encrypted)
  const publicMetadata = {
    category: 'ai-training',
    estimatedDuration: '48 hours',
    priceRange: '100-500 SOL'
  }
  
  // Store private data
  const stored = await storage.storePrivateData(
    privateData,
    publicMetadata,
    recipientKeypair.publicKey
  )
  
  console.log('Stored private data:')
  console.log('- On-chain hash:', Buffer.from(stored.onChainHash).toString('hex'))
  console.log('- Storage location:', stored.storageLocation)
  console.log('- Size:', stored.size, 'bytes')
  
  // Retrieve private data (requires secret key)
  const retrieved = await storage.retrievePrivateData(
    stored,
    recipientKeypair.secretKey
  )
  
  console.log('\nRetrieved data:')
  console.log('- Private:', retrieved.privateData)
  console.log('- Public:', retrieved.publicData)
}

/**
 * Example 4: Dual-Mode Confidential Transfer
 */
export async function dualModeTransferExample(connection: Connection) {
  console.log('\n=== Dual-Mode Confidential Transfer Example ===\n')
  
  const manager = new ConfidentialTransferManager(
    connection,
    ProofMode.ZK_PROGRAM_WITH_FALLBACK // Automatically use best available mode
  )
  
  // Create signers
  const payer = await generateKeyPairSigner()
  const sourceKeypair = generateElGamalKeypair()
  const destKeypair = generateElGamalKeypair()
  
  // Create transfer parameters
  const transferParams = {
    source: '11111111111111111111111111111111' as Address,
    destination: '22222222222222222222222222222222' as Address,
    mint: '33333333333333333333333333333333' as Address,
    amount: 1_000_000_000n,
    sourceKeypair,
    destElgamalPubkey: destKeypair.publicKey,
    newSourceDecryptableBalance: 9_000_000_000n,
    authority: payer
  }
  
  // Create transfer instructions (dual-mode)
  const result = await manager.createTransferInstructions(transferParams)
  
  console.log('Transfer created:')
  console.log('- Instructions:', result.instructions.length)
  console.log('- Proof instructions:', result.proofInstructions.length)
  console.log('- Warnings:', result.warnings)
  
  if (result.metadata) {
    console.log('- Private metadata stored:', result.metadata.storageLocation)
  }
}

/**
 * Example 5: Monitor ZK Program Availability
 */
export async function monitorZkProgramExample(connection: Connection) {
  console.log('\n=== Monitoring ZK Program Availability ===\n')
  
  const manager = new ConfidentialTransferManager(connection)
  
  console.log('Starting ZK program monitoring...')
  console.log('(Will check every 30 seconds)')
  
  // Monitor for changes
  const stopMonitoring = await manager.monitorZkProgramAvailability((status) => {
    console.log(`[${new Date().toISOString()}] ZK Program Status:`)
    console.log('- Enabled:', status.enabled)
    console.log('- Message:', status.message)
    
    if (status.enabled) {
      console.log('\n🎉 ZK proofs are now available! Switching to enhanced privacy mode.')
      stopMonitoring()
    }
  })
  
  // Stop monitoring after 2 minutes (for demo purposes)
  setTimeout(() => {
    console.log('\nStopping monitoring...')
    stopMonitoring()
  }, 120000)
}

/**
 * Example 6: Private Work Order
 */
export async function privateWorkOrderExample(connection: Connection) {
  console.log('\n=== Private Work Order Example ===\n')
  
  const manager = new ConfidentialTransferManager(connection)
  const encryptionService = new ClientEncryptionService()
  const recipientKeypair = generateElGamalKeypair()
  
  // Sensitive work order details
  const sensitiveDetails = {
    algorithm: 'proprietary-nlp-v3',
    dataset: 's3://private-bucket/training-data',
    hyperparameters: {
      learningRate: 0.001,
      batchSize: 32,
      epochs: 100
    }
  }
  
  // Encrypt sensitive details
  const encryptedData = await encryptionService.encryptData(
    new TextEncoder().encode(JSON.stringify(sensitiveDetails)),
    recipientKeypair.publicKey
  )
  
  // Create private work order
  const workOrder = await manager.createPrivateWorkOrder({
    title: 'AI Model Training',
    encryptedDetails: encryptedData,
    publicMetadata: {
      category: 'machine-learning',
      estimatedCost: '250 SOL',
      deadline: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString()
    },
    recipientPubkey: recipientKeypair.publicKey
  })
  
  console.log('Private work order created:')
  console.log('- Work order hash:', Buffer.from(workOrder.workOrderHash).toString('hex'))
  console.log('- Metadata stored at:', workOrder.metadata.storageLocation)
  console.log('- Warnings:', workOrder.warnings)
}

/**
 * Example 7: Migration Preparedness
 */
export async function migrationPreparednessExample() {
  console.log('\n=== Migration Preparedness Example ===\n')
  
  const flags = getFeatureFlags()
  
  // Current configuration
  console.log('Current Privacy Configuration:')
  console.log(JSON.stringify(flags.getAllFlags(), null, 2))
  
  // Simulate ZK proofs becoming available
  console.log('\nSimulating ZK proofs re-enablement...')
  
  // Update flags (in production, this would be automatic)
  flags.setFlag('USE_ZK_PROOFS', true)
  flags.setFlag('USE_CLIENT_ENCRYPTION', false)
  
  console.log('\nUpdated configuration:')
  console.log(JSON.stringify(flags.getAllFlags(), null, 2))
  
  // Check privacy status after update
  const privacyStatus = flags.getPrivacyStatus()
  console.log('\nNew privacy status:')
  console.log('- Mode:', privacyStatus.mode)
  console.log('- Message:', privacyStatus.message)
}

/**
 * Main function to run all examples
 */
export async function runPrivacyExamples(connection: Connection) {
  try {
    // Check current status
    await checkPrivacyStatus(connection)
    
    // Run examples that don't require connection
    await clientSideEncryptionExample()
    await privateMetadataExample()
    await migrationPreparednessExample()
    
    // Run examples that need connection
    await dualModeTransferExample(connection)
    
    // Note: Don't run monitoring in automated examples
    console.log('\n📝 To test ZK program monitoring, run:')
    console.log('   await monitorZkProgramExample(connection)')
    
  } catch (error) {
    console.error('Error running privacy examples:', error)
  }
}

// Export for use in other examples
export {
  ClientEncryptionService,
  PrivateMetadataStorage,
  ConfidentialTransferManager,
  generateElGamalKeypair
}