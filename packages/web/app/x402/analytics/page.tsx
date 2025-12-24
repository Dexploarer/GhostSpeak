/**
 * x402 Analytics Page
 *
 * Real-time platform and user metrics for x402 payments
 */

'use client'

import React from 'react'
import { useWalletAddress } from '@/lib/hooks/useWalletAddress'
import { Activity, TrendingUp } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { AnalyticsDashboard, UserAnalyticsDashboard, PaymentHistory } from '@/components/x402'

export default function X402AnalyticsPage(): React.JSX.Element {
  const { address: publicKey } = useWalletAddress()

  return (
    <div className="min-h-screen bg-linear-to-br from-purple-50 via-white to-blue-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold gradient-text mb-2">x402 Analytics</h1>
          <p className="text-gray-600 dark:text-gray-400">Real-time payment metrics and insights</p>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="platform" className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="platform" className="gap-2">
              <TrendingUp className="w-4 h-4" />
              Platform Metrics
            </TabsTrigger>
            <TabsTrigger value="personal" className="gap-2" disabled={!publicKey}>
              <Activity className="w-4 h-4" />
              My Activity
            </TabsTrigger>
          </TabsList>

          {/* Platform Analytics */}
          <TabsContent value="platform" className="space-y-6">
            <AnalyticsDashboard />
          </TabsContent>

          {/* Personal Analytics */}
          <TabsContent value="personal" className="space-y-6">
            {publicKey ? (
              <>
                <UserAnalyticsDashboard />
                <PaymentHistory />
              </>
            ) : (
              <div className="glass rounded-xl p-12 text-center">
                <Activity className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                <h3 className="text-xl font-semibold mb-2">Connect Your Wallet</h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Connect your wallet to view your personal analytics
                </p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
