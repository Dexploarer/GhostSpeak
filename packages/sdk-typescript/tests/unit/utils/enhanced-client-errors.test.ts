import { describe, it, expect, vi, beforeEach } from 'vitest'
import { address } from '@solana/addresses'
import {
  GhostSpeakSDKError,
  withEnhancedErrors,
  withEnhancedErrorsSync,
  enhanceTransactionError,
  formatAccountContext,
  createInstructionError,
  isInstructionError,
  extractErrorCode,
  formatErrorForUser,
  getErrorCategory,
  shouldRetryOperation,
  getRetryDelay,
  logStructuredError,
  ErrorCategory,
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
      const error = new GhostSpeakSDKError('createAgent', originalError, 'CreateAgent')
      
      expect(error.name).toBe('GhostSpeakSDKError')
      expect(error.operation).toBe('createAgent')
      expect(error.instructionName).toBe('CreateAgent')
      expect(error.originalError).toBe(originalError)
      expect(error.message).toBe('Enhanced: Original error message (Instruction: CreateAgent)')
    })

    it('should handle missing instruction name', () => {
      const originalError = new Error('Test error')
      const error = new GhostSpeakSDKError('unknownOp', originalError)
      
      expect(error.instructionName).toBeUndefined()
      expect(error.message).toBe('Enhanced: Test error (Instruction: unknown)')
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
        address('11111111111111111111111111111111'),
        { address: address('22222222222222222222222222222222'), name: 'userAccount' }
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

    it('should debug accounts when provided', () => {
      const { debugInstructionCall } = vi.mocked(await import('../../../src/utils/instruction-error-handler'))
      const accounts: AccountContext[] = [
        address('33333333333333333333333333333333')
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
      const enhanced = enhanceTransactionError(error, 'CreateAgent')
      
      expect(enhanced.message).toContain('custom program error')
      expect(enhanced.message).toContain('Instruction: CreateAgent')
    })

    it('should add account debug info when provided', () => {
      const error = new Error('custom program error: 0x2')
      const accounts: AccountContext[] = [
        address('44444444444444444444444444444444'),
        address('55555555555555555555555555555555')
      ]
      
      const enhanced = enhanceTransactionError(error, 'UpdateAgent', accounts)
      
      expect(enhanced.message).toContain('Accounts provided: 2')
    })

    it('should handle insufficient funds errors', () => {
      const error = new Error('Insufficient funds for transaction')
      const enhanced = enhanceTransactionError(error)
      
      expect(enhanced.message).toContain('Insufficient SOL balance')
      expect(enhanced.message).toContain('Please ensure your account has enough SOL')
    })

    it('should handle account not found errors', () => {
      const error = new Error('Account does not exist')
      const enhanced = enhanceTransactionError(error, 'GetAgent')
      
      expect(enhanced.message).toContain('Account not found')
      expect(enhanced.message).toContain('Instruction: GetAgent')
    })

    it('should handle simulation failures', () => {
      const error = new Error('Transaction simulation failed')
      const enhanced = enhanceTransactionError(error, 'ComplexOperation')
      
      expect(enhanced.message).toContain('Transaction simulation failed')
      expect(enhanced.message).toContain('dry run')
    })

    it('should preserve original error for unknown patterns', () => {
      const error = new Error('Unknown error type')
      const enhanced = enhanceTransactionError(error)
      
      expect(enhanced).toBe(error)
    })
  })

  describe('formatAccountContext', () => {
    it('should format address-only context', () => {
      const ctx = address('66666666666666666666666666666666')
      const formatted = formatAccountContext(ctx)
      
      expect(formatted).toBe('66666666666666666666666666666666')
    })

    it('should format named account context', () => {
      const ctx = {
        address: address('77777777777777777777777777777777'),
        name: 'treasuryAccount'
      }
      const formatted = formatAccountContext(ctx)
      
      expect(formatted).toBe('treasuryAccount (77777777777777777777777777777777)')
    })

    it('should handle array of contexts', () => {
      const contexts: AccountContext[] = [
        address('88888888888888888888888888888888'),
        { address: address('99999999999999999999999999999999'), name: 'escrow' }
      ]
      
      const formatted = contexts.map(formatAccountContext).join(', ')
      
      expect(formatted).toContain('88888888888888888888888888888888')
      expect(formatted).toContain('escrow (99999999999999999999999999999999)')
    })
  })

  describe('createInstructionError', () => {
    it('should create instruction error with code', () => {
      const error = createInstructionError('InvalidInput', 'Input validation failed', 0x01)
      
      expect(error.name).toBe('InvalidInput')
      expect(error.message).toBe('Input validation failed')
      expect((error as any).code).toBe(0x01)
    })

    it('should create instruction error without code', () => {
      const error = createInstructionError('NetworkError', 'Connection failed')
      
      expect(error.name).toBe('NetworkError')
      expect(error.message).toBe('Connection failed')
      expect((error as any).code).toBeUndefined()
    })
  })

  describe('isInstructionError', () => {
    it('should identify instruction errors', () => {
      const instructionError = createInstructionError('TestError', 'Test message', 0x10)
      const normalError = new Error('Normal error')
      
      expect(isInstructionError(instructionError)).toBe(true)
      expect(isInstructionError(normalError)).toBe(false)
    })
  })

  describe('extractErrorCode', () => {
    it('should extract hex error code', () => {
      const error = new Error('custom program error: 0x1a')
      expect(extractErrorCode(error)).toBe(0x1a)
    })

    it('should extract decimal error code', () => {
      const error = new Error('Error Code: 42')
      expect(extractErrorCode(error)).toBe(42)
    })

    it('should return null for no error code', () => {
      const error = new Error('No error code here')
      expect(extractErrorCode(error)).toBeNull()
    })
  })

  describe('formatErrorForUser', () => {
    it('should format error with all details', () => {
      const error = new GhostSpeakSDKError(
        'createAgent',
        new Error('Network timeout'),
        'CreateAgent'
      )
      
      const formatted = formatErrorForUser(error, true)
      
      expect(formatted).toContain('Operation failed: createAgent')
      expect(formatted).toContain('Enhanced: Network timeout')
      expect(formatted).toContain('Try again')
    })

    it('should format without details', () => {
      const error = new Error('Simple error')
      const formatted = formatErrorForUser(error, false)
      
      expect(formatted).toBe('An error occurred: Simple error')
    })
  })

  describe('getErrorCategory', () => {
    it('should categorize network errors', () => {
      expect(getErrorCategory(new Error('Network request failed'))).toBe(ErrorCategory.Network)
      expect(getErrorCategory(new Error('Connection timeout'))).toBe(ErrorCategory.Network)
    })

    it('should categorize validation errors', () => {
      expect(getErrorCategory(new Error('Invalid input'))).toBe(ErrorCategory.Validation)
      expect(getErrorCategory(new Error('Validation failed'))).toBe(ErrorCategory.Validation)
    })

    it('should categorize insufficient funds', () => {
      expect(getErrorCategory(new Error('Insufficient funds'))).toBe(ErrorCategory.InsufficientFunds)
    })

    it('should categorize rate limits', () => {
      expect(getErrorCategory(new Error('Rate limit exceeded'))).toBe(ErrorCategory.RateLimit)
      expect(getErrorCategory(new Error('Too many requests'))).toBe(ErrorCategory.RateLimit)
    })

    it('should categorize permissions', () => {
      expect(getErrorCategory(new Error('Unauthorized'))).toBe(ErrorCategory.Permission)
      expect(getErrorCategory(new Error('Access denied'))).toBe(ErrorCategory.Permission)
    })

    it('should default to unknown', () => {
      expect(getErrorCategory(new Error('Something weird'))).toBe(ErrorCategory.Unknown)
    })
  })

  describe('shouldRetryOperation', () => {
    it('should retry network errors', () => {
      const error = new Error('Network timeout')
      expect(shouldRetryOperation(error)).toBe(true)
    })

    it('should retry rate limit errors', () => {
      const error = new Error('Rate limit exceeded')
      expect(shouldRetryOperation(error)).toBe(true)
    })

    it('should not retry validation errors', () => {
      const error = new Error('Invalid input')
      expect(shouldRetryOperation(error)).toBe(false)
    })

    it('should not retry permission errors', () => {
      const error = new Error('Unauthorized')
      expect(shouldRetryOperation(error)).toBe(false)
    })

    it('should not retry after max attempts', () => {
      const error = new Error('Network error')
      expect(shouldRetryOperation(error, 3)).toBe(false)
    })
  })

  describe('getRetryDelay', () => {
    it('should use exponential backoff', () => {
      const error = new Error('Network error')
      
      expect(getRetryDelay(error, 0)).toBe(1000)
      expect(getRetryDelay(error, 1)).toBe(2000)
      expect(getRetryDelay(error, 2)).toBe(4000)
    })

    it('should use longer delay for rate limits', () => {
      const error = new Error('Rate limit exceeded')
      
      expect(getRetryDelay(error, 0)).toBe(5000)
      expect(getRetryDelay(error, 1)).toBe(10000)
    })

    it('should cap delay at maximum', () => {
      const error = new Error('Network error')
      
      expect(getRetryDelay(error, 10)).toBe(30000)
    })
  })

  describe('logStructuredError', () => {
    it('should log structured error with all fields', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      const error = new GhostSpeakSDKError(
        'testOp',
        new Error('Test error'),
        'TestInstruction'
      )
      
      logStructuredError(error, { userId: '123', requestId: 'abc' })
      
      expect(consoleSpy).toHaveBeenCalled()
      const loggedData = consoleSpy.mock.calls[0][1]
      
      expect(loggedData).toMatchObject({
        timestamp: expect.any(String),
        category: ErrorCategory.Unknown,
        operation: 'testOp',
        instruction: 'TestInstruction',
        message: expect.stringContaining('Test error'),
        context: { userId: '123', requestId: 'abc' }
      })
      
      consoleSpy.mockRestore()
    })

    it('should handle non-GhostSpeakSDKError', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      const error = new Error('Plain error')
      
      logStructuredError(error)
      
      expect(consoleSpy).toHaveBeenCalled()
      const loggedData = consoleSpy.mock.calls[0][1]
      
      expect(loggedData.operation).toBe('unknown')
      expect(loggedData.instruction).toBeUndefined()
      
      consoleSpy.mockRestore()
    })
  })
})