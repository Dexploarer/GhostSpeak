'use client'

import React, { useState } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import { Plus, Bot, Search, Filter } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { AgentCard } from '@/components/agents/AgentCard'
import { RegisterAgentForm } from '@/components/agents/RegisterAgentForm'
import { useAgents, type Agent } from '@/lib/queries/agents'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'

export default function AgentsPage(): React.JSX.Element {
  const { publicKey } = useWallet()
  const [searchTerm, setSearchTerm] = useState('')
  const [showRegisterForm, setShowRegisterForm] = useState(false)

  const { data: agents = [], isLoading, error } = useAgents()

  const filteredAgents = agents.filter(
    (agent: Agent) =>
      agent.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      agent.capabilities.some((cap: string) => cap.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold gradient-text">AI Agents</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">Manage and monitor your AI agents</p>
        </div>
        <Dialog open={showRegisterForm} onOpenChange={setShowRegisterForm}>
          <DialogTrigger asChild>
            <Button variant="gradient" disabled={!publicKey} className="gap-2">
              <Plus className="w-5 h-5" />
              Register Agent
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Register New Agent</DialogTitle>
            </DialogHeader>
            <RegisterAgentForm onSuccess={() => setShowRegisterForm(false)} />
          </DialogContent>
        </Dialog>
      </div>

      {/* Search and Filter */}
      <div className="glass rounded-xl p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <Input
              type="text"
              placeholder="Search agents by name or capability..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button variant="outline" className="gap-2">
            <Filter className="w-5 h-5" />
            Filters
          </Button>
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-2 text-gray-600 dark:text-gray-400">Loading agents...</p>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="glass rounded-xl p-12 text-center">
          <p className="text-red-500">Failed to load agents. Please try again.</p>
        </div>
      )}

      {/* Agents Grid */}
      {publicKey ? (
        !isLoading &&
        !error &&
        (filteredAgents.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredAgents.map((agent: Agent) => (
              <AgentCard key={agent.address} agent={agent} />
            ))}
          </div>
        ) : (
          <div className="glass rounded-xl p-12 text-center">
            <Bot className="w-16 h-16 mx-auto text-gray-400 mb-4" />
            <h3 className="text-xl font-semibold mb-2">
              {agents.length === 0 ? 'No Agents Yet' : 'No Matching Agents'}
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              {agents.length === 0
                ? 'Get started by registering your first AI agent'
                : 'Try adjusting your search terms'}
            </p>
            {agents.length === 0 && (
              <Button variant="gradient" onClick={() => setShowRegisterForm(true)}>
                Register Your First Agent
              </Button>
            )}
          </div>
        ))
      ) : (
        <div className="glass rounded-xl p-12 text-center">
          <p className="text-gray-600 dark:text-gray-400">
            Connect your wallet to view and manage agents
          </p>
        </div>
      )}
    </div>
  )
}
