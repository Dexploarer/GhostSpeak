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
  getAddressEncoder,
  getBooleanDecoder,
  getBooleanEncoder,
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
  type ReadonlyAccount,
  type ReadonlySignerAccount,
  type ReadonlyUint8Array,
  type TransactionSigner,
  type WritableAccount,
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
import {
  expectAddress,
  getAccountMetaFactory,
  type ResolvedAccount,
} from '../shared';

export const MANAGE_AGENT_STATUS_DISCRIMINATOR = new Uint8Array([
  164, 219, 91, 38, 45, 31, 33, 47,
]);

export function getManageAgentStatusDiscriminatorBytes() {
  return fixEncoderSize(getBytesEncoder(), 8).encode(
    MANAGE_AGENT_STATUS_DISCRIMINATOR
  );
}

export type ManageAgentStatusInstruction<
  TProgram extends string = typeof GHOSTSPEAK_MARKETPLACE_PROGRAM_ADDRESS,
  TAccountAgent extends string | AccountMeta<string> = string,
  TAccountOwner extends string | AccountMeta<string> = string,
  TAccountClock extends
    | string
    | AccountMeta<string> = 'SysvarC1ock11111111111111111111111111111111',
  TRemainingAccounts extends readonly AccountMeta<string>[] = [],
> = Instruction<TProgram> &
  InstructionWithData<ReadonlyUint8Array> &
  InstructionWithAccounts<
    [
      TAccountAgent extends string
        ? WritableAccount<TAccountAgent>
        : TAccountAgent,
      TAccountOwner extends string
        ? ReadonlySignerAccount<TAccountOwner> &
            AccountSignerMeta<TAccountOwner>
        : TAccountOwner,
      TAccountClock extends string
        ? ReadonlyAccount<TAccountClock>
        : TAccountClock,
      ...TRemainingAccounts,
    ]
  >;

export type ManageAgentStatusInstructionData = {
  discriminator: ReadonlyUint8Array;
  newStatus: boolean;
};

export type ManageAgentStatusInstructionDataArgs = { newStatus: boolean };

export function getManageAgentStatusInstructionDataEncoder(): FixedSizeEncoder<ManageAgentStatusInstructionDataArgs> {
  return transformEncoder(
    getStructEncoder([
      ['discriminator', fixEncoderSize(getBytesEncoder(), 8)],
      ['newStatus', getBooleanEncoder()],
    ]),
    (value) => ({ ...value, discriminator: MANAGE_AGENT_STATUS_DISCRIMINATOR })
  );
}

export function getManageAgentStatusInstructionDataDecoder(): FixedSizeDecoder<ManageAgentStatusInstructionData> {
  return getStructDecoder([
    ['discriminator', fixDecoderSize(getBytesDecoder(), 8)],
    ['newStatus', getBooleanDecoder()],
  ]);
}

export function getManageAgentStatusInstructionDataCodec(): FixedSizeCodec<
  ManageAgentStatusInstructionDataArgs,
  ManageAgentStatusInstructionData
> {
  return combineCodec(
    getManageAgentStatusInstructionDataEncoder(),
    getManageAgentStatusInstructionDataDecoder()
  );
}

export type ManageAgentStatusAsyncInput<
  TAccountAgent extends string = string,
  TAccountOwner extends string = string,
  TAccountClock extends string = string,
> = {
  /** Agent account with strict validation */
  agent?: Address<TAccountAgent>;
  /** Owner authority */
  owner: TransactionSigner<TAccountOwner>;
  /** Clock sysvar for timestamp validation */
  clock?: Address<TAccountClock>;
  newStatus: ManageAgentStatusInstructionDataArgs['newStatus'];
};

export async function getManageAgentStatusInstructionAsync<
  TAccountAgent extends string,
  TAccountOwner extends string,
  TAccountClock extends string,
  TProgramAddress extends
    Address = typeof GHOSTSPEAK_MARKETPLACE_PROGRAM_ADDRESS,
>(
  input: ManageAgentStatusAsyncInput<
    TAccountAgent,
    TAccountOwner,
    TAccountClock
  >,
  config?: { programAddress?: TProgramAddress }
): Promise<
  ManageAgentStatusInstruction<
    TProgramAddress,
    TAccountAgent,
    TAccountOwner,
    TAccountClock
  >
> {
  // Program address.
  const programAddress =
    config?.programAddress ?? GHOSTSPEAK_MARKETPLACE_PROGRAM_ADDRESS;

  // Original accounts.
  const originalAccounts = {
    agent: { value: input.agent ?? null, isWritable: true },
    owner: { value: input.owner ?? null, isWritable: false },
    clock: { value: input.clock ?? null, isWritable: false },
  };
  const accounts = originalAccounts as Record<
    keyof typeof originalAccounts,
    ResolvedAccount
  >;

  // Original args.
  const args = { ...input };

  // Resolve default values.
  if (!accounts.agent.value) {
    accounts.agent.value = await getProgramDerivedAddress({
      programAddress,
      seeds: [
        getBytesEncoder().encode(new Uint8Array([97, 103, 101, 110, 116])),
        getAddressEncoder().encode(expectAddress(accounts.owner.value)),
      ],
    });
  }
  if (!accounts.clock.value) {
    accounts.clock.value =
      'SysvarC1ock11111111111111111111111111111111' as Address<'SysvarC1ock11111111111111111111111111111111'>;
  }

  const getAccountMeta = getAccountMetaFactory(programAddress, 'programId');
  const instruction = {
    accounts: [
      getAccountMeta(accounts.agent),
      getAccountMeta(accounts.owner),
      getAccountMeta(accounts.clock),
    ],
    programAddress,
    data: getManageAgentStatusInstructionDataEncoder().encode(
      args as ManageAgentStatusInstructionDataArgs
    ),
  } as ManageAgentStatusInstruction<
    TProgramAddress,
    TAccountAgent,
    TAccountOwner,
    TAccountClock
  >;

  return instruction;
}

export type ManageAgentStatusInput<
  TAccountAgent extends string = string,
  TAccountOwner extends string = string,
  TAccountClock extends string = string,
> = {
  /** Agent account with strict validation */
  agent: Address<TAccountAgent>;
  /** Owner authority */
  owner: TransactionSigner<TAccountOwner>;
  /** Clock sysvar for timestamp validation */
  clock?: Address<TAccountClock>;
  newStatus: ManageAgentStatusInstructionDataArgs['newStatus'];
};

export function getManageAgentStatusInstruction<
  TAccountAgent extends string,
  TAccountOwner extends string,
  TAccountClock extends string,
  TProgramAddress extends
    Address = typeof GHOSTSPEAK_MARKETPLACE_PROGRAM_ADDRESS,
>(
  input: ManageAgentStatusInput<TAccountAgent, TAccountOwner, TAccountClock>,
  config?: { programAddress?: TProgramAddress }
): ManageAgentStatusInstruction<
  TProgramAddress,
  TAccountAgent,
  TAccountOwner,
  TAccountClock
> {
  // Program address.
  const programAddress =
    config?.programAddress ?? GHOSTSPEAK_MARKETPLACE_PROGRAM_ADDRESS;

  // Original accounts.
  const originalAccounts = {
    agent: { value: input.agent ?? null, isWritable: true },
    owner: { value: input.owner ?? null, isWritable: false },
    clock: { value: input.clock ?? null, isWritable: false },
  };
  const accounts = originalAccounts as Record<
    keyof typeof originalAccounts,
    ResolvedAccount
  >;

  // Original args.
  const args = { ...input };

  // Resolve default values.
  if (!accounts.clock.value) {
    accounts.clock.value =
      'SysvarC1ock11111111111111111111111111111111' as Address<'SysvarC1ock11111111111111111111111111111111'>;
  }

  const getAccountMeta = getAccountMetaFactory(programAddress, 'programId');
  const instruction = {
    accounts: [
      getAccountMeta(accounts.agent),
      getAccountMeta(accounts.owner),
      getAccountMeta(accounts.clock),
    ],
    programAddress,
    data: getManageAgentStatusInstructionDataEncoder().encode(
      args as ManageAgentStatusInstructionDataArgs
    ),
  } as ManageAgentStatusInstruction<
    TProgramAddress,
    TAccountAgent,
    TAccountOwner,
    TAccountClock
  >;

  return instruction;
}

export type ParsedManageAgentStatusInstruction<
  TProgram extends string = typeof GHOSTSPEAK_MARKETPLACE_PROGRAM_ADDRESS,
  TAccountMetas extends readonly AccountMeta[] = readonly AccountMeta[],
> = {
  programAddress: Address<TProgram>;
  accounts: {
    /** Agent account with strict validation */
    agent: TAccountMetas[0];
    /** Owner authority */
    owner: TAccountMetas[1];
    /** Clock sysvar for timestamp validation */
    clock: TAccountMetas[2];
  };
  data: ManageAgentStatusInstructionData;
};

export function parseManageAgentStatusInstruction<
  TProgram extends string,
  TAccountMetas extends readonly AccountMeta[],
>(
  instruction: Instruction<TProgram> &
    InstructionWithAccounts<TAccountMetas> &
    InstructionWithData<ReadonlyUint8Array>
): ParsedManageAgentStatusInstruction<TProgram, TAccountMetas> {
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
      agent: getNextAccount(),
      owner: getNextAccount(),
      clock: getNextAccount(),
    },
    data: getManageAgentStatusInstructionDataDecoder().decode(instruction.data),
  };
}
