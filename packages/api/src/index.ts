/**
 * GhostSpeak Public REST API
 *
 * Universal Agent Identity & Reputation Lookup
 * Free tier: 100 requests/minute per IP (inspired by ZAuth model)
 */

import { GhostService } from './services/ghost-service';
import { RateLimiter, getClientIdentifier, createRateLimitResponse } from './middleware/rate-limiter';
import { createGhostRoutes } from './routes/ghosts';
import { createHealthRoutes } from './routes/health';
import { createConvexClient } from '@ghostspeak/shared';

// Configuration
const PORT = process.env.PORT || 3001;
const SOLANA_RPC_URL = process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com';
const CONVEX_URL = process.env.CONVEX_URL;
if (!CONVEX_URL) {
  throw new Error('CONVEX_URL environment variable is required');
}
const RATE_LIMIT = parseInt(process.env.RATE_LIMIT || '100', 10);
const RATE_WINDOW_MS = parseInt(process.env.RATE_WINDOW_MS || '60000', 10);

// Initialize services
const ghostService = new GhostService(SOLANA_RPC_URL);
const rateLimiter = new RateLimiter(RATE_LIMIT, RATE_WINDOW_MS);
const convexClient = createConvexClient(CONVEX_URL);

// Create route handlers
const ghostRoutes = createGhostRoutes(ghostService);
const healthRoutes = createHealthRoutes(ghostService, rateLimiter, convexClient);

/**
 * Main HTTP server
 */
const server = Bun.serve({
  port: PORT,
  development: process.env.NODE_ENV !== 'production',

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const pathname = url.pathname;

    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
      });
    }

    // Rate limiting (skip for health check)
    if (pathname !== '/health') {
      const clientId = getClientIdentifier(request);
      const rateLimit = rateLimiter.check(clientId);

      if (!rateLimit.allowed) {
        return createRateLimitResponse(rateLimit.resetAt);
      }

      // Add rate limit headers to all responses
      // (This will be overridden by route responses, so we'll add it at the end)
    }

    // Route handling
    try {
      // Health & Stats
      if (pathname === '/health') {
        return await healthRoutes.getHealth();
      }

      if (pathname === '/stats') {
        return await healthRoutes.getStats();
      }

      // Ghost routes
      const ghostMatch = pathname.match(/^\/ghosts\/([^/]+)$/);
      if (ghostMatch && request.method === 'GET') {
        const address = ghostMatch[1];
        return await ghostRoutes.getGhost(address);
      }

      const scoreMatch = pathname.match(/^\/ghosts\/([^/]+)\/score$/);
      if (scoreMatch && request.method === 'GET') {
        const address = scoreMatch[1];
        return await ghostRoutes.getGhostScore(address);
      }

      const reputationMatch = pathname.match(/^\/ghosts\/([^/]+)\/reputation$/);
      if (reputationMatch && request.method === 'GET') {
        const address = reputationMatch[1];
        return await ghostRoutes.getGhostReputation(address);
      }

      const externalIdMatch = pathname.match(/^\/ghosts\/external\/([^/]+)\/(.+)$/);
      if (externalIdMatch && request.method === 'GET') {
        const platform = externalIdMatch[1];
        const externalId = externalIdMatch[2];
        return await ghostRoutes.getGhostByExternalId(platform, externalId);
      }

      // API documentation (root)
      if (pathname === '/' || pathname === '') {
        return new Response(
          JSON.stringify({
            name: 'GhostSpeak Public API',
            version: '0.1.0',
            description: 'Universal Agent Identity & Reputation Lookup for AI Agents on Solana',
            network: process.env.SOLANA_NETWORK || 'devnet',
            rateLimit: {
              limit: RATE_LIMIT,
              window: `${RATE_WINDOW_MS / 1000}s`,
            },
            endpoints: {
              health: 'GET /health',
              stats: 'GET /stats',
              getGhost: 'GET /ghosts/:address',
              getGhostScore: 'GET /ghosts/:address/score',
              getGhostReputation: 'GET /ghosts/:address/reputation',
              getGhostByExternalId: 'GET /ghosts/external/:platform/:id',
            },
            examples: {
              getGhost: '/ghosts/4wHjA2a5YC4twZb4NQpwZpixo5FgxxzuJUrCG7UnF9pB',
              getGhostByExternalId: '/ghosts/external/payai/agent-123',
            },
            docs: 'https://docs.ghostspeak.ai/api',
            source: 'https://github.com/ghostspeak-ai/ghostspeak',
          }),
          {
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*',
            },
          }
        );
      }

      // 404 Not Found
      return new Response(
        JSON.stringify({
          error: 'Not Found',
          message: `Route not found: ${pathname}`,
          code: 'ROUTE_NOT_FOUND',
        }),
        {
          status: 404,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    } catch (error) {
      console.error('Unhandled error:', error);
      return new Response(
        JSON.stringify({
          error: 'Internal Server Error',
          message: 'An unexpected error occurred',
          details: error instanceof Error ? error.message : 'Unknown error',
        }),
        {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    }
  },
});

console.log(`
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║   👻 GhostSpeak Public API                                ║
║                                                            ║
║   Universal Agent Identity & Reputation Layer             ║
║   Network: ${(process.env.SOLANA_NETWORK || 'devnet').padEnd(45)}║
║   Port: ${PORT.toString().padEnd(48)}║
║   Rate Limit: ${RATE_LIMIT}/min${' '.repeat(42)}║
║                                                            ║
║   Endpoints:                                               ║
║   • GET /health                                            ║
║   • GET /stats                                             ║
║   • GET /ghosts/:address                                   ║
║   • GET /ghosts/:address/score                             ║
║   • GET /ghosts/:address/reputation                        ║
║   • GET /ghosts/external/:platform/:id                     ║
║                                                            ║
║   Ready at http://localhost:${PORT}${' '.repeat(31 - PORT.toString().length)}║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
`);

export { ghostService, rateLimiter };
