/**
 * Convex Client for GhostSpeak API
 *
 * Provides typed access to Convex backend for ghost discovery data
 */

import { ConvexHttpClient } from 'convex/browser';

export interface DiscoveredAgent {
  _id: string;
  _creationTime: number;
  ghostAddress: string;
  firstTxSignature: string;
  firstSeenTimestamp: number;
  discoverySource: string;
  facilitatorAddress: string;
  blockTime: number;
  slot: number;
  status: 'discovered' | 'claimed' | 'verified';
  claimedBy?: string;
  claimedAt?: number;
  createdAt: number;
  updatedAt: number;
}

export class GhostSpeakConvexClient {
  private client: ConvexHttpClient;

  constructor(convexUrl: string) {
    this.client = new ConvexHttpClient(convexUrl);
  }

  async listDiscoveredAgents(params: {
    limit?: number;
    status?: 'discovered' | 'claimed' | 'verified';
  } = {}): Promise<DiscoveredAgent[]> {
    return await this.client.query('ghostDiscovery:listDiscoveredAgents' as any, params) as DiscoveredAgent[];
  }

  async getDiscoveredAgent(ghostAddress: string): Promise<DiscoveredAgent | null> {
    return await this.client.query('ghostDiscovery:getDiscoveredAgent' as any, { ghostAddress }) as DiscoveredAgent | null;
  }

  async getDiscoveryStats(): Promise<{
    total: number;
    totalDiscovered: number;
    totalClaimed: number;
    totalVerified: number;
  }> {
    return await this.client.query('ghostDiscovery:getDiscoveryStats' as any, {}) as any;
  }

  async resolveExternalId(platform: string, externalId: string): Promise<{
    ghostAddress: string;
    verified: boolean;
  } | null> {
    return await this.client.query('ghostDiscovery:resolveExternalId' as any, {
      platform,
      externalId,
    }) as any;
  }

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

  async calculateGhostScore(ghostAddress: string): Promise<{
    score: number;
    components: Array<{
      source: string;
      score: number;
      weight: number;
    }>;
  }> {
    return await this.client.query('ghostScoreCalculator:calculateAgentScore' as any, {
      agentAddress: ghostAddress,
    }) as any;
  }
}

export function createConvexClient(convexUrl: string): GhostSpeakConvexClient {
  return new GhostSpeakConvexClient(convexUrl);
}
