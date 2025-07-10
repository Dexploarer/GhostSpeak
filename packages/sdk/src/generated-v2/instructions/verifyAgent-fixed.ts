/**
 * Fixed version of verifyAgent instruction with enhanced codec support
 */

import {
  type Address,
  address,
  getAddressDecoder,
} from '@solana/addresses';
import {
  combineCodec,
  type Codec,
  type Decoder,
  type Encoder,
} from '@solana/codecs';
import type {
  IAccountMeta,
  IInstruction,
  IInstructionWithAccounts,
  IInstructionWithData,
} from '../../utils/instruction-compat';
import { AccountRole } from '../../utils/instruction-compat';
import {
  type IAccountSignerMeta,
  type TransactionSigner,
} from '@solana/signers';
import { POD_COM_PROGRAM_ADDRESS } from '../programs';
import { expectAddress } from '../shared';
import {
  codecs,
  getStructDecoder,
  getBytesDecoder,
  getU64Decoder,
  getUtf8Decoder,
  addDecoderSizePrefix,
  getU32Decoder,
  createAddress,
  toBigInt,
  type EnhancedEncoder,
} from '../../utils/codec-compat';

export const VERIFY_AGENT_DISCRIMINATOR = new Uint8Array([
  42, 158, 201, 44, 92, 88, 134, 201,
]);

export function getVerifyAgentDiscriminatorBytes() {
  return VERIFY_AGENT_DISCRIMINATOR.slice();
}

export type VerifyAgentInstruction<
  TProgram extends string = '4nusKGxuNwK7XggWQHCMEE1Ht7taWrSJMhhNfTqswVFP',
  TAccountAgentVerification extends string | IAccountMeta<string> = string,
  TAccountAgent extends string | IAccountMeta<string> = string,
  TAccountPayer extends string | IAccountMeta<string> = string,
  TAccountSystemProgram extends string | IAccountMeta<string> = string,
  TRemainingAccounts extends readonly IAccountMeta<string>[] = [],
> = IInstruction<TProgram> &
  IInstructionWithData<Uint8Array> &
  IInstructionWithAccounts<
    [
      TAccountAgentVerification extends string
        ? IAccountMeta<TAccountAgentVerification>
        : TAccountAgentVerification,
      TAccountAgent extends string
        ? IAccountSignerMeta<TAccountAgent>
        : TAccountAgent,
      TAccountPayer extends string
        ? IAccountSignerMeta<TAccountPayer>
        : TAccountPayer,
      TAccountSystemProgram extends string
        ? IAccountMeta<TAccountSystemProgram>
        : TAccountSystemProgram,
      ...TRemainingAccounts,
    ]
  >;

export type VerifyAgentInstructionData = {
  discriminator: Uint8Array;
  agentPubkey: Address;
  serviceEndpoint: string;
  supportedCapabilities: Array<string>;
  verifiedAt: bigint;
};

export type VerifyAgentInstructionDataArgs = {
  agentPubkey: Address;
  serviceEndpoint: string;
  supportedCapabilities: Array<string>;
  verifiedAt: bigint | number;
};

export function getVerifyAgentInstructionDataEncoder(): EnhancedEncoder<VerifyAgentInstructionDataArgs> {
  const encoder = codecs.struct([
    ['discriminator', codecs.bytes({ size: 8 })],
    ['agentPubkey', codecs.address()],
    ['serviceEndpoint', codecs.utf8()],
    ['supportedCapabilities', codecs.array(codecs.utf8())],
    ['verifiedAt', codecs.u64()],
  ]);

  return {
    encode: (value: VerifyAgentInstructionDataArgs): Uint8Array => {
      // Transform the input data
      const transformedValue = {
        discriminator: getVerifyAgentDiscriminatorBytes(),
        agentPubkey: createAddress(value.agentPubkey),
        serviceEndpoint: value.serviceEndpoint,
        supportedCapabilities: value.supportedCapabilities,
        verifiedAt: toBigInt(value.verifiedAt),
      };
      
      return encoder.encode(transformedValue);
    },
    getSizeFromValue: encoder.getSizeFromValue,
  };
}

export function getVerifyAgentInstructionDataDecoder(): Decoder<VerifyAgentInstructionData> {
  return getStructDecoder([
    ['discriminator', getBytesDecoder({ size: 8 })],
    ['agentPubkey', getAddressDecoder()],
    ['serviceEndpoint', getUtf8Decoder()],
    [
      'supportedCapabilities',
      addDecoderSizePrefix(getUtf8Decoder(), getU32Decoder()),
    ],
    ['verifiedAt', getU64Decoder()],
  ]);
}

export function getVerifyAgentInstructionDataCodec(): Codec<
  VerifyAgentInstructionDataArgs,
  VerifyAgentInstructionData
> {
  return combineCodec(
    getVerifyAgentInstructionDataEncoder(),
    getVerifyAgentInstructionDataDecoder()
  );
}

export type VerifyAgentInput<
  TAccountAgentVerification extends string = string,
  TAccountAgent extends string = string,
  TAccountPayer extends string = string,
  TAccountSystemProgram extends string = string,
> = {
  agentVerification: Address<TAccountAgentVerification>;
  agent: TransactionSigner<TAccountAgent>;
  payer: TransactionSigner<TAccountPayer>;
  systemProgram?: Address<TAccountSystemProgram>;
  agentPubkey: Address | string;
  serviceEndpoint: string;
  supportedCapabilities: Array<string>;
  verifiedAt: bigint | number;
};

export function getVerifyAgentInstruction<
  TAccountAgentVerification extends string,
  TAccountAgent extends string,
  TAccountPayer extends string,
  TAccountSystemProgram extends string,
>(
  input: VerifyAgentInput<
    TAccountAgentVerification,
    TAccountAgent,
    TAccountPayer,
    TAccountSystemProgram
  >
): VerifyAgentInstruction<
  typeof POD_COM_PROGRAM_ADDRESS,
  TAccountAgentVerification,
  TAccountAgent,
  TAccountPayer,
  TAccountSystemProgram
> {
  const programAddress = POD_COM_PROGRAM_ADDRESS;
  
  // Resolve accounts
  const accounts = [
    {
      address: input.agentVerification,
      role: AccountRole.WRITABLE,
    },
    {
      address: input.agent.address,
      role: AccountRole.WRITABLE_SIGNER,
      signer: input.agent,
    },
    {
      address: input.payer.address,
      role: AccountRole.WRITABLE_SIGNER,
      signer: input.payer,
    },
    {
      address: input.systemProgram ?? address('11111111111111111111111111111111'),
      role: AccountRole.READONLY,
    },
  ] as IAccountMeta[];

  // Encode instruction data
  const data = getVerifyAgentInstructionDataEncoder().encode({
    agentPubkey: typeof input.agentPubkey === 'string' 
      ? address(input.agentPubkey) 
      : input.agentPubkey,
    serviceEndpoint: input.serviceEndpoint,
    supportedCapabilities: input.supportedCapabilities,
    verifiedAt: input.verifiedAt,
  });

  return {
    accounts,
    programAddress: address(programAddress),
    data,
  } as VerifyAgentInstruction<
    typeof POD_COM_PROGRAM_ADDRESS,
    TAccountAgentVerification,
    TAccountAgent,
    TAccountPayer,
    TAccountSystemProgram
  >;
}

export type ParsedVerifyAgentInstruction<
  TProgram extends string = '4nusKGxuNwK7XggWQHCMEE1Ht7taWrSJMhhNfTqswVFP',
  TAccountMetas extends readonly IAccountMeta[] = readonly IAccountMeta[],
> = {
  programAddress: Address<TProgram>;
  accounts: {
    agentVerification: TAccountMetas[0];
    agent: TAccountMetas[1];
    payer: TAccountMetas[2];
    systemProgram: TAccountMetas[3];
  };
  data: VerifyAgentInstructionData;
};

export function parseVerifyAgentInstruction<
  TProgram extends string,
  TAccountMetas extends readonly IAccountMeta[],
>(
  instruction: IInstruction<TProgram> &
    IInstructionWithAccounts<TAccountMetas> &
    IInstructionWithData<Uint8Array>
): ParsedVerifyAgentInstruction<TProgram, TAccountMetas> {
  if (instruction.accounts.length < 4) {
    throw new Error('Not enough accounts');
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
      agentVerification: getNextAccount(),
      agent: getNextAccount(),
      payer: getNextAccount(),
      systemProgram: getNextAccount(),
    },
    data: getVerifyAgentInstructionDataDecoder().decode(instruction.data),
  };
}

type ResolvedAccount = {
  value: Address | null;
  isWritable: boolean;
};