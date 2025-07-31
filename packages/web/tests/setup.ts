import '@testing-library/jest-dom'
import { vi } from 'vitest'

// Mock the GhostSpeak client for all tests
vi.mock('@/lib/ghostspeak/client', () => ({
  getGhostSpeakClient: vi.fn(() => ({
    agent: () => ({
      module: {
        getAllAgents: vi.fn().mockResolvedValue([]),
        getAgentAccount: vi.fn().mockResolvedValue({
          agentId: 'test-agent',
          metadataUri: 'test-metadata',
        }),
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
        createServiceListing: vi.fn().mockResolvedValue('mock-signature'),
        purchaseService: vi.fn().mockResolvedValue('mock-signature'),
      },
    }),
    workOrders: () => ({
      module: {
        getAllWorkOrders: vi.fn().mockResolvedValue([]),
        getWorkOrderByAddress: vi.fn().mockResolvedValue(null),
        createWorkOrder: vi.fn().mockResolvedValue('mock-signature'),
      },
    }),
    escrow: () => ({
      module: {
        getAllEscrows: vi.fn().mockResolvedValue([]),
        getEscrowAccount: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockResolvedValue('mock-signature'),
        complete: vi.fn().mockResolvedValue('mock-signature'),
        cancel: vi.fn().mockResolvedValue('mock-signature'),
        dispute: vi.fn().mockResolvedValue('mock-signature'),
        processPartialRefund: vi.fn().mockResolvedValue('mock-signature'),
      },
    }),
    channels: () => ({
      module: {
        getAllChannels: vi.fn().mockResolvedValue([]),
        getPublicChannels: vi.fn().mockResolvedValue([]),
        getChannelAccount: vi.fn().mockResolvedValue(null),
        getChannelMessages: vi.fn().mockResolvedValue([]),
        create: vi.fn().mockResolvedValue('mock-signature'),
        sendMessage: vi.fn().mockResolvedValue('mock-signature'),
        join: vi.fn().mockResolvedValue('mock-signature'),
        leave: vi.fn().mockResolvedValue('mock-signature'),
        addReaction: vi.fn().mockResolvedValue('mock-signature'),
      },
    }),
    governance: () => ({
      module: {
        getAllProposals: vi.fn().mockResolvedValue([]),
        getProposal: vi.fn().mockResolvedValue(null),
        createProposal: vi.fn().mockResolvedValue('mock-signature'),
        vote: vi.fn().mockResolvedValue('mock-signature'),
        executeProposal: vi.fn().mockResolvedValue('mock-signature'),
      },
    }),
    config: {
      rpc: {
        getAccountInfo: vi.fn().mockResolvedValue({ data: new Uint8Array() }),
        getProgramAccounts: vi.fn().mockResolvedValue([]),
        sendTransaction: vi.fn().mockResolvedValue('mock-signature'),
        confirmTransaction: vi.fn().mockResolvedValue(undefined),
      },
    },
  })),
}))
