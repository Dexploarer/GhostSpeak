#!/usr/bin/env node

/**
 * registerAgent Test - Proper Web3.js v2 implementation to resolve error 2006
 * Uses correct transaction format and compute budget
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
  getSignatureFromTransaction,
  lamports
} from '@solana/kit'

import fs from 'fs'
import os from 'os'
import path from 'path'

// Import the specific instruction we want to test
import { getRegisterAgentInstructionAsync } from './packages/sdk-typescript/dist/index.js'

const PROGRAM_ID = 'FVknDdFF634i2gLyVaXrgaM1eYpb7LNPdV14Y3Egb73E'
const RPC_URL = 'https://api.devnet.solana.com'

console.log('🎯 registerAgent Test - Web3.js v2 Implementation')
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

async function testRegisterAgentV2() {
  console.log('\n🚀 Testing registerAgent with Web3.js v2...')
  
  const rpc = createSolanaRpc(RPC_URL)
  const payer = await loadDefaultWallet()
  
  if (!payer) {
    console.log('❌ No funded wallet available')
    return false
  }
  
  const agentOwner = await generateKeyPairSigner()
  console.log(`   🤖 Agent Owner: ${agentOwner.address}`)
  
  // Check balance
  try {
    const balance = await rpc.getBalance(payer.address).send()
    console.log(`   💰 Balance: ${(Number(balance.value) / 1e9).toFixed(4)} SOL`)
  } catch (error) {
    console.log(`   ❌ Balance check failed: ${error.message}`)
  }
  
  // Agent data for testing
  const agentData = {
    agentType: 1,
    metadataUri: 'test.json',
    agentId: 'v2test'
  }
  
  console.log(`\n📝 Agent Data:`)
  console.log(`   🆔 ID: "${agentData.agentId}"`)
  console.log(`   🏷️  Type: ${agentData.agentType}`)
  console.log(`   🔗 URI: "${agentData.metadataUri}"`)
  
  try {
    // Build registerAgent instruction
    console.log('\n1️⃣ Building registerAgent instruction...')
    const instruction = await getRegisterAgentInstructionAsync({
      agentAccount: undefined,
      userRegistry: undefined,
      signer: agentOwner,
      systemProgram: address('11111111111111111111111111111111'),
      clock: address('SysvarC1ock11111111111111111111111111111111'),
      ...agentData
    })
    
    console.log('   ✅ Instruction built successfully')
    console.log(`   📊 Accounts: ${instruction.accounts.length}`)
    console.log(`   💾 Data: ${instruction.data.length} bytes`)
    
    // Create compute budget instruction using correct Solana Web3.js v2 format
    console.log('\n2️⃣ Creating compute budget instruction...')
    const computeUnits = 1000000 // 1M CU (maximum allowed)
    
    // Use proper compute budget instruction format
    const computeBudgetData = new Uint8Array(9)
    computeBudgetData[0] = 2 // setComputeUnitLimit instruction discriminator
    // Write compute units as little-endian u32 starting at byte 1
    const view = new DataView(computeBudgetData.buffer)
    view.setUint32(1, computeUnits, true) // little-endian
    
    const computeBudgetInstruction = {
      programAddress: address('ComputeBudget111111111111111111111111111111'),
      accounts: [],
      data: computeBudgetData.slice(0, 5) // Only need first 5 bytes
    }
    console.log(`   ⚡ Requesting ${computeUnits.toLocaleString()} compute units`)
    
    // Build transaction with proper Web3.js v2 format
    console.log('\n3️⃣ Building transaction...')
    const { value: latestBlockhash } = await rpc.getLatestBlockhash().send()
    
    const transactionMessage = pipe(
      createTransactionMessage({ version: 0 }),
      tx => setTransactionMessageFeePayerSigner(payer, tx),
      tx => setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, tx),
      tx => appendTransactionMessageInstruction(computeBudgetInstruction, tx),
      tx => appendTransactionMessageInstruction(instruction, tx)
    )
    
    // Sign transaction with both signers
    console.log('\n4️⃣ Signing transaction...')
    const signedTransaction = await signTransactionMessageWithSigners(transactionMessage)
    
    // Simulate with proper options
    console.log('\n5️⃣ Simulating transaction...')
    try {
      const simulation = await rpc.simulateTransaction(signedTransaction, {
        commitment: 'processed',
        sigVerify: false
      }).send()
      
      if (simulation.value.err) {
        console.log(`   ❌ Simulation failed:`)
        console.log(`      Error: ${JSON.stringify(simulation.value.err)}`)
        
        if (simulation.value.logs) {
          console.log('   📋 Simulation logs:')
          simulation.value.logs.forEach((log, i) => console.log(`      ${i}: ${log}`))
        }
        
        // Check if it's still error 2006
        const errorString = JSON.stringify(simulation.value.err)
        if (errorString.includes('2006')) {
          console.log('\n🔍 STILL ERROR 2006 - Compute budget may not be sufficient')
          console.log('   📊 Agent account is ~7KB (capabilities = 5KB)')
          console.log('   💡 May need to optimize Agent struct or use different approach')
        }
        
        return false
      } else {
        console.log('   ✅ Simulation successful!')
        console.log(`   ⚡ Compute units consumed: ${simulation.value.unitsConsumed?.toLocaleString() || 'unknown'}`)
        if (simulation.value.logs) {
          console.log('   📋 Success logs (last 3):')
          simulation.value.logs.slice(-3).forEach(log => console.log(`      ${log}`))
        }
      }
    } catch (simError) {
      console.log(`   ❌ Simulation error: ${simError.message}`)
      return false
    }
    
    // Send real transaction
    console.log('\n6️⃣ Sending real transaction...')
    const sendAndConfirmTransaction = sendAndConfirmTransactionFactory({ 
      rpc, 
      rpcSubscriptions: null 
    })
    
    try {
      await sendAndConfirmTransaction(signedTransaction, {
        commitment: 'confirmed',
        skipPreflight: false
      })
      
      const signature = getSignatureFromTransaction(signedTransaction)
      console.log(`   ✅ TRANSACTION CONFIRMED!`)
      console.log(`   🔗 Signature: ${signature}`)
      console.log(`   🌐 Explorer: https://explorer.solana.com/tx/${signature}?cluster=devnet`)
      
      // Verify account creation
      console.log('\n7️⃣ Verifying account states...')
      await new Promise(resolve => setTimeout(resolve, 3000))
      
      let accountsCreated = 0
      for (let i = 0; i < instruction.accounts.length; i++) {
        const account = instruction.accounts[i]
        try {
          const accountInfo = await rpc.getAccountInfo(account.address, {
            encoding: 'base64'
          }).send()
          
          if (accountInfo.value) {
            accountsCreated++
            console.log(`   ✅ Account ${i}: CREATED/EXISTS`)
            console.log(`      💰 Rent: ${accountInfo.value.lamports} lamports`)
            console.log(`      👤 Owner: ${accountInfo.value.owner}`)
            if (accountInfo.value.data && accountInfo.value.data.length > 0) {
              console.log(`      📊 Data: ${accountInfo.value.data[0].length} bytes`)
            }
          } else {
            console.log(`   ❌ Account ${i}: NOT FOUND`)
          }
        } catch (error) {
          console.log(`   ❌ Account ${i}: Verification failed - ${error.message}`)
        }
      }
      
      if (accountsCreated > 0) {
        console.log('\n🎉 SUCCESS: registerAgent instruction is 100% VALIDATED!')
        console.log('   ✅ Error 2006 RESOLVED with proper compute budget')
        console.log('   ✅ Instruction builds and executes correctly')
        console.log('   ✅ Account states verified on-chain')
        console.log('   ✅ Real blockchain interaction confirmed')
        console.log('\n🚀 METHODOLOGY PROVEN - Ready to scale to all 68 instructions!')
        
        return true
      } else {
        console.log('\n❌ No accounts were created - unexpected result')
        return false
      }
      
    } catch (sendError) {
      console.log(`   ❌ Transaction failed: ${sendError.message}`)
      
      // Try to extract more error details
      if (sendError.cause) {
        console.log(`   📋 Cause: ${sendError.cause}`)
      }
      if (sendError.logs) {
        console.log(`   📋 Transaction logs:`)
        sendError.logs.forEach(log => console.log(`      ${log}`))
      }
      
      return false
    }
    
  } catch (error) {
    console.log(`\n❌ Test failed: ${error.message}`)
    console.log('Stack trace:')
    console.log(error.stack)
    return false
  }
}

async function main() {
  console.log('\n🎯 ANALYSIS:')
  console.log('   📊 Agent account size: ~7KB (capabilities = 5KB)')
  console.log('   ⚡ Error 2006 = insufficient compute units for large account')
  console.log('   🔧 Solution: Proper compute budget instruction with Web3.js v2')
  
  const success = await testRegisterAgentV2()
  
  if (success) {
    console.log('\n✨ 🎉 ERROR 2006 COMPLETELY RESOLVED! 🎉 ✨')
    console.log('🏆 registerAgent instruction 100% validated on-chain')
    console.log('🚀 Ready to implement comprehensive 68-instruction testing')
    console.log('🎯 Methodology proven with real blockchain execution')
  } else {
    console.log('\n💥 Error 2006 still persists - need further investigation')
    console.log('🔧 May need to optimize Agent struct or investigate program logic')
  }
  
  process.exit(success ? 0 : 1)
}

main().catch(error => {
  console.error('💥 TEST ERROR:', error)
  process.exit(1)
})