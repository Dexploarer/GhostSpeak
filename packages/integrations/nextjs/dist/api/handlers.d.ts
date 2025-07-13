/**
 * GhostSpeak Next.js API Route Handlers
 *
 * Pre-built API route handlers for common GhostSpeak operations
 * that can be used in Next.js API routes.
 */
import { NextApiRequest, NextApiResponse } from 'next';
import { GhostSpeakClient } from '@ghostspeak/sdk';
import type { KeyPairSigner } from '@solana/signers';
export interface GhostSpeakApiConfig {
    /** Solana network */
    network: string;
    /** RPC endpoint */
    rpcUrl: string;
    /** Server keypair for signing transactions */
    serverKeypair?: KeyPairSigner;
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
export declare function createServerClient(config: GhostSpeakApiConfig): GhostSpeakClient;
/**
 * Agent management API handler
 */
export declare function createAgentHandler(config: GhostSpeakApiConfig): (req: NextApiRequest, res: NextApiResponse) => Promise<any>;
/**
 * Message API handler
 */
export declare function createMessageHandler(config: GhostSpeakApiConfig): (req: NextApiRequest, res: NextApiResponse) => Promise<any>;
/**
 * Escrow API handler
 */
export declare function createEscrowHandler(config: GhostSpeakApiConfig): (req: NextApiRequest, res: NextApiResponse) => Promise<any>;
/**
 * WebSocket handler for real-time updates
 */
export declare function createWebSocketHandler(config: GhostSpeakApiConfig): (req: NextApiRequest, res: NextApiResponse) => Promise<any>;
/**
 * Health check handler
 */
export declare function createHealthHandler(config: GhostSpeakApiConfig): (req: NextApiRequest, res: NextApiResponse) => Promise<any>;
/**
 * Utility function to create all handlers
 */
export declare function createAllHandlers(config: GhostSpeakApiConfig): {
    agents: (req: NextApiRequest, res: NextApiResponse) => Promise<any>;
    messages: (req: NextApiRequest, res: NextApiResponse) => Promise<any>;
    escrow: (req: NextApiRequest, res: NextApiResponse) => Promise<any>;
    websocket: (req: NextApiRequest, res: NextApiResponse) => Promise<any>;
    health: (req: NextApiRequest, res: NextApiResponse) => Promise<any>;
};
/**
 * Middleware for authentication
 */
export declare function withAuth(handler: (req: NextApiRequest, res: NextApiResponse) => Promise<void>): (req: NextApiRequest, res: NextApiResponse) => Promise<any>;
/**
 * Middleware for rate limiting
 */
export declare function withRateLimit(config: {
    maxRequests: number;
    windowMs: number;
}): (handler: (req: NextApiRequest, res: NextApiResponse) => Promise<void>) => (req: NextApiRequest, res: NextApiResponse) => Promise<any>;
//# sourceMappingURL=handlers.d.ts.map