/**
 * API Usage & Billing Dashboard
 * View API usage statistics and billing information
 */

'use client'

import { useState } from 'react'
import { useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { Activity, DollarSign, TrendingUp, Clock } from 'lucide-react'
import { useConvexUser } from '@/lib/hooks/useConvexUser'

export default function ApiUsagePage() {
  const { user } = useConvexUser()
  const [selectedKeyId, setSelectedKeyId] = useState<string | null>(null)
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d')

  // Fetch user's API keys
  const apiKeys = useQuery(api.apiKeys.getActiveByUser, user?._id ? { userId: user._id } : 'skip')

  // Calculate date range
  const now = Date.now()
  const ranges = {
    '7d': 7 * 24 * 60 * 60 * 1000,
    '30d': 30 * 24 * 60 * 60 * 1000,
    '90d': 90 * 24 * 60 * 60 * 1000,
  }
  const startDate = now - ranges[timeRange]

  // Fetch usage summary
  const usageSummary = useQuery(
    api.apiUsage.getSummaryByUser,
    user?._id
      ? {
          userId: user._id,
          startDate,
          endDate: now,
        }
      : 'skip'
  )

  // Fetch key-specific stats
  const keyStats = useQuery(
    api.apiKeys.getKeyStats,
    selectedKeyId ? { apiKeyId: selectedKeyId as any } : 'skip'
  )

  // Format chart data
  const chartData = usageSummary?.daily
    ? Object.entries(usageSummary.daily)
        .map(([date, data]: [string, { count: number; cost: number }]) => ({
          date,
          requests: data.count,
          cost: data.cost / 100, // Convert cents to dollars
        }))
        .slice(-30) // Last 30 days
    : []

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(cents / 100)
  }

  return (
    <div className="container mx-auto py-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">API Usage & Billing</h1>
        <p className="text-muted-foreground mt-2">Monitor your API usage and estimated costs</p>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <Select value={timeRange} onValueChange={(v: any) => setTimeRange(v)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7d">Last 7 days</SelectItem>
            <SelectItem value="30d">Last 30 days</SelectItem>
            <SelectItem value="90d">Last 90 days</SelectItem>
          </SelectContent>
        </Select>

        {apiKeys && apiKeys.length > 0 && (
          <Select
            value={selectedKeyId || 'all'}
            onValueChange={(v) => setSelectedKeyId(v === 'all' ? null : v)}
          >
            <SelectTrigger className="w-[240px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All API Keys</SelectItem>
              {apiKeys.map((key: { _id: string; name?: string; keyPrefix: string }) => (
                <SelectItem key={key._id} value={key._id}>
                  {key.name || key.keyPrefix}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Summary Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {usageSummary?.totalRequests.toLocaleString() || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {usageSummary?.billableRequests.toLocaleString() || 0} billable
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Cost</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(usageSummary?.totalCost || 0)}</div>
            <p className="text-xs text-muted-foreground">Current period</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Usage</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {keyStats?.stats?.todayRequests.toLocaleString() || 0}
            </div>
            <p className="text-xs text-muted-foreground">Requests today</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Response Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Math.round(keyStats?.stats?.avgResponseTime || 0)}ms
            </div>
            <p className="text-xs text-muted-foreground">Average latency</p>
          </CardContent>
        </Card>
      </div>

      {/* Usage Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Usage Over Time</CardTitle>
          <CardDescription>Daily API requests and costs</CardDescription>
        </CardHeader>
        <CardContent>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="date"
                  tickFormatter={(date) =>
                    new Date(date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
                  }
                />
                <YAxis />
                <Tooltip
                  labelFormatter={(date) => new Date(date).toLocaleDateString()}
                  formatter={
                    ((value: number | undefined, name: string) =>
                      name === 'cost'
                        ? formatCurrency((value ?? 0) * 100)
                        : String(value ?? 0)) as any
                  }
                />
                <Bar dataKey="requests" fill="hsl(var(--primary))" name="Requests" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-muted-foreground">
              No usage data available
            </div>
          )}
        </CardContent>
      </Card>

      {/* Endpoint Breakdown */}
      {usageSummary?.byEndpoint && Object.keys(usageSummary.byEndpoint).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Usage by Endpoint</CardTitle>
            <CardDescription>Breakdown of API calls per endpoint</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(usageSummary.byEndpoint).map(([endpoint, data]: [string, any]) => (
                <div key={endpoint} className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="font-medium font-mono text-sm">{endpoint}</p>
                    <p className="text-xs text-muted-foreground">
                      {data.count} requests • {Math.round(data.avgResponseTime)}ms avg
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">{formatCurrency(data.totalCost)}</p>
                    <Badge variant="outline" className="text-xs">
                      {data.billableCount} billable
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Projected Monthly Bill */}
      <Card>
        <CardHeader>
          <CardTitle>Projected Monthly Cost</CardTitle>
          <CardDescription>Estimated cost based on current usage patterns</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">
            {formatCurrency((usageSummary?.totalCost || 0) * 3)}
          </div>
          <p className="text-sm text-muted-foreground mt-2">Based on {timeRange} average usage</p>
        </CardContent>
      </Card>
    </div>
  )
}
