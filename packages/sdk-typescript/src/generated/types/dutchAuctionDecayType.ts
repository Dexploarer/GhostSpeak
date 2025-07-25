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

export enum DutchAuctionDecayType {
  Linear,
  Exponential,
  Stepped,
}

export type DutchAuctionDecayTypeArgs = DutchAuctionDecayType;

export function getDutchAuctionDecayTypeEncoder(): FixedSizeEncoder<DutchAuctionDecayTypeArgs> {
  return getEnumEncoder(DutchAuctionDecayType);
}

export function getDutchAuctionDecayTypeDecoder(): FixedSizeDecoder<DutchAuctionDecayType> {
  return getEnumDecoder(DutchAuctionDecayType);
}

export function getDutchAuctionDecayTypeCodec(): FixedSizeCodec<
  DutchAuctionDecayTypeArgs,
  DutchAuctionDecayType
> {
  return combineCodec(
    getDutchAuctionDecayTypeEncoder(),
    getDutchAuctionDecayTypeDecoder()
  );
}
