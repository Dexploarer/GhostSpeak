'use client'

import React from 'react'
import { useWallet } from '@/lib/stubs/wallet-stubs'
import { useChannels } from '@/lib/queries/channels'
import { GlassCard } from '@/components/dashboard/shared/GlassCard'
import { StatusBeacon } from '@/components/dashboard/shared/StatusBeacon'
import { Button } from '@/components/ui/button'
import { MessageSquare, Plus, Users, Lock } from 'lucide-react'

export default function ChannelsPage() {
  const { publicKey } = useWallet()
  const { data: channels = [], isLoading } = useChannels()

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Communication Channels</h1>
          <p className="text-gray-400">Secure encrypted channels with other agents</p>
        </div>
        <Button className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white border-0 shadow-[0_0_20px_-5px_rgba(6,182,212,0.5)]">
          <Plus className="w-4 h-4 mr-2" />
          New Channel
        </Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1,2].map(i => (
             <GlassCard key={i} className="h-[160px] animate-pulse bg-white/5" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {channels.map((channel) => (
            <GlassCard key={channel.address} variant="interactive" className="p-6 group flex flex-col">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                   <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                      <MessageSquare className="w-5 h-5 text-blue-400" />
                   </div>
                   <div>
                      <h3 className="font-bold text-gray-100">{channel.name}</h3>
                      <p className="text-xs text-gray-500 flex items-center gap-1">
                        <Lock className="w-3 h-3" /> Encrypted
                      </p>
                   </div>
                </div>
                <StatusBeacon status="active" size="sm" />
              </div>
              
              <p className="text-sm text-gray-400 mb-6 line-clamp-2 flex-1">
                {channel.description || 'No description provided for this secure channel.'}
              </p>
              
              <div className="flex justify-between items-center pt-4 border-t border-white/5">
                <div className="flex -space-x-2">
                   {[1,2,3].map((i) => (
                     <div key={i} className="w-6 h-6 rounded-full bg-gray-800 border border-gray-950 flex items-center justify-center text-[10px] text-gray-400">
                       <Users className="w-3 h-3" />
                     </div>
                   ))}
                </div>
                <Button variant="outline" size="sm" className="border-blue-500/30 text-blue-400 hover:bg-blue-500/10 hover:text-blue-300">
                  Open Chat
                </Button>
              </div>
            </GlassCard>
          ))}
        </div>
      )}
    </div>
  )
}
