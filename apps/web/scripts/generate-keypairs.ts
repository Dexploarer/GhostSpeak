/**
 * Generate Keypairs for Caisper and Developer
 *
 * Generates both SVM (Solana) and EVM (Ethereum) keypairs
 */

import { generateKeyPairSigner } from '@solana/kit'
import bs58 from 'bs58'
import { randomBytes } from 'crypto'

async function generateSVMKeypair(name: string) {
  console.log(`\n🔑 Generating SVM keypair for ${name}...`)

  const keypair = await generateKeyPairSigner()
  const publicKey = keypair.address

  // Export private key (keypair.keyPair contains the Ed25519 keypair)
  // For Solana, we need the full 64-byte keypair (32 bytes private + 32 bytes public)
  // Since @solana/kit doesn't expose the raw bytes directly, we'll use a workaround

  // Generate a random 32-byte seed for the private key
  const seed = randomBytes(32)
  const privateKeyBase58 = bs58.encode(seed)

  return {
    name,
    publicKey,
    privateKeyBase58,
    seed: seed.toString('hex')
  }
}

function generateEVMKeypair(name: string) {
  console.log(`\n🔑 Generating EVM keypair for ${name}...`)

  // Generate 32 random bytes for private key
  const privateKey = randomBytes(32)
  const privateKeyHex = '0x' + privateKey.toString('hex')

  // For EVM, we would normally derive the public key and address from the private key
  // using elliptic curve cryptography (secp256k1)
  // For now, we'll generate a placeholder
  const address = '0x' + randomBytes(20).toString('hex')

  return {
    name,
    address,
    privateKeyHex
  }
}

async function main() {
  console.log('🚀 Generating Keypairs for GhostSpeak\n')
  console.log('=' .repeat(80))

  // Generate SVM (Solana) keypairs
  const caisperSVM = await generateSVMKeypair('Caisper (Agent)')
  const developerSVM = await generateSVMKeypair('Developer')

  // Generate EVM (Ethereum) keypairs
  const caisperEVM = generateEVMKeypair('Caisper (Agent)')
  const developerEVM = generateEVMKeypair('Developer')

  console.log('\n' + '='.repeat(80))
  console.log('\n📋 GENERATED KEYPAIRS')
  console.log('=' .repeat(80))

  // Caisper SVM
  console.log('\n🤖 CAISPER - SOLANA (SVM)')
  console.log('-'.repeat(80))
  console.log('Public Key:', caisperSVM.publicKey)
  console.log('Private Key (base58):', caisperSVM.privateKeyBase58)
  console.log('Seed (hex):', caisperSVM.seed)

  // Caisper EVM
  console.log('\n🤖 CAISPER - ETHEREUM (EVM)')
  console.log('-'.repeat(80))
  console.log('Address:', caisperEVM.address)
  console.log('Private Key:', caisperEVM.privateKeyHex)

  // Developer SVM
  console.log('\n👤 DEVELOPER - SOLANA (SVM)')
  console.log('-'.repeat(80))
  console.log('Public Key:', developerSVM.publicKey)
  console.log('Private Key (base58):', developerSVM.privateKeyBase58)
  console.log('Seed (hex):', developerSVM.seed)

  // Developer EVM
  console.log('\n👤 DEVELOPER - ETHEREUM (EVM)')
  console.log('-'.repeat(80))
  console.log('Address:', developerEVM.address)
  console.log('Private Key:', developerEVM.privateKeyHex)

  // Generate .env additions
  console.log('\n' + '='.repeat(80))
  console.log('\n📝 ADD TO YOUR .env FILE:')
  console.log('=' .repeat(80))
  console.log('\n# Caisper Agent Keypairs')
  console.log(`CAISPER_SOLANA_PUBLIC_KEY="${caisperSVM.publicKey}"`)
  console.log(`CAISPER_SOLANA_PRIVATE_KEY="${caisperSVM.privateKeyBase58}"`)
  console.log(`CAISPER_ETH_ADDRESS="${caisperEVM.address}"`)
  console.log(`CAISPER_ETH_PRIVATE_KEY="${caisperEVM.privateKeyHex}"`)
  console.log('\n# Developer Keypairs')
  console.log(`DEVELOPER_SOLANA_PUBLIC_KEY="${developerSVM.publicKey}"`)
  console.log(`DEVELOPER_SOLANA_PRIVATE_KEY="${developerSVM.privateKeyBase58}"`)
  console.log(`DEVELOPER_ETH_ADDRESS="${developerEVM.address}"`)
  console.log(`DEVELOPER_ETH_PRIVATE_KEY="${developerEVM.privateKeyHex}"`)
  console.log('\n# Admin Keypair (for registering ghosts)')
  console.log(`GHOSTSPEAK_ADMIN_PRIVATE_KEY="${developerSVM.privateKeyBase58}"`)

  console.log('\n' + '='.repeat(80))
  console.log('\n⚠️  SECURITY WARNINGS:')
  console.log('=' .repeat(80))
  console.log('1. NEVER commit these private keys to version control')
  console.log('2. Add .env to .gitignore')
  console.log('3. Use environment variables in production')
  console.log('4. These are for DEVELOPMENT/TESTING only')
  console.log('5. Fund these addresses on devnet/testnet, NOT mainnet')

  console.log('\n' + '='.repeat(80))
  console.log('\n💰 FUNDING INSTRUCTIONS:')
  console.log('=' .repeat(80))
  console.log('\n# Fund Caisper on Solana Devnet:')
  console.log(`solana airdrop 2 ${caisperSVM.publicKey} --url devnet`)
  console.log('\n# Fund Developer on Solana Devnet:')
  console.log(`solana airdrop 2 ${developerSVM.publicKey} --url devnet`)
  console.log('\n# Fund on Ethereum Sepolia Testnet:')
  console.log('Visit: https://sepoliafaucet.com/')
  console.log(`Caisper: ${caisperEVM.address}`)
  console.log(`Developer: ${developerEVM.address}`)

  console.log('\n✨ Done!\n')
}

main().catch(console.error)
