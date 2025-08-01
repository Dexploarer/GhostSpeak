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

export const A2_A_STATUS_DISCRIMINATOR = new Uint8Array([
  253, 113, 10, 35, 24, 155, 227, 28,
]);

export function getA2AStatusDiscriminatorBytes() {
  return fixEncoderSize(getBytesEncoder(), 8).encode(A2_A_STATUS_DISCRIMINATOR);
}

export type A2AStatus = {
  discriminator: ReadonlyUint8Array;
  agent: Address;
  status: string;
  capabilities: Array<string>;
  availability: boolean;
  lastUpdated: bigint;
  bump: number;
};

export type A2AStatusArgs = {
  agent: Address;
  status: string;
  capabilities: Array<string>;
  availability: boolean;
  lastUpdated: number | bigint;
  bump: number;
};

export function getA2AStatusEncoder(): Encoder<A2AStatusArgs> {
  return transformEncoder(
    getStructEncoder([
      ['discriminator', fixEncoderSize(getBytesEncoder(), 8)],
      ['agent', getAddressEncoder()],
      ['status', addEncoderSizePrefix(getUtf8Encoder(), getU32Encoder())],
      [
        'capabilities',
        getArrayEncoder(
          addEncoderSizePrefix(getUtf8Encoder(), getU32Encoder())
        ),
      ],
      ['availability', getBooleanEncoder()],
      ['lastUpdated', getI64Encoder()],
      ['bump', getU8Encoder()],
    ]),
    (value) => ({ ...value, discriminator: A2_A_STATUS_DISCRIMINATOR })
  );
}

export function getA2AStatusDecoder(): Decoder<A2AStatus> {
  return getStructDecoder([
    ['discriminator', fixDecoderSize(getBytesDecoder(), 8)],
    ['agent', getAddressDecoder()],
    ['status', addDecoderSizePrefix(getUtf8Decoder(), getU32Decoder())],
    [
      'capabilities',
      getArrayDecoder(addDecoderSizePrefix(getUtf8Decoder(), getU32Decoder())),
    ],
    ['availability', getBooleanDecoder()],
    ['lastUpdated', getI64Decoder()],
    ['bump', getU8Decoder()],
  ]);
}

export function getA2AStatusCodec(): Codec<A2AStatusArgs, A2AStatus> {
  return combineCodec(getA2AStatusEncoder(), getA2AStatusDecoder());
}

export function decodeA2AStatus<TAddress extends string = string>(
  encodedAccount: EncodedAccount<TAddress>
): Account<A2AStatus, TAddress>;
export function decodeA2AStatus<TAddress extends string = string>(
  encodedAccount: MaybeEncodedAccount<TAddress>
): MaybeAccount<A2AStatus, TAddress>;
export function decodeA2AStatus<TAddress extends string = string>(
  encodedAccount: EncodedAccount<TAddress> | MaybeEncodedAccount<TAddress>
): Account<A2AStatus, TAddress> | MaybeAccount<A2AStatus, TAddress> {
  return decodeAccount(
    encodedAccount as MaybeEncodedAccount<TAddress>,
    getA2AStatusDecoder()
  );
}

export async function fetchA2AStatus<TAddress extends string = string>(
  rpc: Parameters<typeof fetchEncodedAccount>[0],
  address: Address<TAddress>,
  config?: FetchAccountConfig
): Promise<Account<A2AStatus, TAddress>> {
  const maybeAccount = await fetchMaybeA2AStatus(rpc, address, config);
  assertAccountExists(maybeAccount);
  return maybeAccount;
}

export async function fetchMaybeA2AStatus<TAddress extends string = string>(
  rpc: Parameters<typeof fetchEncodedAccount>[0],
  address: Address<TAddress>,
  config?: FetchAccountConfig
): Promise<MaybeAccount<A2AStatus, TAddress>> {
  const maybeAccount = await fetchEncodedAccount(rpc, address, config);
  return decodeA2AStatus(maybeAccount);
}

export async function fetchAllA2AStatus(
  rpc: Parameters<typeof fetchEncodedAccounts>[0],
  addresses: Array<Address>,
  config?: FetchAccountsConfig
): Promise<Account<A2AStatus>[]> {
  const maybeAccounts = await fetchAllMaybeA2AStatus(rpc, addresses, config);
  assertAccountsExist(maybeAccounts);
  return maybeAccounts;
}

export async function fetchAllMaybeA2AStatus(
  rpc: Parameters<typeof fetchEncodedAccounts>[0],
  addresses: Array<Address>,
  config?: FetchAccountsConfig
): Promise<MaybeAccount<A2AStatus>[]> {
  const maybeAccounts = await fetchEncodedAccounts(rpc, addresses, config);
  return maybeAccounts.map((maybeAccount) => decodeA2AStatus(maybeAccount));
}
