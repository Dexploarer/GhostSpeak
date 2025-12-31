'use client'

import React from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { TrendingUp, Award, Clock, Target } from 'lucide-react'
import type { ReputationMetrics } from '@/lib/queries/reputation'

interface ReputationBreakdownProps {
  reputation: ReputationMetrics
}

export function ReputationBreakdown({ reputation }: ReputationBreakdownProps) {
  return (
    <div className="space-y-6">
      {/* Score Components */}
      <div>
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <Target className="w-5 h-5 text-purple-400" />
          Score Components
        </h3>
        <div className="space-y-3">
          <div>
            <div className="flex justify-between items-center mb-2 text-sm">
              <span className="text-muted-foreground">Success Rate (40% weight)</span>
              <span className="font-semibold">{reputation.successRate}%</span>
            </div>
            <Progress value={reputation.successRate} className="h-2" />
          </div>

          <div>
            <div className="flex justify-between items-center mb-2 text-sm">
              <span className="text-muted-foreground">Service Quality (30% weight)</span>
              <span className="font-semibold">
                {Math.min(100, Math.round((reputation.score / 10) * 1.2))}%
              </span>
            </div>
            <Progress
              value={Math.min(100, Math.round((reputation.score / 10) * 1.2))}
              className="h-2"
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-2 text-sm">
              <span className="text-muted-foreground">Response Time (20% weight)</span>
              <span className="font-semibold">95%</span>
            </div>
            <Progress value={95} className="h-2" />
          </div>

          <div>
            <div className="flex justify-between items-center mb-2 text-sm">
              <span className="text-muted-foreground">Volume Consistency (10% weight)</span>
              <span className="font-semibold">
                {Math.min(100, Math.round((reputation.totalJobs / 100) * 100))}%
              </span>
            </div>
            <Progress
              value={Math.min(100, Math.round((reputation.totalJobs / 100) * 100))}
              className="h-2"
            />
          </div>
        </div>
      </div>

      {/* Badges */}
      {reputation.badges.length > 0 && (
        <div>
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Award className="w-5 h-5 text-yellow-400" />
            Earned Badges
          </h3>
          <div className="grid grid-cols-2 gap-3">
            {reputation.badges.map((badge, idx) => (
              <Card key={idx} className="p-4 bg-yellow-500/5 border-yellow-500/30">
                <div className="flex items-start gap-3">
                  <Award className="w-6 h-6 text-yellow-400" />
                  <div>
                    <h4 className="font-semibold text-sm mb-1">{badge.name}</h4>
                    <p className="text-xs text-muted-foreground">{badge.description}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Performance History */}
      {reputation.performanceHistory.length > 0 && (
        <div>
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-green-400" />
            Performance History
          </h3>
          <div className="space-y-2">
            {reputation.performanceHistory.slice(-6).map((entry, idx) => (
              <div key={idx} className="flex items-center gap-4 text-sm">
                <span className="text-muted-foreground w-24">{entry.period}</span>
                <div className="flex-1">
                  <Progress value={entry.score} className="h-2" />
                </div>
                <span className="font-semibold w-12">{entry.score}%</span>
                <span className="text-muted-foreground w-20">
                  {entry.jobsCompleted} jobs
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Category Scores */}
      {Object.keys(reputation.categoryScores).length > 0 && (
        <div>
          <h3 className="font-semibold mb-4">Category Performance</h3>
          <div className="grid grid-cols-2 gap-3">
            {Object.entries(reputation.categoryScores).map(([category, score]) => (
              <div key={category} className="bg-card/50 rounded p-3">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm capitalize">{category}</span>
                  <span className="font-semibold text-sm">{score}%</span>
                </div>
                <Progress value={score} className="h-2" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Risk Assessment */}
      <div className={`rounded-lg p-4 ${reputation.riskScore < 20 ? 'bg-green-500/10 border border-green-500/30' : reputation.riskScore < 40 ? 'bg-yellow-500/10 border border-yellow-500/30' : 'bg-red-500/10 border border-red-500/30'}`}>
        <h3 className="font-semibold mb-2 flex items-center gap-2">
          <Clock className="w-5 h-5" />
          Risk Assessment
        </h3>
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm text-muted-foreground">Risk Score</span>
          <Badge
            variant={
              reputation.riskScore < 20 ? 'success' : reputation.riskScore < 40 ? 'warning' : 'destructive'
            }
          >
            {reputation.riskScore}/100
          </Badge>
        </div>
        <div className="text-sm">
          <span className="font-semibold">Trust Level: </span>
          <span
            className={
              reputation.trustLevel === 'HIGH'
                ? 'text-green-400'
                : reputation.trustLevel === 'MEDIUM'
                  ? 'text-yellow-400'
                  : 'text-red-400'
            }
          >
            {reputation.trustLevel}
          </span>
        </div>
      </div>
    </div>
  )
}
