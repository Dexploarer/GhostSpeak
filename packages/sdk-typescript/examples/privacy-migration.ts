/**
 * Privacy Migration Example
 * 
 * This example demonstrates how to prepare for and handle the migration
 * from client-side encryption to ZK proofs when they become available.
 */

import type { Connection } from '@solana/web3.js'
import { generateKeyPairSigner } from '@solana/signers'
import type { Address } from '@solana/kit'

import {
  ConfidentialTransferManager,
  ProofMode,
  getFeatureFlags,
  prepareForZkMigration,
  type ElGamalKeypair,
  type EncryptedData,
  type ZkMigrationData
} from '../src/index.js'

/**
 * Example 1: Store Migration-Ready Data
 */
export async function storeMigrationReadyData() {
  console.log('=== Storing Migration-Ready Data ===\n')
  
  // Import necessary utilities
  const { ClientEncryptionService, generateElGamalKeypair } = await import('../src/index.js')
  
  const encryptionService = new ClientEncryptionService()
  const recipientKeypair = generateElGamalKeypair()
  
  // Amount to encrypt
  const amount = 1_000_000_000n
  const randomness = new Uint8Array(32)
  crypto.getRandomValues(randomness)
  
  // Encrypt with migration metadata
  const encrypted = await encryptionService.encryptAmountForRecipient(
    amount,
    recipientKeypair.publicKey
  )
  
  // Prepare for future migration
  const migrationData = prepareForZkMigration(
    encrypted,
    amount,
    randomness
  )
  
  console.log('Migration-ready data prepared:')
  console.log('- Current encryption mode: client-side')
  console.log('- Migration version:', migrationData.migrationVersion)
  console.log('- Has ZK metadata:', !!migrationData.zkMetadata.amount)
  
  // Store this data for future migration
  return migrationData
}

/**
 * Example 2: Automatic Mode Detection
 */
export async function automaticModeDetection(connection: Connection) {
  console.log('\n=== Automatic Mode Detection ===\n')
  
  const manager = new ConfidentialTransferManager(
    connection,
    ProofMode.AUTO_DETECT // Automatically choose best mode
  )
  
  // Check what mode will be used
  const status = await manager.getPrivacyStatus()
  console.log('Auto-detected mode:', status.mode)
  console.log('Reason:', status.message)
  
  // The SDK will automatically use:
  // - ZK proofs when available
  // - Client encryption as fallback
  // - No encryption if privacy features disabled
  
  return manager
}

/**
 * Example 3: Gradual Migration Strategy
 */
export async function gradualMigrationStrategy() {
  console.log('\n=== Gradual Migration Strategy ===\n')
  
  const flags = getFeatureFlags()
  
  // Phase 1: Client encryption only
  console.log('Phase 1: Client Encryption Only')
  flags.setFlag('USE_CLIENT_ENCRYPTION', true)
  flags.setFlag('USE_ZK_PROOFS', false)
  console.log('- Privacy mode:', flags.getPrivacyStatus().mode)
  
  // Phase 2: Both enabled (testing phase)
  console.log('\nPhase 2: Dual Mode (Testing)')
  flags.setFlag('USE_CLIENT_ENCRYPTION', true)
  flags.setFlag('USE_ZK_PROOFS', true)
  console.log('- Privacy mode:', flags.getPrivacyStatus().mode)
  console.log('- Allows A/B testing and gradual rollout')
  
  // Phase 3: ZK proofs only
  console.log('\nPhase 3: ZK Proofs Only')
  flags.setFlag('USE_CLIENT_ENCRYPTION', false)
  flags.setFlag('USE_ZK_PROOFS', true)
  console.log('- Privacy mode:', flags.getPrivacyStatus().mode)
  console.log('- Full migration complete')
}

/**
 * Example 4: Handle Different Privacy Modes
 */
export async function handleDifferentModes(connection: Connection) {
  console.log('\n=== Handling Different Privacy Modes ===\n')
  
  const manager = new ConfidentialTransferManager(connection)
  const payer = await generateKeyPairSigner()
  
  // Create deposit params
  const depositParams = {
    account: '11111111111111111111111111111111' as Address,
    mint: '22222222222222222222222222222222' as Address,
    amount: 1_000_000_000n,
    decimals: 9,
    authority: payer,
    proofMode: ProofMode.ZK_PROGRAM_WITH_FALLBACK
  }
  
  try {
    // Create deposit - will use best available method
    const result = await manager.createDepositInstructions(depositParams)
    
    console.log('Deposit created successfully:')
    console.log('- Instructions:', result.instructions.length)
    console.log('- Proof instructions:', result.proofInstructions.length)
    
    // Check what mode was used
    if (result.warnings.length > 0) {
      console.log('\nMode information:')
      result.warnings.forEach(warning => console.log('- ' + warning))
    }
    
    // Handle metadata if using client encryption
    if (result.metadata) {
      console.log('\nClient encryption metadata:')
      console.log('- Storage location:', result.metadata.storageLocation)
      console.log('- On-chain hash:', Buffer.from(result.metadata.onChainHash).toString('hex'))
    }
    
  } catch (error) {
    console.error('Error creating deposit:', error)
  }
}

/**
 * Example 5: Feature Flag Configuration
 */
export async function featureFlagConfiguration() {
  console.log('\n=== Feature Flag Configuration ===\n')
  
  const flags = getFeatureFlags()
  
  // Development configuration
  console.log('Development Configuration:')
  const devFlags = getFeatureFlags('development')
  console.log(JSON.stringify(devFlags.getAllFlags(), null, 2))
  
  // Production configuration
  console.log('\nProduction Configuration:')
  const prodFlags = getFeatureFlags('production')
  console.log(JSON.stringify(prodFlags.getAllFlags(), null, 2))
  
  // Custom configuration for testing
  console.log('\nCustom Test Configuration:')
  flags.setFlag('CONFIDENTIAL_TRANSFERS_ENABLED', true)
  flags.setFlag('USE_ZK_PROOFS', false)
  flags.setFlag('USE_CLIENT_ENCRYPTION', true)
  flags.setFlag('ENABLE_IPFS_STORAGE', true)
  flags.setFlag('PRIVACY_MODE_MONITORING', true)
  
  console.log(JSON.stringify(flags.getAllFlags(), null, 2))
}

/**
 * Example 6: Error Handling Across Modes
 */
export async function errorHandlingAcrossModes(connection: Connection) {
  console.log('\n=== Error Handling Across Modes ===\n')
  
  const manager = new ConfidentialTransferManager(connection)
  
  // Test with different proof modes
  const modes = [
    ProofMode.ZK_PROGRAM_ONLY,
    ProofMode.ZK_PROGRAM_WITH_FALLBACK,
    ProofMode.LOCAL_ONLY,
    ProofMode.AUTO_DETECT
  ]
  
  for (const mode of modes) {
    console.log(`\nTesting mode: ${ProofMode[mode]}`)
    
    try {
      // Create a simple operation
      const status = await manager.getPrivacyStatus()
      console.log('- Status:', status.mode)
      
      // Mode-specific behavior
      switch (mode) {
        case ProofMode.ZK_PROGRAM_ONLY:
          console.log('- Will fail if ZK program unavailable')
          break
        case ProofMode.ZK_PROGRAM_WITH_FALLBACK:
          console.log('- Will fallback to client encryption')
          break
        case ProofMode.LOCAL_ONLY:
          console.log('- Always uses local proof generation')
          break
        case ProofMode.AUTO_DETECT:
          console.log('- Chooses best available option')
          break
      }
    } catch (error) {
      console.error('- Error:', error)
    }
  }
}

/**
 * Example 7: Migration Checklist
 */
export async function migrationChecklist() {
  console.log('\n=== Migration Checklist ===\n')
  
  const checklist = {
    preparation: [
      'Store migration metadata with encrypted data',
      'Use abstracted interfaces (not direct encryption calls)',
      'Test with ProofMode.ZK_PROGRAM_WITH_FALLBACK',
      'Monitor for ZK program availability'
    ],
    testing: [
      'Enable dual mode in staging environment',
      'Compare performance metrics',
      'Verify proof generation works',
      'Test error handling and fallbacks'
    ],
    migration: [
      'Update feature flags progressively',
      'Monitor error rates during transition',
      'Keep client encryption as emergency fallback',
      'Document any issues for users'
    ],
    postMigration: [
      'Disable client encryption if stable',
      'Remove migration metadata',
      'Update documentation',
      'Celebrate enhanced privacy! 🎉'
    ]
  }
  
  console.log('Pre-Migration Checklist:')
  checklist.preparation.forEach(item => console.log('☐', item))
  
  console.log('\nTesting Phase:')
  checklist.testing.forEach(item => console.log('☐', item))
  
  console.log('\nMigration Phase:')
  checklist.migration.forEach(item => console.log('☐', item))
  
  console.log('\nPost-Migration:')
  checklist.postMigration.forEach(item => console.log('☐', item))
}

/**
 * Main function to run all migration examples
 */
export async function runMigrationExamples(connection: Connection) {
  try {
    // Basic examples
    await storeMigrationReadyData()
    await gradualMigrationStrategy()
    await featureFlagConfiguration()
    await migrationChecklist()
    
    // Connection-dependent examples
    await automaticModeDetection(connection)
    await handleDifferentModes(connection)
    await errorHandlingAcrossModes(connection)
    
    console.log('\n✅ Migration examples completed!')
    console.log('\n📚 Key Takeaways:')
    console.log('1. Use ProofMode.ZK_PROGRAM_WITH_FALLBACK for seamless transition')
    console.log('2. Store migration metadata for future ZK proof generation')
    console.log('3. Test thoroughly with dual mode before full migration')
    console.log('4. Keep client encryption as fallback option')
    
  } catch (error) {
    console.error('Error running migration examples:', error)
  }
}

// Export for use in other examples
export {
  storeMigrationReadyData,
  automaticModeDetection,
  gradualMigrationStrategy
}