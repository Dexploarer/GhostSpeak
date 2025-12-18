'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { useWallet } from '@solana/wallet-adapter-react'
import {
  MessageSquare,
  Plus,
  Search,
  Users,
  Lock,
  Globe,
  Hash,
  RefreshCw,
  Clock,
  ArrowRight
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DashboardCard } from '@/components/dashboard/shared/DashboardCard'
import { EmptyState } from '@/components/dashboard/shared/EmptyState'
import { StatsCard } from '@/components/dashboard/shared/StatsCard'
import { FormDialog } from '@/components/dashboard/shared/FormDialog'
import { FormField, FormInput, FormTextarea, FormCheckbox } from '@/components/ui/form-field'
import { useFormValidation } from '@/lib/hooks/useFormValidation'
import { createChannelSchema } from '@/lib/schemas/channel'
import { useChannels, useCreateChannel, ChannelType, type Channel } from '@/lib/queries/channels'
import { cn } from '@/lib/utils'

export default function ChannelsPage() {
  const { publicKey, connected } = useWallet()
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterType, setFilterType] = useState<'all' | 'public' | 'private' | 'mine'>('all')

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    isPrivate: false,
    maxMembers: 100
  })

  // Queries
  const { data: channels, isLoading, refetch } = useChannels({
    search: searchQuery || undefined,
    userAddress: publicKey?.toBase58()
  })

  // Mutations
  const createMutation = useCreateChannel()

  // Validation
  const { errors, validate, clearErrors, getFieldError } = useFormValidation(createChannelSchema)

  // Filter channels
  const filteredChannels = channels?.filter((channel: Channel) => {
    if (filterType === 'public') return !channel.isPrivate
    if (filterType === 'private') return channel.isPrivate
    if (filterType === 'mine') return channel.owner === publicKey?.toBase58()
    return true
  }) ?? []

  // Stats
  const totalChannels = channels?.length ?? 0
  const publicChannels = channels?.filter((c: Channel) => !c.isPrivate).length ?? 0
  const privateChannels = channels?.filter((c: Channel) => c.isPrivate).length ?? 0
  const myChannels = channels?.filter((c: Channel) => c.owner === publicKey?.toBase58()).length ?? 0

  // Handle create
  const handleCreate = () => {
    if (!validate(formData)) return

    createMutation.mutate({
      name: formData.name,
      description: formData.description,
      channelType: formData.isPrivate ? ChannelType.Private : ChannelType.Public,
      isPrivate: formData.isPrivate,
      maxMembers: formData.maxMembers
    }, {
      onSuccess: () => {
        setIsCreateOpen(false)
        setFormData({
          name: '',
          description: '',
          isPrivate: false,
          maxMembers: 100
        })
        clearErrors()
      }
    })
  }

  // Format relative time
  const formatRelativeTime = (date: Date) => {
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (minutes < 1) return 'just now'
    if (minutes < 60) return `${minutes}m ago`
    if (hours < 24) return `${hours}h ago`
    return `${days}d ago`
  }

  const filters = [
    { id: 'all', label: 'All', count: totalChannels },
    { id: 'public', label: 'Public', count: publicChannels },
    { id: 'private', label: 'Private', count: privateChannels },
    { id: 'mine', label: 'My Channels', count: myChannels }
  ]

  // Not connected state
  if (!connected) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-black text-foreground">Channels</h1>
          <p className="text-muted-foreground">Communicate with AI agents and collaborators</p>
        </div>
        
        <EmptyState
          icon={MessageSquare}
          title="Connect Your Wallet"
          description="Connect your wallet to create and join channels for real-time communication."
          features={[
            'Create public or private channels',
            'Send messages with on-chain verification',
            'Collaborate with AI agents'
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
          <h1 className="text-2xl font-black text-foreground">Channels</h1>
          <p className="text-muted-foreground">Communicate with AI agents and collaborators</p>
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
            onClick={() => setIsCreateOpen(true)}
            className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Channel
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatsCard
          label="Total Channels"
          value={totalChannels}
          icon={MessageSquare}
          loading={isLoading}
        />
        <StatsCard
          label="Public"
          value={publicChannels}
          icon={Globe}
          loading={isLoading}
        />
        <StatsCard
          label="Private"
          value={privateChannels}
          icon={Lock}
          loading={isLoading}
        />
        <StatsCard
          label="My Channels"
          value={myChannels}
          icon={Users}
          loading={isLoading}
        />
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        {filters.map((filter) => (
          <button
            key={filter.id}
            onClick={() => setFilterType(filter.id as typeof filterType)}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap',
              filterType === filter.id
                ? 'bg-primary text-primary-foreground shadow-[0_0_20px_rgba(204,255,0,0.2)]'
                : 'bg-muted text-muted-foreground hover:text-foreground'
            )}
          >
            {filter.label}
            <span className={cn(
              'px-1.5 py-0.5 rounded text-xs',
              filterType === filter.id ? 'bg-primary-foreground/20' : 'bg-background'
            )}>
              {filter.count}
            </span>
          </button>
        ))}
      </div>

      {/* Search */}
      <DashboardCard noPadding>
        <div className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search channels..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-10 pl-10 pr-4 rounded-xl bg-muted/50 border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50"
            />
          </div>
        </div>
      </DashboardCard>

      {/* Channels List */}
      {filteredChannels.length === 0 && !isLoading ? (
        <EmptyState
          icon={MessageSquare}
          title="No Channels Found"
          description={filterType === 'mine' 
            ? "You haven't created any channels yet. Create one to start collaborating."
            : "No channels match your search. Try a different filter or create a new channel."
          }
          actionLabel="Create Channel"
          onAction={() => setIsCreateOpen(true)}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {isLoading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="rounded-2xl bg-card/50 border border-border p-6 animate-pulse">
                <div className="h-4 bg-muted rounded w-3/4 mb-4" />
                <div className="h-3 bg-muted rounded w-1/2 mb-2" />
                <div className="h-3 bg-muted rounded w-2/3" />
              </div>
            ))
          ) : (
            filteredChannels.map((channel: Channel) => (
              <Link
                key={channel.address}
                href={`/dashboard/channels/${channel.address}`}
                className="block"
              >
                <div className="rounded-2xl bg-card/50 backdrop-blur-xl border border-border p-6 hover:border-primary/20 hover:shadow-[0_0_30px_rgba(204,255,0,0.05)] transition-all group h-full">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        'w-10 h-10 rounded-xl flex items-center justify-center',
                        channel.isPrivate ? 'bg-orange-500/10' : 'bg-primary/10'
                      )}>
                        {channel.isPrivate ? (
                          <Lock className="w-5 h-5 text-orange-500" />
                        ) : (
                          <Hash className="w-5 h-5 text-primary" />
                        )}
                      </div>
                      <div>
                        <h3 className="font-bold text-foreground group-hover:text-primary transition-colors">
                          {channel.name.length > 20 
                            ? `${channel.name.slice(0, 8)}...${channel.name.slice(-4)}`
                            : channel.name
                          }
                        </h3>
                        <p className="text-xs text-muted-foreground">
                          {channel.isPrivate ? 'Private' : 'Public'} channel
                        </p>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                  </div>

                  {/* Description */}
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-4 min-h-[40px]">
                    {channel.description || 'No description'}
                  </p>

                  {/* Footer */}
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Users className="w-3.5 h-3.5" />
                      <span>{channel.memberCount} members</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{formatRelativeTime(channel.lastActivity)}</span>
                    </div>
                  </div>
                </div>
              </Link>
            ))
          )}
        </div>
      )}

      {/* Create Channel Dialog */}
      <FormDialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        title="Create Channel"
        description="Create a new channel for collaboration"
        icon={MessageSquare}
        submitLabel="Create Channel"
        onSubmit={handleCreate}
        isSubmitting={createMutation.isPending}
      >
        <FormField
          label="Channel Name"
          name="name"
          required
          error={getFieldError('name')}
          hint="Lowercase letters, numbers, and hyphens only"
        >
          <FormInput
            id="name"
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ 
              ...prev, 
              name: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-')
            }))}
            placeholder="my-channel"
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
            placeholder="What is this channel for?"
            rows={3}
            error={!!getFieldError('description')}
          />
        </FormField>

        <FormCheckbox
          label="Make this channel private"
          checked={formData.isPrivate}
          onChange={(e) => setFormData(prev => ({ ...prev, isPrivate: e.target.checked }))}
        />

        <FormField
          label="Max Members"
          name="maxMembers"
          error={getFieldError('maxMembers')}
        >
          <FormInput
            id="maxMembers"
            type="number"
            value={formData.maxMembers}
            onChange={(e) => setFormData(prev => ({ ...prev, maxMembers: parseInt(e.target.value) || 100 }))}
            min={2}
            max={1000}
            error={!!getFieldError('maxMembers')}
          />
        </FormField>
      </FormDialog>
    </div>
  )
}
