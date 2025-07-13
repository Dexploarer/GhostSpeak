/**
 * Next.js API Route Example
 * 
 * This example shows how to use GhostSpeak API handlers
 * in Next.js API routes.
 */

import { createAgentHandler, withAuth, withRateLimit } from '@ghostspeak/nextjs/api';

// Configuration for GhostSpeak API
const config = {
  network: process.env.GHOSTSPEAK_NETWORK || 'devnet',
  rpcUrl: process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com',
  programIds: {
    marketplace: process.env.MARKETPLACE_PROGRAM_ID
  }
};

// Create the base handler
const agentHandler = createAgentHandler(config);

// Apply middleware
const protectedHandler = withAuth(agentHandler);
const rateLimitedHandler = withRateLimit({
  maxRequests: 100,
  windowMs: 15 * 60 * 1000 // 15 minutes
})(protectedHandler);

export default rateLimitedHandler;