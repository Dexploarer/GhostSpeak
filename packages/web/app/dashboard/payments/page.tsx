'use client'

import React, { useState } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import {
  Zap,
  ArrowUpRight,
  ArrowDownLeft,
  RefreshCw,
  ExternalLink,
  TrendingUp,
  Activity,
  DollarSign,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Bot
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DashboardCard } from '@/components/dashboard/shared/DashboardCard'
import { EmptyState } from '@/components/dashboard/shared/EmptyState'
import { DataTable } from '@/components/dashboard/shared/DataTable'
import { StatsCard } from '@/components/dashboard/shared/StatsCard'
import { cn } from '@/lib/utils'
import { useX402PaymentHistory, useX402Analytics, useX402PlatformStats } from '@/lib/hooks/useX402'

type Tab = 'all' | 'sent' | 'received'
type PaymentStatus = 'confirmed' | 'pending' | 'failed'

interface Payment {
  id: string
  signature: string
  type: 'sent' | 'received'
  amount: bigint
  token: string
  tokenSymbol: string
  from: string
  to: string
  agent?: string
  agentName?: string
  description?: string
  status: PaymentStatus
  timestamp: Date
  fee?: bigint
}

export default function PaymentsPage() {
  const { publicKey, connected } = useWallet()
  const [activeTab, setActiveTab] = useState<Tab>('all')
  const [searchQuery, setSearchQuery] = useState('')

  // Queries
  const { data: paymentHistory, isLoading: historyLoading, refetch: refetchHistory } = useX402PaymentHistory()
  const { data: analytics, isLoading: analyticsLoading } = useX402Analytics()
  const { data: platformStats, isLoading: statsLoading } = useX402PlatformStats()

  // Transform payment history to our format
  const payments: Payment[] = (paymentHistory ?? []).map((p: any) => ({
    id: p.signature ?? p.id ?? '',
    signature: p.signature ?? '',
    type: p.payer === publicKey?.toBase58() ? 'sent' : 'received',
    amount: p.amount ?? BigInt(0),
    token: p.token ?? '',
    tokenSymbol: p.tokenSymbol ?? 'SOL',
    from: p.payer ?? p.from ?? '',
    to: p.recipient ?? p.to ?? '',
    agent: p.agent,
    agentName: p.agentName,
    description: p.description ?? p.memo ?? '',
    status: (p.status ?? 'confirmed') as PaymentStatus,
    timestamp: new Date(p.timestamp ?? Date.now()),
    fee: p.fee
  }))

  // Filter payments
  const filteredPayments = payments.filter((p) => {
    if (activeTab === 'sent') return p.type === 'sent'
    if (activeTab === 'received') return p.type === 'received'
    return true
  }).filter((p) => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      p.signature.toLowerCase().includes(query) ||
      p.from.toLowerCase().includes(query) ||
      p.to.toLowerCase().includes(query) ||
      p.description?.toLowerCase().includes(query) ||
      p.agentName?.toLowerCase().includes(query)
    )
  })

  // Stats
  const isLoading = historyLoading || analyticsLoading || statsLoading
  const totalVolume = Number(analytics?.totalVolume ?? platformStats?.totalVolume ?? BigInt(0)) / 1e9
  const totalPayments = analytics?.totalPayments ?? platformStats?.totalPayments ?? payments.length
  const successRate = analytics?.successRate ?? platformStats?.successRate ?? 0
  const sentAmount = payments
    .filter(p => p.type === 'sent')
    .reduce((sum, p) => sum + Number(p.amount), 0) / 1e9
  const receivedAmount = payments
    .filter(p => p.type === 'received')
    .reduce((sum, p) => sum + Number(p.amount), 0) / 1e9

  const tabs = [
    { id: 'all' as Tab, label: 'All', count: payments.length },
    { id: 'sent' as Tab, label: 'Sent', count: payments.filter(p => p.type === 'sent').length },
    { id: 'received' as Tab, label: 'Received', count: payments.filter(p => p.type === 'received').length }
  ]

  // Format amount
  const formatAmount = (amount: bigint, symbol: string = 'SOL') => {
    const value = Number(amount) / 1e9
    return `${value.toFixed(4)} ${symbol}`
  }

  // Format address
  const formatAddress = (addr: string) => {
    if (!addr) return '-'
    return `${addr.slice(0, 4)}...${addr.slice(-4)}`
  }

  // Get status icon
  const StatusIcon = ({ status }: { status: PaymentStatus }) => {
    switch (status) {
      case 'confirmed':
        return <CheckCircle className="w-4 h-4 text-green-500" />
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-500 animate-pulse" />
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-500" />
      default:
        return <AlertCircle className="w-4 h-4 text-muted-foreground" />
    }
  }

  // Not connected state
  if (!connected) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-black text-foreground">Payments</h1>
          <p className="text-muted-foreground">x402 payment history and analytics</p>
        </div>
        
        <EmptyState
          icon={Zap}
          title="Connect Your Wallet"
          description="Connect your wallet to view your x402 payment history and analytics."
          features={[
            'Instant micropayments with x402 protocol',
            'Pay-per-call AI agent services',
            'Real-time transaction tracking'
          ]}
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-foreground">Payments</h1>
          <p className="text-muted-foreground">x402 payment history and analytics</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetchHistory()}
          disabled={isLoading}
          className="border-border"
        >
          <RefreshCw className={cn('w-4 h-4 mr-2', isLoading && 'animate-spin')} />
          Refresh
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatsCard
          label="Total Volume"
          value={totalVolume.toFixed(2)}
          unit="SOL"
          icon={DollarSign}
          loading={isLoading}
        />
        <StatsCard
          label="Total Payments"
          value={totalPayments}
          icon={Activity}
          loading={isLoading}
        />
        <StatsCard
          label="Success Rate"
          value={`${successRate.toFixed(1)}%`}
          icon={TrendingUp}
          trend={successRate >= 95 ? '+Good' : undefined}
          trendUp={successRate >= 95}
          loading={isLoading}
        />
        <StatsCard
          label="Net Flow"
          value={(receivedAmount - sentAmount).toFixed(4)}
          unit="SOL"
          icon={Zap}
          trend={receivedAmount > sentAmount ? 'Earning' : 'Spending'}
          trendUp={receivedAmount > sentAmount}
          loading={isLoading}
        />
      </div>

      {/* Sent/Received Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <DashboardCard className="p-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-red-500/10 flex items-center justify-center">
              <ArrowUpRight className="w-6 h-6 text-red-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Sent</p>
              <p className="text-2xl font-black text-foreground">{sentAmount.toFixed(4)} SOL</p>
            </div>
          </div>
        </DashboardCard>
        <DashboardCard className="p-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center">
              <ArrowDownLeft className="w-6 h-6 text-green-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Received</p>
              <p className="text-2xl font-black text-foreground">{receivedAmount.toFixed(4)} SOL</p>
            </div>
          </div>
        </DashboardCard>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all',
              activeTab === tab.id
                ? 'bg-primary text-primary-foreground shadow-[0_0_20px_rgba(204,255,0,0.2)]'
                : 'bg-muted text-muted-foreground hover:text-foreground'
            )}
          >
            {tab.label}
            <span className={cn(
              'px-1.5 py-0.5 rounded text-xs',
              activeTab === tab.id ? 'bg-primary-foreground/20' : 'bg-background'
            )}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Payment History */}
      {filteredPayments.length === 0 && !historyLoading ? (
        <EmptyState
          icon={Zap}
          title="No Payment History"
          description="You haven't made or received any x402 payments yet. Start by using AI agent services."
          actionLabel="Discover Agents"
          onAction={() => window.location.href = '/x402/discover'}
          features={[
            'Pay per API call with x402',
            'Instant settlement on Solana',
            'No subscriptions or minimums'
          ]}
        />
      ) : (
        <DataTable
          data={filteredPayments}
          columns={[
            {
              header: 'Type',
              cell: (p) => (
                <div className="flex items-center gap-2">
                  <div className={cn(
                    'w-8 h-8 rounded-lg flex items-center justify-center',
                    p.type === 'sent' ? 'bg-red-500/10' : 'bg-green-500/10'
                  )}>
                    {p.type === 'sent' ? (
                      <ArrowUpRight className="w-4 h-4 text-red-500" />
                    ) : (
                      <ArrowDownLeft className="w-4 h-4 text-green-500" />
                    )}
                  </div>
                  <span className={cn(
                    'font-bold capitalize',
                    p.type === 'sent' ? 'text-red-500' : 'text-green-500'
                  )}>
                    {p.type}
                  </span>
                </div>
              )
            },
            {
              header: 'Amount',
              cell: (p) => (
                <span className={cn(
                  'font-bold',
                  p.type === 'sent' ? 'text-red-500' : 'text-green-500'
                )}>
                  {p.type === 'sent' ? '-' : '+'}{formatAmount(p.amount, p.tokenSymbol)}
                </span>
              )
            },
            {
              header: 'Counterparty',
              cell: (p) => (
                <div>
                  <p className="font-medium text-foreground">
                    {formatAddress(p.type === 'sent' ? p.to : p.from)}
                  </p>
                  {p.agentName && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Bot className="w-3 h-3" />
                      {p.agentName}
                    </p>
                  )}
                </div>
              )
            },
            {
              header: 'Description',
              cell: (p) => (
                <p className="text-muted-foreground truncate max-w-[200px]">
                  {p.description || '-'}
                </p>
              )
            },
            {
              header: 'Status',
              cell: (p) => (
                <div className="flex items-center gap-2">
                  <StatusIcon status={p.status} />
                  <span className={cn(
                    'text-sm font-medium capitalize',
                    p.status === 'confirmed' && 'text-green-500',
                    p.status === 'pending' && 'text-yellow-500',
                    p.status === 'failed' && 'text-red-500'
                  )}>
                    {p.status}
                  </span>
                </div>
              )
            },
            {
              header: 'Date',
              cell: (p) => (
                <div className="text-sm">
                  <p className="text-foreground">
                    {p.timestamp.toLocaleDateString()}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {p.timestamp.toLocaleTimeString()}
                  </p>
                </div>
              ),
              sortable: true,
              accessorKey: 'timestamp'
            },
            {
              header: '',
              cell: (p) => (
                <a
                  href={`https://explorer.solana.com/tx/${p.signature}?cluster=devnet`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 rounded-lg hover:bg-muted transition-colors"
                  onClick={(e) => e.stopPropagation()}
                >
                  <ExternalLink className="w-4 h-4 text-muted-foreground hover:text-primary" />
                </a>
              ),
              className: 'w-[50px]'
            }
          ]}
          isLoading={historyLoading}
          emptyMessage="No payments found"
          keyExtractor={(p) => p.id}
        />
      )}

      {/* x402 Protocol Info */}
      <DashboardCard
        title="About x402 Protocol"
        icon={Zap}
        description="HTTP 402 Payment Required for AI Agent Commerce"
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-4">
          <div className="p-4 rounded-xl bg-muted/30 border border-border">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
              <Zap className="w-5 h-5 text-primary" />
            </div>
            <h4 className="font-bold text-foreground mb-1">Instant Micropayments</h4>
            <p className="text-sm text-muted-foreground">
              Pay-per-call pricing with sub-second settlement on Solana.
            </p>
          </div>
          <div className="p-4 rounded-xl bg-muted/30 border border-border">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
              <Bot className="w-5 h-5 text-primary" />
            </div>
            <h4 className="font-bold text-foreground mb-1">Agent Commerce</h4>
            <p className="text-sm text-muted-foreground">
              AI agents earn directly for services without intermediaries.
            </p>
          </div>
          <div className="p-4 rounded-xl bg-muted/30 border border-border">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
              <Activity className="w-5 h-5 text-primary" />
            </div>
            <h4 className="font-bold text-foreground mb-1">Real-Time Analytics</h4>
            <p className="text-sm text-muted-foreground">
              Track all payments, earnings, and performance metrics.
            </p>
          </div>
        </div>
      </DashboardCard>
    </div>
  )
}
