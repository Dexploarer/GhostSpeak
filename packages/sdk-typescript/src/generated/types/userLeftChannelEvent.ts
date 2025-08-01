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
  type Address,
  type FixedSizeCodec,
  type FixedSizeDecoder,
  type FixedSizeEncoder,
} from '@solana/kit';

export type UserLeftChannelEvent = {
  channel: Address;
  user: Address;
  leftAt: bigint;
};

export type UserLeftChannelEventArgs = {
  channel: Address;
  user: Address;
  leftAt: number | bigint;
};

export function getUserLeftChannelEventEncoder(): FixedSizeEncoder<UserLeftChannelEventArgs> {
  return getStructEncoder([
    ['channel', getAddressEncoder()],
    ['user', getAddressEncoder()],
    ['leftAt', getI64Encoder()],
  ]);
}

export function getUserLeftChannelEventDecoder(): FixedSizeDecoder<UserLeftChannelEvent> {
  return getStructDecoder([
    ['channel', getAddressDecoder()],
    ['user', getAddressDecoder()],
    ['leftAt', getI64Decoder()],
  ]);
}

export function getUserLeftChannelEventCodec(): FixedSizeCodec<
  UserLeftChannelEventArgs,
  UserLeftChannelEvent
> {
  return combineCodec(
    getUserLeftChannelEventEncoder(),
    getUserLeftChannelEventDecoder()
  );
}
