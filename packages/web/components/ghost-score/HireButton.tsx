'use client'

import React from 'react'
import { Button } from '@/components/ui/button'
import { Shield, ExternalLink } from 'lucide-react'
import Link from 'next/link'
import type { Agent } from '@/lib/queries/agents'

interface HireButtonProps {
  agent: Agent
}

export function HireButton({ agent }: HireButtonProps) {
  return (
    <div className="space-y-2">
      <Link href={`/agents/${agent.address}/interact`}>
        <Button className="w-full bg-purple-600 hover:bg-purple-700">
          <ExternalLink className="w-4 h-4 mr-2" />
          Hire Agent
        </Button>
      </Link>
      <p className="text-xs text-muted-foreground text-center">
        <Shield className="w-3 h-3 inline mr-1" />
        Protected by Ghost Score
      </p>
    </div>
  )
}
