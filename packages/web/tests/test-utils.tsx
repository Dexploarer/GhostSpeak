import React from 'react'
import { render, RenderOptions } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { WalletContextState } from '@solana/wallet-adapter-react'
import { vi } from 'vitest'

// Mock GhostSpeak SDK
export const mockGhostSpeakClient = {
  agent: () => ({
    module: {
      getAllAgents: vi.fn().mockResolvedValue([]),
      getAgentAccount: vi.fn().mockResolvedValue(null),
      register: vi.fn().mockResolvedValue('mock-signature'),
      update: vi.fn().mockResolvedValue('mock-signature'),
      deactivate: vi.fn().mockResolvedValue('mock-signature'),
      activate: vi.fn().mockResolvedValue('mock-signature'),
    },
    create: vi.fn().mockReturnValue({
      compressed: vi.fn().mockReturnThis(),
      module: {
        register: vi.fn().mockResolvedValue('mock-signature'),
      },
    }),
  }),
  marketplace: () => ({
    module: {
      getAllServiceListings: vi.fn().mockResolvedValue([]),
      getAllJobPostings: vi.fn().mockResolvedValue([]),
      createServiceListing: vi.fn().mockResolvedValue({ signature: 'mock-signature' }),
      purchaseService: vi.fn().mockResolvedValue({ signature: 'mock-signature' }),
    },
  }),
  workOrders: () => ({
    module: {
      getAllWorkOrders: vi.fn().mockResolvedValue([]),
      getWorkOrderByAddress: vi.fn().mockResolvedValue(null),
      createWorkOrder: vi.fn().mockResolvedValue({ signature: 'mock-signature' }),
    },
  }),
  escrow: () => ({
    module: {
      getAllEscrows: vi.fn().mockResolvedValue([]),
      createEscrow: vi.fn().mockResolvedValue({ signature: 'mock-signature' }),
      completeEscrow: vi.fn().mockResolvedValue({ signature: 'mock-signature' }),
    },
  }),
  channels: () => ({
    module: {
      getAllChannels: vi.fn().mockResolvedValue([]),
      createChannel: vi.fn().mockResolvedValue({ signature: 'mock-signature' }),
      sendMessage: vi.fn().mockResolvedValue({ signature: 'mock-signature' }),
    },
  }),
  governance: () => ({
    module: {
      getAllProposals: vi.fn().mockResolvedValue([]),
      createProposal: vi.fn().mockResolvedValue({ signature: 'mock-signature' }),
      vote: vi.fn().mockResolvedValue({ signature: 'mock-signature' }),
    },
  }),
  config: {
    rpc: {
      getAccountInfo: vi.fn().mockResolvedValue(null),
      getProgramAccounts: vi.fn().mockResolvedValue([]),
      sendTransaction: vi.fn().mockResolvedValue('mock-signature'),
      confirmTransaction: vi.fn().mockResolvedValue(undefined),
    },
  },
}

// Mock wallet context
export const mockWallet: Partial<WalletContextState> = {
  publicKey: {
    toBase58: () => 'mock-public-key',
    toBuffer: () => Buffer.from('mock-public-key'),
    equals: () => false,
  } as any,
  signTransaction: vi.fn().mockResolvedValue({} as any),
  signAllTransactions: vi.fn().mockResolvedValue([]),
  connected: true,
  connecting: false,
  disconnecting: false,
  wallet: null,
  connect: vi.fn(),
  disconnect: vi.fn(),
  sendTransaction: vi.fn().mockResolvedValue('mock-signature'),
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
export const createMockAgent = (overrides?: Partial<any>) => ({
  address: 'mock-agent-address',
  name: 'Mock Agent',
  owner: 'mock-owner',
  metadata: {
    name: 'Mock Agent',
    description: 'A mock agent for testing',
    avatar: 'https://example.com/avatar.png',
  },
  capabilities: ['testing', 'mocking'],
  pricing: BigInt(1000000000), // 1 SOL in lamports
  isActive: true,
  compressed: false,
  createdAt: new Date(),
  updatedAt: new Date(),
  reputation: {
    score: 4.5,
    totalReviews: 10,
    totalJobs: 25,
    successRate: 0.95,
    avgResponseTime: 2.5,
    onTimeDelivery: 0.98,
  },
  ...overrides,
})

export const createMockEscrow = (overrides?: Partial<any>) => ({
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

export const createMockWorkOrder = (overrides?: Partial<any>) => ({
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

export const createMockProposal = (overrides?: Partial<any>) => ({
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
