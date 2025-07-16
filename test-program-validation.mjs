#!/usr/bin/env node

/**
 * Validate that the deployed program is working with ANY instruction
 * Start with the simplest possible instruction to isolate issues
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

const PROGRAM_ID = 'AJVoWJ4JC1xJR9ufGBGuMgFpHMLouB29sFRTJRvEK1ZR'
const RPC_URL = 'https://api.devnet.solana.com'

console.log('🔍 Program Validation Test')
console.log(`📋 Program ID: ${PROGRAM_ID}`)

async function loadDefaultWallet() {
  const defaultKeypairPath = path.join(os.homedir(), '.config', 'solana', 'id.json')
  try {
    const keypairData = JSON.parse(fs.readFileSync(defaultKeypairPath, 'utf8'))
    return await createKeyPairSignerFromBytes(new Uint8Array(keypairData))
  } catch (error) {
    return null
  }
}

async function validateProgram() {
  console.log('\n🚀 Validating deployed program...')
  
  const rpc = createSolanaRpc(RPC_URL)
  const payer = await loadDefaultWallet()
  if (!payer) return false
  
  console.log(`   💰 Payer: ${payer.address}`)
  
  // Check program exists
  console.log('\n1️⃣ Checking program account...')
  try {
    const programAccount = await rpc.getAccountInfo(address(PROGRAM_ID)).send()
    if (!programAccount.value) {
      console.log('   ❌ Program account not found')
      return false
    }
    console.log('   ✅ Program account exists')
    console.log(`   👤 Owner: ${programAccount.value.owner}`)
    console.log(`   💰 Lamports: ${programAccount.value.lamports}`)
    console.log(`   📊 Data length: ${programAccount.value.data[0]?.length || 0} bytes`)
  } catch (error) {
    console.log(`   ❌ Error checking program: ${error.message}`)
    return false
  }
  
  // Try to call the simplest instruction - a read-only operation
  console.log('\n2️⃣ Testing program invocation...')
  try {
    // Create a minimal transaction to test if the program can be invoked
    const { value: { blockhash, lastValidBlockHeight } } = await rpc.getLatestBlockhash().send()
    
    // Try a transaction with just the system program to baseline
    console.log('   🔧 Testing system program baseline...')
    const systemInstruction = {
      programAddress: address('11111111111111111111111111111111'),
      accounts: [],
      data: new Uint8Array([4, 0, 0, 0, 0, 0, 0, 0, 0]) // transfer 0 lamports
    }
    
    const systemTx = pipe(
      createTransactionMessage({ version: 0 }),
      tx => setTransactionMessageFeePayerSigner(payer, tx),
      tx => setTransactionMessageLifetimeUsingBlockhash({ blockhash, lastValidBlockHeight }, tx),
      tx => appendTransactionMessageInstruction(systemInstruction, tx)
    )
    
    const signedSystemTx = await signTransactionMessageWithSigners(systemTx)
    const encodedSystemTx = getBase64EncodedWireTransaction(signedSystemTx)
    
    // Simulate system transaction
    const systemResult = await rpc.simulateTransaction(encodedSystemTx, {
      encoding: 'base64',
      commitment: 'processed'
    }).send()
    
    console.log('   ✅ System program simulation:', systemResult.value.err ? 'FAILED' : 'SUCCESS')
    
    // Now test our program with a malformed instruction to see what error we get
    console.log('   🔧 Testing our program response...')
    const testInstruction = {
      programAddress: address(PROGRAM_ID),
      accounts: [],
      data: new Uint8Array([255]) // Invalid discriminator
    }
    
    const testTx = pipe(
      createTransactionMessage({ version: 0 }),
      tx => setTransactionMessageFeePayerSigner(payer, tx),
      tx => setTransactionMessageLifetimeUsingBlockhash({ blockhash, lastValidBlockHeight }, tx),
      tx => appendTransactionMessageInstruction(testInstruction, tx)
    )
    
    const signedTestTx = await signTransactionMessageWithSigners(testTx)
    const encodedTestTx = getBase64EncodedWireTransaction(signedTestTx)
    
    // Simulate our program transaction
    const testResult = await rpc.simulateTransaction(encodedTestTx, {
      encoding: 'base64',
      commitment: 'processed'
    }).send()
    
    console.log('   📊 Our program simulation result:')
    if (testResult.value.err) {
      console.log(`      Error: ${JSON.stringify(testResult.value.err)}`)
      
      // Check if it's an instruction error (which means the program is responding)
      if (testResult.value.err.InstructionError) {
        console.log('   ✅ Program is responding to instructions!')
        console.log('   ✅ The error is expected (invalid discriminator)')
        return true
      } else {
        console.log('   ❌ Program invocation failed at a lower level')
        return false
      }
    } else {
      console.log('   ⚠️  Unexpected success with invalid instruction')
      return false
    }
    
  } catch (error) {
    console.log(`   ❌ Error testing program: ${error.message}`)
    return false
  }
}

async function main() {
  console.log('\n📋 PROGRAM VALIDATION:')
  console.log('   🎯 Check if program is deployed correctly')
  console.log('   🎯 Test basic program invocation')
  console.log('   🎯 Isolate deployment issues')
  
  const isValid = await validateProgram()
  
  if (isValid) {
    console.log('\n✅ PROGRAM VALIDATION SUCCESS!')
    console.log('   🎯 Program is deployed and responding')
    console.log('   🎯 Ready to test specific instructions')
    console.log('   🎯 The error 2006 is likely instruction-specific')
  } else {
    console.log('\n❌ PROGRAM VALIDATION FAILED!')
    console.log('   🎯 Program deployment issue')
    console.log('   🎯 Need to investigate deployment')
  }
  
  process.exit(0)
}

main().catch(console.error)