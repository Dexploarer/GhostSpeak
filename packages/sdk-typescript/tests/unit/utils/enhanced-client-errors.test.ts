import { describe, it, expect, vi, beforeEach } from 'vitest'
import { address } from '@solana/addresses'
import {
  GhostSpeakSDKError,
  withEnhancedErrors,
  withEnhancedErrorsSync,
  enhanceTransactionError,
  logEnhancedError,
  createErrorContext,
  validatePreconditions,
  extractInstructionName,
  getWorkOrderErrorMessage,
  type AccountContext
} from '../../../src/utils/enhanced-client-errors'

// Mock the instruction-error-handler module
vi.mock('../../../src/utils/instruction-error-handler', () => ({
  enhanceErrorMessage: vi.fn((error: Error, instruction: string) => {
    return `Enhanced: ${error.message} (Instruction: ${instruction})`
  }),
  debugInstructionCall: vi.fn()
}))

describe('Enhanced Client Errors', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('GhostSpeakSDKError', () => {
    it('should create enhanced error with operation and instruction name', () => {
      const originalError = new Error('Original error message')
      const error = new GhostSpeakSDKError('createAgent', originalError, 'register_agent')
      
      expect(error.name).toBe('GhostSpeakSDKError')
      expect(error.operation).toBe('createAgent')
      expect(error.instructionName).toBe('register_agent')
      expect(error.originalError).toBe(originalError)
      expect(error.message).toContain('Original error message')
    })

    it('should handle missing instruction name', () => {
      const originalError = new Error('Test error')
      const error = new GhostSpeakSDKError('unknownOp', originalError)
      
      expect(error.instructionName).toBeUndefined()
      expect(error.message).toContain('Test error')
    })
  })

  describe('withEnhancedErrors', () => {
    it('should return successful result without modification', async () => {
      const result = await withEnhancedErrors(
        'testOperation',
        'TestInstruction',
        async () => 'success'
      )
      
      expect(result).toBe('success')
    })

    it('should enhance errors from async operations', async () => {
      const originalError = new Error('Async operation failed')
      
      await expect(
        withEnhancedErrors(
          'asyncOp',
          'AsyncInstruction',
          async () => {
            throw originalError
          }
        )
      ).rejects.toThrow(GhostSpeakSDKError)
    })

    it('should debug accounts when provided', async () => {
      const { debugInstructionCall } = await import('../../../src/utils/instruction-error-handler')
      const accounts: AccountContext[] = [
        address('11111111111111111111111111111112'),
        { address: address('7Lz7fJenQxMdh1u4SxbJFSRXMET38qLPJwXCeJP4F3gJ'), name: 'userAccount' }
      ]
      
      await withEnhancedErrors(
        'debugOp',
        'DebugInstruction',
        async () => 'result',
        accounts
      )
      
      expect(debugInstructionCall).toHaveBeenCalledWith('DebugInstruction', accounts)
    })

    it('should rethrow non-Error objects', async () => {
      await expect(
        withEnhancedErrors(
          'throwString',
          'StringInstruction',
          async () => {
            throw 'string error'
          }
        )
      ).rejects.toBe('string error')
    })
  })

  describe('withEnhancedErrorsSync', () => {
    it('should return successful result without modification', () => {
      const result = withEnhancedErrorsSync(
        'syncOp',
        'SyncInstruction',
        () => 42
      )
      
      expect(result).toBe(42)
    })

    it('should enhance errors from sync operations', () => {
      const originalError = new Error('Sync operation failed')
      
      expect(() => 
        withEnhancedErrorsSync(
          'syncOp',
          'SyncInstruction',
          () => {
            throw originalError
          }
        )
      ).toThrow(GhostSpeakSDKError)
    })

    it('should debug accounts when provided', async () => {
      const { debugInstructionCall } = await import('../../../src/utils/instruction-error-handler')
      const accounts: AccountContext[] = [
        address('JQ4xZgWno1tmWkKFgER5XSrXpWzwmsU9ov7Vf8CsBkk')
      ]
      
      withEnhancedErrorsSync(
        'debugSyncOp',
        'DebugSyncInstruction',
        () => 'result',
        accounts
      )
      
      expect(debugInstructionCall).toHaveBeenCalledWith('DebugSyncInstruction', accounts)
    })
  })

  describe('enhanceTransactionError', () => {
    it('should enhance custom program errors', () => {
      const error = new Error('Transaction failed: custom program error: 0x1')
      const enhanced = enhanceTransactionError(error, 'register_agent')
      
      expect(enhanced.message).toContain('custom program error')
      expect(enhanced.message).toContain('Instruction: register_agent')
    })

    it('should add account debug info when provided', () => {
      const error = new Error('custom program error: 0x2')
      const accounts: AccountContext[] = [
        address('Eo5YjSLkByekuDPMfRx3zG4NJW5CNDg3peG9tNZdMX9G'),
        address('4QpXfd2jVkXLbLiN3T2CMhLPmuVmh7FMZW5cRdvs9xGi')
      ]
      
      const enhanced = enhanceTransactionError(error, 'update_agent', accounts)
      
      expect(enhanced.message).toContain('Accounts provided: 2')
    })

    it('should handle insufficient funds errors', () => {
      const error = new Error('insufficient funds for transaction')
      const enhanced = enhanceTransactionError(error)
      
      expect(enhanced.message).toContain('insufficient')
    })

    it('should handle account not found errors', () => {
      const error = new Error('account does not exist')
      const enhanced = enhanceTransactionError(error, 'get_agent')
      
      expect(enhanced.message).toContain('account')
    })

    it('should handle signer errors', () => {
      const error = new Error('missing required signer')
      const enhanced = enhanceTransactionError(error, 'transfer_funds')
      
      expect(enhanced.message).toContain('signer')
    })

    it('should handle writable errors', () => {
      const error = new Error('account is not writable')
      const enhanced = enhanceTransactionError(error, 'update_data')
      
      expect(enhanced.message).toContain('writable')
    })

    it('should preserve original error for unknown patterns', () => {
      const error = new Error('Unknown error type')
      const enhanced = enhanceTransactionError(error)
      
      expect(enhanced).toBe(error)
    })
  })

  describe('logEnhancedError', () => {
    it('should log error with full context', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      const error = new Error('Test error')
      const context = {
        operation: 'testOp',
        instructionName: 'test_instruction',
        accounts: [
          address('11111111111111111111111111111112'),
          { address: address('2wrHjvDj7rPo2yqBbyUGgFdNyoRbzJLZqfeBkFvdkAJg'), name: 'escrow' }
        ],
        params: { amount: 1000 }
      }
      
      logEnhancedError(error, context)
      
      expect(consoleSpy).toHaveBeenCalledWith('🚨 GhostSpeak SDK Error:', 'Test error')
      expect(consoleSpy).toHaveBeenCalledWith('🔧 Operation:', 'testOp')
      expect(consoleSpy).toHaveBeenCalledWith('📋 Instruction:', 'test_instruction')
      expect(consoleSpy).toHaveBeenCalledWith('🏦 Accounts provided:', 2)
      expect(consoleSpy).toHaveBeenCalledWith('⚙️ Parameters:', { amount: 1000 })
      
      consoleSpy.mockRestore()
    })

    it('should handle minimal context', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      const error = new Error('Minimal error')
      
      logEnhancedError(error)
      
      expect(consoleSpy).toHaveBeenCalledWith('🚨 GhostSpeak SDK Error:', 'Minimal error')
      expect(consoleSpy).toHaveBeenCalledWith('\n💡 Troubleshooting tips:')
      
      consoleSpy.mockRestore()
    })

    it('should handle string accounts', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      const error = new Error('Test')
      const context = {
        accounts: ['11111111111111111111111111111111' as any]
      }
      
      logEnhancedError(error, context)
      
      expect(consoleSpy).toHaveBeenCalledWith('  1. 11111111111111111111111111111111')
      
      consoleSpy.mockRestore()
    })
  })

  describe('createErrorContext', () => {
    it('should create error context object', () => {
      const context = createErrorContext(
        'testOperation',
        'test_instruction',
        [address('11111111111111111111111111111112')],
        { amount: 1000 }
      )
      
      expect(context).toEqual({
        operation: 'testOperation',
        instructionName: 'test_instruction',
        accounts: [address('11111111111111111111111111111112')],
        params: { amount: 1000 }
      })
    })

    it('should handle partial context', () => {
      const context = createErrorContext('testOp')
      
      expect(context).toEqual({
        operation: 'testOp',
        instructionName: undefined,
        accounts: undefined,
        params: undefined
      })
    })
  })

  describe('validatePreconditions', () => {
    it('should pass when all conditions are true', () => {
      const checks = [
        { condition: true, message: 'Check 1 failed' },
        { condition: true, message: 'Check 2 failed' }
      ]
      
      expect(() => validatePreconditions(checks)).not.toThrow()
    })

    it('should throw enhanced error when condition fails', () => {
      const checks = [
        { condition: true, message: 'Check 1 failed' },
        { condition: false, message: 'Invalid account balance', instructionName: 'transfer' }
      ]
      
      expect(() => validatePreconditions(checks)).toThrow('Invalid account balance')
    })

    it('should check conditions in order', () => {
      const checks = [
        { condition: false, message: 'First check failed' },
        { condition: false, message: 'Second check failed' }
      ]
      
      expect(() => validatePreconditions(checks)).toThrow('First check failed')
    })
  })

  describe('extractInstructionName', () => {
    it('should extract instruction names from snake_case operations', () => {
      expect(extractInstructionName('register_agent')).toBe('register_agent')
      expect(extractInstructionName('create_service_listing')).toBe('create_service_listing')
      expect(extractInstructionName('complete_escrow')).toBe('complete_escrow')
    })

    it('should extract instruction names from camelCase operations', () => {
      expect(extractInstructionName('registerAgent')).toBe('register_agent')
      expect(extractInstructionName('createServiceListing')).toBe('create_service_listing')
      expect(extractInstructionName('completeEscrow')).toBe('complete_escrow')
    })

    it('should return undefined for unknown operations', () => {
      expect(extractInstructionName('unknownOperation')).toBeUndefined()
      expect(extractInstructionName('random_function')).toBeUndefined()
    })
  })

  describe('getWorkOrderErrorMessage', () => {
    it('should return specific error for verify_work_delivery', () => {
      const message = getWorkOrderErrorMessage('verify_work_delivery', 2)
      expect(message).toContain('Work delivery verification requires 4 accounts')
      expect(message).toContain('Only 2 provided')
    })

    it('should return specific error for submit_work_delivery', () => {
      const message = getWorkOrderErrorMessage('submit_work_delivery', 3)
      expect(message).toContain('Work delivery submission requires 5 accounts')
      expect(message).toContain('Only 3 provided')
    })

    it('should return specific error for reject_work_delivery', () => {
      const message = getWorkOrderErrorMessage('reject_work_delivery', 2)
      expect(message).toContain('Work delivery rejection requires 4 accounts')
      expect(message).toContain('Only 2 provided')
    })

    it('should return specific error for create_work_order', () => {
      const message = getWorkOrderErrorMessage('create_work_order', 2)
      expect(message).toContain('Work order creation requires at least 3 accounts')
      expect(message).toContain('Only 2 provided')
    })

    it('should handle sufficient accounts', () => {
      const message = getWorkOrderErrorMessage('verify_work_delivery', 5)
      expect(message).toContain('invalid account configuration')
      expect(message).not.toContain('Only')
    })

    it('should handle unknown instructions', () => {
      const message = getWorkOrderErrorMessage('unknown_instruction', 3)
      expect(message).toBe('Instruction unknown_instruction failed with 3 accounts provided.')
    })
  })
})