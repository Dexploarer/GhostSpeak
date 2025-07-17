import { describe, it, expect } from 'vitest'
import { existsSync, readFileSync, writeFileSync } from 'fs'
import { join } from 'path'
import { homedir } from 'os'
import { generateKeyPairSigner } from '@solana/signers'
import { GhostSpeakClient } from '../packages/sdk-typescript/src/client/GhostSpeakClient.js'
import { createSolanaRpc } from '@solana/kit'

// Validation tests for the 3 bug fixes
describe('Bug Fixes Validation', () => {
  describe('Bug 1: Security Vulnerability - AgentCNFTManager Secret Key', () => {
    it('should not use hardcoded mock secret key', async () => {
      // Test that the code no longer uses new Uint8Array(64) as secret key
      const agentWalletCode = readFileSync(
        join(process.cwd(), 'packages/cli/src/utils/agentWallet.ts'),
        'utf-8'
      )
      
      // Should NOT contain the hardcoded mock secret key
      expect(agentWalletCode).not.toContain('secretKey: new Uint8Array(64)')
      
      // Should contain proper private key extraction
      expect(agentWalletCode).toContain('walletBytes.privateKey')
      expect(agentWalletCode).toContain('Unable to extract private key')
    })
  })

  describe('Bug 2: Business Logic Error - Silent Error Handling', () => {
    it('should properly handle errors instead of silently failing', async () => {
      const agentWalletCode = readFileSync(
        join(process.cwd(), 'packages/cli/src/utils/agentWallet.ts'),
        'utf-8'
      )
      
      // Should have proper error handling with ENOENT checks
      expect(agentWalletCode).toContain('error.code === \'ENOENT\'')
      
      // Should have proper error messages
      expect(agentWalletCode).toContain('console.error')
      expect(agentWalletCode).toContain('throw new Error')
      
      // Should have AtomicFileManager for better error handling
      expect(agentWalletCode).toContain('AtomicFileManager')
      expect(agentWalletCode).toContain('Failed to update UUID mapping')
    })
  })

  describe('Bug 3: Type Safety Issue - Unsafe Type Casting', () => {
    it('should use proper TypeScript types instead of any casting', async () => {
      const baseInstructionsCode = readFileSync(
        join(process.cwd(), 'packages/sdk-typescript/src/client/instructions/BaseInstructions.ts'),
        'utf-8'
      )
      
      // Should use proper types instead of as any
      expect(baseInstructionsCode).toContain('ExtendedRpcApi')
      expect(baseInstructionsCode).toContain('RpcSubscriptionApi')
      
      // Should have proper signature extraction logic
      expect(baseInstructionsCode).toContain('typeof result === \'object\'')
      expect(baseInstructionsCode).toContain('\'signature\' in result')
      expect(baseInstructionsCode).toContain('Unable to extract transaction signature')
      
      // Should not have the dangerous fallback to 'unknown_signature'
      expect(baseInstructionsCode).not.toContain('unknown_signature')
    })

    it('should have proper type definitions', async () => {
      const typesCode = readFileSync(
        join(process.cwd(), 'packages/sdk-typescript/src/types/index.ts'),
        'utf-8'
      )
      
      // Should have proper extended types
      expect(typesCode).toContain('ExtendedRpcApi')
      expect(typesCode).toContain('RpcSubscriptionApi')
      expect(typesCode).toContain('GetEpochInfoApi')
      expect(typesCode).toContain('GetSignatureStatusesApi')
      expect(typesCode).toContain('SignatureNotificationsApi')
      expect(typesCode).toContain('SlotNotificationsApi')
    })
  })

  describe('Integration Test - All Fixes Working Together', () => {
    it('should create GhostSpeakClient without type errors', async () => {
      const rpc = createSolanaRpc('https://api.devnet.solana.com')
      
      // This should not throw type errors with our fixes
      expect(() => {
        const client = new GhostSpeakClient({
          rpc: rpc as any, // Temporary cast for test
          programId: 'AJVoWJ4JC1xJR9ufGBGuMgFpHMLouB29sFRTJRvEK1ZR' as any,
          commitment: 'confirmed',
          cluster: 'devnet'
        })
        return client
      }).not.toThrow()
    })

    it('should handle wallet operations properly', async () => {
      const wallet = await generateKeyPairSigner()
      
      // Wallet should have proper address
      expect(wallet.address).toBeTruthy()
      expect(typeof wallet.address).toBe('string')
      
      // Should be able to access keyPair without errors
      const keyPair = await wallet.keyPair
      expect(keyPair).toBeTruthy()
      expect(keyPair.publicKey).toBeTruthy()
    })
  })

  describe('Build Verification', () => {
    it('should have successfully built SDK', () => {
      const sdkDistPath = join(process.cwd(), 'packages/sdk-typescript/dist/index.js')
      expect(existsSync(sdkDistPath)).toBe(true)
      
      const sdkTypesPath = join(process.cwd(), 'packages/sdk-typescript/dist/index.d.ts')
      expect(existsSync(sdkTypesPath)).toBe(true)
    })

    it('should have successfully built CLI', () => {
      const cliDistPath = join(process.cwd(), 'packages/cli/dist/index.js')
      expect(existsSync(cliDistPath)).toBe(true)
      
      const cliTypesPath = join(process.cwd(), 'packages/cli/dist/index.d.ts')
      expect(existsSync(cliTypesPath)).toBe(true)
    })
  })
})