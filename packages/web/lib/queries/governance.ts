'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useWallet } from '@solana/wallet-adapter-react'
import type { Address } from '@solana/web3.js'

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
// MOCK DATA
// =====================================================

const mockProposals: Proposal[] = [
  {
    address: 'Cv7rCrqKXhUmNGfcLGtjLTK8RR6qKyKSfH8r8kJrLHwU' as Address,
    id: 'PROP-001',
    title: 'Increase Service Fee Cap to 7%',
    description: `This proposal increases the maximum service fee from 5% to 7% to better compensate high-quality AI agents and incentivize premium services.

**Current State:** 5% (500 basis points)
**Proposed Change:** 7% (700 basis points)

**Rationale:**
- Premium AI services require higher compute costs
- Competitive rates attract better service providers  
- Revenue sharing improves protocol sustainability
- Market analysis shows 7% is competitive with similar platforms

**Implementation:**
This change will be implemented through a parameter update to the protocol configuration. The change will take effect 48 hours after approval to allow all participants to adjust their fee structures.

**Risk Assessment:**
- Low risk to existing users
- May increase costs for some services
- Expected to improve service quality overall`,
    proposalType: ProposalType.ParameterChange,
    status: ProposalStatus.Voting,
    proposer: '7fUAJdStEuGbc3sM84cKRL6yYaaSstyLSU4ve5oovLS7' as Address,
    proposerName: 'Alice Thompson',
    createdAt: new Date('2025-07-20T10:00:00Z'),
    updatedAt: new Date('2025-07-23T15:30:00Z'),
    votingStartsAt: new Date('2025-07-21T00:00:00Z'),
    votingEndsAt: new Date('2025-07-28T00:00:00Z'),
    quorumRequired: '100000',
    approvalThreshold: 60,
    results: {
      forVotes: '75000',
      againstVotes: '25000',
      abstainVotes: '5000',
      totalVotes: '105000',
      quorumReached: true,
      participationRate: 0.21,
    },
    tags: ['fees', 'parameters', 'economics'],
    category: 'Protocol Parameters',
    impactLevel: 'Medium',
    estimatedCost: '0 SOL',
    userHasVoted: true,
    userVoteChoice: VoteChoice.For,
    userVotingPower: {
      tokens: '1000',
      staked: '500',
      reputation: 85,
      delegated: '200',
      total: '1785',
    },
  },
  {
    address: 'Bm4rDrqKXhUmNGfcLGtjLTK8RR6qKyKSfH8r8kJrBHwP' as Address,
    id: 'PROP-002',
    title: 'Treasury Allocation for Agent Incentive Program',
    description: `Proposal to allocate 50,000 GHOST tokens from the treasury to fund a 6-month agent incentive program.

**Program Overview:**
The program will incentivize high-quality AI agents to join the GhostSpeak platform by providing token rewards based on performance metrics.

**Allocation Breakdown:**
- Performance rewards: 35,000 GHOST (70%)
- Onboarding bonuses: 10,000 GHOST (20%) 
- Community building: 5,000 GHOST (10%)

**Success Metrics:**
- Attract 100+ new premium agents
- Increase platform transaction volume by 40%
- Improve average service quality scores

**Timeline:**
- Month 1-2: Program launch and onboarding
- Month 3-4: Mid-program evaluation and adjustments
- Month 5-6: Final rewards distribution`,
    proposalType: ProposalType.Treasury,
    status: ProposalStatus.Draft,
    proposer: '9kUmNGfcLGtjLTK8RR6qKyKSfH8r8kJrLHwUCv7rCrqK' as Address,
    proposerName: 'Bob Chen',
    createdAt: new Date('2025-07-23T14:00:00Z'),
    updatedAt: new Date('2025-07-23T14:00:00Z'),
    votingStartsAt: new Date('2025-07-25T00:00:00Z'),
    votingEndsAt: new Date('2025-08-01T00:00:00Z'),
    quorumRequired: '150000',
    approvalThreshold: 55,
    tags: ['treasury', 'incentives', 'growth'],
    category: 'Treasury Management',
    impactLevel: 'High',
    estimatedCost: '50,000 GHOST',
    userHasVoted: false,
  },
  {
    address: 'Fm5rEsqKXhUmNGfcLGtjLTK8RR6qKyKSfH8r8kJrFHwQ' as Address,
    id: 'PROP-003',
    title: 'Upgrade to Enhanced Privacy Features',
    description: `Protocol upgrade to implement advanced privacy features for sensitive AI agent transactions.

**Technical Changes:**
- Integration with zero-knowledge proof system
- Enhanced encryption for agent communication
- Private transaction routing options
- Confidential balance support

**Benefits:**
- Improved privacy for enterprise users
- Competitive advantage in privacy-focused markets
- Better compliance with data protection regulations
- Enhanced security for high-value transactions

**Implementation Plan:**
Phase 1: Core ZK infrastructure (Weeks 1-4)
Phase 2: Privacy UI/UX updates (Weeks 5-6)  
Phase 3: Testing and security audit (Weeks 7-8)
Phase 4: Mainnet deployment (Week 9)`,
    proposalType: ProposalType.Upgrade,
    status: ProposalStatus.Succeeded,
    proposer: '3tUAJdStEuGbc3sM84cKRL6yYaaSstyLSU4ve5oovRT6' as Address,
    proposerName: 'Carol Rodriguez',
    createdAt: new Date('2025-07-15T09:00:00Z'),
    updatedAt: new Date('2025-07-22T16:45:00Z'),
    votingStartsAt: new Date('2025-07-16T00:00:00Z'),
    votingEndsAt: new Date('2025-07-22T00:00:00Z'),
    quorumRequired: '200000',
    approvalThreshold: 66,
    results: {
      forVotes: '185000',
      againstVotes: '45000',
      abstainVotes: '15000',
      totalVotes: '245000',
      quorumReached: true,
      participationRate: 0.49,
    },
    executionParams: {
      executionDelay: 72,
      targetProgram: 'GhostSpeakV3Program' as Address,
      instructions: ['upgrade_privacy_module', 'enable_zk_features'],
      accounts: [],
      executeAfter: new Date('2025-07-25T16:45:00Z'),
    },
    tags: ['upgrade', 'privacy', 'zk-proofs'],
    category: 'Protocol Upgrades',
    impactLevel: 'High',
    estimatedCost: '15,000 SOL',
    userHasVoted: true,
    userVoteChoice: VoteChoice.For,
  },
  {
    address: 'Dk8rFtqKXhUmNGfcLGtjLTK8RR6qKyKSfH8r8kJrDHwS' as Address,
    id: 'PROP-004',
    title: 'Emergency Pause: Critical Vulnerability Fix',
    description: `EMERGENCY PROPOSAL: Temporary protocol pause to address critical vulnerability discovered in the escrow module.

**Vulnerability Details:**
A critical vulnerability was discovered that could allow malicious actors to drain escrow funds under specific conditions. Immediate action is required.

**Proposed Actions:**
1. Immediately pause all escrow operations
2. Deploy emergency patch within 24 hours
3. Conduct full security audit
4. Resume operations after verification

**Timeline:**
- Hour 0: Protocol pause
- Hours 1-24: Emergency patch development
- Hours 24-48: Testing and verification
- Hour 48+: Phased resumption of operations

**Risk Mitigation:**
- All existing escrows remain secure
- No user funds are at risk during pause
- Full compensation for any affected users`,
    proposalType: ProposalType.Emergency,
    status: ProposalStatus.Executed,
    proposer: '5tUAJdStEuGbc3sM84cKRL6yYaaSstyLSU4ve5oovST8' as Address,
    proposerName: 'Emergency Council',
    createdAt: new Date('2025-07-18T18:00:00Z'),
    updatedAt: new Date('2025-07-18T20:30:00Z'),
    votingStartsAt: new Date('2025-07-18T18:15:00Z'),
    votingEndsAt: new Date('2025-07-18T20:15:00Z'),
    quorumRequired: '50000',
    approvalThreshold: 75,
    results: {
      forVotes: '95000',
      againstVotes: '5000',
      abstainVotes: '2000',
      totalVotes: '102000',
      quorumReached: true,
      participationRate: 0.2,
    },
    executedAt: new Date('2025-07-18T20:30:00Z'),
    executionTxId: '3kUmNGfcLGtjLTK8RR6qKyKSfH8r8kJrLHwUCv7rCrqKXhUmNGfcLGtjLTK8RR6qKyKSfH8r8kJr',
    tags: ['emergency', 'security', 'pause'],
    category: 'Emergency Actions',
    impactLevel: 'Critical',
    userHasVoted: true,
    userVoteChoice: VoteChoice.For,
  },
  {
    address: 'Em9rGurKXhUmNGfcLGtjLTK8RR6qKyKSfH8r8kJrEHwT' as Address,
    id: 'PROP-005',
    title: 'Enable Cross-Chain Agent Deployment',
    description: `Feature proposal to enable AI agents to deploy and operate across multiple blockchain networks.

**Supported Networks:**
- Ethereum (via bridge)
- Polygon (native integration)
- Arbitrum (L2 deployment)
- Base (Coinbase L2)

**Technical Implementation:**
- Cross-chain message passing
- Multi-network agent registry
- Unified fee collection
- Bridge security protocols

**Benefits:**
- Access to larger user base
- Diversified revenue streams
- Reduced network congestion risk
- Enhanced platform resilience

**Phased Rollout:**
Phase 1: Polygon integration (Month 1)
Phase 2: Arbitrum support (Month 2)
Phase 3: Ethereum mainnet (Month 3)
Phase 4: Additional networks (Month 4+)`,
    proposalType: ProposalType.Feature,
    status: ProposalStatus.Defeated,
    proposer: '6tUAJdStEuGbc3sM84cKRL6yYaaSstyLSU4ve5oovTT9' as Address,
    proposerName: 'Dave Kumar',
    createdAt: new Date('2025-07-10T11:00:00Z'),
    updatedAt: new Date('2025-07-19T23:59:00Z'),
    votingStartsAt: new Date('2025-07-12T00:00:00Z'),
    votingEndsAt: new Date('2025-07-19T00:00:00Z'),
    quorumRequired: '125000',
    approvalThreshold: 60,
    results: {
      forVotes: '65000',
      againstVotes: '95000',
      abstainVotes: '12000',
      totalVotes: '172000',
      quorumReached: true,
      participationRate: 0.34,
    },
    tags: ['cross-chain', 'features', 'expansion'],
    category: 'New Features',
    impactLevel: 'High',
    estimatedCost: '25,000 SOL',
    userHasVoted: true,
    userVoteChoice: VoteChoice.Against,
  },
]

const mockVotes: Vote[] = [
  {
    id: 'vote-001',
    proposalAddress: 'Cv7rCrqKXhUmNGfcLGtjLTK8RR6qKyKSfH8r8kJrLHwU' as Address,
    voter: '7fUAJdStEuGbc3sM84cKRL6yYaaSstyLSU4ve5oovLS7' as Address,
    voterName: 'Alice Thompson',
    choice: VoteChoice.For,
    votingPower: '5000',
    reasoning:
      "This change will improve the platform's competitiveness and attract higher quality services.",
    timestamp: new Date('2025-07-22T14:30:00Z'),
  },
  {
    id: 'vote-002',
    proposalAddress: 'Cv7rCrqKXhUmNGfcLGtjLTK8RR6qKyKSfH8r8kJrLHwU' as Address,
    voter: '8gVBKeFtHvNnHgGdMGujMUL7rR7rLyLTU5wf6pppMLx8' as Address,
    voterName: 'Bob Wilson',
    choice: VoteChoice.Against,
    votingPower: '2500',
    reasoning:
      'The fee increase may discourage smaller agents from participating in the ecosystem.',
    timestamp: new Date('2025-07-22T16:45:00Z'),
  },
]

const mockDelegations: Delegation[] = [
  {
    id: 'del-001',
    delegator: '9hWCLfUuIwOoIhHeMHvkNVL8sS8sMyMUV6xg7qqqNMy9' as Address,
    delegate: '7fUAJdStEuGbc3sM84cKRL6yYaaSstyLSU4ve5oovLS7' as Address,
    delegatorName: 'Charlie Davis',
    delegateName: 'Alice Thompson',
    amount: '1000',
    scope: 'Category',
    category: 'Protocol Parameters',
    expiresAt: new Date('2025-08-30T00:00:00Z'),
    createdAt: new Date('2025-07-15T10:00:00Z'),
    isActive: true,
  },
]

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
      // Simulate API delay
      await new Promise((resolve) => setTimeout(resolve, 800))

      let filteredProposals = [...mockProposals]

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

      // Simulate API delay
      await new Promise((resolve) => setTimeout(resolve, 500))

      return mockProposals.find((p) => p.address === address) || null
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

      // Simulate API delay
      await new Promise((resolve) => setTimeout(resolve, 400))

      return mockVotes
        .filter((v) => v.proposalAddress === proposalAddress)
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
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

      // Simulate API delay
      await new Promise((resolve) => setTimeout(resolve, 300))

      // Mock voting power calculation
      return {
        tokens: '1000',
        staked: '500',
        reputation: 85,
        delegated: '200',
        total: '1785',
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

      // Simulate API delay
      await new Promise((resolve) => setTimeout(resolve, 400))

      const userAddress = publicKey.toString() as Address
      const given = mockDelegations.filter((d) => d.delegator === userAddress)
      const received = mockDelegations.filter((d) => d.delegate === userAddress)

      return { given, received }
    },
    enabled: (options?.enabled ?? true) && !!publicKey,
  })
}

/**
 * Create a new proposal
 */
export function useCreateProposal() {
  const queryClient = useQueryClient()
  const { publicKey } = useWallet()

  return useMutation({
    mutationFn: async (data: CreateProposalData): Promise<Proposal> => {
      if (!publicKey) throw new Error('Wallet not connected')

      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 2000))

      const newProposal: Proposal = {
        address: `proposal_${Date.now()}` as Address,
        id: `PROP-${String(mockProposals.length + 1).padStart(3, '0')}`,
        title: data.title,
        description: data.description,
        proposalType: data.proposalType,
        status: ProposalStatus.Draft,
        proposer: publicKey.toString() as Address,
        proposerName: 'You',
        createdAt: new Date(),
        updatedAt: new Date(),
        votingStartsAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
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
              targetProgram: data.executionParams.targetProgram || 'GhostSpeakProgram',
              instructions: data.executionParams.instructions || [],
              accounts: data.executionParams.accounts || [],
            } as ProposalExecutionParams)
          : undefined,
      }

      mockProposals.unshift(newProposal)
      return newProposal
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proposals'] })
    },
  })
}

/**
 * Cast a vote on a proposal
 */
export function useCastVote() {
  const queryClient = useQueryClient()
  const { publicKey } = useWallet()

  return useMutation({
    mutationFn: async (data: CreateVoteData): Promise<Vote> => {
      if (!publicKey) throw new Error('Wallet not connected')

      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1500))

      const newVote: Vote = {
        id: `vote-${Date.now()}`,
        proposalAddress: data.proposalAddress,
        voter: publicKey.toString() as Address,
        voterName: 'You',
        choice: data.choice,
        votingPower: '1785', // From user's voting power
        reasoning: data.reasoning,
        timestamp: new Date(),
      }

      mockVotes.push(newVote)

      // Update proposal with user vote
      const proposal = mockProposals.find((p) => p.address === data.proposalAddress)
      if (proposal) {
        proposal.userHasVoted = true
        proposal.userVoteChoice = data.choice
      }

      return newVote
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['proposal-votes', variables.proposalAddress] })
      queryClient.invalidateQueries({ queryKey: ['proposal', variables.proposalAddress] })
      queryClient.invalidateQueries({ queryKey: ['proposals'] })
    },
  })
}

/**
 * Delegate voting power
 */
export function useDelegateVotes() {
  const queryClient = useQueryClient()
  const { publicKey } = useWallet()

  return useMutation({
    mutationFn: async (data: CreateDelegationData): Promise<Delegation> => {
      if (!publicKey) throw new Error('Wallet not connected')

      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000))

      const newDelegation: Delegation = {
        id: `del-${Date.now()}`,
        delegator: publicKey.toString() as Address,
        delegate: data.delegate,
        delegatorName: 'You',
        delegateName: undefined, // Would be fetched
        amount: data.amount,
        scope: data.scope,
        proposalId: data.proposalId,
        category: data.category,
        expiresAt: new Date(Date.now() + data.duration * 24 * 60 * 60 * 1000),
        createdAt: new Date(),
        isActive: true,
      }

      mockDelegations.push(newDelegation)
      return newDelegation
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['delegations'] })
      queryClient.invalidateQueries({ queryKey: ['voting-power'] })
    },
  })
}

/**
 * Execute a proposal
 */
export function useExecuteProposal() {
  const queryClient = useQueryClient()
  const { publicKey } = useWallet()

  return useMutation({
    mutationFn: async (proposalAddress: Address): Promise<string> => {
      if (!publicKey) throw new Error('Wallet not connected')

      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 3000))

      const proposal = mockProposals.find((p) => p.address === proposalAddress)
      if (proposal && proposal.status === ProposalStatus.Succeeded) {
        proposal.status = ProposalStatus.Executed
        proposal.executedAt = new Date()
        proposal.executionTxId = `exec_${Date.now()}`
      }

      return `execution_tx_${Date.now()}`
    },
    onSuccess: (_, proposalAddress) => {
      queryClient.invalidateQueries({ queryKey: ['proposal', proposalAddress] })
      queryClient.invalidateQueries({ queryKey: ['proposals'] })
    },
  })
}
