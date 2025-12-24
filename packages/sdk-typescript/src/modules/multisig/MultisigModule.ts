
import type { Address } from '@solana/addresses'
import type { TransactionSigner } from '@solana/kit'
import { BaseModule } from '../../core/BaseModule.js'
import {
  getCreateMultisigInstruction,
  getInitializeGovernanceProposalInstructionAsync,
  getCastVoteInstruction,
  getExecuteProposalInstruction,
  type MultisigConfigArgs,
  VoteChoice,
  type ProposalTypeArgs,
  type ExecutionParamsArgs
} from '../../generated/index.js'
import { deriveMultisigPda } from '../../utils/governance-helpers.js'

export interface CreateMultisigParams {
  multisigId: bigint
  threshold: number
  signers: Address[]
  config?: Partial<MultisigConfigArgs>
  owner: TransactionSigner
}

export interface MultisigProposalParams {
  multisigAddress: Address
  title: string
  description: string
  proposalType: ProposalTypeArgs
  executionParams: ExecutionParamsArgs
  proposalId: bigint
  proposer: TransactionSigner
}

export interface ApproveProposalParams {
  proposalAddress: Address
  voter: TransactionSigner
  voterTokenAccount: Address
  reasoning?: string
  voteChoice?: VoteChoice
}

export interface ExecuteProposalParams {
  proposalAddress: Address
  executor: TransactionSigner
  targetProgram: Address
}

export class MultisigModule extends BaseModule {
  /**
   * Create a new multisig account
   */
  async createMultisig(params: CreateMultisigParams): Promise<string> {
    const defaultConfig: MultisigConfigArgs = {
      max_signers: 10,
      default_timeout: 86400n, // 24 hours
      allow_emergency_override: false,
      emergency_threshold: { __option: 'None' },
      auto_execute: true,
      signer_change_threshold: params.threshold,
      allowed_transaction_types: [],
      daily_limits: []
    }

    const config = { ...defaultConfig, ...params.config }
    
    // Derive PDA with correct argument order: programId, authority, multisigId
    const multisigPda = await deriveMultisigPda(this.programId, params.owner.address, params.multisigId)

    const instruction = getCreateMultisigInstruction({
      multisig: multisigPda,
      owner: params.owner,
      multisigId: params.multisigId,
      threshold: params.threshold,
      signers: params.signers,
      config
    })

    return this.execute('createMultisig', () => instruction, [params.owner])
  }

  /**
   * Create a proposal (Uses Governance Protocol)
   * 
   * Note: This creates a GovernanceProposal. The proposer must be a signer.
   */
  async createProposal(params: MultisigProposalParams): Promise<string> {
    // We use the async builder which handles PDA derivation for us
    const instruction = await getInitializeGovernanceProposalInstructionAsync({
      proposer: params.proposer,
      proposalId: params.proposalId,
      title: params.title,
      description: params.description,
      proposalType: params.proposalType,
      executionParams: params.executionParams,
    }, { programAddress: this.programId })

    return this.execute('createProposal', () => instruction, [params.proposer])
  }

  /**
   * Approve (Vote on) a proposal
   */
  async approveProposal(params: ApproveProposalParams): Promise<string> {
    const instruction = getCastVoteInstruction({
      proposal: params.proposalAddress,
      voter: params.voter,
      voterTokenAccount: params.voterTokenAccount,
      voteChoice: params.voteChoice ?? VoteChoice.For,
      reasoning: params.reasoning ?? null
    })

    return this.execute('approveProposal', () => instruction, [params.voter])
  }

  /**
   * Execute a proposal
   */
  async executeProposal(params: ExecuteProposalParams): Promise<string> {
    const instruction = getExecuteProposalInstruction({
      proposal: params.proposalAddress,
      executor: params.executor,
      targetProgram: params.targetProgram
    })

    return this.execute('executeProposal', () => instruction, [params.executor])
  }
}
