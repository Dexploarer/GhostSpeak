/**
 * Enhanced error handling service with user-friendly messages and solutions
 */

import chalk from 'chalk';
import { logger } from '../utils/logger.js';
import { getNetworkErrorMessage } from '../utils/network-diagnostics.js';
import { getTimeoutMessage } from '../utils/timeout-messages.js';
import { TimeoutError } from '../utils/timeout.js';

export interface ErrorContext {
  operation?: string;
  suggestion?: string;
  details?: Record<string, unknown>;
}

export class ErrorHandler {
  /**
   * Handle errors with user-friendly messages and actionable solutions
   */
  static handle(error: unknown, context?: ErrorContext): never {
    logger.general.error('Operation failed:', error);

    // Determine error type and provide specific guidance
    if (error instanceof TimeoutError) {
      this.handleTimeoutError(error, context);
    } else if (this.isNetworkError(error)) {
      this.handleNetworkError(error, context);
    } else if (this.isWalletError(error)) {
      this.handleWalletError(error, context);
    } else if (this.isProgramError(error)) {
      this.handleProgramError(error, context);
    } else if (this.isValidationError(error)) {
      this.handleValidationError(error, context);
    } else {
      this.handleGenericError(error, context);
    }

    process.exit(1);
  }

  /**
   * Handle timeout errors with specific guidance
   */
  private static handleTimeoutError(error: TimeoutError, context?: ErrorContext): void {
    console.error(chalk.red('\n❌ Operation Timed Out\n'));
    
    const message = getTimeoutMessage(
      context?.operation || 'Operation',
      error.timeoutMs
    );
    
    console.error(message);
    
    if (context?.suggestion) {
      console.error(chalk.yellow(`\n💡 Additional suggestion: ${context.suggestion}\n`));
    }
  }

  /**
   * Handle network errors with troubleshooting steps
   */
  private static handleNetworkError(error: unknown, context?: ErrorContext): void {
    console.error(chalk.red('\n❌ Network Error\n'));
    
    const message = getNetworkErrorMessage(error);
    console.error(message);
    
    if (context?.operation) {
      console.error(chalk.gray(`\nFailed operation: ${context.operation}`));
    }
  }

  /**
   * Handle wallet configuration errors
   */
  private static handleWalletError(error: unknown, context?: ErrorContext): void {
    console.error(chalk.red('\n❌ Wallet Configuration Error\n'));
    
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`Error: ${errorMessage}\n`);
    
    console.error(chalk.yellow('🔧 Solutions:'));
    console.error('1. Set up a new wallet:');
    console.error('   ' + chalk.cyan('ghostspeak quickstart'));
    console.error('\n2. Use existing Solana wallet:');
    console.error('   ' + chalk.cyan('export ANCHOR_WALLET=~/.config/solana/id.json'));
    console.error('\n3. Check wallet configuration:');
    console.error('   ' + chalk.cyan('ghostspeak doctor'));
    console.error('\n4. View current settings:');
    console.error('   ' + chalk.cyan('ghostspeak config list'));
    
    if (errorMessage.includes('balance')) {
      console.error('\n5. Get devnet SOL:');
      console.error('   ' + chalk.cyan('solana airdrop 2'));
    }
  }

  /**
   * Handle program/smart contract errors
   */
  private static handleProgramError(error: unknown, context?: ErrorContext): void {
    console.error(chalk.red('\n❌ Smart Contract Error\n'));
    
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`Error: ${errorMessage}\n`);
    
    // Parse common Anchor/Solana program errors
    if (errorMessage.includes('AccountNotFound')) {
      console.error(chalk.yellow('The requested account does not exist.\n'));
      console.error('🔧 Solutions:');
      console.error('• Ensure you\'re on the correct network (devnet/mainnet)');
      console.error('• Check if the program is deployed');
      console.error('• Verify the account has been initialized');
    } else if (errorMessage.includes('InsufficientFunds')) {
      console.error(chalk.yellow('Insufficient funds for transaction.\n'));
      console.error('🔧 Solutions:');
      console.error('• Check balance: ' + chalk.cyan('solana balance'));
      console.error('• Get devnet SOL: ' + chalk.cyan('solana airdrop 2'));
    } else if (errorMessage.includes('InvalidProgramId')) {
      console.error(chalk.yellow('Invalid program ID.\n'));
      console.error('🔧 Solutions:');
      console.error('• Check network: ' + chalk.cyan('ghostspeak config get network'));
      console.error('• Verify deployment: ' + chalk.cyan('ghostspeak doctor'));
    } else {
      console.error('🔧 General solutions:');
      console.error('• Check network status: ' + chalk.cyan('ghostspeak doctor'));
      console.error('• Verify program deployment');
      console.error('• Review transaction logs on Solana Explorer');
    }
  }

  /**
   * Handle validation errors
   */
  private static handleValidationError(error: unknown, context?: ErrorContext): void {
    console.error(chalk.red('\n❌ Validation Error\n'));
    
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`Error: ${errorMessage}\n`);
    
    console.error(chalk.yellow('🔧 Common validation issues:'));
    console.error('• Invalid address format (must be base58)');
    console.error('• Missing required fields');
    console.error('• Invalid data types or formats');
    console.error('• Values outside allowed ranges');
    
    if (context?.suggestion) {
      console.error(chalk.cyan(`\n💡 ${context.suggestion}`));
    }
  }

  /**
   * Handle generic errors with helpful guidance
   */
  private static handleGenericError(error: unknown, context?: ErrorContext): void {
    console.error(chalk.red('\n❌ Unexpected Error\n'));
    
    const errorMessage = error instanceof Error 
      ? error.stack || error.message 
      : String(error);
    
    console.error(`Error: ${errorMessage}\n`);
    
    console.error(chalk.yellow('🔧 General troubleshooting:'));
    console.error('1. Run diagnostics: ' + chalk.cyan('ghostspeak doctor'));
    console.error('2. Check logs with --verbose flag');
    console.error('3. Update CLI: ' + chalk.cyan('npm update -g @ghostspeak/cli'));
    console.error('4. Clear cache and retry');
    
    if (context?.operation) {
      console.error(chalk.gray(`\nFailed operation: ${context.operation}`));
    }
    
    console.error(chalk.gray('\nFor help, visit: https://ghostspeak.ai/docs/troubleshooting'));
  }

  /**
   * Check if error is network-related
   */
  private static isNetworkError(error: unknown): boolean {
    if (!(error instanceof Error)) return false;
    
    const networkIndicators = [
      'ECONNREFUSED', 'ETIMEDOUT', 'ENETUNREACH', 'ENOTFOUND',
      'network', 'fetch', 'socket', 'connection', 'timeout',
      '429', '502', '503', 'rate limit'
    ];
    
    const errorStr = error.message.toLowerCase();
    return networkIndicators.some(indicator => 
      errorStr.includes(indicator.toLowerCase())
    );
  }

  /**
   * Check if error is wallet-related
   */
  private static isWalletError(error: unknown): boolean {
    if (!(error instanceof Error)) return false;
    
    const walletIndicators = [
      'wallet', 'keypair', 'signer', 'signature', 'pubkey',
      'private key', 'secret key', 'authority'
    ];
    
    const errorStr = error.message.toLowerCase();
    return walletIndicators.some(indicator => 
      errorStr.includes(indicator.toLowerCase())
    );
  }

  /**
   * Check if error is program/smart contract related
   */
  private static isProgramError(error: unknown): boolean {
    if (!(error instanceof Error)) return false;
    
    const programIndicators = [
      'program', 'instruction', 'account', 'constraint',
      'anchor', 'custom(', 'InvalidProgramId', 'AccountNotFound'
    ];
    
    const errorStr = error.message;
    return programIndicators.some(indicator => 
      errorStr.includes(indicator)
    );
  }

  /**
   * Check if error is validation-related
   */
  private static isValidationError(error: unknown): boolean {
    if (!(error instanceof Error)) return false;
    
    const validationIndicators = [
      'invalid', 'validation', 'required', 'must be',
      'should be', 'format', 'type'
    ];
    
    const errorStr = error.message.toLowerCase();
    return validationIndicators.some(indicator => 
      errorStr.includes(indicator)
    );
  }

  /**
   * Wrap an async operation with comprehensive error handling
   */
  static async wrap<T>(
    operation: () => Promise<T>,
    context: ErrorContext
  ): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      this.handle(error, context);
    }
  }
}

/**
 * Create a wrapped version of a function with error handling
 */
export function withErrorHandling<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  defaultContext?: ErrorContext
): T {
  return (async (...args: Parameters<T>) => {
    try {
      return await fn(...args);
    } catch (error) {
      ErrorHandler.handle(error, defaultContext);
    }
  }) as T;
}