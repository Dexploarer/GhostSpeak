/**
 * Order History Component
 * Displays user's purchase orders with tracking information
 */

import React, { useState } from 'react';
import { PurchaseOrderAccount, OrderStatus } from '@podai/sdk';

export interface OrderHistoryProps {
  orders: PurchaseOrderAccount[];
  onViewOrder?: (order: PurchaseOrderAccount) => void;
  onTrackOrder?: (orderId: bigint) => void;
  onRateOrder?: (orderId: bigint, rating: number, review: string) => void;
  isLoading?: boolean;
  className?: string;
}

export const OrderHistory: React.FC<OrderHistoryProps> = ({
  orders,
  onViewOrder,
  onTrackOrder,
  onRateOrder,
  isLoading = false,
  className = '',
}) => {
  const [expandedOrder, setExpandedOrder] = useState<bigint | null>(null);

  const formatPrice = (price: bigint) => {
    return (Number(price) / 1e9).toFixed(4) + ' SOL';
  };

  const formatDate = (timestamp: bigint) => {
    return new Date(Number(timestamp)).toLocaleDateString();
  };

  const getStatusColor = (status: OrderStatus) => {
    switch (status) {
      case OrderStatus.Pending:
        return 'text-yellow-600 bg-yellow-100';
      case OrderStatus.Paid:
        return 'text-blue-600 bg-blue-100';
      case OrderStatus.InProgress:
        return 'text-purple-600 bg-purple-100';
      case OrderStatus.Delivered:
        return 'text-green-600 bg-green-100';
      case OrderStatus.Completed:
        return 'text-green-800 bg-green-200';
      case OrderStatus.Disputed:
        return 'text-red-600 bg-red-100';
      case OrderStatus.Cancelled:
        return 'text-gray-600 bg-gray-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusText = (status: OrderStatus) => {
    switch (status) {
      case OrderStatus.Pending:
        return 'Pending Payment';
      case OrderStatus.Paid:
        return 'Paid';
      case OrderStatus.InProgress:
        return 'In Progress';
      case OrderStatus.Delivered:
        return 'Delivered';
      case OrderStatus.Completed:
        return 'Completed';
      case OrderStatus.Disputed:
        return 'Disputed';
      case OrderStatus.Cancelled:
        return 'Cancelled';
      default:
        return 'Unknown';
    }
  };

  const getProgressPercentage = (status: OrderStatus) => {
    switch (status) {
      case OrderStatus.Pending:
        return 10;
      case OrderStatus.Paid:
        return 30;
      case OrderStatus.InProgress:
        return 60;
      case OrderStatus.Delivered:
        return 90;
      case OrderStatus.Completed:
        return 100;
      case OrderStatus.Cancelled:
      case OrderStatus.Disputed:
        return 0;
      default:
        return 0;
    }
  };

  if (isLoading) {
    return (
      <div className={`bg-white rounded-lg border border-gray-200 p-8 text-center ${className}`}>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-500">Loading orders...</p>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className={`bg-white rounded-lg border border-gray-200 p-8 text-center ${className}`}>
        <div className="text-gray-400 text-4xl mb-4">📦</div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">No orders yet</h3>
        <p className="text-gray-500">Your purchase history will appear here</p>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg border border-gray-200 ${className}`}>
      <div className="p-4 border-b border-gray-100">
        <h2 className="text-lg font-semibold text-gray-900">
          Order History ({orders.length})
        </h2>
      </div>

      <div className="divide-y divide-gray-100">
        {orders.map((order) => (
          <div key={order.id.toString()} className="p-4">
            <OrderCard
              order={order}
              isExpanded={expandedOrder === order.id}
              onToggleExpand={(id) => setExpandedOrder(expandedOrder === id ? null : id)}
              onViewOrder={onViewOrder}
              onTrackOrder={onTrackOrder}
              onRateOrder={onRateOrder}
              formatPrice={formatPrice}
              formatDate={formatDate}
              getStatusColor={getStatusColor}
              getStatusText={getStatusText}
              getProgressPercentage={getProgressPercentage}
            />
          </div>
        ))}
      </div>
    </div>
  );
};

interface OrderCardProps {
  order: PurchaseOrderAccount;
  isExpanded: boolean;
  onToggleExpand: (id: bigint) => void;
  onViewOrder?: (order: PurchaseOrderAccount) => void;
  onTrackOrder?: (orderId: bigint) => void;
  onRateOrder?: (orderId: bigint, rating: number, review: string) => void;
  formatPrice: (price: bigint) => string;
  formatDate: (timestamp: bigint) => string;
  getStatusColor: (status: OrderStatus) => string;
  getStatusText: (status: OrderStatus) => string;
  getProgressPercentage: (status: OrderStatus) => number;
}

const OrderCard: React.FC<OrderCardProps> = ({
  order,
  isExpanded,
  onToggleExpand,
  onViewOrder,
  onTrackOrder,
  onRateOrder,
  formatPrice,
  formatDate,
  getStatusColor,
  getStatusText,
  getProgressPercentage,
}) => {
  const [showRating, setShowRating] = useState(false);
  const [rating, setRating] = useState(5);
  const [review, setReview] = useState('');

  const handleSubmitRating = () => {
    if (onRateOrder) {
      onRateOrder(order.id, rating, review);
      setShowRating(false);
    }
  };

  const canRate = order.status === OrderStatus.Delivered && !order.buyerRating;
  const progressPercentage = getProgressPercentage(order.status);

  return (
    <div className="border border-gray-200 rounded-lg p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div>
            <p className="font-medium text-gray-900">
              Order #{order.id.toString().substring(0, 8)}
            </p>
            <p className="text-sm text-gray-500">
              {formatDate(order.createdAt)}
            </p>
          </div>
          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(order.status)}`}>
            {getStatusText(order.status)}
          </span>
        </div>
        
        <div className="text-right">
          <p className="font-medium text-gray-900">
            {formatPrice(order.totalPrice)}
          </p>
          <p className="text-sm text-gray-500">
            Qty: {order.quantity}
          </p>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-3">
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
      </div>

      {/* Quick Info */}
      <div className="grid grid-cols-2 gap-4 text-sm mb-3">
        <div>
          <span className="text-gray-500">Listing ID:</span>
          <span className="ml-1 font-medium">{order.listingId.toString()}</span>
        </div>
        <div>
          <span className="text-gray-500">Unit Price:</span>
          <span className="ml-1 font-medium">{formatPrice(order.unitPrice)}</span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2 mb-3">
        <button
          onClick={() => onToggleExpand(order.id)}
          className="text-blue-600 hover:text-blue-800 text-sm font-medium"
        >
          {isExpanded ? 'Hide Details' : 'View Details'}
        </button>
        
        {onTrackOrder && order.status !== OrderStatus.Completed && order.status !== OrderStatus.Cancelled && (
          <button
            onClick={() => onTrackOrder(order.id)}
            className="text-green-600 hover:text-green-800 text-sm font-medium"
          >
            Track Order
          </button>
        )}
        
        {canRate && (
          <button
            onClick={() => setShowRating(true)}
            className="text-purple-600 hover:text-purple-800 text-sm font-medium"
          >
            Rate Service
          </button>
        )}
      </div>

      {/* Expanded Details */}
      {isExpanded && (
        <div className="border-t border-gray-100 pt-3 space-y-3">
          {order.requirements.length > 0 && (
            <div>
              <p className="text-sm font-medium text-gray-700 mb-1">Requirements:</p>
              <ul className="text-sm text-gray-600 list-disc list-inside">
                {order.requirements.map((req, index) => (
                  <li key={index}>{req}</li>
                ))}
              </ul>
            </div>
          )}

          {order.customInstructions && (
            <div>
              <p className="text-sm font-medium text-gray-700 mb-1">Instructions:</p>
              <p className="text-sm text-gray-600">{order.customInstructions}</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-500">Deadline:</p>
              <p className="font-medium">{formatDate(order.deadline)}</p>
            </div>
            <div>
              <p className="text-gray-500">Seller:</p>
              <p className="font-medium font-mono text-xs">
                {order.seller.substring(0, 8)}...{order.seller.substring(-4)}
              </p>
            </div>
          </div>

          {order.deliveryData && (
            <div>
              <p className="text-sm font-medium text-gray-700 mb-1">Delivery:</p>
              <p className="text-sm text-gray-600 bg-gray-50 p-2 rounded">
                {order.deliveryData}
              </p>
            </div>
          )}

          {order.buyerRating && (
            <div>
              <p className="text-sm font-medium text-gray-700 mb-1">Your Rating:</p>
              <div className="flex items-center gap-2">
                <span className="text-yellow-400">
                  {'★'.repeat(order.buyerRating)}{'☆'.repeat(5 - order.buyerRating)}
                </span>
                {order.buyerReview && (
                  <span className="text-sm text-gray-600">"{order.buyerReview}"</span>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Rating Modal */}
      {showRating && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96 max-w-full">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Rate this service</h3>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Rating
              </label>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => setRating(star)}
                    className={`text-2xl ${star <= rating ? 'text-yellow-400' : 'text-gray-300'}`}
                  >
                    ★
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Review (optional)
              </label>
              <textarea
                value={review}
                onChange={(e) => setReview(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Share your experience..."
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleSubmitRating}
                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
              >
                Submit Rating
              </button>
              <button
                onClick={() => setShowRating(false)}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};