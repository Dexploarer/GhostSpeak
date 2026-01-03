/**
 * Central Type Exports
 *
 * Minimal type exports for landing page
 */

// Agent types
export type {
  Agent,
  AgentFilters,
  AgentRegistrationParams,
  AgentUpdateParams,
  AgentAccountData,
} from './agent'

// Error types
export type { ErrorInfo } from '@/lib/errors/error-messages'
export type { ErrorType, ErrorMetadata, ErrorCoordinatorConfig } from '@/lib/errors/error-coordinator'
