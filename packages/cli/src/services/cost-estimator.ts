/**
 * Transaction cost estimation service
 * Provides cost estimates and balance checks before operations
 */

import chalk from 'chalk'
import type { Address } from '@solana/addresses'
import { formatSOL, warningBox, infoBox } from '../utils/format-helpers.js'
import { createCustomClient } from '../core/solana-client.js'

export interface CostEstimate {
  operation: string
  baseFee: bigint  // Network transaction fee
  programFee?: bigint  // Program-specific fees
  accountRent?: bigint  // Rent for new accounts
  totalCost: bigint
  breakdown: Array<{ item: string; cost: bigint; description: string }>
  isAffordable: boolean
  requiredBalance: bigint
}

export interface BalanceInfo {
  current: bigint
  required: bigint
  shortage: bigint
  isAffordable: boolean
}

const OPERATION_COSTS = {
  // Base transaction costs (in lamports)
  SIGNATURE_FEE: BigInt(5000), // Standard signature fee
  
  // Account creation costs
  AGENT_ACCOUNT_RENT: BigInt(2400000), // ~0.0024 SOL

  // Program-specific fees
  AGENT_REGISTRATION_FEE: BigInt(100000), // ~0.0001 SOL
  
  // Buffer for network congestion
  CONGESTION_BUFFER: BigInt(10000) // Extra fee for busy periods
}

export class CostEstimator {
  private static instance: CostEstimator | undefined
  private rpcUrl: string
  
  private constructor(rpcUrl = 'https://api.devnet.solana.com') {
    this.rpcUrl = rpcUrl
  }
  
  static getInstance(rpcUrl?: string): CostEstimator {
    return (CostEstimator.instance ??= new CostEstimator(rpcUrl))
  }
  
  /**
   * Estimate cost for agent registration
   */
  estimateAgentRegistration(): CostEstimate {
    const breakdown = [
      {
        item: 'Transaction fee',
        cost: OPERATION_COSTS.SIGNATURE_FEE,
        description: 'Network fee for processing transaction'
      },
      {
        item: 'Agent account rent',
        cost: OPERATION_COSTS.AGENT_ACCOUNT_RENT,
        description: 'Storage rent for agent account data'
      },
      {
        item: 'Registration fee',
        cost: OPERATION_COSTS.AGENT_REGISTRATION_FEE,
        description: 'Protocol fee for agent registration'
      },
      {
        item: 'Network buffer',
        cost: OPERATION_COSTS.CONGESTION_BUFFER,
        description: 'Buffer for network congestion'
      }
    ]
    
    const totalCost = breakdown.reduce((sum, item) => sum + item.cost, BigInt(0))
    
    return {
      operation: 'Agent Registration',
      baseFee: OPERATION_COSTS.SIGNATURE_FEE,
      programFee: OPERATION_COSTS.AGENT_REGISTRATION_FEE,
      accountRent: OPERATION_COSTS.AGENT_ACCOUNT_RENT,
      totalCost,
      breakdown,
      isAffordable: false, // Will be set when checking balance
      requiredBalance: totalCost
    }
  }

  /**
   * Get current wallet balance
   */
  async getWalletBalance(address: Address): Promise<bigint> {
    try {
      // Use Gill's createCustomClient instead of createSolanaRpc
      const client = createCustomClient(this.rpcUrl)
      const response = await client.rpc.getBalance(address).send()
      return response.value
    } catch (error) {
      console.warn('Failed to fetch balance:', error)
      return BigInt(0)
    }
  }
  
  /**
   * Check if wallet can afford an operation
   */
  async checkAffordability(address: Address, estimate: CostEstimate): Promise<BalanceInfo> {
    const currentBalance = await this.getWalletBalance(address)
    const required = estimate.totalCost
    const isAffordable = currentBalance >= required
    const shortage = isAffordable ? BigInt(0) : required - currentBalance
    
    // Update estimate with affordability
    estimate.isAffordable = isAffordable
    
    return {
      current: currentBalance,
      required,
      shortage,
      isAffordable
    }
  }
  
  /**
   * Display cost estimate with formatting
   */
  async displayCostEstimate(
    address: Address,
    estimate: CostEstimate,
    options?: { showBreakdown?: boolean; confirmRequired?: boolean }
  ): Promise<BalanceInfo> {
    const { showBreakdown = true } = options ?? {}
    
    // Check current balance
    const balanceInfo = await this.checkAffordability(address, estimate)
    
    // Create cost summary
    const summaryItems = [
      { label: 'Operation', value: estimate.operation },
      { label: 'Total Cost', value: formatSOL(estimate.totalCost) },
      { label: 'Current Balance', value: formatSOL(balanceInfo.current) },
      { 
        label: 'After Transaction', 
        value: balanceInfo.isAffordable 
          ? formatSOL(balanceInfo.current - estimate.totalCost) 
          : chalk.red('Insufficient funds')
      }
    ]
    
    console.log(infoBox('💰 Cost Estimate', summaryItems.map(item => 
      `${chalk.gray(item.label.padEnd(18))}: ${item.value}`
    ).join('\n')))
    
    // Show detailed breakdown if requested
    if (showBreakdown) {
      console.log(chalk.bold('📋 Cost Breakdown:'))
      console.log('')
      
      estimate.breakdown.forEach(item => {
        console.log(`  ${formatSOL(item.cost).padEnd(12)} ${item.item}`)
        console.log(`  ${' '.repeat(12)} ${chalk.gray(item.description)}`)
        console.log('')
      })
    }
    
    // Show warning if not affordable
    if (!balanceInfo.isAffordable) {
      const shortage = formatSOL(balanceInfo.shortage)
      const actions = [
        'Get SOL from faucet: ghost faucet --save',
        'Transfer SOL from another wallet',
        'Reduce the transaction amount if possible'
      ]
      
      console.log(warningBox(
        `You need ${shortage} more SOL to complete this transaction`,
        actions
      ))
      console.log('')
    }
    
    return balanceInfo
  }
  
  /**
   * Estimate costs for batch operations
   */
  estimateBatchOperation(operations: { type: string; params?: Record<string, unknown> }[]): CostEstimate {
    let totalCost = BigInt(0)
    const breakdown: CostEstimate['breakdown'] = []
    
    operations.forEach((op, index) => {
      let opEstimate: CostEstimate
      
      switch (op.type) {
        case 'agent-register':
          opEstimate = this.estimateAgentRegistration()
          break
        default:
          // Default to basic transaction
          opEstimate = {
            operation: op.type,
            baseFee: OPERATION_COSTS.SIGNATURE_FEE,
            totalCost: OPERATION_COSTS.SIGNATURE_FEE + OPERATION_COSTS.CONGESTION_BUFFER,
            breakdown: [],
            isAffordable: false,
            requiredBalance: OPERATION_COSTS.SIGNATURE_FEE + OPERATION_COSTS.CONGESTION_BUFFER
          }
      }
      
      totalCost += opEstimate.totalCost
      breakdown.push({
        item: `${index + 1}. ${opEstimate.operation}`,
        cost: opEstimate.totalCost,
        description: `Complete cost for ${opEstimate.operation.toLowerCase()}`
      })
    })
    
    return {
      operation: `Batch Operation (${operations.length} items)`,
      baseFee: BigInt(operations.length) * OPERATION_COSTS.SIGNATURE_FEE,
      totalCost,
      breakdown,
      isAffordable: false,
      requiredBalance: totalCost
    }
  }
}

/**
 * Helper function to estimate and display costs
 */
export async function estimateAndDisplay(
  operation: string,
  address: Address,
  params?: Record<string, unknown>,
  options?: { showBreakdown?: boolean; rpcUrl?: string }
): Promise<BalanceInfo> {
  const estimator = CostEstimator.getInstance(options?.rpcUrl)
  
  let estimate: CostEstimate
  
  switch (operation) {
    case 'agent-register':
      estimate = estimator.estimateAgentRegistration()
      break
    default:
      throw new Error(`Unknown operation: ${operation}`)
  }
  
  return estimator.displayCostEstimate(address, estimate, options)
}

/**
 * Quick balance check
 */
export async function quickBalanceCheck(
  address: Address,
  requiredAmount: bigint,
  rpcUrl?: string
): Promise<boolean> {
  const estimator = CostEstimator.getInstance(rpcUrl)
  const balance = await estimator.getWalletBalance(address)
  
  return balance >= requiredAmount
}