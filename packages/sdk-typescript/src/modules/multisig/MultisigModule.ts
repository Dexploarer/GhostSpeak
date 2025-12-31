
import type { Address } from '@solana/addresses'
import type { TransactionSigner } from '@solana/kit'
import { BaseModule } from '../../core/BaseModule.js'
import {
  getInitializeGovernanceProposalInstructionAsync,
  type MultisigTypeConfigArgs,
  type ProposalTypeArgs,
  type ExecutionParamsArgs
} from '../../generated/index.js'
import { deriveMultisigPda } from '../../utils/governance-helpers.js'

export interface CreateMultisigParams {
  multisigId: bigint
  threshold: number
  signers: Address[]
  config?: Partial<MultisigTypeConfigArgs>
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
    // createMultisig pending instruction regeneration
    throw new Error('createMultisig: Instruction not available - requires IDL regeneration')
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
   * Execute a proposal (Note: Approval/voting removed, use protocol_config instead)
   */
  async executeProposal(params: ExecuteProposalParams): Promise<string> {
    // Execution logic would need to be implemented with protocol_config instructions
    // For now, this is a placeholder that needs to be updated with protocol_config approach
    throw new Error('executeProposal: Use protocol_config instructions for execution')
  }
}
