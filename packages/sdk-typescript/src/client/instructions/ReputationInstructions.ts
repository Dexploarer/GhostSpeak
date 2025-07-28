import { 
  type Address, 
  type TransactionSigner,
  type GetAccountInfoApi,
  type Rpc,
  type Blockhash,
  address
} from '@solana/kit'
import { Connection, PublicKey } from '@solana/web3.js'
import { type GhostSpeakClientConfig } from '../GhostSpeakClient'
import { getUpdateAgentReputationInstruction, getWorkOrderDecoder, WorkOrderStatus, getEscrowDecoder, EscrowStatus } from '../../generated'
import { 
  type ReputationData,
  type JobPerformance,
  type ReputationCalculationResult,
  type ReputationQueryFilters,
  type ReputationFactors,
  type ReputationBadge,
  ReputationTier,
  BadgeType,
  REPUTATION_CONSTANTS
} from '../../types/reputation-types'
import { ReputationCalculator } from '../../utils/reputation-calculator'
import { handleInstructionError } from '../../utils/instruction-error-handler'
import { TypedRpcClient } from '../../types/rpc-client-types'

/**
 * Client for managing agent reputation operations
 */
export class ReputationInstructions {
  private rpc: Rpc<GetAccountInfoApi>
  private programId: Address
  private calculator: ReputationCalculator
  private typedRpc: TypedRpcClient

  constructor(private config: GhostSpeakClientConfig) {
    this.rpc = config.rpc
    this.programId = config.programId ?? address('GHSTwJYnMW6V8piJgW8yY8ZUKqQzFQkKKJmLPWUKvdFu')
    this.calculator = new ReputationCalculator()
    this.typedRpc = config.rpc as unknown as TypedRpcClient
  }

  /**
   * Initialize reputation data for an agent
   */
  async initializeReputation(params: {
    agentId: string
    signer: TransactionSigner
    factors?: ReputationFactors
  }): Promise<{ signature: string; reputationAddress: Address }> {
    const { agentId, signer, factors = this.getDefaultFactors() } = params

    try {
      // Validate factors
      const totalWeight = 
        factors.completionWeight +
        factors.qualityWeight +
        factors.timelinessWeight +
        factors.satisfactionWeight +
        factors.disputeWeight

      if (totalWeight !== 100) {
        throw new Error('Reputation factors must sum to 100')
      }

      // Initialize reputation using the update instruction with default values
      // A dedicated initialization instruction is not yet available in the IDL
      const instruction = getUpdateAgentReputationInstruction({
        agentId,
        reputationScore: 50, // Start at 50% (5000 basis points)
        signer,
        agentAccount: await this.getAgentPDA(agentId, signer.address)
      })

      // Get latest blockhash for transaction using typed RPC
      const latestBlockhashResponse = await (this.rpc as unknown as {
        getLatestBlockhash: () => { send: () => Promise<{ value: { blockhash: Blockhash; lastValidBlockHeight: bigint } }> }
      }).getLatestBlockhash().send()
      const latestBlockhash = latestBlockhashResponse.value
      
      // Import transaction building utilities
      const { 
        pipe,
        createTransactionMessage,
        appendTransactionMessageInstructions,
        setTransactionMessageFeePayerSigner,
        setTransactionMessageLifetimeUsingBlockhash,
        signTransactionMessageWithSigners
      } = await import('@solana/kit')

      // Create and send transaction
      const transactionMessage = pipe(
        createTransactionMessage({ version: 0 }),
        (tx) => appendTransactionMessageInstructions([instruction], tx),
        (tx) => setTransactionMessageFeePayerSigner(signer, tx),
        (tx) => setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, tx)
      )

      // Sign transaction
      const signedTransaction = await signTransactionMessageWithSigners(transactionMessage)

      // Send transaction using typed RPC
      const signature = await (this.rpc as unknown as {
        sendTransaction: (tx: unknown, options: unknown) => { send: () => Promise<string> }
      }).sendTransaction(signedTransaction, {
        encoding: 'base64',
        commitment: 'confirmed'
      }).send()

      // Wait for confirmation using typed RPC
      await (this.rpc as unknown as {
        confirmTransaction: (params: unknown) => { send: () => Promise<unknown> }
      }).confirmTransaction({
        signature,
        blockhash: latestBlockhash.blockhash,
        lastValidBlockHeight: latestBlockhash.lastValidBlockHeight
      }).send()

      const reputationAddr = await this.getReputationPDA(
        await this.getAgentPDA(agentId, signer.address)
      )

      return { signature, reputationAddress: reputationAddr }
    } catch (error) {
      throw handleInstructionError(error as Error, 'initializeReputation')
    }
  }

  /**
   * Update agent reputation after job completion
   */
  async updateJobReputation(params: {
    agentId: string
    jobPerformance: JobPerformance
    signer: TransactionSigner
  }): Promise<{ 
    signature: string
    calculationResult: ReputationCalculationResult
  }> {
    const { agentId, jobPerformance, signer } = params

    try {
      // Get current reputation data
      const agentAddress = await this.getAgentPDA(agentId, signer.address)
      const reputationData = await this.getReputationData(agentAddress)

      // Calculate new reputation
      const calculationResult = this.calculator.calculateReputation(
        reputationData,
        jobPerformance
      )

      // Update on-chain reputation score
      const instruction = getUpdateAgentReputationInstruction({
        agentId,
        reputationScore: Math.floor(calculationResult.overallScore / 100), // Convert to 0-100 scale
        signer,
        agentAccount: agentAddress
      })

      // Get latest blockhash for transaction using typed RPC
      const latestBlockhashResponse = await (this.rpc as unknown as {
        getLatestBlockhash: () => { send: () => Promise<{ value: { blockhash: Blockhash; lastValidBlockHeight: bigint } }> }
      }).getLatestBlockhash().send()
      const latestBlockhash = latestBlockhashResponse.value
      
      // Import transaction building utilities
      const { 
        pipe,
        createTransactionMessage,
        appendTransactionMessageInstructions,
        setTransactionMessageFeePayerSigner,
        setTransactionMessageLifetimeUsingBlockhash,
        signTransactionMessageWithSigners
      } = await import('@solana/kit')

      // Create and send transaction
      const transactionMessage = pipe(
        createTransactionMessage({ version: 0 }),
        (tx) => appendTransactionMessageInstructions([instruction], tx),
        (tx) => setTransactionMessageFeePayerSigner(signer, tx),
        (tx) => setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, tx)
      )

      // Sign transaction
      const signedTransaction = await signTransactionMessageWithSigners(transactionMessage)

      // Send transaction using typed RPC
      const signature = await (this.rpc as unknown as {
        sendTransaction: (tx: unknown, options: unknown) => { send: () => Promise<string> }
      }).sendTransaction(signedTransaction, {
        encoding: 'base64',
        commitment: 'confirmed'
      }).send()

      // Wait for confirmation using typed RPC
      await (this.rpc as unknown as {
        confirmTransaction: (params: unknown) => { send: () => Promise<unknown> }
      }).confirmTransaction({
        signature,
        blockhash: latestBlockhash.blockhash,
        lastValidBlockHeight: latestBlockhash.lastValidBlockHeight
      }).send()

      // Emit reputation update event
      this.emitReputationUpdate({
        agent: agentAddress,
        previousScore: reputationData.overallScore,
        newScore: calculationResult.overallScore,
        category: jobPerformance.category,
        timestamp: Date.now() / 1000
      })

      return { signature, calculationResult }
    } catch (error) {
      throw handleInstructionError(error as Error, 'updateJobReputation')
    }
  }

  /**
   * Query agents by reputation criteria
   */
  async queryAgentsByReputation(
    filters: ReputationQueryFilters
  ): Promise<{ agent: Address; reputation: ReputationData }[]> {
    try {
      // Import necessary functions
      const { getAgentDecoder, AGENT_DISCRIMINATOR } = await import('../../generated/accounts/agent')
      
      // Get program accounts with agent discriminator filter
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
      const accountsResponse = await (this.rpc as any).getProgramAccounts(this.programId, {
        encoding: 'base64',
        commitment: 'confirmed',
        filters: [
          {
            memcmp: {
              offset: 0,
              bytes: Buffer.from(AGENT_DISCRIMINATOR).toString('base64')
            }
          }
        ]
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      }).send()

      const agentDecoder = getAgentDecoder()
      const results: { agent: Address; reputation: ReputationData }[] = []

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      for (const account of accountsResponse as any[]) {
        try {
          // Decode agent data
          // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access
          const agentData = agentDecoder.decode(new Uint8Array(Buffer.from(account.account.data[0], 'base64')))
          // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access
          const reputationData = await this.convertAgentToReputationData(account.pubkey, agentData)

          // Apply filters
          if (this.matchesReputationFilters(reputationData, filters)) {
            results.push({
              // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
              agent: account.pubkey,
              reputation: reputationData
            })
          }
        } catch {
          // Skip accounts that can't be decoded (might not be agent accounts)
          continue
        }
      }

      // Sort by reputation score (descending) and apply limit
      results.sort((a, b) => b.reputation.overallScore - a.reputation.overallScore)
      
      if (filters.limit !== undefined) {
        return results.slice(0, filters.limit)
      }

      return results
    } catch (error) {
      throw handleInstructionError(error as Error, 'queryAgentsByReputation')
    }
  }

  /**
   * Get reputation data for an agent
   */
  async getReputationData(agentAddress: Address): Promise<ReputationData> {
    try {
      // Import account decoder
      const { getAgentDecoder } = await import('../../generated/accounts/agent')
      
      // Fetch agent account data
      const accountInfo = await this.rpc.getAccountInfo(agentAddress, {
        encoding: 'base64',
        commitment: 'confirmed'
      }).send()

      if (!accountInfo.value) {
        throw new Error(`Agent account not found: ${agentAddress}`)
      }

      // Decode agent account
      const agentDecoder = getAgentDecoder()
      const agentData = agentDecoder.decode(new Uint8Array(Buffer.from(accountInfo.value.data[0], 'base64')))

      // Convert agent data to ReputationData format
      return await this.convertAgentToReputationData(agentAddress, agentData)
    } catch (error) {
      throw handleInstructionError(error as Error, 'getReputationData')
    }
  }

  /**
   * Calculate reputation for a hypothetical job
   */
  calculateHypotheticalReputation(
    currentData: ReputationData,
    jobPerformance: JobPerformance
  ): ReputationCalculationResult {
    return this.calculator.calculateReputation(currentData, jobPerformance)
  }

  /**
   * Get reputation tier from score
   */
  getTierFromScore(score: number): ReputationTier {
    if (score >= REPUTATION_CONSTANTS.PLATINUM_TIER_THRESHOLD) {
      return ReputationTier.Platinum
    } else if (score >= REPUTATION_CONSTANTS.GOLD_TIER_THRESHOLD) {
      return ReputationTier.Gold
    } else if (score >= REPUTATION_CONSTANTS.SILVER_TIER_THRESHOLD) {
      return ReputationTier.Silver
    } else if (score >= REPUTATION_CONSTANTS.BRONZE_TIER_THRESHOLD) {
      return ReputationTier.Bronze
    } else {
      return ReputationTier.None
    }
  }

  /**
   * Get badge requirements
   */
  getBadgeRequirements(): Record<BadgeType, string> {
    return {
      [BadgeType.FirstJob]: 'Complete your first job',
      [BadgeType.TenJobs]: 'Complete 10 jobs',
      [BadgeType.HundredJobs]: 'Complete 100 jobs',
      [BadgeType.ThousandJobs]: 'Complete 1000 jobs',
      [BadgeType.PerfectRating]: 'Achieve 95% overall reputation score',
      [BadgeType.QuickResponder]: 'Maintain average response time under 1 hour',
      [BadgeType.HighEarner]: 'Earn over 1000 SOL in total',
      [BadgeType.DisputeResolver]: 'Successfully resolve 5 disputes',
      [BadgeType.CategoryExpert]: 'Achieve 90% reputation in any category',
      [BadgeType.CrossCategoryMaster]: 'Build reputation in 5 different categories'
    }
  }

  /**
   * Get reputation analytics
   */
  async getReputationAnalytics(): Promise<{
    averageScore: number
    tierDistribution: Record<ReputationTier, number>
    topCategories: { category: string; jobCount: number }[]
  }> {
    try {
      // Get all agents to calculate real analytics
      const allAgents = await this.queryAgentsByReputation({})
      
      if (allAgents.length === 0) {
        // Return defaults if no agents exist
        return {
          averageScore: 5000,
          tierDistribution: {
            [ReputationTier.None]: 100,
            [ReputationTier.Bronze]: 0,
            [ReputationTier.Silver]: 0,
            [ReputationTier.Gold]: 0,
            [ReputationTier.Platinum]: 0
          },
          topCategories: []
        }
      }

      // Calculate average score
      const totalScore = allAgents.reduce((sum, agent) => sum + agent.reputation.overallScore, 0)
      const averageScore = Math.floor(totalScore / allAgents.length)

      // Calculate tier distribution
      const tierCounts: Record<ReputationTier, number> = {
        [ReputationTier.None]: 0,
        [ReputationTier.Bronze]: 0,
        [ReputationTier.Silver]: 0,
        [ReputationTier.Gold]: 0,
        [ReputationTier.Platinum]: 0
      }

      allAgents.forEach(agent => {
        tierCounts[agent.reputation.tier]++
      })

      // Convert to percentages
      const tierDistribution = Object.fromEntries(
        Object.entries(tierCounts).map(([tier, count]) => [
          tier,
          Math.round((count / allAgents.length) * 100)
        ])
      ) as Record<ReputationTier, number>

      // Calculate top categories
      const categoryMap = new Map<string, number>()
      allAgents.forEach(agent => {
        agent.reputation.categoryReputations.forEach(category => {
          const currentCount = categoryMap.get(category.category) ?? 0
          categoryMap.set(category.category, currentCount + category.completedJobs)
        })
      })

      const topCategories = Array.from(categoryMap.entries())
        .map(([category, jobCount]) => ({ category, jobCount }))
        .sort((a, b) => b.jobCount - a.jobCount)
        .slice(0, 10) // Top 10 categories

      return {
        averageScore,
        tierDistribution,
        topCategories
      }
    } catch (error) {
      throw handleInstructionError(error as Error, 'getReputationAnalytics')
    }
  }

  /**
   * Stake reputation tokens
   */
  async stakeReputation(params: {
    agentId: string
    amount: number
    signer: TransactionSigner
  }): Promise<{ signature: string; newStakedAmount: number }> {
    const { agentId, amount, signer } = params

    try {
      // Get current reputation data
      const agentAddress = await this.getAgentPDA(agentId, signer.address)
      const reputationData = await this.getReputationData(agentAddress)

      // Calculate staking bonus
      const stakingBonus = this.calculator.calculateStakingBonus(amount)
      const newStakedAmount = reputationData.stakedAmount + amount

      // Create update instruction with staking bonus applied
      const instruction = getUpdateAgentReputationInstruction({
        agentId,
        reputationScore: Math.min(10000, reputationData.overallScore + stakingBonus),
        signer,
        agentAccount: agentAddress
      })

      // Get latest blockhash for transaction
      const latestBlockhashResponse = await (this.rpc as unknown as {
        getLatestBlockhash: () => { send: () => Promise<{ value: { blockhash: Blockhash; lastValidBlockHeight: bigint } }> }
      }).getLatestBlockhash().send()
      const latestBlockhash = latestBlockhashResponse.value
      
      // Import transaction building utilities
      const { 
        pipe,
        createTransactionMessage,
        appendTransactionMessageInstructions,
        setTransactionMessageFeePayerSigner,
        setTransactionMessageLifetimeUsingBlockhash,
        signTransactionMessageWithSigners
      } = await import('@solana/kit')

      // Create and send transaction
      const transactionMessage = pipe(
        createTransactionMessage({ version: 0 }),
        (tx) => appendTransactionMessageInstructions([instruction], tx),
        (tx) => setTransactionMessageFeePayerSigner(signer, tx),
        (tx) => setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, tx)
      )

      // Sign transaction
      const signedTransaction = await signTransactionMessageWithSigners(transactionMessage)

      // Send transaction
      const signature = await (this.rpc as unknown as {
        sendTransaction: (tx: unknown, options: unknown) => { send: () => Promise<string> }
      }).sendTransaction(signedTransaction, {
        encoding: 'base64',
        commitment: 'confirmed'
      }).send()

      // Wait for confirmation
      await (this.rpc as unknown as {
        confirmTransaction: (params: unknown) => { send: () => Promise<unknown> }
      }).confirmTransaction({
        signature,
        blockhash: latestBlockhash.blockhash,
        lastValidBlockHeight: latestBlockhash.lastValidBlockHeight
      }).send()

      return { signature, newStakedAmount }
    } catch (error) {
      throw handleInstructionError(error as Error, 'stakeReputation')
    }
  }

  /**
   * Slash reputation for violations
   */
  async slashReputation(params: {
    agentId: string
    slashPercentage: number
    reason: string
    authority: TransactionSigner
  }): Promise<{ signature: string; newScore: number }> {
    const { agentId, slashPercentage, reason, authority } = params

    try {
      // Get current reputation data
      const agentAddress = await this.getAgentPDA(agentId, authority.address)
      const reputationData = await this.getReputationData(agentAddress)

      // Calculate slash amount
      const { newScore, slashAmount } = this.calculator.calculateSlashAmount(
        reputationData.overallScore,
        slashPercentage
      )

      // Log slash event
      console.warn(`Slashing reputation for agent ${agentId}: ${slashAmount} points for reason: ${reason}`)

      // Create update instruction with slashed score
      const instruction = getUpdateAgentReputationInstruction({
        agentId,
        reputationScore: Math.floor(newScore / 100), // Convert to 0-100 scale
        signer: authority,
        agentAccount: agentAddress
      })

      // Get latest blockhash for transaction
      const latestBlockhashResponse = await (this.rpc as unknown as {
        getLatestBlockhash: () => { send: () => Promise<{ value: { blockhash: Blockhash; lastValidBlockHeight: bigint } }> }
      }).getLatestBlockhash().send()
      const latestBlockhash = latestBlockhashResponse.value
      
      // Import transaction building utilities
      const { 
        pipe,
        createTransactionMessage,
        appendTransactionMessageInstructions,
        setTransactionMessageFeePayerSigner,
        setTransactionMessageLifetimeUsingBlockhash,
        signTransactionMessageWithSigners
      } = await import('@solana/kit')

      // Create and send transaction
      const transactionMessage = pipe(
        createTransactionMessage({ version: 0 }),
        (tx) => appendTransactionMessageInstructions([instruction], tx),
        (tx) => setTransactionMessageFeePayerSigner(authority, tx),
        (tx) => setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, tx)
      )

      // Sign transaction
      const signedTransaction = await signTransactionMessageWithSigners(transactionMessage)

      // Send transaction
      const signature = await (this.rpc as unknown as {
        sendTransaction: (tx: unknown, options: unknown) => { send: () => Promise<string> }
      }).sendTransaction(signedTransaction, {
        encoding: 'base64',
        commitment: 'confirmed'
      }).send()

      // Wait for confirmation
      await (this.rpc as unknown as {
        confirmTransaction: (params: unknown) => { send: () => Promise<unknown> }
      }).confirmTransaction({
        signature,
        blockhash: latestBlockhash.blockhash,
        lastValidBlockHeight: latestBlockhash.lastValidBlockHeight
      }).send()

      return { signature, newScore }
    } catch (error) {
      throw handleInstructionError(error as Error, 'slashReputation')
    }
  }

  // Helper methods

  private async getAgentPDA(agentId: string, owner: Address): Promise<Address> {
    const { getProgramDerivedAddress, getAddressEncoder, getBytesEncoder } = await import('@solana/kit')
    const [pda] = await getProgramDerivedAddress({
      programAddress: this.programId,
      seeds: [
        getBytesEncoder().encode(new TextEncoder().encode('agent')),
        getAddressEncoder().encode(owner),
        getBytesEncoder().encode(new TextEncoder().encode(agentId))
      ]
    })
    return pda
  }

  private async getReputationPDA(agentAddress: Address): Promise<Address> {
    const { getProgramDerivedAddress, getAddressEncoder, getBytesEncoder } = await import('@solana/kit')
    const [pda] = await getProgramDerivedAddress({
      programAddress: this.programId,
      seeds: [
        getBytesEncoder().encode(new TextEncoder().encode('reputation')),
        getAddressEncoder().encode(agentAddress)
      ]
    })
    return pda
  }

  private getDefaultFactors(): ReputationFactors {
    return {
      completionWeight: 30,
      qualityWeight: 25,
      timelinessWeight: 20,
      satisfactionWeight: 20,
      disputeWeight: 5
    }
  }

  private async convertAgentToReputationData(agentAddress: Address, agentData: unknown): Promise<ReputationData> {
    // Type assertion for agent data
    const agent = agentData as {
      reputationScore?: number
      totalJobsCompleted?: bigint
      updatedAt?: bigint
      createdAt?: bigint
    }
    
    // Convert reputation score from 0-100 scale to 0-10000 scale
    const overallScore = (agent.reputationScore ?? 50) * 100
    
    return {
      agent: agentAddress,
      overallScore,
      tier: this.getTierFromScore(overallScore),
      categoryReputations: [], // Empty until job history tracking is available
      stakedAmount: 0, // Staking functionality not yet implemented
      factors: this.getDefaultFactors(),
      totalJobsCompleted: Number(agent.totalJobsCompleted ?? 0),
      totalJobsFailed: await this.getFailedJobCount(agentAddress),
      avgResponseTime: 0, // Performance metrics not yet implemented
      disputesAgainst: await this.getDisputeCount(agentAddress),
      disputesResolved: await this.getResolvedDisputeCount(agentAddress),
      lastUpdated: Number(agent.updatedAt ?? agent.createdAt ?? Date.now() / 1000),
      createdAt: Number(agent.createdAt ?? Date.now() / 1000),
      performanceHistory: [], // Performance history not yet implemented
      badges: await this.calculateBadges(agentAddress, {
        reputationScore: overallScore,
        totalJobsCompleted: Number(agent.totalJobsCompleted ?? 0),
        avgResponseTime: 0, // Will be updated when performance metrics are implemented
        disputesResolved: await this.getResolvedDisputeCount(agentAddress)
      }),
      crossCategoryEnabled: false // Cross-category support not yet implemented
    }
  }

  private matchesReputationFilters(reputation: ReputationData, filters: ReputationQueryFilters): boolean {
    // Apply minimum score filter
    if (filters.minScore !== undefined && reputation.overallScore < filters.minScore) {
      return false
    }

    // Apply maximum score filter
    if (filters.maxScore !== undefined && reputation.overallScore > filters.maxScore) {
      return false
    }

    // Apply tier filter
    if (filters.tier !== undefined && reputation.tier !== filters.tier) {
      return false
    }

    // Apply category filter
    if (filters.category !== undefined) {
      const hasCategory = reputation.categoryReputations.some(
        cat => cat.category === filters.category
      )
      if (!hasCategory) {
        return false
      }
    }

    // Apply minimum jobs completed filter
    if (filters.minJobsCompleted !== undefined && reputation.totalJobsCompleted < filters.minJobsCompleted) {
      return false
    }

    return true
  }

  private emitReputationUpdate(event: {
    agent: Address
    previousScore: number
    newScore: number
    category: string
    timestamp: number
  }): void {
    // Emit event for UI updates
    if (typeof globalThis !== 'undefined' && globalThis.dispatchEvent) {
      globalThis.dispatchEvent(new CustomEvent('ghostspeak:reputation:update', { detail: event }))
    }
  }

  /**
   * Get the count of failed/cancelled jobs for an agent
   * 
   * @param agentAddress - The agent's address
   * @returns Number of failed jobs
   */
  private async getFailedJobCount(agentAddress: Address): Promise<number> {
    try {
      // Create a connection from the RPC endpoint
      const connection = new Connection(this.config.rpcEndpoint ?? 'https://api.mainnet-beta.solana.com')
      
      // Query work orders for this agent
      const workOrders = await connection.getProgramAccounts(
        new PublicKey(this.programId),
        {
          filters: [
            // Filter by provider address (agent)
            {
              memcmp: {
                offset: 8 + 32, // Skip discriminator + client, get provider
                bytes: new PublicKey(agentAddress).toBase58()
              }
            }
          ]
        }
      )

      // Count cancelled work orders
      let failedCount = 0
      const workOrderDecoder = getWorkOrderDecoder()
      
      for (const account of workOrders) {
        try {
          const workOrder = workOrderDecoder.decode(account.account.data)
          if (workOrder.status === WorkOrderStatus.Cancelled) {
            failedCount++
          }
        } catch {
          // Skip invalid work orders
          continue
        }
      }

      return failedCount
    } catch (error) {
      console.warn('Failed to get failed job count:', error)
      return 0
    }
  }

  /**
   * Get the count of disputes against an agent
   * 
   * @param agentAddress - The agent's address
   * @returns Number of disputes
   */
  private async getDisputeCount(agentAddress: Address): Promise<number> {
    try {
      // Create a connection from the RPC endpoint
      const connection = new Connection(this.config.rpcEndpoint ?? 'https://api.mainnet-beta.solana.com')
      
      // Query escrows for this agent
      const escrows = await connection.getProgramAccounts(
        new PublicKey(this.programId),
        {
          filters: [
            // Filter by agent address
            {
              memcmp: {
                offset: 8 + 32, // Skip discriminator + client, get agent
                bytes: new PublicKey(agentAddress).toBase58()
              }
            }
          ]
        }
      )

      // Count disputed escrows
      let disputeCount = 0
      const escrowDecoder = getEscrowDecoder()
      
      for (const account of escrows) {
        try {
          const escrow = escrowDecoder.decode(account.account.data)
          if (escrow.status === EscrowStatus.Disputed || escrow.status === EscrowStatus.Resolved) {
            disputeCount++
          }
        } catch {
          // Skip invalid escrows
          continue
        }
      }

      return disputeCount
    } catch (error) {
      console.warn('Failed to get dispute count:', error)
      return 0
    }
  }

  /**
   * Get the count of resolved disputes for an agent
   * 
   * @param agentAddress - The agent's address
   * @returns Number of resolved disputes
   */
  private async getResolvedDisputeCount(agentAddress: Address): Promise<number> {
    try {
      // Create a connection from the RPC endpoint
      const connection = new Connection(this.config.rpcEndpoint ?? 'https://api.mainnet-beta.solana.com')
      
      // Query escrows for this agent
      const escrows = await connection.getProgramAccounts(
        new PublicKey(this.programId),
        {
          filters: [
            // Filter by agent address
            {
              memcmp: {
                offset: 8 + 32, // Skip discriminator + client, get agent
                bytes: new PublicKey(agentAddress).toBase58()
              }
            }
          ]
        }
      )

      // Count resolved escrows
      let resolvedCount = 0
      const escrowDecoder = getEscrowDecoder()
      
      for (const account of escrows) {
        try {
          const escrow = escrowDecoder.decode(account.account.data)
          if (escrow.status === EscrowStatus.Resolved) {
            // Check if resolution was favorable for the agent
            // This is a simplified check - in production you'd analyze resolutionNotes
            resolvedCount++
          }
        } catch {
          // Skip invalid escrows
          continue
        }
      }

      return resolvedCount
    } catch (error) {
      console.warn('Failed to get resolved dispute count:', error)
      return 0
    }
  }

  /**
   * Calculate badges earned by an agent
   * 
   * @param agentAddress - The agent's address
   * @param metrics - Agent performance metrics
   * @returns Array of earned badges
   */
  private async calculateBadges(
    agentAddress: Address, 
    metrics: {
      reputationScore: number
      totalJobsCompleted: number
      avgResponseTime: number
      disputesResolved: number
    }
  ): Promise<ReputationBadge[]> {
    const badges: ReputationBadge[] = []
    const now = Math.floor(Date.now() / 1000)

    // Job count badges
    if (metrics.totalJobsCompleted >= 1) {
      badges.push({
        badgeType: BadgeType.FirstJob,
        earnedAt: now,
        achievementValue: 1
      })
    }

    if (metrics.totalJobsCompleted >= 10) {
      badges.push({
        badgeType: BadgeType.TenJobs,
        earnedAt: now,
        achievementValue: 10
      })
    }

    if (metrics.totalJobsCompleted >= 100) {
      badges.push({
        badgeType: BadgeType.HundredJobs,
        earnedAt: now,
        achievementValue: 100
      })
    }

    if (metrics.totalJobsCompleted >= 1000) {
      badges.push({
        badgeType: BadgeType.ThousandJobs,
        earnedAt: now,
        achievementValue: 1000
      })
    }

    // Perfect rating badge (95% or higher)
    if (metrics.reputationScore >= 9500) {
      badges.push({
        badgeType: BadgeType.PerfectRating,
        earnedAt: now,
        achievementValue: metrics.reputationScore
      })
    }

    // Quick responder badge (average response time < 1 hour)
    if (metrics.avgResponseTime > 0 && metrics.avgResponseTime < 3600) {
      badges.push({
        badgeType: BadgeType.QuickResponder,
        earnedAt: now,
        achievementValue: metrics.avgResponseTime
      })
    }

    // Dispute resolver badge (5+ resolved disputes)
    if (metrics.disputesResolved >= 5) {
      badges.push({
        badgeType: BadgeType.DisputeResolver,
        earnedAt: now,
        achievementValue: metrics.disputesResolved
      })
    }

    // High earner badge - check total earnings
    try {
      const totalEarnings = await this.getAgentTotalEarnings(agentAddress)
      if (totalEarnings >= 1000000000000n) { // 1000 SOL
        badges.push({
          badgeType: BadgeType.HighEarner,
          earnedAt: now,
          achievementValue: Number(totalEarnings / 1000000000n) // Convert to SOL
        })
      }
    } catch {
      // Skip high earner badge if we can't get earnings
    }

    // Category expert and cross-category badges would require category data
    // These will be implemented when category tracking is available

    return badges
  }

  /**
   * Get total earnings for an agent
   * 
   * @param agentAddress - The agent's address
   * @returns Total earnings in lamports
   */
  private async getAgentTotalEarnings(agentAddress: Address): Promise<bigint> {
    try {
      // Get agent account data
      const accountInfo = await this.typedRpc.getAccountInfo(agentAddress, { encoding: 'base64' })
      
      if (!accountInfo?.value) {
        return 0n
      }

      // Decode agent data
      const { getAgentDecoder } = await import('../../generated/accounts/agent')
      const agentDecoder = getAgentDecoder()
      const agentData = agentDecoder.decode(new Uint8Array(Buffer.from(accountInfo.value.data as string, 'base64')))
      
      return agentData.totalEarnings ?? 0n
    } catch (error) {
      console.warn('Failed to get agent earnings:', error)
      return 0n
    }
  }
}