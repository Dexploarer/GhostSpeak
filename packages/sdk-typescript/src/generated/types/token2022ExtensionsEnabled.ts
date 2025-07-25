/**
 * This code was AUTOGENERATED using the codama library.
 * Please DO NOT EDIT THIS FILE, instead use visitors
 * to add features, then rerun codama to update it.
 *
 * @see https://github.com/codama-idl/codama
 */

import {
  combineCodec,
  getBooleanDecoder,
  getBooleanEncoder,
  getStructDecoder,
  getStructEncoder,
  type FixedSizeCodec,
  type FixedSizeDecoder,
  type FixedSizeEncoder,
} from '@solana/kit';

export type Token2022ExtensionsEnabled = {
  transferFee: boolean;
  confidentialTransfers: boolean;
  interestBearing: boolean;
};

export type Token2022ExtensionsEnabledArgs = Token2022ExtensionsEnabled;

export function getToken2022ExtensionsEnabledEncoder(): FixedSizeEncoder<Token2022ExtensionsEnabledArgs> {
  return getStructEncoder([
    ['transferFee', getBooleanEncoder()],
    ['confidentialTransfers', getBooleanEncoder()],
    ['interestBearing', getBooleanEncoder()],
  ]);
}

export function getToken2022ExtensionsEnabledDecoder(): FixedSizeDecoder<Token2022ExtensionsEnabled> {
  return getStructDecoder([
    ['transferFee', getBooleanDecoder()],
    ['confidentialTransfers', getBooleanDecoder()],
    ['interestBearing', getBooleanDecoder()],
  ]);
}

export function getToken2022ExtensionsEnabledCodec(): FixedSizeCodec<
  Token2022ExtensionsEnabledArgs,
  Token2022ExtensionsEnabled
> {
  return combineCodec(
    getToken2022ExtensionsEnabledEncoder(),
    getToken2022ExtensionsEnabledDecoder()
  );
}
