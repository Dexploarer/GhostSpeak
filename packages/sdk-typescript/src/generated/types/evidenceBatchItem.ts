/**
 * This code was AUTOGENERATED using the codama library.
 * Please DO NOT EDIT THIS FILE, instead use visitors
 * to add features, then rerun codama to update it.
 *
 * @see https://github.com/codama-idl/codama
 */

import {
  addDecoderSizePrefix,
  addEncoderSizePrefix,
  combineCodec,
  getStructDecoder,
  getStructEncoder,
  getU32Decoder,
  getU32Encoder,
  getUtf8Decoder,
  getUtf8Encoder,
  type Codec,
  type Decoder,
  type Encoder,
} from '@solana/kit';

export type EvidenceBatchItem = { evidenceType: string; evidenceData: string };

export type EvidenceBatchItemArgs = EvidenceBatchItem;

export function getEvidenceBatchItemEncoder(): Encoder<EvidenceBatchItemArgs> {
  return getStructEncoder([
    ['evidenceType', addEncoderSizePrefix(getUtf8Encoder(), getU32Encoder())],
    ['evidenceData', addEncoderSizePrefix(getUtf8Encoder(), getU32Encoder())],
  ]);
}

export function getEvidenceBatchItemDecoder(): Decoder<EvidenceBatchItem> {
  return getStructDecoder([
    ['evidenceType', addDecoderSizePrefix(getUtf8Decoder(), getU32Decoder())],
    ['evidenceData', addDecoderSizePrefix(getUtf8Decoder(), getU32Decoder())],
  ]);
}

export function getEvidenceBatchItemCodec(): Codec<
  EvidenceBatchItemArgs,
  EvidenceBatchItem
> {
  return combineCodec(
    getEvidenceBatchItemEncoder(),
    getEvidenceBatchItemDecoder()
  );
}
