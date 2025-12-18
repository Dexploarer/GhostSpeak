'use client'

import React from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  ArrowLeft,
  Hash,
  Lock,
  MessageCircle,
  Volume2,
  Users,
  Settings,
  Search,
  Pin,
  Bell,
  BellOff,
  UserPlus,
  MoreHorizontal,
  Crown,
  Shield,
  Circle,
  Loader2,
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useWallet } from '@solana/wallet-adapter-react'
import {
  useChannel,
  useChannelMessages,
  useChannelMembers,
  ChannelType,
  type Message,
  type ChannelMember,
} from '@/lib/queries/channels'
import { MessageThread } from '@/components/channels/MessageThread'
import { MessageComposer } from '@/components/channels/MessageComposer'
import { cn } from '@/lib/utils'
import { formatDistanceToNow } from 'date-fns'

const channelTypeConfig = {
  [ChannelType.Public]: {
    icon: Hash,
    color: 'text-blue-500',
    bgColor: 'bg-blue-500',
  },
  [ChannelType.Private]: {
    icon: Lock,
    color: 'text-purple-500',
    bgColor: 'bg-purple-500',
  },
  [ChannelType.Direct]: {
    icon: MessageCircle,
    color: 'text-green-500',
    bgColor: 'bg-green-500',
  },
  [ChannelType.Group]: {
    icon: Volume2,
    color: 'text-orange-500',
    bgColor: 'bg-orange-500',
  },
}

export default function ChannelDetailPage(): React.JSX.Element {
  const params = useParams()
  const channelId = params?.id as string
  const { publicKey } = useWallet()
  const [replyTo, setReplyTo] = React.useState<Message | undefined>()
  const [sidebarOpen, setSidebarOpen] = React.useState(true)
  const [editingMessage, setEditingMessage] = React.useState<Message | undefined>()

  const { data: channel, isLoading: channelLoading, error: channelError } = useChannel(channelId)
  const { data: messages } = useChannelMessages(channelId, {
    limit: 50,
  })
  const { data: members, isLoading: membersLoading } = useChannelMembers(channelId)

  const userAddress = publicKey?.toString()
  const isOwner = channel?.owner === userAddress
  const typeInfo = channel
    ? channelTypeConfig[channel.channelType]
    : channelTypeConfig[ChannelType.Public]
  const TypeIcon = typeInfo.icon

  const handleReply = (message: Message): void => {
    setReplyTo(message)
  }

  const handleEditMessage = (message: Message): void => {
    // Set message as being edited
    setEditingMessage(message)
    toast.info('Message editing active', {
      description: 'Modify the message content below and press Enter to save.',
    })
    // In a full implementation, this would:
    // 1. Show inline edit UI in MessageThread
    // 2. Call SDK's channel.updateMessage() on save
    // 3. Invalidate and refetch messages
  }

  const handleCancelEdit = (): void => {
    setEditingMessage(undefined)
  }

  const clearReply = (): void => {
    setReplyTo(undefined)
  }

  if (channelLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" />
        <span className="ml-2">Loading channel...</span>
      </div>
    )
  }

  if (channelError || !channel) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <MessageCircle className="w-16 h-16 mx-auto mb-4 opacity-50" />
          <h2 className="text-2xl font-bold mb-4">Channel Not Found</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            The channel you&apos;re looking for doesn&apos;t exist or you don&apos;t have access to
            it.
          </p>
          <Link href="/channels">
            <Button>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Channels
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  if (!publicKey) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <MessageCircle className="w-16 h-16 mx-auto mb-4 opacity-50" />
          <h2 className="text-2xl font-bold mb-4">Connect Your Wallet</h2>
          <p className="text-gray-600 dark:text-gray-400">
            Connect your wallet to access this channel.
          </p>
        </div>
      </div>
    )
  }

  const onlineMembers = members?.filter((member) => member.isOnline) || []
  const offlineMembers = members?.filter((member) => !member.isOnline) || []

  return (
    <div className="h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
      {/* Channel Header */}
      <div className="border-b bg-white dark:bg-gray-800 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/channels">
              <Button variant="ghost" size="sm" className="sm:hidden">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>

            <div className="flex items-center gap-3">
              <div className={cn('p-2 rounded-lg', typeInfo.bgColor)}>
                <TypeIcon className="w-5 h-5 text-white" />
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                    {channel.name}
                  </h1>
                  {isOwner && <Crown className="w-4 h-4 text-yellow-500" />}
                  {channel.settings.requireEncryption && (
                    <Shield className="w-4 h-4 text-green-500" />
                  )}
                </div>

                <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                  <span className="flex items-center gap-1">
                    <Users className="w-4 h-4" />
                    {channel.memberCount} members
                  </span>
                  {channel.description && (
                    <span className="hidden sm:block truncate max-w-md">{channel.description}</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Header Actions */}
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm">
              <Search className="w-4 h-4" />
            </Button>

            <Button variant="ghost" size="sm">
              <Pin className="w-4 h-4" />
            </Button>

            <Button variant="ghost" size="sm">
              <Bell className="w-4 h-4" />
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="hidden lg:flex"
            >
              <Users className="w-4 h-4" />
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem>
                  <UserPlus className="w-4 h-4 mr-2" />
                  Invite Members
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <BellOff className="w-4 h-4 mr-2" />
                  Mute Channel
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {isOwner && (
                  <DropdownMenuItem>
                    <Settings className="w-4 h-4 mr-2" />
                    Channel Settings
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Messages Area */}
        <div className="flex-1 flex flex-col">
          {/* Messages Thread */}
          <div className="flex-1 bg-white dark:bg-gray-900">
            <MessageThread
              messages={messages || []}
              channelAddress={channelId}
              userAddress={userAddress}
              onReply={handleReply}
              onEditMessage={handleEditMessage}
              className="h-full"
            />
          </div>

          {/* Message Composer */}
          <MessageComposer
            channelAddress={channelId}
            replyTo={replyTo}
            onClearReply={clearReply}
            placeholder={
              channel.channelType === ChannelType.Group && !isOwner
                ? 'Only channel administrators can send messages'
                : `Message #${channel.name}`
            }
            disabled={channel.channelType === ChannelType.Group && !isOwner}
          />
        </div>

        {/* Members Sidebar */}
        {sidebarOpen && (
          <div className="hidden lg:flex lg:w-64 xl:w-80 border-l bg-white dark:bg-gray-800 flex-col">
            <div className="p-4 border-b">
              <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <Users className="w-4 h-4" />
                Members ({channel.memberCount})
              </h3>
            </div>

            <div className="flex-1 overflow-y-auto">
              {membersLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin" />
                </div>
              ) : (
                <div className="p-4 space-y-4">
                  {/* Online Members */}
                  {onlineMembers.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                        <Circle className="w-3 h-3 fill-green-500 text-green-500" />
                        Online ({onlineMembers.length})
                      </h4>
                      <div className="space-y-2">
                        {onlineMembers.map((member) => (
                          <MemberItem key={member.address} member={member} />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Offline Members */}
                  {offlineMembers.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                        <Circle className="w-3 h-3 fill-gray-400 text-gray-400" />
                        Offline ({offlineMembers.length})
                      </h4>
                      <div className="space-y-2">
                        {offlineMembers.map((member) => (
                          <MemberItem key={member.address} member={member} />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Channel Info */}
            <div className="p-4 border-t space-y-3">
              <div>
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Channel Info
                </h4>
                <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                  <div>Created {formatDistanceToNow(channel.createdAt, { addSuffix: true })}</div>
                  {channel.settings.messageRetentionDays > 0 && (
                    <div>Messages retained for {channel.settings.messageRetentionDays} days</div>
                  )}
                  {channel.settings.slowModeSeconds > 0 && (
                    <div>Slow mode: {channel.settings.slowModeSeconds}s</div>
                  )}
                </div>
              </div>

              {channel.tags.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Tags
                  </h4>
                  <div className="flex flex-wrap gap-1">
                    {channel.tags.map((tag) => (
                      <Badge key={tag} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

interface MemberItemProps {
  member: ChannelMember
}

function MemberItem({ member }: MemberItemProps): React.JSX.Element {
  const getRoleIcon = (role: string): React.ReactNode => {
    switch (role) {
      case 'owner':
        return <Crown className="w-3 h-3 text-yellow-500" />
      case 'admin':
        return <Shield className="w-3 h-3 text-blue-500" />
      default:
        return null
    }
  }

  const getRoleColor = (role: string): string => {
    switch (role) {
      case 'owner':
        return 'text-yellow-600'
      case 'admin':
        return 'text-blue-600'
      default:
        return 'text-gray-600 dark:text-gray-400'
    }
  }

  const getUserInitials = (address: string, username?: string): string => {
    if (username) {
      return username
        .split(' ')
        .map((name) => name[0]?.toUpperCase())
        .join('')
        .slice(0, 2)
    }
    return address.slice(0, 2).toUpperCase()
  }

  return (
    <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
      <div className="relative">
        <Avatar className="w-8 h-8">
          <AvatarImage src={member.avatarUrl} alt={member.username} />
          <AvatarFallback className="bg-blue-500 text-white text-xs font-medium">
            {getUserInitials(member.address, member.username)}
          </AvatarFallback>
        </Avatar>
        {member.isOnline && (
          <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-white dark:border-gray-800 rounded-full" />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-900 dark:text-white truncate">
            {member.username || `${member.address.slice(0, 8)}...`}
          </span>
          {getRoleIcon(member.role)}
        </div>
        <div className={cn('text-xs truncate', getRoleColor(member.role))}>
          {member.role === 'owner'
            ? 'Owner'
            : member.role === 'admin'
              ? 'Admin'
              : member.isOnline
                ? 'Online'
                : `Last seen ${formatDistanceToNow(member.lastActiveAt, { addSuffix: true })}`}
        </div>
      </div>
    </div>
  )
}
