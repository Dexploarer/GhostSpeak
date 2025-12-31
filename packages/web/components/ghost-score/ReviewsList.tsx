'use client'

import React, { useState } from 'react'
import { useQuery as useConvexQuery, useMutation } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import { Star, ThumbsUp, ThumbsDown, CheckCircle2, User } from 'lucide-react'
import { formatAddress } from '@/lib/utils'
import { toast } from 'sonner'

interface ReviewsListProps {
  agentAddress: string
}

export function ReviewsList({ agentAddress }: ReviewsListProps) {
  const [limit] = useState(10)

  const reviews = useConvexQuery(api.ghostScore.getAgentReviews, {
    agentAddress,
    limit,
  })

  const userVotes = useConvexQuery(api.ghostScore.getUserVotes, { agentAddress })
  const voteOnReview = useMutation(api.ghostScore.voteOnReview)

  const handleVote = async (reviewId: string, vote: number) => {
    try {
      await voteOnReview({ reviewId: reviewId as any, vote })
      toast.success(vote === 1 ? 'Upvoted!' : 'Downvoted!')
    } catch (error) {
      toast.error('Failed to vote. Please sign in.')
    }
  }

  if (reviews === undefined) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="p-4">
            <div className="flex gap-4">
              <Skeleton className="w-12 h-12 rounded-full" />
              <div className="flex-1">
                <Skeleton className="h-4 w-32 mb-2" />
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            </div>
          </Card>
        ))}
      </div>
    )
  }

  if (reviews.length === 0) {
    return (
      <Card className="p-12 text-center">
        <Star className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
        <h3 className="text-lg font-semibold mb-2">No reviews yet</h3>
        <p className="text-muted-foreground mb-4">
          Be the first to review this agent!
        </p>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {reviews.map((review) => {
        const userVote = userVotes?.[review._id] || 0

        return (
          <Card key={review._id} className="p-6 hover:shadow-lg transition-shadow">
            <div className="flex gap-4">
              {/* Avatar */}
              <div className="flex-shrink-0">
                {review.user?.avatarUrl ? (
                  <img
                    src={review.user.avatarUrl}
                    alt={review.user.name || 'User'}
                    className="w-12 h-12 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center">
                    <User className="w-6 h-6 text-white" />
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="flex-1">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold">
                        {review.user?.name || 'Anonymous'}
                      </span>
                      {review.verifiedHire && (
                        <Badge variant="success" className="text-xs">
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                          Verified Hire
                        </Badge>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {formatAddress(review.user?.walletAddress || '')} •{' '}
                      {new Date(review.timestamp).toLocaleDateString()}
                    </div>
                  </div>

                  {/* Star Rating */}
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`w-4 h-4 ${star <= review.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-600'}`}
                      />
                    ))}
                  </div>
                </div>

                {/* Review Text */}
                <p className="text-sm mb-4">{review.review}</p>

                {/* Job Category */}
                {review.jobCategory && (
                  <Badge variant="outline" className="text-xs mb-3">
                    {review.jobCategory}
                  </Badge>
                )}

                {/* Vote Buttons */}
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleVote(review._id, 1)}
                    className={`flex items-center gap-1 ${userVote === 1 ? 'text-green-400' : ''}`}
                  >
                    <ThumbsUp className="w-4 h-4" />
                    <span className="text-xs">{review.upvotes}</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleVote(review._id, -1)}
                    className={`flex items-center gap-1 ${userVote === -1 ? 'text-red-400' : ''}`}
                  >
                    <ThumbsDown className="w-4 h-4" />
                    <span className="text-xs">{review.downvotes}</span>
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        )
      })}
    </div>
  )
}
