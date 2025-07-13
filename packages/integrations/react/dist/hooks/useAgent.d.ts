/**
 * React Hook for Agent Management
 *
 * Provides React state management for agent operations including
 * creation, fetching, and real-time updates.
 */
import { Agent, CreateAgentParams } from '@ghostspeak/sdk';
export interface UseAgentReturn {
    /** Current agents */
    agents: Agent[];
    /** Selected agent */
    currentAgent: Agent | null;
    /** Loading states */
    loading: {
        list: boolean;
        create: boolean;
        update: boolean;
    };
    /** Error state */
    error: string | null;
    /** Create a new agent */
    createAgent: (params: CreateAgentParams) => Promise<Agent | null>;
    /** Fetch agent by ID */
    fetchAgent: (agentId: string) => Promise<Agent | null>;
    /** Fetch user's agents */
    fetchAgents: () => Promise<void>;
    /** Select an agent */
    selectAgent: (agentId: string) => void;
    /** Update agent */
    updateAgent: (agentId: string, updates: Partial<Agent>) => Promise<boolean>;
    /** Delete agent */
    deleteAgent: (agentId: string) => Promise<boolean>;
    /** Refresh data */
    refresh: () => Promise<void>;
}
export interface UseAgentOptions {
    /** Auto-fetch agents on mount */
    autoFetch?: boolean;
    /** Polling interval for updates (ms) */
    pollingInterval?: number;
    /** Enable real-time updates */
    realTimeUpdates?: boolean;
}
/**
 * Hook for agent management
 */
export declare function useAgent(options?: UseAgentOptions): UseAgentReturn;
//# sourceMappingURL=useAgent.d.ts.map