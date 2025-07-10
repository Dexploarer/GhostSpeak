/**
 * Marketplace Filters Component
 * Provides comprehensive filtering and search capabilities
 */

import React, { useState } from 'react';
import { MarketplaceFilters as IMarketplaceFilters, ServiceListingStatus } from '@podai/sdk';

export interface MarketplaceFiltersProps {
  filters: IMarketplaceFilters;
  onFiltersChange: (filters: IMarketplaceFilters) => void;
  onSearch: (query: string) => void;
  className?: string;
}

const CATEGORIES = [
  'analytics', 'productivity', 'creative', 'security', 'data', 
  'trading', 'automation', 'ai', 'content', 'development'
];

const SORT_OPTIONS = [
  { value: 'created', label: 'Recently Listed' },
  { value: 'price', label: 'Price' },
  { value: 'rating', label: 'Rating' },
  { value: 'sales', label: 'Sales' },
  { value: 'updated', label: 'Recently Updated' },
];

export const MarketplaceFilters: React.FC<MarketplaceFiltersProps> = ({
  filters,
  onFiltersChange,
  onSearch,
  className = '',
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(searchQuery);
  };

  const updateFilter = (key: keyof IMarketplaceFilters, value: any) => {
    onFiltersChange({
      ...filters,
      [key]: value,
    });
  };

  const formatSOL = (lamports?: bigint) => {
    if (!lamports) return '';
    return (Number(lamports) / 1e9).toString();
  };

  const parseSOL = (value: string): bigint | undefined => {
    const num = parseFloat(value);
    return isNaN(num) ? undefined : BigInt(Math.floor(num * 1e9));
  };

  const clearFilters = () => {
    onFiltersChange({
      sortBy: 'created',
      sortOrder: 'desc',
      status: [ServiceListingStatus.Active],
    });
    setSearchQuery('');
  };

  return (
    <div className={`bg-white border border-gray-200 rounded-lg ${className}`}>
      {/* Search Bar */}
      <div className="p-4 border-b border-gray-100">
        <form onSubmit={handleSearchSubmit} className="flex gap-2">
          <input
            type="text"
            placeholder="Search services..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Search
          </button>
        </form>
      </div>

      {/* Filter Toggle */}
      <div className="p-4 border-b border-gray-100">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center justify-between w-full text-left"
        >
          <span className="font-medium text-gray-900">Filters</span>
          <span className="text-gray-500">
            {isExpanded ? '−' : '+'}
          </span>
        </button>
      </div>

      {/* Filters */}
      {isExpanded && (
        <div className="p-4 space-y-4">
          {/* Sort By */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Sort By
            </label>
            <div className="flex gap-2">
              <select
                value={filters.sortBy || 'created'}
                onChange={(e) => updateFilter('sortBy', e.target.value as any)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {SORT_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <select
                value={filters.sortOrder || 'desc'}
                onChange={(e) => updateFilter('sortOrder', e.target.value as 'asc' | 'desc')}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="desc">High to Low</option>
                <option value="asc">Low to High</option>
              </select>
            </div>
          </div>

          {/* Categories */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Categories
            </label>
            <div className="grid grid-cols-2 gap-2">
              {CATEGORIES.map(category => (
                <label key={category} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={filters.serviceTypes?.includes(category) || false}
                    onChange={(e) => {
                      const current = filters.serviceTypes || [];
                      const updated = e.target.checked
                        ? [...current, category]
                        : current.filter(c => c !== category);
                      updateFilter('serviceTypes', updated.length > 0 ? updated : undefined);
                    }}
                    className="mr-2 rounded"
                  />
                  <span className="text-sm text-gray-700 capitalize">{category}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Price Range */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Price Range (SOL)
            </label>
            <div className="flex gap-2 items-center">
              <input
                type="number"
                placeholder="Min"
                step="0.1"
                min="0"
                value={formatSOL(filters.minPrice)}
                onChange={(e) => updateFilter('minPrice', parseSOL(e.target.value))}
                className="w-24 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-gray-500">to</span>
              <input
                type="number"
                placeholder="Max"
                step="0.1"
                min="0"
                value={formatSOL(filters.maxPrice)}
                onChange={(e) => updateFilter('maxPrice', parseSOL(e.target.value))}
                className="w-24 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Rating */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Minimum Rating
            </label>
            <select
              value={filters.minRating || ''}
              onChange={(e) => updateFilter('minRating', e.target.value ? parseFloat(e.target.value) : undefined)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Any Rating</option>
              <option value="4.5">4.5+ Stars</option>
              <option value="4.0">4.0+ Stars</option>
              <option value="3.5">3.5+ Stars</option>
              <option value="3.0">3.0+ Stars</option>
            </select>
          </div>

          {/* Availability */}
          <div>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={filters.availableOnly || false}
                onChange={(e) => updateFilter('availableOnly', e.target.checked || undefined)}
                className="mr-2 rounded"
              />
              <span className="text-sm text-gray-700">Available now only</span>
            </label>
          </div>

          {/* Status */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Status
            </label>
            <div className="space-y-1">
              {Object.entries(ServiceListingStatus).map(([key, value]) => {
                if (typeof value === 'number') {
                  return (
                    <label key={key} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={filters.status?.includes(value) || false}
                        onChange={(e) => {
                          const current = filters.status || [];
                          const updated = e.target.checked
                            ? [...current, value]
                            : current.filter(s => s !== value);
                          updateFilter('status', updated.length > 0 ? updated : undefined);
                        }}
                        className="mr-2 rounded"
                      />
                      <span className="text-sm text-gray-700">{key}</span>
                    </label>
                  );
                }
                return null;
              })}
            </div>
          </div>

          {/* Clear Filters */}
          <div className="pt-4 border-t border-gray-100">
            <button
              onClick={clearFilters}
              className="w-full px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
            >
              Clear All Filters
            </button>
          </div>
        </div>
      )}
    </div>
  );
};