/**
 * Manual stub for Action (security_governance.rs)
 * Simplified: omits ActionConstraint array to avoid circular dependencies
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
  getArrayEncoder,
  getArrayDecoder,
  combineCodec,
  type Encoder,
  type Decoder,
  type Codec,
} from '@solana/kit';
import type { DecodedStringTuple, StringTupleInput } from './common-tuple-types.js';

export type Action = {
  name: string;
  actionType: number; // ActionType enum (u8)
  parameters: Array<DecodedStringTuple>;
};

export type ActionArgs = {
  name: string;
  actionType: number;
  parameters: Array<StringTupleInput>;
};

export function getActionEncoder(): Encoder<ActionArgs> {
  return getStructEncoder([
    ['name', addEncoderSizePrefix(getUtf8Encoder(), getU32Encoder())],
    ['actionType', getU8Encoder()],
    ['parameters', getArrayEncoder(getStructEncoder([
      ['0', addEncoderSizePrefix(getUtf8Encoder(), getU32Encoder())],
      ['1', addEncoderSizePrefix(getUtf8Encoder(), getU32Encoder())],
    ]))],
  ]);
}

export function getActionDecoder(): Decoder<Action> {
  return getStructDecoder([
    ['name', addDecoderSizePrefix(getUtf8Decoder(), getU32Decoder())],
    ['actionType', getU8Decoder()],
    ['parameters', getArrayDecoder(getStructDecoder([
      ['0', addDecoderSizePrefix(getUtf8Decoder(), getU32Decoder())],
      ['1', addDecoderSizePrefix(getUtf8Decoder(), getU32Decoder())],
    ]))],
  ]);
}

export function getActionCodec(): Codec<ActionArgs, Action> {
  return combineCodec(getActionEncoder(), getActionDecoder());
}
