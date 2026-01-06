/**
 * ElizaOS Agent Runtime
 *
 * Initializes Casper agent with GhostSpeak plugins for credential verification
 * and AI inference via Vercel AI Gateway
 */

import { AgentRuntime, IAgentRuntime, Memory, IDatabaseAdapter } from '@elizaos/core'
import { aiGatewayPlugin } from '@ghostspeak/plugin-gateway-ghost'
import { ghostspeakPlugin } from '@ghostspeak/plugin-elizaos'
import mcpPlugin from '@elizaos/plugin-mcp'
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

  async close(): Promise<void> {}

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
  async removeMemory(memoryId: string, tableName?: string): Promise<void> {}
  async removeAllMemories(roomId: string, tableName?: string): Promise<void> {}
  async countMemories(roomId: string, unique?: boolean, tableName?: string): Promise<number> {
    return 0
  }

  // Goals, rooms, participants - minimal implementation for stateless chat
  async getGoals(params: any): Promise<any[]> {
    return []
  }
  async updateGoal(goal: any): Promise<void> {}
  async createGoal(goal: any): Promise<void> {}
  async removeGoal(goalId: string): Promise<void> {}
  async removeAllGoals(roomId: string): Promise<void> {}

  async getRoom(roomId: string): Promise<any | null> {
    return { id: roomId }
  }
  async createRoom(roomId?: string): Promise<string> {
    return roomId || `room-${Date.now()}`
  }
  async removeRoom(roomId: string): Promise<void> {}

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
  ): Promise<void> {}
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
  async updateRelationship(relationship: any): Promise<void> {}

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
    return []
  }
  async updateMemory(memory: any): Promise<boolean> {
    return true
  }
  async deleteMemory(memoryId: any): Promise<void> {}
  async deleteManyMemories(memoryIds: any[]): Promise<void> {}
  async deleteAllMemories(roomId: string, tableName: string): Promise<void> {}

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
  async updateEntity(entity: any): Promise<void> {}

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
  async updateComponent(component: any): Promise<void> {}
  async deleteComponent(componentId: any): Promise<void> {}

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
  async ensureEmbeddingDimension(dimension: number): Promise<void> {}

  async log(params: any): Promise<void> {}
  async getLogs(params: any): Promise<any[]> {
    return []
  }
  async deleteLog(logId: any): Promise<void> {}

  async createWorld(world: any): Promise<any> {
    return world.id || `world-${Date.now()}`
  }
  async getWorld(id: any): Promise<any | null> {
    return { id }
  }
  async removeWorld(id: any): Promise<void> {}
  async getAllWorlds(): Promise<any[]> {
    return []
  }
  async updateWorld(world: any): Promise<void> {}
  async getRoomsByIds(roomIds: any[]): Promise<any[] | null> {
    return roomIds.map((id) => ({ id }))
  }
  async createRooms(rooms: any[]): Promise<any[]> {
    return rooms.map((r) => r.id || `room-${Date.now()}`)
  }
  async deleteRoom(roomId: any): Promise<void> {}
  async deleteRoomsByWorldId(worldId: any): Promise<void> {}
  async updateRoom(room: any): Promise<void> {}
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
  async updateTask(taskId: any, task: any): Promise<void> {}
  async deleteTask(taskId: any): Promise<void> {}
  async getTasksByName(name: string): Promise<any[]> {
    return []
  }
  async deleteTasks(params: any): Promise<void> {}
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
      plugins: [sqlPlugin, ghostspeakPlugin, aiGatewayPlugin, mcpPlugin],
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
    console.log('📝 Registered 9 web-app actions including evaluateAgentTokens')

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
}): Promise<{
  text: string
  action?: string
  metadata?: any
}> {
  try {
    const runtime = await getAgentRuntime()
    const roomId = params.roomId || `user-${params.userId}`

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
      },
      createdAt: Date.now(),
    } as Memory

    console.log('📨 Processing message:', params.message)
    console.log('🏠 Room ID:', roomId)

    // Track response
    let responseText = ''
    let triggeredAction: string | undefined
    let actionMetadata: any = {}

    // Evaluate all actions directly
    for (const action of runtime.actions) {
      try {
        const isValid = await action.validate(runtime, memory, undefined)

        if (isValid) {
          console.log(`✅ Action validated: ${action.name}`)

          // Track temporary response from callback
          let tempResponseText = ''
          let tempMetadata = {}

          // Execute action
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

          // Only keep the response if action succeeded
          if (result && result.success) {
            responseText = tempResponseText
            actionMetadata = tempMetadata
            triggeredAction = action.name
            if (result.data) {
              actionMetadata = { ...actionMetadata, ...result.data }
            }
            console.log(`🎯 Action executed successfully: ${action.name}`)
            break // First successful action wins
          } else {
            console.log(`⚠️ Action ${action.name} executed but returned success: false`)
          }
        }
      } catch (error) {
        console.error(`❌ Error in action ${action.name}:`, error)
      }
    }

    // If no action matched, generate a conversational response using the LLM
    if (!responseText) {
      console.log('💬 No action triggered, generating conversational response...')

      try {
        // Build a rich prompt with context about Caisper's knowledge
        const prompt = `You are Caisper, GhostSpeak's credential and reputation verification ghost. 
Answer this user question conversationally, with personality. You know about:

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

User message: ${params.message}

Respond in character as Caisper - be helpful, slightly sarcastic, use ghost puns sparingly. If they're asking HOW something works, explain it. If they want to CHECK something specific, ask for an agent address.`

        const result = await runtime.generateText(prompt, {
          includeCharacter: true,
        })

        responseText =
          result?.text ||
          "I'm having trouble formulating a response. Try asking me something specific about agents, credentials, or reputation!"
        console.log('✅ Generated conversational response')
      } catch (error) {
        console.error('❌ Error generating LLM response:', error)
        responseText =
          "I'm having some technical difficulties right now. Try asking me about available agents or credential verification!"
      }
    }

    console.log('✅ Message processed:', {
      hasAction: !!triggeredAction,
      action: triggeredAction,
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
    console.error('❌ Error processing agent message:', error)
    throw new Error('Failed to process message with agent')
  }
}
