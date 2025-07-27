import { describe, it, expect } from 'vitest'
import { address } from '@solana/addresses'
import {
  generateElGamalKeypair,
  encryptAmount,
  decryptAmount,
  isValidCiphertext,
  serializeCiphertext,
  deserializeCiphertext,
  MAX_DECRYPTABLE_VALUE,
  type ElGamalKeypair
} from '../../../src/utils/elgamal.js'

describe('ElGamal Encryption (Lightweight)', () => {
  let keypair: ElGamalKeypair

  it('should generate valid ElGamal keypair', () => {
    keypair = generateElGamalKeypair()
    
    expect(keypair.publicKey).toBeInstanceOf(Uint8Array)
    expect(keypair.publicKey).toHaveLength(32)
    expect(keypair.secretKey).toBeInstanceOf(Uint8Array)
    expect(keypair.secretKey).toHaveLength(32)
  })

  it('should generate deterministic keypair from seed', () => {
    const seed = new Uint8Array(32).fill(42)
    const kp1 = generateElGamalKeypair(seed)
    const kp2 = generateElGamalKeypair(seed)
    
    expect(kp1.publicKey).toEqual(kp2.publicKey)
    expect(kp1.secretKey).toEqual(kp2.secretKey)
  })

  it('should encrypt and decrypt zero', () => {
    const amount = 0n
    const ciphertext = encryptAmount(amount, keypair.publicKey)
    const decrypted = decryptAmount(ciphertext, keypair.secretKey, 10n)
    
    expect(decrypted).toBe(amount)
  })

  it('should encrypt and decrypt small positive amounts', () => {
    const amounts = [1n, 2n, 5n, 10n]
    
    for (const amount of amounts) {
      const ciphertext = encryptAmount(amount, keypair.publicKey)
      const decrypted = decryptAmount(ciphertext, keypair.secretKey, 20n)
      
      expect(decrypted).toBe(amount)
    }
  })

  it('should fail to decrypt with wrong secret key', () => {
    const keypair2 = generateElGamalKeypair()
    const amount = 3n
    const ciphertext = encryptAmount(amount, keypair.publicKey)
    const decrypted = decryptAmount(ciphertext, keypair2.secretKey, 10n)
    
    expect(decrypted).toBeNull()
  })

  it('should validate input constraints', () => {
    expect(() => encryptAmount(-1n, keypair.publicKey))
      .toThrow('Amount must be non-negative')
    
    expect(() => encryptAmount(MAX_DECRYPTABLE_VALUE + 1n, keypair.publicKey))
      .toThrow('Amount exceeds maximum decryptable value')
  })

  it('should validate ciphertext', () => {
    const amount = 5n
    const ciphertext = encryptAmount(amount, keypair.publicKey)
    
    expect(isValidCiphertext(ciphertext)).toBe(true)
  })

  it('should serialize and deserialize ciphertext', () => {
    const amount = 7n
    const ciphertext = encryptAmount(amount, keypair.publicKey)
    
    const serialized = serializeCiphertext(ciphertext)
    expect(serialized).toBeInstanceOf(Uint8Array)
    expect(serialized).toHaveLength(64)
    
    const deserialized = deserializeCiphertext(serialized)
    expect(deserialized.commitment.commitment).toEqual(ciphertext.commitment.commitment)
    expect(deserialized.handle.handle).toEqual(ciphertext.handle.handle)
  })

  it('should reject invalid serialization input', () => {
    const wrongSize = new Uint8Array(50)
    expect(() => deserializeCiphertext(wrongSize)).toThrow('Invalid ciphertext length')
  })

  it('should produce different ciphertexts for same amount', () => {
    const amount = 8n
    const cipher1 = encryptAmount(amount, keypair.publicKey)
    const cipher2 = encryptAmount(amount, keypair.publicKey)
    
    // Should be different due to randomness
    expect(cipher1.commitment.commitment).not.toEqual(cipher2.commitment.commitment)
    expect(cipher1.handle.handle).not.toEqual(cipher2.handle.handle)
  })
})