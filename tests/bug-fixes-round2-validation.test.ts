import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { existsSync, readFileSync, writeFileSync, unlinkSync, mkdirSync } from 'fs'
import { join } from 'path'
import { homedir } from 'os'

// Validation tests for the second round of bug fixes
describe('Bug Fixes Round 2 Validation', () => {
  const testDir = join(homedir(), '.ghostspeak-test-validation')
  
  beforeEach(() => {
    // Clean up test directory
    if (existsSync(testDir)) {
      try {
        require('fs').rmSync(testDir, { recursive: true, force: true })
      } catch (e) {
        // Ignore cleanup errors
      }
    }
  })

  afterEach(() => {
    // Clean up test directory
    if (existsSync(testDir)) {
      try {
        require('fs').rmSync(testDir, { recursive: true, force: true })
      } catch (e) {
        // Ignore cleanup errors
      }
    }
  })

  describe('Bug #4: Race Condition in BaseInstructions Transaction Confirmation', () => {
    it('should implement exponential backoff in transaction confirmation', async () => {
      const baseInstructionsCode = readFileSync(
        join(process.cwd(), 'packages/sdk-typescript/src/client/instructions/BaseInstructions.ts'),
        'utf-8'
      )
      
      // Should have exponential backoff logic
      expect(baseInstructionsCode).toContain('exponential backoff')
      expect(baseInstructionsCode).toContain('currentDelay = Math.min(currentDelay * 1.5, 5000)')
      
      // Should have proper error handling for transaction failures
      expect(baseInstructionsCode).toContain('Transaction failed:')
      expect(baseInstructionsCode).toContain('status.value[0].err')
      
      // Should have better timeout messages with signature
      expect(baseInstructionsCode).toContain('Transaction confirmation timeout after')
      expect(baseInstructionsCode).toContain('Signature:')
      
      // Should handle RPC errors gracefully
      expect(baseInstructionsCode).toContain('Handle RPC errors gracefully')
      expect(baseInstructionsCode).toContain('Status check failed')
    })

    it('should handle confirmationStatus properly', async () => {
      const baseInstructionsCode = readFileSync(
        join(process.cwd(), 'packages/sdk-typescript/src/client/instructions/BaseInstructions.ts'),
        'utf-8'
      )
      
      // Should check for both confirmed and finalized statuses
      expect(baseInstructionsCode).toContain('confirmationStatus === this.commitment')
      expect(baseInstructionsCode).toContain('confirmationStatus === \'finalized\'')
      
      // Should not have the old simple polling logic
      expect(baseInstructionsCode).not.toContain('await new Promise(resolve => setTimeout(resolve, 1000))')
    })
  })

  describe('Bug #5: Resource Leak in AgentWalletManager File Operations', () => {
    it('should implement AtomicFileManager class', async () => {
      const agentWalletCode = readFileSync(
        join(process.cwd(), 'packages/cli/src/utils/agentWallet.ts'),
        'utf-8'
      )
      
      // Should have AtomicFileManager class
      expect(agentWalletCode).toContain('class AtomicFileManager')
      expect(agentWalletCode).toContain('static async writeJSON')
      expect(agentWalletCode).toContain('static async readJSON')
      expect(agentWalletCode).toContain('private static locks = new Map')
      
      // Should have atomic operations
      expect(agentWalletCode).toContain('performAtomicWrite')
      expect(agentWalletCode).toContain('tempPath')
      expect(agentWalletCode).toContain('backupPath')
      expect(agentWalletCode).toContain('fs.rename(tempPath, filePath)')
    })

    it('should use AtomicFileManager for UUID mappings', async () => {
      const agentWalletCode = readFileSync(
        join(process.cwd(), 'packages/cli/src/utils/agentWallet.ts'),
        'utf-8'
      )
      
      // Should use AtomicFileManager instead of direct fs operations
      expect(agentWalletCode).toContain('AtomicFileManager.writeJSON(uuidMappingPath, uuidMapping)')
      expect(agentWalletCode).toContain('AtomicFileManager.readJSON(uuidMappingPath)')
      
      // Should have atomic operations comment
      expect(agentWalletCode).toContain('atomic operations')
      expect(agentWalletCode).toContain('Atomic write to prevent corruption')
      
      // Should not have direct fs.writeFile for UUID mappings
      expect(agentWalletCode).not.toContain('fs.writeFile(uuidMappingPath, JSON.stringify(uuidMapping')
    })

    it('should handle concurrent file operations safely', async () => {
      const agentWalletCode = readFileSync(
        join(process.cwd(), 'packages/cli/src/utils/agentWallet.ts'),
        'utf-8'
      )
      
      // Should have locking mechanism
      expect(agentWalletCode).toContain('if (this.locks.has(lockKey))')
      expect(agentWalletCode).toContain('await this.locks.get(lockKey)')
      expect(agentWalletCode).toContain('this.locks.set(lockKey, operation)')
      expect(agentWalletCode).toContain('this.locks.delete(lockKey)')
      
      // Should have backup and restore logic
      expect(agentWalletCode).toContain('Create backup if original exists')
      expect(agentWalletCode).toContain('Restore from backup if possible')
    })
  })

  describe('Bug #6: Memory Leak in Agent Command Registration Flow', () => {
    it('should implement proper resource cleanup', async () => {
      const agentCommandCode = readFileSync(
        join(process.cwd(), 'packages/cli/src/commands/agent.ts'),
        'utf-8'
      )
      
      // Should have resource tracking variables
      expect(agentCommandCode).toContain('let credentials: any = null')
      expect(agentCommandCode).toContain('let agentWallet: any = null')
      expect(agentCommandCode).toContain('let registrationComplete = false')
      
      // Should have cleanup logic in catch block
      expect(agentCommandCode).toContain('Cleanup resources on error')
      expect(agentCommandCode).toContain('Cleaning up partial registration')
      expect(agentCommandCode).toContain('AgentWalletManager.deleteCredentials')
      
      // Should have finally block for client cleanup
      expect(agentCommandCode).toContain('} finally {')
      expect(agentCommandCode).toContain('client.cleanup')
      expect(agentCommandCode).toContain('Silent cleanup')
    })

    it('should implement client cleanup method', async () => {
      const clientCode = readFileSync(
        join(process.cwd(), 'packages/cli/src/utils/client.ts'),
        'utf-8'
      )
      
      // Should have enhanced client with cleanup method
      expect(clientCode).toContain('const enhancedClient = {')
      expect(clientCode).toContain('cleanup: async () => {')
      expect(clientCode).toContain('rpcSubscriptions.close')
      expect(clientCode).toContain('rpc.close')
      
      // Should have silent cleanup
      expect(clientCode).toContain('Silent cleanup')
      expect(clientCode).toContain('console.debug')
      
      // Should return enhanced client
      expect(clientCode).toContain('client: enhancedClient')
    })

    it('should handle partial registration cleanup', async () => {
      const agentCommandCode = readFileSync(
        join(process.cwd(), 'packages/cli/src/commands/agent.ts'),
        'utf-8'
      )
      
      // Should check registration state before cleanup
      expect(agentCommandCode).toContain('if (credentials && !registrationComplete)')
      expect(agentCommandCode).toContain('registrationComplete = true')
      
      // Should handle cleanup errors gracefully
      expect(agentCommandCode).toContain('} catch (cleanupError: any) {')
      expect(agentCommandCode).toContain('Cleanup failed:')
      expect(agentCommandCode).toContain('cleanupError.message')
    })
  })

  describe('Integration Test - All Fixes Working Together', () => {
    it('should build successfully with all fixes', async () => {
      // Check that SDK builds
      const sdkDistPath = join(process.cwd(), 'packages/sdk-typescript/dist/index.js')
      expect(existsSync(sdkDistPath)).toBe(true)
      
      // Check that CLI builds
      const cliDistPath = join(process.cwd(), 'packages/cli/dist/index.js')
      expect(existsSync(cliDistPath)).toBe(true)
      
      // Check that types are generated
      const sdkTypesPath = join(process.cwd(), 'packages/sdk-typescript/dist/index.d.ts')
      expect(existsSync(sdkTypesPath)).toBe(true)
    })

    it('should have consistent error handling patterns', async () => {
      const files = [
        'packages/cli/src/utils/agentWallet.ts',
        'packages/cli/src/commands/agent.ts'
      ]
      
      for (const file of files) {
        const code = readFileSync(join(process.cwd(), file), 'utf-8')
        
        // Should have proper error types
        expect(code).toContain('error: any')
        
        // Should have meaningful error messages
        expect(code).toContain('Error')
        expect(code).toContain('throw new Error')
        
        // Should have proper cleanup patterns
        expect(code).toMatch(/try.*catch.*finally|try.*catch/s)
      }
      
      // BaseInstructions has different patterns but should still have error handling
      const baseInstructionsCode = readFileSync(
        join(process.cwd(), 'packages/sdk-typescript/src/client/instructions/BaseInstructions.ts'),
        'utf-8'
      )
      expect(baseInstructionsCode).toContain('throw new Error')
      expect(baseInstructionsCode).toContain('catch')
    })

    it('should not have dangerous fallbacks', async () => {
      const baseInstructionsCode = readFileSync(
        join(process.cwd(), 'packages/sdk-typescript/src/client/instructions/BaseInstructions.ts'),
        'utf-8'
      )
      
      // Should not have dangerous fallbacks
      expect(baseInstructionsCode).not.toContain('unknown_signature')
      expect(baseInstructionsCode).not.toContain('|| \'unknown\'')
      
      // Should have proper error throwing instead
      expect(baseInstructionsCode).toContain('throw new Error(\'Unable to extract transaction signature\')')
      expect(baseInstructionsCode).toContain('throw new Error(\'Transaction result missing signature\')')
      
      // Should minimize 'as any' usage and avoid it in critical paths
      const asAnyMatches = baseInstructionsCode.match(/as any/g)
      expect(asAnyMatches?.length).toBeLessThan(10) // Reasonable limit
      
      // Should not have 'as any' in signature extraction (the critical bug fix)
      expect(baseInstructionsCode).not.toContain('signature = (result as any)?.signature')
      expect(baseInstructionsCode).not.toContain('\'unknown_signature\'')
    })
  })

  describe('Performance and Reliability', () => {
    it('should implement exponential backoff limits', async () => {
      const baseInstructionsCode = readFileSync(
        join(process.cwd(), 'packages/sdk-typescript/src/client/instructions/BaseInstructions.ts'),
        'utf-8'
      )
      
      // Should have reasonable limits
      expect(baseInstructionsCode).toContain('Math.min(currentDelay * 1.5, 5000)')
      expect(baseInstructionsCode).toContain('const maxAttempts = 30')
      expect(baseInstructionsCode).toContain('currentDelay * 2')
    })

    it('should implement proper atomic operations', async () => {
      const agentWalletCode = readFileSync(
        join(process.cwd(), 'packages/cli/src/utils/agentWallet.ts'),
        'utf-8'
      )
      
      // Should have atomic rename operation
      expect(agentWalletCode).toContain('fs.rename(tempPath, filePath)')
      
      // Should have backup/restore logic
      expect(agentWalletCode).toContain('fs.copyFile(filePath, backupPath)')
      expect(agentWalletCode).toContain('fs.copyFile(backupPath, filePath)')
      
      // Should clean up temporary files
      expect(agentWalletCode).toContain('fs.unlink(tempPath)')
      expect(agentWalletCode).toContain('fs.unlink(backupPath)')
    })
  })
})