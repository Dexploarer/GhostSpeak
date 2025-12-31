/**
 * Manually created to fix Codama generation issue
 */

import {
  combineCodec,
  getAddressDecoder,
  getAddressEncoder,
  getArrayDecoder,
  getArrayEncoder,
  getI64Decoder,
  getI64Encoder,
  getOptionDecoder,
  getOptionEncoder,
  getStructDecoder,
  getStructEncoder,
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

export type ReportEntry = {
  timestamp: bigint
  eventId: string
  entryType: string
  amount: Option<bigint>
  parties: Array<Address>
}

export type ReportEntryArgs = {
  timestamp: number | bigint
  eventId: string
  entryType: string
  amount: OptionOrNullable<number | bigint>
  parties: Array<Address>
}

export function getReportEntryEncoder(): Encoder<ReportEntryArgs> {
  return getStructEncoder([
    ['timestamp', getI64Encoder()],
    ['eventId', getUtf8Encoder()],
    ['entryType', getUtf8Encoder()],
    ['amount', getOptionEncoder(getU64Encoder())],
    ['parties', getArrayEncoder(getAddressEncoder())],
  ])
}

export function getReportEntryDecoder(): Decoder<ReportEntry> {
  return getStructDecoder([
    ['timestamp', getI64Decoder()],
    ['eventId', getUtf8Decoder()],
    ['entryType', getUtf8Decoder()],
    ['amount', getOptionDecoder(getU64Decoder())],
    ['parties', getArrayDecoder(getAddressDecoder())],
  ])
}

export function getReportEntryCodec(): Codec<ReportEntryArgs, ReportEntry> {
  return combineCodec(getReportEntryEncoder(), getReportEntryDecoder())
}
