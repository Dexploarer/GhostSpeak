'use client'

import React from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Hash,
  Lock,
  Users,
  MessageCircle,
  Clock,
  Volume2,
  VolumeX,
  UserPlus,
  Settings,
  Crown,
  Shield,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatDistanceToNow } from 'date-fns'
import type { Channel } from '@/lib/queries/channels'
import { ChannelType } from '@/lib/queries/channels'
import { useJoinChannel, useLeaveChannel } from '@/lib/queries/channels'

interface ChannelCardProps {
  channel: Channel
  onViewDetails?: (channel: Channel) => void
  onEditChannel?: (channel: Channel) => void
  userAddress?: string
  isJoined?: boolean
  className?: string
}

const channelTypeConfig = {
  [ChannelType.Public]: {
    icon: Hash,
    color: 'bg-blue-500',
    label: 'Public',
    variant: 'default' as const,
  },
  [ChannelType.Private]: {
    icon: Lock,
    color: 'bg-purple-500',
    label: 'Private',
    variant: 'secondary' as const,
  },
  [ChannelType.Direct]: {
    icon: MessageCircle,
    color: 'bg-green-500',
    label: 'Direct',
    variant: 'outline' as const,
  },
  [ChannelType.Group]: {
    icon: Volume2,
    color: 'bg-orange-500',
    label: 'Announcement',
    variant: 'destructive' as const,
  },
}

export function ChannelCard({
  channel,
  onViewDetails,
  onEditChannel,
  userAddress,
  isJoined = false,
  className,
}: ChannelCardProps): React.JSX.Element {
  const joinChannel = useJoinChannel()
  const leaveChannel = useLeaveChannel()

  const typeInfo = channelTypeConfig[channel.channelType]
  const TypeIcon = typeInfo.icon

  const isOwner = userAddress === channel.owner
  const canJoin = !isJoined && !channel.isPrivate && channel.channelType !== ChannelType.Direct
  const canLeave = isJoined && !isOwner && channel.channelType !== ChannelType.Direct

  const formatMemberCount = (count: number): string => {
    if (count >= 1000) return `${(count / 1000).toFixed(1)}k`
    return count.toString()
  }

  const getChannelInitials = (name: string): string => {
    return name
      .split(/[\s-_]/)
      .map((word) => word[0]?.toUpperCase())
      .join('')
      .slice(0, 2)
  }

  const handleJoin = async (): Promise<void> => {
    try {
      await joinChannel.mutateAsync(channel.address)
    } catch (error) {
      console.error('Failed to join channel:', error)
    }
  }

  const handleLeave = async (): Promise<void> => {
    try {
      await leaveChannel.mutateAsync(channel.address)
    } catch (error) {
      console.error('Failed to leave channel:', error)
    }
  }

  return (
    <Card
      className={cn('group hover:shadow-lg transition-all duration-200 overflow-hidden', className)}
    >
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            {/* Channel Avatar */}
            <Avatar className="w-12 h-12 shrink-0">
              <AvatarImage src={channel.avatarUrl} alt={channel.name} />
              <AvatarFallback className={cn('text-white font-bold', typeInfo.color)}>
                {channel.channelType === ChannelType.Direct ? (
                  <MessageCircle className="w-6 h-6" />
                ) : (
                  getChannelInitials(channel.name)
                )}
              </AvatarFallback>
            </Avatar>

            {/* Channel Info */}
            <div className="flex-1 min-w-0">
              <CardTitle className="flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-white">
                <TypeIcon className="w-4 h-4 shrink-0" />
                <span className="truncate">{channel.name}</span>
                {isOwner && <Crown className="w-4 h-4 text-yellow-500 shrink-0" />}
              </CardTitle>

              {channel.description && (
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
                  {channel.description}
                </p>
              )}

              {/* Channel Tags */}
              {channel.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {channel.tags.slice(0, 3).map((tag) => (
                    <Badge key={tag} variant="outline" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                  {channel.tags.length > 3 && (
                    <Badge variant="outline" className="text-xs">
                      +{channel.tags.length - 3}
                    </Badge>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Channel Type Badge */}
          <div className="flex items-center gap-2 shrink-0">
            <Badge variant={typeInfo.variant} className="flex items-center gap-1">
              <TypeIcon className="w-3 h-3" />
              {typeInfo.label}
            </Badge>
            {channel.unreadCount && channel.unreadCount > 0 && (
              <Badge
                variant="destructive"
                className="text-xs min-w-[20px] h-5 flex items-center justify-center"
              >
                {channel.unreadCount > 99 ? '99+' : channel.unreadCount}
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Channel Stats */}
        <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              <Users className="w-4 h-4" />
              <span>
                {formatMemberCount(channel.memberCount)}
                {channel.maxMembers > 0 && channel.maxMembers !== 1000 && (
                  <span className="text-gray-500">/{formatMemberCount(channel.maxMembers)}</span>
                )}
              </span>
            </div>

            {channel.settings.slowModeSeconds > 0 && (
              <div className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                <span>{channel.settings.slowModeSeconds}s</span>
              </div>
            )}

            {channel.settings.requireEncryption && (
              <div className="flex items-center gap-1">
                <Shield className="w-4 h-4 text-green-500" />
                <span>Encrypted</span>
              </div>
            )}
          </div>

          <div className="text-xs">
            {channel.lastActivity && formatDistanceToNow(channel.lastActivity, { addSuffix: true })}
          </div>
        </div>

        {/* Last Message Preview */}
        {channel.lastMessage && (
          <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border-l-4 border-blue-500">
            <div className="text-sm">
              <span className="font-medium text-gray-900 dark:text-white">
                {channel.lastMessage.sender === userAddress ? 'You' : 'Someone'}:
              </span>
              <span className="ml-2 text-gray-600 dark:text-gray-400 line-clamp-2">
                {channel.lastMessage.content}
              </span>
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {formatDistanceToNow(channel.lastMessage.timestamp, { addSuffix: true })}
            </div>
          </div>
        )}

        {/* Channel Settings Indicators */}
        <div className="flex items-center gap-2 text-xs text-gray-500">
          {!channel.settings.allowFileSharing && (
            <div className="flex items-center gap-1">
              <VolumeX className="w-3 h-3" />
              <span>No files</span>
            </div>
          )}
          {channel.settings.messageRetentionDays > 0 && (
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              <span>{channel.settings.messageRetentionDays}d retention</span>
            </div>
          )}
          {channel.isArchived && (
            <Badge variant="outline" className="text-xs">
              Archived
            </Badge>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-2 border-t">
          <div className="flex items-center gap-2">
            {channel.channelType !== ChannelType.Direct && (
              <Link href={`/channels/${channel.address}`}>
                <Button variant="outline" size="sm" className="flex items-center gap-1">
                  <MessageCircle className="w-4 h-4" />
                  View
                </Button>
              </Link>
            )}

            {onViewDetails && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onViewDetails(channel)}
                className="flex items-center gap-1"
              >
                <Settings className="w-4 h-4" />
                Details
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {canJoin && (
              <Button
                size="sm"
                onClick={handleJoin}
                disabled={joinChannel.isPending}
                className="flex items-center gap-1"
              >
                <UserPlus className="w-4 h-4" />
                {joinChannel.isPending ? 'Joining...' : 'Join'}
              </Button>
            )}

            {canLeave && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleLeave}
                disabled={leaveChannel.isPending}
                className="flex items-center gap-1 text-red-600 border-red-300 hover:bg-red-50"
              >
                <UserPlus className="w-4 h-4" />
                {leaveChannel.isPending ? 'Leaving...' : 'Leave'}
              </Button>
            )}

            {isOwner && onEditChannel && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onEditChannel(channel)}
                className="flex items-center gap-1"
              >
                <Settings className="w-4 h-4" />
                Edit
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
