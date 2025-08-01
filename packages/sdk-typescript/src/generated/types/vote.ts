/**
 * This code was AUTOGENERATED using the codama library.
 * Please DO NOT EDIT THIS FILE, instead use visitors
 * to add features, then rerun codama to update it.
 *
 * @see https://github.com/codama-idl/codama
 */

import {
  addDecoderSizePrefix,
  addEncoderSizePrefix,
  combineCodec,
  getAddressDecoder,
  getAddressEncoder,
  getI64Decoder,
  getI64Encoder,
  getOptionDecoder,
  getOptionEncoder,
  getStructDecoder,
  getStructEncoder,
  getU32Decoder,
  getU32Encoder,
  getU64Decoder,
  getU64Encoder,
  getUtf8Decoder,
  getUtf8Encoder,
  type Address,
  type Codec,
  type Decoder,
  type Encoder,
  type Option,
  type OptionOrNullable,
} from '@solana/kit';
import {
  getDelegationInfoDecoder,
  getDelegationInfoEncoder,
  getVoteChoiceDecoder,
  getVoteChoiceEncoder,
  type DelegationInfo,
  type DelegationInfoArgs,
  type VoteChoice,
  type VoteChoiceArgs,
} from '.';

/** Individual vote record */
export type Vote = {
  /** Voter public key */
  voter: Address;
  /** Vote choice */
  choice: VoteChoice;
  /** Voting power used */
  votingPower: bigint;
  /** Vote timestamp */
  votedAt: bigint;
  /** Vote reasoning (optional) */
  reasoning: Option<string>;
  /** Delegation info (if delegated vote) */
  delegationInfo: Option<DelegationInfo>;
};

export type VoteArgs = {
  /** Voter public key */
  voter: Address;
  /** Vote choice */
  choice: VoteChoiceArgs;
  /** Voting power used */
  votingPower: number | bigint;
  /** Vote timestamp */
  votedAt: number | bigint;
  /** Vote reasoning (optional) */
  reasoning: OptionOrNullable<string>;
  /** Delegation info (if delegated vote) */
  delegationInfo: OptionOrNullable<DelegationInfoArgs>;
};

export function getVoteEncoder(): Encoder<VoteArgs> {
  return getStructEncoder([
    ['voter', getAddressEncoder()],
    ['choice', getVoteChoiceEncoder()],
    ['votingPower', getU64Encoder()],
    ['votedAt', getI64Encoder()],
    [
      'reasoning',
      getOptionEncoder(addEncoderSizePrefix(getUtf8Encoder(), getU32Encoder())),
    ],
    ['delegationInfo', getOptionEncoder(getDelegationInfoEncoder())],
  ]);
}

export function getVoteDecoder(): Decoder<Vote> {
  return getStructDecoder([
    ['voter', getAddressDecoder()],
    ['choice', getVoteChoiceDecoder()],
    ['votingPower', getU64Decoder()],
    ['votedAt', getI64Decoder()],
    [
      'reasoning',
      getOptionDecoder(addDecoderSizePrefix(getUtf8Decoder(), getU32Decoder())),
    ],
    ['delegationInfo', getOptionDecoder(getDelegationInfoDecoder())],
  ]);
}

export function getVoteCodec(): Codec<VoteArgs, Vote> {
  return combineCodec(getVoteEncoder(), getVoteDecoder());
}
