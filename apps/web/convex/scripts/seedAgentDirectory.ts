/**
 * Seed Agent Directory Data
 *
 * Run with: npx convex run scripts/seedAgentDirectory:seedAgents
 */

import { mutation } from '../_generated/server'

// Sample agents with real-looking data
const SEED_AGENTS = [
  {
    name: 'CodePhantom',
    ghostAddress: 'CodePh4nt0mAuditReviewAI111111111111111111111',
    specialty: 'Code Review & Audits',
    baseUrl: 'codephantom.ghostspeak.ai',
    endpoints: [
      {
        endpoint: 'https://codephantom.ghostspeak.ai/api/v1/review',
        method: 'POST',
        priceUsdc: 0.05,
        description: 'AI-powered code review with security analysis',
        category: 'research',
      },
      {
        endpoint: 'https://codephantom.ghostspeak.ai/api/v1/audit',
        method: 'POST',
        priceUsdc: 0.15,
        description: 'Deep security audit for smart contracts',
        category: 'research',
      },
    ],
  },
  {
    name: 'DataWraith',
    ghostAddress: 'DataWra1thAnalyticsInsightsAI11111111111111',
    specialty: 'Analytics & Insights',
    baseUrl: 'datawraith.ghostspeak.ai',
    endpoints: [
      {
        endpoint: 'https://datawraith.ghostspeak.ai/api/v1/analyze',
        method: 'POST',
        priceUsdc: 0.03,
        description: 'Data analysis and pattern recognition',
        category: 'market_data',
      },
      {
        endpoint: 'https://datawraith.ghostspeak.ai/api/v1/report',
        method: 'POST',
        priceUsdc: 0.08,
        description: 'Generate comprehensive analytics reports',
        category: 'market_data',
      },
    ],
  },
  {
    name: 'LegalSpectre',
    ghostAddress: 'Legal5pectreContractAnalysisAI1111111111111',
    specialty: 'Contract Analysis',
    baseUrl: 'legalspectre.ghostspeak.ai',
    endpoints: [
      {
        endpoint: 'https://legalspectre.ghostspeak.ai/api/v1/review',
        method: 'POST',
        priceUsdc: 0.1,
        description: 'AI contract review and risk assessment',
        category: 'research',
      },
    ],
  },
  {
    name: 'PixelPoltergeist',
    ghostAddress: 'P1xelPolterge1stImageGenAI111111111111111111',
    specialty: 'Image Generation',
    baseUrl: 'pixelpolt.ghostspeak.ai',
    endpoints: [
      {
        endpoint: 'https://pixelpolt.ghostspeak.ai/api/v1/generate',
        method: 'POST',
        priceUsdc: 0.02,
        description: 'AI image generation from text prompts',
        category: 'utility',
      },
      {
        endpoint: 'https://pixelpolt.ghostspeak.ai/api/v1/edit',
        method: 'POST',
        priceUsdc: 0.03,
        description: 'AI-powered image editing and enhancement',
        category: 'utility',
      },
    ],
  },
  {
    name: 'SynthBanshee',
    ghostAddress: 'SynthBansheeAudioProcessingAI11111111111111',
    specialty: 'Audio Processing',
    baseUrl: 'synthbanshee.ghostspeak.ai',
    endpoints: [
      {
        endpoint: 'https://synthbanshee.ghostspeak.ai/api/v1/process',
        method: 'POST',
        priceUsdc: 0.04,
        description: 'Audio processing, enhancement, and transcription',
        category: 'utility',
      },
    ],
  },
  {
    name: 'NoviceNecro',
    ghostAddress: 'Nov1ceNecroGeneralAssistantAI11111111111111',
    specialty: 'General Assistant',
    baseUrl: 'novicenecro.ghostspeak.ai',
    endpoints: [
      {
        endpoint: 'https://novicenecro.ghostspeak.ai/api/v1/assist',
        method: 'POST',
        priceUsdc: 0.01,
        description: 'General purpose AI assistant',
        category: 'utility',
      },
    ],
  },
  {
    name: 'MarketOracle',
    ghostAddress: 'MarketOracleTokenAnalysisAI111111111111111',
    specialty: 'Token Analysis',
    baseUrl: 'marketoracle.ghostspeak.ai',
    endpoints: [
      {
        endpoint: 'https://marketoracle.ghostspeak.ai/api/v1/analyze-token',
        method: 'POST',
        priceUsdc: 0.05,
        description: 'Deep token analysis with on-chain metrics',
        category: 'market_data',
      },
      {
        endpoint: 'https://marketoracle.ghostspeak.ai/api/v1/price-feed',
        method: 'GET',
        priceUsdc: 0.001,
        description: 'Real-time price feeds for 1000+ tokens',
        category: 'market_data',
      },
    ],
  },
  {
    name: 'SocialSpecter',
    ghostAddress: 'Soc1alSpecterTrendAnalysisAI1111111111111111',
    specialty: 'Social Trend Analysis',
    baseUrl: 'socialspecter.ghostspeak.ai',
    endpoints: [
      {
        endpoint: 'https://socialspecter.ghostspeak.ai/api/v1/trends',
        method: 'GET',
        priceUsdc: 0.02,
        description: 'Real-time social media trend analysis',
        category: 'social',
      },
      {
        endpoint: 'https://socialspecter.ghostspeak.ai/api/v1/sentiment',
        method: 'POST',
        priceUsdc: 0.03,
        description: 'Sentiment analysis for tokens and projects',
        category: 'social',
      },
    ],
  },
]

export const seedAgents = mutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now()
    let agentsCreated = 0
    let endpointsCreated = 0

    for (const agent of SEED_AGENTS) {
      // Check if agent already exists
      const existing = await ctx.db
        .query('discoveredAgents')
        .withIndex('by_address', (q) => q.eq('ghostAddress', agent.ghostAddress))
        .first()

      if (!existing) {
        // Create discovered agent
        await ctx.db.insert('discoveredAgents', {
          ghostAddress: agent.ghostAddress,
          firstTxSignature: `seed_${agent.ghostAddress.slice(0, 8)}_${now}`,
          firstSeenTimestamp: now - Math.floor(Math.random() * 30 * 24 * 60 * 60 * 1000), // Random date within last 30 days
          discoverySource: 'account_scan', // Seed data treated as account scan
          slot: 300000000 + Math.floor(Math.random() * 1000000),
          blockTime: Math.floor(now / 1000) - Math.floor(Math.random() * 30 * 24 * 60 * 60),
          status: 'verified',
          createdAt: now,
          updatedAt: now,
        })
        agentsCreated++
      }

      // Add endpoints for this agent
      for (const ep of agent.endpoints) {
        // Check if endpoint already exists
        const existingEndpoint = await ctx.db
          .query('observedEndpoints')
          .withIndex('by_agent', (q) => q.eq('agentAddress', agent.ghostAddress))
          .filter((q) => q.eq(q.field('endpoint'), ep.endpoint))
          .first()

        if (!existingEndpoint) {
          // Normalize method and category to match schema types
          const method: 'GET' | 'POST' = ep.method.toUpperCase() === 'POST' ? 'POST' : 'GET'
          const validCategories = ['research', 'market_data', 'social', 'utility', 'other'] as const
          const category: 'research' | 'market_data' | 'social' | 'utility' | 'other' =
            validCategories.includes(ep.category as any) ? (ep.category as any) : 'other'

          await ctx.db.insert('observedEndpoints', {
            agentAddress: agent.ghostAddress,
            baseUrl: agent.baseUrl,
            endpoint: ep.endpoint,
            method,
            priceUsdc: ep.priceUsdc,
            description: ep.description,
            category,
            isActive: true,
            addedAt: now,
            // Add some sample test stats
            totalTests: Math.floor(Math.random() * 100) + 10,
            successfulTests: Math.floor(Math.random() * 80) + 10,
            avgResponseTimeMs: Math.floor(Math.random() * 500) + 100,
            avgQualityScore: Math.floor(Math.random() * 30) + 70, // 70-100 range
          })
          endpointsCreated++
        }
      }
    }

    return {
      success: true,
      agentsCreated,
      endpointsCreated,
      message: `Seeded ${agentsCreated} agents and ${endpointsCreated} endpoints`,
    }
  },
})

// Helper to clear all seeded data (for testing)
export const clearSeedData = mutation({
  args: {},
  handler: async (ctx) => {
    let deletedAgents = 0
    let deletedEndpoints = 0

    // Delete seeded agents (identified by seed_ prefix in signature)
    const agents = await ctx.db
      .query('discoveredAgents')
      .filter((q) => q.gte(q.field('firstTxSignature'), 'seed_'))
      .filter((q) => q.lt(q.field('firstTxSignature'), 'seed_~'))
      .collect()

    for (const agent of agents) {
      // Delete endpoints for this agent
      const endpoints = await ctx.db
        .query('observedEndpoints')
        .withIndex('by_agent', (q) => q.eq('agentAddress', agent.ghostAddress))
        .collect()

      for (const ep of endpoints) {
        await ctx.db.delete(ep._id)
        deletedEndpoints++
      }

      await ctx.db.delete(agent._id)
      deletedAgents++
    }

    return {
      success: true,
      deletedAgents,
      deletedEndpoints,
      message: `Cleared ${deletedAgents} agents and ${deletedEndpoints} endpoints`,
    }
  },
})
