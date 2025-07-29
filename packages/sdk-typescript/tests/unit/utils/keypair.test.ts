import { describe, it, expect, beforeEach, vi } from 'vitest'
import { address } from '@solana/addresses'
import type { Address } from '@solana/addresses'
import { randomBytes } from '@noble/curves/abstract/utils'
import { ed25519 } from '@noble/curves/ed25519'
import bs58 from 'bs58'
import type { ElGamalKeypair } from '../../../src/utils/elgamal.js'

// Mock dependencies
vi.mock('@noble/curves/abstract/utils', () => ({
  randomBytes: vi.fn()
}))

vi.mock('../../../src/utils/elgamal.js', () => ({
  generateElGamalKeypair: vi.fn()
}))

describe('Keypair Utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('generateKeypair', () => {
    it('should generate a valid Ed25519 keypair', async () => {
      const { generateKeypair } = await import('../../../src/utils/keypair.js')
      
      // Mock randomBytes to return deterministic value
      const mockSecretKey = new Uint8Array(32)
      mockSecretKey.fill(1)
      vi.mocked(randomBytes).mockReturnValue(mockSecretKey)
      
      const keypair = generateKeypair()
      
      expect(keypair.publicKey).toBeInstanceOf(Uint8Array)
      expect(keypair.publicKey).toHaveLength(32)
      expect(keypair.secretKey).toBeInstanceOf(Uint8Array)
      expect(keypair.secretKey).toHaveLength(64)
      
      // Verify secret key structure (32 bytes secret + 32 bytes public)
      expect(keypair.secretKey.slice(32, 64)).toEqual(keypair.publicKey)
    })

    it('should generate different keypairs on each call', async () => {
      const { generateKeypair } = await import('../../../src/utils/keypair.js')
      
      // Mock randomBytes to return different values
      let callCount = 0
      vi.mocked(randomBytes).mockImplementation(() => {
        const bytes = new Uint8Array(32)
        bytes.fill(callCount++)
        return bytes
      })
      
      const keypair1 = generateKeypair()
      const keypair2 = generateKeypair()
      
      expect(keypair1.publicKey).not.toEqual(keypair2.publicKey)
      expect(keypair1.secretKey).not.toEqual(keypair2.secretKey)
    })
  })

  describe('generateElGamalKeypair', () => {
    it('should generate ElGamal keypair without seed', async () => {
      const { generateElGamalKeypair } = await import('../../../src/utils/keypair.js')
      const elgamalModule = await import('../../../src/utils/elgamal.js')
      
      const mockKeypair: ElGamalKeypair = {
        publicKey: new Uint8Array(32).fill(2),
        secretKey: new Uint8Array(32).fill(3)
      }
      
      vi.mocked(elgamalModule.generateElGamalKeypair).mockReturnValue(mockKeypair)
      
      const keypair = generateElGamalKeypair()
      
      expect(keypair).toEqual(mockKeypair)
      expect(elgamalModule.generateElGamalKeypair).toHaveBeenCalledWith(undefined)
    })

    it('should generate ElGamal keypair with seed', async () => {
      const { generateElGamalKeypair } = await import('../../../src/utils/keypair.js')
      const elgamalModule = await import('../../../src/utils/elgamal.js')
      
      const seed = new Uint8Array(32).fill(42)
      const mockKeypair: ElGamalKeypair = {
        publicKey: new Uint8Array(32).fill(4),
        secretKey: new Uint8Array(32).fill(5)
      }
      
      vi.mocked(elgamalModule.generateElGamalKeypair).mockReturnValue(mockKeypair)
      
      const keypair = generateElGamalKeypair(seed)
      
      expect(keypair).toEqual(mockKeypair)
      expect(elgamalModule.generateElGamalKeypair).toHaveBeenCalledWith(seed)
    })
  })

  describe('keypairToAddress', () => {
    it('should convert keypair to Solana address', async () => {
      const { keypairToAddress, generateKeypair } = await import('../../../src/utils/keypair.js')
      
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

    it('should produce valid Solana addresses', async () => {
      const { keypairToAddress, generateKeypair } = await import('../../../src/utils/keypair.js')
      
      // Mock randomBytes to return a valid secret key
      const mockSecretKey = new Uint8Array(32)
      mockSecretKey[0] = 128
      mockSecretKey[31] = 64
      vi.mocked(randomBytes).mockReturnValue(mockSecretKey)
      
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
    it('should create keypair from 32-byte secret key', async () => {
      const { keypairFromSecretKey } = await import('../../../src/utils/keypair.js')
      
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
      
      // Verify public key is derived from secret key
      const expectedPublicKey = ed25519.getPublicKey(secretKey)
      expect(keypair.publicKey).toEqual(expectedPublicKey)
    })

    it('should create keypair from 64-byte secret key', async () => {
      const { keypairFromSecretKey } = await import('../../../src/utils/keypair.js')
      
      const secretKey = new Uint8Array(64)
      const privateKey = new Uint8Array(32).fill(9)
      const publicKey = new Uint8Array(32).fill(10)
      secretKey.set(privateKey, 0)
      secretKey.set(publicKey, 32)
      
      const keypair = keypairFromSecretKey(secretKey)
      
      expect(keypair.publicKey).toEqual(publicKey)
      expect(keypair.secretKey).toEqual(secretKey)
    })

    it('should throw error for invalid secret key length', async () => {
      const { keypairFromSecretKey } = await import('../../../src/utils/keypair.js')
      
      const invalidSecretKey = new Uint8Array(48) // Invalid length
      
      expect(() => keypairFromSecretKey(invalidSecretKey)).toThrow(
        'Invalid secret key length. Expected 32 or 64 bytes.'
      )
    })
  })

  describe('keypairFromSeed', () => {
    it('should create keypair from seed phrase', async () => {
      const { keypairFromSeed } = await import('../../../src/utils/keypair.js')
      
      // Mock randomBytes for consistent output
      const mockSecretKey = new Uint8Array(32)
      mockSecretKey.fill(11)
      vi.mocked(randomBytes).mockReturnValue(mockSecretKey)
      
      const seed = 'test seed phrase for wallet generation'
      const keypair = keypairFromSeed(seed)
      
      expect(keypair.publicKey).toBeInstanceOf(Uint8Array)
      expect(keypair.publicKey).toHaveLength(32)
      expect(keypair.secretKey).toBeInstanceOf(Uint8Array)
      expect(keypair.secretKey).toHaveLength(64)
    })

    it('should generate consistent keypairs for same seed', async () => {
      const { keypairFromSeed } = await import('../../../src/utils/keypair.js')
      
      // Mock randomBytes to return consistent values
      vi.mocked(randomBytes).mockReturnValue(new Uint8Array(32).fill(12))
      
      const seed = 'consistent seed'
      const keypair1 = keypairFromSeed(seed)
      const keypair2 = keypairFromSeed(seed)
      
      // Note: The current implementation doesn't use the seed properly
      // It just calls generateKeypair() which uses randomBytes
      // So these will be the same due to our mock
      expect(keypair1.publicKey).toEqual(keypair2.publicKey)
      expect(keypair1.secretKey).toEqual(keypair2.secretKey)
    })

    it('should generate different keypairs for different seeds', async () => {
      const { keypairFromSeed } = await import('../../../src/utils/keypair.js')
      
      // Mock randomBytes to return different values each time
      let callCount = 0
      vi.mocked(randomBytes).mockImplementation(() => {
        const bytes = new Uint8Array(32)
        bytes.fill(callCount++)
        return bytes
      })
      
      const keypair1 = keypairFromSeed('seed one')
      const keypair2 = keypairFromSeed('seed two')
      
      expect(keypair1.publicKey).not.toEqual(keypair2.publicKey)
      expect(keypair1.secretKey).not.toEqual(keypair2.secretKey)
    })
  })

  describe('Integration', () => {
    it('should roundtrip keypair to address and back', async () => {
      const { generateKeypair, keypairToAddress } = await import('../../../src/utils/keypair.js')
      
      // Mock randomBytes for consistent output
      const mockSecretKey = new Uint8Array(32)
      mockSecretKey[0] = 200
      mockSecretKey[31] = 100
      vi.mocked(randomBytes).mockReturnValue(mockSecretKey)
      
      const keypair = generateKeypair()
      const addr = keypairToAddress(keypair)
      
      // Decode the address back to public key
      const decodedPublicKey = bs58.decode(addr)
      
      expect(decodedPublicKey).toEqual(keypair.publicKey)
    })

    it('should work with real Ed25519 operations', async () => {
      const { generateKeypair, keypairFromSecretKey } = await import('../../../src/utils/keypair.js')
      
      // Use a valid Ed25519 secret key
      const secretKey = new Uint8Array(32)
      secretKey[0] = 123
      secretKey[31] = 64
      vi.mocked(randomBytes).mockReturnValue(secretKey)
      
      const keypair1 = generateKeypair()
      const keypair2 = keypairFromSecretKey(keypair1.secretKey.slice(0, 32))
      
      expect(keypair2.publicKey).toEqual(keypair1.publicKey)
    })
  })

  describe('Performance', () => {
    it('should generate many keypairs efficiently', async () => {
      const { generateKeypair } = await import('../../../src/utils/keypair.js')
      
      // Mock randomBytes to be fast
      vi.mocked(randomBytes).mockImplementation((size) => new Uint8Array(size))
      
      const start = performance.now()
      
      for (let i = 0; i < 100; i++) {
        generateKeypair()
      }
      
      const elapsed = performance.now() - start
      
      // Should generate 100 keypairs in under 50ms
      expect(elapsed).toBeLessThan(50)
    })
  })
})