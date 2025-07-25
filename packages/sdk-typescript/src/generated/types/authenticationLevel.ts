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

/** Authentication levels */
export enum AuthenticationLevel {
  Low,
  Medium,
  High,
  VeryHigh,
}

export type AuthenticationLevelArgs = AuthenticationLevel;

export function getAuthenticationLevelEncoder(): FixedSizeEncoder<AuthenticationLevelArgs> {
  return getEnumEncoder(AuthenticationLevel);
}

export function getAuthenticationLevelDecoder(): FixedSizeDecoder<AuthenticationLevel> {
  return getEnumDecoder(AuthenticationLevel);
}

export function getAuthenticationLevelCodec(): FixedSizeCodec<
  AuthenticationLevelArgs,
  AuthenticationLevel
> {
  return combineCodec(
    getAuthenticationLevelEncoder(),
    getAuthenticationLevelDecoder()
  );
}
