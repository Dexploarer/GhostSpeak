/**
 * GhostService - Solana RPC Interaction Layer
 *
 * Fetches Ghost data from the GhostSpeak program on Solana
 */

import { createSolanaRpc, type Rpc } from '@solana/rpc';
import { address, type Address } from '@solana/addresses';
import type {
  Ghost,
  GhostScore,
  GhostReputation,
  ExternalIdLookupResult,
  AgentStatus,
  ExternalIdentifier,
  ReputationComponent,
} from '../types/ghost';

const PROGRAM_ID = '4wHjA2a5YC4twZb4NQpwZpixo5FgxxzuJUrCG7UnF9pB';
const AGENT_SEED = 'agent';
const EXTERNAL_ID_SEED = 'external_id';

export class GhostService {
  private rpc: Rpc;
  private programId: Address;

  constructor(rpcUrl: string) {
    this.rpc = createSolanaRpc(rpcUrl);
    this.programId = address(PROGRAM_ID);
  }

  /**
   * Get Ghost by Solana address
   */
  async getGhost(ghostAddress: string): Promise<Ghost | null> {
    try {
      const addr = address(ghostAddress);
      const accountInfo = await this.rpc.getAccountInfo(addr, { encoding: 'base64' }).send();

      if (!accountInfo.value) {
        return null;
      }

      // Decode account data
      const data = Buffer.from(accountInfo.value.data[0], 'base64');
      return this.decodeAgentAccount(data, ghostAddress);
    } catch (error) {
      console.error(`Error fetching Ghost ${ghostAddress}:`, error);
      throw error;
    }
  }

  /**
   * Get Ghost by external ID (e.g., PayAI agent-123)
   */
  async getGhostByExternalId(
    platform: string,
    externalId: string
  ): Promise<ExternalIdLookupResult | null> {
    try {
      const mappingAddress = await this.deriveExternalIdMappingAddress(platform, externalId);
      const accountInfo = await this.rpc
        .getAccountInfo(mappingAddress, { encoding: 'base64' })
        .send();

      if (!accountInfo.value) {
        return null;
      }

      const data = Buffer.from(accountInfo.value.data[0], 'base64');
      return this.decodeExternalIdMapping(data, platform, externalId);
    } catch (error) {
      console.error(`Error fetching external ID mapping ${platform}:${externalId}:`, error);
      return null;
    }
  }

  /**
   * Get Ghost Score
   */
  async getGhostScore(ghostAddress: string): Promise<GhostScore | null> {
    const ghost = await this.getGhost(ghostAddress);
    if (!ghost) {
      return null;
    }

    return {
      address: ghostAddress,
      score: ghost.ghostScore,
      maxScore: 1000,
      components: ghost.reputationComponents,
      lastUpdated: ghost.updatedAt,
    };
  }

  /**
   * Get detailed reputation breakdown
   */
  async getGhostReputation(ghostAddress: string): Promise<GhostReputation | null> {
    const ghost = await this.getGhost(ghostAddress);
    if (!ghost) {
      return null;
    }

    // Convert components to sources object
    const sources: GhostReputation['sources'] = {};
    for (const component of ghost.reputationComponents) {
      sources[component.source] = {
        score: component.score,
        weight: component.weight,
        dataPoints: 0, // TODO: Add dataPoints to ReputationComponent
        reliability: 10000, // Default 100%
        lastUpdated: component.lastUpdated,
      };
    }

    return {
      address: ghostAddress,
      totalScore: ghost.ghostScore,
      sources,
      lastAggregation: ghost.updatedAt,
    };
  }

  /**
   * Get multiple Ghosts by addresses
   */
  async getGhostsBatch(addresses: string[]): Promise<(Ghost | null)[]> {
    const promises = addresses.map((addr) => this.getGhost(addr));
    return Promise.all(promises);
  }

  /**
   * Check RPC health
   */
  async checkHealth(): Promise<{ connected: boolean; latency: number }> {
    const startTime = Date.now();
    try {
      await this.rpc.getHealth().send();
      const latency = Date.now() - startTime;
      return { connected: true, latency };
    } catch (error) {
      return { connected: false, latency: -1 };
    }
  }

  /**
   * Derive Agent PDA address
   */
  private async deriveAgentAddress(owner: string, agentId: string): Promise<Address> {
    // TODO: Implement PDA derivation using @solana/addresses
    // This requires the program ID and seeds
    throw new Error('Not implemented - requires @solana/addresses PDA derivation');
  }

  /**
   * Derive ExternalIdMapping PDA address
   */
  private async deriveExternalIdMappingAddress(
    platform: string,
    externalId: string
  ): Promise<Address> {
    // TODO: Implement PDA derivation
    // Seeds: [b"external_id", platform.as_bytes(), external_id.as_bytes()]
    throw new Error('Not implemented - requires @solana/addresses PDA derivation');
  }

  /**
   * Decode Agent account data from Borsh serialization
   */
  private decodeAgentAccount(data: Buffer, ghostAddress: string): Ghost {
    // TODO: Implement full Borsh deserialization
    // For now, return mock data structure
    // In production, use @coral-xyz/borsh or custom decoder

    // Discriminator (8 bytes) + account data
    let offset = 8;

    // Mock decoding - replace with actual Borsh deserialization
    return {
      address: ghostAddress,
      owner: null, // Parse from data
      status: AgentStatus.Unregistered,
      firstTxSignature: '',
      firstSeenTimestamp: 0,
      discoverySource: '',
      claimedAt: null,
      agentId: '',
      name: '',
      description: '',
      metadataUri: '',
      serviceEndpoint: '',
      externalIdentifiers: [],
      ghostScore: 0,
      reputationScore: 0,
      reputationComponents: [],
      didAddress: null,
      credentials: [],
      isActive: true,
      isVerified: false,
      verificationTimestamp: 0,
      createdAt: 0,
      updatedAt: 0,
    };
  }

  /**
   * Decode ExternalIdMapping account data
   */
  private decodeExternalIdMapping(
    data: Buffer,
    platform: string,
    externalId: string
  ): ExternalIdLookupResult {
    // TODO: Implement Borsh deserialization
    let offset = 8; // Skip discriminator

    return {
      platform,
      externalId,
      ghostAddress: '',
      verified: false,
      verifiedAt: null,
      createdAt: 0,
    };
  }
}
