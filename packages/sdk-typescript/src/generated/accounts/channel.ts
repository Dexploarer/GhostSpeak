/**
 * This code was AUTOGENERATED using the codama library.
 * Please DO NOT EDIT THIS FILE, instead use visitors
 * to add features, then rerun codama to update it.
 *
 * @see https://github.com/codama-idl/codama
 */

import {
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
  getU64Decoder,
  getU64Encoder,
  getU8Decoder,
  getU8Encoder,
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
  getChannelTypeDecoder,
  getChannelTypeEncoder,
  type ChannelType,
  type ChannelTypeArgs,
} from '../types';

export const CHANNEL_DISCRIMINATOR = new Uint8Array([
  49, 159, 99, 106, 220, 87, 219, 88,
]);

export function getChannelDiscriminatorBytes() {
  return fixEncoderSize(getBytesEncoder(), 8).encode(CHANNEL_DISCRIMINATOR);
}

export type Channel = {
  discriminator: ReadonlyUint8Array;
  creator: Address;
  participants: Array<Address>;
  channelType: ChannelType;
  isPrivate: boolean;
  messageCount: bigint;
  createdAt: bigint;
  lastActivity: bigint;
  isActive: boolean;
  bump: number;
};

export type ChannelArgs = {
  creator: Address;
  participants: Array<Address>;
  channelType: ChannelTypeArgs;
  isPrivate: boolean;
  messageCount: number | bigint;
  createdAt: number | bigint;
  lastActivity: number | bigint;
  isActive: boolean;
  bump: number;
};

export function getChannelEncoder(): Encoder<ChannelArgs> {
  return transformEncoder(
    getStructEncoder([
      ['discriminator', fixEncoderSize(getBytesEncoder(), 8)],
      ['creator', getAddressEncoder()],
      ['participants', getArrayEncoder(getAddressEncoder())],
      ['channelType', getChannelTypeEncoder()],
      ['isPrivate', getBooleanEncoder()],
      ['messageCount', getU64Encoder()],
      ['createdAt', getI64Encoder()],
      ['lastActivity', getI64Encoder()],
      ['isActive', getBooleanEncoder()],
      ['bump', getU8Encoder()],
    ]),
    (value) => ({ ...value, discriminator: CHANNEL_DISCRIMINATOR })
  );
}

export function getChannelDecoder(): Decoder<Channel> {
  return getStructDecoder([
    ['discriminator', fixDecoderSize(getBytesDecoder(), 8)],
    ['creator', getAddressDecoder()],
    ['participants', getArrayDecoder(getAddressDecoder())],
    ['channelType', getChannelTypeDecoder()],
    ['isPrivate', getBooleanDecoder()],
    ['messageCount', getU64Decoder()],
    ['createdAt', getI64Decoder()],
    ['lastActivity', getI64Decoder()],
    ['isActive', getBooleanDecoder()],
    ['bump', getU8Decoder()],
  ]);
}

export function getChannelCodec(): Codec<ChannelArgs, Channel> {
  return combineCodec(getChannelEncoder(), getChannelDecoder());
}

export function decodeChannel<TAddress extends string = string>(
  encodedAccount: EncodedAccount<TAddress>
): Account<Channel, TAddress>;
export function decodeChannel<TAddress extends string = string>(
  encodedAccount: MaybeEncodedAccount<TAddress>
): MaybeAccount<Channel, TAddress>;
export function decodeChannel<TAddress extends string = string>(
  encodedAccount: EncodedAccount<TAddress> | MaybeEncodedAccount<TAddress>
): Account<Channel, TAddress> | MaybeAccount<Channel, TAddress> {
  return decodeAccount(
    encodedAccount as MaybeEncodedAccount<TAddress>,
    getChannelDecoder()
  );
}

export async function fetchChannel<TAddress extends string = string>(
  rpc: Parameters<typeof fetchEncodedAccount>[0],
  address: Address<TAddress>,
  config?: FetchAccountConfig
): Promise<Account<Channel, TAddress>> {
  const maybeAccount = await fetchMaybeChannel(rpc, address, config);
  assertAccountExists(maybeAccount);
  return maybeAccount;
}

export async function fetchMaybeChannel<TAddress extends string = string>(
  rpc: Parameters<typeof fetchEncodedAccount>[0],
  address: Address<TAddress>,
  config?: FetchAccountConfig
): Promise<MaybeAccount<Channel, TAddress>> {
  const maybeAccount = await fetchEncodedAccount(rpc, address, config);
  return decodeChannel(maybeAccount);
}

export async function fetchAllChannel(
  rpc: Parameters<typeof fetchEncodedAccounts>[0],
  addresses: Array<Address>,
  config?: FetchAccountsConfig
): Promise<Account<Channel>[]> {
  const maybeAccounts = await fetchAllMaybeChannel(rpc, addresses, config);
  assertAccountsExist(maybeAccounts);
  return maybeAccounts;
}

export async function fetchAllMaybeChannel(
  rpc: Parameters<typeof fetchEncodedAccounts>[0],
  addresses: Array<Address>,
  config?: FetchAccountsConfig
): Promise<MaybeAccount<Channel>[]> {
  const maybeAccounts = await fetchEncodedAccounts(rpc, addresses, config);
  return maybeAccounts.map((maybeAccount) => decodeChannel(maybeAccount));
}
