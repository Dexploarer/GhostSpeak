/**
 * Reputation Command Tests
 * Tests for Ghost Score reputation management commands
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { reputationCommand } from '../../src/commands/reputation.js'
import {
  createMockSDKClient,
  createMockWallet,
  createMockRpc,
  createMockAgentData,
  calculateGhostScore,
  determineTier,
  mockConsole
} from '../utils/test-helpers.js'

// Mock dependencies
vi.mock('@clack/prompts', () => ({
  intro: vi.fn(),
  outro: vi.fn(),
  text: vi.fn(async () => 'TestAgent1111111111111111111111111111'),
  select: vi.fn(async () => 'public'),
  confirm: vi.fn(async () => true),
  spinner: vi.fn(() => ({
    start: vi.fn(),
    stop: vi.fn()
  })),
  isCancel: vi.fn(() => false),
  cancel: vi.fn(),
  log: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn()
  },
  note: vi.fn()
}))

vi.mock('../../src/utils/client.js', () => ({
  initializeClient: vi.fn(async () => ({
    client: createMockSDKClient(),
    wallet: createMockWallet(),
    rpc: createMockRpc()
  })),
  getExplorerUrl: vi.fn((sig) => `https://explorer.solana.com/tx/${sig}?cluster=devnet`),
  handleTransactionError: vi.fn((error) => error.message),
  toSDKSigner: vi.fn((wallet) => wallet)
}))

vi.mock('../../src/utils/sdk-helpers.js', () => ({
  createSafeSDKClient: vi.fn((client) => client)
}))

vi.mock('@solana/addresses', () => ({
  address: vi.fn((addr) => addr)
}))

describe('Reputation Command', () => {
  let restoreConsole: () => void

  beforeEach(() => {
    vi.clearAllMocks()
    restoreConsole = mockConsole()
  })

  afterEach(() => {
    restoreConsole()
  })

  describe('command structure', () => {
    it('should have reputation command', () => {
      expect(reputationCommand.name()).toBe('reputation')
      expect(reputationCommand.description()).toContain('reputation')
    })

    it('should have get subcommand', () => {
      const getCmd = reputationCommand.commands.find(cmd => cmd.name() === 'get')
      expect(getCmd).toBeDefined()
      expect(getCmd?.description()).toContain('Ghost Score')
    })

    it('should have update subcommand', () => {
      const updateCmd = reputationCommand.commands.find(cmd => cmd.name() === 'update')
      expect(updateCmd).toBeDefined()
      expect(updateCmd?.description()).toContain('reputation')
    })

    it('should have history subcommand', () => {
      const historyCmd = reputationCommand.commands.find(cmd => cmd.name() === 'history')
      expect(historyCmd).toBeDefined()
      expect(historyCmd?.description()).toContain('history')
    })
  })

  describe('get command options', () => {
    it('should have agent option', () => {
      const getCmd = reputationCommand.commands.find(cmd => cmd.name() === 'get')
      const options = getCmd?.options.map(opt => opt.long)
      expect(options).toContain('--agent')
    })

    it('should have json option', () => {
      const getCmd = reputationCommand.commands.find(cmd => cmd.name() === 'get')
      const options = getCmd?.options.map(opt => opt.long)
      expect(options).toContain('--json')
    })

    it('should have detailed option', () => {
      const getCmd = reputationCommand.commands.find(cmd => cmd.name() === 'get')
      const options = getCmd?.options.map(opt => opt.long)
      expect(options).toContain('--detailed')
    })
  })

  describe('update command options', () => {
    it('should have agent option', () => {
      const updateCmd = reputationCommand.commands.find(cmd => cmd.name() === 'update')
      const options = updateCmd?.options.map(opt => opt.long)
      expect(options).toContain('--agent')
    })

    it('should have score option', () => {
      const updateCmd = reputationCommand.commands.find(cmd => cmd.name() === 'update')
      const options = updateCmd?.options.map(opt => opt.long)
      expect(options).toContain('--score')
    })
  })

  describe('history command options', () => {
    it('should have agent option', () => {
      const historyCmd = reputationCommand.commands.find(cmd => cmd.name() === 'history')
      const options = historyCmd?.options.map(opt => opt.long)
      expect(options).toContain('--agent')
    })

    it('should have limit option', () => {
      const historyCmd = reputationCommand.commands.find(cmd => cmd.name() === 'history')
      const options = historyCmd?.options.map(opt => opt.long)
      expect(options).toContain('--limit')
    })

    it('should have json option', () => {
      const historyCmd = reputationCommand.commands.find(cmd => cmd.name() === 'history')
      const options = historyCmd?.options.map(opt => opt.long)
      expect(options).toContain('--json')
    })
  })
})

describe('Ghost Score Calculation', () => {
  it('should calculate Ghost Score from reputation score', () => {
    expect(calculateGhostScore(0)).toBe(0)
    expect(calculateGhostScore(50000)).toBe(500)
    expect(calculateGhostScore(75000)).toBe(750)
    expect(calculateGhostScore(90000)).toBe(900)
    expect(calculateGhostScore(100000)).toBe(1000)
  })

  it('should cap Ghost Score at 1000', () => {
    expect(calculateGhostScore(150000)).toBe(1000)
    expect(calculateGhostScore(200000)).toBe(1000)
  })

  it('should handle edge cases', () => {
    expect(calculateGhostScore(1)).toBe(0) // Rounds down
    expect(calculateGhostScore(99)).toBe(1) // Rounds down
    expect(calculateGhostScore(100)).toBe(1) // Exactly 1
  })
})

describe('Tier Determination', () => {
  it('should determine NEWCOMER tier', () => {
    expect(determineTier(0)).toBe('NEWCOMER')
    expect(determineTier(100)).toBe('NEWCOMER')
    expect(determineTier(199)).toBe('NEWCOMER')
  })

  it('should determine BRONZE tier', () => {
    expect(determineTier(200)).toBe('BRONZE')
    expect(determineTier(300)).toBe('BRONZE')
    expect(determineTier(499)).toBe('BRONZE')
  })

  it('should determine SILVER tier', () => {
    expect(determineTier(500)).toBe('SILVER')
    expect(determineTier(600)).toBe('SILVER')
    expect(determineTier(749)).toBe('SILVER')
  })

  it('should determine GOLD tier', () => {
    expect(determineTier(750)).toBe('GOLD')
    expect(determineTier(800)).toBe('GOLD')
    expect(determineTier(899)).toBe('GOLD')
  })

  it('should determine PLATINUM tier', () => {
    expect(determineTier(900)).toBe('PLATINUM')
    expect(determineTier(950)).toBe('PLATINUM')
    expect(determineTier(1000)).toBe('PLATINUM')
  })
})

describe('Agent Data Tests', () => {
  it('should create mock agent with reputation data', () => {
    const agent = createMockAgentData()
    expect(agent.name).toBe('TestAgent')
    expect(agent.reputationScore).toBe(50000)
    expect(agent.totalJobsCompleted).toBe(100)
    expect(agent.totalJobsFailed).toBe(10)
  })

  it('should calculate success rate correctly', () => {
    const agent = createMockAgentData({
      totalJobsCompleted: 90,
      totalJobsFailed: 10
    })

    const totalJobs = agent.totalJobsCompleted + agent.totalJobsFailed
    const successRate = Math.round((agent.totalJobsCompleted / totalJobs) * 100)

    expect(successRate).toBe(90)
  })

  it('should handle zero jobs case', () => {
    const agent = createMockAgentData({
      totalJobsCompleted: 0,
      totalJobsFailed: 0
    })

    const totalJobs = agent.totalJobsCompleted + agent.totalJobsFailed
    const successRate = totalJobs > 0 ? Math.round((agent.totalJobsCompleted / totalJobs) * 100) : 0

    expect(successRate).toBe(0)
  })

  it('should support custom reputation scores', () => {
    const newcomer = createMockAgentData({ reputationScore: 10000 }) // 100 Ghost Score
    const platinum = createMockAgentData({ reputationScore: 95000 }) // 950 Ghost Score

    expect(calculateGhostScore(newcomer.reputationScore)).toBe(100)
    expect(determineTier(calculateGhostScore(newcomer.reputationScore))).toBe('NEWCOMER')

    expect(calculateGhostScore(platinum.reputationScore)).toBe(950)
    expect(determineTier(calculateGhostScore(platinum.reputationScore))).toBe('PLATINUM')
  })
})

describe('Reputation Score Breakdown', () => {
  it('should calculate success rate component', () => {
    const successRate = 90 // 90%
    const successComponent = Math.round(successRate * 0.4)
    expect(successComponent).toBe(36) // 40% weight
  })

  it('should calculate service quality component', () => {
    const ghostScore = 750
    const serviceQuality = Math.min(100, Math.round((ghostScore / 10) * 1.2))
    const serviceComponent = Math.round(serviceQuality * 0.3)
    expect(serviceQuality).toBe(90)
    expect(serviceComponent).toBe(27) // 30% weight
  })

  it('should calculate response time component', () => {
    const responseTime = 95 // 95% on-time
    const responseComponent = Math.round(responseTime * 0.2)
    expect(responseComponent).toBe(19) // 20% weight
  })

  it('should calculate volume consistency component', () => {
    const totalJobs = 100
    const volumeConsistency = Math.min(100, Math.round((totalJobs / 100) * 100))
    const volumeComponent = Math.round(volumeConsistency * 0.1)
    expect(volumeConsistency).toBe(100)
    expect(volumeComponent).toBe(10) // 10% weight
  })
})
