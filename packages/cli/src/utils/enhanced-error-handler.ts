/**
 * Standardized error handling utilities for CLI commands
 */

import chalk from 'chalk'
import { cancel } from '@clack/prompts'
import { 
  ServiceError, 
  ValidationError, 
  NotFoundError, 
  NetworkError, 
  UnauthorizedError 
} from '../types/services.js'

/**
 * Enhanced error information with actionable suggestions
 */
export interface ErrorInfo {
  message: string
  suggestion: string
  actions: string[]
  canRetry: boolean
}

/**
 * Handle service errors with user-friendly messages and suggestions
 */
export function handleServiceError(error: unknown): ErrorInfo {
  // Handle our standardized service errors
  if (error instanceof ServiceError) {
    let actions: string[] = []
    
    if (error instanceof ValidationError) {
      actions = ['Review the input parameters', 'Check the command help for usage examples']
    } else if (error instanceof NotFoundError) {
      actions = ['Verify the ID is correct', 'List available items to find the right one']
    } else if (error instanceof NetworkError) {
      actions = ['Check network connection', 'Verify Solana RPC endpoint is accessible']
    } else if (error instanceof UnauthorizedError) {
      actions = ['Check wallet permissions', 'Ensure you own the resource you\'re trying to modify']
    }
    
    return {
      message: error.message,
      suggestion: error.suggestion ?? 'Please try again',
      actions,
      canRetry: error.canRetry
    }
  }
  
  // Handle unknown errors
   
  const message = error instanceof Error ? error.message : 'Unknown error occurred'
  return {
    message,
    suggestion: 'This is an unexpected error. Please try again or contact support',
    actions: ['Try the command again', 'Check the loghost for more details'],
    canRetry: true
  }
}

/**
 * Display error with formatted output and cancel the operation
 */
export function displayErrorAndCancel(error: unknown, operation = 'Operation'): void {
  const errorInfo = handleServiceError(error)
  
  console.log('')
  console.log(chalk.red('❌ ' + operation + ' failed'))
  console.log(chalk.red('Error: ' + errorInfo.message))
  
  if (errorInfo.suggestion) {
    console.log('')
    console.log(chalk.yellow('💡 Suggestion: ' + errorInfo.suggestion))
  }
  
  if (errorInfo.actions.length > 0) {
    console.log('')
    console.log(chalk.cyan('📋 What you can do:'))
    errorInfo.actions.forEach(action => {
      console.log(chalk.gray('  • ' + action))
    })
  }
  
  if (errorInfo.canRetry) {
    console.log('')
    console.log(chalk.blue('🔄 You can try this command again'))
  }
  
  cancel(chalk.red(operation + ' cancelled'))
}

/**
 * Wrap async command functions with standardized error handling
 */
export function withErrorHandling<T extends unknown[], R>(
  fn: (...args: T) => Promise<R>,
  operation = 'Operation'
) {
  return async (...args: T): Promise<R> => {
    try {
      return await fn(...args)
    } catch (error) {
      displayErrorAndCancel(error, operation)
      throw error // This will never be reached due to process.exit in cancel()
    }
  }
}

/**
 * Create user-friendly error messages for common scenarios
 */
export const ErrorMessages = {
  NO_WALLET: 'No active wallet found. Create or select a wallet first.',
  NETWORK_UNAVAILABLE: 'Unable to connect to Solana network. Check your connection.',
  INSUFFICIENT_FUNDS: 'Insufficient SOL balance for this transaction.',
  INVALID_ADDRESS: 'Invalid Solana address format.',
  AGENT_NOT_FOUND: 'Agent not found. Check the agent ID is correct.',
  UNAUTHORIZED_ACCESS: 'You don\'t have permission to perform this action.',
  VALIDATION_FAILED: 'Input validation failed. Check your parameters.'
} as const