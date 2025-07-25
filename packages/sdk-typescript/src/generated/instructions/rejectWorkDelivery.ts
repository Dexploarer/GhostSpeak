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
  getArrayDecoder,
  getArrayEncoder,
  getBytesDecoder,
  getBytesEncoder,
  getOptionDecoder,
  getOptionEncoder,
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
  type Option,
  type OptionOrNullable,
  type ReadonlyAccount,
  type ReadonlyUint8Array,
  type TransactionSigner,
  type WritableAccount,
  type WritableSignerAccount,
} from '@solana/kit';
import { GHOSTSPEAK_MARKETPLACE_PROGRAM_ADDRESS } from '../programs';
import { getAccountMetaFactory, type ResolvedAccount } from '../shared';
import { getWorkOrderErrorMessage } from '../../utils/enhanced-client-errors.js';

export const REJECT_WORK_DELIVERY_DISCRIMINATOR = new Uint8Array([
  123, 7, 32, 171, 41, 109, 58, 250,
]);

export function getRejectWorkDeliveryDiscriminatorBytes() {
  return fixEncoderSize(getBytesEncoder(), 8).encode(
    REJECT_WORK_DELIVERY_DISCRIMINATOR
  );
}

export type RejectWorkDeliveryInstruction<
  TProgram extends string = typeof GHOSTSPEAK_MARKETPLACE_PROGRAM_ADDRESS,
  TAccountWorkOrder extends string | AccountMeta<string> = string,
  TAccountWorkDelivery extends string | AccountMeta<string> = string,
  TAccountClient extends string | AccountMeta<string> = string,
  TAccountClock extends
    | string
    | AccountMeta<string> = 'SysvarC1ock11111111111111111111111111111111',
  TRemainingAccounts extends readonly AccountMeta<string>[] = [],
> = Instruction<TProgram> &
  InstructionWithData<ReadonlyUint8Array> &
  InstructionWithAccounts<
    [
      TAccountWorkOrder extends string
        ? WritableAccount<TAccountWorkOrder>
        : TAccountWorkOrder,
      TAccountWorkDelivery extends string
        ? ReadonlyAccount<TAccountWorkDelivery>
        : TAccountWorkDelivery,
      TAccountClient extends string
        ? WritableSignerAccount<TAccountClient> &
            AccountSignerMeta<TAccountClient>
        : TAccountClient,
      TAccountClock extends string
        ? ReadonlyAccount<TAccountClock>
        : TAccountClock,
      ...TRemainingAccounts,
    ]
  >;

export type RejectWorkDeliveryInstructionData = {
  discriminator: ReadonlyUint8Array;
  rejectionReason: string;
  requestedChanges: Option<Array<string>>;
};

export type RejectWorkDeliveryInstructionDataArgs = {
  rejectionReason: string;
  requestedChanges: OptionOrNullable<Array<string>>;
};

export function getRejectWorkDeliveryInstructionDataEncoder(): Encoder<RejectWorkDeliveryInstructionDataArgs> {
  return transformEncoder(
    getStructEncoder([
      ['discriminator', fixEncoderSize(getBytesEncoder(), 8)],
      [
        'rejectionReason',
        addEncoderSizePrefix(getUtf8Encoder(), getU32Encoder()),
      ],
      [
        'requestedChanges',
        getOptionEncoder(
          getArrayEncoder(
            addEncoderSizePrefix(getUtf8Encoder(), getU32Encoder())
          )
        ),
      ],
    ]),
    (value) => ({ ...value, discriminator: REJECT_WORK_DELIVERY_DISCRIMINATOR })
  );
}

export function getRejectWorkDeliveryInstructionDataDecoder(): Decoder<RejectWorkDeliveryInstructionData> {
  return getStructDecoder([
    ['discriminator', fixDecoderSize(getBytesDecoder(), 8)],
    [
      'rejectionReason',
      addDecoderSizePrefix(getUtf8Decoder(), getU32Decoder()),
    ],
    [
      'requestedChanges',
      getOptionDecoder(
        getArrayDecoder(addDecoderSizePrefix(getUtf8Decoder(), getU32Decoder()))
      ),
    ],
  ]);
}

export function getRejectWorkDeliveryInstructionDataCodec(): Codec<
  RejectWorkDeliveryInstructionDataArgs,
  RejectWorkDeliveryInstructionData
> {
  return combineCodec(
    getRejectWorkDeliveryInstructionDataEncoder(),
    getRejectWorkDeliveryInstructionDataDecoder()
  );
}

export type RejectWorkDeliveryInput<
  TAccountWorkOrder extends string = string,
  TAccountWorkDelivery extends string = string,
  TAccountClient extends string = string,
  TAccountClock extends string = string,
> = {
  workOrder: Address<TAccountWorkOrder>;
  workDelivery: Address<TAccountWorkDelivery>;
  client: TransactionSigner<TAccountClient>;
  clock?: Address<TAccountClock>;
  rejectionReason: RejectWorkDeliveryInstructionDataArgs['rejectionReason'];
  requestedChanges: RejectWorkDeliveryInstructionDataArgs['requestedChanges'];
};

export function getRejectWorkDeliveryInstruction<
  TAccountWorkOrder extends string,
  TAccountWorkDelivery extends string,
  TAccountClient extends string,
  TAccountClock extends string,
  TProgramAddress extends
    Address = typeof GHOSTSPEAK_MARKETPLACE_PROGRAM_ADDRESS,
>(
  input: RejectWorkDeliveryInput<
    TAccountWorkOrder,
    TAccountWorkDelivery,
    TAccountClient,
    TAccountClock
  >,
  config?: { programAddress?: TProgramAddress }
): RejectWorkDeliveryInstruction<
  TProgramAddress,
  TAccountWorkOrder,
  TAccountWorkDelivery,
  TAccountClient,
  TAccountClock
> {
  // Program address.
  const programAddress =
    config?.programAddress ?? GHOSTSPEAK_MARKETPLACE_PROGRAM_ADDRESS;

  // Original accounts.
  const originalAccounts = {
    workOrder: { value: input.workOrder ?? null, isWritable: true },
    workDelivery: { value: input.workDelivery ?? null, isWritable: false },
    client: { value: input.client ?? null, isWritable: true },
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
      getAccountMeta(accounts.workOrder),
      getAccountMeta(accounts.workDelivery),
      getAccountMeta(accounts.client),
      getAccountMeta(accounts.clock),
    ],
    programAddress,
    data: getRejectWorkDeliveryInstructionDataEncoder().encode(
      args as RejectWorkDeliveryInstructionDataArgs
    ),
  } as RejectWorkDeliveryInstruction<
    TProgramAddress,
    TAccountWorkOrder,
    TAccountWorkDelivery,
    TAccountClient,
    TAccountClock
  >;

  return instruction;
}

export type ParsedRejectWorkDeliveryInstruction<
  TProgram extends string = typeof GHOSTSPEAK_MARKETPLACE_PROGRAM_ADDRESS,
  TAccountMetas extends readonly AccountMeta[] = readonly AccountMeta[],
> = {
  programAddress: Address<TProgram>;
  accounts: {
    workOrder: TAccountMetas[0];
    workDelivery: TAccountMetas[1];
    client: TAccountMetas[2];
    clock: TAccountMetas[3];
  };
  data: RejectWorkDeliveryInstructionData;
};

export function parseRejectWorkDeliveryInstruction<
  TProgram extends string,
  TAccountMetas extends readonly AccountMeta[],
>(
  instruction: Instruction<TProgram> &
    InstructionWithAccounts<TAccountMetas> &
    InstructionWithData<ReadonlyUint8Array>
): ParsedRejectWorkDeliveryInstruction<TProgram, TAccountMetas> {
  if (instruction.accounts.length < 4) {
    throw new Error(getWorkOrderErrorMessage("reject_work_delivery", instruction.accounts.length));
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
      workOrder: getNextAccount(),
      workDelivery: getNextAccount(),
      client: getNextAccount(),
      clock: getNextAccount(),
    },
    data: getRejectWorkDeliveryInstructionDataDecoder().decode(
      instruction.data
    ),
  };
}
