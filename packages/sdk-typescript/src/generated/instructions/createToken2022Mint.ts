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
  getAddressDecoder,
  getAddressEncoder,
  getBooleanDecoder,
  getBooleanEncoder,
  getBytesDecoder,
  getBytesEncoder,
  getOptionDecoder,
  getOptionEncoder,
  getProgramDerivedAddress,
  getStructDecoder,
  getStructEncoder,
  getU8Decoder,
  getU8Encoder,
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

export const CREATE_TOKEN2022_MINT_DISCRIMINATOR = new Uint8Array([
  4, 45, 127, 74, 240, 104, 83, 178,
]);

export function getCreateToken2022MintDiscriminatorBytes() {
  return fixEncoderSize(getBytesEncoder(), 8).encode(
    CREATE_TOKEN2022_MINT_DISCRIMINATOR
  );
}

export type CreateToken2022MintInstruction<
  TProgram extends string = typeof GHOSTSPEAK_MARKETPLACE_PROGRAM_ADDRESS,
  TAccountAuthority extends string | AccountMeta<string> = string,
  TAccountAgent extends string | AccountMeta<string> = string,
  TAccountMint extends string | AccountMeta<string> = string,
  TAccountTokenProgram extends
    | string
    | AccountMeta<string> = 'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb',
  TAccountSystemProgram extends
    | string
    | AccountMeta<string> = '11111111111111111111111111111111',
  TAccountRent extends
    | string
    | AccountMeta<string> = 'SysvarRent111111111111111111111111111111111',
  TRemainingAccounts extends readonly AccountMeta<string>[] = [],
> = Instruction<TProgram> &
  InstructionWithData<ReadonlyUint8Array> &
  InstructionWithAccounts<
    [
      TAccountAuthority extends string
        ? WritableSignerAccount<TAccountAuthority> &
            AccountSignerMeta<TAccountAuthority>
        : TAccountAuthority,
      TAccountAgent extends string
        ? ReadonlyAccount<TAccountAgent>
        : TAccountAgent,
      TAccountMint extends string
        ? WritableSignerAccount<TAccountMint> & AccountSignerMeta<TAccountMint>
        : TAccountMint,
      TAccountTokenProgram extends string
        ? ReadonlyAccount<TAccountTokenProgram>
        : TAccountTokenProgram,
      TAccountSystemProgram extends string
        ? ReadonlyAccount<TAccountSystemProgram>
        : TAccountSystemProgram,
      TAccountRent extends string
        ? ReadonlyAccount<TAccountRent>
        : TAccountRent,
      ...TRemainingAccounts,
    ]
  >;

export type CreateToken2022MintInstructionData = {
  discriminator: ReadonlyUint8Array;
  decimals: number;
  freezeAuthority: Option<Address>;
  enableTransferFee: boolean;
  enableConfidentialTransfers: boolean;
  enableInterestBearing: boolean;
};

export type CreateToken2022MintInstructionDataArgs = {
  decimals: number;
  freezeAuthority: OptionOrNullable<Address>;
  enableTransferFee: boolean;
  enableConfidentialTransfers: boolean;
  enableInterestBearing: boolean;
};

export function getCreateToken2022MintInstructionDataEncoder(): Encoder<CreateToken2022MintInstructionDataArgs> {
  return transformEncoder(
    getStructEncoder([
      ['discriminator', fixEncoderSize(getBytesEncoder(), 8)],
      ['decimals', getU8Encoder()],
      ['freezeAuthority', getOptionEncoder(getAddressEncoder())],
      ['enableTransferFee', getBooleanEncoder()],
      ['enableConfidentialTransfers', getBooleanEncoder()],
      ['enableInterestBearing', getBooleanEncoder()],
    ]),
    (value) => ({
      ...value,
      discriminator: CREATE_TOKEN2022_MINT_DISCRIMINATOR,
    })
  );
}

export function getCreateToken2022MintInstructionDataDecoder(): Decoder<CreateToken2022MintInstructionData> {
  return getStructDecoder([
    ['discriminator', fixDecoderSize(getBytesDecoder(), 8)],
    ['decimals', getU8Decoder()],
    ['freezeAuthority', getOptionDecoder(getAddressDecoder())],
    ['enableTransferFee', getBooleanDecoder()],
    ['enableConfidentialTransfers', getBooleanDecoder()],
    ['enableInterestBearing', getBooleanDecoder()],
  ]);
}

export function getCreateToken2022MintInstructionDataCodec(): Codec<
  CreateToken2022MintInstructionDataArgs,
  CreateToken2022MintInstructionData
> {
  return combineCodec(
    getCreateToken2022MintInstructionDataEncoder(),
    getCreateToken2022MintInstructionDataDecoder()
  );
}

export type CreateToken2022MintAsyncInput<
  TAccountAuthority extends string = string,
  TAccountAgent extends string = string,
  TAccountMint extends string = string,
  TAccountTokenProgram extends string = string,
  TAccountSystemProgram extends string = string,
  TAccountRent extends string = string,
> = {
  authority: TransactionSigner<TAccountAuthority>;
  /** The agent creating the token */
  agent?: Address<TAccountAgent>;
  /** The mint to be created with Token-2022 extensions */
  mint: TransactionSigner<TAccountMint>;
  /** Token-2022 program */
  tokenProgram?: Address<TAccountTokenProgram>;
  systemProgram?: Address<TAccountSystemProgram>;
  rent?: Address<TAccountRent>;
  decimals: CreateToken2022MintInstructionDataArgs['decimals'];
  freezeAuthority: CreateToken2022MintInstructionDataArgs['freezeAuthority'];
  enableTransferFee: CreateToken2022MintInstructionDataArgs['enableTransferFee'];
  enableConfidentialTransfers: CreateToken2022MintInstructionDataArgs['enableConfidentialTransfers'];
  enableInterestBearing: CreateToken2022MintInstructionDataArgs['enableInterestBearing'];
};

export async function getCreateToken2022MintInstructionAsync<
  TAccountAuthority extends string,
  TAccountAgent extends string,
  TAccountMint extends string,
  TAccountTokenProgram extends string,
  TAccountSystemProgram extends string,
  TAccountRent extends string,
  TProgramAddress extends
    Address = typeof GHOSTSPEAK_MARKETPLACE_PROGRAM_ADDRESS,
>(
  input: CreateToken2022MintAsyncInput<
    TAccountAuthority,
    TAccountAgent,
    TAccountMint,
    TAccountTokenProgram,
    TAccountSystemProgram,
    TAccountRent
  >,
  config?: { programAddress?: TProgramAddress }
): Promise<
  CreateToken2022MintInstruction<
    TProgramAddress,
    TAccountAuthority,
    TAccountAgent,
    TAccountMint,
    TAccountTokenProgram,
    TAccountSystemProgram,
    TAccountRent
  >
> {
  // Program address.
  const programAddress =
    config?.programAddress ?? GHOSTSPEAK_MARKETPLACE_PROGRAM_ADDRESS;

  // Original accounts.
  const originalAccounts = {
    authority: { value: input.authority ?? null, isWritable: true },
    agent: { value: input.agent ?? null, isWritable: false },
    mint: { value: input.mint ?? null, isWritable: true },
    tokenProgram: { value: input.tokenProgram ?? null, isWritable: false },
    systemProgram: { value: input.systemProgram ?? null, isWritable: false },
    rent: { value: input.rent ?? null, isWritable: false },
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
        getAddressEncoder().encode(expectAddress(accounts.authority.value)),
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
  if (!accounts.rent.value) {
    accounts.rent.value =
      'SysvarRent111111111111111111111111111111111' as Address<'SysvarRent111111111111111111111111111111111'>;
  }

  const getAccountMeta = getAccountMetaFactory(programAddress, 'programId');
  const instruction = {
    accounts: [
      getAccountMeta(accounts.authority),
      getAccountMeta(accounts.agent),
      getAccountMeta(accounts.mint),
      getAccountMeta(accounts.tokenProgram),
      getAccountMeta(accounts.systemProgram),
      getAccountMeta(accounts.rent),
    ],
    programAddress,
    data: getCreateToken2022MintInstructionDataEncoder().encode(
      args as CreateToken2022MintInstructionDataArgs
    ),
  } as CreateToken2022MintInstruction<
    TProgramAddress,
    TAccountAuthority,
    TAccountAgent,
    TAccountMint,
    TAccountTokenProgram,
    TAccountSystemProgram,
    TAccountRent
  >;

  return instruction;
}

export type CreateToken2022MintInput<
  TAccountAuthority extends string = string,
  TAccountAgent extends string = string,
  TAccountMint extends string = string,
  TAccountTokenProgram extends string = string,
  TAccountSystemProgram extends string = string,
  TAccountRent extends string = string,
> = {
  authority: TransactionSigner<TAccountAuthority>;
  /** The agent creating the token */
  agent: Address<TAccountAgent>;
  /** The mint to be created with Token-2022 extensions */
  mint: TransactionSigner<TAccountMint>;
  /** Token-2022 program */
  tokenProgram?: Address<TAccountTokenProgram>;
  systemProgram?: Address<TAccountSystemProgram>;
  rent?: Address<TAccountRent>;
  decimals: CreateToken2022MintInstructionDataArgs['decimals'];
  freezeAuthority: CreateToken2022MintInstructionDataArgs['freezeAuthority'];
  enableTransferFee: CreateToken2022MintInstructionDataArgs['enableTransferFee'];
  enableConfidentialTransfers: CreateToken2022MintInstructionDataArgs['enableConfidentialTransfers'];
  enableInterestBearing: CreateToken2022MintInstructionDataArgs['enableInterestBearing'];
};

export function getCreateToken2022MintInstruction<
  TAccountAuthority extends string,
  TAccountAgent extends string,
  TAccountMint extends string,
  TAccountTokenProgram extends string,
  TAccountSystemProgram extends string,
  TAccountRent extends string,
  TProgramAddress extends
    Address = typeof GHOSTSPEAK_MARKETPLACE_PROGRAM_ADDRESS,
>(
  input: CreateToken2022MintInput<
    TAccountAuthority,
    TAccountAgent,
    TAccountMint,
    TAccountTokenProgram,
    TAccountSystemProgram,
    TAccountRent
  >,
  config?: { programAddress?: TProgramAddress }
): CreateToken2022MintInstruction<
  TProgramAddress,
  TAccountAuthority,
  TAccountAgent,
  TAccountMint,
  TAccountTokenProgram,
  TAccountSystemProgram,
  TAccountRent
> {
  // Program address.
  const programAddress =
    config?.programAddress ?? GHOSTSPEAK_MARKETPLACE_PROGRAM_ADDRESS;

  // Original accounts.
  const originalAccounts = {
    authority: { value: input.authority ?? null, isWritable: true },
    agent: { value: input.agent ?? null, isWritable: false },
    mint: { value: input.mint ?? null, isWritable: true },
    tokenProgram: { value: input.tokenProgram ?? null, isWritable: false },
    systemProgram: { value: input.systemProgram ?? null, isWritable: false },
    rent: { value: input.rent ?? null, isWritable: false },
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
  if (!accounts.rent.value) {
    accounts.rent.value =
      'SysvarRent111111111111111111111111111111111' as Address<'SysvarRent111111111111111111111111111111111'>;
  }

  const getAccountMeta = getAccountMetaFactory(programAddress, 'programId');
  const instruction = {
    accounts: [
      getAccountMeta(accounts.authority),
      getAccountMeta(accounts.agent),
      getAccountMeta(accounts.mint),
      getAccountMeta(accounts.tokenProgram),
      getAccountMeta(accounts.systemProgram),
      getAccountMeta(accounts.rent),
    ],
    programAddress,
    data: getCreateToken2022MintInstructionDataEncoder().encode(
      args as CreateToken2022MintInstructionDataArgs
    ),
  } as CreateToken2022MintInstruction<
    TProgramAddress,
    TAccountAuthority,
    TAccountAgent,
    TAccountMint,
    TAccountTokenProgram,
    TAccountSystemProgram,
    TAccountRent
  >;

  return instruction;
}

export type ParsedCreateToken2022MintInstruction<
  TProgram extends string = typeof GHOSTSPEAK_MARKETPLACE_PROGRAM_ADDRESS,
  TAccountMetas extends readonly AccountMeta[] = readonly AccountMeta[],
> = {
  programAddress: Address<TProgram>;
  accounts: {
    authority: TAccountMetas[0];
    /** The agent creating the token */
    agent: TAccountMetas[1];
    /** The mint to be created with Token-2022 extensions */
    mint: TAccountMetas[2];
    /** Token-2022 program */
    tokenProgram: TAccountMetas[3];
    systemProgram: TAccountMetas[4];
    rent: TAccountMetas[5];
  };
  data: CreateToken2022MintInstructionData;
};

export function parseCreateToken2022MintInstruction<
  TProgram extends string,
  TAccountMetas extends readonly AccountMeta[],
>(
  instruction: Instruction<TProgram> &
    InstructionWithAccounts<TAccountMetas> &
    InstructionWithData<ReadonlyUint8Array>
): ParsedCreateToken2022MintInstruction<TProgram, TAccountMetas> {
  if (instruction.accounts.length < 6) {
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
      authority: getNextAccount(),
      agent: getNextAccount(),
      mint: getNextAccount(),
      tokenProgram: getNextAccount(),
      systemProgram: getNextAccount(),
      rent: getNextAccount(),
    },
    data: getCreateToken2022MintInstructionDataDecoder().decode(
      instruction.data
    ),
  };
}
