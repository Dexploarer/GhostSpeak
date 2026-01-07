'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Eye, Shield, Lock, EyeOff, RotateCcw, Save } from 'lucide-react'
import { cn } from '@/lib/utils'

export type MetricVisibility = 'public' | 'tier-only' | 'authorized-only' | 'hidden'

export interface MetricSettings {
  [metricName: string]: MetricVisibility
}

export interface MetricVisibilityControlProps {
  settings: MetricSettings
  onChange: (settings: MetricSettings) => void
  onSave: () => void
  onReset: () => void
  isSaving?: boolean
}

const metrics = [
  { name: 'overallScore', label: 'Overall Score', category: 'Core' },
  { name: 'reputationTier', label: 'Reputation Tier', category: 'Core' },
  { name: 'totalJobsCompleted', label: 'Jobs Completed', category: 'Performance' },
  { name: 'totalJobsFailed', label: 'Jobs Failed', category: 'Performance' },
  { name: 'successRate', label: 'Success Rate', category: 'Performance' },
  { name: 'avgResponseTime', label: 'Avg Response Time', category: 'Performance' },
  { name: 'disputesAgainst', label: 'Disputes Filed', category: 'Trust' },
  { name: 'disputesResolved', label: 'Disputes Resolved', category: 'Trust' },
  { name: 'disputeRate', label: 'Dispute Rate', category: 'Trust' },
  { name: 'avgRating', label: 'Average Rating', category: 'Quality' },
  { name: 'totalEarnings', label: 'Total Earnings', category: 'Financial' },
  { name: 'badges', label: 'Achievement Badges', category: 'Achievements' },
  { name: 'categoryReputations', label: 'Category Scores', category: 'Expertise' },
]

const visibilityOptions: Array<{
  value: MetricVisibility
  label: string
  icon: React.ComponentType<{ className?: string }>
  color: string
}> = [
  { value: 'public', label: 'Public', icon: Eye, color: 'text-green-500' },
  { value: 'tier-only', label: 'Tier Only', icon: Shield, color: 'text-blue-500' },
  { value: 'authorized-only', label: 'Authorized', icon: Lock, color: 'text-yellow-500' },
  { value: 'hidden', label: 'Hidden', icon: EyeOff, color: 'text-red-500' },
]

export function MetricVisibilityControl({
  settings,
  onChange,
  onSave,
  onReset,
  isSaving = false,
}: MetricVisibilityControlProps): React.JSX.Element {
  const [expandedCategory, setExpandedCategory] = useState<string | null>('Core')

  const categories = [...new Set(metrics.map((m) => m.category))]

  const handleMetricChange = (metricName: string, visibility: MetricVisibility) => {
    onChange({
      ...settings,
      [metricName]: visibility,
    })
  }

  const handleBulkChange = (visibility: MetricVisibility) => {
    const newSettings: MetricSettings = {}
    metrics.forEach((metric) => {
      newSettings[metric.name] = visibility
    })
    onChange(newSettings)
  }

  const getVisibilityIcon = (visibility: MetricVisibility) => {
    const option = visibilityOptions.find((o) => o.value === visibility)
    if (!option) return null
    const Icon = option.icon
    return <Icon className={cn('w-4 h-4', option.color)} />
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Metric Visibility</CardTitle>
            <CardDescription>
              Control which reputation metrics are visible to others
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onReset}>
              <RotateCcw className="w-4 h-4 mr-2" />
              Reset
            </Button>
            <Button size="sm" onClick={onSave} disabled={isSaving}>
              <Save className="w-4 h-4 mr-2" />
              {isSaving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Quick Actions */}
        <div className="flex flex-wrap gap-2 pb-4 border-b">
          <span className="text-sm text-muted-foreground mr-2">Quick set all to:</span>
          {visibilityOptions.map((option) => {
            const Icon = option.icon
            return (
              <Button
                key={option.value}
                variant="outline"
                size="sm"
                onClick={() => handleBulkChange(option.value)}
              >
                <Icon className={cn('w-3 h-3 mr-1.5', option.color)} />
                {option.label}
              </Button>
            )
          })}
        </div>

        {/* Metrics by Category */}
        <div className="space-y-4">
          {categories.map((category) => {
            const categoryMetrics = metrics.filter((m) => m.category === category)
            const isExpanded = expandedCategory === category

            return (
              <div key={category} className="border rounded-lg overflow-hidden">
                <button
                  className="w-full px-4 py-3 bg-muted/50 hover:bg-muted flex items-center justify-between text-sm font-medium transition-colors"
                  onClick={() => setExpandedCategory(isExpanded ? null : category)}
                >
                  <span className="flex items-center gap-2">
                    {category}
                    <Badge variant="outline" className="text-xs">
                      {categoryMetrics.length}
                    </Badge>
                  </span>
                  <span className="text-muted-foreground">{isExpanded ? '−' : '+'}</span>
                </button>

                {isExpanded && (
                  <div className="p-4 space-y-3">
                    {categoryMetrics.map((metric) => {
                      const currentVisibility = settings[metric.name] || 'public'

                      return (
                        <div
                          key={metric.name}
                          className="flex items-center justify-between py-2 border-b last:border-0"
                        >
                          <Label htmlFor={metric.name} className="cursor-pointer">
                            <div className="flex items-center gap-2">
                              {getVisibilityIcon(currentVisibility)}
                              <span className="font-medium text-sm">{metric.label}</span>
                            </div>
                          </Label>

                          <Select
                            value={currentVisibility}
                            onValueChange={(value) =>
                              handleMetricChange(metric.name, value as MetricVisibility)
                            }
                          >
                            <SelectTrigger id={metric.name} className="w-[150px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {visibilityOptions.map((option) => {
                                const Icon = option.icon
                                return (
                                  <SelectItem key={option.value} value={option.value}>
                                    <div className="flex items-center gap-2">
                                      <Icon className={cn('w-4 h-4', option.color)} />
                                      {option.label}
                                    </div>
                                  </SelectItem>
                                )
                              })}
                            </SelectContent>
                          </Select>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
