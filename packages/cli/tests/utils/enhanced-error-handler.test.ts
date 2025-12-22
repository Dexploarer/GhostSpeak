/**
 * Tests for enhanced error handler
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { 
  handleServiceError,
  displayErrorAndCancel,
  withErrorHandling,
  ErrorMessages
} from '../../src/utils/enhanced-error-handler'
import {
  ServiceError,
  ValidationError,
  NotFoundError,
  NetworkError,
  UnauthorizedError
} from '../../src/types/services'

// Mock @clack/prompts
vi.mock('@clack/prompts', () => ({
  cancel: vi.fn()
}))

describe('Enhanced Error Handler', () => {
  let consoleLogSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.clearAllMocks()
    consoleLogSpy.mockRestore()
  })

  describe('handleServiceError', () => {
    it('should handle ValidationError', () => {
      // ValidationError(message, suggestion?) - canRetry = false
      const error = new ValidationError('Invalid input', 'Check your parameters')
      const result = handleServiceError(error)

      expect(result.message).toBe('Invalid input')
      expect(result.suggestion).toBe('Check your parameters')
      expect(result.actions).toContain('Review the input parameters')
      expect(result.canRetry).toBe(false)
    })

    it('should handle NotFoundError', () => {
      // NotFoundError(resource, id) - generates message like "Agent not found: test-id"
      const error = new NotFoundError('Agent', 'test-id')
      const result = handleServiceError(error)

      expect(result.message).toBe('Agent not found: test-id')
      expect(result.suggestion).toContain('Check that the agent ID is correct')
      expect(result.actions).toContain('Verify the ID is correct')
      expect(result.canRetry).toBe(false)
    })

    it('should handle NetworkError', () => {
      // NetworkError(message, suggestion?) - canRetry = true
      const error = new NetworkError('Connection failed', 'Check network')
      const result = handleServiceError(error)

      expect(result.message).toBe('Connection failed')
      expect(result.suggestion).toBe('Check network')
      expect(result.actions).toContain('Check network connection')
      expect(result.canRetry).toBe(true)
    })

    it('should handle UnauthorizedError', () => {
      // UnauthorizedError(message?) - canRetry = false
      const error = new UnauthorizedError('Access denied')
      const result = handleServiceError(error)

      expect(result.message).toBe('Access denied')
      expect(result.suggestion).toBe('Make sure you have permission to perform this action')
      expect(result.actions).toContain('Check wallet permissions')
      expect(result.canRetry).toBe(false)
    })

    it('should handle generic ServiceError', () => {
      const error = new ServiceError('Generic service error', 'GENERIC', 'Try again', false)
      const result = handleServiceError(error)

      expect(result.message).toBe('Generic service error')
      expect(result.suggestion).toBe('Try again')
      expect(result.canRetry).toBe(false)
    })

    it('should handle unknown errors', () => {
      const error = new Error('Unknown error')
      const result = handleServiceError(error)

      expect(result.message).toBe('Unknown error')
      expect(result.suggestion).toContain('unexpected error')
      expect(result.canRetry).toBe(true)
    })

    it('should handle string errors', () => {
      // String errors are treated as unknown, so message becomes 'Unknown error occurred'
      const result = handleServiceError('String error message')

      expect(result.message).toBe('Unknown error occurred')
      expect(result.canRetry).toBe(true)
    })

    it('should handle null/undefined errors', () => {
      const result = handleServiceError(null)

      expect(result.message).toBe('Unknown error occurred')
      expect(result.canRetry).toBe(true)
    })
  })

  describe('displayErrorAndCancel', () => {
    it('should display error with formatted output', async () => {
      const { cancel } = await import('@clack/prompts')
      const error = new ValidationError('Test error')
      
      displayErrorAndCancel(error, 'Test operation')

      expect(consoleLogSpy).toHaveBeenCalled()
      expect(cancel).toHaveBeenCalled()
    })

    it('should include suggestion when available', async () => {
      const error = new ValidationError('Test error', 'Try this fix')
      
      displayErrorAndCancel(error, 'Test operation')

      const allCalls = consoleLogSpy.mock.calls.map(c => String(c[0] ?? '')).join(' ')
      expect(allCalls).toContain('Suggestion')
    })
  })

  describe('withErrorHandling', () => {
    it('should return function result on success', async () => {
      const successFn = async () => 'success'
      const wrapped = withErrorHandling(successFn, 'Test')

      const result = await wrapped()
      expect(result).toBe('success')
    })

    it('should handle errors from wrapped function', async () => {
      const errorFn = async () => {
        throw new ValidationError('Test error')
      }
      const wrapped = withErrorHandling(errorFn, 'Test')

      // The error should be handled internally
      await expect(wrapped()).rejects.toThrow()
    })
  })

  describe('ErrorMessages', () => {
    it('should have common error messages defined', () => {
      expect(ErrorMessages).toBeDefined()
      expect(typeof ErrorMessages.NETWORK_UNAVAILABLE).toBe('string')
      expect(typeof ErrorMessages.VALIDATION_FAILED).toBe('string')
      expect(typeof ErrorMessages.NO_WALLET).toBe('string')
      expect(typeof ErrorMessages.INVALID_ADDRESS).toBe('string')
    })
  })

  describe('Integration scenarios', () => {
    it('should handle mixed error types in sequence', () => {
      const errors = [
        new ValidationError('Invalid input'),
        new NotFoundError('Resource', 'test-id'),
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
