# GhostSpeak SDK Error Handling Guide

This comprehensive guide covers the advanced error handling system implemented in the GhostSpeak SDK, providing developers with robust error recovery, monitoring, and resilience patterns.

## Table of Contents

1. [Overview](#overview)
2. [Error Types and Categories](#error-types-and-categories)
3. [Basic Error Handling](#basic-error-handling)
4. [Advanced Retry Strategies](#advanced-retry-strategies)
5. [Circuit Breaker Pattern](#circuit-breaker-pattern)
6. [Error Monitoring and Analytics](#error-monitoring-and-analytics)
7. [Best Practices](#best-practices)
8. [Integration Examples](#integration-examples)
9. [Troubleshooting](#troubleshooting)

## Overview

The GhostSpeak SDK implements a comprehensive error handling system designed for production-grade blockchain applications. The system provides:

- **Intelligent Error Classification**: Automatic categorization of errors with user-friendly messages
- **Advanced Retry Logic**: Multiple backoff strategies with circuit breaker protection
- **Error Monitoring**: Real-time error tracking and analytics
- **Recovery Patterns**: Automated error recovery with graceful degradation
- **Developer Experience**: Rich error context and debugging information

## Error Types and Categories

### Error Categories

All errors in the GhostSpeak SDK are categorized for better handling:

```typescript
enum ErrorCategory {
  NETWORK = 'network',        // Network connectivity issues
  TRANSACTION = 'transaction', // Blockchain transaction errors
  VALIDATION = 'validation',   // Input validation errors
  AUTHORIZATION = 'authorization', // Access control errors
  PROGRAM = 'program',        // Smart contract errors
  ACCOUNT = 'account',        // Account-related errors
  SYSTEM = 'system',          // System-level errors
  USER_INPUT = 'user_input'   // User input errors
}
```

### Error Severity Levels

```typescript
enum ErrorSeverity {
  LOW = 'low',          // Minor issues, operation can continue
  MEDIUM = 'medium',    // Moderate issues, may impact functionality
  HIGH = 'high',        // Serious issues, operation likely to fail
  CRITICAL = 'critical' // Critical issues, immediate attention required
}
```

### Core Error Types

#### GhostSpeakError (Base Class)
```typescript
class GhostSpeakError extends Error {
  public readonly code: string
  public readonly category: ErrorCategory
  public readonly severity: ErrorSeverity
  public readonly context?: ErrorContext
  public readonly retryable: boolean
  public readonly userFriendlyMessage: string
}
```

#### NetworkError
Handles network connectivity issues with automatic retry capabilities:
```typescript
const networkError = new NetworkError('Connection failed', {
  context: { operation: 'fetchAccount' },
  cause: originalError
})
```

#### TransactionError
Manages blockchain transaction failures with comprehensive transaction info:
```typescript
const txError = new TransactionError('Transaction simulation failed', {
  signature: 'abc123...',
  instructionIndex: 2,
  retryable: true
})
```

#### ValidationError
Handles input validation with field-specific information:
```typescript
const validationError = new ValidationError('Invalid amount', {
  field: 'amount',
  expectedFormat: 'positive number'
})
```

## Basic Error Handling

### Simple Error Catching

```typescript
import { GhostSpeakClient, parseRpcError } from '@ghostspeak/sdk'

try {
  const agent = await client.getAgent(agentAddress)
} catch (error) {
  if (error instanceof GhostSpeakError) {
    console.error('Operation failed:', error.userFriendlyMessage)
    console.log('Error code:', error.code)
    console.log('Category:', error.category)
    console.log('Retryable:', error.retryable)
  } else {
    // Convert unknown errors to GhostSpeakError
    const ghostError = parseRpcError(error)
    console.error('Unexpected error:', ghostError.userFriendlyMessage)
  }
}
```

### Error Context and Debugging

```typescript
import { createErrorWithContext, logError } from '@ghostspeak/sdk'

try {
  await someOperation()
} catch (error) {
  const enhancedError = createErrorWithContext(
    error,
    'registerAgent',
    {
      agentAddress: 'abc123...',
      userAddress: 'def456...',
      timestamp: Date.now()
    }
  )
  
  // Log with full context for debugging
  logError(enhancedError, true) // includeStack = true
  
  throw enhancedError
}
```

## Advanced Retry Strategies

### Using the Retry Handler

```typescript
import { RetryHandler, RETRY_CONFIGS } from '@ghostspeak/sdk'

const retryHandler = new RetryHandler(RETRY_CONFIGS.TRANSACTION)

try {
  const result = await retryHandler.executeWithRetry(
    () => client.registerAgent(signer, agentAddress, registryAddress, params),
    'registerAgent'
  )
  console.log('Agent registered successfully:', result)
} catch (error) {
  console.error('Failed after all retries:', error.userFriendlyMessage)
}
```

### Custom Retry Configuration

```typescript
import { AdvancedRetryHandler, RETRY_STRATEGIES } from '@ghostspeak/sdk'

const customConfig = {
  ...RETRY_STRATEGIES.CRITICAL_TRANSACTION,
  maxRetries: 8,
  backoffStrategy: 'fibonacci' as const,
  onRetry: (error, attempt, delay) => {
    console.log(`Retry attempt ${attempt} in ${delay}ms: ${error.message}`)
  },
  onMaxRetriesReached: (error, totalAttempts) => {
    console.error(`Operation failed after ${totalAttempts} attempts`)
  }
}

const retryHandler = new AdvancedRetryHandler(customConfig)

const result = await retryHandler.executeWithRetry(
  () => performCriticalOperation(),
  'criticalOperation',
  customConfig
)
```

### Backoff Strategies

The SDK supports multiple backoff strategies:

1. **Exponential**: `delay = baseDelay * 2^attempt`
2. **Linear**: `delay = baseDelay + (baseDelay * attempt)`
3. **Fibonacci**: `delay = baseDelay * fib(attempt)`
4. **Adaptive**: Adjusts based on error type and history

```typescript
const fibonacciRetry = {
  backoffStrategy: 'fibonacci' as const,
  baseDelay: 1000,
  maxDelay: 30000,
  jitterType: 'proportional' as const
}
```

## Circuit Breaker Pattern

### Basic Circuit Breaker Usage

```typescript
import { AdvancedCircuitBreaker } from '@ghostspeak/sdk'

const circuitBreaker = new AdvancedCircuitBreaker('rpcCalls', {
  failureThreshold: 5,
  successThreshold: 3,
  timeout: 60000,
  failureRateThreshold: 0.5
})

try {
  const result = await circuitBreaker.execute(
    () => client.fetchAccountData(address),
    { operation: 'fetchAccount', address }
  )
} catch (error) {
  if (error.code === 'CIRCUIT_BREAKER_OPEN') {
    console.log('Service temporarily unavailable, trying alternative...')
    // Implement fallback logic
  }
}
```

### Circuit Breaker Monitoring

```typescript
// Get circuit breaker metrics
const metrics = circuitBreaker.getMetrics()
console.log('Circuit breaker state:', metrics.circuitBreakerState)
console.log('Success rate:', metrics.successCount / (metrics.successCount + metrics.failureCount))
console.log('Average latency:', metrics.averageLatency)

// Reset if needed
if (metrics.circuitBreakerState === 'OPEN') {
  circuitBreaker.reset()
}
```

## Error Monitoring and Analytics

### Setting Up Error Monitoring

```typescript
import { ErrorMonitor, DEFAULT_MONITORING_CONFIG } from '@ghostspeak/sdk'

const monitor = new ErrorMonitor({
  ...DEFAULT_MONITORING_CONFIG,
  alerting: {
    enabled: true,
    thresholds: {
      errorRate: 0.05, // 5% error rate threshold
      latency: 3000,   // 3 second latency threshold
      availability: 0.98 // 98% availability threshold
    },
    callbacks: {
      onHighErrorRate: (stats) => {
        console.warn('High error rate detected:', stats.averageErrorRate)
        // Send alert to monitoring service
      },
      onHighLatency: (metrics) => {
        console.warn('High latency detected:', metrics.averageLatency)
      }
    }
  },
  reporting: {
    enabled: true,
    endpoint: 'https://your-monitoring-service.com/errors',
    apiKey: 'your-api-key',
    batchSize: 100,
    flushInterval: 30000
  }
})
```

### Recording Errors

```typescript
import { recordError, defaultErrorMonitor } from '@ghostspeak/sdk'

try {
  await performOperation()
} catch (error) {
  const eventId = recordError(
    error as GhostSpeakError,
    'performOperation',
    {
      userId: 'user123',
      sessionId: 'session456',
      metadata: { attempt: 1 }
    }
  )
  console.log('Error recorded with ID:', eventId)
}
```

### Analyzing Error Statistics

```typescript
import { getErrorStatistics, generateHealthReport } from '@ghostspeak/sdk'

// Get error statistics for the last hour
const stats = getErrorStatistics({
  start: Date.now() - (60 * 60 * 1000),
  end: Date.now()
})

console.log('Total errors:', stats.totalErrors)
console.log('Error rate:', stats.averageErrorRate)
console.log('Top errors:', stats.topErrors)
console.log('Errors by category:', stats.errorsByCategory)

// Generate comprehensive health report
const healthReport = generateHealthReport()
console.log('Overall health:', healthReport.overall.status)
console.log('Health score:', healthReport.overall.score)
console.log('Recommendations:', healthReport.recommendations)
```

## Best Practices

### 1. Use Appropriate Error Categories

```typescript
// Good: Specific error with proper category
throw new ValidationError('Amount must be positive', {
  field: 'amount',
  expectedFormat: 'positive number greater than 0'
})

// Avoid: Generic error without context
throw new Error('Invalid input')
```

### 2. Implement Graceful Degradation

```typescript
async function fetchAgentWithFallback(address: string) {
  try {
    // Try primary RPC endpoint
    return await client.getAgent(address)
  } catch (error) {
    if (error instanceof NetworkError && error.retryable) {
      // Try backup endpoint
      return await backupClient.getAgent(address)
    }
    
    // Return cached data if available
    const cached = getCachedAgent(address)
    if (cached) {
      console.warn('Using cached data due to error:', error.userFriendlyMessage)
      return cached
    }
    
    throw error
  }
}
```

### 3. Use Resilient Operation Wrappers

```typescript
import { createResilientSDKOperation } from '@ghostspeak/sdk'

const resilientFetchAgent = createResilientSDKOperation(
  (address: string) => client.getAgent(address),
  'fetchAgent',
  {
    retryStrategy: 'ACCOUNT_FETCH',
    errorReporting: (error, metrics) => {
      console.log(`Error in fetchAgent: ${error.code}, attempts: ${metrics.totalAttempts}`)
    }
  }
)

// Use like a normal function, but with built-in resilience
const agent = await resilientFetchAgent(agentAddress)
```

### 4. Batch Error Handling

```typescript
import { executeBatchOperations } from '@ghostspeak/sdk'

const addresses = ['addr1', 'addr2', 'addr3', 'addr4', 'addr5']

const result = await executeBatchOperations(
  addresses,
  async (address, index) => {
    return client.getAgent(address)
  },
  {
    concurrency: 3,
    failFast: false,
    retryConfig: RETRY_CONFIGS.ACCOUNT_FETCH,
    onItemError: (error, address, index) => {
      console.warn(`Failed to fetch agent ${address}:`, error.userFriendlyMessage)
    },
    onItemSuccess: (agent, address, index) => {
      console.log(`Successfully fetched agent ${address}`)
    }
  }
)

console.log(`Successful: ${result.successCount}, Failed: ${result.errorCount}`)
console.log('Results:', result.results.filter(r => r !== null))
console.log('Errors:', result.errors.filter(e => e !== null))
```

## Integration Examples

### React Component with Error Handling

```typescript
import React, { useState, useEffect } from 'react'
import { 
  GhostSpeakClient, 
  GhostSpeakError, 
  createResilientSDKOperation,
  formatErrorForUser 
} from '@ghostspeak/sdk'

const AgentProfile: React.FC<{ address: string }> = ({ address }) => {
  const [agent, setAgent] = useState(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const resilientFetchAgent = createResilientSDKOperation(
    (addr: string) => client.getAgent(addr),
    'fetchAgentProfile',
    { retryStrategy: 'ACCOUNT_FETCH' }
  )

  useEffect(() => {
    const fetchAgent = async () => {
      try {
        setLoading(true)
        setError(null)
        const agentData = await resilientFetchAgent(address)
        setAgent(agentData)
      } catch (err) {
        const errorMessage = err instanceof GhostSpeakError 
          ? formatErrorForUser(err)
          : 'An unexpected error occurred'
        setError(errorMessage)
      } finally {
        setLoading(false)
      }
    }

    fetchAgent()
  }, [address])

  if (loading) return <div>Loading agent...</div>
  if (error) return <div className=\"error\">Error: {error}</div>
  if (!agent) return <div>Agent not found</div>

  return <div>Agent: {agent.name}</div>
}
```

### Express.js API with Error Handling

```typescript
import express from 'express'
import { 
  GhostSpeakClient, 
  GhostSpeakError, 
  ErrorCategory,
  defaultErrorMonitor 
} from '@ghostspeak/sdk'

const app = express()

// Error handling middleware
app.use((error: any, req: any, res: any, next: any) => {
  let statusCode = 500
  let message = 'Internal server error'

  if (error instanceof GhostSpeakError) {
    // Record error for monitoring
    defaultErrorMonitor.recordError(error, req.route?.path || 'unknown', {
      method: req.method,
      url: req.url,
      userAgent: req.get('User-Agent')
    })

    // Map error categories to HTTP status codes
    switch (error.category) {
      case ErrorCategory.VALIDATION:
      case ErrorCategory.USER_INPUT:
        statusCode = 400
        break
      case ErrorCategory.AUTHORIZATION:
        statusCode = 403
        break
      case ErrorCategory.ACCOUNT:
        statusCode = 404
        break
      case ErrorCategory.NETWORK:
      case ErrorCategory.SYSTEM:
        statusCode = 503
        break
      default:
        statusCode = 500
    }

    message = error.userFriendlyMessage
  }

  res.status(statusCode).json({
    error: {
      message,
      code: error instanceof GhostSpeakError ? error.code : 'UNKNOWN_ERROR',
      retryable: error instanceof GhostSpeakError ? error.retryable : false
    }
  })
})

app.get('/agent/:address', async (req, res, next) => {
  try {
    const agent = await client.getAgent(req.params.address)
    res.json(agent)
  } catch (error) {
    next(error)
  }
})
```

## Troubleshooting

### Common Error Patterns

1. **High Network Error Rate**
   ```typescript
   // Check RPC endpoint health
   const healthReport = generateHealthReport()
   if (healthReport.statistics.errorsByCategory.network > 0.3) {
     console.log('Consider switching RPC endpoints or implementing connection pooling')
   }
   ```

2. **Circuit Breaker Frequently Opening**
   ```typescript
   // Adjust circuit breaker thresholds
   const circuitBreaker = new AdvancedCircuitBreaker('operation', {
     failureThreshold: 10, // Increase threshold
     timeout: 30000,       // Reduce timeout
     failureRateThreshold: 0.7 // Increase rate threshold
   })
   ```

3. **Transaction Failures**
   ```typescript
   // Implement transaction retry with fresh blockhash
   const retryWithFreshBlockhash = async () => {
     try {
       return await sendTransaction()
     } catch (error) {
       if (error.message.includes('Blockhash not found')) {
         // Get fresh blockhash and retry
         await client.refreshBlockhash()
         return await sendTransaction()
       }
       throw error
     }
   }
   ```

### Debugging Tips

1. **Enable Detailed Logging**
   ```typescript
   import { setupGlobalErrorHandling } from '@ghostspeak/sdk'
   
   setupGlobalErrorHandling({
     logErrors: true,
     errorReporting: (error, context) => {
       console.log(`Error in ${context}:`, error.toJSON())
     }
   })
   ```

2. **Monitor Error Trends**
   ```typescript
   setInterval(() => {
     const stats = getErrorStatistics()
     if (stats.totalErrors > 0) {
       console.log('Error summary:', {
         total: stats.totalErrors,
         rate: stats.averageErrorRate,
         topErrors: stats.topErrors.slice(0, 3)
       })
     }
   }, 60000) // Every minute
   ```

3. **Export Error Data for Analysis**
   ```typescript
   // Export as JSON for detailed analysis
   const errorData = defaultErrorMonitor.exportData('json')
   
   // Export as CSV for spreadsheet analysis
   const csvData = defaultErrorMonitor.exportData('csv')
   ```

## Advanced Configuration

### Custom Error Classes

```typescript
import { GhostSpeakError, ErrorCategory, ErrorSeverity } from '@ghostspeak/sdk'

class CustomBusinessError extends GhostSpeakError {
  constructor(message: string, businessCode: string) {
    super(
      message,
      `BUSINESS_${businessCode}`,
      ErrorCategory.USER_INPUT,
      ErrorSeverity.MEDIUM,
      {
        retryable: false,
        userFriendlyMessage: `Business rule violation: ${message}`
      }
    )
  }
}
```

### Integration with External Monitoring

```typescript
import { ErrorMonitor } from '@ghostspeak/sdk'

const monitor = new ErrorMonitor({
  enabled: true,
  reporting: {
    enabled: true,
    endpoint: 'https://api.datadog.com/api/v1/series',
    apiKey: process.env.DATADOG_API_KEY,
    batchSize: 50,
    flushInterval: 30000
  },
  alerting: {
    enabled: true,
    callbacks: {
      onHighErrorRate: async (stats) => {
        // Send to Slack
        await fetch(process.env.SLACK_WEBHOOK_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: `High error rate detected: ${stats.averageErrorRate.toFixed(2)} errors/hour`
          })
        })
      }
    }
  }
})
```

This comprehensive error handling system ensures that your GhostSpeak SDK integration is robust, observable, and provides excellent user experience even when things go wrong.