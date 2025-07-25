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
  combineCodec,
  fixDecoderSize,
  fixEncoderSize,
  getBytesDecoder,
  getBytesEncoder,
  getProgramDerivedAddress,
  getStructDecoder,
  getStructEncoder,
  getU32Decoder,
  getU32Encoder,
  getUtf8Decoder,
  getUtf8Encoder,
  transformEncoder,
  type AccountMeta,
  type AccountSignerMeta,
  type Address,
  type Codec,
  type Decoder,
  type Encoder,
  type Instruction,
  type InstructionWithAccounts,
  type InstructionWithData,
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
import { getAccountMetaFactory, type ResolvedAccount } from '../shared';

export const DISPUTE_ESCROW_DISCRIMINATOR = new Uint8Array([
  198, 174, 139, 70, 87, 79, 181, 139,
]);

export function getDisputeEscrowDiscriminatorBytes() {
  return fixEncoderSize(getBytesEncoder(), 8).encode(
    DISPUTE_ESCROW_DISCRIMINATOR
  );
}

export type DisputeEscrowInstruction<
  TProgram extends string = typeof GHOSTSPEAK_MARKETPLACE_PROGRAM_ADDRESS,
  TAccountEscrow extends string | AccountMeta<string> = string,
  TAccountReentrancyGuard extends string | AccountMeta<string> = string,
  TAccountAuthority extends string | AccountMeta<string> = string,
  TRemainingAccounts extends readonly AccountMeta<string>[] = [],
> = Instruction<TProgram> &
  InstructionWithData<ReadonlyUint8Array> &
  InstructionWithAccounts<
    [
      TAccountEscrow extends string
        ? WritableAccount<TAccountEscrow>
        : TAccountEscrow,
      TAccountReentrancyGuard extends string
        ? WritableAccount<TAccountReentrancyGuard>
        : TAccountReentrancyGuard,
      TAccountAuthority extends string
        ? ReadonlySignerAccount<TAccountAuthority> &
            AccountSignerMeta<TAccountAuthority>
        : TAccountAuthority,
      ...TRemainingAccounts,
    ]
  >;

export type DisputeEscrowInstructionData = {
  discriminator: ReadonlyUint8Array;
  disputeReason: string;
};

export type DisputeEscrowInstructionDataArgs = { disputeReason: string };

export function getDisputeEscrowInstructionDataEncoder(): Encoder<DisputeEscrowInstructionDataArgs> {
  return transformEncoder(
    getStructEncoder([
      ['discriminator', fixEncoderSize(getBytesEncoder(), 8)],
      [
        'disputeReason',
        addEncoderSizePrefix(getUtf8Encoder(), getU32Encoder()),
      ],
    ]),
    (value) => ({ ...value, discriminator: DISPUTE_ESCROW_DISCRIMINATOR })
  );
}

export function getDisputeEscrowInstructionDataDecoder(): Decoder<DisputeEscrowInstructionData> {
  return getStructDecoder([
    ['discriminator', fixDecoderSize(getBytesDecoder(), 8)],
    ['disputeReason', addDecoderSizePrefix(getUtf8Decoder(), getU32Decoder())],
  ]);
}

export function getDisputeEscrowInstructionDataCodec(): Codec<
  DisputeEscrowInstructionDataArgs,
  DisputeEscrowInstructionData
> {
  return combineCodec(
    getDisputeEscrowInstructionDataEncoder(),
    getDisputeEscrowInstructionDataDecoder()
  );
}

export type DisputeEscrowAsyncInput<
  TAccountEscrow extends string = string,
  TAccountReentrancyGuard extends string = string,
  TAccountAuthority extends string = string,
> = {
  escrow: Address<TAccountEscrow>;
  reentrancyGuard?: Address<TAccountReentrancyGuard>;
  authority: TransactionSigner<TAccountAuthority>;
  disputeReason: DisputeEscrowInstructionDataArgs['disputeReason'];
};

export async function getDisputeEscrowInstructionAsync<
  TAccountEscrow extends string,
  TAccountReentrancyGuard extends string,
  TAccountAuthority extends string,
  TProgramAddress extends
    Address = typeof GHOSTSPEAK_MARKETPLACE_PROGRAM_ADDRESS,
>(
  input: DisputeEscrowAsyncInput<
    TAccountEscrow,
    TAccountReentrancyGuard,
    TAccountAuthority
  >,
  config?: { programAddress?: TProgramAddress }
): Promise<
  DisputeEscrowInstruction<
    TProgramAddress,
    TAccountEscrow,
    TAccountReentrancyGuard,
    TAccountAuthority
  >
> {
  // Program address.
  const programAddress =
    config?.programAddress ?? GHOSTSPEAK_MARKETPLACE_PROGRAM_ADDRESS;

  // Original accounts.
  const originalAccounts = {
    escrow: { value: input.escrow ?? null, isWritable: true },
    reentrancyGuard: { value: input.reentrancyGuard ?? null, isWritable: true },
    authority: { value: input.authority ?? null, isWritable: false },
  };
  const accounts = originalAccounts as Record<
    keyof typeof originalAccounts,
    ResolvedAccount
  >;

  // Original args.
  const args = { ...input };

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
      getAccountMeta(accounts.escrow),
      getAccountMeta(accounts.reentrancyGuard),
      getAccountMeta(accounts.authority),
    ],
    programAddress,
    data: getDisputeEscrowInstructionDataEncoder().encode(
      args as DisputeEscrowInstructionDataArgs
    ),
  } as DisputeEscrowInstruction<
    TProgramAddress,
    TAccountEscrow,
    TAccountReentrancyGuard,
    TAccountAuthority
  >;

  return instruction;
}

export type DisputeEscrowInput<
  TAccountEscrow extends string = string,
  TAccountReentrancyGuard extends string = string,
  TAccountAuthority extends string = string,
> = {
  escrow: Address<TAccountEscrow>;
  reentrancyGuard: Address<TAccountReentrancyGuard>;
  authority: TransactionSigner<TAccountAuthority>;
  disputeReason: DisputeEscrowInstructionDataArgs['disputeReason'];
};

export function getDisputeEscrowInstruction<
  TAccountEscrow extends string,
  TAccountReentrancyGuard extends string,
  TAccountAuthority extends string,
  TProgramAddress extends
    Address = typeof GHOSTSPEAK_MARKETPLACE_PROGRAM_ADDRESS,
>(
  input: DisputeEscrowInput<
    TAccountEscrow,
    TAccountReentrancyGuard,
    TAccountAuthority
  >,
  config?: { programAddress?: TProgramAddress }
): DisputeEscrowInstruction<
  TProgramAddress,
  TAccountEscrow,
  TAccountReentrancyGuard,
  TAccountAuthority
> {
  // Program address.
  const programAddress =
    config?.programAddress ?? GHOSTSPEAK_MARKETPLACE_PROGRAM_ADDRESS;

  // Original accounts.
  const originalAccounts = {
    escrow: { value: input.escrow ?? null, isWritable: true },
    reentrancyGuard: { value: input.reentrancyGuard ?? null, isWritable: true },
    authority: { value: input.authority ?? null, isWritable: false },
  };
  const accounts = originalAccounts as Record<
    keyof typeof originalAccounts,
    ResolvedAccount
  >;

  // Original args.
  const args = { ...input };

  const getAccountMeta = getAccountMetaFactory(programAddress, 'programId');
  const instruction = {
    accounts: [
      getAccountMeta(accounts.escrow),
      getAccountMeta(accounts.reentrancyGuard),
      getAccountMeta(accounts.authority),
    ],
    programAddress,
    data: getDisputeEscrowInstructionDataEncoder().encode(
      args as DisputeEscrowInstructionDataArgs
    ),
  } as DisputeEscrowInstruction<
    TProgramAddress,
    TAccountEscrow,
    TAccountReentrancyGuard,
    TAccountAuthority
  >;

  return instruction;
}

export type ParsedDisputeEscrowInstruction<
  TProgram extends string = typeof GHOSTSPEAK_MARKETPLACE_PROGRAM_ADDRESS,
  TAccountMetas extends readonly AccountMeta[] = readonly AccountMeta[],
> = {
  programAddress: Address<TProgram>;
  accounts: {
    escrow: TAccountMetas[0];
    reentrancyGuard: TAccountMetas[1];
    authority: TAccountMetas[2];
  };
  data: DisputeEscrowInstructionData;
};

export function parseDisputeEscrowInstruction<
  TProgram extends string,
  TAccountMetas extends readonly AccountMeta[],
>(
  instruction: Instruction<TProgram> &
    InstructionWithAccounts<TAccountMetas> &
    InstructionWithData<ReadonlyUint8Array>
): ParsedDisputeEscrowInstruction<TProgram, TAccountMetas> {
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
      escrow: getNextAccount(),
      reentrancyGuard: getNextAccount(),
      authority: getNextAccount(),
    },
    data: getDisputeEscrowInstructionDataDecoder().decode(instruction.data),
  };
}
