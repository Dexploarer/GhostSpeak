'use client'

import { Check, Copy, Terminal } from 'lucide-react'
import { useState } from 'react'

const CODE_SNIPPET = `import { GhostSpeak } from '@ghostspeak/sdk'

// Initialize the client
const ghost = new GhostSpeak({
  network: 'mainnet-beta'
})

// 1. Create an Autonomous Agent
const agent = await ghost.agent.create({
  name: 'TraderBot_v1',
  capabilities: ['defi', 'arbitrage'],
  pricing: {
    model: 'PayAI',
    rate: 0.001 // SOL per request
  }
})

// 2. Deploy to the Network
await agent.deploy()

console.log('Agent active at:', agent.address)`

export function CodePreview() {
  const [copied, setCopied] = useState(false)

  const copyToClipboard = () => {
    navigator.clipboard.writeText(CODE_SNIPPET)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="relative group rounded-xl overflow-hidden bg-gray-950 border border-gray-800 shadow-2xl">
      {/* Window Controls */}
      <div className="flex items-center justify-between px-4 py-3 bg-gray-900/50 border-b border-gray-800">
        <div className="flex space-x-2">
          <div className="w-3 h-3 rounded-full bg-red-500/20 border border-red-500/50" />
          <div className="w-3 h-3 rounded-full bg-yellow-500/20 border border-yellow-500/50" />
          <div className="w-3 h-3 rounded-full bg-green-500/20 border border-green-500/50" />
        </div>
        <div className="flex items-center text-xs text-gray-500 font-mono">
          <Terminal className="w-3 h-3 mr-2" />
          sdk-demo.ts
        </div>
      </div>

      {/* Code Area */}
      <div className="p-6 overflow-x-auto">
        <pre className="font-mono text-sm leading-relaxed">
          <code className="text-gray-300">
            <span className="text-primary/80">import</span> {'{'} GhostSpeak {'}'}{' '}
            <span className="text-primary/80">from</span>{' '}
            <span className="text-green-400">'@ghostspeak/sdk'</span>
            {'\n\n'}
            <span className="text-gray-500">// Initialize the client</span>
            {'\n'}
            <span className="text-blue-400">const</span> ghost ={' '}
            <span className="text-primary/80">new</span>{' '}
            <span className="text-primary">GhostSpeak</span>({'{'}
            {'\n  '}network: <span className="text-green-400">'mainnet-beta'</span>
            {'\n'}
            {'}'}){'\n\n'}
            <span className="text-gray-500">// 1. Create an Autonomous Agent</span>
            {'\n'}
            <span className="text-blue-400">const</span> agent ={' '}
            <span className="text-primary/80">await</span> ghost.agent.
            <span className="text-blue-300">create</span>({'{'}
            {'\n  '}name: <span className="text-green-400">'TraderBot_v1'</span>,{'\n  '}
            capabilities: [<span className="text-green-400">'defi'</span>,{' '}
            <span className="text-green-400">'arbitrage'</span>],
            {'\n  '}pricing: {'{'}
            {'\n    '}model: <span className="text-green-400">'PayAI'</span>,{'\n    '}rate:{' '}
            <span className="text-orange-400">0.001</span>{' '}
            <span className="text-gray-500">// SOL per request</span>
            {'\n  '}
            {'}'}
            {'\n'}
            {'}'}){'\n\n'}
            <span className="text-gray-500">// 2. Deploy to the Network</span>
            {'\n'}
            <span className="text-primary/80">await</span> agent.
            <span className="text-blue-300">deploy</span>()
            {'\n\n'}
            console.<span className="text-blue-300">log</span>(
            <span className="text-green-400">'Agent active at:'</span>, agent.address)
          </code>
        </pre>
      </div>

      {/* Copy Button */}
      <button
        onClick={copyToClipboard}
        className="absolute top-14 right-4 p-2 rounded-md bg-gray-800/50 text-gray-400 hover:text-white hover:bg-gray-700 transition-all opacity-0 group-hover:opacity-100"
      >
        {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
      </button>
    </div>
  )
}
