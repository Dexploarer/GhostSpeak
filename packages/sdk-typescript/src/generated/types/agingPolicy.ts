/**
 * This code was AUTOGENERATED using the codama library.
 * Please DO NOT EDIT THIS FILE, instead use visitors
 * to add features, then rerun codama to update it.
 *
 * @see https://github.com/codama-idl/codama
 */

import {
  addDecoderSizePrefix,
  addEncoderSizePrefix,
  combineCodec,
  getArrayDecoder,
  getArrayEncoder,
  getI64Decoder,
  getI64Encoder,
  getStructDecoder,
  getStructEncoder,
  getU32Decoder,
  getU32Encoder,
  getUtf8Decoder,
  getUtf8Encoder,
  type Codec,
  type Decoder,
  type Encoder,
} from '@solana/kit';
import {
  getBiometricTypeDecoder,
  getBiometricTypeEncoder,
  getDegradationHandlingDecoder,
  getDegradationHandlingEncoder,
  type BiometricType,
  type BiometricTypeArgs,
  type DegradationHandling,
  type DegradationHandlingArgs,
} from '.';

/** Template aging policies */
export type AgingPolicy = {
  /** Biometric type */
  biometricType: BiometricType;
  /** Maximum age */
  maxAge: bigint;
  /** Refresh requirements */
  refreshRequirements: Array<string>;
  /** Degradation handling */
  degradationHandling: DegradationHandling;
};

export type AgingPolicyArgs = {
  /** Biometric type */
  biometricType: BiometricTypeArgs;
  /** Maximum age */
  maxAge: number | bigint;
  /** Refresh requirements */
  refreshRequirements: Array<string>;
  /** Degradation handling */
  degradationHandling: DegradationHandlingArgs;
};

export function getAgingPolicyEncoder(): Encoder<AgingPolicyArgs> {
  return getStructEncoder([
    ['biometricType', getBiometricTypeEncoder()],
    ['maxAge', getI64Encoder()],
    [
      'refreshRequirements',
      getArrayEncoder(addEncoderSizePrefix(getUtf8Encoder(), getU32Encoder())),
    ],
    ['degradationHandling', getDegradationHandlingEncoder()],
  ]);
}

export function getAgingPolicyDecoder(): Decoder<AgingPolicy> {
  return getStructDecoder([
    ['biometricType', getBiometricTypeDecoder()],
    ['maxAge', getI64Decoder()],
    [
      'refreshRequirements',
      getArrayDecoder(addDecoderSizePrefix(getUtf8Decoder(), getU32Decoder())),
    ],
    ['degradationHandling', getDegradationHandlingDecoder()],
  ]);
}

export function getAgingPolicyCodec(): Codec<AgingPolicyArgs, AgingPolicy> {
  return combineCodec(getAgingPolicyEncoder(), getAgingPolicyDecoder());
}
