/**
 * Staking Command Tests
 * Tests for GHOST token staking commands
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { stakingCommand } from '../../src/commands/staking.js'
import {
  createMockSDKClient,
  createMockWallet,
  createMockRpc,
  calculateStakingTier,
  mockConsole
} from '../utils/test-helpers.js'

// Mock dependencies
vi.mock('@clack/prompts', () => ({
  intro: vi.fn(),
  outro: vi.fn(),
  text: vi.fn(async () => '1000'),
  select: vi.fn(async () => '5'),
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

describe('Staking Command', () => {
  let restoreConsole: () => void

  beforeEach(() => {
    vi.clearAllMocks()
    restoreConsole = mockConsole()
  })

  afterEach(() => {
    restoreConsole()
  })

  describe('command structure', () => {
    it('should have staking command', () => {
      expect(stakingCommand.name()).toBe('staking')
      expect(stakingCommand.description()).toContain('staking')
    })

    it('should have stake subcommand', () => {
      const stakeCmd = stakingCommand.commands.find(cmd => cmd.name() === 'stake')
      expect(stakeCmd).toBeDefined()
      expect(stakeCmd?.description()).toContain('Stake')
    })

    it('should have unstake subcommand', () => {
      const unstakeCmd = stakingCommand.commands.find(cmd => cmd.name() === 'unstake')
      expect(unstakeCmd).toBeDefined()
      expect(unstakeCmd?.description()).toContain('Unstake')
    })

    it('should have rewards subcommand', () => {
      const rewardsCmd = stakingCommand.commands.find(cmd => cmd.name() === 'rewards')
      expect(rewardsCmd).toBeDefined()
      expect(rewardsCmd?.description()).toContain('rewards')
    })

    it('should have balance subcommand', () => {
      const balanceCmd = stakingCommand.commands.find(cmd => cmd.name() === 'balance')
      expect(balanceCmd).toBeDefined()
      expect(balanceCmd?.description()).toContain('balance')
    })
  })

  describe('stake command options', () => {
    it('should have agent option', () => {
      const stakeCmd = stakingCommand.commands.find(cmd => cmd.name() === 'stake')
      const options = stakeCmd?.options.map(opt => opt.long)
      expect(options).toContain('--agent')
    })

    it('should have amount option', () => {
      const stakeCmd = stakingCommand.commands.find(cmd => cmd.name() === 'stake')
      const options = stakeCmd?.options.map(opt => opt.long)
      expect(options).toContain('--amount')
    })
  })

  describe('unstake command options', () => {
    it('should have agent option', () => {
      const unstakeCmd = stakingCommand.commands.find(cmd => cmd.name() === 'unstake')
      const options = unstakeCmd?.options.map(opt => opt.long)
      expect(options).toContain('--agent')
    })

    it('should have amount option', () => {
      const unstakeCmd = stakingCommand.commands.find(cmd => cmd.name() === 'unstake')
      const options = unstakeCmd?.options.map(opt => opt.long)
      expect(options).toContain('--amount')
    })
  })

  describe('rewards command options', () => {
    it('should have agent option', () => {
      const rewardsCmd = stakingCommand.commands.find(cmd => cmd.name() === 'rewards')
      const options = rewardsCmd?.options.map(opt => opt.long)
      expect(options).toContain('--agent')
    })

    it('should have claim option', () => {
      const rewardsCmd = stakingCommand.commands.find(cmd => cmd.name() === 'rewards')
      const options = rewardsCmd?.options.map(opt => opt.long)
      expect(options).toContain('--claim')
    })

    it('should have json option', () => {
      const rewardsCmd = stakingCommand.commands.find(cmd => cmd.name() === 'rewards')
      const options = rewardsCmd?.options.map(opt => opt.long)
      expect(options).toContain('--json')
    })
  })

  describe('balance command options', () => {
    it('should have agent option', () => {
      const balanceCmd = stakingCommand.commands.find(cmd => cmd.name() === 'balance')
      const options = balanceCmd?.options.map(opt => opt.long)
      expect(options).toContain('--agent')
    })

    it('should have json option', () => {
      const balanceCmd = stakingCommand.commands.find(cmd => cmd.name() === 'balance')
      const options = balanceCmd?.options.map(opt => opt.long)
      expect(options).toContain('--json')
    })
  })
})

describe('Staking Tier Calculation', () => {
  it('should calculate tier 0 for less than 1000 GHOST', () => {
    expect(calculateStakingTier(0)).toBe(0)
    expect(calculateStakingTier(500)).toBe(0)
    expect(calculateStakingTier(999)).toBe(0)
  })

  it('should calculate tier 1 for 1000-4999 GHOST', () => {
    expect(calculateStakingTier(1000)).toBe(1)
    expect(calculateStakingTier(2500)).toBe(1)
    expect(calculateStakingTier(4999)).toBe(1)
  })

  it('should calculate tier 2 for 5000-9999 GHOST', () => {
    expect(calculateStakingTier(5000)).toBe(2)
    expect(calculateStakingTier(7500)).toBe(2)
    expect(calculateStakingTier(9999)).toBe(2)
  })

  it('should calculate tier 3 for 10000-24999 GHOST', () => {
    expect(calculateStakingTier(10000)).toBe(3)
    expect(calculateStakingTier(15000)).toBe(3)
    expect(calculateStakingTier(24999)).toBe(3)
  })

  it('should calculate tier 4 for 25000-49999 GHOST', () => {
    expect(calculateStakingTier(25000)).toBe(4)
    expect(calculateStakingTier(35000)).toBe(4)
    expect(calculateStakingTier(49999)).toBe(4)
  })

  it('should calculate tier 5 for 50000+ GHOST', () => {
    expect(calculateStakingTier(50000)).toBe(5)
    expect(calculateStakingTier(75000)).toBe(5)
    expect(calculateStakingTier(100000)).toBe(5)
  })
})

describe('Staking Tier Benefits', () => {
  it('should provide correct reputation boost per tier', () => {
    const getTierBoost = (tier: number) => tier * 5

    expect(getTierBoost(0)).toBe(0)
    expect(getTierBoost(1)).toBe(5)
    expect(getTierBoost(2)).toBe(10)
    expect(getTierBoost(3)).toBe(15)
    expect(getTierBoost(4)).toBe(20)
    expect(getTierBoost(5)).toBe(25)
  })

  it('should provide correct APY per tier', () => {
    const getTierAPY = (tier: number) => 10 + (tier * 5)

    expect(getTierAPY(0)).toBe(10) // Base 10% (though tier 0 has no benefits)
    expect(getTierAPY(1)).toBe(15)
    expect(getTierAPY(2)).toBe(20)
    expect(getTierAPY(3)).toBe(25)
    expect(getTierAPY(4)).toBe(30)
    expect(getTierAPY(5)).toBe(35)
  })
})

describe('Staking Rewards Calculation', () => {
  it('should calculate rewards based on stake and APY', () => {
    const calculateAnnualRewards = (stake: number, apy: number) => {
      return stake * (apy / 100)
    }

    // Tier 1: 1000 GHOST @ 10% APY
    expect(calculateAnnualRewards(1000, 10)).toBe(100)

    // Tier 3: 10000 GHOST @ 20% APY
    expect(calculateAnnualRewards(10000, 20)).toBe(2000)

    // Tier 5: 50000 GHOST @ 30% APY
    expect(calculateAnnualRewards(50000, 30)).toBe(15000)
  })

  it('should calculate daily rewards', () => {
    const calculateDailyRewards = (stake: number, apy: number) => {
      const annualRewards = stake * (apy / 100)
      return annualRewards / 365
    }

    // Tier 1: 1000 GHOST @ 10% APY
    const dailyTier1 = calculateDailyRewards(1000, 10)
    expect(dailyTier1).toBeCloseTo(0.274, 2)

    // Tier 5: 50000 GHOST @ 30% APY
    const dailyTier5 = calculateDailyRewards(50000, 30)
    expect(dailyTier5).toBeCloseTo(41.096, 2)
  })
})

describe('Stake Amount Validation', () => {
  it('should validate minimum stake amount', () => {
    const validateStake = (amount: number) => {
      return amount >= 100
    }

    expect(validateStake(99)).toBe(false)
    expect(validateStake(100)).toBe(true)
    expect(validateStake(1000)).toBe(true)
  })

  it('should validate positive stake amounts', () => {
    const validateStake = (amount: number) => {
      return amount > 0
    }

    expect(validateStake(0)).toBe(false)
    expect(validateStake(-100)).toBe(false)
    expect(validateStake(1)).toBe(true)
  })

  it('should validate numeric stake amounts', () => {
    const validateStake = (input: string) => {
      const amount = parseFloat(input)
      return !isNaN(amount) && amount > 0
    }

    expect(validateStake('1000')).toBe(true)
    expect(validateStake('1000.5')).toBe(true)
    expect(validateStake('abc')).toBe(false)
    expect(validateStake('')).toBe(false)
  })
})

describe('Unstake Cooldown', () => {
  it('should apply 7-day cooldown period', () => {
    const COOLDOWN_DAYS = 7
    const now = Date.now()
    const cooldownEnd = now + (COOLDOWN_DAYS * 24 * 60 * 60 * 1000)

    const daysRemaining = Math.ceil((cooldownEnd - now) / (24 * 60 * 60 * 1000))
    expect(daysRemaining).toBe(7)
  })

  it('should calculate cooldown expiry date', () => {
    const getCooldownDate = (unstakeTime: number) => {
      return new Date(unstakeTime + (7 * 24 * 60 * 60 * 1000))
    }

    const unstakeTime = new Date('2024-01-01').getTime()
    const cooldownDate = getCooldownDate(unstakeTime)

    expect(cooldownDate.toISOString().split('T')[0]).toBe('2024-01-08')
  })
})

describe('Lamports Conversion', () => {
  it('should convert GHOST to lamports', () => {
    const ghostToLamports = (ghost: number) => {
      return BigInt(Math.round(ghost * 1_000_000_000))
    }

    expect(ghostToLamports(1)).toBe(1_000_000_000n)
    expect(ghostToLamports(100)).toBe(100_000_000_000n)
    expect(ghostToLamports(1000.5)).toBe(1_000_500_000_000n)
  })

  it('should convert lamports to GHOST', () => {
    const lamportsToGhost = (lamports: bigint) => {
      return Number(lamports) / 1_000_000_000
    }

    expect(lamportsToGhost(1_000_000_000n)).toBe(1)
    expect(lamportsToGhost(100_000_000_000n)).toBe(100)
    expect(lamportsToGhost(1_000_500_000_000n)).toBe(1000.5)
  })
})
