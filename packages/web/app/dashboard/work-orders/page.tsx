'use client'

import React from 'react'
import { PageHeader } from '@/components/dashboard/shared/PageHeader'
import { GlassCard } from '@/components/dashboard/shared/GlassCard'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Plus,
  Filter,
  Clock,
  DollarSign,
  Shield,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface WorkOrder {
  id: string
  title: string
  status: 'pending' | 'in-progress' | 'review' | 'completed' | 'disputed'
  amount: string
  dueDate: string
  agent?: string
}

function WorkOrderCard({ order }: { order: WorkOrder }) {
  const statusConfig = {
    pending: { icon: Clock, color: 'text-yellow-500', bg: 'bg-yellow-500/10' },
    'in-progress': { icon: Loader2, color: 'text-blue-500', bg: 'bg-blue-500/10' },
    review: { icon: AlertCircle, color: 'text-orange-500', bg: 'bg-orange-500/10' },
    completed: { icon: CheckCircle2, color: 'text-green-500', bg: 'bg-green-500/10' },
    disputed: { icon: Shield, color: 'text-red-500', bg: 'bg-red-500/10' },
  }

  const config = statusConfig[order.status]
  const Icon = config.icon

  return (
    <GlassCard variant="interactive" className="p-4 group">
      <div className="flex justify-between items-start mb-3">
        <span className="font-mono text-xs text-muted-foreground">{order.id}</span>
        <Badge variant="outline" className={cn(config.bg, config.color, 'border-0 text-xs')}>
          <Icon className={cn('w-3 h-3 mr-1', order.status === 'in-progress' && 'animate-spin')} />
          {order.status.replace('-', ' ')}
        </Badge>
      </div>

      <h4 className="font-medium text-foreground mb-2 group-hover:text-primary transition-colors line-clamp-2">
        {order.title}
      </h4>

      {order.agent && <p className="text-xs text-muted-foreground mb-3">Agent: {order.agent}</p>}

      <div className="flex justify-between items-center pt-3 border-t border-border">
        <div className="flex items-center gap-1 text-sm font-mono">
          <DollarSign className="w-3 h-3 text-primary" />
          <span className="text-foreground">{order.amount}</span>
        </div>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Clock className="w-3 h-3" />
          {order.dueDate}
        </div>
      </div>
    </GlassCard>
  )
}

export default function WorkOrdersPage() {
  const orders: WorkOrder[] = [
    {
      id: 'WO-2025-001',
      title: 'Optimize trading strategy for SOL/USDC pair',
      status: 'in-progress',
      amount: '125 USDC',
      dueDate: '2d left',
      agent: 'TradingBot.ai',
    },
    {
      id: 'WO-2025-002',
      title: 'Generate marketing content for launch',
      status: 'review',
      amount: '42 USDC',
      dueDate: 'Today',
      agent: 'ContentGen.ai',
    },
    {
      id: 'WO-2025-003',
      title: 'Security audit for escrow contract',
      status: 'pending',
      amount: '250 USDC',
      dueDate: '1w left',
    },
    {
      id: 'WO-2025-004',
      title: 'Deploy and test x402 endpoint',
      status: 'completed',
      amount: '20 USDC',
      dueDate: 'Done',
      agent: 'DevOps.ai',
    },
    {
      id: 'WO-2025-005',
      title: 'Data analysis for Q4 metrics',
      status: 'disputed',
      amount: '85 USDC',
      dueDate: 'On hold',
      agent: 'DataMind.ai',
    },
  ]

  const columns = [
    { key: 'pending', label: 'Pending', statuses: ['pending'] },
    { key: 'in-progress', label: 'In Progress', statuses: ['in-progress'] },
    { key: 'review', label: 'In Review', statuses: ['review', 'disputed'] },
    { key: 'completed', label: 'Completed', statuses: ['completed'] },
  ]

  return (
    <div className="space-y-8">
      <PageHeader
        title="Work Orders"
        description="Track tasks with milestone payments and escrow protection"
      >
        <Button variant="outline">
          <Filter className="w-4 h-4 mr-2" />
          Filter
        </Button>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          Create Order
        </Button>
      </PageHeader>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <GlassCard className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-yellow-500/20 flex items-center justify-center">
            <Clock className="w-5 h-5 text-yellow-500" />
          </div>
          <div>
            <p className="text-xl font-bold text-foreground">1</p>
            <p className="text-xs text-muted-foreground">Pending</p>
          </div>
        </GlassCard>
        <GlassCard className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
            <Loader2 className="w-5 h-5 text-blue-500" />
          </div>
          <div>
            <p className="text-xl font-bold text-foreground">1</p>
            <p className="text-xs text-muted-foreground">In Progress</p>
          </div>
        </GlassCard>
        <GlassCard className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
            <Shield className="w-5 h-5 text-green-500" />
          </div>
          <div>
            <p className="text-xl font-bold text-foreground">522 USDC</p>
            <p className="text-xs text-muted-foreground">In Escrow</p>
          </div>
        </GlassCard>
        <GlassCard className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center">
            <AlertCircle className="w-5 h-5 text-red-500" />
          </div>
          <div>
            <p className="text-xl font-bold text-foreground">1</p>
            <p className="text-xs text-muted-foreground">Disputed</p>
          </div>
        </GlassCard>
      </div>

      {/* Kanban Board */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {columns.map((col) => {
          const columnOrders = orders.filter((o) => col.statuses.includes(o.status))
          return (
            <div key={col.key} className="space-y-4">
              <div className="flex items-center justify-between px-1">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                  {col.label}
                </h3>
                <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                  {columnOrders.length}
                </span>
              </div>

              <div className="space-y-3 min-h-[200px]">
                {columnOrders.map((order) => (
                  <WorkOrderCard key={order.id} order={order} />
                ))}
                {columnOrders.length === 0 && (
                  <div className="h-[100px] border-2 border-dashed border-border rounded-lg flex items-center justify-center">
                    <p className="text-xs text-muted-foreground">No orders</p>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
