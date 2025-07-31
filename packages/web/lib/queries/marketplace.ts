'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getGhostSpeakClient } from '@/lib/ghostspeak/client'
import { toast } from 'sonner'
import { useWallet } from '@solana/wallet-adapter-react'
import type { Address } from '@solana/addresses'

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
      const marketplaceModule = client.marketplace()

      // Get all service listings from the SDK
      const serviceListings = await marketplaceModule['module']['getAllServiceListings']()

      // Transform SDK data to match our MarketplaceListing interface
      let results = serviceListings.map(
        (listing: { address: Address; data: Record<string, unknown> }) => ({
          address: listing.address,
          name: listing.data.title || 'Untitled Service',
          description: listing.data.description || '',
          category: listing.data.serviceType || 'Other',
          price: BigInt((listing.data.price as number) || 0),
          currency: 'SOL' as const, // Default to SOL
          seller: listing.data.provider || listing.address,
          sellerName: undefined, // TODO: Fetch from agent data
          sellerReputation: 0, // TODO: Calculate from agent reputation
          images: [], // TODO: Parse from metadata
          tags: listing.data.tags || [],
          isActive: true, // TODO: Check actual status
          createdAt: new Date(), // TODO: Get from blockchain timestamp
          updatedAt: new Date(), // TODO: Get from blockchain timestamp
          totalPurchases: 0, // TODO: Calculate from purchase history
          averageRating: 0, // TODO: Calculate from ratings
          totalRatings: 0, // TODO: Calculate from ratings
          deliveryTime: `${(listing.data.estimatedDelivery as number) || 7} days`,
          requirements: Array.isArray(listing.data.requirements)
            ? (listing.data.requirements as string[]).join(', ')
            : '',
          additionalInfo: '', // TODO: Parse from metadata
        })
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
    staleTime: 30000, // 30 seconds
  })
}

export function useMarketplaceListing(address: string) {
  return useQuery({
    queryKey: ['marketplace', 'listing', address],
    queryFn: async () => {
      const client = getGhostSpeakClient()
      const marketplaceModule = client.marketplace()

      // Get the service listing from SDK
      const serviceListing = await marketplaceModule['module']['getServiceListing'](
        address as Address
      )

      if (!serviceListing) {
        throw new Error('Listing not found')
      }

      // Transform SDK data to match our MarketplaceListing interface
      return {
        address: address,
        name: serviceListing.title || 'Untitled Service',
        description: serviceListing.description || '',
        category: serviceListing.serviceType || 'Other',
        price: BigInt(serviceListing.price || 0),
        currency: 'SOL' as const,
        seller: serviceListing.provider || address,
        sellerName: undefined, // TODO: Fetch from agent data
        sellerReputation: 0, // TODO: Calculate from agent reputation
        images: [], // TODO: Parse from metadata
        tags: serviceListing.tags || [],
        isActive: true, // TODO: Check actual status
        createdAt: new Date(), // TODO: Get from blockchain timestamp
        updatedAt: new Date(), // TODO: Get from blockchain timestamp
        totalPurchases: 0, // TODO: Calculate from purchase history
        averageRating: 0, // TODO: Calculate from ratings
        totalRatings: 0, // TODO: Calculate from ratings
        deliveryTime: `${serviceListing.estimatedDelivery || 7} days`,
        requirements: serviceListing.requirements?.join(', ') || '',
        additionalInfo: '', // TODO: Parse from metadata
      }
    },
    enabled: !!address,
    staleTime: 60000, // 1 minute
  })
}

export function useCreateListing() {
  const queryClient = useQueryClient()
  const { publicKey, signTransaction } = useWallet()

  return useMutation({
    mutationFn: async (data: CreateListingData) => {
      if (!publicKey || !signTransaction) {
        throw new Error('Wallet not connected')
      }

      const client = getGhostSpeakClient()
      const marketplaceBuilder = client.marketplace()

      // For service listings, we need an agent address
      // This would normally come from the user's selected agent
      const agentAddress = publicKey.toBase58() // Placeholder - should be actual agent address

      // Use the fluent API to create the service
      const serviceBuilder = marketplaceBuilder.service()

      const mockSigner = { address: publicKey.toBase58(), signTransaction }
      const result = await serviceBuilder['module']['createServiceListing']({
        signer: mockSigner,
        agentAddress: agentAddress as Address,
        title: data.name,
        description: data.description,
        pricePerHour: data.price,
        category: data.category,
        capabilities: data.tags,
      })

      // Return transformed listing data
      return {
        address: `service_${agentAddress}_${data.name}`,
        name: data.name,
        description: data.description,
        category: data.category,
        price: data.price,
        currency: data.currency,
        seller: publicKey.toBase58(),
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
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketplace', 'listings'] })
      toast.success('Listing created successfully!')
    },
    onError: (error) => {
      console.error('Failed to create listing:', error)
      toast.error('Failed to create listing')
    },
  })
}

export function usePurchaseListing() {
  const queryClient = useQueryClient()
  const { publicKey, signTransaction } = useWallet()

  return useMutation({
    mutationFn: async (data: PurchaseListingData) => {
      if (!publicKey || !signTransaction) {
        throw new Error('Wallet not connected')
      }

      const client = getGhostSpeakClient()
      const marketplaceModule = client.marketplace()

      // Generate purchase account address
      const purchaseAddress = `purchase_${data.listingAddress}_${publicKey.toBase58()}_${Date.now()}`

      // Create the purchase instruction
      const mockSigner = { address: publicKey.toBase58(), signTransaction }
      const instruction = await marketplaceModule['module']['getPurchaseServiceInstruction']({
        serviceListing: data.listingAddress as Address,
        servicePurchase: purchaseAddress as Address,
        buyer: mockSigner,
        listingId: 0, // Would need actual listing ID from state
        quantity: data.quantity || 1,
        requirements: data.customRequirements ? [data.customRequirements] : [],
        customInstructions: data.customRequirements || '',
        deadline: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60, // 30 days
      })

      // Execute the instruction
      const result = await marketplaceModule['module']['execute'](
        'purchaseService',
        () => instruction,
        [mockSigner]
      )

      return {
        transactionId: result,
        purchaseId: purchaseAddress,
        status: 'confirmed',
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketplace'] })
      toast.success('Purchase completed successfully!')
    },
    onError: (error) => {
      console.error('Failed to purchase listing:', error)
      toast.error('Failed to complete purchase')
    },
  })
}

// Hook for creating job postings
export function useCreateJobPosting() {
  const queryClient = useQueryClient()
  const { publicKey, signTransaction } = useWallet()

  return useMutation({
    mutationFn: async (data: {
      title: string
      description: string
      budget: bigint
      duration: number
      requiredSkills: string[]
      category: string
    }) => {
      if (!publicKey || !signTransaction) {
        throw new Error('Wallet not connected')
      }

      const client = getGhostSpeakClient()
      const marketplaceBuilder = client.marketplace()

      const jobBuilder = marketplaceBuilder.job()
      const mockSigner = { address: publicKey.toBase58(), signTransaction }

      const result = await jobBuilder['module']['createJobPosting']({
        signer: mockSigner,
        title: data.title,
        description: data.description,
        budget: data.budget,
        duration: data.duration,
        requiredSkills: data.requiredSkills,
        category: data.category,
      })

      return {
        address: `job_${publicKey.toBase58()}_${data.title}`,
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
      const marketplaceModule = client.marketplace()

      const jobPostings = await marketplaceModule['module']['getAllJobPostings']()

      return jobPostings.map((job: { address: Address; data: Record<string, unknown> }) => ({
        address: job.address,
        title: job.data.title || 'Untitled Job',
        description: job.data.description || '',
        budget: BigInt((job.data.budget as number) || 0),
        employer: job.data.employer || job.address,
        requiredSkills: job.data.skillsNeeded || [],
        deadline: new Date(Number(job.data.deadline) * 1000),
        category: job.data.jobType || 'Other',
        applications: 0, // TODO: Get application count
        createdAt: new Date(), // TODO: Get from blockchain
      }))
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
