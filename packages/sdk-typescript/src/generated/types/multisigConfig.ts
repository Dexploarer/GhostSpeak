/**
 * Manually created to fix Codama generation issue
 */

import {
  combineCodec,
  getArrayDecoder,
  getArrayEncoder,
  getBooleanDecoder,
  getBooleanEncoder,
  getI64Decoder,
  getI64Encoder,
  getOptionDecoder,
  getOptionEncoder,
  getStructDecoder,
  getStructEncoder,
  getU8Decoder,
  getU8Encoder,
  type Codec,
  type Decoder,
  type Encoder,
  type Option,
  type OptionOrNullable,
} from '@solana/kit'
import {
  getTransactionTypeDecoder,
  getTransactionTypeEncoder,
  type TransactionType,
  type TransactionTypeArgs,
} from '.'

export type MultisigConfig = {
  maxSigners: number
  defaultTimeout: bigint
  allowEmergencyOverride: boolean
  emergencyThreshold: Option<number>
  autoExecute: boolean
  signerChangeThreshold: number
  allowedTransactionTypes: Array<TransactionType>
}

export type MultisigConfigArgs = {
  maxSigners: number
  defaultTimeout: number | bigint
  allowEmergencyOverride: boolean
  emergencyThreshold: OptionOrNullable<number>
  autoExecute: boolean
  signerChangeThreshold: number
  allowedTransactionTypes: Array<TransactionTypeArgs>
}

export function getMultisigConfigEncoder(): Encoder<MultisigConfigArgs> {
  return getStructEncoder([
    ['maxSigners', getU8Encoder()],
    ['defaultTimeout', getI64Encoder()],
    ['allowEmergencyOverride', getBooleanEncoder()],
    ['emergencyThreshold', getOptionEncoder(getU8Encoder())],
    ['autoExecute', getBooleanEncoder()],
    ['signerChangeThreshold', getU8Encoder()],
    ['allowedTransactionTypes', getArrayEncoder(getTransactionTypeEncoder())],
  ])
}

export function getMultisigConfigDecoder(): Decoder<MultisigConfig> {
  return getStructDecoder([
    ['maxSigners', getU8Decoder()],
    ['defaultTimeout', getI64Decoder()],
    ['allowEmergencyOverride', getBooleanDecoder()],
    ['emergencyThreshold', getOptionDecoder(getU8Decoder())],
    ['autoExecute', getBooleanDecoder()],
    ['signerChangeThreshold', getU8Decoder()],
    ['allowedTransactionTypes', getArrayDecoder(getTransactionTypeDecoder())],
  ])
}

export function getMultisigConfigCodec(): Codec<MultisigConfigArgs, MultisigConfig> {
  return combineCodec(getMultisigConfigEncoder(), getMultisigConfigDecoder())
}
