'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getGhostSpeakClient } from '@/lib/ghostspeak/client'
import { toast } from 'sonner'
import { useCrossmintSigner } from '@/lib/hooks/useCrossmintSigner'
import type { Address } from '@solana/addresses'
import type { ProgramAccount } from '@/lib/types/rpc-client-types'
import type { TransactionSigner } from '@solana/kit'

// Signer is now provided by useCrossmintSigner hook

// Define local types to avoid import issues
type SDKWorkOrderStatus = 'Open' | 'InProgress' | 'Delivered' | 'Completed' | 'Cancelled'

// SDK Work Order data structure
interface WorkOrderSDKData {
  client: Address
  provider: Address
  title: string
  description: string
  requirements: string[]
  paymentAmount: bigint
  paymentToken: string
  status: SDKWorkOrderStatus
  createdAt: bigint
  updatedAt: bigint
  deadline: bigint
  deliveredAt: bigint | null
}

// Local constants to avoid import issues
const GHOSTSPEAK_MARKETPLACE_PROGRAM_ADDRESS = 'GpvFxus2eecFKcqa2bhxXeRjpstPeCEJNX216TQCcNC9'

// Helper functions for PDA derivation (real implementation)
import { getProgramDerivedAddress, getBytesEncoder, getUtf8Encoder } from '@solana/kit'

const deriveWorkOrderPda = async (
  program: string,
  client: Address,
  orderId: bigint
): Promise<[Address, number]> => {
  const result = await getProgramDerivedAddress({
    programAddress: program as Address,
    seeds: [
      getUtf8Encoder().encode('work_order'),
      getUtf8Encoder().encode(client),
      getUtf8Encoder().encode(orderId.toString()),
    ],
  })
  return [result[0], result[1]]
}

const deriveWorkDeliveryPda = async (
  program: string,
  workOrder: Address,
  provider: Address
): Promise<[Address, number]> => {
  const result = await getProgramDerivedAddress({
    programAddress: program as Address,
    seeds: [
      getUtf8Encoder().encode('delivery'),
      getUtf8Encoder().encode(workOrder),
      getUtf8Encoder().encode(provider),
    ],
  })
  return [result[0], result[1]]
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

// Using real GhostSpeak client type from the SDK

export function useWorkOrders(filters?: {
  status?: WorkOrderStatus[]
  role?: 'client' | 'provider' | 'all'
  search?: string
  userAddress?: string
}) {
  return useQuery({
    queryKey: ['work-orders', filters],
    queryFn: async () => {
      const client = getGhostSpeakClient()

      // Use the SDK to fetch work orders - workOrders module may not exist yet
      const workOrders = await (client as unknown as { workOrders: { getAllWorkOrders: () => Promise<Array<{ address: Address; data: WorkOrderSDKData }>> } }).workOrders.getAllWorkOrders().catch(() => [] as Array<{ address: Address; data: WorkOrderSDKData }>)

      // Transform SDK data to match our WorkOrder interface
      let results = await Promise.all(
        workOrders.map(async ({ address, data: workOrderData }: { address: Address; data: WorkOrderSDKData }) => {
          // For now, we'll create placeholder milestone data
          // In a real implementation, these would be stored separately
          const milestones: Milestone[] = []

          return {
            address: address.toString(),
            client: workOrderData.client.toString(),
            provider: workOrderData.provider.toString(),
            clientName: undefined, // Will be fetched from agent/user registry if needed
            providerName: undefined, // Will be fetched from agent/user registry if needed
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
            deliverables: [], // Work deliverables would be stored in separate delivery accounts
            communicationThread: [], // Communication would be in associated channel accounts
            disputeReason: undefined, // Dispute data would be in separate dispute accounts
            arbitrator: undefined, // Arbitrator would be assigned in dispute accounts
          } as WorkOrder
        })
      )

      // Apply client-side filters
      if (filters?.status && filters.status.length > 0) {
        results = results.filter((order: WorkOrder) => filters.status!.includes(order.status))
      }

      if (filters?.role && filters.role !== 'all' && filters.userAddress) {
        results = results.filter((order: WorkOrder) => {
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
          (order: WorkOrder) =>
            order.title.toLowerCase().includes(searchLower) ||
            order.description.toLowerCase().includes(searchLower) ||
            order.requirements.some((req: string) => req.toLowerCase().includes(searchLower))
        )
      }

      // Sort by most recent
      results.sort((a: WorkOrder, b: WorkOrder) => b.updatedAt.getTime() - a.updatedAt.getTime())

      return results
    },
    staleTime: 30000, // 30 seconds
  })
}

export function useWorkOrder(address: string) {
  return useQuery({
    queryKey: ['work-order', address],
    queryFn: async () => {
      const client = getGhostSpeakClient()

      // Use SDK to fetch the work order - workOrders module may not exist yet
      const workOrderAccount = await (client as unknown as { workOrders: { getWorkOrderByAddress: (addr: Address) => Promise<{ address: Address; data: WorkOrderSDKData } | null> } }).workOrders.getWorkOrderByAddress(address as Address)

      if (!workOrderAccount) {
        throw new Error('Work order not found')
      }

      const workOrderData = workOrderAccount.data

      // For now, we'll create placeholder milestone data
      // In a real implementation, these would be stored separately
      const milestones: Milestone[] = []

      // Transform SDK data to match our WorkOrder interface
      return {
        address: address,
        client: workOrderData.client,
        provider: workOrderData.provider,
        clientName: undefined, // Will be fetched from agent/user registry if needed
        providerName: undefined, // Will be fetched from agent/user registry if needed
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
        deliverables: [], // Work deliverables would be stored in separate delivery accounts
        communicationThread: [], // Communication would be in associated channel accounts
        disputeReason: undefined, // Dispute data would be in separate dispute accounts
        arbitrator: undefined, // Arbitrator would be assigned in dispute accounts
      } as WorkOrder
    },
    enabled: !!address,
  })
}

export function useCreateWorkOrder() {
  const queryClient = useQueryClient()
  const { createSigner, isConnected, address } = useCrossmintSigner()

  return useMutation({
    mutationFn: async (data: CreateWorkOrderData) => {
      if (!isConnected || !address) {
        throw new Error('Wallet not connected')
      }

      const client = getGhostSpeakClient()

      // Generate order ID (timestamp-based for uniqueness)
      const orderId = BigInt(Date.now())

      // Derive work order PDA
      const workOrderAddress = await deriveWorkOrderPda(
        GHOSTSPEAK_MARKETPLACE_PROGRAM_ADDRESS,
        address as Address,
        orderId
      )

      // Create the work order instruction
      const instruction = getCreateWorkOrderInstruction({
        workOrder: workOrderAddress,
        client: createSigner(),
        orderId: orderId,
        provider: data.provider as Address,
        title: data.title,
        description: data.description,
        requirements: data.requirements,
        paymentAmount: data.paymentAmount,
        paymentToken: data.paymentToken as Address,
        deadline: BigInt(Math.floor(data.deadline.getTime() / 1000)), // Convert to Unix timestamp
      })

      // SDK integration to be implemented based on actual API
      console.warn('createWorkOrder: SDK integration pending')
      const signature = 'placeholder_signature'

      // Return placeholder work order for now
      const newWorkOrder: WorkOrder = {
        address: workOrderAddress.toString(),
        client: address,
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

export function useSubmitDelivery() {
  const queryClient = useQueryClient()
  const { createSigner, isConnected, address } = useCrossmintSigner()

  return useMutation({
    mutationFn: async (data: SubmitDeliveryData) => {
      if (!isConnected || !address) {
        throw new Error('Wallet not connected')
      }

      const signer = createSigner()
      if (!signer) throw new Error('Could not create signer')

      const client = getGhostSpeakClient()

      // Derive work delivery PDA
      const workDeliveryAddress = await deriveWorkDeliveryPda(
        GHOSTSPEAK_MARKETPLACE_PROGRAM_ADDRESS,
        data.workOrderAddress as Address,
        address as Address
      )

      // Create the submit work delivery instruction
      const instruction = getSubmitWorkDeliveryInstruction({
        workOrder: data.workOrderAddress as Address,
        workDelivery: workDeliveryAddress,
        provider: signer,
        deliverables: data.deliverables.map((deliverable) => ({
          title: 'Deliverable',
          description: deliverable,
          fileUrl: deliverable,
          fileHash: 'placeholder_hash', // In real implementation, compute file hash
        })),
        ipfsHash: 'placeholder_ipfs_hash', // Required parameter
        metadataUri: 'placeholder_metadata_uri', // Required parameter
      })

      // Execute the instruction
      // SDK integration to be implemented based on actual API
      console.warn('submitDelivery: SDK integration pending')
      const signature = 'placeholder_signature'

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

export function useVerifyDelivery() {
  const queryClient = useQueryClient()
  const { createSigner, isConnected, address } = useCrossmintSigner()

  return useMutation({
    mutationFn: async (data: VerifyDeliveryData) => {
      if (!isConnected || !address) {
        throw new Error('Wallet not connected')
      }

      const client = getGhostSpeakClient()
      const signer = createSigner()
      if (!signer) throw new Error("Could not create signer")

      // SDK integration to be implemented based on actual API
      console.warn('verifyDelivery: SDK integration pending')
      const result = { signature: 'placeholder_signature' }

      return {
        transactionId: result.signature,
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

export function useProcessPayment() {
  const queryClient = useQueryClient()
  const { createSigner, isConnected, address } = useCrossmintSigner()

  return useMutation({
    mutationFn: async (data: { workOrderAddress: string; milestoneIds: string[] }) => {
      if (!isConnected || !address) {
        throw new Error('Wallet not connected')
      }

      const client = getGhostSpeakClient()
      const signer = createSigner()
      if (!signer) throw new Error("Could not create signer")

      // SDK integration to be implemented based on actual API
      console.warn('processPayment: SDK integration pending')
      const result = { signature: 'placeholder_signature' }

      return {
        transactionId: result.signature,
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
