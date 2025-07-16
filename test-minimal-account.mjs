#!/usr/bin/env node

/**
 * Minimal Account Test - Test with minimal agent account size to avoid compute/space issues
 */

import { 
  createSolanaRpc, 
  generateKeyPairSigner,
  createKeyPairSignerFromBytes,
  address,
  createTransactionMessage,
  pipe,
  setTransactionMessageFeePayerSigner,
  setTransactionMessageLifetimeUsingBlockhash,
  appendTransactionMessageInstruction,
  signTransactionMessageWithSigners,
  sendAndConfirmTransactionFactory,
  getSignatureFromTransaction
} from '@solana/kit'

import fs from 'fs'
import os from 'os'
import path from 'path'

// Import the specific instruction we want to test
import { getRegisterAgentInstructionAsync } from './packages/sdk-typescript/dist/index.js'

const PROGRAM_ID = 'FVknDdFF634i2gLyVaXrgaM1eYpb7LNPdV14Y3Egb73E'
const RPC_URL = 'https://api.devnet.solana.com'

console.log('🧪 Minimal Account Test - Avoiding Compute/Space Issues')
console.log(`📋 Program ID: ${PROGRAM_ID}`)

async function loadDefaultWallet() {
  const defaultKeypairPath = path.join(os.homedir(), '.config', 'solana', 'id.json')
  try {
    const keypairData = JSON.parse(fs.readFileSync(defaultKeypairPath, 'utf8'))
    return await createKeyPairSignerFromBytes(new Uint8Array(keypairData))
  } catch (error) {
    console.log(`❌ Could not load wallet: ${error.message}`)
    return null
  }
}

async function calculateAccountSizes() {
  console.log('\n📊 Analyzing account size requirements...')
  
  // Constants from program
  const MAX_NAME_LENGTH = 64
  const MAX_GENERAL_STRING_LENGTH = 256
  const MAX_CAPABILITIES_COUNT = 20
  
  // Calculate Agent size components
  const agentSize = {
    discriminator: 8,
    owner: 32,
    name: 4 + MAX_NAME_LENGTH, // 68
    description: 4 + MAX_GENERAL_STRING_LENGTH, // 260
    capabilities: 4 + (4 + MAX_GENERAL_STRING_LENGTH) * MAX_CAPABILITIES_COUNT, // 5204 !!! HUGE
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
  
  const totalAgentSize = Object.values(agentSize).reduce((sum, size) => sum + size, 0)
  console.log(`   📏 Agent account size: ${totalAgentSize} bytes`)
  console.log(`   ⚠️  Problem: capabilities = ${agentSize.capabilities} bytes (${MAX_CAPABILITIES_COUNT} * 260 bytes each)`)
  
  // Calculate UserRegistry size  
  const userRegistrySize = 8 + 32 + 2 + 2 + 2 + 2 + 8 + 8 + 8 + 1 + 8 + 8 + 8 + 8 + 8 + 8 + 8 + 8 + 1 // = 128 bytes
  console.log(`   📏 UserRegistry size: ${userRegistrySize} bytes`)
  
  console.log(`\n💡 SOLUTION: The Agent account is TOO LARGE (~${Math.round(totalAgentSize/1000)}KB)`)
  console.log(`   🎯 This explains error 2006 - insufficient compute units for large account initialization`)
  console.log(`   🔧 Need to optimize the Agent struct or increase compute budget significantly`)
  
  return { agentSize: totalAgentSize, userRegistrySize }
}

async function testWithComputeBudget() {
  console.log('\n🚀 Testing with large compute budget...')
  
  const rpc = createSolanaRpc(RPC_URL)
  const payer = await loadDefaultWallet()
  
  if (!payer) return false
  
  const agentOwner = await generateKeyPairSigner()
  console.log(`   🤖 Agent Owner: ${agentOwner.address.slice(0, 8)}...`)
  
  // Ultra-minimal agent data
  const agentData = {
    agentType: 1,
    metadataUri: 'x.json',
    agentId: 'x'
  }
  
  try {
    // Build instruction
    const instruction = await getRegisterAgentInstructionAsync({
      agentAccount: undefined,
      userRegistry: undefined,
      signer: agentOwner,
      systemProgram: address('11111111111111111111111111111111'),
      clock: address('SysvarC1ock11111111111111111111111111111111'),
      ...agentData
    })
    
    console.log('   ✅ Instruction built')
    
    // Create LARGE compute budget instruction - request maximum CUs
    const computeBudgetInstruction = {
      programAddress: address('ComputeBudget111111111111111111111111111111'),
      accounts: [],
      data: new Uint8Array([0, 0, 0x20, 0x6F, 0x09, 0x00]) // 1,000,000 CU (maximum)
    }
    
    console.log('   ⚡ Added 1,000,000 CU budget (maximum)')
    
    // Build transaction
    const { value: latestBlockhash } = await rpc.getLatestBlockhash().send()
    
    const transactionMessage = pipe(
      createTransactionMessage({ version: 0 }),
      tx => setTransactionMessageFeePayerSigner(payer, tx),
      tx => setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, tx),
      tx => appendTransactionMessageInstruction(computeBudgetInstruction, tx),
      tx => appendTransactionMessageInstruction(instruction, tx)
    )
    
    // Sign with both signers
    const signedTransaction = await signTransactionMessageWithSigners(transactionMessage)
    
    console.log('   🔍 Simulating with max compute budget...')
    try {
      const simulation = await rpc.simulateTransaction(signedTransaction, {
        commitment: 'processed',
        sigVerify: false
      }).send()
      
      if (simulation.value.err) {
        console.log(`   ❌ Still fails: ${JSON.stringify(simulation.value.err)}`)
        if (simulation.value.logs) {
          console.log('   📋 Logs:')
          simulation.value.logs.forEach(log => console.log(`      ${log}`))
        }
        return false
      } else {
        console.log(`   ✅ Simulation successful!`)
        console.log(`   ⚡ Used: ${simulation.value.unitsConsumed} CU`)
        
        // Try real execution
        console.log('   📡 Executing real transaction...')
        const sendAndConfirmTransaction = sendAndConfirmTransactionFactory({ rpc, rpcSubscriptions: null })
        
        await sendAndConfirmTransaction(signedTransaction, {
          commitment: 'confirmed',
          skipPreflight: false
        })
        
        const signature = getSignatureFromTransaction(signedTransaction)
        console.log(`   🎉 SUCCESS! Signature: ${signature}`)
        console.log(`   🌐 Explorer: https://explorer.solana.com/tx/${signature}?cluster=devnet`)
        
        return true
      }
      
    } catch (simError) {
      console.log(`   ❌ Simulation error: ${simError.message}`)
      return false
    }
    
  } catch (error) {
    console.log(`   ❌ Test failed: ${error.message}`)
    return false
  }
}

async function main() {
  // First analyze the account size issue
  await calculateAccountSizes()
  
  // Then test with maximum compute budget
  const success = await testWithComputeBudget()
  
  if (success) {
    console.log('\n🎉 SUCCESS: Error 2006 resolved with proper compute budget!')
    console.log('✅ registerAgent works with sufficient compute units')
    console.log('🚀 Ready to scale methodology to all 68 instructions')
  } else {
    console.log('\n❌ Error 2006 persists - need further investigation')
    console.log('🔧 May need to optimize Agent struct size or investigate other issues')
  }
  
  process.exit(success ? 0 : 1)
}

main().catch(error => {
  console.error('💥 ERROR:', error)
  process.exit(1)
})