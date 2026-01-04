/**
 * Ghost Routes
 *
 * GET /ghosts/:address - Get Ghost by Solana address
 * GET /ghosts/:address/score - Get Ghost Score
 * GET /ghosts/:address/reputation - Get detailed reputation breakdown
 * GET /ghosts/external/:platform/:id - Get Ghost by external ID
 */

import type { GhostService } from '../services/ghost-service';
import type { ApiError } from '../types';

export function createGhostRoutes(ghostService: GhostService) {
  return {
    /**
     * GET /ghosts/:address
     */
    async getGhost(address: string): Promise<Response> {
      try {
        const ghost = await ghostService.getGhost(address);

        if (!ghost) {
          return jsonResponse<ApiError>(
            {
              error: 'Not Found',
              message: `Ghost not found: ${address}`,
              code: 'GHOST_NOT_FOUND',
            },
            404
          );
        }

        return jsonResponse(ghost);
      } catch (error) {
        console.error('Error in getGhost:', error);
        return jsonResponse<ApiError>(
          {
            error: 'Internal Server Error',
            message: 'Failed to fetch Ghost',
            details: error instanceof Error ? error.message : 'Unknown error',
          },
          500
        );
      }
    },

    /**
     * GET /ghosts/:address/score
     */
    async getGhostScore(address: string): Promise<Response> {
      try {
        const score = await ghostService.getGhostScore(address);

        if (!score) {
          return jsonResponse<ApiError>(
            {
              error: 'Not Found',
              message: `Ghost not found: ${address}`,
              code: 'GHOST_NOT_FOUND',
            },
            404
          );
        }

        return jsonResponse(score);
      } catch (error) {
        console.error('Error in getGhostScore:', error);
        return jsonResponse<ApiError>(
          {
            error: 'Internal Server Error',
            message: 'Failed to fetch Ghost Score',
            details: error instanceof Error ? error.message : 'Unknown error',
          },
          500
        );
      }
    },

    /**
     * GET /ghosts/:address/reputation
     */
    async getGhostReputation(address: string): Promise<Response> {
      try {
        const reputation = await ghostService.getGhostReputation(address);

        if (!reputation) {
          return jsonResponse<ApiError>(
            {
              error: 'Not Found',
              message: `Ghost not found: ${address}`,
              code: 'GHOST_NOT_FOUND',
            },
            404
          );
        }

        return jsonResponse(reputation);
      } catch (error) {
        console.error('Error in getGhostReputation:', error);
        return jsonResponse<ApiError>(
          {
            error: 'Internal Server Error',
            message: 'Failed to fetch reputation',
            details: error instanceof Error ? error.message : 'Unknown error',
          },
          500
        );
      }
    },

    /**
     * GET /ghosts/external/:platform/:id
     */
    async getGhostByExternalId(platform: string, externalId: string): Promise<Response> {
      try {
        const result = await ghostService.getGhostByExternalId(platform, externalId);

        if (!result) {
          return jsonResponse<ApiError>(
            {
              error: 'Not Found',
              message: `No Ghost found for ${platform}:${externalId}`,
              code: 'EXTERNAL_ID_NOT_FOUND',
            },
            404
          );
        }

        // Also fetch the full Ghost data
        const ghost = await ghostService.getGhost(result.ghostAddress);

        return jsonResponse({
          mapping: result,
          ghost,
        });
      } catch (error) {
        console.error('Error in getGhostByExternalId:', error);
        return jsonResponse<ApiError>(
          {
            error: 'Internal Server Error',
            message: 'Failed to fetch external ID mapping',
            details: error instanceof Error ? error.message : 'Unknown error',
          },
          500
        );
      }
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
