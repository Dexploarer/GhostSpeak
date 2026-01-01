/**
 * External x402 Resource Fetching
 *
 * Fetches live x402 resources from external facilitators
 * to aggregate in the GhostSpeak marketplace
 */

import { fetchElizaOSResources } from './fetchElizaOSResources'

// =====================================================
// TYPES
// =====================================================

export interface ExternalResource {
  id: string
  url: string
  name: string
  description?: string
  category: string
  tags: string[]
  network: string
  priceUsd: string
  facilitator: string
  isActive: boolean
  isExternal: true
  availabilityStatus?: 'available' | 'coming_soon' | 'maintenance' | 'deprecated'
  statusMessage?: string
}

interface HeuristAgent {
  agentId: string
  author: string
  tools: {
    name: string
    path: string
    resourceUrl: string
    priceUsd: string
    network: string
  }[]
}

interface HeuristResponse {
  count: number
  agents: HeuristAgent[]
}

// =====================================================
// CATEGORY MAPPING
// =====================================================

const AGENT_CATEGORIES: Record<string, string> = {
  ExaSearchDigestAgent: 'web-scraping',
  FirecrawlSearchDigestAgent: 'web-scraping',
  CaesarResearchAgent: 'research',
  WanVideoGenAgent: 'video-generation',
  TwitterIntelligenceAgent: 'social-data',
  ElfaTwitterIntelligenceAgent: 'social-data',
  MoniTwitterInsightAgent: 'social-data',
  EtherscanAgent: 'blockchain-data',
  EvmTokenInfoAgent: 'blockchain-data',
  TokenResolverAgent: 'blockchain-data',
  TrendingTokenAgent: 'blockchain-data',
  PumpFunTokenAgent: 'blockchain-data',
  GoplusAnalysisAgent: 'security',
  ChainbaseAddressLabelAgent: 'blockchain-data',
  BaseUSDCForensicsAgent: 'blockchain-data',
  ZerionWalletAnalysisAgent: 'wallet-analysis',
  PondWalletAnalysisAgent: 'wallet-analysis',
  YahooFinanceAgent: 'finance',
  FundingRateAgent: 'defi',
  UnifaiWeb3NewsAgent: 'news',
  AIXBTProjectInfoAgent: 'research',
  SallyHealthAgent: 'other',
}

const AGENT_DESCRIPTIONS: Record<string, string> = {
  ExaSearchDigestAgent: 'Web search and URL scraping with AI-powered summaries',
  FirecrawlSearchDigestAgent: 'Web scraping, search, and data extraction',
  CaesarResearchAgent: 'Deep AI research reports on any topic',
  WanVideoGenAgent: 'Text-to-video and image-to-video generation',
  TwitterIntelligenceAgent: 'Twitter user timeline, tweet details, and search',
  ElfaTwitterIntelligenceAgent: 'Twitter mentions, account search, trending tokens',
  MoniTwitterInsightAgent: 'Smart Twitter mentions feed and categories',
  EtherscanAgent: 'Ethereum transaction details and token transfers',
  EvmTokenInfoAgent: 'Recent large trades for EVM tokens',
  TokenResolverAgent: 'Token search and profile information',
  TrendingTokenAgent: 'Get trending tokens across markets',
  PumpFunTokenAgent: 'Recent and graduated pump.fun tokens',
  GoplusAnalysisAgent: 'Token security analysis and audit details',
  ChainbaseAddressLabelAgent: 'Address labels and identification',
  BaseUSDCForensicsAgent: 'USDC forensics: funders, sinks, counterparties',
  ZerionWalletAnalysisAgent: 'Wallet token and NFT analysis',
  PondWalletAnalysisAgent: 'Ethereum and Base wallet analysis',
  YahooFinanceAgent: 'Stock price history and technical indicators',
  FundingRateAgent: 'Crypto funding rates and arbitrage opportunities',
  UnifaiWeb3NewsAgent: 'Latest Web3 and crypto news',
  AIXBTProjectInfoAgent: 'Crypto project search and market summary',
  SallyHealthAgent: 'Health advice from AI',
}

// =====================================================
// HEURIST MESH FETCHER
// =====================================================

const HEURIST_MESH_URL = 'https://mesh.heurist.xyz/x402/agents'
const CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes

let cachedHeuristResources: ExternalResource[] | null = null
let cacheTimestamp = 0

export async function fetchHeuristResources(): Promise<ExternalResource[]> {
  // Return cached if fresh
  if (cachedHeuristResources && Date.now() - cacheTimestamp < CACHE_TTL_MS) {
    return cachedHeuristResources
  }

  try {
    const response = await fetch(HEURIST_MESH_URL, {
      next: { revalidate: 300 }, // Next.js cache for 5 min
    })

    if (!response.ok) {
      console.error('Failed to fetch Heurist resources:', response.status)
      return cachedHeuristResources ?? []
    }

    const data = (await response.json()) as HeuristResponse

    const resources: ExternalResource[] = data.agents.flatMap((agent) =>
      agent.tools.map((tool) => ({
        id: `heurist_${agent.agentId}_${tool.name}`,
        url: tool.resourceUrl,
        name: `${agent.agentId.replace(/Agent$/, '')} - ${formatToolName(tool.name)}`,
        description: AGENT_DESCRIPTIONS[agent.agentId] ?? `${agent.agentId} ${tool.name}`,
        category: AGENT_CATEGORIES[agent.agentId] ?? 'other',
        tags: [agent.agentId, tool.name, 'heurist', 'ai'],
        network: tool.network,
        priceUsd: tool.priceUsd,
        facilitator: 'heurist',
        isActive: true,
        isExternal: true as const,
      }))
    )

    cachedHeuristResources = resources
    cacheTimestamp = Date.now()

    return resources
  } catch (error) {
    console.error('Error fetching Heurist resources:', error)
    return cachedHeuristResources ?? []
  }
}

function formatToolName(name: string): string {
  return name.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

// =====================================================
// STATIC EXTERNAL RESOURCES (Other services)
// =====================================================

export const STATIC_EXTERNAL_RESOURCES: ExternalResource[] = [
  {
    id: 'firecrawl_search',
    url: 'https://api.firecrawl.dev/v1/x402/search',
    name: 'Firecrawl - Web Search',
    description: 'Search and scrape websites for LLM-ready data',
    category: 'web-scraping',
    tags: ['firecrawl', 'scraping', 'search', 'ai'],
    network: 'base',
    priceUsd: '0.01',
    facilitator: 'firecrawl',
    isActive: true,
    isExternal: true,
  },
  {
    id: 'firecrawl_scrape',
    url: 'https://api.firecrawl.dev/v1/x402/scrape',
    name: 'Firecrawl - URL Scraper',
    description: 'Turn any website into clean, LLM-ready markdown',
    category: 'web-scraping',
    tags: ['firecrawl', 'scraping', 'markdown', 'ai'],
    network: 'base',
    priceUsd: '0.005',
    facilitator: 'firecrawl',
    isActive: true,
    isExternal: true,
  },
  {
    id: 'pinata_ipfs',
    url: 'https://gateway.pinata.cloud/x402',
    name: 'Pinata - IPFS Storage',
    description: 'Account-free IPFS uploads and retrievals with crypto payments',
    category: 'storage',
    tags: ['pinata', 'ipfs', 'storage', 'decentralized'],
    network: 'base',
    priceUsd: 'varies',
    facilitator: 'pinata',
    isActive: true,
    isExternal: true,
  },
]

// =====================================================
// AGGREGATE ALL RESOURCES
// =====================================================

export async function fetchAllExternalResources(): Promise<ExternalResource[]> {
  const [heuristResources, elizaOSResources] = await Promise.all([
    fetchHeuristResources(),
    fetchElizaOSResources(),
    // Add more fetchers here as we integrate more services
  ])

  console.log('[ExternalResources] Aggregated resources:', {
    heurist: heuristResources.length,
    elizaOS: elizaOSResources.length,
    static: STATIC_EXTERNAL_RESOURCES.length,
    total: heuristResources.length + elizaOSResources.length + STATIC_EXTERNAL_RESOURCES.length,
  })

  return [...heuristResources, ...elizaOSResources, ...STATIC_EXTERNAL_RESOURCES]
}
