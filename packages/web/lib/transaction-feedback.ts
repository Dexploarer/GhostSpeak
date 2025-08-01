'use client'

import { toast } from 'sonner'
// Import only what we need (icons are referenced in comments for future use)

export interface TransactionDetails {
  signature?: string
  type: 'purchase' | 'listing' | 'escrow' | 'governance' | 'agent'
  amount?: bigint
  description: string
  explorerUrl?: string
}

export interface TransactionState {
  status: 'pending' | 'confirming' | 'confirmed' | 'failed'
  details: TransactionDetails
  startTime: number
  confirmations?: number
  estimatedTime?: number
}

class TransactionFeedbackManager {
  private activeTransactions = new Map<string, TransactionState>()
  private toastIds = new Map<string, string | number>()

  /**
   * Start tracking a transaction with immediate feedback
   */
  startTransaction(id: string, details: TransactionDetails): void {
    const state: TransactionState = {
      status: 'pending',
      details,
      startTime: Date.now(),
      estimatedTime: this.getEstimatedTime(details.type),
    }

    this.activeTransactions.set(id, state)

    // Show initial toast
    const toastId = toast.loading(`Processing ${details.type}...`, {
      description: details.description,
      duration: Infinity,
      action: details.explorerUrl
        ? {
            label: 'View',
            onClick: () => window.open(details.explorerUrl, '_blank'),
          }
        : undefined,
    })

    this.toastIds.set(id, toastId)
  }

  /**
   * Update transaction with signature (transaction sent)
   */
  updateWithSignature(id: string, signature: string): void {
    const state = this.activeTransactions.get(id)
    if (!state) return

    state.status = 'confirming'
    state.details.signature = signature
    state.details.explorerUrl = this.getExplorerUrl(signature)

    const toastId = this.toastIds.get(id)
    if (toastId) {
      toast.dismiss(toastId)
    }

    const newToastId = toast.loading(`Confirming ${state.details.type}...`, {
      description: `Transaction sent • ${this.formatElapsedTime(state.startTime)}`,
      duration: Infinity,
      action: {
        label: 'Explorer',
        onClick: () => window.open(state.details.explorerUrl, '_blank'),
      },
    })

    this.toastIds.set(id, newToastId)
    this.activeTransactions.set(id, state)
  }

  /**
   * Mark transaction as confirmed
   */
  confirmTransaction(id: string, confirmations = 1): void {
    const state = this.activeTransactions.get(id)
    if (!state) return

    state.status = 'confirmed'
    state.confirmations = confirmations

    const toastId = this.toastIds.get(id)
    if (toastId) {
      toast.dismiss(toastId)
    }

    toast.success(`${this.capitalizeFirst(state.details.type)} confirmed!`, {
      description: this.getSuccessMessage(state),
      action: state.details.explorerUrl
        ? {
            label: 'View Details',
            onClick: () => window.open(state.details.explorerUrl, '_blank'),
          }
        : undefined,
    })

    // Clean up after delay
    setTimeout(() => {
      this.activeTransactions.delete(id)
      this.toastIds.delete(id)
    }, 5000)
  }

  /**
   * Mark transaction as failed
   */
  failTransaction(id: string, error: string): void {
    const state = this.activeTransactions.get(id)
    if (!state) return

    state.status = 'failed'

    const toastId = this.toastIds.get(id)
    if (toastId) {
      toast.dismiss(toastId)
    }

    toast.error(`${this.capitalizeFirst(state.details.type)} failed`, {
      description: this.formatError(error),
      action: state.details.explorerUrl
        ? {
            label: 'Explorer',
            onClick: () => window.open(state.details.explorerUrl, '_blank'),
          }
        : undefined,
    })

    // Clean up after delay
    setTimeout(() => {
      this.activeTransactions.delete(id)
      this.toastIds.delete(id)
    }, 10000)
  }

  /**
   * Get current transaction state
   */
  getTransactionState(id: string): TransactionState | null {
    return this.activeTransactions.get(id) || null
  }

  /**
   * Get all active transactions
   */
  getActiveTransactions(): Map<string, TransactionState> {
    return new Map(this.activeTransactions)
  }

  private getEstimatedTime(type: TransactionDetails['type']): number {
    // Estimated times in milliseconds
    switch (type) {
      case 'purchase':
      case 'listing':
        return 15000 // 15 seconds
      case 'escrow':
        return 20000 // 20 seconds
      case 'governance':
        return 25000 // 25 seconds
      case 'agent':
        return 10000 // 10 seconds
      default:
        return 15000
    }
  }

  private getExplorerUrl(signature: string): string {
    // Use the appropriate Solana explorer
    return `https://explorer.solana.com/tx/${signature}?cluster=devnet`
  }

  private formatElapsedTime(startTime: number): string {
    const elapsed = Math.floor((Date.now() - startTime) / 1000)
    if (elapsed < 60) {
      return `${elapsed}s`
    }
    const minutes = Math.floor(elapsed / 60)
    const seconds = elapsed % 60
    return `${minutes}m ${seconds}s`
  }

  private capitalizeFirst(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1)
  }

  private getSuccessMessage(state: TransactionState): string {
    const elapsed = this.formatElapsedTime(state.startTime)
    const base = `Completed in ${elapsed}`

    if (state.details.amount) {
      const solAmount = Number(state.details.amount) / 1e9
      return `${base} • ${solAmount.toFixed(4)} SOL`
    }

    return base
  }

  private formatError(error: string): string {
    // Clean up common error messages
    if (error.includes('insufficient funds')) {
      return 'Insufficient SOL balance for transaction'
    }
    if (error.includes('rejected')) {
      return 'Transaction was rejected by wallet'
    }
    if (error.includes('timeout')) {
      return 'Transaction timed out - please try again'
    }
    if (error.includes('network')) {
      return 'Network error - check your connection'
    }

    // Truncate very long error messages
    return error.length > 100 ? `${error.substring(0, 100)}...` : error
  }
}

// Export singleton instance
export const transactionFeedback = new TransactionFeedbackManager()

// Helper hooks for React components
export function useTransactionFeedback() {
  return {
    startTransaction: transactionFeedback.startTransaction.bind(transactionFeedback),
    updateWithSignature: transactionFeedback.updateWithSignature.bind(transactionFeedback),
    confirmTransaction: transactionFeedback.confirmTransaction.bind(transactionFeedback),
    failTransaction: transactionFeedback.failTransaction.bind(transactionFeedback),
    getTransactionState: transactionFeedback.getTransactionState.bind(transactionFeedback),
    getActiveTransactions: transactionFeedback.getActiveTransactions.bind(transactionFeedback),
  }
}
