/**
 * Marketplace Listing Card Component
 * Displays a service listing with purchase capabilities
 */
import React from 'react';
import { ServiceListingAccount } from '@ghostspeak/sdk';
export interface MarketplaceListingCardProps {
    listing: ServiceListingAccount;
    onPurchase?: (listingId: bigint, quantity: number) => Promise<void>;
    onViewDetails?: (listing: ServiceListingAccount) => void;
    className?: string;
}
export declare const MarketplaceListingCard: React.FC<MarketplaceListingCardProps>;
//# sourceMappingURL=MarketplaceListingCard.d.ts.map