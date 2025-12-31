/**
 * Manual stub for ReportEntry (audit.rs:557-582)
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
  getU8Encoder,
  getU8Decoder,
  getI64Encoder,
  getI64Decoder,
  getOptionEncoder,
  getOptionDecoder,
  getArrayEncoder,
  getArrayDecoder,
  getAddressEncoder,
  getAddressDecoder,
  combineCodec,
  type Encoder,
  type Decoder,
  type Codec,
  type Address,
  type Option,
  type OptionOrNullable,
} from '@solana/kit';
import type { DecodedStringTuple, StringTupleInput } from './common-tuple-types.js';
import {
  getComplianceFlagsEncoder,
  getComplianceFlagsDecoder,
  type ComplianceFlags,
  type ComplianceFlagsArgs,
} from './complianceFlags.js';

export type ReportEntry = {
  timestamp: bigint;
  eventId: string;
  entryType: string;
  amount: Option<bigint>;
  parties: Array<Address>;
  riskScore: number;
  complianceFlags: ComplianceFlags;
  metadata: Array<DecodedStringTuple>;
};

export type ReportEntryArgs = {
  timestamp: number | bigint;
  eventId: string;
  entryType: string;
  amount: OptionOrNullable<number | bigint>;
  parties: Array<Address>;
  riskScore: number;
  complianceFlags: ComplianceFlagsArgs;
  metadata: Array<StringTupleInput>;
};

export function getReportEntryEncoder(): Encoder<ReportEntryArgs> {
  return getStructEncoder([
    ['timestamp', getI64Encoder()],
    ['eventId', addEncoderSizePrefix(getUtf8Encoder(), getU32Encoder())],
    ['entryType', addEncoderSizePrefix(getUtf8Encoder(), getU32Encoder())],
    ['amount', getOptionEncoder(getU64Encoder())],
    ['parties', getArrayEncoder(getAddressEncoder())],
    ['riskScore', getU8Encoder()],
    ['complianceFlags', getComplianceFlagsEncoder()],
    ['metadata', getArrayEncoder(getStructEncoder([
      ['0', addEncoderSizePrefix(getUtf8Encoder(), getU32Encoder())],
      ['1', addEncoderSizePrefix(getUtf8Encoder(), getU32Encoder())],
    ]))],
  ]);
}

export function getReportEntryDecoder(): Decoder<ReportEntry> {
  return getStructDecoder([
    ['timestamp', getI64Decoder()],
    ['eventId', addDecoderSizePrefix(getUtf8Decoder(), getU32Decoder())],
    ['entryType', addDecoderSizePrefix(getUtf8Decoder(), getU32Decoder())],
    ['amount', getOptionDecoder(getU64Decoder())],
    ['parties', getArrayDecoder(getAddressDecoder())],
    ['riskScore', getU8Decoder()],
    ['complianceFlags', getComplianceFlagsDecoder()],
    ['metadata', getArrayDecoder(getStructDecoder([
      ['0', addDecoderSizePrefix(getUtf8Decoder(), getU32Decoder())],
      ['1', addDecoderSizePrefix(getUtf8Decoder(), getU32Decoder())],
    ]))],
  ]);
}

export function getReportEntryCodec(): Codec<ReportEntryArgs, ReportEntry> {
  return combineCodec(getReportEntryEncoder(), getReportEntryDecoder());
}
