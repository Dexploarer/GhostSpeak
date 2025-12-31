/**
 * Manual stub for RuleCondition (security_governance.rs)
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

export type RuleCondition = {
  conditionType: number; // ConditionType enum
  subjectAttributes: Array<DecodedStringTuple>;
  resourceAttributes: Array<DecodedStringTuple>;
  actionAttributes: Array<DecodedStringTuple>;
  environmentAttributes: Array<DecodedStringTuple>;
};

export type RuleConditionArgs = {
  conditionType: number;
  subjectAttributes: Array<StringTupleInput>;
  resourceAttributes: Array<StringTupleInput>;
  actionAttributes: Array<StringTupleInput>;
  environmentAttributes: Array<StringTupleInput>;
};

export function getRuleConditionEncoder(): Encoder<RuleConditionArgs> {
  return getStructEncoder([
    ['conditionType', getU8Encoder()],
    ['subjectAttributes', getArrayEncoder(getStructEncoder([
      ['0', addEncoderSizePrefix(getUtf8Encoder(), getU32Encoder())],
      ['1', addEncoderSizePrefix(getUtf8Encoder(), getU32Encoder())],
    ]))],
    ['resourceAttributes', getArrayEncoder(getStructEncoder([
      ['0', addEncoderSizePrefix(getUtf8Encoder(), getU32Encoder())],
      ['1', addEncoderSizePrefix(getUtf8Encoder(), getU32Encoder())],
    ]))],
    ['actionAttributes', getArrayEncoder(getStructEncoder([
      ['0', addEncoderSizePrefix(getUtf8Encoder(), getU32Encoder())],
      ['1', addEncoderSizePrefix(getUtf8Encoder(), getU32Encoder())],
    ]))],
    ['environmentAttributes', getArrayEncoder(getStructEncoder([
      ['0', addEncoderSizePrefix(getUtf8Encoder(), getU32Encoder())],
      ['1', addEncoderSizePrefix(getUtf8Encoder(), getU32Encoder())],
    ]))],
  ]);
}

export function getRuleConditionDecoder(): Decoder<RuleCondition> {
  return getStructDecoder([
    ['conditionType', getU8Decoder()],
    ['subjectAttributes', getArrayDecoder(getStructDecoder([
      ['0', addDecoderSizePrefix(getUtf8Decoder(), getU32Decoder())],
      ['1', addDecoderSizePrefix(getUtf8Decoder(), getU32Decoder())],
    ]))],
    ['resourceAttributes', getArrayDecoder(getStructDecoder([
      ['0', addDecoderSizePrefix(getUtf8Decoder(), getU32Decoder())],
      ['1', addDecoderSizePrefix(getUtf8Decoder(), getU32Decoder())],
    ]))],
    ['actionAttributes', getArrayDecoder(getStructDecoder([
      ['0', addDecoderSizePrefix(getUtf8Decoder(), getU32Decoder())],
      ['1', addDecoderSizePrefix(getUtf8Decoder(), getU32Decoder())],
    ]))],
    ['environmentAttributes', getArrayDecoder(getStructDecoder([
      ['0', addDecoderSizePrefix(getUtf8Decoder(), getU32Decoder())],
      ['1', addDecoderSizePrefix(getUtf8Decoder(), getU32Decoder())],
    ]))],
  ]);
}

export function getRuleConditionCodec(): Codec<RuleConditionArgs, RuleCondition> {
  return combineCodec(getRuleConditionEncoder(), getRuleConditionDecoder());
}
