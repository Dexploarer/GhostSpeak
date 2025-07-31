import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Star, Clock, ShoppingCart, User, Eye } from 'lucide-react'
import { formatAddress, formatNumber, formatSol } from '@/lib/utils'
import Link from 'next/link'
import type { MarketplaceListing } from '@/lib/queries/marketplace'

interface ListingCardProps {
  listing: MarketplaceListing
}

export function ListingCard({ listing }: ListingCardProps): React.JSX.Element {
  return (
    <Card className="group hover:shadow-lg transition-all duration-200 overflow-hidden">
      {/* Image */}
      <div className="relative aspect-video overflow-hidden">
        {listing.images.length > 0 ? (
          <img
            src={listing.images[0]}
            alt={listing.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-cyan-500 to-purple-600 flex items-center justify-center">
            <ShoppingCart className="w-12 h-12 text-white/70" />
          </div>
        )}
        <div className="absolute top-2 left-2">
          <Badge variant={listing.isActive ? 'success' : 'secondary'}>
            {listing.isActive ? 'Active' : 'Inactive'}
          </Badge>
        </div>
        <div className="absolute top-2 right-2">
          <Badge variant="outline" className="bg-white/90 text-gray-900">
            {listing.category}
          </Badge>
        </div>
      </div>

      <CardContent className="p-4">
        {/* Header */}
        <div className="mb-3">
          <h3 className="font-semibold text-lg mb-1 line-clamp-1">{listing.name}</h3>
          <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2 mb-2">
            {listing.description}
          </p>
        </div>

        {/* Seller Info */}
        <div className="flex items-center gap-2 mb-3">
          <User className="w-4 h-4 text-gray-400" />
          <span className="text-sm text-gray-600 dark:text-gray-300">
            {listing.sellerName || formatAddress(listing.seller)}
          </span>
          <div className="flex items-center gap-1">
            <Star className="w-3 h-3 text-yellow-500 fill-current" />
            <span className="text-xs text-gray-500">{listing.sellerReputation.toFixed(1)}</span>
          </div>
        </div>

        {/* Tags */}
        <div className="flex flex-wrap gap-1 mb-3">
          {listing.tags.slice(0, 3).map((tag) => (
            <Badge key={tag} variant="outline" className="text-xs px-2 py-0">
              {tag}
            </Badge>
          ))}
          {listing.tags.length > 3 && (
            <Badge variant="outline" className="text-xs px-2 py-0">
              +{listing.tags.length - 3}
            </Badge>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 mb-4 text-xs text-gray-500">
          <div className="flex items-center gap-1">
            <Eye className="w-3 h-3" />
            <span>{formatNumber(listing.totalPurchases)} purchases</span>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            <span>{listing.deliveryTime}</span>
          </div>
          <div className="flex items-center gap-1">
            <Star className="w-3 h-3 text-yellow-500" />
            <span>
              {listing.averageRating > 0 ? listing.averageRating.toFixed(1) : 'No ratings'}
            </span>
            {listing.totalRatings > 0 && (
              <span className="text-gray-400">({listing.totalRatings})</span>
            )}
          </div>
        </div>

        {/* Price and Actions */}
        <div className="flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-2xl font-bold text-green-600 dark:text-green-400">
              {formatSol(listing.price)}
            </span>
            <span className="text-xs text-gray-500">{listing.currency}</span>
          </div>
          <div className="flex gap-2">
            <Link href={`/marketplace/${listing.address}`}>
              <Button variant="outline" size="sm">
                <Eye className="w-4 h-4 mr-1" />
                View
              </Button>
            </Link>
            <Link href={`/marketplace/${listing.address}/purchase`}>
              <Button variant="gradient" size="sm">
                <ShoppingCart className="w-4 h-4 mr-1" />
                Buy
              </Button>
            </Link>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
