import { generateElGamalKeypair, encryptAmountWithRandomness, generateRangeProof, verifyRangeProof } from './src/utils/elgamal'

// Test simple bulletproof verification
async function testBulletproofVerification() {
  console.log('Testing bulletproof verification...')
  
  const keypair = generateElGamalKeypair()
  const amount = 1000n
  
  // Encrypt amount
  const result = encryptAmountWithRandomness(amount, keypair.publicKey)
  console.log('Encrypted amount:', amount)
  console.log('Commitment:', result.ciphertext.commitment.commitment)
  
  // Generate range proof
  const rangeProof = generateRangeProof(
    amount,
    result.ciphertext.commitment,
    result.randomness
  )
  console.log('Generated range proof, size:', rangeProof.proof.length)
  console.log('Proof commitment:', rangeProof.commitment)
  
  // Verify range proof
  const isValid = verifyRangeProof(rangeProof, result.ciphertext.commitment.commitment)
  console.log('Verification result:', isValid)
  
  // Test with larger amount that uses full bulletproof
  const largeAmount = 100000n
  const result2 = encryptAmountWithRandomness(largeAmount, keypair.publicKey)
  console.log('\nTesting with large amount:', largeAmount)
  
  const rangeProof2 = generateRangeProof(
    largeAmount,
    result2.ciphertext.commitment,
    result2.randomness
  )
  console.log('Generated range proof, size:', rangeProof2.proof.length)
  
  const isValid2 = verifyRangeProof(rangeProof2, result2.ciphertext.commitment.commitment)
  console.log('Verification result:', isValid2)
}

testBulletproofVerification().catch(console.error)