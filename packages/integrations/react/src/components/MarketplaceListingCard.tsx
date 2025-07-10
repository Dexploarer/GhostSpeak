/**
 * Marketplace Listing Card Component
 * Displays a service listing with purchase capabilities
 */

import React, { useState } from 'react';
import { ServiceListingAccount, ServiceListingStatus } from '@podai/sdk';

export interface MarketplaceListingCardProps {
  listing: ServiceListingAccount;
  onPurchase?: (listingId: bigint, quantity: number) => Promise<void>;
  onViewDetails?: (listing: ServiceListingAccount) => void;
  className?: string;
}

export const MarketplaceListingCard: React.FC<MarketplaceListingCardProps> = ({
  listing,
  onPurchase,
  onViewDetails,
  className = '',
}) => {
  const [quantity, setQuantity] = useState(1);
  const [isLoading, setIsLoading] = useState(false);

  const handlePurchase = async () => {
    if (!onPurchase) return;
    
    setIsLoading(true);
    try {
      await onPurchase(listing.id, quantity);
    } catch (error) {
      console.error('Purchase failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatPrice = (price: bigint) => {
    return (Number(price) / 1e9).toFixed(4) + ' SOL';
  };

  const formatRating = (rating: number) => {
    return '★'.repeat(Math.floor(rating)) + '☆'.repeat(5 - Math.floor(rating));
  };

  const getStatusColor = (status: ServiceListingStatus) => {
    switch (status) {
      case ServiceListingStatus.Active:
        return 'text-green-600 bg-green-100';
      case ServiceListingStatus.Sold:
        return 'text-gray-600 bg-gray-100';
      case ServiceListingStatus.Cancelled:
        return 'text-red-600 bg-red-100';
      case ServiceListingStatus.Paused:
        return 'text-yellow-600 bg-yellow-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusText = (status: ServiceListingStatus) => {
    switch (status) {
      case ServiceListingStatus.Active:
        return 'Active';
      case ServiceListingStatus.Sold:
        return 'Sold Out';
      case ServiceListingStatus.Cancelled:
        return 'Cancelled';
      case ServiceListingStatus.Paused:
        return 'Paused';
      default:
        return 'Unknown';
    }
  };

  const isAvailable = listing.status === ServiceListingStatus.Active && 
                     listing.activeOrders < listing.maxOrders;

  const availableSlots = listing.maxOrders - listing.activeOrders;

  return (
    <div className={`bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-100">
        <div className="flex justify-between items-start mb-2">
          <h3 className="text-lg font-semibold text-gray-900 truncate flex-1 mr-2">
            {listing.title}
          </h3>
          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(listing.status)}`}>
            {getStatusText(listing.status)}
          </span>
        </div>
        
        <div className="flex items-center gap-4 text-sm text-gray-600">
          <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded">
            {listing.serviceType}
          </span>
          <span className="flex items-center">
            <span className="text-yellow-400 mr-1">{formatRating(listing.averageRating)}</span>
            <span>({listing.reviewCount})</span>
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <p className="text-gray-700 text-sm mb-3 line-clamp-2">
          {listing.description}
        </p>

        {/* Tags */}
        {listing.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {listing.tags.slice(0, 3).map((tag, index) => (
              <span
                key={index}
                className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded"
              >
                {tag}
              </span>
            ))}
            {listing.tags.length > 3 && (
              <span className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded">
                +{listing.tags.length - 3} more
              </span>
            )}
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
          <div>
            <span className="text-gray-500">Sales:</span>
            <span className="ml-1 font-medium">{listing.totalSales}</span>
          </div>
          <div>
            <span className="text-gray-500">Available:</span>
            <span className="ml-1 font-medium">{availableSlots}/{listing.maxOrders}</span>
          </div>
          <div>
            <span className="text-gray-500">Delivery:</span>
            <span className="ml-1 font-medium">
              {Math.floor(Number(listing.estimatedDelivery) / 3600)}h
            </span>
          </div>
          <div>
            <span className="text-gray-500">Revenue:</span>
            <span className="ml-1 font-medium">
              {formatPrice(listing.totalRevenue)}
            </span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-gray-100 bg-gray-50">
        <div className="flex items-center justify-between mb-3">
          <div className="text-2xl font-bold text-gray-900">
            {formatPrice(listing.price)}
          </div>
          <button
            onClick={() => onViewDetails?.(listing)}
            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
          >
            View Details
          </button>
        </div>

        {isAvailable && onPurchase && (
          <div className="flex gap-2">
            <div className="flex items-center">
              <label htmlFor={`quantity-${listing.id}`} className="text-sm text-gray-700 mr-2">
                Qty:
              </label>
              <input
                id={`quantity-${listing.id}`}
                type="number"
                min="1"
                max={availableSlots}
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, Math.min(availableSlots, parseInt(e.target.value) || 1)))}
                className="w-16 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button
              onClick={handlePurchase}
              disabled={isLoading || !isAvailable}
              className="flex-1 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors text-sm font-medium"
            >
              {isLoading ? 'Processing...' : `Purchase (${formatPrice(listing.price * BigInt(quantity))})`}
            </button>
          </div>
        )}

        {!isAvailable && (
          <div className="text-center py-2">
            <span className="text-gray-500 text-sm">
              {listing.status === ServiceListingStatus.Active ? 'No slots available' : 'Not available'}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};