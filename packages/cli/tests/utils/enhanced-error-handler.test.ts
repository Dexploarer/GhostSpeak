/**
 * Comprehensive tests for enhanced-error-handler.ts
 * Testing error handling, formatting, and user guidance functionality
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  handleServiceError,
  displayErrorAndCancel,
  withErrorHandling,
  ErrorMessages,
  type ErrorInfo
} from '../../src/utils/enhanced-error-handler'
import {
  ServiceError,
  ValidationError,
  NotFoundError,
  NetworkError,
  UnauthorizedError
} from '../../src/types/services'

// Mock chalk
vi.mock('chalk', () => ({
  default: {
    red: (text: string) => text,
    yellow: (text: string) => text,
    cyan: (text: string) => text,
    gray: (text: string) => text,
    blue: (text: string) => text
  }
}))

// Mock @clack/prompts
vi.mock('@clack/prompts', () => ({
  cancel: vi.fn()
}))

describe('Enhanced Error Handler', () => {
  let consoleLogSpy: ReturnType<typeof vi.spyOn>
  let mockCancel: ReturnType<typeof vi.fn>

  beforeEach(() => {
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    mockCancel = vi.mocked(await import('@clack/prompts')).cancel
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('handleServiceError', () => {
    it('should handle ValidationError', () => {
      const error = new ValidationError('Invalid input', 'Check your parameters')
      const result = handleServiceError(error)

      expect(result).toEqual({
        message: 'Invalid input',
        suggestion: 'Check your parameters',
        actions: ['Review the input parameters', 'Check the command help for usage examples'],
        canRetry: true
      })
    })

    it('should handle NotFoundError', () => {
      const error = new NotFoundError('Agent not found', 'Try a different ID')
      const result = handleServiceError(error)

      expect(result).toEqual({
        message: 'Agent not found',
        suggestion: 'Try a different ID',
        actions: ['Verify the ID is correct', 'List available items to find the right one'],
        canRetry: true
      })
    })

    it('should handle NetworkError', () => {
      const error = new NetworkError('Connection failed', 'Check network')
      const result = handleServiceError(error)

      expect(result).toEqual({
        message: 'Connection failed',
        suggestion: 'Check network',
        actions: ['Check network connection', 'Verify Solana RPC endpoint is accessible'],
        canRetry: true
      })
    })

    it('should handle UnauthorizedError', () => {
      const error = new UnauthorizedError('Access denied', 'Check permissions')
      const result = handleServiceError(error)

      expect(result).toEqual({
        message: 'Access denied',
        suggestion: 'Check permissions',
        actions: ['Check wallet permissions', 'Ensure you own the resource you\\'re trying to modify'],
        canRetry: true
      })
    })

    it('should handle generic ServiceError', () => {
      const error = new ServiceError('Generic service error', 'Try again', false)
      const result = handleServiceError(error)

      expect(result).toEqual({
        message: 'Generic service error',
        suggestion: 'Try again',
        actions: [],
        canRetry: false
      })
    })

    it('should handle Error instances', () => {
      const error = new Error('Standard error')
      const result = handleServiceError(error)

      expect(result).toEqual({
        message: 'Standard error',
        suggestion: 'This is an unexpected error. Please try again or contact support',
        actions: ['Try the command again', 'Check the logs for more details'],
        canRetry: true
      })
    })

    it('should handle unknown error types', () => {
      const error = 'String error'
      const result = handleServiceError(error)

      expect(result).toEqual({
        message: 'Unknown error occurred',
        suggestion: 'This is an unexpected error. Please try again or contact support',
        actions: ['Try the command again', 'Check the logs for more details'],
        canRetry: true
      })
    })

    it('should handle ServiceError without suggestion', () => {
      const error = new ServiceError('No suggestion error')
      const result = handleServiceError(error)

      expect(result.suggestion).toBe('Please try again')
    })
  })

  describe('displayErrorAndCancel', () => {
    it('should display error with all components', () => {
      const error = new ValidationError('Invalid data', 'Fix the input')
      
      displayErrorAndCancel(error, 'Test Operation')

      expect(consoleLogSpy).toHaveBeenCalledWith('')
      expect(consoleLogSpy).toHaveBeenCalledWith('❌ Test Operation failed')
      expect(consoleLogSpy).toHaveBeenCalledWith('Error: Invalid data')
      expect(consoleLogSpy).toHaveBeenCalledWith('💡 Suggestion: Fix the input')
      expect(consoleLogSpy).toHaveBeenCalledWith('📋 What you can do:')
      expect(consoleLogSpy).toHaveBeenCalledWith('  • Review the input parameters')
      expect(consoleLogSpy).toHaveBeenCalledWith('🔄 You can try this command again')
      expect(mockCancel).toHaveBeenCalledWith('Test Operation cancelled')
    })

    it('should display error without retry option', () => {
      const error = new ServiceError('Fatal error', 'Contact support', false)
      
      displayErrorAndCancel(error, 'Fatal Operation')

      expect(consoleLogSpy).toHaveBeenCalledWith('❌ Fatal Operation failed')
      expect(consoleLogSpy).not.toHaveBeenCalledWith(expect.stringContaining('🔄'))
    })

    it('should display error without actions', () => {
      const error = new ServiceError('Simple error')
      
      displayErrorAndCancel(error)

      expect(consoleLogSpy).toHaveBeenCalledWith('❌ Operation failed')
      expect(consoleLogSpy).not.toHaveBeenCalledWith(expect.stringContaining('📋'))
    })

    it('should display error without suggestion', () => {
      const error = new Error('Basic error')
      
      displayErrorAndCancel(error)

      expect(consoleLogSpy).toHaveBeenCalledWith('💡 Suggestion: This is an unexpected error. Please try again or contact support')
    })
  })

  describe('withErrorHandling', () => {
    it('should wrap function and return result on success', async () => {
      const mockFn = vi.fn().mockResolvedValue('success')
      const wrappedFn = withErrorHandling(mockFn, 'Test Operation')

      const result = await wrappedFn('arg1', 'arg2')

      expect(result).toBe('success')
      expect(mockFn).toHaveBeenCalledWith('arg1', 'arg2')
      expect(mockCancel).not.toHaveBeenCalled()
    })

    it('should handle errors and call displayErrorAndCancel', async () => {
      const testError = new ValidationError('Test error')
      const mockFn = vi.fn().mockRejectedValue(testError)
      const wrappedFn = withErrorHandling(mockFn, 'Test Operation')

      await expect(wrappedFn()).rejects.toThrow('Test error')

      expect(mockFn).toHaveBeenCalled()
      expect(consoleLogSpy).toHaveBeenCalledWith('❌ Test Operation failed')
      expect(mockCancel).toHaveBeenCalledWith('Test Operation cancelled')
    })

    it('should use default operation name', async () => {
      const testError = new Error('Test error')
      const mockFn = vi.fn().mockRejectedValue(testError)
      const wrappedFn = withErrorHandling(mockFn)

      await expect(wrappedFn()).rejects.toThrow('Test error')

      expect(consoleLogSpy).toHaveBeenCalledWith('❌ Operation failed')
      expect(mockCancel).toHaveBeenCalledWith('Operation cancelled')
    })

    it('should preserve function arguments and types', async () => {
      const mockFn = vi.fn().mockImplementation((a: string, b: number) => Promise.resolve(a + b))
      const wrappedFn = withErrorHandling(mockFn, 'Type Test')

      const result = await wrappedFn('test', 123)

      expect(result).toBe('test123')
      expect(mockFn).toHaveBeenCalledWith('test', 123)
    })
  })

  describe('ErrorMessages', () => {
    it('should have all expected error messages', () => {
      expect(ErrorMessages.NO_WALLET).toBe('No active wallet found. Create or select a wallet first.')
      expect(ErrorMessages.NETWORK_UNAVAILABLE).toBe('Unable to connect to Solana network. Check your connection.')
      expect(ErrorMessages.INSUFFICIENT_FUNDS).toBe('Insufficient SOL balance for this transaction.')
      expect(ErrorMessages.INVALID_ADDRESS).toBe('Invalid Solana address format.')
      expect(ErrorMessages.AGENT_NOT_FOUND).toBe('Agent not found. Check the agent ID is correct.')
      expect(ErrorMessages.UNAUTHORIZED_ACCESS).toBe('You don\\'t have permission to perform this action.')
      expect(ErrorMessages.VALIDATION_FAILED).toBe('Input validation failed. Check your parameters.')
    })

    it('should be readonly constants', () => {
      // TypeScript should prevent this, but let's test runtime behavior
      expect(() => {
        // @ts-expect-error - Testing runtime immutability
        ErrorMessages.NO_WALLET = 'Modified message'
      }).toThrow()
    })
  })

  describe('Integration scenarios', () => {
    it('should handle complex error chains', () => {
      const originalError = new Error('Original error')
      const wrappedError = new ValidationError('Validation failed', 'Check input', true, originalError)
      
      const result = handleServiceError(wrappedError)

      expect(result.message).toBe('Validation failed')
      expect(result.suggestion).toBe('Check input')
      expect(result.canRetry).toBe(true)
      expect(result.actions).toContain('Review the input parameters')
    })

    it('should handle mixed error types in sequence', () => {
      const errors = [
        new ValidationError('Invalid input'),
        new NotFoundError('Resource not found'),
        new NetworkError('Connection failed'),
        new UnauthorizedError('Access denied'),
        new Error('Generic error')
      ]

      errors.forEach(error => {
        const result = handleServiceError(error)
        expect(result).toHaveProperty('message')
        expect(result).toHaveProperty('suggestion')
        expect(result).toHaveProperty('actions')
        expect(result).toHaveProperty('canRetry')
      })
    })
  })
})