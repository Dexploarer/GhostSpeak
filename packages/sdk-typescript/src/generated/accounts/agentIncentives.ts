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
  transformEncoder,
  type Account,
  type Address,
  type EncodedAccount,
  type FetchAccountConfig,
  type FetchAccountsConfig,
  type FixedSizeCodec,
  type FixedSizeDecoder,
  type FixedSizeEncoder,
  type MaybeAccount,
  type MaybeEncodedAccount,
  type ReadonlyUint8Array,
} from '@solana/kit';

export const AGENT_INCENTIVES_DISCRIMINATOR = new Uint8Array([
  167, 87, 249, 0, 146, 197, 209, 158,
]);

export function getAgentIncentivesDiscriminatorBytes() {
  return fixEncoderSize(getBytesEncoder(), 8).encode(
    AGENT_INCENTIVES_DISCRIMINATOR
  );
}

export type AgentIncentives = {
  discriminator: ReadonlyUint8Array;
  agent: Address;
  referralsCount: number;
  referralEarnings: bigint;
  performanceScore: number;
  performanceEarnings: bigint;
  loyaltyPoints: bigint;
  totalEarnings: bigint;
  lastActivity: bigint;
  bump: number;
};

export type AgentIncentivesArgs = {
  agent: Address;
  referralsCount: number;
  referralEarnings: number | bigint;
  performanceScore: number;
  performanceEarnings: number | bigint;
  loyaltyPoints: number | bigint;
  totalEarnings: number | bigint;
  lastActivity: number | bigint;
  bump: number;
};

export function getAgentIncentivesEncoder(): FixedSizeEncoder<AgentIncentivesArgs> {
  return transformEncoder(
    getStructEncoder([
      ['discriminator', fixEncoderSize(getBytesEncoder(), 8)],
      ['agent', getAddressEncoder()],
      ['referralsCount', getU32Encoder()],
      ['referralEarnings', getU64Encoder()],
      ['performanceScore', getF64Encoder()],
      ['performanceEarnings', getU64Encoder()],
      ['loyaltyPoints', getU64Encoder()],
      ['totalEarnings', getU64Encoder()],
      ['lastActivity', getI64Encoder()],
      ['bump', getU8Encoder()],
    ]),
    (value) => ({ ...value, discriminator: AGENT_INCENTIVES_DISCRIMINATOR })
  );
}

export function getAgentIncentivesDecoder(): FixedSizeDecoder<AgentIncentives> {
  return getStructDecoder([
    ['discriminator', fixDecoderSize(getBytesDecoder(), 8)],
    ['agent', getAddressDecoder()],
    ['referralsCount', getU32Decoder()],
    ['referralEarnings', getU64Decoder()],
    ['performanceScore', getF64Decoder()],
    ['performanceEarnings', getU64Decoder()],
    ['loyaltyPoints', getU64Decoder()],
    ['totalEarnings', getU64Decoder()],
    ['lastActivity', getI64Decoder()],
    ['bump', getU8Decoder()],
  ]);
}

export function getAgentIncentivesCodec(): FixedSizeCodec<
  AgentIncentivesArgs,
  AgentIncentives
> {
  return combineCodec(getAgentIncentivesEncoder(), getAgentIncentivesDecoder());
}

export function decodeAgentIncentives<TAddress extends string = string>(
  encodedAccount: EncodedAccount<TAddress>
): Account<AgentIncentives, TAddress>;
export function decodeAgentIncentives<TAddress extends string = string>(
  encodedAccount: MaybeEncodedAccount<TAddress>
): MaybeAccount<AgentIncentives, TAddress>;
export function decodeAgentIncentives<TAddress extends string = string>(
  encodedAccount: EncodedAccount<TAddress> | MaybeEncodedAccount<TAddress>
):
  | Account<AgentIncentives, TAddress>
  | MaybeAccount<AgentIncentives, TAddress> {
  return decodeAccount(
    encodedAccount as MaybeEncodedAccount<TAddress>,
    getAgentIncentivesDecoder()
  );
}

export async function fetchAgentIncentives<TAddress extends string = string>(
  rpc: Parameters<typeof fetchEncodedAccount>[0],
  address: Address<TAddress>,
  config?: FetchAccountConfig
): Promise<Account<AgentIncentives, TAddress>> {
  const maybeAccount = await fetchMaybeAgentIncentives(rpc, address, config);
  assertAccountExists(maybeAccount);
  return maybeAccount;
}

export async function fetchMaybeAgentIncentives<
  TAddress extends string = string,
>(
  rpc: Parameters<typeof fetchEncodedAccount>[0],
  address: Address<TAddress>,
  config?: FetchAccountConfig
): Promise<MaybeAccount<AgentIncentives, TAddress>> {
  const maybeAccount = await fetchEncodedAccount(rpc, address, config);
  return decodeAgentIncentives(maybeAccount);
}

export async function fetchAllAgentIncentives(
  rpc: Parameters<typeof fetchEncodedAccounts>[0],
  addresses: Array<Address>,
  config?: FetchAccountsConfig
): Promise<Account<AgentIncentives>[]> {
  const maybeAccounts = await fetchAllMaybeAgentIncentives(
    rpc,
    addresses,
    config
  );
  assertAccountsExist(maybeAccounts);
  return maybeAccounts;
}

export async function fetchAllMaybeAgentIncentives(
  rpc: Parameters<typeof fetchEncodedAccounts>[0],
  addresses: Array<Address>,
  config?: FetchAccountsConfig
): Promise<MaybeAccount<AgentIncentives>[]> {
  const maybeAccounts = await fetchEncodedAccounts(rpc, addresses, config);
  return maybeAccounts.map((maybeAccount) =>
    decodeAgentIncentives(maybeAccount)
  );
}

export function getAgentIncentivesSize(): number {
  return 93;
}
