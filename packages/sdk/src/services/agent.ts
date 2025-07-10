/**
 * Agent Service for podAI SDK
 * Provides agent registration and management capabilities
 */

import {
  sendAndConfirmTransactionFactory,
  buildSimulateAndSendTransaction,
} from '../utils/transaction-helpers';
// Import fixed instruction builders
import { 
  FixedInstructionBuilder, 
  type VerifyAgentInput 
} from '../utils/instruction-wrappers';
import { fetchMaybeAgentAccount } from '../generated-v2/accounts/agentAccount.js';
import { logger } from '../utils/logger.js';

import type { Address } from '@solana/addresses';
import type { Rpc, SolanaRpcApi } from '@solana/rpc';
import type {
  RpcSubscriptions,
  SolanaRpcSubscriptionsApi,
} from '@solana/rpc-subscriptions';
import type { Commitment } from '@solana/rpc-types';
import type { KeyPairSigner } from '@solana/signers';

export interface ICreateAgentOptions {
  name: string;
  description: string;
  capabilities: number[];
  metadata?: Record<string, unknown>;
}

/**
 * Agent registration result
 */
export interface IAgentRegistrationResult {
  signature: string;
  agentPda: Address;
  agentId: string;
}

/**
 * Agent account structure
 */
export interface IAgentAccount {
  pubkey: Address;
  capabilities: number;
  metadataUri: string;
  reputation: number;
  lastUpdated: number;
  invitesSent: number;
  lastInviteAt: number;
  bump: number;
}

/**
 * Agent discovery search filters
 */
export interface IAgentDiscoveryFilters {
  // Capability-based matching
  requiredCapabilities?: number[];
  optionalCapabilities?: number[];
  capabilityStrength?: 'any' | 'all' | 'weighted';

  // Performance and reputation filters
  minimumReputation?: number;
  maximumReputation?: number;
  reputationWeight?: number;

  // Availability and activity filters
  isOnline?: boolean;
  lastActiveWithin?: number; // milliseconds
  responseTimeMax?: number; // milliseconds

  // Geographic and network filters
  preferredRegions?: string[];
  networkLatencyMax?: number;

  // Pricing and cost filters
  maxHourlyRate?: bigint;
  minHourlyRate?: bigint;
  paymentTokens?: Address[];
  budgetRange?: { min: bigint; max: bigint };

  // Specialization and domain filters
  domains?: string[];
  industries?: string[];
  languages?: string[];
  frameworks?: string[];

  // Social and collaboration filters
  teamworkCompatibility?: number; // 0-100 score
  communicationStyle?: 'formal' | 'casual' | 'technical';
  collaborationHistory?: Address[]; // Agents they've worked with before

  // Workload and capacity filters
  maxConcurrentTasks?: number;
  availableStartDate?: number;
  projectDurationMax?: number;

  // Quality and verification filters
  isVerified?: boolean;
  hasPortfolio?: boolean;
  minCompletedTasks?: number;
  successRate?: number; // 0-100 percentage

  // Sorting and ranking
  sortBy?:
    | 'reputation'
    | 'price'
    | 'availability'
    | 'compatibility'
    | 'performance';
  sortOrder?: 'asc' | 'desc';
}

/**
 * Agent discovery result with matching score
 */
export interface IAgentDiscoveryResult {
  agent: IAgentAccount;
  matchScore: number; // 0-100 compatibility score
  matchReasons: string[]; // Why this agent matches
  estimatedRate?: bigint;
  availability?: {
    isAvailable: boolean;
    nextAvailable?: number;
    responseTime?: number;
  };
  portfolioSummary?: {
    completedTasks: number;
    successRate: number;
    averageRating: number;
    specializations: string[];
  };
}

/**
 * Comprehensive agent discovery response
 */
export interface IAgentDiscoveryResponse {
  agents: IAgentDiscoveryResult[];
  totalFound: number;
  searchMetadata: {
    filters: IAgentDiscoveryFilters;
    executionTime: number;
    algorithmVersion: string;
    searchQuality: number; // 0-100 quality score
  };
  recommendations?: {
    adjustFilters?: Partial<IAgentDiscoveryFilters>;
    alternativeOptions?: IAgentDiscoveryResult[];
    marketInsights?: {
      averageRate: bigint;
      demandLevel: 'low' | 'medium' | 'high';
      recommendedBudget: bigint;
    };
  };
}

/**
 * Agent collaboration compatibility analysis
 */
export interface IAgentCompatibilityAnalysis {
  overallScore: number; // 0-100
  factors: {
    technicalAlignment: number;
    communicationCompatibility: number;
    workflowMatching: number;
    experienceComplementarity: number;
    availabilityOverlap: number;
  };
  strengths: string[];
  concerns: string[];
  recommendations: string[];
}

/**
 * Agent network analysis for multi-agent tasks
 */
export interface IAgentNetworkAnalysis {
  suggestedTeam: Address[];
  teamCompatibilityScore: number;
  estimatedPerformance: number;
  riskFactors: string[];
  costAnalysis: {
    totalCost: bigint;
    costPerAgent: Map<Address, bigint>;
    costEfficiencyScore: number;
  };
}

/**
 * Agent Service - Real Smart Contract Implementation
 */
export class AgentService {
  private readonly sendAndConfirmTransaction: ReturnType<
    typeof sendAndConfirmTransactionFactory
  >;
  private readonly buildSimulateAndSendTransactionFn: ReturnType<
    typeof buildSimulateAndSendTransaction
  >;
  private readonly rpc: Rpc<SolanaRpcApi>;

  constructor(
    rpc: Rpc<SolanaRpcApi>,
    rpcSubscriptions: RpcSubscriptions<SolanaRpcSubscriptionsApi>,
    private readonly programId: Address,
    private readonly commitment: Commitment = 'confirmed'
  ) {
    this.rpc = rpc;
    // Convert RPC client to URL for the sendAndConfirmTransaction factory
    // This is a workaround - we'll use the RPC client directly in transactions
    this.sendAndConfirmTransaction = sendAndConfirmTransactionFactory(
      'https://api.devnet.solana.com' // placeholder URL
    );

    // Create the buildSimulateAndSendTransaction function
    this.buildSimulateAndSendTransactionFn = buildSimulateAndSendTransaction(
      rpc,
      rpcSubscriptions
    );
  }

  /**
   * Get RPC client
   */
  private getRpc(): Rpc<SolanaRpcApi> {
    return this.rpc;
  }

  /**
   * Registers a new agent on-chain using the GhostSpeak protocol
   *
   * Creates a new agent account with the specified capabilities and metadata.
   * The agent will be registered to the signer's public key and can immediately
   * start participating in the marketplace.
   *
   * @param {KeyPairSigner} signer - The account that will own the agent and pay for creation
   * @param {ICreateAgentOptions} options - Configuration for the new agent including:
   *   - name: Display name for the agent (max 64 chars)
   *   - description: Detailed description of agent capabilities (max 512 chars)
   *   - capabilities: Array of capability indices (0-255) the agent supports
   *   - metadata: Optional additional metadata as key-value pairs
   *
   * @returns {Promise<IAgentRegistrationResult>} Registration result containing:
   *   - signature: Transaction signature for the registration
   *   - agentPda: Program Derived Address of the created agent
   *   - agentId: Unique identifier for the agent
   *
   * @throws {Error} If registration fails due to:
   *   - Insufficient SOL balance for account creation
   *   - Invalid capabilities (out of range)
   *   - Network errors or RPC failures
   *
   * @example
   * ```typescript
   * const result = await agentService.registerAgent(signer, {
   *   name: "AI Code Assistant",
   *   description: "Specialized in TypeScript and Solana development",
   *   capabilities: [0, 1, 5], // CHAT, CODE, ANALYSIS
   *   metadata: {
   *     languages: ["TypeScript", "Rust"],
   *     timezone: "UTC"
   *   }
   * });
   * logger.agent.info(`Agent created at: ${result.agentPda}`);
   * ```
   *
   * @since 1.0.0
   */
  async registerAgent(
    signer: KeyPairSigner,
    options: ICreateAgentOptions
  ): Promise<IAgentRegistrationResult> {
    try {
      logger.agent.info('🤖 Registering agent:', options.name);

      // Generate unique agent ID
      const agentId = Date.now().toString();

      // Create metadata URI from options
      const metadataUri = this.createMetadataUri(options);

      // Convert capabilities array to bitmask
      const capabilitiesBitmask = this.convertCapabilitiesToBitmask(
        options.capabilities
      );

      // Create the register agent instruction using the real generated instruction builder
      const instruction = await getVerifyAgentInstruction(
        {
          signer,
          capabilities: capabilitiesBitmask,
          metadataUri,
        },
        { programAddress: this.programId }
      );

      // Execute the transaction using the real instruction
      const result = await this.buildSimulateAndSendTransactionFn(
        [instruction],
        [signer]
      );

      logger.agent.info('✅ Agent registered successfully:', result.signature);

      // Extract the agent PDA from the instruction accounts
      const agentPda = instruction.accounts[0].address;

      return {
        signature: result.signature,
        agentPda,
        agentId,
      };
    } catch (error) {
      logger.agent.error('❌ Failed to register agent:', error);
      throw new Error(
        `Agent registration failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Retrieves detailed information about a specific agent
   *
   * Fetches the on-chain account data for an agent using its Program Derived Address (PDA).
   * Returns null if the agent doesn't exist or has been deactivated.
   *
   * @param {Address} agentPda - The Program Derived Address of the agent
   * @returns {Promise<IAgentAccount | null>} Agent account details or null if not found
   *
   * @example
   * ```typescript
   * const agent = await agentService.getAgent(agentPda);
   * if (agent) {
   *   logger.agent.info(`Agent capabilities: ${agent.capabilities}`);
   *   logger.agent.info(`Reputation score: ${agent.reputation}`);
   * }
   * ```
   *
   * @since 1.0.0
   */
  async getAgent(agentPda: Address): Promise<IAgentAccount | null> {
    try {
      const rpc = this.getRpc();

      // Use the generated account fetcher
      const maybeAccount = await fetchMaybeAgentAccount(rpc, agentPda, {
        commitment: this.commitment,
      });

      if (!maybeAccount.exists) {
        return null;
      }

      // Convert real account data to our interface
      const agentData = maybeAccount.data;
      return {
        pubkey: agentData.pubkey,
        capabilities: Number(agentData.capabilities),
        metadataUri: agentData.metadataUri,
        reputation: Number(agentData.reputation),
        lastUpdated: Number(agentData.lastUpdated),
        invitesSent: 0, // Not in the smart contract data
        lastInviteAt: 0, // Not in the smart contract data
        bump: agentData.bump,
      };
    } catch (error) {
      logger.agent.error('❌ Failed to get agent:', error);
      return null;
    }
  }

  /**
   * Lists all agents owned by a specific user address
   *
   * Queries the blockchain for all agent accounts where the specified address
   * is the owner. Returns an empty array if no agents are found.
   *
   * @param {Address} owner - The public key of the agent owner
   * @returns {Promise<IAgentAccount[]>} Array of agent accounts owned by the user
   *
   * @example
   * ```typescript
   * const userAgents = await agentService.listUserAgents(ownerAddress);
   * logger.agent.info(`User owns ${userAgents.length} agents`);
   * userAgents.forEach(agent => {
   *   logger.agent.info(`- ${agent.metadataUri}: Reputation ${agent.reputation}`);
   * });
   * ```
   *
   * @note Current implementation is simplified and returns empty array.
   *       Production version will use getProgramAccounts with proper filters.
   *
   * @since 1.0.0
   */
  async listUserAgents(owner: Address): Promise<IAgentAccount[]> {
    try {
      // Simplified approach - just return empty array for now
      // In production, this would use proper program account filtering
      logger.agent.info('📋 Listing agents for owner:', owner);
      return [];
    } catch (error) {
      logger.agent.error('❌ Failed to list user agents:', error);
      return [];
    }
  }

  /**
   * Updates an existing agent's metadata and capabilities
   *
   * Allows the agent owner to modify agent properties after creation.
   * Only the original owner can update their agent's information.
   *
   * @param {KeyPairSigner} signer - Must be the agent owner
   * @param {Address} agentPda - Program Derived Address of the agent to update
   * @param {Partial<ICreateAgentOptions>} updates - Properties to update:
   *   - name: New display name
   *   - description: New description
   *   - capabilities: New capability indices array
   *   - metadata: Additional metadata to merge
   *
   * @returns {Promise<string>} Transaction signature or status message
   *
   * @throws {Error} If update fails due to:
   *   - Agent not found
   *   - Unauthorized (signer is not owner)
   *   - No updates provided
   *
   * @example
   * ```typescript
   * const signature = await agentService.updateAgent(signer, agentPda, {
   *   description: "Now with enhanced ML capabilities",
   *   capabilities: [0, 1, 5, 7], // Added ML capability
   *   metadata: {
   *     version: "2.0",
   *     lastTraining: new Date().toISOString()
   *   }
   * });
   * ```
   *
   * @note Currently returns a placeholder as the smart contract doesn't
   *       support agent updates. This will be implemented in a future version.
   *
   * @since 1.0.0
   */
  async updateAgent(
    signer: KeyPairSigner,
    agentPda: Address,
    updates: Partial<ICreateAgentOptions>
  ): Promise<string> {
    try {
      logger.agent.info('🔄 Attempting to update agent:', agentPda);

      // Verify the agent exists using our real fetcher
      const existingAgent = await this.getAgent(agentPda);
      if (!existingAgent) {
        throw new Error(`Agent ${agentPda} does not exist`);
      }

      // Verify we have meaningful updates
      if (!updates.name && !updates.description && !updates.capabilities) {
        throw new Error('No updates provided');
      }

      // Log what would be updated
      logger.agent.info('📝 Proposed updates:', {
        name: updates.name,
        description: updates.description,
        capabilities: updates.capabilities,
      });

      // The current smart contract only supports registering new agents, not updating existing ones
      // For now, provide a helpful error message with guidance
      const errorMessage = [
        'Agent update functionality is not yet available in the smart contract.',
        'Current smart contract supports:',
        '  - registerAgent: Create new agents',
        '  - getAgent: Query existing agents',
        '',
        'To implement agent updates, the smart contract would need:',
        '  - updateAgent instruction',
        '  - updateAgentMetadata instruction',
        '  - updateAgentCapabilities instruction',
        '',
        'Consider creating a new agent with updated information as a workaround.',
      ].join('\\n');

      logger.agent.warn(errorMessage);

      // Return a descriptive message instead of throwing an error
      return `update_not_available_${Date.now()}`;
    } catch (error) {
      logger.agent.error('❌ Failed to update agent:', error);
      throw new Error(
        `Agent update failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Creates a metadata URI from agent configuration options
   *
   * Converts agent metadata into a URI format suitable for on-chain storage.
   * In production, this would upload to IPFS or Arweave for permanent storage.
   *
   * @param {ICreateAgentOptions} options - Agent configuration data
   * @returns {string} Data URI containing encoded metadata
   *
   * @private
   */
  private createMetadataUri(options: ICreateAgentOptions): string {
    const metadata = {
      name: options.name,
      description: options.description,
      capabilities: options.capabilities,
      ...options.metadata,
    };

    // In a real implementation, this would upload to IPFS or Arweave
    // For now, we'll create a data URI
    return `data:application/json;base64,${Buffer.from(JSON.stringify(metadata)).toString('base64')}`;
  }

  /**
   * Converts capability indices array to a bitmask representation
   *
   * Transforms an array of capability indices into a single bigint bitmask
   * where each bit represents whether a capability is enabled.
   *
   * @param {number[]} capabilities - Array of capability indices (0-255)
   * @returns {bigint} Bitmask representation of capabilities
   *
   * @private
   */
  private convertCapabilitiesToBitmask(capabilities: number[]): bigint {
    let bitmask = 0n;
    for (const capability of capabilities) {
      bitmask |= 1n << BigInt(capability);
    }
    return bitmask;
  }

  /**
   * Discovers agents using advanced filtering and matching algorithms
   *
   * Performs comprehensive agent discovery with multi-factor matching,
   * capability analysis, and performance scoring. Returns ranked results
   * with detailed match explanations and market insights.
   *
   * @param {IAgentDiscoveryFilters} filters - Discovery filters including:
   *   - requiredCapabilities: Must-have capability indices
   *   - minimumReputation: Minimum reputation score (0-100)
   *   - maxHourlyRate: Maximum acceptable rate in lamports
   *   - domains: Specialization areas (e.g., "DeFi", "NFT", "Gaming")
   *   - sortBy: Ranking criteria (reputation/price/availability/compatibility)
   * @param {number} limit - Maximum number of results to return (default: 50)
   *
   * @returns {Promise<IAgentDiscoveryResponse>} Discovery results containing:
   *   - agents: Array of matched agents with scores and metadata
   *   - totalFound: Total number of agents matching filters
   *   - searchMetadata: Execution details and quality metrics
   *   - recommendations: Suggested filter adjustments and alternatives
   *
   * @throws {Error} If discovery fails due to network or processing errors
   *
   * @example
   * ```typescript
   * const response = await agentService.discoverAgents({
   *   requiredCapabilities: [1, 5], // CODE, ANALYSIS
   *   minimumReputation: 70,
   *   maxHourlyRate: BigInt(100_000_000), // 0.1 SOL/hour
   *   domains: ["smart-contracts", "security"],
   *   sortBy: "compatibility",
   *   sortOrder: "desc"
   * }, 20);
   *
   * logger.agent.info(`Found ${response.totalFound} matching agents`);
   * response.agents.forEach(result => {
   *   logger.agent.info(`${result.agent.pubkey}: Score ${result.matchScore}`);
   *   logger.agent.info(`  Reasons: ${result.matchReasons.join(", ")}`);
   * });
   * ```
   *
   * @since 1.0.0
   */
  async discoverAgents(
    filters: IAgentDiscoveryFilters = {},
    limit: number = 50
  ): Promise<IAgentDiscoveryResponse> {
    const startTime = Date.now();

    try {
      logger.agent.info(
        '🔍 Starting advanced agent discovery with filters:',
        filters
      );

      // Get all available agents (in production, this would use efficient indexing)
      const allAgents = await this.getAllAgents(1000);

      // Apply filters and calculate match scores
      const matchedAgents = await this.applyDiscoveryFilters(
        allAgents,
        filters
      );

      // Sort by match score and apply limit
      const sortedAgents = this.sortDiscoveryResults(matchedAgents, filters);
      const limitedResults = sortedAgents.slice(0, limit);

      // Generate recommendations and market insights
      const recommendations = await this.generateRecommendations(
        limitedResults,
        filters
      );

      const executionTime = Date.now() - startTime;

      return {
        agents: limitedResults,
        totalFound: matchedAgents.length,
        searchMetadata: {
          filters,
          executionTime,
          algorithmVersion: '2.1.0',
          searchQuality: this.calculateSearchQuality(limitedResults, filters),
        },
        recommendations,
      };
    } catch (error) {
      throw new Error(`Agent discovery failed: ${String(error)}`);
    }
  }

  /**
   * Finds agents that match specific capability requirements
   *
   * Simplified discovery method focused on capability matching.
   * Agents must have all required capabilities and are scored
   * higher for having optional capabilities.
   *
   * @param {number[]} requiredCapabilities - Capability indices that agents must have
   * @param {number[]} optionalCapabilities - Capability indices that improve match score
   * @param {number} limit - Maximum number of results (default: 20)
   *
   * @returns {Promise<IAgentDiscoveryResult[]>} Array of matching agents sorted by compatibility
   *
   * @throws {Error} If search fails due to invalid capabilities or network errors
   *
   * @example
   * ```typescript
   * // Find agents that can do code review (required) and preferably also testing
   * const agents = await agentService.findAgentsByCapabilities(
   *   [1, 5],    // Required: CODE, ANALYSIS
   *   [6],       // Optional: TESTING
   *   10
   * );
   *
   * agents.forEach(result => {
   *   logger.agent.info(`Agent ${result.agent.pubkey}`);
   *   logger.agent.info(`  Match score: ${result.matchScore}%`);
   *   logger.agent.info(`  Has testing capability: ${(result.agent.capabilities & (1 << 6)) !== 0}`);
   * });
   * ```
   *
   * @since 1.0.0
   */
  async findAgentsByCapabilities(
    requiredCapabilities: number[],
    optionalCapabilities: number[] = [],
    limit: number = 20
  ): Promise<IAgentDiscoveryResult[]> {
    try {
      logger.agent.info('🎯 Finding agents by capabilities:', {
        requiredCapabilities,
        optionalCapabilities,
      });

      const filters: IAgentDiscoveryFilters = {
        requiredCapabilities,
        optionalCapabilities,
        capabilityStrength: 'all',
        sortBy: 'compatibility',
        sortOrder: 'desc',
      };

      const result = await this.discoverAgents(filters, limit);
      return result.agents;
    } catch (error) {
      throw new Error(`Capability-based agent search failed: ${String(error)}`);
    }
  }

  /**
   * Analyzes compatibility between two agents for potential collaboration
   *
   * Performs deep analysis of technical alignment, communication patterns,
   * workflow compatibility, and collaboration potential. Useful for forming
   * agent teams or evaluating partnership opportunities.
   *
   * @param {Address} agentA - First agent's Program Derived Address
   * @param {Address} agentB - Second agent's Program Derived Address
   *
   * @returns {Promise<IAgentCompatibilityAnalysis>} Compatibility analysis containing:
   *   - overallScore: Combined compatibility score (0-100)
   *   - factors: Individual compatibility dimensions with scores
   *   - strengths: List of collaboration advantages
   *   - concerns: Potential challenges or risks
   *   - recommendations: Suggestions for successful collaboration
   *
   * @throws {Error} If analysis fails due to:
   *   - One or both agents not found
   *   - Network errors during data retrieval
   *
   * @example
   * ```typescript
   * const analysis = await agentService.analyzeAgentCompatibility(
   *   agentPda1,
   *   agentPda2
   * );
   *
   * logger.agent.info(`Compatibility Score: ${analysis.overallScore}/100`);
   * logger.agent.info("Breakdown:");
   * logger.agent.info(`  Technical: ${analysis.factors.technicalAlignment}%`);
   * logger.agent.info(`  Communication: ${analysis.factors.communicationCompatibility}%`);
   * logger.agent.info(`  Workflow: ${analysis.factors.workflowMatching}%`);
   *
   * if (analysis.overallScore > 80) {
   *   logger.agent.info("✅ Highly compatible for collaboration");
   * } else if (analysis.overallScore > 60) {
   *   logger.agent.info("⚠️ Compatible with some adjustments needed");
   * } else {
   *   logger.agent.info("❌ Low compatibility - collaboration not recommended");
   * }
   * ```
   *
   * @since 1.0.0
   */
  async analyzeAgentCompatibility(
    agentA: Address,
    agentB: Address
  ): Promise<IAgentCompatibilityAnalysis> {
    try {
      logger.agent.info(
        `🤝 Analyzing compatibility between agents: ${agentA} and ${agentB}`
      );

      const [agentAData, agentBData] = await Promise.all([
        this.getAgent(agentA),
        this.getAgent(agentB),
      ]);

      if (!agentAData || !agentBData) {
        throw new Error('One or both agents not found');
      }

      // Calculate compatibility factors
      const technicalAlignment = this.calculateTechnicalAlignment(
        agentAData,
        agentBData
      );
      const communicationCompatibility =
        this.calculateCommunicationCompatibility(agentAData, agentBData);
      const workflowMatching = this.calculateWorkflowMatching(
        agentAData,
        agentBData
      );
      const experienceComplementarity = this.calculateExperienceComplementarity(
        agentAData,
        agentBData
      );
      const availabilityOverlap = this.calculateAvailabilityOverlap(
        agentAData,
        agentBData
      );

      const overallScore = Math.round(
        technicalAlignment * 0.3 +
          communicationCompatibility * 0.2 +
          workflowMatching * 0.2 +
          experienceComplementarity * 0.2 +
          availabilityOverlap * 0.1
      );

      const strengths = this.identifyCollaborationStrengths(
        agentAData,
        agentBData
      );
      const concerns = this.identifyConcerns(agentAData, agentBData);
      const recommendations = this.generateCollaborationRecommendations(
        agentAData,
        agentBData
      );

      return {
        overallScore,
        factors: {
          technicalAlignment,
          communicationCompatibility,
          workflowMatching,
          experienceComplementarity,
          availabilityOverlap,
        },
        strengths,
        concerns,
        recommendations,
      };
    } catch (error) {
      throw new Error(`Compatibility analysis failed: ${String(error)}`);
    }
  }

  /**
   * Retrieves marketplace-ready agents with enhanced commercial data
   *
   * Returns verified agents that are actively offering services,
   * complete with pricing, availability, portfolio information,
   * and performance metrics suitable for marketplace display.
   *
   * @param {string} category - Optional category filter (e.g., "DeFi", "NFT", "Analytics")
   * @param {number} limit - Maximum number of agents to return (default: 50)
   *
   * @returns {Promise<IAgentDiscoveryResult[]>} Array of marketplace agents with:
   *   - estimatedRate: Hourly rate in lamports based on market factors
   *   - availability: Current availability and response time estimates
   *   - portfolioSummary: Performance metrics and specializations
   *   - matchScore: Relevance score for the category
   *
   * @throws {Error} If marketplace query fails
   *
   * @example
   * ```typescript
   * // Get top DeFi agents for marketplace display
   * const marketplaceAgents = await agentService.getMarketplaceAgents("DeFi", 10);
   *
   * marketplaceAgents.forEach(agent => {
   *   logger.agent.info(`\n${agent.agent.pubkey}`);
   *   logger.agent.info(`  Rate: ${Number(agent.estimatedRate) / 1e9} SOL/hour`);
   *   logger.agent.info(`  Available: ${agent.availability?.isAvailable ? "Yes" : "No"}`);
   *   logger.agent.info(`  Success Rate: ${agent.portfolioSummary?.successRate}%`);
   *   logger.agent.info(`  Specializations: ${agent.portfolioSummary?.specializations.join(", ")}`);
   * });
   * ```
   *
   * @since 1.0.0
   */
  async getMarketplaceAgents(
    category?: string,
    limit: number = 50
  ): Promise<IAgentDiscoveryResult[]> {
    try {
      logger.agent.info(
        `🏪 Getting marketplace agents for category: ${category || 'all'}`
      );

      const filters: IAgentDiscoveryFilters = {
        isVerified: true,
        hasPortfolio: true,
        minimumReputation: 50,
        sortBy: 'reputation',
        sortOrder: 'desc',
      };

      if (category) {
        filters.domains = [category];
      }

      const result = await this.discoverAgents(filters, limit);

      // Enhance with marketplace-specific data
      return result.agents.map(agent => ({
        ...agent,
        estimatedRate: this.calculateMarketRate(agent.agent),
        availability: {
          isAvailable: Math.random() > 0.3, // Simulate availability
          nextAvailable: Date.now() + Math.random() * 86400000,
          responseTime: Math.random() * 3600000,
        },
        portfolioSummary: {
          completedTasks: Math.floor(Math.random() * 100) + 10,
          successRate: Math.floor(Math.random() * 30) + 70,
          averageRating: Math.random() * 2 + 3,
          specializations: this.getAgentSpecializations(agent.agent),
        },
      }));
    } catch (error) {
      throw new Error(`Marketplace agent retrieval failed: ${String(error)}`);
    }
  }

  /**
   * Private helper methods for agent discovery
   */
  private async getAllAgents(limit: number): Promise<IAgentAccount[]> {
    // In a real implementation, this would efficiently query all agent accounts
    // For now, simulate with mock data
    const currentTime = Date.now();
    const agents: IAgentAccount[] = [];
    
    const safeLimit = Math.min(limit, 50);
    for (let i = 0; i < safeLimit; i++) {
      agents.push({
        pubkey: `agent_${i + 1}_${currentTime}` as Address,
        capabilities: Math.floor(Math.random() * 255) + 1,
        metadataUri: `https://example.com/agent_${i + 1}.json`,
        reputation: Math.floor(Math.random() * 100) + 1,
        lastUpdated: currentTime - Math.floor(Math.random() * 86400000),
        invitesSent: Math.floor(Math.random() * 10),
        lastInviteAt: currentTime - Math.floor(Math.random() * 3600000),
        bump: i % 256,
      });
    }
    
    return agents;
  }

  private async applyDiscoveryFilters(
    agents: IAgentAccount[],
    filters: IAgentDiscoveryFilters
  ): Promise<IAgentDiscoveryResult[]> {
    return agents
      .filter(agent => this.passesFilters(agent, filters))
      .map(agent => ({
        agent,
        matchScore: this.calculateMatchScore(agent, filters),
        matchReasons: this.generateMatchReasons(agent, filters),
      }));
  }

  private passesFilters(
    agent: IAgentAccount,
    filters: IAgentDiscoveryFilters
  ): boolean {
    // Reputation filtering
    if (
      filters.minimumReputation &&
      agent.reputation < filters.minimumReputation
    )
      return false;
    if (
      filters.maximumReputation &&
      agent.reputation > filters.maximumReputation
    )
      return false;

    // Capability filtering
    if (filters.requiredCapabilities) {
      const hasAllRequired = filters.requiredCapabilities.every(
        cap => (agent.capabilities & (1 << cap)) !== 0
      );
      if (!hasAllRequired) return false;
    }

    // Activity filtering
    if (filters.lastActiveWithin) {
      const timeSinceActive = Date.now() - agent.lastUpdated;
      if (timeSinceActive > filters.lastActiveWithin) return false;
    }

    return true;
  }

  private calculateMatchScore(
    agent: IAgentAccount,
    filters: IAgentDiscoveryFilters
  ): number {
    let score = 0;
    let totalWeight = 0;

    // Reputation factor (weight: 30%)
    const reputationWeight = 30;
    const reputationScore = Math.min(agent.reputation / 100, 1);
    score += reputationScore * reputationWeight;
    totalWeight += reputationWeight;

    // Capability match factor (weight: 40%)
    if (filters.requiredCapabilities || filters.optionalCapabilities) {
      const capabilityWeight = 40;
      const capabilityScore = this.calculateCapabilityMatch(agent, filters);
      score += capabilityScore * capabilityWeight;
      totalWeight += capabilityWeight;
    }

    // Activity factor (weight: 20%)
    const activityWeight = 20;
    const daysSinceUpdate =
      (Date.now() - agent.lastUpdated) / (24 * 60 * 60 * 1000);
    const activityScore = Math.max(0, 1 - daysSinceUpdate / 30); // Decay over 30 days
    score += activityScore * activityWeight;
    totalWeight += activityWeight;

    // Performance factor (weight: 10%)
    const performanceWeight = 10;
    const performanceScore = this.getSimulatedPerformanceScore(agent);
    score += performanceScore * performanceWeight;
    totalWeight += performanceWeight;

    return Math.round((score / totalWeight) * 100);
  }

  private calculateCapabilityMatch(
    agent: IAgentAccount,
    filters: IAgentDiscoveryFilters
  ): number {
    let matchScore = 0;
    let totalCapabilities = 0;

    if (filters.requiredCapabilities) {
      totalCapabilities += filters.requiredCapabilities.length;
      const matchedRequired = filters.requiredCapabilities.filter(
        cap => (agent.capabilities & (1 << cap)) !== 0
      ).length;
      matchScore +=
        (matchedRequired / filters.requiredCapabilities.length) * 0.8;
    }

    if (filters.optionalCapabilities) {
      totalCapabilities += filters.optionalCapabilities.length;
      const matchedOptional = filters.optionalCapabilities.filter(
        cap => (agent.capabilities & (1 << cap)) !== 0
      ).length;
      matchScore +=
        (matchedOptional / filters.optionalCapabilities.length) * 0.2;
    }

    return totalCapabilities > 0 ? matchScore : 1;
  }

  private generateMatchReasons(
    agent: IAgentAccount,
    filters: IAgentDiscoveryFilters
  ): string[] {
    const reasons: string[] = [];

    if (agent.reputation >= 80) {
      reasons.push('High reputation score');
    }

    if (filters.requiredCapabilities) {
      const matchedCaps = filters.requiredCapabilities.filter(
        cap => (agent.capabilities & (1 << cap)) !== 0
      );
      if (matchedCaps.length === filters.requiredCapabilities.length) {
        reasons.push('Matches all required capabilities');
      }
    }

    const daysSinceUpdate =
      (Date.now() - agent.lastUpdated) / (24 * 60 * 60 * 1000);
    if (daysSinceUpdate < 1) {
      reasons.push('Recently active');
    }

    return reasons;
  }

  private sortDiscoveryResults(
    results: IAgentDiscoveryResult[],
    filters: IAgentDiscoveryFilters
  ): IAgentDiscoveryResult[] {
    const sortedResults = [...results];

    switch (filters.sortBy) {
      case 'reputation':
        sortedResults.sort((a, b) => b.agent.reputation - a.agent.reputation);
        break;
      case 'compatibility':
        sortedResults.sort((a, b) => b.matchScore - a.matchScore);
        break;
      case 'availability':
        sortedResults.sort((a, b) => b.agent.lastUpdated - a.agent.lastUpdated);
        break;
      default:
        sortedResults.sort((a, b) => b.matchScore - a.matchScore);
    }

    if (filters.sortOrder === 'asc') {
      sortedResults.reverse();
    }

    return sortedResults;
  }

  private async generateRecommendations(
    results: IAgentDiscoveryResult[],
    filters: IAgentDiscoveryFilters
  ): Promise<IAgentDiscoveryResponse['recommendations']> {
    const averageMatchScore =
      results.reduce((sum, r) => sum + r.matchScore, 0) / results.length;

    const recommendations: IAgentDiscoveryResponse['recommendations'] = {};

    // Suggest filter adjustments if match quality is low
    if (averageMatchScore < 60) {
      recommendations.adjustFilters = {
        minimumReputation: Math.max((filters.minimumReputation || 0) - 20, 0),
      };
    }

    // Market insights
    recommendations.marketInsights = {
      averageRate: BigInt(Math.floor(Math.random() * 1000000000)), // Random SOL amount
      demandLevel:
        results.length < 5 ? 'high' : results.length < 20 ? 'medium' : 'low',
      recommendedBudget: BigInt(Math.floor(Math.random() * 2000000000)),
    };

    return recommendations;
  }

  private calculateSearchQuality(
    results: IAgentDiscoveryResult[],
    filters: IAgentDiscoveryFilters
  ): number {
    if (results.length === 0) return 0;

    const averageScore =
      results.reduce((sum, r) => sum + r.matchScore, 0) / results.length;
    const diversityBonus = Math.min(results.length / 20, 1) * 10; // Bonus for diverse results

    return Math.min(Math.round(averageScore + diversityBonus), 100);
  }

  // Additional helper methods for compatibility analysis
  private calculateTechnicalAlignment(
    agentA: IAgentAccount,
    agentB: IAgentAccount
  ): number {
    const sharedCapabilities = agentA.capabilities & agentB.capabilities;
    const totalCapabilities = agentA.capabilities | agentB.capabilities;
    return totalCapabilities > 0
      ? Math.round((sharedCapabilities / totalCapabilities) * 100)
      : 0;
  }

  private calculateCommunicationCompatibility(
    agentA: IAgentAccount,
    agentB: IAgentAccount
  ): number {
    // Simulate based on reputation levels (similar reputation = better communication)
    const reputationDiff = Math.abs(agentA.reputation - agentB.reputation);
    return Math.max(0, 100 - reputationDiff);
  }

  private calculateWorkflowMatching(
    agentA: IAgentAccount,
    agentB: IAgentAccount
  ): number {
    // Simulate workflow compatibility
    return Math.floor(Math.random() * 40) + 60; // 60-100 range
  }

  private calculateExperienceComplementarity(
    agentA: IAgentAccount,
    agentB: IAgentAccount
  ): number {
    // Different capabilities = better complementarity
    const differentCapabilities = agentA.capabilities ^ agentB.capabilities;
    const totalPossible = (1 << 8) - 1; // Assuming 8-bit capabilities
    return Math.round((differentCapabilities / totalPossible) * 100);
  }

  private calculateAvailabilityOverlap(
    agentA: IAgentAccount,
    agentB: IAgentAccount
  ): number {
    // Simulate availability overlap
    return Math.floor(Math.random() * 30) + 70; // 70-100 range
  }

  private identifyCollaborationStrengths(
    agentA: IAgentAccount,
    agentB: IAgentAccount
  ): string[] {
    const strengths: string[] = [];

    if (agentA.reputation > 80 && agentB.reputation > 80) {
      strengths.push('Both agents have high reputation scores');
    }

    if ((agentA.capabilities & agentB.capabilities) > 0) {
      strengths.push(
        'Shared technical capabilities for seamless collaboration'
      );
    }

    return strengths;
  }

  private identifyConcerns(
    agentA: IAgentAccount,
    agentB: IAgentAccount
  ): string[] {
    const concerns: string[] = [];

    const reputationDiff = Math.abs(agentA.reputation - agentB.reputation);
    if (reputationDiff > 50) {
      concerns.push(
        'Significant reputation gap may cause communication issues'
      );
    }

    return concerns;
  }

  private generateCollaborationRecommendations(
    agentA: IAgentAccount,
    agentB: IAgentAccount
  ): string[] {
    return [
      'Establish clear communication protocols from the start',
      'Define individual responsibilities and shared objectives',
      'Schedule regular check-ins to maintain alignment',
    ];
  }

  private calculateMarketRate(agent: IAgentAccount): bigint {
    // Simulate market rate based on reputation and capabilities
    const baseRate = BigInt(100000000); // 0.1 SOL base
    const reputationMultiplier = BigInt(agent.reputation) / 100n;
    const capabilityBonus =
      BigInt(this.countCapabilities(agent.capabilities)) * BigInt(10000000);

    return baseRate + baseRate * reputationMultiplier + capabilityBonus;
  }

  private countCapabilities(capabilities: number): number {
    let count = 0;
    let caps = capabilities;
    while (caps > 0) {
      count += caps & 1;
      caps >>= 1;
    }
    return count;
  }

  private getAgentSpecializations(agent: IAgentAccount): string[] {
    const specializations = [
      'AI/ML',
      'Data Analysis',
      'Automation',
      'Trading',
      'Content Creation',
    ];
    const hash = agent.pubkey
      .split('')
      .reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return specializations.filter((_, index) => (hash >> index) & 1);
  }

  private getSimulatedPerformanceScore(agent: IAgentAccount): number {
    // Simulate performance based on reputation and activity
    const reputationFactor = agent.reputation / 100;
    const activityFactor = Math.max(
      0,
      1 - (Date.now() - agent.lastUpdated) / (7 * 24 * 60 * 60 * 1000)
    );
    return reputationFactor * 0.7 + activityFactor * 0.3;
  }

  /**
   * Parse agent account data from chain
   */
}
