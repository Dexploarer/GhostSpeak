'use client'

import { ReactNode, useState } from 'react'
import { Search, FileCheck, UserPlus, Zap, Info, ChevronDown, Sparkles } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'

export interface AgentTool {
  id: string
  name: string
  description: string
  icon: ReactNode
  prompts: string[]
  category: 'discovery' | 'credentials' | 'verification' | 'general'
}

interface AgentToolsPanelProps {
  agentName: string
  agentDescription: string
  agentAvatar?: ReactNode
  tools: AgentTool[]
  onPromptClick: (prompt: string) => void
}

const categoryColors = {
  discovery: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  credentials: 'bg-lime-500/20 text-lime-400 border-lime-500/30',
  verification: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  general: 'bg-white/10 text-white/60 border-white/20',
}

const categoryIcons = {
  discovery: Search,
  credentials: FileCheck,
  verification: Zap,
  general: Info,
}

export function AgentToolsPanel({
  agentName,
  agentDescription,
  agentAvatar,
  tools,
  onPromptClick,
}: AgentToolsPanelProps) {
  const [openId, setOpenId] = useState<string | null>('discover-agents')

  return (
    <div className="h-full flex flex-col bg-[#0a0a0a]/50 backdrop-blur-xl border-l border-white/5">
      {/* Agent Info Section */}
      <div className="shrink-0 p-6 border-b border-white/5 bg-gradient-to-b from-white/5 to-transparent">
        {/* Avatar */}
        {agentAvatar && (
          <div className="flex justify-center mb-6 relative group">
            <div className="absolute inset-0 bg-lime-500/20 blur-2xl rounded-full opacity-50 group-hover:opacity-75 transition-opacity duration-500" />
            <div className="relative transform group-hover:scale-105 transition-transform duration-300">
              {agentAvatar}
            </div>
          </div>
        )}

        {/* Agent Details */}
        <div className="text-center">
          <h3 className="text-lg font-bold text-white mb-2">{agentName}</h3>
          <p className="text-xs text-white/50 leading-relaxed font-medium px-2">{agentDescription}</p>
        </div>
      </div>

      {/* Tools Section */}
      <div className="flex-1 overflow-y-auto px-4 py-6 min-h-0 space-y-6 scrollbar-none" data-lenis-prevent>
        <div className="flex items-center gap-2 px-1">
          <Sparkles className="w-3 h-3 text-white/40" />
          <h3 className="text-xs font-medium text-white/40 uppercase tracking-widest">
            Capabilities
          </h3>
        </div>

        <div className="space-y-3">
          {tools.map((tool) => {
            const isOpen = openId === tool.id
            const colorClass = categoryColors[tool.category]

            return (
              <motion.div
                key={tool.id}
                initial={false}
                animate={{
                  backgroundColor: isOpen ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0)",
                  borderColor: isOpen ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.05)"
                }}
                className="border border-white/5 rounded-xl overflow-hidden transition-colors"
              >
                <button
                  onClick={() => setOpenId(isOpen ? null : tool.id)}
                  className="w-full flex items-center gap-3 p-3 text-left hover:bg-white/5 transition-colors"
                >
                  <div className={cn("shrink-0 w-8 h-8 rounded-lg flex items-center justify-center border", colorClass)}>
                    {tool.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className={cn("text-xs font-semibold uppercase tracking-wide mb-0.5", isOpen ? "text-white" : "text-white/80")}>
                      {tool.name}
                    </h4>
                  </div>
                  <ChevronDown className={cn("w-4 h-4 text-white/30 transition-transform duration-300", isOpen && "rotate-180")} />
                </button>

                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2, ease: "easeInOut" }}
                    >
                      <div className="px-3 pb-3 pt-0">
                        <p className="text-xs text-white/50 mb-3 ml-1 leading-relaxed">
                          {tool.description}
                        </p>

                        <div className="space-y-1.5">
                          {tool.prompts.map((prompt, idx) => (
                            <button
                              key={idx}
                              onClick={() => onPromptClick(prompt)}
                              className="w-full text-left px-3 py-2.5 rounded-lg bg-white/5 hover:bg-white/10 active:bg-white/15 text-xs text-white/70 hover:text-white transition-all border border-white/5 hover:border-white/10 flex items-center gap-2 group"
                            >
                              <div className="w-1 h-1 rounded-full bg-white/20 group-hover:bg-lime-400 transition-colors" />
                              {prompt}
                            </button>
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// Default tools for Caisper agent
export const caisperTools: AgentTool[] = [
  {
    id: 'discover-agents',
    name: 'Discovery',
    description: 'Find unclaimed agents in the registry.',
    icon: <Search className="w-4 h-4" />,
    category: 'discovery',
    prompts: [
      'Show me 5 new agents',
      'Find agents with no owner',
      'Who are the top agents?',
    ],
  },
  {
    id: 'issue-credential',
    name: 'Credentials',
    description: 'Issue verifiable credentials to agents.',
    icon: <FileCheck className="w-4 h-4" />,
    category: 'credentials',
    prompts: [
      'Issue a Known User credential',
      'How do I verify an agent?',
    ],
  },
  {
    id: 'verification',
    name: 'Verification',
    description: 'Check agent reputation and trust scores.',
    icon: <Zap className="w-4 h-4" />,
    category: 'verification',
    prompts: [
      'Check this agent reputation',
      'Is this wallet safe?',
    ],
  },
  {
    id: 'learn',
    name: 'Knowledge Base',
    description: 'Learn about GhostSpeak protocol.',
    icon: <Info className="w-4 h-4" />,
    category: 'general',
    prompts: [
      'What is a Ghost Score?',
      'Explain the Trust Layer',
    ],
  },
]
