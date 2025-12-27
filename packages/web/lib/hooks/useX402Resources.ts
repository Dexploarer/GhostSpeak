/**
 * Hook for fetching real x402 resources from the API
 */

import { useQuery } from '@tanstack/react-query'

// =====================================================
// TYPES
// =====================================================

export interface X402Resource {
  id: string
  url: string
  name: string
  description?: string
  category?: string
  tags: string[]
  network: string
  priceUsd?: string
  maxAmount?: string
  facilitatorId?: string
  isActive: boolean
  isVerified: boolean
  isExternal?: boolean
  createdAt?: string
  updatedAt?: string
}

export interface X402ResourcesResponse {
  resources: X402Resource[]
  total: number
  page: number
  pageSize: number
  hasMore: boolean
  sources: {
    heurist: number
    ghostspeak: number
    other: number
  }
}

export interface X402ResourceFilters {
  query?: string
  network?: string
  category?: string
  facilitator?: string
  external?: boolean
  page?: number
  pageSize?: number
}

// =====================================================
// CATEGORIES
// =====================================================

export const X402_CATEGORIES = [
  { id: 'all', label: 'All Services', icon: '🌐' },
  { id: 'research', label: 'AI Research', icon: '🔬' },
  { id: 'web-scraping', label: 'Web Scraping', icon: '🌍' },
  { id: 'video-generation', label: 'Video Generation', icon: '🎬' },
  { id: 'social-data', label: 'Social Data', icon: '📱' },
  { id: 'blockchain-data', label: 'Blockchain Data', icon: '⛓️' },
  { id: 'wallet-analysis', label: 'Wallet Analysis', icon: '👛' },
  { id: 'defi', label: 'DeFi Data', icon: '💰' },
  { id: 'finance', label: 'Finance', icon: '📈' },
  { id: 'news', label: 'News', icon: '📰' },
  { id: 'storage', label: 'Storage', icon: '💾' },
  { id: 'security', label: 'Security', icon: '🔒' },
  { id: 'text-generation', label: 'Text Generation', icon: '✍️' },
  { id: 'other', label: 'Other', icon: '📦' },
] as const

export type X402Category = (typeof X402_CATEGORIES)[number]['id']

// =====================================================
// HOOKS
// =====================================================

export function useX402Resources(filters?: X402ResourceFilters) {
  return useQuery({
    queryKey: ['x402-resources', filters],
    queryFn: async (): Promise<X402ResourcesResponse> => {
      const params = new URLSearchParams()
      
      if (filters?.query) params.set('q', filters.query)
      if (filters?.network) params.set('network', filters.network)
      if (filters?.category && filters.category !== 'all') params.set('category', filters.category)
      if (filters?.facilitator) params.set('facilitator', filters.facilitator)
      if (filters?.external) params.set('external', 'true')
      if (filters?.page) params.set('page', filters.page.toString())
      if (filters?.pageSize) params.set('pageSize', filters.pageSize.toString())

      const response = await fetch(`/api/x402/resources?${params.toString()}`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch resources')
      }

      return response.json()
    },
    staleTime: 60 * 1000, // 1 minute
    refetchOnWindowFocus: false,
  })
}

export function useX402ResourcesByCategory(category: X402Category) {
  return useX402Resources({ 
    category: category === 'all' ? undefined : category,
    pageSize: 100 
  })
}

export function useX402ResourceSearch(query: string) {
  return useX402Resources({ query, pageSize: 50 })
}

// =====================================================
// HELPERS
// =====================================================

export function getCategoryLabel(categoryId: string): string {
  const category = X402_CATEGORIES.find((c) => c.id === categoryId)
  return category?.label ?? categoryId
}

export function getCategoryIcon(categoryId: string): string {
  const category = X402_CATEGORIES.find((c) => c.id === categoryId)
  return category?.icon ?? '📦'
}

export function formatPrice(priceUsd: string | undefined): string {
  if (!priceUsd || priceUsd === 'varies') return 'varies'
  const price = parseFloat(priceUsd)
  if (price < 0.01) return `$${price.toFixed(4)}`
  if (price < 1) return `$${price.toFixed(2)}`
  return `$${price.toFixed(2)}`
}
