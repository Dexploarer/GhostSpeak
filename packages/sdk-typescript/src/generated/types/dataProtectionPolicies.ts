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

export type DataProtectionPolicies = {
  encryptionRequired: boolean;
  classificationRequired: boolean;
  dlpEnabled: boolean;
};

export type DataProtectionPoliciesArgs = DataProtectionPolicies;

export function getDataProtectionPoliciesEncoder(): FixedSizeEncoder<DataProtectionPoliciesArgs> {
  return getStructEncoder([
    ['encryptionRequired', getBooleanEncoder()],
    ['classificationRequired', getBooleanEncoder()],
    ['dlpEnabled', getBooleanEncoder()],
  ]);
}

export function getDataProtectionPoliciesDecoder(): FixedSizeDecoder<DataProtectionPolicies> {
  return getStructDecoder([
    ['encryptionRequired', getBooleanDecoder()],
    ['classificationRequired', getBooleanDecoder()],
    ['dlpEnabled', getBooleanDecoder()],
  ]);
}

export function getDataProtectionPoliciesCodec(): FixedSizeCodec<
  DataProtectionPoliciesArgs,
  DataProtectionPolicies
> {
  return combineCodec(
    getDataProtectionPoliciesEncoder(),
    getDataProtectionPoliciesDecoder()
  );
}
