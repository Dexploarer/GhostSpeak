/**
 * This code was AUTOGENERATED using the codama library.
 * Please DO NOT EDIT THIS FILE, instead use visitors
 * to add features, then rerun codama to update it.
 *
 * @see https://github.com/codama-idl/codama
 */

import {
  combineCodec,
  getEnumDecoder,
  getEnumEncoder,
  type FixedSizeCodec,
  type FixedSizeDecoder,
  type FixedSizeEncoder,
} from '@solana/kit';

export enum ChannelType {
  Direct,
  Group,
  Public,
  Private,
}

export type ChannelTypeArgs = ChannelType;

export function getChannelTypeEncoder(): FixedSizeEncoder<ChannelTypeArgs> {
  return getEnumEncoder(ChannelType);
}

export function getChannelTypeDecoder(): FixedSizeDecoder<ChannelType> {
  return getEnumDecoder(ChannelType);
}

export function getChannelTypeCodec(): FixedSizeCodec<
  ChannelTypeArgs,
  ChannelType
> {
  return combineCodec(getChannelTypeEncoder(), getChannelTypeDecoder());
}
