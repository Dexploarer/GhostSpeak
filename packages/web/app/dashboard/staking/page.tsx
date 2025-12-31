'use client'

import React, { useState } from 'react'
import { useWalletAddress } from '@/lib/hooks/useWalletAddress'
import { useAgents } from '@/lib/queries/agents'
import { StakingStatsCard } from '@/components/staking/StakingStatsCard'
import { StakeForm } from '@/components/staking/StakeForm'
import { TierProgressCard } from '@/components/staking/TierProgressCard'
import { BenefitsDisplayCard } from '@/components/staking/BenefitsDisplayCard'
import { UnstakeDialog } from '@/components/staking/UnstakeDialog'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import { Info, TrendingUp, Users, Lock } from 'lucide-react'
import { useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'
import Link from 'next/link'

export default function StakingDashboard() {
  const { address, isConnected } = useWalletAddress()
  const { data: agents = [], isLoading: isLoadingAgents } = useAgents()

  const [selectedAgentAddress, setSelectedAgentAddress] = useState<string>('')
  const [showUnstakeDialog, setShowUnstakeDialog] = useState(false)

  // Get staking account for selected agent
  const stakingAccount = useQuery(
    api.staking.getStakingAccount,
    selectedAgentAddress ? { agentAddress: selectedAgentAddress } : 'skip'
  )

  // Get staking history
  const stakingHistory = useQuery(
    api.staking.getStakingHistory,
    selectedAgentAddress ? { agentAddress: selectedAgentAddress } : 'skip'
  )

  // Get platform stats
  const platformStats = useQuery(api.staking.getStakingStats)

  const ghostBalance = 50000

  // Set default agent when agents load
  React.useEffect(() => {
    if (agents.length > 0 && !selectedAgentAddress) {
      setSelectedAgentAddress(agents[0].address)
    }
  }, [agents, selectedAgentAddress])

  if (!isConnected) {
    return (
      <div className="container mx-auto p-6 max-w-7xl">
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            Please connect your wallet to access the staking dashboard.
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-4 sm:p-6 max-w-7xl space-y-6">
      {/* Header */}
      <div className="space-y-4">
        <div>
          <h1 className="text-3xl font-bold">GHOST Staking</h1>
          <p className="text-muted-foreground">
            Stake GHOST tokens to boost your agent's reputation and unlock premium benefits
          </p>
        </div>

        {/* Platform Stats */}
        {platformStats && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Staked</p>
                    <p className="text-2xl font-bold">
                      {platformStats.totalStaked.toLocaleString()}
                    </p>
                    <p className="text-xs text-muted-foreground">GHOST</p>
                  </div>
                  <Lock className="w-8 h-8 text-primary" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Stakers</p>
                    <p className="text-2xl font-bold">{platformStats.totalStakers}</p>
                    <p className="text-xs text-muted-foreground">Agents</p>
                  </div>
                  <Users className="w-8 h-8 text-primary" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Avg Boost</p>
                    <p className="text-2xl font-bold">+12.5%</p>
                    <p className="text-xs text-muted-foreground">Reputation</p>
                  </div>
                  <TrendingUp className="w-8 h-8 text-primary" />
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Agent Selector */}
      {isLoadingAgents ? (
        <Skeleton className="h-12 w-full" />
      ) : agents.length === 0 ? (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>You don't have any agents registered yet.</span>
            <Button asChild variant="outline" size="sm">
              <Link href="/dashboard/agents">Register Agent</Link>
            </Button>
          </AlertDescription>
        </Alert>
      ) : (
        <div className="flex items-center gap-4">
          <label className="text-sm font-medium">Select Agent:</label>
          <Select value={selectedAgentAddress} onValueChange={setSelectedAgentAddress}>
            <SelectTrigger className="w-full max-w-md">
              <SelectValue placeholder="Choose an agent" />
            </SelectTrigger>
            <SelectContent>
              {agents.map((agent) => (
                <SelectItem key={agent.address} value={agent.address}>
                  {agent.name || 'Unnamed Agent'} ({agent.address.slice(0, 8)}...)
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Main Content */}
      {selectedAgentAddress && (
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column: Stats */}
              <div className="lg:col-span-1">
                <StakingStatsCard
                  agentAddress={selectedAgentAddress}
                  onStakeMore={() => {
                    // Scroll to stake form
                    document.getElementById('stake-form')?.scrollIntoView({ behavior: 'smooth' })
                  }}
                  onUnstake={() => setShowUnstakeDialog(true)}
                />
              </div>

              {/* Center Column: Stake Form */}
              <div className="lg:col-span-1" id="stake-form">
                <StakeForm
                  agentAddress={selectedAgentAddress}
                  ghostBalance={ghostBalance}
                  onSuccess={() => {
                    // Refresh data
                    console.log('Stake successful')
                  }}
                />
              </div>

              {/* Right Column: Benefits */}
              <div className="lg:col-span-1 space-y-6">
                {stakingAccount && (
                  <TierProgressCard
                    currentAmount={stakingAccount.amountStaked}
                    currentTier={stakingAccount.tier}
                  />
                )}
                <BenefitsDisplayCard
                  currentTier={stakingAccount?.tier || 0}
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="history">
            <Card>
              <CardHeader>
                <CardTitle>Staking History</CardTitle>
              </CardHeader>
              <CardContent>
                {!stakingHistory || stakingHistory.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    No staking history yet
                  </p>
                ) : (
                  <div className="space-y-4">
                    {stakingHistory.map((event) => (
                      <div
                        key={event._id}
                        className="flex items-center justify-between p-4 border border-border rounded-lg"
                      >
                        <div className="flex items-center gap-4">
                          <div
                            className={`w-10 h-10 rounded-full flex items-center justify-center ${
                              event.eventType === 'staked'
                                ? 'bg-green-500/20 text-green-500'
                                : event.eventType === 'unstaked'
                                  ? 'bg-red-500/20 text-red-500'
                                  : 'bg-yellow-500/20 text-yellow-500'
                            }`}
                          >
                            {event.eventType === 'staked' ? '+' : event.eventType === 'unstaked' ? '-' : '!'}
                          </div>
                          <div>
                            <p className="font-semibold capitalize">{event.eventType}</p>
                            <p className="text-sm text-muted-foreground">
                              {new Date(event.timestamp).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold">
                            {event.amount.toLocaleString()} GHOST
                          </p>
                          {event.tierReached && (
                            <p className="text-xs text-muted-foreground">
                              Tier {event.tierReached}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      {/* Unstake Dialog */}
      {stakingAccount && (
        <UnstakeDialog
          open={showUnstakeDialog}
          onOpenChange={setShowUnstakeDialog}
          agentAddress={selectedAgentAddress}
          stakedAmount={stakingAccount.amountStaked}
          reputationBoost={stakingAccount.reputationBoostBps / 100}
          onSuccess={() => {
            console.log('Unstake successful')
          }}
        />
      )}
    </div>
  )
}
