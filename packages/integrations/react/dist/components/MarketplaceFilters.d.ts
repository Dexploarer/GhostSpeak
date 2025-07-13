/**
 * Marketplace Filters Component
 * Provides comprehensive filtering and search capabilities
 */
import React from 'react';
import { MarketplaceFilters as IMarketplaceFilters } from '@ghostspeak/sdk';
export interface MarketplaceFiltersProps {
    filters: IMarketplaceFilters;
    onFiltersChange: (filters: IMarketplaceFilters) => void;
    onSearch: (query: string) => void;
    className?: string;
}
export declare const MarketplaceFilters: React.FC<MarketplaceFiltersProps>;
//# sourceMappingURL=MarketplaceFilters.d.ts.map