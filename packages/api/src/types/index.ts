/**
 * GhostSpeak API Type Definitions
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
  address: string;
  owner: string | null;
  status: AgentStatus;
  firstTxSignature: string;
  firstSeenTimestamp: number;
  discoverySource: string;
  claimedAt: number | null;
  agentId: string;
  name: string;
  description: string;
  metadataUri: string;
  serviceEndpoint: string;
  externalIdentifiers: ExternalIdentifier[];
  ghostScore: number;
  reputationScore: number;
  reputationComponents: ReputationComponent[];
  didAddress: string | null;
  credentials: string[];
  isActive: boolean;
  isVerified: boolean;
  verificationTimestamp: number;
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
