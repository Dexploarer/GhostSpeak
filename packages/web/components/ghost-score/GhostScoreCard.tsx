'use client'

import React from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Bot, Star, DollarSign, TrendingUp, Clock, Shield, ExternalLink } from 'lucide-react'
import { formatAddress, formatSol } from '@/lib/utils'
import Link from 'next/link'
import Image from 'next/image'
import type { Agent } from '@/lib/queries/agents'

interface GhostScoreCardProps {
  agent: Agent
}

// Calculate Ghost Score tier based on reputation score
function getGhostScoreTier(score: number): {
  tier: string
  color: string
  bgColor: string
} {
  if (score >= 900) return { tier: 'PLATINUM', color: 'text-gray-300', bgColor: 'bg-gray-300/20' }
  if (score >= 750) return { tier: 'GOLD', color: 'text-yellow-400', bgColor: 'bg-yellow-400/20' }
  if (score >= 500) return { tier: 'SILVER', color: 'text-gray-400', bgColor: 'bg-gray-400/20' }
  if (score >= 200) return { tier: 'BRONZE', color: 'text-orange-500', bgColor: 'bg-orange-500/20' }
  return { tier: 'NEWCOMER', color: 'text-blue-400', bgColor: 'bg-blue-400/20' }
}

export function GhostScoreCard({ agent }: GhostScoreCardProps) {
  const ghostScore = agent.reputation.score
  const { tier, color, bgColor } = getGhostScoreTier(ghostScore)

  return (
    <Card className="p-6 hover:shadow-lg transition-all hover:scale-[1.02] border-purple-500/20 relative overflow-hidden group">
      {/* Background Gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

      <div className="relative z-10">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            {agent.metadata.avatar ? (
              <Image
                src={agent.metadata.avatar}
                alt={agent.name}
                width={48}
                height={48}
                className="w-12 h-12 rounded-full object-cover border-2 border-purple-500/30"
                unoptimized
              />
            ) : (
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center">
                <Bot className="w-6 h-6 text-white" />
              </div>
            )}
            <div>
              <h3 className="font-semibold text-lg">{agent.name}</h3>
              <p className="text-xs text-muted-foreground">{formatAddress(agent.address)}</p>
            </div>
          </div>
          <Badge variant={agent.isActive ? 'success' : 'secondary'} className="text-xs">
            {agent.isActive ? 'Active' : 'Inactive'}
          </Badge>
        </div>

        {/* Ghost Score Display */}
        <div className={`${bgColor} rounded-lg p-4 mb-4`}>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-muted-foreground mb-1">Ghost Score</div>
              <div className={`text-3xl font-black ${color}`}>{ghostScore}</div>
            </div>
            <Badge className={`${bgColor} ${color} border-0 text-xs`}>{tier}</Badge>
          </div>
        </div>

        {/* Description */}
        {agent.metadata.description && (
          <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
            {agent.metadata.description}
          </p>
        )}

        {/* Capabilities */}
        <div className="flex flex-wrap gap-2 mb-4">
          {agent.capabilities.slice(0, 3).map((capability) => (
            <Badge key={capability} variant="outline" className="text-xs">
              {capability}
            </Badge>
          ))}
          {agent.capabilities.length > 3 && (
            <Badge variant="outline" className="text-xs">
              +{agent.capabilities.length - 3}
            </Badge>
          )}
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3 mb-4 text-xs">
          <div className="flex items-center gap-2 bg-card/50 rounded p-2">
            <Star className="w-4 h-4 text-yellow-400" />
            <div>
              <div className="text-muted-foreground">Success Rate</div>
              <div className="font-semibold">{agent.reputation.successRate}%</div>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-card/50 rounded p-2">
            <TrendingUp className="w-4 h-4 text-green-400" />
            <div>
              <div className="text-muted-foreground">Total Jobs</div>
              <div className="font-semibold">{agent.reputation.totalJobs}</div>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-card/50 rounded p-2">
            <DollarSign className="w-4 h-4 text-purple-400" />
            <div>
              <div className="text-muted-foreground">Price</div>
              <div className="font-semibold">{formatSol(agent.pricing)}</div>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-card/50 rounded p-2">
            <Clock className="w-4 h-4 text-blue-400" />
            <div>
              <div className="text-muted-foreground">Response</div>
              <div className="font-semibold">~450ms</div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Link href={`/ghost-score/${agent.address}`} className="flex-1">
            <Button variant="outline" className="w-full" size="sm">
              <Shield className="w-4 h-4 mr-2" />
              View Score
            </Button>
          </Link>
          <Link href={`/agents/${agent.address}/interact`} className="flex-1">
            <Button className="w-full bg-purple-600 hover:bg-purple-700" size="sm">
              <ExternalLink className="w-4 h-4 mr-2" />
              Hire
            </Button>
          </Link>
        </div>
      </div>
    </Card>
  )
}
