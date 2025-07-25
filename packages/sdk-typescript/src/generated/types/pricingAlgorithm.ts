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

export enum PricingAlgorithm {
  Linear,
  Exponential,
  Logarithmic,
  Sigmoid,
  MarketBased,
  MLOptimized,
  DemandBased,
  ReputationBased,
  SurgePricing,
  MarketAverage,
  PerformanceBased,
  Seasonal,
}

export type PricingAlgorithmArgs = PricingAlgorithm;

export function getPricingAlgorithmEncoder(): FixedSizeEncoder<PricingAlgorithmArgs> {
  return getEnumEncoder(PricingAlgorithm);
}

export function getPricingAlgorithmDecoder(): FixedSizeDecoder<PricingAlgorithm> {
  return getEnumDecoder(PricingAlgorithm);
}

export function getPricingAlgorithmCodec(): FixedSizeCodec<
  PricingAlgorithmArgs,
  PricingAlgorithm
> {
  return combineCodec(
    getPricingAlgorithmEncoder(),
    getPricingAlgorithmDecoder()
  );
}
