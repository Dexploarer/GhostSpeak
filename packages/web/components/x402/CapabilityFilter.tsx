/**
 * x402 Capability Filter Component
 *
 * Advanced filtering for agent discovery
 */

'use client'

import React, { useState } from 'react'
import { Search, Filter, SlidersHorizontal, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import type { AgentSearchParams } from '@/lib/ghostspeak'

interface CapabilityFilterProps {
  onFilterChange: (filters: AgentSearchParams) => void
  popularCapabilities?: string[]
}

export function CapabilityFilter({
  onFilterChange,
  popularCapabilities = [
    'text-generation',
    'code-generation',
    'data-analysis',
    'image-processing',
    'translation'
  ]
}: CapabilityFilterProps): React.JSX.Element {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCapability, setSelectedCapability] = useState<string>()
  const [priceRange, setPriceRange] = useState<{ min?: number; max?: number }>({})
  const [sortBy, setSortBy] = useState<'price_asc' | 'price_desc' | 'reputation' | 'calls'>(
    'reputation'
  )
  const [showAdvanced, setShowAdvanced] = useState(false)

  const sortOptions = [
    { value: 'reputation', label: 'Highest Rated' },
    { value: 'calls', label: 'Most Popular' },
    { value: 'price_asc', label: 'Price: Low to High' },
    { value: 'price_desc', label: 'Price: High to Low' }
  ]

  const handleApplyFilters = (): void => {
    const filters: AgentSearchParams = {
      sortBy
    }

    if (searchTerm) {
      filters.search = searchTerm
    }

    if (selectedCapability) {
      filters.capability = selectedCapability
    }

    if (priceRange.min !== undefined) {
      filters.minPrice = BigInt(Math.floor(priceRange.min * 1e9)) // Convert to lamports
    }

    if (priceRange.max !== undefined) {
      filters.maxPrice = BigInt(Math.floor(priceRange.max * 1e9))
    }

    onFilterChange(filters)
  }

  const handleClearFilters = (): void => {
    setSearchTerm('')
    setSelectedCapability(undefined)
    setPriceRange({})
    setSortBy('reputation')
    onFilterChange({ sortBy: 'reputation' })
  }

  const hasActiveFilters =
    searchTerm || selectedCapability || priceRange.min !== undefined || priceRange.max !== undefined

  return (
    <div className="space-y-4">
      {/* Main Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 sm:w-5 sm:h-5" />
          <Input
            type="text"
            placeholder="Search capabilities..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value)
              handleApplyFilters()
            }}
            className="pl-9 sm:pl-10 focus-ring"
          />
        </div>

        <div className="flex gap-2 sm:gap-3">
          {/* Sort Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2 flex-1 sm:flex-none focus-ring">
                <SlidersHorizontal className="w-4 h-4" />
                <span className="hidden sm:inline">Sort</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel>Sort by</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {sortOptions.map((option) => (
                <DropdownMenuItem
                  key={option.value}
                  onClick={() => {
                    setSortBy(option.value as typeof sortBy)
                    handleApplyFilters()
                  }}
                  className={sortBy === option.value ? 'bg-gray-100 dark:bg-gray-800' : ''}
                >
                  {option.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Advanced Filters Toggle */}
          <Button
            variant="outline"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="gap-2 focus-ring"
          >
            <Filter className="w-4 h-4" />
            <span className="hidden sm:inline">Filters</span>
          </Button>
        </div>
      </div>

      {/* Popular Capabilities */}
      <div>
        <Label className="text-xs text-gray-500 dark:text-gray-400 mb-2 block">
          Popular Capabilities
        </Label>
        <div className="flex flex-wrap gap-2">
          {popularCapabilities.map((capability) => (
            <Badge
              key={capability}
              variant={selectedCapability === capability ? 'default' : 'outline'}
              className="cursor-pointer transition-all duration-200 hover:scale-105 focus-ring"
              onClick={() => {
                setSelectedCapability(
                  selectedCapability === capability ? undefined : capability
                )
                handleApplyFilters()
              }}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  setSelectedCapability(
                    selectedCapability === capability ? undefined : capability
                  )
                  handleApplyFilters()
                }
              }}
            >
              {capability}
            </Badge>
          ))}
        </div>
      </div>

      {/* Advanced Filters */}
      {showAdvanced && (
        <div className="glass rounded-lg p-4 space-y-4">
          <h3 className="font-medium text-sm">Advanced Filters</h3>

          {/* Price Range */}
          <div>
            <Label className="text-xs text-gray-500 dark:text-gray-400 mb-2 block">
              Price Range (SOL per call)
            </Label>
            <div className="grid grid-cols-2 gap-2">
              <Input
                type="number"
                placeholder="Min"
                step="0.000001"
                min="0"
                value={priceRange.min ?? ''}
                onChange={(e) => {
                  setPriceRange((prev) => ({
                    ...prev,
                    min: e.target.value ? Math.max(0, parseFloat(e.target.value)) : undefined
                  }))
                }}
                className="text-sm focus-ring"
              />
              <Input
                type="number"
                placeholder="Max"
                step="0.000001"
                min="0"
                value={priceRange.max ?? ''}
                onChange={(e) => {
                  setPriceRange((prev) => ({
                    ...prev,
                    max: e.target.value ? Math.max(0, parseFloat(e.target.value)) : undefined
                  }))
                }}
                className="text-sm focus-ring"
              />
            </div>
          </div>

          {/* Apply/Clear Buttons */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleClearFilters}
              disabled={!hasActiveFilters}
              className="flex-1 gap-1"
            >
              <X className="w-4 h-4" />
              Clear
            </Button>
            <Button
              variant="gradient"
              onClick={handleApplyFilters}
              className="flex-1 gap-1"
            >
              <Filter className="w-4 h-4" />
              Apply Filters
            </Button>
          </div>
        </div>
      )}

      {/* Active Filter Pills */}
      {hasActiveFilters && (
        <div className="flex flex-wrap gap-2">
          {selectedCapability && (
            <Badge variant="secondary" className="gap-1">
              Capability: {selectedCapability}
              <button
                onClick={() => {
                  setSelectedCapability(undefined)
                  handleApplyFilters()
                }}
                className="ml-1 hover:text-red-500"
              >
                ×
              </button>
            </Badge>
          )}
          {searchTerm && (
            <Badge variant="secondary" className="gap-1">
              Search: &ldquo;{searchTerm}&rdquo;
              <button
                onClick={() => {
                  setSearchTerm('')
                  handleApplyFilters()
                }}
                className="ml-1 hover:text-red-500"
              >
                ×
              </button>
            </Badge>
          )}
          {(priceRange.min !== undefined || priceRange.max !== undefined) && (
            <Badge variant="secondary" className="gap-1">
              Price: {priceRange.min ?? 0} - {priceRange.max ?? '∞'} SOL
              <button
                onClick={() => {
                  setPriceRange({})
                  handleApplyFilters()
                }}
                className="ml-1 hover:text-red-500"
              >
                ×
              </button>
            </Badge>
          )}
        </div>
      )}
    </div>
  )
}
