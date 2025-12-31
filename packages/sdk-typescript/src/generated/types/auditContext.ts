/**
 * Manual stub for AuditContext (audit.rs:147-169)
 */

import {
  getStructEncoder,
  getStructDecoder,
  getOptionEncoder,
  getOptionDecoder,
  getU64Encoder,
  getU64Decoder,
  getU32Encoder,
  getU32Decoder,
  getAddressEncoder,
  getAddressDecoder,
  addEncoderSizePrefix,
  addDecoderSizePrefix,
  getUtf8Encoder,
  getUtf8Decoder,
  getArrayEncoder,
  getArrayDecoder,
  combineCodec,
  type Encoder,
  type Decoder,
  type Codec,
  type Address,
  type Option,
  type OptionOrNullable,
} from '@solana/kit';
import type { DecodedStringTuple, StringTupleInput } from './common-tuple-types.js';

export type AuditContext = {
  transactionSignature: Option<string>;
  amount: Option<bigint>;
  token: Option<Address>;
  metadata: Array<DecodedStringTuple>;
  riskScore: Option<number>;
  location: Option<string>;
  clientInfo: Option<string>;
};

export type AuditContextArgs = {
  transactionSignature: OptionOrNullable<string>;
  amount: OptionOrNullable<number | bigint>;
  token: OptionOrNullable<Address>;
  metadata: Array<StringTupleInput>;
  riskScore: OptionOrNullable<number>;
  location: OptionOrNullable<string>;
  clientInfo: OptionOrNullable<string>;
};

export function getAuditContextEncoder(): Encoder<AuditContextArgs> {
  return getStructEncoder([
    ['transactionSignature', getOptionEncoder(addEncoderSizePrefix(getUtf8Encoder(), getU32Encoder()))],
    ['amount', getOptionEncoder(getU64Encoder())],
    ['token', getOptionEncoder(getAddressEncoder())],
    ['metadata', getArrayEncoder(getStructEncoder([
      ['0', addEncoderSizePrefix(getUtf8Encoder(), getU32Encoder())],
      ['1', addEncoderSizePrefix(getUtf8Encoder(), getU32Encoder())],
    ]))],
    ['riskScore', getOptionEncoder(getU32Encoder())],
    ['location', getOptionEncoder(addEncoderSizePrefix(getUtf8Encoder(), getU32Encoder()))],
    ['clientInfo', getOptionEncoder(addEncoderSizePrefix(getUtf8Encoder(), getU32Encoder()))],
  ]);
}

export function getAuditContextDecoder(): Decoder<AuditContext> {
  return getStructDecoder([
    ['transactionSignature', getOptionDecoder(addDecoderSizePrefix(getUtf8Decoder(), getU32Decoder()))],
    ['amount', getOptionDecoder(getU64Decoder())],
    ['token', getOptionDecoder(getAddressDecoder())],
    ['metadata', getArrayDecoder(getStructDecoder([
      ['0', addDecoderSizePrefix(getUtf8Decoder(), getU32Decoder())],
      ['1', addDecoderSizePrefix(getUtf8Decoder(), getU32Decoder())],
    ]))],
    ['riskScore', getOptionDecoder(getU32Decoder())],
    ['location', getOptionDecoder(addDecoderSizePrefix(getUtf8Decoder(), getU32Decoder()))],
    ['clientInfo', getOptionDecoder(addDecoderSizePrefix(getUtf8Decoder(), getU32Decoder()))],
  ]);
}

export function getAuditContextCodec(): Codec<AuditContextArgs, AuditContext> {
  return combineCodec(getAuditContextEncoder(), getAuditContextDecoder());
}
