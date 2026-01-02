/**
 * @ghostspeak/solana-agent-kit-plugin
 *
 * Universal AI Agent Identity & Reputation plugin for solana-agent-kit
 *
 * Fills the identity gap in solana-agent-kit by providing:
 * - Ghost identity registration and verification
 * - Cross-platform ID resolution (PayAI, ElizaOS, GitHub, etc.)
 * - Ghost Score reputation system (0-1000)
 * - Verifiable credentials and DID support
 *
 * @packageDocumentation
 */

// Main plugin export
export { createGhostPlugin, GhostPlugin } from './plugin.js';

// Export types
export type {
  GhostIdentity,
  RegisterGhostParams,
  MapExternalIdParams,
  CreateDidParams,
  VerificationResult,
  ActionResult,
  GhostPluginConfig,
} from './types/index.js';

// Export methods for direct use
export {
  registerGhost,
  getGhostIdentity,
  resolveExternalId,
  getGhostScore,
  verifyGhost,
  checkExternalIdExists,
  getExternalIds,
} from './methods/index.js';

// Export actions for custom integrations
export {
  getGhostIdentityAction,
  resolveExternalIdAction,
  getGhostScoreAction,
  verifyGhostAction,
} from './actions/index.js';
