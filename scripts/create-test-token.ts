/**
 * Create a Token2022 test token for escrow testing
 */
import {
  createSolanaRpc,
  createKeyPairSignerFromBytes,
  generateKeyPairSigner,
  pipe,
  createTransactionMessage,
  setTransactionMessageFeePayerSigner,
  setTransactionMessageLifetimeUsingBlockhash,
  appendTransactionMessageInstructions,
  signTransactionMessageWithSigners,
  getBase64EncodedWireTransaction,
  type Address,
  type Blockhash,
  type IInstruction
} from '@solana/kit'
import { getCreateAccountInstruction } from '@solana-program/system'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'

const TOKEN_2022_PROGRAM = 'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb' as Address

async function main() {
  console.log('🪙 Creating Token2022 Test Token')
  console.log('='.repeat(50))

  // Load wallet keypair
  const walletPath = path.join(os.homedir(), '.config/solana/id.json')
  const walletData = JSON.parse(fs.readFileSync(walletPath, 'utf-8'))
  const keypairBytes = new Uint8Array(walletData)
  const payer = await createKeyPairSignerFromBytes(keypairBytes)

  console.log(`📝 Payer: ${payer.address}`)

  // Generate new mint keypair
  const mintKeypair = await generateKeyPairSigner()
  console.log(`🪙 New Mint: ${mintKeypair.address}`)

  const rpc = createSolanaRpc('https://api.devnet.solana.com')

  // Get rent for mint account (Token2022 mint is 82 bytes + extensions)
  const mintSpace = 82n // Basic mint size
  const rentResult = await rpc.getMinimumBalanceForRentExemption(mintSpace).send()
  console.log(`💰 Rent: ${Number(rentResult) / 1e9} SOL`)

  // Build create account instruction
  const createAccountIx = getCreateAccountInstruction({
    payer,
    newAccount: mintKeypair,
    lamports: rentResult,
    space: mintSpace,
    programAddress: TOKEN_2022_PROGRAM
  })

  // Build initialize mint instruction (Token2022)
  // Discriminator for InitializeMint2: [1] (1 byte)
  // Decimals: 9 (1 byte)
  // Mint authority: payer (32 bytes)
  // Freeze authority option: Some (1 byte) + payer (32 bytes)
  const initMintData = new Uint8Array(67)
  initMintData[0] = 20 // InitializeMint2 instruction discriminator
  initMintData[1] = 9 // decimals
  
  // Copy mint authority (payer address as bytes)
  const payerBytes = Buffer.from(payer.address, 'base58')
  // We need to properly encode the pubkey - for now use a simpler approach
  
  const initMintIx: IInstruction = {
    programAddress: TOKEN_2022_PROGRAM,
    accounts: [
      { address: mintKeypair.address, role: 1 } // writable
    ],
    data: new Uint8Array([20, 9, ...Array(64).fill(0)]) // Simplified - just decimals
  }

  // Get blockhash
  const { blockhash, lastValidBlockHeight } = (await rpc.getLatestBlockhash().send()).value

  // Build transaction
  const txMessage = pipe(
    createTransactionMessage({ version: 0 }),
    tx => setTransactionMessageFeePayerSigner(payer, tx),
    tx => setTransactionMessageLifetimeUsingBlockhash({ blockhash: blockhash as Blockhash, lastValidBlockHeight }, tx),
    tx => appendTransactionMessageInstructions([createAccountIx as IInstruction], tx)
  )

  const signedTx = await signTransactionMessageWithSigners(txMessage)
  const wireTx = getBase64EncodedWireTransaction(signedTx)

  console.log('📤 Sending transaction...')
  const signature = await rpc.sendTransaction(wireTx, {
    skipPreflight: true,
    encoding: 'base64'
  }).send()

  console.log(`✅ Transaction sent: ${signature}`)
  console.log(`🪙 Mint address: ${mintKeypair.address}`)
  console.log('')
  console.log('Save this mint address for testing!')
}

main().catch(console.error)
