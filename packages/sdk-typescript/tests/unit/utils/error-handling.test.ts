/**
 * Error Handling Tests
 * 
 * Tests error handling utilities including:
 * - Enhanced error messages
 * - Error classification
 * - Error recovery strategies
 * - Error monitoring and reporting
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { address } from '@solana/addresses'

import { 
  EnhancedClientError,
  classifyError,
  handleTransactionError,
  createErrorWithContext,
  ErrorRecoveryManager,
  ErrorMonitor
} from '../../../src/utils/error-handling'
import { 
  InstructionAccountMapper,
  type InstructionErrorContext
} from '../../../src/utils/instruction-account-mapper'

describe('Error Handling', () => {
  let errorMonitor: ErrorMonitor
  let recoveryManager: ErrorRecoveryManager
  
  beforeEach(() => {
    errorMonitor = new ErrorMonitor()
    recoveryManager = new ErrorRecoveryManager()
    vi.clearAllMocks()
  })

  describe('EnhancedClientError', () => {
    it('should create enhanced error with context', () => {
      const originalError = new Error('Transaction failed')
      const context = {
        instruction: 'register_agent',
        accounts: ['authority', 'agent', 'system_program'],
        programId: address('11111111111111111111111111111111')
      }
      
      const enhancedError = new EnhancedClientError(
        'Failed to register agent',
        originalError,
        context
      )
      
      expect(enhancedError.message).toBe('Failed to register agent')
      expect(enhancedError.originalError).toBe(originalError)
      expect(enhancedError.context).toEqual(context)
      expect(enhancedError.name).toBe('EnhancedClientError')
    })

    it('should include stack trace from original error', () => {
      const originalError = new Error('Original error')
      const enhancedError = new EnhancedClientError(
        'Enhanced message',
        originalError
      )
      
      expect(enhancedError.stack).toContain('Original error')
    })

    it('should provide detailed error information', () => {
      const context = {
        instruction: 'transfer_tokens',
        accounts: ['source', 'destination', 'authority'],
        amount: 1000000n,
        programId: address('22222222222222222222222222222222')
      }
      
      const error = new EnhancedClientError(
        'Token transfer failed',
        new Error('Insufficient funds'),
        context
      )
      
      const details = error.getDetails()
      
      expect(details).toContain('Token transfer failed')
      expect(details).toContain('transfer_tokens')
      expect(details).toContain('Insufficient funds')
      expect(details).toContain('source')
    })
  })

  describe('Error Classification', () => {
    it('should classify network errors', () => {
      const networkErrors = [
        new Error('Network request failed'),
        new Error('Connection timeout'),
        new Error('ENOTFOUND api.solana.com'),
        new Error('Request timeout')
      ]
      
      for (const error of networkErrors) {
        const classification = classifyError(error)
        expect(classification.type).toBe('network')
        expect(classification.severity).toBe('recoverable')
      }
    })

    it('should classify transaction errors', () => {
      const txErrors = [
        new Error('Transaction failed with error: InsufficientFunds'),
        new Error('Transaction was not confirmed'),
        new Error('Blockhash not found'),
        new Error('Transaction expired')
      ]
      
      for (const error of txErrors) {
        const classification = classifyError(error)
        expect(classification.type).toBe('transaction')
      }
    })

    it('should classify program errors', () => {
      const programErrors = [
        new Error('Program error: Invalid instruction'),
        new Error('Account not found'),
        new Error('Insufficient account balance'),
        new Error('Account already exists')
      ]
      
      for (const error of programErrors) {
        const classification = classifyError(error)
        expect(classification.type).toBe('program')
      }
    })

    it('should classify validation errors as non-recoverable', () => {
      const validationErrors = [
        new Error('Invalid public key format'),
        new Error('Invalid amount: negative value'),
        new Error('Required parameter missing')
      ]
      
      for (const error of validationErrors) {
        const classification = classifyError(error)
        expect(classification.type).toBe('validation')
        expect(classification.severity).toBe('fatal')
      }
    })

    it('should provide recovery suggestions', () => {
      const networkError = new Error('Connection timeout')
      const classification = classifyError(networkError)
      
      expect(classification.suggestions).toContain('retry')
      expect(classification.suggestions).toContain('connection')
    })
  })

  describe('Transaction Error Handling', () => {
    it('should handle transaction confirmation timeout', async () => {
      const timeoutError = new Error('Transaction was not confirmed in 60 seconds')
      
      const result = await handleTransactionError(
        timeoutError,
        'transaction-signature-123',
        {
          maxRetries: 3,
          retryDelay: 100
        }
      )
      
      expect(result.shouldRetry).toBe(true)
      expect(result.retryDelay).toBe(100)
      expect(result.enhancedMessage).toContain('timeout')
    })

    it('should handle insufficient funds error', async () => {
      const fundsError = new Error('Transaction failed: InsufficientFunds')
      
      const result = await handleTransactionError(
        fundsError,
        'transaction-signature-456'
      )
      
      expect(result.shouldRetry).toBe(false)
      expect(result.enhancedMessage).toContain('insufficient')
      expect(result.userFriendlyMessage).toBeDefined()
    })

    it('should handle blockhash expiration', async () => {
      const blockhashError = new Error('Blockhash not found')
      
      const result = await handleTransactionError(
        blockhashError,
        'transaction-signature-789'
      )
      
      expect(result.shouldRetry).toBe(true)
      expect(result.enhancedMessage).toContain('blockhash')
      expect(result.recoveryAction).toBe('refresh_blockhash')
    })

    it('should provide transaction troubleshooting steps', async () => {
      const programError = new Error('Program error: Custom(42)')
      
      const result = await handleTransactionError(
        programError,
        'transaction-signature-abc',
        {
          programId: address('33333333333333333333333333333333'),
          instruction: 'register_service'
        }
      )
      
      expect(result.troubleshootingSteps).toBeDefined()
      expect(result.troubleshootingSteps.length).toBeGreaterThan(0)
    })
  })

  describe('Error Context Creation', () => {
    it('should create error with instruction context', () => {
      const mapper = new InstructionAccountMapper()
      const context: InstructionErrorContext = {
        instruction: 'create_escrow',
        programId: address('44444444444444444444444444444444'),
        accounts: [
          { name: 'authority', address: address('55555555555555555555555555555555') },
          { name: 'escrow', address: address('66666666666666666666666666666666') }
        ],
        data: new Uint8Array([1, 2, 3, 4])
      }
      
      const error = createErrorWithContext(
        'Escrow creation failed',
        new Error('Account validation failed'),
        context,
        mapper
      )
      
      expect(error).toBeInstanceOf(EnhancedClientError)
      expect(error.message).toContain('Escrow creation failed')
      expect(error.context.instruction).toBe('create_escrow')
      expect(error.context.accounts).toHaveLength(2)
    })

    it('should include account validation details', () => {
      const mapper = new InstructionAccountMapper()
      const context: InstructionErrorContext = {
        instruction: 'transfer_service_payment',
        programId: address('77777777777777777777777777777777'),
        accounts: [
          { name: 'payer', address: address('88888888888888888888888888888888') },
          { name: 'invalid_account', address: address('99999999999999999999999999999999') }
        ]
      }
      
      const error = createErrorWithContext(
        'Payment transfer failed',
        new Error('Invalid account'),
        context,
        mapper
      )
      
      const details = error.getDetails()
      expect(details).toContain('invalid_account')
      expect(details).toContain('Account validation')
    })
  })

  describe('Error Recovery Manager', () => {
    it('should implement exponential backoff', async () => {
      const start = Date.now()
      
      const delays = []
      for (let attempt = 0; attempt < 4; attempt++) {
        const delay = recoveryManager.calculateBackoffDelay(attempt)
        delays.push(delay)
      }
      
      // Should implement exponential backoff: 1s, 2s, 4s, 8s
      expect(delays[0]).toBe(1000)
      expect(delays[1]).toBe(2000)
      expect(delays[2]).toBe(4000)
      expect(delays[3]).toBe(8000)
    })

    it('should respect maximum retry attempts', async () => {
      let attempts = 0
      const flakyOperation = async () => {
        attempts++
        if (attempts < 5) {
          throw new Error('Temporary failure')
        }
        return 'success'
      }
      
      try {
        await recoveryManager.withRetry(flakyOperation, {
          maxRetries: 3,
          baseDelay: 10 // Fast for testing
        })
        expect.fail('Should have thrown after max retries')
      } catch (error) {
        expect(attempts).toBe(4) // Initial + 3 retries
      }
    })

    it('should succeed on eventual success', async () => {
      let attempts = 0
      const eventuallySuccessful = async () => {
        attempts++
        if (attempts < 3) {
          throw new Error('Not ready yet')
        }
        return 'finally worked'
      }
      
      const result = await recoveryManager.withRetry(eventuallySuccessful, {
        maxRetries: 5,
        baseDelay: 10
      })
      
      expect(result).toBe('finally worked')
      expect(attempts).toBe(3)
    })

    it('should apply jitter to prevent thundering herd', () => {
      const delays = []
      
      // Generate multiple delays for same attempt
      for (let i = 0; i < 10; i++) {
        const delay = recoveryManager.calculateBackoffDelay(1, { addJitter: true })
        delays.push(delay)
      }
      
      // Should have variation due to jitter
      const uniqueDelays = new Set(delays)
      expect(uniqueDelays.size).toBeGreaterThan(1)
      
      // All delays should be around 2000ms ± jitter
      for (const delay of delays) {
        expect(delay).toBeGreaterThan(1500)
        expect(delay).toBeLessThan(2500)
      }
    })

    it('should handle different error types with appropriate strategies', async () => {
      const networkError = new Error('Network timeout')
      const validationError = new Error('Invalid input')
      
      const networkStrategy = recoveryManager.getRecoveryStrategy(networkError)
      const validationStrategy = recoveryManager.getRecoveryStrategy(validationError)
      
      expect(networkStrategy.shouldRetry).toBe(true)
      expect(networkStrategy.maxRetries).toBeGreaterThan(1)
      
      expect(validationStrategy.shouldRetry).toBe(false)
      expect(validationStrategy.maxRetries).toBe(0)
    })
  })

  describe('Error Monitoring', () => {
    it('should track error frequency', () => {
      const error1 = new Error('Network timeout')
      const error2 = new Error('Network timeout')
      const error3 = new Error('Different error')
      
      errorMonitor.recordError(error1)
      errorMonitor.recordError(error2)
      errorMonitor.recordError(error3)
      
      const stats = errorMonitor.getErrorStats()
      
      expect(stats.totalErrors).toBe(3)
      expect(stats.errorsByType['network']).toBe(2)
      expect(stats.errorsByType['unknown']).toBe(1)
    })

    it('should detect error patterns', () => {
      // Record multiple network errors in short time
      for (let i = 0; i < 5; i++) {
        errorMonitor.recordError(new Error('Connection failed'))
      }
      
      const patterns = errorMonitor.detectPatterns()
      
      expect(patterns.highFrequencyErrors).toBeDefined()
      expect(patterns.highFrequencyErrors.length).toBeGreaterThan(0)
      expect(patterns.highFrequencyErrors[0].errorType).toBe('network')
    })

    it('should generate error alerts', () => {
      const alerts = []
      errorMonitor.onAlert((alert) => alerts.push(alert))
      
      // Trigger alert threshold
      for (let i = 0; i < 10; i++) {
        errorMonitor.recordError(new Error('Critical failure'))
      }
      
      expect(alerts.length).toBeGreaterThan(0)
      expect(alerts[0].severity).toBe('high')
      expect(alerts[0].message).toContain('Critical failure')
    })

    it('should provide error recovery recommendations', () => {
      // Record specific error pattern
      for (let i = 0; i < 3; i++) {
        errorMonitor.recordError(new Error('Transaction timeout'))
      }
      
      const recommendations = errorMonitor.getRecoveryRecommendations()
      
      expect(recommendations).toBeDefined()
      expect(recommendations.length).toBeGreaterThan(0)
      expect(recommendations[0]).toContain('timeout')
    })
  })

  describe('Integration Scenarios', () => {
    it('should handle complete error flow', async () => {
      const originalError = new Error('Program error: Custom(5)')
      
      // 1. Classify error
      const classification = classifyError(originalError)
      
      // 2. Create enhanced error with context
      const enhancedError = createErrorWithContext(
        'Service registration failed',
        originalError,
        {
          instruction: 'register_service',
          programId: address('aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'),
          accounts: [
            { name: 'authority', address: address('bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb') }
          ]
        }
      )
      
      // 3. Record error for monitoring
      errorMonitor.recordError(enhancedError)
      
      // 4. Attempt recovery
      const shouldRetry = classification.severity === 'recoverable'
      
      expect(classification.type).toBe('program')
      expect(enhancedError.context.instruction).toBe('register_service')
      expect(errorMonitor.getErrorStats().totalErrors).toBe(1)
      expect(shouldRetry).toBeDefined()
    })

    it('should provide user-friendly error messages', () => {
      const technicalErrors = [
        'Program error: Custom(0)',
        'Transaction failed: InsufficientFunds',
        'Blockhash not found',
        'Account not found'
      ]
      
      const userFriendlyMessages = technicalErrors.map(error => {
        const classification = classifyError(new Error(error))
        return classification.userFriendlyMessage
      })
      
      expect(userFriendlyMessages[0]).toContain('registration')
      expect(userFriendlyMessages[1]).toContain('balance')
      expect(userFriendlyMessages[2]).toContain('expired')
      expect(userFriendlyMessages[3]).toContain('account')
    })
  })
})

// Mock implementations for testing
class ErrorMonitor {
  private errors: Array<{ error: Error; timestamp: number; type: string }> = []
  private alertHandlers: Array<(alert: any) => void> = []

  recordError(error: Error): void {
    const classification = classifyError(error)
    this.errors.push({
      error,
      timestamp: Date.now(),
      type: classification.type
    })

    // Check for alert conditions
    if (this.errors.length >= 10) {
      this.alertHandlers.forEach(handler => 
        handler({
          severity: 'high',
          message: `High error frequency: ${error.message}`,
          timestamp: Date.now()
        })
      )
    }
  }

  getErrorStats() {
    const errorsByType: Record<string, number> = {}
    
    for (const { type } of this.errors) {
      errorsByType[type] = (errorsByType[type] || 0) + 1
    }

    return {
      totalErrors: this.errors.length,
      errorsByType
    }
  }

  detectPatterns() {
    const typeFrequency: Record<string, number> = {}
    
    for (const { type } of this.errors) {
      typeFrequency[type] = (typeFrequency[type] || 0) + 1
    }

    const highFrequencyErrors = Object.entries(typeFrequency)
      .filter(([, count]) => count >= 2)
      .map(([errorType, count]) => ({ errorType, count }))

    return { highFrequencyErrors }
  }

  getRecoveryRecommendations(): string[] {
    const recommendations = []
    const stats = this.getErrorStats()

    if (stats.errorsByType['network'] > 0) {
      recommendations.push('Consider increasing timeout values for network operations')
    }

    if (stats.errorsByType['transaction'] > 0) {
      recommendations.push('Review transaction parameters and retry logic')
    }

    return recommendations
  }

  onAlert(handler: (alert: any) => void): void {
    this.alertHandlers.push(handler)
  }
}

class ErrorRecoveryManager {
  calculateBackoffDelay(attempt: number, options: { addJitter?: boolean } = {}): number {
    const baseDelay = 1000 // 1 second
    const delay = baseDelay * Math.pow(2, attempt)
    
    if (options.addJitter) {
      const jitter = Math.random() * 0.3 * delay // 30% jitter
      return Math.floor(delay + jitter - (0.15 * delay))
    }
    
    return delay
  }

  async withRetry<T>(
    operation: () => Promise<T>,
    options: { maxRetries?: number; baseDelay?: number } = {}
  ): Promise<T> {
    const { maxRetries = 3, baseDelay = 1000 } = options
    let lastError: Error

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await operation()
      } catch (error) {
        lastError = error as Error
        
        if (attempt === maxRetries) {
          throw lastError
        }

        const delay = baseDelay * Math.pow(2, attempt)
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }

    throw lastError!
  }

  getRecoveryStrategy(error: Error) {
    const classification = classifyError(error)
    
    switch (classification.type) {
      case 'network':
        return {
          shouldRetry: true,
          maxRetries: 3,
          backoffMultiplier: 2
        }
      case 'transaction':
        return {
          shouldRetry: true,
          maxRetries: 2,
          backoffMultiplier: 1.5
        }
      case 'validation':
        return {
          shouldRetry: false,
          maxRetries: 0,
          backoffMultiplier: 1
        }
      default:
        return {
          shouldRetry: true,
          maxRetries: 1,
          backoffMultiplier: 1
        }
    }
  }
}