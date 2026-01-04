/**
 * Health & Stats Routes
 *
 * GET /health - Health check
 * GET /stats - API statistics
 */

import type { GhostService } from '../services/ghost-service';
import type { RateLimiter } from '../middleware/rate-limiter';
import type { HealthResponse, StatsResponse } from '../types';
import type { GhostSpeakConvexClient } from '../utils/convex';

const startTime = Date.now();
const VERSION = '0.1.0';

export function createHealthRoutes(
  ghostService: GhostService,
  rateLimiter: RateLimiter,
  convexClient: GhostSpeakConvexClient
) {
  return {
    /**
     * GET /health
     */
    async getHealth(): Promise<Response> {
      const rpcHealth = await ghostService.checkHealth();

      const health: HealthResponse = {
        status: rpcHealth.connected ? 'healthy' : 'degraded',
        version: VERSION,
        network: process.env.SOLANA_NETWORK || 'devnet',
        rpc: rpcHealth,
        uptime: Date.now() - startTime,
        timestamp: Date.now(),
      };

      return jsonResponse(health);
    },

    /**
     * GET /stats
     */
    async getStats(): Promise<Response> {
      const rateLimitStats = rateLimiter.getStats();

      // Get discovery stats from Convex
      const discoveryStats = await convexClient.getDiscoveryStats();

      const stats: StatsResponse = {
        totalGhosts: discoveryStats.total,
        claimedGhosts: discoveryStats.totalClaimed,
        verifiedGhosts: discoveryStats.totalVerified,
        totalPlatforms: 0, // TODO: Count unique platforms when we add external ID mapping
        totalExternalIds: 0, // TODO: Count ExternalIdMapping PDAs
        averageGhostScore: 0, // TODO: Calculate average from Convex ghost scores
        topSources: [], // TODO: Most common reputation sources
      };

      return jsonResponse({
        ...stats,
        api: {
          version: VERSION,
          uptime: Date.now() - startTime,
          rateLimit: {
            trackedClients: rateLimitStats.totalTracked,
            totalRequests: rateLimitStats.totalRequests,
          },
        },
      });
    },
  };
}

/**
 * Helper to create JSON responses
 */
function jsonResponse<T = unknown>(data: T, status: number = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
