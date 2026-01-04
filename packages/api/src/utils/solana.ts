/**
 * Solana Utilities for GhostSpeak API
 *
 * PDA derivation and Borsh codecs for on-chain data
 */

import { address, type Address, getProgramDerivedAddress } from '@solana/addresses';
import { getUtf8Codec } from '@solana/codecs-strings';
import {
  getStructCodec,
  getArrayCodec,
  getBooleanCodec,
} from '@solana/codecs-data-structures';
import {
  getU8Codec,
  getU32Codec,
  getU64Codec,
  getI64Codec,
} from '@solana/codecs-numbers';
import { getOptionCodec } from '@solana/options';
import { getAddressCodec } from '@solana/addresses';

// Program ID - matches SDK
export const PROGRAM_ID = '4wHjA2a5YC4twZb4NQpwZpixo5FgxxzuJUrCG7UnF9pB' as Address;
export const AGENT_SEED = 'agent';
export const EXTERNAL_ID_SEED = 'external_id';

// ========== ENUMS ==========

export enum BorshAgentStatus {
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

// ========== BORSH TYPES ==========

export type BorshExternalIdentifier = {
  platform: string;
  externalId: string;
  verified: boolean;
  verifiedAt: bigint;
};

export type BorshReputationComponent = {
  sourceType: number;
  score: bigint;
  weight: number;
  lastUpdated: bigint;
  dataPoints: bigint;
};

export type BorshAgent = {
  owner: Address | null;
  status: number;
  agentId: string;
  firstTxSignature: string;
  firstSeenTimestamp: bigint;
  discoverySource: string;
  claimedAt: bigint | null;
  agentType: number;
  name: string;
  description: string;
  capabilities: string[];
  pricingModel: number;
  reputationScore: number;
  totalJobsCompleted: number;
  totalEarnings: bigint;
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
  frameworkOrigin: string;
  supportedTokens: Address[];
  cnftMint: Address | null;
  merkleTree: Address | null;
  supportsA2a: boolean;
  transferHook: Address | null;
  parentAgent: Address | null;
  generation: number;
  x402Enabled: boolean;
  x402PaymentAddress: Address;
  x402AcceptedTokens: Address[];
  x402PricePerCall: bigint;
  x402ServiceEndpoint: string;
  x402TotalPayments: bigint;
  x402TotalCalls: bigint;
  lastPaymentTimestamp: bigint;
  externalIdentifiers: BorshExternalIdentifier[];
  ghostScore: bigint;
  reputationComponents: BorshReputationComponent[];
  didAddress: Address | null;
  credentials: Address[];
  apiSpecUri: string;
  apiVersion: string;
  bump: number;
};

export type BorshExternalIdMapping = {
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const agentCodec: any = getStructCodec([
  ['owner', getOptionCodec(getAddressCodec())],
  ['status', getU8Codec()],
  ['agentId', getUtf8Codec()],
  ['firstTxSignature', getUtf8Codec()],
  ['firstSeenTimestamp', getI64Codec()],
  ['discoverySource', getUtf8Codec()],
  ['claimedAt', getOptionCodec(getI64Codec())],
  ['agentType', getU8Codec()],
  ['name', getUtf8Codec()],
  ['description', getUtf8Codec()],
  ['capabilities', getArrayCodec(getUtf8Codec())],
  ['pricingModel', getU8Codec()],
  ['reputationScore', getU32Codec()],
  ['totalJobsCompleted', getU32Codec()],
  ['totalEarnings', getU64Codec()],
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
  ['frameworkOrigin', getUtf8Codec()],
  ['supportedTokens', getArrayCodec(getAddressCodec())],
  ['cnftMint', getOptionCodec(getAddressCodec())],
  ['merkleTree', getOptionCodec(getAddressCodec())],
  ['supportsA2a', getBooleanCodec()],
  ['transferHook', getOptionCodec(getAddressCodec())],
  ['parentAgent', getOptionCodec(getAddressCodec())],
  ['generation', getU32Codec()],
  ['x402Enabled', getBooleanCodec()],
  ['x402PaymentAddress', getAddressCodec()],
  ['x402AcceptedTokens', getArrayCodec(getAddressCodec())],
  ['x402PricePerCall', getU64Codec()],
  ['x402ServiceEndpoint', getUtf8Codec()],
  ['x402TotalPayments', getU64Codec()],
  ['x402TotalCalls', getU64Codec()],
  ['lastPaymentTimestamp', getI64Codec()],
  ['externalIdentifiers', getArrayCodec(externalIdentifierCodec)],
  ['ghostScore', getU64Codec()],
  ['reputationComponents', getArrayCodec(reputationComponentCodec)],
  ['didAddress', getOptionCodec(getAddressCodec())],
  ['credentials', getArrayCodec(getAddressCodec())],
  ['apiSpecUri', getUtf8Codec()],
  ['apiVersion', getUtf8Codec()],
  ['bump', getU8Codec()],
]);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const externalIdMappingCodec: any = getStructCodec([
  ['ghostPubkey', getAddressCodec()],
  ['platform', getUtf8Codec()],
  ['externalId', getUtf8Codec()],
  ['createdAt', getI64Codec()],
  ['verified', getBooleanCodec()],
  ['verifiedAt', getOptionCodec(getI64Codec())],
  ['bump', getU8Codec()],
]);

// ========== PDA DERIVATION ==========

export async function deriveAgentAddress(owner: string, agentId: string): Promise<Address> {
  const utf8Codec = getUtf8Codec();
  const [pda] = await getProgramDerivedAddress({
    programAddress: PROGRAM_ID,
    seeds: [
      utf8Codec.encode(AGENT_SEED),
      address(owner),
      utf8Codec.encode(agentId),
    ],
  });
  return pda;
}

export async function deriveExternalIdMappingAddress(
  platform: string,
  externalId: string
): Promise<Address> {
  const utf8Codec = getUtf8Codec();
  const [pda] = await getProgramDerivedAddress({
    programAddress: PROGRAM_ID,
    seeds: [
      utf8Codec.encode(EXTERNAL_ID_SEED),
      utf8Codec.encode(platform),
      utf8Codec.encode(externalId),
    ],
  });
  return pda;
}
