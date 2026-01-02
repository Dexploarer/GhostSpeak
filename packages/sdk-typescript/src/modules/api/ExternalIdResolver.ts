/**
 * ExternalIdResolver - Cross-Platform Identity Lookup
 *
 * Resolves platform-specific IDs (PayAI, ElizaOS, etc.) to Ghost addresses
 * Uses GhostSpeak Public API for fast lookups
 */

import { address, type Address } from '@solana/addresses';
import type { GhostSpeakConfig } from '../../types/index.js';
import { GhostSpeakError } from '../../types/index.js';
import type {
  ApiGhost,
  ApiExternalIdLookup,
  ApiGhostScore,
} from '../../types/api-types.js';
import {
  ExternalIdNotFoundError,
  GhostNotFoundError,
} from '../../types/api-types.js';

const DEFAULT_API_URL = 'https://api.ghostspeak.ai';
const DEVNET_API_URL = 'https://api-devnet.ghostspeak.ai';
const LOCALNET_API_URL = 'http://localhost:3001';

export interface ApiResolverConfig {
  apiUrl?: string;
  cluster?: 'mainnet-beta' | 'devnet' | 'testnet' | 'localnet';
}

export class ExternalIdResolver {
  private apiUrl: string;

  constructor(config?: ApiResolverConfig) {
    // Determine API URL based on cluster or use provided URL
    if (config?.apiUrl) {
      this.apiUrl = config.apiUrl;
    } else {
      const cluster = config?.cluster || 'devnet';
      this.apiUrl = cluster === 'mainnet-beta' ? DEFAULT_API_URL :
                    cluster === 'localnet' ? LOCALNET_API_URL :
                    DEVNET_API_URL;
    }
  }

  /**
   * Resolve external ID to Ghost address
   *
   * @example
   * const address = await resolver.resolve('payai', 'agent-123');
   */
  async resolve(platform: string, externalId: string): Promise<Address> {
    const result = await this.lookup(platform, externalId);
    return address(result.mapping.ghostAddress);
  }

  /**
   * Lookup external ID with full Ghost data
   *
   * @example
   * const { mapping, ghost } = await resolver.lookup('payai', 'agent-123');
   */
  async lookup(platform: string, externalId: string): Promise<ApiExternalIdLookup> {
    try {
      const response = await fetch(
        `${this.apiUrl}/ghosts/external/${encodeURIComponent(platform)}/${encodeURIComponent(externalId)}`
      );

      if (response.status === 404) {
        throw new ExternalIdNotFoundError(platform, externalId);
      }

      if (!response.ok) {
        const error = await response.json().catch(() => ({})) as any;
        throw new GhostSpeakError(
          error.message || 'Failed to lookup external ID',
          error.code || 'LOOKUP_FAILED'
        );
      }

      const data = await response.json() as ApiExternalIdLookup;
      return data;
    } catch (error) {
      if (error instanceof GhostSpeakError || error instanceof ExternalIdNotFoundError) throw error;
      throw new GhostSpeakError(
        'Failed to lookup external ID',
        'LOOKUP_FAILED'
      );
    }
  }

  /**
   * Get Ghost by Solana address via API
   *
   * Faster than on-chain lookup for read operations
   */
  async getGhost(ghostAddress: Address | string): Promise<ApiGhost> {
    try {
      const addrString = typeof ghostAddress === 'string'
        ? ghostAddress
        : ghostAddress as string;

      const response = await fetch(
        `${this.apiUrl}/ghosts/${encodeURIComponent(addrString)}`
      );

      if (response.status === 404) {
        throw new GhostNotFoundError(addrString);
      }

      if (!response.ok) {
        const error = await response.json().catch(() => ({})) as any;
        throw new GhostSpeakError(
          error.message || 'Failed to fetch Ghost',
          error.code || 'FETCH_FAILED'
        );
      }

      const ghost = await response.json() as ApiGhost;
      return ghost;
    } catch (error) {
      if (error instanceof GhostSpeakError || error instanceof GhostNotFoundError) throw error;
      throw new GhostSpeakError(
        'Failed to fetch Ghost',
        'FETCH_FAILED'
      );
    }
  }

  /**
   * Get Ghost Score via API
   */
  async getGhostScore(ghostAddress: Address | string): Promise<ApiGhostScore> {
    try {
      const addrString = typeof ghostAddress === 'string'
        ? ghostAddress
        : ghostAddress as string;

      const response = await fetch(
        `${this.apiUrl}/ghosts/${encodeURIComponent(addrString)}/score`
      );

      if (response.status === 404) {
        throw new GhostNotFoundError(addrString);
      }

      if (!response.ok) {
        const error = await response.json().catch(() => ({})) as any;
        throw new GhostSpeakError(
          error.message || 'Failed to fetch Ghost Score',
          error.code || 'FETCH_FAILED'
        );
      }

      const score = await response.json() as ApiGhostScore;
      return score;
    } catch (error) {
      if (error instanceof GhostSpeakError || error instanceof GhostNotFoundError) throw error;
      throw new GhostSpeakError(
        'Failed to fetch Ghost Score',
        'FETCH_FAILED'
      );
    }
  }

  /**
   * Get detailed reputation breakdown via API
   */
  async getGhostReputation(ghostAddress: Address | string): Promise<any> {
    try {
      const addrString = typeof ghostAddress === 'string'
        ? ghostAddress
        : ghostAddress as string;

      const response = await fetch(
        `${this.apiUrl}/ghosts/${encodeURIComponent(addrString)}/reputation`
      );

      if (response.status === 404) {
        throw new GhostNotFoundError(addrString);
      }

      if (!response.ok) {
        const error = await response.json().catch(() => ({})) as any;
        throw new GhostSpeakError(
          error.message || 'Failed to fetch reputation',
          error.code || 'FETCH_FAILED'
        );
      }

      return await response.json();
    } catch (error) {
      if (error instanceof GhostSpeakError || error instanceof GhostNotFoundError) throw error;
      throw new GhostSpeakError(
        'Failed to fetch reputation',
        'FETCH_FAILED'
      );
    }
  }

  /**
   * Batch resolve multiple external IDs
   */
  async resolveBatch(
    identifiers: Array<{ platform: string; externalId: string }>
  ): Promise<Array<Address | null>> {
    const promises = identifiers.map(({ platform, externalId }) =>
      this.resolve(platform, externalId).catch(() => null)
    );
    return Promise.all(promises);
  }

  /**
   * Check if external ID exists
   */
  async exists(platform: string, externalId: string): Promise<boolean> {
    try {
      await this.resolve(platform, externalId);
      return true;
    } catch (error) {
      if (error instanceof ExternalIdNotFoundError) return false;
      throw error;
    }
  }

  /**
   * Get all external IDs for a Ghost
   *
   * Fetches Ghost data and returns external identifiers
   */
  async getExternalIds(ghostAddress: Address | string): Promise<Array<{
    platform: string;
    externalId: string;
    verified: boolean;
    verifiedAt: number;
  }>> {
    const ghost = await this.getGhost(ghostAddress);
    return ghost.externalIdentifiers;
  }

  /**
   * Search for Ghost by partial platform ID
   *
   * Note: This is a client-side filter, not server-side search
   * For production, implement server-side search endpoint
   */
  async searchByExternalId(
    platform: string,
    partialId: string
  ): Promise<ApiExternalIdLookup[]> {
    // TODO: Implement server-side search endpoint
    // For now, this is a placeholder
    throw new GhostSpeakError(
      'Search not yet implemented',
      'NOT_IMPLEMENTED'
    );
  }

  /**
   * Set custom API URL
   */
  setApiUrl(apiUrl: string): void {
    this.apiUrl = apiUrl;
  }

  /**
   * Get current API URL
   */
  getApiUrl(): string {
    return this.apiUrl;
  }

  /**
   * Check API health
   */
  async checkHealth(): Promise<{
    status: string;
    network: string;
    rpc: { connected: boolean; latency: number };
  }> {
    try {
      const response = await fetch(`${this.apiUrl}/health`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      return await response.json() as {
        status: string;
        network: string;
        rpc: { connected: boolean; latency: number };
      };
    } catch (error) {
      throw new GhostSpeakError(
        'Failed to check API health',
        'HEALTH_CHECK_FAILED'
      );
    }
  }
}
