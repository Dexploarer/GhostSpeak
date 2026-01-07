'use client'

import { useEffect, useRef, useState } from 'react'
import { useWallet } from '@/lib/wallet/WalletStandardProvider'
import { useWalletModal } from '@/lib/wallet/WalletModal'
import {
  Send,
  Loader2,
  Plus,
  ArrowLeft,
  Sparkles,
  MessageSquare,
  Shield,
  Search,
} from 'lucide-react'
import Link from 'next/link'
import { MeshGradientGhost } from '@/components/shared/MeshGradientGhost'
import { AgentListResponse } from '@/components/chat/AgentListResponse'
import { AgentEvaluationResponse } from '@/components/chat/AgentEvaluationResponse'
import { TrustAssessmentCard } from '@/components/chat/TrustAssessmentCard'
import { AgentDirectoryCard } from '@/components/chat/AgentDirectoryCard'
import { TokenEvaluationCard } from '@/components/chat/TokenEvaluationCard'
import { AgentToolsPanel, caisperTools } from '@/components/chat/AgentToolsPanel'
import { ChatMarkdown } from '@/components/chat/ChatMarkdown'
import { useQuery, useMutation } from 'convex/react'
import { api } from '@/convex/_generated/api'

interface Message {
  role: 'user' | 'agent'
  content: string
  actionTriggered?: string
  metadata?: Record<string, any>
  timestamp: number
}

// Starter prompts for empty state
const starterPrompts = [
  {
    icon: Search,
    label: 'Discover Agents',
    prompt: 'What agents are available to claim?',
    color: 'text-blue-400',
  },
  {
    icon: Shield,
    label: 'Learn About VCs',
    prompt: 'What types of Verifiable Credentials can you issue?',
    color: 'text-lime-400',
  },
  {
    icon: MessageSquare,
    label: 'Get Started',
    prompt: 'How does GhostSpeak work?',
    color: 'text-purple-400',
  },
]

export default function CaisperPage() {
  const { publicKey } = useWallet()
  const { setVisible: setWalletModalVisible } = useWalletModal()
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const shouldAutoScrollRef = useRef(true)
  const isUserScrollingRef = useRef(false)
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [localMessages, setLocalMessages] = useState<Message[]>([])
  const [isNewSession, setIsNewSession] = useState(false)

  // Convex mutations
  const clearChatHistoryMutation = useMutation(api.agent.clearChatHistory)

  // Fetch chat history from Convex to get metadata
  const convexMessages = useQuery(
    api.agent.getChatHistory,
    publicKey ? { walletAddress: publicKey, limit: 50 } : 'skip'
  )

  // Fetch user's own Ghost Score
  const userScore = useQuery(
    api.ghostScoreCalculator.calculateAgentScore,
    publicKey ? { agentAddress: publicKey } : 'skip'
  )

  // Update local messages when chat history loads (but not during a new session)
  useEffect(() => {
    if (convexMessages && !isNewSession) {
      setLocalMessages(convexMessages as Message[])
      // When loading history, scroll to bottom
      shouldAutoScrollRef.current = true
    }
  }, [convexMessages, isNewSession])

  // Handle claim button click - send claim prompt as new message
  const handleClaimClick = (claimPrompt: string) => {
    setInput(claimPrompt)
    // Trigger send after setting input
    setTimeout(() => {
      handleSend(claimPrompt)
    }, 0)
  }

  // Handle tool prompt click from right panel
  const handleToolPromptClick = (prompt: string) => {
    handleSend(prompt)
  }

  // Check if user is near bottom of scroll container
  const isNearBottom = () => {
    const container = messagesContainerRef.current
    if (!container) return true

    const threshold = 100 // pixels from bottom
    const scrollTop = container.scrollTop
    const scrollHeight = container.scrollHeight
    const clientHeight = container.clientHeight

    return scrollHeight - scrollTop - clientHeight < threshold
  }

  // Handle scroll events to detect manual scrolling
  const handleScroll = () => {
    // const container = e.currentTarget

    // Mark that user is actively scrolling
    isUserScrollingRef.current = true

    // Clear any existing timeout
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current)
    }

    // Reset user scrolling flag after scroll ends (longer delay to prevent interference)
    scrollTimeoutRef.current = setTimeout(() => {
      isUserScrollingRef.current = false
    }, 300)

    // Update auto-scroll preference based on position
    const isNear = isNearBottom()
    shouldAutoScrollRef.current = isNear

    // Debug: Log scroll info to verify it's working
    // console.log('Scroll:', {
    //   scrollTop: container.scrollTop,
    //   scrollHeight: container.scrollHeight,
    //   clientHeight: container.clientHeight,
    //   isNearBottom: isNear
    // })
  }

  // Scroll to bottom function
  const scrollToBottom = (smooth = false) => {
    const container = messagesContainerRef.current
    if (!container) return

    if (smooth) {
      container.scrollTo({
        top: container.scrollHeight,
        behavior: 'smooth',
      })
    } else {
      container.scrollTop = container.scrollHeight
    }
  }

  // Auto-scroll to bottom only when new messages are added (not on every render)
  useEffect(() => {
    // Don't auto-scroll if user is actively scrolling
    if (isUserScrollingRef.current) return

    // Only auto-scroll if user is near bottom
    if (!shouldAutoScrollRef.current) return

    const container = messagesContainerRef.current
    if (!container) return

    // Check if content actually overflows
    if (container.scrollHeight <= container.clientHeight) return

    // Use a small delay to ensure DOM is updated
    const timer = setTimeout(() => {
      // Double-check conditions before scrolling
      if (!isUserScrollingRef.current && shouldAutoScrollRef.current) {
        const isStillNearBottom = isNearBottom()
        if (isStillNearBottom) {
          scrollToBottom(false)
        }
      }
    }, 50)

    return () => clearTimeout(timer)
  }, [localMessages.length]) // Only trigger on length change

  // Cleanup scroll timeout on unmount
  useEffect(() => {
    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current)
      }
    }
  }, [])

  // Auto-focus input on mount
  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  // Verify scroll container setup on mount
  useEffect(() => {
    const container = messagesContainerRef.current
    if (!container) return

    // Verify container is scrollable
    const checkScrollability = () => {
      const canScroll = container.scrollHeight > container.clientHeight
      if (!canScroll && localMessages.length > 0) {
        console.warn('Scroll container may not be properly constrained:', {
          scrollHeight: container.scrollHeight,
          clientHeight: container.clientHeight,
          offsetHeight: container.offsetHeight,
        })
      }
    }

    // Check after a short delay to ensure DOM is ready
    const timer = setTimeout(checkScrollability, 100)
    return () => clearTimeout(timer)
  }, [localMessages.length])

  const handleSend = async (messageOverride?: string) => {
    const messageToSend = messageOverride || input.trim()
    if (!messageToSend || isLoading) return

    // Prompt for wallet connection if not connected
    if (!publicKey) {
      setWalletModalVisible(true)
      return
    }

    setInput('')
    setIsLoading(true)
    // When user sends a message, enable auto-scroll to show response
    shouldAutoScrollRef.current = true

    const newUserMessage: Message = {
      role: 'user',
      content: messageToSend,
      timestamp: Date.now(),
    }
    setLocalMessages((prev) => [...prev, newUserMessage])

    try {
      // Get session token from localStorage
      const authDataStr = localStorage.getItem('ghostspeak_auth')
      const sessionToken = authDataStr ? JSON.parse(authDataStr).sessionToken : null

      const response = await fetch('/api/agent/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: messageToSend,
          walletAddress: publicKey,
          sessionToken,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to get response from agent')
      }

      const data = await response.json()

      const agentMessage: Message = {
        role: 'agent',
        content: data.response,
        actionTriggered: data.actionTriggered,
        metadata: data.metadata,
        timestamp: Date.now(),
      }

      setLocalMessages((prev) => [...prev, agentMessage])
    } catch (error) {
      console.error('Error sending message:', error)
      const errorMessage: Message = {
        role: 'agent',
        content: 'Sorry, I encountered an error processing your message. Please try again.',
        timestamp: Date.now(),
      }
      setLocalMessages((prev) => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleNewSession = async () => {
    if (!publicKey) return

    // Set flag to prevent re-population from Convex
    setIsNewSession(true)
    setLocalMessages([])

    try {
      // Clear chat history in Convex
      await clearChatHistoryMutation({ walletAddress: publicKey })
    } catch (error) {
      console.error('Error clearing chat history:', error)
    }

    inputRef.current?.focus()

    // Reset the flag after a short delay to allow new messages to be saved
    setTimeout(() => {
      setIsNewSession(false)
    }, 500)
  }

  return (
    <div
      className="flex h-full w-full overflow-hidden"
      style={{ height: '100%', position: 'relative' }}
    >
      {/* Left Sidebar - Actions */}
      <div className="w-64 border-r border-white/10 flex flex-col bg-[rgb(29,29,29)] overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-white/10 shrink-0">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 text-sm text-white/60 hover:text-white transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back</span>
          </Link>
          <button
            onClick={handleNewSession}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-white text-black rounded-lg hover:bg-white/90 transition-all text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            <span>New Chat</span>
          </button>
        </div>

        {/* Info */}
        <div className="flex-1 overflow-y-auto p-4 min-h-0" data-lenis-prevent>
          <div className="space-y-4">
            {/* User's Ghost Score */}
            {publicKey && (
              <div className="p-3 rounded-lg bg-white/5 border border-white/10">
                <h3 className="text-xs font-medium text-white/60 uppercase tracking-wider mb-2">
                  Your Ghost Score
                </h3>
                {userScore ? (
                  <>
                    <div className="flex items-baseline gap-2 mb-2">
                      <span className="text-2xl font-bold text-white">
                        {userScore.score.toLocaleString()}
                      </span>
                      <span className="text-xs text-white/50">/ 10,000</span>
                    </div>
                    <div className="text-xs text-lime-400 font-medium mb-3">{userScore.tier}</div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleSend(`What's my ghost score?`)}
                        className="flex-1 px-2 py-1.5 rounded bg-white/5 border border-white/10 text-xs text-white/70 hover:text-white hover:bg-white/10 transition-all"
                      >
                        Details
                      </button>
                      <button
                        onClick={() => handleSend(`What credentials do I have?`)}
                        className="flex-1 px-2 py-1.5 rounded bg-white/5 border border-white/10 text-xs text-white/70 hover:text-white hover:bg-white/10 transition-all"
                      >
                        My VCs
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="text-sm text-white/40">Loading...</div>
                )}
              </div>
            )}

            <div>
              <h3 className="text-sm font-medium text-white mb-2">Chat Status</h3>
              <div className="text-xs text-white/60 space-y-1">
                <div>Messages: {localMessages.length}</div>
                <div>Status: {isLoading ? 'Typing...' : 'Ready'}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden" style={{ height: '100%' }}>
        {/* Messages Container - Properly isolated scroll area */}
        <div
          ref={messagesContainerRef}
          onScroll={handleScroll}
          data-lenis-prevent
          className="flex-1 overflow-y-auto overflow-x-hidden px-4 py-6"
          style={{
            minHeight: 0,
            WebkitOverflowScrolling: 'touch',
            overscrollBehavior: 'contain',
          }}
        >
          {localMessages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full px-4">
              {/* Ghost Avatar */}
              <div className="w-24 h-28 mb-6">
                <MeshGradientGhost animated={true} interactive={true} variant="yellow" />
              </div>

              <h2 className="text-2xl font-light text-white mb-2">Hi, I'm Caisper</h2>
              <p className="text-white/60 text-center max-w-md mb-8">
                Your AI-powered trust detective. I can help you discover agents, verify credentials,
                and check reputation scores.
              </p>

              {/* Starter Prompts */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-2xl w-full">
                {starterPrompts.map((starter) => (
                  <button
                    key={starter.label}
                    onClick={() => handleSend(starter.prompt)}
                    className="group flex flex-col items-start gap-2 p-4 bg-white/5 border border-white/10 rounded-xl hover:border-white/20 hover:bg-white/10 transition-all text-left"
                  >
                    <div className={`p-2 rounded-lg bg-white/5 ${starter.color}`}>
                      <starter.icon className="w-4 h-4" />
                    </div>
                    <span className="text-sm font-medium text-white">{starter.label}</span>
                    <span className="text-xs text-white/50 line-clamp-2">"{starter.prompt}"</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-6 max-w-3xl mx-auto">
              {localMessages.map((msg, idx) => (
                <div key={idx} className="flex items-start gap-4">
                  <div className="shrink-0 w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
                    <span className="text-xs text-white">{msg.role === 'user' ? 'You' : 'AI'}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    {/* Action Badge */}
                    {msg.role === 'agent' && msg.actionTriggered && (
                      <div className="mb-2 inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-lime-500/10 border border-lime-500/20 text-xs text-lime-400">
                        <Sparkles className="w-3 h-3" />
                        <span className="capitalize">{msg.actionTriggered.replace(/_/g, ' ')}</span>
                      </div>
                    )}

                    <ChatMarkdown content={msg.content} />

                    {/* Render custom agent list if metadata indicates agent-list type */}
                    {msg.metadata?.type === 'agent-list' &&
                      msg.metadata?.agents &&
                      msg.metadata?.agents.length > 0 && (
                        <AgentListResponse
                          agents={msg.metadata.agents}
                          totalCount={msg.metadata.totalCount || msg.metadata.agents.length}
                          onClaimClick={handleClaimClick}
                        />
                      )}

                    {/* Render ghost score evaluation if metadata type is ghost-score */}
                    {msg.metadata?.type === 'ghost-score' && (
                      <AgentEvaluationResponse
                        agentAddress={msg.metadata.agentAddress}
                        score={msg.metadata.score}
                        tier={msg.metadata.tier}
                        breakdown={msg.metadata.breakdown}
                        network={msg.metadata.network}
                        myTake={msg.metadata.myTake}
                        badges={msg.metadata.badges}
                        onActionClick={handleSend}
                      />
                    )}

                    {/* Render trust assessment card if metadata type is trust-assessment */}
                    {msg.metadata?.type === 'trust-assessment' && (
                      <TrustAssessmentCard
                        agentAddress={msg.metadata.agentAddress}
                        greenFlags={msg.metadata.greenFlags || []}
                        yellowFlags={msg.metadata.yellowFlags || []}
                        redFlags={msg.metadata.redFlags || []}
                        scoreData={msg.metadata.scoreData}
                        onActionClick={handleSend}
                      />
                    )}

                    {/* Render agent directory if metadata type is agent-directory */}
                    {msg.metadata?.type === 'agent-directory' && (
                      <AgentDirectoryCard
                        agents={msg.metadata.agents || []}
                        totalAgents={msg.metadata.totalAgents || 0}
                        totalEndpoints={msg.metadata.totalEndpoints || 0}
                        agentsWithEndpoints={msg.metadata.agentsWithEndpoints || 0}
                        onActionClick={handleSend}
                      />
                    )}

                    {/* Render token evaluation card if metadata type is token-evaluation */}
                    {msg.metadata?.type === 'token-evaluation' && (
                      <TokenEvaluationCard
                        agentAddress={msg.metadata.agentAddress}
                        totalValue={msg.metadata.totalValue}
                        tokenCount={msg.metadata.tokenCount}
                        verifiedCount={msg.metadata.verifiedCount}
                        riskyCount={msg.metadata.riskyCount}
                        avgExploitScore={msg.metadata.avgExploitScore}
                        tokens={msg.metadata.tokens}
                        onActionClick={handleSend}
                      />
                    )}
                  </div>
                </div>
              ))}

              {isLoading && (
                <div className="flex items-start gap-4">
                  <div className="shrink-0 w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
                    <span className="text-xs text-white">AI</span>
                  </div>
                  <div className="flex-1">
                    <div className="flex gap-1">
                      <div
                        className="w-2 h-2 bg-white/40 rounded-full animate-bounce"
                        style={{ animationDelay: '0ms' }}
                      />
                      <div
                        className="w-2 h-2 bg-white/40 rounded-full animate-bounce"
                        style={{ animationDelay: '150ms' }}
                      />
                      <div
                        className="w-2 h-2 bg-white/40 rounded-full animate-bounce"
                        style={{ animationDelay: '300ms' }}
                      />
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input */}
        <div className="shrink-0 border-t border-white/10 bg-[rgb(29,29,29)] px-4 py-4">
          <div className="max-w-3xl mx-auto">
            <div className="flex gap-3 items-end">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Message Caisper..."
                className="flex-1 px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-white/40 focus:outline-none focus:border-white/20 resize-none max-h-32"
                rows={1}
                disabled={isLoading}
                onInput={(e) => {
                  const target = e.target as HTMLTextAreaElement
                  target.style.height = 'auto'
                  target.style.height = Math.min(target.scrollHeight, 128) + 'px'
                }}
              />
              <button
                onClick={() => handleSend()}
                disabled={isLoading || !input?.trim()}
                className="p-3 bg-white text-black rounded-lg disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white/90 transition-all"
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Send className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Right Sidebar - Agent Tools Panel */}
      <div className="w-80 border-l border-white/10 p-6 bg-[rgb(29,29,29)] hidden xl:block overflow-hidden">
        <AgentToolsPanel
          agentName="Caisper AI"
          agentDescription="AI-powered credential verification and reputation analysis on Solana. Your blockchain trust detective."
          agentAvatar={
            <div className="w-32 h-40">
              <MeshGradientGhost animated={true} interactive={true} variant="yellow" />
            </div>
          }
          tools={caisperTools}
          onPromptClick={handleToolPromptClick}
        />
      </div>
    </div>
  )
}
