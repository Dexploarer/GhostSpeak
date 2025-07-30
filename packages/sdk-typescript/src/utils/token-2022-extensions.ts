/**
 * Token 2022 Extensions Implementation
 * 
 * Implements advanced Token 2022 features including:
 * - Transfer fees with withdrawal mechanisms
 * - Confidential transfers using ElGamal encryption
 * - Interest-bearing tokens with rate calculations
 * - Transfer hooks and metadata pointers
 * - Account state management and CPI guards
 * 
 * Based on the SPL Token 2022 specification and Solana Web3.js v2.3.0
 */

import './text-encoder-polyfill.js'
import {
  type ElGamalKeypair,
  encryptAmount,
  generateRangeProof,
  generateValidityProof,
  generateEqualityProof,
  serializeCiphertext
} from './elgamal-complete.js'

// Node.js globals
declare const crypto: { getRandomValues: <T extends Uint8Array>(array: T) => T }

import type { Address } from '@solana/addresses'
import { 
  getBytesEncoder,
  getAddressEncoder,
  getU64Encoder,
  getUtf8Encoder
} from '@solana/kit'
import { 
  TokenExtension
} from './token-utils.js'
import type {
  TransferFeeConfig,
  InterestBearingConfig
} from './token-utils.js'

// Re-export the TransferFeeConfig type
export type { TransferFeeConfig } from './token-utils.js'

// =====================================================
// TRANSFER FEE EXTENSION
// =====================================================

/**
 * Transfer fee calculation result
 */
export interface TransferFeeCalculation {
  /** Original transfer amount */
  transferAmount: bigint
  /** Calculated fee amount */
  feeAmount: bigint
  /** Amount after fee deduction */
  netAmount: bigint
  /** Fee percentage (basis points) */
  feeBasisPoints: number
  /** Whether fee was capped at maximum */
  wasFeeCapped: boolean
}

/**
 * Calculate transfer fee for a Token 2022 transfer
 * 
 * @param transferAmount - Amount being transferred (in token base units)
 * @param feeConfig - Transfer fee configuration
 * @returns TransferFeeCalculation - Detailed fee calculation
 */
export function calculateTransferFee(
  transferAmount: bigint,
  feeConfig: TransferFeeConfig
): TransferFeeCalculation {
  const { transferFeeBasisPoints, maximumFee } = feeConfig
  
  // Calculate fee based on basis points (10000 = 100%)
  const calculatedFee = (transferAmount * BigInt(transferFeeBasisPoints)) / 10000n
  
  // Apply maximum fee cap
  const feeAmount = calculatedFee > maximumFee ? maximumFee : calculatedFee
  const wasFeeCapped = calculatedFee > maximumFee
  
  // Calculate net amount after fee
  const netAmount = transferAmount - feeAmount
  
  return {
    transferAmount,
    feeAmount,
    netAmount,
    feeBasisPoints: transferFeeBasisPoints,
    wasFeeCapped
  }
}

/**
 * Calculate the total amount needed for a desired net transfer
 * (reverse calculation when you want to send a specific net amount)
 * 
 * @param desiredNetAmount - The amount you want the recipient to receive
 * @param feeConfig - Transfer fee configuration  
 * @returns TransferFeeCalculation - Required total amount and fee breakdown
 */
export function calculateRequiredAmountForNetTransfer(
  desiredNetAmount: bigint,
  feeConfig: TransferFeeConfig
): TransferFeeCalculation {
  const { transferFeeBasisPoints } = feeConfig
  
  // Calculate required gross amount: net / (1 - fee_rate)
  // For basis points: gross = net * 10000 / (10000 - basis_points)
  const grossAmount = (desiredNetAmount * 10000n) / (10000n - BigInt(transferFeeBasisPoints))
  
  // Calculate actual fee and check if it hits the maximum
  return calculateTransferFee(grossAmount, feeConfig)
}

/**
 * Estimate accumulated fees for multiple transfers
 * 
 * @param transfers - Array of transfer amounts
 * @param feeConfig - Transfer fee configuration
 * @returns { totalFees: bigint, feeBreakdown: TransferFeeCalculation[] }
 */
export function estimateAccumulatedFees(
  transfers: bigint[],
  feeConfig: TransferFeeConfig
): { totalFees: bigint, feeBreakdown: TransferFeeCalculation[] } {
  const feeBreakdown: TransferFeeCalculation[] = []
  let totalFees = 0n
  
  for (const transferAmount of transfers) {
    const calculation = calculateTransferFee(transferAmount, feeConfig)
    feeBreakdown.push(calculation)
    totalFees += calculation.feeAmount
  }
  
  return { totalFees, feeBreakdown }
}

// =====================================================
// CONFIDENTIAL TRANSFER EXTENSION
// =====================================================

/**
 * Confidential transfer proof data
 * Note: This is a simplified structure - actual implementation would include
 * complex zero-knowledge proof data structures
 */
export interface ConfidentialTransferProof {
  /** Encrypted transfer amount (ElGamal ciphertext) */
  encryptedAmount: Uint8Array
  /** Range proof for the transfer amount */
  rangeProof: Uint8Array
  /** Validity proof for the transfer */
  validityProof: Uint8Array
  /** Auditor proof (if auditing is enabled) */
  auditorProof?: Uint8Array
}

/**
 * Confidential account state
 */
export interface ConfidentialAccountState {
  /** Whether the account is approved for confidential transfers */
  approved: boolean
  /** Encrypted balance (ElGamal ciphertext) */
  encryptedBalance: Uint8Array
  /** Pending balance encryption from incoming transfers */
  pendingBalanceCredits: Uint8Array
  /** Number of pending credits */
  pendingBalanceCreditsCounter: number
  /** Expected pending balance decryption */
  expectedPendingBalanceCredits: bigint
  /** Actual pending balance decryption */
  actualPendingBalanceCredits: bigint
}

/**
 * Generate confidential transfer proof
 * 
 * Uses twisted ElGamal encryption to create confidential transfer proofs
 * compatible with Solana's ZK ElGamal Proof Program
 * 
 * @param amount - Transfer amount (in token base units)
 * @param senderKeypair - Sender's ElGamal keypair
 * @param recipientPubkey - Recipient's ElGamal public key
 * @param auditorPubkey - Optional auditor public key
 * @returns Promise<ConfidentialTransferProof>
 */
export async function generateConfidentialTransferProof(
  amount: bigint,
  senderKeypair: ElGamalKeypair,
  recipientPubkey: Uint8Array,
  auditorPubkey?: Uint8Array
): Promise<ConfidentialTransferProof> {
  // Encrypt amount for recipient
  const recipientCiphertext = encryptAmount(amount, recipientPubkey)
  const encryptedAmount = serializeCiphertext(recipientCiphertext)
  
  // Generate randomness for proofs
  const randomness = new Uint8Array(32)
  crypto.getRandomValues(randomness)
  
  // Generate range proof (proves amount is in valid range)
  const rangeProof = generateRangeProof(
    amount,
    recipientCiphertext.commitment,
    randomness
  )
  
  // Generate validity proof (proves ciphertext is well-formed)
  const validityProof = generateValidityProof(
    recipientCiphertext,
    recipientPubkey,
    randomness
  )
  
  // If auditor is present, encrypt amount for auditor
  let auditorProof: Uint8Array | undefined
  if (auditorPubkey) {
    const auditorCiphertext = encryptAmount(amount, auditorPubkey)
    const auditorRandomness = new Uint8Array(32)
    crypto.getRandomValues(auditorRandomness)
    
    // Generate equality proof (proves both ciphertexts encrypt same amount)
    const equalityProof = generateEqualityProof(
      recipientCiphertext,
      auditorCiphertext,
      amount,
      randomness,
      auditorRandomness
    )
    
    // Combine auditor ciphertext and equality proof
    auditorProof = new Uint8Array(160) // 64 (ciphertext) + 96 (equality proof)
    auditorProof.set(serializeCiphertext(auditorCiphertext), 0)
    auditorProof.set(equalityProof.proof, 64)
  }
  
  return {
    encryptedAmount,
    rangeProof: rangeProof.proof,
    validityProof: validityProof.proof,
    auditorProof
  }
}

/**
 * Verify confidential transfer proof
 * 
 * Note: In practice, proof verification happens on-chain via the
 * ZK ElGamal Proof Program. This is a client-side validation helper.
 * 
 * @param proof - The proof to verify
 * @param publicInputs - Public inputs for verification
 * @returns Promise<boolean> - True if proof is valid
 */
export async function verifyConfidentialTransferProof(
  proof: ConfidentialTransferProof,
  publicInputs: {
    senderPubkey: Uint8Array
    recipientPubkey: Uint8Array
    auditorPubkey?: Uint8Array
  }
): Promise<boolean> {
  try {
    // Basic validation checks
    if (proof.encryptedAmount.length !== 64) {
      return false
    }
    
    if (proof.rangeProof.length < 128) {
      return false
    }
    
    if (proof.validityProof.length < 64) {
      return false
    }
    
    if (publicInputs.auditorPubkey && !proof.auditorProof) {
      return false
    }
    
    if (proof.auditorProof && proof.auditorProof.length !== 160) {
      return false
    }
    
    // Import verification functions
    const { 
      verifyRangeProof, 
      verifyValidityProof, 
      verifyEqualityProof,
      deserializeCiphertext
    } = await import('./elgamal.js')
    
    // Deserialize the encrypted amount ciphertext
    const encryptedAmountCiphertext = deserializeCiphertext(proof.encryptedAmount)
    
    // 1. Verify the range proof using bulletproofs
    const rangeProofValid = verifyRangeProof(
      { proof: proof.rangeProof, commitment: encryptedAmountCiphertext.commitment.commitment },
      encryptedAmountCiphertext.commitment.commitment
    )
    
    if (!rangeProofValid) {
      return false
    }
    
    // 2. Verify the validity proof using Schnorr signatures
    const validityProofValid = verifyValidityProof(
      { proof: proof.validityProof },
      encryptedAmountCiphertext,
      publicInputs.recipientPubkey
    )
    
    if (!validityProofValid) {
      return false
    }
    
    // 3. Verify the equality proof if auditor is present
    if (proof.auditorProof && publicInputs.auditorPubkey) {
      // Extract auditor ciphertext and equality proof from combined data
      const auditorCiphertext = deserializeCiphertext(proof.auditorProof.slice(0, 64))
      const equalityProofData = proof.auditorProof.slice(64)
      
      const equalityProofValid = verifyEqualityProof(
        { proof: equalityProofData },
        encryptedAmountCiphertext,
        auditorCiphertext
      )
      
      if (!equalityProofValid) {
        return false
      }
    }
    
    // 4. All proofs are valid
    return true
  } catch {
    return false
  }
}

// =====================================================
// INTEREST-BEARING TOKEN EXTENSION
// =====================================================

/**
 * Interest calculation result
 */
export interface InterestCalculation {
  /** Principal amount */
  principal: bigint
  /** Interest rate (basis points per year) */
  annualRateBasisPoints: number
  /** Time period for calculation (seconds) */
  timePeriodSeconds: bigint
  /** Calculated interest amount */
  interestAmount: bigint
  /** New total balance */
  newAmount: bigint
  /** Effective annual rate */
  effectiveAnnualRate: number
}

/**
 * Calculate interest for an interest-bearing token
 * 
 * @param principal - Current token balance
 * @param config - Interest-bearing configuration
 * @param currentTimestamp - Current timestamp (seconds)
 * @returns InterestCalculation - Detailed interest calculation
 */
export function calculateInterest(
  principal: bigint,
  config: InterestBearingConfig,
  currentTimestamp: bigint
): InterestCalculation {
  const timePeriodSeconds = currentTimestamp - config.lastUpdateTimestamp
  
  // Calculate interest using compound interest formula
  // Interest = Principal * (rate/10000) * (time_seconds / seconds_per_year)
  const secondsPerYear = 365n * 24n * 60n * 60n // 31,536,000 seconds
  const rateBasisPoints = BigInt(config.currentRate)
  
  // Simple interest calculation (for more complex scenarios, implement compound interest)
  const interestAmount = (principal * rateBasisPoints * timePeriodSeconds) / (10000n * secondsPerYear)
  const newBalance = principal + interestAmount
  
  // Calculate effective annual rate
  const yearFraction = Number(timePeriodSeconds) / Number(secondsPerYear)
  const effectiveAnnualRate = config.currentRate / 100 * yearFraction
  
  return {
    principal,
    annualRateBasisPoints: config.currentRate,
    timePeriodSeconds,
    interestAmount,
    newAmount: newBalance,
    effectiveAnnualRate
  }
}

/**
 * Calculate compound interest with custom compounding periods
 * 
 * @param principal - Initial amount
 * @param annualRateBasisPoints - Annual interest rate (basis points)
 * @param compoundingPeriodsPerYear - Number of compounding periods per year (e.g., 12 for monthly)
 * @param years - Time period in years (can be fractional)
 * @returns InterestCalculation - Detailed compound interest calculation
 */
export function calculateCompoundInterest(
  principal: bigint,
  annualRateBasisPoints: number,
  compoundingPeriodsPerYear: number,
  years: number
): InterestCalculation {
  const rate = annualRateBasisPoints / 10000 // Convert basis points to decimal
  const n = compoundingPeriodsPerYear
  
  // Compound interest formula: A = P(1 + r/n)^(nt)
  const compoundFactor = Math.pow(1 + rate / n, n * years)
  const newBalanceFloat = Number(principal) * compoundFactor
  const newBalance = BigInt(Math.floor(newBalanceFloat))
  const interestAmount = newBalance - principal
  
  const timePeriodSeconds = BigInt(Math.floor(years * 365 * 24 * 60 * 60))
  
  return {
    principal,
    annualRateBasisPoints,
    timePeriodSeconds,
    interestAmount,
    newAmount: newBalance,
    effectiveAnnualRate: (compoundFactor - 1) * 100
  }
}

// =====================================================
// TRANSFER HOOK EXTENSION
// =====================================================

/**
 * Transfer hook instruction data
 */
export interface TransferHookInstruction {
  /** Program ID of the hook */
  programId: Address
  /** Instruction data to pass to the hook */
  instructionData: Uint8Array
  /** Additional accounts required by the hook */
  additionalAccounts: Address[]
}

/**
 * Transfer hook context passed to hook programs
 */
export interface TransferHookContext {
  /** Source account */
  source: Address
  /** Destination account */  
  destination: Address
  /** Authority performing the transfer */
  authority: Address
  /** Transfer amount */
  amount: bigint
  /** Token mint */
  mint: Address
  /** Additional context data */
  contextData: Uint8Array
}

/**
 * Validate transfer hook instruction format
 * 
 * @param instruction - The hook instruction to validate
 * @returns boolean - True if instruction format is valid
 */
export function validateTransferHookInstruction(
  instruction: TransferHookInstruction
): boolean {
  // Basic validation - real implementation would be more comprehensive
  if (!instruction.programId) return false
  if (!Array.isArray(instruction.additionalAccounts)) return false
  
  return true
}

/**
 * Create transfer hook instruction data
 * 
 * @param hookProgramId - Program ID of the transfer hook
 * @param context - Transfer context data
 * @returns TransferHookInstruction - Formatted instruction
 */
export function createTransferHookInstruction(
  hookProgramId: Address,
  context: TransferHookContext
): TransferHookInstruction {
  // Serialize transfer context for the hook program
  const instructionData = new Uint8Array([
    ...getAddressEncoder().encode(context.source),
    ...getAddressEncoder().encode(context.destination),
    ...getAddressEncoder().encode(context.authority),
    ...getU64Encoder().encode(context.amount),
    ...getAddressEncoder().encode(context.mint),
    ...getBytesEncoder().encode(context.contextData)
  ])
  
  return {
    programId: hookProgramId,
    instructionData,
    additionalAccounts: []  // Hook-specific accounts would be added here
  }
}

// =====================================================
// METADATA POINTER EXTENSION
// =====================================================

/**
 * Token metadata structure (simplified)
 */
export interface TokenMetadata {
  /** Token name */
  name: string
  /** Token symbol */
  symbol: string
  /** Token description */
  description: string
  /** Token image URI */
  image?: string
  /** External URI for additional metadata */
  externalUri?: string
  /** Additional attributes */
  attributes?: { trait_type: string, value: string }[]
}

/**
 * Metadata pointer configuration
 */
export interface MetadataPointerConfig {
  /** Authority that can update metadata pointer */
  authority: Address | null
  /** Address where metadata is stored */
  metadataAddress: Address | null
}

/**
 * Serialize token metadata for on-chain storage
 * 
 * @param metadata - Token metadata object
 * @returns Uint8Array - Serialized metadata
 */
export function serializeTokenMetadata(metadata: TokenMetadata): Uint8Array {
  // Simple JSON serialization - real implementation might use more efficient encoding
  const jsonString = JSON.stringify(metadata)
  const encoded = getUtf8Encoder().encode(jsonString)
  return new Uint8Array(encoded)
}

/**
 * Deserialize token metadata from on-chain storage
 * 
 * @param data - Serialized metadata bytes
 * @returns TokenMetadata - Parsed metadata object
 */
export function deserializeTokenMetadata(data: Uint8Array): TokenMetadata {
  const jsonString = new TextDecoder().decode(data)
  return JSON.parse(jsonString) as TokenMetadata
}

// =====================================================
// ACCOUNT STATE MANAGEMENT
// =====================================================

/**
 * Token account state options for Token 2022
 */
export enum TokenAccountState {
  /** Account is uninitialized */
  UNINITIALIZED = 0,
  /** Account is initialized and usable */
  INITIALIZED = 1, 
  /** Account is frozen (transfers disabled) */
  FROZEN = 2
}

/**
 * CPI Guard configuration
 */
export interface CpiGuardConfig {
  /** Whether CPI guard is enabled */
  enabled: boolean
  /** Authority that can toggle CPI guard */
  authority: Address | null
}

/**
 * Non-transferable token configuration
 */
export interface NonTransferableConfig {
  /** Whether the token is non-transferable */
  nonTransferable: boolean
}

/**
 * Immutable owner configuration  
 */
export interface ImmutableOwnerConfig {
  /** Whether the account has immutable owner */
  immutable: boolean
}

/**
 * Check if account state allows transfers
 * 
 * @param state - Current account state
 * @param isNonTransferable - Whether token is non-transferable
 * @param isFrozen - Whether account is frozen
 * @returns boolean - True if transfers are allowed
 */
export function canTransfer(
  state: TokenAccountState,
  isNonTransferable = false,
  isFrozen = false
): boolean {
  // Basic transfer eligibility checks
  if (state !== TokenAccountState.INITIALIZED) return false
  if (isNonTransferable) return false
  if (isFrozen) return false
  
  return true
}

/**
 * Get required extensions for account creation
 * 
 * @param extensions - Desired extensions
 * @returns TokenExtension[] - Required extensions in dependency order
 */
export function getRequiredExtensions(
  extensions: TokenExtension[]
): TokenExtension[] {
  const required = new Set<TokenExtension>()
  
  for (const extension of extensions) {
    required.add(extension)
    
    // Add dependencies
    switch (extension) {
      case TokenExtension.TRANSFER_FEE_AMOUNT:
        required.add(TokenExtension.TRANSFER_FEE_CONFIG)
        break
      case TokenExtension.CONFIDENTIAL_TRANSFER_ACCOUNT:
        required.add(TokenExtension.CONFIDENTIAL_TRANSFER_MINT)
        break
      case TokenExtension.TRANSFER_HOOK_ACCOUNT:
        required.add(TokenExtension.TRANSFER_HOOK)
        break
    }
  }
  
  return Array.from(required).sort((a, b) => a - b)
}

// =====================================================
// UTILITY FUNCTIONS
// =====================================================

/**
 * Convert basis points to percentage
 * 
 * @param basisPoints - Basis points (10000 = 100%)
 * @returns number - Percentage as decimal (1.0 = 100%)
 */
export function basisPointsToPercentage(basisPoints: number): number {
  return basisPoints / 10000
}

/**
 * Convert percentage to basis points
 * 
 * @param percentage - Percentage as decimal (1.0 = 100%)
 * @returns number - Basis points
 */
export function percentageToBasisPoints(percentage: number): number {
  return Math.round(percentage * 10000)
}

/**
 * Format basis points as readable percentage
 * 
 * @param basisPoints - Basis points
 * @returns string - Formatted percentage (e.g., "2.50%")
 */
export function formatBasisPoints(basisPoints: number): string {
  const percentage = basisPointsToPercentage(basisPoints) * 100
  return `${percentage.toFixed(2)}%`
}

/**
 * Estimate gas costs for Token 2022 operations
 * 
 * @param operation - Type of operation
 * @param extensions - Extensions involved
 * @returns bigint - Estimated compute units
 */
export function estimateComputeUnits(
  operation: 'transfer' | 'create_account' | 'mint' | 'burn',
  extensions: TokenExtension[] = []
): bigint {
  let baseUnits = 0n
  
  switch (operation) {
    case 'transfer':
      baseUnits = 15000n // Base transfer cost
      break
    case 'create_account':
      baseUnits = 25000n // Base account creation cost
      break
    case 'mint':
      baseUnits = 10000n // Base mint cost
      break
    case 'burn':
      baseUnits = 10000n // Base burn cost
      break
  }
  
  // Add costs for extensions
  let extensionUnits = 0n
  for (const extension of extensions) {
    switch (extension) {
      case TokenExtension.TRANSFER_FEE_CONFIG:
        extensionUnits += 5000n
        break
      case TokenExtension.CONFIDENTIAL_TRANSFER_MINT:
      case TokenExtension.CONFIDENTIAL_TRANSFER_ACCOUNT:
        extensionUnits += 50000n // ZK proofs are expensive
        break
      case TokenExtension.TRANSFER_HOOK:
        extensionUnits += 15000n // External program calls
        break
      default:
        extensionUnits += 2000n // Default extension cost
    }
  }
  
  return baseUnits + extensionUnits
}

// =====================================================
// CONFIGURATION FACTORY FUNCTIONS
// =====================================================

/**
 * Create transfer fee configuration with validation
 */
export function createTransferFeeConfig(params: {
  transferFeeBasisPoints: number
  maximumFee: bigint
  transferFeeConfigAuthority: Address | null
  withdrawWithheldAuthority: Address | null
}): TransferFeeConfig {
  if (params.transferFeeBasisPoints > 10000) {
    throw new Error('Transfer fee basis points cannot exceed 10000')
  }

  return {
    transferFeeBasisPoints: params.transferFeeBasisPoints,
    maximumFee: params.maximumFee,
    transferFeeConfigAuthority: params.transferFeeConfigAuthority,
    withdrawWithheldAuthority: params.withdrawWithheldAuthority,
    withheldAmount: BigInt(0),
    olderTransferFee: {
      epoch: BigInt(0),
      transferFeeBasisPoints: 0,
      maximumFee: BigInt(0)
    },
    newerTransferFee: {
      epoch: BigInt(1),
      transferFeeBasisPoints: params.transferFeeBasisPoints,
      maximumFee: params.maximumFee
    }
  }
}

/**
 * Create interest bearing configuration with validation
 */
export function createInterestBearingConfig(params: {
  rateAuthority: Address | null
  currentRate: number
}): InterestBearingConfig {
  if (params.currentRate > 32767 || params.currentRate < -32768) {
    throw new Error('Interest rate must be within i16 range')
  }

  const currentTimestamp = BigInt(Math.floor(Date.now() / 1000))

  return {
    rateAuthority: params.rateAuthority,
    initializationTimestamp: currentTimestamp,
    preUpdateAverageRate: 0,
    lastUpdateTimestamp: currentTimestamp,
    currentRate: params.currentRate
  }
}

/**
 * Parse token extension data from raw bytes
 */
export function parseTokenExtension(
  extensionType: 'TransferFeeConfig' | 'InterestBearingConfig' | string,
  data: Uint8Array
): TransferFeeConfig | InterestBearingConfig {
  switch (extensionType) {
    case 'TransferFeeConfig': {
      if (data.length < 108) {
        throw new Error('Invalid extension data length')
      }
      // Simple parsing - in production would use proper borsh deserialization
      const transferFeeBasisPoints = data[0] | (data[1] << 8)
      return {
        transferFeeBasisPoints,
        maximumFee: BigInt(0), // Would parse from bytes 2-9
        transferFeeConfigAuthority: null,
        withdrawWithheldAuthority: null,
        withheldAmount: BigInt(0),
        olderTransferFee: {
          epoch: BigInt(0),
          transferFeeBasisPoints: 0,
          maximumFee: BigInt(0)
        },
        newerTransferFee: {
          epoch: BigInt(1),
          transferFeeBasisPoints,
          maximumFee: BigInt(0)
        }
      }
    }
    
    case 'InterestBearingConfig': {
      if (data.length < 40) {
        throw new Error('Invalid extension data length')
      }
      // Parse timestamp from first 8 bytes (little endian)
      let timestamp = 0n
      for (let i = 0; i < 8; i++) {
        timestamp |= BigInt(data[i]) << BigInt(i * 8)
      }
      return {
        rateAuthority: null,
        initializationTimestamp: timestamp,
        preUpdateAverageRate: 0,
        lastUpdateTimestamp: timestamp,
        currentRate: 0
      }
    }
    
    default:
      throw new Error('Unknown extension type')
  }
}