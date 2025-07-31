/**
 * Cost estimation utilities for Solana operations
 */

import chalk from 'chalk'

export interface CostEstimate {
  operation: string
  estimatedCost: number // in SOL
  description: string
  isRequired: boolean
}

export interface EstimationOptions {
  network?: 'devnet' | 'testnet' | 'mainnet-beta'
  includeOptional?: boolean
}

/**
 * Estimate costs for common GhostSpeak operations
 */
export function estimateCosts(operations: string[], options: EstimationOptions = {}): CostEstimate[] {
  const network = options.network ?? 'devnet'
  const baseTransactionCost = network === 'mainnet-beta' ? 0.000005 : 0.0001 // SOL
  
  const estimates: CostEstimate[] = []
  
  for (const operation of operations) {
    switch (operation) {
      case 'agent-register':
        estimates.push({
          operation: 'Agent Registration',
          estimatedCost: baseTransactionCost * 2, // Account creation + metadata
          description: 'Create agent account and set metadata',
          isRequired: true
        })
        break
        
      case 'agent-update':
        estimates.push({
          operation: 'Agent Update',
          estimatedCost: baseTransactionCost,
          description: 'Update agent metadata',
          isRequired: false
        })
        break
        
      case 'marketplace-create':
        estimates.push({
          operation: 'Marketplace Listing',
          estimatedCost: baseTransactionCost * 1.5,
          description: 'Create service listing',
          isRequired: false
        })
        break
        
      case 'escrow-create':
        estimates.push({
          operation: 'Escrow Creation',
          estimatedCost: baseTransactionCost * 2,
          description: 'Create escrow account for secure payments',
          isRequired: false
        })
        break
        
      case 'token-mint':
        estimates.push({
          operation: 'Token Minting',
          estimatedCost: baseTransactionCost * 3,
          description: 'Mint ownership tokens (CNFTs)',
          isRequired: false
        })
        break
        
      default:
        estimates.push({
          operation: operation,
          estimatedCost: baseTransactionCost,
          description: 'Generic transaction',
          isRequired: false
        })
    }
  }
  
  return estimates
}

/**
 * Display cost estimation in a formatted table
 */
export function estimateAndDisplay(operations: string[], options: EstimationOptions = {}): void {
  const estimates = estimateCosts(operations, options)
  const network = options.network ?? 'devnet'
  
  console.log('')
  console.log(chalk.cyan('💰 Cost Estimation'))
  console.log(chalk.gray(`Network: ${network}`))
  console.log('─'.repeat(60))
  
  let totalCost = 0
  
  estimates.forEach(estimate => {
    const costStr = estimate.estimatedCost.toFixed(6)
    const requiredStr = estimate.isRequired ? chalk.red('Required') : chalk.gray('Optional')
    
    console.log(chalk.yellow(estimate.operation.padEnd(20)) + 
                chalk.white(costStr.padStart(12) + ' SOL') + 
                '  ' + requiredStr)
    console.log(chalk.gray('  ' + estimate.description))
    
    if (estimate.isRequired || options.includeOptional) {
      totalCost += estimate.estimatedCost
    }
  })
  
  console.log('─'.repeat(60))
  console.log(chalk.bold(`Total Estimated Cost: ${totalCost.toFixed(6)} SOL`))
  
  if (network === 'devnet') {
    console.log(chalk.gray('💡 Use the faucet command to get devnet SOL for testing'))
  } else {
    console.log(chalk.gray('💡 Ensure you have sufficient SOL in your wallet'))
  }
  console.log('')
}

/**
 * Get current SOL price estimate (mock implementation)
 */
export function getSOLPriceUSD(): Promise<number> {
  // In a real implementation, this would fetch from a price API
  return Promise.resolve(20.50) // Mock price
}

/**
 * Convert SOL amount to USD estimate
 */
export async function solToUSD(solAmount: number): Promise<string> {
  const price = await getSOLPriceUSD()
  const usdValue = solAmount * price
  return `$${usdValue.toFixed(2)}`
}