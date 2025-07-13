import React from 'react';
import { PublicKey } from '@solana/web3.js';
import { ServiceTrackingService } from '@ghostspeak/sdk';
interface OrderTrackingProps {
    orderId: PublicKey;
    trackingService: ServiceTrackingService;
    isAgent?: boolean;
}
export declare const OrderTracking: React.FC<OrderTrackingProps>;
export {};
//# sourceMappingURL=OrderTracking.d.ts.map