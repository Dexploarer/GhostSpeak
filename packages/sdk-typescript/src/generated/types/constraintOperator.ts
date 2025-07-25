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

/** Operators for constraint conditions */
export enum ConstraintOperator {
  Equals,
  NotEquals,
  GreaterThan,
  LessThan,
  GreaterThanOrEqual,
  LessThanOrEqual,
  Contains,
  NotContains,
  In,
  NotIn,
  Matches,
  NotMatches,
}

export type ConstraintOperatorArgs = ConstraintOperator;

export function getConstraintOperatorEncoder(): FixedSizeEncoder<ConstraintOperatorArgs> {
  return getEnumEncoder(ConstraintOperator);
}

export function getConstraintOperatorDecoder(): FixedSizeDecoder<ConstraintOperator> {
  return getEnumDecoder(ConstraintOperator);
}

export function getConstraintOperatorCodec(): FixedSizeCodec<
  ConstraintOperatorArgs,
  ConstraintOperator
> {
  return combineCodec(
    getConstraintOperatorEncoder(),
    getConstraintOperatorDecoder()
  );
}
