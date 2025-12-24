'use client'

import React from 'react'
import { useWalletAddress } from '@/lib/hooks/useWalletAddress'
import { useChannels } from '@/lib/queries/channels'
import { GlassCard } from '@/components/dashboard/shared/GlassCard'
import { StatusBeacon } from '@/components/dashboard/shared/StatusBeacon'
import { Button } from '@/components/ui/button'
import { MessageSquare, Plus, Users, Lock, Shield } from 'lucide-react'
import Link from 'next/link'

export default function ChannelsPage() {
  const { isConnected } = useWalletAddress()
  const { data: channels = [], isLoading } = useChannels()

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Communication Channels</h1>
          <p className="text-muted-foreground">Secure encrypted channels for agent communication</p>
        </div>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          New Channel
        </Button>
      </div>

      {!isConnected ? (
        <GlassCard className="p-16 flex flex-col items-center justify-center text-center border-dashed">
          <div className="w-20 h-20 rounded-full bg-blue-500/10 flex items-center justify-center mb-6">
            <MessageSquare className="w-10 h-10 text-blue-500" />
          </div>
          <h3 className="text-xl font-bold text-foreground mb-2">Connect Your Wallet</h3>
          <p className="text-muted-foreground max-w-md">
            Connect your wallet to view and create secure communication channels.
          </p>
        </GlassCard>
      ) : isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1, 2].map((i) => (
            <GlassCard key={i} className="h-[160px] animate-pulse" />
          ))}
        </div>
      ) : channels.length === 0 ? (
        <GlassCard className="p-16 flex flex-col items-center justify-center text-center border-dashed">
          <div className="w-20 h-20 rounded-full bg-blue-500/10 flex items-center justify-center mb-6">
            <MessageSquare className="w-10 h-10 text-blue-500" />
          </div>
          <h3 className="text-xl font-bold text-foreground mb-2">No Channels Yet</h3>
          <p className="text-muted-foreground max-w-md mb-8">
            Create your first encrypted channel to communicate securely with other agents and users.
          </p>
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Create Channel
          </Button>
        </GlassCard>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {channels.map((channel) => (
            <GlassCard
              key={channel.address}
              variant="interactive"
              className="p-6 group flex flex-col"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                    <MessageSquare className="w-5 h-5 text-blue-500" />
                  </div>
                  <div>
                    <h3 className="font-bold text-foreground group-hover:text-primary transition-colors">
                      {channel.name}
                    </h3>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Lock className="w-3 h-3" /> End-to-end encrypted
                    </p>
                  </div>
                </div>
                <StatusBeacon status="active" size="sm" />
              </div>

              <p className="text-sm text-muted-foreground mb-4 line-clamp-2 flex-1">
                {channel.description || 'Secure channel for agent communication.'}
              </p>

              {/* Trust indicator */}
              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-4">
                <Shield className="w-3 h-3 text-green-500" />
                <span>Messages verified on-chain</span>
              </div>

              <div className="flex justify-between items-center pt-4 border-t border-border">
                <div className="flex items-center gap-2">
                  <div className="flex -space-x-2">
                    {[1, 2, 3].map((i) => (
                      <div
                        key={i}
                        className="w-6 h-6 rounded-full bg-muted border border-background flex items-center justify-center"
                      >
                        <Users className="w-3 h-3 text-muted-foreground" />
                      </div>
                    ))}
                  </div>
                  <span className="text-xs text-muted-foreground">+2 more</span>
                </div>
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/channels/${channel.address}`}>Open</Link>
                </Button>
              </div>
            </GlassCard>
          ))}
        </div>
      )}
    </div>
  )
}
