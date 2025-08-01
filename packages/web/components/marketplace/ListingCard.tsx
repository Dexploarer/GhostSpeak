import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Star, Clock, ShoppingCart, User, Eye, TrendingUp } from 'lucide-react'
import { formatAddress, formatNumber, formatSol, isValidImageUrl } from '@/lib/utils'
import Link from 'next/link'
import Image from 'next/image'
import type { MarketplaceListing } from '@/lib/queries/marketplace'

interface ListingCardProps {
  listing: MarketplaceListing
}

export function ListingCard({ listing }: ListingCardProps): React.JSX.Element {
  // Use first valid image or fallback
  const displayImage = listing.images.find((url) => isValidImageUrl(url))
  const isHighRated = listing.averageRating >= 4.5 && listing.totalRatings >= 5
  const isPopular = listing.totalPurchases >= 50

  return (
    <Card className="group card-hover gpu-accelerated overflow-hidden bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800">
      {/* Image */}
      <div className="relative aspect-video overflow-hidden bg-gradient-to-br from-cyan-500 via-purple-500 to-pink-500">
        {displayImage ? (
          <Image
            src={displayImage}
            alt={listing.name}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300 ease-out"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            loading="lazy"
            onError={(e) => {
              // Hide broken images gracefully
              e.currentTarget.style.display = 'none'
            }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ShoppingCart className="w-12 h-12 text-white/70" />
          </div>
        )}

        {/* Status badges */}
        <div className="absolute top-2 left-2 flex gap-1">
          <Badge
            variant={listing.isActive ? 'default' : 'secondary'}
            className={
              listing.isActive
                ? 'bg-green-500 hover:bg-green-600 text-white border-0'
                : 'bg-gray-500 text-white border-0'
            }
          >
            {listing.isActive ? 'Active' : 'Inactive'}
          </Badge>
          {isHighRated && (
            <Badge className="bg-yellow-500 hover:bg-yellow-600 text-white border-0 gap-1">
              <Star className="w-3 h-3 fill-current" />
              Top Rated
            </Badge>
          )}
        </div>

        <div className="absolute top-2 right-2 flex gap-1">
          <Badge
            variant="outline"
            className="bg-white/95 dark:bg-gray-900/95 text-gray-900 dark:text-gray-100 border-0 font-medium"
          >
            {listing.category}
          </Badge>
          {isPopular && (
            <Badge className="bg-orange-500 hover:bg-orange-600 text-white border-0 gap-1">
              <TrendingUp className="w-3 h-3" />
              Popular
            </Badge>
          )}
        </div>

        {/* Overlay for better text readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      </div>

      <CardContent className="p-4 space-y-4">
        {/* Header */}
        <div>
          <h3
            className="font-semibold text-lg mb-2 line-clamp-1 text-gray-900 dark:text-gray-100"
            title={listing.name}
          >
            {listing.name}
          </h3>
          <p
            className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 leading-relaxed"
            title={listing.description}
          >
            {listing.description}
          </p>
        </div>

        {/* Seller Info */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-gray-400" aria-hidden="true" />
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {listing.sellerName || formatAddress(listing.seller)}
            </span>
          </div>
          {listing.sellerReputation > 0 && (
            <div className="flex items-center gap-1">
              <Star className="w-3 h-3 text-yellow-500 fill-current" aria-hidden="true" />
              <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                {listing.sellerReputation.toFixed(1)}
              </span>
            </div>
          )}
        </div>

        {/* Tags */}
        {listing.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {listing.tags.slice(0, 3).map((tag) => (
              <Badge
                key={tag}
                variant="outline"
                className="text-xs px-2 py-1 bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700"
              >
                {tag}
              </Badge>
            ))}
            {listing.tags.length > 3 && (
              <Badge
                variant="outline"
                className="text-xs px-2 py-1 bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400"
              >
                +{listing.tags.length - 3} more
              </Badge>
            )}
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-3 text-xs text-gray-500 dark:text-gray-400">
          <div
            className="flex items-center gap-1"
            title={`${listing.totalPurchases} total purchases`}
          >
            <ShoppingCart className="w-3 h-3" aria-hidden="true" />
            <span className="truncate">{formatNumber(listing.totalPurchases)}</span>
          </div>
          <div className="flex items-center gap-1" title={`Delivery time: ${listing.deliveryTime}`}>
            <Clock className="w-3 h-3" aria-hidden="true" />
            <span className="truncate">{listing.deliveryTime.replace(' days', 'd')}</span>
          </div>
          <div
            className="flex items-center gap-1"
            title={`Average rating: ${listing.averageRating}/5`}
          >
            <Star className="w-3 h-3 text-yellow-500" aria-hidden="true" />
            <span className="truncate">
              {listing.averageRating > 0 ? listing.averageRating.toFixed(1) : 'New'}
            </span>
          </div>
        </div>

        {/* Price and Actions */}
        <div className="flex items-end justify-between pt-2 border-t border-gray-100 dark:border-gray-800">
          <div className="flex flex-col">
            <span
              className="text-2xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 dark:from-green-400 dark:to-emerald-400 bg-clip-text text-transparent"
              aria-label={`Price: ${formatSol(listing.price)}`}
            >
              {formatSol(listing.price)}
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-400">{listing.currency}</span>
          </div>

          <div className="flex gap-2">
            <Link
              href={`/marketplace/${listing.address}`}
              aria-label={`View details for ${listing.name}`}
            >
              <Button
                variant="outline"
                size="sm"
                className="button-hover-lift focus-ring border-gray-200 dark:border-gray-700 hover:border-cyan-300 dark:hover:border-cyan-600"
              >
                <Eye className="w-4 h-4 mr-1" aria-hidden="true" />
                View
              </Button>
            </Link>
            <Link
              href={`/marketplace/${listing.address}/purchase`}
              aria-label={`Purchase ${listing.name}`}
            >
              <Button
                variant="gradient"
                size="sm"
                className="button-hover-lift focus-ring shadow-sm hover:shadow-md"
                disabled={!listing.isActive}
              >
                <ShoppingCart className="w-4 h-4 mr-1" aria-hidden="true" />
                {listing.isActive ? 'Buy' : 'Unavailable'}
              </Button>
            </Link>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
