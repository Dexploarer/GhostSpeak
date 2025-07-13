/**
 * Comprehensive Marketplace Component
 * Complete marketplace functionality with listing, browsing, and purchasing
 */
import React from 'react';
import type { KeyPairSigner } from '@solana/signers';
export interface MarketplaceProps {
    rpcUrl?: string;
    programId?: string;
    user?: KeyPairSigner;
    className?: string;
    defaultTab?: 'browse' | 'orders' | 'sell';
}
export declare const Marketplace: React.FC<MarketplaceProps>;
//# sourceMappingURL=Marketplace.d.ts.map