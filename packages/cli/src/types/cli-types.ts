/**
 * CLI Type Definitions for GhostSpeak
 * Comprehensive type safety for all CLI commands and operations
 */

import type { Address } from '@solana/addresses'

// Command Option Interfaces
export interface RegisterOptions {
  name?: string
  description?: string
  endpoint?: string
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
  agentId?: string  // Added missing agentId field
  agent?: string    // Made optional since we can select interactively
  name?: string
  description?: string
  endpoint?: string
  active?: boolean
}

export interface VerifyOptions {
  agent?: string  // Made optional since can be selected interactively
  auto?: boolean
}

export interface AnalyticsOptions {
  agent?: string
  mine?: boolean  // Added missing mine field
  period?: string
  format?: string
}

export interface ManageOptions {
  action: string
  agent?: string
}

// Marketplace Command Options
export interface CreateServiceOptions {
  title?: string
  description?: string
  price?: string
  category?: string
  tags?: string
  requirements?: string
}

export interface BuyServiceOptions {
  service: string
  agent?: string
  requirements?: string
}

export interface ListServicesOptions {
  category?: string
  tags?: string
  minPrice?: string
  maxPrice?: string
  limit?: string
  sortBy?: string
}

export interface SearchServicesOptions {
  query: string
  category?: string
  tags?: string
  minPrice?: string
  maxPrice?: string
  limit?: string
}

export interface JobsOptions {
  status?: string
  agent?: string
  client?: string
  limit?: string
}

// Governance Command Options
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

// Escrow Command Options
export interface CreateEscrowOptions {
  amount?: string
  recipient?: string
  description?: string
  duration?: string
}

export interface ReleaseEscrowOptions {
  escrow: string
  rating?: string
  review?: string
}

export interface DisputeEscrowOptions {
  escrow: string
  reason?: string
  evidence?: string
}

// Auction Command Options
export interface CreateAuctionOptions {
  type?: string
  startingPrice?: string
  reservePrice?: string
  duration?: string
  agent?: string
}

export interface BidAuctionOptions {
  auction?: string
  bid?: string
}

export interface ListAuctionsOptions {
  type?: string
  status?: string
  agent?: string
  limit?: string
  mine?: boolean
}

// Channel Command Options
export interface CreateChannelOptions {
  name?: string
  description?: string
  type?: string
  participants?: string[]
}

export interface SendMessageOptions {
  channel: string
  message: string
  type?: string
}

export interface ListChannelsOptions {
  type?: string
  participant?: string
  limit?: string
}

// Dispute Command Options
export interface FileDisputeOptions {
  workOrder?: string
  reason?: string
  description?: string
  evidence?: string[]
  resolution?: string
}

export interface ResolveDisputeOptions {
  dispute: string
  resolution?: string
  ruling?: string
  compensation?: string
}

export interface EscalateDisputeOptions {
  dispute: string
  reason?: string
  urgency?: string
}

export interface ListDisputesOptions {
  status?: string
  mine?: boolean
  asArbitrator?: boolean
  limit?: string
}

// Faucet Command Options
export interface FaucetOptions {
  amount?: string
  network?: string
  save?: boolean
  wallet?: string
}

export interface FaucetStatusOptions {
  wallet?: string
}

export interface GenerateWalletOptions {
  save?: boolean
  name?: string
}

// Config Command Options
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

// Common Response Types
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

// Type Guards
export function isString(value: unknown): value is string {
  return typeof value === 'string'
}

export function isNumber(value: unknown): value is number {
  return typeof value === 'number' && !isNaN(value)
}

export function isAddress(value: unknown): value is Address {
  return typeof value === 'string' && value.length >= 32 && value.length <= 44
}

export function isDefined<T>(value: T | undefined | null): value is T {
  return value !== undefined && value !== null
}

export function isError(value: unknown): value is Error {
  return value instanceof Error
}

// Utility Types
export type StringOrUndefined = string | undefined
export type NumberOrUndefined = number | undefined
export type BooleanOrUndefined = boolean | undefined

export type RequireOne<T, K extends keyof T> = T & Required<Pick<T, K>>
export type RequireAtLeastOne<T> = {
  [K in keyof T]-?: Required<Pick<T, K>> & Partial<Pick<T, Exclude<keyof T, K>>>
}[keyof T]

// URL validation helper
export function isValidUrl(value: string): boolean {
  try {
     
    new globalThis.URL(value)
    return true
  } catch {
    return false
  }
}

// Validation Helpers
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