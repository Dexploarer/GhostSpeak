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
import {
  expectAddress,
  getAccountMetaFactory,
  type ResolvedAccount,
} from '../shared';
import {
  getIncentiveConfigDecoder,
  getIncentiveConfigEncoder,
  type IncentiveConfig,
  type IncentiveConfigArgs,
} from '../types';

export const CREATE_INCENTIVE_PROGRAM_DISCRIMINATOR = new Uint8Array([
  115, 222, 207, 231, 169, 56, 125, 153,
]);

export function getCreateIncentiveProgramDiscriminatorBytes() {
  return fixEncoderSize(getBytesEncoder(), 8).encode(
    CREATE_INCENTIVE_PROGRAM_DISCRIMINATOR
  );
}

export type CreateIncentiveProgramInstruction<
  TProgram extends string = typeof GHOSTSPEAK_MARKETPLACE_PROGRAM_ADDRESS,
  TAccountProgram extends string | AccountMeta<string> = string,
  TAccountCreator extends string | AccountMeta<string> = string,
  TAccountSystemProgram extends
    | string
    | AccountMeta<string> = '11111111111111111111111111111111',
  TRemainingAccounts extends readonly AccountMeta<string>[] = [],
> = Instruction<TProgram> &
  InstructionWithData<ReadonlyUint8Array> &
  InstructionWithAccounts<
    [
      TAccountProgram extends string
        ? WritableAccount<TAccountProgram>
        : TAccountProgram,
      TAccountCreator extends string
        ? WritableSignerAccount<TAccountCreator> &
            AccountSignerMeta<TAccountCreator>
        : TAccountCreator,
      TAccountSystemProgram extends string
        ? ReadonlyAccount<TAccountSystemProgram>
        : TAccountSystemProgram,
      ...TRemainingAccounts,
    ]
  >;

export type CreateIncentiveProgramInstructionData = {
  discriminator: ReadonlyUint8Array;
  config: IncentiveConfig;
};

export type CreateIncentiveProgramInstructionDataArgs = {
  config: IncentiveConfigArgs;
};

export function getCreateIncentiveProgramInstructionDataEncoder(): FixedSizeEncoder<CreateIncentiveProgramInstructionDataArgs> {
  return transformEncoder(
    getStructEncoder([
      ['discriminator', fixEncoderSize(getBytesEncoder(), 8)],
      ['config', getIncentiveConfigEncoder()],
    ]),
    (value) => ({
      ...value,
      discriminator: CREATE_INCENTIVE_PROGRAM_DISCRIMINATOR,
    })
  );
}

export function getCreateIncentiveProgramInstructionDataDecoder(): FixedSizeDecoder<CreateIncentiveProgramInstructionData> {
  return getStructDecoder([
    ['discriminator', fixDecoderSize(getBytesDecoder(), 8)],
    ['config', getIncentiveConfigDecoder()],
  ]);
}

export function getCreateIncentiveProgramInstructionDataCodec(): FixedSizeCodec<
  CreateIncentiveProgramInstructionDataArgs,
  CreateIncentiveProgramInstructionData
> {
  return combineCodec(
    getCreateIncentiveProgramInstructionDataEncoder(),
    getCreateIncentiveProgramInstructionDataDecoder()
  );
}

export type CreateIncentiveProgramAsyncInput<
  TAccountProgram extends string = string,
  TAccountCreator extends string = string,
  TAccountSystemProgram extends string = string,
> = {
  program?: Address<TAccountProgram>;
  creator: TransactionSigner<TAccountCreator>;
  systemProgram?: Address<TAccountSystemProgram>;
  config: CreateIncentiveProgramInstructionDataArgs['config'];
};

export async function getCreateIncentiveProgramInstructionAsync<
  TAccountProgram extends string,
  TAccountCreator extends string,
  TAccountSystemProgram extends string,
  TProgramAddress extends
    Address = typeof GHOSTSPEAK_MARKETPLACE_PROGRAM_ADDRESS,
>(
  input: CreateIncentiveProgramAsyncInput<
    TAccountProgram,
    TAccountCreator,
    TAccountSystemProgram
  >,
  config?: { programAddress?: TProgramAddress }
): Promise<
  CreateIncentiveProgramInstruction<
    TProgramAddress,
    TAccountProgram,
    TAccountCreator,
    TAccountSystemProgram
  >
> {
  // Program address.
  const programAddress =
    config?.programAddress ?? GHOSTSPEAK_MARKETPLACE_PROGRAM_ADDRESS;

  // Original accounts.
  const originalAccounts = {
    program: { value: input.program ?? null, isWritable: true },
    creator: { value: input.creator ?? null, isWritable: true },
    systemProgram: { value: input.systemProgram ?? null, isWritable: false },
  };
  const accounts = originalAccounts as Record<
    keyof typeof originalAccounts,
    ResolvedAccount
  >;

  // Original args.
  const args = { ...input };

  // Resolve default values.
  if (!accounts.program.value) {
    accounts.program.value = await getProgramDerivedAddress({
      programAddress,
      seeds: [
        getBytesEncoder().encode(
          new Uint8Array([
            105, 110, 99, 101, 110, 116, 105, 118, 101, 95, 112, 114, 111, 103,
            114, 97, 109,
          ])
        ),
        getAddressEncoder().encode(expectAddress(accounts.creator.value)),
      ],
    });
  }
  if (!accounts.systemProgram.value) {
    accounts.systemProgram.value =
      '11111111111111111111111111111111' as Address<'11111111111111111111111111111111'>;
  }

  const getAccountMeta = getAccountMetaFactory(programAddress, 'programId');
  const instruction = {
    accounts: [
      getAccountMeta(accounts.program),
      getAccountMeta(accounts.creator),
      getAccountMeta(accounts.systemProgram),
    ],
    programAddress,
    data: getCreateIncentiveProgramInstructionDataEncoder().encode(
      args as CreateIncentiveProgramInstructionDataArgs
    ),
  } as CreateIncentiveProgramInstruction<
    TProgramAddress,
    TAccountProgram,
    TAccountCreator,
    TAccountSystemProgram
  >;

  return instruction;
}

export type CreateIncentiveProgramInput<
  TAccountProgram extends string = string,
  TAccountCreator extends string = string,
  TAccountSystemProgram extends string = string,
> = {
  program: Address<TAccountProgram>;
  creator: TransactionSigner<TAccountCreator>;
  systemProgram?: Address<TAccountSystemProgram>;
  config: CreateIncentiveProgramInstructionDataArgs['config'];
};

export function getCreateIncentiveProgramInstruction<
  TAccountProgram extends string,
  TAccountCreator extends string,
  TAccountSystemProgram extends string,
  TProgramAddress extends
    Address = typeof GHOSTSPEAK_MARKETPLACE_PROGRAM_ADDRESS,
>(
  input: CreateIncentiveProgramInput<
    TAccountProgram,
    TAccountCreator,
    TAccountSystemProgram
  >,
  config?: { programAddress?: TProgramAddress }
): CreateIncentiveProgramInstruction<
  TProgramAddress,
  TAccountProgram,
  TAccountCreator,
  TAccountSystemProgram
> {
  // Program address.
  const programAddress =
    config?.programAddress ?? GHOSTSPEAK_MARKETPLACE_PROGRAM_ADDRESS;

  // Original accounts.
  const originalAccounts = {
    program: { value: input.program ?? null, isWritable: true },
    creator: { value: input.creator ?? null, isWritable: true },
    systemProgram: { value: input.systemProgram ?? null, isWritable: false },
  };
  const accounts = originalAccounts as Record<
    keyof typeof originalAccounts,
    ResolvedAccount
  >;

  // Original args.
  const args = { ...input };

  // Resolve default values.
  if (!accounts.systemProgram.value) {
    accounts.systemProgram.value =
      '11111111111111111111111111111111' as Address<'11111111111111111111111111111111'>;
  }

  const getAccountMeta = getAccountMetaFactory(programAddress, 'programId');
  const instruction = {
    accounts: [
      getAccountMeta(accounts.program),
      getAccountMeta(accounts.creator),
      getAccountMeta(accounts.systemProgram),
    ],
    programAddress,
    data: getCreateIncentiveProgramInstructionDataEncoder().encode(
      args as CreateIncentiveProgramInstructionDataArgs
    ),
  } as CreateIncentiveProgramInstruction<
    TProgramAddress,
    TAccountProgram,
    TAccountCreator,
    TAccountSystemProgram
  >;

  return instruction;
}

export type ParsedCreateIncentiveProgramInstruction<
  TProgram extends string = typeof GHOSTSPEAK_MARKETPLACE_PROGRAM_ADDRESS,
  TAccountMetas extends readonly AccountMeta[] = readonly AccountMeta[],
> = {
  programAddress: Address<TProgram>;
  accounts: {
    program: TAccountMetas[0];
    creator: TAccountMetas[1];
    systemProgram: TAccountMetas[2];
  };
  data: CreateIncentiveProgramInstructionData;
};

export function parseCreateIncentiveProgramInstruction<
  TProgram extends string,
  TAccountMetas extends readonly AccountMeta[],
>(
  instruction: Instruction<TProgram> &
    InstructionWithAccounts<TAccountMetas> &
    InstructionWithData<ReadonlyUint8Array>
): ParsedCreateIncentiveProgramInstruction<TProgram, TAccountMetas> {
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
      program: getNextAccount(),
      creator: getNextAccount(),
      systemProgram: getNextAccount(),
    },
    data: getCreateIncentiveProgramInstructionDataDecoder().decode(
      instruction.data
    ),
  };
}
