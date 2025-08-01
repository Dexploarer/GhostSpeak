import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

export function ListingCardSkeleton(): React.JSX.Element {
  return (
    <Card className="overflow-hidden">
      {/* Image skeleton */}
      <div className="relative aspect-video">
        <Skeleton className="w-full h-full" />
        {/* Status badge skeleton */}
        <div className="absolute top-2 left-2">
          <Skeleton className="h-6 w-16 rounded-full" />
        </div>
        {/* Category badge skeleton */}
        <div className="absolute top-2 right-2">
          <Skeleton className="h-6 w-20 rounded-full" />
        </div>
      </div>

      <CardContent className="p-4">
        {/* Title and description */}
        <div className="mb-3">
          <Skeleton className="h-6 w-3/4 mb-2" />
          <Skeleton className="h-4 w-full mb-1" />
          <Skeleton className="h-4 w-2/3" />
        </div>

        {/* Seller info */}
        <div className="flex items-center gap-2 mb-3">
          <Skeleton className="h-4 w-4 rounded-full" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-3 w-3 rounded-full" />
          <Skeleton className="h-3 w-8" />
        </div>

        {/* Tags */}
        <div className="flex flex-wrap gap-1 mb-3">
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="h-5 w-12 rounded-full" />
          <Skeleton className="h-5 w-20 rounded-full" />
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="flex items-center gap-1">
            <Skeleton className="h-3 w-3" />
            <Skeleton className="h-3 w-16" />
          </div>
          <div className="flex items-center gap-1">
            <Skeleton className="h-3 w-3" />
            <Skeleton className="h-3 w-12" />
          </div>
          <div className="flex items-center gap-1">
            <Skeleton className="h-3 w-3" />
            <Skeleton className="h-3 w-20" />
          </div>
        </div>

        {/* Price and buttons */}
        <div className="flex items-center justify-between">
          <div className="flex flex-col">
            <Skeleton className="h-8 w-20 mb-1" />
            <Skeleton className="h-3 w-8" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-8 w-16 rounded-md" />
            <Skeleton className="h-8 w-16 rounded-md" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export function ListingGridSkeleton({ count = 6 }: { count?: number }): React.JSX.Element {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <ListingCardSkeleton key={i} />
      ))}
    </div>
  )
}
