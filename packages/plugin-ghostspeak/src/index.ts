/**
 * GhostSpeak ElizaOS Plugin
 *
 * AI agent reputation, credentials, and identity on Solana.
 */

// Main plugin export
import ghostspeakPlugin from './plugin';
export { ghostspeakPlugin, starterPlugin, StarterService } from './plugin';
export default ghostspeakPlugin;

// Services
export { GhostSpeakService } from './services/GhostSpeakService';

// Actions
export {
  checkGhostScoreAction,
  registerAgentAction,
  issueCredentialAction,
  acceptPaymentAction,
  createDidAction,
  resolveDidAction,
  updateDidAction,
  stakeGhostAction,
  checkStakingAction,
  setPrivacyModeAction,
  createEscrowAction,
} from './actions';

// Providers
export { ghostScoreProvider, agentContextProvider } from './providers';

// Config
export { ghostspeakConfigSchema, type GhostSpeakPluginConfig } from './config';

// Character (full ElizaOS Character configuration)
export { caisperCharacter, caisperPersona, getRandomCatchphrase, getTierMessage } from './character';

// Wallet utilities
export {
  getAgentSigner,
  getAgentAddress,
  getAgentBalance,
  hasWalletConfigured,
  ensureFundedWallet,
  airdropToAgent,
  formatSolBalance,
  exportPublicKey,
} from './wallet';
