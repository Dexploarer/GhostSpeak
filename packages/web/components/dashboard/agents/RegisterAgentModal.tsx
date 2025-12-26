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
import { Textarea } from '@/components/ui/textarea'
import { useRegisterAgent } from '@/lib/queries/agents'
import { Bot, Plus, Loader2, CheckCircle2, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'

interface RegisterAgentModalProps {
  children?: React.ReactNode
  onSuccess?: () => void
}

export function RegisterAgentModal({ children, onSuccess }: RegisterAgentModalProps) {
  const [open, setOpen] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    metadataUri: '',
    capabilities: '',
  })

  const registerAgent = useRegisterAgent()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.name.trim()) {
      toast.error('Agent name is required')
      return
    }

    // Generate a unique agent ID
    const agentId = `agent_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`

    // Parse capabilities from comma-separated string
    const capabilities = formData.capabilities
      .split(',')
      .map((c) => c.trim())
      .filter((c) => c.length > 0)

    try {
      await registerAgent.mutateAsync({
        name: formData.name,
        metadataUri: formData.metadataUri || `https://ghostspeak.io/agents/${agentId}`,
        capabilities,
        agentType: 0, // Standard agent
        agentId,
      })

      toast.success('Agent registered successfully!', {
        description: 'Your agent is now live on the network.',
        icon: <CheckCircle2 className="w-4 h-4 text-green-500" />,
      })

      // Reset form and close modal
      setFormData({ name: '', description: '', metadataUri: '', capabilities: '' })
      setOpen(false)
      onSuccess?.()
    } catch (error) {
      console.error('Failed to register agent:', error)
      toast.error('Failed to register agent', {
        description: error instanceof Error ? error.message : 'Please try again',
        icon: <AlertCircle className="w-4 h-4 text-red-500" />,
      })
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Register Agent
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
              <Bot className="w-5 h-5 text-primary" />
            </div>
            <div>
              <DialogTitle className="flex items-center gap-2">
                Register New Agent
                <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-amber-500/10 text-amber-500 border border-amber-500/20">
                  Devnet
                </span>
              </DialogTitle>
              <DialogDescription>
                Create a new AI agent identity on the GhostSpeak network (Demo).
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="name">Agent Name *</Label>
            <Input
              id="name"
              placeholder="e.g., DataAnalyzer Pro"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              disabled={registerAgent.isPending}
              required
            />
            <p className="text-xs text-muted-foreground">
              Choose a memorable name for your agent (max 64 characters)
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Describe what your agent does..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              disabled={registerAgent.isPending}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="capabilities">Capabilities</Label>
            <Input
              id="capabilities"
              placeholder="e.g., data-analysis, coding, translation"
              value={formData.capabilities}
              onChange={(e) => setFormData({ ...formData, capabilities: e.target.value })}
              disabled={registerAgent.isPending}
            />
            <p className="text-xs text-muted-foreground">
              Comma-separated list of what your agent can do
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="metadataUri">Metadata URI (Optional)</Label>
            <Input
              id="metadataUri"
              placeholder="https://..."
              value={formData.metadataUri}
              onChange={(e) => setFormData({ ...formData, metadataUri: e.target.value })}
              disabled={registerAgent.isPending}
            />
            <p className="text-xs text-muted-foreground">
              Link to JSON metadata (auto-generated if empty)
            </p>
          </div>

          <DialogFooter className="pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={registerAgent.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={registerAgent.isPending}>
              {registerAgent.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Registering...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-2" />
                  Register Agent
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
