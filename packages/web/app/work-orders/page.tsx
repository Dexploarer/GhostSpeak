'use client'

import React, { useState } from 'react'
import { useWalletAddress } from '@/lib/hooks/useWalletAddress'
import { Plus, Briefcase, Search, Filter, TrendingUp, Clock, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { WorkOrderCard } from '@/components/work-orders/WorkOrderCard'
import { CreateWorkOrderForm } from '@/components/work-orders/CreateWorkOrderForm'
import { WorkOrderDetail } from '@/components/work-orders/WorkOrderDetail'
import { useWorkOrders, WorkOrderStatus, type WorkOrder } from '@/lib/queries/work-orders'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export default function WorkOrdersPage(): React.JSX.Element {
  const { address: publicKey } = useWalletAddress()
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedStatuses, setSelectedStatuses] = useState<WorkOrderStatus[]>([])
  const [roleFilter, setRoleFilter] = useState<'all' | 'client' | 'provider'>('all')
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [selectedWorkOrder, setSelectedWorkOrder] = useState<WorkOrder | null>(null)
  const [showDetailModal, setShowDetailModal] = useState(false)

  const {
    data: workOrders = [],
    isLoading,
    error,
  } = useWorkOrders({
    status: selectedStatuses.length > 0 ? selectedStatuses : undefined,
    role: roleFilter,
    search: searchTerm || undefined,
    userAddress: publicKey?.toString(),
  })

  const statusOptions = [
    { value: WorkOrderStatus.Open, label: 'Open', color: 'bg-blue-500' },
    { value: WorkOrderStatus.InProgress, label: 'In Progress', color: 'bg-purple-500' },
    { value: WorkOrderStatus.Submitted, label: 'Under Review', color: 'bg-yellow-500' },
    { value: WorkOrderStatus.Completed, label: 'Completed', color: 'bg-green-500' },
    { value: WorkOrderStatus.Cancelled, label: 'Cancelled', color: 'bg-red-500' },
  ]

  const roleOptions = [
    { value: 'all', label: 'All Work Orders' },
    { value: 'client', label: 'As Client' },
    { value: 'provider', label: 'As Provider' },
  ]

  const toggleStatus = (status: WorkOrderStatus) => {
    setSelectedStatuses((prev) =>
      prev.includes(status) ? prev.filter((s) => s !== status) : [...prev, status]
    )
  }

  const handleViewDetails = (workOrder: WorkOrder) => {
    setSelectedWorkOrder(workOrder)
    setShowDetailModal(true)
  }

  // Calculate stats
  const activeOrders = workOrders.filter(
    (order: WorkOrder) =>
      order.status === WorkOrderStatus.InProgress || order.status === WorkOrderStatus.Open
  ).length
  const completedOrders = workOrders.filter(
    (order: WorkOrder) => order.status === WorkOrderStatus.Completed
  ).length
  const totalValue =
    workOrders.reduce((sum: number, order: WorkOrder) => sum + Number(order.paymentAmount), 0) / 1e9 // Convert from lamports

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold gradient-text">Work Orders</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Track and manage your work orders with milestone-based payments
          </p>
        </div>
        <Dialog open={showCreateForm} onOpenChange={setShowCreateForm}>
          <DialogTrigger asChild>
            <Button variant="gradient" disabled={!publicKey} className="gap-2">
              <Plus className="w-5 h-5" />
              Create Work Order
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Work Order</DialogTitle>
            </DialogHeader>
            <CreateWorkOrderForm onSuccess={() => setShowCreateForm(false)} />
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      {publicKey && workOrders.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="glass rounded-xl p-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-blue-500/10 rounded-lg flex items-center justify-center">
                <Clock className="w-6 h-6 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{activeOrders}</p>
                <p className="text-gray-600 dark:text-gray-400">Active Orders</p>
              </div>
            </div>
          </div>
          <div className="glass rounded-xl p-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-green-500/10 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{completedOrders}</p>
                <p className="text-gray-600 dark:text-gray-400">Completed</p>
              </div>
            </div>
          </div>
          <div className="glass rounded-xl p-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-purple-500/10 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-purple-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalValue.toFixed(1)} SOL</p>
                <p className="text-gray-600 dark:text-gray-400">Total Value</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Search and Filters */}
      <div className="glass rounded-xl p-6 mb-6">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <Input
              type="text"
              placeholder="Search work orders..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Role Filter */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Filter className="w-4 h-4" />
                {roleOptions.find((r) => r.value === roleFilter)?.label}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel>Filter by Role</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {roleOptions.map((option) => (
                <DropdownMenuItem
                  key={option.value}
                  onClick={() => setRoleFilter(option.value as typeof roleFilter)}
                  className={roleFilter === option.value ? 'bg-gray-100 dark:bg-gray-800' : ''}
                >
                  {option.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Status Filters */}
        <div className="mt-4">
          <p className="text-sm font-medium mb-2">Filter by Status</p>
          <div className="flex flex-wrap gap-2">
            {statusOptions.map((status) => (
              <Badge
                key={status.value}
                variant={selectedStatuses.includes(status.value) ? 'default' : 'outline'}
                className={`cursor-pointer transition-colors ${
                  selectedStatuses.includes(status.value)
                    ? `${status.color} text-white border-0`
                    : ''
                }`}
                onClick={() => toggleStatus(status.value)}
              >
                {status.label}
              </Badge>
            ))}
          </div>
        </div>
      </div>

      {/* Active Filters */}
      {(selectedStatuses.length > 0 || roleFilter !== 'all' || searchTerm) && (
        <div className="flex flex-wrap gap-2 mb-6">
          {roleFilter !== 'all' && (
            <Badge variant="secondary" className="gap-1">
              Role: {roleOptions.find((r) => r.value === roleFilter)?.label}
              <button onClick={() => setRoleFilter('all')} className="ml-1 hover:text-red-500">
                ×
              </button>
            </Badge>
          )}
          {searchTerm && (
            <Badge variant="secondary" className="gap-1">
              Search: &ldquo;{searchTerm}&rdquo;
              <button onClick={() => setSearchTerm('')} className="ml-1 hover:text-red-500">
                ×
              </button>
            </Badge>
          )}
          {selectedStatuses.map((status) => (
            <Badge key={status} variant="secondary" className="gap-1">
              Status: {statusOptions.find((s) => s.value === status)?.label}
              <button onClick={() => toggleStatus(status)} className="ml-1 hover:text-red-500">
                ×
              </button>
            </Badge>
          ))}
        </div>
      )}

      {/* Results */}
      <div className="mb-6">
        <p className="text-gray-600 dark:text-gray-400">
          {isLoading ? 'Loading...' : `${workOrders.length} work orders found`}
        </p>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-2 text-gray-600 dark:text-gray-400">Loading work orders...</p>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="glass rounded-xl p-12 text-center">
          <p className="text-red-500">Failed to load work orders. Please try again.</p>
        </div>
      )}

      {/* Work Orders Grid */}
      {!publicKey ? (
        <div className="glass rounded-xl p-12 text-center">
          <Briefcase className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <h3 className="text-xl font-semibold mb-2">Connect Your Wallet</h3>
          <p className="text-gray-600 dark:text-gray-400">
            Connect your wallet to view and manage work orders
          </p>
        </div>
      ) : !isLoading && !error ? (
        workOrders.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {workOrders.map((workOrder: WorkOrder) => (
              <WorkOrderCard
                key={workOrder.address}
                workOrder={workOrder}
                userAddress={publicKey?.toString()}
                onViewDetails={handleViewDetails}
              />
            ))}
          </div>
        ) : (
          <div className="glass rounded-xl p-12 text-center">
            <Briefcase className="w-16 h-16 mx-auto text-gray-400 mb-4" />
            <h3 className="text-xl font-semibold mb-2">No Work Orders Found</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              {searchTerm || selectedStatuses.length > 0 || roleFilter !== 'all'
                ? 'Try adjusting your search and filters'
                : 'Create your first work order to get started'}
            </p>
            {!searchTerm && selectedStatuses.length === 0 && roleFilter === 'all' && (
              <Button variant="gradient" onClick={() => setShowCreateForm(true)}>
                Create Your First Work Order
              </Button>
            )}
          </div>
        )
      ) : null}

      {/* Work Order Detail Modal */}
      <WorkOrderDetail
        workOrder={selectedWorkOrder}
        isOpen={showDetailModal}
        onClose={() => {
          setShowDetailModal(false)
          setSelectedWorkOrder(null)
        }}
        userAddress={publicKey?.toString()}
      />
    </div>
  )
}
