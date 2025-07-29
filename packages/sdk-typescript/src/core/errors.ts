/**
 * Smart Error System with Actionable Solutions
 * 
 * Every error includes context and suggested solutions to help developers
 * quickly resolve issues.
 */

import type { Address } from '@solana/addresses'
import { GhostSpeak } from './types.js'

/**
 * Base GhostSpeak error class
 */
export class GhostSpeakError extends Error {
  public readonly code: GhostSpeak.ErrorCode
  public readonly context: Record<string, unknown>
  public readonly solution?: string
  public readonly instruction?: string

  constructor(
    code: GhostSpeak.ErrorCode,
    message: string,
    context: Record<string, unknown> = {},
    solution?: string,
    instruction?: string
  ) {
    super(message)
    this.name = 'GhostSpeakError'
    this.code = code
    this.context = context
    this.solution = solution
    ;(this as any).instruction = instruction
  }

  /**
   * Format error for display
   */
  toString(): string {
    let output = `${this.name} [${this.code}]: ${this.message}`
    
    if (Object.keys(this.context).length > 0) {
      output += `\nContext: ${JSON.stringify(this.context, null, 2)}`
    }
    
    if (this.solution) {
      output += `\n\n💡 Solution: ${this.solution}`
    }
    
    if (this.instruction) {
      output += `\n\n📖 Learn more: ${this.instruction}`
    }
    
    return output
  }

  /**
   * Convert to SDK error type
   */
  toSDKError(): GhostSpeak.SDKError {
    return {
      code: this.code,
      message: this.message,
      context: this.context,
      solution: this.solution,
      instruction: this.instruction
    }
  }
}

// =====================================================
// SPECIFIC ERROR CLASSES
// =====================================================

/**
 * Network-related errors
 */
export class NetworkError extends GhostSpeakError {
  constructor(endpoint: string, originalError?: Error) {
    super(
      GhostSpeak.ErrorCode.NETWORK_ERROR,
      `Failed to connect to RPC endpoint: ${endpoint}`,
      { endpoint, originalError: originalError?.message },
      'Check your internet connection and verify the RPC endpoint is correct. Try using a different RPC provider.'
    )
  }
}

/**
 * Insufficient balance error
 */
export class InsufficientBalanceError extends GhostSpeakError {
  constructor(required: bigint, available: bigint, address: Address) {
    const requiredSOL = Number(required) / 1e9
    const availableSOL = Number(available) / 1e9
    const neededSOL = requiredSOL - availableSOL
    
    super(
      GhostSpeak.ErrorCode.INSUFFICIENT_BALANCE,
      `Insufficient balance: need ${requiredSOL} SOL but only have ${availableSOL} SOL`,
      { 
        required: required.toString(),
        available: available.toString(),
        address,
        requiredSOL,
        availableSOL,
        neededSOL
      },
      `You need ${neededSOL.toFixed(4)} more SOL. Try:\n` +
      `1. Request devnet SOL: solana airdrop ${Math.ceil(neededSOL)} ${address}\n` +
      `2. Or use: await ghostspeak.fund("${address}", ${Math.ceil(neededSOL)})`
    )
  }
}

/**
 * Account not found error
 */
export class AccountNotFoundError extends GhostSpeakError {
  constructor(address: Address, accountType: string) {
    super(
      GhostSpeak.ErrorCode.ACCOUNT_NOT_FOUND,
      `${accountType} account not found at address: ${address}`,
      { address, accountType },
      `The ${accountType} account doesn't exist. Possible solutions:\n` +
      `1. Verify the address is correct\n` +
      `2. Ensure the account has been created\n` +
      `3. Check you're on the correct network (mainnet/devnet/testnet)`
    )
  }
}

/**
 * Invalid input error
 */
export class InvalidInputError extends GhostSpeakError {
  constructor(field: string, value: unknown, requirement: string) {
    super(
      GhostSpeak.ErrorCode.INVALID_INPUT,
      `Invalid ${field}: ${JSON.stringify(value)}`,
      { field, value, requirement },
      `The ${field} must ${requirement}`
    )
  }
}

/**
 * Transaction failed error
 */
export class TransactionFailedError extends GhostSpeakError {
  constructor(signature: string, logs: string[], programError?: string) {
    const errorLog = logs.find(log => log.includes('Error') || log.includes('failed'))
    
    super(
      GhostSpeak.ErrorCode.TRANSACTION_FAILED,
      `Transaction failed: ${programError || errorLog || 'Unknown error'}`,
      { signature, logs, programError },
      TransactionFailedError.getSolution(logs, programError),
      `https://explorer.solana.com/tx/${signature}?cluster=devnet`
    )
  }

  private static getSolution(logs: string[], programError?: string): string {
    // Analyze logs for common errors
    if (logs.some(log => log.includes('insufficient funds'))) {
      return 'Your account has insufficient SOL. Request an airdrop or add funds.'
    }
    
    if (logs.some(log => log.includes('account is frozen'))) {
      return 'The token account is frozen. Contact the token authority to unfreeze.'
    }
    
    if (logs.some(log => log.includes('owner does not match'))) {
      return 'You are not the owner of this account. Use the correct signer.'
    }
    
    if (logs.some(log => log.includes('already in use'))) {
      return 'This account is already in use. Try a different account or wait.'
    }
    
    if (programError?.includes('custom program error')) {
      const errorCode = programError.match(/0x([0-9a-f]+)/i)?.[1]
      if (errorCode) {
        return `Program error code: 0x${errorCode}. Check the program's error documentation.`
      }
    }
    
    return 'Check the transaction logs for more details. Common issues:\n' +
           '1. Insufficient balance\n' +
           '2. Invalid account state\n' +
           '3. Missing signatures\n' +
           '4. Program-specific requirements not met'
  }
}

/**
 * Simulation failed error
 */
export class SimulationFailedError extends GhostSpeakError {
  constructor(logs: string[], unitsConsumed?: bigint) {
    super(
      GhostSpeak.ErrorCode.SIMULATION_FAILED,
      'Transaction simulation failed',
      { logs, unitsConsumed: unitsConsumed?.toString() },
      'The transaction would fail if submitted. Review the simulation logs to identify the issue.'
    )
  }
}

/**
 * Timeout error
 */
export class TimeoutError extends GhostSpeakError {
  constructor(operation: string, timeoutMs: number) {
    super(
      GhostSpeak.ErrorCode.TIMEOUT,
      `Operation timed out after ${timeoutMs}ms: ${operation}`,
      { operation, timeoutMs },
      'The operation took too long. Try:\n' +
      '1. Increasing the timeout\n' +
      '2. Using a faster RPC endpoint\n' +
      '3. Retrying during lower network congestion'
    )
  }
}

// =====================================================
// ERROR FACTORY
// =====================================================

/**
 * Error factory for creating specific errors
 */
export class ErrorFactory {
  /**
   * Create error from program logs
   */
  static fromProgramLogs(logs: string[], signature?: string): GhostSpeakError {
    const errorLog = logs.find(log => 
      log.includes('Error') || 
      log.includes('failed') ||
      log.includes('custom program error')
    )
    
    if (errorLog?.includes('insufficient funds')) {
      // Extract addresses and amounts if possible
      return new InsufficientBalanceError(0n, 0n, 'unknown' as Address)
    }
    
    if (signature) {
      return new TransactionFailedError(signature, logs, errorLog)
    }
    
    return new SimulationFailedError(logs)
  }

  /**
   * Create error from RPC error
   */
  static fromRpcError(error: unknown, endpoint: string): GhostSpeakError {
    if (error instanceof Error) {
      if (error.message.includes('fetch')) {
        return new NetworkError(endpoint, error)
      }
      
      if (error.message.includes('429')) {
        return new GhostSpeakError(
          GhostSpeak.ErrorCode.RPC_ERROR,
          'Rate limit exceeded',
          { endpoint, error: error.message },
          'You are making too many requests. Try:\n' +
          '1. Adding delays between requests\n' +
          '2. Using a paid RPC endpoint\n' +
          '3. Implementing request batching'
        )
      }
    }
    
    return new GhostSpeakError(
      GhostSpeak.ErrorCode.RPC_ERROR,
      'RPC request failed',
      { endpoint, error: String(error) },
      'Check your RPC endpoint and network connection'
    )
  }
}

// =====================================================
// ERROR HANDLER
// =====================================================

/**
 * Global error handler for consistent error handling
 */
export class ErrorHandler {
  private static handlers: Map<GhostSpeak.ErrorCode, (error: GhostSpeakError) => void> = new Map()

  /**
   * Register error handler
   */
  static on(code: GhostSpeak.ErrorCode, handler: (error: GhostSpeakError) => void): void {
    this.handlers.set(code, handler)
  }

  /**
   * Handle error
   */
  static handle(error: unknown): GhostSpeak.SDKError {
    let ghostSpeakError: GhostSpeakError
    
    if (error instanceof GhostSpeakError) {
      ghostSpeakError = error
    } else if (error instanceof Error) {
      ghostSpeakError = new GhostSpeakError(
        GhostSpeak.ErrorCode.UNKNOWN_ERROR,
        error.message,
        { originalError: error.name }
      )
    } else {
      ghostSpeakError = new GhostSpeakError(
        GhostSpeak.ErrorCode.UNKNOWN_ERROR,
        String(error)
      )
    }
    
    // Call registered handler if exists
    const handler = this.handlers.get(ghostSpeakError.code)
    if (handler) {
      handler(ghostSpeakError)
    }
    
    // Log error in development
    if (process.env.NODE_ENV === 'development') {
      console.error(ghostSpeakError.toString())
    }
    
    return ghostSpeakError.toSDKError()
  }
}

/**
 * Validation error for invalid inputs
 */
export class ValidationError extends GhostSpeakError {
  constructor(message: string, context: Record<string, unknown> = {}) {
    super(
      GhostSpeak.ErrorCode.INVALID_INPUT,
      message,
      context,
      'Check input parameters and ensure they meet the required format and constraints'
    )
    this.name = 'ValidationError'
  }
}

// =====================================================
// EXPORTS
// =====================================================

export default {
  GhostSpeakError,
  NetworkError,
  InsufficientBalanceError,
  AccountNotFoundError,
  InvalidInputError,
  TransactionFailedError,
  SimulationFailedError,
  TimeoutError,
  ValidationError,
  ErrorFactory,
  ErrorHandler
}