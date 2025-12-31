/**
 * Utilities Index - Tree-shakeable Exports
 * 
 * Import only the utilities you need for optimal bundle size.
 */

// Most commonly used utilities
export { sol, lamportsToSol } from './common.js'

// PDA derivation (frequently used)
export {
  deriveAgentPda,
  findProgramDerivedAddress
} from './pda.js'

// Token operations (moderate usage)
export {
  deriveAssociatedTokenAddress,
  detectTokenProgram,
  isToken2022Mint,
  getTokenProgramType,
  formatTokenAmount,
  parseTokenAmount,
  type TokenProgram
} from './token-utils.js'

// Error handling (essential for good UX)
export {
  GhostSpeakSDKError,
  withEnhancedErrors,
  enhanceTransactionError,
  createErrorContext,
  type ErrorContext
} from './enhanced-client-errors.js'

// Advanced utilities (tree-shakeable bulk exports)
// Only import specific modules if needed to avoid bundle bloat

// Token-2022 extensions removed - not aligned with pivot

// IPFS operations (for large content)
export * as ipfs from './ipfs-client.js'

// Privacy and encryption (specialized usage)
export * as privacy from './client-encryption.js'

// Agent authorization signatures (ERC-8004 parity)
export * as authSignatures from './signature-verification.js'
export {
  createAuthorizationMessage,
  signAuthorizationMessage,
  verifyAuthorizationSignature,
  createSignedAuthorization,
  generateNonce,
  serializeAuthorization,
  deserializeAuthorization,
  getAuthorizationId,
  isAuthorizationExpired,
  isAuthorizationExhausted,
  validateAuthorizationNetwork,
} from './signature-verification.js'

// Confidential transfers removed - x402 payment protocol focus
// export * as confidential from './confidential-transfer-manager.js'

// Account management (diagnostic and migration)
export * as accounts from './account-diagnostics.js'

// Governance helpers (DAO functionality)
export * as governance from './governance-helpers.js'

// Feature flags and gates (configuration)
export * as features from './feature-flags.js'

// Reputation calculation and tagging (reputation layer)
export { ReputationCalculator } from './reputation-calculator.js'
export { ReputationTagEngine } from './reputation-tag-engine.js'
