/**
 * Shopping Cart Component
 * Manages cart items and checkout process
 */
import React from 'react';
import { CartItem } from '@ghostspeak/sdk';
export interface ShoppingCartProps {
    items: CartItem[];
    onUpdateQuantity: (listingId: string, quantity: number) => void;
    onRemoveItem: (listingId: string) => void;
    onCheckout: (items: CartItem[]) => Promise<void>;
    onClearCart: () => void;
    isOpen: boolean;
    onClose: () => void;
    className?: string;
}
export declare const ShoppingCart: React.FC<ShoppingCartProps>;
//# sourceMappingURL=ShoppingCart.d.ts.map