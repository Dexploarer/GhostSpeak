/**
 * x402-Enhanced Agent Card Component
 *
 * Displays agent information with x402 pricing and capabilities
 */

'use client'

import React, { useState } from 'react'
import { Bot, DollarSign, Zap, Star, Clock, TrendingUp } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { PricingDisplay } from './PricingDisplay'
import { PaymentDialog } from './PaymentDialog'
import type { Agent } from '@/lib/ghostspeak'

interface X402AgentCardProps {
  agent: Agent
  showPayButton?: boolean
  onPaymentSuccess?: (signature: string) => void
}

export function X402AgentCard({
  agent,
  showPayButton = true,
  onPaymentSuccess
}: X402AgentCardProps): React.JSX.Element {
  const [showPayment, setShowPayment] = useState(false)

  const reputation = agent.reputation ?? 0
  const totalCalls = agent.totalCalls ?? 0
  const successRate = agent.successRate ?? 0

  return (
    <>
      <Card className="card-hover h-full flex flex-col">
        <CardHeader>
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 flex-1 min-w-0">
              {/* Agent Icon */}
              <div className="w-12 h-12 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 flex items-center justify-center shrink-0">
                <Bot className="w-6 h-6 text-white" />
              </div>

              {/* Agent Info */}
              <div className="flex-1 min-w-0">
                <CardTitle className="text-lg truncate">{agent.name}</CardTitle>
                <CardDescription className="text-xs truncate">
                  {agent.address.slice(0, 8)}...{agent.address.slice(-8)}
                </CardDescription>
              </div>
            </div>

            {/* Reputation Badge */}
            {reputation > 0 && (
              <Badge variant="outline" className="gap-1 shrink-0">
                <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                {reputation.toFixed(1)}
              </Badge>
            )}
          </div>
        </CardHeader>

        <CardContent className="flex-1 flex flex-col gap-4">
          {/* Capabilities */}
          {agent.capabilities && agent.capabilities.length > 0 && (
            <div>
              <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
                Capabilities
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {agent.capabilities.slice(0, 3).map((capability) => (
                  <Badge key={capability} variant="secondary" className="text-xs">
                    {capability}
                  </Badge>
                ))}
                {agent.capabilities.length > 3 && (
                  <Badge variant="secondary" className="text-xs">
                    +{agent.capabilities.length - 3} more
                  </Badge>
                )}
              </div>
            </div>
          )}

          {/* Stats */}
          <div className="grid grid-cols-2 gap-3">
            <div className="glass rounded-lg p-2.5">
              <div className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400 mb-1">
                <TrendingUp className="w-3.5 h-3.5" />
                <span className="text-xs">Total Calls</span>
              </div>
              <div className="text-lg font-bold">{totalCalls.toLocaleString()}</div>
            </div>

            <div className="glass rounded-lg p-2.5">
              <div className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400 mb-1">
                <Zap className="w-3.5 h-3.5" />
                <span className="text-xs">Success Rate</span>
              </div>
              <div className="text-lg font-bold">{(successRate * 100).toFixed(1)}%</div>
            </div>
          </div>

          {/* x402 Pricing */}
          {agent.pricing && (
            <div className="glass rounded-lg p-3">
              <PricingDisplay pricing={agent.pricing} showDetails />
            </div>
          )}

          {/* Performance Indicator */}
          {agent.pricing?.responseTimeMs && agent.pricing.responseTimeMs > 0 && (
            <div className="flex items-center justify-center gap-2 p-2 rounded-lg bg-gradient-to-r from-green-500/10 to-emerald-600/10">
              <Clock className="w-4 h-4 text-green-600 dark:text-green-400" />
              <span className="text-sm text-green-600 dark:text-green-400 font-medium">
                Fast Response: {agent.pricing.responseTimeMs}ms avg
              </span>
            </div>
          )}

          {/* Pay Button */}
          {showPayButton && (
            <Button
              variant="gradient"
              onClick={() => setShowPayment(true)}
              className="w-full gap-2 button-hover-lift mt-auto"
            >
              <DollarSign className="w-4 h-4" />
              Pay & Use Agent
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Payment Dialog */}
      <PaymentDialog
        open={showPayment}
        onOpenChange={setShowPayment}
        agent={agent}
        onSuccess={onPaymentSuccess}
      />
    </>
  )
}

interface X402AgentGridProps {
  agents: Agent[]
  isLoading?: boolean
  emptyMessage?: string
}

export function X402AgentGrid({
  agents,
  isLoading,
  emptyMessage = 'No agents found'
}: X402AgentGridProps): React.JSX.Element {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {[...Array(8)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="h-64 bg-gray-200 dark:bg-gray-800 rounded"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (agents.length === 0) {
    return (
      <div className="glass rounded-xl p-12 text-center">
        <Bot className="w-16 h-16 mx-auto text-gray-400 mb-4" />
        <p className="text-gray-600 dark:text-gray-400">{emptyMessage}</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {agents.map((agent) => (
        <X402AgentCard key={agent.address} agent={agent} />
      ))}
    </div>
  )
}
