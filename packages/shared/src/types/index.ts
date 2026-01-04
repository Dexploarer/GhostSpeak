/**
 * GhostSpeak Shared Type Definitions
 *
 * Types used across API, web app, and other packages
 */

export enum AgentStatus {
  Unregistered = 'Unregistered',
  Registered = 'Registered',
  Claimed = 'Claimed',
  Verified = 'Verified',
}

export interface ExternalIdentifier {
  platform: string;
  externalId: string;
  verified: boolean;
  verifiedAt: number;
}

export interface ReputationComponent {
  source: string;
  score: number;
  weight: number;
  lastUpdated: number;
}

export interface Ghost {
  // Core identity
  address: string;
  owner: string | null;
  status: AgentStatus;

  // Discovery provenance
  firstTxSignature: string;
  firstSeenTimestamp: number;
  discoverySource: string;
  claimedAt: number | null;

  // Metadata
  agentId: string;
  name: string;
  description: string;
  metadataUri: string;
  serviceEndpoint: string;

  // Cross-platform identity
  externalIdentifiers: ExternalIdentifier[];

  // Reputation
  ghostScore: number;
  reputationScore: number;
  reputationComponents: ReputationComponent[];

  // Credentials
  didAddress: string | null;
  credentials: string[];

  // Status
  isActive: boolean;
  isVerified: boolean;
  verificationTimestamp: number;

  // Timestamps
  createdAt: number;
  updatedAt: number;
}

export interface GhostScore {
  address: string;
  score: number;
  maxScore: number;
  components: ReputationComponent[];
  lastUpdated: number;
}

export interface GhostReputation {
  address: string;
  totalScore: number;
  sources: {
    [sourceName: string]: {
      score: number;
      weight: number;
      dataPoints: number;
      reliability: number;
      lastUpdated: number;
    };
  };
  lastAggregation: number;
}

export interface ExternalIdLookupResult {
  platform: string;
  externalId: string;
  ghostAddress: string;
  verified: boolean;
  verifiedAt: number | null;
  createdAt: number;
}

export interface ApiError {
  error: string;
  message: string;
  code?: string;
  details?: unknown;
}

export interface HealthResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  version: string;
  network: string;
  rpc: {
    connected: boolean;
    latency: number;
  };
  uptime: number;
  timestamp: number;
}

export interface StatsResponse {
  totalGhosts: number;
  claimedGhosts: number;
  verifiedGhosts: number;
  totalPlatforms: number;
  totalExternalIds: number;
  averageGhostScore: number;
  topSources: string[];
}

// Convex-specific types
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
