/**
 * x402 AI Tools Marketplace Page
 *
 * Browse AI-ready x402 tools with integration snippets for OpenAI, Anthropic, and LangChain
 *
 * @module x402/ai-tools
 */

'use client'

import React, { useState, useMemo } from 'react'
import {
  Sparkles,
  Code,
  Copy,
  Check,
  ExternalLink,
  Play,
  Filter,
  Zap,
  Clock,
  Search,
  ChevronDown,
  ChevronRight,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'

// =====================================================
// TYPES
// =====================================================

interface AITool {
  id: string
  name: string
  description: string
  url: string
  category: string
  price: string
  priceUsd: number
  network: string
  capabilities: string[]
  inputSchema: object
  outputSchema?: object
  examples?: Array<{ input: unknown; output: unknown }>
  facilitator: string
  avgLatency: number
  totalCalls: number
}

// =====================================================
// MOCK DATA
// =====================================================

const MOCK_TOOLS: AITool[] = [
  {
    id: '1',
    name: 'ghostspeak_text_generate',
    description: 'Generate high-quality text using advanced AI models with x402 micropayments',
    url: 'https://api.ghostspeak.ai/v1/generate',
    category: 'text-generation',
    price: '0.001 USDC',
    priceUsd: 0.001,
    network: 'solana',
    capabilities: ['text-generation', 'chat', 'completion'],
    inputSchema: {
      type: 'object',
      properties: {
        prompt: { type: 'string', description: 'The text prompt' },
        maxTokens: { type: 'integer', description: 'Maximum tokens', default: 1024 },
        temperature: { type: 'number', description: 'Sampling temperature', default: 0.7 },
      },
      required: ['prompt'],
    },
    outputSchema: {
      type: 'object',
      properties: {
        text: { type: 'string', description: 'Generated text' },
        tokensUsed: { type: 'integer' },
      },
    },
    examples: [
      {
        input: { prompt: 'Write a haiku about AI', maxTokens: 50 },
        output: {
          text: 'Silicon whispers,\nNeural paths illuminate,\nThoughts born from code.',
          tokensUsed: 15,
        },
      },
    ],
    facilitator: 'ghostspeak',
    avgLatency: 120,
    totalCalls: 45000,
  },
  {
    id: '2',
    name: 'payai_code_complete',
    description: 'AI-powered code completion and generation',
    url: 'https://api.payai.network/code/complete',
    category: 'code-generation',
    price: '0.005 USDC',
    priceUsd: 0.005,
    network: 'base',
    capabilities: ['code-completion', 'code-generation', 'refactoring'],
    inputSchema: {
      type: 'object',
      properties: {
        code: { type: 'string', description: 'Input code' },
        language: { type: 'string', description: 'Programming language' },
        task: { type: 'string', enum: ['complete', 'explain', 'refactor'] },
      },
      required: ['code'],
    },
    facilitator: 'payai',
    avgLatency: 450,
    totalCalls: 12000,
  },
  {
    id: '3',
    name: 'aurra_summarize',
    description: 'Summarize long documents and articles using AI',
    url: 'https://api.aurra.cloud/v1/summarize',
    category: 'summarization',
    price: '0.002 USDC',
    priceUsd: 0.002,
    network: 'solana',
    capabilities: ['summarization', 'extraction'],
    inputSchema: {
      type: 'object',
      properties: {
        text: { type: 'string', description: 'Text to summarize' },
        length: { type: 'string', enum: ['short', 'medium', 'long'] },
      },
      required: ['text'],
    },
    facilitator: 'aurracloud',
    avgLatency: 800,
    totalCalls: 8500,
  },
]

// =====================================================
// CODE SNIPPETS
// =====================================================

function generateOpenAISnippet(tool: AITool): string {
  return `import OpenAI from 'openai';
import { fetchWithX402Payment } from '@ghostspeak/sdk/x402';

const client = new OpenAI();

// Define the ${tool.name} tool
const tools = [{
  type: 'function',
  function: {
    name: '${tool.name}',
    description: '${tool.description}',
    parameters: ${JSON.stringify(tool.inputSchema, null, 4)}
  }
}];

// Handle tool call
async function handleToolCall(toolCall) {
  if (toolCall.function.name === '${tool.name}') {
    const args = JSON.parse(toolCall.function.arguments);
    
    const response = await fetchWithX402Payment(
      '${tool.url}',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(args)
      },
      wallet // Your Solana wallet signer
    );
    
    return await response.json();
  }
}

// Example usage
const response = await client.chat.completions.create({
  model: 'gpt-4o',
  messages: [{ role: 'user', content: 'Use ${tool.name} to...' }],
  tools,
  tool_choice: 'auto'
});`
}

function generateAnthropicSnippet(tool: AITool): string {
  return `import Anthropic from '@anthropic-ai/sdk';
import { fetchWithX402Payment } from '@ghostspeak/sdk/x402';

const client = new Anthropic();

// Define the ${tool.name} tool
const tools = [{
  name: '${tool.name}',
  description: '${tool.description}',
  input_schema: ${JSON.stringify(tool.inputSchema, null, 4)}
}];

// Handle tool use
async function handleToolUse(toolUse) {
  if (toolUse.name === '${tool.name}') {
    const response = await fetchWithX402Payment(
      '${tool.url}',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(toolUse.input)
      },
      wallet // Your Solana wallet signer
    );
    
    return await response.json();
  }
}

// Example usage
const response = await client.messages.create({
  model: 'claude-sonnet-4-20250514',
  max_tokens: 1024,
  messages: [{ role: 'user', content: 'Use ${tool.name} to...' }],
  tools
});`
}

function generateLangChainSnippet(tool: AITool): string {
  return `import { DynamicStructuredTool } from '@langchain/core/tools';
import { z } from 'zod';
import { fetchWithX402Payment } from '@ghostspeak/sdk/x402';

// Define the ${tool.name} tool
const ${tool.name} = new DynamicStructuredTool({
  name: '${tool.name}',
  description: '${tool.description}',
  schema: z.object({
    prompt: z.string().describe('The input prompt'),
    // Add other fields based on tool schema
  }),
  func: async (args) => {
    const response = await fetchWithX402Payment(
      '${tool.url}',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(args)
      },
      wallet // Your Solana wallet signer
    );
    
    return await response.json();
  }
});

// Use with an agent
import { ChatOpenAI } from '@langchain/openai';
import { AgentExecutor, createToolCallingAgent } from 'langchain/agents';

const llm = new ChatOpenAI({ model: 'gpt-4o' });
const tools = [${tool.name}];
const agent = await createToolCallingAgent({ llm, tools, prompt });
const executor = new AgentExecutor({ agent, tools });

const result = await executor.invoke({
  input: 'Use ${tool.name} to...'
});`
}

// =====================================================
// COMPONENTS
// =====================================================

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Button variant="ghost" size="sm" onClick={handleCopy}>
      {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
    </Button>
  )
}

function CodeBlock({ code }: { code: string; language?: string }) {
  return (
    <div className="relative">
      <div className="absolute top-2 right-2">
        <CopyButton text={code} />
      </div>
      <pre className="p-4 rounded-lg bg-gray-900 text-gray-100 text-sm overflow-x-auto">
        <code>{code}</code>
      </pre>
    </div>
  )
}

function ToolCard({ tool }: { tool: AITool }) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <Card className="bg-white/70 dark:bg-gray-900/70 backdrop-blur-sm border-gray-200/50 dark:border-gray-700/50">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardTitle className="text-lg font-mono flex items-center gap-2">
                <Code className="w-4 h-4 text-purple-500" />
                {tool.name}
              </CardTitle>
              <CardDescription className="mt-1">{tool.description}</CardDescription>
            </div>
            <div className="flex flex-col items-end gap-1">
              <Badge variant="outline">{tool.network}</Badge>
              <span className="text-lg font-bold text-purple-600 dark:text-purple-400">
                {tool.price}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap gap-1 mt-2">
            {tool.capabilities.map((cap) => (
              <Badge key={cap} variant="secondary" className="text-xs">
                {cap}
              </Badge>
            ))}
          </div>

          <div className="flex items-center gap-4 mt-3 text-sm text-gray-500">
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {tool.avgLatency}ms
            </span>
            <span className="flex items-center gap-1">
              <Zap className="w-3 h-3" />
              {tool.totalCalls.toLocaleString()} calls
            </span>
            <span className="text-xs">via {tool.facilitator}</span>
          </div>
        </CardHeader>

        <CardContent className="pt-0">
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="w-full justify-between mt-2">
              <span className="flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                Integration Snippets
              </span>
              {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </Button>
          </CollapsibleTrigger>

          <CollapsibleContent className="mt-4">
            <Tabs defaultValue="openai">
              <TabsList className="w-full">
                <TabsTrigger value="openai" className="flex-1">
                  OpenAI
                </TabsTrigger>
                <TabsTrigger value="anthropic" className="flex-1">
                  Anthropic
                </TabsTrigger>
                <TabsTrigger value="langchain" className="flex-1">
                  LangChain
                </TabsTrigger>
              </TabsList>

              <TabsContent value="openai" className="mt-4">
                <CodeBlock code={generateOpenAISnippet(tool)} />
              </TabsContent>

              <TabsContent value="anthropic" className="mt-4">
                <CodeBlock code={generateAnthropicSnippet(tool)} />
              </TabsContent>

              <TabsContent value="langchain" className="mt-4">
                <CodeBlock code={generateLangChainSnippet(tool)} />
              </TabsContent>
            </Tabs>

            {tool.examples && tool.examples.length > 0 && (
              <div className="mt-4 p-4 rounded-lg bg-purple-50 dark:bg-purple-900/20">
                <h4 className="font-medium mb-2 flex items-center gap-2">
                  <Play className="w-4 h-4" />
                  Example
                </h4>
                <div className="grid md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Input:</p>
                    <pre className="p-2 rounded bg-white dark:bg-gray-900 text-xs overflow-x-auto">
                      {JSON.stringify(tool.examples[0].input, null, 2)}
                    </pre>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Output:</p>
                    <pre className="p-2 rounded bg-white dark:bg-gray-900 text-xs overflow-x-auto">
                      {JSON.stringify(tool.examples[0].output, null, 2)}
                    </pre>
                  </div>
                </div>
              </div>
            )}

            <div className="flex gap-2 mt-4">
              <Button variant="outline" size="sm" asChild>
                <a href={tool.url} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="w-3 h-3 mr-1" />
                  API Docs
                </a>
              </Button>
              <Button size="sm">
                <Zap className="w-3 h-3 mr-1" />
                Try It
              </Button>
            </div>
          </CollapsibleContent>
        </CardContent>
      </Collapsible>
    </Card>
  )
}

// =====================================================
// MAIN PAGE
// =====================================================

const CATEGORIES = [
  'all',
  'text-generation',
  'code-generation',
  'summarization',
  'image-processing',
]

export default function AIToolsPage(): React.JSX.Element {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')

  const filteredTools = useMemo(() => {
    return MOCK_TOOLS.filter((tool) => {
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        if (
          !tool.name.toLowerCase().includes(query) &&
          !tool.description.toLowerCase().includes(query) &&
          !tool.capabilities.some((c) => c.toLowerCase().includes(query))
        ) {
          return false
        }
      }
      if (selectedCategory !== 'all' && tool.category !== selectedCategory) {
        return false
      }
      return true
    })
  }, [searchQuery, selectedCategory])

  return (
    <div className="min-h-screen bg-linear-to-br from-purple-50 via-white to-blue-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-900">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold gradient-text mb-2 flex items-center gap-3">
            <Sparkles className="w-8 h-8" />
            AI Tools Marketplace
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            x402-enabled tools ready for AI agent integration
          </p>
        </div>

        {/* Installation */}
        <Card className="mb-6 bg-linear-to-r from-purple-500/10 to-blue-500/10 border-purple-200/50 dark:border-purple-800/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Install the GhostSpeak SDK</p>
                <code className="text-sm text-purple-600 dark:text-purple-400">
                  npm install @ghostspeak/sdk
                </code>
              </div>
              <CopyButton text="npm install @ghostspeak/sdk" />
            </div>
          </CardContent>
        </Card>

        {/* Search & Filter */}
        <div className="flex gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search tools by name or capability..."
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-48">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIES.map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {cat === 'all' ? 'All Categories' : cat.replace('-', ' ')}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <Card className="bg-white/50 dark:bg-gray-900/50">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-purple-600">{MOCK_TOOLS.length}</p>
              <p className="text-sm text-gray-500">Available Tools</p>
            </CardContent>
          </Card>
          <Card className="bg-white/50 dark:bg-gray-900/50">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-blue-600">3</p>
              <p className="text-sm text-gray-500">AI Platforms</p>
            </CardContent>
          </Card>
          <Card className="bg-white/50 dark:bg-gray-900/50">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-green-600">$0.001</p>
              <p className="text-sm text-gray-500">Min Price</p>
            </CardContent>
          </Card>
        </div>

        {/* Tools List */}
        <div className="space-y-4">
          {filteredTools.map((tool) => (
            <ToolCard key={tool.id} tool={tool} />
          ))}
        </div>

        {filteredTools.length === 0 && (
          <Card className="bg-white/70 dark:bg-gray-900/70">
            <CardContent className="p-8 text-center">
              <Sparkles className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No tools found matching your criteria</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
