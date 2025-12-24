/**
 * x402 Ecosystem Explorer Page
 *
 * Global search and discovery of x402 resources across all facilitators
 */

'use client'

import React, { useState, useCallback, useMemo } from 'react'
import {
  Search,
  Globe,
  Zap,
  TrendingUp,
  Activity,
  Filter,
  LayoutGrid,
  List,
  RefreshCw,
  ExternalLink,
  Shield,
  Clock,
  DollarSign,
  Users,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'

// =====================================================
// TYPES
// =====================================================

interface ExplorerResource {
  id: string
  url: string
  name: string
  description?: string
  category?: string
  tags: string[]
  network: string
  price: string
  priceUsd: number
  facilitator: string
  facilitatorLogo?: string
  uptimePercent?: number
  latencyP50?: number
  totalRequests?: number
  paymentVolume?: string
  isVerified: boolean
  isActive: boolean
  lastPing?: string
}

interface ExplorerFilters {
  query: string
  network: string
  category: string
  facilitator: string
  priceRange: string
  sortBy: string
  sortOrder: 'asc' | 'desc'
}

interface GlobalStats {
  totalResources: number
  activeResources: number
  totalFacilitators: number
  totalVolume24h: string
  totalRequests24h: number
  avgLatency: number
}

// =====================================================
// MOCK DATA
// =====================================================

const MOCK_STATS: GlobalStats = {
  totalResources: 1247,
  activeResources: 1089,
  totalFacilitators: 7,
  totalVolume24h: '$45,230',
  totalRequests24h: 89420,
  avgLatency: 142,
}

const MOCK_RESOURCES: ExplorerResource[] = [
  {
    id: '1',
    url: 'https://api.ghostspeak.ai/v1/generate',
    name: 'GhostSpeak Text Generation',
    description: 'Advanced AI text generation with x402 micropayments',
    category: 'text-generation',
    tags: ['ai', 'text', 'llm', 'gpt'],
    network: 'solana',
    price: '0.001 USDC',
    priceUsd: 0.001,
    facilitator: 'ghostspeak',
    uptimePercent: 99.9,
    latencyP50: 120,
    totalRequests: 45000,
    paymentVolume: '$12,450',
    isVerified: true,
    isActive: true,
  },
  {
    id: '2',
    url: 'https://api.payai.network/image/generate',
    name: 'PayAI Image Generator',
    description: 'Generate images with AI using USDC payments',
    category: 'image-processing',
    tags: ['ai', 'image', 'art', 'stable-diffusion'],
    network: 'base',
    price: '0.05 USDC',
    priceUsd: 0.05,
    facilitator: 'payai',
    uptimePercent: 98.5,
    latencyP50: 2500,
    totalRequests: 12000,
    paymentVolume: '$8,200',
    isVerified: true,
    isActive: true,
  },
  {
    id: '3',
    url: 'https://api.questflow.ai/workflow/execute',
    name: 'Questflow Workflow Executor',
    description: 'Execute complex AI workflows with pay-per-execution',
    category: 'other',
    tags: ['workflow', 'automation', 'ai-agents'],
    network: 'polygon',
    price: '0.1 USDC',
    priceUsd: 0.1,
    facilitator: 'questflow',
    uptimePercent: 97.2,
    latencyP50: 3500,
    totalRequests: 5600,
    paymentVolume: '$4,100',
    isVerified: false,
    isActive: true,
  },
]

const NETWORKS = ['all', 'solana', 'base', 'polygon', 'ethereum', 'arbitrum']
const CATEGORIES = [
  'all',
  'text-generation',
  'code-generation',
  'image-processing',
  'data-analysis',
  'translation',
  'other',
]
const FACILITATORS = [
  'all',
  'ghostspeak',
  'coinbase',
  'thirdweb',
  'payai',
  'questflow',
  'aurracloud',
]

// =====================================================
// COMPONENTS
// =====================================================

function StatsCard({
  title,
  value,
  icon: Icon,
  change,
}: {
  title: string
  value: string | number
  icon: React.ComponentType<{ className?: string }>
  change?: string
}) {
  return (
    <Card className="bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm border-purple-200/50 dark:border-purple-800/50">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">{title}</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
            {change && (
              <p className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
                <TrendingUp className="w-3 h-3" />
                {change}
              </p>
            )}
          </div>
          <div className="w-12 h-12 rounded-xl bg-purple-100 dark:bg-purple-900/50 flex items-center justify-center">
            <Icon className="w-6 h-6 text-purple-600 dark:text-purple-400" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function ResourceCard({ resource }: { resource: ExplorerResource }) {
  const networkColors: Record<string, string> = {
    solana: 'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300',
    base: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300',
    polygon: 'bg-violet-100 text-violet-800 dark:bg-violet-900/50 dark:text-violet-300',
    ethereum: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
  }

  return (
    <Card className="bg-white/70 dark:bg-gray-900/70 backdrop-blur-sm border-gray-200/50 dark:border-gray-700/50 hover:shadow-lg transition-all duration-200 hover:border-purple-300 dark:hover:border-purple-700">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg flex items-center gap-2">
              {resource.name}
              {resource.isVerified && (
                <Shield className="w-4 h-4 text-green-500" aria-label="Verified" />
              )}
            </CardTitle>
            <CardDescription className="text-sm mt-1">{resource.description}</CardDescription>
          </div>
          <div className="flex flex-col items-end gap-1">
            <Badge className={networkColors[resource.network] ?? 'bg-gray-100'}>
              {resource.network}
            </Badge>
            <span className="text-lg font-bold text-purple-600 dark:text-purple-400">
              {resource.price}
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-1 mb-3">
          {resource.tags.slice(0, 4).map((tag) => (
            <Badge key={tag} variant="outline" className="text-xs">
              {tag}
            </Badge>
          ))}
        </div>

        <div className="grid grid-cols-4 gap-2 text-xs text-gray-500 dark:text-gray-400">
          <div className="flex flex-col items-center">
            <Activity className="w-4 h-4 mb-1 text-green-500" />
            <span>{resource.uptimePercent}%</span>
            <span className="text-[10px]">Uptime</span>
          </div>
          <div className="flex flex-col items-center">
            <Clock className="w-4 h-4 mb-1 text-blue-500" />
            <span>{resource.latencyP50}ms</span>
            <span className="text-[10px]">Latency</span>
          </div>
          <div className="flex flex-col items-center">
            <Zap className="w-4 h-4 mb-1 text-yellow-500" />
            <span>{(resource.totalRequests ?? 0).toLocaleString()}</span>
            <span className="text-[10px]">Requests</span>
          </div>
          <div className="flex flex-col items-center">
            <DollarSign className="w-4 h-4 mb-1 text-purple-500" />
            <span>{resource.paymentVolume}</span>
            <span className="text-[10px]">Volume</span>
          </div>
        </div>

        <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100 dark:border-gray-800">
          <span className="text-xs text-gray-500">via {resource.facilitator}</span>
          <Button variant="ghost" size="sm" className="gap-1" asChild>
            <a href={resource.url} target="_blank" rel="noopener noreferrer">
              Open <ExternalLink className="w-3 h-3" />
            </a>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

function LeaderboardTable({
  resources,
  metric,
}: {
  resources: ExplorerResource[]
  metric: 'volume' | 'requests' | 'uptime'
}) {
  const sorted = useMemo(() => {
    return [...resources].sort((a, b) => {
      switch (metric) {
        case 'volume':
          return (
            parseFloat(b.paymentVolume?.replace(/[^0-9.]/g, '') ?? '0') -
            parseFloat(a.paymentVolume?.replace(/[^0-9.]/g, '') ?? '0')
          )
        case 'requests':
          return (b.totalRequests ?? 0) - (a.totalRequests ?? 0)
        case 'uptime':
          return (b.uptimePercent ?? 0) - (a.uptimePercent ?? 0)
        default:
          return 0
      }
    })
  }, [resources, metric])

  return (
    <div className="space-y-2">
      {sorted.slice(0, 5).map((resource, index) => (
        <div
          key={resource.id}
          className="flex items-center gap-3 p-3 rounded-lg bg-white/50 dark:bg-gray-800/50"
        >
          <span className="w-6 h-6 rounded-full bg-purple-100 dark:bg-purple-900/50 flex items-center justify-center text-sm font-bold text-purple-600 dark:text-purple-400">
            {index + 1}
          </span>
          <div className="flex-1 min-w-0">
            <p className="font-medium truncate">{resource.name}</p>
            <p className="text-xs text-gray-500">{resource.network}</p>
          </div>
          <div className="text-right">
            <p className="font-bold">
              {metric === 'volume' && resource.paymentVolume}
              {metric === 'requests' && resource.totalRequests?.toLocaleString()}
              {metric === 'uptime' && `${resource.uptimePercent}%`}
            </p>
          </div>
        </div>
      ))}
    </div>
  )
}

// =====================================================
// MAIN PAGE
// =====================================================

export default function X402ExplorerPage(): React.JSX.Element {
  const [filters, setFilters] = useState<ExplorerFilters>({
    query: '',
    network: 'all',
    category: 'all',
    facilitator: 'all',
    priceRange: 'all',
    sortBy: 'volume',
    sortOrder: 'desc',
  })
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [isLoading, setIsLoading] = useState(false)

  // Filter resources
  const filteredResources = useMemo(() => {
    return MOCK_RESOURCES.filter((resource) => {
      if (filters.query) {
        const query = filters.query.toLowerCase()
        if (
          !resource.name.toLowerCase().includes(query) &&
          !resource.description?.toLowerCase().includes(query) &&
          !resource.tags.some((t) => t.toLowerCase().includes(query))
        ) {
          return false
        }
      }
      if (filters.network !== 'all' && resource.network !== filters.network) return false
      if (filters.category !== 'all' && resource.category !== filters.category) return false
      if (filters.facilitator !== 'all' && resource.facilitator !== filters.facilitator)
        return false
      return true
    })
  }, [filters])

  const handleRefresh = useCallback(() => {
    setIsLoading(true)
    setTimeout(() => setIsLoading(false), 1000)
  }, [])

  return (
    <div className="min-h-screen bg-linear-to-br from-purple-50 via-white to-blue-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold gradient-text mb-2 flex items-center gap-3">
            <Globe className="w-8 h-8" />
            x402 Ecosystem Explorer
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Discover x402-enabled AI services across all facilitators and networks
          </p>
        </div>

        {/* Global Stats */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          <StatsCard
            title="Total Resources"
            value={MOCK_STATS.totalResources.toLocaleString()}
            icon={Globe}
          />
          <StatsCard
            title="Active"
            value={MOCK_STATS.activeResources.toLocaleString()}
            icon={Activity}
            change="+2.3%"
          />
          <StatsCard title="Facilitators" value={MOCK_STATS.totalFacilitators} icon={Users} />
          <StatsCard
            title="Volume (24h)"
            value={MOCK_STATS.totalVolume24h}
            icon={DollarSign}
            change="+12.5%"
          />
          <StatsCard
            title="Requests (24h)"
            value={MOCK_STATS.totalRequests24h.toLocaleString()}
            icon={Zap}
          />
          <StatsCard title="Avg Latency" value={`${MOCK_STATS.avgLatency}ms`} icon={Clock} />
        </div>

        {/* Search & Filters */}
        <Card className="mb-6 bg-white/70 dark:bg-gray-900/70 backdrop-blur-sm">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search resources by name, description, or tags..."
                  className="pl-10"
                  value={filters.query}
                  onChange={(e) => setFilters((f) => ({ ...f, query: e.target.value }))}
                />
              </div>

              <div className="flex gap-2 flex-wrap">
                <Select
                  value={filters.network}
                  onValueChange={(v: string) => setFilters((f) => ({ ...f, network: v }))}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="Network" />
                  </SelectTrigger>
                  <SelectContent>
                    {NETWORKS.map((n) => (
                      <SelectItem key={n} value={n}>
                        {n === 'all' ? 'All Networks' : n.charAt(0).toUpperCase() + n.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select
                  value={filters.category}
                  onValueChange={(v: string) => setFilters((f) => ({ ...f, category: v }))}
                >
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c === 'all' ? 'All Categories' : c.replace('-', ' ')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select
                  value={filters.facilitator}
                  onValueChange={(v: string) => setFilters((f) => ({ ...f, facilitator: v }))}
                >
                  <SelectTrigger className="w-36">
                    <SelectValue placeholder="Facilitator" />
                  </SelectTrigger>
                  <SelectContent>
                    {FACILITATORS.map((f) => (
                      <SelectItem key={f} value={f}>
                        {f === 'all' ? 'All Facilitators' : f}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <div className="flex gap-1">
                  <Button
                    variant={viewMode === 'grid' ? 'default' : 'outline'}
                    size="icon"
                    onClick={() => setViewMode('grid')}
                  >
                    <LayoutGrid className="w-4 h-4" />
                  </Button>
                  <Button
                    variant={viewMode === 'list' ? 'default' : 'outline'}
                    size="icon"
                    onClick={() => setViewMode('list')}
                  >
                    <List className="w-4 h-4" />
                  </Button>
                </div>

                <Button variant="outline" size="icon" onClick={handleRefresh}>
                  <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Main Content */}
        <div className="grid lg:grid-cols-4 gap-6">
          {/* Resource Grid */}
          <div className="lg:col-span-3">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-gray-500">{filteredResources.length} resources found</p>
              <Select
                value={filters.sortBy}
                onValueChange={(v: string) => setFilters((f) => ({ ...f, sortBy: v }))}
              >
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="volume">Payment Volume</SelectItem>
                  <SelectItem value="requests">Total Requests</SelectItem>
                  <SelectItem value="uptime">Uptime</SelectItem>
                  <SelectItem value="latency">Latency</SelectItem>
                  <SelectItem value="price">Price</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {isLoading ? (
              <div className="grid md:grid-cols-2 gap-4">
                {[1, 2, 3, 4].map((i) => (
                  <Card key={i} className="bg-white/70 dark:bg-gray-900/70">
                    <CardHeader>
                      <Skeleton className="h-6 w-48" />
                      <Skeleton className="h-4 w-full" />
                    </CardHeader>
                    <CardContent>
                      <Skeleton className="h-20 w-full" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className={viewMode === 'grid' ? 'grid md:grid-cols-2 gap-4' : 'space-y-4'}>
                {filteredResources.map((resource) => (
                  <ResourceCard key={resource.id} resource={resource} />
                ))}
              </div>
            )}
          </div>

          {/* Leaderboards */}
          <div className="space-y-6">
            <Card className="bg-white/70 dark:bg-gray-900/70 backdrop-blur-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-purple-500" />
                  Leaderboards
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="volume">
                  <TabsList className="w-full">
                    <TabsTrigger value="volume" className="flex-1">
                      Volume
                    </TabsTrigger>
                    <TabsTrigger value="requests" className="flex-1">
                      Requests
                    </TabsTrigger>
                    <TabsTrigger value="uptime" className="flex-1">
                      Uptime
                    </TabsTrigger>
                  </TabsList>
                  <TabsContent value="volume" className="mt-4">
                    <LeaderboardTable resources={MOCK_RESOURCES} metric="volume" />
                  </TabsContent>
                  <TabsContent value="requests" className="mt-4">
                    <LeaderboardTable resources={MOCK_RESOURCES} metric="requests" />
                  </TabsContent>
                  <TabsContent value="uptime" className="mt-4">
                    <LeaderboardTable resources={MOCK_RESOURCES} metric="uptime" />
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>

            <Card className="bg-white/70 dark:bg-gray-900/70 backdrop-blur-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button className="w-full justify-start gap-2" variant="outline" asChild>
                  <a href="/x402/register">
                    <Zap className="w-4 h-4" />
                    Register Your Resource
                  </a>
                </Button>
                <Button className="w-full justify-start gap-2" variant="outline" asChild>
                  <a href="/x402/ai-tools">
                    <Filter className="w-4 h-4" />
                    Browse AI Tools
                  </a>
                </Button>
                <Button className="w-full justify-start gap-2" variant="outline" asChild>
                  <a href="/x402/analytics">
                    <Activity className="w-4 h-4" />
                    View Analytics
                  </a>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
