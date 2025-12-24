/**
 * Staking Module
 *
 * Manages GHOST token staking operations including:
 * - Creating staking accounts
 * - Staking tokens with lockup tiers
 * - Claiming rewards
 * - Auto-compounding
 */

import type { Address } from '@solana/addresses'
import type { TransactionSigner } from '@solana/kit'
import { getProgramDerivedAddress, getAddressEncoder, getBytesEncoder } from '@solana/kit'
import { BaseModule } from '../../core/BaseModule.js'
import {
  getCreateStakingAccountInstructionAsync,
  getClaimStakingRewardsInstructionAsync,
  getInitializeStakingConfigInstructionAsync,
} from '../../generated/index.js'
import type { StakingAccount, StakingConfig } from '../../generated/index.js'

/**
 * Lockup tier enum for staking
 */
export enum LockupTier {
  None = 0,
  OneMonth = 1,
  ThreeMonths = 2,
  SixMonths = 3,
  OneYear = 4,
  TwoYears = 5,
}

/**
 * Staking module for GHOST token staking operations
 */
export class StakingModule extends BaseModule {
  /**
   * Derive staking account PDA for a user
   * Seeds: ["staking", owner]
   */
  async deriveStakingAccountPda(owner: Address): Promise<Address> {
    const [pda] = await getProgramDerivedAddress({
      programAddress: this.programId,
      seeds: [
        getBytesEncoder().encode(new TextEncoder().encode('staking')),
        getAddressEncoder().encode(owner),
      ],
    })
    return pda
  }

  /**
   * Derive staking config PDA
   * Seeds: ["staking_config"]
   */
  async deriveStakingConfigPda(): Promise<Address> {
    const [pda] = await getProgramDerivedAddress({
      programAddress: this.programId,
      seeds: [
        getBytesEncoder().encode(new TextEncoder().encode('staking_config')),
      ],
    })
    return pda
  }

  /**
   * Initialize staking configuration (admin only)
   */
  async initializeConfig(params: {
    signer: TransactionSigner
    ghostTokenMint: Address
    rewardsTreasury: Address
    baseApy: number
    minStakeAmount: bigint
    maxStakeAmount: bigint
  }): Promise<string> {
    const instructionGetter = async () => {
      return getInitializeStakingConfigInstructionAsync({
        authority: params.signer,
        ghostTokenMint: params.ghostTokenMint,
        rewardsTreasury: params.rewardsTreasury,
        baseApy: params.baseApy,
        minStakeAmount: params.minStakeAmount,
        maxStakeAmount: params.maxStakeAmount,
      })
    }

    return this.execute('initializeStakingConfig', instructionGetter, [params.signer])
  }

  /**
   * Create a staking account for a user
   */
  async createStakingAccount(params: {
    signer: TransactionSigner
  }): Promise<string> {
    const instructionGetter = async () => {
      return getCreateStakingAccountInstructionAsync({
        owner: params.signer,
      })
    }

    return this.execute('createStakingAccount', instructionGetter, [params.signer])
  }

  /**
   * Claim staking rewards
   */
  async claimRewards(params: {
    signer: TransactionSigner
    ghostMint: Address
    userTokenAccount: Address
    rewardsTreasury: Address
  }): Promise<string> {
    const instructionGetter = async () => {
      return getClaimStakingRewardsInstructionAsync({
        owner: params.signer,
        ghostMint: params.ghostMint,
        userTokenAccount: params.userTokenAccount,
        rewardsTreasury: params.rewardsTreasury,
      })
    }

    return this.execute('claimStakingRewards', instructionGetter, [params.signer])
  }

  /**
   * Get staking account for a user
   */
  async getStakingAccount(owner: Address): Promise<StakingAccount | null> {
    const stakingAccountAddress = await this.deriveStakingAccountPda(owner)
    return this.getAccount<StakingAccount>(stakingAccountAddress, 'StakingAccount')
  }

  /**
   * Get staking account by address
   */
  async getStakingAccountByAddress(address: Address): Promise<StakingAccount | null> {
    return this.getAccount<StakingAccount>(address, 'StakingAccount')
  }

  /**
   * Get all staking accounts
   */
  async getAllStakingAccounts(): Promise<{ address: Address; data: StakingAccount }[]> {
    return this.getProgramAccounts<StakingAccount>('StakingAccount')
  }

  /**
   * Get staking config
   */
  async getStakingConfig(): Promise<StakingConfig | null> {
    const configAddress = await this.deriveStakingConfigPda()
    return this.getAccount<StakingConfig>(configAddress, 'StakingConfig')
  }

  /**
   * Calculate pending rewards for a staking account
   */
  calculatePendingRewards(stakingAccount: StakingAccount, config: StakingConfig): bigint {
    const now = BigInt(Math.floor(Date.now() / 1000))
    const timeSinceLastClaim = now - stakingAccount.lastClaimAt

    // Base reward = staked * baseApy * time / (365 days * 10000 for bps)
    const baseReward =
      (stakingAccount.stakedAmount * BigInt(config.baseApy) * timeSinceLastClaim) /
      BigInt(365 * 24 * 60 * 60 * 10000)

    // Apply lockup tier bonus
    const tierBonus = this.getTierBonusApy(stakingAccount.lockupTier, config)
    const bonusReward =
      (stakingAccount.stakedAmount * BigInt(tierBonus) * timeSinceLastClaim) /
      BigInt(365 * 24 * 60 * 60 * 10000)

    return baseReward + bonusReward + stakingAccount.pendingRewards
  }

  /**
   * Get tier bonus APY in basis points
   */
  getTierBonusApy(tier: number, config: StakingConfig): number {
    if (config.tierBonusApy && tier < config.tierBonusApy.length) {
      return config.tierBonusApy[tier]
    }
    return 0
  }

  /**
   * Get lockup duration in seconds for a tier
   */
  getLockupDuration(tier: LockupTier): number {
    const durations: Record<LockupTier, number> = {
      [LockupTier.None]: 0,
      [LockupTier.OneMonth]: 30 * 24 * 60 * 60,
      [LockupTier.ThreeMonths]: 90 * 24 * 60 * 60,
      [LockupTier.SixMonths]: 180 * 24 * 60 * 60,
      [LockupTier.OneYear]: 365 * 24 * 60 * 60,
      [LockupTier.TwoYears]: 730 * 24 * 60 * 60,
    }
    return durations[tier] || 0
  }

  /**
   * Check if a staking account is locked
   */
  isLocked(stakingAccount: StakingAccount): boolean {
    const now = BigInt(Math.floor(Date.now() / 1000))
    return stakingAccount.lockupEndsAt > now
  }

  /**
   * Get time remaining on lockup in seconds
   */
  getLockupTimeRemaining(stakingAccount: StakingAccount): number {
    const now = BigInt(Math.floor(Date.now() / 1000))
    if (stakingAccount.lockupEndsAt <= now) {
      return 0
    }
    return Number(stakingAccount.lockupEndsAt - now)
  }
}
