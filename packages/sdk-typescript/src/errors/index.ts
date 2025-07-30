/**
 * Comprehensive error handling system for GhostSpeak SDK
 * Provides production-ready error handling with retry logic, user-friendly messages,
 * and comprehensive error categorization
 */

import type { Signature } from '@solana/kit'
import type { GhostspeakMarketplaceError } from '../generated/errors/ghostspeakMarketplace.js'
import { getGhostspeakMarketplaceErrorMessage } from '../generated/errors/ghostspeakMarketplace.js'

/**
 * Error context for better debugging and error tracking
 */
export interface ErrorContext {
  operation: string
  signature?: Signature
  address?: string
  instruction?: string
  timestamp: number
  metadata?: Record<string, unknown>
  userMessage?: string
}

/**
 * Error severity levels for proper error handling and user experience
 */
export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

/**
 * Error categories for better error handling strategies
 */
export enum ErrorCategory {
  NETWORK = 'network',
  TRANSACTION = 'transaction',
  VALIDATION = 'validation',
  AUTHORIZATION = 'authorization',
  PROGRAM = 'program',
  ACCOUNT = 'account',
  SYSTEM = 'system',
  USER_INPUT = 'user_input'
}

/**
 * Base error class with enhanced error tracking and context
 */
export class GhostSpeakError extends Error {
  public readonly code: string
  public readonly category: ErrorCategory
  public readonly severity: ErrorSeverity
  public readonly context?: Partial<ErrorContext>
  public readonly logs?: string[]
  public readonly retryable: boolean
  public readonly userFriendlyMessage: string
  
  constructor(
    message: string,
    code: string,
    category: ErrorCategory,
    severity: ErrorSeverity = ErrorSeverity.MEDIUM,
    options: {
      context?: Partial<ErrorContext>
      logs?: string[]
      retryable?: boolean
      userFriendlyMessage?: string
      cause?: Error
    } = {}
  ) {
    super(message, { cause: options.cause })
    this.name = 'GhostSpeakError'
    this.code = code
    this.category = category
    this.severity = severity
    this.context = options.context
    this.logs = options.logs
    this.retryable = options.retryable ?? false
    this.userFriendlyMessage = options.userFriendlyMessage ?? this.generateUserFriendlyMessage()
  }

  private generateUserFriendlyMessage(): string {
    switch (this.category) {
      case ErrorCategory.NETWORK:
        return 'Network connection issue. Please check your internet connection and try again.'
      case ErrorCategory.TRANSACTION:
        return 'Transaction failed. Please try again or contact support if the issue persists.'
      case ErrorCategory.VALIDATION:
        return 'Invalid input provided. Please check your data and try again.'
      case ErrorCategory.AUTHORIZATION:
        return 'Access denied. Please ensure you have the necessary permissions.'
      case ErrorCategory.PROGRAM:
        return 'Smart contract error. Please try again or contact support.'
      case ErrorCategory.ACCOUNT:
        return 'Account not found or invalid. Please verify the account address.'
      case ErrorCategory.USER_INPUT:
        return 'Invalid input. Please check your data and try again.'
      default:
        return 'An unexpected error occurred. Please try again or contact support.'
    }
  }

  /**
   * Convert error to JSON for logging and debugging
   */
  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      category: this.category,
      severity: this.severity,
      context: this.context,
      logs: this.logs,
      retryable: this.retryable,
      userFriendlyMessage: this.userFriendlyMessage,
      stack: this.stack,
      timestamp: Date.now()
    }
  }
}

/**
 * Network-related errors with automatic retry capabilities
 */
export class NetworkError extends GhostSpeakError {
  constructor(
    message = 'Network connection failed',
    options: {
      endpoint?: string
      context?: Partial<ErrorContext>
      logs?: string[]
      cause?: Error
    } = {}
  ) {
    super(
      message,
      'NETWORK_ERROR',
      ErrorCategory.NETWORK,
      ErrorSeverity.HIGH,
      {
        ...options,
        retryable: true,
        userFriendlyMessage: 'Network connection issue. The request will be retried automatically.'
      }
    )
    this.name = 'NetworkError'
  }
}

/**
 * Transaction-related errors with comprehensive transaction info
 */
export class TransactionError extends GhostSpeakError {
  public readonly signature?: Signature
  public readonly instructionIndex?: number
  
  constructor(
    message: string,
    options: {
      signature?: Signature
      instructionIndex?: number
      context?: Partial<ErrorContext>
      logs?: string[]
      retryable?: boolean
      cause?: Error
    } = {}
  ) {
    super(
      message,
      'TRANSACTION_ERROR',
      ErrorCategory.TRANSACTION,
      ErrorSeverity.HIGH,
      {
        ...options,
        userFriendlyMessage: 'Transaction failed to execute. Please check the details and try again.'
      }
    )
    this.name = 'TransactionError'
    this.signature = options.signature
    this.instructionIndex = options.instructionIndex
  }
}

/**
 * Account-related errors
 */
export class AccountNotFoundError extends GhostSpeakError {
  public readonly address: string
  public readonly accountType: string
  
  constructor(
    accountType: string,
    address: string,
    options: {
      context?: Partial<ErrorContext>
      logs?: string[]
      cause?: Error
    } = {}
  ) {
    super(
      `${accountType} account not found at ${address}`,
      'ACCOUNT_NOT_FOUND',
      ErrorCategory.ACCOUNT,
      ErrorSeverity.MEDIUM,
      {
        ...options,
        retryable: false,
        userFriendlyMessage: `The ${accountType.toLowerCase()} account was not found. Please verify the address.`
      }
    )
    this.name = 'AccountNotFoundError'
    this.address = address
    this.accountType = accountType
  }
}

/**
 * Authorization and access control errors
 */
export class UnauthorizedError extends GhostSpeakError {
  public readonly requiredPermission?: string
  
  constructor(
    message = 'Unauthorized access',
    options: {
      requiredPermission?: string
      context?: Partial<ErrorContext>
      logs?: string[]
      cause?: Error
    } = {}
  ) {
    super(
      message,
      'UNAUTHORIZED_ACCESS',
      ErrorCategory.AUTHORIZATION,
      ErrorSeverity.HIGH,
      {
        ...options,
        retryable: false,
        userFriendlyMessage: 'Access denied. Please ensure you have the necessary permissions.'
      }
    )
    this.name = 'UnauthorizedError'
    this.requiredPermission = options.requiredPermission
  }
}

/**
 * Validation errors for user input
 */
export class ValidationError extends GhostSpeakError {
  public readonly field?: string
  public readonly expectedFormat?: string
  
  constructor(
    message: string,
    options: {
      field?: string
      expectedFormat?: string
      context?: Partial<ErrorContext>
      logs?: string[]
      cause?: Error
    } = {}
  ) {
    super(
      message,
      'VALIDATION_ERROR',
      ErrorCategory.VALIDATION,
      ErrorSeverity.MEDIUM,
      {
        ...options,
        retryable: false,
        userFriendlyMessage: `Invalid ${options.field ?? 'input'}. ${options.expectedFormat ? `Expected format: ${options.expectedFormat}` : 'Please check your input and try again.'}`
      }
    )
    this.name = 'ValidationError'
    this.field = options.field
    this.expectedFormat = options.expectedFormat
  }
}

/**
 * Insufficient funds error
 */
export class InsufficientFundsError extends GhostSpeakError {
  public readonly requiredAmount?: number
  public readonly availableAmount?: number
  
  constructor(
    message = 'Insufficient funds for transaction',
    options: {
      requiredAmount?: number
      availableAmount?: number
      context?: Partial<ErrorContext>
      logs?: string[]
      cause?: Error
    } = {}
  ) {
    super(
      message,
      'INSUFFICIENT_FUNDS',
      ErrorCategory.TRANSACTION,
      ErrorSeverity.HIGH,
      {
        ...options,
        retryable: false,
        userFriendlyMessage: 'Insufficient funds to complete the transaction. Please add more funds and try again.'
      }
    )
    this.name = 'InsufficientFundsError'
    this.requiredAmount = options.requiredAmount
    this.availableAmount = options.availableAmount
  }
}

/**
 * Program execution errors from smart contracts
 */
export class ProgramError extends GhostSpeakError {
  public readonly programErrorCode?: GhostspeakMarketplaceError
  public readonly instructionIndex?: number
  
  constructor(
    programErrorCode: GhostspeakMarketplaceError,
    options: {
      instructionIndex?: number
      context?: Partial<ErrorContext>
      logs?: string[]
      cause?: Error
    } = {}
  ) {
    const errorMessage = getGhostspeakMarketplaceErrorMessage(programErrorCode)
    super(
      `Program error: ${errorMessage}`,
      `PROGRAM_ERROR_${programErrorCode}`,
      ErrorCategory.PROGRAM,
      ErrorSeverity.HIGH,
      {
        ...options,
        retryable: false,
        userFriendlyMessage: `Smart contract error: ${errorMessage}. Please check your input or contact support.`
      }
    )
    this.name = 'ProgramError'
    this.programErrorCode = programErrorCode
    this.instructionIndex = options.instructionIndex
  }
}

/**
 * Rate limiting errors
 */
export class RateLimitError extends GhostSpeakError {
  public readonly retryAfter?: number
  
  constructor(
    message = 'Rate limit exceeded',
    options: {
      retryAfter?: number
      context?: Partial<ErrorContext>
      logs?: string[]
      cause?: Error
    } = {}
  ) {
    super(
      message,
      'RATE_LIMIT_EXCEEDED',
      ErrorCategory.NETWORK,
      ErrorSeverity.MEDIUM,
      {
        ...options,
        retryable: true,
        userFriendlyMessage: `Rate limit exceeded. ${options.retryAfter ? `Please wait ${options.retryAfter} seconds before trying again.` : 'Please wait a moment before trying again.'}`
      }
    )
    this.name = 'RateLimitError'
    this.retryAfter = options.retryAfter
  }
}

/**
 * Timeout errors
 */
export class TimeoutError extends GhostSpeakError {
  public readonly timeoutDuration?: number
  
  constructor(
    message = 'Operation timed out',
    options: {
      timeoutDuration?: number
      context?: Partial<ErrorContext>
      logs?: string[]
      cause?: Error
    } = {}
  ) {
    super(
      message,
      'TIMEOUT_ERROR',
      ErrorCategory.NETWORK,
      ErrorSeverity.MEDIUM,
      {
        ...options,
        retryable: true,
        userFriendlyMessage: 'The operation timed out. Please try again.'
      }
    )
    this.name = 'TimeoutError'
    this.timeoutDuration = options.timeoutDuration
  }
}

/**
 * Deprecated error classes for backward compatibility
 * @deprecated Use the new error classes above
 */
export class InvalidInstructionError extends ValidationError {
  constructor(message = 'Invalid instruction data', logs?: string[]) {
    super(message, { field: 'instruction', logs })
    this.name = 'InvalidInstructionError'
  }
}

export class StateChangeError extends TransactionError {
  constructor(message = 'Account state has changed', logs?: string[]) {
    super(message, { logs, retryable: true })
    this.name = 'StateChangeError'
  }
}

export class DeadlineError extends ValidationError {
  constructor(message = 'Deadline must be in the future', logs?: string[]) {
    super(message, { field: 'deadline', logs })
    this.name = 'DeadlineError'
  }
}

export class CustomProgramError extends ProgramError {
  constructor(code: GhostspeakMarketplaceError, message?: string, logs?: string[]) {
    super(code, { logs })
    this.name = 'CustomProgramError'
  }
}

/**
 * Enhanced error parsing with better error detection and categorization
 */
export function parseErrorFromLogs(logs: string[], context?: Partial<ErrorContext>): GhostSpeakError | null {
  if (!logs || logs.length === 0) return null

  for (const log of logs) {
    // Check for Anchor errors with program error codes
    const anchorMatch = /Error Code: (\w+)\. Error Number: (\d+)\. Error Message: (.+)/.exec(log)
    if (anchorMatch) {
      const [, , errorNumber] = anchorMatch
      const errorCode = parseInt(errorNumber) as GhostspeakMarketplaceError
      return new ProgramError(errorCode, { logs, context })
    }
    
    // Check for insufficient funds
if (log.includes('Error: Insufficient funds')) {
      return new InsufficientFundsError(log, { logs, context })
    }
    
    // Check for invalid instruction data
if (log.includes('Error: Invalid instruction data')) {
      return new ValidationError(log, { field: 'instruction', logs, context })
    }
    
    // Check for account not found
if (log.includes('account not found')) {
      const accountTypeMatch = /(\w+) account not found/.exec(log)
      const accountType = accountTypeMatch?.[1] ?? 'Account'
      const addressMatch = /([A-Za-z0-9]{32,44})/.exec(log)
      const address = addressMatch?.[1] ?? 'unknown'
      return new AccountNotFoundError(accountType, address, { logs, context })
    }
    
    // Check for unauthorized access
if (log.includes('Unauthorized')) {
      return new UnauthorizedError(log, { logs, context })
    }
    
    // Check for deadline errors
if (log.includes('Deadline must be in the future')) {
      return new ValidationError(log, { field: 'deadline', logs, context })
    }
    
    // Check for state change errors
if (log.includes('Account state has changed')) {
      return new TransactionError(log, { logs, context, retryable: true })
    }
    
    // Check for rate limiting
if (log.includes('Rate limit')) {
      const retryAfterMatch = /retry after (\d+)/.exec(log)
      const retryAfter = retryAfterMatch ? parseInt(retryAfterMatch[1]) : undefined
      return new RateLimitError(log, { retryAfter, logs, context })
    }
    
    // Check for timeout errors
if (log.includes('timeout')) {
      return new TimeoutError(log, { logs, context })
    }
    
    // Generic program error with hex code
    const customErrorMatch = /custom program error: 0x([0-9a-fA-F]+)/.exec(log)
    if (customErrorMatch) {
      const errorCode = parseInt(customErrorMatch[1], 16) as GhostspeakMarketplaceError
      return new ProgramError(errorCode, { logs, context })
    }
  }
  
  return null
}

// Enhanced error interface to replace 'any'
interface ParseableError {
  name?: string
  message?: string
  toString?: () => string
  data?: unknown
  error?: unknown
}

/**
 * Enhanced RPC error parsing with better categorization and user-friendly messages
 */
// Interface for structured RPC error data
interface RpcErrorData {
  InstructionError?: readonly [number, unknown]
  [key: string]: unknown
}

// Interface for instruction error details
interface InstructionErrorDetails {
  Custom?: number
  [key: string]: unknown
}

// Type guard for InstructionError
function isInstructionError(value: unknown): value is [number, InstructionErrorDetails | string] {
  return Array.isArray(value) && value.length === 2 && typeof value[0] === 'number'
}

export function parseRpcError(error: ParseableError, context?: Partial<ErrorContext>): GhostSpeakError {
  const message = error.message ?? (typeof error.toString === 'function' ? error.toString() : 'Unknown error')
  const errorData = (error.data ?? error.error ?? {}) as RpcErrorData
  
  // Network-related errors (retryable)
  if (message.includes('fetch failed') || message.includes('Connection refused') || message.includes('ECONNREFUSED')) {
    return new NetworkError('Connection refused', { context, cause: error as Error })
  }
  
  if (message.includes('timeout') || message.includes('ETIMEDOUT')) {
    return new TimeoutError(message, { context, cause: error as Error })
  }
  
  if (message.includes('429') || message.includes('Too Many Requests')) {
    const retryAfterMatch = /retry after (\d+)/.exec(message)
    const retryAfter = retryAfterMatch ? parseInt(retryAfterMatch[1]) : undefined
    return new RateLimitError(message, { retryAfter, context, cause: error as Error })
  }
  
if (message.includes('Network Error')) {
    return new NetworkError(message, { context, cause: error as Error })
  }
  
  // Transaction-related errors
  if (message.includes('Transaction too large')) {
    return new TransactionError(message, { context, cause: error as Error, retryable: false })
  }
  
  if (message.includes('Blockhash not found')) {
    return new TransactionError('Transaction blockhash expired', { context, cause: error as Error, retryable: true })
  }
  
  if (message.includes('Signature verification failed')) {
    return new TransactionError('Invalid transaction signature', { context, cause: error as Error, retryable: false })
  }
  
  if (message.includes('Transaction simulation failed')) {
    return new TransactionError(message, { context, cause: error as Error, retryable: true })
  }
  
  // Account-related errors
  if (message.includes('Account not found') || message.includes('could not find account')) {
    const addressMatch = /([A-Za-z0-9]{32,44})/.exec(message)
    const address = addressMatch?.[1] ?? 'unknown'
    return new AccountNotFoundError('Account', address, { context, cause: error as Error })
  }
  
  // Validation errors
  if (message.includes('Invalid enum variant') || message.includes('failed to deserialize')) {
    return new ValidationError(message, { context, cause: error as Error })
  }
  
if (message.includes('Failed to serialize')) {
    return new ValidationError('Invalid instruction data format', { 
      field: 'instruction', 
      context, 
      cause: error as Error 
    })
  }
  
  // Program errors
  if (errorData.InstructionError && isInstructionError(errorData.InstructionError)) {
    const instructionErrorArray = errorData.InstructionError as [number, InstructionErrorDetails | string]
    const [instructionIndex, instructionErrorRaw] = instructionErrorArray
    const instructionError = instructionErrorRaw
    
    if (typeof instructionError === 'object' && instructionError !== null && 'Custom' in instructionError && instructionError.Custom !== undefined) {
      const errorCode = instructionError.Custom as GhostspeakMarketplaceError
      return new ProgramError(errorCode, { instructionIndex: instructionIndex as number, context, cause: error as Error })
    }
    
    if (instructionError === 'InsufficientFunds') {
      return new InsufficientFundsError('Insufficient funds for transaction', { context, cause: error as Error })
    }
    
    if (instructionError === 'AccountNotFound') {
      return new AccountNotFoundError('Account', 'unknown', { context, cause: error as Error })
    }
    
    return new TransactionError(`Instruction error: ${JSON.stringify(instructionError)}`, {
      instructionIndex: instructionIndex as number,
      context,
      cause: error as Error
    })
  }
  
  // Default error with enhanced context
  return new GhostSpeakError(
    message,
    'UNKNOWN_ERROR',
    ErrorCategory.SYSTEM,
    ErrorSeverity.MEDIUM,
    {
      context,
      cause: error as Error,
      retryable: false,
      userFriendlyMessage: 'An unexpected error occurred. Please try again or contact support if the issue persists.'
    }
  )
}

/**
 * Enhanced simulation error extraction with better context
 */
// Interface for simulation result
interface SimulationResult {
  err?: unknown
  logs?: string[]
}

export function extractSimulationError(result: SimulationResult, context?: Partial<ErrorContext>): GhostSpeakError | null {
  if (!result.err) return null
  
  const logs: string[] = result.logs ?? []
  
  // Try to parse from logs first with context
  const logError = parseErrorFromLogs(logs, context)
  if (logError) return logError
  
  // Handle instruction errors  
  const errorObj = result.err as { InstructionError?: unknown }
  if (errorObj.InstructionError && isInstructionError(errorObj.InstructionError)) {
    const instructionErrorArray = errorObj.InstructionError as [number, InstructionErrorDetails | string]
    const [instructionIndex, error] = instructionErrorArray
    
    if (typeof error === 'object' && error !== null && 'Custom' in error && error.Custom !== undefined) {
      const errorCode = error.Custom as GhostspeakMarketplaceError
      return new ProgramError(errorCode, { instructionIndex, logs, context })
    }
    
    if (error === 'AccountNotFound') {
      return new AccountNotFoundError('Account', 'unknown', { logs, context })
    }
    
    if (error === 'InsufficientFunds') {
      return new InsufficientFundsError('Insufficient funds for transaction', { logs, context })
    }
    
    return new TransactionError(`Instruction error: ${JSON.stringify(error)}`, { 
      instructionIndex: instructionIndex as number, 
      logs, 
      context,
      retryable: false
    })
  }
  
  return new TransactionError('Transaction simulation failed', { logs, context, retryable: true })
}

/**
 * Error recovery and retry utilities
 */

/**
 * Check if an error is retryable based on its type and properties
 */
export function isRetryableError(error: Error): boolean {
  if (error instanceof GhostSpeakError) {
    return error.retryable
  }
  
  // Check for common retryable error patterns
  const retryablePatterns = [
    /network/i,
    /timeout/i,
    /connection/i,
    /rate.?limit/i,
    /429/,
    /502/,
    /503/,
    /504/,
    /blockhash/i,
    /simulate/i
  ]
  
  const errorString = error.toString()
  return retryablePatterns.some(pattern => pattern.test(errorString))
}

/**
 * Get retry delay based on error type and attempt number
 */
export function getRetryDelay(error: Error, attempt: number): number {
  const baseDelay = 1000 // 1 second
  const maxDelay = 30000 // 30 seconds
  
  // Different delays for different error types
  let multiplier = 2
  
  if (error instanceof RateLimitError && error.retryAfter) {
    return error.retryAfter * 1000 // Convert to milliseconds
  }
  
  if (error instanceof NetworkError) {
    multiplier = 1.5 // Faster retry for network errors
  }
  
  if (error instanceof TimeoutError) {
    multiplier = 2.5 // Slower retry for timeout errors
  }
  
  const delay = Math.min(baseDelay * Math.pow(multiplier, attempt), maxDelay)
  
  // Add jitter to prevent thundering herd
  return delay + Math.random() * 1000
}

/**
 * Create an error with context for better debugging
 */
export function createErrorWithContext(
  error: Error | GhostSpeakError,
  operation: string,
  metadata?: Record<string, unknown>
): GhostSpeakError {
  if (error instanceof GhostSpeakError) {
    // Enhance existing error with additional context
    return new GhostSpeakError(
      error.message,
      error.code,
      error.category,
      error.severity,
      {
        context: {
          ...error.context,
          operation,
          metadata: {
            ...error.context?.metadata,
            ...metadata
          },
          timestamp: Date.now()
        },
        logs: error.logs,
        retryable: error.retryable,
        userFriendlyMessage: error.userFriendlyMessage,
        cause: error as Error
      }
    )
  }
  
  // Convert regular error to GhostSpeakError
  return new GhostSpeakError(
    error.message,
    'WRAPPED_ERROR',
    ErrorCategory.SYSTEM,
    ErrorSeverity.MEDIUM,
    {
      context: {
        operation,
        metadata,
        timestamp: Date.now()
      },
      cause: error as Error,
      userFriendlyMessage: 'An unexpected error occurred during the operation.'
    }
  )
}

/**
 * Error logging utility for development and debugging
 */
export function logError(error: GhostSpeakError, includeStack = false): void {
  const errorData = {
    error: error.toJSON(),
    timestamp: new Date().toISOString()
  }
  
  if (includeStack && error.stack) {
    errorData.error.stack = error.stack
  }
  
  // Use different log levels based on severity
  switch (error.severity) {
    case ErrorSeverity.CRITICAL:
      console.error('🚨 CRITICAL ERROR:', errorData)
      break
    case ErrorSeverity.HIGH:
      console.error('❌ HIGH SEVERITY ERROR:', errorData)
      break
    case ErrorSeverity.MEDIUM:
      console.warn('⚠️ MEDIUM SEVERITY ERROR:', errorData)
      break
    case ErrorSeverity.LOW:
      console.log('ℹ️ LOW SEVERITY ERROR:', errorData)
      break
    default:
      console.error('ERROR:', errorData)
  }
}

/**
 * Format error for user display
 */
export function formatErrorForUser(error: GhostSpeakError): string {
  let message = error.userFriendlyMessage
  
  // Add helpful context for specific error types
  if (error instanceof ValidationError && error.field) {
    message += ` (Field: ${error.field})`
  }
  
  if (error instanceof AccountNotFoundError) {
    message += ` (Address: ${error.address.substring(0, 8)}...)`
  }
  
  if (error instanceof RateLimitError && error.retryAfter) {
    message += ` Please wait ${error.retryAfter} seconds.`
  }
  
  return message
}

/**
 * Create error summary for monitoring and analytics
 */
export interface ErrorSummary {
  code: string
  category: ErrorCategory
  severity: ErrorSeverity
  retryable: boolean
  operation?: string
  timestamp: number
  signature?: Signature
  address?: string
}

export function createErrorSummary(error: GhostSpeakError): ErrorSummary {
  return {
    code: error.code,
    category: error.category,
    severity: error.severity,
    retryable: error.retryable,
    operation: error.context?.operation,
    timestamp: error.context?.timestamp ?? Date.now(),
    signature: error.context?.signature,
    address: error.context?.address
  }
}