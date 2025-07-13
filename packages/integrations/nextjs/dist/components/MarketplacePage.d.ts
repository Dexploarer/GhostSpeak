/**
 * Next.js Marketplace Page Component
 * Server-side rendered marketplace with SEO optimization
 */
import React from 'react';
import { GetServerSideProps } from 'next';
import type { ServiceListingAccount } from '@podai/sdk';
interface MarketplacePageProps {
    initialListings?: ServiceListingAccount[];
    initialStats?: {
        totalListings: number;
        totalVolume: string;
        topCategories: Array<{
            category: string;
            count: number;
        }>;
    };
    rpcUrl?: string;
    programId?: string;
}
export declare const MarketplacePage: React.FC<MarketplacePageProps>;
export declare const getServerSideProps: GetServerSideProps<MarketplacePageProps>;
export default MarketplacePage;
//# sourceMappingURL=MarketplacePage.d.ts.map