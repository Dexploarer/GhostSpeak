#!/usr/bin/env node

/**
 * Test with minimal agent data to isolate the issue
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
  getSignatureFromTransaction,
  getBase64EncodedWireTransaction
} from '@solana/kit'

import fs from 'fs'
import os from 'os'
import path from 'path'

// Import the instruction builder
import { getRegisterAgentInstructionAsync } from './packages/sdk-typescript/dist/index.js'

const PROGRAM_ID = 'AJVoWJ4JC1xJR9ufGBGuMgFpHMLouB29sFRTJRvEK1ZR'
const RPC_URL = 'https://api.devnet.solana.com'

console.log('🎯 Testing with minimal agent data')
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

async function testMinimalAgent() {
  console.log('\n🚀 Testing with absolute minimum data...')
  
  const rpc = createSolanaRpc(RPC_URL)
  const payer = await loadDefaultWallet()
  if (!payer) return false
  
  console.log(`   💰 Payer: ${payer.address}`)
  
  // Generate new agent owner
  const agentOwner = await generateKeyPairSigner()
  console.log(`   🤖 Agent Owner: ${agentOwner.address}`)
  
  // Minimal agent data
  const agentData = {
    agentType: 0, // Minimal type
    metadataUri: '', // Empty URI
    agentId: 'a' // Single character ID
  }
  
  console.log(`\n📝 Minimal Agent Data:`)
  console.log(`   🆔 ID: "${agentData.agentId}" (1 char)`)
  console.log(`   🏷️  Type: ${agentData.agentType}`)
  console.log(`   🔗 Metadata: "${agentData.metadataUri}" (empty)`)
  
  try {
    // Build instruction
    console.log('\n1️⃣ Building instruction...')
    const instruction = await getRegisterAgentInstructionAsync({
      agentAccount: undefined,
      userRegistry: undefined,
      signer: agentOwner,
      systemProgram: address('11111111111111111111111111111111'),
      clock: address('SysvarC1ock11111111111111111111111111111111'),
      ...agentData
    })
    
    console.log('   ✅ Instruction built')
    console.log(`   📊 Accounts: ${instruction.accounts.length}`)
    console.log(`   💾 Data: ${instruction.data.length} bytes`)
    
    // Get blockhash
    const { value: { blockhash, lastValidBlockHeight } } = await rpc.getLatestBlockhash().send()
    
    // Build transaction WITHOUT compute budget
    console.log('\n2️⃣ Building transaction WITHOUT compute budget...')
    const transactionMessage = pipe(
      createTransactionMessage({ version: 0 }),
      tx => setTransactionMessageFeePayerSigner(payer, tx),
      tx => setTransactionMessageLifetimeUsingBlockhash({ blockhash, lastValidBlockHeight }, tx),
      tx => appendTransactionMessageInstruction(instruction, tx)
    )
    
    // Sign and send
    const signedTransaction = await signTransactionMessageWithSigners(transactionMessage)
    const encodedTx = getBase64EncodedWireTransaction(signedTransaction)
    
    console.log('\n3️⃣ Sending transaction...')
    const sig = await rpc.sendTransaction(encodedTx, {
      skipPreflight: false,
      preflightCommitment: 'processed',
      encoding: 'base64'
    }).send()
    
    console.log(`   🔗 Signature: ${sig}`)
    console.log(`   🌐 Explorer: https://explorer.solana.com/tx/${sig}?cluster=devnet`)
    
    return true
    
  } catch (error) {
    console.log(`\n❌ Error: ${error.message}`)
    if (error.message.includes('2006')) {
      console.log('\n🔍 ERROR 2006 ANALYSIS:')
      console.log('   ❌ Even minimal data fails')
      console.log('   ❌ Not a data size issue')
      console.log('   ❌ Likely account initialization issue')
      console.log('   💡 The deployed program may have different code than expected')
    }
    return false
  }
}

async function main() {
  console.log('\n📋 MINIMAL TEST:')
  console.log('   🎯 Testing absolute minimum agent data')
  console.log('   📊 No compute budget')
  console.log('   🔬 Isolating the issue')
  
  await testMinimalAgent()
  
  process.exit(0)
}

main().catch(console.error)