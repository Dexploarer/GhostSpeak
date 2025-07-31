'use client'

import React, { useState } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import { Plus, Store, Search, Filter, SlidersHorizontal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { ListingCard } from '@/components/marketplace/ListingCard'
import { CreateListingForm } from '@/components/marketplace/CreateListingForm'
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
    error,
  } = useMarketplaceListings({
    category: selectedCategory === 'All' ? undefined : selectedCategory,
    search: searchTerm || undefined,
    minPrice: priceRange.min,
    maxPrice: priceRange.max,
    sortBy,
  })

  const sortOptions = [
    { value: 'newest', label: 'Newest First' },
    { value: 'price_low', label: 'Price: Low to High' },
    { value: 'price_high', label: 'Price: High to Low' },
    { value: 'rating', label: 'Highest Rated' },
    { value: 'popular', label: 'Most Popular' },
  ]

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold gradient-text">Marketplace</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Discover and purchase AI services from the community
          </p>
        </div>
        <Dialog open={showCreateForm} onOpenChange={setShowCreateForm}>
          <DialogTrigger asChild>
            <Button variant="gradient" disabled={!publicKey} className="gap-2">
              <Plus className="w-5 h-5" />
              Create Listing
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Listing</DialogTitle>
            </DialogHeader>
            <CreateListingForm onSuccess={() => setShowCreateForm(false)} />
          </DialogContent>
        </Dialog>
      </div>

      {/* Search and Filters */}
      <div className="glass rounded-xl p-6 mb-6">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <Input
              type="text"
              placeholder="Search services..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Sort */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2">
                <SlidersHorizontal className="w-4 h-4" />
                Sort: {sortOptions.find((opt) => opt.value === sortBy)?.label}
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
          <Button variant="outline" onClick={() => setShowFilters(!showFilters)} className="gap-2">
            <Filter className="w-4 h-4" />
            Filters
          </Button>
        </div>

        {/* Expandable Filters */}
        {showFilters && (
          <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-800">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Categories */}
              <div>
                <h3 className="font-medium mb-3">Categories</h3>
                <div className="flex flex-wrap gap-2">
                  {marketplaceCategories.map((category) => (
                    <Badge
                      key={category}
                      variant={selectedCategory === category ? 'default' : 'outline'}
                      className="cursor-pointer transition-colors"
                      onClick={() => setSelectedCategory(category)}
                    >
                      {category}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Price Range */}
              <div>
                <h3 className="font-medium mb-3">Price Range (SOL)</h3>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    placeholder="Min"
                    step="0.001"
                    value={priceRange.min || ''}
                    onChange={(e) =>
                      setPriceRange((prev) => ({
                        ...prev,
                        min: e.target.value ? parseFloat(e.target.value) : undefined,
                      }))
                    }
                  />
                  <Input
                    type="number"
                    placeholder="Max"
                    step="0.001"
                    value={priceRange.max || ''}
                    onChange={(e) =>
                      setPriceRange((prev) => ({
                        ...prev,
                        max: e.target.value ? parseFloat(e.target.value) : undefined,
                      }))
                    }
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
                  className="w-full"
                >
                  Clear Filters
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

      {/* Results */}
      <div className="mb-6">
        <p className="text-gray-600 dark:text-gray-400">
          {isLoading ? 'Loading...' : `${listings.length} services found`}
        </p>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-2 text-gray-600 dark:text-gray-400">Loading services...</p>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="glass rounded-xl p-12 text-center">
          <p className="text-red-500">Failed to load services. Please try again.</p>
        </div>
      )}

      {/* Listings Grid */}
      {!publicKey ? (
        <div className="glass rounded-xl p-12 text-center">
          <Store className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <h3 className="text-xl font-semibold mb-2">Connect Your Wallet</h3>
          <p className="text-gray-600 dark:text-gray-400">
            Connect your wallet to browse and purchase services
          </p>
        </div>
      ) : !isLoading && !error ? (
        listings.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {listings.map((listing: MarketplaceListing) => (
              <ListingCard key={listing.address} listing={listing} />
            ))}
          </div>
        ) : (
          <div className="glass rounded-xl p-12 text-center">
            <Store className="w-16 h-16 mx-auto text-gray-400 mb-4" />
            <h3 className="text-xl font-semibold mb-2">No Services Found</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              {searchTerm || selectedCategory !== 'All' || priceRange.min || priceRange.max
                ? 'Try adjusting your search and filters'
                : 'Be the first to create a service listing'}
            </p>
            {!searchTerm && selectedCategory === 'All' && !priceRange.min && !priceRange.max && (
              <Button variant="gradient" onClick={() => setShowCreateForm(true)}>
                Create First Listing
              </Button>
            )}
          </div>
        )
      ) : null}
    </div>
  )
}
