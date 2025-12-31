/**
 * Manual stub for ResourceConstraints (security_governance.rs)
 * Simplified: quotas field uses string pairs instead of ResourceQuota struct
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
  getU64Encoder,
  getU64Decoder,
  getArrayEncoder,
  getArrayDecoder,
  combineCodec,
  type Encoder,
  type Decoder,
  type Codec,
} from '@solana/kit';
import type { DecodedStringBigintTuple, StringBigintTupleInput } from './common-tuple-types.js';

export type ResourceConstraints = {
  allowedResourceTypes: Array<string>;
  blockedResourceTypes: Array<string>;
  accessLimits: Array<DecodedStringBigintTuple>;
  compartments: Array<string>;
};

export type ResourceConstraintsArgs = {
  allowedResourceTypes: Array<string>;
  blockedResourceTypes: Array<string>;
  accessLimits: Array<StringBigintTupleInput>;
  compartments: Array<string>;
};

export function getResourceConstraintsEncoder(): Encoder<ResourceConstraintsArgs> {
  return getStructEncoder([
    ['allowedResourceTypes', getArrayEncoder(addEncoderSizePrefix(getUtf8Encoder(), getU32Encoder()))],
    ['blockedResourceTypes', getArrayEncoder(addEncoderSizePrefix(getUtf8Encoder(), getU32Encoder()))],
    ['accessLimits', getArrayEncoder(getStructEncoder([
      ['0', addEncoderSizePrefix(getUtf8Encoder(), getU32Encoder())],
      ['1', getU64Encoder()],
    ]))],
    ['compartments', getArrayEncoder(addEncoderSizePrefix(getUtf8Encoder(), getU32Encoder()))],
  ]);
}

export function getResourceConstraintsDecoder(): Decoder<ResourceConstraints> {
  return getStructDecoder([
    ['allowedResourceTypes', getArrayDecoder(addDecoderSizePrefix(getUtf8Decoder(), getU32Decoder()))],
    ['blockedResourceTypes', getArrayDecoder(addDecoderSizePrefix(getUtf8Decoder(), getU32Decoder()))],
    ['accessLimits', getArrayDecoder(getStructDecoder([
      ['0', addDecoderSizePrefix(getUtf8Decoder(), getU32Decoder())],
      ['1', getU64Decoder()],
    ]))],
    ['compartments', getArrayDecoder(addDecoderSizePrefix(getUtf8Decoder(), getU32Decoder()))],
  ]);
}

export function getResourceConstraintsCodec(): Codec<ResourceConstraintsArgs, ResourceConstraints> {
  return combineCodec(getResourceConstraintsEncoder(), getResourceConstraintsDecoder());
}
