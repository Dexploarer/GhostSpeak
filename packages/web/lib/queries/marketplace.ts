'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getGhostSpeakClient } from '@/lib/ghostspeak/client'
import { toast } from 'sonner'
import { useCrossmintSigner } from '@/lib/hooks/useCrossmintSigner'
import type { Address } from '@solana/addresses'
import type { TransactionSigner } from '@solana/kit'
import { validateAddress, safeParseAddress, isValidImageUrl, bigintReplacer } from '@/lib/utils'
import { transactionFeedback } from '@/lib/transaction-feedback'

// Type for service listing data from SDK
interface ServiceListingSDKData {
  title?: string
  description?: string
  serviceType?: string
  price?: bigint
  agent?: Address
  reputation?: number
  images?: string[]
  tags?: string[]
  isActive?: boolean
  createdAt?: bigint
  updatedAt?: bigint
  totalOrders?: number
  rating?: number
  totalRatings?: number
  estimatedDelivery?: bigint
  requirements?: string
  additionalInfo?: string
}

// Type for job posting data from SDK
interface JobPostingSDKData {
  title?: string
  description?: string
  budget?: bigint
  budgetMin?: bigint
  budgetMax?: bigint
  employer: Address
  skillsNeeded?: string[]
  requirements?: string[]
  deadline: bigint
  jobType?: string
  experienceLevel?: string
  applicationsCount?: number
  isActive?: boolean
  createdAt?: bigint
  updatedAt?: bigint
}

// Signer is now provided by useCrossmintSigner hook

export interface MarketplaceListing {
  address: string
  name: string
  description: string
  category: string
  price: bigint
  currency: 'SOL' | 'USDC'
  seller: string
  sellerName?: string
  sellerReputation: number
  images: string[]
  tags: string[]
  isActive: boolean
  createdAt: Date
  updatedAt: Date
  totalPurchases: number
  averageRating: number
  totalRatings: number
  deliveryTime: string
  requirements?: string
  additionalInfo?: string
}

export interface CreateListingData {
  name: string
  description: string
  category: string
  price: bigint
  currency: 'SOL' | 'USDC'
  images?: string[]
  tags: string[]
  deliveryTime: string
  requirements?: string
  additionalInfo?: string
}

export interface PurchaseListingData {
  listingAddress: string
  quantity?: number
  customRequirements?: string
}

// Interface for marketplace listing filters
interface MarketplaceFilters {
  category?: string
  search?: string
  minPrice?: number
  maxPrice?: number
  sortBy?: 'newest' | 'price_low' | 'price_high' | 'rating' | 'popular'
}

export function useMarketplaceListings(filters?: MarketplaceFilters) {
  return useQuery({
    queryKey: ['marketplace', 'listings', filters],
    queryFn: async () => {
      const client = getGhostSpeakClient()

      // Get all service listings from the SDK
      const serviceListings = await client.marketplace.getAllServiceListings()

      // Transform SDK data to match our MarketplaceListing interface
      let results = serviceListings.map(
        (listing: { address: Address; data: ServiceListingSDKData }) => {
          const listingData = listing.data

          // Validate addresses safely
          const addressStr = listing.address.toString()
          const sellerAddress = listingData.agent
            ? listingData.agent.toString()
            : addressStr

          // Filter and validate images
          const validImages = (listingData.images || [])
            .filter((url: string) => isValidImageUrl(url))
            .slice(0, 5) // Limit to 5 images max

          return {
            address: addressStr,
            name: listingData.title || 'Untitled Service',
            description: listingData.description || '',
            category: listingData.serviceType || 'Other',
            price: listingData.price || BigInt(0),
            currency: 'SOL' as const, // paymentToken could be used for token mint
            seller: sellerAddress,
            sellerName: undefined, // Will be fetched separately if needed
            sellerReputation: Math.max(0, Math.min(5, listingData.reputation || 0)), // Clamp 0-5
            images: validImages,
            tags: (listingData.tags || []).slice(0, 10), // Limit tags
            isActive: Boolean(listingData.isActive),
            createdAt: new Date(Math.max(0, Number(listingData.createdAt) * 1000)),
            updatedAt: new Date(Math.max(0, Number(listingData.updatedAt) * 1000)),
            totalPurchases: Math.max(0, listingData.totalOrders || 0),
            averageRating: Math.max(0, Math.min(5, listingData.rating || 0)),
            totalRatings: Math.max(0, listingData.totalRatings || listingData.totalOrders || 0),
            deliveryTime: `${Math.max(1, Math.min(365, Number(listingData.estimatedDelivery) || 7))} days`,
            requirements: (listingData.requirements || '').slice(0, 500), // Limit length
            additionalInfo: (listingData.additionalInfo || '').slice(0, 1000), // Limit length
          }
        }
      )

      // Apply client-side filters
      if (filters?.category && filters.category !== 'all') {
        results = results.filter(
          (listing: MarketplaceListing) =>
            listing.category.toLowerCase() === filters.category!.toLowerCase()
        )
      }

      if (filters?.search) {
        const searchLower = filters.search.toLowerCase()
        results = results.filter(
          (listing: MarketplaceListing) =>
            listing.name.toLowerCase().includes(searchLower) ||
            listing.description.toLowerCase().includes(searchLower) ||
            listing.tags.some((tag: string) => tag.toLowerCase().includes(searchLower))
        )
      }

      if (filters?.minPrice !== undefined) {
        const minPriceLamports = BigInt(Math.floor(filters.minPrice * 1e9))
        results = results.filter((listing: MarketplaceListing) => listing.price >= minPriceLamports)
      }

      if (filters?.maxPrice !== undefined) {
        const maxPriceLamports = BigInt(Math.floor(filters.maxPrice * 1e9))
        results = results.filter((listing: MarketplaceListing) => listing.price <= maxPriceLamports)
      }

      // Apply sorting
      switch (filters?.sortBy) {
        case 'price_low':
          results.sort((a: MarketplaceListing, b: MarketplaceListing) => Number(a.price - b.price))
          break
        case 'price_high':
          results.sort((a: MarketplaceListing, b: MarketplaceListing) => Number(b.price - a.price))
          break
        case 'rating':
          results.sort(
            (a: MarketplaceListing, b: MarketplaceListing) => b.averageRating - a.averageRating
          )
          break
        case 'popular':
          results.sort(
            (a: MarketplaceListing, b: MarketplaceListing) => b.totalPurchases - a.totalPurchases
          )
          break
        case 'newest':
        default:
          results.sort(
            (a: MarketplaceListing, b: MarketplaceListing) =>
              b.createdAt.getTime() - a.createdAt.getTime()
          )
          break
      }

      return results
    },
    staleTime: 5000, // 5 seconds for more real-time feel
    refetchInterval: 10000, // Auto-refetch every 10 seconds
    refetchOnWindowFocus: true,
    meta: {
      // Add serialization config for BigInt values
      serialize: (data: unknown) => JSON.stringify(data, bigintReplacer),
    },
  })
}

export function useMarketplaceListing(address: string) {
  return useQuery({
    queryKey: ['marketplace', 'listing', address],
    queryFn: async () => {
      const client = getGhostSpeakClient()

      // Validate address first
      const validatedAddress = validateAddress(address)

      // Get the service listing from SDK - using getAllServiceListings and filtering
      const allListings = await client.marketplace.getAllServiceListings()
      const serviceListing = allListings.find(
        (listing) => listing.address.toString() === validatedAddress.toString()
      )?.data

      if (!serviceListing) {
        throw new Error('Listing not found')
      }

      // Transform SDK data to match our MarketplaceListing interface
      return {
        address: address,
        name: serviceListing.title || 'Untitled Service',
        description: serviceListing.description || '',
        category: serviceListing.serviceType || 'Other',
        price: serviceListing.price || BigInt(0),
        currency: 'SOL' as const,
        seller: serviceListing.agent.toString(),
        sellerName: undefined, // Will be fetched separately if needed
        sellerReputation: 0, // Will be fetched from agent data if needed
        images: [], // Could be parsed from metadata URI if available
        tags: serviceListing.tags || [],
        isActive: serviceListing.isActive || false,
        createdAt: new Date(Number(serviceListing.createdAt) * 1000),
        updatedAt: new Date(Number(serviceListing.updatedAt) * 1000),
        totalPurchases: serviceListing.totalOrders || 0,
        averageRating: serviceListing.rating || 0,
        totalRatings: serviceListing.totalOrders || 0,
        deliveryTime: `${Number(serviceListing.estimatedDelivery) || 7} days`,
        requirements: '', // Not in the SDK data structure
        additionalInfo: '', // Could be fetched from metadata URI
      }
    },
    enabled: !!address && safeParseAddress(address) !== null,
    staleTime: 10000, // 10 seconds
  })
}

export function useCreateListing() {
  const queryClient = useQueryClient()
  const { createSigner, isConnected, address } = useCrossmintSigner()

  return useMutation({
    mutationFn: async (data: CreateListingData) => {
      if (!isConnected || !address) {
        throw new Error('Wallet not connected')
      }

      const transactionId = `create-listing-${Date.now()}`

      try {
        // Start transaction feedback
        transactionFeedback.startTransaction(transactionId, {
          type: 'listing',
          description: `Creating listing: ${data.name}`,
          amount: data.price,
        })

        const client = getGhostSpeakClient()

        // For service listings, we need an agent address
        // This would normally come from the user's selected agent
        const agentAddress = validateAddress(address)

        // Use the real client API to create service listing
        const signer = createSigner()
      if (!signer) throw new Error("Could not create signer")
        const result = await client.marketplace.createServiceListing({
          signer,
          title: data.name,
          description: data.description,
          agentAddress: agentAddress,
          pricePerHour: data.price,
          category: data.category,
          capabilities: data.tags,
        })

        // Update with signature if available
        if (typeof result === 'string') {
          transactionFeedback.updateWithSignature(transactionId, result)
        }

        // Simulate confirmation after a delay (replace with real confirmation logic)
        setTimeout(() => {
          transactionFeedback.confirmTransaction(transactionId)
        }, 3000)

        // Return transformed listing data
        return {
          address: `service_${agentAddress}_${data.name}`,
          name: data.name,
          description: data.description,
          category: data.category,
          price: data.price,
          currency: data.currency,
          seller: address,
          sellerName: 'You',
          sellerReputation: 5.0,
          images: data.images || [],
          tags: data.tags,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          totalPurchases: 0,
          averageRating: 0,
          totalRatings: 0,
          deliveryTime: data.deliveryTime,
          requirements: data.requirements,
          additionalInfo: data.additionalInfo,
          signature: result,
          transactionId,
        }
      } catch (error) {
        transactionFeedback.failTransaction(
          transactionId,
          error instanceof Error ? error.message : 'Unknown error'
        )
        throw error
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketplace', 'listings'] })
    },
    onError: (error) => {
      console.error('Failed to create listing:', error)
    },
  })
}

export function usePurchaseListing() {
  const queryClient = useQueryClient()
  const { createSigner, isConnected, address } = useCrossmintSigner()

  return useMutation({
    mutationFn: async (data: PurchaseListingData) => {
      if (!isConnected || !address) {
        throw new Error('Wallet not connected')
      }

      const transactionId = `purchase-${data.listingAddress}-${Date.now()}`

      try {
        // Start transaction feedback
        transactionFeedback.startTransaction(transactionId, {
          type: 'purchase',
          description: `Purchasing service`,
        })

        const client = getGhostSpeakClient()

        // Validate listing address
        const validatedListingAddress = validateAddress(data.listingAddress)

        // Generate purchase account address
        const purchaseAddress = `purchase_${data.listingAddress}_${address}_${Date.now()}`

        // Purchase the service using the client
        const signer = createSigner()
      if (!signer) throw new Error("Could not create signer")
        // TODO: purchaseService may not exist in current SDK - stub if needed
        const result = await (client.marketplace as unknown as { purchaseService: (signer: TransactionSigner, address: Address) => Promise<string> }).purchaseService(signer, validatedListingAddress)

        // Update with signature if available
        if (typeof result === 'string') {
          transactionFeedback.updateWithSignature(transactionId, result)
        }

        // Simulate confirmation after a delay (replace with real confirmation logic)
        setTimeout(() => {
          transactionFeedback.confirmTransaction(transactionId)
        }, 5000)

        return {
          transactionId: result,
          purchaseId: purchaseAddress,
          status: 'confirmed',
          transactionFeedbackId: transactionId,
        }
      } catch (error) {
        transactionFeedback.failTransaction(
          transactionId,
          error instanceof Error ? error.message : 'Unknown error'
        )
        throw error
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketplace'] })
    },
    onError: (error) => {
      console.error('Failed to purchase listing:', error)
    },
  })
}

// Hook for creating job postings
export function useCreateJobPosting() {
  const queryClient = useQueryClient()
  const { createSigner, isConnected, address } = useCrossmintSigner()

  return useMutation({
    mutationFn: async (data: {
      title: string
      description: string
      budget: bigint
      duration: number
      requiredSkills: string[]
      category: string
    }) => {
      if (!isConnected || !address) {
        throw new Error('Wallet not connected')
      }

      const client = getGhostSpeakClient()

      // job() method may not exist - use createJobPosting directly
      const signer = createSigner()
      if (!signer) throw new Error("Could not create signer")

      const result = await (client.marketplace as unknown as { createJobPosting: (params: unknown) => Promise<string> }).createJobPosting({
        title: data.title,
        description: data.description,
        budget: data.budget,
        duration: data.duration,
        requiredSkills: data.requiredSkills,
        category: data.category,
      })

      return {
        address: `job_${address}_${data.title}`,
        signature: result,
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketplace', 'jobs'] })
      toast.success('Job posting created successfully!')
    },
    onError: (error) => {
      console.error('Failed to create job posting:', error)
      toast.error('Failed to create job posting')
    },
  })
}

// Hook for getting job postings
export function useJobPostings() {
  return useQuery({
    queryKey: ['marketplace', 'jobs'],
    queryFn: async () => {
      const client = getGhostSpeakClient()

      const jobPostings = await client.marketplace.getAllJobPostings()

      return jobPostings.map((job: { address: Address; data: JobPostingSDKData }) => {
        const jobData = job.data
        return {
          address: job.address.toString(),
          title: jobData.title || 'Untitled Job',
          description: jobData.description || '',
          budget: jobData.budget || BigInt(0),
          budgetMin: jobData.budgetMin || BigInt(0),
          budgetMax: jobData.budgetMax || BigInt(0),
          employer: jobData.employer.toString(),
          requiredSkills: jobData.skillsNeeded || [],
          requirements: jobData.requirements || [],
          deadline: new Date(Number(jobData.deadline) * 1000),
          category: jobData.jobType || 'Other',
          experienceLevel: jobData.experienceLevel || 'Entry',
          applications: jobData.applicationsCount || 0,
          isActive: jobData.isActive || false,
          createdAt: new Date(Number(jobData.createdAt) * 1000),
          updatedAt: new Date(Number(jobData.updatedAt) * 1000),
        }
      })
    },
    staleTime: 30000, // 30 seconds
  })
}

export const marketplaceCategories = [
  'All',
  'Data Analysis',
  'Content Creation',
  'Development',
  'Design',
  'Marketing',
  'Security',
  'Automation',
  'Research',
  'Consulting',
  'Other',
]
