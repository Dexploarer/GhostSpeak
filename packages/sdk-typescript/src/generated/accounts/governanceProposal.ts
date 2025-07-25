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
  assertAccountExists,
  assertAccountsExist,
  combineCodec,
  decodeAccount,
  fetchEncodedAccount,
  fetchEncodedAccounts,
  fixDecoderSize,
  fixEncoderSize,
  getAddressDecoder,
  getAddressEncoder,
  getBytesDecoder,
  getBytesEncoder,
  getI64Decoder,
  getI64Encoder,
  getOptionDecoder,
  getOptionEncoder,
  getStructDecoder,
  getStructEncoder,
  getU32Decoder,
  getU32Encoder,
  getU64Decoder,
  getU64Encoder,
  getUtf8Decoder,
  getUtf8Encoder,
  transformEncoder,
  type Account,
  type Address,
  type Codec,
  type Decoder,
  type EncodedAccount,
  type Encoder,
  type FetchAccountConfig,
  type FetchAccountsConfig,
  type MaybeAccount,
  type MaybeEncodedAccount,
  type Option,
  type OptionOrNullable,
  type ReadonlyUint8Array,
} from '@solana/kit';
import {
  getExecutionParamsDecoder,
  getExecutionParamsEncoder,
  getProposalMetadataDecoder,
  getProposalMetadataEncoder,
  getProposalStatusDecoder,
  getProposalStatusEncoder,
  getProposalTypeDecoder,
  getProposalTypeEncoder,
  getQuorumRequirementsDecoder,
  getQuorumRequirementsEncoder,
  getVotingResultsDecoder,
  getVotingResultsEncoder,
  type ExecutionParams,
  type ExecutionParamsArgs,
  type ProposalMetadata,
  type ProposalMetadataArgs,
  type ProposalStatus,
  type ProposalStatusArgs,
  type ProposalType,
  type ProposalTypeArgs,
  type QuorumRequirements,
  type QuorumRequirementsArgs,
  type VotingResults,
  type VotingResultsArgs,
} from '../types';

export const GOVERNANCE_PROPOSAL_DISCRIMINATOR = new Uint8Array([
  53, 107, 240, 190, 43, 73, 65, 143,
]);

export function getGovernanceProposalDiscriminatorBytes() {
  return fixEncoderSize(getBytesEncoder(), 8).encode(
    GOVERNANCE_PROPOSAL_DISCRIMINATOR
  );
}

export type GovernanceProposal = {
  discriminator: ReadonlyUint8Array;
  /** Proposal ID */
  proposalId: bigint;
  /** Proposer */
  proposer: Address;
  /** Proposal title */
  title: string;
  /** Proposal description */
  description: string;
  /** Proposal type */
  proposalType: ProposalType;
  /** Creation timestamp */
  createdAt: bigint;
  /** Voting start timestamp */
  votingStartsAt: bigint;
  /** Voting end timestamp */
  votingEndsAt: bigint;
  /** Execution timestamp (if approved) */
  executionTimestamp: Option<bigint>;
  /** Proposal status */
  status: ProposalStatus;
  /** Voting results */
  votingResults: VotingResults;
  /** Execution parameters */
  executionParams: ExecutionParams;
  /** Quorum requirements */
  quorumRequirements: QuorumRequirements;
  /** Proposal metadata */
  metadata: ProposalMetadata;
  /** Reserved space */
  reserved: ReadonlyUint8Array;
};

export type GovernanceProposalArgs = {
  /** Proposal ID */
  proposalId: number | bigint;
  /** Proposer */
  proposer: Address;
  /** Proposal title */
  title: string;
  /** Proposal description */
  description: string;
  /** Proposal type */
  proposalType: ProposalTypeArgs;
  /** Creation timestamp */
  createdAt: number | bigint;
  /** Voting start timestamp */
  votingStartsAt: number | bigint;
  /** Voting end timestamp */
  votingEndsAt: number | bigint;
  /** Execution timestamp (if approved) */
  executionTimestamp: OptionOrNullable<number | bigint>;
  /** Proposal status */
  status: ProposalStatusArgs;
  /** Voting results */
  votingResults: VotingResultsArgs;
  /** Execution parameters */
  executionParams: ExecutionParamsArgs;
  /** Quorum requirements */
  quorumRequirements: QuorumRequirementsArgs;
  /** Proposal metadata */
  metadata: ProposalMetadataArgs;
  /** Reserved space */
  reserved: ReadonlyUint8Array;
};

export function getGovernanceProposalEncoder(): Encoder<GovernanceProposalArgs> {
  return transformEncoder(
    getStructEncoder([
      ['discriminator', fixEncoderSize(getBytesEncoder(), 8)],
      ['proposalId', getU64Encoder()],
      ['proposer', getAddressEncoder()],
      ['title', addEncoderSizePrefix(getUtf8Encoder(), getU32Encoder())],
      ['description', addEncoderSizePrefix(getUtf8Encoder(), getU32Encoder())],
      ['proposalType', getProposalTypeEncoder()],
      ['createdAt', getI64Encoder()],
      ['votingStartsAt', getI64Encoder()],
      ['votingEndsAt', getI64Encoder()],
      ['executionTimestamp', getOptionEncoder(getI64Encoder())],
      ['status', getProposalStatusEncoder()],
      ['votingResults', getVotingResultsEncoder()],
      ['executionParams', getExecutionParamsEncoder()],
      ['quorumRequirements', getQuorumRequirementsEncoder()],
      ['metadata', getProposalMetadataEncoder()],
      ['reserved', fixEncoderSize(getBytesEncoder(), 64)],
    ]),
    (value) => ({ ...value, discriminator: GOVERNANCE_PROPOSAL_DISCRIMINATOR })
  );
}

export function getGovernanceProposalDecoder(): Decoder<GovernanceProposal> {
  return getStructDecoder([
    ['discriminator', fixDecoderSize(getBytesDecoder(), 8)],
    ['proposalId', getU64Decoder()],
    ['proposer', getAddressDecoder()],
    ['title', addDecoderSizePrefix(getUtf8Decoder(), getU32Decoder())],
    ['description', addDecoderSizePrefix(getUtf8Decoder(), getU32Decoder())],
    ['proposalType', getProposalTypeDecoder()],
    ['createdAt', getI64Decoder()],
    ['votingStartsAt', getI64Decoder()],
    ['votingEndsAt', getI64Decoder()],
    ['executionTimestamp', getOptionDecoder(getI64Decoder())],
    ['status', getProposalStatusDecoder()],
    ['votingResults', getVotingResultsDecoder()],
    ['executionParams', getExecutionParamsDecoder()],
    ['quorumRequirements', getQuorumRequirementsDecoder()],
    ['metadata', getProposalMetadataDecoder()],
    ['reserved', fixDecoderSize(getBytesDecoder(), 64)],
  ]);
}

export function getGovernanceProposalCodec(): Codec<
  GovernanceProposalArgs,
  GovernanceProposal
> {
  return combineCodec(
    getGovernanceProposalEncoder(),
    getGovernanceProposalDecoder()
  );
}

export function decodeGovernanceProposal<TAddress extends string = string>(
  encodedAccount: EncodedAccount<TAddress>
): Account<GovernanceProposal, TAddress>;
export function decodeGovernanceProposal<TAddress extends string = string>(
  encodedAccount: MaybeEncodedAccount<TAddress>
): MaybeAccount<GovernanceProposal, TAddress>;
export function decodeGovernanceProposal<TAddress extends string = string>(
  encodedAccount: EncodedAccount<TAddress> | MaybeEncodedAccount<TAddress>
):
  | Account<GovernanceProposal, TAddress>
  | MaybeAccount<GovernanceProposal, TAddress> {
  return decodeAccount(
    encodedAccount as MaybeEncodedAccount<TAddress>,
    getGovernanceProposalDecoder()
  );
}

export async function fetchGovernanceProposal<TAddress extends string = string>(
  rpc: Parameters<typeof fetchEncodedAccount>[0],
  address: Address<TAddress>,
  config?: FetchAccountConfig
): Promise<Account<GovernanceProposal, TAddress>> {
  const maybeAccount = await fetchMaybeGovernanceProposal(rpc, address, config);
  assertAccountExists(maybeAccount);
  return maybeAccount;
}

export async function fetchMaybeGovernanceProposal<
  TAddress extends string = string,
>(
  rpc: Parameters<typeof fetchEncodedAccount>[0],
  address: Address<TAddress>,
  config?: FetchAccountConfig
): Promise<MaybeAccount<GovernanceProposal, TAddress>> {
  const maybeAccount = await fetchEncodedAccount(rpc, address, config);
  return decodeGovernanceProposal(maybeAccount);
}

export async function fetchAllGovernanceProposal(
  rpc: Parameters<typeof fetchEncodedAccounts>[0],
  addresses: Array<Address>,
  config?: FetchAccountsConfig
): Promise<Account<GovernanceProposal>[]> {
  const maybeAccounts = await fetchAllMaybeGovernanceProposal(
    rpc,
    addresses,
    config
  );
  assertAccountsExist(maybeAccounts);
  return maybeAccounts;
}

export async function fetchAllMaybeGovernanceProposal(
  rpc: Parameters<typeof fetchEncodedAccounts>[0],
  addresses: Array<Address>,
  config?: FetchAccountsConfig
): Promise<MaybeAccount<GovernanceProposal>[]> {
  const maybeAccounts = await fetchEncodedAccounts(rpc, addresses, config);
  return maybeAccounts.map((maybeAccount) =>
    decodeGovernanceProposal(maybeAccount)
  );
}
