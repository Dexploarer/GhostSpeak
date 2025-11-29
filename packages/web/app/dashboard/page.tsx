'use client'

import React, { useState } from 'react'
import { useWallet } from '@/lib/stubs/wallet-stubs' // STUB for deployment
import {
  Bot,
  MessageSquare,
  Sparkles,
  ShoppingCart,
  BarChart3,
  Shield,
  Vote,
  Briefcase,
  Home,
} from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

// Import existing page components (we'll create simplified inline versions)
import { useAgents } from '@/lib/queries/agents'
import { useChannels } from '@/lib/queries/channels'

export default function DashboardPage(): React.JSX.Element {
  const { publicKey } = useWallet()
  const [activeTab, setActiveTab] = useState('overview')

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent mb-2">
            GhostSpeak Dashboard
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Manage your AI agents, channels, and marketplace activity
          </p>
        </div>

        {/* Tabbed Interface */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="inline-flex h-auto flex-wrap items-center justify-start rounded-2xl bg-purple-100/50 p-2 gap-2">
            <TabsTrigger
              value="overview"
              className="rounded-xl gap-2 data-[state=active]:bg-white data-[state=active]:shadow-soft"
            >
              <Home className="w-4 h-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger
              value="agents"
              className="rounded-xl gap-2 data-[state=active]:bg-white data-[state=active]:shadow-soft"
            >
              <Bot className="w-4 h-4" />
              AI Agents
            </TabsTrigger>
            <TabsTrigger
              value="channels"
              className="rounded-xl gap-2 data-[state=active]:bg-white data-[state=active]:shadow-soft"
            >
              <MessageSquare className="w-4 h-4" />
              Channels
            </TabsTrigger>
            <TabsTrigger
              value="x402"
              className="rounded-xl gap-2 data-[state=active]:bg-white data-[state=active]:shadow-soft"
            >
              <Sparkles className="w-4 h-4" />
              x402 Payments
            </TabsTrigger>
            <TabsTrigger
              value="marketplace"
              className="rounded-xl gap-2 data-[state=active]:bg-white data-[state=active]:shadow-soft"
            >
              <ShoppingCart className="w-4 h-4" />
              Marketplace
            </TabsTrigger>
            <TabsTrigger
              value="analytics"
              className="rounded-xl gap-2 data-[state=active]:bg-white data-[state=active]:shadow-soft"
            >
              <BarChart3 className="w-4 h-4" />
              Analytics
            </TabsTrigger>
            <TabsTrigger
              value="escrow"
              className="rounded-xl gap-2 data-[state=active]:bg-white data-[state=active]:shadow-soft"
            >
              <Shield className="w-4 h-4" />
              Escrow
            </TabsTrigger>
            <TabsTrigger
              value="governance"
              className="rounded-xl gap-2 data-[state=active]:bg-white data-[state=active]:shadow-soft"
            >
              <Vote className="w-4 h-4" />
              Governance
            </TabsTrigger>
            <TabsTrigger
              value="work-orders"
              className="rounded-xl gap-2 data-[state=active]:bg-white data-[state=active]:shadow-soft"
            >
              <Briefcase className="w-4 h-4" />
              Work Orders
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <OverviewContent publicKey={publicKey} />
          </TabsContent>

          {/* AI Agents Tab */}
          <TabsContent value="agents" className="space-y-6">
            <AgentsContent publicKey={publicKey} />
          </TabsContent>

          {/* Channels Tab */}
          <TabsContent value="channels" className="space-y-6">
            <ChannelsContent publicKey={publicKey} />
          </TabsContent>

          {/* x402 Payments Tab */}
          <TabsContent value="x402" className="space-y-6">
            <X402Content publicKey={publicKey} />
          </TabsContent>

          {/* Marketplace Tab */}
          <TabsContent value="marketplace" className="space-y-6">
            <MarketplaceContent publicKey={publicKey} />
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-6">
            <AnalyticsContent publicKey={publicKey} />
          </TabsContent>

          {/* Escrow Tab */}
          <TabsContent value="escrow" className="space-y-6">
            <EscrowContent publicKey={publicKey} />
          </TabsContent>

          {/* Governance Tab */}
          <TabsContent value="governance" className="space-y-6">
            <GovernanceContent publicKey={publicKey} />
          </TabsContent>

          {/* Work Orders Tab */}
          <TabsContent value="work-orders" className="space-y-6">
            <WorkOrdersContent publicKey={publicKey} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

// Overview Tab Content
function OverviewContent({ publicKey }: { publicKey: unknown }): React.JSX.Element {
  const { data: agents = [] } = useAgents()
  const { data: channels = [] } = useChannels()

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-2 border-purple-100 hover:border-purple-300 transition-colors">
          <CardHeader className="pb-3">
            <CardDescription>My Agents</CardDescription>
            <CardTitle className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
              {agents.length}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Button variant="link" className="p-0 h-auto text-purple-600">
              View all agents →
            </Button>
          </CardContent>
        </Card>

        <Card className="border-2 border-blue-100 hover:border-blue-300 transition-colors">
          <CardHeader className="pb-3">
            <CardDescription>Active Channels</CardDescription>
            <CardTitle className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
              {channels.length}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Button variant="link" className="p-0 h-auto text-blue-600">
              View channels →
            </Button>
          </CardContent>
        </Card>

        <Card className="border-2 border-pink-100 hover:border-pink-300 transition-colors">
          <CardHeader className="pb-3">
            <CardDescription>Total Volume</CardDescription>
            <CardTitle className="text-4xl font-bold bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">
              $2.5K
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Button variant="link" className="p-0 h-auto text-pink-600">
              View analytics →
            </Button>
          </CardContent>
        </Card>

        <Card className="border-2 border-green-100 hover:border-green-300 transition-colors">
          <CardHeader className="pb-3">
            <CardDescription>Reputation Score</CardDescription>
            <CardTitle className="text-4xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
              4.8
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Button variant="link" className="p-0 h-auto text-green-600">
              View details →
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Common tasks and shortcuts</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Button variant="gradient" className="h-auto py-6 flex-col gap-2">
            <Bot className="w-6 h-6" />
            <span>Register New Agent</span>
          </Button>
          <Button variant="outline" className="h-auto py-6 flex-col gap-2 border-2">
            <MessageSquare className="w-6 h-6" />
            <span>Create Channel</span>
          </Button>
          <Button variant="outline" className="h-auto py-6 flex-col gap-2 border-2">
            <Sparkles className="w-6 h-6" />
            <span>Make x402 Payment</span>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

// Agents Tab Content
function AgentsContent({ publicKey }: { publicKey: unknown }): React.JSX.Element {
  const { data: agents = [], isLoading } = useAgents()

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">My AI Agents</h2>
          <p className="text-gray-600">Manage and monitor your registered agents</p>
        </div>
        <Button variant="gradient" className="gap-2">
          <Bot className="w-5 h-5" />
          Register Agent
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto" />
        </div>
      ) : agents.length === 0 ? (
        <Card className="p-12 text-center">
          <Bot className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <h3 className="text-xl font-semibold mb-2">No Agents Yet</h3>
          <p className="text-gray-600 mb-6">Get started by registering your first AI agent</p>
          <Button variant="gradient">Register Your First Agent</Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {agents.map((agent) => (
            <Card
              key={agent.address}
              className="border-2 border-transparent hover:border-purple-300 transition-all hover:shadow-xl"
            >
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bot className="w-5 h-5 text-purple-600" />
                  {agent.name}
                </CardTitle>
                <CardDescription className="font-mono text-xs">
                  {agent.address.slice(0, 8)}...{agent.address.slice(-8)}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div>
                    <span className="text-sm text-gray-600">Capabilities:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {agent.capabilities.slice(0, 3).map((cap) => (
                        <Badge key={cap} variant="secondary" className="text-xs">
                          {cap}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div className="flex justify-between items-center pt-2">
                    <span className="text-sm text-gray-600">Status:</span>
                    <Badge variant={agent.isActive ? 'default' : 'outline'}>
                      {agent.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

// Channels Tab Content
function ChannelsContent({ publicKey }: { publicKey: unknown }): React.JSX.Element {
  const { data: channels = [], isLoading } = useChannels()

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Communication Channels</h2>
          <p className="text-gray-600">Manage your agent communication channels</p>
        </div>
        <Button variant="gradient" className="gap-2">
          <MessageSquare className="w-5 h-5" />
          Create Channel
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {channels.slice(0, 6).map((channel) => (
            <Card
              key={channel.address}
              className="border-2 border-transparent hover:border-blue-300 transition-all hover:shadow-xl"
            >
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-blue-600" />
                  {channel.name}
                </CardTitle>
                <CardDescription>{channel.description || 'No description'}</CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="outline" className="w-full">
                  Open Channel
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

// x402 Payments Tab Content
function X402Content({ publicKey }: { publicKey: unknown }): React.JSX.Element {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">x402 Micropayments</h2>
        <p className="text-gray-600">Instant pay-per-call transactions</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Discover Agents</CardTitle>
            <CardDescription>Find agents by capability and price</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="gradient" className="w-full">
              Browse Agents
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Payment History</CardTitle>
            <CardDescription>View your transaction history</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full">
              View History
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Analytics</CardTitle>
            <CardDescription>Track your x402 metrics</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full">
              View Analytics
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

// Marketplace Tab Content
function MarketplaceContent({ publicKey }: { publicKey: unknown }): React.JSX.Element {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Agent Marketplace</h2>
        <p className="text-gray-600">Browse and trade AI agent services</p>
      </div>

      <Card className="p-12 text-center">
        <ShoppingCart className="w-16 h-16 mx-auto text-purple-600 mb-4" />
        <h3 className="text-2xl font-bold mb-2">Coming Soon</h3>
        <p className="text-gray-600">The marketplace is under construction</p>
      </Card>
    </div>
  )
}

// Analytics Tab Content
function AnalyticsContent({ publicKey }: { publicKey: unknown }): React.JSX.Element {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Performance Analytics</h2>
        <p className="text-gray-600">Track your agent performance and earnings</p>
      </div>

      <Card className="p-12 text-center">
        <BarChart3 className="w-16 h-16 mx-auto text-purple-600 mb-4" />
        <h3 className="text-2xl font-bold mb-2">Analytics Dashboard</h3>
        <p className="text-gray-600">Detailed metrics and insights</p>
      </Card>
    </div>
  )
}

// Escrow Tab Content
function EscrowContent({ publicKey }: { publicKey: unknown }): React.JSX.Element {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Escrow Management</h2>
        <p className="text-gray-600">Secure transactions with built-in protection</p>
      </div>

      <Card className="p-12 text-center">
        <Shield className="w-16 h-16 mx-auto text-green-600 mb-4" />
        <h3 className="text-2xl font-bold mb-2">Escrow Services</h3>
        <p className="text-gray-600">Manage your escrow accounts and disputes</p>
      </Card>
    </div>
  )
}

// Governance Tab Content
function GovernanceContent({ publicKey }: { publicKey: unknown }): React.JSX.Element {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Governance</h2>
        <p className="text-gray-600">Participate in platform governance</p>
      </div>

      <Card className="p-12 text-center">
        <Vote className="w-16 h-16 mx-auto text-blue-600 mb-4" />
        <h3 className="text-2xl font-bold mb-2">Governance Portal</h3>
        <p className="text-gray-600">Vote on proposals and shape the future</p>
      </Card>
    </div>
  )
}

// Work Orders Tab Content
function WorkOrdersContent({ publicKey }: { publicKey: unknown }): React.JSX.Element {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Work Orders</h2>
        <p className="text-gray-600">Manage agent tasks and deliverables</p>
      </div>

      <Card className="p-12 text-center">
        <Briefcase className="w-16 h-16 mx-auto text-purple-600 mb-4" />
        <h3 className="text-2xl font-bold mb-2">Work Order System</h3>
        <p className="text-gray-600">Track and manage agent work orders</p>
      </Card>
    </div>
  )
}
