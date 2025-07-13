'use strict';

var sdk = require('@ghostspeak/sdk');

/**
 * GhostSpeak Next.js API Route Handlers
 *
 * Pre-built API route handlers for common GhostSpeak operations
 * that can be used in Next.js API routes.
 */
/**
 * Create a server-side GhostSpeak client
 */
function createServerClient(config) {
    return new sdk.GhostSpeakClient({
        network: config.network,
        rpcUrl: config.rpcUrl,
        serverMode: true,
        keypair: config.serverKeypair,
        programIds: config.programIds
    });
}
/**
 * Agent management API handler
 */
function createAgentHandler(config) {
    return async (req, res) => {
        try {
            const client = createServerClient(config);
            const agentService = new sdk.AgentService(client);
            switch (req.method) {
                case 'GET':
                    if (req.query.id) {
                        // Get specific agent
                        const agent = await agentService.getAgent(req.query.id);
                        return res.status(200).json(agent);
                    }
                    else {
                        // List agents
                        const agents = await agentService.listAgents({
                            limit: parseInt(req.query.limit) || 20,
                            offset: parseInt(req.query.offset) || 0,
                            category: req.query.category,
                            verified: req.query.verified === 'true'
                        });
                        return res.status(200).json(agents);
                    }
                case 'POST':
                    // Create agent (requires authentication)
                    const createParams = req.body;
                    const newAgent = await agentService.createAgent(createParams);
                    return res.status(201).json(newAgent);
                case 'PUT':
                    // Update agent
                    const agentId = req.query.id;
                    const updates = req.body;
                    const updatedAgent = await agentService.updateAgent(agentId, updates);
                    return res.status(200).json(updatedAgent);
                case 'DELETE':
                    // Delete agent
                    const deleteId = req.query.id;
                    await agentService.deleteAgent(deleteId);
                    return res.status(204).end();
                default:
                    res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
                    return res.status(405).json({ error: 'Method not allowed' });
            }
        }
        catch (error) {
            console.error('Agent API error:', error);
            return res.status(500).json({
                error: 'Internal server error',
                message: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    };
}
/**
 * Message API handler
 */
function createMessageHandler(config) {
    return async (req, res) => {
        try {
            const client = createServerClient(config);
            const messageService = new sdk.MessageService(client);
            switch (req.method) {
                case 'GET':
                    // Get messages for a channel or conversation
                    const messages = await messageService.getMessages({
                        channelId: req.query.channelId,
                        agentId: req.query.agentId,
                        limit: parseInt(req.query.limit) || 50,
                        before: req.query.before
                    });
                    return res.status(200).json(messages);
                case 'POST':
                    // Send message
                    const messageParams = req.body;
                    const newMessage = await messageService.sendMessage(messageParams);
                    return res.status(201).json(newMessage);
                default:
                    res.setHeader('Allow', ['GET', 'POST']);
                    return res.status(405).json({ error: 'Method not allowed' });
            }
        }
        catch (error) {
            console.error('Message API error:', error);
            return res.status(500).json({
                error: 'Internal server error',
                message: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    };
}
/**
 * Escrow API handler
 */
function createEscrowHandler(config) {
    return async (req, res) => {
        try {
            const client = createServerClient(config);
            const escrowService = new sdk.EscrowService(client);
            switch (req.method) {
                case 'GET':
                    if (req.query.id) {
                        // Get specific escrow
                        const escrow = await escrowService.getEscrow(req.query.id);
                        return res.status(200).json(escrow);
                    }
                    else {
                        // List escrows for user
                        const escrows = await escrowService.getUserEscrows(req.query.userId);
                        return res.status(200).json(escrows);
                    }
                case 'POST':
                    // Create escrow
                    const escrowParams = req.body;
                    const newEscrow = await escrowService.createEscrow(escrowParams);
                    return res.status(201).json(newEscrow);
                case 'PUT':
                    // Update escrow status
                    const escrowId = req.query.id;
                    const action = req.body.action; // 'release', 'cancel', 'dispute'
                    let result;
                    switch (action) {
                        case 'release':
                            result = await escrowService.releaseEscrow(escrowId);
                            break;
                        case 'cancel':
                            result = await escrowService.cancelEscrow(escrowId);
                            break;
                        case 'dispute':
                            result = await escrowService.raiseDispute(escrowId, req.body.reason);
                            break;
                        default:
                            return res.status(400).json({ error: 'Invalid action' });
                    }
                    return res.status(200).json(result);
                default:
                    res.setHeader('Allow', ['GET', 'POST', 'PUT']);
                    return res.status(405).json({ error: 'Method not allowed' });
            }
        }
        catch (error) {
            console.error('Escrow API error:', error);
            return res.status(500).json({
                error: 'Internal server error',
                message: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    };
}
/**
 * WebSocket handler for real-time updates
 */
function createWebSocketHandler(config) {
    return async (req, res) => {
        if (req.method !== 'GET') {
            return res.status(405).json({ error: 'Method not allowed' });
        }
        // This would typically upgrade to WebSocket connection
        // For Next.js, you might use a library like socket.io or ws
        res.status(200).json({
            message: 'WebSocket endpoint',
            endpoint: '/api/ghostspeak/ws'
        });
    };
}
/**
 * Health check handler
 */
function createHealthHandler(config) {
    return async (req, res) => {
        try {
            const client = createServerClient(config);
            // Test connection
            const slot = await client.getSlot();
            return res.status(200).json({
                status: 'healthy',
                network: config.network,
                currentSlot: slot,
                timestamp: new Date().toISOString()
            });
        }
        catch (error) {
            return res.status(503).json({
                status: 'unhealthy',
                error: error instanceof Error ? error.message : 'Unknown error',
                timestamp: new Date().toISOString()
            });
        }
    };
}
/**
 * Utility function to create all handlers
 */
function createAllHandlers(config) {
    return {
        agents: createAgentHandler(config),
        messages: createMessageHandler(config),
        escrow: createEscrowHandler(config),
        websocket: createWebSocketHandler(),
        health: createHealthHandler(config)
    };
}
/**
 * Middleware for authentication
 */
function withAuth(handler) {
    return async (req, res) => {
        // Implement authentication logic
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        // Verify token (implementation depends on your auth system)
        try {
            // const token = authHeader.slice(7);
            // const user = await verifyToken(token);
            // req.user = user;
            return handler(req, res);
        }
        catch (error) {
            return res.status(401).json({ error: 'Invalid token' });
        }
    };
}
/**
 * Middleware for rate limiting
 */
function withRateLimit(config) {
    const requests = new Map();
    return (handler) => {
        return async (req, res) => {
            const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
            const now = Date.now();
            const windowStart = now - config.windowMs;
            if (!requests.has(ip)) {
                requests.set(ip, []);
            }
            const userRequests = requests.get(ip).filter((time) => time > windowStart);
            if (userRequests.length >= config.maxRequests) {
                return res.status(429).json({ error: 'Rate limit exceeded' });
            }
            userRequests.push(now);
            requests.set(ip, userRequests);
            return handler(req, res);
        };
    };
}

exports.createAgentHandler = createAgentHandler;
exports.createAllHandlers = createAllHandlers;
exports.createEscrowHandler = createEscrowHandler;
exports.createHealthHandler = createHealthHandler;
exports.createMessageHandler = createMessageHandler;
exports.createServerClient = createServerClient;
exports.createWebSocketHandler = createWebSocketHandler;
exports.withAuth = withAuth;
exports.withRateLimit = withRateLimit;
