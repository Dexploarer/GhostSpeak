'use client'

import { useState, useEffect, useRef } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import { useRouter } from 'next/navigation'
import { useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { Send, Loader2, Plus, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

interface Message {
  role: 'user' | 'agent'
  content: string
  actionTriggered?: string
  metadata?: any
  timestamp: number
}

interface Session {
  id: string
  startTime: number
  messages: Message[]
}

export default function CaisperPage() {
  const { publicKey } = useWallet()
  const router = useRouter()
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [currentSessionId, setCurrentSessionId] = useState(() => Date.now().toString())
  const [sessions, setSessions] = useState<Session[]>([])
  const [localMessages, setLocalMessages] = useState<Message[]>([])
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // Fetch chat history from Convex
  const chatHistory = useQuery(
    api.agent.getChatHistory,
    publicKey ? { walletAddress: publicKey.toBase58() } : 'skip'
  )

  // Update local messages when chat history loads
  useEffect(() => {
    if (chatHistory) {
      setLocalMessages(chatHistory as Message[])
      groupMessagesIntoSessions(chatHistory as Message[])
    }
  }, [chatHistory])

  // Group messages into sessions (1 hour gap = new session)
  const groupMessagesIntoSessions = (messages: Message[]) => {
    if (!messages.length) {
      setSessions([])
      return
    }

    const newSessions: Session[] = []
    let currentSessionMessages: Message[] = []
    let sessionStartTime = messages[0].timestamp
    const ONE_HOUR = 60 * 60 * 1000

    messages.forEach((msg, i) => {
      if (i === 0) {
        currentSessionMessages.push(msg)
      } else {
        const timeDiff = msg.timestamp - messages[i - 1].timestamp
        if (timeDiff > ONE_HOUR) {
          if (currentSessionMessages.length > 0) {
            newSessions.push({
              id: sessionStartTime.toString(),
              startTime: sessionStartTime,
              messages: currentSessionMessages,
            })
          }
          currentSessionMessages = [msg]
          sessionStartTime = msg.timestamp
        } else {
          currentSessionMessages.push(msg)
        }
      }
    })

    if (currentSessionMessages.length > 0) {
      newSessions.push({
        id: sessionStartTime.toString(),
        startTime: sessionStartTime,
        messages: currentSessionMessages,
      })
    }

    setSessions(newSessions.reverse())
  }

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [localMessages])

  // Redirect if not connected
  useEffect(() => {
    if (!publicKey) {
      router.push('/')
    }
  }, [publicKey, router])

  // Auto-focus input on mount
  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  if (!publicKey) {
    return null
  }

  const handleSend = async () => {
    if (!input.trim() || isLoading) return

    const userMessage = input.trim()
    setInput('')
    setIsLoading(true)

    const newUserMessage: Message = {
      role: 'user',
      content: userMessage,
      timestamp: Date.now(),
    }
    setLocalMessages((prev) => [...prev, newUserMessage])

    try {
      // Get session token from localStorage (set during signInWithSolana)
      const authDataStr = localStorage.getItem('ghostspeak_auth')
      const sessionToken = authDataStr ? JSON.parse(authDataStr).sessionToken : null

      const response = await fetch('/api/agent/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage,
          walletAddress: publicKey.toBase58(),
          sessionToken, // Send session token for authentication
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
      console.error('Failed to send message:', error)
      setLocalMessages((prev) => [
        ...prev,
        {
          role: 'agent',
          content: "Something went wrong. Please try again.",
          timestamp: Date.now(),
        },
      ])
    } finally {
      setIsLoading(false)
      inputRef.current?.focus()
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleNewSession = () => {
    const newSessionId = Date.now().toString()
    setCurrentSessionId(newSessionId)
    setLocalMessages([])
    inputRef.current?.focus()
  }

  const handleLoadSession = (session: Session) => {
    setCurrentSessionId(session.id)
    setLocalMessages(session.messages)
  }

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return 'Yesterday'
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString()
  }

  return (
    <div className="flex h-screen w-full">
      {/* Left Sidebar - Sessions */}
      <div className="w-64 border-r border-white/10 flex flex-col bg-[rgb(29,29,29)]">
        {/* Header */}
        <div className="p-4 border-b border-white/10">
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

        {/* Sessions List */}
        <div className="flex-1 overflow-y-auto p-3">
          {sessions.length > 0 ? (
            <div className="space-y-1">
              {sessions.map((session) => {
                const firstUserMsg = session.messages.find(m => m.role === 'user')
                const preview = firstUserMsg?.content.substring(0, 40) || 'New conversation'
                const isActive = session.id === currentSessionId

                return (
                  <button
                    key={session.id}
                    onClick={() => handleLoadSession(session)}
                    className={`w-full text-left px-3 py-2.5 rounded-lg transition-all ${
                      isActive
                        ? 'bg-white/10'
                        : 'hover:bg-white/5'
                    }`}
                  >
                    <p className={`text-sm mb-1 line-clamp-2 ${
                      isActive ? 'text-white' : 'text-white/70'
                    }`}>
                      {preview}{firstUserMsg && firstUserMsg.content.length > 40 ? '...' : ''}
                    </p>
                    <p className="text-xs text-white/40">
                      {formatDate(session.startTime)}
                    </p>
                  </button>
                )
              })}
            </div>
          ) : (
            <div className="flex items-center justify-center h-full">
              <p className="text-sm text-white/40">No chat history</p>
            </div>
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex flex-col flex-1 min-w-0 h-full">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-6 min-h-0">
          {localMessages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full">
              <h2 className="text-2xl font-light text-white mb-2">
                Caisper AI
              </h2>
              <p className="text-white/60 text-center max-w-md">
                AI-powered credential verification and reputation analysis
              </p>
            </div>
          ) : (
            <div className="space-y-6 max-w-3xl mx-auto">
              {localMessages.map((msg, i) => (
                <div key={i} className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
                    <span className="text-xs text-white">
                      {msg.role === 'user' ? 'You' : 'AI'}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white/90 leading-relaxed whitespace-pre-wrap">
                      {msg.content}
                    </p>
                  </div>
                </div>
              ))}

              {isLoading && (
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
                    <span className="text-xs text-white">AI</span>
                  </div>
                  <div className="flex-1">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-white/40 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-2 h-2 bg-white/40 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-2 h-2 bg-white/40 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input */}
        <div className="flex-shrink-0 border-t border-white/10 bg-[rgb(29,29,29)] px-4 py-4">
          <div className="max-w-3xl mx-auto">
            <div className="flex gap-3 items-end">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
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
                onClick={handleSend}
                disabled={isLoading || !input.trim()}
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

      {/* Right Sidebar - Info */}
      <div className="w-64 border-l border-white/10 p-6 bg-[rgb(29,29,29)] hidden xl:block">
        <div className="space-y-6">
          <div>
            <h3 className="text-sm font-medium text-white mb-3">About</h3>
            <p className="text-sm text-white/60 leading-relaxed">
              Caisper provides AI-powered verification of agent credentials, reputation analysis, and trust metrics on Solana.
            </p>
          </div>

          <div className="border-t border-white/10 pt-6">
            <h3 className="text-sm font-medium text-white mb-3">Capabilities</h3>
            <ul className="space-y-2 text-sm text-white/60">
              <li>• Credential Verification</li>
              <li>• Reputation Analysis</li>
              <li>• Trust Metrics</li>
              <li>• Transaction History</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
