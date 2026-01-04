/**
 * Shared Convex Client
 *
 * Provides a typed Convex client for querying GhostSpeak data
 */

import { ConvexHttpClient } from 'convex/browser';
import type { DiscoveredAgent } from '../types';

export class GhostSpeakConvexClient {
  private client: ConvexHttpClient;

  constructor(convexUrl: string) {
    this.client = new ConvexHttpClient(convexUrl);
  }

  /**
   * List discovered agents
   */
  async listDiscoveredAgents(params: {
    limit?: number;
    status?: 'discovered' | 'claimed' | 'verified';
  } = {}): Promise<DiscoveredAgent[]> {
    return await this.client.query('ghostDiscovery:listDiscoveredAgents' as any, params) as DiscoveredAgent[];
  }

  /**
   * Get a specific discovered agent by address
   */
  async getDiscoveredAgent(ghostAddress: string): Promise<DiscoveredAgent | null> {
    return await this.client.query('ghostDiscovery:getDiscoveredAgent' as any, { ghostAddress }) as DiscoveredAgent | null;
  }

  /**
   * Get discovery stats
   */
  async getDiscoveryStats(): Promise<{
    total: number;
    totalDiscovered: number;
    totalClaimed: number;
    totalVerified: number;
  }> {
    return await this.client.query('ghostDiscovery:getDiscoveryStats' as any, {}) as any;
  }

  /**
   * Resolve external ID to ghost address
   */
  async resolveExternalId(platform: string, externalId: string): Promise<{
    ghostAddress: string;
    verified: boolean;
  } | null> {
    return await this.client.query('ghostDiscovery:resolveExternalId' as any, {
      platform,
      externalId,
    }) as any;
  }

  /**
   * Get external ID mappings for a ghost
   */
  async getExternalIdMappings(ghostAddress: string): Promise<Array<{
    platform: string;
    externalId: string;
    verified: boolean;
    createdAt: number;
  }>> {
    return await this.client.query('ghostDiscovery:getExternalIdMappings' as any, {
      ghostAddress,
    }) as any;
  }

  /**
   * Calculate ghost score for an agent
   */
  async calculateGhostScore(ghostAddress: string): Promise<{
    score: number;
    components: Array<{
      source: string;
      score: number;
      weight: number;
    }>;
  }> {
    return await this.client.query('ghostScoreCalculator:calculateAgentScore' as any, {
      ghostAddress,
    }) as any;
  }
}

/**
 * Create a Convex client instance
 */
export function createConvexClient(convexUrl: string): GhostSpeakConvexClient {
  return new GhostSpeakConvexClient(convexUrl);
}
