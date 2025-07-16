#!/usr/bin/env node

/**
 * Agent Registration Instruction Test
 * Tests actual agent registration execution with the built SDK
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
  signAndSendTransactionMessageWithSigners
} from '@solana/kit'

// Import our built SDK
import { 
  getRegisterAgentInstructionAsync, 
  GHOSTSPEAK_MARKETPLACE_PROGRAM_ADDRESS 
} from './packages/sdk-typescript/dist/index.js'

const PROGRAM_ID = 'FVknDdFF634i2gLyVaXrgaM1eYpb7LNPdV14Y3Egb73E'

console.log('🤖 Starting Agent Registration Instruction Test')
console.log(`📋 Program ID: ${PROGRAM_ID}`)

async function main() {
  try {
    // 1. Setup RPC connection
    console.log('\n1️⃣ Setting up RPC connection...')
    const rpc = createSolanaRpc('https://api.devnet.solana.com')

    // 2. Generate and fund test keypairs
    console.log('\n2️⃣ Generating test keypairs...')
    const agentOwner = await generateKeyPairSigner()
    console.log(`   Agent Owner: ${agentOwner.address}`)

    // 3. Request airdrop for transaction fees
    console.log('\n3️⃣ Requesting SOL for transaction fees...')
    try {
      const airdropSignature = await rpc.requestAirdrop(
        agentOwner.address, 
        lamports(1000000000n) // 1 SOL
      ).send()
      console.log(`   ✅ Airdrop successful: ${airdropSignature}`)
      
      // Wait for airdrop to confirm
      await new Promise(resolve => setTimeout(resolve, 3000))
      
      const balance = await rpc.getBalance(agentOwner.address).send()
      console.log(`   💰 Balance: ${balance.value} lamports`)
      
    } catch (error) {
      console.log(`   ⚠️  Airdrop failed: ${error.message}`)
      console.log('   Continuing with existing balance...')
    }

    // 4. Prepare agent registration instruction
    console.log('\n4️⃣ Preparing agent registration instruction...')
    
    const agentData = {
      agentType: 1, // Standard AI agent type
      metadataUri: 'https://example.com/agent-metadata.json',
      agentId: 'TestAgent_' + Date.now()
    }

    // Create the register agent instruction
    const registerAgentInstruction = await getRegisterAgentInstructionAsync({
      agentAccount: undefined, // Will be derived as PDA
      userRegistry: undefined, // Will be derived as PDA
      signer: agentOwner,
      systemProgram: address('11111111111111111111111111111111'),
      clock: address('SysvarC1ock11111111111111111111111111111111'),
      ...agentData
    })

    console.log('   ✅ Agent registration instruction created')
    console.log(`   📝 Agent ID: ${agentData.agentId}`)
    console.log(`   🏷️  Agent Type: ${agentData.agentType}`)
    console.log(`   🔗 Metadata URI: ${agentData.metadataUri}`)

    // 5. Build and send transaction
    console.log('\n5️⃣ Building and sending transaction...')
    
    // Get latest blockhash
    const { value: latestBlockhash } = await rpc.getLatestBlockhash().send()
    
    // Create transaction message
    const transactionMessage = pipe(
      createTransactionMessage({ version: 0 }),
      tx => setTransactionMessageFeePayerSigner(agentOwner, tx),
      tx => setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, tx),
      tx => appendTransactionMessageInstruction(registerAgentInstruction, tx)
    )

    console.log('   📦 Transaction message created')
    
    console.log('   📡 Signing and sending transaction...')
    
    const signature = await signAndSendTransactionMessageWithSigners({
      rpc,
      signers: [agentOwner],
      transactionMessage
    })
    
    console.log('   ✅ Transaction confirmed!')
    console.log(`   🔗 Explorer: https://explorer.solana.com/tx/${signature}?cluster=devnet`)

    // 6. Verify agent account was created
    console.log('\n6️⃣ Verifying agent account creation...')
    
    // The agent PDA should be accessible now
    const agentPDA = registerAgentInstruction.accounts[0].address
    console.log(`   🏠 Agent PDA: ${agentPDA}`)
    
    const agentAccount = await rpc.getAccountInfo(agentPDA, {
      encoding: 'base64'
    }).send()
    
    if (agentAccount.value) {
      console.log('   ✅ Agent account successfully created!')
      console.log(`   📊 Account size: ${agentAccount.value.data[0].length} bytes`)
      console.log(`   💰 Account rent: ${agentAccount.value.lamports} lamports`)
      console.log(`   👤 Owner: ${agentAccount.value.owner}`)
    } else {
      throw new Error('Agent account not found after transaction')
    }

    console.log('\n🎉 AGENT REGISTRATION TEST SUCCESSFUL!')
    console.log('\n📋 SUMMARY:')
    console.log('   ✅ SDK import and instruction creation works')
    console.log('   ✅ Transaction building with Web3.js v2 works')
    console.log('   ✅ On-chain instruction execution successful')
    console.log('   ✅ Agent account created and verified')
    console.log('   ✅ PDA derivation and account lookup works')
    
    return {
      success: true,
      agentPDA,
      signature,
      explorerUrl: `https://explorer.solana.com/tx/${signature}?cluster=devnet`
    }

  } catch (error) {
    console.error('\n❌ AGENT REGISTRATION TEST FAILED:')
    console.error(error.message)
    console.error('\nStack trace:')
    console.error(error.stack)
    return { success: false, error: error.message }
  }
}

// Run the test
main().then(result => {
  process.exit(result.success ? 0 : 1)
})