/**
 * GhostSpeak ElizaOS Plugin
 *
 * AI agent reputation, credentials, and identity on Solana.
 */
import ghostspeakPlugin from './plugin';
export { ghostspeakPlugin, starterPlugin, StarterService } from './plugin';
export default ghostspeakPlugin;
export { GhostSpeakService } from './services/GhostSpeakService';
export { checkGhostScoreAction, registerAgentAction, issueCredentialAction, acceptPaymentAction, createDidAction, resolveDidAction, updateDidAction, stakeGhostAction, checkStakingAction, setPrivacyModeAction, createEscrowAction, } from './actions';
export { ghostScoreProvider, agentContextProvider } from './providers';
export { ghostspeakConfigSchema, type GhostSpeakPluginConfig } from './config';
export { getAgentSigner, getAgentAddress, getAgentBalance, hasWalletConfigured, ensureFundedWallet, airdropToAgent, formatSolBalance, exportPublicKey, } from './wallet';
//# sourceMappingURL=index.d.ts.map