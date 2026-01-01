/**
 * PayAI Polling Service for Caisper Plugin
 *
 * Polls for new PayAI payments and updates agent reputation
 * Complements webhook handler with backup polling mechanism
 */
import type { IAgentRuntime } from '@elizaos/core';
import { Service } from '@elizaos/core';
import type { Address } from '@solana/addresses';
/**
 * PayAI Polling Service
 *
 * Polls blockchain for new payments and updates reputation
 * Runs every 5 minutes as backup to webhook handler
 */
export declare class PayAIPollingService extends Service {
    protected runtime: IAgentRuntime;
    static serviceType: string;
    private intervalId;
    private readonly pollIntervalMs;
    private readonly processedSignatures;
    private ghostSpeakClient;
    capabilityDescription: string;
    constructor(runtime: IAgentRuntime);
    static start(runtime: IAgentRuntime): Promise<PayAIPollingService>;
    static stop(runtime: IAgentRuntime): Promise<void>;
    initialize(): Promise<void>;
    stop(): Promise<void>;
    private startPolling;
    private shutdown;
    private pollPayments;
    private checkAgentPayments;
    private processPayment;
    /**
     * Manually trigger payment check for specific agent
     * Useful for testing or forced updates
     */
    checkPaymentsNow(agentAddress: Address): Promise<void>;
    /**
     * Get processing stats
     */
    getStats(): {
        processedPayments: number;
        isPolling: boolean;
        pollInterval: string;
    };
}
export default PayAIPollingService;
//# sourceMappingURL=PayAIPollingService.d.ts.map