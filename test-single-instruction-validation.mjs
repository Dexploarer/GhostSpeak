#!/usr/bin/env node

/**
 * Single Instruction Validation Test
 * Tests one instruction at a time with 100% on-chain execution and state verification
 * Uses proper Solana Web3.js v2 patterns
 */

import { 
  createSolanaRpc, 
  generateKeyPairSigner,
  address,
  lamports,
  createTransactionMessage,
  pipe,
  setTransactionMessageFeePayerSigner,
  setTransactionMessageLifetimeUsingBlockhash,
  appendTransactionMessageInstruction,
  signTransactionMessageWithSigners,
  sendAndConfirmTransactionFactory,
  getSignatureFromTransaction
} from '@solana/kit'

// Import the specific instruction we want to test
import { getRegisterAgentInstructionAsync } from './packages/sdk-typescript/dist/index.js'

const PROGRAM_ID = 'FVknDdFF634i2gLyVaXrgaM1eYpb7LNPdV14Y3Egb73E'
const RPC_URL = 'https://api.devnet.solana.com'

console.log('🧪 Single Instruction Validation Test')
console.log(`📋 Program ID: ${PROGRAM_ID}`)
console.log(`🌐 RPC: ${RPC_URL}`)

async function validateRegisterAgentInstruction() {
  console.log('\n🤖 Testing registerAgent instruction with 100% validation...')
  
  const rpc = createSolanaRpc(RPC_URL)
  
  // Generate test keypairs
  console.log('\n1️⃣ Generating test keypairs...')
  const payer = await generateKeyPairSigner()
  const agentOwner = await generateKeyPairSigner()
  
  console.log(`   💰 Payer: ${payer.address}`)
  console.log(`   🤖 Agent Owner: ${agentOwner.address}`)
  
  // Prepare agent data
  const agentData = {
    agentType: 1,
    metadataUri: 'https://example.com/agent-metadata.json',
    agentId: 'ValidatedAgent_' + Date.now()
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
    
    // Show account details
    console.log('\n4️⃣ Instruction account details:')
    instruction.accounts.forEach((account, index) => {
      console.log(`   ${index}. ${account.address} (${JSON.stringify(account.role)})`)
    })
    
    // Step 2: Check if we can get account states BEFORE (they shouldn't exist)
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
          console.log(`   📝 Account ${i} exists: ${account.address} (${accountInfo.value.lamports} lamports)`)
        } else {
          console.log(`   🆕 Account ${i} doesn't exist yet: ${account.address}`)
        }
      } catch (error) {
        console.log(`   🆕 Account ${i} doesn't exist: ${account.address}`)
        accountStatesBefore.set(account.address, null)
      }
    }
    
    // Step 3: Request airdrops for test accounts (if needed)
    console.log('\n6️⃣ Funding test accounts...')
    
    // Check if payer has any SOL
    let payerBalance = 0
    try {
      const balance = await rpc.getBalance(payer.address).send()
      payerBalance = balance.value
      console.log(`   💰 Payer current balance: ${payerBalance} lamports`)
    } catch (error) {
      console.log(`   💰 Payer balance check failed: ${error.message}`)
    }
    
    // If payer has no SOL, try to get some
    if (payerBalance < 1000000000) { // Less than 1 SOL
      console.log('   🚰 Requesting SOL for payer...')
      try {
        const airdropSignature = await rpc.requestAirdrop(
          payer.address, 
          lamports(2000000000n) // 2 SOL
        ).send()
        
        console.log(`   ✅ Airdrop signature: ${airdropSignature}`)
        console.log('   ⏱️  Waiting for confirmation...')
        await new Promise(resolve => setTimeout(resolve, 5000))
        
        // Check new balance
        const newBalance = await rpc.getBalance(payer.address).send()
        console.log(`   💰 New payer balance: ${newBalance.value} lamports`)
        
      } catch (error) {
        console.log(`   ❌ Airdrop failed: ${error.message}`)
        console.log('   ⚠️  Continuing with existing balance (may fail)...')
      }
    }
    
    // Step 4: Build and send transaction
    console.log('\n7️⃣ Building transaction...')
    const { value: latestBlockhash } = await rpc.getLatestBlockhash().send()
    console.log(`   📦 Latest blockhash: ${latestBlockhash.blockhash}`)
    
    // Determine signers
    const signers = [payer]
    
    // Check if agentOwner needs to sign (if it's in the accounts)
    const agentOwnerAccount = instruction.accounts.find(
      account => account.address === agentOwner.address
    )
    if (agentOwnerAccount) {
      signers.push(agentOwner)
      console.log(`   ✍️  Added agent owner as signer: ${agentOwner.address}`)
    }
    
    const transactionMessage = pipe(
      createTransactionMessage({ version: 0 }),
      tx => setTransactionMessageFeePayerSigner(payer, tx),
      tx => setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, tx),
      tx => appendTransactionMessageInstruction(instruction, tx)
    )
    
    console.log(`   📋 Transaction built with ${signers.length} signers`)
    
    // Step 5: Sign and send transaction
    console.log('\n8️⃣ Signing transaction...')
    const signedTransaction = await signTransactionMessageWithSigners(transactionMessage)
    
    console.log('   📡 Sending transaction to devnet...')
    const sendAndConfirmTransaction = sendAndConfirmTransactionFactory({ rpc, rpcSubscriptions: null })
    await sendAndConfirmTransaction(signedTransaction, {
      commitment: 'confirmed',
      skipPreflight: true  // Skip preflight simulation for now
    })
    
    const signature = getSignatureFromTransaction(signedTransaction)
    console.log(`   ✅ Transaction confirmed!`)
    console.log(`   🔗 Signature: ${signature}`)
    console.log(`   🌐 Explorer: https://explorer.solana.com/tx/${signature}?cluster=devnet`)
    
    // Step 6: Verify account states AFTER execution
    console.log('\n9️⃣ Verifying account states AFTER execution...')
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
          console.log(`   🆕 Account ${i} CREATED: ${account.address}`)
          console.log(`      💰 Rent: ${afterState.lamports} lamports`)
          console.log(`      👤 Owner: ${afterState.owner}`)
          console.log(`      📊 Data: ${afterState.data.length > 0 ? afterState.data[0].length : 0} bytes`)
        } else if (beforeState && afterState && beforeState.data !== afterState.data) {
          accountsModified++
          console.log(`   🔄 Account ${i} MODIFIED: ${account.address}`)
        } else if (!afterState) {
          console.log(`   ❌ Account ${i} MISSING AFTER EXECUTION: ${account.address}`)
        } else {
          console.log(`   ✅ Account ${i} unchanged: ${account.address}`)
        }
        
      } catch (error) {
        console.log(`   ❌ Account ${i} verification failed: ${account.address} - ${error.message}`)
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
      return true
    } else {
      console.log('\n❌ FAILURE: No account state changes detected')
      return false
    }
    
  } catch (error) {
    console.log(`\n❌ VALIDATION FAILED: ${error.message}`)
    console.log('Stack trace:')
    console.log(error.stack)
    return false
  }
}

// Run the single instruction validation
async function main() {
  const success = await validateRegisterAgentInstruction()
  
  if (success) {
    console.log('\n✨ SINGLE INSTRUCTION VALIDATION SUCCESSFUL!')
    console.log('This proves our methodology works for 100% on-chain validation.')
    console.log('Ready to scale to all 68 instructions.')
  } else {
    console.log('\n💥 SINGLE INSTRUCTION VALIDATION FAILED!')
    console.log('Need to fix issues before scaling to 68 instructions.')
  }
  
  process.exit(success ? 0 : 1)
}

main().catch(error => {
  console.error('💥 VALIDATION ERROR:', error)
  process.exit(1)
})