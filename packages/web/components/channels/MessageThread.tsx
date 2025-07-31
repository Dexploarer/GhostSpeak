'use client'

import React from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  MoreHorizontal,
  Reply,
  Edit,
  Trash2,
  Pin,
  Copy,
  ExternalLink,
  Download,
  Smile,
  MessageSquare,
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import { format, isToday, isYesterday } from 'date-fns'
import type { Message } from '@/lib/queries/channels'
import { MessageType } from '@/lib/queries/channels'
import { useAddReaction, useEditMessage, useDeleteMessage } from '@/lib/queries/channels'

interface MessageThreadProps {
  messages: Message[]
  channelAddress: string
  userAddress?: string
  onReply?: (message: Message) => void
  onEditMessage?: (message: Message) => void
  className?: string
}

interface MessageItemProps {
  message: Message
  channelAddress: string
  userAddress?: string
  onReply?: (message: Message) => void
  onEditMessage?: (message: Message) => void
  showAvatar?: boolean
  isGrouped?: boolean
}

function MessageItem({
  message,
  channelAddress,
  userAddress,
  onReply,
  onEditMessage,
  showAvatar = true,
  isGrouped = false,
}: MessageItemProps): React.JSX.Element {
  const addReaction = useAddReaction()
  useEditMessage()
  const deleteMessage = useDeleteMessage()

  const isOwn = message.sender === userAddress
  const isSystem = message.isSystemMessage
  const canEdit = isOwn && !isSystem && message.messageType === MessageType.Text
  const canDelete = isOwn || userAddress === 'admin' // Simple permission check

  const formatMessageTime = (timestamp: Date): string => {
    if (isToday(timestamp)) {
      return format(timestamp, 'HH:mm')
    } else if (isYesterday(timestamp)) {
      return `Yesterday ${format(timestamp, 'HH:mm')}`
    } else {
      return format(timestamp, 'MMM dd, HH:mm')
    }
  }

  const getUserInitials = (sender: string, senderName?: string): string => {
    if (senderName) {
      return senderName
        .split(' ')
        .map((name) => name[0]?.toUpperCase())
        .join('')
        .slice(0, 2)
    }
    return sender.slice(0, 2).toUpperCase()
  }

  const handleReaction = async (emoji: string): Promise<void> => {
    try {
      await addReaction.mutateAsync({
        messageId: message.id,
        channelAddress,
        emoji,
      })
    } catch (error) {
      console.error('Failed to add reaction:', error)
    }
  }

  const handleEdit = (): void => {
    if (onEditMessage) {
      onEditMessage(message)
    }
  }

  const handleDelete = async (): Promise<void> => {
    try {
      await deleteMessage.mutateAsync({
        messageId: message.id,
        channelAddress,
      })
    } catch (error) {
      console.error('Failed to delete message:', error)
    }
  }

  const handleCopy = (): void => {
    navigator.clipboard.writeText(message.content)
  }

  if (isSystem) {
    return (
      <div className="flex justify-center py-2">
        <Badge variant="outline" className="text-xs text-gray-500">
          {message.content}
        </Badge>
      </div>
    )
  }

  return (
    <div
      className={cn(
        'group hover:bg-gray-50 dark:hover:bg-gray-800/50 px-4 py-2 transition-colors',
        isGrouped && 'py-1'
      )}
    >
      <div className="flex items-start gap-3">
        {/* Avatar */}
        {showAvatar && !isGrouped && (
          <Avatar className="w-10 h-10 flex-shrink-0">
            <AvatarImage src={message.senderAvatar} alt={message.senderName} />
            <AvatarFallback className="bg-blue-500 text-white text-sm font-medium">
              {getUserInitials(message.sender, message.senderName)}
            </AvatarFallback>
          </Avatar>
        )}

        {/* Spacer for grouped messages */}
        {isGrouped && <div className="w-10 flex-shrink-0" />}

        {/* Message Content */}
        <div className="flex-1 min-w-0">
          {/* Message Header */}
          {!isGrouped && (
            <div className="flex items-baseline gap-2 mb-1">
              <span className="font-semibold text-gray-900 dark:text-white text-sm">
                {message.senderName || message.sender.slice(0, 8) + '...'}
              </span>
              <span className="text-xs text-gray-500">{formatMessageTime(message.timestamp)}</span>
              {message.isEdited && (
                <Badge variant="outline" className="text-xs">
                  edited
                </Badge>
              )}
            </div>
          )}

          {/* Reply Context */}
          {message.replyTo && (
            <div className="mb-2 pl-3 border-l-2 border-gray-300 dark:border-gray-600">
              <div className="text-xs text-gray-500">
                <Reply className="inline w-3 h-3 mr-1" />
                Replying to message
              </div>
            </div>
          )}

          {/* Message Text */}
          <div className="text-sm text-gray-900 dark:text-white leading-relaxed">
            {message.content}
          </div>

          {/* File Attachments */}
          {message.attachments.length > 0 && (
            <div className="mt-2 space-y-2">
              {message.attachments.map((attachment) => (
                <Card key={attachment.id} className="p-3 bg-gray-50 dark:bg-gray-800">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <ExternalLink className="w-4 h-4 text-gray-500 flex-shrink-0" />
                      <div className="min-w-0">
                        <div className="font-medium text-sm truncate">{attachment.fileName}</div>
                        <div className="text-xs text-gray-500">
                          {(attachment.fileSize / 1024 / 1024).toFixed(2)} MB
                        </div>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" className="flex-shrink-0">
                      <Download className="w-4 h-4" />
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}

          {/* Reactions */}
          {message.reactions.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {message.reactions.map((reaction) => (
                <Button
                  key={reaction.emoji}
                  variant="outline"
                  size="sm"
                  className={cn(
                    'h-7 px-2 text-xs',
                    reaction.users.includes(userAddress || '') && 'bg-blue-100 border-blue-300'
                  )}
                  onClick={() => handleReaction(reaction.emoji)}
                >
                  <span className="mr-1">{reaction.emoji}</span>
                  <span>{reaction.count}</span>
                </Button>
              ))}

              {/* Add Reaction Button */}
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => handleReaction('👍')}
              >
                <Smile className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>

        {/* Message Actions */}
        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 flex-shrink-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleReaction('👍')}
            className="h-8 w-8 p-0"
          >
            <Smile className="w-4 h-4" />
          </Button>

          {onReply && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onReply(message)}
              className="h-8 w-8 p-0"
            >
              <Reply className="w-4 h-4" />
            </Button>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleCopy}>
                <Copy className="w-4 h-4 mr-2" />
                Copy Message
              </DropdownMenuItem>

              {canEdit && (
                <DropdownMenuItem onClick={handleEdit}>
                  <Edit className="w-4 h-4 mr-2" />
                  Edit Message
                </DropdownMenuItem>
              )}

              <DropdownMenuItem>
                <Pin className="w-4 h-4 mr-2" />
                Pin Message
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              {canDelete && (
                <DropdownMenuItem onClick={handleDelete} className="text-red-600">
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Message
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  )
}

export function MessageThread({
  messages,
  channelAddress,
  userAddress,
  onReply,
  onEditMessage,
  className,
}: MessageThreadProps): React.JSX.Element {
  const scrollRef = React.useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom on new messages
  React.useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  // Group messages by sender and time proximity
  const groupedMessages = React.useMemo(() => {
    const groups: Array<{ messages: Message[]; sender: string; timestamp: Date }> = []

    messages.forEach((message) => {
      const lastGroup = groups[groups.length - 1]
      const timeDiff = lastGroup
        ? message.timestamp.getTime() - lastGroup.timestamp.getTime()
        : Number.MAX_SAFE_INTEGER

      // Group messages from same sender within 5 minutes
      if (
        lastGroup &&
        lastGroup.sender === message.sender &&
        timeDiff < 5 * 60 * 1000 && // 5 minutes
        !message.isSystemMessage
      ) {
        lastGroup.messages.push(message)
      } else {
        groups.push({
          messages: [message],
          sender: message.sender,
          timestamp: message.timestamp,
        })
      }
    })

    return groups
  }, [messages])

  if (messages.length === 0) {
    return (
      <div className={cn('flex items-center justify-center py-12 text-gray-500', className)}>
        <div className="text-center">
          <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>No messages yet. Start the conversation!</p>
        </div>
      </div>
    )
  }

  // Show date separators
  const showDateSeparator = (currentMessage: Message, previousMessage?: Message): boolean => {
    if (!previousMessage) return true

    const currentDate = new Date(currentMessage.timestamp).toDateString()
    const previousDate = new Date(previousMessage.timestamp).toDateString()

    return currentDate !== previousDate
  }

  return (
    <div
      ref={scrollRef}
      className={cn(
        'flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600',
        className
      )}
    >
      <div className="space-y-0">
        {groupedMessages.map((group, groupIndex) => {
          const previousGroup = groupedMessages[groupIndex - 1]
          const showDate = showDateSeparator(
            group.messages[0],
            previousGroup?.messages[previousGroup.messages.length - 1]
          )

          return (
            <React.Fragment key={group.messages[0].id}>
              {/* Date Separator */}
              {showDate && (
                <div className="flex items-center justify-center py-4">
                  <div className="px-3 py-1 bg-gray-100 dark:bg-gray-800 rounded-full text-xs text-gray-600 dark:text-gray-400">
                    {format(group.timestamp, 'EEEE, MMMM d, yyyy')}
                  </div>
                </div>
              )}

              {/* Message Group */}
              <div>
                {group.messages.map((message, messageIndex) => (
                  <MessageItem
                    key={message.id}
                    message={message}
                    channelAddress={channelAddress}
                    userAddress={userAddress}
                    onReply={onReply}
                    onEditMessage={onEditMessage}
                    showAvatar={messageIndex === 0}
                    isGrouped={messageIndex > 0}
                  />
                ))}
              </div>
            </React.Fragment>
          )
        })}
      </div>
    </div>
  )
}
