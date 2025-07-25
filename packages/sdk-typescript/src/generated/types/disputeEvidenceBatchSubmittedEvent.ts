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
  getStructDecoder,
  getStructEncoder,
  getU32Decoder,
  getU32Encoder,
  type Address,
  type FixedSizeCodec,
  type FixedSizeDecoder,
  type FixedSizeEncoder,
} from '@solana/kit';

export type DisputeEvidenceBatchSubmittedEvent = {
  dispute: Address;
  submitter: Address;
  batchSize: number;
  totalEvidenceCount: number;
};

export type DisputeEvidenceBatchSubmittedEventArgs =
  DisputeEvidenceBatchSubmittedEvent;

export function getDisputeEvidenceBatchSubmittedEventEncoder(): FixedSizeEncoder<DisputeEvidenceBatchSubmittedEventArgs> {
  return getStructEncoder([
    ['dispute', getAddressEncoder()],
    ['submitter', getAddressEncoder()],
    ['batchSize', getU32Encoder()],
    ['totalEvidenceCount', getU32Encoder()],
  ]);
}

export function getDisputeEvidenceBatchSubmittedEventDecoder(): FixedSizeDecoder<DisputeEvidenceBatchSubmittedEvent> {
  return getStructDecoder([
    ['dispute', getAddressDecoder()],
    ['submitter', getAddressDecoder()],
    ['batchSize', getU32Decoder()],
    ['totalEvidenceCount', getU32Decoder()],
  ]);
}

export function getDisputeEvidenceBatchSubmittedEventCodec(): FixedSizeCodec<
  DisputeEvidenceBatchSubmittedEventArgs,
  DisputeEvidenceBatchSubmittedEvent
> {
  return combineCodec(
    getDisputeEvidenceBatchSubmittedEventEncoder(),
    getDisputeEvidenceBatchSubmittedEventDecoder()
  );
}
