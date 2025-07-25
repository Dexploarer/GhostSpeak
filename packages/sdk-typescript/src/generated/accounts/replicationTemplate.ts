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
  assertAccountExists,
  assertAccountsExist,
  combineCodec,
  decodeAccount,
  fetchEncodedAccount,
  fetchEncodedAccounts,
  fixDecoderSize,
  fixEncoderSize,
  getAddressDecoder,
  getAddressEncoder,
  getArrayDecoder,
  getArrayEncoder,
  getBooleanDecoder,
  getBooleanEncoder,
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
  getU64Decoder,
  getU64Encoder,
  getU8Decoder,
  getU8Encoder,
  getUtf8Decoder,
  getUtf8Encoder,
  transformEncoder,
  type Account,
  type Address,
  type Codec,
  type Decoder,
  type EncodedAccount,
  type Encoder,
  type FetchAccountConfig,
  type FetchAccountsConfig,
  type MaybeAccount,
  type MaybeEncodedAccount,
  type Option,
  type OptionOrNullable,
  type ReadonlyUint8Array,
} from '@solana/kit';

export const REPLICATION_TEMPLATE_DISCRIMINATOR = new Uint8Array([
  219, 78, 120, 167, 202, 67, 57, 204,
]);

export function getReplicationTemplateDiscriminatorBytes() {
  return fixEncoderSize(getBytesEncoder(), 8).encode(
    REPLICATION_TEMPLATE_DISCRIMINATOR
  );
}

export type ReplicationTemplate = {
  discriminator: ReadonlyUint8Array;
  sourceAgent: Address;
  creator: Address;
  genomeHash: string;
  baseCapabilities: Array<string>;
  replicationFee: bigint;
  maxReplications: number;
  currentReplications: number;
  isActive: boolean;
  createdAt: bigint;
  cnftAssetId: Option<Address>;
  merkleTree: Option<Address>;
  metadataUri: string;
  bump: number;
};

export type ReplicationTemplateArgs = {
  sourceAgent: Address;
  creator: Address;
  genomeHash: string;
  baseCapabilities: Array<string>;
  replicationFee: number | bigint;
  maxReplications: number;
  currentReplications: number;
  isActive: boolean;
  createdAt: number | bigint;
  cnftAssetId: OptionOrNullable<Address>;
  merkleTree: OptionOrNullable<Address>;
  metadataUri: string;
  bump: number;
};

export function getReplicationTemplateEncoder(): Encoder<ReplicationTemplateArgs> {
  return transformEncoder(
    getStructEncoder([
      ['discriminator', fixEncoderSize(getBytesEncoder(), 8)],
      ['sourceAgent', getAddressEncoder()],
      ['creator', getAddressEncoder()],
      ['genomeHash', addEncoderSizePrefix(getUtf8Encoder(), getU32Encoder())],
      [
        'baseCapabilities',
        getArrayEncoder(
          addEncoderSizePrefix(getUtf8Encoder(), getU32Encoder())
        ),
      ],
      ['replicationFee', getU64Encoder()],
      ['maxReplications', getU32Encoder()],
      ['currentReplications', getU32Encoder()],
      ['isActive', getBooleanEncoder()],
      ['createdAt', getI64Encoder()],
      ['cnftAssetId', getOptionEncoder(getAddressEncoder())],
      ['merkleTree', getOptionEncoder(getAddressEncoder())],
      ['metadataUri', addEncoderSizePrefix(getUtf8Encoder(), getU32Encoder())],
      ['bump', getU8Encoder()],
    ]),
    (value) => ({ ...value, discriminator: REPLICATION_TEMPLATE_DISCRIMINATOR })
  );
}

export function getReplicationTemplateDecoder(): Decoder<ReplicationTemplate> {
  return getStructDecoder([
    ['discriminator', fixDecoderSize(getBytesDecoder(), 8)],
    ['sourceAgent', getAddressDecoder()],
    ['creator', getAddressDecoder()],
    ['genomeHash', addDecoderSizePrefix(getUtf8Decoder(), getU32Decoder())],
    [
      'baseCapabilities',
      getArrayDecoder(addDecoderSizePrefix(getUtf8Decoder(), getU32Decoder())),
    ],
    ['replicationFee', getU64Decoder()],
    ['maxReplications', getU32Decoder()],
    ['currentReplications', getU32Decoder()],
    ['isActive', getBooleanDecoder()],
    ['createdAt', getI64Decoder()],
    ['cnftAssetId', getOptionDecoder(getAddressDecoder())],
    ['merkleTree', getOptionDecoder(getAddressDecoder())],
    ['metadataUri', addDecoderSizePrefix(getUtf8Decoder(), getU32Decoder())],
    ['bump', getU8Decoder()],
  ]);
}

export function getReplicationTemplateCodec(): Codec<
  ReplicationTemplateArgs,
  ReplicationTemplate
> {
  return combineCodec(
    getReplicationTemplateEncoder(),
    getReplicationTemplateDecoder()
  );
}

export function decodeReplicationTemplate<TAddress extends string = string>(
  encodedAccount: EncodedAccount<TAddress>
): Account<ReplicationTemplate, TAddress>;
export function decodeReplicationTemplate<TAddress extends string = string>(
  encodedAccount: MaybeEncodedAccount<TAddress>
): MaybeAccount<ReplicationTemplate, TAddress>;
export function decodeReplicationTemplate<TAddress extends string = string>(
  encodedAccount: EncodedAccount<TAddress> | MaybeEncodedAccount<TAddress>
):
  | Account<ReplicationTemplate, TAddress>
  | MaybeAccount<ReplicationTemplate, TAddress> {
  return decodeAccount(
    encodedAccount as MaybeEncodedAccount<TAddress>,
    getReplicationTemplateDecoder()
  );
}

export async function fetchReplicationTemplate<
  TAddress extends string = string,
>(
  rpc: Parameters<typeof fetchEncodedAccount>[0],
  address: Address<TAddress>,
  config?: FetchAccountConfig
): Promise<Account<ReplicationTemplate, TAddress>> {
  const maybeAccount = await fetchMaybeReplicationTemplate(
    rpc,
    address,
    config
  );
  assertAccountExists(maybeAccount);
  return maybeAccount;
}

export async function fetchMaybeReplicationTemplate<
  TAddress extends string = string,
>(
  rpc: Parameters<typeof fetchEncodedAccount>[0],
  address: Address<TAddress>,
  config?: FetchAccountConfig
): Promise<MaybeAccount<ReplicationTemplate, TAddress>> {
  const maybeAccount = await fetchEncodedAccount(rpc, address, config);
  return decodeReplicationTemplate(maybeAccount);
}

export async function fetchAllReplicationTemplate(
  rpc: Parameters<typeof fetchEncodedAccounts>[0],
  addresses: Array<Address>,
  config?: FetchAccountsConfig
): Promise<Account<ReplicationTemplate>[]> {
  const maybeAccounts = await fetchAllMaybeReplicationTemplate(
    rpc,
    addresses,
    config
  );
  assertAccountsExist(maybeAccounts);
  return maybeAccounts;
}

export async function fetchAllMaybeReplicationTemplate(
  rpc: Parameters<typeof fetchEncodedAccounts>[0],
  addresses: Array<Address>,
  config?: FetchAccountsConfig
): Promise<MaybeAccount<ReplicationTemplate>[]> {
  const maybeAccounts = await fetchEncodedAccounts(rpc, addresses, config);
  return maybeAccounts.map((maybeAccount) =>
    decodeReplicationTemplate(maybeAccount)
  );
}
