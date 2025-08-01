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

export enum AuctionType {
  English,
  Dutch,
  SealedBid,
  Vickrey,
}

export type AuctionTypeArgs = AuctionType;

export function getAuctionTypeEncoder(): FixedSizeEncoder<AuctionTypeArgs> {
  return getEnumEncoder(AuctionType);
}

export function getAuctionTypeDecoder(): FixedSizeDecoder<AuctionType> {
  return getEnumDecoder(AuctionType);
}

export function getAuctionTypeCodec(): FixedSizeCodec<
  AuctionTypeArgs,
  AuctionType
> {
  return combineCodec(getAuctionTypeEncoder(), getAuctionTypeDecoder());
}
