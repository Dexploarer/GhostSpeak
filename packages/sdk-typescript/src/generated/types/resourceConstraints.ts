/**
 * Manually created to fix Codama generation issue
 * Simplified stub version - not used in core staking/agent flow
 */

import {
  combineCodec,
  getArrayDecoder,
  getArrayEncoder,
  getStructDecoder,
  getStructEncoder,
  getU64Decoder,
  getU64Encoder,
  getUtf8Decoder,
  getUtf8Encoder,
  type Codec,
  type Decoder,
  type Encoder,
} from '@solana/kit'

export type ResourceConstraints = {
  allowedResourceTypes: Array<string>
  blockedResourceTypes: Array<string>
  accessLimits: Array<{ 0: string; 1: bigint }>
  compartments: Array<string>
}

export type ResourceConstraintsArgs = {
  allowedResourceTypes: Array<string>
  blockedResourceTypes: Array<string>
  accessLimits: Array<{ 0: string; 1: number | bigint }>
  compartments: Array<string>
}

export function getResourceConstraintsEncoder(): Encoder<ResourceConstraintsArgs> {
  return getStructEncoder([
    ['allowedResourceTypes', getArrayEncoder(getUtf8Encoder())],
    ['blockedResourceTypes', getArrayEncoder(getUtf8Encoder())],
    [
      'accessLimits',
      getArrayEncoder(
        getStructEncoder([
          ['0', getUtf8Encoder()],
          ['1', getU64Encoder()],
        ])
      ),
    ],
    ['compartments', getArrayEncoder(getUtf8Encoder())],
  ])
}

export function getResourceConstraintsDecoder(): Decoder<ResourceConstraints> {
  return getStructDecoder([
    ['allowedResourceTypes', getArrayDecoder(getUtf8Decoder())],
    ['blockedResourceTypes', getArrayDecoder(getUtf8Decoder())],
    [
      'accessLimits',
      getArrayDecoder(
        getStructDecoder([
          ['0', getUtf8Decoder()],
          ['1', getU64Decoder()],
        ])
      ),
    ],
    ['compartments', getArrayDecoder(getUtf8Decoder())],
  ])
}

export function getResourceConstraintsCodec(): Codec<
  ResourceConstraintsArgs,
  ResourceConstraints
> {
  return combineCodec(getResourceConstraintsEncoder(), getResourceConstraintsDecoder())
}
