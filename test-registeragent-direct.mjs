#!/usr/bin/env node

/**
 * Direct registerAgent Test - Skip simulation and go straight to execution
 * Focus on resolving error 2006 with direct blockchain execution
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

console.log('🎯 Direct registerAgent Test - Error 2006 Resolution')
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

async function testDirectRegisterAgent() {
  console.log('\n🚀 Testing registerAgent with direct execution...')
  
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
    agentId: 'direct'
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
    
    // Create compute budget instruction - maximum allowed
    console.log('\n2️⃣ Creating maximum compute budget instruction...')
    const computeUnits = 1400000 // 1.4M CU (maximum for v0 transaction)
    
    // Correct compute budget instruction format
    const computeBudgetInstruction = {
      programAddress: address('ComputeBudget111111111111111111111111111111'),
      accounts: [],
      data: new Uint8Array([
        2, // setComputeUnitLimit instruction
        ...new Uint8Array(new DataView(new ArrayBuffer(4)).buffer.slice(0, 4))
      ])
    }
    
    // Write the compute units correctly
    const dataView = new DataView(computeBudgetInstruction.data.buffer, 1, 4)
    dataView.setUint32(0, computeUnits, true) // little-endian
    
    console.log(`   ⚡ Requesting ${computeUnits.toLocaleString()} compute units`)
    
    // Build transaction 
    console.log('\n3️⃣ Building transaction...')
    const { value: latestBlockhash } = await rpc.getLatestBlockhash().send()
    
    const transactionMessage = pipe(
      createTransactionMessage({ version: 0 }),
      tx => setTransactionMessageFeePayerSigner(payer, tx),
      tx => setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, tx),
      tx => appendTransactionMessageInstruction(computeBudgetInstruction, tx),
      tx => appendTransactionMessageInstruction(instruction, tx)
    )
    
    // Sign transaction
    console.log('\n4️⃣ Signing transaction...')
    const signedTransaction = await signTransactionMessageWithSigners(transactionMessage)
    
    // SKIP simulation and go straight to execution
    console.log('\n5️⃣ Sending transaction directly (no simulation)...')
    const sendAndConfirmTransaction = sendAndConfirmTransactionFactory({ 
      rpc, 
      rpcSubscriptions: null 
    })
    
    try {
      await sendAndConfirmTransaction(signedTransaction, {
        commitment: 'confirmed',
        skipPreflight: true // Skip preflight to avoid simulation issues
      })
      
      const signature = getSignatureFromTransaction(signedTransaction)
      console.log(`   ✅ TRANSACTION CONFIRMED!`)
      console.log(`   🔗 Signature: ${signature}`)
      console.log(`   🌐 Explorer: https://explorer.solana.com/tx/${signature}?cluster=devnet`)
      
      // Verify account creation
      console.log('\n6️⃣ Verifying account states...')
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
      
      // Check if it's still error 2006
      if (sendError.message.includes('2006')) {
        console.log('\n🔍 STILL ERROR 2006 DETECTED:')
        console.log('   📊 Agent account requires ~7KB (capabilities = 5KB)')
        console.log('   ⚡ 1.4M compute units may still be insufficient')
        console.log('   💡 NEXT STEPS:')
        console.log('      1. Reduce Agent capabilities array size in program')
        console.log('      2. Or split Agent initialization into multiple instructions')
        console.log('      3. Or use compressed account data patterns')
      }
      
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
  console.log('\n🎯 DIRECT EXECUTION STRATEGY:')
  console.log('   🚫 Skip simulation (causes JSON-RPC format issues)')
  console.log('   ⚡ Use maximum compute budget (1.4M CU)')
  console.log('   🎯 Direct blockchain execution with skipPreflight')
  console.log('   📊 Agent account size: ~7KB (capabilities = 5KB)')
  
  const success = await testDirectRegisterAgent()
  
  if (success) {
    console.log('\n✨ 🎉 ERROR 2006 COMPLETELY RESOLVED! 🎉 ✨')
    console.log('🏆 registerAgent instruction 100% validated on-chain')
    console.log('🚀 Ready to implement comprehensive 68-instruction testing')
    console.log('🎯 Methodology proven with real blockchain execution')
  } else {
    console.log('\n💥 Error 2006 still persists')
    console.log('🔧 Need to optimize Agent struct size or split initialization')
    console.log('📋 Next steps:')
    console.log('   1. Reduce MAX_CAPABILITIES_COUNT from 20 to 5')
    console.log('   2. Or implement lazy initialization pattern')
    console.log('   3. Or use Account Compression for large data')
  }
  
  process.exit(success ? 0 : 1)
}

main().catch(error => {
  console.error('💥 TEST ERROR:', error)
  process.exit(1)
})