/**
 * Manual stub for MultisigConfig (governance.rs)
 */

import {
  getStructEncoder,
  getStructDecoder,
  getU8Encoder,
  getU8Decoder,
  getI64Encoder,
  getI64Decoder,
  getBooleanEncoder,
  getBooleanDecoder,
  getOptionEncoder,
  getOptionDecoder,
  combineCodec,
  type Encoder,
  type Decoder,
  type Codec,
  type Option,
  type OptionOrNullable,
} from '@solana/kit';

export type MultisigConfig = {
  maxSigners: number;
  defaultTimeout: bigint;
  allowEmergencyOverride: boolean;
  emergencyThreshold: Option<number>;
  autoExecute: boolean;
};

export type MultisigConfigArgs = {
  maxSigners: number;
  defaultTimeout: number | bigint;
  allowEmergencyOverride: boolean;
  emergencyThreshold: OptionOrNullable<number>;
  autoExecute: boolean;
};

export function getMultisigConfigEncoder(): Encoder<MultisigConfigArgs> {
  return getStructEncoder([
    ['maxSigners', getU8Encoder()],
    ['defaultTimeout', getI64Encoder()],
    ['allowEmergencyOverride', getBooleanEncoder()],
    ['emergencyThreshold', getOptionEncoder(getU8Encoder())],
    ['autoExecute', getBooleanEncoder()],
  ]);
}

export function getMultisigConfigDecoder(): Decoder<MultisigConfig> {
  return getStructDecoder([
    ['maxSigners', getU8Decoder()],
    ['defaultTimeout', getI64Decoder()],
    ['allowEmergencyOverride', getBooleanDecoder()],
    ['emergencyThreshold', getOptionDecoder(getU8Decoder())],
    ['autoExecute', getBooleanDecoder()],
  ]);
}

export function getMultisigConfigCodec(): Codec<MultisigConfigArgs, MultisigConfig> {
  return combineCodec(getMultisigConfigEncoder(), getMultisigConfigDecoder());
}
