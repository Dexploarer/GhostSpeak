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

// Simplified version - full nested types not implemented yet
export type ActionConstraint = {
  name: string
  preConditions: Array<string>
  postConditions: Array<string>
}

export type ActionConstraintArgs = {
  name: string
  preConditions: Array<string>
  postConditions: Array<string>
}

export function getActionConstraintEncoder(): Encoder<ActionConstraintArgs> {
  return getStructEncoder([
    ['name', getUtf8Encoder()],
    ['preConditions', getArrayEncoder(getUtf8Encoder())],
    ['postConditions', getArrayEncoder(getUtf8Encoder())],
  ])
}

export function getActionConstraintDecoder(): Decoder<ActionConstraint> {
  return getStructDecoder([
    ['name', getUtf8Decoder()],
    ['preConditions', getArrayDecoder(getUtf8Decoder())],
    ['postConditions', getArrayDecoder(getUtf8Decoder())],
  ])
}

export function getActionConstraintCodec(): Codec<ActionConstraintArgs, ActionConstraint> {
  return combineCodec(getActionConstraintEncoder(), getActionConstraintDecoder())
}
