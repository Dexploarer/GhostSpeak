# Error Handling System

## Overview

A comprehensive error handling system is crucial for debugging and providing clear feedback to users. This guide covers implementing error handling for the GhostSpeak SDK.

## Error Architecture

### Error Hierarchy

```typescript
/**
 * Base error class for all GhostSpeak errors
 */
export class GhostSpeakError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly context?: any
  ) {
    super(message)
    this.name = 'GhostSpeakError'
    Object.setPrototypeOf(this, GhostSpeakError.prototype)
  }
}

/**
 * Program errors from on-chain program
 */
export class GhostSpeakProgramError extends GhostSpeakError {
  constructor(
    message: string,
    public readonly errorCode: number,
    public readonly errorName: string,
    public readonly logs?: string[]
  ) {
    super(message, `PROGRAM_ERROR_${errorCode}`, { logs })
    this.name = 'GhostSpeakProgramError'
  }
}

/**
 * SDK-specific errors
 */
export class GhostSpeakSDKError extends GhostSpeakError {
  constructor(
    message: string,
    code: string,
    context?: any
  ) {
    super(message, `SDK_${code}`, context)
    this.name = 'GhostSpeakSDKError'
  }
}

/**
 * Validation errors
 */
export class GhostSpeakValidationError extends GhostSpeakSDKError {
  constructor(
    message: string,
    public readonly field: string,
    public readonly value: any
  ) {
    super(message, 'VALIDATION_ERROR', { field, value })
    this.name = 'GhostSpeakValidationError'
  }
}

/**
 * Network/RPC errors
 */
export class GhostSpeakNetworkError extends GhostSpeakError {
  constructor(
    message: string,
    public readonly endpoint: string,
    public readonly statusCode?: number
  ) {
    super(message, 'NETWORK_ERROR', { endpoint, statusCode })
    this.name = 'GhostSpeakNetworkError'
  }
}
```

## Program Error Codes

### Error Code Definitions

```typescript
/**
 * Program error codes from Rust program
 */
export enum ProgramErrorCode {
  // Agent errors (6000-6099)
  AgentAlreadyExists = 6000,
  AgentNotFound = 6001,
  NotAgentOwner = 6002,
  AgentAlreadyActive = 6003,
  AgentAlreadyInactive = 6004,
  InvalidAgentType = 6005,
  InvalidMetadataUri = 6006,
  AgentNotVerified = 6007,
  MaxAgentsReached = 6008,
  
  // Escrow errors (6100-6199)
  InsufficientFunds = 6100,
  EscrowExpired = 6101,
  EscrowNotActive = 6102,
  UnauthorizedAccess = 6103,
  InvalidAmount = 6104,
  DisputeActive = 6105,
  InvalidRecipient = 6106,
  MilestoneNotComplete = 6107,
  RefundExceedsAmount = 6108,
  
  // Channel errors (6200-6299)
  ChannelFull = 6200,
  NotChannelMember = 6201,
  AlreadyChannelMember = 6202,
  InvalidChannelType = 6203,
  MessageTooLong = 6204,
  InvalidMessageType = 6205,
  ChannelNotFound = 6206,
  SlowModeActive = 6207,
  
  // Marketplace errors (6300-6399)
  ServiceNotFound = 6300,
  ServiceNotActive = 6301,
  InvalidPricingModel = 6302,
  OrderAlreadyExists = 6303,
  OrderNotFound = 6304,
  InvalidOrderStatus = 6305,
  DeliveryOverdue = 6306,
  
  // Token errors (6400-6499)
  InvalidMintAuthority = 6400,
  MintAlreadyInitialized = 6401,
  ExtensionNotEnabled = 6402,
  InvalidTransferFee = 6403,
  InvalidInterestRate = 6404,
  
  // General errors (6500-6599)
  InvalidInstruction = 6500,
  InvalidAccountData = 6501,
  AccountNotInitialized = 6502,
  SignatureMissing = 6503,
  InvalidProgramId = 6504,
  ArithmeticOverflow = 6505,
  Unauthorized = 6506
}

/**
 * Error messages for each error code
 */
export const ERROR_MESSAGES: Record<number, { name: string; message: string }> = {
  [ProgramErrorCode.AgentAlreadyExists]: {
    name: 'AgentAlreadyExists',
    message: 'An agent with this ID already exists'
  },
  [ProgramErrorCode.AgentNotFound]: {
    name: 'AgentNotFound',
    message: 'Agent account not found'
  },
  [ProgramErrorCode.NotAgentOwner]: {
    name: 'NotAgentOwner',
    message: 'Only the agent owner can perform this action'
  },
  [ProgramErrorCode.InsufficientFunds]: {
    name: 'InsufficientFunds',
    message: 'Insufficient funds for this operation'
  },
  [ProgramErrorCode.EscrowExpired]: {
    name: 'EscrowExpired',
    message: 'This escrow has expired and cannot be completed'
  },
  // ... more error messages
}
```

### Error Code Parser

```typescript
/**
 * Parse error code from transaction logs
 */
export function parseErrorCode(logs: string[]): number | null {
  // Anchor error format: "Program log: AnchorError caused by account: ..."
  // Custom error format: "Program log: Error: Custom program error: 0x1770"
  
  for (const log of logs) {
    // Check for custom program error
    const customMatch = log.match(/Custom program error: 0x([0-9a-fA-F]+)/)
    if (customMatch) {
      return parseInt(customMatch[1], 16)
    }
    
    // Check for error code in decimal
    const decimalMatch = log.match(/Error Code: (\d+)/)
    if (decimalMatch) {
      return parseInt(decimalMatch[1], 10)
    }
    
    // Check for Anchor error format
    const anchorMatch = log.match(/Error Number: (\d+)/)
    if (anchorMatch) {
      return parseInt(anchorMatch[1], 10)
    }
  }
  
  return null
}

/**
 * Create program error from error code
 */
export function createProgramError(
  errorCode: number,
  logs?: string[]
): GhostSpeakProgramError {
  const errorInfo = ERROR_MESSAGES[errorCode]
  
  if (errorInfo) {
    return new GhostSpeakProgramError(
      errorInfo.message,
      errorCode,
      errorInfo.name,
      logs
    )
  }
  
  return new GhostSpeakProgramError(
    `Unknown program error: ${errorCode}`,
    errorCode,
    'UnknownError',
    logs
  )
}
```

## Error Enhancement

### Transaction Error Enhancement

```typescript
/**
 * Enhance raw transaction errors with context
 */
export class ErrorEnhancer {
  /**
   * Enhance a transaction error
   */
  static enhanceTransactionError(
    error: any,
    context: {
      instruction: string
      accounts?: Record<string, Address>
      args?: any
    }
  ): GhostSpeakError {
    // Check if it's already enhanced
    if (error instanceof GhostSpeakError) {
      return error
    }
    
    // Parse Solana errors
    if (this.isSolanaError(error)) {
      return this.parseSolanaError(error, context)
    }
    
    // Parse RPC errors
    if (this.isRpcError(error)) {
      return this.parseRpcError(error, context)
    }
    
    // Default error
    return new GhostSpeakSDKError(
      error.message || 'Unknown error',
      'UNKNOWN_ERROR',
      { ...context, originalError: error }
    )
  }
  
  private static isSolanaError(error: any): boolean {
    return error.logs && Array.isArray(error.logs)
  }
  
  private static parseSolanaError(
    error: any,
    context: any
  ): GhostSpeakError {
    const logs: string[] = error.logs || []
    
    // Try to parse error code
    const errorCode = parseErrorCode(logs)
    if (errorCode !== null) {
      return createProgramError(errorCode, logs)
    }
    
    // Check for common Solana errors
    const logString = logs.join('\n')
    
    if (logString.includes('insufficient funds')) {
      return new GhostSpeakProgramError(
        'Insufficient SOL for transaction fees',
        ProgramErrorCode.InsufficientFunds,
        'InsufficientFunds',
        logs
      )
    }
    
    if (logString.includes('account does not exist')) {
      return new GhostSpeakSDKError(
        'Account does not exist',
        'ACCOUNT_NOT_FOUND',
        { ...context, logs }
      )
    }
    
    if (logString.includes('blockhash not found')) {
      return new GhostSpeakNetworkError(
        'Transaction expired - blockhash not found',
        context.endpoint || 'unknown'
      )
    }
    
    // Generic program error
    return new GhostSpeakProgramError(
      'Transaction failed',
      -1,
      'TransactionFailed',
      logs
    )
  }
  
  private static isRpcError(error: any): boolean {
    return error.code && error.message && typeof error.code === 'number'
  }
  
  private static parseRpcError(
    error: any,
    context: any
  ): GhostSpeakError {
    const rpcErrorMessages: Record<number, string> = {
      [-32700]: 'Parse error - Invalid JSON',
      [-32600]: 'Invalid Request',
      [-32601]: 'Method not found',
      [-32602]: 'Invalid params',
      [-32603]: 'Internal error',
      [-32000]: 'Server error'
    }
    
    const message = rpcErrorMessages[error.code] || error.message
    
    return new GhostSpeakNetworkError(
      message,
      context.endpoint || 'unknown',
      error.code
    )
  }
}
```

### Instruction-Specific Error Messages

```typescript
/**
 * Get user-friendly error message for specific instruction
 */
export function getInstructionErrorMessage(
  instruction: string,
  errorCode: number
): string {
  const messages: Record<string, Record<number, string>> = {
    registerAgent: {
      [ProgramErrorCode.AgentAlreadyExists]: 
        'This agent ID is already taken. Please choose a different ID.',
      [ProgramErrorCode.InvalidMetadataUri]: 
        'The metadata URI is invalid. Please ensure it starts with "ipfs://" or "https://".',
      [ProgramErrorCode.MaxAgentsReached]: 
        'You have reached the maximum number of agents allowed per account.'
    },
    createEscrow: {
      [ProgramErrorCode.InsufficientFunds]: 
        'You do not have enough SOL to create this escrow. Please add funds to your wallet.',
      [ProgramErrorCode.InvalidAmount]: 
        'The escrow amount must be greater than 0.',
      [ProgramErrorCode.InvalidRecipient]: 
        'The recipient address is invalid or does not exist.'
    },
    sendMessage: {
      [ProgramErrorCode.MessageTooLong]: 
        'Your message exceeds the maximum length of 1000 characters.',
      [ProgramErrorCode.NotChannelMember]: 
        'You must join the channel before sending messages.',
      [ProgramErrorCode.SlowModeActive]: 
        'Slow mode is active. Please wait before sending another message.'
    }
  }
  
  return messages[instruction]?.[errorCode] || ERROR_MESSAGES[errorCode]?.message || 'Unknown error'
}
```

## Error Recovery

### Retry Logic

```typescript
/**
 * Retry configuration
 */
export interface RetryConfig {
  maxRetries: number
  initialDelay: number
  maxDelay: number
  backoffMultiplier: number
  retryableErrors: string[]
}

/**
 * Default retry configuration
 */
export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  initialDelay: 1000,
  maxDelay: 10000,
  backoffMultiplier: 2,
  retryableErrors: [
    'NETWORK_ERROR',
    'BLOCKHASH_NOT_FOUND',
    'NODE_BEHIND'
  ]
}

/**
 * Retry with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  config: RetryConfig = DEFAULT_RETRY_CONFIG
): Promise<T> {
  let lastError: any
  let delay = config.initialDelay
  
  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error
      
      // Check if error is retryable
      const isRetryable = error instanceof GhostSpeakError &&
        config.retryableErrors.includes(error.code)
      
      if (!isRetryable || attempt === config.maxRetries) {
        throw error
      }
      
      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, delay))
      
      // Increase delay for next attempt
      delay = Math.min(delay * config.backoffMultiplier, config.maxDelay)
    }
  }
  
  throw lastError
}
```

### Error Recovery Strategies

```typescript
export class ErrorRecovery {
  /**
   * Recover from blockhash expiration
   */
  static async recoverFromBlockhashExpiration(
    transaction: Transaction,
    connection: Connection
  ): Promise<Transaction> {
    // Get fresh blockhash
    const { blockhash, lastValidBlockHeight } = 
      await connection.getLatestBlockhash()
    
    // Update transaction
    transaction.recentBlockhash = blockhash
    
    return transaction
  }
  
  /**
   * Recover from insufficient funds
   */
  static async recoverFromInsufficientFunds(
    payer: Address,
    required: bigint,
    connection: Connection
  ): Promise<boolean> {
    // Check current balance
    const balance = await connection.getBalance(payer)
    
    if (BigInt(balance) >= required) {
      return true // Already has enough
    }
    
    // Calculate needed amount
    const needed = required - BigInt(balance)
    
    throw new GhostSpeakSDKError(
      `Insufficient funds. Need ${needed} more lamports`,
      'INSUFFICIENT_FUNDS',
      { current: balance, required, needed }
    )
  }
  
  /**
   * Recover from account not found
   */
  static async recoverFromAccountNotFound(
    accountAddress: Address,
    accountType: string
  ): Promise<void> {
    throw new GhostSpeakSDKError(
      `${accountType} account not found. It may not be initialized yet.`,
      'ACCOUNT_NOT_FOUND',
      { address: accountAddress, type: accountType }
    )
  }
}
```

## Error Reporting

### Error Context Collection

```typescript
export interface ErrorContext {
  timestamp: number
  instruction?: string
  accounts?: Record<string, string>
  args?: any
  logs?: string[]
  stack?: string
  userAgent?: string
  sdkVersion: string
}

export class ErrorReporter {
  private static context: Partial<ErrorContext> = {
    sdkVersion: '2.0.0'
  }
  
  /**
   * Set global error context
   */
  static setContext(context: Partial<ErrorContext>): void {
    this.context = { ...this.context, ...context }
  }
  
  /**
   * Capture error with context
   */
  static captureError(
    error: Error,
    additionalContext?: Partial<ErrorContext>
  ): ErrorContext {
    const fullContext: ErrorContext = {
      timestamp: Date.now(),
      ...this.context,
      ...additionalContext,
      stack: error.stack
    }
    
    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('GhostSpeak Error:', {
        error,
        context: fullContext
      })
    }
    
    // Could send to error tracking service
    // this.sendToErrorTracking(error, fullContext)
    
    return fullContext
  }
}
```

### User-Friendly Error Display

```typescript
export class ErrorFormatter {
  /**
   * Format error for user display
   */
  static format(error: GhostSpeakError): {
    title: string
    message: string
    details?: string
    actions?: string[]
  } {
    if (error instanceof GhostSpeakProgramError) {
      return this.formatProgramError(error)
    }
    
    if (error instanceof GhostSpeakValidationError) {
      return this.formatValidationError(error)
    }
    
    if (error instanceof GhostSpeakNetworkError) {
      return this.formatNetworkError(error)
    }
    
    return {
      title: 'Error',
      message: error.message
    }
  }
  
  private static formatProgramError(
    error: GhostSpeakProgramError
  ): any {
    const errorInfo = ERROR_MESSAGES[error.errorCode]
    
    return {
      title: errorInfo?.name || 'Transaction Failed',
      message: error.message,
      details: error.logs?.join('\n'),
      actions: this.getSuggestedActions(error.errorCode)
    }
  }
  
  private static formatValidationError(
    error: GhostSpeakValidationError
  ): any {
    return {
      title: 'Validation Error',
      message: error.message,
      details: `Field: ${error.field}\nValue: ${JSON.stringify(error.value)}`
    }
  }
  
  private static formatNetworkError(
    error: GhostSpeakNetworkError
  ): any {
    return {
      title: 'Network Error',
      message: error.message,
      details: `Endpoint: ${error.endpoint}`,
      actions: [
        'Check your internet connection',
        'Try again in a few moments',
        'Switch to a different RPC endpoint'
      ]
    }
  }
  
  private static getSuggestedActions(errorCode: number): string[] {
    const actions: Record<number, string[]> = {
      [ProgramErrorCode.InsufficientFunds]: [
        'Add SOL to your wallet',
        'Reduce the transaction amount',
        'Check your wallet balance'
      ],
      [ProgramErrorCode.AgentAlreadyExists]: [
        'Choose a different agent ID',
        'Check if you already own this agent'
      ],
      [ProgramErrorCode.EscrowExpired]: [
        'Create a new escrow',
        'Contact the other party'
      ]
    }
    
    return actions[errorCode] || []
  }
}
```

## Testing Error Handling

```typescript
describe('Error Handling', () => {
  describe('Error Parsing', () => {
    it('should parse custom program error', () => {
      const logs = [
        'Program log: Error: Custom program error: 0x1770'
      ]
      
      const errorCode = parseErrorCode(logs)
      expect(errorCode).toBe(6000) // 0x1770 = 6000
    })
    
    it('should create program error with message', () => {
      const error = createProgramError(
        ProgramErrorCode.AgentAlreadyExists
      )
      
      expect(error.errorCode).toBe(6000)
      expect(error.errorName).toBe('AgentAlreadyExists')
      expect(error.message).toBe('An agent with this ID already exists')
    })
  })
  
  describe('Error Enhancement', () => {
    it('should enhance transaction error', () => {
      const rawError = {
        logs: [
          'Program log: Error: Custom program error: 0x1770'
        ]
      }
      
      const enhanced = ErrorEnhancer.enhanceTransactionError(
        rawError,
        { instruction: 'registerAgent' }
      )
      
      expect(enhanced).toBeInstanceOf(GhostSpeakProgramError)
      expect((enhanced as GhostSpeakProgramError).errorCode).toBe(6000)
    })
  })
  
  describe('Retry Logic', () => {
    it('should retry on network error', async () => {
      let attempts = 0
      
      const fn = jest.fn().mockImplementation(() => {
        attempts++
        if (attempts < 3) {
          throw new GhostSpeakNetworkError(
            'Network error',
            'https://api.devnet.solana.com'
          )
        }
        return 'success'
      })
      
      const result = await retryWithBackoff(fn, {
        maxRetries: 3,
        initialDelay: 10,
        maxDelay: 100,
        backoffMultiplier: 2,
        retryableErrors: ['NETWORK_ERROR']
      })
      
      expect(result).toBe('success')
      expect(fn).toHaveBeenCalledTimes(3)
    })
  })
})
```

## Best Practices

1. **Always wrap external calls** in try-catch blocks
2. **Enhance errors with context** before throwing
3. **Use specific error types** for different scenarios
4. **Include recovery suggestions** in error messages
5. **Log errors with full context** for debugging
6. **Test error paths** as thoroughly as success paths
7. **Document possible errors** for each function