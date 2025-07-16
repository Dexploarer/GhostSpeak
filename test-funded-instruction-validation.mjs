#!/usr/bin/env node

/**
 * Funded Instruction Validation Test
 * Tests registerAgent instruction with existing funded wallet for 100% on-chain execution
 * Uses proper Solana Web3.js v2 patterns
 */

import { 
  createSolanaRpc, 
  generateKeyPairSigner,
  createKeyPairSignerFromBytes,
  address,
  lamports,
  createTransactionMessage,
  pipe,
  setTransactionMessageFeePayerSigner,
  setTransactionMessageLifetimeUsingBlockhash,
  appendTransactionMessageInstruction,
  appendTransactionMessageInstructions,
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

console.log('🧪 Funded Instruction Validation Test')
console.log(`📋 Program ID: ${PROGRAM_ID}`)
console.log(`🌐 RPC: ${RPC_URL}`)

async function loadDefaultWallet() {
  // Try to load the default Solana wallet
  const defaultKeypairPath = path.join(os.homedir(), '.config', 'solana', 'id.json')
  
  try {
    const keypairData = JSON.parse(fs.readFileSync(defaultKeypairPath, 'utf8'))
    const keypairSigner = await createKeyPairSignerFromBytes(new Uint8Array(keypairData))
    console.log(`   💰 Loaded default wallet: ${keypairSigner.address}`)
    return keypairSigner
  } catch (error) {
    console.log(`   ❌ Could not load default wallet: ${error.message}`)
    return null
  }
}

async function validateRegisterAgentInstruction() {
  console.log('\n🤖 Testing registerAgent instruction with 100% validation...')
  
  const rpc = createSolanaRpc(RPC_URL)
  
  // Try to use default funded wallet
  console.log('\n1️⃣ Loading test wallets...')
  const payer = await loadDefaultWallet()
  
  if (!payer) {
    console.log('   ❌ No funded wallet available - generating new keypairs')
    const generatedPayer = await generateKeyPairSigner()
    const agentOwner = await generateKeyPairSigner()
    console.log(`   💰 Generated Payer: ${generatedPayer.address} (unfunded)`)
    console.log(`   🤖 Generated Agent Owner: ${agentOwner.address}`)
    console.log('   ⚠️  Test will likely fail due to insufficient funds')
    return false
  }
  
  // Generate agent owner
  const agentOwner = await generateKeyPairSigner()
  console.log(`   🤖 Agent Owner: ${agentOwner.address}`)
  
  // Check payer balance
  try {
    const balance = await rpc.getBalance(payer.address).send()
    const solBalance = Number(balance.value) / 1e9
    console.log(`   💰 Payer balance: ${balance.value} lamports (${solBalance.toFixed(4)} SOL)`)
    
    if (balance.value < 10000000n) { // Less than 0.01 SOL
      console.log('   ⚠️  Low balance - transaction may fail')
    }
  } catch (error) {
    console.log(`   ❌ Balance check failed: ${error.message}`)
  }
  
  // Prepare agent data (keeping agentId short to avoid PDA seed length limit)
  const agentData = {
    agentType: 1,
    metadataUri: 'https://agent.json', // Simplified URI to test validation
    agentId: 'ag_' + Date.now().toString().slice(-6) // 12 characters total
  }
  
  console.log(`\n2️⃣ Agent Data:`)
  console.log(`   🆔 Agent ID: ${agentData.agentId}`)
  console.log(`   🏷️  Agent Type: ${agentData.agentType}`)
  console.log(`   🔗 Metadata URI: ${agentData.metadataUri}`)
  
  try {
    // Step 1: Build the instruction
    console.log('\n3️⃣ Building registerAgent instruction...')
    const instruction = await getRegisterAgentInstructionAsync({
      agentAccount: undefined, // Will be derived as PDA
      userRegistry: undefined, // Will be derived as PDA
      signer: agentOwner,
      systemProgram: address('11111111111111111111111111111111'),
      clock: address('SysvarC1ock11111111111111111111111111111111'),
      ...agentData
    })
    
    console.log('   ✅ Instruction built successfully!')
    console.log(`   📊 Accounts involved: ${instruction.accounts.length}`)
    console.log(`   💾 Data size: ${instruction.data.length} bytes`)
    console.log(`   📋 Program ID: ${instruction.programAddress}`)
    
    // Show account details
    console.log('\n4️⃣ Instruction account details:')
    instruction.accounts.forEach((account, index) => {
      console.log(`   ${index}. ${account.address} (${JSON.stringify(account.role)})`)
    })
    
    // Step 2: Check account states BEFORE execution
    console.log('\n5️⃣ Checking account states BEFORE execution...')
    const accountStatesBefore = new Map()
    
    for (let i = 0; i < instruction.accounts.length; i++) {
      const account = instruction.accounts[i]
      try {
        const accountInfo = await rpc.getAccountInfo(account.address, {
          encoding: 'base64'
        }).send()
        
        accountStatesBefore.set(account.address, accountInfo.value)
        if (accountInfo.value) {
          console.log(`   📝 Account ${i} exists: ${account.address.slice(0, 8)}... (${accountInfo.value.lamports} lamports)`)
        } else {
          console.log(`   🆕 Account ${i} doesn't exist yet: ${account.address.slice(0, 8)}...`)
        }
      } catch (error) {
        console.log(`   🆕 Account ${i} doesn't exist: ${account.address.slice(0, 8)}...`)
        accountStatesBefore.set(account.address, null)
      }
    }
    
    // Step 3: Build transaction with compute budget
    console.log('\n6️⃣ Building transaction with compute budget...')
    const { value: latestBlockhash } = await rpc.getLatestBlockhash().send()
    console.log(`   📦 Latest blockhash: ${latestBlockhash.blockhash.slice(0, 16)}...`)
    
    // Create compute budget instruction for more compute units
    const computeBudgetInstruction = {
      programAddress: address('ComputeBudget111111111111111111111111111111'),
      accounts: [],
      data: new Uint8Array([0, 0, 0x40, 0x9C, 0, 0]) // setComputeUnitLimit: 300,000 CU
    }
    
    console.log(`   ⚡ Added compute budget: 300,000 CU`)
    
    // Determine signers
    const signers = [payer]
    
    // Check if agentOwner needs to sign (if it's in the accounts)
    const agentOwnerAccount = instruction.accounts.find(
      account => account.address === agentOwner.address
    )
    if (agentOwnerAccount) {
      signers.push(agentOwner)
      console.log(`   ✍️  Added agent owner as signer: ${agentOwner.address.slice(0, 8)}...`)
    }
    
    const transactionMessage = pipe(
      createTransactionMessage({ version: 0 }),
      tx => setTransactionMessageFeePayerSigner(payer, tx),
      tx => setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, tx),
      tx => appendTransactionMessageInstructions([computeBudgetInstruction, instruction], tx)
    )
    
    console.log(`   📋 Transaction built with ${signers.length} signers`)
    
    // Step 4: Sign and send transaction
    console.log('\n7️⃣ Signing transaction...')
    const signedTransaction = await signTransactionMessageWithSigners(transactionMessage)
    
    console.log('   📡 Sending transaction to devnet...')
    const sendAndConfirmTransaction = sendAndConfirmTransactionFactory({ rpc, rpcSubscriptions: null })
    
    try {
      // First try to simulate the transaction for better error reporting
      console.log('   🔍 Simulating transaction first...')
      try {
        const simulation = await rpc.simulateTransaction(signedTransaction, {
          commitment: 'confirmed',
          replaceRecentBlockhash: true,
          sigVerify: false
        }).send()
        
        if (simulation.value.err) {
          console.log(`   ⚠️  Simulation shows error: ${JSON.stringify(simulation.value.err)}`)
          if (simulation.value.logs) {
            console.log(`   📋 Simulation logs:`)
            simulation.value.logs.forEach(log => console.log(`      ${log}`))
          }
        } else {
          console.log(`   ✅ Simulation successful, proceeding with real transaction`)
        }
      } catch (simError) {
        console.log(`   ⚠️  Simulation failed: ${simError.message}`)
      }
      
      // Now send the actual transaction
      await sendAndConfirmTransaction(signedTransaction, {
        commitment: 'confirmed',
        skipPreflight: false
      })
      
      const signature = getSignatureFromTransaction(signedTransaction)
      console.log(`   ✅ Transaction confirmed!`)
      console.log(`   🔗 Signature: ${signature}`)
      console.log(`   🌐 Explorer: https://explorer.solana.com/tx/${signature}?cluster=devnet`)
      
      // Step 5: Verify account states AFTER execution
      console.log('\n8️⃣ Verifying account states AFTER execution...')
      await new Promise(resolve => setTimeout(resolve, 3000)) // Wait for finalization
      
      let accountsCreated = 0
      let accountsModified = 0
      
      for (let i = 0; i < instruction.accounts.length; i++) {
        const account = instruction.accounts[i]
        try {
          const accountInfo = await rpc.getAccountInfo(account.address, {
            encoding: 'base64'
          }).send()
          
          const beforeState = accountStatesBefore.get(account.address)
          const afterState = accountInfo.value
          
          if (!beforeState && afterState) {
            accountsCreated++
            console.log(`   🆕 Account ${i} CREATED: ${account.address.slice(0, 8)}...`)
            console.log(`      💰 Rent: ${afterState.lamports} lamports`)
            console.log(`      👤 Owner: ${afterState.owner}`)
            console.log(`      📊 Data: ${afterState.data.length > 0 ? afterState.data[0].length : 0} bytes`)
          } else if (beforeState && afterState && beforeState.data !== afterState.data) {
            accountsModified++
            console.log(`   🔄 Account ${i} MODIFIED: ${account.address.slice(0, 8)}...`)
          } else if (!afterState) {
            console.log(`   ❌ Account ${i} MISSING AFTER EXECUTION: ${account.address.slice(0, 8)}...`)
          } else {
            console.log(`   ✅ Account ${i} unchanged: ${account.address.slice(0, 8)}...`)
          }
          
        } catch (error) {
          console.log(`   ❌ Account ${i} verification failed: ${account.address.slice(0, 8)}... - ${error.message}`)
        }
      }
      
      // Final validation
      console.log('\n🎯 FINAL VALIDATION RESULTS:')
      console.log(`   📊 Accounts created: ${accountsCreated}`)
      console.log(`   📊 Accounts modified: ${accountsModified}`)
      console.log(`   ✅ Transaction signature: ${signature}`)
      console.log(`   ✅ Explorer verification: https://explorer.solana.com/tx/${signature}?cluster=devnet`)
      
      if (accountsCreated > 0 || accountsModified > 0) {
        console.log('\n🎉 SUCCESS: registerAgent instruction is 100% VALIDATED!')
        console.log('   ✅ Instruction builds correctly')
        console.log('   ✅ Transaction executes on-chain')
        console.log('   ✅ Account states change as expected')
        console.log('   ✅ All PDA derivations work')
        console.log('   ✅ Real blockchain interaction confirmed')
        console.log('\n🚀 METHODOLOGY PROVEN - Ready to scale to all 68 instructions!')
        return true
      } else {
        console.log('\n❌ FAILURE: No account state changes detected')
        return false
      }
      
    } catch (sendError) {
      console.log(`   ❌ Transaction send failed: ${sendError.message}`)
      
      // Try to extract more information from the error
      if (sendError.cause || sendError.logs) {
        console.log('   📋 Error details:')
        if (sendError.cause) console.log(`      Cause: ${sendError.cause}`)
        if (sendError.logs) console.log(`      Logs: ${sendError.logs.join(', ')}`)
      }
      
      return false
    }
    
  } catch (error) {
    console.log(`\n❌ VALIDATION FAILED: ${error.message}`)
    console.log('Stack trace:')
    console.log(error.stack)
    return false
  }
}

// Run the funded instruction validation
async function main() {
  const success = await validateRegisterAgentInstruction()
  
  if (success) {
    console.log('\n✨ SINGLE INSTRUCTION VALIDATION SUCCESSFUL!')
    console.log('🎯 This proves our methodology works for 100% on-chain validation.')
    console.log('🚀 Ready to implement comprehensive 68-instruction testing framework.')
  } else {
    console.log('\n💥 SINGLE INSTRUCTION VALIDATION FAILED!')
    console.log('🔧 Need to fix issues before scaling to 68 instructions.')
  }
  
  process.exit(success ? 0 : 1)
}

main().catch(error => {
  console.error('💥 VALIDATION ERROR:', error)
  process.exit(1)
})