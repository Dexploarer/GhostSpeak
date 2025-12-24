import React from 'react'
import { render, RenderOptions } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { vi } from 'vitest'

// Mock Crossmint SDK wallet context
export const mockCrossmintWallet = {
  wallet: {
    address: 'mock-wallet-address',
  },
}

// Mock GhostSpeak SDK client - matches the structure returned by getGhostSpeakClient()
export const mockGhostSpeakClient = {
  programId: 'mock-program-id',
  rpcUrl: 'https://api.devnet.solana.com',
  agents: {
    getAllAgents: vi.fn().mockResolvedValue([]),
    getAgentAccount: vi.fn().mockResolvedValue({
      name: 'Mock Agent',
      description: 'Test description',
      owner: 'mock-owner',
      metadataUri: 'https://example.com/metadata',
      frameworkOrigin: 'General',
      totalJobsCompleted: 10,
      reputationScore: 8500,
      originalPrice: BigInt(1000),
      capabilities: ['testing'],
      isActive: true,
      createdAt: Date.now() / 1000,
    }),
    getUserAgents: vi.fn().mockResolvedValue([]),
    register: vi.fn().mockResolvedValue('mock-signature'),
    update: vi.fn().mockResolvedValue('mock-signature'),
    deactivate: vi.fn().mockResolvedValue('mock-signature'),
    activate: vi.fn().mockResolvedValue('mock-signature'),
  },
  marketplace: {
    getServiceListing: vi.fn().mockResolvedValue(null),
    getJobPosting: vi.fn().mockResolvedValue(null),
  },
  escrow: {
    getAllEscrows: vi.fn().mockResolvedValue([]),
    getEscrowsByBuyer: vi.fn().mockResolvedValue([]),
    getEscrowsBySeller: vi.fn().mockResolvedValue([]),
  },
  channels: {
    getAllChannels: vi.fn().mockResolvedValue([]),
    getPublicChannels: vi.fn().mockResolvedValue([]),
    getChannelsByCreator: vi.fn().mockResolvedValue([]),
    getChannelMessages: vi.fn().mockResolvedValue([]),
  },
  governance: {
    getActiveProposals: vi.fn().mockResolvedValue([]),
    getProposalsByProposer: vi.fn().mockResolvedValue([]),
    getProposal: vi.fn().mockResolvedValue(null),
  },
}

// Mock Crossmint signer - matches useCrossmintSigner interface
export const mockCrossmintSigner = {
  address: 'mock-wallet-address',
  isConnected: true,
  isAuthenticated: true,
  isLoading: false,
  createSigner: vi.fn().mockReturnValue({
    address: 'mock-wallet-address',
    signTransactions: vi.fn().mockResolvedValue([]),
  }),
  signTransaction: vi.fn().mockResolvedValue(new Uint8Array()),
  signTransactions: vi.fn().mockResolvedValue([]),
}

// Test providers wrapper
interface TestProvidersProps {
  children: React.ReactNode
  queryClient?: QueryClient
}

export function TestProviders({ children, queryClient }: TestProvidersProps) {
  const client =
    queryClient ||
    new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    })

  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}

// Custom render function with providers
export function renderWithProviders(
  ui: React.ReactElement,
  options?: {
    queryClient?: QueryClient
    renderOptions?: Omit<RenderOptions, 'wrapper'>
  }
) {
  const { queryClient, renderOptions } = options || {}

  return render(ui, {
    wrapper: ({ children }) => <TestProviders queryClient={queryClient}>{children}</TestProviders>,
    ...renderOptions,
  })
}

// Mock data factories
export const createMockAgent = (overrides?: Partial<Record<string, unknown>>) => ({
  address: 'mock-agent-address',
  name: 'Mock Agent',
  owner: 'mock-owner',
  metadata: {
    description: 'A mock agent for testing',
    avatar: 'https://example.com/avatar.png',
    category: 'General',
  },
  capabilities: ['testing', 'mocking'],
  pricing: BigInt(1000000000), // 1 SOL in lamports
  isActive: true,
  createdAt: new Date(),
  reputation: {
    score: 85,
    totalJobs: 25,
    successRate: 95,
  },
  ...overrides,
})

export const createMockEscrow = (overrides?: Partial<Record<string, unknown>>) => ({
  address: 'mock-escrow-address',
  client: 'mock-client',
  agent: 'mock-agent',
  taskId: 'mock-task-id',
  amount: BigInt(5000000000), // 5 SOL
  paymentToken: 'So11111111111111111111111111111111111111112',
  status: 'Active',
  isConfidential: false,
  createdAt: new Date(),
  expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
  milestones: [],
  tokenMetadata: {
    symbol: 'SOL',
    decimals: 9,
    extensions: [],
  },
  totalFeesCollected: BigInt(0),
  interestEarned: BigInt(0),
  ...overrides,
})

export const createMockWorkOrder = (overrides?: Partial<Record<string, unknown>>) => ({
  address: 'mock-work-order-address',
  client: 'mock-client',
  provider: 'mock-provider',
  title: 'Mock Work Order',
  description: 'A mock work order for testing',
  requirements: ['requirement 1', 'requirement 2'],
  paymentAmount: BigInt(3000000000), // 3 SOL
  paymentToken: 'So11111111111111111111111111111111111111112',
  status: 'Open',
  createdAt: new Date(),
  updatedAt: new Date(),
  deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
  milestones: [],
  deliverables: [],
  communicationThread: [],
  ...overrides,
})

export const createMockProposal = (overrides?: Partial<Record<string, unknown>>) => ({
  address: 'mock-proposal-address',
  id: 'PROP-001',
  title: 'Mock Proposal',
  description: 'A mock proposal for testing',
  proposer: 'mock-proposer',
  proposalType: 'ParameterChange',
  status: 'Voting',
  impactLevel: 'Medium',
  tags: ['testing', 'mock'],
  createdAt: new Date(),
  votingEndsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  userHasVoted: false,
  results: {
    totalVotes: '100',
    forVotes: '60',
    againstVotes: '40',
    abstainVotes: '0',
    quorumReached: true,
    participationRate: 0.5,
  },
  ...overrides,
})

// Re-export testing utilities
export * from '@testing-library/react'
export { vi, expect, describe, it, beforeEach, afterEach } from 'vitest'
