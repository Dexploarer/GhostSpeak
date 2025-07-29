#!/usr/bin/env bun
/**
 * GhostSpeak Protocol Quick Demo
 * 
 * A simplified demo showcasing core GhostSpeak functionality
 * 
 * Usage:
 * bun run examples/quick-demo.ts
 */

import { generateKeypair, generateElGamalKeypair } from '../src/utils/keypair.js'
import { encryptAmount, decryptAmount } from '../src/utils/elgamal.js'
import { generateBulletproof } from '../src/utils/elgamal-complete.js'
import { createPedersenCommitmentFromAmount } from '../src/utils/elgamal-complete.js'
import { ClientEncryptionService } from '../src/utils/client-encryption.js'
import { getFeatureFlags } from '../src/utils/feature-flags.js'

console.log('🌟 GhostSpeak Protocol Quick Demo 🌟\n')

// 1. Key Generation
console.log('=== 1. KEY GENERATION ===')
const agentKeypair = generateKeypair()
console.log(`✅ Agent keypair generated`)
console.log(`   Public key: ${agentKeypair.publicKey.slice(0, 8)}...`)

const elGamalKeypair = generateElGamalKeypair()
console.log(`✅ ElGamal keypair generated`)
console.log(`   Public key: ${Buffer.from(elGamalKeypair.publicKey).toString('hex').slice(0, 16)}...`)

// 2. Confidential Transfers
console.log('\n=== 2. CONFIDENTIAL TRANSFERS ===')
const amount = 1000n
console.log(`📊 Original amount: ${amount}`)

// Encrypt amount
const ciphertext = encryptAmount(amount, elGamalKeypair.publicKey)
console.log(`🔒 Encrypted ciphertext:`)
console.log(`   Commitment: ${Buffer.from(ciphertext.commitment.commitment).toString('hex').slice(0, 16)}...`)
console.log(`   Handle: ${Buffer.from(ciphertext.handle.handle).toString('hex').slice(0, 16)}...`)

// Decrypt amount
const decrypted = decryptAmount(ciphertext, elGamalKeypair.secretKey, 10000n)
console.log(`🔓 Decrypted amount: ${decrypted}`)
console.log(`✅ Encryption/Decryption successful: ${decrypted === amount}`)

// 3. Privacy Features (Hybrid Mode)
console.log('\n=== 3. PRIVACY FEATURES (HYBRID MODE) ===')

// Check privacy status
const flags = getFeatureFlags()
const privacyStatus = flags.getPrivacyStatus()
console.log(`🔍 Current privacy mode: ${privacyStatus.mode}`)
console.log(`   ${privacyStatus.message}`)

// Client-side encryption (current beta feature)
if (privacyStatus.mode === 'client-encryption') {
  console.log('\n🔐 Using client-side encryption (Beta)')
  const clientEncryption = new ClientEncryptionService()
  const encryptedData = await clientEncryption.encryptAmountForRecipient(
    amount,
    elGamalKeypair.publicKey
  )
  console.log(`   ✅ Amount encrypted client-side`)
  console.log(`   Commitment: ${Buffer.from(encryptedData.commitment).toString('hex').slice(0, 16)}...`)
}

// Zero-Knowledge Proofs (preparing for future)
console.log('\n🎯 Zero-Knowledge Proofs (Ready for migration)')
const commitment = createPedersenCommitmentFromAmount(amount)
console.log(`   📝 Created Pedersen commitment for amount ${amount}`)

const rangeProof = generateBulletproof(
  amount,
  { commitment: commitment.commitment },
  commitment.randomness
)
console.log(`   ✅ Generated bulletproof range proof`)
console.log(`   Proof size: ${rangeProof.proof.length} bytes`)
console.log(`   Note: ZK proofs will be verified on-chain when re-enabled`)

// 4. Agent Capabilities
console.log('\n=== 4. AGENT CAPABILITIES ===')
const agentCategories = {
  1: 'Data Processing',
  2: 'Code Generation',
  3: 'Content Creation',
  4: 'Analysis & Research',
  5: 'Trading & DeFi'
}

console.log('📋 Available agent service categories:')
for (const [id, name] of Object.entries(agentCategories)) {
  console.log(`   ${id}. ${name}`)
}

// 5. Escrow Workflow
console.log('\n=== 5. ESCROW WORKFLOW ===')
console.log('📄 Typical escrow flow:')
console.log('   1. Consumer creates escrow with payment')
console.log('   2. Provider completes work')
console.log('   3. Provider submits work order with proof')
console.log('   4. Consumer verifies work')
console.log('   5. Payment automatically released to provider')
console.log('   6. Reputation scores updated')

// 6. Protocol Features
console.log('\n=== 6. PROTOCOL FEATURES ===')
console.log('✨ GhostSpeak Protocol provides:')
console.log('   • Autonomous AI agent registration')
console.log('   • Secure escrow for agent transactions')
console.log('   • Privacy-preserving payments (Hybrid: Client + ZK ready)')
console.log('   • Beta: Client-side encryption for immediate privacy')
console.log('   • Future: Zero-knowledge proof verification on-chain')
console.log('   • Reputation tracking and staking')
console.log('   • Decentralized agent marketplace')
console.log('   • Inter-agent communication channels')
console.log('   • Governance and voting mechanisms')

console.log('\n✅ Demo complete!')
console.log('🚀 Ready to build the future of AI agent commerce on Solana!')
console.log('\nFor full integration, check out examples/demo.ts')