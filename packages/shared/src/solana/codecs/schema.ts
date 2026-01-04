/**
 * Borsh Codecs for GhostSpeak Program Accounts
 *
 * Uses Solana Web3.js v5 codec system
 * Matches the Rust structs in programs/src/state/
 */

import {
  getStructCodec,
  getArrayCodec,
  getBooleanCodec,
} from '@solana/codecs-data-structures';
import { getUtf8Codec } from '@solana/codecs-strings';
import {
  getU8Codec,
  getU32Codec,
  getU64Codec,
  getI64Codec,
} from '@solana/codecs-numbers';
import { getOptionCodec } from '@solana/options';
import { getAddressCodec, type Address } from '@solana/addresses';

// ========== ENUMS ==========

export enum AgentStatus {
  Unregistered = 0,
  Registered = 1,
  Claimed = 2,
  Verified = 3,
}

export enum ReputationSourceType {
  AccountAge = 0,
  X402Transactions = 1,
  UserReviews = 2,
  ElizaOSReputation = 3,
  CrossmintVerification = 4,
  EndpointReliability = 5,
  JobCompletions = 6,
  SkillEndorsements = 7,
}

export enum PricingModel {
  Fixed = 0,
  Dynamic = 1,
}

// ========== TYPES ==========

export type ExternalIdentifier = {
  platform: string;
  externalId: string;
  verified: boolean;
  verifiedAt: bigint;
};

export type ReputationComponent = {
  sourceType: number; // ReputationSourceType enum
  score: bigint;
  weight: number;
  lastUpdated: bigint;
  dataPoints: bigint;
};

export type Agent = {
  // Ghost Identity Core
  owner: Address | null;
  status: number; // AgentStatus enum
  agentId: string;

  // Discovery Provenance
  firstTxSignature: string;
  firstSeenTimestamp: bigint;
  discoverySource: string;
  claimedAt: bigint | null;

  // Basic Metadata
  agentType: number;
  name: string;
  description: string;
  capabilities: string[];
  pricingModel: number; // PricingModel enum

  // Legacy Reputation
  reputationScore: number;
  totalJobsCompleted: number;
  totalEarnings: bigint;

  // Timestamps
  isActive: boolean;
  createdAt: bigint;
  updatedAt: bigint;
  originalPrice: bigint;
  genomeHash: string;
  isReplicable: boolean;
  replicationFee: bigint;
  serviceEndpoint: string;
  isVerified: boolean;
  verificationTimestamp: bigint;
  metadataUri: string;

  // Additional fields
  frameworkOrigin: string;
  supportedTokens: Address[];
  cnftMint: Address | null;
  merkleTree: Address | null;
  supportsA2a: boolean;
  transferHook: Address | null;
  parentAgent: Address | null;
  generation: number;

  // x402 fields
  x402Enabled: boolean;
  x402PaymentAddress: Address;
  x402AcceptedTokens: Address[];
  x402PricePerCall: bigint;
  x402ServiceEndpoint: string;
  x402TotalPayments: bigint;
  x402TotalCalls: bigint;
  lastPaymentTimestamp: bigint;

  // Cross-platform Identity
  externalIdentifiers: ExternalIdentifier[];

  // Multi-source Reputation
  ghostScore: bigint;
  reputationComponents: ReputationComponent[];

  // Credentials
  didAddress: Address | null;
  credentials: Address[];

  // API Schema
  apiSpecUri: string;
  apiVersion: string;
  bump: number;
};

export type ExternalIdMapping = {
  ghostPubkey: Address;
  platform: string;
  externalId: string;
  createdAt: bigint;
  verified: boolean;
  verifiedAt: bigint | null;
  bump: number;
};

// ========== CODECS ==========

const externalIdentifierCodec = getStructCodec([
  ['platform', getUtf8Codec()],
  ['externalId', getUtf8Codec()],
  ['verified', getBooleanCodec()],
  ['verifiedAt', getI64Codec()],
]);

const reputationComponentCodec = getStructCodec([
  ['sourceType', getU8Codec()],
  ['score', getU64Codec()],
  ['weight', getU32Codec()],
  ['lastUpdated', getI64Codec()],
  ['dataPoints', getU64Codec()],
]);

// @ts-expect-error - Codec type inference not portable across module boundaries
export const agentCodec = getStructCodec([
  // Ghost Identity Core
  ['owner', getOptionCodec(getAddressCodec())],
  ['status', getU8Codec()],
  ['agentId', getUtf8Codec()],

  // Discovery Provenance
  ['firstTxSignature', getUtf8Codec()],
  ['firstSeenTimestamp', getI64Codec()],
  ['discoverySource', getUtf8Codec()],
  ['claimedAt', getOptionCodec(getI64Codec())],

  // Basic Metadata
  ['agentType', getU8Codec()],
  ['name', getUtf8Codec()],
  ['description', getUtf8Codec()],
  ['capabilities', getArrayCodec(getUtf8Codec())],
  ['pricingModel', getU8Codec()],

  // Legacy Reputation
  ['reputationScore', getU32Codec()],
  ['totalJobsCompleted', getU32Codec()],
  ['totalEarnings', getU64Codec()],

  // Timestamps
  ['isActive', getBooleanCodec()],
  ['createdAt', getI64Codec()],
  ['updatedAt', getI64Codec()],
  ['originalPrice', getU64Codec()],
  ['genomeHash', getUtf8Codec()],
  ['isReplicable', getBooleanCodec()],
  ['replicationFee', getU64Codec()],
  ['serviceEndpoint', getUtf8Codec()],
  ['isVerified', getBooleanCodec()],
  ['verificationTimestamp', getI64Codec()],
  ['metadataUri', getUtf8Codec()],

  // Additional fields
  ['frameworkOrigin', getUtf8Codec()],
  ['supportedTokens', getArrayCodec(getAddressCodec())],
  ['cnftMint', getOptionCodec(getAddressCodec())],
  ['merkleTree', getOptionCodec(getAddressCodec())],
  ['supportsA2a', getBooleanCodec()],
  ['transferHook', getOptionCodec(getAddressCodec())],
  ['parentAgent', getOptionCodec(getAddressCodec())],
  ['generation', getU32Codec()],

  // x402 fields
  ['x402Enabled', getBooleanCodec()],
  ['x402PaymentAddress', getAddressCodec()],
  ['x402AcceptedTokens', getArrayCodec(getAddressCodec())],
  ['x402PricePerCall', getU64Codec()],
  ['x402ServiceEndpoint', getUtf8Codec()],
  ['x402TotalPayments', getU64Codec()],
  ['x402TotalCalls', getU64Codec()],
  ['lastPaymentTimestamp', getI64Codec()],

  // Cross-platform Identity
  ['externalIdentifiers', getArrayCodec(externalIdentifierCodec)],

  // Multi-source Reputation
  ['ghostScore', getU64Codec()],
  ['reputationComponents', getArrayCodec(reputationComponentCodec)],

  // Credentials
  ['didAddress', getOptionCodec(getAddressCodec())],
  ['credentials', getArrayCodec(getAddressCodec())],

  // API Schema
  ['apiSpecUri', getUtf8Codec()],
  ['apiVersion', getUtf8Codec()],
  ['bump', getU8Codec()],
]);

// @ts-expect-error - Codec type inference not portable across module boundaries
export const externalIdMappingCodec = getStructCodec([
  ['ghostPubkey', getAddressCodec()],
  ['platform', getUtf8Codec()],
  ['externalId', getUtf8Codec()],
  ['createdAt', getI64Codec()],
  ['verified', getBooleanCodec()],
  ['verifiedAt', getOptionCodec(getI64Codec())],
  ['bump', getU8Codec()],
]);
