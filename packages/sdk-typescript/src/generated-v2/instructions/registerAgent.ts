/**
 * Real implementation of registerAgent instruction for GhostSpeak Protocol
 * 
 * This instruction creates a new AI agent account and user registry.
 * Based on the smart contract structure in agent.rs
 */

import {
  getAddressEncoder,
  getProgramDerivedAddress,
  type Address,
} from '@solana/addresses';
import {
  addDecoderSizePrefix,
  addEncoderSizePrefix,
  combineCodec,
  fixDecoderSize,
  fixEncoderSize,
  getBytesDecoder,
  getBytesEncoder,
  getStructDecoder,
  getStructEncoder,
  getU32Decoder,
  getU32Encoder,
  getU8Decoder,
  getU8Encoder,
  getUtf8Decoder,
  getUtf8Encoder,
  transformEncoder,
  type Codec,
  type Decoder,
  type Encoder,
  type ReadonlyUint8Array,
} from '@solana/codecs';
import {
  IAccountMeta,
  IInstruction,
  IInstructionWithAccounts,
  IInstructionWithData,
} from '../../utils/instruction-compat';
import {
  type IAccountSignerMeta,
  type TransactionSigner,
} from '@solana/signers';
import { POD_COM_PROGRAM_ADDRESS } from '../programs';
import {
  expectAddress,
  expectSome,
  getAccountMetaFactory,
  type ResolvedAccount,
} from '../shared';

// Define missing types for compatibility
type ReadonlyAccount<T> = T;
type WritableAccount<T> = T;
type WritableSignerAccount<T> = T;

// RegisterAgent instruction discriminator from the smart contract
export const REGISTER_AGENT_DISCRIMINATOR = new Uint8Array([
  135, 157, 66, 195, 2, 113, 175, 30,
]);

export function getRegisterAgentDiscriminatorBytes() {
  return fixEncoderSize(getBytesEncoder(), 8).encode(
    REGISTER_AGENT_DISCRIMINATOR
  );
}

export type RegisterAgentInstruction<
  TProgram extends string = typeof POD_COM_PROGRAM_ADDRESS,
  TAccountAgentAccount extends string | IAccountMeta<string> = string,
  TAccountUserRegistry extends string | IAccountMeta<string> = string,
  TAccountSigner extends string | IAccountMeta<string> = string,
  TAccountSystemProgram extends
    | string
    | IAccountMeta<string> = '11111111111111111111111111111111',
  TRemainingAccounts extends readonly IAccountMeta<string>[] = [],
> = IInstruction<TProgram> &
  IInstructionWithData<Uint8Array> &
  IInstructionWithAccounts<
    [
      TAccountAgentAccount extends string
        ? WritableAccount<TAccountAgentAccount>
        : TAccountAgentAccount,
      TAccountUserRegistry extends string
        ? WritableAccount<TAccountUserRegistry>
        : TAccountUserRegistry,
      TAccountSigner extends string
        ? WritableSignerAccount<TAccountSigner> &
            IAccountSignerMeta<TAccountSigner>
        : TAccountSigner,
      TAccountSystemProgram extends string
        ? ReadonlyAccount<TAccountSystemProgram>
        : TAccountSystemProgram,
      ...TRemainingAccounts,
    ]
  >;

export type RegisterAgentInstructionData = {
  discriminator: ReadonlyUint8Array;
  agentType: number;
  metadataUri: string;
};

export type RegisterAgentInstructionDataArgs = {
  agentType: number;
  metadataUri: string;
};

export function getRegisterAgentInstructionDataEncoder(): Encoder<RegisterAgentInstructionDataArgs> {
  return transformEncoder(
    getStructEncoder([
      ['discriminator', fixEncoderSize(getBytesEncoder(), 8)],
      ['agentType', getU8Encoder()],
      ['metadataUri', addEncoderSizePrefix(getUtf8Encoder(), getU32Encoder())],
    ]),
    (value) => ({ ...value, discriminator: REGISTER_AGENT_DISCRIMINATOR })
  );
}

export function getRegisterAgentInstructionDataDecoder(): Decoder<RegisterAgentInstructionData> {
  return getStructDecoder([
    ['discriminator', fixDecoderSize(getBytesDecoder(), 8)],
    ['agentType', getU8Decoder()],
    ['metadataUri', addDecoderSizePrefix(getUtf8Decoder(), getU32Decoder())],
  ]);
}

export function getRegisterAgentInstructionDataCodec(): Codec<
  RegisterAgentInstructionDataArgs,
  RegisterAgentInstructionData
> {
  return combineCodec(
    getRegisterAgentInstructionDataEncoder(),
    getRegisterAgentInstructionDataDecoder()
  );
}

export type RegisterAgentAsyncInput<
  TAccountAgentAccount extends string = string,
  TAccountUserRegistry extends string = string,
  TAccountSigner extends string = string,
  TAccountSystemProgram extends string = string,
> = {
  agentAccount?: Address<TAccountAgentAccount>;
  userRegistry?: Address<TAccountUserRegistry>;
  signer: TransactionSigner<TAccountSigner>;
  systemProgram?: Address<TAccountSystemProgram>;
  agentType: RegisterAgentInstructionDataArgs['agentType'];
  metadataUri: RegisterAgentInstructionDataArgs['metadataUri'];
};

export async function getRegisterAgentInstructionAsync<
  TAccountAgentAccount extends string,
  TAccountUserRegistry extends string,
  TAccountSigner extends string,
  TAccountSystemProgram extends string,
  TProgramAddress extends Address = typeof POD_COM_PROGRAM_ADDRESS,
>(
  input: RegisterAgentAsyncInput<
    TAccountAgentAccount,
    TAccountUserRegistry,
    TAccountSigner,
    TAccountSystemProgram
  >,
  config?: { programAddress?: TProgramAddress }
): Promise<
  RegisterAgentInstruction<
    TProgramAddress,
    TAccountAgentAccount,
    TAccountUserRegistry,
    TAccountSigner,
    TAccountSystemProgram
  >
> {
  // Program address.
  const programAddress = config?.programAddress ?? POD_COM_PROGRAM_ADDRESS;

  // Original accounts.
  const originalAccounts = {
    agentAccount: { value: input.agentAccount ?? null, isWritable: true },
    userRegistry: { value: input.userRegistry ?? null, isWritable: true },
    signer: { value: input.signer ?? null, isWritable: true },
    systemProgram: { value: input.systemProgram ?? null, isWritable: false },
  };
  const accounts = originalAccounts as Record<
    keyof typeof originalAccounts,
    ResolvedAccount
  >;

  // Original args.
  const args = { ...input };

  // Resolve default values for PDAs based on smart contract seeds.
  if (!accounts.agentAccount.value) {
    accounts.agentAccount.value = await getProgramDerivedAddress({
      programAddress,
      seeds: [
        getBytesEncoder().encode(
          new Uint8Array([97, 103, 101, 110, 116]) // "agent"
        ),
        getAddressEncoder().encode(expectAddress(accounts.signer.value)),
      ],
    });
  }
  if (!accounts.userRegistry.value) {
    accounts.userRegistry.value = await getProgramDerivedAddress({
      programAddress,
      seeds: [
        getBytesEncoder().encode(
          new Uint8Array([117, 115, 101, 114, 95, 114, 101, 103, 105, 115, 116, 114, 121]) // "user_registry"
        ),
        getAddressEncoder().encode(expectAddress(accounts.signer.value)),
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
      getAccountMeta(accounts.agentAccount),
      getAccountMeta(accounts.userRegistry),
      getAccountMeta(accounts.signer),
      getAccountMeta(accounts.systemProgram),
    ],
    programAddress,
    data: new Uint8Array(getRegisterAgentInstructionDataEncoder().encode(
      args as RegisterAgentInstructionDataArgs
    )),
  } as RegisterAgentInstruction<
    TProgramAddress,
    TAccountAgentAccount,
    TAccountUserRegistry,
    TAccountSigner,
    TAccountSystemProgram
  >;

  return instruction;
}

export type RegisterAgentInput<
  TAccountAgentAccount extends string = string,
  TAccountUserRegistry extends string = string,
  TAccountSigner extends string = string,
  TAccountSystemProgram extends string = string,
> = {
  agentAccount: Address<TAccountAgentAccount>;
  userRegistry: Address<TAccountUserRegistry>;
  signer: TransactionSigner<TAccountSigner>;
  systemProgram?: Address<TAccountSystemProgram>;
  agentType: RegisterAgentInstructionDataArgs['agentType'];
  metadataUri: RegisterAgentInstructionDataArgs['metadataUri'];
};

export function getRegisterAgentInstruction<
  TAccountAgentAccount extends string,
  TAccountUserRegistry extends string,
  TAccountSigner extends string,
  TAccountSystemProgram extends string,
  TProgramAddress extends Address = typeof POD_COM_PROGRAM_ADDRESS,
>(
  input: RegisterAgentInput<
    TAccountAgentAccount,
    TAccountUserRegistry,
    TAccountSigner,
    TAccountSystemProgram
  >,
  config?: { programAddress?: TProgramAddress }
): RegisterAgentInstruction<
  TProgramAddress,
  TAccountAgentAccount,
  TAccountUserRegistry,
  TAccountSigner,
  TAccountSystemProgram
> {
  // Program address.
  const programAddress = config?.programAddress ?? POD_COM_PROGRAM_ADDRESS;

  // Original accounts.
  const originalAccounts = {
    agentAccount: { value: input.agentAccount ?? null, isWritable: true },
    userRegistry: { value: input.userRegistry ?? null, isWritable: true },
    signer: { value: input.signer ?? null, isWritable: true },
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
      getAccountMeta(accounts.agentAccount),
      getAccountMeta(accounts.userRegistry),
      getAccountMeta(accounts.signer),
      getAccountMeta(accounts.systemProgram),
    ],
    programAddress,
    data: new Uint8Array(getRegisterAgentInstructionDataEncoder().encode(
      args as RegisterAgentInstructionDataArgs
    )),
  } as RegisterAgentInstruction<
    TProgramAddress,
    TAccountAgentAccount,
    TAccountUserRegistry,
    TAccountSigner,
    TAccountSystemProgram
  >;

  return instruction;
}

export type ParsedRegisterAgentInstruction<
  TProgram extends string = typeof POD_COM_PROGRAM_ADDRESS,
  TAccountMetas extends readonly IAccountMeta[] = readonly IAccountMeta[],
> = {
  programAddress: Address<TProgram>;
  accounts: {
    agentAccount: TAccountMetas[0];
    userRegistry: TAccountMetas[1];
    signer: TAccountMetas[2];
    systemProgram: TAccountMetas[3];
  };
  data: RegisterAgentInstructionData;
};

export function parseRegisterAgentInstruction<
  TProgram extends string,
  TAccountMetas extends readonly IAccountMeta[],
>(
  instruction: IInstruction<TProgram> &
    IInstructionWithAccounts<TAccountMetas> &
    IInstructionWithData<Uint8Array>
): ParsedRegisterAgentInstruction<TProgram, TAccountMetas> {
  if (instruction.accounts.length < 4) {
    throw new Error('RegisterAgent instruction requires at least 4 accounts: agentAccount, userRegistry, signer, systemProgram');
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
      agentAccount: getNextAccount(),
      userRegistry: getNextAccount(),
      signer: getNextAccount(),
      systemProgram: getNextAccount(),
    },
    data: getRegisterAgentInstructionDataDecoder().decode(instruction.data),
  };
}

// Legacy compatibility exports removed to prevent duplicate identifier errors