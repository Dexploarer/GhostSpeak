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

export type DisputeEvidenceSubmittedEvent = {
  dispute: Address;
  submitter: Address;
  evidenceCount: number;
};

export type DisputeEvidenceSubmittedEventArgs = DisputeEvidenceSubmittedEvent;

export function getDisputeEvidenceSubmittedEventEncoder(): FixedSizeEncoder<DisputeEvidenceSubmittedEventArgs> {
  return getStructEncoder([
    ['dispute', getAddressEncoder()],
    ['submitter', getAddressEncoder()],
    ['evidenceCount', getU32Encoder()],
  ]);
}

export function getDisputeEvidenceSubmittedEventDecoder(): FixedSizeDecoder<DisputeEvidenceSubmittedEvent> {
  return getStructDecoder([
    ['dispute', getAddressDecoder()],
    ['submitter', getAddressDecoder()],
    ['evidenceCount', getU32Decoder()],
  ]);
}

export function getDisputeEvidenceSubmittedEventCodec(): FixedSizeCodec<
  DisputeEvidenceSubmittedEventArgs,
  DisputeEvidenceSubmittedEvent
> {
  return combineCodec(
    getDisputeEvidenceSubmittedEventEncoder(),
    getDisputeEvidenceSubmittedEventDecoder()
  );
}
