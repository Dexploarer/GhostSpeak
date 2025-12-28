'use client'

/**
 * Staking Dashboard Page
 *
 * Allows users to stake GHOST tokens, view rewards, and manage lockups.
 */

import { useState } from 'react'
import {
  useStakingConfig,
  useStakingAccount,
  useStakingStats,
  usePendingRewards,
  useStakingLockStatus,
  useCreateStakingAccount,
  useClaimStakingRewards,
} from '../../../lib/queries/staking'
import { useWalletAddress } from '../../../lib/hooks/useWalletAddress'
import { LockupTier } from '@ghostspeak/sdk/browser'

// Helper to format SOL amounts
function formatAmount(amount: bigint, decimals = 9): string {
  const divisor = BigInt(10 ** decimals)
  const whole = amount / divisor
  const fraction = amount % divisor
  return `${whole}.${fraction.toString().padStart(decimals, '0').slice(0, 4)}`
}

// Helper to format duration
function formatDuration(seconds: number): string {
  if (seconds === 0) return 'Unlocked'
  const days = Math.floor(seconds / (24 * 60 * 60))
  const hours = Math.floor((seconds % (24 * 60 * 60)) / (60 * 60))
  if (days > 0) return `${days}d ${hours}h`
  return `${hours}h`
}

export default function StakingPage() {
  const { address, isConnected } = useWalletAddress()

  const { data: config, isLoading: configLoading } = useStakingConfig()
  const { data: stakingAccount, isLoading: accountLoading } = useStakingAccount(address as string)
  const { totalStaked, totalStakers, baseApy, isLoading: statsLoading } = useStakingStats()
  const { pendingRewards } = usePendingRewards(address as string)
  const { isLocked, timeRemaining } = useStakingLockStatus(address as string)

  const createStakingAccount = useCreateStakingAccount()
  const claimRewards = useClaimStakingRewards()

  const isLoading = configLoading || accountLoading || statsLoading

  // Lockup tier labels
  const tierLabels = {
    [LockupTier.None]: 'No Lockup',
    [LockupTier.OneMonth]: '1 Month',
    [LockupTier.ThreeMonths]: '3 Months',
    [LockupTier.SixMonths]: '6 Months',
    [LockupTier.OneYear]: '1 Year',
    [LockupTier.TwoYears]: '2 Years',
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Staking</h1>
          <p className="mt-1 text-gray-400">
            Stake GHOST tokens to earn rewards and participate in governance
          </p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
        <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-6">
          <p className="text-sm text-gray-400">Total Staked</p>
          <p className="mt-2 text-2xl font-bold text-white">
            {isLoading ? '...' : formatAmount(totalStaked)} GHOST
          </p>
        </div>
        <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-6">
          <p className="text-sm text-gray-400">Total Stakers</p>
          <p className="mt-2 text-2xl font-bold text-white">{totalStakers}</p>
        </div>
        <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-6">
          <p className="text-sm text-gray-400">Base APY</p>
          <p className="mt-2 text-2xl font-bold text-[#ccff00]">
            {baseApy ? (baseApy / 100).toFixed(2) : '0'}%
          </p>
        </div>
        <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-6">
          <p className="text-sm text-gray-400">Your Pending Rewards</p>
          <p className="mt-2 text-2xl font-bold text-[#ccff00]">
            {formatAmount(pendingRewards)} GHOST
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        {/* Your Staking */}
        <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-6">
          <h2 className="text-xl font-semibold text-white">Your Staking</h2>

          {!isConnected ? (
            <div className="mt-6 rounded-lg border border-gray-700 bg-gray-800/50 p-8 text-center">
              <p className="text-gray-400">Connect your wallet to view staking</p>
            </div>
          ) : !stakingAccount ? (
            <div className="mt-6 space-y-4">
              <p className="text-gray-400">You don&apos;t have a staking account yet.</p>
              <button
                onClick={() => createStakingAccount.mutate()}
                disabled={createStakingAccount.isPending}
                className="w-full rounded-lg bg-[#ccff00] px-4 py-3 font-semibold text-black transition-colors hover:bg-[#bbee00] disabled:opacity-50"
              >
                {createStakingAccount.isPending ? 'Creating...' : 'Create Staking Account'}
              </button>
            </div>
          ) : (
            <div className="mt-6 space-y-6">
              {/* Staked Amount */}
              <div className="rounded-lg border border-gray-700 bg-gray-800/50 p-4">
                <p className="text-sm text-gray-400">Staked Amount</p>
                <p className="mt-1 text-2xl font-bold text-white">
                  {formatAmount(stakingAccount.stakedAmount)} GHOST
                </p>
              </div>

              {/* Lockup Status */}
              <div className="rounded-lg border border-gray-700 bg-gray-800/50 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-400">Lockup Status</p>
                    <p className="mt-1 font-medium text-white">
                      {tierLabels[stakingAccount.lockupTier as LockupTier] || 'Unknown'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-400">Time Remaining</p>
                    <p
                      className={`mt-1 font-medium ${isLocked ? 'text-yellow-400' : 'text-green-400'}`}
                    >
                      {formatDuration(timeRemaining)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Rewards */}
              <div className="rounded-lg border border-gray-700 bg-gray-800/50 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-400">Pending Rewards</p>
                    <p className="mt-1 text-xl font-bold text-[#ccff00]">
                      {formatAmount(pendingRewards)} GHOST
                    </p>
                  </div>
                  <button
                    onClick={async () => {
                      // Get actual token accounts
                      const ghostMint = process.env.NEXT_PUBLIC_GHOST_TOKEN_MINT! as any
                      const { deriveAssociatedTokenAddress } = await import('@ghostspeak/sdk')
                      
                      if (!address) return
                      
                      const userTokenAccount = await deriveAssociatedTokenAddress(
                        address as any,
                        ghostMint
                      )
                      
                      // Treasury address from config or env
                      const rewardsTreasury = config?.rewardsTreasury as any
                      
                      claimRewards.mutate({
                        ghostMint,
                        userTokenAccount,
                        rewardsTreasury,
                      })
                    }}
                    disabled={claimRewards.isPending || pendingRewards === BigInt(0)}
                    className="rounded-lg bg-[#ccff00] px-4 py-2 font-semibold text-black transition-colors hover:bg-[#bbee00] disabled:opacity-50"
                  >
                    {claimRewards.isPending ? 'Claiming...' : 'Claim Rewards'}
                  </button>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-lg border border-gray-700 bg-gray-800/50 p-4">
                  <p className="text-sm text-gray-400">Auto-Compound</p>
                  <p className="mt-1 font-medium text-white">
                    {stakingAccount.autoCompound ? 'Enabled' : 'Disabled'}
                  </p>
                </div>
                <div className="rounded-lg border border-gray-700 bg-gray-800/50 p-4">
                  <p className="text-sm text-gray-400">Total Claimed</p>
                  <p className="mt-1 font-medium text-white">
                    {formatAmount(stakingAccount.rewardsClaimed)} GHOST
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Lockup Tiers Info */}
        <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-6">
          <h2 className="text-xl font-semibold text-white">Lockup Tiers</h2>
          <p className="mt-2 text-sm text-gray-400">Longer lockups earn higher APY bonuses</p>

          <div className="mt-6 space-y-3">
            {Object.entries(tierLabels).map(([tier, label]) => {
              const tierNum = Number(tier)
              const bonusApy = config?.tierBonusApy?.[tierNum] ?? 0

              return (
                <div
                  key={tier}
                  className="flex items-center justify-between rounded-lg border border-gray-700 bg-gray-800/50 p-4"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`h-3 w-3 rounded-full ${
                        tierNum === 0
                          ? 'bg-gray-500'
                          : tierNum <= 2
                            ? 'bg-blue-500'
                            : tierNum <= 4
                              ? 'bg-purple-500'
                              : 'bg-[#ccff00]'
                      }`}
                    />
                    <span className="font-medium text-white">{label}</span>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-[#ccff00]">
                      +{(bonusApy / 100).toFixed(1)}%
                    </span>
                    <span className="ml-1 text-sm text-gray-400">APY bonus</span>
                  </div>
                </div>
              )
            })}
          </div>

          {/* How it works */}
          <div className="mt-8">
            <h3 className="font-semibold text-white">How Staking Works</h3>
            <ul className="mt-4 space-y-2 text-sm text-gray-400">
              <li className="flex items-start gap-2">
                <span className="mt-1 h-1.5 w-1.5 rounded-full bg-[#ccff00]" />
                Stake GHOST tokens to earn rewards
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1 h-1.5 w-1.5 rounded-full bg-[#ccff00]" />
                Choose a lockup tier for bonus APY
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1 h-1.5 w-1.5 rounded-full bg-[#ccff00]" />
                Rewards accrue continuously
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1 h-1.5 w-1.5 rounded-full bg-[#ccff00]" />
                Claim anytime or enable auto-compound
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1 h-1.5 w-1.5 rounded-full bg-[#ccff00]" />
                Staked tokens give governance voting power
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
