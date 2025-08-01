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
  getStructDecoder,
  getStructEncoder,
  transformEncoder,
  type AccountMeta,
  type Address,
  type Codec,
  type Decoder,
  type Encoder,
  type Instruction,
  type InstructionWithAccounts,
  type InstructionWithData,
  type ReadonlyAccount,
  type ReadonlyUint8Array,
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
import {
  getActionDecoder,
  getActionEncoder,
  type Action,
  type ActionArgs,
} from '../types';

export const EXPORT_ACTION_DISCRIMINATOR = new Uint8Array([
  206, 39, 235, 232, 29, 98, 124, 4,
]);

export function getExportActionDiscriminatorBytes() {
  return fixEncoderSize(getBytesEncoder(), 8).encode(
    EXPORT_ACTION_DISCRIMINATOR
  );
}

export type ExportActionInstruction<
  TProgram extends string = typeof GHOSTSPEAK_MARKETPLACE_PROGRAM_ADDRESS,
  TAccountSystemProgram extends
    | string
    | AccountMeta<string> = '11111111111111111111111111111111',
  TRemainingAccounts extends readonly AccountMeta<string>[] = [],
> = Instruction<TProgram> &
  InstructionWithData<ReadonlyUint8Array> &
  InstructionWithAccounts<
    [
      TAccountSystemProgram extends string
        ? ReadonlyAccount<TAccountSystemProgram>
        : TAccountSystemProgram,
      ...TRemainingAccounts,
    ]
  >;

export type ExportActionInstructionData = {
  discriminator: ReadonlyUint8Array;
  data: Action;
};

export type ExportActionInstructionDataArgs = { data: ActionArgs };

export function getExportActionInstructionDataEncoder(): Encoder<ExportActionInstructionDataArgs> {
  return transformEncoder(
    getStructEncoder([
      ['discriminator', fixEncoderSize(getBytesEncoder(), 8)],
      ['data', getActionEncoder()],
    ]),
    (value) => ({ ...value, discriminator: EXPORT_ACTION_DISCRIMINATOR })
  );
}

export function getExportActionInstructionDataDecoder(): Decoder<ExportActionInstructionData> {
  return getStructDecoder([
    ['discriminator', fixDecoderSize(getBytesDecoder(), 8)],
    ['data', getActionDecoder()],
  ]);
}

export function getExportActionInstructionDataCodec(): Codec<
  ExportActionInstructionDataArgs,
  ExportActionInstructionData
> {
  return combineCodec(
    getExportActionInstructionDataEncoder(),
    getExportActionInstructionDataDecoder()
  );
}

export type ExportActionInput<TAccountSystemProgram extends string = string> = {
  systemProgram?: Address<TAccountSystemProgram>;
  data: ExportActionInstructionDataArgs['data'];
};

export function getExportActionInstruction<
  TAccountSystemProgram extends string,
  TProgramAddress extends
    Address = typeof GHOSTSPEAK_MARKETPLACE_PROGRAM_ADDRESS,
>(
  input: ExportActionInput<TAccountSystemProgram>,
  config?: { programAddress?: TProgramAddress }
): ExportActionInstruction<TProgramAddress, TAccountSystemProgram> {
  // Program address.
  const programAddress =
    config?.programAddress ?? GHOSTSPEAK_MARKETPLACE_PROGRAM_ADDRESS;

  // Original accounts.
  const originalAccounts = {
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
    accounts: [getAccountMeta(accounts.systemProgram)],
    programAddress,
    data: getExportActionInstructionDataEncoder().encode(
      args as ExportActionInstructionDataArgs
    ),
  } as ExportActionInstruction<TProgramAddress, TAccountSystemProgram>;

  return instruction;
}

export type ParsedExportActionInstruction<
  TProgram extends string = typeof GHOSTSPEAK_MARKETPLACE_PROGRAM_ADDRESS,
  TAccountMetas extends readonly AccountMeta[] = readonly AccountMeta[],
> = {
  programAddress: Address<TProgram>;
  accounts: {
    systemProgram: TAccountMetas[0];
  };
  data: ExportActionInstructionData;
};

export function parseExportActionInstruction<
  TProgram extends string,
  TAccountMetas extends readonly AccountMeta[],
>(
  instruction: Instruction<TProgram> &
    InstructionWithAccounts<TAccountMetas> &
    InstructionWithData<ReadonlyUint8Array>
): ParsedExportActionInstruction<TProgram, TAccountMetas> {
  if (instruction.accounts.length < 1) {
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
      systemProgram: getNextAccount(),
    },
    data: getExportActionInstructionDataDecoder().decode(instruction.data),
  };
}
