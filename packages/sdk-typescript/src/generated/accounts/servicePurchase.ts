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
  getPurchaseStatusDecoder,
  getPurchaseStatusEncoder,
  type PurchaseStatus,
  type PurchaseStatusArgs,
} from '../types';

export const SERVICE_PURCHASE_DISCRIMINATOR = new Uint8Array([
  84, 229, 182, 61, 144, 151, 103, 149,
]);

export function getServicePurchaseDiscriminatorBytes() {
  return fixEncoderSize(getBytesEncoder(), 8).encode(
    SERVICE_PURCHASE_DISCRIMINATOR
  );
}

export type ServicePurchase = {
  discriminator: ReadonlyUint8Array;
  customer: Address;
  agent: Address;
  listing: Address;
  listingId: bigint;
  quantity: number;
  requirements: Array<string>;
  customInstructions: string;
  deadline: bigint;
  paymentAmount: bigint;
  paymentToken: Address;
  status: PurchaseStatus;
  purchasedAt: bigint;
  updatedAt: bigint;
  transferHookApplied: boolean;
  bump: number;
};

export type ServicePurchaseArgs = {
  customer: Address;
  agent: Address;
  listing: Address;
  listingId: number | bigint;
  quantity: number;
  requirements: Array<string>;
  customInstructions: string;
  deadline: number | bigint;
  paymentAmount: number | bigint;
  paymentToken: Address;
  status: PurchaseStatusArgs;
  purchasedAt: number | bigint;
  updatedAt: number | bigint;
  transferHookApplied: boolean;
  bump: number;
};

export function getServicePurchaseEncoder(): Encoder<ServicePurchaseArgs> {
  return transformEncoder(
    getStructEncoder([
      ['discriminator', fixEncoderSize(getBytesEncoder(), 8)],
      ['customer', getAddressEncoder()],
      ['agent', getAddressEncoder()],
      ['listing', getAddressEncoder()],
      ['listingId', getU64Encoder()],
      ['quantity', getU32Encoder()],
      [
        'requirements',
        getArrayEncoder(
          addEncoderSizePrefix(getUtf8Encoder(), getU32Encoder())
        ),
      ],
      [
        'customInstructions',
        addEncoderSizePrefix(getUtf8Encoder(), getU32Encoder()),
      ],
      ['deadline', getI64Encoder()],
      ['paymentAmount', getU64Encoder()],
      ['paymentToken', getAddressEncoder()],
      ['status', getPurchaseStatusEncoder()],
      ['purchasedAt', getI64Encoder()],
      ['updatedAt', getI64Encoder()],
      ['transferHookApplied', getBooleanEncoder()],
      ['bump', getU8Encoder()],
    ]),
    (value) => ({ ...value, discriminator: SERVICE_PURCHASE_DISCRIMINATOR })
  );
}

export function getServicePurchaseDecoder(): Decoder<ServicePurchase> {
  return getStructDecoder([
    ['discriminator', fixDecoderSize(getBytesDecoder(), 8)],
    ['customer', getAddressDecoder()],
    ['agent', getAddressDecoder()],
    ['listing', getAddressDecoder()],
    ['listingId', getU64Decoder()],
    ['quantity', getU32Decoder()],
    [
      'requirements',
      getArrayDecoder(addDecoderSizePrefix(getUtf8Decoder(), getU32Decoder())),
    ],
    [
      'customInstructions',
      addDecoderSizePrefix(getUtf8Decoder(), getU32Decoder()),
    ],
    ['deadline', getI64Decoder()],
    ['paymentAmount', getU64Decoder()],
    ['paymentToken', getAddressDecoder()],
    ['status', getPurchaseStatusDecoder()],
    ['purchasedAt', getI64Decoder()],
    ['updatedAt', getI64Decoder()],
    ['transferHookApplied', getBooleanDecoder()],
    ['bump', getU8Decoder()],
  ]);
}

export function getServicePurchaseCodec(): Codec<
  ServicePurchaseArgs,
  ServicePurchase
> {
  return combineCodec(getServicePurchaseEncoder(), getServicePurchaseDecoder());
}

export function decodeServicePurchase<TAddress extends string = string>(
  encodedAccount: EncodedAccount<TAddress>
): Account<ServicePurchase, TAddress>;
export function decodeServicePurchase<TAddress extends string = string>(
  encodedAccount: MaybeEncodedAccount<TAddress>
): MaybeAccount<ServicePurchase, TAddress>;
export function decodeServicePurchase<TAddress extends string = string>(
  encodedAccount: EncodedAccount<TAddress> | MaybeEncodedAccount<TAddress>
):
  | Account<ServicePurchase, TAddress>
  | MaybeAccount<ServicePurchase, TAddress> {
  return decodeAccount(
    encodedAccount as MaybeEncodedAccount<TAddress>,
    getServicePurchaseDecoder()
  );
}

export async function fetchServicePurchase<TAddress extends string = string>(
  rpc: Parameters<typeof fetchEncodedAccount>[0],
  address: Address<TAddress>,
  config?: FetchAccountConfig
): Promise<Account<ServicePurchase, TAddress>> {
  const maybeAccount = await fetchMaybeServicePurchase(rpc, address, config);
  assertAccountExists(maybeAccount);
  return maybeAccount;
}

export async function fetchMaybeServicePurchase<
  TAddress extends string = string,
>(
  rpc: Parameters<typeof fetchEncodedAccount>[0],
  address: Address<TAddress>,
  config?: FetchAccountConfig
): Promise<MaybeAccount<ServicePurchase, TAddress>> {
  const maybeAccount = await fetchEncodedAccount(rpc, address, config);
  return decodeServicePurchase(maybeAccount);
}

export async function fetchAllServicePurchase(
  rpc: Parameters<typeof fetchEncodedAccounts>[0],
  addresses: Array<Address>,
  config?: FetchAccountsConfig
): Promise<Account<ServicePurchase>[]> {
  const maybeAccounts = await fetchAllMaybeServicePurchase(
    rpc,
    addresses,
    config
  );
  assertAccountsExist(maybeAccounts);
  return maybeAccounts;
}

export async function fetchAllMaybeServicePurchase(
  rpc: Parameters<typeof fetchEncodedAccounts>[0],
  addresses: Array<Address>,
  config?: FetchAccountsConfig
): Promise<MaybeAccount<ServicePurchase>[]> {
  const maybeAccounts = await fetchEncodedAccounts(rpc, addresses, config);
  return maybeAccounts.map((maybeAccount) =>
    decodeServicePurchase(maybeAccount)
  );
}
