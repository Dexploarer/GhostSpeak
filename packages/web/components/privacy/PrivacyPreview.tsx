'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Eye, EyeOff, Star, TrendingUp, Shield, Lock } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { PrivacyMode } from './PrivacyIndicator'
import type { MetricSettings } from './MetricVisibilityControl'

export interface ReputationData {
  overallScore: number
  reputationTier: string
  totalJobsCompleted: number
  totalJobsFailed: number
  successRate: number
  avgResponseTime: number
  disputesAgainst: number
  disputesResolved: number
  disputeRate: number
  avgRating: number
  totalEarnings: number
  badges: string[]
}

export interface PrivacyPreviewProps {
  privacyMode: PrivacyMode
  metricSettings: MetricSettings
  reputationData: ReputationData
}

export function PrivacyPreview({
  privacyMode,
  metricSettings,
  reputationData,
}: PrivacyPreviewProps): React.JSX.Element {
  const isMetricVisible = (metricName: string, viewerIsAuthorized: boolean = false): boolean => {
    if (privacyMode === 'hidden') return false
    if (privacyMode === 'public') return true

    const metricVisibility = metricSettings[metricName] || 'public'

    if (metricVisibility === 'public') return true
    if (metricVisibility === 'hidden') return false
    if (metricVisibility === 'authorized-only') return viewerIsAuthorized
    if (metricVisibility === 'tier-only') return metricName === 'reputationTier'

    return true
  }

  const renderMetric = (
    label: string,
    value: React.ReactNode,
    metricName: string,
    isAuthorized: boolean
  ) => {
    const visible = isMetricVisible(metricName, isAuthorized)

    return (
      <div className="flex items-center justify-between py-2">
        <span className="text-sm text-muted-foreground">{label}</span>
        {visible ? (
          <span className="text-sm font-medium">{value}</span>
        ) : (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Lock className="w-3 h-3" />
            <span>Hidden</span>
          </div>
        )}
      </div>
    )
  }

  const getTierColor = (tier: string): string => {
    switch (tier.toLowerCase()) {
      case 'platinum':
        return 'bg-gradient-to-r from-gray-300 to-gray-400'
      case 'gold':
        return 'bg-gradient-to-r from-yellow-400 to-yellow-600'
      case 'silver':
        return 'bg-gradient-to-r from-gray-400 to-gray-500'
      case 'bronze':
        return 'bg-gradient-to-r from-orange-600 to-orange-700'
      default:
        return 'bg-gray-500'
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Full View (Owner) */}
      <Card className="border-2 border-primary">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Eye className="w-5 h-5 text-primary" />
              <CardTitle className="text-lg">Your View</CardTitle>
            </div>
            <Badge variant="outline" className="bg-primary/10">
              Owner
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">What you always see</p>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Tier Badge */}
          <div className="flex items-center justify-center py-6">
            <div
              className={cn(
                'px-6 py-3 rounded-xl text-white font-bold text-lg shadow-lg',
                getTierColor(reputationData.reputationTier)
              )}
            >
              {reputationData.reputationTier}
            </div>
          </div>

          <Separator />

          {/* Core Metrics */}
          <div>
            <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <Star className="w-4 h-4" />
              Core Metrics
            </h4>
            {renderMetric(
              'Overall Score',
              `${reputationData.overallScore}/10000`,
              'overallScore',
              true
            )}
            {renderMetric('Reputation Tier', reputationData.reputationTier, 'reputationTier', true)}
          </div>

          <Separator />

          {/* Performance */}
          <div>
            <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Performance
            </h4>
            {renderMetric(
              'Jobs Completed',
              reputationData.totalJobsCompleted.toLocaleString(),
              'totalJobsCompleted',
              true
            )}
            {renderMetric(
              'Success Rate',
              `${reputationData.successRate.toFixed(1)}%`,
              'successRate',
              true
            )}
            {renderMetric(
              'Avg Response Time',
              `${reputationData.avgResponseTime}ms`,
              'avgResponseTime',
              true
            )}
          </div>

          <Separator />

          {/* Trust */}
          <div>
            <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <Shield className="w-4 h-4" />
              Trust Metrics
            </h4>
            {renderMetric(
              'Disputes Filed',
              reputationData.disputesAgainst,
              'disputesAgainst',
              true
            )}
            {renderMetric(
              'Disputes Resolved',
              reputationData.disputesResolved,
              'disputesResolved',
              true
            )}
            {renderMetric('Avg Rating', `${reputationData.avgRating}/5`, 'avgRating', true)}
          </div>
        </CardContent>
      </Card>

      {/* Public View */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <EyeOff className="w-5 h-5 text-muted-foreground" />
              <CardTitle className="text-lg">Public View</CardTitle>
            </div>
            <Badge variant="outline">Others See</Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            What unauthorized viewers see based on your settings
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Tier Badge */}
          <div className="flex items-center justify-center py-6">
            {isMetricVisible('reputationTier', false) ? (
              <div
                className={cn(
                  'px-6 py-3 rounded-xl text-white font-bold text-lg shadow-lg',
                  getTierColor(reputationData.reputationTier)
                )}
              >
                {reputationData.reputationTier}
              </div>
            ) : (
              <div className="px-6 py-3 rounded-xl bg-muted text-muted-foreground font-bold text-lg border-2 border-dashed">
                <Lock className="w-8 h-8 mx-auto" />
              </div>
            )}
          </div>

          <Separator />

          {/* Core Metrics */}
          <div>
            <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <Star className="w-4 h-4" />
              Core Metrics
            </h4>
            {renderMetric(
              'Overall Score',
              `${reputationData.overallScore}/10000`,
              'overallScore',
              false
            )}
            {renderMetric(
              'Reputation Tier',
              reputationData.reputationTier,
              'reputationTier',
              false
            )}
          </div>

          <Separator />

          {/* Performance */}
          <div>
            <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Performance
            </h4>
            {renderMetric(
              'Jobs Completed',
              reputationData.totalJobsCompleted.toLocaleString(),
              'totalJobsCompleted',
              false
            )}
            {renderMetric(
              'Success Rate',
              `${reputationData.successRate.toFixed(1)}%`,
              'successRate',
              false
            )}
            {renderMetric(
              'Avg Response Time',
              `${reputationData.avgResponseTime}ms`,
              'avgResponseTime',
              false
            )}
          </div>

          <Separator />

          {/* Trust */}
          <div>
            <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <Shield className="w-4 h-4" />
              Trust Metrics
            </h4>
            {renderMetric(
              'Disputes Filed',
              reputationData.disputesAgainst,
              'disputesAgainst',
              false
            )}
            {renderMetric(
              'Disputes Resolved',
              reputationData.disputesResolved,
              'disputesResolved',
              false
            )}
            {renderMetric('Avg Rating', `${reputationData.avgRating}/5`, 'avgRating', false)}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
