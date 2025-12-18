'use client'

import React from 'react'
import { DashboardCard } from './DashboardCard'
import { Calendar, DollarSign } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface WorkOrderCardProps {
  title: string
  id: string
  status: 'pending' | 'in-progress' | 'review' | 'completed'
  amount: string
  assignee?: string
  dueDate?: string
}

export function WorkOrderCard({ title, id, status, amount, dueDate }: WorkOrderCardProps) {
  const statusColors = {
    'pending': 'bg-muted text-muted-foreground border-border',
    'in-progress': 'bg-blue-500/10 text-blue-500 border-blue-500/20',
    'review': 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
    'completed': 'bg-green-500/10 text-green-500 border-green-500/20',
  }

  return (
    <DashboardCard className="p-4">
      <div className="flex flex-col gap-3 group">
        <div className="flex justify-between items-start">
          <span className="text-xs font-mono text-muted-foreground">{String(id)}</span>
          <Badge variant="outline" className={cn("text-[10px] uppercase tracking-wider", statusColors[status])}>
            {status}
          </Badge>
        </div>
        
        <h4 className="font-medium text-foreground group-hover:text-primary transition-colors line-clamp-2">
          {title}
        </h4>

        <div className="mt-2 pt-3 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <DollarSign className="w-3 h-3 text-green-500" />
            <span className="text-foreground">{String(amount)}</span>
          </div>
          {dueDate && (
            <div className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              <span>{dueDate}</span>
            </div>
          )}
        </div>
      </div>
    </DashboardCard>
  )
}
