'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Shield,
  Plus,
  Search,
  Filter,
  Clock,
  AlertTriangle,
  CheckCircle,
  Loader2,
} from 'lucide-react'
import { useWallet } from '@solana/wallet-adapter-react'
import {
  useEscrows,
  useCompleteEscrow,
  useCancelEscrow,
  useDisputeEscrow,
  useProcessPartialRefund,
  EscrowStatus,
  type Escrow,
} from '@/lib/queries/escrow'
import { EscrowCard } from '@/components/escrow/EscrowCard'
import { CreateEscrowForm } from '@/components/escrow/CreateEscrowForm'
import { EscrowDetail } from '@/components/escrow/EscrowDetail'
import { toast } from 'sonner'

export default function EscrowPage(): React.JSX.Element {
  const { publicKey } = useWallet()
  const [selectedEscrow, setSelectedEscrow] = React.useState<Escrow | null>(null)
  const [isDetailOpen, setIsDetailOpen] = React.useState(false)
  const [isCreateOpen, setIsCreateOpen] = React.useState(false)
  const [activeTab, setActiveTab] = React.useState('all')

  // Filters
  const [search, setSearch] = React.useState('')
  const [statusFilter, setStatusFilter] = React.useState<EscrowStatus[]>([])
  const [roleFilter, setRoleFilter] = React.useState<'all' | 'client' | 'agent'>('all')
  const [tokenTypeFilter, setTokenTypeFilter] = React.useState<
    'all' | 'native' | 'token2022' | 'confidential'
  >('all')

  // Mutations
  const completeEscrow = useCompleteEscrow()
  const cancelEscrow = useCancelEscrow()
  const disputeEscrow = useDisputeEscrow()
  const processPartialRefund = useProcessPartialRefund()

  const filters = {
    status: statusFilter.length > 0 ? statusFilter : undefined,
    role: roleFilter,
    tokenType: tokenTypeFilter,
    search: search || undefined,
    userAddress: publicKey?.toString(),
  }

  const { data: escrows, isLoading, error } = useEscrows(filters)

  // Filter escrows by tab
  const filteredEscrows = React.useMemo(() => {
    if (!escrows) return []

    switch (activeTab) {
      case 'active':
        return escrows.filter((e: Escrow) => e.status === EscrowStatus.Active)
      case 'completed':
        return escrows.filter((e: Escrow) => e.status === EscrowStatus.Completed)
      case 'disputed':
        return escrows.filter((e: Escrow) => e.status === EscrowStatus.Disputed)
      default:
        return escrows
    }
  }, [escrows, activeTab])

  // Calculate statistics
  const stats = React.useMemo(() => {
    if (!escrows) return { total: 0, active: 0, completed: 0, disputed: 0, totalValue: 0 }

    return {
      total: escrows.length,
      active: escrows.filter((e: Escrow) => e.status === EscrowStatus.Active).length,
      completed: escrows.filter((e: Escrow) => e.status === EscrowStatus.Completed).length,
      disputed: escrows.filter((e: Escrow) => e.status === EscrowStatus.Disputed).length,
      totalValue: escrows.reduce((sum: number, e: Escrow) => sum + Number(e.amount), 0),
    }
  }, [escrows])

  const getUserRole = (escrow: Escrow): 'client' | 'agent' | 'viewer' => {
    if (!publicKey) return 'viewer'
    const userAddress = publicKey.toString()
    if (escrow.client === userAddress) return 'client'
    if (escrow.agent === userAddress) return 'agent'
    return 'viewer'
  }

  const handleViewDetails = (escrow: Escrow) => {
    setSelectedEscrow(escrow)
    setIsDetailOpen(true)
  }

  const handleComplete = async (escrow: Escrow) => {
    try {
      await completeEscrow.mutateAsync({
        escrowAddress: escrow.address,
        resolutionNotes: 'Work completed successfully',
      })
    } catch (error) {
      console.error('Failed to complete escrow:', error)
    }
  }

  const handleCancel = async (escrow: Escrow) => {
    try {
      await cancelEscrow.mutateAsync({
        escrowAddress: escrow.address,
        reason: 'Cancelled by client',
      })
    } catch (error) {
      console.error('Failed to cancel escrow:', error)
    }
  }

  const handleDispute = async (escrow: Escrow) => {
    try {
      await disputeEscrow.mutateAsync({
        escrowAddress: escrow.address,
        reason: 'Work does not meet requirements',
        evidence: [],
      })
    } catch (error) {
      console.error('Failed to dispute escrow:', error)
    }
  }

  const handlePartialRefund = async (escrow: Escrow) => {
    try {
      const completedAmount = escrow.milestones
        .filter((m) => m.completed)
        .reduce((sum, m) => sum + Number(m.amount), 0)

      const refundAmount = Number(escrow.amount) - completedAmount

      if (refundAmount > 0) {
        await processPartialRefund.mutateAsync({
          escrowAddress: escrow.address,
          refundAmount: BigInt(refundAmount),
          reason: 'Partial refund for incomplete work',
        })
      } else {
        toast.error('No amount available for refund')
      }
    } catch (error) {
      console.error('Failed to process partial refund:', error)
    }
  }

  const resetFilters = () => {
    setSearch('')
    setStatusFilter([])
    setRoleFilter('all')
    setTokenTypeFilter('all')
  }

  if (!publicKey) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-12">
          <Shield className="w-16 h-16 mx-auto mb-4 opacity-50" />
          <h2 className="text-2xl font-bold mb-4">Connect Your Wallet</h2>
          <p className="text-gray-600 dark:text-gray-400">
            Connect your wallet to view and manage escrows.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Escrow Management</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Secure payments with Token-2022 features and milestone tracking
          </p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Create Escrow
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Escrow</DialogTitle>
            </DialogHeader>
            <CreateEscrowForm
              onSuccess={() => setIsCreateOpen(false)}
              onCancel={() => setIsCreateOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Escrows</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">All escrows</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.active}</div>
            <p className="text-xs text-muted-foreground">In progress</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
            <p className="text-xs text-muted-foreground">Successfully finished</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Disputed</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.disputed}</div>
            <p className="text-xs text-muted-foreground">Need resolution</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-4 h-4" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search by task or name..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Role Filter */}
            <Select
              value={roleFilter}
              onValueChange={(value: 'all' | 'client' | 'agent') => setRoleFilter(value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="All roles" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="client">As Client</SelectItem>
                <SelectItem value="agent">As Agent</SelectItem>
              </SelectContent>
            </Select>

            {/* Token Type Filter */}
            <Select
              value={tokenTypeFilter}
              onValueChange={(value: 'all' | 'native' | 'token2022' | 'confidential') =>
                setTokenTypeFilter(value)
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="All tokens" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Tokens</SelectItem>
                <SelectItem value="native">Native SOL</SelectItem>
                <SelectItem value="token2022">Token-2022</SelectItem>
                <SelectItem value="confidential">Confidential</SelectItem>
              </SelectContent>
            </Select>

            {/* Reset Filters */}
            <Button variant="outline" onClick={resetFilters}>
              Reset Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="all" className="flex items-center gap-1">
            All
            {stats.total > 0 && (
              <Badge variant="secondary" className="ml-1">
                {stats.total}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="active" className="flex items-center gap-1">
            Active
            {stats.active > 0 && (
              <Badge variant="secondary" className="ml-1">
                {stats.active}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="completed" className="flex items-center gap-1">
            Completed
            {stats.completed > 0 && (
              <Badge variant="secondary" className="ml-1">
                {stats.completed}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="disputed" className="flex items-center gap-1">
            Disputed
            {stats.disputed > 0 && (
              <Badge variant="secondary" className="ml-1">
                {stats.disputed}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          <EscrowList
            escrows={filteredEscrows}
            isLoading={isLoading}
            error={error}
            onViewDetails={handleViewDetails}
            onComplete={handleComplete}
            onCancel={handleCancel}
            onDispute={handleDispute}
            getUserRole={getUserRole}
          />
        </TabsContent>

        <TabsContent value="active" className="space-y-4">
          <EscrowList
            escrows={filteredEscrows}
            isLoading={isLoading}
            error={error}
            onViewDetails={handleViewDetails}
            onComplete={handleComplete}
            onCancel={handleCancel}
            onDispute={handleDispute}
            getUserRole={getUserRole}
          />
        </TabsContent>

        <TabsContent value="completed" className="space-y-4">
          <EscrowList
            escrows={filteredEscrows}
            isLoading={isLoading}
            error={error}
            onViewDetails={handleViewDetails}
            onComplete={handleComplete}
            onCancel={handleCancel}
            onDispute={handleDispute}
            getUserRole={getUserRole}
          />
        </TabsContent>

        <TabsContent value="disputed" className="space-y-4">
          <EscrowList
            escrows={filteredEscrows}
            isLoading={isLoading}
            error={error}
            onViewDetails={handleViewDetails}
            onComplete={handleComplete}
            onCancel={handleCancel}
            onDispute={handleDispute}
            getUserRole={getUserRole}
          />
        </TabsContent>
      </Tabs>

      {/* Escrow Detail Modal */}
      <EscrowDetail
        escrow={selectedEscrow}
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        onComplete={handleComplete}
        onCancel={handleCancel}
        onDispute={handleDispute}
        onPartialRefund={handlePartialRefund}
        userRole={selectedEscrow ? getUserRole(selectedEscrow) : 'viewer'}
      />
    </div>
  )
}

interface EscrowListProps {
  escrows: Escrow[] | undefined
  isLoading: boolean
  error: Error | null
  onViewDetails: (escrow: Escrow) => void
  onComplete: (escrow: Escrow) => void
  onCancel: (escrow: Escrow) => void
  onDispute: (escrow: Escrow) => void
  getUserRole: (escrow: Escrow) => 'client' | 'agent' | 'viewer'
}

function EscrowList({
  escrows,
  isLoading,
  error,
  onViewDetails,
  onComplete,
  onCancel,
  onDispute,
  getUserRole,
}: EscrowListProps): React.JSX.Element {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin" />
        <span className="ml-2">Loading escrows...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-red-500" />
        <h3 className="text-lg font-medium mb-2">Error Loading Escrows</h3>
        <p className="text-gray-600 dark:text-gray-400">{error.message}</p>
      </div>
    )
  }

  if (!escrows || escrows.length === 0) {
    return (
      <div className="text-center py-12">
        <Shield className="w-12 h-12 mx-auto mb-4 opacity-50" />
        <h3 className="text-lg font-medium mb-2">No Escrows Found</h3>
        <p className="text-gray-600 dark:text-gray-400">No escrows match your current filters.</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
      {escrows.map((escrow) => (
        <EscrowCard
          key={escrow.address}
          escrow={escrow}
          onViewDetails={onViewDetails}
          onComplete={onComplete}
          onCancel={onCancel}
          onDispute={onDispute}
          userRole={getUserRole(escrow)}
        />
      ))}
    </div>
  )
}
