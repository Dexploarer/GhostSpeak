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
  getF64Decoder,
  getF64Encoder,
  getStructDecoder,
  getStructEncoder,
  type Address,
  type FixedSizeCodec,
  type FixedSizeDecoder,
  type FixedSizeEncoder,
} from '@solana/kit';

export type IncentiveProgramCreatedEvent = {
  program: Address;
  referralBonus: number;
  performanceBonus: number;
};

export type IncentiveProgramCreatedEventArgs = IncentiveProgramCreatedEvent;

export function getIncentiveProgramCreatedEventEncoder(): FixedSizeEncoder<IncentiveProgramCreatedEventArgs> {
  return getStructEncoder([
    ['program', getAddressEncoder()],
    ['referralBonus', getF64Encoder()],
    ['performanceBonus', getF64Encoder()],
  ]);
}

export function getIncentiveProgramCreatedEventDecoder(): FixedSizeDecoder<IncentiveProgramCreatedEvent> {
  return getStructDecoder([
    ['program', getAddressDecoder()],
    ['referralBonus', getF64Decoder()],
    ['performanceBonus', getF64Decoder()],
  ]);
}

export function getIncentiveProgramCreatedEventCodec(): FixedSizeCodec<
  IncentiveProgramCreatedEventArgs,
  IncentiveProgramCreatedEvent
> {
  return combineCodec(
    getIncentiveProgramCreatedEventEncoder(),
    getIncentiveProgramCreatedEventDecoder()
  );
}
