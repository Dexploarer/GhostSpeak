/**
 * Manual stub for BiometricQuality - not included in Anchor IDL
 *
 * This type is only used as a nested field in BiometricPolicies, so Anchor's IDL
 * generator doesn't include it. This stub MUST match the Rust definition exactly.
 *
 * Source: programs/src/state/security_governance.rs:1234-1245
 *
 * @warning If Rust definition changes, this stub MUST be updated manually
 * @see https://github.com/dexploarer/GhostSpeak/blob/main/programs/src/state/security_governance.rs
 */

import {
  addEncoderSizePrefix,
  addDecoderSizePrefix,
  getStructEncoder,
  getStructDecoder,
  getUtf8Encoder,
  getUtf8Decoder,
  getU32Encoder,
  getU32Decoder,
  getU8Encoder,
  getU8Decoder,
  getBooleanEncoder,
  getBooleanDecoder,
  getArrayEncoder,
  getArrayDecoder,
  combineCodec,
  type Encoder,
  type Decoder,
  type Codec,
} from '@solana/kit';
import type { DecodedStringNumberTuple, StringNumberTupleInput } from './common-tuple-types.js';

/**
 * Biometric quality requirements
 *
 * Rust definition:
 * ```rust
 * pub struct BiometricQuality {
 *   pub minimum_quality: u8,
 *   pub assessment_method: String,
 *   pub multiple_samples: bool,
 *   pub quality_thresholds: Vec<(String, u8)>,
 * }
 * ```
 */
export type BiometricQuality = {
  /** Minimum quality score (0-100) */
  minimumQuality: number;
  /** Quality assessment method (e.g., "NIST", "ISO") */
  assessmentMethod: string;
  /** Multiple samples required for verification */
  multipleSamples: boolean;
  /** Quality thresholds per biometric type */
  qualityThresholds: Array<DecodedStringNumberTuple>;
};

export type BiometricQualityArgs = {
  minimumQuality: number;
  assessmentMethod: string;
  multipleSamples: boolean;
  qualityThresholds: Array<StringNumberTupleInput>;
};

export function getBiometricQualityEncoder(): Encoder<BiometricQualityArgs> {
  return getStructEncoder([
    ['minimumQuality', getU8Encoder()],
    ['assessmentMethod', addEncoderSizePrefix(getUtf8Encoder(), getU32Encoder())],
    ['multipleSamples', getBooleanEncoder()],
    ['qualityThresholds', getArrayEncoder(getStructEncoder([
      ['0', addEncoderSizePrefix(getUtf8Encoder(), getU32Encoder())],
      ['1', getU8Encoder()],
    ]))],
  ]);
}

export function getBiometricQualityDecoder(): Decoder<BiometricQuality> {
  return getStructDecoder([
    ['minimumQuality', getU8Decoder()],
    ['assessmentMethod', addDecoderSizePrefix(getUtf8Decoder(), getU32Decoder())],
    ['multipleSamples', getBooleanDecoder()],
    ['qualityThresholds', getArrayDecoder(getStructDecoder([
      ['0', addDecoderSizePrefix(getUtf8Decoder(), getU32Decoder())],
      ['1', getU8Decoder()],
    ]))],
  ]);
}

export function getBiometricQualityCodec(): Codec<BiometricQualityArgs, BiometricQuality> {
  return combineCodec(getBiometricQualityEncoder(), getBiometricQualityDecoder());
}
