'use client'

import React, { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAgents } from '@/lib/queries/agents'
import { useCreateEscrow } from '@/lib/queries/escrow'
import { Shield, Plus, Loader2, CheckCircle2, AlertCircle, Search } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface CreateEscrowModalProps {
  children?: React.ReactNode
  defaultAgent?: string
  onSuccess?: () => void
}

export function CreateEscrowModal({ children, defaultAgent, onSuccess }: CreateEscrowModalProps) {
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState<'agent' | 'details'>('agent')
  const [searchQuery, setSearchQuery] = useState('')
  const [formData, setFormData] = useState({
    agent: defaultAgent || '',
    amount: '',
    taskDescription: '',
    expiryDays: '7',
  })

  const { data: agents = [], isLoading: isLoadingAgents } = useAgents()
  const createEscrow = useCreateEscrow()

  // Filter agents based on search
  const filteredAgents = agents.filter(
    (agent) =>
      agent.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      agent.address.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const selectedAgent = agents.find((a) => a.address === formData.agent)

  const handleSelectAgent = (agentAddress: string) => {
    setFormData({ ...formData, agent: agentAddress })
    setStep('details')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.agent) {
      toast.error('Please select an agent')
      return
    }

    const amountNum = parseFloat(formData.amount)
    if (isNaN(amountNum) || amountNum <= 0) {
      toast.error('Please enter a valid amount')
      return
    }

    // Convert to lamports/smallest unit (assuming 6 decimals for USDC)
    const amountInSmallestUnit = BigInt(Math.floor(amountNum * 1_000_000))

    // Calculate expiry date
    const expiryDays = parseInt(formData.expiryDays) || 7
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + expiryDays)

    try {
      await createEscrow.mutateAsync({
        agent: formData.agent,
        client: '', // Will be set from connected wallet in the mutation
        amount: amountInSmallestUnit,
        taskId: formData.taskDescription || `escrow_${Date.now()}`,
        paymentToken: 'So11111111111111111111111111111111111111112', // Native SOL
        expiresAt,
      })

      toast.success('Escrow created successfully!', {
        description: `${amountNum} USDC locked for ${selectedAgent?.name || 'agent'}`,
        icon: <CheckCircle2 className="w-4 h-4 text-green-500" />,
      })

      // Reset form and close modal
      setFormData({ agent: '', amount: '', taskDescription: '', expiryDays: '7' })
      setStep('agent')
      setOpen(false)
      onSuccess?.()
    } catch (error) {
      console.error('Failed to create escrow:', error)
      toast.error('Failed to create escrow', {
        description: error instanceof Error ? error.message : 'Please try again',
        icon: <AlertCircle className="w-4 h-4 text-red-500" />,
      })
    }
  }

  const handleBack = () => {
    setStep('agent')
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Create Escrow
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center">
              <Shield className="w-5 h-5 text-green-500" />
            </div>
            <div>
              <DialogTitle>Create Escrow Payment</DialogTitle>
              <DialogDescription>Lock funds securely for an agent service</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {step === 'agent' ? (
          <div className="space-y-4 mt-4">
            {/* Agent Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search agents..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Agent List */}
            <div className="max-h-[300px] overflow-y-auto space-y-2">
              {isLoadingAgents ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : filteredAgents.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  {searchQuery ? 'No agents found matching your search' : 'No agents available'}
                </div>
              ) : (
                filteredAgents.map((agent) => (
                  <button
                    key={agent.address}
                    type="button"
                    onClick={() => handleSelectAgent(agent.address)}
                    className={cn(
                      'w-full p-3 rounded-xl border text-left transition-all',
                      'hover:border-primary/50 hover:bg-primary/5',
                      formData.agent === agent.address && 'border-primary bg-primary/10'
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                        <span className="text-lg">🤖</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{agent.name}</p>
                        <p className="text-xs text-muted-foreground font-mono">
                          {agent.address.slice(0, 8)}...{agent.address.slice(-6)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">{agent.reputation.score}/100</p>
                        <p className="text-xs text-muted-foreground">reputation</p>
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 mt-4">
            {/* Selected Agent */}
            {selectedAgent && (
              <div className="p-3 rounded-xl bg-muted/50 border">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                    <span className="text-lg">🤖</span>
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{selectedAgent.name}</p>
                    <p className="text-xs text-muted-foreground font-mono">
                      {selectedAgent.address.slice(0, 12)}...
                    </p>
                  </div>
                  <Button type="button" variant="ghost" size="sm" onClick={handleBack}>
                    Change
                  </Button>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="amount">Amount (USDC) *</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0.01"
                placeholder="100.00"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                disabled={createEscrow.isPending}
                required
              />
              <p className="text-xs text-muted-foreground">
                This amount will be locked in escrow until work is complete
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="taskDescription">Task Description *</Label>
              <Input
                id="taskDescription"
                placeholder="e.g., Analyze quarterly sales data"
                value={formData.taskDescription}
                onChange={(e) => setFormData({ ...formData, taskDescription: e.target.value })}
                disabled={createEscrow.isPending}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="expiryDays">Escrow Duration</Label>
              <select
                id="expiryDays"
                value={formData.expiryDays}
                onChange={(e) => setFormData({ ...formData, expiryDays: e.target.value })}
                disabled={createEscrow.isPending}
                className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
              >
                <option value="1">1 day</option>
                <option value="3">3 days</option>
                <option value="7">7 days</option>
                <option value="14">14 days</option>
                <option value="30">30 days</option>
              </select>
              <p className="text-xs text-muted-foreground">
                Funds will be automatically refundable after this period
              </p>
            </div>

            <DialogFooter className="pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={handleBack}
                disabled={createEscrow.isPending}
              >
                Back
              </Button>
              <Button type="submit" disabled={createEscrow.isPending}>
                {createEscrow.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Shield className="w-4 h-4 mr-2" />
                    Create Escrow
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
