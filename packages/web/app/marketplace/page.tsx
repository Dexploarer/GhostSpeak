'use client'

import React, { useState } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import { Plus, Store, Search, Filter, SlidersHorizontal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { ListingCard } from '@/components/marketplace/ListingCard'
import { CreateListingForm } from '@/components/marketplace/CreateListingForm'
import { ListingGridSkeleton } from '@/components/marketplace/ListingCardSkeleton'
import {
  useMarketplaceListings,
  marketplaceCategories,
  type MarketplaceListing,
} from '@/lib/queries/marketplace'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export default function MarketplacePage(): React.JSX.Element {
  const { publicKey } = useWallet()
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [sortBy, setSortBy] = useState<
    'newest' | 'price_low' | 'price_high' | 'rating' | 'popular'
  >('newest')
  const [priceRange, setPriceRange] = useState<{ min?: number; max?: number }>({})
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [showFilters, setShowFilters] = useState(false)

  const {
    data: listings = [],
    isLoading,
    isError,
    isPending,
    isFetching,
  } = useMarketplaceListings({
    category: selectedCategory === 'All' ? undefined : selectedCategory,
    search: searchTerm || undefined,
    minPrice: priceRange.min,
    maxPrice: priceRange.max,
    sortBy,
  })

  // Distinguish between initial loading and empty results
  const isInitialLoading = isPending || (isLoading && listings.length === 0)
  const hasNoResults = !isLoading && !isError && listings.length === 0
  const hasFilters = selectedCategory !== 'All' || searchTerm || priceRange.min || priceRange.max

  const sortOptions = [
    { value: 'newest', label: 'Newest First' },
    { value: 'price_low', label: 'Price: Low to High' },
    { value: 'price_high', label: 'Price: High to Low' },
    { value: 'rating', label: 'Highest Rated' },
    { value: 'popular', label: 'Most Popular' },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-900">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 xl:px-8 py-4 sm:py-6 lg:py-8">
        {/* Header */}
        <div className="flex flex-col space-y-4 sm:space-y-0 sm:flex-row sm:justify-between sm:items-center mb-8 sm:mb-10">
          <div className="text-center sm:text-left">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold gradient-text mb-3">
              Marketplace
            </h1>
            <p className="text-base sm:text-lg text-gray-600 dark:text-gray-400 max-w-md">
              Discover and purchase AI services from the community
            </p>
          </div>
          <Dialog open={showCreateForm} onOpenChange={setShowCreateForm}>
            <DialogTrigger asChild>
              <Button
                variant="gradient"
                disabled={!publicKey}
                className="gap-2 w-full sm:w-auto button-hover-lift shadow-lg"
                size="lg"
              >
                <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
                <span className="hidden sm:inline">Create Listing</span>
                <span className="sm:hidden">Create</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="mx-3 sm:mx-0 max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create New Listing</DialogTitle>
              </DialogHeader>
              <CreateListingForm onSuccess={() => setShowCreateForm(false)} />
            </DialogContent>
          </Dialog>
        </div>

        {/* Search and Filters */}
        <div className="rounded-2xl p-6 sm:p-8 mb-8 bg-white dark:bg-gray-900 shadow-soft border border-gray-100 dark:border-gray-800">
          <div className="flex flex-col space-y-3 sm:space-y-0 sm:flex-row sm:gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 sm:w-5 sm:h-5" />
              <Input
                type="text"
                placeholder="Search services..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 sm:pl-10 h-10 sm:h-11 text-sm sm:text-base focus-ring"
              />
            </div>

            <div className="flex gap-2 sm:gap-3">
              {/* Sort */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    className="gap-2 flex-1 sm:flex-none min-w-0 focus-ring"
                  >
                    <SlidersHorizontal className="w-4 h-4 shrink-0" />
                    <span className="truncate">
                      <span className="hidden sm:inline">Sort: </span>
                      <span className="sm:hidden">Sort</span>
                      <span className="hidden lg:inline">
                        {sortOptions.find((opt) => opt.value === sortBy)?.label}
                      </span>
                    </span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuLabel>Sort by</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {sortOptions.map((option) => (
                    <DropdownMenuItem
                      key={option.value}
                      onClick={() => setSortBy(option.value as typeof sortBy)}
                      className={sortBy === option.value ? 'bg-gray-100 dark:bg-gray-800' : ''}
                    >
                      {option.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Filters Toggle */}
              <Button
                variant="outline"
                onClick={() => setShowFilters(!showFilters)}
                className="gap-2 focus-ring"
              >
                <Filter className="w-4 h-4" />
                <span className="hidden sm:inline">Filters</span>
              </Button>
            </div>
          </div>

          {/* Expandable Filters */}
          {showFilters && (
            <div className="mt-4 sm:mt-6 pt-4 sm:pt-6 border-t border-gray-200 dark:border-gray-800">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                {/* Categories */}
                <div className="sm:col-span-2 lg:col-span-1">
                  <h3 className="font-medium mb-3 text-sm sm:text-base">Categories</h3>
                  <div className="flex flex-wrap gap-1.5 sm:gap-2">
                    {marketplaceCategories.map((category) => (
                      <Badge
                        key={category}
                        variant={selectedCategory === category ? 'default' : 'outline'}
                        className="cursor-pointer transition-all duration-200 hover:scale-105 text-xs sm:text-sm focus-ring"
                        onClick={() => setSelectedCategory(category)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault()
                            setSelectedCategory(category)
                          }
                        }}
                      >
                        {category}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Price Range */}
                <div>
                  <h3 className="font-medium mb-3 text-sm sm:text-base">Price Range (SOL)</h3>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      placeholder="Min"
                      step="0.001"
                      min="0"
                      value={priceRange.min || ''}
                      onChange={(e) =>
                        setPriceRange((prev) => ({
                          ...prev,
                          min: e.target.value ? Math.max(0, parseFloat(e.target.value)) : undefined,
                        }))
                      }
                      className="text-sm focus-ring"
                    />
                    <Input
                      type="number"
                      placeholder="Max"
                      step="0.001"
                      min="0"
                      value={priceRange.max || ''}
                      onChange={(e) =>
                        setPriceRange((prev) => ({
                          ...prev,
                          max: e.target.value ? Math.max(0, parseFloat(e.target.value)) : undefined,
                        }))
                      }
                      className="text-sm focus-ring"
                    />
                  </div>
                </div>

                {/* Clear Filters */}
                <div className="flex items-end">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSelectedCategory('All')
                      setPriceRange({})
                      setSearchTerm('')
                      setSortBy('newest')
                    }}
                    className="w-full focus-ring button-hover-lift"
                  >
                    Clear All Filters
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Active Filters */}
        {(selectedCategory !== 'All' || searchTerm || priceRange.min || priceRange.max) && (
          <div className="flex flex-wrap gap-2 mb-6">
            {selectedCategory !== 'All' && (
              <Badge variant="secondary" className="gap-1">
                Category: {selectedCategory}
                <button
                  onClick={() => setSelectedCategory('All')}
                  className="ml-1 hover:text-red-500"
                >
                  ×
                </button>
              </Badge>
            )}
            {searchTerm && (
              <Badge variant="secondary" className="gap-1">
                Search: &ldquo;{searchTerm}&rdquo;
                <button onClick={() => setSearchTerm('')} className="ml-1 hover:text-red-500">
                  ×
                </button>
              </Badge>
            )}
            {(priceRange.min || priceRange.max) && (
              <Badge variant="secondary" className="gap-1">
                Price: {priceRange.min || 0} - {priceRange.max || '∞'} SOL
                <button onClick={() => setPriceRange({})} className="ml-1 hover:text-red-500">
                  ×
                </button>
              </Badge>
            )}
          </div>
        )}

        {/* Results Header with Real-time Indicator */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <p className="text-gray-600 dark:text-gray-400">
              {isInitialLoading
                ? 'Loading services...'
                : `${listings.length} service${listings.length !== 1 ? 's' : ''} found`}
            </p>
            {isFetching && !isLoading && (
              <div className="flex items-center gap-2 text-sm text-purple-600 dark:text-purple-400">
                <div className="w-2 h-2 bg-purple-600 rounded-full animate-pulse"></div>
                <span>Syncing</span>
              </div>
            )}
          </div>
          {hasFilters && !isInitialLoading && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSelectedCategory('All')
                setPriceRange({})
                setSearchTerm('')
                setSortBy('newest')
              }}
              className="text-sm"
            >
              Clear all filters
            </Button>
          )}
        </div>

        {/* Main Content Area */}
        {!publicKey ? (
          <div className="glass rounded-xl p-12 text-center card-hover">
            <Store className="w-16 h-16 mx-auto text-gray-400 mb-4" />
            <h3 className="text-xl font-semibold mb-2">Connect Your Wallet</h3>
            <p className="text-gray-600 dark:text-gray-400">
              Connect your wallet to browse and purchase services
            </p>
          </div>
        ) : isError ? (
          <div className="glass rounded-xl p-12 text-center">
            <div className="w-16 h-16 mx-auto bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mb-4">
              <Store className="w-8 h-8 text-red-500" />
            </div>
            <h3 className="text-xl font-semibold mb-2 text-red-600 dark:text-red-400">
              Failed to Load Services
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Unable to fetch marketplace data. Please check your connection and try again.
            </p>
            <Button variant="outline" onClick={() => window.location.reload()}>
              Retry
            </Button>
          </div>
        ) : isInitialLoading ? (
          <ListingGridSkeleton count={6} />
        ) : hasNoResults ? (
          <div className="glass rounded-xl p-12 text-center card-hover">
            <Store className="w-16 h-16 mx-auto text-gray-400 mb-4" />
            <h3 className="text-xl font-semibold mb-2">
              {hasFilters ? 'No Services Match Your Filters' : 'No Services Available'}
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              {hasFilters
                ? 'Try adjusting your search criteria or filters to find more services'
                : 'Be the first to create a service listing and start earning'}
            </p>
            {!hasFilters && (
              <Button
                variant="gradient"
                onClick={() => setShowCreateForm(true)}
                className="button-hover-lift"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create First Listing
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
            {listings.map((listing: MarketplaceListing) => (
              <ListingCard key={listing.address} listing={listing} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
