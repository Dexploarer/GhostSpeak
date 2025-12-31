/**
 * Transaction Confirmation System for GhostSpeak CLI
 * 
 * Provides detailed transaction previews, security warnings,
 * and user confirmation flows before executing blockchain transactions.
 * 
 * @example
 * ```typescript
 * const confirmationSystem = new TransactionConfirmationSystem()
 * 
 * const confirmed = await confirmationSystem.confirmTransaction({
 *   type: 'agent_register',
 *   data: agentData,
 *   estimatedCost: { sol: 0.01, usd: 2.50 },
 *   warnings: ['This action cannot be undone']
 * })
 * 
 * if (confirmed) {
 *   await executeTransaction()
 * }
 * ```
 */

import { EventEmitter } from 'events'
import { confirm, select, multiselect, text, password } from '@clack/prompts'
import { formatSOL, formatTimestamp, infoBox, warningBox, keyValue } from '../utils/format-helpers'
import { EventBus } from './event-system'

/**
 * Transaction types for different confirmation flows
 */
export type TransactionType =
  | 'agent_register'
  | 'agent_update'
  | 'auction_bid'
  | 'governance_vote'
  | 'token_transfer'
  | 'custom'

/**
 * Transaction cost breakdown
 */
export interface TransactionCost {
  /** SOL amount */
  sol: number
  /** USD equivalent */
  usd?: number
  /** Gas/compute units */
  computeUnits?: number
  /** Network fees breakdown */
  fees?: {
    baseFee: number
    priorityFee: number
    totalFee: number
  }
}

/**
 * Transaction details for confirmation
 */
export interface TransactionDetails {
  /** Transaction type */
  type: TransactionType
  /** Human-readable title */
  title?: string
  /** Transaction description */
  description?: string
  /** Transaction data/payload */
  data: unknown
  /** Estimated costs */
  estimatedCost: TransactionCost
  /** Security warnings */
  warnings?: string[]
  /** Additional metadata */
  metadata?: Record<string, unknown>
  /** Target addresses involved */
  addresses?: {
    from?: string
    to?: string
    program?: string
  }
  /** Expiration time */
  expiresAt?: Date
  /** Required confirmations */
  requiredConfirmations?: number
}

/**
 * Confirmation options
 */
export interface ConfirmationOptions {
  /** Skip certain checks for trusted operations */
  skipWarnings?: boolean
  /** Require password confirmation */
  requirePassword?: boolean
  /** Show advanced details */
  showAdvanced?: boolean
  /** Timeout for confirmation */
  timeout?: number
  /** Custom confirmation message */
  customMessage?: string
}

/**
 * Confirmation result
 */
export interface ConfirmationResult {
  /** Whether user confirmed */
  confirmed: boolean
  /** User-provided password (if required) */
  password?: string
  /** Selected options */
  selectedOptions?: string[]
  /** Confirmation timestamp */
  timestamp: Date
  /** Additional user input */
  userInput?: Record<string, unknown>
}

/**
 * Security warning levels
 */
export type WarningLevel = 'info' | 'warning' | 'critical' | 'danger'

/**
 * Security warning
 */
export interface SecurityWarning {
  level: WarningLevel
  title: string
  message: string
  suggestion?: string
  canProceed?: boolean
}

/**
 * Transaction confirmation system
 */
export class TransactionConfirmationSystem extends EventEmitter {
  private eventBus = EventBus.getInstance()
  private confirmationHistory: Array<{
    details: TransactionDetails
    result: ConfirmationResult
  }> = []

  constructor() {
    super()
  }

  /**
   * Confirm transaction with user
   */
  async confirmTransaction(
    details: TransactionDetails,
    options: ConfirmationOptions = {}
  ): Promise<ConfirmationResult> {
    const startTime = Date.now()

    try {
      this.eventBus.emit('transaction:confirmation_started', { details })

      // Display transaction overview
      await this.displayTransactionOverview(details)

      // Check for security warnings
      const warnings = await this.analyzeSecurityWarnings(details)
      
      // Display warnings if any
      if (warnings.length > 0 && !options.skipWarnings) {
        const proceedWithWarnings = await this.handleSecurityWarnings(warnings)
        if (!proceedWithWarnings) {
          return this.createResult(false, startTime)
        }
      }

      // Show detailed breakdown
      if (options.showAdvanced !== false) {
        await this.displayDetailedBreakdown(details)
      }

      // Get user confirmation
      const confirmed = await this.getUserConfirmation(details, options)
      if (!confirmed) {
        return this.createResult(false, startTime)
      }

      // Request password if required
      let userPassword: string | undefined
      if (options.requirePassword) {
        userPassword = await this.requestPassword()
        if (!userPassword) {
          return this.createResult(false, startTime)
        }
      }

      // Final confirmation
      const finalConfirm = await this.getFinalConfirmation(details)
      if (!finalConfirm) {
        return this.createResult(false, startTime)
      }

      const result = this.createResult(true, startTime, userPassword)
      
      // Store in history
      this.confirmationHistory.push({ details, result })
      
      this.eventBus.emit('transaction:confirmation_completed', {
        details,
        result,
        duration: Date.now() - startTime
      })

      return result

    } catch (error) {
      this.eventBus.emit('transaction:confirmationerror', { details, error })
      throw error
    }
  }

  /**
   * Quick confirmation for trusted operations
   */
  async quickConfirm(
    title: string,
    cost: TransactionCost,
    customMessage?: string
  ): Promise<boolean> {
    console.log(infoBox(title, [
      `Cost: ${formatSOL(cost.sol * 1_000_000_000)}`,
      customMessage || 'Proceed with this transaction?'
    ]))

    const confirmed = await confirm({
      message: 'Continue?',
      initialValue: false
    })

    return confirmed as boolean
  }

  /**
   * Display transaction overview
   */
  private async displayTransactionOverview(details: TransactionDetails): Promise<void> {
    const title = details.title || this.getDefaultTitle(details.type)
    
    const overview = [
      `Type: ${details.type.replace('_', ' ').toUpperCase()}`,
      `Cost: ${formatSOL(details.estimatedCost.sol * 1_000_000_000)}`,
    ]

    if (details.estimatedCost.usd) {
      overview.push(`≈ $${details.estimatedCost.usd.toFixed(2)} USD`)
    }

    if (details.description) {
      overview.push(`Description: ${details.description}`)
    }

    if (details.addresses?.to) {
      overview.push(`To: ${details.addresses.to}`)
    }

    if (details.expiresAt) {
      overview.push(`Expires: ${formatTimestamp(details.expiresAt.getTime() / 1000)}`)
    }

    console.log(infoBox(title, overview))
  }

  /**
   * Analyze transaction for security warnings
   */
  private async analyzeSecurityWarnings(details: TransactionDetails): Promise<SecurityWarning[]> {
    const warnings: SecurityWarning[] = []

    // High-cost transaction warning
    if (details.estimatedCost.sol > 1) {
      warnings.push({
        level: 'warning',
        title: 'High Cost Transaction',
        message: `This transaction costs ${formatSOL(details.estimatedCost.sol * 1_000_000_000)}, which is above normal levels.`,
        suggestion: 'Double-check the transaction details before proceeding.'
      })
    }

    // Unknown recipient warning
    if (details.addresses?.to && !this.isKnownAddress(details.addresses.to)) {
      warnings.push({
        level: 'warning',
        title: 'Unknown Recipient',
        message: 'You are sending to an address that is not in your address book.',
        suggestion: 'Verify the recipient address is correct.'
      })
    }

    // Expiring transaction warning
    if (details.expiresAt && details.expiresAt.getTime() - Date.now() < 300000) { // 5 minutes
      warnings.push({
        level: 'warning',
        title: 'Transaction Expiring Soon',
        message: 'This transaction will expire in less than 5 minutes.',
        suggestion: 'Complete the transaction quickly to avoid expiration.'
      })
    }

    // Custom warnings from transaction details
    if (details.warnings) {
      details.warnings.forEach(warning => {
        warnings.push({
          level: 'info',
          title: 'Important Notice',
          message: warning,
          canProceed: true
        })
      })
    }

    // Critical warnings for dangerous operations
    if (this.isDangerousOperation(details)) {
      warnings.push({
        level: 'danger',
        title: 'Potentially Dangerous Operation',
        message: 'This operation may result in permanent loss of funds or access.',
        suggestion: 'Only proceed if you fully understand the consequences.',
        canProceed: false
      })
    }

    return warnings
  }

  /**
   * Handle security warnings with user
   */
  private async handleSecurityWarnings(warnings: SecurityWarning[]): Promise<boolean> {
    console.log(warningBox(
      'Security Warnings Detected',
      [`${warnings.length} warning(s) found. Please review carefully.`]
    ))

    for (const warning of warnings) {
      const icon = this.getWarningIcon(warning.level)
      console.log(`\n${icon} ${warning.title}`)
      console.log(`   ${warning.message}`)
      
      if (warning.suggestion) {
        console.log(`   💡 ${warning.suggestion}`)
      }

      // Block dangerous operations unless explicitly confirmed
      if (warning.level === 'danger' && warning.canProceed === false) {
        const understood = await confirm({
          message: 'Do you understand this warning and want to proceed anyway?',
          initialValue: false
        })

        if (!understood) {
          console.log('❌ Transaction cancelled for safety.')
          return false
        }
      }
    }

    const proceedWithWarnings = await confirm({
      message: 'Continue despite these warnings?',
      initialValue: false
    })

    return proceedWithWarnings as boolean
  }

  /**
   * Display detailed transaction breakdown
   */
  private async displayDetailedBreakdown(details: TransactionDetails): Promise<void> {
    console.log('\n📋 Detailed Breakdown:')
    console.log('━'.repeat(50))

    // Cost breakdown
    console.log(keyValue('Base Cost', formatSOL(details.estimatedCost.sol * 1_000_000_000)))
    
    if (details.estimatedCost.fees) {
      console.log(keyValue('Base Fee', formatSOL(details.estimatedCost.fees.baseFee * 1_000_000_000)))
      console.log(keyValue('Priority Fee', formatSOL(details.estimatedCost.fees.priorityFee * 1_000_000_000)))
      console.log(keyValue('Total Fee', formatSOL(details.estimatedCost.fees.totalFee * 1_000_000_000)))
    }

    if (details.estimatedCost.computeUnits) {
      console.log(keyValue('Compute Units', details.estimatedCost.computeUnits.toLocaleString()))
    }

    // Address information
    if (details.addresses) {
      console.log('\n🏠 Addresses:')
      if (details.addresses.from) {
        console.log(keyValue('From', details.addresses.from))
      }
      if (details.addresses.to) {
        console.log(keyValue('To', details.addresses.to))
      }
      if (details.addresses.program) {
        console.log(keyValue('Program', details.addresses.program))
      }
    }

    // Transaction data preview
    if (details.data && typeof details.data === 'object') {
      console.log('\n📦 Transaction Data:')
      const dataPreview = JSON.stringify(details.data, null, 2)
      const truncated = dataPreview.length > 200 
        ? dataPreview.slice(0, 200) + '...'
        : dataPreview
      console.log(truncated)
    }

    console.log('━'.repeat(50))
  }

  /**
   * Get user confirmation
   */
  private async getUserConfirmation(
    details: TransactionDetails,
    options: ConfirmationOptions
  ): Promise<boolean> {
    const message = options.customMessage || 
      `Confirm ${details.title || this.getDefaultTitle(details.type)}?`

    const confirmed = await confirm({
      message,
      initialValue: false
    })

    return confirmed as boolean
  }

  /**
   * Request password for additional security
   */
  private async requestPassword(): Promise<string | undefined> {
    console.log('\n🔐 Additional security verification required')
    
    const userPassword = await password({
      message: 'Enter your wallet password:',
      validate: (value) => {
        if (typeof value !== 'string' || value.length < 1) {
          return 'Password is required'
        }
      }
    })

    return userPassword as string | undefined
  }

  /**
   * Get final confirmation before execution
   */
  private async getFinalConfirmation(details: TransactionDetails): Promise<boolean> {
    console.log(warningBox(
      'Final Confirmation',
      [
        'This action cannot be undone.',
        'Please confirm you want to proceed with this transaction.'
      ]
    ))

    const finalConfirm = await select({
      message: 'Are you absolutely sure?',
      options: [
        { value: 'yes', label: 'Yes, execute the transaction' },
        { value: 'no', label: 'No, cancel the transaction' }
      ]
    })

    return finalConfirm === 'yes'
  }

  /**
   * Create confirmation result
   */
  private createResult(
    confirmed: boolean,
    startTime: number,
    password?: string
  ): ConfirmationResult {
    return {
      confirmed,
      password,
      timestamp: new Date(),
      userInput: {
        duration: Date.now() - startTime
      }
    }
  }

  /**
   * Get default title for transaction type
   */
  private getDefaultTitle(type: TransactionType): string {
    const titles: Record<TransactionType, string> = {
      agent_register: 'Register Agent',
      agent_update: 'Update Agent',
      auction_bid: 'Place Auction Bid',
      governance_vote: 'Cast Governance Vote',
      token_transfer: 'Transfer Tokens',
      custom: 'Custom Transaction'
    }

    return titles[type] || 'Transaction'
  }

  /**
   * Get warning icon for level
   */
  private getWarningIcon(level: WarningLevel): string {
    const icons: Record<WarningLevel, string> = {
      info: 'ℹ️',
      warning: '⚠️',
      critical: '🚨',
      danger: '💀'
    }

    return icons[level]
  }

  /**
   * Check if address is known/trusted
   */
  private isKnownAddress(address: string): boolean {
    // In real implementation, would check against address book
    // For now, just return false for demo
    return false
  }

  /**
   * Check if operation is dangerous
   */
  private isDangerousOperation(details: TransactionDetails): boolean {
    // High-value transactions
    if (details.estimatedCost.sol > 10) {
      return true
    }

    // Operations involving unknown programs
    if (details.addresses?.program && !this.isTrustedProgram(details.addresses.program)) {
      return true
    }

    return false
  }

  /**
   * Check if program is trusted
   */
  private isTrustedProgram(programId: string): boolean {
    const trustedPrograms = [
      '11111111111111111111111111111111', // System Program
      'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA', // Token Program
      'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb', // Token-2022 Program
      'GpvFxus2eecFKcqa2bhxXeRjpstPeCEJNX216TQCcNC9' // GhostSpeak Program
    ]

    return trustedPrograms.includes(programId)
  }

  /**
   * Get confirmation history
   */
  getConfirmationHistory(): Array<{
    details: TransactionDetails
    result: ConfirmationResult
  }> {
    return [...this.confirmationHistory]
  }

  /**
   * Clear confirmation history
   */
  clearHistory(): void {
    this.confirmationHistory = []
    this.eventBus.emit('transaction:confirmation_history_cleared')
  }
}

/**
 * Pre-built confirmation flows for common operations
 */
export class QuickConfirmations {
  private confirmationSystem = new TransactionConfirmationSystem()

  /**
   * Confirm agent registration
   */
  async confirmAgentRegistration(agentData: {
    name: string
    description: string
    cost: number
  }): Promise<boolean> {
    const result = await this.confirmationSystem.confirmTransaction({
      type: 'agent_register',
      title: 'Register New Agent',
      description: `Register "${agentData.name}" as an AI agent`,
      data: agentData,
      estimatedCost: {
        sol: agentData.cost,
        usd: agentData.cost * 100 // Mock USD conversion
      },
      warnings: [
        'Agent registration cannot be undone',
        'Make sure agent details are correct'
      ]
    })

    return result.confirmed
  }

  /**
   * Confirm token transfer
   */
  async confirmTokenTransfer(transferData: {
    to: string
    amount: number
    token?: string
  }): Promise<boolean> {
    const result = await this.confirmationSystem.confirmTransaction({
      type: 'token_transfer',
      title: 'Transfer Tokens',
      description: `Send ${transferData.amount} ${transferData.token || 'SOL'} to ${transferData.to}`,
      data: transferData,
      estimatedCost: {
        sol: 0.001, // Base transaction fee
        usd: 0.10
      },
      addresses: {
        to: transferData.to
      }
    }, {
      requirePassword: true
    })

    return result.confirmed
  }
}

// Export singleton instances
export const transactionConfirmationSystem = new TransactionConfirmationSystem()
export const quickConfirmations = new QuickConfirmations()