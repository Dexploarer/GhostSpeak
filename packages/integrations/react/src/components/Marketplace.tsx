/**
 * Comprehensive Marketplace Component
 * Complete marketplace functionality with listing, browsing, and purchasing
 */

import React, { useState, useEffect, useCallback } from 'react';
import { 
  MarketplaceImpl, 
  ServiceListingAccount, 
  ServiceListingStatus,
  MarketplaceFilters as IMarketplaceFilters,
  CartItem,
  PurchaseOrderAccount 
} from '@podai/sdk';
import { createSolanaRpc } from '@solana/rpc';
import { address } from '@solana/addresses';
import type { Address } from '@solana/addresses';
import type { KeyPairSigner } from '@solana/signers';

import { MarketplaceListingCard } from './MarketplaceListingCard';
import { MarketplaceFilters } from './MarketplaceFilters';
import { ShoppingCart } from './ShoppingCart';
import { OrderHistory } from './OrderHistory';

export interface MarketplaceProps {
  rpcUrl?: string;
  programId?: string;
  user?: KeyPairSigner;
  className?: string;
  defaultTab?: 'browse' | 'orders' | 'sell';
}

const DEFAULT_FILTERS: IMarketplaceFilters = {
  status: [ServiceListingStatus.Active],
  sortBy: 'created',
  sortOrder: 'desc',
};

export const Marketplace: React.FC<MarketplaceProps> = ({
  rpcUrl = 'https://api.devnet.solana.com',
  programId = '4nusKGxuNwK7XggWQHCMEE1Ht7taWrSJMhhNfTqswVFP',
  user,
  className = '',
  defaultTab = 'browse',
}) => {
  const [activeTab, setActiveTab] = useState(defaultTab);
  const [listings, setListings] = useState<ServiceListingAccount[]>([]);
  const [orders, setOrders] = useState<PurchaseOrderAccount[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [filters, setFilters] = useState<IMarketplaceFilters>(DEFAULT_FILTERS);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [selectedListing, setSelectedListing] = useState<ServiceListingAccount | null>(null);
  const [pagination, setPagination] = useState({ limit: 20, offset: 0, total: 0, hasMore: false });

  // Initialize marketplace service
  const marketplace = React.useMemo(() => {
    const rpc = createSolanaRpc(rpcUrl);
    return new MarketplaceImpl(rpc, address(programId));
  }, [rpcUrl, programId]);

  // Load listings
  const loadListings = useCallback(async (reset = false) => {
    setIsLoading(true);
    try {
      const offset = reset ? 0 : pagination.offset;
      const { listings: newListings, total, hasMore } = await marketplace.browseListings(
        filters,
        pagination.limit,
        offset
      );
      
      setListings(reset ? newListings : [...listings, ...newListings]);
      setPagination({ 
        ...pagination, 
        offset: offset + newListings.length, 
        total, 
        hasMore 
      });
    } catch (error) {
      console.error('Failed to load listings:', error);
    } finally {
      setIsLoading(false);
    }
  }, [marketplace, filters, pagination, listings]);

  // Load user orders
  const loadOrders = useCallback(async () => {
    if (!user) return;
    
    try {
      const userOrders = await marketplace.getUserOrders(user.address, 'buyer');
      setOrders(userOrders);
    } catch (error) {
      console.error('Failed to load orders:', error);
    }
  }, [marketplace, user]);

  // Initial load
  useEffect(() => {
    loadListings(true);
  }, [filters, searchQuery]);

  useEffect(() => {
    if (activeTab === 'orders') {
      loadOrders();
    }
  }, [activeTab, loadOrders]);

  // Search
  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    setIsLoading(true);
    try {
      const results = await marketplace.searchListings(query, filters, 50);
      setListings(results);
      setPagination({ limit: 20, offset: results.length, total: results.length, hasMore: false });
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Purchase service
  const handlePurchase = async (listingId: bigint, quantity: number) => {
    if (!user) {
      alert('Please connect your wallet to make purchases');
      return;
    }

    try {
      const result = await marketplace.purchaseService(
        user,
        listingId,
        quantity
      );
      
      alert(`Purchase successful! Order ID: ${result.orderId}`);
      loadOrders(); // Refresh orders
    } catch (error) {
      console.error('Purchase failed:', error);
      alert('Purchase failed. Please try again.');
    }
  };

  // Cart management
  const addToCart = (listingId: Address, quantity: number = 1, customInstructions?: string) => {
    const existingItem = cart.find(item => item.listingId === listingId);
    
    if (existingItem) {
      updateCartQuantity(listingId, existingItem.quantity + quantity);
    } else {
      setCart([...cart, { listingId, quantity, customInstructions }]);
    }
  };

  const updateCartQuantity = (listingId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(listingId);
      return;
    }
    
    setCart(cart.map(item => 
      item.listingId === listingId ? { ...item, quantity } : item
    ));
  };

  const removeFromCart = (listingId: string) => {
    setCart(cart.filter(item => item.listingId !== listingId));
  };

  const clearCart = () => {
    setCart([]);
  };

  // Checkout
  const handleCheckout = async (items: CartItem[]) => {
    if (!user) {
      alert('Please connect your wallet to checkout');
      return;
    }

    try {
      const result = await marketplace.checkout(user, items);
      alert(`Checkout successful! ${result.orders.length} orders created.`);
      clearCart();
      setIsCartOpen(false);
      loadOrders();
    } catch (error) {
      console.error('Checkout failed:', error);
      alert('Checkout failed. Please try again.');
    }
  };

  // Load more listings
  const loadMore = () => {
    if (!isLoading && pagination.hasMore) {
      loadListings(false);
    }
  };

  return (
    <div className={`max-w-7xl mx-auto p-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-gray-900">GhostSpeak Marketplace</h1>
        
        <div className="flex items-center gap-4">
          {/* Cart Button */}
          <button
            onClick={() => setIsCartOpen(true)}
            className="relative p-2 text-gray-600 hover:text-gray-900"
          >
            🛒
            {cart.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-blue-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {cart.reduce((sum, item) => sum + item.quantity, 0)}
              </span>
            )}
          </button>

          {/* Wallet Status */}
          {user ? (
            <div className="text-sm text-gray-600">
              Connected: {user.address.substring(0, 8)}...
            </div>
          ) : (
            <div className="text-sm text-red-600">
              Wallet not connected
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex space-x-8">
          {[
            { id: 'browse', label: 'Browse Services', icon: '🔍' },
            { id: 'orders', label: 'My Orders', icon: '📦' },
            { id: 'sell', label: 'Sell Services', icon: '💼' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <span className="mr-2">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Content */}
      {activeTab === 'browse' && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Filters Sidebar */}
          <div className="lg:col-span-1">
            <MarketplaceFilters
              filters={filters}
              onFiltersChange={setFilters}
              onSearch={handleSearch}
            />
          </div>

          {/* Listings Grid */}
          <div className="lg:col-span-3">
            {isLoading && listings.length === 0 ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-500">Loading services...</p>
              </div>
            ) : listings.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-gray-400 text-6xl mb-4">🔍</div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No services found</h3>
                <p className="text-gray-500">Try adjusting your filters or search terms</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {listings.map((listing) => (
                    <MarketplaceListingCard
                      key={listing.id.toString()}
                      listing={listing}
                      onPurchase={handlePurchase}
                      onViewDetails={setSelectedListing}
                    />
                  ))}
                </div>

                {/* Load More */}
                {pagination.hasMore && (
                  <div className="text-center mt-8">
                    <button
                      onClick={loadMore}
                      disabled={isLoading}
                      className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
                    >
                      {isLoading ? 'Loading...' : 'Load More'}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {activeTab === 'orders' && (
        <div className="max-w-4xl">
          <OrderHistory
            orders={orders}
            isLoading={isLoading}
            onViewOrder={setSelectedListing as any}
            onTrackOrder={(orderId) => console.log('Track order:', orderId)}
            onRateOrder={(orderId, rating, review) => 
              console.log('Rate order:', orderId, rating, review)
            }
          />
        </div>
      )}

      {activeTab === 'sell' && (
        <div className="max-w-2xl">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Sell Your Services</h2>
            <p className="text-gray-600 mb-4">
              Create listings for your AI agent services and start earning SOL.
            </p>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-blue-800 text-sm">
                🚧 Service creation interface coming soon! For now, use the CLI command:
                <code className="block mt-2 bg-blue-100 p-2 rounded text-xs">
                  ghostspeak marketplace create --title "Your Service" --description "..." --price 0.5 --category analytics
                </code>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Shopping Cart */}
      <ShoppingCart
        items={cart}
        onUpdateQuantity={updateCartQuantity}
        onRemoveItem={removeFromCart}
        onCheckout={handleCheckout}
        onClearCart={clearCart}
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
      />

      {/* Listing Details Modal */}
      {selectedListing && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <h2 className="text-2xl font-bold text-gray-900">{selectedListing.title}</h2>
                <button
                  onClick={() => setSelectedListing(null)}
                  className="text-gray-400 hover:text-gray-600 text-xl"
                >
                  ×
                </button>
              </div>
              
              <div className="space-y-4">
                <p className="text-gray-700">{selectedListing.description}</p>
                
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Category:</span>
                    <span className="ml-2 font-medium">{selectedListing.serviceType}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Price:</span>
                    <span className="ml-2 font-medium">
                      {(Number(selectedListing.price) / 1e9).toFixed(4)} SOL
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500">Rating:</span>
                    <span className="ml-2 font-medium">
                      {selectedListing.averageRating.toFixed(1)} ({selectedListing.reviewCount} reviews)
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500">Delivery:</span>
                    <span className="ml-2 font-medium">
                      {Math.floor(Number(selectedListing.estimatedDelivery) / 3600)} hours
                    </span>
                  </div>
                </div>

                {selectedListing.tags.length > 0 && (
                  <div>
                    <span className="text-gray-500 text-sm">Tags:</span>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {selectedListing.tags.map((tag, index) => (
                        <span
                          key={index}
                          className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => {
                      addToCart(selectedListing.id.toString() as Address);
                      setSelectedListing(null);
                    }}
                    className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
                  >
                    Add to Cart
                  </button>
                  <button
                    onClick={() => {
                      handlePurchase(selectedListing.id, 1);
                      setSelectedListing(null);
                    }}
                    className="flex-1 bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors"
                  >
                    Buy Now
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};