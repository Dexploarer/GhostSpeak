'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getGhostSpeakClient } from '@/lib/ghostspeak/client'
import { toast } from 'sonner'
import { useWallet } from '@solana/wallet-adapter-react'
import type { Address } from '@solana/addresses'
import type { ProgramAccount } from '@/lib/types/rpc-client-types'
// Import types from SDK via dynamic import to avoid fs dependency issues
// import {
//   getCreateWorkOrderInstruction,
//   getSubmitWorkDeliveryInstruction,
//   getVerifyWorkDeliveryInstruction,
//   getRejectWorkDeliveryInstruction,
//   getProcessPaymentInstruction,
//   WorkOrderStatus as SDKWorkOrderStatus,
//   getWorkOrderDecoder,
//   deriveWorkOrderPda,
//   deriveWorkDeliveryPda,
//   GHOSTSPEAK_MARKETPLACE_PROGRAM_ADDRESS,
// } from '@ghostspeak/sdk'

// Define local types to avoid import issues
type SDKWorkOrderStatus = 'Open' | 'InProgress' | 'Delivered' | 'Completed' | 'Cancelled'

// Local constants to avoid import issues
const GHOSTSPEAK_MARKETPLACE_PROGRAM_ADDRESS = 'GHSTkqVhYGwmMCQthiE3p1Vww5nQstbsB6sQ8cqyKhHR'

// Mock functions for SDK functions
const getWorkOrderDecoder = (): {
  decode: (data: Uint8Array) => {
    client: string
    provider: string
    title: string
    description: string
    requirements: string[]
    paymentAmount: bigint
    paymentToken: string
    status: string
    createdAt: bigint
    updatedAt: bigint
    deadline: bigint
    deliveredAt: null
  }
} => ({
  decode: () => ({
    client: 'client_address',
    provider: 'provider_address',
    title: 'Mock Work Order',
    description: 'Mock description',
    requirements: ['Mock requirement'],
    paymentAmount: BigInt(1000000),
    paymentToken: 'token_address',
    status: 'Open',
    createdAt: BigInt(Math.floor(Date.now() / 1000)),
    updatedAt: BigInt(Math.floor(Date.now() / 1000)),
    deadline: BigInt(Math.floor(Date.now() / 1000) + 86400),
    deliveredAt: null,
  }),
})

const deriveWorkOrderPda = async (
  program: string,
  client: Address,
  orderId: bigint
): Promise<string> => {
  return `work_order_${client}_${orderId}_mock`
}

const deriveWorkDeliveryPda = async (
  program: string,
  workOrder: Address,
  provider: Address
): Promise<string> => {
  return `work_delivery_${workOrder}_${provider}_mock`
}

const getCreateWorkOrderInstruction = (params: unknown): { type: string; params: unknown } => ({
  type: 'createWorkOrder',
  params,
})

const getSubmitWorkDeliveryInstruction = (params: unknown): { type: string; params: unknown } => ({
  type: 'submitWorkDelivery',
  params,
})

const getVerifyWorkDeliveryInstruction = (params: unknown): { type: string; params: unknown } => ({
  type: 'verifyWorkDelivery',
  params,
})

const getRejectWorkDeliveryInstruction = (params: unknown): { type: string; params: unknown } => ({
  type: 'rejectWorkDelivery',
  params,
})

const getProcessPaymentInstruction = (params: unknown): { type: string; params: unknown } => ({
  type: 'processPayment',
  params,
})

export enum WorkOrderStatus {
  Created = 'Created',
  Open = 'Open',
  Submitted = 'Submitted',
  InProgress = 'InProgress',
  Approved = 'Approved',
  Completed = 'Completed',
  Cancelled = 'Cancelled',
}

export interface Milestone {
  id: string
  title: string
  description?: string
  amount: bigint
  completed: boolean
  completedAt?: Date
  paymentReleased: boolean
  releasedAt?: Date
}

export interface WorkOrder {
  address: string
  client: string
  provider: string
  clientName?: string
  providerName?: string
  title: string
  description: string
  requirements: string[]
  paymentAmount: bigint
  paymentToken: string
  status: WorkOrderStatus
  createdAt: Date
  updatedAt: Date
  deadline: Date
  deliveredAt?: Date
  milestones: Milestone[]
  deliverables: string[]
  communicationThread: Message[]
  disputeReason?: string
  arbitrator?: string
}

export interface Message {
  id: string
  sender: string
  senderName?: string
  content: string
  timestamp: Date
  attachments?: string[]
}

export interface CreateWorkOrderData {
  title: string
  description: string
  requirements: string[]
  paymentAmount: bigint
  paymentToken: string
  deadline: Date
  provider: string
  milestones?: Omit<
    Milestone,
    'id' | 'completed' | 'completedAt' | 'paymentReleased' | 'releasedAt'
  >[]
}

export interface SubmitDeliveryData {
  workOrderAddress: string
  deliverables: string[]
  notes: string
  milestoneIds?: string[]
}

export interface VerifyDeliveryData {
  workOrderAddress: string
  approved: boolean
  feedback: string
  milestoneIds?: string[]
}

// Removed unused Deliverable interface - using SDK types instead

// Helper to map SDK status to UI status
function mapSDKStatusToUIStatus(sdkStatus: SDKWorkOrderStatus): WorkOrderStatus {
  const statusMap: Record<SDKWorkOrderStatus, WorkOrderStatus> = {
    Open: WorkOrderStatus.Open,
    InProgress: WorkOrderStatus.InProgress,
    Delivered: WorkOrderStatus.Submitted, // Map SDK 'Delivered' to UI 'Submitted'
    Completed: WorkOrderStatus.Completed,
    Cancelled: WorkOrderStatus.Cancelled,
  }
  return statusMap[sdkStatus] || WorkOrderStatus.Created
}

interface MockSigner {
  address: Address
  signTransaction: (transaction: unknown) => Promise<unknown>
}

interface MockGhostSpeakClient {
  config?: {
    rpc?: {
      getProgramAccounts: (address: string, options: unknown) => Promise<ProgramAccount[]>
      getAccountInfo: (address: Address) => Promise<{ data: Uint8Array } | null>
      sendTransaction?: (instructions: unknown[], signers: unknown[]) => Promise<string>
      confirmTransaction?: (signature: string, commitment: string) => Promise<void>
    }
  }
}

export function useWorkOrders(filters?: {
  status?: WorkOrderStatus[]
  role?: 'client' | 'provider' | 'all'
  search?: string
  userAddress?: string
}): ReturnType<typeof useQuery> {
  return useQuery({
    queryKey: ['work-orders', filters],
    queryFn: async () => {
      const client = getGhostSpeakClient() as MockGhostSpeakClient
      const rpc = client.config?.rpc

      // Fetch all work orders from the blockchain
      const discriminator = new Uint8Array([67, 109, 86, 157, 94, 117, 205, 9]) // WorkOrder discriminator
      const accounts = await rpc.getProgramAccounts(GHOSTSPEAK_MARKETPLACE_PROGRAM_ADDRESS, {
        filters: [
          {
            memcmp: {
              offset: 0,
              bytes: Buffer.from(discriminator).toString('base64'),
              encoding: 'base64' as const,
            },
          },
        ],
      })

      // Transform SDK data to match our WorkOrder interface
      let results = await Promise.all(
        accounts.map(async (account: ProgramAccount) => {
          const decoder = getWorkOrderDecoder()
          const workOrderData = decoder.decode(account.account.data as Uint8Array)

          // For now, we'll create placeholder milestone data
          // In a real implementation, these would be stored separately
          const milestones: Milestone[] = []

          return {
            address: account.pubkey,
            client: workOrderData.client,
            provider: workOrderData.provider,
            clientName: undefined, // TODO: Fetch from agent/user data
            providerName: undefined, // TODO: Fetch from agent/user data
            title: workOrderData.title,
            description: workOrderData.description,
            requirements: workOrderData.requirements,
            paymentAmount: workOrderData.paymentAmount,
            paymentToken: workOrderData.paymentToken,
            status: mapSDKStatusToUIStatus(workOrderData.status as SDKWorkOrderStatus),
            createdAt: new Date(Number(workOrderData.createdAt) * 1000),
            updatedAt: new Date(Number(workOrderData.updatedAt) * 1000),
            deadline: new Date(Number(workOrderData.deadline) * 1000),
            deliveredAt:
              workOrderData.deliveredAt !== null
                ? new Date(Number(workOrderData.deliveredAt) * 1000)
                : undefined,
            milestones,
            deliverables: [], // TODO: Fetch from work delivery data
            communicationThread: [], // TODO: Fetch from channel/message data
            disputeReason: undefined, // TODO: Fetch from dispute data if exists
            arbitrator: undefined, // TODO: Fetch from dispute data if exists
          } as WorkOrder
        })
      )

      // Apply client-side filters
      if (filters?.status && filters.status.length > 0) {
        results = results.filter((order) => filters.status!.includes(order.status))
      }

      if (filters?.role && filters.role !== 'all' && filters.userAddress) {
        results = results.filter((order) => {
          if (filters.role === 'client') {
            return order.client === filters.userAddress
          } else {
            return order.provider === filters.userAddress
          }
        })
      }

      if (filters?.search) {
        const searchLower = filters.search.toLowerCase()
        results = results.filter(
          (order) =>
            order.title.toLowerCase().includes(searchLower) ||
            order.description.toLowerCase().includes(searchLower) ||
            order.requirements.some((req: string) => req.toLowerCase().includes(searchLower))
        )
      }

      // Sort by most recent
      results.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())

      return results
    },
    staleTime: 30000, // 30 seconds
  })
}

export function useWorkOrder(address: string): ReturnType<typeof useQuery> {
  return useQuery({
    queryKey: ['work-order', address],
    queryFn: async () => {
      const client = getGhostSpeakClient() as MockGhostSpeakClient
      const rpc = client.config?.rpc

      // Fetch the work order account
      const accountInfo = await rpc.getAccountInfo(address as Address)

      if (!accountInfo || !accountInfo.data) {
        throw new Error('Work order not found')
      }

      // Decode the work order data
      const decoder = getWorkOrderDecoder()
      const workOrderData = decoder.decode(accountInfo.data as Uint8Array)

      // For now, we'll create placeholder milestone data
      // In a real implementation, these would be stored separately
      const milestones: Milestone[] = []

      // Transform SDK data to match our WorkOrder interface
      return {
        address: address,
        client: workOrderData.client,
        provider: workOrderData.provider,
        clientName: undefined, // TODO: Fetch from agent/user data
        providerName: undefined, // TODO: Fetch from agent/user data
        title: workOrderData.title,
        description: workOrderData.description,
        requirements: workOrderData.requirements,
        paymentAmount: workOrderData.paymentAmount,
        paymentToken: workOrderData.paymentToken,
        status: mapSDKStatusToUIStatus(workOrderData.status as SDKWorkOrderStatus),
        createdAt: new Date(Number(workOrderData.createdAt) * 1000),
        updatedAt: new Date(Number(workOrderData.updatedAt) * 1000),
        deadline: new Date(Number(workOrderData.deadline) * 1000),
        deliveredAt:
          workOrderData.deliveredAt !== null
            ? new Date(Number(workOrderData.deliveredAt) * 1000)
            : undefined,
        milestones,
        deliverables: [], // TODO: Fetch from work delivery data
        communicationThread: [], // TODO: Fetch from channel/message data
        disputeReason: undefined, // TODO: Fetch from dispute data if exists
        arbitrator: undefined, // TODO: Fetch from dispute data if exists
      } as WorkOrder
    },
    enabled: !!address,
  })
}

export function useCreateWorkOrder(): ReturnType<typeof useMutation> {
  const queryClient = useQueryClient()
  const { publicKey, signTransaction } = useWallet()

  return useMutation({
    mutationFn: async (data: CreateWorkOrderData) => {
      if (!publicKey || !signTransaction) {
        throw new Error('Wallet not connected')
      }

      const client = getGhostSpeakClient()

      // Generate order ID (timestamp-based for uniqueness)
      const orderId = BigInt(Date.now())

      // Derive work order PDA
      const workOrderAddress = await deriveWorkOrderPda(
        GHOSTSPEAK_MARKETPLACE_PROGRAM_ADDRESS,
        publicKey.toBase58() as Address,
        orderId
      )

      // Create the work order instruction
      const instruction = getCreateWorkOrderInstruction({
        workOrder: workOrderAddress,
        client: { address: publicKey.toBase58() as Address, signTransaction } as MockSigner,
        orderId: orderId,
        provider: data.provider as Address,
        title: data.title,
        description: data.description,
        requirements: data.requirements,
        paymentAmount: data.paymentAmount,
        paymentToken: data.paymentToken as Address,
        deadline: BigInt(Math.floor(data.deadline.getTime() / 1000)), // Convert to Unix timestamp
      })

      // Execute the instruction
      const createRpc = client.config?.rpc || {}
      const signature = await createRpc.sendTransaction?.(
        [instruction],
        [{ address: publicKey.toBase58() as Address, signTransaction } as MockSigner]
      )

      // Wait for confirmation
      await createRpc.confirmTransaction?.(signature, 'confirmed')

      // Return the new work order
      const newWorkOrder: WorkOrder = {
        address: workOrderAddress,
        client: publicKey.toBase58(),
        provider: data.provider,
        clientName: 'You',
        title: data.title,
        description: data.description,
        requirements: data.requirements,
        paymentAmount: data.paymentAmount,
        paymentToken: data.paymentToken,
        status: WorkOrderStatus.Open,
        createdAt: new Date(),
        updatedAt: new Date(),
        deadline: data.deadline,
        milestones:
          data.milestones?.map(
            (milestone, index): Milestone => ({
              id: `milestone_${index + 1}`,
              title: milestone.title,
              description: milestone.description,
              amount: milestone.amount,
              completed: false,
              paymentReleased: false,
            })
          ) || [],
        deliverables: [],
        communicationThread: [],
      }

      return newWorkOrder
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['work-orders'] })
      toast.success('Work order created successfully!')
    },
    onError: (error) => {
      console.error('Failed to create work order:', error)
      toast.error('Failed to create work order')
    },
  })
}

export function useSubmitDelivery(): ReturnType<typeof useMutation> {
  const queryClient = useQueryClient()
  const { publicKey, signTransaction } = useWallet()

  return useMutation({
    mutationFn: async (data: SubmitDeliveryData) => {
      if (!publicKey || !signTransaction) {
        throw new Error('Wallet not connected')
      }

      const client = getGhostSpeakClient()

      // Derive work delivery PDA
      const workDeliveryAddress = await deriveWorkDeliveryPda(
        GHOSTSPEAK_MARKETPLACE_PROGRAM_ADDRESS,
        data.workOrderAddress as Address,
        publicKey.toBase58() as Address
      )

      // Create the submit work delivery instruction
      const instruction = getSubmitWorkDeliveryInstruction({
        workOrder: data.workOrderAddress as Address,
        workDelivery: workDeliveryAddress,
        provider: { address: publicKey.toBase58() as Address, signTransaction },
        deliverables: data.deliverables.map((deliverable) => ({
          title: 'Deliverable',
          description: deliverable,
          fileUrl: deliverable,
          fileHash: 'placeholder_hash', // In real implementation, compute file hash
        })),
        ipfsHash: 'placeholder_ipfs_hash', // Required parameter
        metadataUri: 'placeholder_metadata_uri', // Required parameter
        // notes: data.notes, // Notes may not be a parameter for this instruction
      })

      // Execute the instruction
      const submitRpc = client.config?.rpc
      const signature = await submitRpc.sendTransaction?.(
        [instruction],
        [{ address: publicKey.toBase58() as Address, signTransaction } as MockSigner]
      )

      // Wait for confirmation
      await submitRpc.confirmTransaction?.(signature, 'confirmed')

      return {
        transactionId: signature,
        status: 'submitted',
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['work-order', variables.workOrderAddress] })
      queryClient.invalidateQueries({ queryKey: ['work-orders'] })
      toast.success('Delivery submitted successfully!')
    },
    onError: (error) => {
      console.error('Failed to submit delivery:', error)
      toast.error('Failed to submit delivery')
    },
  })
}

export function useVerifyDelivery(): ReturnType<typeof useMutation> {
  const queryClient = useQueryClient()
  const { publicKey, signTransaction } = useWallet()

  return useMutation({
    mutationFn: async (data: VerifyDeliveryData) => {
      if (!publicKey || !signTransaction) {
        throw new Error('Wallet not connected')
      }

      const client = getGhostSpeakClient()

      // Fetch work order to get provider address
      const verifyRpc = client.config?.rpc
      const workOrderAccount = await verifyRpc.getAccountInfo(data.workOrderAddress as Address)
      if (!workOrderAccount || !workOrderAccount.data) {
        throw new Error('Work order not found')
      }
      const workOrderData = getWorkOrderDecoder().decode(workOrderAccount.data as Uint8Array)

      // Derive work delivery PDA
      const workDeliveryAddress = await deriveWorkDeliveryPda(
        GHOSTSPEAK_MARKETPLACE_PROGRAM_ADDRESS,
        data.workOrderAddress as Address,
        workOrderData.provider as Address
      )

      // Create the appropriate instruction based on approval status
      const instruction = data.approved
        ? getVerifyWorkDeliveryInstruction({
            workOrder: data.workOrderAddress as Address,
            workDelivery: workDeliveryAddress,
            client: { address: publicKey.toBase58() as Address, signTransaction } as MockSigner,
            verificationNotes: data.feedback, // Required parameter
          })
        : getRejectWorkDeliveryInstruction({
            workOrder: data.workOrderAddress as Address,
            workDelivery: workDeliveryAddress,
            client: { address: publicKey.toBase58() as Address, signTransaction } as MockSigner,
            rejectionReason: data.feedback, // Required parameter
            requestedChanges: [data.feedback], // Required parameter as array
          })

      // Execute the instruction
      const signature = await verifyRpc.sendTransaction?.(
        [instruction],
        [{ address: publicKey.toBase58() as Address, signTransaction } as MockSigner]
      )

      // Wait for confirmation
      await verifyRpc.confirmTransaction?.(signature, 'confirmed')

      return {
        transactionId: signature,
        status: data.approved ? 'approved' : 'rejected',
      }
    },
    onSuccess: (result, variables) => {
      queryClient.invalidateQueries({ queryKey: ['work-order', variables.workOrderAddress] })
      queryClient.invalidateQueries({ queryKey: ['work-orders'] })
      toast.success(
        result.status === 'approved' ? 'Delivery approved successfully!' : 'Delivery rejected'
      )
    },
    onError: (error) => {
      console.error('Failed to verify delivery:', error)
      toast.error('Failed to verify delivery')
    },
  })
}

export function useProcessPayment(): ReturnType<typeof useMutation> {
  const queryClient = useQueryClient()
  const { publicKey, signTransaction } = useWallet()

  return useMutation({
    mutationFn: async (data: { workOrderAddress: string; milestoneIds: string[] }) => {
      if (!publicKey || !signTransaction) {
        throw new Error('Wallet not connected')
      }

      const client = getGhostSpeakClient()

      // Fetch work order to get payment details
      const paymentRpc = client.config?.rpc
      const workOrderAccount = await paymentRpc.getAccountInfo(data.workOrderAddress as Address)
      if (!workOrderAccount || !workOrderAccount.data) {
        throw new Error('Work order not found')
      }
      const workOrderData = getWorkOrderDecoder().decode(workOrderAccount.data as Uint8Array)

      // Create the process payment instruction - providing required parameters
      const instruction = getProcessPaymentInstruction({
        workOrder: data.workOrderAddress as Address,
        payment: data.workOrderAddress as Address, // Using workOrder as placeholder
        providerAgent: workOrderData.provider,
        payer: { address: publicKey.toBase58() as Address, signTransaction },
        payerTokenAccount: publicKey.toBase58() as Address, // Placeholder
        providerTokenAccount: workOrderData.provider, // Placeholder
        tokenMint: workOrderData.paymentToken, // Required parameter
        amount: workOrderData.paymentAmount, // Required parameter
        useConfidentialTransfer: false, // Required parameter
        systemProgram: 'SystemProgram' as Address, // Placeholder
      })

      // Execute the instruction
      const signature = await paymentRpc.sendTransaction?.(
        [instruction],
        [{ address: publicKey.toBase58() as Address, signTransaction } as MockSigner]
      )

      // Wait for confirmation
      await paymentRpc.confirmTransaction?.(signature, 'confirmed')

      return {
        transactionId: signature,
        status: 'processed',
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['work-order', variables.workOrderAddress] })
      queryClient.invalidateQueries({ queryKey: ['work-orders'] })
      toast.success('Payment processed successfully!')
    },
    onError: (error) => {
      console.error('Failed to process payment:', error)
      toast.error('Failed to process payment')
    },
  })
}
