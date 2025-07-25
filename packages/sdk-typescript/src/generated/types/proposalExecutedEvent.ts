/**
 * This code was AUTOGENERATED using the codama library.
 * Please DO NOT EDIT THIS FILE, instead use visitors
 * to add features, then rerun codama to update it.
 *
 * @see https://github.com/codama-idl/codama
 */

import {
  combineCodec,
  getAddressDecoder,
  getAddressEncoder,
  getI64Decoder,
  getI64Encoder,
  getStructDecoder,
  getStructEncoder,
  getU64Decoder,
  getU64Encoder,
  type Address,
  type FixedSizeCodec,
  type FixedSizeDecoder,
  type FixedSizeEncoder,
} from '@solana/kit';

export type ProposalExecutedEvent = {
  proposal: Address;
  proposalId: bigint;
  executor: Address;
  timestamp: bigint;
};

export type ProposalExecutedEventArgs = {
  proposal: Address;
  proposalId: number | bigint;
  executor: Address;
  timestamp: number | bigint;
};

export function getProposalExecutedEventEncoder(): FixedSizeEncoder<ProposalExecutedEventArgs> {
  return getStructEncoder([
    ['proposal', getAddressEncoder()],
    ['proposalId', getU64Encoder()],
    ['executor', getAddressEncoder()],
    ['timestamp', getI64Encoder()],
  ]);
}

export function getProposalExecutedEventDecoder(): FixedSizeDecoder<ProposalExecutedEvent> {
  return getStructDecoder([
    ['proposal', getAddressDecoder()],
    ['proposalId', getU64Decoder()],
    ['executor', getAddressDecoder()],
    ['timestamp', getI64Decoder()],
  ]);
}

export function getProposalExecutedEventCodec(): FixedSizeCodec<
  ProposalExecutedEventArgs,
  ProposalExecutedEvent
> {
  return combineCodec(
    getProposalExecutedEventEncoder(),
    getProposalExecutedEventDecoder()
  );
}
