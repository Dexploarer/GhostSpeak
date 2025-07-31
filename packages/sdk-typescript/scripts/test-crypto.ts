#!/usr/bin/env bun

import { generateKeypair, encrypt } from '../dist/crypto.js'

console.log('Testing crypto functions...')

try {
  console.log('1. Generating keypair...')
  const keypair = generateKeypair()
  console.log('Keypair generated:', {
    publicKey: keypair.publicKey,
    publicKeyType: typeof keypair.publicKey,
    publicKeyLength: keypair.publicKey.length,
    secretKey: keypair.secretKey,
    secretKeyType: typeof keypair.secretKey,
    secretKeyLength: keypair.secretKey.length
  })
  
  console.log('\n2. Testing encrypt with value 100n...')
  const ciphertext = encrypt(keypair.publicKey, 100n)
  console.log('Encrypt successful:', ciphertext)
} catch (error) {
  console.error('Error:', error)
  if (error instanceof Error) {
    console.error('Stack:', error.stack)
  }
}