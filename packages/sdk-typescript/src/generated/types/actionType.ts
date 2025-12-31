/**
 * Manually created to fix Codama generation issue
 */

import {
  combineCodec,
  getU8Decoder,
  getU8Encoder,
  type Codec,
  type Decoder,
  type Encoder,
} from '@solana/kit'

export enum ActionType {
  Create,
  Read,
  Update,
  Delete,
  Execute,
  Approve,
  Reject,
  Transfer,
  Lock,
  Unlock,
}

export type ActionTypeArgs = ActionType

export function getActionTypeEncoder(): Encoder<ActionTypeArgs> {
  return getU8Encoder()
}

export function getActionTypeDecoder(): Decoder<ActionType> {
  return getU8Decoder()
}

export function getActionTypeCodec(): Codec<ActionTypeArgs, ActionType> {
  return combineCodec(getActionTypeEncoder(), getActionTypeDecoder())
}
