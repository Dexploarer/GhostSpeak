/**
 * GhostService - Solana RPC Interaction Layer
 *
 * Fetches Ghost data from the GhostSpeak program on Solana
 */

import { createSolanaRpc, type Rpc } from '@solana/rpc';
import { address, type Address } from '@solana/addresses';
import {
  agentCodec,
  externalIdMappingCodec,
  type BorshExternalIdMapping,
  type BorshExternalIdentifier,
  type BorshReputationComponent,
  BorshAgentStatus,
  ReputationSourceType,
  deriveExternalIdMappingAddress,
} from '../utils/solana';
import type {
  Ghost,
  GhostScore,
  GhostReputation,
  ExternalIdLookupResult,
  AgentStatus,
} from '../types';

export class GhostService {
  private rpc: Rpc<any>;

  constructor(rpcUrl: string) {
    this.rpc = createSolanaRpc(rpcUrl);
  }

  /**
   * Get Ghost by Solana address
   */
  async getGhost(ghostAddress: string): Promise<Ghost | null> {
    try {
      const addr = address(ghostAddress);
      const accountInfo: { value: { data: [string, string] } | null } = await (this.rpc as any)
        .getAccountInfo(addr, { encoding: 'base64' })
        .send();

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
      const mappingAddress = await deriveExternalIdMappingAddress(platform, externalId);
      const accountInfo: { value: { data: [string, string] } | null } = await (this.rpc as any)
        .getAccountInfo(mappingAddress, { encoding: 'base64' })
        .send();

      if (!accountInfo.value) {
        return null;
      }

      const data = Buffer.from(accountInfo.value.data[0], 'base64');
      const mapping = this.decodeExternalIdMapping(data);

      // Fetch the full Ghost data
      const ghost = await this.getGhost(mapping.ghostPubkey);

      if (!ghost) {
        return null;
      }

      return {
        platform: mapping.platform,
        externalId: mapping.externalId,
        ghostAddress: mapping.ghostPubkey,
        verified: mapping.verified,
        verifiedAt: mapping.verifiedAt ? Number(mapping.verifiedAt) : null,
        createdAt: Number(mapping.createdAt),
      };
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
      maxScore: 10000,
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
      await (this.rpc as any).getHealth().send();
      const latency = Date.now() - startTime;
      return { connected: true, latency };
    } catch (error) {
      return { connected: false, latency: -1 };
    }
  }

  /**
   * Decode Agent account data from Borsh serialization
   */
  private decodeAgentAccount(data: Buffer, ghostAddress: string): Ghost {
    // Skip 8-byte discriminator
    const accountData = data.subarray(8);

    // Decode using Solana v5 codecs
    const agent = agentCodec.decode(new Uint8Array(accountData));

    // Helper to unwrap Option
    const unwrapOption = (opt: any): any => {
      if (!opt || (typeof opt === 'object' && opt.__option === 'None')) {
        return null;
      }
      if (typeof opt === 'object' && opt.__option === 'Some') {
        return opt.value;
      }
      return opt;
    };

    // Map ReputationSourceType enum to string
    const reputationSourceTypeToString = (type: number): string => {
      const mapping: Record<number, string> = {
        [ReputationSourceType.AccountAge]: 'AccountAge',
        [ReputationSourceType.X402Transactions]: 'X402Transactions',
        [ReputationSourceType.UserReviews]: 'UserReviews',
        [ReputationSourceType.ElizaOSReputation]: 'ElizaOSReputation',
        [ReputationSourceType.CrossmintVerification]: 'CrossmintVerification',
        [ReputationSourceType.EndpointReliability]: 'EndpointReliability',
        [ReputationSourceType.JobCompletions]: 'JobCompletions',
        [ReputationSourceType.SkillEndorsements]: 'SkillEndorsements',
      };
      return mapping[type] || 'Unknown';
    };

    // Map AgentStatus enum to string
    const statusToString = (status: number): AgentStatus => {
      const mapping: Record<number, AgentStatus> = {
        [BorshAgentStatus.Unregistered]: 'Unregistered' as AgentStatus,
        [BorshAgentStatus.Registered]: 'Registered' as AgentStatus,
        [BorshAgentStatus.Claimed]: 'Claimed' as AgentStatus,
        [BorshAgentStatus.Verified]: 'Verified' as AgentStatus,
      };
      return mapping[status] || 'Unregistered';
    };

    const owner = unwrapOption(agent.owner);
    const claimedAt = unwrapOption(agent.claimedAt);
    const didAddress = unwrapOption(agent.didAddress);

    return {
      address: ghostAddress,
      owner: owner || null,
      status: statusToString(agent.status),

      // Discovery provenance
      firstTxSignature: agent.firstTxSignature,
      firstSeenTimestamp: Number(agent.firstSeenTimestamp),
      discoverySource: agent.discoverySource,
      claimedAt: claimedAt ? Number(claimedAt) : null,

      // Metadata
      agentId: agent.agentId,
      name: agent.name,
      description: agent.description,
      metadataUri: agent.metadataUri,
      serviceEndpoint: agent.serviceEndpoint,

      // Cross-platform identity
      externalIdentifiers: agent.externalIdentifiers.map((ext: BorshExternalIdentifier) => ({
        platform: ext.platform,
        externalId: ext.externalId,
        verified: ext.verified,
        verifiedAt: Number(ext.verifiedAt),
      })),

      // Reputation
      ghostScore: Number(agent.ghostScore),
      reputationScore: agent.reputationScore,
      reputationComponents: agent.reputationComponents.map((comp: BorshReputationComponent) => ({
        source: reputationSourceTypeToString(comp.sourceType),
        score: Number(comp.score),
        weight: comp.weight,
        lastUpdated: Number(comp.lastUpdated),
      })),

      // Credentials
      didAddress: didAddress || null,
      credentials: agent.credentials as string[],

      // Status
      isActive: agent.isActive,
      isVerified: agent.isVerified,
      verificationTimestamp: Number(agent.verificationTimestamp),

      // Timestamps
      createdAt: Number(agent.createdAt),
      updatedAt: Number(agent.updatedAt),
    };
  }

  /**
   * Decode ExternalIdMapping account data
   */
  private decodeExternalIdMapping(data: Buffer): BorshExternalIdMapping {
    // Skip 8-byte discriminator
    const accountData = data.subarray(8);

    // Decode using Solana v5 codecs
    return externalIdMappingCodec.decode(new Uint8Array(accountData)) as BorshExternalIdMapping;
  }
}
