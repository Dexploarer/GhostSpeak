'use strict';

var jsxRuntime = require('react/jsx-runtime');
var react = require('react');
var walletAdapterReact = require('@solana/wallet-adapter-react');
var sdk = require('@ghostspeak/sdk');

const GhostSpeakContext = react.createContext(null);
function GhostSpeakProvider({ children, network = 'devnet', rpcUrl, autoConnect = true, config = {} }) {
    const { connection } = walletAdapterReact.useConnection();
    const { wallet, connected: walletConnected, publicKey } = walletAdapterReact.useWallet();
    const [client, setClient] = react.useState(null);
    const [agentService, setAgentService] = react.useState(null);
    const [messageService, setMessageService] = react.useState(null);
    const [escrowService, setEscrowService] = react.useState(null);
    const [marketplaceService, setMarketplaceService] = react.useState(null);
    const [connected, setConnected] = react.useState(false);
    const [loading, setLoading] = react.useState(false);
    const [error, setError] = react.useState(null);
    /**
     * Initialize GhostSpeak client and services
     */
    const initialize = async () => {
        if (!wallet || !publicKey) {
            setError('Wallet not connected');
            return;
        }
        setLoading(true);
        setError(null);
        try {
            // Create GhostSpeak client
            const ghostSpeakClient = new sdk.GhostSpeakClient({
                network,
                rpcUrl: rpcUrl || connection.rpcEndpoint,
                wallet,
                ...config
            });
            // Initialize services
            const agentSvc = new sdk.AgentService(ghostSpeakClient);
            const messageSvc = new sdk.MessageService(ghostSpeakClient);
            const escrowSvc = new sdk.EscrowService(ghostSpeakClient);
            const marketplaceSvc = new sdk.MarketplaceService(ghostSpeakClient);
            // Test connection
            await ghostSpeakClient.initialize();
            // Update state
            setClient(ghostSpeakClient);
            setAgentService(agentSvc);
            setMessageService(messageSvc);
            setEscrowService(escrowSvc);
            setMarketplaceService(marketplaceSvc);
            setConnected(true);
            if (config.debug) {
                console.log('GhostSpeak client initialized successfully');
            }
        }
        catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to initialize GhostSpeak client';
            setError(errorMessage);
            console.error('GhostSpeak initialization error:', err);
        }
        finally {
            setLoading(false);
        }
    };
    /**
     * Disconnect and cleanup
     */
    const disconnect = () => {
        setClient(null);
        setAgentService(null);
        setMessageService(null);
        setEscrowService(null);
        setMarketplaceService(null);
        setConnected(false);
        setError(null);
        if (config.debug) {
            console.log('GhostSpeak client disconnected');
        }
    };
    // Auto-initialize when wallet connects
    react.useEffect(() => {
        if (autoConnect && walletConnected && !connected && !loading) {
            initialize();
        }
    }, [walletConnected, autoConnect, connected, loading, initialize]);
    // Disconnect when wallet disconnects
    react.useEffect(() => {
        if (!walletConnected && connected) {
            disconnect();
        }
    }, [walletConnected, connected, disconnect]);
    // Cleanup on unmount
    react.useEffect(() => {
        return () => {
            if (client) {
                disconnect();
            }
        };
    }, [client, disconnect]);
    const contextValue = {
        client,
        agentService,
        messageService,
        escrowService,
        marketplaceService,
        connected,
        loading,
        error,
        network,
        initialize,
        disconnect
    };
    return (jsxRuntime.jsx(GhostSpeakContext.Provider, { value: contextValue, children: children }));
}
/**
 * Hook to access GhostSpeak context
 */
function useGhostSpeakContext() {
    const context = react.useContext(GhostSpeakContext);
    if (!context) {
        throw new Error('useGhostSpeakContext must be used within a GhostSpeakProvider');
    }
    return context;
}

/**
 * Main GhostSpeak React Hook
 *
 * Provides access to GhostSpeak client and services with React state management.
 */
/**
 * Main hook for GhostSpeak integration
 */
function useGhostSpeak() {
    const { client, agentService, messageService, escrowService, marketplaceService, connected, loading, error, network, initialize, disconnect } = useGhostSpeakContext();
    const connect = react.useCallback(async () => {
        await initialize();
    }, [initialize]);
    const isReady = react.useMemo(() => {
        return connected && client !== null && !loading && error === null;
    }, [connected, client, loading, error]);
    return {
        client,
        agentService,
        messageService,
        escrowService,
        marketplaceService,
        connected,
        loading,
        error,
        network,
        connect,
        disconnect,
        isReady
    };
}

/**
 * React Hook for Agent Management
 *
 * Provides React state management for agent operations including
 * creation, fetching, and real-time updates.
 */
/**
 * Hook for agent management
 */
function useAgent(options = {}) {
    const { autoFetch = true, pollingInterval = 30000, realTimeUpdates = true } = options;
    const { agentService, connected } = useGhostSpeakContext();
    const [agents, setAgents] = react.useState([]);
    const [currentAgent, setCurrentAgent] = react.useState(null);
    const [loading, setLoading] = react.useState({
        list: false,
        create: false,
        update: false
    });
    const [error, setError] = react.useState(null);
    /**
     * Create a new agent
     */
    const createAgent = react.useCallback(async (params) => {
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
        }
        catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to create agent';
            setError(errorMessage);
            return null;
        }
        finally {
            setLoading(prev => ({ ...prev, create: false }));
        }
    }, [agentService]);
    /**
     * Fetch agent by ID
     */
    const fetchAgent = react.useCallback(async (agentId) => {
        if (!agentService) {
            setError('Agent service not available');
            return null;
        }
        try {
            const agent = await agentService.getAgent(agentId);
            // Update in local state if it exists
            setAgents(prev => prev.map(a => a.id === agentId ? agent : a));
            return agent;
        }
        catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to fetch agent';
            setError(errorMessage);
            return null;
        }
    }, [agentService]);
    /**
     * Fetch user's agents
     */
    const fetchAgents = react.useCallback(async () => {
        if (!agentService) {
            setError('Agent service not available');
            return;
        }
        setLoading(prev => ({ ...prev, list: true }));
        setError(null);
        try {
            const userAgents = await agentService.getUserAgents();
            setAgents(userAgents);
        }
        catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to fetch agents';
            setError(errorMessage);
        }
        finally {
            setLoading(prev => ({ ...prev, list: false }));
        }
    }, [agentService]);
    /**
     * Select an agent
     */
    const selectAgent = react.useCallback((agentId) => {
        const agent = agents.find(a => a.id === agentId);
        setCurrentAgent(agent || null);
    }, [agents]);
    /**
     * Update agent
     */
    const updateAgent = react.useCallback(async (agentId, updates) => {
        if (!agentService) {
            setError('Agent service not available');
            return false;
        }
        setLoading(prev => ({ ...prev, update: true }));
        setError(null);
        try {
            const updatedAgent = await agentService.updateAgent(agentId, updates);
            // Update local state
            setAgents(prev => prev.map(a => a.id === agentId ? updatedAgent : a));
            // Update current agent if it's the one being updated
            if (currentAgent?.id === agentId) {
                setCurrentAgent(updatedAgent);
            }
            return true;
        }
        catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to update agent';
            setError(errorMessage);
            return false;
        }
        finally {
            setLoading(prev => ({ ...prev, update: false }));
        }
    }, [agentService, currentAgent]);
    /**
     * Delete agent
     */
    const deleteAgent = react.useCallback(async (agentId) => {
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
        }
        catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to delete agent';
            setError(errorMessage);
            return false;
        }
    }, [agentService, currentAgent]);
    /**
     * Refresh data
     */
    const refresh = react.useCallback(async () => {
        await fetchAgents();
    }, [fetchAgents]);
    // Auto-fetch on mount and when connected
    react.useEffect(() => {
        if (autoFetch && connected && agentService) {
            fetchAgents();
        }
    }, [autoFetch, connected, agentService, fetchAgents]);
    // Set up polling
    react.useEffect(() => {
        if (!connected || !agentService || pollingInterval <= 0)
            return;
        const interval = setInterval(() => {
            fetchAgents();
        }, pollingInterval);
        return () => clearInterval(interval);
    }, [connected, agentService, pollingInterval, fetchAgents]);
    // Set up real-time updates
    react.useEffect(() => {
        if (!realTimeUpdates || !agentService || !connected)
            return;
        // Set up WebSocket or polling for real-time updates
        // This would depend on the SDK implementation
        const unsubscribe = agentService.onAgentUpdate?.((updatedAgent) => {
            setAgents(prev => prev.map(a => a.id === updatedAgent.id ? updatedAgent : a));
            // Use callback ref to avoid stale closure
            setCurrentAgent(prev => prev?.id === updatedAgent.id ? updatedAgent : prev);
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

function AgentCard({ agent, detailed = false, showActions = true, actions, onClick, onMessage, onHire, className = '', style }) {
    const handleCardClick = () => {
        onClick?.(agent);
    };
    const handleMessage = (e) => {
        e.stopPropagation();
        onMessage?.(agent);
    };
    const handleHire = (e) => {
        e.stopPropagation();
        onHire?.(agent);
    };
    return (jsxRuntime.jsxs("div", { className: `ghostspeak-agent-card ${className}`, style: {
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            padding: '16px',
            backgroundColor: '#ffffff',
            cursor: onClick ? 'pointer' : 'default',
            transition: 'box-shadow 0.2s ease-in-out',
            ...style
        }, onClick: handleCardClick, onMouseEnter: (e) => {
            if (onClick) {
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.1)';
            }
        }, onMouseLeave: (e) => {
            if (onClick) {
                e.currentTarget.style.boxShadow = 'none';
            }
        }, children: [jsxRuntime.jsxs("div", { className: "agent-header", style: {
                    display: 'flex',
                    alignItems: 'center',
                    marginBottom: '12px'
                }, children: [jsxRuntime.jsx("div", { className: "agent-avatar", style: {
                            width: '48px',
                            height: '48px',
                            borderRadius: '24px',
                            backgroundColor: agent.verified ? '#10b981' : '#6b7280',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'white',
                            fontWeight: 'bold',
                            fontSize: '18px',
                            marginRight: '12px'
                        }, children: agent.name.charAt(0).toUpperCase() }), jsxRuntime.jsxs("div", { style: { flex: 1 }, children: [jsxRuntime.jsxs("div", { style: {
                                    fontSize: '18px',
                                    fontWeight: 'bold',
                                    marginBottom: '4px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px'
                                }, children: [agent.name, agent.verified && (jsxRuntime.jsx("span", { style: {
                                            backgroundColor: '#10b981',
                                            color: 'white',
                                            fontSize: '12px',
                                            padding: '2px 6px',
                                            borderRadius: '4px',
                                            fontWeight: 'normal'
                                        }, children: "Verified" })), jsxRuntime.jsx(StatusIndicator, { status: agent.status })] }), jsxRuntime.jsx("div", { style: {
                                    fontSize: '14px',
                                    color: '#6b7280',
                                    textTransform: 'capitalize'
                                }, children: agent.type })] }), jsxRuntime.jsxs("div", { style: { textAlign: 'right' }, children: [jsxRuntime.jsx("div", { style: { fontSize: '14px', color: '#6b7280' }, children: "Reputation" }), jsxRuntime.jsx("div", { style: {
                                    fontSize: '18px',
                                    fontWeight: 'bold',
                                    color: agent.reputationScore >= 8 ? '#10b981' :
                                        agent.reputationScore >= 6 ? '#f59e0b' : '#ef4444'
                                }, children: agent.reputationScore.toFixed(1) })] })] }), agent.description && (jsxRuntime.jsx("div", { style: {
                    fontSize: '14px',
                    color: '#374151',
                    marginBottom: '12px',
                    lineHeight: '1.5'
                }, children: detailed ? agent.description :
                    agent.description.length > 100 ?
                        `${agent.description.substring(0, 100)}...` :
                        agent.description })), agent.capabilities && agent.capabilities.length > 0 && (jsxRuntime.jsxs("div", { style: { marginBottom: '12px' }, children: [jsxRuntime.jsx("div", { style: {
                            fontSize: '12px',
                            color: '#6b7280',
                            marginBottom: '6px'
                        }, children: "Capabilities" }), jsxRuntime.jsxs("div", { style: { display: 'flex', flexWrap: 'wrap', gap: '4px' }, children: [agent.capabilities.slice(0, detailed ? undefined : 3).map((capability, index) => (jsxRuntime.jsx("span", { style: {
                                    backgroundColor: '#f3f4f6',
                                    color: '#374151',
                                    fontSize: '12px',
                                    padding: '2px 8px',
                                    borderRadius: '12px',
                                    border: '1px solid #e5e7eb'
                                }, children: capability }, index))), !detailed && agent.capabilities.length > 3 && (jsxRuntime.jsxs("span", { style: { fontSize: '12px', color: '#6b7280' }, children: ["+", agent.capabilities.length - 3, " more"] }))] })] })), detailed && (jsxRuntime.jsxs("div", { style: { marginBottom: '12px' }, children: [jsxRuntime.jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }, children: [jsxRuntime.jsxs("span", { style: { fontSize: '14px', color: '#6b7280' }, children: ["Total Jobs: ", agent.totalJobs || 0] }), jsxRuntime.jsxs("span", { style: { fontSize: '14px', color: '#6b7280' }, children: ["Success Rate: ", agent.totalJobs && agent.totalJobs > 0
                                        ? ((agent.successfulJobs || 0) / agent.totalJobs * 100).toFixed(1)
                                        : 'N/A', "%"] })] }), jsxRuntime.jsxs("div", { style: { display: 'flex', justifyContent: 'space-between' }, children: [jsxRuntime.jsxs("span", { style: { fontSize: '14px', color: '#6b7280' }, children: ["Created: ", new Date(agent.createdAt).toLocaleDateString()] }), jsxRuntime.jsxs("span", { style: { fontSize: '14px', color: '#6b7280' }, children: ["Last Active: ", new Date(agent.lastActiveAt).toLocaleDateString()] })] })] })), (showActions || actions) && (jsxRuntime.jsx("div", { style: {
                    display: 'flex',
                    gap: '8px',
                    justifyContent: 'flex-end',
                    borderTop: '1px solid #f3f4f6',
                    paddingTop: '12px',
                    marginTop: '12px'
                }, children: actions ? (actions) : (jsxRuntime.jsxs(jsxRuntime.Fragment, { children: [onMessage && (jsxRuntime.jsx("button", { onClick: handleMessage, style: {
                                backgroundColor: '#f3f4f6',
                                border: '1px solid #d1d5db',
                                borderRadius: '6px',
                                padding: '6px 12px',
                                fontSize: '14px',
                                cursor: 'pointer',
                                color: '#374151'
                            }, children: "Message" })), onHire && (jsxRuntime.jsx("button", { onClick: handleHire, style: {
                                backgroundColor: '#3b82f6',
                                border: 'none',
                                borderRadius: '6px',
                                padding: '6px 12px',
                                fontSize: '14px',
                                cursor: 'pointer',
                                color: 'white'
                            }, children: "Hire" }))] })) }))] }));
}
/**
 * Status Indicator Component
 */
function StatusIndicator({ status }) {
    const getStatusColor = (status) => {
        switch (status.toLowerCase()) {
            case 'active':
            case 'online':
                return '#10b981';
            case 'busy':
                return '#f59e0b';
            case 'offline':
            case 'inactive':
                return '#ef4444';
            default:
                return '#6b7280';
        }
    };
    return (jsxRuntime.jsx("div", { style: {
            width: '8px',
            height: '8px',
            borderRadius: '4px',
            backgroundColor: getStatusColor(status),
            display: 'inline-block'
        }, title: status }));
}

exports.AgentCard = AgentCard;
exports.GhostSpeakProvider = GhostSpeakProvider;
exports.useAgent = useAgent;
exports.useGhostSpeak = useGhostSpeak;
exports.useGhostSpeakContext = useGhostSpeakContext;
