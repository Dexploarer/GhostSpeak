/**
 * Minimal GhostSpeak SDK Entry Point
 * 
 * Provides core functionality with minimal bundle size.
 * Perfect for applications that only need basic features.
 */

// Core client (required)
export { GhostSpeakClient as default } from './GhostSpeakClient.js'

// Essential types only
export type {
  Agent,
  AgentType,
  Escrow,
  EscrowStatus,
  Channel,
  ChannelType,
  SDKError
} from './types.js'

export type { GhostSpeakConfig } from '../types/index.js'

// Essential utilities
export { sol } from '../utils/common.js'

// Core errors for better DX
export {
  GhostSpeakError,
  InsufficientBalanceError,
  NetworkError,
  ValidationError
} from './errors.js'

// Note: This minimal bundle excludes:
// - Advanced crypto operations (ElGamal, ZK proofs)
// - DevTools and debugging features  
// - Complex workflow builders
// - WASM optimizations
// - Advanced RPC features
//
// Import from main entry point if you need these features