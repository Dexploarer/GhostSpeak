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
  getActionConstraintDecoder,
  getActionConstraintEncoder,
  getActionTypeDecoder,
  getActionTypeEncoder,
  type ActionConstraint,
  type ActionConstraintArgs,
  type ActionType,
  type ActionTypeArgs,
} from '.'

export type Action = {
  name: string
  actionType: ActionType
  parameters: Array<{ 0: string; 1: string }>
  constraints: Array<ActionConstraint>
}

export type ActionArgs = {
  name: string
  actionType: ActionTypeArgs
  parameters: Array<{ 0: string; 1: string }>
  constraints: Array<ActionConstraintArgs>
}

export function getActionEncoder(): Encoder<ActionArgs> {
  return getStructEncoder([
    ['name', getUtf8Encoder()],
    ['actionType', getActionTypeEncoder()],
    [
      'parameters',
      getArrayEncoder(
        getStructEncoder([
          ['0', getUtf8Encoder()],
          ['1', getUtf8Encoder()],
        ])
      ),
    ],
    ['constraints', getArrayEncoder(getActionConstraintEncoder())],
  ])
}

export function getActionDecoder(): Decoder<Action> {
  return getStructDecoder([
    ['name', getUtf8Decoder()],
    ['actionType', getActionTypeDecoder()],
    [
      'parameters',
      getArrayDecoder(
        getStructDecoder([
          ['0', getUtf8Decoder()],
          ['1', getUtf8Decoder()],
        ])
      ),
    ],
    ['constraints', getArrayDecoder(getActionConstraintDecoder())],
  ])
}

export function getActionCodec(): Codec<ActionArgs, Action> {
  return combineCodec(getActionEncoder(), getActionDecoder())
}
