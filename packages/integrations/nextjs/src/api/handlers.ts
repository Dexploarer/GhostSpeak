/**
 * GhostSpeak Next.js API Route Handlers
 * 
 * Pre-built API route handlers for common GhostSpeak operations
 * that can be used in Next.js API routes.
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { GhostSpeakClient, AgentService, MessageService, EscrowService } from '@ghostspeak/sdk';
import { Connection, Keypair } from '@solana/web3.js';

export interface GhostSpeakApiConfig {
  /** Solana network */
  network: string;
  /** RPC endpoint */
  rpcUrl: string;
  /** Server keypair for signing transactions */
  serverKeypair?: Keypair;
  /** Program IDs */
  programIds?: Record<string, string>;
  /** Rate limiting */
  rateLimit?: {
    maxRequests: number;
    windowMs: number;
  };
}

/**
 * Create a server-side GhostSpeak client
 */
export function createServerClient(config: GhostSpeakApiConfig): GhostSpeakClient {
  const connection = new Connection(config.rpcUrl);
  
  return new GhostSpeakClient({
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
export function createAgentHandler(config: GhostSpeakApiConfig) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    try {
      const client = createServerClient(config);
      const agentService = new AgentService(client);

      switch (req.method) {
        case 'GET':
          if (req.query.id) {
            // Get specific agent
            const agent = await agentService.getAgent(req.query.id as string);
            return res.status(200).json(agent);
          } else {
            // List agents
            const agents = await agentService.listAgents({
              limit: parseInt(req.query.limit as string) || 20,
              offset: parseInt(req.query.offset as string) || 0,
              category: req.query.category as string,
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
          const agentId = req.query.id as string;
          const updates = req.body;
          const updatedAgent = await agentService.updateAgent(agentId, updates);
          return res.status(200).json(updatedAgent);

        case 'DELETE':
          // Delete agent
          const deleteId = req.query.id as string;
          await agentService.deleteAgent(deleteId);
          return res.status(204).end();

        default:
          res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
          return res.status(405).json({ error: 'Method not allowed' });
      }
    } catch (error) {
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
export function createMessageHandler(config: GhostSpeakApiConfig) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    try {
      const client = createServerClient(config);
      const messageService = new MessageService(client);

      switch (req.method) {
        case 'GET':
          // Get messages for a channel or conversation
          const messages = await messageService.getMessages({
            channelId: req.query.channelId as string,
            agentId: req.query.agentId as string,
            limit: parseInt(req.query.limit as string) || 50,
            before: req.query.before as string
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
    } catch (error) {
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
export function createEscrowHandler(config: GhostSpeakApiConfig) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    try {
      const client = createServerClient(config);
      const escrowService = new EscrowService(client);

      switch (req.method) {
        case 'GET':
          if (req.query.id) {
            // Get specific escrow
            const escrow = await escrowService.getEscrow(req.query.id as string);
            return res.status(200).json(escrow);
          } else {
            // List escrows for user
            const escrows = await escrowService.getUserEscrows(req.query.userId as string);
            return res.status(200).json(escrows);
          }

        case 'POST':
          // Create escrow
          const escrowParams = req.body;
          const newEscrow = await escrowService.createEscrow(escrowParams);
          return res.status(201).json(newEscrow);

        case 'PUT':
          // Update escrow status
          const escrowId = req.query.id as string;
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
    } catch (error) {
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
export function createWebSocketHandler(config: GhostSpeakApiConfig) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
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
export function createHealthHandler(config: GhostSpeakApiConfig) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    try {
      const client = createServerClient(config);
      
      // Test connection
      const connection = new Connection(config.rpcUrl);
      const slot = await connection.getSlot();
      
      return res.status(200).json({
        status: 'healthy',
        network: config.network,
        currentSlot: slot,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
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
export function createAllHandlers(config: GhostSpeakApiConfig) {
  return {
    agents: createAgentHandler(config),
    messages: createMessageHandler(config),
    escrow: createEscrowHandler(config),
    websocket: createWebSocketHandler(config),
    health: createHealthHandler(config)
  };
}

/**
 * Middleware for authentication
 */
export function withAuth(handler: (req: NextApiRequest, res: NextApiResponse) => Promise<void>) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
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
    } catch (error) {
      return res.status(401).json({ error: 'Invalid token' });
    }
  };
}

/**
 * Middleware for rate limiting
 */
export function withRateLimit(config: { maxRequests: number; windowMs: number }) {
  const requests = new Map();

  return (handler: (req: NextApiRequest, res: NextApiResponse) => Promise<void>) => {
    return async (req: NextApiRequest, res: NextApiResponse) => {
      const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
      const now = Date.now();
      const windowStart = now - config.windowMs;

      if (!requests.has(ip)) {
        requests.set(ip, []);
      }

      const userRequests = requests.get(ip).filter((time: number) => time > windowStart);
      
      if (userRequests.length >= config.maxRequests) {
        return res.status(429).json({ error: 'Rate limit exceeded' });
      }

      userRequests.push(now);
      requests.set(ip, userRequests);

      return handler(req, res);
    };
  };
}