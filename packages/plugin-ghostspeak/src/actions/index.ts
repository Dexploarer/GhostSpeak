/**
 * GhostSpeak Plugin Actions
 *
 * Core actions for AI agent reputation and identity on Solana.
 * Governance actions have been removed per redesign.
 */

// Core Actions
export { checkGhostScoreAction } from './ghost-score';
export { registerAgentAction } from './registerAgent';
export { issueCredentialAction } from './issueCredential';

// Payment Actions (x402 via PayAI)
export { acceptPaymentAction } from './acceptPayment';

// DID Actions
export { createDidAction, resolveDidAction, updateDidAction } from './didActions';

// Protocol Actions (without governance)
export {
  stakeGhostAction,
  checkStakingAction,
  setPrivacyModeAction,
  createEscrowAction,
} from './protocolActions';

// Note: createProposalAction and voteProposalAction have been removed
// Governance is not a core use case for AI agents

// Note: discoveredAgents actions removed - they were Convex-specific (web app only)
// For blockchain-based agent discovery, use the SDK directly or implement custom actions
