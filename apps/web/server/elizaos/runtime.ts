/**
 * ElizaOS Agent Runtime
 *
 * Initializes Casper agent with GhostSpeak plugins for credential verification
 * and AI inference via Vercel AI Gateway
 */

import { AgentRuntime, IAgentRuntime, Memory, IDatabaseAdapter } from '@elizaos/core'
import { aiGatewayPlugin } from '@ghostspeak/plugin-gateway-ghost'
import { ghostspeakPlugin } from '@ghostspeak/plugin-elizaos'
// import mcpPlugin from '@elizaos/plugin-mcp' // Disabled: Internal agent uses direct actions
import sqlPlugin from '@elizaos/plugin-sql'
import CaisperCharacter from './Caisper.json' assert { type: 'json' }
import { ConvexHttpClient } from 'convex/browser'
import { api } from '@/convex/_generated/api'

// Web-app-specific actions
import { discoverAgentsAction } from './actions/discoverAgents'
import { claimAgentAction } from './actions/claimAgent'
import { queryX402AgentAction } from './actions/queryX402Agent'
import { ghostScoreAction } from './actions/ghostScore'
import { getCredentialsAction } from './actions/getCredentials'
import { issueCredentialAction } from './actions/issueCredential'
import { trustAssessmentAction } from './actions/trustAssessment'
import { agentDirectoryAction } from './actions/agentDirectory'
import { evaluateAgentTokensAction } from './actions/evaluateAgentTokens'
import { scoreHistoryAction } from './actions/scoreHistory'
import { generateOuijaAction } from './actions/generateOuija'
import { getUserPortfolioAction } from './actions/getUserPortfolio'

// Wide Event Logging
import { createRequestEvent, emitWideEvent, WideEvent } from '@/lib/logging/wide-event'

// Convex database adapter for ElizaOS
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-empty-function */
class ConvexDatabaseAdapter implements IDatabaseAdapter {
  private convex: ConvexHttpClient

  // Required: db property
  db: unknown

  constructor() {
    this.convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!)
    this.db = this.convex
  }

  // Required: lifecycle methods
  async isReady(): Promise<boolean> {
    return true // Convex HTTP client is always ready
  }

  async getConnection(): Promise<unknown> {
    return this.convex
  }

  async initialize(config?: Record<string, string | number | boolean | null>): Promise<void> {
    console.log('📦 Convex database adapter initialized')
  }

  async init(): Promise<void> {
    console.log('📦 Convex database adapter initialized')
  }

  async close(): Promise<void> { }

  // Memories are stored in Convex agentMessages table
  async getMemories(params: any): Promise<any[]> {
    try {
      const { roomId, count = 10 } = params

      if (!roomId) {
        return []
      }

      // Extract wallet address from roomId (format: "user-<walletAddress>")
      const walletAddress = roomId.replace('user-', '')

      // Fetch messages from Convex
      const messages = await this.convex.query(api.agent.getChatHistory, {
        walletAddress,
        limit: count,
      })

      // Convert to ElizaOS Memory format
      return messages.map((msg: any) => ({
        userId: walletAddress,
        agentId: 'caisper',
        roomId: roomId,
        content: {
          text: msg.content,
          role: msg.role,
          actionTriggered: msg.actionTriggered,
          metadata: msg.metadata,
        },
        createdAt: msg.timestamp,
      }))
    } catch (error) {
      console.error('Error getting memories from Convex:', error)
      return []
    }
  }

  async getMemoriesByRoomIds(params: any): Promise<any[]> {
    return []
  }
  async getMemoriesByWorldId(worldId: any): Promise<any[]> {
    return []
  }
  async getMemoryById(id: string): Promise<any | null> {
    return null
  }
  async createMemory(
    memory: any,
    tableName?: string
  ): Promise<`${string}-${string}-${string}-${string}-${string}`> {
    // Memories are already being stored via storeUserMessage/storeAgentResponse
    // Return a UUID as required by the interface
    return crypto.randomUUID() as `${string}-${string}-${string}-${string}-${string}`
  }
  async removeMemory(memoryId: string, tableName?: string): Promise<void> { }
  async removeAllMemories(roomId: string, tableName?: string): Promise<void> { }
  async countMemories(roomId: string, unique?: boolean, tableName?: string): Promise<number> {
    return 0
  }

  // Goals, rooms, participants - minimal implementation for stateless chat
  async getGoals(params: any): Promise<any[]> {
    return []
  }
  async updateGoal(goal: any): Promise<void> { }
  async createGoal(goal: any): Promise<void> { }
  async removeGoal(goalId: string): Promise<void> { }
  async removeAllGoals(roomId: string): Promise<void> { }

  async getRoom(roomId: string): Promise<any | null> {
    return { id: roomId }
  }
  async createRoom(roomId?: string): Promise<string> {
    return roomId || `room-${Date.now()}`
  }
  async removeRoom(roomId: string): Promise<void> { }

  async getRoomsForParticipant(userId: string): Promise<any[]> {
    return []
  }
  async getRoomsForParticipants(userIds: string[]): Promise<any[]> {
    return []
  }
  async addParticipant(userId: string, roomId: string): Promise<boolean> {
    return true
  }
  async removeParticipant(userId: string, roomId: string): Promise<boolean> {
    return true
  }
  async getParticipantsForAccount(userId: string): Promise<any[]> {
    return []
  }
  async getParticipantUserState(
    roomId: string,
    userId: string
  ): Promise<'FOLLOWED' | 'MUTED' | null> {
    return null
  }
  async setParticipantUserState(
    roomId: string,
    userId: string,
    state: 'FOLLOWED' | 'MUTED' | null
  ): Promise<void> { }
  async getParticipantsForRoom(roomId: string): Promise<any[]> {
    return []
  }

  async getRelationship(params: any): Promise<any | null> {
    return null
  }
  async getRelationships(params: any): Promise<any[]> {
    return []
  }
  async createRelationship(params: any): Promise<boolean> {
    return true
  }
  async updateRelationship(relationship: any): Promise<void> { }

  async getCache<T>(key: string): Promise<T | undefined> {
    return undefined
  }
  async setCache<T>(key: string, value: T): Promise<boolean> {
    return true
  }
  async deleteCache(key: string): Promise<boolean> {
    return true
  }

  async getAccountById(userId: string): Promise<any | null> {
    // Users are stored in Convex users table
    return { id: userId }
  }
  async createAccount(account: any): Promise<boolean> {
    return true
  }

  async getActorById(params: any): Promise<any[]> {
    return []
  }
  async getActorDetails(params: any): Promise<any[]> {
    return []
  }

  // Additional required methods for full IDatabaseAdapter compliance
  async getMemoriesByIds(ids: any[], tableName?: string): Promise<any[]> {
    return []
  }
  async searchMemories(params: any): Promise<any[]> {
    try {
      const { roomId, query, count = 10, namespace = 'docs' } = params

      console.log(
        `🔍 ConvexDatabaseAdapter: Searching memories for "${query}" in namespace ${namespace}`
      )

      // Call the Convex searchContext action
      const { results } = await this.convex.action(api.agent.searchContext, {
        query: query,
        namespace,
        limit: count,
      })

      // Convert RAG results to ElizaOS Memory format
      return results.map((res: any) => ({
        id: res.id,
        userId: 'system',
        agentId: 'caisper',
        roomId: roomId || 'global',
        content: {
          text: res.text,
          metadata: {
            ...res.metadata,
            score: res.score,
          },
        },
        createdAt: res.metadata?.ingestedAt || Date.now(),
      }))
    } catch (error) {
      console.error('Error searching memories in Convex:', error)
      return []
    }
  }
  async updateMemory(memory: any): Promise<boolean> {
    return true
  }
  async deleteMemory(memoryId: any): Promise<void> { }
  async deleteManyMemories(memoryIds: any[]): Promise<void> { }
  async deleteAllMemories(roomId: string, tableName: string): Promise<void> { }

  async getEntitiesByIds(entityIds: any[]): Promise<any[] | null> {
    // Return entity objects for elizaOS v1.7.0
    // The runtime expects to find the agent as an entity
    return entityIds.map((id) => ({
      id,
      name: 'Caisper',
      type: 'agent',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      metadata: {},
    }))
  }
  async getEntitiesForRoom(roomId: any, includeComponents?: boolean): Promise<any[]> {
    return []
  }
  async createEntities(entities: any[]): Promise<boolean> {
    return true
  }
  async updateEntity(entity: any): Promise<void> { }

  async getComponent(
    entityId: any,
    type: string,
    worldId?: any,
    sourceEntityId?: any
  ): Promise<any | null> {
    return null
  }
  async getComponents(entityId: any, worldId?: any, sourceEntityId?: any): Promise<any[]> {
    return []
  }
  async createComponent(component: any): Promise<boolean> {
    return true
  }
  async updateComponent(component: any): Promise<void> { }
  async deleteComponent(componentId: any): Promise<void> { }

  async getAgent(agentId: any): Promise<any | null> {
    // Return a proper Agent object for elizaOS v1.7.0
    return {
      id: agentId,
      name: 'Caisper',
      username: 'caisper',
      system: 'You are Caisper, a helpful AI assistant for GhostSpeak.',
      bio: ['Caisper is a friendly AI assistant that helps users discover and claim AI agents.'],
      plugins: [],
      settings: {},
      createdAt: Date.now(),
      updatedAt: Date.now(),
      enabled: true,
      status: 'active',
    }
  }
  async getAgents(): Promise<any[]> {
    return []
  }
  async createAgent(agent: any): Promise<boolean> {
    return true
  }
  async updateAgent(agentId: any, agent: any): Promise<boolean> {
    return true
  }
  async deleteAgent(agentId: any): Promise<boolean> {
    return true
  }
  async ensureEmbeddingDimension(dimension: number): Promise<void> {
    console.log(`📏 ConvexDatabaseAdapter: Ensuring embedding dimension ${dimension}`)
    // GhostSpeak uses Gateway-Ghost with 3072 dimensions (openai/text-embedding-3-large)
  }

  async log(params: any): Promise<void> { }
  async getLogs(params: any): Promise<any[]> {
    return []
  }
  async deleteLog(logId: any): Promise<void> { }

  async createWorld(world: any): Promise<any> {
    return world.id || `world-${Date.now()}`
  }
  async getWorld(id: any): Promise<any | null> {
    return { id }
  }
  async removeWorld(id: any): Promise<void> { }
  async getAllWorlds(): Promise<any[]> {
    return []
  }
  async updateWorld(world: any): Promise<void> { }
  async getRoomsByIds(roomIds: any[]): Promise<any[] | null> {
    return roomIds.map((id) => ({ id }))
  }
  async createRooms(rooms: any[]): Promise<any[]> {
    return rooms.map((r) => r.id || `room-${Date.now()}`)
  }
  async deleteRoom(roomId: any): Promise<void> { }
  async deleteRoomsByWorldId(worldId: any): Promise<void> { }
  async updateRoom(room: any): Promise<void> { }
  async getRoomsByWorld(worldId: any): Promise<any[]> {
    return []
  }

  // Participant methods required by v1.7.0
  async getParticipantsForEntity(entityId: any): Promise<any[]> {
    return []
  }
  async isRoomParticipant(roomId: any, entityId: any): Promise<boolean> {
    return false
  }
  async addParticipantsRoom(entityIds: any[], roomId: any): Promise<boolean> {
    return true
  }

  async getCachedEmbeddings(params: any): Promise<any[]> {
    return []
  }

  // Task management methods required by v1.7.0
  async createTask(task: any): Promise<any> {
    return task.id || crypto.randomUUID()
  }
  async getTasks(params: any): Promise<any[]> {
    return []
  }
  async getTask(taskId: any): Promise<any | null> {
    return null
  }
  async updateTask(taskId: any, task: any): Promise<void> { }
  async deleteTask(taskId: any): Promise<void> { }
  async getTasksByName(name: string): Promise<any[]> {
    return []
  }
  async deleteTasks(params: any): Promise<void> { }
}
/* eslint-enable @typescript-eslint/no-explicit-any */
/* eslint-enable @typescript-eslint/no-unused-vars */
/* eslint-enable @typescript-eslint/no-empty-function */

// Singleton instance
let agentRuntime: IAgentRuntime | null = null

/**
 * Initialize Casper agent runtime
 */
export async function initializeAgent(): Promise<IAgentRuntime> {
  if (agentRuntime) {
    return agentRuntime
  }

  try {
    console.log('🚀 Initializing Casper agent runtime...')

    // Validate required environment variables
    const requiredEnvVars = ['AI_GATEWAY_API_KEY']
    for (const envVar of requiredEnvVars) {
      if (!process.env[envVar]) {
        throw new Error(`Missing required environment variable: ${envVar}`)
      }
    }

    // Create Convex database adapter
    const databaseAdapter = new ConvexDatabaseAdapter()
    await databaseAdapter.init()

    // Create runtime with Casper character and plugins
    // Using SQL plugin (required by ElizaOS) + GhostSpeak + AI Gateway plugins
    const runtime = new AgentRuntime({
      // @ts-ignore - Character JSON matches ICharacter interface
      character: CaisperCharacter,
      plugins: [sqlPlugin, ghostspeakPlugin, aiGatewayPlugin], // Removed mcpPlugin for internal runtime
      adapter: databaseAdapter,
      // Settings is Record<string, string> in v1.7.0
      settings: {
        AI_GATEWAY_API_KEY: process.env.AI_GATEWAY_API_KEY!,
        SOLANA_RPC_URL: process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.devnet.solana.com',
        CONVEX_URL: process.env.NEXT_PUBLIC_CONVEX_URL || '',
      },
    })

    // Initialize runtime
    await runtime.initialize()

    // Register web-app-specific actions
    runtime.registerAction(discoverAgentsAction)
    runtime.registerAction(claimAgentAction)
    runtime.registerAction(queryX402AgentAction)
    runtime.registerAction(ghostScoreAction)
    runtime.registerAction(getCredentialsAction)
    runtime.registerAction(issueCredentialAction)
    runtime.registerAction(trustAssessmentAction)
    runtime.registerAction(agentDirectoryAction)
    runtime.registerAction(evaluateAgentTokensAction)
    runtime.registerAction(scoreHistoryAction)
    runtime.registerAction(generateOuijaAction)
    runtime.registerAction(getUserPortfolioAction)
    console.log('📝 Registered 12 web-app actions including Portfolio')

    agentRuntime = runtime
    console.log('✅ Casper agent initialized successfully')

    return runtime
  } catch (error) {
    console.error('❌ Failed to initialize agent:', error)
    throw error
  }
}

/**
 * Get existing agent runtime or initialize new one
 */
export async function getAgentRuntime(): Promise<IAgentRuntime> {
  if (!agentRuntime) {
    return await initializeAgent()
  }
  return agentRuntime
}

/**
 * Process message with Casper agent
 * Directly evaluates actions to bypass database adapter requirements
 */
export async function processAgentMessage(params: {
  userId: string
  message: string
  roomId?: string
  correlationId?: string
}): Promise<{
  text: string
  action?: string
  metadata?: any
}> {
  const startTime = Date.now()
  const { correlationId } = params
  const runtime = await getAgentRuntime()
  const roomId = params.roomId || `user-${params.userId}`

  // Create wide event for agent interaction
  const wideEvent = createRequestEvent({
    method: 'POST',
    path: '/api/agent/chat',
    userId: params.userId,
    sessionId: roomId,
  })

  // Add correlation ID for cross-service tracing
  if (correlationId) {
    wideEvent.correlation_id = correlationId
  }

  // Enrich with agent context
  wideEvent.service = 'elizaos-agent'
  wideEvent.metadata = {
    agent_interaction: true,
    message_length: params.message.length,
    room_id: roomId,
  }

  try {
    // Create memory object for the current message
    // Use type assertion for UUIDs since web app uses wallet addresses as IDs
    const memory = {
      userId: params.userId,
      agentId: runtime.agentId,
      roomId: roomId,
      entityId: params.userId, // v1.7.0 uses entityId
      content: {
        text: params.message,
        source: 'web-chat',
        walletAddress: params.userId, // Expose wallet address to actions
      },
      createdAt: Date.now(),
    } as Memory

    console.log('📨 Processing agent message:', params.message)
    console.log('🏠 Room ID:', roomId)

    // Track response
    let responseText = ''
    let triggeredAction: string | undefined
    let actionMetadata: any = {}
    let actionCount = 0
    const actionErrors: string[] = []

    // Evaluate all actions directly
    for (const action of runtime.actions) {
      actionCount++
      try {
        const isValid = await action.validate(runtime, memory, undefined)

        if (isValid) {
          console.log(`✅ Action validated: ${action.name}`)

          // Track temporary response from callback
          let tempResponseText = ''
          let tempMetadata = {}

          // Execute action
          const actionStartTime = Date.now()
          const result = await action.handler(
            runtime,
            memory,
            undefined,
            {},
            async (response: { text?: string; ui?: Record<string, unknown> }) => {
              tempResponseText = response.text || ''
              if (response.ui) {
                tempMetadata = response.ui
              }
              console.log('📤 Action callback response:', tempResponseText.substring(0, 100))
              return []
            }
          )
          const actionDuration = Date.now() - actionStartTime

          // Only keep the response if action succeeded
          if (result && result.success) {
            responseText = tempResponseText
            actionMetadata = tempMetadata
            triggeredAction = action.name
            if (result.data) {
              actionMetadata = { ...actionMetadata, ...result.data }
            }

            // Enrich wide event with successful action context
            wideEvent.metadata = {
              ...wideEvent.metadata,
              triggered_action: action.name,
              action_duration_ms: actionDuration,
              action_success: true,
              actions_evaluated: actionCount,
            }

            console.log(`🎯 Action executed successfully: ${action.name}`)
            break // First successful action wins
          } else {
            console.log(`⚠️ Action ${action.name} executed but returned success: false`)
            actionErrors.push(`${action.name}: returned success=false`)
          }
        }
      } catch (error) {
        const errorMsg = `Error in action ${action.name}: ${error instanceof Error ? error.message : String(error)}`
        console.error(`❌ ${errorMsg}`)
        actionErrors.push(errorMsg)
      }
    }

    // If no action matched, generate a conversational response using the LLM
    if (!responseText) {
      console.log('💬 No action triggered, generating conversational response...')

      // Perform RAG search for relevant context
      let ragContext = ''
      try {
        const searchResults = await (runtime as any).adapter.searchMemories({
          roomId: roomId,
          query: params.message,
          count: 5,
          namespace: 'docs',
        })

        if (searchResults && searchResults.length > 0) {
          ragContext =
            '\n\n**Relevant Context from GhostSpeak Documentation:**\n' +
            searchResults.map((res: any) => `- ${res.content.text}`).join('\n')
          console.log(`📚 Found ${searchResults.length} RAG results for prompt enrichment`)
        }
      } catch (searchError) {
        console.error('Error in conversational RAG search:', searchError)
      }

      const llmStartTime = Date.now()
      try {
        // Build a rich prompt with context about Caisper's knowledge
        const prompt = `You are Caisper, GhostSpeak's credential and reputation verification ghost.
Answer this user question conversationally, with personality. 

**User Context:**
- Wallet Address: ${params.userId}

**Knowledge Base:**
You know about:

**Ghost Score System (0-10000):**
- NEWCOMER: 0-1999 pts
- BRONZE: 2000-4999 pts
- SILVER: 5000-7499 pts
- GOLD: 7500-8999 pts
- PLATINUM: 9000-10000 pts
- Score sources: payment history, credentials, staking, endpoint quality, fraud clearance

**Credential Types (W3C Verifiable Credentials):**
1. Identity Credential - proves who the agent is
2. Capability Credential - proves what they can do
3. Reputation Credential - proves Ghost Score tier
4. Payment Credential - proves payment settlement history
5. Endorsement Credential - proves other agents vouch for them

**What you can do:**
- Check Ghost Scores for specific agents
- Verify credentials for agents
- Issue new credentials
- Run trust assessments (vibe checks)
- Discover available agents
- Query x402 endpoints
- Pull your own portfolio (stats, scores)

${ragContext}

User message: ${params.message}

Respond in character as Caisper - be helpful, slightly sarcastic, use ghost puns sparingly. If they're asking HOW something works, explain it. If they want to CHECK something specific, ask for an agent address. If they ask about their own identity or address, use the provided Wallet Address.`

        const result = await runtime.generateText(prompt, {
          includeCharacter: true,
        })

        const llmDuration = Date.now() - llmStartTime

        responseText =
          result?.text ||
          "I'm having trouble formulating a response. Try asking me something specific about agents, credentials, or reputation!"

        // Enrich wide event with LLM context
        wideEvent.metadata = {
          ...wideEvent.metadata,
          conversational_response: true,
          llm_duration_ms: llmDuration,
          actions_evaluated: actionCount,
          action_errors: actionErrors,
        }

        console.log('✅ Generated conversational response')
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error)
        console.error('❌ Error generating LLM response:', error)

        // Enrich wide event with LLM error
        wideEvent.error = {
          type: 'LLMGenerationError',
          code: 'LLM_RESPONSE_FAILED',
          message: errorMsg,
          retriable: true,
        }

        responseText =
          "I'm having some technical difficulties right now. Try asking me about available agents or credential verification!"
      }
    } else {
      // Action was triggered - enrich with action metadata
      wideEvent.metadata = {
        ...wideEvent.metadata,
        actions_evaluated: actionCount,
        action_errors: actionErrors.length > 0 ? actionErrors : undefined,
      }
    }

    const totalDuration = Date.now() - startTime

    // Complete and emit the wide event
    emitWideEvent({
      ...wideEvent,
      status_code: 200,
      duration_ms: totalDuration,
      outcome: 'success',
    })

    console.log('✅ Agent message processed:', {
      hasAction: !!triggeredAction,
      action: triggeredAction,
      duration: totalDuration,
    })

    return {
      text: responseText,
      action: triggeredAction,
      metadata: {
        type: actionMetadata.type, // Explicit type for UI card rendering
        triggeredAction,
        ...actionMetadata,
      },
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error)
    const totalDuration = Date.now() - startTime

    // Complete and emit the wide event with error
    emitWideEvent({
      ...wideEvent,
      status_code: 500,
      duration_ms: totalDuration,
      outcome: 'error',
      error: {
        type: 'AgentProcessingError',
        code: 'AGENT_MESSAGE_FAILED',
        message: errorMsg,
        stack:
          error instanceof Error && process.env.NODE_ENV === 'development'
            ? error.stack
            : undefined,
        retriable: true,
      },
    })

    console.error('❌ Error processing agent message:', error)
    throw new Error('Failed to process message with agent')
  }
}
