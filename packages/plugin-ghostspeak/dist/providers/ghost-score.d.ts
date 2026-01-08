/**
 * GHOST_SCORE_PROVIDER
 *
 * Provides Ghost Score reputation context for agent state composition.
 * Fetches real on-chain data from GhostSpeak blockchain.
 */
import type { Provider } from '@elizaos/core';
/**
 * Ghost Score Provider
 *
 * Supplies reputation context for agent reasoning:
 * - Ghost Score (0-10000)
 * - Tier (PLATINUM/GOLD/SILVER/BRONZE/NEWCOMER)
 * - Job completion stats
 * - Active status
 */
export declare const ghostScoreProvider: Provider;
export default ghostScoreProvider;
//# sourceMappingURL=ghost-score.d.ts.map