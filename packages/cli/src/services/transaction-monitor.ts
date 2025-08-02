/**
 * Transaction monitoring service for better UX
 * Provides real-time progress tracking and status updates
 */

import chalk from 'chalk'
import { spinner as createSpinner, log } from '@clack/prompts'
import { homedir } from 'os'
import { join } from 'path'
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'

// Define a proper type for the spinner
interface Spinner {
  start(message: string): void
  stop(message: string): void
  message(message: string): void
}

export interface Transaction {
  id: string
  signature: string
  status: 'pending' | 'confirming' | 'confirmed' | 'failed'
  description: string
  amount?: string
  timestamp: number
  error?: string
  retries?: number
  network: string
}

export interface TransactionProgress {
  current: number
  total: number
  message: string
}

const TRANSACTION_HISTORY_FILE = join(homedir(), '.ghostspeak', 'transaction-history.json')
const MAX_HISTORY_ITEMS = 100

export class TransactionMonitor {
  private static instance: TransactionMonitor | undefined
  private transactions: Map<string, Transaction> = new Map()
  private activeSpinners: Map<string, Spinner> = new Map()
  
  private constructor() {
    this.loadHistory()
  }
  
  static getInstance(): TransactionMonitor {
    return (this.instance ??= new TransactionMonitor())
  }
  
  /**
   * Start monitoring a transaction with progress indicator
   */
  async startTransaction(
    signature: string,
    description: string,
    network = 'devnet',
    amount?: string
  ): Promise<string> {
    const id = `tx_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
    
    const transaction: Transaction = {
      id,
      signature,
      status: 'pending',
      description,
      amount,
      timestamp: Date.now(),
      network,
      retries: 0
    }
    
    this.transactions.set(id, transaction)
    
    // Create spinner with descriptive message
    const spinner = createSpinner() as Spinner
    const displayAmount = amount ? ` (${amount})` : ''
    spinner.start(`${description}${displayAmount}`)
    
    this.activeSpinners.set(id, spinner)
    
    // Save to history
    this.saveHistory()
    
    return id
  }
  
  /**
   * Update transaction progress with detailed status
   */
  updateProgress(id: string, progress: Partial<TransactionProgress>): void {
    const spinner = this.activeSpinners.get(id)
    const transaction = this.transactions.get(id)
    
    if (!spinner || !transaction) return
    
    if (progress.message) {
      const displayAmount = transaction.amount ? ` (${transaction.amount})` : ''
      
      // Add progress percentage if available
      if (progress.current !== undefined && progress.total !== undefined) {
        const percentage = Math.round((progress.current / progress.total) * 100)
        spinner.message(`${progress.message}${displayAmount} [${percentage}%]`)
      } else {
        spinner.message(`${progress.message}${displayAmount}`)
      }
    }
  }
  
  /**
   * Mark transaction as confirming
   */
  setConfirming(id: string): void {
    const transaction = this.transactions.get(id)
    if (transaction) {
      transaction.status = 'confirming'
      this.updateProgress(id, {
        message: `⏳ Confirming ${transaction.description}`
      })
    }
  }
  
  /**
   * Mark transaction as successful
   */
  setSuccess(id: string, finalMessage?: string): void {
    const spinner = this.activeSpinners.get(id)
    const transaction = this.transactions.get(id)
    
    if (!spinner || !transaction) return
    
    transaction.status = 'confirmed'
    
    const message = finalMessage ?? `✅ ${transaction.description} completed!`
    spinner.stop(message)
    
    this.activeSpinners.delete(id)
    this.saveHistory()
    
    // Show transaction details
    this.showTransactionSummary(transaction)
  }
  
  /**
   * Mark transaction as failed with error details
   */
  setFailed(id: string, error: Error | string, canRetry = true): void {
    const spinner = this.activeSpinners.get(id)
    const transaction = this.transactions.get(id)
    
    if (!spinner || !transaction) return
    
    transaction.status = 'failed'
    transaction.error = error instanceof Error ? _error.message : error
    
    // Stop spinner with error
    spinner.stop(`❌ ${transaction.description} failed`)
    
    this.activeSpinners.delete(id)
    this.saveHistory()
    
    // Show detailed error with suggestions
    this.showErrorDetails(transaction, canRetry)
  }
  
  /**
   * Retry a failed transaction
   */
  async retryTransaction(id: string): Promise<void> {
    const transaction = this.transactions.get(id)
    if (!transaction || transaction.status !== 'failed') return
    
    transaction.retries = (transaction.retries ?? 0) + 1
    transaction.status = 'pending'
    transaction.error = undefined
    
    // Create new spinner for retry
    const spinner = createSpinner() as Spinner
    spinner.start(`🔄 Retrying ${transaction.description} (attempt ${transaction.retries})`)
    
    this.activeSpinners.set(id, spinner)
  }
  
  /**
   * Get transaction history
   */
  getHistory(limit = 10): Transaction[] {
    const allTransactions = Array.from(this.transactions.values())
    return allTransactions
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit)
  }
  
  /**
   * Show transaction summary with helpful information
   */
  private showTransactionSummary(transaction: Transaction): void {
    console.log('')
    console.log(chalk.gray('Transaction Details:'))
    console.log(chalk.gray(`  Signature: ${this.shortenSignature(transaction.signature)}`))
    if (transaction.amount) {
      console.log(chalk.gray(`  Amount: ${transaction.amount}`))
    }
    console.log(chalk.gray(`  Network: ${transaction.network}`))
    console.log(chalk.gray(`  Time: ${new Date(transaction.timestamp).toLocaleTimeString()}`))
    console.log('')
    console.log(chalk.cyan(`  View on Explorer: ${this.getExplorerUrl(transaction.signature, transaction.network)}`))
  }
  
  /**
   * Show detailed error information with recovery suggestions
   */
  private showErrorDetails(transaction: Transaction, canRetry: boolean): void {
    console.log('')
    console.log(chalk.red('Error Details:'))
    
    const errorMessage = transaction.error ?? 'Unknown error'
    const suggestion = this.getErrorSuggestion(errorMessage)
    
    console.log(chalk.gray(`  ${errorMessage}`))
    
    if (suggestion) {
      console.log('')
      console.log(chalk.yellow('💡 Suggestion:'))
      console.log(chalk.gray(`  ${suggestion}`))
    }
    
    if (canRetry && (transaction.retries === undefined || transaction.retries < 3)) {
      console.log('')
      console.log(chalk.gray('  You can retry this transaction with the same parameters'))
    }
  }
  
  /**
   * Get helpful suggestion based on error message
   */
  private getErrorSuggestion(error: string): string | null {
    const errorLower = error.toLowerCase()
    
    if (errorLower.includes('insufficient funds') || errorLower.includes('insufficient lamports')) {
      return 'You need more SOL. Run: gs faucet --save'
    }
    
    if (errorLower.includes('blockhash not found') || errorLower.includes('blockhash expired')) {
      return 'Transaction expired. Please try again.'
    }
    
    if (errorLower.includes('account does not exist')) {
      return 'The account you\'re trying to interact with doesn\'t exist. It may need to be initialized first.'
    }
    
    if (errorLower.includes('simulation failed')) {
      return 'Transaction simulation failed. Check that all parameters are correct.'
    }
    
    if (errorLower.includes('network') || errorLower.includes('connection')) {
      return 'Network connection issue. Check your internet connection and try again.'
    }
    
    if (errorLower.includes('rate limit')) {
      return 'You\'ve hit the rate limit. Please wait a moment and try again.'
    }
    
    return null
  }
  
  /**
   * Load transaction history from file
   */
  private loadHistory(): void {
    try {
      if (existsSync(TRANSACTION_HISTORY_FILE)) {
        const data = JSON.parse(readFileSync(TRANSACTION_HISTORY_FILE, 'utf-8')) as Transaction[]
        data.forEach(tx => this.transactions.set(tx.id, tx))
      }
    } catch (_) {
      // Ignore errors loading history
    }
  }
  
  /**
   * Save transaction history to file
   */
  private saveHistory(): void {
    try {
      const dir = join(homedir(), '.ghostspeak')
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true })
      }
      
      // Keep only recent transactions
      const recent = this.getHistory(MAX_HISTORY_ITEMS)
      writeFileSync(TRANSACTION_HISTORY_FILE, JSON.stringify(recent, null, 2))
    } catch (_) {
      // Ignore errors saving history
    }
  }
  
  /**
   * Shorten signature for display
   */
  private shortenSignature(signature: string): string {
    if (signature.length <= 20) return signature
    return `${signature.slice(0, 8)}...${signature.slice(-8)}`
  }
  
  /**
   * Get explorer URL for transaction
   */
  private getExplorerUrl(signature: string, network: string): string {
    const cluster = network === 'mainnet-beta' ? '' : `?cluster=${network}`
    return `https://explorer.solana.com/tx/${signature}${cluster}`
  }
  
  /**
   * Show recent transaction history
   */
  showRecentTransactions(limit = 5): void {
    const recent = this.getHistory(limit)
    
    if (recent.length === 0) {
      log.info('No recent transactions')
      return
    }
    
    console.log(chalk.bold('\n📜 Recent Transactions:\n'))
    
    recent.forEach((tx, index) => {
      const statusIcon = tx.status === 'confirmed' ? '✅' : 
                        tx.status === 'failed' ? '❌' : '⏳'
      const time = new Date(tx.timestamp).toLocaleString()
      
      console.log(chalk.gray(`${index + 1}. ${statusIcon} ${tx.description}`))
      console.log(chalk.gray(`   ${this.shortenSignature(tx.signature)}`))
      if (tx.amount) {
        console.log(chalk.gray(`   Amount: ${tx.amount}`))
      }
      console.log(chalk.gray(`   Time: ${time}`))
      if (tx.error) {
        console.log(chalk.red(`   Error: ${tx.error}`))
      }
      console.log('')
    })
  }
}

/**
 * Helper function to track a transaction with automatic monitoring
 */
export async function trackTransaction(
  signature: string,
  description: string,
  network = 'devnet',
  amount?: string
): Promise<string> {
  const monitor = TransactionMonitor.getInstance()
  return monitor.startTransaction(signature, description, network, amount)
}

/**
 * Helper to update transaction progress
 */
export function updateTransactionProgress(
  id: string,
  progress: Partial<TransactionProgress>
): void {
  const monitor = TransactionMonitor.getInstance()
  monitor.updateProgress(id, progress)
}

/**
 * Helper to mark transaction as successful
 */
export function transactionSuccess(id: string, message?: string): void {
  const monitor = TransactionMonitor.getInstance()
  monitor.setSuccess(id, message)
}

/**
 * Helper to mark transaction as failed
 */
export function transactionFailed(
  id: string,
  error: Error | string,
  canRetry = true
): void {
  const monitor = TransactionMonitor.getInstance()
  monitor.setFailed(id, error, canRetry)
}

/**
 * Show transaction history
 */
export function showTransactionHistory(limit = 5): void {
  const monitor = TransactionMonitor.getInstance()
  monitor.showRecentTransactions(limit)
}