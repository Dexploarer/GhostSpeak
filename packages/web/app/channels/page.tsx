'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
  Hash,
  Plus,
  Search,
  Filter,
  MessageCircle,
  Users,
  Lock,
  Volume2,
  Loader2,
  TrendingUp,
} from 'lucide-react'
import { useWallet } from '@solana/wallet-adapter-react'
import { useChannels, ChannelType, type Channel } from '@/lib/queries/channels'
import { ChannelCard } from '@/components/channels/ChannelCard'
import { CreateChannelForm } from '@/components/channels/CreateChannelForm'

export default function ChannelsPage(): React.JSX.Element {
  const { publicKey } = useWallet()
  const [isCreateOpen, setIsCreateOpen] = React.useState(false)
  const [activeTab, setActiveTab] = React.useState('all')

  // Filters
  const [search, setSearch] = React.useState('')
  const [typeFilter, setTypeFilter] = React.useState<ChannelType[]>([])
  const [joinedFilter, setJoinedFilter] = React.useState<boolean | undefined>(undefined)

  const filters = {
    type: typeFilter.length > 0 ? typeFilter : undefined,
    search: search || undefined,
    joined: joinedFilter,
    userAddress: publicKey?.toString(),
  }

  const { data: channels, isLoading, error } = useChannels(filters)

  // Filter channels by tab
  const filteredChannels = React.useMemo(() => {
    if (!channels) return []

    switch (activeTab) {
      case 'joined':
        // For demo purposes, assume user is joined to public channels and owns private ones
        return channels.filter(
          (channel: Channel) =>
            !channel.isPrivate ||
            channel.owner === publicKey?.toString() ||
            channel.channelType === ChannelType.Direct
        )
      case 'public':
        return channels.filter((channel: Channel) => channel.channelType === ChannelType.Public)
      case 'private':
        return channels.filter(
          (channel: Channel) =>
            channel.channelType === ChannelType.Private && channel.owner === publicKey?.toString()
        )
      case 'dms':
        return channels.filter((channel: Channel) => channel.channelType === ChannelType.Direct)
      default:
        return channels
    }
  }, [channels, activeTab, publicKey])

  // Calculate statistics
  const stats = React.useMemo(() => {
    if (!channels) return { total: 0, joined: 0, public: 0, private: 0, dms: 0, unread: 0 }

    const userAddress = publicKey?.toString()
    const joined = channels.filter(
      (channel: Channel) =>
        !channel.isPrivate ||
        channel.owner === userAddress ||
        channel.channelType === ChannelType.Direct
    )

    return {
      total: channels.length,
      joined: joined.length,
      public: channels.filter((c: Channel) => c.channelType === ChannelType.Public).length,
      private: channels.filter(
        (c: Channel) => c.channelType === ChannelType.Private && c.owner === userAddress
      ).length,
      dms: channels.filter((c: Channel) => c.channelType === ChannelType.Direct).length,
      unread: channels.reduce((sum: number, c: Channel) => sum + (c.unreadCount || 0), 0),
    }
  }, [channels, publicKey])

  const handleViewDetails = (channel: Channel): void => {
    // TODO: Open channel details modal
    console.log('View channel details:', channel)
  }

  const handleEditChannel = (channel: Channel): void => {
    // TODO: Open edit channel modal
    console.log('Edit channel:', channel)
  }

  const resetFilters = (): void => {
    setSearch('')
    setTypeFilter([])
    setJoinedFilter(undefined)
  }

  const toggleTypeFilter = (type: ChannelType): void => {
    setTypeFilter((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    )
  }

  if (!publicKey) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-12">
          <MessageCircle className="w-16 h-16 mx-auto mb-4 opacity-50" />
          <h2 className="text-2xl font-bold mb-4">Connect Your Wallet</h2>
          <p className="text-gray-600 dark:text-gray-400">
            Connect your wallet to view and join channels.
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
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Channels</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Connect with the GhostSpeak community through channels and direct messages
          </p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Create Channel
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Channel</DialogTitle>
            </DialogHeader>
            <CreateChannelForm
              onSuccess={() => setIsCreateOpen(false)}
              onCancel={() => setIsCreateOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total</CardTitle>
            <Hash className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Joined</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.joined}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Public</CardTitle>
            <Hash className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.public}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Private</CardTitle>
            <Lock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{stats.private}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Direct</CardTitle>
            <MessageCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.dms}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unread</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.unread}</div>
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
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search channels..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Channel Type Filters */}
            <div className="flex flex-wrap gap-2">
              {Object.values(ChannelType).map((type) => (
                <Button
                  key={type}
                  variant={typeFilter.includes(type) ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => toggleTypeFilter(type)}
                  className="flex items-center gap-1"
                >
                  {type === ChannelType.Public && <Hash className="w-3 h-3" />}
                  {type === ChannelType.Private && <Lock className="w-3 h-3" />}
                  {type === ChannelType.Direct && <MessageCircle className="w-3 h-3" />}
                  {type === ChannelType.Group && <Volume2 className="w-3 h-3" />}
                  {type}
                </Button>
              ))}
            </div>

            {/* Reset Filters */}
            <Button variant="outline" onClick={resetFilters}>
              Reset
            </Button>
          </div>

          {/* Active Filters */}
          {(search || typeFilter.length > 0) && (
            <div className="flex flex-wrap gap-2 mt-4">
              {search && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  Search: &quot;{search}&quot;
                  <button onClick={() => setSearch('')} className="ml-1 hover:bg-gray-200 rounded">
                    ×
                  </button>
                </Badge>
              )}
              {typeFilter.map((type) => (
                <Badge key={type} variant="secondary" className="flex items-center gap-1">
                  {type}
                  <button
                    onClick={() => toggleTypeFilter(type)}
                    className="ml-1 hover:bg-gray-200 rounded"
                  >
                    ×
                  </button>
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="all" className="flex items-center gap-1">
            All
            {stats.total > 0 && (
              <Badge variant="secondary" className="ml-1">
                {stats.total}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="joined" className="flex items-center gap-1">
            Joined
            {stats.joined > 0 && (
              <Badge variant="secondary" className="ml-1">
                {stats.joined}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="public" className="flex items-center gap-1">
            Public
            {stats.public > 0 && (
              <Badge variant="secondary" className="ml-1">
                {stats.public}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="private" className="flex items-center gap-1">
            Private
            {stats.private > 0 && (
              <Badge variant="secondary" className="ml-1">
                {stats.private}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="dms" className="flex items-center gap-1">
            Direct
            {stats.dms > 0 && (
              <Badge variant="secondary" className="ml-1">
                {stats.dms}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          <ChannelList
            channels={filteredChannels}
            isLoading={isLoading}
            error={error}
            onViewDetails={handleViewDetails}
            onEditChannel={handleEditChannel}
            userAddress={publicKey.toString()}
          />
        </TabsContent>

        <TabsContent value="joined" className="space-y-4">
          <ChannelList
            channels={filteredChannels}
            isLoading={isLoading}
            error={error}
            onViewDetails={handleViewDetails}
            onEditChannel={handleEditChannel}
            userAddress={publicKey.toString()}
            isJoined={true}
          />
        </TabsContent>

        <TabsContent value="public" className="space-y-4">
          <ChannelList
            channels={filteredChannels}
            isLoading={isLoading}
            error={error}
            onViewDetails={handleViewDetails}
            onEditChannel={handleEditChannel}
            userAddress={publicKey.toString()}
          />
        </TabsContent>

        <TabsContent value="private" className="space-y-4">
          <ChannelList
            channels={filteredChannels}
            isLoading={isLoading}
            error={error}
            onViewDetails={handleViewDetails}
            onEditChannel={handleEditChannel}
            userAddress={publicKey.toString()}
            isJoined={true}
          />
        </TabsContent>

        <TabsContent value="dms" className="space-y-4">
          <ChannelList
            channels={filteredChannels}
            isLoading={isLoading}
            error={error}
            onViewDetails={handleViewDetails}
            onEditChannel={handleEditChannel}
            userAddress={publicKey.toString()}
            isJoined={true}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}

interface ChannelListProps {
  channels: Channel[] | undefined
  isLoading: boolean
  error: Error | null
  onViewDetails: (channel: Channel) => void
  onEditChannel: (channel: Channel) => void
  userAddress: string
  isJoined?: boolean
}

function ChannelList({
  channels,
  isLoading,
  error,
  onViewDetails,
  onEditChannel,
  userAddress,
  isJoined = false,
}: ChannelListProps): React.JSX.Element {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin" />
        <span className="ml-2">Loading channels...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <MessageCircle className="w-12 h-12 mx-auto mb-4 text-red-500" />
        <h3 className="text-lg font-medium mb-2">Error Loading Channels</h3>
        <p className="text-gray-600 dark:text-gray-400">{error.message}</p>
      </div>
    )
  }

  if (!channels || channels.length === 0) {
    return (
      <div className="text-center py-12">
        <Hash className="w-12 h-12 mx-auto mb-4 opacity-50" />
        <h3 className="text-lg font-medium mb-2">No Channels Found</h3>
        <p className="text-gray-600 dark:text-gray-400">No channels match your current filters.</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
      {channels.map((channel) => (
        <ChannelCard
          key={channel.address}
          channel={channel}
          onViewDetails={onViewDetails}
          onEditChannel={onEditChannel}
          userAddress={userAddress}
          isJoined={isJoined}
        />
      ))}
    </div>
  )
}
