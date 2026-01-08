/**
 * GhostSpeak ElizaOS Plugin
 *
 * Universal AI agent reputation, credentials, and identity on Solana.
 * Use this plugin with any ElizaOS agent to enable GhostSpeak capabilities.
 *
 * Core capabilities:
 * - Ghost Score reputation (0-10000 scale)
 * - Agent registration on-chain
 * - W3C Verifiable Credentials
 * - DID document management
 * - Staking, Escrow, Privacy controls
 */
import type { Plugin } from '@elizaos/core';
/**
 * GhostSpeak Plugin Definition
 *
 * A slim plugin definition that wires together all components.
 * Business logic is in actions, services, and providers.
 *
 * This plugin is character-agnostic - use it with any ElizaOS agent.
 */
export declare const ghostspeakPlugin: Plugin;
export declare const starterPlugin: Plugin;
export { GhostSpeakService as StarterService } from './services/GhostSpeakService';
export default ghostspeakPlugin;
//# sourceMappingURL=plugin.d.ts.map