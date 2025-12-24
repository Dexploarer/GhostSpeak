import { GlassCard } from './GlassCard'
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

export function WorkOrderCard({
  title,
  id,
  status,
  amount,
  assignee: _assignee,
  dueDate,
}: WorkOrderCardProps) {
  const statusColors = {
    pending: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
    'in-progress': 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    review: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
    completed: 'bg-green-500/10 text-green-400 border-green-500/20',
  }

  return (
    <GlassCard variant="interactive" className="p-4 flex flex-col gap-3 group">
      <div className="flex justify-between items-start">
        <span className="text-xs font-mono text-gray-500">{String(id)}</span>
        <Badge
          variant="outline"
          className={cn('text-[10px] uppercase tracking-wider', statusColors[status])}
        >
          {status}
        </Badge>
      </div>

      <h4 className="font-medium text-gray-200 group-hover:text-purple-300 transition-colors line-clamp-2">
        {title}
      </h4>

      <div className="mt-2 pt-3 border-t border-white/5 flex items-center justify-between text-xs text-gray-400">
        <div className="flex items-center gap-2">
          <DollarSign className="w-3 h-3 text-green-400" />
          <span className="text-gray-300">{String(amount)}</span>
        </div>
        {dueDate && (
          <div className="flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            <span>{dueDate}</span>
          </div>
        )}
      </div>
    </GlassCard>
  )
}
