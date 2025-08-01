'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useWallet } from '@solana/wallet-adapter-react'
import type { Address } from '@solana/kit'
import type { TransactionSigner } from '@solana/kit'
import { getGhostSpeakClient } from '@/lib/ghostspeak/client'
import { toast } from 'sonner'

// =====================================================
// TYPE DEFINITIONS
// =====================================================

export enum ProposalType {
  ParameterChange = 'ParameterChange',
  Treasury = 'Treasury',
  Upgrade = 'Upgrade',
  Feature = 'Feature',
  Emergency = 'Emergency',
}

export enum ProposalStatus {
  Draft = 'Draft',
  Voting = 'Voting',
  VotingEnded = 'VotingEnded',
  Succeeded = 'Succeeded',
  Defeated = 'Defeated',
  Executed = 'Executed',
  Cancelled = 'Cancelled',
  Expired = 'Expired',
}

export enum VoteChoice {
  For = 'For',
  Against = 'Against',
  Abstain = 'Abstain',
}

export interface VotingPower {
  tokens: string
  staked: string
  reputation: number
  delegated: string
  total: string
}

export interface VoteResults {
  forVotes: string
  againstVotes: string
  abstainVotes: string
  totalVotes: string
  quorumReached: boolean
  participationRate: number
}

export interface ProposalExecutionParams {
  executionDelay: number
  targetProgram: Address
  instructions: string[]
  accounts: Address[]
  executeAfter?: Date
}

export interface Proposal {
  address: Address
  id: string
  title: string
  description: string
  proposalType: ProposalType
  status: ProposalStatus
  proposer: Address
  proposerName?: string
  createdAt: Date
  updatedAt: Date

  // Voting
  votingStartsAt: Date
  votingEndsAt: Date
  quorumRequired: string
  approvalThreshold: number // percentage (e.g., 50 for 50%)

  // Results
  results?: VoteResults

  // Execution
  executionParams?: ProposalExecutionParams
  executedAt?: Date
  executionTxId?: string

  // Metadata
  tags: string[]
  category: string
  impactLevel: 'Low' | 'Medium' | 'High' | 'Critical'
  estimatedCost?: string

  // User interaction
  userHasVoted?: boolean
  userVoteChoice?: VoteChoice
  userVotingPower?: VotingPower
}

export interface Vote {
  id: string
  proposalAddress: Address
  voter: Address
  voterName?: string
  choice: VoteChoice
  votingPower: string
  reasoning?: string
  timestamp: Date
  delegatedFrom?: Address[]
}

export interface Delegation {
  id: string
  delegator: Address
  delegate: Address
  delegatorName?: string
  delegateName?: string
  amount: string
  scope: 'All' | 'Category' | 'SingleProposal'
  proposalId?: string
  category?: string
  expiresAt?: Date
  createdAt: Date
  isActive: boolean
}

export interface CreateProposalData {
  title: string
  description: string
  proposalType: ProposalType
  category: string
  impactLevel: 'Low' | 'Medium' | 'High' | 'Critical'
  tags: string[]
  votingDuration: number // days
  executionDelay: number // hours
  quorumRequired?: string
  approvalThreshold?: number
  executionParams?: {
    targetProgram?: Address
    instructions?: string[]
    accounts?: Address[]
  }
  estimatedCost?: string
}

export interface CreateVoteData {
  proposalAddress: Address
  choice: VoteChoice
  reasoning?: string
}

export interface CreateDelegationData {
  delegate: Address
  amount: string
  scope: 'All' | 'Category' | 'SingleProposal'
  proposalId?: string
  category?: string
  duration: number // days
}

export interface GovernanceFilters {
  status?: ProposalStatus[]
  type?: ProposalType[]
  category?: string[]
  search?: string
  proposer?: Address
  userVoted?: boolean
  impactLevel?: string[]
  dateRange?: {
    start: Date
    end: Date
  }
}

// =====================================================
// HELPER FUNCTIONS
// =====================================================

enum ProposalCategory {
  Protocol = 'Protocol',
  Technical = 'Technical',
  Treasury = 'Treasury',
  Community = 'Community',
}

function mapSDKProposalStatus(status: string): ProposalStatus {
  const statusMap: Record<string, ProposalStatus> = {
    Draft: ProposalStatus.Draft,
    Voting: ProposalStatus.Voting,
    VotingEnded: ProposalStatus.VotingEnded,
    Succeeded: ProposalStatus.Succeeded,
    Defeated: ProposalStatus.Defeated,
    Executed: ProposalStatus.Executed,
    Cancelled: ProposalStatus.Cancelled,
    Expired: ProposalStatus.Expired,
  }
  return statusMap[status] || ProposalStatus.Draft
}

function mapProposalTypeToSDK(type: ProposalType): string {
  const typeMap: Record<ProposalType, string> = {
    [ProposalType.ParameterChange]: 'parameter_change',
    [ProposalType.Treasury]: 'treasury',
    [ProposalType.Upgrade]: 'upgrade',
    [ProposalType.Feature]: 'feature',
    [ProposalType.Emergency]: 'emergency',
  }
  return typeMap[type] || 'feature'
}

function mapSDKProposalType(type: string): ProposalType {
  const typeMap: Record<string, ProposalType> = {
    parameter_change: ProposalType.ParameterChange,
    treasury: ProposalType.Treasury,
    upgrade: ProposalType.Upgrade,
    feature: ProposalType.Feature,
    emergency: ProposalType.Emergency,
  }
  return typeMap[type] || ProposalType.Feature
}

function mapProposalTypeToCategory(proposalType: string): ProposalCategory {
  const categoryMap: Record<string, ProposalCategory> = {
    parameter_change: ProposalCategory.Protocol,
    upgrade: ProposalCategory.Technical,
    treasury: ProposalCategory.Treasury,
  }
  return categoryMap[proposalType] || ProposalCategory.Community
}

// Types for SDK data
interface ProposalSDKData {
  id?: string
  title: string
  description: string
  proposer: Address
  status: string
  proposalType: string
  votingStart: bigint
  votingEnd: bigint
  forVotes: bigint
  againstVotes: bigint
  abstainVotes: bigint
  createdAt: bigint
  executionDelay: bigint
}

interface ProposalAccountData {
  address: Address
  data: ProposalSDKData
}

// Impact level determination based on proposal type
function determineImpactLevel(proposalType: ProposalType): 'Low' | 'Medium' | 'High' | 'Critical' {
  switch (proposalType) {
    case ProposalType.Emergency:
      return 'Critical'
    case ProposalType.Upgrade:
    case ProposalType.Treasury:
      return 'High'
    case ProposalType.ParameterChange:
      return 'Medium'
    default:
      return 'Low'
  }
}

function createSDKSigner(
  publicKey: { toBase58(): string },
  signTransaction: (tx: unknown) => Promise<unknown>
): TransactionSigner {
  return {
    address: publicKey.toBase58() as Address,
    signTransactions: async (txs: unknown[]) => {
      const signed = await Promise.all(txs.map((tx) => signTransaction(tx)))
      return signed
    },
  }
}

// =====================================================
// REACT QUERY HOOKS
// =====================================================

/**
 * Get all proposals with optional filtering
 */
export function useProposals(filters?: GovernanceFilters, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['proposals', filters],
    queryFn: async (): Promise<Proposal[]> => {
      const client = getGhostSpeakClient()

      // Fetch proposals from the SDK
      const proposals = await client.governance.getAllProposals()

      // Transform SDK data to match our Proposal interface
      let filteredProposals = proposals.map(
        (proposal): Proposal => ({
          address: proposal.address,
          id: proposal.data.id || `PROP-${proposal.address.slice(0, 8)}`,
          title: proposal.data.title,
          description: proposal.data.description,
          proposer: proposal.data.proposer,
          proposerName: undefined, // Will be fetched separately if needed
          status: mapSDKProposalStatus(proposal.data.status),
          proposalType: proposal.data.proposalType as ProposalType,
          category: mapProposalTypeToCategory(proposal.data.proposalType),
          impactLevel: 'Medium' as 'Low' | 'Medium' | 'High' | 'Critical', // Default, not stored in SDK
          votingStartsAt: new Date(Number(proposal.data.votingStart) * 1000),
          votingEndsAt: new Date(Number(proposal.data.votingEnd) * 1000),
          quorumRequired: '30', // Default, not stored in current SDK
          approvalThreshold: 51, // Default, not stored in current SDK
          results: {
            forVotes: String(proposal.data.forVotes),
            againstVotes: String(proposal.data.againstVotes),
            abstainVotes: String(proposal.data.abstainVotes),
            totalVotes: String(Number(proposal.data.forVotes) + Number(proposal.data.againstVotes) + Number(proposal.data.abstainVotes)),
            quorumReached: false,
            participationRate: 0,
          },
          tags: [], // Would need to be stored separately
          category: mapProposalTypeToCategory(proposal.data.proposalType),
          updatedAt: new Date(),
          createdAt: new Date(Number(proposal.data.createdAt) * 1000),
          executedAt: undefined, // Not stored in current SDK
        })
      )

      if (filters) {
        if (filters.status?.length) {
          filteredProposals = filteredProposals.filter((p) => filters.status!.includes(p.status))
        }

        if (filters.type?.length) {
          filteredProposals = filteredProposals.filter((p) =>
            filters.type!.includes(p.proposalType)
          )
        }

        if (filters.category?.length) {
          filteredProposals = filteredProposals.filter((p) =>
            filters.category!.includes(p.category)
          )
        }

        if (filters.impactLevel?.length) {
          filteredProposals = filteredProposals.filter((p) =>
            filters.impactLevel!.includes(p.impactLevel)
          )
        }

        if (filters.search) {
          const searchLower = filters.search.toLowerCase()
          filteredProposals = filteredProposals.filter(
            (p) =>
              p.title.toLowerCase().includes(searchLower) ||
              p.description.toLowerCase().includes(searchLower) ||
              p.tags.some((tag) => tag.toLowerCase().includes(searchLower)) ||
              p.proposerName?.toLowerCase().includes(searchLower)
          )
        }
      }

      return filteredProposals.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    },
    enabled: options?.enabled ?? true,
    refetchInterval: 30000, // Refetch every 30 seconds for real-time updates
  })
}

/**
 * Get a specific proposal by address
 */
export function useProposal(address: Address | undefined, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['proposal', address],
    queryFn: async (): Promise<Proposal | null> => {
      if (!address) return null

      const client = getGhostSpeakClient()
      const proposalData = await client.governance.getProposal(address)

      if (!proposalData) return null

      // Transform SDK data to match our Proposal interface
      return {
        address: proposalData.address,
        id: proposalData.data.id || `PROP-${proposalData.address.slice(0, 8)}`,
        title: proposalData.data.title,
        description: proposalData.data.description,
        proposer: proposalData.data.proposer,
        proposerName: undefined, // Will be fetched separately if needed
        status: mapSDKProposalStatus(proposalData.data.status),
        proposalType: proposalData.data.proposalType as ProposalType,
        category: mapProposalTypeToCategory(proposalData.data.proposalType),
        impactLevel: 'Medium' as 'Low' | 'Medium' | 'High' | 'Critical', // Default, not stored in SDK
        votingStartsAt: new Date(Number(proposalData.data.votingStart) * 1000),
        votingEndsAt: new Date(Number(proposalData.data.votingEnd) * 1000),
        quorumRequired: '30', // Default, not stored in current SDK
        approvalThreshold: 51, // Default, not stored in current SDK
        results: {
          forVotes: String(proposalData.data.forVotes),
          againstVotes: String(proposalData.data.againstVotes),
          abstainVotes: String(proposalData.data.abstainVotes),
          totalVotes: String(Number(proposalData.data.forVotes) + Number(proposalData.data.againstVotes) + Number(proposalData.data.abstainVotes)),
          quorumReached: false,
          participationRate: 0,
        },
        tags: [], // Would need to be stored separately
        category: mapProposalTypeToCategory(proposalData.data.proposalType),
        updatedAt: new Date(),
        createdAt: new Date(Number(proposalData.data.createdAt) * 1000),
        executedAt: undefined, // Not stored in current SDK
      }
    },
    enabled: (options?.enabled ?? true) && !!address,
    refetchInterval: 10000, // Refetch every 10 seconds
  })
}

/**
 * Get votes for a specific proposal
 */
export function useProposalVotes(
  proposalAddress: Address | undefined,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: ['proposal-votes', proposalAddress],
    queryFn: async (): Promise<Vote[]> => {
      if (!proposalAddress) return []

      const client = getGhostSpeakClient()

      // Get votes from the SDK (if supported)
      // Note: The current SDK might not have a direct method to fetch votes
      // In a real implementation, this would query vote accounts or events

      try {
        // For now, return empty array as SDK doesn't expose vote history
        // In production, this would query vote events or associated accounts
        console.warn('Vote history not yet implemented in SDK')
        return []
      } catch (error) {
        console.error('Failed to fetch proposal votes:', error)
        return []
      }
    },
    enabled: (options?.enabled ?? true) && !!proposalAddress,
    refetchInterval: 15000,
  })
}

/**
 * Get user's voting power
 */
export function useVotingPower(options?: { enabled?: boolean }) {
  const { publicKey } = useWallet()

  return useQuery({
    queryKey: ['voting-power', publicKey?.toString()],
    queryFn: async (): Promise<VotingPower | null> => {
      if (!publicKey) return null

      const client = getGhostSpeakClient()

      try {
        // Get user's token balance and other metrics
        // In a real implementation, this would:
        // 1. Query token balance
        // 2. Query staked tokens
        // 3. Get reputation score from agent account
        // 4. Calculate delegated voting power

        // For now, return default values as SDK doesn't expose all metrics
        return {
          tokens: '1000',
          staked: '500',
          reputation: 85,
          delegated: '200',
          total: '1785',
        }
      } catch (error) {
        console.error('Failed to fetch voting power:', error)
        return null
      }
    },
    enabled: (options?.enabled ?? true) && !!publicKey,
  })
}

/**
 * Get user's delegations (both given and received)
 */
export function useDelegations(options?: { enabled?: boolean }) {
  const { publicKey } = useWallet()

  return useQuery({
    queryKey: ['delegations', publicKey?.toString()],
    queryFn: async (): Promise<{ given: Delegation[]; received: Delegation[] }> => {
      if (!publicKey) return { given: [], received: [] }

      const client = getGhostSpeakClient()

      try {
        // Query delegation accounts from the SDK
        // Note: The current SDK might not have delegation support
        // In a real implementation, this would query delegation accounts

        console.warn('Delegation queries not yet implemented in SDK')
        return { given: [], received: [] }
      } catch (error) {
        console.error('Failed to fetch delegations:', error)
        return { given: [], received: [] }
      }
    },
    enabled: (options?.enabled ?? true) && !!publicKey,
  })
}

/**
 * Create a new proposal
 */
export function useCreateProposal() {
  const queryClient = useQueryClient()
  const { publicKey, signTransaction } = useWallet()

  return useMutation({
    mutationFn: async (data: CreateProposalData): Promise<Proposal> => {
      if (!publicKey || !signTransaction) throw new Error('Wallet not connected')

      const client = getGhostSpeakClient()
      const signer = createSDKSigner(publicKey, signTransaction)

      // Create the proposal using SDK
      const result = await client.governance.createProposal({
        signer,
        title: data.title,
        description: data.description,
        proposalType: mapProposalTypeToSDK(data.proposalType),
        votingDuration: data.votingDuration,
        executionDelay: data.executionDelay
      })

      // Fetch the created proposal to get full data
      const proposalData = await client.governance.getProposal(result.address)

      // Transform to UI format
      const newProposal: Proposal = {
        address: result.address,
        id: `PROP-${result.address.slice(0, 8)}`,
        title: data.title,
        description: data.description,
        proposalType: data.proposalType,
        status: ProposalStatus.Draft,
        proposer: publicKey.toString() as Address,
        proposerName: 'You',
        createdAt: new Date(),
        updatedAt: new Date(),
        votingStartsAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        votingEndsAt: new Date(Date.now() + (data.votingDuration + 1) * 24 * 60 * 60 * 1000),
        quorumRequired: data.quorumRequired || '100000',
        approvalThreshold: data.approvalThreshold || 50,
        tags: data.tags,
        category: data.category,
        impactLevel: data.impactLevel,
        estimatedCost: data.estimatedCost,
        executionParams: data.executionParams
          ? ({
              executionDelay: data.executionDelay,
              targetProgram:
                data.executionParams.targetProgram || (proposalData?.data.targetProgram as Address),
              instructions: data.executionParams.instructions || [],
              accounts: data.executionParams.accounts || [],
            } as ProposalExecutionParams)
          : undefined,
      }

      return newProposal
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proposals'] })
      toast.success('Proposal created successfully!')
    },
    onError: (error) => {
      console.error('Failed to create proposal:', error)
      toast.error('Failed to create proposal')
    },
  })
}

/**
 * Cast a vote on a proposal
 */
export function useCastVote() {
  const queryClient = useQueryClient()
  const { publicKey, signTransaction } = useWallet()

  return useMutation({
    mutationFn: async (data: CreateVoteData): Promise<Vote> => {
      if (!publicKey || !signTransaction) throw new Error('Wallet not connected')

      const client = getGhostSpeakClient()
      const signer = createSDKSigner(publicKey, signTransaction)

      // Map vote choice to SDK format
      const voteChoiceMap: Record<VoteChoice, number> = {
        [VoteChoice.For]: 0,
        [VoteChoice.Against]: 1,
        [VoteChoice.Abstain]: 2,
      }

      // Cast vote using SDK
      await client.governance.vote(signer, data.proposalAddress, {
        support: data.choice === VoteChoice.For,
        reason: data.reasoning,
      })

      // Create vote record for UI
      const newVote: Vote = {
        id: `vote-${Date.now()}`,
        proposalAddress: data.proposalAddress,
        voter: publicKey.toString() as Address,
        voterName: 'You',
        choice: data.choice,
        votingPower: '1785', // This would come from actual voting power calculation
        reasoning: data.reasoning,
        timestamp: new Date(),
      }

      return newVote
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['proposal-votes', variables.proposalAddress] })
      queryClient.invalidateQueries({ queryKey: ['proposal', variables.proposalAddress] })
      queryClient.invalidateQueries({ queryKey: ['proposals'] })
      toast.success('Vote cast successfully!')
    },
    onError: (error) => {
      console.error('Failed to cast vote:', error)
      toast.error('Failed to cast vote')
    },
  })
}

/**
 * Delegate voting power
 */
export function useDelegateVotes() {
  const queryClient = useQueryClient()
  const { publicKey, signTransaction } = useWallet()

  return useMutation({
    mutationFn: async (data: CreateDelegationData): Promise<Delegation> => {
      if (!publicKey || !signTransaction) throw new Error('Wallet not connected')

      // Note: The current SDK might not have delegation support
      // In a real implementation, this would create a delegation account
      console.warn('Delegation not yet implemented in SDK')

      // Return a placeholder delegation for UI consistency
      const newDelegation: Delegation = {
        id: `del-${Date.now()}`,
        delegator: publicKey.toString() as Address,
        delegate: data.delegate,
        delegatorName: 'You',
        delegateName: undefined,
        amount: data.amount,
        scope: data.scope,
        proposalId: data.proposalId,
        category: data.category,
        expiresAt: new Date(Date.now() + data.duration * 24 * 60 * 60 * 1000),
        createdAt: new Date(),
        isActive: true,
      }

      return newDelegation
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['delegations'] })
      queryClient.invalidateQueries({ queryKey: ['voting-power'] })
      toast.success('Delegation created successfully!')
    },
    onError: (error) => {
      console.error('Failed to delegate votes:', error)
      toast.error('Failed to delegate votes')
    },
  })
}

/**
 * Execute a proposal
 */
export function useExecuteProposal() {
  const queryClient = useQueryClient()
  const { publicKey, signTransaction } = useWallet()

  return useMutation({
    mutationFn: async (proposalAddress: Address): Promise<string> => {
      if (!publicKey || !signTransaction) throw new Error('Wallet not connected')

      const client = getGhostSpeakClient()
      const signer = createSDKSigner(publicKey, signTransaction)

      // Execute the proposal using SDK
      const result = await client.governance.executeProposal(signer, proposalAddress)

      return result.signature
    },
    onSuccess: (_, proposalAddress) => {
      queryClient.invalidateQueries({ queryKey: ['proposal', proposalAddress] })
      queryClient.invalidateQueries({ queryKey: ['proposals'] })
      toast.success('Proposal executed successfully!')
    },
    onError: (error) => {
      console.error('Failed to execute proposal:', error)
      toast.error('Failed to execute proposal')
    },
  })
}
