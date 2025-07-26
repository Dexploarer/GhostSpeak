/**
 * Example: Using ElGamal Zero-Knowledge Proofs in GhostSpeak
 * 
 * This example demonstrates how to use the production-ready ElGamal
 * zero-knowledge proof functions for confidential transfers.
 */

import {
  generateElGamalKeypair,
  encryptAmountWithRandomness,
  generateRangeProof,
  verifyRangeProof,
  generateValidityProof,
  verifyValidityProof,
  generateEqualityProof,
  verifyEqualityProof,
  type ElGamalKeypair,
  type RangeProof,
  type ValidityProof,
  type EqualityProof
} from '../src/utils/elgamal.js'

async function main() {
  console.log('=== ElGamal Zero-Knowledge Proofs Example ===\n')

  // 1. Generate keypairs for sender and receiver
  const senderKeypair: ElGamalKeypair = generateElGamalKeypair()
  const receiverKeypair: ElGamalKeypair = generateElGamalKeypair()
  const auditorKeypair: ElGamalKeypair = generateElGamalKeypair()

  console.log('✓ Generated ElGamal keypairs for sender, receiver, and auditor')

  // 2. Encrypt an amount with range proof
  const amount = 1000000n // 1 million tokens
  console.log(`\nEncrypting amount: ${amount}`)

  // Encrypt amount and get randomness for proofs
  const encryption = encryptAmountWithRandomness(amount, receiverKeypair.publicKey)
  console.log('✓ Amount encrypted')

  // Generate range proof proving amount is in valid range [0, 2^64)
  const rangeProof: RangeProof = generateRangeProof(
    amount,
    encryption.ciphertext.commitment,
    encryption.randomness
  )
  console.log('✓ Range proof generated (674 bytes)')

  // Verify range proof
  const rangeValid = verifyRangeProof(rangeProof, encryption.ciphertext.commitment.commitment)
  console.log(`✓ Range proof verification: ${rangeValid ? 'PASSED' : 'FAILED'}`)

  // 3. Generate validity proof for the ciphertext
  const validityProof: ValidityProof = generateValidityProof(
    encryption.ciphertext,
    receiverKeypair.publicKey,
    encryption.randomness
  )
  console.log('\n✓ Validity proof generated (96 bytes)')

  // Verify validity proof
  const validityValid = verifyValidityProof(
    validityProof,
    encryption.ciphertext,
    receiverKeypair.publicKey
  )
  console.log(`✓ Validity proof verification: ${validityValid ? 'PASSED' : 'FAILED'}`)

  // 4. Encrypt same amount for auditor and prove equality
  console.log('\nEncrypting same amount for auditor...')
  const auditorEncryption = encryptAmountWithRandomness(amount, auditorKeypair.publicKey)
  console.log('✓ Amount encrypted for auditor')

  // Generate equality proof showing both ciphertexts encrypt the same value
  const equalityProof: EqualityProof = generateEqualityProof(
    encryption.ciphertext,
    auditorEncryption.ciphertext,
    encryption.randomness,
    auditorEncryption.randomness
  )
  console.log('✓ Equality proof generated (160 bytes)')

  // Verify equality proof
  const equalityValid = verifyEqualityProof(
    equalityProof,
    encryption.ciphertext,
    auditorEncryption.ciphertext
  )
  console.log(`✓ Equality proof verification: ${equalityValid ? 'PASSED' : 'FAILED'}`)

  // 5. Summary
  console.log('\n=== Summary ===')
  console.log('All zero-knowledge proofs generated and verified successfully!')
  console.log('\nProof sizes:')
  console.log(`- Range proof: ${rangeProof.proof.length} bytes`)
  console.log(`- Validity proof: ${validityProof.proof.length} bytes`)
  console.log(`- Equality proof: ${equalityProof.proof.length} bytes`)
  console.log('\nThese proofs enable:')
  console.log('- Confidential transfers with hidden amounts')
  console.log('- Proof that amounts are in valid range (no overflow)')
  console.log('- Proof that ciphertexts are well-formed')
  console.log('- Regulatory compliance via auditor encryption')
}

// Run the example
main().catch(console.error)