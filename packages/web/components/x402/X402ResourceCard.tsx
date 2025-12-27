/**
 * x402 Resource Card Component
 *
 * Displays external x402 resources (from Heurist, Firecrawl, etc.)
 */

'use client'

import React, { useState } from 'react'
import { ExternalLink, Zap, Globe } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ExternalServiceDialog } from './ExternalServiceDialog'
import type { X402Resource } from '@/lib/hooks/useX402Resources'
import { formatPrice, getCategoryIcon } from '@/lib/hooks/useX402Resources'

interface X402ResourceCardProps {
  resource: X402Resource
}

export function X402ResourceCard({ resource }: X402ResourceCardProps): React.JSX.Element {
  const [showDialog, setShowDialog] = useState(false)

  return (
    <>
      <Card className="group h-full flex flex-col bg-zinc-900/40 border-white/10 hover:border-lime-500/30 transition-all duration-300 overflow-hidden">
        <CardContent className="flex-1 flex flex-col p-4 sm:p-5">
          {/* Header */}
          <div className="flex items-start justify-between gap-2 mb-3">
            <div className="flex items-center gap-2">
              <span className="text-2xl">{getCategoryIcon(resource.category ?? 'other')}</span>
              <div className="min-w-0">
                <h3 className="font-bold text-white text-sm sm:text-base truncate group-hover:text-lime-400 transition-colors">
                  {resource.name}
                </h3>
                <p className="text-xs text-zinc-500 capitalize">
                  {resource.category?.replace('-', ' ')}
                </p>
              </div>
            </div>
            {resource.isExternal && (
              <ExternalLink className="w-4 h-4 text-zinc-500 shrink-0" />
            )}
          </div>

          {/* Description */}
          <p className="text-xs sm:text-sm text-zinc-400 line-clamp-2 mb-4 flex-1">
            {resource.description}
          </p>

          {/* Badges */}
          <div className="flex flex-wrap gap-1.5 mb-4">
            <Badge
              variant="outline"
              className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 text-xs"
            >
              <Globe className="w-3 h-3 mr-1" />
              {resource.network}
            </Badge>
            <Badge
              variant="outline"
              className="bg-lime-500/10 text-lime-400 border-lime-500/30 text-xs"
            >
              <Zap className="w-3 h-3 mr-1" />
              {formatPrice(resource.priceUsd)}
            </Badge>
          </div>

          {/* Action */}
          <Button
            onClick={() => setShowDialog(true)}
            className="w-full gap-2 bg-zinc-800 hover:bg-lime-500 hover:text-black border border-white/10 hover:border-lime-500 transition-all"
            size="sm"
          >
            Try Service
          </Button>
        </CardContent>
      </Card>

      <ExternalServiceDialog
        open={showDialog}
        onOpenChange={setShowDialog}
        resource={resource}
      />
    </>
  )
}

interface X402ResourceGridProps {
  resources: X402Resource[]
  isLoading?: boolean
  emptyMessage?: string
}

export function X402ResourceGrid({
  resources,
  isLoading,
  emptyMessage = 'No resources found',
}: X402ResourceGridProps): React.JSX.Element {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {[...Array(8)].map((_, i) => (
          <Card key={i} className="animate-pulse bg-zinc-900/40 border-white/10">
            <CardContent className="p-5">
              <div className="h-32 bg-zinc-800 rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (resources.length === 0) {
    return (
      <div className="text-center py-20 border border-dashed border-white/10 rounded-xl bg-black/20">
        <Globe className="w-16 h-16 mx-auto text-zinc-600 mb-4" />
        <p className="text-zinc-500">{emptyMessage}</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {resources.map((resource) => (
        <X402ResourceCard key={resource.id} resource={resource} />
      ))}
    </div>
  )
}
