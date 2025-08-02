/**
 * Enhanced error handling for better UX
 * Provides human-readable messages and recovery suggestions
 */

import chalk from 'chalk'
import { log } from '@clack/prompts'

export interface ErrorContext {
  operation?: string
  details?: Record<string, unknown>
  canRetry?: boolean
  suggestion?: string
}

export class ErrorHandler {
  private static readonly ERROR_MAPPINGS = new Map<RegExp, (error: string) => ErrorInfo>([
    [
      /insufficient funds|insufficient lamports/i,
      () => ({
        message: 'Insufficient SOL balance',
        suggestion: 'You need more SOL to complete this transaction.',
        actions: [
          'Run: gs faucet --save (for devnet)',
          'Check balance: gs wallet balance',
          'Transfer SOL from another wallet'
        ],
        canRetry: false
      })
    ],
    [
      /blockhash not found|blockhash expired/i,
      (error) => ({
        message: 'Transaction expired',
        suggestion: 'The transaction took too long and expired.',
        actions: [
          'Try the operation again',
          'Check your network connection',
          'Use a faster RPC endpoint'
        ],
        canRetry: true
      })
    ],
    [
      /account.*does not exist|account.*not found/i,
      () => ({
        message: 'Account not found',
        suggestion: 'The account you\'re trying to interact with doesn\'t exist.',
        actions: [
          'Verify the address is correct',
          'The account may need to be initialized first',
          'Check if you\'re on the correct network (devnet/mainnet)'
        ],
        canRetry: false
      })
    ],
    [
      /already in use|already exists/i,
      (error) => ({
        message: 'Resource already exists',
        suggestion: 'You\'re trying to create something that already exists.',
        actions: [
          'Use a different ID or name',
          'Check existing resources with list commands',
          'Delete the existing resource if needed'
        ],
        canRetry: false
      })
    ],
    [
      /simulation failed/i,
      (error) => ({
        message: 'Transaction simulation failed',
        suggestion: 'The transaction would fail if submitted to the blockchain.',
        actions: [
          'Check all input parameters are correct',
          'Ensure you have the necessary permissions',
          'Verify account states are as expected'
        ],
        canRetry: true
      })
    ],
    [
      /rate limit/i,
      (error) => ({
        message: 'Rate limit exceeded',
        suggestion: 'You\'ve made too many requests too quickly.',
        actions: [
          'Wait 30-60 seconds before retrying',
          'Use a custom RPC endpoint for higher limits',
          'Batch operations when possible'
        ],
        canRetry: true,
        retryDelay: 30000
      })
    ],
    [
      /network|connection|timeout/i,
      (error) => ({
        message: 'Network connection issue',
        suggestion: 'Unable to connect to the Solana network.',
        actions: [
          'Check your internet connection',
          'Try a different RPC endpoint',
          'Check if the RPC service is operational'
        ],
        canRetry: true,
        retryDelay: 5000
      })
    ],
    [
      /unauthorized|permission denied|access denied/i,
      (error) => ({
        message: 'Permission denied',
        suggestion: 'You don\'t have permission to perform this action.',
        actions: [
          'Ensure you\'re using the correct wallet',
          'Check if you have the required role',
          'Verify ownership of the resource'
        ],
        canRetry: false
      })
    ],
    [
      /invalid.*address|malformed.*address/i,
      (error) => ({
        message: 'Invalid address format',
        suggestion: 'The provided address is not a valid Solana address.',
        actions: [
          'Check for typos in the address',
          'Ensure it\'s a base58 encoded string',
          'Verify the address length (44 characters)'
        ],
        canRetry: false
      })
    ],
    [
      /signature.*failed|signing.*failed/i,
      (error) => ({
        message: 'Transaction signing failed',
        suggestion: 'Unable to sign the transaction with your wallet.',
        actions: [
          'Check your wallet is properly configured',
          'Ensure the wallet file exists and is readable',
          'Verify the wallet has the correct permissions'
        ],
        canRetry: true
      })
    ]
  ])

  /**
   * Handle an error with user-friendly output
   */
  static handle(error: Error | unknown, context?: ErrorContext): void {
    const errorMessage = error instanceof Error ? _error.message : String(error)
    const errorInfo = this.parseError(errorMessage)
    
    // Display error header
    console.log('')
    console.log(chalk.red.bold('❌ Error: ') + chalk.red(errorInfo.message))
    
    // Display context if provided
    if (context?.operation) {
      console.log(chalk.gray(`Operation: ${context.operation}`))
    }
    
    // Display suggestion
    if (errorInfo.suggestion || context?.suggestion) {
      console.log('')
      console.log(chalk.yellow('💡 ') + chalk.yellow.bold('What happened:'))
      console.log(chalk.gray(`   ${errorInfo.suggestion || context?.suggestion}`))
    }
    
    // Display actions
    if (errorInfo.actions.length > 0) {
      console.log('')
      console.log(chalk.cyan('🔧 ') + chalk.cyan.bold('How to fix:'))
      errorInfo.actions.forEach((action, index) => {
        console.log(chalk.gray(`   ${index + 1}. ${action}`))
      })
    }
    
    // Display retry information
    if (errorInfo.canRetry || context?.canRetry) {
      console.log('')
      if (errorInfo.retryDelay) {
        const seconds = Math.round(errorInfo.retryDelay / 1000)
        console.log(chalk.gray(`⏱️  You can retry in ${seconds} seconds`))
      } else {
        console.log(chalk.gray('🔄 You can retry this operation'))
      }
    }
    
    // Display technical details for debugging
    if (process.env.DEBUG || process.env.VERBOSE) {
      console.log('')
      console.log(chalk.gray('🐛 Technical details:'))
      console.log(chalk.gray(`   ${errorMessage}`))
      if (error instanceof Error && error.stack) {
        console.log(chalk.gray('   Stack trace:'))
        console.log(chalk.gray(error.stack.split('\n').map(line => '   ' + line).join('\n')))
      }
    }
    
    console.log('')
  }
  
  /**
   * Parse error message and return user-friendly information
   */
  private static parseError(errorMessage: string): ErrorInfo {
    // Check against known error patterns
    for (const [pattern, handler] of this.ERROR_MAPPINGS) {
      if (pattern.test(errorMessage)) {
        return handler(errorMessage)
      }
    }
    
    // Default error info
    return {
      message: this.cleanErrorMessage(errorMessage),
      suggestion: 'An unexpected error occurred.',
      actions: [
        'Check your input parameters',
        'Verify your network connection',
        'Try again in a few moments',
        'Run with DEBUG=1 for more details'
      ],
      canRetry: true
    }
  }
  
  /**
   * Clean up technical error messages
   */
  private static cleanErrorMessage(message: string): string {
    // Remove technical prefixes
    let cleaned = message
      .replace(/^Error:\s*/i, '')
      .replace(/^Failed to\s*/i, '')
      .replace(/^Unable to\s*/i, '')
      .replace(/^Exception:\s*/i, '')
    
    // Remove instruction indices and hashes
    cleaned = cleaned.replace(/instruction \d+:/gi, '')
    cleaned = cleaned.replace(/0x[a-fA-F0-9]+/g, '')
    
    // Remove program IDs
    cleaned = cleaned.replace(/[A-HJ-NP-Z1-9]{44}/g, '<address>')
    
    // Capitalize first letter
    cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1)
    
    return cleaned
  }
  
  /**
   * Create a retry handler with exponential backoff
   */
  static async withRetry<T>(
    operation: () => Promise<T>,
    options: {
      maxRetries?: number
      initialDelay?: number
      maxDelay?: number
      onRetry?: (attempt: number, error: Error) => void
    } = {}
  ): Promise<T> {
    const {
      maxRetries = 3,
      initialDelay = 1000,
      maxDelay = 30000,
      onRetry
    } = options
    
    let lastError: Error
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation()
      } catch (_error) {
        lastError = error instanceof Error ? error : new Error(String(error))
        
        if (attempt === maxRetries) {
          throw lastError
        }
        
        // Calculate delay with exponential backoff
        const delay = Math.min(initialDelay * Math.pow(2, attempt - 1), maxDelay)
        
        if (onRetry) {
          onRetry(attempt, lastError)
        } else {
          log.warn(`Attempt ${attempt} failed, retrying in ${delay}ms...`)
        }
        
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }
    
    throw lastError!
  }
}

interface ErrorInfo {
  message: string
  suggestion: string
  actions: string[]
  canRetry: boolean
  retryDelay?: number
}

/**
 * Helper function to handle errors with context
 */
export function handleError(error: Error | unknown, context?: ErrorContext): void {
  ErrorHandler.handle(error, context)
}

/**
 * Helper function for operations that might need retry
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  options?: Parameters<typeof ErrorHandler.withRetry>[1]
): Promise<T> {
  return ErrorHandler.withRetry(operation, options)
}

/**
 * Format error for display without handling
 */
export function formatError(error: Error | unknown): string {
  const errorMessage = error instanceof Error ? _error.message : String(error)
  return ErrorHandler['cleanErrorMessage'](errorMessage)
}