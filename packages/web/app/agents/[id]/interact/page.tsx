'use client'

import React, { useState, useRef, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import {
  Bot,
  ArrowLeft,
  Send,
  Loader2,
  Zap,
  AlertCircle,
  CheckCircle,
  DollarSign,
  Clock,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useAgent } from '@/lib/queries/agents'
import { formatAddress } from '@/lib/utils'
import { useWalletAddress } from '@/lib/hooks/useWalletAddress'

interface Message {
  id: string
  role: 'user' | 'agent' | 'system'
  content: string
  timestamp: Date
  status?: 'pending' | 'paid' | 'completed' | 'error'
  paymentSignature?: string
}

export default function AgentInteractPage(): React.JSX.Element {
  const params = useParams()
  const agentId = params.id as string
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const { address: walletAddress } = useWalletAddress()
  const { data: agent, isLoading, error } = useAgent(agentId)

  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Add initial system message when agent loads
  useEffect(() => {
    if (agent && messages.length === 0) {
      setMessages([
        {
          id: 'welcome',
          role: 'system',
          content: `Connected to ${agent.name}. ${
            agent.x402?.enabled
              ? `Each request costs ${(Number(agent.x402.pricePerCall) / 1_000_000).toFixed(4)} USDC via x402 payment.`
              : 'This agent does not have x402 payments enabled.'
          }`,
          timestamp: new Date(),
        },
      ])
    }
  }, [agent, messages.length])

  /*
   * Payment Logic Placeholder
   * In the production version, this would use the PayAI SDK to facilitate
   * the payment and then send the proof to the agent.
   * For now, we simulate the interaction.
   */
  const handleSendMessage = async () => {
    if (!input.trim() || isProcessing || !agent) return

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInput('')
    setIsProcessing(true)

    // Create pending agent response
    const agentMessageId = `agent-${Date.now()}`
    setMessages((prev) => [
      ...prev,
      {
        id: agentMessageId,
        role: 'agent',
        content: '',
        timestamp: new Date(),
        status: 'pending',
      },
    ])

    try {
      // Simulate PayAI processing delay
      await new Promise((resolve) => setTimeout(resolve, 1500))

      // Mock response
      const responseContent = 'I received your message. (PayAI integration pending)'

      setMessages((prev) =>
        prev.map((m) =>
          m.id === agentMessageId
            ? {
                ...m,
                content: responseContent,
                status: 'completed',
              }
            : m
        )
      )
    } catch (err) {
      console.error('Error calling agent:', err)
      setMessages((prev) =>
        prev.map((m) =>
          m.id === agentMessageId
            ? {
                ...m,
                content: `Error: ${err instanceof Error ? err.message : 'Failed to process request'}`,
                status: 'error',
              }
            : m
        )
      )
    } finally {
      setIsProcessing(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-linear-to-br from-purple-50 via-white to-blue-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600" />
      </div>
    )
  }

  if (error || !agent) {
    return (
      <div className="min-h-screen bg-linear-to-br from-purple-50 via-white to-blue-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-900">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <Card className="p-12 text-center">
            <AlertCircle className="w-16 h-16 mx-auto text-red-500 mb-4" />
            <h2 className="text-2xl font-bold mb-2">Agent Not Found</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">Unable to load agent details.</p>
            <Link href="/agents">
              <Button variant="outline">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Agents
              </Button>
            </Link>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-purple-50 via-white to-blue-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-900 flex flex-col">
      {/* Header */}
      <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border-b border-gray-200 dark:border-gray-800 px-4 py-4 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href={`/agents/${agentId}`}
              className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-linear-to-br from-cyan-500 to-purple-600 flex items-center justify-center">
                <Bot className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="font-semibold">{agent.name}</h1>
                <p className="text-xs text-gray-500">{formatAddress(agent.address)}</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {agent.x402?.enabled && (
              <Badge variant="outline" className="border-green-500 text-green-600">
                <Zap className="w-3 h-3 mr-1" />
                {(Number(agent.x402.pricePerCall) / 1_000_000).toFixed(4)} USDC / call
              </Badge>
            )}
            <Badge variant={agent.isActive ? 'success' : 'secondary'}>
              {agent.isActive ? 'Online' : 'Offline'}
            </Badge>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="max-w-4xl mx-auto space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-2xl p-4 ${
                  message.role === 'user'
                    ? 'bg-purple-600 text-white'
                    : message.role === 'system'
                      ? 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 text-sm'
                      : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700'
                }`}
              >
                {message.role === 'agent' && message.status === 'pending' && (
                  <div className="flex items-center gap-2 text-gray-500">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Processing...</span>
                  </div>
                )}

                {message.role === 'agent' && message.status !== 'pending' && (
                  <>
                    <p className="whitespace-pre-wrap">{message.content}</p>
                    {message.status === 'completed' && message.paymentSignature && (
                      <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700 flex items-center gap-2 text-xs text-green-600">
                        <CheckCircle className="w-3 h-3" />
                        <span>Payment verified</span>
                      </div>
                    )}
                    {message.status === 'error' && (
                      <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700 flex items-center gap-2 text-xs text-red-500">
                        <AlertCircle className="w-3 h-3" />
                        <span>Request failed</span>
                      </div>
                    )}
                  </>
                )}

                {message.role !== 'agent' && (
                  <p className="whitespace-pre-wrap">{message.content}</p>
                )}

                <div
                  className={`text-xs mt-2 ${
                    message.role === 'user' ? 'text-purple-200' : 'text-gray-400'
                  }`}
                >
                  <Clock className="w-3 h-3 inline mr-1" />
                  {message.timestamp.toLocaleTimeString()}
                </div>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area */}
      <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border-t border-gray-200 dark:border-gray-800 px-4 py-4">
        <div className="max-w-4xl mx-auto">
          {!walletAddress ? (
            <div className="text-center py-4">
              <p className="text-gray-600 dark:text-gray-400 mb-2">
                Connect your wallet to interact with this agent
              </p>
            </div>
          ) : (
            <div className="flex gap-3">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                placeholder="Ask the agent anything..."
                className="flex-1 px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-purple-500"
                disabled={isProcessing || !agent.isActive}
              />
              <Button
                variant="gradient"
                size="lg"
                onClick={handleSendMessage}
                disabled={!input.trim() || isProcessing || !agent.isActive}
              >
                {isProcessing ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <Send className="w-5 h-5 mr-2" />
                    {agent.x402?.enabled && (
                      <span className="text-xs">
                        ({(Number(agent.x402.pricePerCall) / 1_000_000).toFixed(2)} USDC)
                      </span>
                    )}
                  </>
                )}
              </Button>
            </div>
          )}

          {agent.x402?.enabled && walletAddress && (
            <p className="text-xs text-center text-gray-500 mt-2 flex items-center justify-center gap-1">
              <DollarSign className="w-3 h-3" />
              Each message requires an x402 payment to the agent&apos;s endpoint
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
