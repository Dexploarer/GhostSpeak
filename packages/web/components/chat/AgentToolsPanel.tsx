'use client'

import { ReactNode } from 'react'
import { Search, FileCheck, UserPlus, Zap, Info } from 'lucide-react'

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
  discovery: 'text-blue-400',
  credentials: 'text-lime-400',
  verification: 'text-purple-400',
  general: 'text-white/60',
}

export function AgentToolsPanel({
  agentName,
  agentDescription,
  agentAvatar,
  tools,
  onPromptClick,
}: AgentToolsPanelProps) {
  return (
    <div className="h-full flex flex-col">
      {/* Agent Info Section */}
      <div className="flex-shrink-0 border-b border-white/10 pb-6">
        {/* Avatar */}
        {agentAvatar && (
          <div className="flex justify-center -mt-2 mb-4">
            {agentAvatar}
          </div>
        )}

        {/* Agent Details */}
        <div>
          <h3 className="text-sm font-medium text-white mb-3">{agentName}</h3>
          <p className="text-sm text-white/60 leading-relaxed">
            {agentDescription}
          </p>
        </div>
      </div>

      {/* Tools Section */}
      <div className="flex-1 overflow-y-auto pt-6 min-h-0" data-lenis-prevent>
        <h3 className="text-sm font-medium text-white mb-4">Available Tools</h3>
        <div className="space-y-3">
          {tools.map((tool) => (
            <details
              key={tool.id}
              className="group bg-white/5 border border-white/10 rounded-lg overflow-hidden hover:border-white/20 transition-all"
            >
              <summary className="p-3 cursor-pointer list-none flex items-start gap-3 hover:bg-white/5 transition-colors">
                <div className={`flex-shrink-0 mt-0.5 ${categoryColors[tool.category]}`}>
                  {tool.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-medium text-white mb-1">
                    {tool.name}
                  </h4>
                  <p className="text-xs text-white/60 leading-relaxed">
                    {tool.description}
                  </p>
                </div>
                <div className="flex-shrink-0 text-white/40 group-open:rotate-180 transition-transform">
                  ▼
                </div>
              </summary>

              {/* Prompts */}
              <div className="border-t border-white/10 p-3 space-y-2 bg-white/5">
                <p className="text-xs text-white/40 mb-2">
                  Click to send:
                </p>
                {tool.prompts.map((prompt, idx) => (
                  <button
                    key={idx}
                    onClick={() => onPromptClick(prompt)}
                    className="w-full text-left px-3 py-2 bg-white/5 hover:bg-white/10 rounded text-xs text-white/80 hover:text-white transition-all border border-white/10 hover:border-white/20"
                  >
                    "{prompt}"
                  </button>
                ))}
              </div>
            </details>
          ))}
        </div>
      </div>
    </div>
  )
}

// Default tools for Caisper agent
export const caisperTools: AgentTool[] = [
  {
    id: 'discover-agents',
    name: 'Discover Agents',
    description: 'Find available unclaimed agents in the Ghost Registry',
    icon: <Search className="w-4 h-4" />,
    category: 'discovery',
    prompts: [
      'What agents are available to claim?',
      'Show me unclaimed ghosts',
      'Find me some available agents',
    ],
  },
  {
    id: 'issue-credential',
    name: 'Issue Credential',
    description: 'Create a verified W3C credential for an agent',
    icon: <FileCheck className="w-4 h-4" />,
    category: 'credentials',
    prompts: [
      'How do I issue a credential?',
      'What information do I need to create a credential?',
      'Explain the credential issuance process',
    ],
  },
  {
    id: 'claim-agent',
    name: 'Claim Agent',
    description: 'Claim ownership of an unclaimed agent',
    icon: <UserPlus className="w-4 h-4" />,
    category: 'credentials',
    prompts: [
      'How do I claim an agent?',
      'What does claiming an agent do?',
      'Explain the agent claiming process',
    ],
  },
  {
    id: 'verify-credential',
    name: 'Verify Credential',
    description: 'Check if an agent\'s credential is valid and trustworthy',
    icon: <Zap className="w-4 h-4" />,
    category: 'verification',
    prompts: [
      'How do I verify a credential?',
      'What makes a credential valid?',
      'Explain credential verification',
    ],
  },
  {
    id: 'about-vcs',
    name: 'About VCs',
    description: 'Learn about the 5 types of Verifiable Credentials',
    icon: <Info className="w-4 h-4" />,
    category: 'general',
    prompts: [
      'What types of VCs can you issue?',
      'Explain Verifiable Credentials',
      'What are the different credential types?',
    ],
  },
  {
    id: 'reputation-check',
    name: 'Reputation Check',
    description: 'Analyze agent reputation scores and history',
    icon: <Zap className="w-4 h-4" />,
    category: 'verification',
    prompts: [
      'How does reputation scoring work?',
      'What are the reputation tiers?',
      'Explain the reputation system',
    ],
  },
]
