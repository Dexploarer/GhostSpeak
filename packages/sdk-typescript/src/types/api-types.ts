/**
 * API Response Types for GhostSpeak Public API
 *
 * These types match the REST API responses from packages/api
 */

export interface ApiGhost {
  address: string;
  owner: string | null;
  status: string;
  firstTxSignature: string;
  firstSeenTimestamp: number;
  discoverySource: string;
  claimedAt: number | null;
  agentId: string;
  name: string;
  description: string;
  metadataUri: string;
  serviceEndpoint: string;
  externalIdentifiers: Array<{
    platform: string;
    externalId: string;
    verified: boolean;
    verifiedAt: number;
  }>;
  ghostScore: number;
  reputationScore: number;
  reputationComponents: Array<{
    source: string;
    score: number;
    weight: number;
    lastUpdated: number;
  }>;
  didAddress: string | null;
  credentials: string[];
  isActive: boolean;
  isVerified: boolean;
  verificationTimestamp: number;
  createdAt: number;
  updatedAt: number;
}

export interface ApiGhostScore {
  address: string;
  score: number;
  maxScore: number;
  components: Array<{
    source: string;
    score: number;
    weight: number;
    lastUpdated: number;
  }>;
  lastUpdated: number;
}

export interface ApiExternalIdLookup {
  mapping: {
    platform: string;
    externalId: string;
    ghostAddress: string;
    verified: boolean;
    verifiedAt: number | null;
    createdAt: number;
  };
  ghost: ApiGhost | null;
}

/**
 * API-specific Error Classes
 */
export class GhostNotFoundError extends Error {
  constructor(address: string) {
    super(`Ghost not found: ${address}`);
    this.name = 'GhostNotFoundError';
  }
}

export class ExternalIdNotFoundError extends Error {
  constructor(public platform: string, public externalId: string) {
    super(`No Ghost found for ${platform}:${externalId}`);
    this.name = 'ExternalIdNotFoundError';
  }
}
