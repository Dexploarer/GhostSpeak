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
  fixDecoderSize,
  fixEncoderSize,
  getAddressDecoder,
  getAddressEncoder,
  getBytesDecoder,
  getBytesEncoder,
  getI64Decoder,
  getI64Encoder,
  getOptionDecoder,
  getOptionEncoder,
  getStructDecoder,
  getStructEncoder,
  getU32Decoder,
  getU32Encoder,
  getUtf8Decoder,
  getUtf8Encoder,
  type Address,
  type Codec,
  type Decoder,
  type Encoder,
  type Option,
  type OptionOrNullable,
  type ReadonlyUint8Array,
} from '@solana/kit';

/** Individual signature in multisig */
export type MultisigSignature = {
  /** Signer public key */
  signer: Address;
  /** Signature data */
  signature: ReadonlyUint8Array;
  /** Signature timestamp */
  signedAt: bigint;
  /** Signature method/algorithm */
  signatureMethod: string;
  /** Additional verification data */
  verificationData: Option<ReadonlyUint8Array>;
};

export type MultisigSignatureArgs = {
  /** Signer public key */
  signer: Address;
  /** Signature data */
  signature: ReadonlyUint8Array;
  /** Signature timestamp */
  signedAt: number | bigint;
  /** Signature method/algorithm */
  signatureMethod: string;
  /** Additional verification data */
  verificationData: OptionOrNullable<ReadonlyUint8Array>;
};

export function getMultisigSignatureEncoder(): Encoder<MultisigSignatureArgs> {
  return getStructEncoder([
    ['signer', getAddressEncoder()],
    ['signature', fixEncoderSize(getBytesEncoder(), 64)],
    ['signedAt', getI64Encoder()],
    [
      'signatureMethod',
      addEncoderSizePrefix(getUtf8Encoder(), getU32Encoder()),
    ],
    [
      'verificationData',
      getOptionEncoder(
        addEncoderSizePrefix(getBytesEncoder(), getU32Encoder())
      ),
    ],
  ]);
}

export function getMultisigSignatureDecoder(): Decoder<MultisigSignature> {
  return getStructDecoder([
    ['signer', getAddressDecoder()],
    ['signature', fixDecoderSize(getBytesDecoder(), 64)],
    ['signedAt', getI64Decoder()],
    [
      'signatureMethod',
      addDecoderSizePrefix(getUtf8Decoder(), getU32Decoder()),
    ],
    [
      'verificationData',
      getOptionDecoder(
        addDecoderSizePrefix(getBytesDecoder(), getU32Decoder())
      ),
    ],
  ]);
}

export function getMultisigSignatureCodec(): Codec<
  MultisigSignatureArgs,
  MultisigSignature
> {
  return combineCodec(
    getMultisigSignatureEncoder(),
    getMultisigSignatureDecoder()
  );
}
