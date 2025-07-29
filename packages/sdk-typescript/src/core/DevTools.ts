/**
 * Developer Tools for GhostSpeak SDK
 * 
 * Provides debugging, inspection, and development utilities
 */

import type { IInstruction, AccountRole } from '@solana/kit'
import type { Address } from '@solana/addresses'
import type { GhostSpeakConfig } from '../types/index.js'
import { RpcClient } from './rpc-client.js'

/**
 * Transaction analysis result
 */
export interface TransactionAnalysis {
  instructions: InstructionAnalysis[]
  totalAccounts: number
  signerCount: number
  writableAccounts: Address[]
  readonlyAccounts: Address[]
  estimatedSize: number
  estimatedComputeUnits: bigint
  estimatedFee: bigint
  warnings: string[]
}

/**
 * Individual instruction analysis
 */
export interface InstructionAnalysis {
  index: number
  programId: Address
  accountCount: number
  dataSize: number
  humanReadable: string
  accounts: AccountInfo[]
}

/**
 * Account information in instruction
 */
export interface AccountInfo {
  address: Address
  isWritable: boolean
  isSigner: boolean
  role: AccountRole
}

/**
 * Developer tools for debugging and analysis
 */
export class DevTools {
  private static instance: DevTools | null = null
  private rpcClient: RpcClient
  private config: GhostSpeakConfig
  private isDevelopment: boolean
  private logs: string[] = []
  private timings: Map<string, number> = new Map()

  constructor(config: GhostSpeakConfig) {
    this.config = config
    this.rpcClient = new RpcClient({
      endpoint: config.rpcEndpoint ?? 'https://api.devnet.solana.com',
      commitment: config.commitment
    })
    this.isDevelopment = process.env.NODE_ENV === 'development' || 
                          config.cluster === 'localnet' ||
                          false
  }

  /**
   * Get singleton instance
   */
  static getInstance(config?: GhostSpeakConfig): DevTools {
    if (!DevTools.instance && config) {
      DevTools.instance = new DevTools(config)
    }
    if (!DevTools.instance) {
      throw new Error('DevTools not initialized. Call with config first.')
    }
    return DevTools.instance
  }

  /**
   * Enable development mode
   */
  enableDevMode(): void {
    this.isDevelopment = true
    console.log('🛠️ GhostSpeak Development Mode Enabled')
    console.log('   - Transaction simulation before sending')
    console.log('   - Cost estimates for all operations')
    console.log('   - Enhanced error messages')
    console.log('   - Performance timing')
  }

  /**
   * Check if in development mode
   */
  isDevMode(): boolean {
    return this.isDevelopment
  }

  /**
   * Analyze transaction instructions
   */
  analyzeTransaction(instructions: IInstruction[]): TransactionAnalysis {
    const writableAccounts = new Set<Address>()
    const readonlyAccounts = new Set<Address>()
    const signers = new Set<Address>()
    const warnings: string[] = []
    let totalSize = 64 // Base transaction overhead

    const instructionAnalyses: InstructionAnalysis[] = instructions.map((instr, index) => {
      totalSize += 32 // Program ID
      totalSize += (instr.accounts?.length ?? 0) * 32 // Account metas
      totalSize += instr.data?.length ?? 0 // Instruction data

      const accounts: AccountInfo[] = (instr.accounts ?? []).map(acc => {
        // Check if the role has 'writable' in its name or is specifically writable
        const isWritable = acc.role?.toString().includes('writable') ?? false
        // Check if the role has 'signer' in its name
        const isSigner = acc.role?.toString().includes('signer') ?? false
        
        if (isWritable) {
          writableAccounts.add(acc.address)
        } else {
          readonlyAccounts.add(acc.address)
        }
        
        if (isSigner) {
          signers.add(acc.address)
        }

        return {
          address: acc.address,
          isWritable,
          isSigner,
          role: acc.role
        }
      })

      const humanReadable = this.getInstructionDescription(instr, index)

      return {
        index,
        programId: instr.programAddress,
        accountCount: accounts.length,
        dataSize: instr.data?.length ?? 0,
        humanReadable,
        accounts
      }
    })

    // Calculate estimated compute units
    const estimatedComputeUnits = this.estimateComputeUnits(instructions)
    
    // Calculate estimated fee
    const estimatedFee = this.estimateFee(estimatedComputeUnits, instructions.length)

    // Generate warnings
    if (totalSize > 1232) {
      warnings.push(`Transaction size (${totalSize} bytes) exceeds limit (1232 bytes)`)
    }
    
    if (signers.size === 0) {
      warnings.push('No signers found in transaction')
    }
    
    if (estimatedComputeUnits > 1_400_000n) {
      warnings.push(`High compute usage: ${estimatedComputeUnits} units`)
    }

    return {
      instructions: instructionAnalyses,
      totalAccounts: writableAccounts.size + readonlyAccounts.size,
      signerCount: signers.size,
      writableAccounts: Array.from(writableAccounts),
      readonlyAccounts: Array.from(readonlyAccounts),
      estimatedSize: totalSize,
      estimatedComputeUnits,
      estimatedFee,
      warnings
    }
  }

  /**
   * Get human-readable instruction description
   */
  private getInstructionDescription(instruction: IInstruction, index: number): string {
    // Try to decode based on program ID
    const programId = instruction.programAddress
    
    // GhostSpeak program
    if (programId === this.config.programId) {
      return this.decodeGhostSpeakInstruction(instruction)
    }
    
    // System program
    if (programId === '11111111111111111111111111111111') {
      return 'System Program: Transfer or Create Account'
    }
    
    // Token program
    if (programId === 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA') {
      return 'Token Program: Token Operation'
    }
    
    // Token-2022 program
    if (programId === 'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb') {
      return 'Token-2022 Program: Advanced Token Operation'
    }
    
    return `Unknown Instruction ${index + 1}`
  }

  /**
   * Decode GhostSpeak instruction
   */
  private decodeGhostSpeakInstruction(instruction: IInstruction): string {
    if (!instruction.data || instruction.data.length < 8) {
      return 'GhostSpeak: Unknown Instruction'
    }
    
    // Read discriminator (first 8 bytes)
    const discriminator = Array.from(instruction.data.slice(0, 8))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')
    
    // Map common discriminators to names
    const instructionMap: Record<string, string> = {
      'a8c5e109d3d1b8d5': 'Register Agent',
      'b7f3c8e0a2d4e9f1': 'Create Escrow',
      'c4d2f7a9b8e1c3f5': 'Send Message',
      'd9e8f2b5c1a7e4f8': 'Create Channel',
      // Add more mappings as needed
    }
    
    return `GhostSpeak: ${instructionMap[discriminator] ?? 'Custom Instruction'}`
  }

  /**
   * Estimate compute units for instructions
   */
  private estimateComputeUnits(instructions: IInstruction[]): bigint {
    let totalUnits = 0n
    
    for (const instr of instructions) {
      // Base cost per instruction
      totalUnits += 200n
      
      // Account access costs
      totalUnits += BigInt((instr.accounts?.length ?? 0) * 150)
      
      // Data processing cost
      totalUnits += BigInt((instr.data?.length ?? 0) * 10)
      
      // Program-specific costs
      if (instr.programAddress === this.config.programId) {
        // GhostSpeak operations are more complex
        totalUnits += 5000n
      }
    }
    
    return totalUnits
  }

  /**
   * Estimate transaction fee
   */
  private estimateFee(computeUnits: bigint, instructionCount: number): bigint {
    // Base fee: 5000 lamports per signature
    const baseFee = 5000n
    
    // Compute unit fee: ~0.000005 SOL per 1M units
    const computeFee = (computeUnits * 5n) / 1_000_000n
    
    // Priority fee estimate
    const priorityFee = BigInt(instructionCount * 1000)
    
    return baseFee + computeFee + priorityFee
  }

  /**
   * Log debug message
   */
  log(message: string, data?: unknown): void {
    if (!this.isDevelopment) return
    
    const timestamp = new Date().toISOString()
    const logEntry = `[${timestamp}] ${message}`
    
    this.logs.push(logEntry)
    console.log(`🔍 ${logEntry}`)
    
    if (data) {
      console.log('   Data:', data)
    }
  }

  /**
   * Start timing an operation
   */
  startTiming(label: string): void {
    if (!this.isDevelopment) return
    const perfNow = typeof performance !== 'undefined' ? performance.now() : Date.now()
    this.timings.set(label, perfNow)
  }

  /**
   * End timing and log result
   */
  endTiming(label: string): void {
    if (!this.isDevelopment) return
    
    const start = this.timings.get(label)
    if (!start) return
    
    const perfNow = typeof performance !== 'undefined' ? performance.now() : Date.now()
    const duration = perfNow - start
    this.log(`${label} took ${duration.toFixed(2)}ms`)
    this.timings.delete(label)
  }

  /**
   * Format transaction for display
   */
  formatTransaction(analysis: TransactionAnalysis): string {
    const lines: string[] = [
      '📋 Transaction Analysis',
      '═══════════════════════════════════════',
      `Instructions: ${analysis.instructions.length}`,
      `Total Accounts: ${analysis.totalAccounts}`,
      `Signers: ${analysis.signerCount}`,
      `Estimated Size: ${analysis.estimatedSize} bytes`,
      `Estimated Compute Units: ${analysis.estimatedComputeUnits.toLocaleString()}`,
      `Estimated Fee: ${(Number(analysis.estimatedFee) / 1e9).toFixed(6)} SOL`,
      ''
    ]
    
    // Add instruction details
    lines.push('Instructions:')
    for (const instr of analysis.instructions) {
      lines.push(`  ${instr.index + 1}. ${instr.humanReadable}`)
      lines.push(`     Program: ${instr.programId.slice(0, 8)}...`)
      lines.push(`     Accounts: ${instr.accountCount}, Data: ${instr.dataSize} bytes`)
    }
    
    // Add warnings
    if (analysis.warnings.length > 0) {
      lines.push('')
      lines.push('⚠️ Warnings:')
      for (const warning of analysis.warnings) {
        lines.push(`  - ${warning}`)
      }
    }
    
    lines.push('═══════════════════════════════════════')
    
    return lines.join('\n')
  }

  /**
   * Export debug logs
   */
  exportLogs(): string[] {
    return [...this.logs]
  }

  /**
   * Clear debug logs
   */
  clearLogs(): void {
    this.logs = []
    this.timings.clear()
  }
}

/**
 * Global development mode check
 */
export function isDevMode(): boolean {
  return DevTools.getInstance().isDevMode()
}

/**
 * Global logging function
 */
export function devLog(message: string, data?: unknown): void {
  DevTools.getInstance().log(message, data)
}

/**
 * Export DevTools as default
 */
export default DevTools