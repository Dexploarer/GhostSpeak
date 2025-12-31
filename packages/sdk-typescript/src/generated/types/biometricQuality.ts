/**
 * Manually created to fix Codama generation issue
 * This type is a nested struct in Rust that wasn't auto-generated
 */

import {
  combineCodec,
  getArrayDecoder,
  getArrayEncoder,
  getBooleanDecoder,
  getBooleanEncoder,
  getStructDecoder,
  getStructEncoder,
  getU8Decoder,
  getU8Encoder,
  getUtf8Decoder,
  getUtf8Encoder,
  type Codec,
  type Decoder,
  type Encoder,
} from '@solana/kit'

export type BiometricQuality = {
  minimumQuality: number
  assessmentMethod: string
  multipleSamples: boolean
  qualityThresholds: Array<{ 0: string; 1: number }>
}

export type BiometricQualityArgs = {
  minimumQuality: number
  assessmentMethod: string
  multipleSamples: boolean
  qualityThresholds: Array<{ 0: string; 1: number }>
}

export function getBiometricQualityEncoder(): Encoder<BiometricQualityArgs> {
  return getStructEncoder([
    ['minimumQuality', getU8Encoder()],
    ['assessmentMethod', getUtf8Encoder()],
    ['multipleSamples', getBooleanEncoder()],
    [
      'qualityThresholds',
      getArrayEncoder(
        getStructEncoder([
          ['0', getUtf8Encoder()],
          ['1', getU8Encoder()],
        ])
      ),
    ],
  ])
}

export function getBiometricQualityDecoder(): Decoder<BiometricQuality> {
  return getStructDecoder([
    ['minimumQuality', getU8Decoder()],
    ['assessmentMethod', getUtf8Decoder()],
    ['multipleSamples', getBooleanDecoder()],
    [
      'qualityThresholds',
      getArrayDecoder(
        getStructDecoder([
          ['0', getUtf8Decoder()],
          ['1', getU8Decoder()],
        ])
      ),
    ],
  ])
}

export function getBiometricQualityCodec(): Codec<BiometricQualityArgs, BiometricQuality> {
  return combineCodec(getBiometricQualityEncoder(), getBiometricQualityDecoder())
}
