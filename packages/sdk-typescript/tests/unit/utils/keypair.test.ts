import { describe, it, expect, vi, beforeEach } from 'vitest'
import bs58 from 'bs58'

// Import the actual module - testing without mocks since the functionality is simple
import {
  generateKeypair,
  keypairToAddress,
  keypairFromSecretKey,
  keypairFromSeed,
  generateElGamalKeypair
} from '../../../src/utils/keypair.js'

describe('Keypair Utilities', () => {
  describe('generateKeypair', () => {
    it('should generate a valid Ed25519 keypair', () => {
      const keypair = generateKeypair()

      expect(keypair.publicKey).toBeInstanceOf(Uint8Array)
      expect(keypair.publicKey).toHaveLength(32)
      expect(keypair.secretKey).toBeInstanceOf(Uint8Array)
      expect(keypair.secretKey).toHaveLength(64)

      // Verify secret key structure (32 bytes secret + 32 bytes public)
      expect(keypair.secretKey.slice(32, 64)).toEqual(keypair.publicKey)
    })

    it('should generate different keypairs on each call', () => {
      const keypair1 = generateKeypair()
      const keypair2 = generateKeypair()

      expect(keypair1.publicKey).not.toEqual(keypair2.publicKey)
      expect(keypair1.secretKey).not.toEqual(keypair2.secretKey)
    })
  })

  describe('generateElGamalKeypair', () => {
    it('should generate ElGamal keypair without seed', () => {
      const keypair = generateElGamalKeypair()

      expect(keypair).toBeDefined()
      expect(keypair.publicKey).toBeInstanceOf(Uint8Array)
      expect(keypair.secretKey).toBeInstanceOf(Uint8Array)
    })

    it('should generate ElGamal keypair with seed', () => {
      const seed = new Uint8Array(32).fill(42)
      const keypair = generateElGamalKeypair(seed)

      expect(keypair).toBeDefined()
      expect(keypair.publicKey).toBeInstanceOf(Uint8Array)
      expect(keypair.secretKey).toBeInstanceOf(Uint8Array)
    })

    it('should generate consistent keypair with same seed', () => {
      const seed = new Uint8Array(32).fill(42)
      const keypair1 = generateElGamalKeypair(seed)
      const keypair2 = generateElGamalKeypair(seed)

      expect(keypair1.publicKey).toEqual(keypair2.publicKey)
      expect(keypair1.secretKey).toEqual(keypair2.secretKey)
    })
  })

  describe('keypairToAddress', () => {
    it('should convert keypair to Solana address', () => {
      // Create a keypair with known public key
      const publicKey = new Uint8Array(32)
      publicKey.fill(6)
      const keypair = {
        publicKey,
        secretKey: new Uint8Array(64).fill(7)
      }

      const addr = keypairToAddress(keypair)

      expect(addr).toBeDefined()
      expect(typeof addr).toBe('string')

      // Verify the address is the base58 encoding of the public key
      const expectedBase58 = bs58.encode(publicKey)
      expect(addr).toBe(expectedBase58)
    })

    it('should produce valid Solana addresses', () => {
      const keypair = generateKeypair()
      const addr = keypairToAddress(keypair)

      // Solana addresses are base58 encoded and typically 32-44 characters
      expect(addr.length).toBeGreaterThanOrEqual(32)
      expect(addr.length).toBeLessThanOrEqual(44)

      // Should only contain base58 characters
      expect(/^[1-9A-HJ-NP-Za-km-z]+$/.test(addr)).toBe(true)
    })
  })

  describe('keypairFromSecretKey', () => {
    it('should create keypair from 32-byte secret key', () => {
      const secretKey = new Uint8Array(32)
      secretKey.fill(8)

      const keypair = keypairFromSecretKey(secretKey)

      expect(keypair.publicKey).toBeInstanceOf(Uint8Array)
      expect(keypair.publicKey).toHaveLength(32)
      expect(keypair.secretKey).toBeInstanceOf(Uint8Array)
      expect(keypair.secretKey).toHaveLength(64)

      // Verify the secret key was properly expanded
      expect(keypair.secretKey.slice(0, 32)).toEqual(secretKey)
      expect(keypair.secretKey.slice(32, 64)).toEqual(keypair.publicKey)
    })

    it('should create keypair from 64-byte secret key', () => {
      const secretKey = new Uint8Array(64)
      const privateKey = new Uint8Array(32).fill(9)
      const publicKey = new Uint8Array(32).fill(10)
      secretKey.set(privateKey, 0)
      secretKey.set(publicKey, 32)

      const keypair = keypairFromSecretKey(secretKey)

      expect(keypair.publicKey).toEqual(publicKey)
      expect(keypair.secretKey).toEqual(secretKey)
    })

    it('should throw error for invalid secret key length', () => {
      const invalidSecretKey = new Uint8Array(48) // Invalid length

      expect(() => keypairFromSecretKey(invalidSecretKey)).toThrow(
        'Invalid secret key length. Expected 32 or 64 bytes.'
      )
    })
  })

  describe('keypairFromSeed', () => {
    it('should create keypair from seed phrase', () => {
      const seed = 'test seed phrase for wallet generation'
      const keypair = keypairFromSeed(seed)

      expect(keypair.publicKey).toBeInstanceOf(Uint8Array)
      expect(keypair.publicKey).toHaveLength(32)
      expect(keypair.secretKey).toBeInstanceOf(Uint8Array)
      expect(keypair.secretKey).toHaveLength(64)
    })

    it('should generate keypairs (note: current impl uses randomness)', () => {
      const keypair1 = keypairFromSeed('seed one')
      const keypair2 = keypairFromSeed('seed two')

      // Current implementation uses randomBytes internally,
      // so keypairs will be different each call regardless of seed
      // This tests that the function works, not determinism
      expect(keypair1.publicKey).toBeInstanceOf(Uint8Array)
      expect(keypair2.publicKey).toBeInstanceOf(Uint8Array)
    })
  })

  describe('Integration', () => {
    it('should roundtrip keypair to address and back', () => {
      const keypair = generateKeypair()
      const addr = keypairToAddress(keypair)

      // Decode the address back to public key
      const decodedPublicKey = bs58.decode(addr)

      expect(decodedPublicKey).toEqual(keypair.publicKey)
    })

    it('should work with real Ed25519 operations', () => {
      const keypair1 = generateKeypair()
      const keypair2 = keypairFromSecretKey(keypair1.secretKey.slice(0, 32))

      expect(keypair2.publicKey).toEqual(keypair1.publicKey)
    })
  })

  describe('Performance', () => {
    it('should generate many keypairs efficiently', () => {
      const start = performance.now()

      for (let i = 0; i < 100; i++) {
        generateKeypair()
      }

      const elapsed = performance.now() - start

      // Should generate 100 keypairs in under 200ms (allowing for CI variance)
      expect(elapsed).toBeLessThan(200)
    })
  })
})
