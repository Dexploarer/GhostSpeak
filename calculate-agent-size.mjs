#!/usr/bin/env node

/**
 * Calculate Agent Account Size after reducing MAX_CAPABILITIES_COUNT
 */

console.log('🧮 Agent Account Size Calculator')

// Constants from program
const MAX_NAME_LENGTH = 64
const MAX_GENERAL_STRING_LENGTH = 256
const MAX_CAPABILITIES_COUNT_OLD = 20
const MAX_CAPABILITIES_COUNT_NEW = 5

console.log('\n📊 Agent Account Size Components:')

const agentSize = {
  discriminator: 8,
  owner: 32,
  name: 4 + MAX_NAME_LENGTH, // 68
  description: 4 + MAX_GENERAL_STRING_LENGTH, // 260
  capabilities_old: 4 + (4 + MAX_GENERAL_STRING_LENGTH) * MAX_CAPABILITIES_COUNT_OLD, // 5204
  capabilities_new: 4 + (4 + MAX_GENERAL_STRING_LENGTH) * MAX_CAPABILITIES_COUNT_NEW, // 1304
  pricing_model: 2,
  reputation_score: 4,
  total_jobs_completed: 4,
  total_earnings: 8,
  is_active: 1,
  created_at: 8,
  updated_at: 8,
  original_price: 8,
  genome_hash: 4 + MAX_GENERAL_STRING_LENGTH, // 260
  is_replicable: 1,
  replication_fee: 8,
  service_endpoint: 4 + MAX_GENERAL_STRING_LENGTH, // 260
  is_verified: 1,
  verification_timestamp: 8,
  metadata_uri: 4 + MAX_GENERAL_STRING_LENGTH, // 260
  framework_origin: 4 + MAX_GENERAL_STRING_LENGTH, // 260
  supported_tokens: 4 + (10 * 32), // 324
  cnft_mint: 1 + 32, // 33
  merkle_tree: 1 + 32, // 33
  supports_a2a: 1,
  transfer_hook: 1 + 32, // 33
  bump: 1
}

// Calculate old size
const oldSize = Object.entries(agentSize)
  .filter(([key]) => key !== 'capabilities_new')
  .map(([key, value]) => key === 'capabilities_old' ? value : value)
  .reduce((sum, size) => sum + size, 0)

// Calculate new size
const newSize = Object.entries(agentSize)
  .filter(([key]) => key !== 'capabilities_old')
  .map(([key, value]) => key === 'capabilities_new' ? value : value)
  .reduce((sum, size) => sum + size, 0)

console.log(`\n📏 BEFORE (MAX_CAPABILITIES_COUNT = 20):`)
console.log(`   Total Agent size: ${oldSize} bytes (${(oldSize/1024).toFixed(2)} KB)`)
console.log(`   Capabilities: ${agentSize.capabilities_old} bytes`)

console.log(`\n📏 AFTER (MAX_CAPABILITIES_COUNT = 5):`)
console.log(`   Total Agent size: ${newSize} bytes (${(newSize/1024).toFixed(2)} KB)`)
console.log(`   Capabilities: ${agentSize.capabilities_new} bytes`)

console.log(`\n💡 REDUCTION:`)
console.log(`   Size reduction: ${oldSize - newSize} bytes (${((oldSize - newSize)/1024).toFixed(2)} KB)`)
console.log(`   Percentage reduction: ${(((oldSize - newSize) / oldSize) * 100).toFixed(1)}%`)

console.log(`\n✅ BENEFITS:`)
if (newSize < 3000) {
  console.log(`   ✅ Agent account now under 3KB`)
  console.log(`   ✅ Should work with default compute budget`)
  console.log(`   ✅ No more error 2006 expected`)
} else {
  console.log(`   ⚠️  Agent account still large (${(newSize/1024).toFixed(2)} KB)`)
  console.log(`   💡 May need further optimization`)
}

console.log(`\n🚀 NEXT STEPS:`)
console.log(`   1. Rebuild and deploy program with reduced capabilities`)
console.log(`   2. Test registerAgent with new program`)
console.log(`   3. Verify error 2006 is resolved`)
console.log(`   4. Scale to all 68 instructions`)