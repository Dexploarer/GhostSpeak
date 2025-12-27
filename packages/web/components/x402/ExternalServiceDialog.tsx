/**
 * External x402 Service Dialog Component
 *
 * Handles payment and interaction with external x402 services (Heurist, Firecrawl, etc.)
 * Includes chat-like interaction for Human-to-Agent communication
 */

'use client'

import React, { useState } from 'react'
import {
  Loader2,
  CheckCircle2,
  XCircle,
  DollarSign,
  Send,
  ExternalLink,
  Copy,
  Zap,
  MessageSquare,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { X402Resource } from '@/lib/hooks/useX402Resources'
import { formatPrice, getCategoryIcon } from '@/lib/hooks/useX402Resources'

interface ExternalServiceDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  resource: X402Resource
}

interface ChatMessage {
  role: 'user' | 'agent'
  content: string
  timestamp: Date
  cost?: string
}

export function ExternalServiceDialog({
  open,
  onOpenChange,
  resource,
}: ExternalServiceDialogProps): React.JSX.Element {
  const [inputValue, setInputValue] = useState('')
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [copied, setCopied] = useState(false)

  const copyEndpoint = () => {
    navigator.clipboard.writeText(resource.url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isProcessing) return

    const userMessage: ChatMessage = {
      role: 'user',
      content: inputValue,
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInputValue('')
    setIsProcessing(true)

    // Simulate agent response (in production, this would call the actual x402 endpoint)
    setTimeout(() => {
      const agentResponse: ChatMessage = {
        role: 'agent',
        content: `This is a demo response from ${resource.name}. In production, this would call the x402 endpoint at ${resource.url} with your message and process a ${formatPrice(resource.priceUsd)} USDC payment on ${resource.network}.`,
        timestamp: new Date(),
        cost: resource.priceUsd,
      }
      setMessages((prev) => [...prev, agentResponse])
      setIsProcessing(false)
    }, 1500)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="text-xl">{getCategoryIcon(resource.category ?? 'other')}</span>
            {resource.name}
          </DialogTitle>
          <DialogDescription>{resource.description}</DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="interact" className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="interact" className="gap-2">
              <MessageSquare className="w-4 h-4" />
              Try Service
            </TabsTrigger>
            <TabsTrigger value="details" className="gap-2">
              <Zap className="w-4 h-4" />
              API Details
            </TabsTrigger>
          </TabsList>

          {/* Interactive Chat Tab */}
          <TabsContent value="interact" className="flex-1 flex flex-col overflow-hidden space-y-4">
            {/* Service Info */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-zinc-900/50 border border-white/10">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30">
                  {resource.network}
                </Badge>
                <Badge variant="outline" className="bg-lime-500/10 text-lime-400 border-lime-500/30">
                  {formatPrice(resource.priceUsd)} / call
                </Badge>
              </div>
              <Badge variant="outline" className="bg-blue-500/10 text-blue-400 border-blue-500/30">
                {resource.facilitatorId}
              </Badge>
            </div>

            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto space-y-3 min-h-[200px] max-h-[300px] p-3 rounded-lg bg-black/20 border border-white/5">
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center text-zinc-500">
                  <MessageSquare className="w-12 h-12 mb-3 opacity-50" />
                  <p className="text-sm">Send a message to interact with this agent</p>
                  <p className="text-xs mt-1 text-zinc-600">
                    Each response costs {formatPrice(resource.priceUsd)} USDC
                  </p>
                </div>
              ) : (
                messages.map((msg, i) => (
                  <div
                    key={i}
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[80%] p-3 rounded-xl text-sm ${
                        msg.role === 'user'
                          ? 'bg-lime-500/20 text-lime-100 border border-lime-500/30'
                          : 'bg-zinc-800 text-zinc-200 border border-white/10'
                      }`}
                    >
                      <p>{msg.content}</p>
                      <div className="flex items-center justify-between mt-2 text-xs opacity-60">
                        <span>{msg.timestamp.toLocaleTimeString()}</span>
                        {msg.cost && (
                          <span className="text-lime-400">-${msg.cost}</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
              {isProcessing && (
                <div className="flex justify-start">
                  <div className="bg-zinc-800 border border-white/10 p-3 rounded-xl">
                    <Loader2 className="w-4 h-4 animate-spin text-lime-400" />
                  </div>
                </div>
              )}
            </div>

            {/* Input */}
            <div className="flex gap-2">
              <Input
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Type your message..."
                className="flex-1 bg-zinc-900/50 border-white/10"
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                disabled={isProcessing}
              />
              <Button
                onClick={handleSendMessage}
                disabled={!inputValue.trim() || isProcessing}
                className="gap-2 bg-lime-500 text-black hover:bg-lime-400"
              >
                <Send className="w-4 h-4" />
                Send
              </Button>
            </div>

            <p className="text-xs text-zinc-500 text-center">
              Demo mode - In production, this will process real x402 payments
            </p>
          </TabsContent>

          {/* API Details Tab */}
          <TabsContent value="details" className="space-y-4">
            <div className="space-y-4">
              {/* Endpoint */}
              <div className="space-y-2">
                <Label>API Endpoint</Label>
                <div className="flex gap-2">
                  <Input
                    value={resource.url}
                    readOnly
                    className="flex-1 font-mono text-xs bg-zinc-900/50 border-white/10"
                  />
                  <Button variant="outline" size="icon" onClick={copyEndpoint}>
                    {copied ? (
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>

              {/* Details Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-zinc-900/50 border border-white/10">
                  <p className="text-xs text-zinc-500 mb-1">Network</p>
                  <p className="font-medium">{resource.network}</p>
                </div>
                <div className="p-3 rounded-lg bg-zinc-900/50 border border-white/10">
                  <p className="text-xs text-zinc-500 mb-1">Price</p>
                  <p className="font-medium">{formatPrice(resource.priceUsd)} USDC</p>
                </div>
                <div className="p-3 rounded-lg bg-zinc-900/50 border border-white/10">
                  <p className="text-xs text-zinc-500 mb-1">Facilitator</p>
                  <p className="font-medium capitalize">{resource.facilitatorId}</p>
                </div>
                <div className="p-3 rounded-lg bg-zinc-900/50 border border-white/10">
                  <p className="text-xs text-zinc-500 mb-1">Category</p>
                  <p className="font-medium capitalize">{resource.category?.replace('-', ' ')}</p>
                </div>
              </div>

              {/* Tags */}
              <div className="space-y-2">
                <Label>Tags</Label>
                <div className="flex flex-wrap gap-1.5">
                  {resource.tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* External Link */}
              <Button variant="outline" className="w-full gap-2" asChild>
                <a href={resource.url} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="w-4 h-4" />
                  Open API Endpoint
                </a>
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
