// TEMPORARY STUBS for GitHub Pages deployment - replace with real SDK integration later
// Using temporary stubs to allow static site build and deployment
// TODO: Replace with actual @ghostspeak/sdk integration once build issues are resolved

type Address = string
type TransactionSigner = any

// STUB program ID for deployment
const GHOSTSPEAK_PROGRAM_ID = 'Ga2aEq5HQeBMUd7AzCcjLaTTLHqigcTQkxcCt4ET9YuS' as Address

// STUB client interface for deployment
export interface RealGhostSpeakClient {
  sdk: any
  programId: Address
  agents: {
    getAllAgents: () => Promise<any[]>
    getAgentByAddress: (address: Address) => Promise<any>
    registerAgent: (signer: TransactionSigner, data: any) => Promise<{ address: Address; signature: string }>
    updateAgent: (signer: TransactionSigner, address: Address, data: any) => Promise<{ signature: string }>
    deactivateAgent: (signer: TransactionSigner, address: Address) => Promise<{ signature: string }>
  }
  marketplace: any
  workOrders: any
  escrow: any
  channels: any
  governance: any
}

// STUB client instance for deployment
let clientInstance: RealGhostSpeakClient | null = null

export function getGhostSpeakClient(): RealGhostSpeakClient {
  if (!clientInstance) {
    const sdk = {} // STUB SDK
    clientInstance = {
      sdk,
      programId: GHOSTSPEAK_PROGRAM_ID,
      agents: {
        getAllAgents: async () => [],
        getAgentByAddress: async () => null,
        registerAgent: async () => ({ address: 'stub-address', signature: 'stub-signature' }),
        updateAgent: async () => ({ signature: 'stub-signature' }),
        deactivateAgent: async () => ({ signature: 'stub-signature' }),
      },
      marketplace: {},
      workOrders: {},
      escrow: {},
      channels: {},
      governance: {},
    }
  }
  return clientInstance!
}

// Export with correct typing
export const GhostSpeakClient = getGhostSpeakClient

// Export type for external use
export { type RealGhostSpeakClient as GhostSpeakClientType }