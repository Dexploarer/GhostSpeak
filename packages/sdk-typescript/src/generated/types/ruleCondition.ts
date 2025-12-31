/**
 * Manually created to fix Codama generation issue
 */

import {
  combineCodec,
  getArrayDecoder,
  getArrayEncoder,
  getStructDecoder,
  getStructEncoder,
  getUtf8Decoder,
  getUtf8Encoder,
  type Codec,
  type Decoder,
  type Encoder,
} from '@solana/kit'
import {
  getConditionTypeDecoder,
  getConditionTypeEncoder,
  type ConditionType,
  type ConditionTypeArgs,
} from '.'

export type RuleCondition = {
  conditionType: ConditionType
  subjectAttributes: Array<{ 0: string; 1: string }>
  resourceAttributes: Array<{ 0: string; 1: string }>
  actionAttributes: Array<{ 0: string; 1: string }>
  environmentAttributes: Array<{ 0: string; 1: string }>
}

export type RuleConditionArgs = {
  conditionType: ConditionTypeArgs
  subjectAttributes: Array<{ 0: string; 1: string }>
  resourceAttributes: Array<{ 0: string; 1: string }>
  actionAttributes: Array<{ 0: string; 1: string }>
  environmentAttributes: Array<{ 0: string; 1: string }>
}

const pairEncoder = getStructEncoder([
  ['0', getUtf8Encoder()],
  ['1', getUtf8Encoder()],
])

const pairDecoder = getStructDecoder([
  ['0', getUtf8Decoder()],
  ['1', getUtf8Decoder()],
])

export function getRuleConditionEncoder(): Encoder<RuleConditionArgs> {
  return getStructEncoder([
    ['conditionType', getConditionTypeEncoder()],
    ['subjectAttributes', getArrayEncoder(pairEncoder)],
    ['resourceAttributes', getArrayEncoder(pairEncoder)],
    ['actionAttributes', getArrayEncoder(pairEncoder)],
    ['environmentAttributes', getArrayEncoder(pairEncoder)],
  ])
}

export function getRuleConditionDecoder(): Decoder<RuleCondition> {
  return getStructDecoder([
    ['conditionType', getConditionTypeDecoder()],
    ['subjectAttributes', getArrayDecoder(pairDecoder)],
    ['resourceAttributes', getArrayDecoder(pairDecoder)],
    ['actionAttributes', getArrayDecoder(pairDecoder)],
    ['environmentAttributes', getArrayDecoder(pairDecoder)],
  ])
}

export function getRuleConditionCodec(): Codec<RuleConditionArgs, RuleCondition> {
  return combineCodec(getRuleConditionEncoder(), getRuleConditionDecoder())
}
