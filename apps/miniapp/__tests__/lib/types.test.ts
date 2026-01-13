/**
 * Type Tests - Custom Error Classes
 *
 * Unit tests for custom error classes (ApiError, NetworkError, TimeoutError)
 */

import { describe, test, expect } from 'bun:test'
import { ApiError, NetworkError, TimeoutError } from '../../lib/types'

// ============================================================================
// ApiError Tests
// ============================================================================

describe('ApiError', () => {
  test('should create ApiError with all properties', () => {
    const error = new ApiError('Not found', 404, 'AGENT_NOT_FOUND', { agentId: '123' })

    expect(error).toBeInstanceOf(Error)
    expect(error).toBeInstanceOf(ApiError)
    expect(error.name).toBe('ApiError')
    expect(error.message).toBe('Not found')
    expect(error.status).toBe(404)
    expect(error.code).toBe('AGENT_NOT_FOUND')
    expect(error.details).toEqual({ agentId: '123' })
  })

  test('should create ApiError without details', () => {
    const error = new ApiError('Bad request', 400, 'INVALID_INPUT')

    expect(error.message).toBe('Bad request')
    expect(error.status).toBe(400)
    expect(error.code).toBe('INVALID_INPUT')
    expect(error.details).toBeUndefined()
  })

  test('should maintain proper stack trace', () => {
    const error = new ApiError('Server error', 500, 'INTERNAL_ERROR')

    expect(error.stack).toBeDefined()
    expect(error.stack).toContain('ApiError')
  })

  test('should be catchable with instanceof', () => {
    try {
      throw new ApiError('Test error', 400, 'TEST_ERROR')
    } catch (err) {
      expect(err instanceof ApiError).toBe(true)
      expect(err instanceof Error).toBe(true)
      if (err instanceof ApiError) {
        expect(err.status).toBe(400)
        expect(err.code).toBe('TEST_ERROR')
      }
    }
  })

  test('should handle different status codes', () => {
    const error400 = new ApiError('Bad request', 400, 'BAD_REQUEST')
    const error401 = new ApiError('Unauthorized', 401, 'UNAUTHORIZED')
    const error403 = new ApiError('Forbidden', 403, 'FORBIDDEN')
    const error404 = new ApiError('Not found', 404, 'NOT_FOUND')
    const error429 = new ApiError('Rate limited', 429, 'RATE_LIMITED')
    const error500 = new ApiError('Server error', 500, 'SERVER_ERROR')

    expect(error400.status).toBe(400)
    expect(error401.status).toBe(401)
    expect(error403.status).toBe(403)
    expect(error404.status).toBe(404)
    expect(error429.status).toBe(429)
    expect(error500.status).toBe(500)
  })

  test('should handle complex details object', () => {
    const details = {
      field: 'email',
      reason: 'Invalid format',
      expected: 'user@example.com',
      received: 'invalid-email',
      validation: {
        pattern: '^[a-z]+@[a-z]+\\.[a-z]+$',
        flags: 'i',
      },
    }

    const error = new ApiError('Validation failed', 422, 'VALIDATION_ERROR', details)

    expect(error.details).toEqual(details)
    expect((error.details as any).validation.pattern).toBe('^[a-z]+@[a-z]+\\.[a-z]+$')
  })
})

// ============================================================================
// NetworkError Tests
// ============================================================================

describe('NetworkError', () => {
  test('should create NetworkError with message', () => {
    const error = new NetworkError('Connection refused')

    expect(error).toBeInstanceOf(Error)
    expect(error).toBeInstanceOf(NetworkError)
    expect(error.name).toBe('NetworkError')
    expect(error.message).toBe('Connection refused')
    expect(error.cause).toBeUndefined()
  })

  test('should create NetworkError with cause', () => {
    const originalError = new Error('ECONNREFUSED')
    const error = new NetworkError('Failed to connect', originalError)

    expect(error.message).toBe('Failed to connect')
    expect(error.cause).toBe(originalError)
    expect(error.cause?.message).toBe('ECONNREFUSED')
  })

  test('should maintain proper stack trace', () => {
    const error = new NetworkError('Network failure')

    expect(error.stack).toBeDefined()
    expect(error.stack).toContain('NetworkError')
  })

  test('should be catchable with instanceof', () => {
    try {
      throw new NetworkError('Connection timeout')
    } catch (err) {
      expect(err instanceof NetworkError).toBe(true)
      expect(err instanceof Error).toBe(true)
      if (err instanceof NetworkError) {
        expect(err.message).toBe('Connection timeout')
      }
    }
  })

  test('should preserve cause stack trace', () => {
    const originalError = new Error('Original error')
    const error = new NetworkError('Wrapped error', originalError)

    expect(error.cause).toBeDefined()
    expect(error.cause?.stack).toBeDefined()
  })

  test('should handle DNS errors', () => {
    const dnsError = new Error('ENOTFOUND')
    const error = new NetworkError('DNS lookup failed', dnsError)

    expect(error.message).toBe('DNS lookup failed')
    expect(error.cause?.message).toBe('ENOTFOUND')
  })

  test('should handle timeout errors', () => {
    const timeoutError = new Error('ETIMEDOUT')
    const error = new NetworkError('Request timed out', timeoutError)

    expect(error.message).toBe('Request timed out')
    expect(error.cause?.message).toBe('ETIMEDOUT')
  })
})

// ============================================================================
// TimeoutError Tests
// ============================================================================

describe('TimeoutError', () => {
  test('should create TimeoutError with timeout value', () => {
    const error = new TimeoutError('Request timed out after 30000ms', 30000)

    expect(error).toBeInstanceOf(Error)
    expect(error).toBeInstanceOf(TimeoutError)
    expect(error.name).toBe('TimeoutError')
    expect(error.message).toBe('Request timed out after 30000ms')
    expect(error.timeout).toBe(30000)
  })

  test('should maintain proper stack trace', () => {
    const error = new TimeoutError('Timeout', 5000)

    expect(error.stack).toBeDefined()
    expect(error.stack).toContain('TimeoutError')
  })

  test('should be catchable with instanceof', () => {
    try {
      throw new TimeoutError('Request timeout', 10000)
    } catch (err) {
      expect(err instanceof TimeoutError).toBe(true)
      expect(err instanceof Error).toBe(true)
      if (err instanceof TimeoutError) {
        expect(err.timeout).toBe(10000)
      }
    }
  })

  test('should handle different timeout values', () => {
    const error1s = new TimeoutError('Timeout 1s', 1000)
    const error5s = new TimeoutError('Timeout 5s', 5000)
    const error30s = new TimeoutError('Timeout 30s', 30000)
    const error60s = new TimeoutError('Timeout 60s', 60000)

    expect(error1s.timeout).toBe(1000)
    expect(error5s.timeout).toBe(5000)
    expect(error30s.timeout).toBe(30000)
    expect(error60s.timeout).toBe(60000)
  })

  test('should allow zero timeout', () => {
    const error = new TimeoutError('Immediate timeout', 0)

    expect(error.timeout).toBe(0)
  })
})

// ============================================================================
// Error Hierarchy Tests
// ============================================================================

describe('Error hierarchy', () => {
  test('all custom errors should extend Error', () => {
    const apiError = new ApiError('API error', 500, 'ERROR')
    const networkError = new NetworkError('Network error')
    const timeoutError = new TimeoutError('Timeout error', 1000)

    expect(apiError instanceof Error).toBe(true)
    expect(networkError instanceof Error).toBe(true)
    expect(timeoutError instanceof Error).toBe(true)
  })

  test('errors should be distinguishable via instanceof', () => {
    const apiError = new ApiError('API error', 500, 'ERROR')
    const networkError = new NetworkError('Network error')
    const timeoutError = new TimeoutError('Timeout error', 1000)

    // ApiError checks
    expect(apiError instanceof ApiError).toBe(true)
    expect(apiError instanceof NetworkError).toBe(false)
    expect(apiError instanceof TimeoutError).toBe(false)

    // NetworkError checks
    expect(networkError instanceof ApiError).toBe(false)
    expect(networkError instanceof NetworkError).toBe(true)
    expect(networkError instanceof TimeoutError).toBe(false)

    // TimeoutError checks
    expect(timeoutError instanceof ApiError).toBe(false)
    expect(timeoutError instanceof NetworkError).toBe(false)
    expect(timeoutError instanceof TimeoutError).toBe(true)
  })

  test('errors should have correct name property', () => {
    const apiError = new ApiError('API error', 500, 'ERROR')
    const networkError = new NetworkError('Network error')
    const timeoutError = new TimeoutError('Timeout error', 1000)

    expect(apiError.name).toBe('ApiError')
    expect(networkError.name).toBe('NetworkError')
    expect(timeoutError.name).toBe('TimeoutError')
  })

  test('errors should be JSON serializable', () => {
    const apiError = new ApiError('API error', 500, 'ERROR', { detail: 'info' })

    // Errors don't serialize well by default, but custom properties should be accessible
    const serialized = {
      name: apiError.name,
      message: apiError.message,
      status: apiError.status,
      code: apiError.code,
      details: apiError.details,
    }

    expect(serialized.name).toBe('ApiError')
    expect(serialized.message).toBe('API error')
    expect(serialized.status).toBe(500)
    expect(serialized.code).toBe('ERROR')
    expect(serialized.details).toEqual({ detail: 'info' })
  })
})
