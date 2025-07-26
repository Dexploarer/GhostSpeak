/**
 * Unit tests for ReputationInstructions
 * 
 * Tests reputation calculation, updates, decay mechanics,
 * milestone tracking, and performance-based adjustments.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { 
  generateKeyPairSigner, 
  address,
  type Address,
  type TransactionSigner,
  type Rpc,
  type Blockhash
} from '@solana/kit'
import { ReputationInstructions } from '../../src/client/instructions/ReputationInstructions'
import type { GhostSpeakConfig, ReputationTier } from '../../src/types'
import { calculateReputationScore } from '../../src/utils/reputation-calculator'
import type {
  ReputationProfile,
  ReputationMetrics,
  ReputationMilestone,
  ReputationEvent
} from '../../src/types/reputation-types'

// Mock the generated instructions
vi.mock('../../src/generated', () => ({
  getInitializeReputationInstruction: vi.fn(),
  getUpdateReputationScoreInstruction: vi.fn(),
  getApplyReputationDecayInstruction: vi.fn(),
  getAddReputationMilestoneInstruction: vi.fn(),
  getUpdateReputationMetricsInstruction: vi.fn(),
  getReputationProfileDecoder: vi.fn(),
  getReputationMilestoneDecoder: vi.fn()
}))

// Mock reputation calculator
vi.mock('../../src/utils/reputation-calculator', () => ({
  calculateReputationScore: vi.fn(),
  determineReputationTier: vi.fn(),
  calculateDecayAmount: vi.fn(),
  calculatePerformanceMultiplier: vi.fn()
}))

describe('ReputationInstructions', () => {
  let reputation: ReputationInstructions
  let mockRpc: vi.Mocked<Rpc<unknown>>
  let mockConfig: GhostSpeakConfig
  let signer: TransactionSigner
  let agentAddress: Address
  let reputationAddress: Address

  beforeEach(async () => {
    // Setup mocks
    signer = await generateKeyPairSigner()
    agentAddress = address('Agent111111111111111111111111111111111111111')
    reputationAddress = address('Rep11111111111111111111111111111111111111111')
    
    mockRpc = {
      getLatestBlockhash: vi.fn().mockReturnValue({
        send: vi.fn().mockResolvedValue({
          value: {
            blockhash: 'mock-blockhash' as unknown as Blockhash,
            lastValidBlockHeight: 123456n
          }
        })
      }),
      sendTransaction: vi.fn().mockReturnValue({
        send: vi.fn().mockResolvedValue('mock-signature')
      }),
      confirmTransaction: vi.fn().mockReturnValue({
        send: vi.fn().mockResolvedValue(true)
      }),
      getAccountInfo: vi.fn().mockReturnValue({
        send: vi.fn().mockResolvedValue({ value: null })
      }),
      getProgramAccounts: vi.fn().mockReturnValue({
        send: vi.fn().mockResolvedValue([])
      })
    } as unknown as vi.Mocked<Rpc<unknown>>

    mockConfig = {
      rpc: mockRpc,
      programId: address('GHOST1VYEzX9gPsJdDVMXQmL8aZAQoLZfxCMbKfYohcvy'),
      commitment: 'confirmed'
    }

    reputation = new ReputationInstructions(mockConfig)
  })

  describe('initializeReputation', () => {
    it('should initialize reputation profile for an agent', async () => {
      const { getInitializeReputationInstruction } = await import('../../src/generated')
      
      ;(getInitializeReputationInstruction as vi.Mock).mockReturnValue({
        programAddress: mockConfig.programId,
        accounts: [],
        data: new Uint8Array()
      })

      const result = await reputation.initializeReputation({
        agent: agentAddress,
        reputationAccount: reputationAddress,
        signer
      })

      expect(result.signature).toBe('mock-signature')
      expect(result.reputation).toBe(reputationAddress)
      expect(getInitializeReputationInstruction).toHaveBeenCalledWith({
        reputation: reputationAddress,
        agent: agentAddress,
        owner: signer
      })
    })

    it('should initialize with custom starting values', async () => {
      const { getInitializeReputationInstruction } = await import('../../src/generated')
      
      ;(getInitializeReputationInstruction as vi.Mock).mockReturnValue({
        programAddress: mockConfig.programId,
        accounts: [],
        data: new Uint8Array()
      })

      await reputation.initializeReputation({
        agent: agentAddress,
        reputationAccount: reputationAddress,
        initialScore: 5000, // Start at Bronze tier
        initialMetrics: {
          totalTasks: 10,
          completedTasks: 8,
          failedTasks: 2,
          averageRating: 8500, // 85%
          totalEarnings: 100_000_000n
        },
        signer
      })

      expect(getInitializeReputationInstruction).toHaveBeenCalledWith(
        expect.objectContaining({
          initialScore: 5000,
          initialMetrics: expect.objectContaining({
            totalTasks: 10,
            completedTasks: 8
          })
        })
      )
    })
  })

  describe('updateReputationScore', () => {
    it('should update reputation based on task completion', async () => {
      const { getUpdateReputationScoreInstruction } = await import('../../src/generated')
      ;(calculateReputationScore as vi.Mock).mockReturnValue({
        newScore: 7500,
        scoreChange: 500,
        tier: 'Silver' as ReputationTier
      })
      
      ;(getUpdateReputationScoreInstruction as vi.Mock).mockReturnValue({
        programAddress: mockConfig.programId,
        accounts: [],
        data: new Uint8Array()
      })

      const result = await reputation.updateReputationScore({
        agent: agentAddress,
        event: {
          type: 'task_completed',
          taskId: 'task-123',
          performance: {
            completionTime: 3600n, // 1 hour
            rating: 9000, // 90%
            onTime: true
          }
        },
        signer
      })

      expect(result.signature).toBe('mock-signature')
      expect(result.newScore).toBe(7500)
      expect(result.scoreChange).toBe(500)
      expect(calculateReputationScore).toHaveBeenCalled()
    })

    it('should handle negative reputation changes', async () => {
      const { getUpdateReputationScoreInstruction } = await import('../../src/generated')
      ;(calculateReputationScore as vi.Mock).mockReturnValue({
        newScore: 6500,
        scoreChange: -500,
        tier: 'Bronze' as ReputationTier
      })
      
      ;(getUpdateReputationScoreInstruction as vi.Mock).mockReturnValue({
        programAddress: mockConfig.programId,
        accounts: [],
        data: new Uint8Array()
      })

      const result = await reputation.updateReputationScore({
        agent: agentAddress,
        event: {
          type: 'task_failed',
          taskId: 'task-456',
          reason: 'Deadline missed'
        },
        signer
      })

      expect(result.scoreChange).toBe(-500)
      expect(result.newScore).toBe(6500)
    })

    it('should apply bonus for exceptional performance', async () => {
      const { getUpdateReputationScoreInstruction } = await import('../../src/generated')
      ;(calculateReputationScore as vi.Mock).mockReturnValue({
        newScore: 8500,
        scoreChange: 1000,
        tier: 'Gold' as ReputationTier,
        bonusApplied: true
      })
      
      ;(getUpdateReputationScoreInstruction as vi.Mock).mockReturnValue({
        programAddress: mockConfig.programId,
        accounts: [],
        data: new Uint8Array()
      })

      const result = await reputation.updateReputationScore({
        agent: agentAddress,
        event: {
          type: 'task_completed',
          taskId: 'task-789',
          performance: {
            completionTime: 1800n, // 30 minutes (50% faster than estimated)
            rating: 10000, // Perfect rating
            onTime: true,
            bonusEligible: true
          }
        },
        signer
      })

      expect(result.scoreChange).toBe(1000) // Higher than normal due to bonus
    })
  })

  describe('applyReputationDecay', () => {
    it('should apply time-based reputation decay', async () => {
      const { getApplyReputationDecayInstruction } = await import('../../src/generated')
      const { calculateDecayAmount } = await import('../../src/utils/reputation-calculator')
      
      ;(calculateDecayAmount as vi.Mock).mockReturnValue({
        decayAmount: 100,
        daysInactive: 30
      })
      
      ;(getApplyReputationDecayInstruction as vi.Mock).mockReturnValue({
        programAddress: mockConfig.programId,
        accounts: [],
        data: new Uint8Array()
      })

      const result = await reputation.applyReputationDecay({
        agent: agentAddress,
        signer
      })

      expect(result.signature).toBe('mock-signature')
      expect(result.decayApplied).toBe(100)
      expect(calculateDecayAmount).toHaveBeenCalled()
    })

    it('should not apply decay to recently active agents', async () => {
      const { calculateDecayAmount } = await import('../../src/utils/reputation-calculator')
      
      ;(calculateDecayAmount as vi.Mock).mockReturnValue({
        decayAmount: 0,
        daysInactive: 2
      })

      const result = await reputation.applyReputationDecay({
        agent: agentAddress,
        signer
      })

      expect(result.decayApplied).toBe(0)
    })

    it('should cap decay at maximum percentage', async () => {
      const { getApplyReputationDecayInstruction } = await import('../../src/generated')
      const { calculateDecayAmount } = await import('../../src/utils/reputation-calculator')
      
      ;(calculateDecayAmount as vi.Mock).mockReturnValue({
        decayAmount: 2000, // 20% of 10000 score
        daysInactive: 180,
        capped: true
      })
      
      ;(getApplyReputationDecayInstruction as vi.Mock).mockReturnValue({
        programAddress: mockConfig.programId,
        accounts: [],
        data: new Uint8Array()
      })

      const result = await reputation.applyReputationDecay({
        agent: agentAddress,
        maxDecayPercentage: 20,
        signer
      })

      expect(result.decayApplied).toBe(2000)
      expect(result.wasCapped).toBe(true)
    })
  })

  describe('addReputationMilestone', () => {
    it('should add achievement milestone', async () => {
      const { getAddReputationMilestoneInstruction } = await import('../../src/generated')
      const milestoneAddress = address('Mile1111111111111111111111111111111111111')
      
      ;(getAddReputationMilestoneInstruction as vi.Mock).mockReturnValue({
        programAddress: mockConfig.programId,
        accounts: [],
        data: new Uint8Array()
      })

      const milestone: ReputationMilestone = {
        type: 'tasks_completed',
        threshold: 100,
        name: 'Century Club',
        description: 'Complete 100 tasks',
        rewardPoints: 1000,
        tier: 'Gold'
      }

      const result = await reputation.addReputationMilestone({
        agent: agentAddress,
        milestoneAccount: milestoneAddress,
        milestone,
        signer
      })

      expect(result.signature).toBe('mock-signature')
      expect(getAddReputationMilestoneInstruction).toHaveBeenCalledWith({
        milestone: milestoneAddress,
        agent: agentAddress,
        authority: signer,
        milestoneData: milestone
      })
    })

    it('should add revenue milestone', async () => {
      const { getAddReputationMilestoneInstruction } = await import('../../src/generated')
      const milestoneAddress = address('Mile2222222222222222222222222222222222222')
      
      ;(getAddReputationMilestoneInstruction as vi.Mock).mockReturnValue({
        programAddress: mockConfig.programId,
        accounts: [],
        data: new Uint8Array()
      })

      const milestone: ReputationMilestone = {
        type: 'revenue_earned',
        threshold: 1_000_000_000n, // 1000 tokens
        name: 'High Earner',
        description: 'Earn 1000 tokens in total',
        rewardPoints: 2000,
        tier: 'Platinum',
        oneTime: true
      }

      await reputation.addReputationMilestone({
        agent: agentAddress,
        milestoneAccount: milestoneAddress,
        milestone,
        signer
      })

      expect(getAddReputationMilestoneInstruction).toHaveBeenCalledWith(
        expect.objectContaining({
          milestoneData: expect.objectContaining({
            type: 'revenue_earned',
            threshold: 1_000_000_000n,
            oneTime: true
          })
        })
      )
    })
  })

  describe('updateReputationMetrics', () => {
    it('should update agent performance metrics', async () => {
      const { getUpdateReputationMetricsInstruction } = await import('../../src/generated')
      
      ;(getUpdateReputationMetricsInstruction as vi.Mock).mockReturnValue({
        programAddress: mockConfig.programId,
        accounts: [],
        data: new Uint8Array()
      })

      const metrics: ReputationMetrics = {
        totalTasks: 150,
        completedTasks: 140,
        failedTasks: 10,
        averageRating: 9200, // 92%
        totalEarnings: 1_500_000_000n,
        responseTime: 2400n, // Average 40 minutes
        disputesWon: 5,
        disputesLost: 1,
        uniqueClients: 45,
        repeatClients: 20,
        specializations: ['smart-contracts', 'security-audits']
      }

      const result = await reputation.updateReputationMetrics({
        agent: agentAddress,
        metrics,
        signer
      })

      expect(result.signature).toBe('mock-signature')
      expect(getUpdateReputationMetricsInstruction).toHaveBeenCalledWith({
        agent: agentAddress,
        authority: signer,
        metrics
      })
    })

    it('should calculate derived metrics', async () => {
      const { getUpdateReputationMetricsInstruction } = await import('../../src/generated')
      
      ;(getUpdateReputationMetricsInstruction as vi.Mock).mockReturnValue({
        programAddress: mockConfig.programId,
        accounts: [],
        data: new Uint8Array()
      })

      const metrics: ReputationMetrics = {
        totalTasks: 100,
        completedTasks: 95,
        failedTasks: 5,
        averageRating: 8800,
        totalEarnings: 800_000_000n
      }

      const result = await reputation.updateReputationMetrics({
        agent: agentAddress,
        metrics,
        calculateDerived: true,
        signer
      })

      expect(result.completionRate).toBe(9500) // 95%
      expect(result.averageEarningsPerTask).toBe(8_421_052n) // ~8.42 tokens per task
    })
  })

  describe('Query Operations', () => {
    it('should get reputation profile by agent', async () => {
      const mockProfile: ReputationProfile = {
        agent: agentAddress,
        score: 7500,
        tier: 'Silver',
        metrics: {
          totalTasks: 75,
          completedTasks: 70,
          failedTasks: 5,
          averageRating: 8900,
          totalEarnings: 750_000_000n
        },
        lastUpdated: BigInt(Date.now() / 1000),
        createdAt: BigInt(Date.now() / 1000 - 86400 * 30), // 30 days ago
        milestones: [],
        badges: [],
        streaks: {
          currentStreak: 10,
          longestStreak: 25
        }
      }

      const { getReputationProfileDecoder } = await import('../../src/generated')
      ;(getReputationProfileDecoder as vi.Mock).mockReturnValue({
        decode: vi.fn().mockReturnValue(mockProfile)
      })

      mockRpc.getAccountInfo = vi.fn().mockReturnValue({
        send: vi.fn().mockResolvedValue({
          value: {
            data: new Uint8Array(1000),
            owner: mockConfig.programId
          }
        })
      })

      const result = await reputation.getReputationProfile(agentAddress)

      expect(result).toBeDefined()
      expect(result?.score).toBe(7500)
      expect(result?.tier).toBe('Silver')
    })

    it('should query top agents by reputation', async () => {
      const mockProfiles = [
        {
          address: address('TopAgent11111111111111111111111111111111111'),
          data: {
            agent: address('TopAgent11111111111111111111111111111111111'),
            score: 9500,
            tier: 'Platinum'
          }
        },
        {
          address: address('TopAgent22222222222222222222222222222222222'),
          data: {
            agent: address('TopAgent22222222222222222222222222222222222'),
            score: 9200,
            tier: 'Gold'
          }
        },
        {
          address: address('TopAgent33333333333333333333333333333333333'),
          data: {
            agent: address('TopAgent33333333333333333333333333333333333'),
            score: 9000,
            tier: 'Gold'
          }
        }
      ]

      const { getReputationProfileDecoder } = await import('../../src/generated')
      ;(getReputationProfileDecoder as vi.Mock).mockReturnValue({
        decode: (data: any) => data
      })

      mockRpc.getProgramAccounts = vi.fn().mockReturnValue({
        send: vi.fn().mockResolvedValue(mockProfiles)
      })

      const topAgents = await reputation.getTopAgentsByReputation({ limit: 3 })

      expect(topAgents).toHaveLength(3)
      expect(topAgents[0].score).toBe(9500)
      expect(topAgents[0].tier).toBe('Platinum')
      expect(topAgents[1].score).toBe(9200)
      expect(topAgents[2].score).toBe(9000)
    })

    it('should query agents by tier', async () => {
      const mockProfiles = [
        {
          address: address('GoldAgent111111111111111111111111111111111'),
          data: {
            agent: address('GoldAgent111111111111111111111111111111111'),
            score: 8500,
            tier: 'Gold'
          }
        },
        {
          address: address('GoldAgent222222222222222222222222222222222'),
          data: {
            agent: address('GoldAgent222222222222222222222222222222222'),
            score: 8200,
            tier: 'Gold'
          }
        }
      ]

      const { getReputationProfileDecoder } = await import('../../src/generated')
      ;(getReputationProfileDecoder as vi.Mock).mockReturnValue({
        decode: (data: any) => data
      })

      mockRpc.getProgramAccounts = vi.fn().mockReturnValue({
        send: vi.fn().mockResolvedValue(mockProfiles)
      })

      const goldAgents = await reputation.getAgentsByTier('Gold')

      expect(goldAgents).toHaveLength(2)
      expect(goldAgents.every(agent => agent.tier === 'Gold')).toBe(true)
    })

    it('should get reputation history for agent', async () => {
      const mockEvents: ReputationEvent[] = [
        {
          timestamp: BigInt(Date.now() / 1000 - 3600),
          type: 'task_completed',
          scoreChange: 100,
          newScore: 7600,
          details: { taskId: 'task-1', rating: 9000 }
        },
        {
          timestamp: BigInt(Date.now() / 1000 - 7200),
          type: 'milestone_achieved',
          scoreChange: 500,
          newScore: 7500,
          details: { milestone: 'First 50 Tasks' }
        },
        {
          timestamp: BigInt(Date.now() / 1000 - 10800),
          type: 'task_failed',
          scoreChange: -50,
          newScore: 7000,
          details: { taskId: 'task-2', reason: 'Quality issues' }
        }
      ]

      vi.spyOn(reputation, 'getReputationHistory').mockResolvedValue(mockEvents)

      const history = await reputation.getReputationHistory(agentAddress, {
        limit: 10,
        startTime: BigInt(Date.now() / 1000 - 86400) // Last 24 hours
      })

      expect(history).toHaveLength(3)
      expect(history[0].type).toBe('task_completed')
      expect(history[0].scoreChange).toBe(100)
    })
  })

  describe('Reputation Tiers', () => {
    it('should determine correct tier based on score', async () => {
      const { determineReputationTier } = await import('../../src/utils/reputation-calculator')
      
      const tierTests = [
        { score: 0, expectedTier: 'Unranked' },
        { score: 2500, expectedTier: 'Bronze' },
        { score: 5000, expectedTier: 'Silver' },
        { score: 7500, expectedTier: 'Gold' },
        { score: 9000, expectedTier: 'Platinum' },
        { score: 9500, expectedTier: 'Diamond' },
        { score: 10000, expectedTier: 'Legendary' }
      ]

      for (const { score, expectedTier } of tierTests) {
        ;(determineReputationTier as vi.Mock).mockReturnValue(expectedTier)
        const tier = await reputation.getReputationTier(score)
        expect(tier).toBe(expectedTier)
      }
    })

    it('should calculate tier benefits correctly', async () => {
      const benefits = await reputation.getTierBenefits('Gold')

      expect(benefits).toEqual({
        feeDiscount: 500, // 5% discount
        prioritySupport: true,
        maxActiveListings: 20,
        escrowFeeReduction: 250, // 2.5%
        votingPowerMultiplier: 150 // 1.5x
      })
    })
  })

  describe('Performance Multipliers', () => {
    it('should calculate performance multiplier based on metrics', async () => {
      const { calculatePerformanceMultiplier } = await import('../../src/utils/reputation-calculator')
      
      ;(calculatePerformanceMultiplier as vi.Mock).mockReturnValue({
        multiplier: 1.25,
        factors: {
          completionRate: 1.1,
          averageRating: 1.15,
          responseTime: 1.0
        }
      })

      const multiplier = await reputation.calculatePerformanceMultiplier({
        completionRate: 9500, // 95%
        averageRating: 9200, // 92%
        averageResponseTime: 3600n // 1 hour
      })

      expect(multiplier.multiplier).toBe(1.25)
      expect(multiplier.factors.completionRate).toBe(1.1)
    })
  })

  describe('Error Handling', () => {
    it('should handle missing reputation profile gracefully', async () => {
      mockRpc.getAccountInfo = vi.fn().mockReturnValue({
        send: vi.fn().mockResolvedValue({ value: null })
      })

      const result = await reputation.getReputationProfile(agentAddress)
      expect(result).toBeNull()
    })

    it('should validate score updates are within bounds', async () => {
      await expect(
        reputation.updateReputationScore({
          agent: agentAddress,
          scoreChange: 20000, // Too large
          signer
        })
      ).rejects.toThrow('Score change exceeds maximum allowed')
    })

    it('should handle RPC errors with enhanced messages', async () => {
      mockRpc.getLatestBlockhash = vi.fn().mockReturnValue({
        send: vi.fn().mockRejectedValue(new Error('Network error'))
      })

      await expect(
        reputation.initializeReputation({
          agent: agentAddress,
          reputationAccount: reputationAddress,
          signer
        })
      ).rejects.toThrow('Failed to initialize reputation')
    })
  })

  describe('Batch Operations', () => {
    it('should update multiple agents reputation in batch', async () => {
      const agents = [
        { address: address('Agent111111111111111111111111111111111111111'), scoreChange: 100 },
        { address: address('Agent222222222222222222222222222222222222222'), scoreChange: -50 },
        { address: address('Agent333333333333333333333333333333333333333'), scoreChange: 200 }
      ]

      const results = await reputation.batchUpdateReputation(agents, signer)

      expect(results).toHaveLength(3)
      expect(results[0].success).toBe(true)
      expect(results[0].scoreChange).toBe(100)
      expect(results[1].scoreChange).toBe(-50)
      expect(results[2].scoreChange).toBe(200)
    })

    it('should apply decay to all inactive agents', async () => {
      const inactiveAgents = [
        address('InactiveAgent11111111111111111111111111111'),
        address('InactiveAgent22222222222222222222222222222'),
        address('InactiveAgent33333333333333333333333333333')
      ]

      vi.spyOn(reputation, 'getInactiveAgents').mockResolvedValue(inactiveAgents)

      const results = await reputation.applyDecayToInactiveAgents({
        inactivityThreshold: 30, // 30 days
        signer
      })

      expect(results.processed).toBe(3)
      expect(results.totalDecayApplied).toBeGreaterThan(0)
    })
  })
})