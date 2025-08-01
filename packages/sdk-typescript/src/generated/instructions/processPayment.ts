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
  getU64Decoder,
  getU64Encoder,
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

export const PROCESS_PAYMENT_DISCRIMINATOR = new Uint8Array([
  189, 81, 30, 198, 139, 186, 115, 23,
]);

export function getProcessPaymentDiscriminatorBytes() {
  return fixEncoderSize(getBytesEncoder(), 8).encode(
    PROCESS_PAYMENT_DISCRIMINATOR
  );
}

export type ProcessPaymentInstruction<
  TProgram extends string = typeof GHOSTSPEAK_MARKETPLACE_PROGRAM_ADDRESS,
  TAccountPayment extends string | AccountMeta<string> = string,
  TAccountWorkOrder extends string | AccountMeta<string> = string,
  TAccountProviderAgent extends string | AccountMeta<string> = string,
  TAccountPayer extends string | AccountMeta<string> = string,
  TAccountPayerTokenAccount extends string | AccountMeta<string> = string,
  TAccountProviderTokenAccount extends string | AccountMeta<string> = string,
  TAccountTokenMint extends string | AccountMeta<string> = string,
  TAccountTokenProgram extends
    | string
    | AccountMeta<string> = 'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb',
  TAccountSystemProgram extends
    | string
    | AccountMeta<string> = '11111111111111111111111111111111',
  TRemainingAccounts extends readonly AccountMeta<string>[] = [],
> = Instruction<TProgram> &
  InstructionWithData<ReadonlyUint8Array> &
  InstructionWithAccounts<
    [
      TAccountPayment extends string
        ? WritableAccount<TAccountPayment>
        : TAccountPayment,
      TAccountWorkOrder extends string
        ? WritableAccount<TAccountWorkOrder>
        : TAccountWorkOrder,
      TAccountProviderAgent extends string
        ? WritableAccount<TAccountProviderAgent>
        : TAccountProviderAgent,
      TAccountPayer extends string
        ? WritableSignerAccount<TAccountPayer> &
            AccountSignerMeta<TAccountPayer>
        : TAccountPayer,
      TAccountPayerTokenAccount extends string
        ? WritableAccount<TAccountPayerTokenAccount>
        : TAccountPayerTokenAccount,
      TAccountProviderTokenAccount extends string
        ? WritableAccount<TAccountProviderTokenAccount>
        : TAccountProviderTokenAccount,
      TAccountTokenMint extends string
        ? ReadonlyAccount<TAccountTokenMint>
        : TAccountTokenMint,
      TAccountTokenProgram extends string
        ? ReadonlyAccount<TAccountTokenProgram>
        : TAccountTokenProgram,
      TAccountSystemProgram extends string
        ? ReadonlyAccount<TAccountSystemProgram>
        : TAccountSystemProgram,
      ...TRemainingAccounts,
    ]
  >;

export type ProcessPaymentInstructionData = {
  discriminator: ReadonlyUint8Array;
  amount: bigint;
  useConfidentialTransfer: boolean;
};

export type ProcessPaymentInstructionDataArgs = {
  amount: number | bigint;
  useConfidentialTransfer: boolean;
};

export function getProcessPaymentInstructionDataEncoder(): FixedSizeEncoder<ProcessPaymentInstructionDataArgs> {
  return transformEncoder(
    getStructEncoder([
      ['discriminator', fixEncoderSize(getBytesEncoder(), 8)],
      ['amount', getU64Encoder()],
      ['useConfidentialTransfer', getBooleanEncoder()],
    ]),
    (value) => ({ ...value, discriminator: PROCESS_PAYMENT_DISCRIMINATOR })
  );
}

export function getProcessPaymentInstructionDataDecoder(): FixedSizeDecoder<ProcessPaymentInstructionData> {
  return getStructDecoder([
    ['discriminator', fixDecoderSize(getBytesDecoder(), 8)],
    ['amount', getU64Decoder()],
    ['useConfidentialTransfer', getBooleanDecoder()],
  ]);
}

export function getProcessPaymentInstructionDataCodec(): FixedSizeCodec<
  ProcessPaymentInstructionDataArgs,
  ProcessPaymentInstructionData
> {
  return combineCodec(
    getProcessPaymentInstructionDataEncoder(),
    getProcessPaymentInstructionDataDecoder()
  );
}

export type ProcessPaymentAsyncInput<
  TAccountPayment extends string = string,
  TAccountWorkOrder extends string = string,
  TAccountProviderAgent extends string = string,
  TAccountPayer extends string = string,
  TAccountPayerTokenAccount extends string = string,
  TAccountProviderTokenAccount extends string = string,
  TAccountTokenMint extends string = string,
  TAccountTokenProgram extends string = string,
  TAccountSystemProgram extends string = string,
> = {
  payment?: Address<TAccountPayment>;
  workOrder: Address<TAccountWorkOrder>;
  providerAgent: Address<TAccountProviderAgent>;
  payer: TransactionSigner<TAccountPayer>;
  payerTokenAccount: Address<TAccountPayerTokenAccount>;
  providerTokenAccount: Address<TAccountProviderTokenAccount>;
  tokenMint: Address<TAccountTokenMint>;
  tokenProgram?: Address<TAccountTokenProgram>;
  systemProgram?: Address<TAccountSystemProgram>;
  amount: ProcessPaymentInstructionDataArgs['amount'];
  useConfidentialTransfer: ProcessPaymentInstructionDataArgs['useConfidentialTransfer'];
};

export async function getProcessPaymentInstructionAsync<
  TAccountPayment extends string,
  TAccountWorkOrder extends string,
  TAccountProviderAgent extends string,
  TAccountPayer extends string,
  TAccountPayerTokenAccount extends string,
  TAccountProviderTokenAccount extends string,
  TAccountTokenMint extends string,
  TAccountTokenProgram extends string,
  TAccountSystemProgram extends string,
  TProgramAddress extends
    Address = typeof GHOSTSPEAK_MARKETPLACE_PROGRAM_ADDRESS,
>(
  input: ProcessPaymentAsyncInput<
    TAccountPayment,
    TAccountWorkOrder,
    TAccountProviderAgent,
    TAccountPayer,
    TAccountPayerTokenAccount,
    TAccountProviderTokenAccount,
    TAccountTokenMint,
    TAccountTokenProgram,
    TAccountSystemProgram
  >,
  config?: { programAddress?: TProgramAddress }
): Promise<
  ProcessPaymentInstruction<
    TProgramAddress,
    TAccountPayment,
    TAccountWorkOrder,
    TAccountProviderAgent,
    TAccountPayer,
    TAccountPayerTokenAccount,
    TAccountProviderTokenAccount,
    TAccountTokenMint,
    TAccountTokenProgram,
    TAccountSystemProgram
  >
> {
  // Program address.
  const programAddress =
    config?.programAddress ?? GHOSTSPEAK_MARKETPLACE_PROGRAM_ADDRESS;

  // Original accounts.
  const originalAccounts = {
    payment: { value: input.payment ?? null, isWritable: true },
    workOrder: { value: input.workOrder ?? null, isWritable: true },
    providerAgent: { value: input.providerAgent ?? null, isWritable: true },
    payer: { value: input.payer ?? null, isWritable: true },
    payerTokenAccount: {
      value: input.payerTokenAccount ?? null,
      isWritable: true,
    },
    providerTokenAccount: {
      value: input.providerTokenAccount ?? null,
      isWritable: true,
    },
    tokenMint: { value: input.tokenMint ?? null, isWritable: false },
    tokenProgram: { value: input.tokenProgram ?? null, isWritable: false },
    systemProgram: { value: input.systemProgram ?? null, isWritable: false },
  };
  const accounts = originalAccounts as Record<
    keyof typeof originalAccounts,
    ResolvedAccount
  >;

  // Original args.
  const args = { ...input };

  // Resolve default values.
  if (!accounts.payment.value) {
    accounts.payment.value = await getProgramDerivedAddress({
      programAddress,
      seeds: [
        getBytesEncoder().encode(
          new Uint8Array([112, 97, 121, 109, 101, 110, 116])
        ),
        getAddressEncoder().encode(expectAddress(accounts.workOrder.value)),
      ],
    });
  }
  if (!accounts.tokenProgram.value) {
    accounts.tokenProgram.value =
      'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb' as Address<'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb'>;
  }
  if (!accounts.systemProgram.value) {
    accounts.systemProgram.value =
      '11111111111111111111111111111111' as Address<'11111111111111111111111111111111'>;
  }

  const getAccountMeta = getAccountMetaFactory(programAddress, 'programId');
  const instruction = {
    accounts: [
      getAccountMeta(accounts.payment),
      getAccountMeta(accounts.workOrder),
      getAccountMeta(accounts.providerAgent),
      getAccountMeta(accounts.payer),
      getAccountMeta(accounts.payerTokenAccount),
      getAccountMeta(accounts.providerTokenAccount),
      getAccountMeta(accounts.tokenMint),
      getAccountMeta(accounts.tokenProgram),
      getAccountMeta(accounts.systemProgram),
    ],
    programAddress,
    data: getProcessPaymentInstructionDataEncoder().encode(
      args as ProcessPaymentInstructionDataArgs
    ),
  } as ProcessPaymentInstruction<
    TProgramAddress,
    TAccountPayment,
    TAccountWorkOrder,
    TAccountProviderAgent,
    TAccountPayer,
    TAccountPayerTokenAccount,
    TAccountProviderTokenAccount,
    TAccountTokenMint,
    TAccountTokenProgram,
    TAccountSystemProgram
  >;

  return instruction;
}

export type ProcessPaymentInput<
  TAccountPayment extends string = string,
  TAccountWorkOrder extends string = string,
  TAccountProviderAgent extends string = string,
  TAccountPayer extends string = string,
  TAccountPayerTokenAccount extends string = string,
  TAccountProviderTokenAccount extends string = string,
  TAccountTokenMint extends string = string,
  TAccountTokenProgram extends string = string,
  TAccountSystemProgram extends string = string,
> = {
  payment: Address<TAccountPayment>;
  workOrder: Address<TAccountWorkOrder>;
  providerAgent: Address<TAccountProviderAgent>;
  payer: TransactionSigner<TAccountPayer>;
  payerTokenAccount: Address<TAccountPayerTokenAccount>;
  providerTokenAccount: Address<TAccountProviderTokenAccount>;
  tokenMint: Address<TAccountTokenMint>;
  tokenProgram?: Address<TAccountTokenProgram>;
  systemProgram?: Address<TAccountSystemProgram>;
  amount: ProcessPaymentInstructionDataArgs['amount'];
  useConfidentialTransfer: ProcessPaymentInstructionDataArgs['useConfidentialTransfer'];
};

export function getProcessPaymentInstruction<
  TAccountPayment extends string,
  TAccountWorkOrder extends string,
  TAccountProviderAgent extends string,
  TAccountPayer extends string,
  TAccountPayerTokenAccount extends string,
  TAccountProviderTokenAccount extends string,
  TAccountTokenMint extends string,
  TAccountTokenProgram extends string,
  TAccountSystemProgram extends string,
  TProgramAddress extends
    Address = typeof GHOSTSPEAK_MARKETPLACE_PROGRAM_ADDRESS,
>(
  input: ProcessPaymentInput<
    TAccountPayment,
    TAccountWorkOrder,
    TAccountProviderAgent,
    TAccountPayer,
    TAccountPayerTokenAccount,
    TAccountProviderTokenAccount,
    TAccountTokenMint,
    TAccountTokenProgram,
    TAccountSystemProgram
  >,
  config?: { programAddress?: TProgramAddress }
): ProcessPaymentInstruction<
  TProgramAddress,
  TAccountPayment,
  TAccountWorkOrder,
  TAccountProviderAgent,
  TAccountPayer,
  TAccountPayerTokenAccount,
  TAccountProviderTokenAccount,
  TAccountTokenMint,
  TAccountTokenProgram,
  TAccountSystemProgram
> {
  // Program address.
  const programAddress =
    config?.programAddress ?? GHOSTSPEAK_MARKETPLACE_PROGRAM_ADDRESS;

  // Original accounts.
  const originalAccounts = {
    payment: { value: input.payment ?? null, isWritable: true },
    workOrder: { value: input.workOrder ?? null, isWritable: true },
    providerAgent: { value: input.providerAgent ?? null, isWritable: true },
    payer: { value: input.payer ?? null, isWritable: true },
    payerTokenAccount: {
      value: input.payerTokenAccount ?? null,
      isWritable: true,
    },
    providerTokenAccount: {
      value: input.providerTokenAccount ?? null,
      isWritable: true,
    },
    tokenMint: { value: input.tokenMint ?? null, isWritable: false },
    tokenProgram: { value: input.tokenProgram ?? null, isWritable: false },
    systemProgram: { value: input.systemProgram ?? null, isWritable: false },
  };
  const accounts = originalAccounts as Record<
    keyof typeof originalAccounts,
    ResolvedAccount
  >;

  // Original args.
  const args = { ...input };

  // Resolve default values.
  if (!accounts.tokenProgram.value) {
    accounts.tokenProgram.value =
      'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb' as Address<'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb'>;
  }
  if (!accounts.systemProgram.value) {
    accounts.systemProgram.value =
      '11111111111111111111111111111111' as Address<'11111111111111111111111111111111'>;
  }

  const getAccountMeta = getAccountMetaFactory(programAddress, 'programId');
  const instruction = {
    accounts: [
      getAccountMeta(accounts.payment),
      getAccountMeta(accounts.workOrder),
      getAccountMeta(accounts.providerAgent),
      getAccountMeta(accounts.payer),
      getAccountMeta(accounts.payerTokenAccount),
      getAccountMeta(accounts.providerTokenAccount),
      getAccountMeta(accounts.tokenMint),
      getAccountMeta(accounts.tokenProgram),
      getAccountMeta(accounts.systemProgram),
    ],
    programAddress,
    data: getProcessPaymentInstructionDataEncoder().encode(
      args as ProcessPaymentInstructionDataArgs
    ),
  } as ProcessPaymentInstruction<
    TProgramAddress,
    TAccountPayment,
    TAccountWorkOrder,
    TAccountProviderAgent,
    TAccountPayer,
    TAccountPayerTokenAccount,
    TAccountProviderTokenAccount,
    TAccountTokenMint,
    TAccountTokenProgram,
    TAccountSystemProgram
  >;

  return instruction;
}

export type ParsedProcessPaymentInstruction<
  TProgram extends string = typeof GHOSTSPEAK_MARKETPLACE_PROGRAM_ADDRESS,
  TAccountMetas extends readonly AccountMeta[] = readonly AccountMeta[],
> = {
  programAddress: Address<TProgram>;
  accounts: {
    payment: TAccountMetas[0];
    workOrder: TAccountMetas[1];
    providerAgent: TAccountMetas[2];
    payer: TAccountMetas[3];
    payerTokenAccount: TAccountMetas[4];
    providerTokenAccount: TAccountMetas[5];
    tokenMint: TAccountMetas[6];
    tokenProgram: TAccountMetas[7];
    systemProgram: TAccountMetas[8];
  };
  data: ProcessPaymentInstructionData;
};

export function parseProcessPaymentInstruction<
  TProgram extends string,
  TAccountMetas extends readonly AccountMeta[],
>(
  instruction: Instruction<TProgram> &
    InstructionWithAccounts<TAccountMetas> &
    InstructionWithData<ReadonlyUint8Array>
): ParsedProcessPaymentInstruction<TProgram, TAccountMetas> {
  if (instruction.accounts.length < 9) {
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
      payment: getNextAccount(),
      workOrder: getNextAccount(),
      providerAgent: getNextAccount(),
      payer: getNextAccount(),
      payerTokenAccount: getNextAccount(),
      providerTokenAccount: getNextAccount(),
      tokenMint: getNextAccount(),
      tokenProgram: getNextAccount(),
      systemProgram: getNextAccount(),
    },
    data: getProcessPaymentInstructionDataDecoder().decode(instruction.data),
  };
}
