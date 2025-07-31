/**
 * ZK Program Monitoring Example
 * 
 * This example demonstrates how to monitor the ZK ElGamal Proof Program's
 * feature gate and adapt proof generation based on its availability.
 */

import { createSolanaRpc } from '@solana/kit'
import {
  isZkProgramEnabled,
  getZkProgramStatus,
  monitorFeatureGate,
  FEATURE_GATES,
  generateRangeProofWithCommitment,
  ProofMode,
  clearFeatureGateCache,
  clearZkProgramStatusCache
} from '../src/index.js'
import { randomBytes } from '@noble/curves/abstract/utils'

async function main() {
  // Connect to devnet
  const connection = new Connection(clusterApiUrl('devnet'), 'confirmed')
  
  console.log('=== ZK Program Monitoring Example ===\n')
  
  // Check current status
  console.log('Checking ZK program status...')
  const isEnabled = await isZkProgramEnabled(connection)
  const status = await getZkProgramStatus(connection)
  
  console.log(`Enabled: ${isEnabled}`)
  console.log(`Status: ${status}\n`)
  
  // Demonstrate proof generation with different modes
  console.log('Generating proofs with different modes:\n')
  
  const amount = 1000n
  const randomness = randomBytes(32)
  
  // 1. Auto-detect mode
  console.log('1. AUTO_DETECT mode:')
  const autoResult = await generateRangeProofWithCommitment(amount, randomness, {
    mode: ProofMode.AUTO_DETECT,
    connection
  })
  console.log(`   - Proof generated: ${autoResult.proof.length} bytes`)
  console.log(`   - Has instruction: ${!!autoResult.instruction}`)
  console.log(`   - Requires ZK program: ${autoResult.requiresZkProgram}\n`)
  
  // 2. Fallback mode
  console.log('2. ZK_PROGRAM_WITH_FALLBACK mode:')
  const fallbackResult = await generateRangeProofWithCommitment(amount, randomness, {
    mode: ProofMode.ZK_PROGRAM_WITH_FALLBACK,
    connection
  })
  console.log(`   - Proof generated: ${fallbackResult.proof.length} bytes`)
  console.log(`   - Has instruction: ${!!fallbackResult.instruction}`)
  console.log(`   - Requires ZK program: ${fallbackResult.requiresZkProgram}\n`)
  
  // 3. Local only mode
  console.log('3. LOCAL_ONLY mode:')
  const localResult = await generateRangeProofWithCommitment(amount, randomness, {
    mode: ProofMode.LOCAL_ONLY,
    connection
  })
  console.log(`   - Proof generated: ${localResult.proof.length} bytes`)
  console.log(`   - Has instruction: ${!!localResult.instruction}`)
  console.log(`   - Requires ZK program: ${localResult.requiresZkProgram}\n`)
  
  // Monitor feature gate changes
  console.log('Starting feature gate monitoring (press Ctrl+C to stop)...\n')
  
  let checkCount = 0
  const stopMonitoring = monitorFeatureGate(
    connection,
    FEATURE_GATES.ZK_ELGAMAL_PROOF_REENABLED,
    (status) => {
      checkCount++
      console.log(`[Check #${checkCount}] Feature gate status:`)
      console.log(`  - Activated: ${status.activated}`)
      console.log(`  - Last checked: ${new Date(status.lastChecked).toLocaleTimeString()}`)
      if (status.activationSlot) {
        console.log(`  - Activation slot: ${status.activationSlot}`)
      }
      if (status.error) {
        console.log(`  - Error: ${status.error}`)
      }
      console.log('')
    },
    10_000 // Check every 10 seconds for demo
  )
  
  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log('\nStopping monitoring...')
    stopMonitoring()
    
    // Clear caches
    clearFeatureGateCache()
    clearZkProgramStatusCache()
    
    console.log('Monitoring stopped. Caches cleared.')
    process.exit(0)
  })
  
  // Keep process running
  await new Promise(() => {})
}

// Run the example
main().catch(console.error)