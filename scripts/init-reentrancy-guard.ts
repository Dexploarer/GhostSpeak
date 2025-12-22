/**
 * Initialize Reentrancy Guard PDA on devnet
 * 
 * This script initializes the global reentrancy guard account required by 
 * escrow, channel, and other instructions that use reentrancy protection.
 */
import {
  createSolanaRpc,
  createKeyPairSignerFromBytes,
  getProgramDerivedAddress,
  getAddressEncoder,
  getBytesEncoder,
  pipe,
  createTransactionMessage,
  setTransactionMessageFeePayerSigner,
  setTransactionMessageLifetimeUsingBlockhash,
  appendTransactionMessageInstruction,
  signTransactionMessageWithSigners,
  getBase64EncodedWireTransaction,
  type Address,
  type Blockhash,
  type IInstruction,
  type IAccountMeta,
  AccountRole
} from '@solana/kit'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'

// Program ID
const PROGRAM_ID = 'GpvFxus2eecFKcqa2bhxXeRjpstPeCEJNX216TQCcNC9' as Address
const SYSTEM_PROGRAM = '11111111111111111111111111111111' as Address

// Instruction discriminator for init_reentrancy_guard
// This is the first 8 bytes of sha256("global:init_reentrancy_guard")
const INIT_REENTRANCY_GUARD_DISCRIMINATOR = new Uint8Array([
  0x9c, 0x6d, 0x73, 0x55, 0x0c, 0x3c, 0xf5, 0x63
])

async function main() {
  console.log('🔒 Initializing Reentrancy Guard PDA on Devnet')
  console.log('='.repeat(50))

  // Load wallet keypair
  const walletPath = path.join(os.homedir(), '.config/solana/id.json')
  const walletData = JSON.parse(fs.readFileSync(walletPath, 'utf-8'))
  const keypairBytes = new Uint8Array(walletData)
  const signer = await createKeyPairSignerFromBytes(keypairBytes)

  console.log(`📝 Using wallet: ${signer.address}`)

  // Derive reentrancy guard PDA
  const [reentrancyGuardPda] = await getProgramDerivedAddress({
    programAddress: PROGRAM_ID,
    seeds: [
      getBytesEncoder().encode(new Uint8Array([114, 101, 101, 110, 116, 114, 97, 110, 99, 121, 95, 103, 117, 97, 114, 100])) // "reentrancy_guard"
    ]
  })

  console.log(`🎯 Reentrancy Guard PDA: ${reentrancyGuardPda}`)

  // Check if account already exists
  const rpc = createSolanaRpc('https://api.devnet.solana.com')
  
  try {
    const accountInfo = await rpc.getAccountInfo(reentrancyGuardPda, { encoding: 'base64' }).send()
    if (accountInfo.value) {
      console.log('✅ Reentrancy Guard already initialized!')
      console.log(`   Owner: ${accountInfo.value.owner}`)
      console.log(`   Size: ${accountInfo.value.data[0]?.length ?? 0} bytes`)
      return
    }
  } catch (e) {
    console.log('📦 Account does not exist, will create it...')
  }

  // Build the instruction
  // Account order based on InitReentrancyGuard struct:
  // 1. reentrancy_guard (writable, signer: false)
  // 2. authority (writable, signer: true)
  // 3. system_program
  const accounts: IAccountMeta[] = [
    { 
      address: reentrancyGuardPda, 
      role: AccountRole.WRITABLE
    },
    { 
      address: signer.address, 
      role: AccountRole.WRITABLE_SIGNER
    },
    { 
      address: SYSTEM_PROGRAM, 
      role: AccountRole.READONLY
    }
  ]
  
  const instruction: IInstruction = {
    programAddress: PROGRAM_ID,
    accounts,
    data: INIT_REENTRANCY_GUARD_DISCRIMINATOR
  }

  // Get blockhash
  const { blockhash, lastValidBlockHeight } = (await rpc.getLatestBlockhash().send()).value

  // Build transaction
  const transactionMessage = pipe(
    createTransactionMessage({ version: 0 }),
    tx => setTransactionMessageFeePayerSigner(signer, tx),
    tx => setTransactionMessageLifetimeUsingBlockhash({ blockhash: blockhash as Blockhash, lastValidBlockHeight }, tx),
    tx => appendTransactionMessageInstruction(instruction, tx)
  )

  // Sign
  const signedTransaction = await signTransactionMessageWithSigners(transactionMessage)
  const wireTransaction = getBase64EncodedWireTransaction(signedTransaction)

  console.log('📤 Sending transaction...')

  // Send with base64 encoding
  const signature = await rpc.sendTransaction(wireTransaction, {
    skipPreflight: true,
    preflightCommitment: 'confirmed',
    encoding: 'base64'
  }).send()

  console.log(`✅ Transaction sent: ${signature}`)
  console.log(`🔍 View on explorer: https://explorer.solana.com/tx/${signature}?cluster=devnet`)

  // Wait for confirmation
  console.log('⏳ Waiting for confirmation...')
  let confirmed = false
  for (let i = 0; i < 30; i++) {
    await new Promise(resolve => setTimeout(resolve, 2000))
    const statuses = await rpc.getSignatureStatuses([signature] as const).send()
    if (statuses.value[0]) {
      if (statuses.value[0].err) {
        console.error('❌ Transaction failed:', statuses.value[0].err)
        break
      }
      if (statuses.value[0].confirmationStatus === 'confirmed' || statuses.value[0].confirmationStatus === 'finalized') {
        confirmed = true
        console.log('✅ Transaction confirmed!')
        break
      }
    }
    process.stdout.write('.')
  }

  if (!confirmed) {
    console.log('\n⚠️ Confirmation timed out, check explorer for status')
  }
}

main().catch(console.error)
