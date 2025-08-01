/**
 * This code was AUTOGENERATED using the codama library.
 * Please DO NOT EDIT THIS FILE, instead use visitors
 * to add features, then rerun codama to update it.
 *
 * @see https://github.com/codama-idl/codama
 */

import {
  combineCodec,
  getEnumDecoder,
  getEnumEncoder,
  type FixedSizeCodec,
  type FixedSizeDecoder,
  type FixedSizeEncoder,
} from '@solana/kit';

/** Types of transactions that can be executed */
export enum TransactionType {
  Transfer,
  Withdrawal,
  EscrowRelease,
  ProposalCreation,
  VoteExecution,
  ParameterUpdate,
  SignerAddition,
  SignerRemoval,
  ThresholdUpdate,
  ConfigUpdate,
  EmergencyFreeze,
  EmergencyUnfreeze,
  SecurityPolicyUpdate,
  ProtocolUpgrade,
  FeatureToggle,
  RiskParameterUpdate,
  CustomInstruction,
}

export type TransactionTypeArgs = TransactionType;

export function getTransactionTypeEncoder(): FixedSizeEncoder<TransactionTypeArgs> {
  return getEnumEncoder(TransactionType);
}

export function getTransactionTypeDecoder(): FixedSizeDecoder<TransactionType> {
  return getEnumDecoder(TransactionType);
}

export function getTransactionTypeCodec(): FixedSizeCodec<
  TransactionTypeArgs,
  TransactionType
> {
  return combineCodec(getTransactionTypeEncoder(), getTransactionTypeDecoder());
}
