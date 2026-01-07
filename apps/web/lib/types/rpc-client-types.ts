import type { Address } from '@solana/addresses'

// Core RPC types
export interface AccountInfo {
  executable: boolean
  owner: string
  lamports: number
  data: Uint8Array
  rentEpoch?: number
}

export interface ProgramAccount {
  pubkey: string
  account: AccountInfo
}

export interface Memcmp {
  offset: number
  bytes: string
  encoding: 'base64' | 'base58'
}

export interface Filter {
  memcmp?: Memcmp
  dataSize?: number
}

export interface GetProgramAccountsOptions {
  filters?: Filter[]
  encoding?: 'base64' | 'jsonParsed'
  dataSlice?: {
    offset: number
    length: number
  }
}

// RPC client interface for GhostSpeak operations
export interface TypedRpcClient {
  getAccountInfo: (address: Address) => Promise<AccountInfo | null>
  getProgramAccounts: (
    programId: Address,
    options?: GetProgramAccountsOptions
  ) => Promise<ProgramAccount[]>
  sendTransaction: (instructions: unknown[], signers: unknown[]) => Promise<string>
  confirmTransaction: (
    signature: string,
    commitment?: 'processed' | 'confirmed' | 'finalized'
  ) => Promise<void>
}

// GhostSpeak client configuration interface
export interface GhostSpeakClientConfig {
  rpc: TypedRpcClient
  network?: 'mainnet' | 'devnet' | 'testnet'
}

// GhostSpeak client interface
export interface TypedGhostSpeakClient {
  config: GhostSpeakClientConfig
  agents: unknown
  marketplace: unknown
  workOrders: unknown
  escrow: unknown
  channels: unknown
  governance: unknown
}
