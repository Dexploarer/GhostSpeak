/**
 * Health & Stats Routes
 *
 * GET /health - Health check
 * GET /stats - API statistics
 */

import type { GhostService } from '../services/ghost-service';
import type { RateLimiter } from '../middleware/rate-limiter';
import type { HealthResponse, StatsResponse } from '../types/ghost';

const startTime = Date.now();
const VERSION = '0.1.0';

export function createHealthRoutes(ghostService: GhostService, rateLimiter: RateLimiter) {
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

      // TODO: Implement actual Ghost counting via program accounts
      const stats: StatsResponse = {
        totalGhosts: 0, // Count all Agent PDAs
        claimedGhosts: 0, // Count Agents with status=Claimed|Verified
        verifiedGhosts: 0, // Count Agents with status=Verified
        totalPlatforms: 0, // Count unique platforms in ExternalIdMapping
        totalExternalIds: 0, // Count all ExternalIdMapping PDAs
        averageGhostScore: 0, // Average ghost_score field
        topSources: [], // Most common reputation sources
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
