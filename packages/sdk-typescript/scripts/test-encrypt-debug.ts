#!/usr/bin/env bun

console.log('Debug encrypt issue...')

async function testEncrypt() {
  const crypto = await import('../dist/crypto.js')
  const { generateKeypair, encrypt } = crypto
  
  console.log('Imported functions:', Object.keys(crypto))
  
  const keypair = generateKeypair()
  console.log('Keypair:', keypair)
  console.log('PublicKey is Uint8Array?', keypair.publicKey instanceof Uint8Array)
  console.log('PublicKey constructor:', keypair.publicKey.constructor.name)
  console.log('PublicKey proto:', Object.getPrototypeOf(keypair.publicKey).constructor.name)
  
  // Try to manually call the problematic code
  try {
    const { bytesToHex } = await import('@noble/hashes/utils')
    console.log('\nTrying manual bytesToHex...')
    const hex = bytesToHex(keypair.publicKey)
    console.log('Success! Hex:', hex)
  } catch (error) {
    console.error('Manual bytesToHex failed:', error)
  }
  
  // Now try encrypt
  try {
    console.log('\nTrying encrypt...')
    const result = encrypt(100n, keypair.publicKey)
    console.log('Success!', result)
  } catch (error) {
    console.error('Encrypt failed:', error)
  }
}

testEncrypt().catch(console.error)