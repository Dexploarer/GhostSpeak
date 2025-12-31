/**
 * Manually created to fix Codama generation issue
 * This type is a nested struct in Rust that wasn't auto-generated
 */

import {
  combineCodec,
  getAddressDecoder,
  getAddressEncoder,
  getArrayDecoder,
  getArrayEncoder,
  getOptionDecoder,
  getOptionEncoder,
  getStructDecoder,
  getStructEncoder,
  getU32Decoder,
  getU32Encoder,
  getU64Decoder,
  getU64Encoder,
  getUtf8Decoder,
  getUtf8Encoder,
  type Address,
  type Codec,
  type Decoder,
  type Encoder,
  type Option,
  type OptionOrNullable,
} from '@solana/kit'

export type AuditContext = {
  transactionSignature: Option<string>
  amount: Option<bigint>
  token: Option<Address>
  metadata: Array<{ 0: string; 1: string }>
  riskScore: Option<number>
  location: Option<string>
  clientInfo: Option<string>
}

export type AuditContextArgs = {
  transactionSignature: OptionOrNullable<string>
  amount: OptionOrNullable<number | bigint>
  token: OptionOrNullable<Address>
  metadata: Array<{ 0: string; 1: string }>
  riskScore: OptionOrNullable<number>
  location: OptionOrNullable<string>
  clientInfo: OptionOrNullable<string>
}

export function getAuditContextEncoder(): Encoder<AuditContextArgs> {
  return getStructEncoder([
    ['transactionSignature', getOptionEncoder(getUtf8Encoder())],
    ['amount', getOptionEncoder(getU64Encoder())],
    ['token', getOptionEncoder(getAddressEncoder())],
    [
      'metadata',
      getArrayEncoder(
        getStructEncoder([
          ['0', getUtf8Encoder()],
          ['1', getUtf8Encoder()],
        ])
      ),
    ],
    ['riskScore', getOptionEncoder(getU32Encoder())],
    ['location', getOptionEncoder(getUtf8Encoder())],
    ['clientInfo', getOptionEncoder(getUtf8Encoder())],
  ])
}

export function getAuditContextDecoder(): Decoder<AuditContext> {
  return getStructDecoder([
    ['transactionSignature', getOptionDecoder(getUtf8Decoder())],
    ['amount', getOptionDecoder(getU64Decoder())],
    ['token', getOptionDecoder(getAddressDecoder())],
    [
      'metadata',
      getArrayDecoder(
        getStructDecoder([
          ['0', getUtf8Decoder()],
          ['1', getUtf8Decoder()],
        ])
      ),
    ],
    ['riskScore', getOptionDecoder(getU32Decoder())],
    ['location', getOptionDecoder(getUtf8Decoder())],
    ['clientInfo', getOptionDecoder(getUtf8Decoder())],
  ])
}

export function getAuditContextCodec(): Codec<AuditContextArgs, AuditContext> {
  return combineCodec(getAuditContextEncoder(), getAuditContextDecoder())
}
