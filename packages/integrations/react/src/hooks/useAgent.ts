/**
 * React Hook for Agent Management
 * 
 * Provides React state management for agent operations including
 * creation, fetching, and real-time updates.
 */

import { useState, useEffect, useCallback } from 'react';
import { useGhostSpeakContext } from '../context/GhostSpeakProvider';
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
export function useAgent(options: UseAgentOptions = {}): UseAgentReturn {
  const {
    autoFetch = true,
    pollingInterval = 30000,
    realTimeUpdates = true
  } = options;

  const { agentService, connected } = useGhostSpeakContext();

  const [agents, setAgents] = useState<Agent[]>([]);
  const [currentAgent, setCurrentAgent] = useState<Agent | null>(null);
  const [loading, setLoading] = useState({
    list: false,
    create: false,
    update: false
  });
  const [error, setError] = useState<string | null>(null);

  /**
   * Create a new agent
   */
  const createAgent = useCallback(async (params: CreateAgentParams): Promise<Agent | null> => {
    if (!agentService) {
      setError('Agent service not available');
      return null;
    }

    setLoading(prev => ({ ...prev, create: true }));
    setError(null);

    try {
      const agent = await agentService.createAgent(params);
      
      // Add to local state
      setAgents(prev => [...prev, agent]);
      
      return agent;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create agent';
      setError(errorMessage);
      return null;
    } finally {
      setLoading(prev => ({ ...prev, create: false }));
    }
  }, [agentService]);

  /**
   * Fetch agent by ID
   */
  const fetchAgent = useCallback(async (agentId: string): Promise<Agent | null> => {
    if (!agentService) {
      setError('Agent service not available');
      return null;
    }

    try {
      const agent = await agentService.getAgent(agentId);
      
      // Update in local state if it exists
      setAgents(prev => 
        prev.map(a => a.id === agentId ? agent : a)
      );
      
      return agent;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch agent';
      setError(errorMessage);
      return null;
    }
  }, [agentService]);

  /**
   * Fetch user's agents
   */
  const fetchAgents = useCallback(async (): Promise<void> => {
    if (!agentService) {
      setError('Agent service not available');
      return;
    }

    setLoading(prev => ({ ...prev, list: true }));
    setError(null);

    try {
      const userAgents = await agentService.getUserAgents();
      setAgents(userAgents);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch agents';
      setError(errorMessage);
    } finally {
      setLoading(prev => ({ ...prev, list: false }));
    }
  }, [agentService]);

  /**
   * Select an agent
   */
  const selectAgent = useCallback((agentId: string): void => {
    const agent = agents.find(a => a.id === agentId);
    setCurrentAgent(agent || null);
  }, [agents]);

  /**
   * Update agent
   */
  const updateAgent = useCallback(async (agentId: string, updates: Partial<Agent>): Promise<boolean> => {
    if (!agentService) {
      setError('Agent service not available');
      return false;
    }

    setLoading(prev => ({ ...prev, update: true }));
    setError(null);

    try {
      const updatedAgent = await agentService.updateAgent(agentId, updates);
      
      // Update local state
      setAgents(prev => 
        prev.map(a => a.id === agentId ? updatedAgent : a)
      );
      
      // Update current agent if it's the one being updated
      if (currentAgent?.id === agentId) {
        setCurrentAgent(updatedAgent);
      }
      
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update agent';
      setError(errorMessage);
      return false;
    } finally {
      setLoading(prev => ({ ...prev, update: false }));
    }
  }, [agentService, currentAgent]);

  /**
   * Delete agent
   */
  const deleteAgent = useCallback(async (agentId: string): Promise<boolean> => {
    if (!agentService) {
      setError('Agent service not available');
      return false;
    }

    try {
      await agentService.deleteAgent(agentId);
      
      // Remove from local state
      setAgents(prev => prev.filter(a => a.id !== agentId));
      
      // Clear current agent if it's the one being deleted
      if (currentAgent?.id === agentId) {
        setCurrentAgent(null);
      }
      
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete agent';
      setError(errorMessage);
      return false;
    }
  }, [agentService, currentAgent]);

  /**
   * Refresh data
   */
  const refresh = useCallback(async (): Promise<void> => {
    await fetchAgents();
  }, [fetchAgents]);

  // Auto-fetch on mount and when connected
  useEffect(() => {
    if (autoFetch && connected && agentService) {
      fetchAgents();
    }
  }, [autoFetch, connected, agentService, fetchAgents]);

  // Set up polling
  useEffect(() => {
    if (!connected || !agentService || pollingInterval <= 0) return;

    const interval = setInterval(() => {
      fetchAgents();
    }, pollingInterval);

    return () => clearInterval(interval);
  }, [connected, agentService, pollingInterval, fetchAgents]);

  // Set up real-time updates
  useEffect(() => {
    if (!realTimeUpdates || !agentService || !connected) return;

    // Set up WebSocket or polling for real-time updates
    // This would depend on the SDK implementation
    const unsubscribe = agentService.onAgentUpdate?.((updatedAgent: Agent) => {
      setAgents(prev => 
        prev.map(a => a.id === updatedAgent.id ? updatedAgent : a)
      );
      
      // Use callback ref to avoid stale closure
      setCurrentAgent(prev => 
        prev?.id === updatedAgent.id ? updatedAgent : prev
      );
    });

    return () => {
      // Ensure cleanup is called if unsubscribe function exists
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, [realTimeUpdates, agentService, connected]);

  return {
    agents,
    currentAgent,
    loading,
    error,
    createAgent,
    fetchAgent,
    fetchAgents,
    selectAgent,
    updateAgent,
    deleteAgent,
    refresh
  };
}