/**
 * Base interfaces for instruction parameters
 * Reduces duplication across instruction modules
 */

import type { Address, TransactionSigner } from '@solana/kit'
// Base parameter interfaces
export interface BaseInstructionParams {
  signer: TransactionSigner
}

export interface BaseCreationParams extends BaseInstructionParams {
  title: string
  description: string
}

export interface BaseUpdateParams extends BaseInstructionParams {
  address: Address
}

export interface BaseTokenParams {
  amount: bigint
  tokenMint?: Address
}

export interface BaseTimeParams {
  deadline: bigint
  createdAt?: bigint
}

export interface BasePaginationParams {
  limit?: number
  offset?: number
}

export interface BaseFilterParams {
  creator?: Address
  isActive?: boolean
  minAmount?: bigint
  maxAmount?: bigint
}

// Common instruction patterns
export interface InstructionExecutionContext {
  operation: string
  signer: TransactionSigner
  logDetails?: boolean
}

// Standardized return types
export interface PaginatedResult<T> {
  data: T[]
  total: number
  offset: number
  limit: number
  hasMore: boolean
}

export interface OperationResult {
  success: boolean
  signature?: string
  error?: string
  timestamp: bigint
}

// Common validation interfaces
export interface ValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
}

export interface ParameterValidator<T> {
  validate(params: T): ValidationResult
  sanitize(params: T): T
}

// Status interfaces
export interface StatusInfo {
  isActive: boolean
  lastUpdated: bigint
  version: number
}

export interface HealthStatus extends StatusInfo {
  healthScore: number
  errors: string[]
  warnings: string[]
}