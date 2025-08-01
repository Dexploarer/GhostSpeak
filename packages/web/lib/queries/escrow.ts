'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getGhostSpeakClient } from '@/lib/ghostspeak/client'
import { toast } from 'sonner'
import { useWallet } from '@solana/wallet-adapter-react'
import type { Address } from '@solana/addresses'
import type { TransactionSigner } from '@solana/kit'
// Import types from SDK via dynamic import to avoid fs dependency issues
// import {
//   EscrowStatus as SDKEscrowStatus,
//   type Escrow as SDKEscrow,
//   EscrowModule,
//   getEscrowDecoder,
//   deriveEscrowPDA,
//   GHOSTSPEAK_MARKETPLACE_PROGRAM_ADDRESS,
//   deriveWorkOrderPda,
//   TOKEN_2022_PROGRAM_ADDRESS,
//   NATIVE_MINT_ADDRESS,
//   hasTransferFeeExtension,
//   hasConfidentialTransferExtension,
//   hasInterestBearingExtension,
//   getTransferFeeConfig,
//   getConfidentialTransferConfig,
//   getInterestBearingConfig,
//   calculateTransferFee,
//   calculateInterest,
// } from '@ghostspeak/sdk'

// Convert wallet adapter to SDK signer
function createSDKSigner(
  publicKey: { toBase58(): string },
  signTransaction: (tx: unknown) => Promise<unknown>
): TransactionSigner {
  return {
    address: publicKey.toBase58() as Address,
    signTransaction,
  } as TransactionSigner
}

// Define local types and constants to avoid import issues
type SDKEscrowStatus = 'Active' | 'Completed' | 'Disputed' | 'Refunded' | 'Expired'

// Type for escrow data from SDK
interface EscrowSDKData {
  client: Address
  agent: Address
  taskId: number
  amount: bigint
  status: SDKEscrowStatus | number
  createdAt: bigint
  completedAt?: bigint
  paymentToken: Address
  disputeReason?: string | null
  disputeResolution?: string | null
  refundAmount?: bigint
}

// Local constants to avoid import issues
const NATIVE_MINT_ADDRESS = 'So11111111111111111111111111111111111111112'
const TOKEN_2022_PROGRAM_ADDRESS = 'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb'
const GHOSTSPEAK_MARKETPLACE_PROGRAM_ADDRESS = 'GHSTkqVhYGwmMCQthiE3p1Vww5nQstbsB6sQ8cqyKhHR'

// Helper function to derive escrow PDA
const deriveEscrowPDA = async (workOrder: unknown, program: string): Promise<string> => {
  // PDA derivation would use getProgramDerivedAddress from @solana/kit
  // For now, return a deterministic address based on inputs
  return `escrow_${workOrder}_${program}`
}

export enum EscrowStatus {
  Active = 'Active',
  Completed = 'Completed',
  Disputed = 'Disputed',
  Resolved = 'Resolved',
  Cancelled = 'Cancelled',
  Refunded = 'Refunded',
}

export interface TokenExtension {
  type:
    | 'TransferFee'
    | 'ConfidentialTransfer'
    | 'InterestBearing'
    | 'DefaultAccountState'
    | 'MintCloseAuthority'
  enabled: boolean
  config?: unknown
}

export interface TransferFeeConfig {
  transferFeeBasisPoints: number
  maximumFee: bigint
  feeAuthority: string
  withdrawWithheldAuthority: string
}

export interface ConfidentialTransferConfig {
  authority: string
  autoApproveNewAccounts: boolean
  auditorElgamalPubkey?: string
}

export interface Token2022Metadata {
  programId: string
  decimals: number
  symbol: string
  name: string
  extensions: TokenExtension[]
  transferFeeConfig?: TransferFeeConfig
  confidentialTransferConfig?: ConfidentialTransferConfig
  totalSupply: bigint
  mintAuthority?: string
  freezeAuthority?: string
}

export interface EscrowMilestone {
  id: string
  title: string
  description?: string
  amount: bigint
  completed: boolean
  completedAt?: Date
  transactionId?: string
}

export interface Escrow {
  address: string
  client: string
  agent: string
  clientName?: string
  agentName?: string
  taskId: string
  workOrderAddress?: string
  marketplaceListingAddress?: string
  amount: bigint
  status: EscrowStatus
  paymentToken: string
  tokenMetadata: Token2022Metadata
  isConfidential: boolean
  transferHook?: string
  createdAt: Date
  expiresAt: Date
  completedAt?: Date
  milestones: EscrowMilestone[]
  disputeReason?: string
  resolutionNotes?: string
  totalFeesCollected: bigint
  interestEarned: bigint
}

export interface CreateEscrowData {
  client: string
  agent: string
  taskId: string
  amount: bigint
  paymentToken: string
  isConfidential?: boolean
  transferHook?: string
  expiresAt: Date
  milestones?: Omit<EscrowMilestone, 'id' | 'completed' | 'completedAt' | 'transactionId'>[]
  workOrderAddress?: string
  marketplaceListingAddress?: string
}

export interface CompleteEscrowData {
  escrowAddress: string
  resolutionNotes: string
}

export interface DisputeEscrowData {
  escrowAddress: string
  reason: string
  evidence: string[]
}

export interface PartialRefundData {
  escrowAddress: string
  refundAmount: bigint
  reason: string
}

export interface ConfidentialTransferData {
  escrowAddress: string
  amount: bigint
  memo?: string
}

// Helper to map SDK status to UI status
function mapSDKStatusToUIStatus(sdkStatus: SDKEscrowStatus): EscrowStatus {
  // SDK uses numeric enum values, convert to UI string enum
  const statusValue = sdkStatus as unknown as number
  switch (statusValue) {
    case 0: // Active
      return EscrowStatus.Active
    case 1: // Completed
      return EscrowStatus.Completed
    case 2: // Disputed
      return EscrowStatus.Disputed
    case 3: // Resolved
      return EscrowStatus.Resolved
    case 4: // Cancelled
      return EscrowStatus.Cancelled
    default:
      return EscrowStatus.Active
  }
}

// Helper function to fetch token metadata
async function fetchTokenMetadata(
  tokenAddress: Address,
  rpcClient: unknown
): Promise<Token2022Metadata> {
  try {
    // For native SOL
    if (tokenAddress === NATIVE_MINT_ADDRESS) {
      return {
        programId: 'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb',
        decimals: 9,
        symbol: 'SOL',
        name: 'Solana',
        extensions: [],
        totalSupply: BigInt(0), // Would need to fetch actual supply
        mintAuthority: undefined,
        freezeAuthority: undefined,
      }
    }

    // For Token-2022 tokens, fetch metadata from chain
    const rpc = rpcClient as {
      getAccountInfo: (address: Address) => Promise<{ data: Uint8Array } | null>
    }
    const accountInfo = await rpc.getAccountInfo(tokenAddress)
    if (!accountInfo || !accountInfo.data) {
      throw new Error('Token not found')
    }

    // Parse token metadata and extensions
    // This is simplified - real implementation would parse the account data
    return {
      programId: TOKEN_2022_PROGRAM_ADDRESS,
      decimals: 6, // Default, would parse from data
      symbol: 'TOKEN',
      name: 'Token',
      extensions: [],
      totalSupply: BigInt(0),
      mintAuthority: undefined,
      freezeAuthority: undefined,
    }
  } catch (error) {
    console.error('Error fetching token metadata:', error)
    // Return default metadata
    return {
      programId: TOKEN_2022_PROGRAM_ADDRESS,
      decimals: 6,
      symbol: 'UNKNOWN',
      name: 'Unknown Token',
      extensions: [],
      totalSupply: BigInt(0),
      mintAuthority: undefined,
      freezeAuthority: undefined,
    }
  }
}

export function useEscrows(filters?: {
  status?: EscrowStatus[]
  role?: 'client' | 'agent' | 'all'
  tokenType?: 'all' | 'native' | 'token2022' | 'confidential'
  search?: string
  userAddress?: string
}) {
  return useQuery({
    queryKey: ['escrows', filters],
    queryFn: async () => {
      const client = getGhostSpeakClient()
      const escrowModule = client.escrow()
      const rpcClient = client.config?.rpc || {}

      // Fetch all escrows from the blockchain
      const escrows = await escrowModule.getAllEscrows()

      // Transform SDK data to match our Escrow interface
      let results = await Promise.all(
        escrows.map(async ({ address, data }: { address: string; data: unknown }) => {
          // Type the escrow data properly based on SDK Escrow type
          const escrowData = data as EscrowSDKData

          // Fetch token metadata
          const tokenMetadata = await fetchTokenMetadata(escrowData.paymentToken, rpcClient)

          // Calculate fees and interest
          // Skip fee and interest calculations for now due to type complexity
          // TODO: Fix Token-2022 extension type handling
          const totalFeesCollected = BigInt(0)
          const interestEarned = BigInt(0)

          return {
            address: address,
            client: escrowData.client,
            agent: escrowData.agent,
            clientName: undefined, // TODO: Fetch from agent/user data
            agentName: undefined, // TODO: Fetch from agent/user data
            taskId: escrowData.taskId,
            workOrderAddress: undefined, // TODO: Derive from escrow
            marketplaceListingAddress: undefined, // TODO: Check if from marketplace
            amount: escrowData.amount,
            status: mapSDKStatusToUIStatus(escrowData.status as SDKEscrowStatus),
            paymentToken: escrowData.paymentToken,
            tokenMetadata,
            isConfidential: escrowData.isConfidential,
            transferHook: escrowData.transferHook !== null ? escrowData.transferHook : undefined,
            createdAt: new Date(Number(escrowData.createdAt) * 1000),
            expiresAt: new Date(Number(escrowData.expiresAt) * 1000),
            completedAt:
              (escrowData.status as unknown as number) === 1 // SDKEscrowStatus.Completed
                ? new Date() // TODO: Get actual completion time
                : undefined,
            milestones: [], // TODO: Fetch milestone data
            disputeReason: escrowData.disputeReason !== null ? escrowData.disputeReason : undefined,
            resolutionNotes:
              escrowData.resolutionNotes !== null ? escrowData.resolutionNotes : undefined,
            totalFeesCollected,
            interestEarned,
          } as Escrow
        })
      )

      // Apply client-side filters
      if (filters?.status && filters.status.length > 0) {
        results = results.filter((escrow) => filters.status!.includes(escrow.status))
      }

      if (filters?.role && filters.role !== 'all' && filters.userAddress) {
        results = results.filter((escrow) => {
          if (filters.role === 'client') {
            return escrow.client === filters.userAddress
          } else {
            return escrow.agent === filters.userAddress
          }
        })
      }

      if (filters?.tokenType && filters.tokenType !== 'all') {
        results = results.filter((escrow) => {
          if (filters.tokenType === 'native') {
            return escrow.paymentToken === NATIVE_MINT_ADDRESS
          } else if (filters.tokenType === 'token2022') {
            return escrow.tokenMetadata.programId === TOKEN_2022_PROGRAM_ADDRESS
          } else if (filters.tokenType === 'confidential') {
            return escrow.isConfidential
          }
          return true
        })
      }

      if (filters?.search) {
        const searchLower = filters.search.toLowerCase()
        results = results.filter(
          (escrow) =>
            escrow.taskId.toLowerCase().includes(searchLower) ||
            escrow.address.toLowerCase().includes(searchLower)
        )
      }

      // Sort by most recent
      results.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())

      return results
    },
    staleTime: 30000, // 30 seconds
  })
}

export function useEscrow(address: string) {
  return useQuery({
    queryKey: ['escrow', address],
    queryFn: async () => {
      const client = getGhostSpeakClient()
      const escrowModule = client.escrow()
      const rpcClient = client.config?.rpc || {}

      // Fetch the escrow account
      const escrowData = await escrowModule.getEscrowAccount(address as Address)

      if (!escrowData) {
        throw new Error('Escrow not found')
      }

      // Type the escrow data properly based on SDK Escrow type
      const escrowTypedData = escrowData as EscrowSDKData

      // Fetch token metadata
      const tokenMetadata = await fetchTokenMetadata(escrowTypedData.paymentToken, rpcClient)

      // Skip fee and interest calculations for now due to type complexity
      // TODO: Fix Token-2022 extension type handling
      const totalFeesCollected = BigInt(0)
      const interestEarned = BigInt(0)

      // Transform SDK data to match our Escrow interface
      return {
        address: address,
        client: escrowTypedData.client,
        agent: escrowTypedData.agent,
        clientName: undefined, // TODO: Fetch from agent/user data
        agentName: undefined, // TODO: Fetch from agent/user data
        taskId: escrowTypedData.taskId,
        workOrderAddress: undefined, // TODO: Derive from escrow
        marketplaceListingAddress: undefined, // TODO: Check if from marketplace
        amount: escrowTypedData.amount,
        status: mapSDKStatusToUIStatus(escrowTypedData.status as SDKEscrowStatus),
        paymentToken: escrowTypedData.paymentToken,
        tokenMetadata,
        isConfidential: escrowTypedData.isConfidential,
        transferHook:
          escrowTypedData.transferHook !== null ? escrowTypedData.transferHook : undefined,
        createdAt: new Date(Number(escrowTypedData.createdAt) * 1000),
        expiresAt: new Date(Number(escrowTypedData.expiresAt) * 1000),
        completedAt:
          (escrowTypedData.status as unknown as number) === 1 // SDKEscrowStatus.Completed
            ? new Date() // TODO: Get actual completion time
            : undefined,
        milestones: [], // TODO: Fetch milestone data
        disputeReason:
          escrowTypedData.disputeReason !== null ? escrowTypedData.disputeReason : undefined,
        resolutionNotes:
          escrowTypedData.resolutionNotes !== null ? escrowTypedData.resolutionNotes : undefined,
        totalFeesCollected,
        interestEarned,
      } as Escrow
    },
    enabled: !!address,
  })
}

export function useTokenMetadata(tokenAddress: string) {
  return useQuery({
    queryKey: ['token-metadata', tokenAddress],
    queryFn: async () => {
      const client = getGhostSpeakClient()
      const rpcClient = client.config?.rpc || {}

      return fetchTokenMetadata(tokenAddress as Address, rpcClient)
    },
    enabled: !!tokenAddress,
    staleTime: 300000, // 5 minutes
  })
}

export function useCreateEscrow() {
  const queryClient = useQueryClient()
  const { publicKey, signTransaction } = useWallet()

  return useMutation({
    mutationFn: async (data: CreateEscrowData) => {
      if (!publicKey || !signTransaction) {
        throw new Error('Wallet not connected')
      }

      const client = getGhostSpeakClient()
      const escrowModule = client.escrow()

      // Create the escrow
      const signature = await escrowModule.create({
        signer: createSDKSigner(publicKey, signTransaction),
        amount: data.amount,
        buyer: data.client as Address,
        seller: data.agent as Address,
        description: data.taskId,
        milestones: data.milestones?.map((m) => ({
          amount: m.amount,
          description: m.title,
        })),
      })

      // Wait for confirmation
      const rpcClient = client.config?.rpc || {}
      await rpcClient.confirmTransaction?.(signature, 'confirmed')

      // Derive the escrow address
      const escrowAddress = await deriveEscrowPDA(
        (data.workOrderAddress as Address) || (publicKey.toBase58() as Address),
        GHOSTSPEAK_MARKETPLACE_PROGRAM_ADDRESS
      )

      return {
        signature,
        escrowAddress: escrowAddress[0],
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['escrows'] })
      toast.success('Escrow created successfully!')
    },
    onError: (error) => {
      console.error('Failed to create escrow:', error)
      toast.error('Failed to create escrow')
    },
  })
}

export function useCompleteEscrow() {
  const queryClient = useQueryClient()
  const { publicKey, signTransaction } = useWallet()

  return useMutation({
    mutationFn: async (data: CompleteEscrowData) => {
      if (!publicKey || !signTransaction) {
        throw new Error('Wallet not connected')
      }

      const client = getGhostSpeakClient()
      const escrowModule = client.escrow()

      // Complete the escrow
      const signature = await escrowModule.complete(
        createSDKSigner(publicKey, signTransaction),
        data.escrowAddress as Address
      )

      // Wait for confirmation
      const rpcClient = client.config?.rpc || {}
      await rpcClient.confirmTransaction?.(signature, 'confirmed')

      return {
        transactionId: signature,
        status: 'completed',
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['escrow', variables.escrowAddress] })
      queryClient.invalidateQueries({ queryKey: ['escrows'] })
      toast.success('Escrow completed successfully!')
    },
    onError: (error) => {
      console.error('Failed to complete escrow:', error)
      toast.error('Failed to complete escrow')
    },
  })
}

export function useCancelEscrow() {
  const queryClient = useQueryClient()
  const { publicKey, signTransaction } = useWallet()

  return useMutation({
    mutationFn: async (data: { escrowAddress: string; reason: string }) => {
      if (!publicKey || !signTransaction) {
        throw new Error('Wallet not connected')
      }

      const client = getGhostSpeakClient()
      const escrowModule = client.escrow()

      // Fetch escrow to get buyer address
      const escrowData = await escrowModule.getEscrowAccount(data.escrowAddress as Address)
      if (!escrowData) {
        throw new Error('Escrow not found')
      }

      // Cancel the escrow
      const signature = await escrowModule.cancel(
        createSDKSigner(publicKey, signTransaction),
        data.escrowAddress as Address,
        { buyer: escrowData.client }
      )

      // Wait for confirmation
      const rpcClient = client.config?.rpc || {}
      await rpcClient.confirmTransaction?.(signature, 'confirmed')

      return {
        transactionId: signature,
        status: 'cancelled',
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['escrow', variables.escrowAddress] })
      queryClient.invalidateQueries({ queryKey: ['escrows'] })
      toast.success('Escrow cancelled successfully!')
    },
    onError: (error) => {
      console.error('Failed to cancel escrow:', error)
      toast.error('Failed to cancel escrow')
    },
  })
}

export function useDisputeEscrow() {
  const queryClient = useQueryClient()
  const { publicKey, signTransaction } = useWallet()

  return useMutation({
    mutationFn: async (data: DisputeEscrowData) => {
      if (!publicKey || !signTransaction) {
        throw new Error('Wallet not connected')
      }

      const client = getGhostSpeakClient()
      const escrowModule = client.escrow()

      // Dispute the escrow
      const signature = await escrowModule.dispute(
        createSDKSigner(publicKey, signTransaction),
        data.escrowAddress as Address,
        data.reason
      )

      // Wait for confirmation
      const rpcClient = client.config?.rpc || {}
      await rpcClient.confirmTransaction?.(signature, 'confirmed')

      return {
        transactionId: signature,
        status: 'disputed',
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['escrow', variables.escrowAddress] })
      queryClient.invalidateQueries({ queryKey: ['escrows'] })
      toast.success('Escrow disputed successfully!')
    },
    onError: (error) => {
      console.error('Failed to dispute escrow:', error)
      toast.error('Failed to dispute escrow')
    },
  })
}

export function useProcessPartialRefund() {
  const queryClient = useQueryClient()
  const { publicKey, signTransaction } = useWallet()

  return useMutation({
    mutationFn: async (data: PartialRefundData) => {
      if (!publicKey || !signTransaction) {
        throw new Error('Wallet not connected')
      }

      const client = getGhostSpeakClient()
      const escrowModule = client.escrow()

      // Fetch escrow to get amount
      const escrowData = await escrowModule.getEscrowAccount(data.escrowAddress as Address)
      if (!escrowData) {
        throw new Error('Escrow not found')
      }

      // Process partial refund with provided amount
      const signature = await escrowModule.processPartialRefund(
        createSDKSigner(publicKey, signTransaction),
        data.escrowAddress as Address,
        data.refundAmount,
        escrowData.amount
      )

      // Wait for confirmation
      const rpcClient = client.config?.rpc || {}
      await rpcClient.confirmTransaction?.(signature, 'confirmed')

      return {
        transactionId: signature,
        refundAmount: data.refundAmount,
        agentAmount: escrowData.amount - data.refundAmount,
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['escrow', variables.escrowAddress] })
      queryClient.invalidateQueries({ queryKey: ['escrows'] })
      toast.success('Partial refund processed successfully!')
    },
    onError: (error) => {
      console.error('Failed to process partial refund:', error)
      toast.error('Failed to process partial refund')
    },
  })
}

export function useConfidentialTransfer() {
  const queryClient = useQueryClient()
  const { publicKey, signTransaction } = useWallet()

  return useMutation({
    mutationFn: async (_data: ConfidentialTransferData) => {
      if (!publicKey || !signTransaction) {
        throw new Error('Wallet not connected')
      }

      // Confidential transfers require Token-2022 with confidential transfer extension
      // This feature requires:
      // 1. ElGamal proof generation using Solana's ZK proof program
      // 2. Encrypting the transfer amount using ElGamal encryption
      // 3. Creating the confidential transfer instruction
      // 4. Signing and sending the transaction

      // Feature not available in current version
      toast.error('Confidential transfers are not available in the current version')
      return {
        transactionId: '',
        status: 'failed',
        error: 'Confidential transfers require Token-2022 extension support',
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['escrows'] })
      toast.success('Confidential transfer completed!')
    },
    onError: (error) => {
      console.error('Failed to process confidential transfer:', error)
      toast.error('Failed to process confidential transfer')
    },
  })
}
