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
  getU64Decoder,
  getU64Encoder,
  type Address,
  type FixedSizeCodec,
  type FixedSizeDecoder,
  type FixedSizeEncoder,
} from '@solana/kit';

export type NegotiationInitiatedEvent = {
  negotiation: Address;
  initiator: Address;
  counterparty: Address;
  initialOffer: bigint;
};

export type NegotiationInitiatedEventArgs = {
  negotiation: Address;
  initiator: Address;
  counterparty: Address;
  initialOffer: number | bigint;
};

export function getNegotiationInitiatedEventEncoder(): FixedSizeEncoder<NegotiationInitiatedEventArgs> {
  return getStructEncoder([
    ['negotiation', getAddressEncoder()],
    ['initiator', getAddressEncoder()],
    ['counterparty', getAddressEncoder()],
    ['initialOffer', getU64Encoder()],
  ]);
}

export function getNegotiationInitiatedEventDecoder(): FixedSizeDecoder<NegotiationInitiatedEvent> {
  return getStructDecoder([
    ['negotiation', getAddressDecoder()],
    ['initiator', getAddressDecoder()],
    ['counterparty', getAddressDecoder()],
    ['initialOffer', getU64Decoder()],
  ]);
}

export function getNegotiationInitiatedEventCodec(): FixedSizeCodec<
  NegotiationInitiatedEventArgs,
  NegotiationInitiatedEvent
> {
  return combineCodec(
    getNegotiationInitiatedEventEncoder(),
    getNegotiationInitiatedEventDecoder()
  );
}
