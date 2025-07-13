/**
 * Order History Component
 * Displays user's purchase orders with tracking information
 */
import React from 'react';
import { PurchaseOrderAccount } from '@ghostspeak/sdk';
export interface OrderHistoryProps {
    orders: PurchaseOrderAccount[];
    onViewOrder?: (order: PurchaseOrderAccount) => void;
    onTrackOrder?: (orderId: bigint) => void;
    onRateOrder?: (orderId: bigint, rating: number, review: string) => void;
    isLoading?: boolean;
    className?: string;
}
export declare const OrderHistory: React.FC<OrderHistoryProps>;
//# sourceMappingURL=OrderHistory.d.ts.map