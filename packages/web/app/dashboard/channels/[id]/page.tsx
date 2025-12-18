'use client'

import React, { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useWallet } from '@solana/wallet-adapter-react'
import {
  MessageSquare,
  ArrowLeft,
  Send,
  Users,
  Settings,
  RefreshCw,
  Lock,
  Hash,
  Paperclip,
  Smile,
  MoreVertical,
  LogOut,
  Clock
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DashboardCard } from '@/components/dashboard/shared/DashboardCard'
import { EmptyState } from '@/components/dashboard/shared/EmptyState'
import { FormField, FormTextarea } from '@/components/ui/form-field'
import { useFormValidation } from '@/lib/hooks/useFormValidation'
import { sendMessageSchema } from '@/lib/schemas/channel'
import { 
  useChannel, 
  useChannelMessages, 
  useChannelMembers,
  useSendMessage,
  useLeaveChannel,
  type Message 
} from '@/lib/queries/channels'
import { cn } from '@/lib/utils'

export default function ChannelDetailPage() {
  const params = useParams()
  const channelId = params.id as string
  const { publicKey, connected } = useWallet()
  const messagesEndRef = useRef<HTMLDivElement>(null)
  
  const [message, setMessage] = useState('')
  const [showMembers, setShowMembers] = useState(false)

  // Queries
  const { data: channel, isLoading: channelLoading } = useChannel(channelId)
  const { data: messages, isLoading: messagesLoading, refetch: refetchMessages } = useChannelMessages(channelId)
  const { data: members, isLoading: membersLoading } = useChannelMembers(channelId)

  // Mutations
  const sendMutation = useSendMessage()
  const leaveMutation = useLeaveChannel()

  // Validation
  const { validate, getFieldError, clearErrors } = useFormValidation(sendMessageSchema)

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Handle send message
  const handleSend = () => {
    if (!message.trim()) return
    
    if (!validate({ content: message })) return

    sendMutation.mutate({
      channelAddress: channelId,
      content: message.trim()
    }, {
      onSuccess: () => {
        setMessage('')
        clearErrors()
      }
    })
  }

  // Handle key press
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  // Format timestamp
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit' 
    })
  }

  const formatDate = (date: Date) => {
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    if (date.toDateString() === today.toDateString()) {
      return 'Today'
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday'
    }
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined
    })
  }

  // Group messages by date
  const groupedMessages = messages?.reduce((groups, msg) => {
    const date = formatDate(msg.timestamp)
    if (!groups[date]) {
      groups[date] = []
    }
    groups[date].push(msg)
    return groups
  }, {} as Record<string, Message[]>) ?? {}

  // Not connected state
  if (!connected) {
    return (
      <div className="space-y-6">
        <Link href="/dashboard/channels" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Back to Channels
        </Link>
        
        <EmptyState
          icon={MessageSquare}
          title="Connect Your Wallet"
          description="Connect your wallet to view and participate in this channel."
        />
      </div>
    )
  }

  // Loading state
  if (channelLoading) {
    return (
      <div className="space-y-6">
        <Link href="/dashboard/channels" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Back to Channels
        </Link>
        
        <div className="rounded-2xl bg-card/50 border border-border p-8 animate-pulse">
          <div className="h-6 bg-muted rounded w-1/4 mb-2" />
          <div className="h-4 bg-muted rounded w-1/2" />
        </div>
      </div>
    )
  }

  // Channel not found
  if (!channel) {
    return (
      <div className="space-y-6">
        <Link href="/dashboard/channels" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Back to Channels
        </Link>
        
        <EmptyState
          icon={MessageSquare}
          title="Channel Not Found"
          description="This channel may have been deleted or you don't have access."
          actionLabel="Browse Channels"
          onAction={() => window.location.href = '/dashboard/channels'}
        />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-[calc(100vh-180px)]">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 mb-4">
        <div className="flex items-center gap-4">
          <Link 
            href="/dashboard/channels" 
            className="p-2 rounded-xl hover:bg-muted transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-muted-foreground" />
          </Link>
          
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
              <h1 className="text-lg font-black text-foreground">
                {channel.name.length > 30 
                  ? `${channel.name.slice(0, 12)}...${channel.name.slice(-6)}`
                  : channel.name
                }
              </h1>
              <p className="text-xs text-muted-foreground">
                {channel.memberCount} members
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetchMessages()}
            disabled={messagesLoading}
            className="border-border"
          >
            <RefreshCw className={cn('w-4 h-4', messagesLoading && 'animate-spin')} />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowMembers(!showMembers)}
            className={cn('border-border', showMembers && 'bg-primary/10 border-primary/20')}
          >
            <Users className="w-4 h-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => leaveMutation.mutate(channelId)}
            disabled={leaveMutation.isPending}
            className="border-border text-red-500 hover:bg-red-500/10"
          >
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex gap-4 flex-1 min-h-0">
        {/* Messages */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Messages container */}
          <DashboardCard className="flex-1 flex flex-col min-h-0" noPadding>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messagesLoading ? (
                <div className="flex items-center justify-center h-full">
                  <RefreshCw className="w-6 h-6 text-muted-foreground animate-spin" />
                </div>
              ) : messages?.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                    <MessageSquare className="w-8 h-8 text-primary" />
                  </div>
                  <h3 className="text-lg font-bold text-foreground mb-2">No messages yet</h3>
                  <p className="text-sm text-muted-foreground max-w-sm">
                    Be the first to send a message in this channel.
                  </p>
                </div>
              ) : (
                Object.entries(groupedMessages).map(([date, msgs]) => (
                  <div key={date}>
                    {/* Date separator */}
                    <div className="flex items-center gap-4 my-4">
                      <div className="flex-1 h-px bg-border" />
                      <span className="text-xs text-muted-foreground font-medium px-2">
                        {date}
                      </span>
                      <div className="flex-1 h-px bg-border" />
                    </div>

                    {/* Messages */}
                    <div className="space-y-3">
                      {msgs.map((msg) => (
                        <div 
                          key={msg.id} 
                          className={cn(
                            'flex gap-3 group',
                            msg.sender === publicKey?.toBase58() && 'flex-row-reverse'
                          )}
                        >
                          {/* Avatar */}
                          <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                            <span className="text-xs font-bold text-muted-foreground">
                              {msg.sender.slice(0, 2).toUpperCase()}
                            </span>
                          </div>

                          {/* Message */}
                          <div className={cn(
                            'max-w-[70%] rounded-2xl px-4 py-2',
                            msg.sender === publicKey?.toBase58()
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted'
                          )}>
                            {msg.sender !== publicKey?.toBase58() && (
                              <p className="text-xs font-bold mb-1 opacity-70">
                                {msg.sender.slice(0, 4)}...{msg.sender.slice(-4)}
                              </p>
                            )}
                            <p className="text-sm whitespace-pre-wrap wrap-break-word">
                              {msg.content}
                            </p>
                            <p className={cn(
                              'text-[10px] mt-1 flex items-center gap-1',
                              msg.sender === publicKey?.toBase58() 
                                ? 'opacity-70' 
                                : 'text-muted-foreground'
                            )}>
                              <Clock className="w-3 h-3" />
                              {formatTime(msg.timestamp)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Message input */}
            <div className="p-4 border-t border-border">
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyDown={handleKeyPress}
                    placeholder="Type a message..."
                    rows={1}
                    className={cn(
                      'w-full px-4 py-3 rounded-xl bg-muted/50 border border-border',
                      'text-foreground placeholder:text-muted-foreground',
                      'focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50',
                      'resize-none min-h-[48px] max-h-[120px]',
                      getFieldError('content') && 'border-red-500'
                    )}
                    style={{ height: 'auto' }}
                  />
                </div>
                <Button
                  onClick={handleSend}
                  disabled={!message.trim() || sendMutation.isPending}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold h-12 w-12 p-0"
                >
                  <Send className="w-5 h-5" />
                </Button>
              </div>
              {getFieldError('content') && (
                <p className="text-xs text-red-500 mt-1">{getFieldError('content')}</p>
              )}
            </div>
          </DashboardCard>
        </div>

        {/* Members sidebar */}
        {showMembers && (
          <div className="w-64 shrink-0">
            <DashboardCard 
              title="Members" 
              icon={Users}
              className="h-full"
            >
              {membersLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-3 animate-pulse">
                      <div className="w-8 h-8 rounded-full bg-muted" />
                      <div className="h-4 bg-muted rounded w-24" />
                    </div>
                  ))}
                </div>
              ) : members?.length === 0 ? (
                <p className="text-sm text-muted-foreground">No members found</p>
              ) : (
                <div className="space-y-2">
                  {members?.map((member) => (
                    <div
                      key={member.address}
                      className="flex items-center gap-3 p-2 rounded-xl hover:bg-muted/50 transition-colors"
                    >
                      <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                        <span className="text-xs font-bold text-muted-foreground">
                          {member.address.slice(0, 2).toUpperCase()}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {member.address.slice(0, 4)}...{member.address.slice(-4)}
                        </p>
                        <p className="text-xs text-muted-foreground capitalize">
                          {member.role}
                        </p>
                      </div>
                      {member.isOnline && (
                        <div className="w-2 h-2 rounded-full bg-green-500" />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </DashboardCard>
          </div>
        )}
      </div>
    </div>
  )
}
