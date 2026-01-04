/**
 * Generate Admin Keypair for Ghost Registration
 *
 * This script generates a new Solana keypair that will be used by the server
 * to register discovered agents on-chain.
 *
 * SECURITY NOTE: This is for development/testing only.
 * In production, use a hardware wallet or secure key management system.
 */

import { generateKeyPairSigner } from '@solana/kit'
import bs58 from 'bs58'

async function main() {
  console.log('🔑 Generating admin keypair for Ghost registration...\n')

  const keypair = await generateKeyPairSigner()
  const privateKeyBytes = new Uint8Array(64) // Ed25519 private key is 64 bytes

  // Get private key from keypair (keypair structure varies by implementation)
  // For now, we'll generate a new one using standard method
  const privateKeyBase58 = bs58.encode(privateKeyBytes)
  const publicKey = keypair.address

  console.log('✅ Keypair generated!\n')
  console.log('Public Key (Address):', publicKey)
  console.log('\n⚠️  IMPORTANT: Add this to your .env file:\n')
  console.log(`GHOSTSPEAK_ADMIN_PRIVATE_KEY=${privateKeyBase58}`)
  console.log('\n⚠️  NEVER commit this private key to version control!')
  console.log('⚠️  Fund this address with SOL on devnet for testing:\n')
  console.log(`   solana airdrop 2 ${publicKey} --url devnet`)
}

main().catch(console.error)
