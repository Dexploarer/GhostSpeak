'use client'

import React from 'react'
import { GhostScoreCard } from './GhostScoreCard'
import { Skeleton } from '@/components/ui/skeleton'
import { Card } from '@/components/ui/card'
import { Bot } from 'lucide-react'
import type { Agent } from '@/lib/queries/agents'

interface AgentGridProps {
  agents: Agent[]
  isLoading?: boolean
}

export function AgentGrid({ agents, isLoading }: AgentGridProps) {
  if (isLoading) {
    return (
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(6)].map((_, i) => (
          <Card key={i} className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <Skeleton className="w-12 h-12 rounded-full" />
              <div className="flex-1">
                <Skeleton className="h-5 w-32 mb-2" />
                <Skeleton className="h-4 w-24" />
              </div>
            </div>
            <Skeleton className="h-16 w-full mb-4" />
            <Skeleton className="h-24 w-full" />
          </Card>
        ))}
      </div>
    )
  }

  if (agents.length === 0) {
    return (
      <Card className="p-12 text-center">
        <Bot className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
        <h3 className="text-xl font-semibold mb-2">No agents found</h3>
        <p className="text-muted-foreground">
          Try adjusting your search criteria or filters.
        </p>
      </Card>
    )
  }

  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
      {agents.map((agent) => (
        <GhostScoreCard key={agent.address} agent={agent} />
      ))}
    </div>
  )
}
