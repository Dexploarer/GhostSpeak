/**
 * This code was AUTOGENERATED using the codama library.
 * Please DO NOT EDIT THIS FILE, instead use visitors
 * to add features, then rerun codama to update it.
 *
 * @see https://github.com/codama-idl/codama
 */

import {
  combineCodec,
  fixDecoderSize,
  fixEncoderSize,
  getBytesDecoder,
  getBytesEncoder,
  getProgramDerivedAddress,
  getStructDecoder,
  getStructEncoder,
  transformEncoder,
  type AccountMeta,
  type AccountSignerMeta,
  type Address,
  type FixedSizeCodec,
  type FixedSizeDecoder,
  type FixedSizeEncoder,
  type Instruction,
  type InstructionWithAccounts,
  type InstructionWithData,
  type ReadonlyUint8Array,
  type TransactionSigner,
  type WritableAccount,
  type WritableSignerAccount,
} from '@solana/kit';
import {
  GHOSTSPEAK_MARKETPLACE_ERROR__INSUFFICIENT_ACCOUNTS,
  GHOSTSPEAK_MARKETPLACE_ERROR__INVALID_INSTRUCTION_DATA,
  GHOSTSPEAK_MARKETPLACE_ERROR__MISSING_REQUIRED_ACCOUNT,
  GHOSTSPEAK_MARKETPLACE_ERROR__INVALID_ACCOUNT,
  GHOSTSPEAK_MARKETPLACE_ERROR__INSTRUCTION_PARSING_FAILED,
  isGhostspeakMarketplaceError,
} from '../errors';
import { GHOSTSPEAK_MARKETPLACE_PROGRAM_ADDRESS } from '../programs';
import { getAccountMetaFactory, type ResolvedAccount } from '../shared';

export const LEAVE_CHANNEL_DISCRIMINATOR = new Uint8Array([
  104, 0, 75, 134, 95, 80, 68, 186,
]);

export function getLeaveChannelDiscriminatorBytes() {
  return fixEncoderSize(getBytesEncoder(), 8).encode(
    LEAVE_CHANNEL_DISCRIMINATOR
  );
}

export type LeaveChannelInstruction<
  TProgram extends string = typeof GHOSTSPEAK_MARKETPLACE_PROGRAM_ADDRESS,
  TAccountChannel extends string | AccountMeta<string> = string,
  TAccountReentrancyGuard extends string | AccountMeta<string> = string,
  TAccountUser extends string | AccountMeta<string> = string,
  TRemainingAccounts extends readonly AccountMeta<string>[] = [],
> = Instruction<TProgram> &
  InstructionWithData<ReadonlyUint8Array> &
  InstructionWithAccounts<
    [
      TAccountChannel extends string
        ? WritableAccount<TAccountChannel>
        : TAccountChannel,
      TAccountReentrancyGuard extends string
        ? WritableAccount<TAccountReentrancyGuard>
        : TAccountReentrancyGuard,
      TAccountUser extends string
        ? WritableSignerAccount<TAccountUser> & AccountSignerMeta<TAccountUser>
        : TAccountUser,
      ...TRemainingAccounts,
    ]
  >;

export type LeaveChannelInstructionData = { discriminator: ReadonlyUint8Array };

export type LeaveChannelInstructionDataArgs = {};

export function getLeaveChannelInstructionDataEncoder(): FixedSizeEncoder<LeaveChannelInstructionDataArgs> {
  return transformEncoder(
    getStructEncoder([['discriminator', fixEncoderSize(getBytesEncoder(), 8)]]),
    (value) => ({ ...value, discriminator: LEAVE_CHANNEL_DISCRIMINATOR })
  );
}

export function getLeaveChannelInstructionDataDecoder(): FixedSizeDecoder<LeaveChannelInstructionData> {
  return getStructDecoder([
    ['discriminator', fixDecoderSize(getBytesDecoder(), 8)],
  ]);
}

export function getLeaveChannelInstructionDataCodec(): FixedSizeCodec<
  LeaveChannelInstructionDataArgs,
  LeaveChannelInstructionData
> {
  return combineCodec(
    getLeaveChannelInstructionDataEncoder(),
    getLeaveChannelInstructionDataDecoder()
  );
}

export type LeaveChannelAsyncInput<
  TAccountChannel extends string = string,
  TAccountReentrancyGuard extends string = string,
  TAccountUser extends string = string,
> = {
  channel: Address<TAccountChannel>;
  reentrancyGuard?: Address<TAccountReentrancyGuard>;
  user: TransactionSigner<TAccountUser>;
};

export async function getLeaveChannelInstructionAsync<
  TAccountChannel extends string,
  TAccountReentrancyGuard extends string,
  TAccountUser extends string,
  TProgramAddress extends
    Address = typeof GHOSTSPEAK_MARKETPLACE_PROGRAM_ADDRESS,
>(
  input: LeaveChannelAsyncInput<
    TAccountChannel,
    TAccountReentrancyGuard,
    TAccountUser
  >,
  config?: { programAddress?: TProgramAddress }
): Promise<
  LeaveChannelInstruction<
    TProgramAddress,
    TAccountChannel,
    TAccountReentrancyGuard,
    TAccountUser
  >
> {
  // Program address.
  const programAddress =
    config?.programAddress ?? GHOSTSPEAK_MARKETPLACE_PROGRAM_ADDRESS;

  // Original accounts.
  const originalAccounts = {
    channel: { value: input.channel ?? null, isWritable: true },
    reentrancyGuard: { value: input.reentrancyGuard ?? null, isWritable: true },
    user: { value: input.user ?? null, isWritable: true },
  };
  const accounts = originalAccounts as Record<
    keyof typeof originalAccounts,
    ResolvedAccount
  >;

  // Resolve default values.
  if (!accounts.reentrancyGuard.value) {
    accounts.reentrancyGuard.value = await getProgramDerivedAddress({
      programAddress,
      seeds: [
        getBytesEncoder().encode(
          new Uint8Array([
            114, 101, 101, 110, 116, 114, 97, 110, 99, 121, 95, 103, 117, 97,
            114, 100,
          ])
        ),
      ],
    });
  }

  const getAccountMeta = getAccountMetaFactory(programAddress, 'programId');
  const instruction = {
    accounts: [
      getAccountMeta(accounts.channel),
      getAccountMeta(accounts.reentrancyGuard),
      getAccountMeta(accounts.user),
    ],
    programAddress,
    data: getLeaveChannelInstructionDataEncoder().encode({}),
  } as LeaveChannelInstruction<
    TProgramAddress,
    TAccountChannel,
    TAccountReentrancyGuard,
    TAccountUser
  >;

  return instruction;
}

export type LeaveChannelInput<
  TAccountChannel extends string = string,
  TAccountReentrancyGuard extends string = string,
  TAccountUser extends string = string,
> = {
  channel: Address<TAccountChannel>;
  reentrancyGuard: Address<TAccountReentrancyGuard>;
  user: TransactionSigner<TAccountUser>;
};

export function getLeaveChannelInstruction<
  TAccountChannel extends string,
  TAccountReentrancyGuard extends string,
  TAccountUser extends string,
  TProgramAddress extends
    Address = typeof GHOSTSPEAK_MARKETPLACE_PROGRAM_ADDRESS,
>(
  input: LeaveChannelInput<
    TAccountChannel,
    TAccountReentrancyGuard,
    TAccountUser
  >,
  config?: { programAddress?: TProgramAddress }
): LeaveChannelInstruction<
  TProgramAddress,
  TAccountChannel,
  TAccountReentrancyGuard,
  TAccountUser
> {
  // Program address.
  const programAddress =
    config?.programAddress ?? GHOSTSPEAK_MARKETPLACE_PROGRAM_ADDRESS;

  // Original accounts.
  const originalAccounts = {
    channel: { value: input.channel ?? null, isWritable: true },
    reentrancyGuard: { value: input.reentrancyGuard ?? null, isWritable: true },
    user: { value: input.user ?? null, isWritable: true },
  };
  const accounts = originalAccounts as Record<
    keyof typeof originalAccounts,
    ResolvedAccount
  >;

  const getAccountMeta = getAccountMetaFactory(programAddress, 'programId');
  const instruction = {
    accounts: [
      getAccountMeta(accounts.channel),
      getAccountMeta(accounts.reentrancyGuard),
      getAccountMeta(accounts.user),
    ],
    programAddress,
    data: getLeaveChannelInstructionDataEncoder().encode({}),
  } as LeaveChannelInstruction<
    TProgramAddress,
    TAccountChannel,
    TAccountReentrancyGuard,
    TAccountUser
  >;

  return instruction;
}

export type ParsedLeaveChannelInstruction<
  TProgram extends string = typeof GHOSTSPEAK_MARKETPLACE_PROGRAM_ADDRESS,
  TAccountMetas extends readonly AccountMeta[] = readonly AccountMeta[],
> = {
  programAddress: Address<TProgram>;
  accounts: {
    channel: TAccountMetas[0];
    reentrancyGuard: TAccountMetas[1];
    user: TAccountMetas[2];
  };
  data: LeaveChannelInstructionData;
};

export function parseLeaveChannelInstruction<
  TProgram extends string,
  TAccountMetas extends readonly AccountMeta[],
>(
  instruction: Instruction<TProgram> &
    InstructionWithAccounts<TAccountMetas> &
    InstructionWithData<ReadonlyUint8Array>
): ParsedLeaveChannelInstruction<TProgram, TAccountMetas> {
  if (instruction.accounts.length < 3) {
    throw new Error('[GHOSTSPEAK_MARKETPLACE_ERROR__INSUFFICIENT_ACCOUNTS] Not enough accounts');
  }
  let accountIndex = 0;
  const getNextAccount = () => {
    const accountMeta = instruction.accounts![accountIndex]!;
    accountIndex += 1;
    return accountMeta;
  };
  return {
    programAddress: instruction.programAddress,
    accounts: {
      channel: getNextAccount(),
      reentrancyGuard: getNextAccount(),
      user: getNextAccount(),
    },
    data: getLeaveChannelInstructionDataDecoder().decode(instruction.data),
  };
}
