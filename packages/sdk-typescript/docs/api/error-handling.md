# Error Handling

The GhostSpeak SDK provides comprehensive error handling with typed errors, retry mechanisms, and recovery strategies.

## Overview

All SDK operations can throw errors that extend the base `GhostSpeakError` class. The SDK provides detailed error information, automatic retries for transient errors, and recovery strategies.

```typescript
import { 
  GhostSpeakError,
  ErrorCode,
  isGhostSpeakError,
  withErrorHandling 
} from '@ghostspeak/sdk';
```

## Error Types

### Base Error Class

```typescript
class GhostSpeakError extends Error {
  code: ErrorCode;
  details?: any;
  cause?: Error;
  timestamp: number;
  context?: ErrorContext;
  
  constructor(
    code: ErrorCode,
    message: string,
    details?: any,
    cause?: Error
  ) {
    super(message);
    this.code = code;
    this.details = details;
    this.cause = cause;
    this.timestamp = Date.now();
  }
}
```

### Error Codes

```typescript
enum ErrorCode {
  // Network errors
  NETWORK_ERROR = 'NETWORK_ERROR',
  RPC_ERROR = 'RPC_ERROR',
  TIMEOUT = 'TIMEOUT',
  
  // Transaction errors
  TRANSACTION_FAILED = 'TRANSACTION_FAILED',
  INSUFFICIENT_FUNDS = 'INSUFFICIENT_FUNDS',
  SIGNATURE_VERIFICATION_FAILED = 'SIGNATURE_VERIFICATION_FAILED',
  
  // Account errors
  ACCOUNT_NOT_FOUND = 'ACCOUNT_NOT_FOUND',
  ACCOUNT_ALREADY_EXISTS = 'ACCOUNT_ALREADY_EXISTS',
  INVALID_ACCOUNT_DATA = 'INVALID_ACCOUNT_DATA',
  
  // Agent errors
  AGENT_NOT_FOUND = 'AGENT_NOT_FOUND',
  AGENT_ALREADY_EXISTS = 'AGENT_ALREADY_EXISTS',
  AGENT_NOT_ACTIVE = 'AGENT_NOT_ACTIVE',
  INVALID_AGENT_STATUS = 'INVALID_AGENT_STATUS',
  
  // Marketplace errors
  SERVICE_NOT_FOUND = 'SERVICE_NOT_FOUND',
  JOB_NOT_FOUND = 'JOB_NOT_FOUND',
  WORK_ORDER_NOT_FOUND = 'WORK_ORDER_NOT_FOUND',
  INVALID_PRICING_MODEL = 'INVALID_PRICING_MODEL',
  
  // Escrow errors
  ESCROW_NOT_FOUND = 'ESCROW_NOT_FOUND',
  ESCROW_ALREADY_RELEASED = 'ESCROW_ALREADY_RELEASED',
  ESCROW_DISPUTED = 'ESCROW_DISPUTED',
  MILESTONE_NOT_FOUND = 'MILESTONE_NOT_FOUND',
  
  // Token errors
  INVALID_MINT = 'INVALID_MINT',
  TOKEN_ACCOUNT_NOT_FOUND = 'TOKEN_ACCOUNT_NOT_FOUND',
  INSUFFICIENT_TOKEN_BALANCE = 'INSUFFICIENT_TOKEN_BALANCE',
  TRANSFER_FEE_EXCEEDED = 'TRANSFER_FEE_EXCEEDED',
  
  // IPFS errors
  IPFS_UPLOAD_FAILED = 'IPFS_UPLOAD_FAILED',
  IPFS_RETRIEVE_FAILED = 'IPFS_RETRIEVE_FAILED',
  IPFS_PIN_FAILED = 'IPFS_PIN_FAILED',
  CONTENT_TOO_LARGE = 'CONTENT_TOO_LARGE',
  
  // Validation errors
  INVALID_PARAMETERS = 'INVALID_PARAMETERS',
  VALIDATION_FAILED = 'VALIDATION_FAILED',
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  
  // Rate limiting
  RATE_LIMITED = 'RATE_LIMITED',
  QUOTA_EXCEEDED = 'QUOTA_EXCEEDED',
  
  // Unknown errors
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}
```

## Basic Error Handling

### Try-Catch Pattern

```typescript
try {
  const agent = await client.agent.register(signer, params);
  console.log("Agent registered:", agent);
} catch (error) {
  if (isGhostSpeakError(error)) {
    console.error(`Error ${error.code}: ${error.message}`);
    
    // Handle specific errors
    switch (error.code) {
      case ErrorCode.AGENT_ALREADY_EXISTS:
        console.log("Agent with this address already exists");
        break;
        
      case ErrorCode.INSUFFICIENT_FUNDS:
        const required = error.details?.required;
        const available = error.details?.available;
        console.log(`Need ${required} but only have ${available}`);
        break;
        
      case ErrorCode.NETWORK_ERROR:
        console.log("Network issue, please try again");
        break;
        
      default:
        console.error("Unexpected error:", error);
    }
  } else {
    // Non-SDK error
    console.error("Unknown error:", error);
  }
}
```

### Error Context

```typescript
try {
  await client.escrow.release(signer, escrowAddress, params);
} catch (error) {
  if (isGhostSpeakError(error)) {
    // Access error context
    const context = error.context;
    
    console.log("Operation:", context?.operation);
    console.log("Parameters:", context?.parameters);
    console.log("Account:", context?.account);
    console.log("Transaction:", context?.transaction);
    
    // Log for debugging
    console.error("Full error details:", {
      code: error.code,
      message: error.message,
      details: error.details,
      context: error.context,
      stack: error.stack
    });
  }
}
```

## Automatic Retry

### Default Retry Configuration

```typescript
// SDK retries transient errors automatically
const client = new GhostSpeakClient({
  rpc,
  retryConfig: {
    maxRetries: 3,
    baseDelay: 1000, // 1 second
    maxDelay: 10000, // 10 seconds
    backoffMultiplier: 2,
    retryableErrors: [
      ErrorCode.NETWORK_ERROR,
      ErrorCode.TIMEOUT,
      ErrorCode.RPC_ERROR,
      'BlockhashNotFound',
      'TransactionTimeout'
    ]
  }
});
```

### Custom Retry Logic

```typescript
import { retry, RetryConfig } from '@ghostspeak/sdk';

// Retry with custom configuration
const customRetry: RetryConfig = {
  maxRetries: 5,
  baseDelay: 2000,
  shouldRetry: (error, attempt) => {
    // Custom retry logic
    if (attempt >= 3 && error.code === ErrorCode.RATE_LIMITED) {
      return false; // Stop retrying rate limit after 3 attempts
    }
    
    return [
      ErrorCode.NETWORK_ERROR,
      ErrorCode.TIMEOUT,
      ErrorCode.RPC_ERROR
    ].includes(error.code);
  },
  onRetry: (error, attempt) => {
    console.log(`Retry attempt ${attempt} after error:`, error.message);
  }
};

const result = await retry(
  () => client.agent.getAccount(agentAddress),
  customRetry
);
```

## Error Recovery

### Transaction Recovery

```typescript
// Recover from failed transactions
async function executeWithRecovery(
  operation: () => Promise<string>,
  maxAttempts = 3
) {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      if (!isGhostSpeakError(error)) throw error;
      
      // Handle specific transaction errors
      switch (error.code) {
        case ErrorCode.INSUFFICIENT_FUNDS:
          // Request airdrop on devnet
          if (isDevnet) {
            await requestAirdrop(signer.address);
            continue; // Retry
          }
          throw error;
          
        case ErrorCode.TRANSACTION_FAILED:
          // Check if blockhash expired
          if (error.details?.reason === 'blockhash_expired') {
            console.log("Refreshing blockhash and retrying...");
            continue; // SDK will get fresh blockhash
          }
          throw error;
          
        case ErrorCode.SIGNATURE_VERIFICATION_FAILED:
          // Re-sign transaction
          console.log("Re-signing transaction...");
          continue;
          
        default:
          if (attempt === maxAttempts) throw error;
      }
    }
  }
}

// Usage
const signature = await executeWithRecovery(
  () => client.agent.register(signer, params)
);
```

### State Recovery

```typescript
// Recover from partial operations
class StateRecovery {
  async recoverEscrowCreation(
    workOrder: Address,
    amount: bigint
  ) {
    try {
      // Check if escrow already exists
      const existingEscrow = await client.escrow.findByWorkOrder(
        workOrder
      );
      
      if (existingEscrow) {
        console.log("Escrow already exists:", existingEscrow);
        return existingEscrow;
      }
      
      // Create new escrow
      return await client.escrow.create(signer, {
        workOrder,
        amount,
        recipient: agentAddress
      });
      
    } catch (error) {
      if (error.code === ErrorCode.ESCROW_ALREADY_EXISTS) {
        // Race condition - another process created it
        return client.escrow.findByWorkOrder(workOrder);
      }
      throw error;
    }
  }
}
```

## Error Wrapping

### Wrap External Errors

```typescript
// Wrap non-SDK errors
async function uploadToIPFS(content: any) {
  try {
    const result = await ipfsClient.add(content);
    return result;
  } catch (error) {
    // Wrap IPFS errors as GhostSpeak errors
    throw new GhostSpeakError(
      ErrorCode.IPFS_UPLOAD_FAILED,
      `Failed to upload to IPFS: ${error.message}`,
      {
        provider: 'ipfs',
        contentSize: content.length
      },
      error
    );
  }
}
```

### Error Enhancement

```typescript
// Enhance errors with additional context
function enhanceError(error: Error, context: any): GhostSpeakError {
  if (isGhostSpeakError(error)) {
    error.context = { ...error.context, ...context };
    return error;
  }
  
  return new GhostSpeakError(
    ErrorCode.UNKNOWN_ERROR,
    error.message,
    context,
    error
  );
}

// Usage
try {
  await riskyOperation();
} catch (error) {
  throw enhanceError(error, {
    operation: 'riskyOperation',
    timestamp: Date.now(),
    user: signer.address
  });
}
```

## Error Handlers

### Global Error Handler

```typescript
// Set up global error handler
const errorHandler = new ErrorHandler({
  onError: (error: GhostSpeakError) => {
    // Log to monitoring service
    logger.error({
      code: error.code,
      message: error.message,
      details: error.details,
      stack: error.stack
    });
    
    // Notify user
    if (isUserFacing(error)) {
      showNotification({
        type: 'error',
        message: getUserMessage(error)
      });
    }
    
    // Report to error tracking
    errorReporter.capture(error);
  },
  
  shouldReport: (error: GhostSpeakError) => {
    // Don't report expected errors
    return ![
      ErrorCode.INSUFFICIENT_FUNDS,
      ErrorCode.ACCOUNT_NOT_FOUND,
      ErrorCode.RATE_LIMITED
    ].includes(error.code);
  }
});

// Install handler
client.setErrorHandler(errorHandler);
```

### Specific Error Handlers

```typescript
// Handle specific error types
const escrowErrorHandler = {
  handleMilestoneError: (error: GhostSpeakError) => {
    switch (error.code) {
      case ErrorCode.MILESTONE_NOT_FOUND:
        return { retry: false, message: "Invalid milestone ID" };
        
      case ErrorCode.ESCROW_DISPUTED:
        return { 
          retry: false, 
          message: "Cannot release disputed escrow",
          action: "resolve_dispute"
        };
        
      case ErrorCode.INSUFFICIENT_TOKEN_BALANCE:
        return {
          retry: true,
          message: "Waiting for tokens...",
          delay: 5000
        };
        
      default:
        return { retry: true, message: "Please try again" };
    }
  }
};
```

## Rate Limiting

### Handle Rate Limits

```typescript
// Rate limit handler with backoff
class RateLimitHandler {
  private backoffUntil: Map<string, number> = new Map();
  
  async execute<T>(
    key: string,
    operation: () => Promise<T>
  ): Promise<T> {
    // Check if in backoff
    const backoffTime = this.backoffUntil.get(key);
    if (backoffTime && Date.now() < backoffTime) {
      const waitTime = backoffTime - Date.now();
      throw new GhostSpeakError(
        ErrorCode.RATE_LIMITED,
        `Rate limited. Please wait ${waitTime}ms`,
        { waitTime, key }
      );
    }
    
    try {
      return await operation();
    } catch (error) {
      if (error.code === ErrorCode.RATE_LIMITED) {
        const retryAfter = error.details?.retryAfter || 60000;
        this.backoffUntil.set(key, Date.now() + retryAfter);
      }
      throw error;
    }
  }
}

// Usage
const rateLimiter = new RateLimitHandler();

const result = await rateLimiter.execute(
  'agent-list',
  () => client.agent.list({ limit: 100 })
);
```

### Adaptive Rate Limiting

```typescript
// Adapt to rate limits dynamically
class AdaptiveRateLimiter {
  private requestTimes: number[] = [];
  private limit = 100; // requests per minute
  
  async throttle<T>(operation: () => Promise<T>): Promise<T> {
    // Clean old timestamps
    const oneMinuteAgo = Date.now() - 60000;
    this.requestTimes = this.requestTimes.filter(
      time => time > oneMinuteAgo
    );
    
    // Check if at limit
    if (this.requestTimes.length >= this.limit) {
      const oldestRequest = this.requestTimes[0];
      const waitTime = 60000 - (Date.now() - oldestRequest);
      
      if (waitTime > 0) {
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
    
    // Execute operation
    try {
      const result = await operation();
      this.requestTimes.push(Date.now());
      
      // Increase limit on success
      if (this.requestTimes.length < this.limit * 0.8) {
        this.limit = Math.min(this.limit + 10, 200);
      }
      
      return result;
    } catch (error) {
      if (error.code === ErrorCode.RATE_LIMITED) {
        // Decrease limit on rate limit error
        this.limit = Math.max(this.limit - 20, 10);
      }
      throw error;
    }
  }
}
```

## Error Monitoring

### Error Metrics

```typescript
// Track error metrics
class ErrorMetrics {
  private errors: Map<ErrorCode, number> = new Map();
  private errorTimes: Map<ErrorCode, number[]> = new Map();
  
  recordError(error: GhostSpeakError) {
    // Count errors
    const count = this.errors.get(error.code) || 0;
    this.errors.set(error.code, count + 1);
    
    // Track timing
    const times = this.errorTimes.get(error.code) || [];
    times.push(Date.now());
    this.errorTimes.set(error.code, times);
  }
  
  getMetrics() {
    const metrics: any = {};
    
    for (const [code, count] of this.errors) {
      const times = this.errorTimes.get(code) || [];
      const recentTimes = times.filter(
        t => t > Date.now() - 3600000 // Last hour
      );
      
      metrics[code] = {
        total: count,
        lastHour: recentTimes.length,
        rate: recentTimes.length / 60 // per minute
      };
    }
    
    return metrics;
  }
}
```

### Error Reporting

```typescript
// Report errors to monitoring service
class ErrorReporter {
  async report(error: GhostSpeakError) {
    const report = {
      timestamp: error.timestamp,
      code: error.code,
      message: error.message,
      details: error.details,
      context: error.context,
      stack: error.stack,
      
      // Environment info
      sdk_version: SDK_VERSION,
      cluster: client.config.cluster,
      user: error.context?.user,
      
      // Sanitize sensitive data
      sanitized: this.sanitize(error)
    };
    
    // Send to monitoring service
    await fetch('https://monitoring.ghostspeak.ai/errors', {
      method: 'POST',
      body: JSON.stringify(report),
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': MONITORING_API_KEY
      }
    });
  }
  
  private sanitize(error: GhostSpeakError) {
    // Remove sensitive data
    const sanitized = { ...error.details };
    delete sanitized.privateKey;
    delete sanitized.seedPhrase;
    delete sanitized.apiKey;
    return sanitized;
  }
}
```

## Best Practices

### 1. Specific Error Handling

```typescript
// Handle errors specifically
async function createServiceListing(params: any) {
  try {
    return await client.marketplace.createServiceListing(signer, params);
  } catch (error) {
    // Handle specific marketplace errors
    if (error.code === ErrorCode.INVALID_PRICING_MODEL) {
      console.error("Pricing model validation failed:", error.details);
      // Show specific UI for pricing errors
      showPricingError(error.details);
      return null;
    }
    
    if (error.code === ErrorCode.AGENT_NOT_ACTIVE) {
      console.log("Activating agent first...");
      await client.agent.activate(signer, params.agent);
      // Retry operation
      return createServiceListing(params);
    }
    
    // Re-throw unexpected errors
    throw error;
  }
}
```

### 2. Error Boundaries

```typescript
// Create error boundaries for operations
class OperationBoundary {
  async execute<T>(
    name: string,
    operation: () => Promise<T>,
    fallback?: T
  ): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      console.error(`Operation ${name} failed:`, error);
      
      // Report non-transient errors
      if (this.shouldReport(error)) {
        await this.reporter.report(error);
      }
      
      // Return fallback for recoverable errors
      if (fallback !== undefined && this.isRecoverable(error)) {
        return fallback;
      }
      
      throw error;
    }
  }
  
  private isRecoverable(error: any): boolean {
    return [
      ErrorCode.NETWORK_ERROR,
      ErrorCode.TIMEOUT,
      ErrorCode.RATE_LIMITED
    ].includes(error.code);
  }
}
```

### 3. User-Friendly Messages

```typescript
// Convert technical errors to user-friendly messages
function getUserMessage(error: GhostSpeakError): string {
  const messages: Record<ErrorCode, string> = {
    [ErrorCode.INSUFFICIENT_FUNDS]: 
      "Insufficient balance. Please add funds to continue.",
    
    [ErrorCode.NETWORK_ERROR]: 
      "Network connection issue. Please check your connection.",
    
    [ErrorCode.AGENT_NOT_FOUND]: 
      "Agent not found. It may have been removed.",
    
    [ErrorCode.RATE_LIMITED]: 
      "Too many requests. Please wait a moment.",
    
    [ErrorCode.ESCROW_DISPUTED]: 
      "This payment is under dispute. Contact support.",
    
    [ErrorCode.SIGNATURE_VERIFICATION_FAILED]: 
      "Transaction signing failed. Please try again."
  };
  
  return messages[error.code] || 
    "An unexpected error occurred. Please try again.";
}
```

### 4. Error Prevention

```typescript
// Validate before operations to prevent errors
class ValidationGuard {
  async validateAgentRegistration(params: any) {
    const errors = [];
    
    // Check funds
    const balance = await client.getBalance(signer.address);
    const required = 10000000; // 0.01 SOL
    
    if (balance < required) {
      errors.push({
        code: ErrorCode.INSUFFICIENT_FUNDS,
        message: `Need ${required} lamports, have ${balance}`
      });
    }
    
    // Check name availability
    const existing = await client.agent.findByName(params.name);
    if (existing) {
      errors.push({
        code: ErrorCode.AGENT_ALREADY_EXISTS,
        message: `Agent name "${params.name}" is taken`
      });
    }
    
    // Validate parameters
    if (params.name.length > 64) {
      errors.push({
        code: ErrorCode.INVALID_PARAMETERS,
        message: "Name must be 64 characters or less"
      });
    }
    
    if (errors.length > 0) {
      throw new ValidationError(errors);
    }
  }
}
```