'use client'

import React, { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useMutation } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { useAgent } from '@/lib/queries/agents'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge as _Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Star, Bot, CheckCircle2 } from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'

export default function ReviewAgentPage() {
  const params = useParams()
  const router = useRouter()
  const agentAddress = params?.agentAddress as string

  const { data: agent, isLoading } = useAgent(agentAddress)

  const [rating, setRating] = useState(0)
  const [hoveredRating, setHoveredRating] = useState(0)
  const [review, setReview] = useState('')
  const [verifiedHire, setVerifiedHire] = useState(false)
  const [jobCategory, setJobCategory] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const submitReview = useMutation(api.ghostScore.submitReview)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (rating === 0) {
      toast.error('Please select a star rating')
      return
    }

    if (review.trim().length < 10) {
      toast.error('Review must be at least 10 characters')
      return
    }

    if (review.length > 500) {
      toast.error('Review must be less than 500 characters')
      return
    }

    setIsSubmitting(true)

    try {
      await submitReview({
        agentAddress,
        rating,
        review: review.trim(),
        verifiedHire,
        jobCategory: jobCategory || undefined,
      })

      toast.success('Review submitted successfully!')

      toast.info('Reward: 0.1 GHOST tokens will be sent to your wallet!')

      // Redirect back to agent profile
      router.push(`/ghost-score/${agentAddress}`)
    } catch (error: any) {
      console.error('Review submission error:', error)
      toast.error(error.message || 'Failed to submit review. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-8">
        <div className="max-w-2xl mx-auto">
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    )
  }

  if (!agent) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="p-12 text-center max-w-md">
          <Bot className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-2xl font-bold mb-2">Agent Not Found</h2>
          <p className="text-muted-foreground mb-6">
            The agent you're trying to review doesn't exist.
          </p>
          <Link href="/ghost-score">
            <Button>Back to Search</Button>
          </Link>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto p-8">
        {/* Header */}
        <div className="mb-8">
          <Link href={`/ghost-score/${agentAddress}`}>
            <Button variant="ghost" className="mb-4">
              ← Back to Agent
            </Button>
          </Link>

          <h1 className="text-4xl font-black mb-4">Write a Review</h1>
          <p className="text-muted-foreground">
            Share your experience with {agent.name} to help others make informed decisions.
          </p>
        </div>

        {/* Agent Info */}
        <Card className="p-6 mb-8">
          <div className="flex items-center gap-4">
            {agent.metadata.avatar ? (
              <img
                src={agent.metadata.avatar}
                alt={agent.name}
                className="w-16 h-16 rounded-full object-cover"
              />
            ) : (
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center">
                <Bot className="w-8 h-8 text-white" />
              </div>
            )}
            <div>
              <h3 className="text-xl font-bold">{agent.name}</h3>
              <p className="text-sm text-muted-foreground">
                {agent.metadata.category || 'General AI Agent'}
              </p>
            </div>
          </div>
        </Card>

        {/* Review Form */}
        <Card className="p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Star Rating */}
            <div>
              <label className="block text-sm font-medium mb-3">
                Rate this agent <span className="text-red-500">*</span>
              </label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHoveredRating(star)}
                    onMouseLeave={() => setHoveredRating(0)}
                    className="transition-transform hover:scale-110"
                  >
                    <Star
                      className={`w-10 h-10 ${star <= (hoveredRating || rating) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-600'}`}
                    />
                  </button>
                ))}
              </div>
              {rating > 0 && (
                <p className="text-sm text-muted-foreground mt-2">
                  {rating === 5 && 'Excellent!'}
                  {rating === 4 && 'Good'}
                  {rating === 3 && 'Average'}
                  {rating === 2 && 'Below Average'}
                  {rating === 1 && 'Poor'}
                </p>
              )}
            </div>

            {/* Review Text */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Your review <span className="text-red-500">*</span>
              </label>
              <textarea
                value={review}
                onChange={(e) => setReview(e.target.value)}
                placeholder="Describe your experience with this agent..."
                className="w-full px-4 py-3 rounded-md border border-input bg-background text-foreground min-h-[150px] resize-y"
                maxLength={500}
              />
              <p className="text-xs text-muted-foreground mt-2">{review.length}/500 characters</p>
            </div>

            {/* Job Category */}
            <div>
              <label className="block text-sm font-medium mb-2">Job Category (Optional)</label>
              <select
                value={jobCategory}
                onChange={(e) => setJobCategory(e.target.value)}
                className="w-full px-4 py-3 rounded-md border border-input bg-background text-foreground"
              >
                <option value="">Select a category</option>
                <option value="Data Analysis">Data Analysis</option>
                <option value="Content Creation">Content Creation</option>
                <option value="Code Generation">Code Generation</option>
                <option value="Image Generation">Image Generation</option>
                <option value="Translation">Translation</option>
                <option value="Research">Research</option>
                <option value="Customer Support">Customer Support</option>
                <option value="Marketing">Marketing</option>
                <option value="Other">Other</option>
              </select>
            </div>

            {/* Verified Hire */}
            <div className="flex items-start gap-3 p-4 bg-green-500/5 border border-green-500/30 rounded-md">
              <input
                type="checkbox"
                id="verifiedHire"
                checked={verifiedHire}
                onChange={(e) => setVerifiedHire(e.target.checked)}
                className="mt-1"
              />
              <label htmlFor="verifiedHire" className="flex-1 cursor-pointer">
                <div className="flex items-center gap-2 mb-1">
                  <CheckCircle2 className="w-4 h-4 text-green-400" />
                  <span className="font-semibold">Mark as Verified Hire</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Check this if you have paid this agent for their services. Verified reviews carry
                  more weight.
                </p>
              </label>
            </div>

            {/* Incentive Notice */}
            <Card className="p-4 bg-purple-500/5 border-purple-500/30">
              <div className="flex items-center gap-3">
                <Star className="w-6 h-6 text-purple-400" />
                <div>
                  <p className="font-semibold text-sm">Earn 0.1 GHOST Tokens</p>
                  <p className="text-xs text-muted-foreground">As a thank you for your review!</p>
                </div>
              </div>
            </Card>

            {/* Submit Button */}
            <div className="flex gap-4">
              <Button
                type="submit"
                disabled={isSubmitting || rating === 0 || review.trim().length < 10}
                className="flex-1 bg-purple-600 hover:bg-purple-700"
              >
                {isSubmitting ? 'Submitting...' : 'Submit Review'}
              </Button>
              <Link href={`/ghost-score/${agentAddress}`} className="flex-1">
                <Button type="button" variant="outline" className="w-full">
                  Cancel
                </Button>
              </Link>
            </div>
          </form>
        </Card>
      </div>
    </div>
  )
}
