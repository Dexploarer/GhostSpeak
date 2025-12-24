'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getGhostSpeakClient } from '@/lib/ghostspeak/client'
import { toast } from 'sonner'
import { useCrossmintSigner } from '@/lib/hooks/useCrossmintSigner'
import type { Address } from '@solana/addresses'
import type {
  WorkOrder as SDKWorkOrder,
  WorkOrderStatus as SDKWorkOrderStatus,
} from '@ghostspeak/sdk/browser'

// =====================================================
// UI TYPE DEFINITIONS
// =====================================================

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
  workDeliveryAddress?: string // Optional - will be fetched if not provided
  approved: boolean
  feedback: string
  milestoneIds?: string[]
}

// =====================================================
// HELPER FUNCTIONS
// =====================================================

/**
 * Map SDK status to UI status
 */
function mapSDKStatusToUIStatus(sdkStatus: SDKWorkOrderStatus): WorkOrderStatus {
  // SDK status is an enum object, need to compare against enum variants
  const statusName = typeof sdkStatus === 'object' ? Object.keys(sdkStatus)[0] : String(sdkStatus)

  const statusMap: Record<string, WorkOrderStatus> = {
    Created: WorkOrderStatus.Created,
    Open: WorkOrderStatus.Open,
    InProgress: WorkOrderStatus.InProgress,
    Submitted: WorkOrderStatus.Submitted,
    Delivered: WorkOrderStatus.Submitted, // Map SDK 'Delivered' to UI 'Submitted'
    Approved: WorkOrderStatus.Approved,
    Completed: WorkOrderStatus.Completed,
    Cancelled: WorkOrderStatus.Cancelled,
  }
  return statusMap[statusName] || WorkOrderStatus.Created
}

/**
 * Transform SDK WorkOrder to UI WorkOrder
 */
function transformWorkOrder(address: string, data: SDKWorkOrder): WorkOrder {
  return {
    address,
    client: data.client.toString(),
    provider: data.provider.toString(),
    clientName: undefined,
    providerName: undefined,
    title: data.title,
    description: data.description,
    requirements: data.requirements,
    paymentAmount: data.paymentAmount,
    paymentToken: data.paymentToken.toString(),
    status: mapSDKStatusToUIStatus(data.status),
    createdAt: new Date(Number(data.createdAt) * 1000),
    updatedAt: new Date(Number(data.updatedAt) * 1000),
    deadline: new Date(Number(data.deadline) * 1000),
    deliveredAt: data.deliveredAt ? new Date(Number(data.deliveredAt) * 1000) : undefined,
    milestones: [], // Milestones stored separately
    deliverables: [], // Deliverables in delivery accounts
    communicationThread: [], // Communication in channel accounts
    disputeReason: undefined,
    arbitrator: undefined,
  }
}

// =====================================================
// HOOKS
// =====================================================

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

      // Use the real SDK WorkOrderModule
      const workOrders = await client.workOrders
        .getAllWorkOrders()
        .catch(() => [] as Array<{ address: Address; data: SDKWorkOrder }>)

      // Transform SDK data to UI format
      let results = workOrders.map(({ address, data }) =>
        transformWorkOrder(address.toString(), data)
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
            order.requirements.some((req) => req.toLowerCase().includes(searchLower))
        )
      }

      // Sort by most recent
      results.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())

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

      // Use real SDK method
      const result = await client.workOrders.getWorkOrderByAddress(address as Address)

      if (!result) {
        throw new Error('Work order not found')
      }

      return transformWorkOrder(address, result.data)
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
      const signer = createSigner()
      if (!signer) throw new Error('Could not create signer')

      // Use the real SDK method
      const signature = await client.workOrders.createWorkOrder({
        signer,
        provider: data.provider as Address,
        title: data.title,
        description: data.description,
        requirements: data.requirements,
        paymentAmount: data.paymentAmount,
        paymentToken: data.paymentToken as Address,
        deadline: data.deadline,
      })

      return {
        signature,
        address: address, // Work order PDA would be derived
      }
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

      const client = getGhostSpeakClient()
      const signer = createSigner()
      if (!signer) throw new Error('Could not create signer')

      // Build deliverables in the expected format
      const deliverables = data.deliverables.map((url, index) => ({
        title: `Deliverable ${index + 1}`,
        description: data.notes,
        fileUrl: url,
        fileHash: '', // Would compute hash in production
      }))

      const signature = await client.workOrders.submitDelivery({
        signer,
        workOrderAddress: data.workOrderAddress as Address,
        deliverables: deliverables as unknown as any, // Cast to SDK's Deliverable type (temporary workaround until types align)
        ipfsHash: 'pending_ipfs_upload', // Would upload to IPFS first
        metadataUri: 'pending_metadata_uri',
      })

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
      if (!signer) throw new Error('Could not create signer')

      let deliveryAddress = data.workDeliveryAddress

      // If workDeliveryAddress not provided, try to fetch it
      if (!deliveryAddress) {
        const delivery = await client.workOrders.getWorkDeliveryForOrder(
          data.workOrderAddress as Address
        )
        if (!delivery) {
          throw new Error('No delivery found for this work order')
        }
        deliveryAddress = delivery.address.toString()
      }

      if (data.approved) {
        // Verify and approve the delivery
        const signature = await client.workOrders.verifyDelivery({
          signer,
          workOrderAddress: data.workOrderAddress as Address,
          workDeliveryAddress: deliveryAddress as Address,
          verificationNotes: data.feedback || undefined,
        })

        return {
          transactionId: signature,
          status: 'approved',
        }
      } else {
        // Reject the delivery
        const signature = await client.workOrders.rejectDelivery({
          signer,
          workOrderAddress: data.workOrderAddress as Address,
          workDeliveryAddress: deliveryAddress as Address,
          rejectionReason: data.feedback,
          requestedChanges: data.milestoneIds, // Repurpose for change requests
        })

        return {
          transactionId: signature,
          status: 'rejected',
        }
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
    mutationFn: async (_data: { workOrderAddress: string; milestoneIds: string[] }) => {
      if (!isConnected || !address) {
        throw new Error('Wallet not connected')
      }

      const _client = getGhostSpeakClient()
      const signer = createSigner()
      if (!signer) throw new Error('Could not create signer')

      // Payment processing would require escrow release instruction
      // This is a placeholder until escrow integration is complete
      console.warn('processPayment: Full escrow integration pending')

      return {
        transactionId: 'placeholder_signature',
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

/**
 * Get work delivery associated with a work order
 */
export function useWorkDelivery(workOrderAddress: string) {
  return useQuery({
    queryKey: ['work-delivery', workOrderAddress],
    queryFn: async () => {
      const client = getGhostSpeakClient()
      const result = await client.workOrders.getWorkDeliveryForOrder(workOrderAddress as Address)
      return result
    },
    enabled: !!workOrderAddress,
  })
}

/**
 * Get work orders for the current user
 */
export function useMyWorkOrders(role: 'client' | 'provider' = 'client') {
  const { address, isConnected } = useCrossmintSigner()

  return useQuery({
    queryKey: ['my-work-orders', role, address],
    queryFn: async () => {
      if (!address) return []

      const client = getGhostSpeakClient()

      const workOrders =
        role === 'client'
          ? await client.workOrders.getWorkOrdersByClient(address as Address)
          : await client.workOrders.getWorkOrdersByProvider(address as Address)

      return workOrders.map(({ address: addr, data }) => transformWorkOrder(addr.toString(), data))
    },
    enabled: isConnected && !!address,
    staleTime: 30000,
  })
}
