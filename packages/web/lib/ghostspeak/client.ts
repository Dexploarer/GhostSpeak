// Browser-compatible SDK client wrapper
// Dynamic import to avoid fs dependency issues in browser builds

export interface MockGhostSpeakClient {
  agents: () => {
    module: {
      getAllAgents: () => Promise<unknown[]>
      getAgentByAddress: (address: string) => Promise<unknown>
      registerAgent: (data: unknown) => Promise<{ signature: string }>
      updateAgent: (address: string, data: unknown) => Promise<{ signature: string }>
      deleteAgent: (address: string) => Promise<{ signature: string }>
    }
  }
  marketplace: () => {
    module: {
      getAllServiceListings: () => Promise<unknown[]>
      getAllJobPostings: () => Promise<unknown[]>
      createServiceListing: (data: unknown) => Promise<{ signature: string }>
      createJobPosting: (data: unknown) => Promise<{ signature: string }>
      purchaseService: (address: string) => Promise<{ signature: string }>
      applyToJob: (address: string, data: unknown) => Promise<{ signature: string }>
    }
  }
  workOrders: () => {
    module: {
      getAllWorkOrders: () => Promise<unknown[]>
      getWorkOrderByAddress: (address: string) => Promise<unknown>
      createWorkOrder: (data: unknown) => Promise<{ signature: string }>
      submitDelivery: (address: string, data: unknown) => Promise<{ signature: string }>
      approveDelivery: (address: string) => Promise<{ signature: string }>
    }
  }
  escrow: () => {
    module: {
      getAllEscrows: () => Promise<unknown[]>
      getEscrowAccount: (address: string) => Promise<unknown>
      create: (data: unknown) => Promise<string>
      complete: (signer: unknown, address: string) => Promise<string>
      cancel: (signer: unknown, address: string, options: unknown) => Promise<string>
      dispute: (signer: unknown, address: string, reason: string) => Promise<string>
      processPartialRefund: (
        signer: unknown,
        address: string,
        refundAmount: bigint,
        totalAmount: bigint
      ) => Promise<string>
    }
  }
  channels: () => {
    module: {
      getAllChannels: () => Promise<unknown[]>
      getPublicChannels: () => Promise<unknown[]>
      getChannelAccount: (address: string) => Promise<unknown>
      getChannelMessages: (address: string) => Promise<unknown[]>
      create: (data: unknown) => Promise<string>
      sendMessage: (data: unknown) => Promise<string>
      join: (signer: unknown, address: string) => Promise<string>
      leave: (signer: unknown, address: string) => Promise<string>
      addReaction: (signer: unknown, messageId: string, emoji: string) => Promise<string>
    }
  }
  governance: () => {
    module: {
      getAllProposals: () => Promise<unknown[]>
      getProposal: (id: string) => Promise<unknown>
      createProposal: (data: unknown) => Promise<{ signature: string }>
      vote: (proposalId: string, vote: unknown) => Promise<{ signature: string }>
      executeProposal: (proposalId: string) => Promise<{ signature: string }>
    }
  }
  config?: {
    rpc?: {
      getProgramAccounts: (address: string, options: unknown) => Promise<unknown[]>
      getAccountInfo: (address: string) => Promise<{ data: Uint8Array } | null>
      sendTransaction?: (instructions: unknown[], signers: unknown[]) => Promise<string>
      confirmTransaction?: (signature: string, commitment: string) => Promise<void>
    }
  }
}

let clientInstance: MockGhostSpeakClient | null = null

export function getGhostSpeakClient(): MockGhostSpeakClient {
  if (!clientInstance) {
    // Create a mock client for browser usage
    // This will be replaced with proper dynamic imports once the SDK fs issue is resolved
    clientInstance = {
      agents: () => ({
        module: {
          getAllAgents: async () => [],
          getAgentByAddress: async () => null,
          registerAgent: async () => ({ signature: 'mock-signature' }),
          updateAgent: async () => ({ signature: 'mock-signature' }),
          deleteAgent: async () => ({ signature: 'mock-signature' }),
        },
      }),
      marketplace: () => ({
        module: {
          getAllServiceListings: async () => [],
          getAllJobPostings: async () => [],
          createServiceListing: async () => ({ signature: 'mock-signature' }),
          purchaseService: async () => ({ signature: 'mock-signature' }),
          getServiceListing: async () => null,
          getPurchaseServiceInstruction: async () => ({}),
          execute: async () => 'mock-signature',
        },
        service: () => ({
          module: {
            createServiceListing: async () => 'mock-signature',
          },
        }),
        job: () => ({
          module: {
            createJobPosting: async () => 'mock-signature',
          },
        }),
      }),
      workOrders: () => ({
        module: {
          getAllWorkOrders: async () => [],
          getWorkOrderByAddress: async () => null,
          createWorkOrder: async () => ({ signature: 'mock-signature' }),
        },
      }),
      escrow: () => ({
        module: {
          getAllEscrows: async () => [],
          createEscrow: async () => ({ signature: 'mock-signature' }),
          completeEscrow: async () => ({ signature: 'mock-signature' }),
        },
      }),
      channels: () => ({
        module: {
          getAllChannels: async () => [],
          createChannel: async () => ({ signature: 'mock-signature' }),
          sendMessage: async () => ({ signature: 'mock-signature' }),
        },
      }),
      governance: () => ({
        module: {
          getAllProposals: async () => [],
          createProposal: async () => ({ signature: 'mock-signature' }),
          vote: async () => ({ signature: 'mock-signature' }),
        },
      }),
      config: {
        rpc: {
          getAccountInfo: async () => null,
          getProgramAccounts: async () => [],
          sendTransaction: async () => 'mock-signature',
          confirmTransaction: async () => undefined,
        },
      },
    }
  }

  return clientInstance
}

// Re-export for compatibility
export const GhostSpeakClient = getGhostSpeakClient
