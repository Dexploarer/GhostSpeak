'use client'

import React from 'react'
import { useWallet } from '@/lib/stubs/wallet-stubs'
import { useAgents } from '@/lib/queries/agents'
import { GlassCard } from '@/components/dashboard/shared/GlassCard'
import { StatusBeacon } from '@/components/dashboard/shared/StatusBeacon'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Bot, Plus, Search, Filter } from 'lucide-react'

export default function AgentsPage() {
  const { publicKey } = useWallet()
  const { data: agents = [], isLoading } = useAgents()

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">My Agents</h1>
          <p className="text-gray-400">Manage your deployed autonomous agents</p>
        </div>
        <div className="flex gap-3">
           <div className="relative hidden md:block">
             <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
             <input 
               type="text" 
               placeholder="Search agents..." 
               className="pl-9 pr-4 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-gray-200 focus:outline-none focus:border-purple-500/50 focus:bg-white/10 transition-all w-64"
             />
           </div>
           <Button variant="outline" className="bg-white/5 border-white/10 hover:bg-white/10 text-gray-200">
             <Filter className="w-4 h-4 mr-2" />
             Filter
           </Button>
           <Button className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white border-0 shadow-[0_0_20px_-5px_rgba(168,85,247,0.5)]">
             <Plus className="w-4 h-4 mr-2" />
             Register Agent
           </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1,2,3].map(i => (
             <GlassCard key={i} className="h-[200px] animate-pulse bg-white/5" />
          ))}
        </div>
      ) : agents.length === 0 ? (
        <GlassCard className="p-16 flex flex-col items-center justify-center text-center border-dashed border-white/20 bg-transparent">
          <div className="w-20 h-20 rounded-full bg-purple-500/10 flex items-center justify-center mb-6">
            <Bot className="w-10 h-10 text-purple-400" />
          </div>
          <h3 className="text-xl font-bold text-white mb-2">No Agents Deployed</h3>
          <p className="text-gray-400 max-w-md mb-8">
            You haven't registered any AI agents on the network yet. Deploy your first agent to start offering services.
          </p>
          <Button className="bg-purple-600 hover:bg-purple-500 text-white">
            Register Agent
          </Button>
        </GlassCard>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {agents.map((agent) => (
            <GlassCard key={agent.address} variant="interactive" className="p-6 group flex flex-col h-full">
              <div className="flex justify-between items-start mb-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500/20 to-blue-500/20 flex items-center justify-center border border-white/10 group-hover:border-purple-500/30 transition-colors">
                  <Bot className="w-6 h-6 text-purple-300 group-hover:text-white transition-colors" />
                </div>
                <StatusBeacon status={agent.isActive ? 'active' : 'inactive'} />
              </div>
              
              <h3 className="text-lg font-bold text-white mb-1 group-hover:text-purple-300 transition-colors">
                {agent.name}
              </h3>
              <p className="text-xs font-mono text-gray-500 mb-4">
                {agent.address.slice(0, 8)}...{agent.address.slice(-8)}
              </p>
              
              <div className="flex-1">
                <p className="text-sm text-gray-400 mb-2">Capabilities:</p>
                <div className="flex flex-wrap gap-1.5">
                   {(agent.capabilities || []).slice(0, 3).map((cap) => (
                      <Badge key={cap} variant="outline" className="bg-white/5 border-white/10 text-gray-300 hover:bg-white/10">
                        {cap}
                      </Badge>
                   ))}
                   {(agent.capabilities || []).length > 3 && (
                      <Badge variant="outline" className="bg-white/5 border-white/10 text-gray-400">
                        +{(agent.capabilities || []).length - 3}
                      </Badge>
                   )}
                </div>
              </div>
              
              <div className="mt-6 pt-4 border-t border-white/5 flex justify-between items-center">
                 <span className="text-sm text-gray-500">Requests: <span className="text-gray-300">1.2k</span></span>
                 <Button variant="ghost" size="sm" className="text-xs hover:bg-white/10 -mr-2">Manage</Button>
              </div>
            </GlassCard>
          ))}
        </div>
      )}
    </div>
  )
}
