import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Calendar,
  Clock,
  DollarSign,
  User,
  CheckCircle,
  AlertCircle,
  XCircle,
  Play,
  Eye,
  FileText,
  MessageCircle,
} from 'lucide-react'
import { formatAddress, formatSol } from '@/lib/utils'
import type { WorkOrder, WorkOrderStatus } from '@/lib/queries/work-orders'

interface WorkOrderCardProps {
  workOrder: WorkOrder
  userAddress?: string
  onViewDetails?: (workOrder: WorkOrder) => void
}

const statusConfig = {
  Created: { color: 'bg-gray-500', icon: FileText, label: 'Created' },
  Open: { color: 'bg-blue-500', icon: Play, label: 'Open' },
  Submitted: { color: 'bg-yellow-500', icon: Clock, label: 'Under Review' },
  InProgress: { color: 'bg-purple-500', icon: Play, label: 'In Progress' },
  Approved: { color: 'bg-green-500', icon: CheckCircle, label: 'Approved' },
  Completed: { color: 'bg-green-600', icon: CheckCircle, label: 'Completed' },
  Cancelled: { color: 'bg-red-500', icon: XCircle, label: 'Cancelled' },
} as const

function getStatusBadge(status: WorkOrderStatus): React.JSX.Element {
  const config = statusConfig[status]
  const Icon = config.icon
  return (
    <Badge variant="outline" className={`${config.color} text-white border-0`}>
      <Icon className="w-3 h-3 mr-1" />
      {config.label}
    </Badge>
  )
}

function formatTimeRemaining(deadline: Date): string {
  const now = new Date()
  const timeDiff = deadline.getTime() - now.getTime()

  if (timeDiff < 0) {
    return 'Overdue'
  }

  const days = Math.floor(timeDiff / (1000 * 60 * 60 * 24))
  const hours = Math.floor((timeDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))

  if (days > 0) {
    return `${days}d ${hours}h remaining`
  } else if (hours > 0) {
    return `${hours}h remaining`
  } else {
    const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60))
    return `${minutes}m remaining`
  }
}

function getMilestoneProgress(workOrder: WorkOrder): {
  completed: number
  total: number
  percentage: number
} {
  const total = workOrder.milestones.length
  const completed = workOrder.milestones.filter((m) => m.completed).length
  const percentage = total > 0 ? (completed / total) * 100 : 0
  return { completed, total, percentage }
}

function getUserRole(workOrder: WorkOrder, userAddress?: string): 'client' | 'provider' | 'none' {
  if (!userAddress) return 'none'
  if (workOrder.client === userAddress) return 'client'
  if (workOrder.provider === userAddress) return 'provider'
  return 'none'
}

export function WorkOrderCard({
  workOrder,
  userAddress,
  onViewDetails,
}: WorkOrderCardProps): React.JSX.Element {
  const progress = getMilestoneProgress(workOrder)
  const timeRemaining = formatTimeRemaining(workOrder.deadline)
  const userRole = getUserRole(workOrder, userAddress)
  const isOverdue = new Date() > workOrder.deadline && workOrder.status !== 'Completed'

  return (
    <Card className="group hover:shadow-lg transition-all duration-200">
      <CardContent className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              {getStatusBadge(workOrder.status)}
              {userRole !== 'none' && (
                <Badge variant="outline" className="text-xs">
                  {userRole === 'client' ? 'As Client' : 'As Provider'}
                </Badge>
              )}
            </div>
            <h3 className="font-semibold text-lg mb-1 line-clamp-2">{workOrder.title}</h3>
            <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2 mb-2">
              {workOrder.description}
            </p>
          </div>
        </div>

        {/* Client & Provider Info */}
        <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-blue-500" />
            <div>
              <p className="font-medium">Client</p>
              <p className="text-gray-500">
                {workOrder.clientName || formatAddress(workOrder.client)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-green-500" />
            <div>
              <p className="font-medium">Provider</p>
              <p className="text-gray-500">
                {workOrder.providerName || formatAddress(workOrder.provider)}
              </p>
            </div>
          </div>
        </div>

        {/* Progress Bar (if has milestones) */}
        {workOrder.milestones.length > 0 && (
          <div className="mb-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium">Progress</span>
              <span className="text-sm text-gray-500">
                {progress.completed}/{progress.total} milestones
              </span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div
                className="bg-gradient-to-r from-cyan-500 to-purple-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress.percentage}%` }}
              ></div>
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
          <div className="flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-green-500" />
            <div>
              <p className="font-medium">{formatSol(workOrder.paymentAmount)}</p>
              <p className="text-gray-500">Total Payment</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-purple-500" />
            <div>
              <p className={`font-medium ${isOverdue ? 'text-red-500' : ''}`}>{timeRemaining}</p>
              <p className="text-gray-500">Due {workOrder.deadline.toLocaleDateString()}</p>
            </div>
          </div>
        </div>

        {/* Requirements Preview */}
        {workOrder.requirements.length > 0 && (
          <div className="mb-4">
            <p className="text-sm font-medium mb-2">Key Requirements</p>
            <div className="flex flex-wrap gap-1">
              {workOrder.requirements.slice(0, 3).map((req) => (
                <Badge key={req} variant="outline" className="text-xs px-2 py-0">
                  {req}
                </Badge>
              ))}
              {workOrder.requirements.length > 3 && (
                <Badge variant="outline" className="text-xs px-2 py-0">
                  +{workOrder.requirements.length - 3}
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* Communication & Deliverables */}
        <div className="flex items-center gap-4 mb-4 text-sm text-gray-500">
          <div className="flex items-center gap-1">
            <MessageCircle className="w-4 h-4" />
            <span>{workOrder.communicationThread.length} messages</span>
          </div>
          <div className="flex items-center gap-1">
            <FileText className="w-4 h-4" />
            <span>{workOrder.deliverables.length} deliverables</span>
          </div>
          {isOverdue && (
            <div className="flex items-center gap-1 text-red-500">
              <AlertCircle className="w-4 h-4" />
              <span>Overdue</span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onViewDetails?.(workOrder)}
            className="flex-1"
          >
            <Eye className="w-4 h-4 mr-1" />
            View Details
          </Button>

          {userRole === 'provider' && workOrder.status === 'InProgress' && (
            <Button variant="gradient" size="sm" className="flex-1">
              Submit Work
            </Button>
          )}

          {userRole === 'client' && workOrder.status === 'Submitted' && (
            <Button variant="gradient" size="sm" className="flex-1">
              Review Work
            </Button>
          )}

          {userRole === 'client' && workOrder.status === 'Open' && (
            <Button variant="outline" size="sm" className="flex-1">
              Assign Provider
            </Button>
          )}
        </div>

        {/* Recent Activity */}
        {workOrder.communicationThread.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-800">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-500 to-purple-600 flex items-center justify-center text-white text-xs">
                {workOrder.communicationThread[workOrder.communicationThread.length - 1]
                  .senderName?.[0] || 'U'}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-medium">
                    {workOrder.communicationThread[workOrder.communicationThread.length - 1]
                      .senderName || 'User'}
                  </span>
                  <span className="text-xs text-gray-500">
                    {workOrder.communicationThread[
                      workOrder.communicationThread.length - 1
                    ].timestamp.toLocaleDateString()}
                  </span>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2">
                  {workOrder.communicationThread[workOrder.communicationThread.length - 1].content}
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
