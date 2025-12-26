'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getGhostSpeakClient } from '@/lib/ghostspeak/client'
import { toast } from 'sonner'
import { useCrossmintSigner } from '@/lib/hooks/useCrossmintSigner'
import { useTransactionFeedback } from '@/lib/transaction-feedback'
import { getErrorInfo } from '@/lib/errors/error-messages'
import type { Address } from '@solana/addresses'
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

// Signer is now provided by useCrossmintSigner hook

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
const GHOSTSPEAK_MARKETPLACE_PROGRAM_ADDRESS = 'GpvFxus2eecFKcqa2bhxXeRjpstPeCEJNX216TQCcNC9'

// Helper function to derive escrow PDA
const deriveEscrowPDA = async (taskId: unknown, _program: string): Promise<string> => {
  try {
    const { getProgramDerivedAddress, getUtf8Encoder, getAddressEncoder } = await import('@solana/kit')
    const encoder = getUtf8Encoder()
    const addressEncoder = getAddressEncoder()
    
    // Escrow PDAs are derived from: ["escrow", buyer, agent, task_id]
    // Without buyer/agent context, we derive from just the task_id seed
    const [pda] = await getProgramDerivedAddress({
      programAddress: GHOSTSPEAK_MARKETPLACE_PROGRAM_ADDRESS as Address,
      seeds: [
        encoder.encode('escrow'),
        encoder.encode(String(taskId)),
      ],
    })
    return pda
  } catch (error) {
    console.warn('Failed to derive escrow PDA:', error)
    return `escrow_${taskId}`
  }
}

// =====================================================
// DATA ENRICHMENT HELPERS
// =====================================================

/**
 * Fetch agent name from on-chain agent account
 * Uses SDK's agent module to get agent metadata
 */
async function fetchAgentName(agentAddress: Address): Promise<string | undefined> {
  try {
    const client = getGhostSpeakClient()
    const agentData = await client.agents.getAgentAccount(agentAddress)
    return agentData?.name ?? undefined
  } catch (error) {
    console.warn(`Failed to fetch agent name for ${agentAddress}:`, error)
    return undefined
  }
}

/**
 * Fetch agent names for both client and agent addresses
 * Returns tuple of [clientName, agentName]
 */
async function fetchAgentNames(
  clientAddress: Address,
  agentAddress: Address
): Promise<[string | undefined, string | undefined]> {
  try {
    const [clientName, agentName] = await Promise.all([
      fetchAgentName(clientAddress),
      fetchAgentName(agentAddress),
    ])
    return [clientName, agentName]
  } catch (error) {
    console.warn('Failed to fetch agent names:', error)
    return [undefined, undefined]
  }
}

/**
 * Derive work order address from escrow task ID
 * The task ID format typically encodes the work order relationship
 */
async function deriveWorkOrderFromEscrow(
  taskId: number | string,
  clientAddress: Address
): Promise<Address | undefined> {
  try {
    // Task IDs that start with 'wo_' indicate a work order relationship
    const taskIdStr = String(taskId)
    if (taskIdStr.startsWith('wo_')) {
      // Extract the work order identifier and derive PDA
      // In production, this would call getDerivedAddress with proper seeds
      return `${taskIdStr}_${clientAddress.slice(0, 8)}` as Address
    }
    // For numeric task IDs, derive from client + task ID
    // For numeric task IDs, derive from client + task ID
    const { getProgramDerivedAddress, getUtf8Encoder, getAddressEncoder } = await import('@solana/kit')
    const encoder = getUtf8Encoder()
    const addressEncoder = getAddressEncoder()
    const [workOrderAddress] = await getProgramDerivedAddress({
      programAddress: GHOSTSPEAK_MARKETPLACE_PROGRAM_ADDRESS as Address,
      seeds: [
        encoder.encode('work_order'),
        addressEncoder.encode(clientAddress),
        encoder.encode(String(taskId)),
      ],
    })
    return workOrderAddress
  } catch (error) {
    console.warn('Failed to derive work order address:', error)
    return undefined
  }
}

/**
 * Check if escrow is associated with a marketplace listing
 * Note: This checks service listings and service purchases for escrow references
 */
async function checkMarketplaceListingAssociation(
  _escrowAddress: Address
): Promise<Address | undefined> {
  try {
    const client = getGhostSpeakClient()
    // Query service listings to find one associated with this escrow
    const listings = await client.marketplace.getAllServiceListings()
    // Service listings don't directly reference escrows, but purchases do
    // For now, return undefined - would need service purchase lookup
    // In production, you'd check ServicePurchase accounts for escrow reference
    if (listings.length > 0) {
      // Placeholder: would need to check service purchases for escrow association
      return undefined
    }
    return undefined
  } catch (error) {
    console.warn('Failed to check marketplace listing association:', error)
    return undefined
  }
}

/**
 * Fetch milestone data for an escrow from work order
 * Note: Milestones are typically stored in work order accounts or escrow metadata
 */
async function fetchMilestoneData(
  workOrderAddress: Address | undefined
): Promise<EscrowMilestone[]> {
  if (!workOrderAddress) {
    return []
  }
  try {
    // JobPosting accounts in the SDK contain milestone-like data
    // For now, return empty array as work orders have different structure
    // In production, you'd fetch from JobContract or custom milestone accounts
    const client = getGhostSpeakClient()
    // Check if this is actually a job posting address
    const jobPosting = await client.marketplace.getJobPosting(workOrderAddress)
    if (jobPosting) {
      // Job postings have budget/requirements but not formal milestones
      // Return a single "milestone" representing the full job
      return [
        {
          id: workOrderAddress,
          title: jobPosting.title ?? 'Complete Work',
          description: jobPosting.description,
          amount: BigInt(jobPosting.budget ?? 0),
          completed: false, // Would need to check job contract status
          completedAt: undefined,
          transactionId: undefined,
        },
      ]
    }
    return []
  } catch (error) {
    console.warn('Failed to fetch milestone data:', error)
    return []
  }
}

/**
 * Get actual completion timestamp from escrow data
 */
function getCompletionTime(escrowData: EscrowSDKData): Date | undefined {
  // Check completedAt field directly from SDK data
  if (escrowData.completedAt && escrowData.completedAt > BigInt(0)) {
    return new Date(Number(escrowData.completedAt) * 1000)
  }
  // Fallback: Check if status is completed and estimate based on last update
  const statusValue = escrowData.status as unknown as number
  if (statusValue === 1) {
    // SDKEscrowStatus.Completed
    // Use createdAt as fallback if completedAt not available
    return new Date(Number(escrowData.createdAt) * 1000)
  }
  return undefined
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
// Helper function to fetch token metadata
async function fetchTokenMetadata(
  tokenAddress: Address,
  connection: any // Using 'any' to avoid deep import issues here, but expects @solana/web3.js Connection
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
        totalSupply: BigInt(0),
        mintAuthority: undefined,
        freezeAuthority: undefined,
      }
    }

    // For Token-2022 tokens, fetch metadata from chain
    const { PublicKey } = await import('@solana/web3.js')
    const accountInfo = await connection.getAccountInfo(new PublicKey(tokenAddress))
    
    if (!accountInfo || !accountInfo.data) {
      throw new Error('Token not found')
    }

    // In a real implementation we would parse the account data using @solana/spl-token
    // For this MVP, we return defaults if we can't parse
    return {
      programId: TOKEN_2022_PROGRAM_ADDRESS,
      decimals: 6,
      symbol: 'TOKEN',
      name: 'Token',
      extensions: [],
      totalSupply: BigInt(0),
      mintAuthority: undefined,
      freezeAuthority: undefined,
    }
  } catch (error) {
    console.warn('Error fetching token metadata:', error)
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
      const escrowModule = client.escrow
      // Use standard Solana connection
      const { Connection } = await import('@solana/web3.js')
      const connection = new Connection(client.rpcUrl)

      // Fetch all escrows from the blockchain
      const escrows = await escrowModule.getAllEscrows()

      // Transform SDK data to match our Escrow interface
      let results = await Promise.all(
        escrows.map(async ({ address, data }: { address: string; data: unknown }) => {
          // Type the escrow data properly based on SDK Escrow type
          const escrowData = data as EscrowSDKData

          // Fetch token metadata
          const tokenMetadata = await fetchTokenMetadata(escrowData.paymentToken, connection)

          // Calculate fees and interest
          // Skip fee and interest calculations for now due to type complexity
          // TODO: Fix Token-2022 extension type handling
          const totalFeesCollected = BigInt(0)
          const interestEarned = BigInt(0)

          // Enrich with agent names
          const [clientName, agentName] = await fetchAgentNames(escrowData.client, escrowData.agent)

          // Derive work order address from task ID
          const workOrderAddress = await deriveWorkOrderFromEscrow(
            escrowData.taskId,
            escrowData.client
          )

          // Fetch milestone data if work order exists
          const milestones = await fetchMilestoneData(workOrderAddress)

          // Get actual completion time
          const completedAt = getCompletionTime(escrowData)

          return {
            address: address,
            client: escrowData.client,
            agent: escrowData.agent,
            clientName,
            agentName,
            taskId: String(escrowData.taskId),
            workOrderAddress,
            marketplaceListingAddress: undefined, // Marketplace association check is expensive, skip in list view
            amount: escrowData.amount,
            status: mapSDKStatusToUIStatus(escrowData.status as SDKEscrowStatus),
            paymentToken: escrowData.paymentToken,
            tokenMetadata,
            isConfidential:
              (escrowData as unknown as { isConfidential?: boolean }).isConfidential ?? false,
            transferHook:
              (escrowData as unknown as { transferHook?: string | null }).transferHook ?? undefined,
            createdAt: new Date(Number(escrowData.createdAt) * 1000),
            expiresAt: new Date(
              Number(
                (escrowData as unknown as { expiresAt?: bigint }).expiresAt ??
                  escrowData.createdAt + BigInt(604800)
              ) * 1000
            ),
            completedAt,
            milestones,
            disputeReason: escrowData.disputeReason !== null ? escrowData.disputeReason : undefined,
            resolutionNotes:
              (escrowData as unknown as { resolutionNotes?: string | null }).resolutionNotes ??
              undefined,
            totalFeesCollected,
            interestEarned,
          } as Escrow
        })
      )

      // Apply client-side filters
      if (filters?.status && filters.status.length > 0) {
        results = results.filter((escrow: Escrow) => filters.status!.includes(escrow.status))
      }

      if (filters?.role && filters.role !== 'all' && filters.userAddress) {
        results = results.filter((escrow: Escrow) => {
          if (filters.role === 'client') {
            return escrow.client === filters.userAddress
          } else {
            return escrow.agent === filters.userAddress
          }
        })
      }

      if (filters?.tokenType && filters.tokenType !== 'all') {
        results = results.filter((escrow: Escrow) => {
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
          (escrow: Escrow) =>
            escrow.taskId.toLowerCase().includes(searchLower) ||
            escrow.address.toLowerCase().includes(searchLower)
        )
      }

      // Sort by most recent
      results.sort((a: Escrow, b: Escrow) => b.createdAt.getTime() - a.createdAt.getTime())

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
      const escrowModule = client.escrow

      const { Connection } = await import('@solana/web3.js')
      const connection = new Connection(client.rpcUrl)

      // Fetch the escrow account
      const escrowData = await escrowModule.getEscrowAccount(address as Address)

      if (!escrowData) {
        throw new Error('Escrow not found')
      }

      // Type the escrow data properly based on SDK Escrow type
      const escrowTypedData = escrowData as unknown as EscrowSDKData

      // Fetch token metadata
      const tokenMetadata = await fetchTokenMetadata(escrowTypedData.paymentToken, connection)

      // Skip fee and interest calculations for now due to type complexity
      // TODO: Fix Token-2022 extension type handling
      const totalFeesCollected = BigInt(0)
      const interestEarned = BigInt(0)

      // Enrich with agent names
      const [clientName, agentName] = await fetchAgentNames(
        escrowTypedData.client,
        escrowTypedData.agent
      )

      // Derive work order address from task ID
      const workOrderAddress = await deriveWorkOrderFromEscrow(
        escrowTypedData.taskId,
        escrowTypedData.client
      )

      // For single escrow view, also check marketplace listing association
      const marketplaceListingAddress = await checkMarketplaceListingAssociation(address as Address)

      // Fetch milestone data if work order exists
      const milestones = await fetchMilestoneData(workOrderAddress)

      // Get actual completion time
      const completedAt = getCompletionTime(escrowTypedData)

      // Transform SDK data to match our Escrow interface
      return {
        address: address,
        client: escrowTypedData.client,
        agent: escrowTypedData.agent,
        clientName,
        agentName,
        taskId: String(escrowTypedData.taskId),
        workOrderAddress,
        marketplaceListingAddress,
        amount: escrowTypedData.amount,
        status: mapSDKStatusToUIStatus(escrowTypedData.status as SDKEscrowStatus),
        paymentToken: escrowTypedData.paymentToken,
        tokenMetadata,
        isConfidential:
          (escrowTypedData as unknown as { isConfidential?: boolean }).isConfidential ?? false,
        transferHook:
          (escrowTypedData as unknown as { transferHook?: string | null }).transferHook ??
          undefined,
        createdAt: new Date(Number(escrowTypedData.createdAt) * 1000),
        expiresAt: new Date(
          Number(
            (escrowTypedData as unknown as { expiresAt?: bigint }).expiresAt ??
              escrowTypedData.createdAt + BigInt(604800)
          ) * 1000
        ),
        completedAt,
        milestones,
        disputeReason:
          escrowTypedData.disputeReason !== null ? escrowTypedData.disputeReason : undefined,
        resolutionNotes:
          (escrowTypedData as unknown as { resolutionNotes?: string | null }).resolutionNotes ??
          undefined,
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
      // const client = getGhostSpeakClient()
      const rpcClient = {} as Record<string, unknown>

      return fetchTokenMetadata(tokenAddress as Address, rpcClient)
    },
    enabled: !!tokenAddress,
    staleTime: 300000, // 5 minutes
  })
}

export function useCreateEscrow() {
  const queryClient = useQueryClient()
  const { createSigner, isConnected, address } = useCrossmintSigner()
  const feedback = useTransactionFeedback()

  return useMutation({
    mutationFn: async (data: CreateEscrowData) => {
      const txId = `escrow-create-${Date.now()}`

      if (!isConnected || !address) {
        throw new Error('Wallet not connected')
      }

      const signer = createSigner()
      if (!signer) throw new Error('Could not create signer')

      // Start feedback
      feedback.startTransaction(txId, {
        type: 'escrow',
        description: `Creating escrow for ${Number(data.amount) / 1e6} USDC`,
      })

      try {
        const client = getGhostSpeakClient()
        const escrowModule = client.escrow

        // Create the escrow
        const signature = await escrowModule.create({
          signer,
          amount: data.amount,
          buyer: data.client as Address,
          seller: data.agent as Address,
          description: data.taskId,
          milestones: data.milestones?.map((m) => ({
            amount: m.amount,
            description: m.title,
          })),
        })

        // Update feedback with signature
        feedback.updateWithSignature(txId, signature)

        // Derive the escrow address
        const escrowAddress = await deriveEscrowPDA(
          (data.workOrderAddress as Address) || (address as Address),
          GHOSTSPEAK_MARKETPLACE_PROGRAM_ADDRESS
        )

        // Mark as confirmed
        feedback.confirmTransaction(txId)

        return {
          signature,
          escrowAddress: escrowAddress[0],
        }
      } catch (error) {
        const errorInfo = getErrorInfo(error)
        feedback.failTransaction(txId, errorInfo.description)
        throw error
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['escrows'] })
    },
    onError: (error) => {
      console.error('Failed to create escrow:', error)
    },
  })
}

export function useCompleteEscrow() {
  const queryClient = useQueryClient()
  const { createSigner, isConnected, address } = useCrossmintSigner()

  return useMutation({
    mutationFn: async (data: CompleteEscrowData) => {
      if (!isConnected || !address) {
        throw new Error('Wallet not connected')
      }

      const signer = createSigner()
      if (!signer) throw new Error('Could not create signer')

      const client = getGhostSpeakClient()
      const escrowModule = client.escrow

      // Complete the escrow
      const signature = await escrowModule.complete(signer, data.escrowAddress as Address)

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
  const { createSigner, isConnected, address } = useCrossmintSigner()

  return useMutation({
    mutationFn: async (data: { escrowAddress: string; reason: string }) => {
      if (!isConnected || !address) {
        throw new Error('Wallet not connected')
      }

      const signer = createSigner()
      if (!signer) throw new Error('Could not create signer')

      const client = getGhostSpeakClient()
      const escrowModule = client.escrow

      // Fetch escrow to get buyer address
      const escrowData = await escrowModule.getEscrowAccount(data.escrowAddress as Address)
      if (!escrowData) {
        throw new Error('Escrow not found')
      }

      // Cancel the escrow
      const signature = await escrowModule.cancel(signer, data.escrowAddress as Address, {
        buyer: escrowData.client,
      })

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
  const { createSigner, isConnected, address } = useCrossmintSigner()

  return useMutation({
    mutationFn: async (data: DisputeEscrowData) => {
      if (!isConnected || !address) {
        throw new Error('Wallet not connected')
      }

      const signer = createSigner()
      if (!signer) throw new Error('Could not create signer')

      const client = getGhostSpeakClient()
      const escrowModule = client.escrow

      // Dispute the escrow
      const signature = await escrowModule.dispute(
        signer,
        data.escrowAddress as Address,
        data.reason
      )

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
  const { createSigner, isConnected, address } = useCrossmintSigner()

  return useMutation({
    mutationFn: async (data: PartialRefundData) => {
      if (!isConnected || !address) {
        throw new Error('Wallet not connected')
      }

      const signer = createSigner()
      if (!signer) throw new Error('Could not create signer')

      const client = getGhostSpeakClient()
      const escrowModule = client.escrow

      // Fetch escrow to get amount and participant addresses
      const escrowData = await escrowModule.getEscrowAccount(data.escrowAddress as Address)
      if (!escrowData) {
        throw new Error('Escrow not found')
      }

      // Process partial refund with provided amount
      // SDK expects: signer, taskId, refundAmount, totalAmount, clientAddress, agentAddress, mint?
      const signature = await escrowModule.processPartialRefund(
        signer,
        String(escrowData.taskId ?? data.escrowAddress), // taskId
        data.refundAmount,
        escrowData.amount,
        escrowData.client, // clientAddress
        escrowData.agent // agentAddress
      )

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
  const { isConnected, address } = useCrossmintSigner()

  return useMutation({
    mutationFn: async (_data: ConfidentialTransferData) => {
      if (!isConnected || !address) {
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
