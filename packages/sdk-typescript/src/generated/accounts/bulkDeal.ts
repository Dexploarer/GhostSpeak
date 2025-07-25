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
  getF64Decoder,
  getF64Encoder,
  getI64Decoder,
  getI64Encoder,
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
  type ReadonlyUint8Array,
} from '@solana/kit';
import {
  getDealTypeDecoder,
  getDealTypeEncoder,
  getVolumeTierDecoder,
  getVolumeTierEncoder,
  type DealType,
  type DealTypeArgs,
  type VolumeTier,
  type VolumeTierArgs,
} from '../types';

export const BULK_DEAL_DISCRIMINATOR = new Uint8Array([
  80, 240, 220, 203, 97, 75, 125, 183,
]);

export function getBulkDealDiscriminatorBytes() {
  return fixEncoderSize(getBytesEncoder(), 8).encode(BULK_DEAL_DISCRIMINATOR);
}

export type BulkDeal = {
  discriminator: ReadonlyUint8Array;
  dealId: bigint;
  agent: Address;
  customer: Address;
  dealType: DealType;
  totalVolume: number;
  totalValue: bigint;
  discountPercentage: number;
  volumeTiers: Array<VolumeTier>;
  slaTerms: string;
  contractDuration: bigint;
  startDate: bigint;
  endDate: bigint;
  isActive: boolean;
  createdAt: bigint;
  executedVolume: number;
  bump: number;
};

export type BulkDealArgs = {
  dealId: number | bigint;
  agent: Address;
  customer: Address;
  dealType: DealTypeArgs;
  totalVolume: number;
  totalValue: number | bigint;
  discountPercentage: number;
  volumeTiers: Array<VolumeTierArgs>;
  slaTerms: string;
  contractDuration: number | bigint;
  startDate: number | bigint;
  endDate: number | bigint;
  isActive: boolean;
  createdAt: number | bigint;
  executedVolume: number;
  bump: number;
};

export function getBulkDealEncoder(): Encoder<BulkDealArgs> {
  return transformEncoder(
    getStructEncoder([
      ['discriminator', fixEncoderSize(getBytesEncoder(), 8)],
      ['dealId', getU64Encoder()],
      ['agent', getAddressEncoder()],
      ['customer', getAddressEncoder()],
      ['dealType', getDealTypeEncoder()],
      ['totalVolume', getU32Encoder()],
      ['totalValue', getU64Encoder()],
      ['discountPercentage', getF64Encoder()],
      ['volumeTiers', getArrayEncoder(getVolumeTierEncoder())],
      ['slaTerms', addEncoderSizePrefix(getUtf8Encoder(), getU32Encoder())],
      ['contractDuration', getI64Encoder()],
      ['startDate', getI64Encoder()],
      ['endDate', getI64Encoder()],
      ['isActive', getBooleanEncoder()],
      ['createdAt', getI64Encoder()],
      ['executedVolume', getU32Encoder()],
      ['bump', getU8Encoder()],
    ]),
    (value) => ({ ...value, discriminator: BULK_DEAL_DISCRIMINATOR })
  );
}

export function getBulkDealDecoder(): Decoder<BulkDeal> {
  return getStructDecoder([
    ['discriminator', fixDecoderSize(getBytesDecoder(), 8)],
    ['dealId', getU64Decoder()],
    ['agent', getAddressDecoder()],
    ['customer', getAddressDecoder()],
    ['dealType', getDealTypeDecoder()],
    ['totalVolume', getU32Decoder()],
    ['totalValue', getU64Decoder()],
    ['discountPercentage', getF64Decoder()],
    ['volumeTiers', getArrayDecoder(getVolumeTierDecoder())],
    ['slaTerms', addDecoderSizePrefix(getUtf8Decoder(), getU32Decoder())],
    ['contractDuration', getI64Decoder()],
    ['startDate', getI64Decoder()],
    ['endDate', getI64Decoder()],
    ['isActive', getBooleanDecoder()],
    ['createdAt', getI64Decoder()],
    ['executedVolume', getU32Decoder()],
    ['bump', getU8Decoder()],
  ]);
}

export function getBulkDealCodec(): Codec<BulkDealArgs, BulkDeal> {
  return combineCodec(getBulkDealEncoder(), getBulkDealDecoder());
}

export function decodeBulkDeal<TAddress extends string = string>(
  encodedAccount: EncodedAccount<TAddress>
): Account<BulkDeal, TAddress>;
export function decodeBulkDeal<TAddress extends string = string>(
  encodedAccount: MaybeEncodedAccount<TAddress>
): MaybeAccount<BulkDeal, TAddress>;
export function decodeBulkDeal<TAddress extends string = string>(
  encodedAccount: EncodedAccount<TAddress> | MaybeEncodedAccount<TAddress>
): Account<BulkDeal, TAddress> | MaybeAccount<BulkDeal, TAddress> {
  return decodeAccount(
    encodedAccount as MaybeEncodedAccount<TAddress>,
    getBulkDealDecoder()
  );
}

export async function fetchBulkDeal<TAddress extends string = string>(
  rpc: Parameters<typeof fetchEncodedAccount>[0],
  address: Address<TAddress>,
  config?: FetchAccountConfig
): Promise<Account<BulkDeal, TAddress>> {
  const maybeAccount = await fetchMaybeBulkDeal(rpc, address, config);
  assertAccountExists(maybeAccount);
  return maybeAccount;
}

export async function fetchMaybeBulkDeal<TAddress extends string = string>(
  rpc: Parameters<typeof fetchEncodedAccount>[0],
  address: Address<TAddress>,
  config?: FetchAccountConfig
): Promise<MaybeAccount<BulkDeal, TAddress>> {
  const maybeAccount = await fetchEncodedAccount(rpc, address, config);
  return decodeBulkDeal(maybeAccount);
}

export async function fetchAllBulkDeal(
  rpc: Parameters<typeof fetchEncodedAccounts>[0],
  addresses: Array<Address>,
  config?: FetchAccountsConfig
): Promise<Account<BulkDeal>[]> {
  const maybeAccounts = await fetchAllMaybeBulkDeal(rpc, addresses, config);
  assertAccountsExist(maybeAccounts);
  return maybeAccounts;
}

export async function fetchAllMaybeBulkDeal(
  rpc: Parameters<typeof fetchEncodedAccounts>[0],
  addresses: Array<Address>,
  config?: FetchAccountsConfig
): Promise<MaybeAccount<BulkDeal>[]> {
  const maybeAccounts = await fetchEncodedAccounts(rpc, addresses, config);
  return maybeAccounts.map((maybeAccount) => decodeBulkDeal(maybeAccount));
}
