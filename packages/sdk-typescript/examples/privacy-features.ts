/**
 * Privacy Features Example
 * 
 * This example demonstrates how to use the privacy features in GhostSpeak SDK
 * using client-side encryption and x402 verification.
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

  // Check feature flags
  const flags = getFeatureFlags()
  console.log('\nFeature Flags:')
  console.log('- Confidential Transfers:', flags.isEnabled('CONFIDENTIAL_TRANSFERS_ENABLED'))
  console.log('- Use Client Encryption:', flags.isEnabled('USE_CLIENT_ENCRYPTION'))
  console.log('- IPFS Storage:', flags.isEnabled('ENABLE_IPFS_STORAGE'))
}

/**
 * Example 2: Client-Side Encryption
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
 * Example 4: Confidential Transfer
 */
export async function confidentialTransferExample(connection: Connection) {
  console.log('\n=== Confidential Transfer Example ===\n')

  const manager = new ConfidentialTransferManager(connection)

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

  // Create transfer instructions
  const result = await manager.createTransferInstructions(transferParams)

  console.log('Transfer created:')
  console.log('- Instructions:', result.instructions.length)
  console.log('- Warnings:', result.warnings)

  if (result.metadata) {
    console.log('- Private metadata stored:', result.metadata.storageLocation)
  }
}

/**
 * Example 5: Private Work Order
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
 * Main function to run all examples
 */
export async function runPrivacyExamples(connection: Connection) {
  try {
    // Check current status
    await checkPrivacyStatus(connection)

    // Run examples that don't require connection
    await clientSideEncryptionExample()
    await privateMetadataExample()

    // Run examples that need connection
    await confidentialTransferExample(connection)
    await privateWorkOrderExample(connection)

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