/**
 * Shopping Cart Component
 * Manages cart items and checkout process
 */

import React, { useState, useEffect } from 'react';
import { CartItem } from '@ghostspeak/sdk';
import { useGhostspeak } from '../context/GhostSpeakProvider';

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

// Cache for listing details to avoid repeated fetches
const listingCache = new Map<string, { title: string; price: bigint; description: string; fetchedAt: number }>();

export const ShoppingCart: React.FC<ShoppingCartProps> = ({
  items,
  onUpdateQuantity,
  onRemoveItem,
  onCheckout,
  onClearCart,
  isOpen,
  onClose,
  className = '',
}) => {
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [totalPrice, setTotalPrice] = useState<bigint>(0n);
  const [listingDetails, setListingDetails] = useState<Map<string, any>>(new Map());
  const { sdk } = useGhostspeak();

  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);

  // Fetch listing details for all items
  useEffect(() => {
    const fetchListingDetails = async () => {
      if (!sdk) return;
      
      const newDetails = new Map(listingDetails);
      let newTotalPrice = 0n;
      
      for (const item of items) {
        // Check cache first
        const cached = listingCache.get(item.listingId);
        if (cached && Date.now() - cached.fetchedAt < 300000) { // 5 minute cache
          newDetails.set(item.listingId, cached);
          newTotalPrice += cached.price * BigInt(item.quantity);
          continue;
        }
        
        try {
          // Fetch from blockchain
          const listing = await sdk.marketplace.getServiceListing(item.listingId as any);
          if (listing) {
            const details = {
              title: listing.title || `Service ${item.listingId.substring(0, 8)}...`,
              price: listing.price || 500000000n, // Default 0.5 SOL
              description: listing.description || 'AI-powered service',
              fetchedAt: Date.now()
            };
            listingCache.set(item.listingId, details);
            newDetails.set(item.listingId, details);
            newTotalPrice += details.price * BigInt(item.quantity);
          }
        } catch (error) {
          console.error(`Failed to fetch listing ${item.listingId}:`, error);
          // Use defaults if fetch fails
          const defaultDetails = {
            title: `Service ${item.listingId.substring(0, 8)}...`,
            price: 500000000n, // 0.5 SOL
            description: item.customInstructions || 'AI-powered service',
            fetchedAt: Date.now()
          };
          newDetails.set(item.listingId, defaultDetails);
          newTotalPrice += defaultDetails.price * BigInt(item.quantity);
        }
      }
      
      setListingDetails(newDetails);
      setTotalPrice(newTotalPrice);
    };

    fetchListingDetails();
  }, [items, sdk]);

  const handleCheckout = async () => {
    if (items.length === 0) return;
    
    setIsCheckingOut(true);
    try {
      await onCheckout(items);
    } catch (error) {
      console.error('Checkout failed:', error);
    } finally {
      setIsCheckingOut(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 z-40"
        onClick={onClose}
      />
      
      {/* Cart Panel */}
      <div className={`fixed right-0 top-0 h-full w-96 bg-white shadow-lg z-50 transform transition-transform ${className}`}>
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">
              Shopping Cart ({totalItems})
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-xl font-semibold"
            >
              ×
            </button>
          </div>

          {/* Items */}
          <div className="flex-1 overflow-y-auto p-4">
            {items.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-gray-400 text-4xl mb-2">🛒</div>
                <p className="text-gray-500">Your cart is empty</p>
              </div>
            ) : (
              <div className="space-y-4">
                {items.map((item) => (
                  <CartItemCard
                    key={item.listingId}
                    item={item}
                    details={listingDetails.get(item.listingId)}
                    onUpdateQuantity={onUpdateQuantity}
                    onRemove={onRemoveItem}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          {items.length > 0 && (
            <div className="border-t border-gray-200 p-4 space-y-4">
              {/* Total */}
              <div className="flex justify-between items-center text-lg font-semibold">
                <span>Total:</span>
                <span>{(Number(totalPrice) / 1e9).toFixed(4)} SOL</span>
              </div>

              {/* Actions */}
              <div className="space-y-2">
                <button
                  onClick={handleCheckout}
                  disabled={isCheckingOut}
                  className="w-full bg-blue-600 text-white px-4 py-3 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium"
                >
                  {isCheckingOut ? 'Processing...' : 'Checkout'}
                </button>
                <button
                  onClick={onClearCart}
                  className="w-full text-gray-600 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                >
                  Clear Cart
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

interface CartItemCardProps {
  item: CartItem;
  details?: { title: string; price: bigint; description: string };
  onUpdateQuantity: (listingId: string, quantity: number) => void;
  onRemove: (listingId: string) => void;
}

const CartItemCard: React.FC<CartItemCardProps> = ({
  item,
  details,
  onUpdateQuantity,
  onRemove,
}) => {
  // Use real data from blockchain or defaults
  const price = details?.price || 500000000n; // Default 0.5 SOL
  const priceInSol = Number(price) / 1e9;
  const title = details?.title || `Service ${item.listingId.substring(0, 8)}...`;
  const description = details?.description || item.customInstructions || 'AI-powered service';

  return (
    <div className="border border-gray-200 rounded-lg p-3">
      <div className="flex justify-between items-start mb-2">
        <div className="flex-1">
          <h4 className="text-sm font-medium text-gray-900 truncate">
            {title}
          </h4>
          <p className="text-xs text-gray-500 mt-1 line-clamp-2">
            {description}
          </p>
        </div>
        <button
          onClick={() => onRemove(item.listingId)}
          className="text-gray-400 hover:text-red-600 ml-2"
        >
          ×
        </button>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={() => onUpdateQuantity(item.listingId, Math.max(1, item.quantity - 1))}
            className="w-6 h-6 flex items-center justify-center border border-gray-300 rounded text-sm hover:bg-gray-50"
            disabled={item.quantity <= 1}
          >
            −
          </button>
          <span className="w-8 text-center text-sm font-medium">
            {item.quantity}
          </span>
          <button
            onClick={() => onUpdateQuantity(item.listingId, item.quantity + 1)}
            className="w-6 h-6 flex items-center justify-center border border-gray-300 rounded text-sm hover:bg-gray-50"
          >
            +
          </button>
        </div>
        
        <div className="text-sm font-medium text-gray-900">
          {(priceInSol * item.quantity).toFixed(4)} SOL
        </div>
      </div>

      {item.requirements && item.requirements.length > 0 && (
        <div className="mt-2 pt-2 border-t border-gray-100">
          <p className="text-xs text-gray-600">
            Requirements: {item.requirements.join(', ')}
          </p>
        </div>
      )}
    </div>
  );
};