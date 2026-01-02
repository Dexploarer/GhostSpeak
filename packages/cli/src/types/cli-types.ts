/**
 * CLI Type Definitions for GhostSpeak - Regenerated for Current Architecture
 * Only includes types for commands that actually exist in the codebase
 */

import type { Address } from '@solana/addresses'

// ===== ADDRESS VALIDATION =====
export function assertValidAddress(value: unknown): Address {
  if (typeof value === 'string' && value.length >= 32) {
    return value as Address
  }
  throw new Error(`Invalid address: expected string with length >= 32, got ${typeof value}`)
}

// ===== AGENT COMMAND OPTIONS =====
export interface RegisterOptions {
  name?: string
  description?: string
  capabilities?: string
  endpoint?: string
  type?: string
  metadata?: boolean
  yes?: boolean
}

export interface ListOptions {
  limit: string
}

export interface SearchOptions {
  query: string
  type?: string
  capability?: string
  maxAge?: string
  startAfter?: string
  limit?: string
}

export interface StatusOptions {
  agent?: string
  agentId?: string
  detailed?: boolean
}

export interface UpdateOptions {
  agentId?: string
  agent?: string
  name?: string
  description?: string
  endpoint?: string
  active?: boolean
}

export interface VerifyOptions {
  agent?: string
  auto?: boolean
}

export interface AnalyticsOptions {
  agent?: string
  mine?: boolean
  period?: string
  format?: string
}

export interface ManageOptions {
  action: string
  agent?: string
}

// ===== WALLET COMMAND OPTIONS =====
export interface WalletCreateOptions {
  name?: string
  network?: 'devnet' | 'testnet' | 'mainnet-beta'
}

export interface WalletImportOptions {
  name: string
  network?: 'devnet' | 'testnet' | 'mainnet-beta'
}

export interface WalletUseOptions {
  name?: string
}

export interface WalletRenameOptions {
  name: string
  newName: string
}

export interface WalletDeleteOptions {
  name: string
  confirm?: boolean
}

// ===== GOVERNANCE COMMAND OPTIONS =====
export interface CreateMultisigOptions {
  name?: string
  description?: string
  threshold?: string
  timelock?: string
}

export interface CreateProposalOptions {
  title?: string
  description?: string
  category?: string
  duration?: string
}

export interface VoteOptions {
  proposal: string
  vote: string
  reason?: string
}

export interface ListProposalsOptions {
  status?: string
  category?: string
  proposer?: string
  limit?: string
}

// ===== AUCTION COMMAND OPTIONS =====
export interface CreateAuctionOptions {
  item?: string
  description?: string
  startingPrice?: string
  type?: 'english' | 'dutch' | 'sealed'
  duration?: string
}

export interface BidOptions {
  auction: string
  amount: string
}

export interface ListAuctionsOptions {
  status?: 'active' | 'ended'
  limit?: string
}

// ===== DISPUTE COMMAND OPTIONS =====
export interface FileDisputeOptions {
  reason: string
  severity?: 'low' | 'medium' | 'high'
  description?: string
}

export interface SubmitEvidenceOptions {
  dispute: string
  type: string
  data: string
  description?: string
}

export interface ListDisputesOptions {
  status?: string
  limit?: string
}

// ===== FAUCET & AIRDROP OPTIONS =====
export interface FaucetOptions {
  amount?: string
  network?: string
  save?: boolean
  wallet?: string
}

export interface FaucetStatusOptions {
  wallet?: string
}

export interface AirdropOptions {
  recipient?: string
  amount?: string
}

export interface GenerateWalletOptions {
  save?: boolean
  name?: string
}

// ===== CONFIG COMMAND OPTIONS =====
export interface ConfigSetOptions {
  key: string
  value: string
}

export interface ConfigGetOptions {
  key?: string
}

export interface ConfigResetOptions {
  confirm?: boolean
}

// ===== DIAGNOSE COMMAND OPTIONS =====
export interface DiagnoseOptions {
  network?: 'devnet' | 'testnet' | 'mainnet-beta'
  verbose?: boolean
  export?: string
  dryRun?: boolean
}

export interface DiagnosticReport {
  account: string
  network: string
  exists: boolean
  owner?: string
  lamports?: number
  data?: Uint8Array
  executable?: boolean
  rentEpoch?: number
  errors: string[]
  warnings: string[]
}

// ===== SDK COMMAND OPTIONS =====
export interface SDKInstallOptions {
  version?: string
  global?: boolean
}

export interface SDKInfoOptions {
  verbose?: boolean
}

// ===== COMMON RESPONSE TYPES =====
export interface CommandResponse {
  success: boolean
  message?: string
  data?: unknown
}

export interface ErrorResponse {
  success: false
  error: string
  details?: string
}

export interface SuccessResponse<T = unknown> {
  success: true
  data: T
  message?: string
}

// ===== TYPE GUARDS =====
export function isString(value: unknown): value is string {
  return typeof value === 'string'
}

export function isNumber(value: unknown): value is number {
  return typeof value === 'number' && !isNaN(value)
}

export function isAddress(value: unknown): value is Address {
  return typeof value === 'string' && value.length >= 32 && value.length <= 88
}

export function isDefined<T>(value: T | undefined | null): value is T {
  return value !== undefined && value !== null
}

export function isError(value: unknown): value is Error {
  return value instanceof Error
}

export function isValidDiagnoseOptions(options: unknown): options is DiagnoseOptions {
  if (typeof options !== 'object' || options === null) return false

  const opts = options as Record<string, unknown>
  return (
    (opts.network === undefined || ['devnet', 'testnet', 'mainnet-beta'].includes(opts.network as string)) &&
    (opts.verbose === undefined || typeof opts.verbose === 'boolean') &&
    (opts.export === undefined || typeof opts.export === 'string') &&
    (opts.dryRun === undefined || typeof opts.dryRun === 'boolean')
  )
}

// ===== UTILITY TYPES =====
export type StringOrUndefined = string | undefined
export type NumberOrUndefined = number | undefined
export type BooleanOrUndefined = boolean | undefined

export type RequireOne<T, K extends keyof T> = T & Required<Pick<T, K>>
export type RequireAtLeastOne<T> = {
  [K in keyof T]-?: Required<Pick<T, K>> & Partial<Pick<T, Exclude<keyof T, K>>>
}[keyof T]

// ===== VALIDATION HELPERS =====
export function isValidUrl(value: string): boolean {
  try {
    new URL(value)
    return true
  } catch {
    return false
  }
}

export function validateString(value: unknown, name: string): string {
  if (!isString(value)) {
    throw new Error(`${name} must be a string`)
  }
  return value
}

export function validateNumber(value: unknown, name: string): number {
  if (!isNumber(value)) {
    throw new Error(`${name} must be a number`)
  }
  return value
}

export function validateAddress(value: unknown, name: string): Address {
  if (!isAddress(value)) {
    throw new Error(`${name} must be a valid Solana address`)
  }
  return value as Address
}

export function parseNumberSafe(value: string): number | undefined {
  const parsed = Number(value)
  return isNaN(parsed) ? undefined : parsed
}

export function parseIntSafe(value: string): number | undefined {
  const parsed = parseInt(value, 10)
  return isNaN(parsed) ? undefined : parsed
}

export function parseFloatSafe(value: string): number | undefined {
  const parsed = parseFloat(value)
  return isNaN(parsed) ? undefined : parsed
}
