'use client'

import React, { useState } from 'react'
import { Search, SlidersHorizontal } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface AgentSearchBarProps {
  onSearch: (query: string) => void
  onFilterChange: (filters: {
    category: string
    minScore: number
    maxPrice: bigint | undefined
  }) => void
  filters: {
    category: string
    minScore: number
    maxPrice: bigint | undefined
  }
}

const CATEGORIES = [
  'All Categories',
  'Data Analysis',
  'Content Creation',
  'Code Generation',
  'Image Generation',
  'Translation',
  'Research',
  'Customer Support',
  'Marketing',
  'Other',
]

const SCORE_RANGES = [
  { label: 'All Scores', min: 0 },
  { label: 'Newcomer (0-200)', min: 0 },
  { label: 'Bronze (200-500)', min: 200 },
  { label: 'Silver (500-750)', min: 500 },
  { label: 'Gold (750-900)', min: 750 },
  { label: 'Platinum (900+)', min: 900 },
]

export function AgentSearchBar({ onSearch, onFilterChange, filters }: AgentSearchBarProps) {
  const [searchInput, setSearchInput] = useState('')
  const [showFilters, setShowFilters] = useState(false)

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    onSearch(searchInput)
  }

  return (
    <Card className="p-6">
      {/* Search Bar */}
      <form onSubmit={handleSearch} className="flex gap-3 mb-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            placeholder="Search agents by name, capability, or category..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button type="submit" className="bg-purple-600 hover:bg-purple-700">
          Search
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center gap-2"
        >
          <SlidersHorizontal className="w-4 h-4" />
          Filters
          {(filters.category || filters.minScore > 0) && (
            <Badge variant="default" className="ml-1 bg-purple-600">
              Active
            </Badge>
          )}
        </Button>
      </form>

      {/* Filters Panel */}
      {showFilters && (
        <div className="grid md:grid-cols-3 gap-4 pt-4 border-t border-border">
          {/* Category Filter */}
          <div>
            <label className="text-sm font-medium mb-2 block">Category</label>
            <select
              className="w-full px-3 py-2 rounded-md border border-input bg-background text-foreground"
              value={filters.category || 'All Categories'}
              onChange={(e) =>
                onFilterChange({
                  ...filters,
                  category: e.target.value === 'All Categories' ? '' : e.target.value,
                })
              }
            >
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Ghost Score Range */}
          <div>
            <label className="text-sm font-medium mb-2 block">Minimum Ghost Score</label>
            <select
              className="w-full px-3 py-2 rounded-md border border-input bg-background text-foreground"
              value={filters.minScore}
              onChange={(e) =>
                onFilterChange({
                  ...filters,
                  minScore: Number(e.target.value),
                })
              }
            >
              {SCORE_RANGES.map((range) => (
                <option key={range.label} value={range.min}>
                  {range.label}
                </option>
              ))}
            </select>
          </div>

          {/* Price Range */}
          <div>
            <label className="text-sm font-medium mb-2 block">Max Price (SOL)</label>
            <Input
              type="number"
              placeholder="Any price"
              step="0.01"
              min="0"
              onChange={(e) => {
                const value = e.target.value
                onFilterChange({
                  ...filters,
                  maxPrice: value ? BigInt(Math.floor(parseFloat(value) * 1e9)) : undefined,
                })
              }}
            />
          </div>
        </div>
      )}

      {/* Active Filters Display */}
      {(filters.category || filters.minScore > 0) && (
        <div className="flex gap-2 mt-4 pt-4 border-t border-border flex-wrap">
          <span className="text-sm text-muted-foreground">Active filters:</span>
          {filters.category && (
            <Badge
              variant="secondary"
              className="cursor-pointer"
              onClick={() => onFilterChange({ ...filters, category: '' })}
            >
              {filters.category} ✕
            </Badge>
          )}
          {filters.minScore > 0 && (
            <Badge
              variant="secondary"
              className="cursor-pointer"
              onClick={() => onFilterChange({ ...filters, minScore: 0 })}
            >
              Score ≥ {filters.minScore} ✕
            </Badge>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() =>
              onFilterChange({
                category: '',
                minScore: 0,
                maxPrice: undefined,
              })
            }
            className="text-xs"
          >
            Clear all
          </Button>
        </div>
      )}
    </Card>
  )
}
