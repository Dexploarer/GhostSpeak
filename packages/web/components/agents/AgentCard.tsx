import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Bot, Star, DollarSign } from 'lucide-react'
import { formatAddress, formatNumber, formatSol } from '@/lib/utils'
import Link from 'next/link'
import type { Agent } from '@/lib/queries/agents'
import { PrivacyIndicator, type PrivacyMode } from '@/components/privacy/PrivacyIndicator'

interface AgentCardProps {
  agent: Agent
  privacyMode?: PrivacyMode
  showPrivacyFiltered?: boolean
}

export function AgentCard({
  agent,
  privacyMode = 'public',
  showPrivacyFiltered = false,
}: AgentCardProps): React.JSX.Element {
  // Determine if reputation data should be shown based on privacy mode
  const shouldShowFullReputation = !showPrivacyFiltered || privacyMode === 'public'
  const shouldShowTierOnly = privacyMode === 'tier-only'
  const shouldHideAll = privacyMode === 'hidden'

  return (
    <Card className="p-6 hover:shadow-lg transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          {agent.metadata.avatar ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={agent.metadata.avatar}
                alt={agent.name}
                className="w-12 h-12 rounded-full object-cover"
              />
            </>
          ) : (
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-cyan-500 to-purple-600 flex items-center justify-center">
              <Bot className="w-6 h-6 text-white" />
            </div>
          )}
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-lg">{agent.name}</h3>
              {showPrivacyFiltered && <PrivacyIndicator mode={privacyMode} size="sm" />}
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {formatAddress(agent.address)}
            </p>
          </div>
        </div>
        <Badge variant={agent.isActive ? 'success' : 'secondary'}>
          {agent.isActive ? 'Active' : 'Inactive'}
        </Badge>
      </div>

      {agent.metadata.description && (
        <p className="text-sm text-gray-600 dark:text-gray-300 mb-4 line-clamp-2">
          {agent.metadata.description}
        </p>
      )}

      <div className="flex flex-wrap gap-2 mb-4">
        {agent.capabilities.slice(0, 3).map((capability) => (
          <Badge key={capability} variant="outline">
            {capability}
          </Badge>
        ))}
        {agent.capabilities.length > 3 && (
          <Badge variant="outline">+{agent.capabilities.length - 3}</Badge>
        )}
      </div>

      {!shouldHideAll && (
        <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
          {shouldShowFullReputation ? (
            <>
              <div className="flex items-center gap-2">
                <Star className="w-4 h-4 text-yellow-500" />
                <span>{agent.reputation.score.toFixed(1)}</span>
                <span className="text-gray-500">
                  ({formatNumber(agent.reputation.totalJobs)} jobs)
                </span>
              </div>
              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-green-500" />
                <span>{formatSol(agent.pricing)}</span>
              </div>
            </>
          ) : shouldShowTierOnly ? (
            <div className="col-span-2 flex items-center justify-center">
              <Badge variant="outline" className="text-sm">
                {/* Mock tier - in real app this would come from reputation data */}
                Gold Tier Agent
              </Badge>
            </div>
          ) : (
            <div className="col-span-2 text-center text-sm text-muted-foreground">
              Reputation data hidden
            </div>
          )}
        </div>
      )}

      <div className="flex gap-2">
        <Link href={`/agents/${agent.address}`} className="flex-1">
          <Button variant="outline" className="w-full">
            View Details
          </Button>
        </Link>
        <Link href={`/agents/${agent.address}/hire`} className="flex-1">
          <Button variant="gradient" className="w-full">
            Hire Agent
          </Button>
        </Link>
      </div>
    </Card>
  )
}
