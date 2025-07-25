/**
 * This code was AUTOGENERATED using the codama library.
 * Please DO NOT EDIT THIS FILE, instead use visitors
 * to add features, then rerun codama to update it.
 *
 * @see https://github.com/codama-idl/codama
 */

import {
  combineCodec,
  getBooleanDecoder,
  getBooleanEncoder,
  getStructDecoder,
  getStructEncoder,
  getU64Decoder,
  getU64Encoder,
  getU8Decoder,
  getU8Encoder,
  type FixedSizeCodec,
  type FixedSizeDecoder,
  type FixedSizeEncoder,
} from '@solana/kit';
import {
  getQuorumMethodDecoder,
  getQuorumMethodEncoder,
  type QuorumMethod,
  type QuorumMethodArgs,
} from '.';

/** Quorum requirements for proposals */
export type QuorumRequirements = {
  /** Minimum participation rate (0-100) */
  minimumParticipation: number;
  /** Approval threshold (0-100) */
  approvalThreshold: number;
  /** Super majority required */
  superMajorityRequired: boolean;
  /** Minimum total voting power */
  minimumVotingPower: bigint;
  /** Quorum calculation method */
  quorumMethod: QuorumMethod;
};

export type QuorumRequirementsArgs = {
  /** Minimum participation rate (0-100) */
  minimumParticipation: number;
  /** Approval threshold (0-100) */
  approvalThreshold: number;
  /** Super majority required */
  superMajorityRequired: boolean;
  /** Minimum total voting power */
  minimumVotingPower: number | bigint;
  /** Quorum calculation method */
  quorumMethod: QuorumMethodArgs;
};

export function getQuorumRequirementsEncoder(): FixedSizeEncoder<QuorumRequirementsArgs> {
  return getStructEncoder([
    ['minimumParticipation', getU8Encoder()],
    ['approvalThreshold', getU8Encoder()],
    ['superMajorityRequired', getBooleanEncoder()],
    ['minimumVotingPower', getU64Encoder()],
    ['quorumMethod', getQuorumMethodEncoder()],
  ]);
}

export function getQuorumRequirementsDecoder(): FixedSizeDecoder<QuorumRequirements> {
  return getStructDecoder([
    ['minimumParticipation', getU8Decoder()],
    ['approvalThreshold', getU8Decoder()],
    ['superMajorityRequired', getBooleanDecoder()],
    ['minimumVotingPower', getU64Decoder()],
    ['quorumMethod', getQuorumMethodDecoder()],
  ]);
}

export function getQuorumRequirementsCodec(): FixedSizeCodec<
  QuorumRequirementsArgs,
  QuorumRequirements
> {
  return combineCodec(
    getQuorumRequirementsEncoder(),
    getQuorumRequirementsDecoder()
  );
}
