import type { Address } from '@solana/addresses'
import type { TransactionSigner } from '@solana/kit'
import { BaseModule } from '../../core/BaseModule.js'
import {
  getInitializeGovernanceProposalInstructionAsync,
  type GovernanceProposal,
} from '../../generated/index.js'

// =====================================================
// TYPE DEFINITIONS
// =====================================================

export interface ProposalType {
  kind: 'ConfigChange' | 'Treasury' | 'Protocol' | 'Emergency'
  data?: Record<string, unknown>
}

export interface ExecutionParams {
  instructions: string[]
  accounts: Address[]
  targetProgram: Address
  executeAfter?: bigint
}

export interface DelegationScope {
  kind: 'All' | 'Proposal' | 'Category'
  value?: string | number
}

export interface CreateMultisigParams {
  signers: Address[]
  threshold: number
  multisigId: bigint
  config: {
    requireSequentialSigning: boolean
    allowOwnerOffCurve: boolean
  }
}

export interface CreateProposalParams {
  title: string
  description: string
  proposalType: ProposalType
  executionParams: ExecutionParams
  proposalId: bigint
}

export interface VoteParams {
  proposalAddress: Address
  voteChoice: 'For' | 'Against' | 'Abstain'
  reasoning?: string
}

/**
 * Governance management module
 *
 * Provides high-level access to governance operations including:
 * - Proposal creation and management
 *
 * NOTE: Voting, delegation, and execution are handled through protocol_config + multisig
 */
export class GovernanceModule extends BaseModule {

  // =====================================================
  // DIRECT INSTRUCTION ACCESS
  // These methods provide direct access to generated instructions
  // with minimal wrapping for maximum flexibility
  // =====================================================

  /**
   * Get initialize governance proposal instruction
   */
  getInitializeGovernanceProposalInstruction(params: {
    proposal?: Address
    proposer: TransactionSigner
    title: string
    description: string
    proposalType: any // eslint-disable-line @typescript-eslint/no-explicit-any
    executionParams: any // eslint-disable-line @typescript-eslint/no-explicit-any
    proposalId: number | bigint
  }) {
    return getInitializeGovernanceProposalInstructionAsync(params)
  }

  // =====================================================
  // CONVENIENCE METHODS
  // These methods provide simplified access to common operations
  // =====================================================

  /**
   * Create a new governance proposal
   */
  async createProposal(params: {
    signer: TransactionSigner
    title: string
    description: string
    proposalType: 'parameter_change' | 'upgrade' | 'treasury'
    votingDuration: number
    executionDelay?: number
  }): Promise<string> {
    const proposalAddress = this.deriveProposalPda(params.signer.address, params.title)

    const instruction = await this.getInitializeGovernanceProposalInstruction({
      proposal: proposalAddress,
      proposer: params.signer,
      title: params.title,
      description: params.description,
      proposalType: { kind: params.proposalType, data: {} },
      executionParams: {
        instructions: [],
        accounts: [],
        targetProgram: proposalAddress,
        executeAfter: BigInt(params.executionDelay ?? 0)
      },
      proposalId: BigInt(Date.now())
    })

    return this.execute('createProposal', () => instruction, [params.signer])
  }

  // =====================================================
  // QUERY OPERATIONS
  // =====================================================

  /**
   * Get governance proposal account
   */
  async getProposal(address: Address): Promise<GovernanceProposal | null> {
    return super.getAccount<GovernanceProposal>(address, 'getGovernanceProposalDecoder')
  }

  /**
   * Get all active proposals
   */
  async getActiveProposals(): Promise<{ address: Address; data: GovernanceProposal }[]> {
    // This would filter by status in a real implementation
    return this.getProgramAccounts<GovernanceProposal>('getGovernanceProposalDecoder')
  }

  /**
   * Get proposals by proposer
   */
  async getProposalsByProposer(proposer: Address): Promise<{ address: Address; data: GovernanceProposal }[]> {
    const filters = [{
      memcmp: {
        offset: BigInt(8), // Skip discriminator
        bytes: proposer as string,
        encoding: 'base58' as const
      }
    }]
    
    return this.getProgramAccounts<GovernanceProposal>('getGovernanceProposalDecoder', filters)
  }

  /**
   * Get proposals by status
   */
  async getProposalsByStatus(_status: 'draft' | 'voting' | 'succeeded' | 'defeated' | 'executed'): Promise<{ address: Address; data: GovernanceProposal }[]> {
    // This would need proper filtering based on proposal status field
    const allProposals = await this.getProgramAccounts<GovernanceProposal>('getGovernanceProposalDecoder')
    
    // Placeholder filtering - in real implementation would filter by actual status field
    return allProposals.filter(_proposal => {
      // Would check proposal.data.status === status
      // For now, return all proposals since filtering logic is not implemented
      return allProposals.length > 0
    })
  }


  // =====================================================
  // HELPER METHODS
  // =====================================================

  private deriveProposalPda(proposer: Address, title: string): Address {
    // Implementation would derive PDA using findProgramAddressSync
    return `proposal_${proposer}_${title}` as Address
  }
}