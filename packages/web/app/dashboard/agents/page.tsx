'use client'

import React, { useState } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import { motion } from 'framer-motion'
import {
  Bot,
  Plus,
  Search,
  Power,
  PowerOff,
  Trash2,
  Edit,
  ExternalLink,
  Zap,
  Star,
  Briefcase,
  RefreshCw,
  CheckCircle,
  XCircle,
  Loader2
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DashboardCard } from '@/components/dashboard/shared/DashboardCard'
import { EmptyState } from '@/components/dashboard/shared/EmptyState'
import { DataTable } from '@/components/dashboard/shared/DataTable'
import { StatsCard } from '@/components/dashboard/shared/StatsCard'
import { FormDialog } from '@/components/dashboard/shared/FormDialog'
import { FormField, FormInput, FormTextarea, FormSelect, FormCheckbox } from '@/components/ui/form-field'
import { useFormValidation } from '@/lib/hooks/useFormValidation'
import { registerAgentSchema, agentTypes, agentCapabilities } from '@/lib/schemas/agent'
import { useAgents, useRegisterAgent, useDeleteAgent, useActivateAgent, type Agent } from '@/lib/queries/agents'
import { cn } from '@/lib/utils'

export default function AgentsPage() {
  const { publicKey, connected } = useWallet()
  const [isRegisterOpen, setIsRegisterOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCapabilities, setSelectedCapabilities] = useState<string[]>([])

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    agentType: '',
    capabilities: [] as string[],
    useCompressed: true
  })

  // Queries and mutations
  const { data: agents, isLoading, error, refetch } = useAgents({
    search: searchQuery || undefined
  })
  const registerMutation = useRegisterAgent()
  const deleteMutation = useDeleteAgent()
  const activateMutation = useActivateAgent()

  // Form validation
  const { errors, validate, clearErrors, getFieldError } = useFormValidation(registerAgentSchema)

  // Filter to user's agents
  const userAgents = agents?.filter(
    (agent: Agent) => agent.owner === publicKey?.toBase58()
  ) ?? []

  // Stats calculations
  const totalAgents = userAgents.length
  const activeAgents = userAgents.filter((a: Agent) => a.isActive).length
  const avgReputation = totalAgents > 0
    ? Math.round(userAgents.reduce((sum: number, a: Agent) => sum + a.reputation.score, 0) / totalAgents)
    : 0
  const totalJobs = userAgents.reduce((sum: number, a: Agent) => sum + a.reputation.totalJobs, 0)

  // Handle registration
  const handleRegister = () => {
    if (!validate(formData)) return

    registerMutation.mutate({
      name: formData.name,
      metadata: JSON.stringify({ description: formData.description }),
      capabilities: formData.capabilities,
      pricing: BigInt(0),
      compressed: formData.useCompressed
    }, {
      onSuccess: () => {
        setIsRegisterOpen(false)
        setFormData({
          name: '',
          description: '',
          agentType: '',
          capabilities: [],
          useCompressed: true
        })
        clearErrors()
      }
    })
  }

  // Handle capability toggle
  const toggleCapability = (cap: string) => {
    setFormData(prev => ({
      ...prev,
      capabilities: prev.capabilities.includes(cap)
        ? prev.capabilities.filter(c => c !== cap)
        : [...prev.capabilities, cap]
    }))
  }

  // Table columns
  const columns = [
    {
      header: 'Agent',
      cell: (agent: Agent) => (
        <div className="flex items-center gap-3">
          <div className={cn(
            'w-10 h-10 rounded-xl flex items-center justify-center',
            agent.isActive ? 'bg-primary/10' : 'bg-muted'
          )}>
            <Bot className={cn(
              'w-5 h-5',
              agent.isActive ? 'text-primary' : 'text-muted-foreground'
            )} />
          </div>
          <div>
            <p className="font-bold text-foreground">{agent.name}</p>
            <p className="text-xs text-muted-foreground truncate max-w-[200px]">
              {agent.metadata.description || 'No description'}
            </p>
          </div>
        </div>
      )
    },
    {
      header: 'Status',
      cell: (agent: Agent) => (
        <div className={cn(
          'inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-bold',
          agent.isActive
            ? 'bg-green-500/10 text-green-500 border border-green-500/20'
            : 'bg-muted text-muted-foreground border border-border'
        )}>
          {agent.isActive ? (
            <>
              <CheckCircle className="w-3 h-3" />
              Active
            </>
          ) : (
            <>
              <XCircle className="w-3 h-3" />
              Inactive
            </>
          )}
        </div>
      )
    },
    {
      header: 'Reputation',
      cell: (agent: Agent) => (
        <div className="flex items-center gap-2">
          <Star className="w-4 h-4 text-yellow-500" />
          <span className="font-bold text-foreground">{agent.reputation.score}</span>
          <span className="text-xs text-muted-foreground">/ 100</span>
        </div>
      ),
      sortable: true,
      accessorKey: 'reputation' as keyof Agent
    },
    {
      header: 'Jobs',
      cell: (agent: Agent) => (
        <div className="flex items-center gap-2">
          <Briefcase className="w-4 h-4 text-muted-foreground" />
          <span className="text-foreground">{agent.reputation.totalJobs}</span>
        </div>
      )
    },
    {
      header: 'Actions',
      cell: (agent: Agent) => (
        <div className="flex items-center gap-1">
          <Button
            size="sm"
            variant="ghost"
            onClick={(e) => {
              e.stopPropagation()
              if (agent.isActive) {
                deleteMutation.mutate(agent.address)
              } else {
                activateMutation.mutate(agent.address)
              }
            }}
            disabled={deleteMutation.isPending || activateMutation.isPending}
            className="h-8 w-8 p-0"
          >
            {agent.isActive ? (
              <PowerOff className="w-4 h-4 text-muted-foreground hover:text-red-500" />
            ) : (
              <Power className="w-4 h-4 text-muted-foreground hover:text-green-500" />
            )}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-8 w-8 p-0"
            asChild
          >
            <a
              href={`https://explorer.solana.com/address/${agent.address}?cluster=devnet`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
            >
              <ExternalLink className="w-4 h-4 text-muted-foreground hover:text-primary" />
            </a>
          </Button>
        </div>
      ),
      className: 'w-[100px]'
    }
  ]

  // Not connected state
  if (!connected) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-foreground">AI Agents</h1>
            <p className="text-muted-foreground">Manage your registered AI agents</p>
          </div>
        </div>
        
        <EmptyState
          icon={Bot}
          title="Connect Your Wallet"
          description="Connect your wallet to view and manage your AI agents on GhostSpeak."
          features={[
            'Register autonomous AI agents',
            '5000x cheaper with compressed NFTs',
            'Earn through x402 micropayments'
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
          <h1 className="text-2xl font-black text-foreground">AI Agents</h1>
          <p className="text-muted-foreground">Manage your registered AI agents</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isLoading}
            className="border-border"
          >
            <RefreshCw className={cn('w-4 h-4 mr-2', isLoading && 'animate-spin')} />
            Refresh
          </Button>
          <Button
            onClick={() => setIsRegisterOpen(true)}
            className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold"
          >
            <Plus className="w-4 h-4 mr-2" />
            Register Agent
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatsCard
          label="Total Agents"
          value={totalAgents}
          icon={Bot}
          loading={isLoading}
        />
        <StatsCard
          label="Active"
          value={activeAgents}
          icon={Zap}
          trend={totalAgents > 0 ? `${Math.round((activeAgents / totalAgents) * 100)}%` : undefined}
          trendUp={activeAgents > 0}
          loading={isLoading}
        />
        <StatsCard
          label="Avg Reputation"
          value={avgReputation}
          unit="/ 100"
          icon={Star}
          loading={isLoading}
        />
        <StatsCard
          label="Total Jobs"
          value={totalJobs}
          icon={Briefcase}
          loading={isLoading}
        />
      </div>

      {/* Search */}
      <DashboardCard noPadding>
        <div className="p-4 border-b border-border">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search agents by name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-10 pl-10 pr-4 rounded-xl bg-muted/50 border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50"
            />
          </div>
        </div>
      </DashboardCard>

      {/* Agents List */}
      {error ? (
        <DashboardCard>
          <div className="text-center py-8">
            <p className="text-red-500 mb-4">Failed to load agents</p>
            <Button variant="outline" onClick={() => refetch()}>
              Try Again
            </Button>
          </div>
        </DashboardCard>
      ) : userAgents.length === 0 && !isLoading ? (
        <EmptyState
          icon={Bot}
          title="Register Your First Agent"
          description="Create an AI agent to start offering services on the GhostSpeak marketplace. Agents earn through x402 micropayments."
          actionLabel="Register Agent"
          onAction={() => setIsRegisterOpen(true)}
          features={[
            'Register with compressed NFTs (5000x cheaper)',
            'Accept instant x402 micropayments',
            'Build on-chain reputation automatically'
          ]}
        />
      ) : (
        <DataTable
          data={userAgents}
          columns={columns}
          isLoading={isLoading}
          emptyMessage="No agents found matching your search"
          keyExtractor={(agent) => agent.address}
        />
      )}

      {/* Register Dialog */}
      <FormDialog
        open={isRegisterOpen}
        onOpenChange={setIsRegisterOpen}
        title="Register New Agent"
        description="Create a new AI agent to offer services on GhostSpeak"
        icon={Bot}
        submitLabel="Register Agent"
        onSubmit={handleRegister}
        isSubmitting={registerMutation.isPending}
      >
        <FormField
          label="Agent Name"
          name="name"
          required
          error={getFieldError('name')}
        >
          <FormInput
            id="name"
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            placeholder="My AI Assistant"
            error={!!getFieldError('name')}
          />
        </FormField>

        <FormField
          label="Description"
          name="description"
          error={getFieldError('description')}
        >
          <FormTextarea
            id="description"
            value={formData.description}
            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            placeholder="Describe what your agent does..."
            rows={3}
            error={!!getFieldError('description')}
          />
        </FormField>

        <FormField
          label="Agent Type"
          name="agentType"
          required
          error={getFieldError('agentType')}
        >
          <FormSelect
            id="agentType"
            value={formData.agentType}
            onChange={(e) => setFormData(prev => ({ ...prev, agentType: e.target.value }))}
            options={agentTypes.map(t => ({ value: t.value, label: t.label }))}
            placeholder="Select agent type"
            error={!!getFieldError('agentType')}
          />
        </FormField>

        <FormField
          label="Capabilities"
          name="capabilities"
          required
          error={getFieldError('capabilities')}
          hint="Select at least one capability"
        >
          <div className="flex flex-wrap gap-2">
            {agentCapabilities.map((cap) => (
              <button
                key={cap}
                type="button"
                onClick={() => toggleCapability(cap)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs font-medium transition-all border',
                  formData.capabilities.includes(cap)
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-muted/50 text-muted-foreground border-border hover:border-primary/50'
                )}
              >
                {cap.replace('-', ' ')}
              </button>
            ))}
          </div>
        </FormField>

        <FormCheckbox
          label="Use compressed registration (5000x cheaper)"
          checked={formData.useCompressed}
          onChange={(e) => setFormData(prev => ({ ...prev, useCompressed: e.target.checked }))}
        />
      </FormDialog>
    </div>
  )
}
