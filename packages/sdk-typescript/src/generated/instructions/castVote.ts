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
  getVoteChoiceDecoder,
  getVoteChoiceEncoder,
  type VoteChoice,
  type VoteChoiceArgs,
} from '../types';

export const CAST_VOTE_DISCRIMINATOR = new Uint8Array([
  20, 212, 15, 189, 69, 180, 69, 151,
]);

export function getCastVoteDiscriminatorBytes() {
  return fixEncoderSize(getBytesEncoder(), 8).encode(CAST_VOTE_DISCRIMINATOR);
}

export type CastVoteInstruction<
  TProgram extends string = typeof GHOSTSPEAK_MARKETPLACE_PROGRAM_ADDRESS,
  TAccountProposal extends string | AccountMeta<string> = string,
  TAccountVoter extends string | AccountMeta<string> = string,
  TAccountVoterTokenAccount extends string | AccountMeta<string> = string,
  TAccountDelegateTokenAccount extends string | AccountMeta<string> = string,
  TRemainingAccounts extends readonly AccountMeta<string>[] = [],
> = Instruction<TProgram> &
  InstructionWithData<ReadonlyUint8Array> &
  InstructionWithAccounts<
    [
      TAccountProposal extends string
        ? WritableAccount<TAccountProposal>
        : TAccountProposal,
      TAccountVoter extends string
        ? WritableSignerAccount<TAccountVoter> &
            AccountSignerMeta<TAccountVoter>
        : TAccountVoter,
      TAccountVoterTokenAccount extends string
        ? ReadonlyAccount<TAccountVoterTokenAccount>
        : TAccountVoterTokenAccount,
      TAccountDelegateTokenAccount extends string
        ? ReadonlyAccount<TAccountDelegateTokenAccount>
        : TAccountDelegateTokenAccount,
      ...TRemainingAccounts,
    ]
  >;

export type CastVoteInstructionData = {
  discriminator: ReadonlyUint8Array;
  voteChoice: VoteChoice;
  reasoning: Option<string>;
};

export type CastVoteInstructionDataArgs = {
  voteChoice: VoteChoiceArgs;
  reasoning: OptionOrNullable<string>;
};

export function getCastVoteInstructionDataEncoder(): Encoder<CastVoteInstructionDataArgs> {
  return transformEncoder(
    getStructEncoder([
      ['discriminator', fixEncoderSize(getBytesEncoder(), 8)],
      ['voteChoice', getVoteChoiceEncoder()],
      [
        'reasoning',
        getOptionEncoder(
          addEncoderSizePrefix(getUtf8Encoder(), getU32Encoder())
        ),
      ],
    ]),
    (value) => ({ ...value, discriminator: CAST_VOTE_DISCRIMINATOR })
  );
}

export function getCastVoteInstructionDataDecoder(): Decoder<CastVoteInstructionData> {
  return getStructDecoder([
    ['discriminator', fixDecoderSize(getBytesDecoder(), 8)],
    ['voteChoice', getVoteChoiceDecoder()],
    [
      'reasoning',
      getOptionDecoder(addDecoderSizePrefix(getUtf8Decoder(), getU32Decoder())),
    ],
  ]);
}

export function getCastVoteInstructionDataCodec(): Codec<
  CastVoteInstructionDataArgs,
  CastVoteInstructionData
> {
  return combineCodec(
    getCastVoteInstructionDataEncoder(),
    getCastVoteInstructionDataDecoder()
  );
}

export type CastVoteInput<
  TAccountProposal extends string = string,
  TAccountVoter extends string = string,
  TAccountVoterTokenAccount extends string = string,
  TAccountDelegateTokenAccount extends string = string,
> = {
  proposal: Address<TAccountProposal>;
  voter: TransactionSigner<TAccountVoter>;
  /** Voter's token account for voting power calculation */
  voterTokenAccount: Address<TAccountVoterTokenAccount>;
  /** Optional: Delegate's token account if voting as a delegate */
  delegateTokenAccount?: Address<TAccountDelegateTokenAccount>;
  voteChoice: CastVoteInstructionDataArgs['voteChoice'];
  reasoning: CastVoteInstructionDataArgs['reasoning'];
};

export function getCastVoteInstruction<
  TAccountProposal extends string,
  TAccountVoter extends string,
  TAccountVoterTokenAccount extends string,
  TAccountDelegateTokenAccount extends string,
  TProgramAddress extends
    Address = typeof GHOSTSPEAK_MARKETPLACE_PROGRAM_ADDRESS,
>(
  input: CastVoteInput<
    TAccountProposal,
    TAccountVoter,
    TAccountVoterTokenAccount,
    TAccountDelegateTokenAccount
  >,
  config?: { programAddress?: TProgramAddress }
): CastVoteInstruction<
  TProgramAddress,
  TAccountProposal,
  TAccountVoter,
  TAccountVoterTokenAccount,
  TAccountDelegateTokenAccount
> {
  // Program address.
  const programAddress =
    config?.programAddress ?? GHOSTSPEAK_MARKETPLACE_PROGRAM_ADDRESS;

  // Original accounts.
  const originalAccounts = {
    proposal: { value: input.proposal ?? null, isWritable: true },
    voter: { value: input.voter ?? null, isWritable: true },
    voterTokenAccount: {
      value: input.voterTokenAccount ?? null,
      isWritable: false,
    },
    delegateTokenAccount: {
      value: input.delegateTokenAccount ?? null,
      isWritable: false,
    },
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
      getAccountMeta(accounts.proposal),
      getAccountMeta(accounts.voter),
      getAccountMeta(accounts.voterTokenAccount),
      getAccountMeta(accounts.delegateTokenAccount),
    ],
    programAddress,
    data: getCastVoteInstructionDataEncoder().encode(
      args as CastVoteInstructionDataArgs
    ),
  } as CastVoteInstruction<
    TProgramAddress,
    TAccountProposal,
    TAccountVoter,
    TAccountVoterTokenAccount,
    TAccountDelegateTokenAccount
  >;

  return instruction;
}

export type ParsedCastVoteInstruction<
  TProgram extends string = typeof GHOSTSPEAK_MARKETPLACE_PROGRAM_ADDRESS,
  TAccountMetas extends readonly AccountMeta[] = readonly AccountMeta[],
> = {
  programAddress: Address<TProgram>;
  accounts: {
    proposal: TAccountMetas[0];
    voter: TAccountMetas[1];
    /** Voter's token account for voting power calculation */
    voterTokenAccount: TAccountMetas[2];
    /** Optional: Delegate's token account if voting as a delegate */
    delegateTokenAccount?: TAccountMetas[3] | undefined;
  };
  data: CastVoteInstructionData;
};

export function parseCastVoteInstruction<
  TProgram extends string,
  TAccountMetas extends readonly AccountMeta[],
>(
  instruction: Instruction<TProgram> &
    InstructionWithAccounts<TAccountMetas> &
    InstructionWithData<ReadonlyUint8Array>
): ParsedCastVoteInstruction<TProgram, TAccountMetas> {
  if (instruction.accounts.length < 4) {
    throw new Error('[GHOSTSPEAK_MARKETPLACE_ERROR__INSUFFICIENT_ACCOUNTS] Not enough accounts');
  }
  let accountIndex = 0;
  const getNextAccount = () => {
    const accountMeta = instruction.accounts![accountIndex]!;
    accountIndex += 1;
    return accountMeta;
  };
  const getNextOptionalAccount = () => {
    const accountMeta = getNextAccount();
    return accountMeta.address === GHOSTSPEAK_MARKETPLACE_PROGRAM_ADDRESS
      ? undefined
      : accountMeta;
  };
  return {
    programAddress: instruction.programAddress,
    accounts: {
      proposal: getNextAccount(),
      voter: getNextAccount(),
      voterTokenAccount: getNextAccount(),
      delegateTokenAccount: getNextOptionalAccount(),
    },
    data: getCastVoteInstructionDataDecoder().decode(instruction.data),
  };
}
