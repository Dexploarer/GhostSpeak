'use client'

/**
 * Billing Panel Component
 *
 * Displays team's USDC balance, usage stats, and deposit controls
 * for B2B prepaid billing system.
 */

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  AlertCircle,
  AlertTriangle,
  ArrowUpCircle,
  Wallet,
  TrendingUp,
  Calendar,
  Activity,
} from 'lucide-react'

interface BillingData {
  balance: {
    raw: string
    usdc: number
    formatted: string
  }
  projection: {
    currentUsage: {
      totalRequests: number
      avgDailyRequests: number
    }
    projected: {
      balanceInMonth: number
      daysRemaining: number
      needsRefill: boolean
    }
  }
  alerts: {
    lowBalance: boolean
    critical: boolean
    message: string | null
  }
  tier: string
  tokenAccount: string
}

interface UsageData {
  summary: {
    totalRequests: number
    billableRequests: number
    includedRequests: number
    requestsRemaining: number
  }
  costs: {
    monthlyFee: number
    overageFees: number
    totalCost: number
  }
  overage: {
    hasOverage: boolean
    overageRequests: number
    overageRate: number
  }
}

export default function BillingPanel({ apiKey }: { apiKey: string }) {
  const [billing, setBilling] = useState<BillingData | null>(null)
  const [usage, setUsage] = useState<UsageData | null>(null)
  const [loading, setLoading] = useState(true)
  const [depositAmount, setDepositAmount] = useState('')
  const [depositing, setDepositing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Fetch billing data
  useEffect(() => {
    async function fetchBilling() {
      try {
        const response = await fetch('/api/v1/billing/balance', {
          headers: {
            'X-API-Key': apiKey,
          },
        })

        if (!response.ok) {
          throw new Error('Failed to fetch billing data')
        }

        const data = await response.json()
        setBilling(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setLoading(false)
      }
    }

    async function fetchUsage() {
      try {
        const response = await fetch('/api/v1/billing/usage', {
          headers: {
            'X-API-Key': apiKey,
          },
        })

        if (!response.ok) {
          throw new Error('Failed to fetch usage data')
        }

        const data = await response.json()
        setUsage(data)
      } catch (err) {
        console.error('Failed to fetch usage:', err)
      }
    }

    fetchBilling()
    fetchUsage()
  }, [apiKey])

  // Handle deposit
  async function handleDeposit() {
    if (!depositAmount || parseFloat(depositAmount) <= 0) {
      alert('Please enter a valid amount')
      return
    }

    setDepositing(true)
    setError(null)

    try {
      // TODO: Get wallet address from user context
      const walletAddress = 'YOUR_WALLET_ADDRESS' // Replace with actual wallet

      const response = await fetch('/api/v1/billing/deposit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': apiKey,
        },
        body: JSON.stringify({
          amount: parseFloat(depositAmount),
          walletAddress,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Deposit failed')
      }

      const data = await response.json()

      // TODO: Sign and send transaction
      alert(`Deposit transaction created. Please sign to complete: ${data.transaction.serialized}`)

      setDepositAmount('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Deposit failed')
    } finally {
      setDepositing(false)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64 mt-2" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>
    )
  }

  if (error || !billing) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error || 'Failed to load billing data'}</AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="space-y-6">
      {/* Balance Alert */}
      {billing.alerts.lowBalance && (
        <Alert variant={billing.alerts.critical ? 'destructive' : 'default'}>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{billing.alerts.message}</AlertDescription>
        </Alert>
      )}

      {/* Current Balance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            Current Balance
          </CardTitle>
          <CardDescription>Your team's prepaid USDC balance</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <div className="text-4xl font-bold">{billing.balance.formatted}</div>
              <div className="text-sm text-muted-foreground mt-1">
                Token Account: {billing.tokenAccount.slice(0, 8)}...{billing.tokenAccount.slice(-8)}
              </div>
            </div>

            {/* Add Funds */}
            <div className="flex gap-2">
              <Input
                type="number"
                placeholder="Amount (USDC)"
                value={depositAmount}
                onChange={(e) => setDepositAmount(e.target.value)}
                className="max-w-xs"
              />
              <Button onClick={handleDeposit} disabled={depositing}>
                <ArrowUpCircle className="h-4 w-4 mr-2" />
                {depositing ? 'Processing...' : 'Add Funds'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Usage This Month */}
      {usage && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Usage This Month
            </CardTitle>
            <CardDescription>API requests and costs</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <div className="text-sm text-muted-foreground">Total Requests</div>
                <div className="text-2xl font-bold">
                  {usage.summary.totalRequests.toLocaleString()}
                </div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Remaining</div>
                <div className="text-2xl font-bold">
                  {usage.summary.requestsRemaining.toLocaleString()}
                </div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Monthly Fee</div>
                <div className="text-2xl font-bold">${usage.costs.monthlyFee.toFixed(2)}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Overage Fees</div>
                <div className="text-2xl font-bold text-orange-500">
                  ${usage.costs.overageFees.toFixed(2)}
                </div>
              </div>
            </div>

            {usage.overage.hasOverage && (
              <Alert className="mt-4">
                <TrendingUp className="h-4 w-4" />
                <AlertDescription>
                  You have {usage.overage.overageRequests.toLocaleString()} overage requests at $
                  {usage.overage.overageRate.toFixed(4)} per request. 100% of overage fees go to
                  GHOST stakers.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {/* Projected Balance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Projected Balance
          </CardTitle>
          <CardDescription>Based on current usage trends</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <div className="text-sm text-muted-foreground">Avg Daily Requests</div>
              <div className="text-xl font-semibold">
                {billing.projection.currentUsage.avgDailyRequests}
              </div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Days Remaining</div>
              <div className="text-xl font-semibold">
                {billing.projection.projected.daysRemaining === Infinity
                  ? '∞'
                  : billing.projection.projected.daysRemaining}
              </div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Balance in 30 Days</div>
              <div className="text-xl font-semibold">
                ${billing.projection.projected.balanceInMonth.toFixed(2)}
              </div>
            </div>
          </div>

          {billing.projection.projected.needsRefill && (
            <Alert variant="default" className="mt-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                At current usage rates, you'll need to refill within{' '}
                {billing.projection.projected.daysRemaining} days.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Tier Info */}
      <Card>
        <CardHeader>
          <CardTitle>Subscription Tier</CardTitle>
        </CardHeader>
        <CardContent>
          <Badge variant="outline" className="text-lg px-4 py-2">
            {billing.tier.toUpperCase()}
          </Badge>
        </CardContent>
      </Card>
    </div>
  )
}
