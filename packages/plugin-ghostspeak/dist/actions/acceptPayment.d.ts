/**
 * Accept Payment Action for GhostSpeak Plugin
 *
 * Unified action that combines PayAI x402 payments with GhostSpeak reputation.
 * Enables agents to accept payments for services with reputation-based pricing.
 *
 * Flow:
 * 1. Check agent's Ghost Score to determine pricing tier
 * 2. Return 402 Payment Required with PayAI facilitator details
 * 3. Verify payment via PayAI facilitator
 * 4. Execute the requested service
 * 5. Update reputation based on outcome
 */
import type { Action } from '@elizaos/core';
/**
 * Accept Payment Action
 *
 * Returns 402 Payment Required if no payment, executes service if paid
 */
export declare const acceptPaymentAction: Action;
export default acceptPaymentAction;
//# sourceMappingURL=acceptPayment.d.ts.map