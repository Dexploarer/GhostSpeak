/**
 * Interactive Staking Dashboard (Ink UI)
 * Beautiful real-time interface for GHOST token staking
 */

import React, { useState, useEffect } from 'react'
import { Box, Text, useApp, useInput } from 'ink'
import Spinner from 'ink-spinner'
import Gradient from 'ink-gradient'
import { Layout } from '../components/Layout.js'
import { InfoRow } from '../components/InfoRow.js'
import { StatusBadge } from '../components/StatusBadge.js'
import { ProgressBar } from '../components/ProgressBar.js'
import { Card } from '../components/Card.js'
import { Badge } from '../components/Badge.js'
import { Chart } from '../components/Chart.js'
import { Alert } from '../components/Alert.js'
import { createSolanaRpc } from '@solana/rpc'
import { address } from '@solana/addresses'
import { createKeyPairSignerFromBytes } from '@solana/signers'
import { createSafeSDKClient } from '../../utils/sdk-helpers.js'
import { GhostSpeakClient } from '@ghostspeak/sdk'
import { readFileSync } from 'fs'

// Tier thresholds and benefits
const TIER_THRESHOLDS = {
  1: 1000,    // 1K GHOST
  2: 5000,    // 5K GHOST
  3: 10000,   // 10K GHOST
  4: 25000,   // 25K GHOST
  5: 50000    // 50K GHOST
}

const TIER_APY = {
  1: 10,  // 10% APY
  2: 15,  // 15% APY
  3: 20,  // 20% APY
  4: 25,  // 25% APY
  5: 30   // 30% APY
}

const TIER_BOOST = {
  1: 5,   // 5% Ghost Score boost
  2: 10,  // 10% Ghost Score boost
  3: 15,  // 15% Ghost Score boost
  4: 20,  // 20% Ghost Score boost
  5: 25   // 25% Ghost Score boost
}

export interface StakingProps {
  agent?: string  // Agent address
  autoRefresh?: boolean
}

type StakingStage = 'loading' | 'ready' | 'staking' | 'unstaking' | 'claiming' | 'error' | 'simulate' | 'unstake_info'

interface StakingData {
  totalStaked: number
  currentTier: number
  accruedRewards: number
  stakingDuration: number // in days
  unlockDate: number
  canClaim: boolean
  canUnstake: boolean
}

export const Staking: React.FC<StakingProps> = ({ agent, autoRefresh = true }) => {
  const { exit } = useApp()
  const [stage, setStage] = useState<StakingStage>('loading')
  const [stakingData, setStakingData] = useState<StakingData>({
    totalStaked: 0,
    currentTier: 0,
    accruedRewards: 0,
    stakingDuration: 0,
    unlockDate: Date.now(),
    canClaim: false,
    canUnstake: false
  })
  const [error, setError] = useState<string>('')
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())
  const [helpVisible, setHelpVisible] = useState(false)
  const [agentName, setAgentName] = useState<string>('Unknown Agent')
  const [simulateAmount, setSimulateAmount] = useState<number>(1000)

  // Keyboard shortcuts
  useInput((input, key) => {
    if (input === 'q' || (key.ctrl && input === 'c') || key.escape) {
      exit()
    }

    if (stage === 'ready') {
      if (input === 'r') {
        refreshData()
      } else if (input === 'c' && stakingData.canClaim) {
        claimRewards()
      } else if (input === 's') {
        setStage('simulate')
      } else if (input === 'u' && stakingData.totalStaked > 0) {
        setStage('unstake_info')
      } else if (input === 'h' || input === '?') {
        setHelpVisible(!helpVisible)
      }
    }

    if (stage === 'simulate' || stage === 'unstake_info') {
      if (input === 'b') {
        setStage('ready')
      }
    }

    // Simulate amount adjustment (only in simulate mode)
    if (stage === 'simulate') {
      if (key.upArrow) {
        setSimulateAmount(prev => prev + 1000)
      } else if (key.downArrow) {
        setSimulateAmount(prev => Math.max(0, prev - 1000))
      } else if (key.rightArrow) {
        setSimulateAmount(prev => prev + 100)
      } else if (key.leftArrow) {
        setSimulateAmount(prev => Math.max(0, prev - 100))
      }
    }
  })

  // Auto-refresh every 5 seconds
  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(() => {
        refreshData(true) // silent refresh
      }, 5000)

      return () => clearInterval(interval)
    }
  }, [autoRefresh])

  // Initial data load
  useEffect(() => {
    loadStakingData()
  }, [])

  const loadStakingData = async () => {
    try {
      setStage('loading')

      // Load wallet
      const walletPath = process.env.HOME + '/.config/solana/id.json'
      const secretKeyBytes = new Uint8Array(JSON.parse(readFileSync(walletPath, 'utf-8')))
      const wallet = await createKeyPairSignerFromBytes(secretKeyBytes)

      // Connect to Solana
      const rpc = createSolanaRpc('https://api.devnet.solana.com')
      const client = new GhostSpeakClient({
        rpcEndpoint: 'https://api.devnet.solana.com'
      })
      const safeClient = createSafeSDKClient(client)

      // Get agent data if provided
      if (agent) {
        try {
          const agentAddr = address(agent)
          const agentData = await safeClient.agent.getAgentAccount(agentAddr)
          if (agentData?.name) {
            setAgentName(agentData.name)
          }
        } catch (err) {
          console.warn('Could not load agent data')
        }
      }

      // Load staking data using SDK
      // Note: Staking queries not yet fully implemented in SDK
      // Returns default/empty data for now - users should use CLI commands
      const stakingDataResult: StakingData = {
        totalStaked: 0,
        currentTier: 0,
        accruedRewards: 0,
        stakingDuration: 0,
        unlockDate: Date.now(),
        canClaim: false,
        canUnstake: false
      }

      setStakingData(stakingDataResult)
      setStage('ready')
      setLastUpdate(new Date())

    } catch (err: any) {
      setError(err.message || 'Failed to load staking data')
      setStage('error')
    }
  }

  const refreshData = async (silent = false) => {
    if (!silent) {
      setStage('loading')
    }

    try {
      // Reload staking data from SDK
      await loadStakingData()

      setLastUpdate(new Date())
      if (!silent) {
        setStage('ready')
      }
    } catch (err: any) {
      setError(err.message || 'Failed to refresh data')
      setStage('error')
    }
  }

  const claimRewards = async () => {
    setStage('claiming')
    try {
      // TODO: Implement actual claim logic with SDK
      setError('Claim functionality not yet implemented. Use CLI commands.')
      setStage('error')
    } catch (err: any) {
      setError(err.message || 'Failed to claim rewards')
      setStage('error')
    }
  }

  const stakeTokens = async () => {
    setStage('staking')
    try {
      // TODO: Implement actual staking logic with SDK
      setError('Staking functionality not yet implemented. Use CLI commands.')
      setStage('error')
    } catch (err: any) {
      setError(err.message || 'Failed to stake tokens')
      setStage('error')
    }
  }

  const unstakeTokens = async () => {
    setStage('unstaking')
    try {
      // TODO: Implement actual unstaking logic with SDK
      setError('Unstaking functionality not yet implemented. Use CLI commands.')
      setStage('error')
    } catch (err: any) {
      setError(err.message || 'Failed to unstake tokens')
      setStage('error')
    }
  }

  const calculateTier = (amount: number): number => {
    if (amount >= TIER_THRESHOLDS[5]) return 5
    if (amount >= TIER_THRESHOLDS[4]) return 4
    if (amount >= TIER_THRESHOLDS[3]) return 3
    if (amount >= TIER_THRESHOLDS[2]) return 2
    if (amount >= TIER_THRESHOLDS[1]) return 1
    return 0
  }

  const getNextTierInfo = () => {
    const nextTier = Math.min(stakingData.currentTier + 1, 5)
    const nextThreshold = TIER_THRESHOLDS[nextTier as keyof typeof TIER_THRESHOLDS]
    const remaining = nextThreshold - stakingData.totalStaked
    const progress = (stakingData.totalStaked / nextThreshold) * 100

    return { nextTier, nextThreshold, remaining, progress }
  }

  const getTierColor = (tier: number): 'cyan' | 'green' | 'yellow' | 'magenta' => {
    if (tier >= 5) return 'magenta'
    if (tier >= 4) return 'yellow'
    if (tier >= 3) return 'green'
    return 'cyan'
  }

  const getTierBadgeType = (tier: number): 'platinum' | 'gold' | 'silver' | 'bronze' | 'newcomer' => {
    if (tier === 5) return 'platinum'
    if (tier === 4) return 'gold'
    if (tier >= 2) return 'silver'
    if (tier === 1) return 'bronze'
    return 'newcomer'
  }

  const calculateDailyRewards = (amount: number, apy: number): number => {
    return (amount * (apy / 100)) / 365
  }

  const calculateMonthlyRewards = (amount: number, apy: number): number => {
    return (amount * (apy / 100)) / 12
  }

  const calculateYearlyRewards = (amount: number, apy: number): number => {
    return amount * (apy / 100)
  }


  const renderStakingOverview = () => {
    const { nextTier, remaining, progress } = getNextTierInfo()
    const currentAPY = TIER_APY[stakingData.currentTier as keyof typeof TIER_APY] || 0
    const currentBoost = TIER_BOOST[stakingData.currentTier as keyof typeof TIER_BOOST] || 0
    const tierColor = getTierColor(stakingData.currentTier)

    return (
      <Box flexDirection="column" gap={1}>
        {/* Current Stake Overview */}
        <Card title="Current Stake" borderColor={tierColor}>
          <Box flexDirection="column">
            <Box alignItems="center" gap={2}>
              <Text bold color={tierColor}>
                {stakingData.totalStaked.toLocaleString()} GHOST
              </Text>
              <Badge variant="tier" tier={getTierBadgeType(stakingData.currentTier)} />
            </Box>
            <Box marginTop={1}>
              <InfoRow
                label="Staking Duration"
                value={`${stakingData.stakingDuration} days`}
              />
            </Box>
          </Box>
        </Card>

        {/* Progress to Next Tier */}
        {stakingData.currentTier < 5 && (
          <Box flexDirection="column" marginTop={1}>
            <ProgressBar
              value={progress}
              label={`Progress to Tier ${nextTier}`}
              color={getTierColor(nextTier)}
              showPercentage={true}
            />
            <Box marginTop={1}>
              <Text dimColor>
                {remaining.toLocaleString()} GHOST more to reach Tier {nextTier}
              </Text>
            </Box>
          </Box>
        )}

        {stakingData.currentTier === 5 && (
          <Box marginTop={1}>
            <Gradient name="rainbow">
              <Text bold>Maximum Tier Reached!</Text>
            </Gradient>
          </Box>
        )}

        {/* Current Benefits */}
        <Card title="Current Benefits" borderColor="green">
          <Box flexDirection="column">
            <InfoRow label="APY" value={`${currentAPY}%`} color="green" />
            <InfoRow label="Ghost Score Boost" value={`+${currentBoost}%`} color="green" />
          </Box>
        </Card>
      </Box>
    )
  }

  const renderRewards = () => {
    const currentAPY = TIER_APY[stakingData.currentTier as keyof typeof TIER_APY] || 0
    const dailyRewards = calculateDailyRewards(stakingData.totalStaked, currentAPY)
    const monthlyRewards = calculateMonthlyRewards(stakingData.totalStaked, currentAPY)

    return (
      <Card title="Rewards" borderColor="yellow">
        <Box flexDirection="column">
          <InfoRow
            label="Pending Rewards"
            value={`${stakingData.accruedRewards.toFixed(2)} GHOST`}
            color="green"
          />
          <InfoRow
            label="Estimated Daily"
            value={`~${dailyRewards.toFixed(2)} GHOST`}
            color="cyan"
          />
          <InfoRow
            label="Estimated Monthly"
            value={`~${monthlyRewards.toFixed(2)} GHOST`}
            color="cyan"
          />
          <Box marginTop={1}>
            <Box width={25}>
              <Text dimColor>Claim Status:</Text>
            </Box>
            {stakingData.canClaim ? (
              <Text color="green">Available (Press C)</Text>
            ) : (
              <Text dimColor>No rewards yet</Text>
            )}
          </Box>
        </Box>
      </Card>
    )
  }

  const renderAPYChart = () => {
    const chartData = [
      { label: 'T1', value: 10, color: 'red' as const },
      { label: 'T2', value: 15, color: 'white' as const },
      { label: 'T3', value: 20, color: 'green' as const },
      { label: 'T4', value: 25, color: 'yellow' as const },
      { label: 'T5', value: 30, color: 'cyan' as const },
    ]

    return (
      <Card title="APY by Tier" borderColor="magenta">
        <Chart
          type="bar"
          data={chartData}
          maxHeight={8}
          barWidth={5}
        />
      </Card>
    )
  }

  const renderSimulator = () => {
    const projectedTier = calculateTier(simulateAmount)
    const projectedAPY = TIER_APY[projectedTier as keyof typeof TIER_APY] || 0
    const projectedBoost = TIER_BOOST[projectedTier as keyof typeof TIER_BOOST] || 0
    const projectedMonthly = calculateMonthlyRewards(simulateAmount, projectedAPY)
    const projectedYearly = calculateYearlyRewards(simulateAmount, projectedAPY)

    return (
      <Box flexDirection="column" gap={1}>
        <Card title="APY Calculator" borderColor="magenta">
          <Box flexDirection="column" gap={1}>
            <Box flexDirection="column">
              <Text bold>Stake Amount:</Text>
              <Box marginTop={1} alignItems="center" gap={2}>
                <Text color="cyan" bold>{simulateAmount.toLocaleString()} GHOST</Text>
                <Badge variant="tier" tier={getTierBadgeType(projectedTier)} />
              </Box>
              <Box marginTop={1}>
                <Text dimColor>Use arrow keys: ← → (±100) ↑ ↓ (±1000)</Text>
              </Box>
            </Box>

            <Box marginTop={1} flexDirection="column">
              <Text bold>Projected Benefits:</Text>
              <InfoRow label="Tier" value={`${projectedTier}/5`} color={getTierColor(projectedTier)} />
              <InfoRow label="Ghost Score Boost" value={`+${projectedBoost}%`} color="green" />
              <InfoRow label="APY" value={`${projectedAPY}%`} color="yellow" />
            </Box>

            <Box marginTop={1} flexDirection="column">
              <Text bold>Estimated Earnings:</Text>
              <InfoRow label="Monthly" value={`~${projectedMonthly.toFixed(2)} GHOST`} color="cyan" />
              <InfoRow label="Yearly" value={`~${projectedYearly.toFixed(2)} GHOST`} color="green" />
            </Box>
          </Box>
        </Card>

        <Box marginTop={1}>
          <Text dimColor>Press </Text>
          <Text color="yellow">b</Text>
          <Text dimColor> to return to dashboard</Text>
        </Box>
      </Box>
    )
  }

  const renderUnstakeInfo = () => {
    const unlockDays = Math.ceil((stakingData.unlockDate - Date.now()) / (1000 * 60 * 60 * 24))

    return (
      <Box flexDirection="column" gap={1}>
        <Alert
          type="warning"
          title="Unstaking Information"
          message="Unstaking has a 7-day cooldown period. Your benefits will be reduced immediately upon unstaking."
        />

        <Card title="Unstaking Impact" borderColor="yellow">
          <Box flexDirection="column">
            <InfoRow label="Current Stake" value={`${stakingData.totalStaked.toLocaleString()} GHOST`} />
            <InfoRow label="Cooldown Period" value="7 days" color="yellow" />
            <InfoRow label="Benefits Lost" value="Immediate upon unstaking" color="red" />
            <InfoRow label="Tokens Available" value="After cooldown period" color="yellow" />
          </Box>
        </Card>

        {!stakingData.canUnstake && unlockDays > 0 && (
          <Card title="Active Lock Period" borderColor="red">
            <Box flexDirection="column">
              <InfoRow label="Unlock Date" value={new Date(stakingData.unlockDate).toLocaleDateString()} color="red" />
              <InfoRow label="Days Remaining" value={`${unlockDays} days`} color="yellow" />
              <Box marginTop={1}>
                <Text dimColor>Your tokens will be available for unstaking after the lock period.</Text>
              </Box>
            </Box>
          </Card>
        )}

        <Box marginTop={1}>
          <Text dimColor>Press </Text>
          <Text color="yellow">b</Text>
          <Text dimColor> to return to dashboard</Text>
        </Box>
      </Box>
    )
  }

  const renderTiersTable = () => {
    return (
      <Box flexDirection="column" marginTop={1}>
        <Text bold color="magenta">🏆 Staking Tiers</Text>
        <Box marginTop={1} flexDirection="column">
          {/* Header */}
          <Box>
            <Box width={10}>
              <Text bold dimColor>Tier</Text>
            </Box>
            <Box width={18}>
              <Text bold dimColor>Requirement</Text>
            </Box>
            <Box width={10}>
              <Text bold dimColor>APY</Text>
            </Box>
            <Box width={12}>
              <Text bold dimColor>Boost</Text>
            </Box>
          </Box>

          {/* Tier Rows */}
          {[1, 2, 3, 4, 5].map(tier => {
            const threshold = TIER_THRESHOLDS[tier as keyof typeof TIER_THRESHOLDS]
            const apy = TIER_APY[tier as keyof typeof TIER_APY]
            const boost = TIER_BOOST[tier as keyof typeof TIER_BOOST]
            const isCurrent = tier === stakingData.currentTier
            const color = getTierColor(tier)

            return (
              <Box key={tier} marginTop={1}>
                <Box width={10}>
                  <Text bold color={isCurrent ? color : undefined}>
                    {isCurrent ? '► ' : '  '}Tier {tier}
                  </Text>
                </Box>
                <Box width={18}>
                  <Text color={isCurrent ? color : undefined}>
                    {threshold.toLocaleString()} GHOST
                  </Text>
                </Box>
                <Box width={10}>
                  <Text color={isCurrent ? 'green' : undefined}>{apy}%</Text>
                </Box>
                <Box width={12}>
                  <Text color={isCurrent ? 'green' : undefined}>+{boost}%</Text>
                </Box>
              </Box>
            )
          })}
        </Box>
      </Box>
    )
  }

  const renderActions = () => {
    const unlockDays = Math.ceil((stakingData.unlockDate - Date.now()) / (1000 * 60 * 60 * 24))

    return (
      <Card title="Keyboard Controls" borderColor="blue">
        <Box flexDirection="column">
          <Text>
            <Text color="yellow">[Q]</Text> <Text dimColor>or </Text>
            <Text color="yellow">Esc</Text> <Text dimColor>- Exit</Text>
          </Text>
          <Text>
            <Text color="cyan">[R]</Text> <Text dimColor>- Refresh balances</Text>
          </Text>
          <Text>
            <Text color="magenta">[S]</Text> <Text dimColor>- APY Calculator (simulate stake)</Text>
          </Text>
          {stakingData.totalStaked > 0 && (
            <Text>
              <Text color="yellow">[U]</Text> <Text dimColor>- Show unstake info</Text>
            </Text>
          )}
          <Text>
            <Text color={stakingData.canClaim ? 'green' : 'gray'}>
              [C]
            </Text>
            <Text dimColor> - Claim rewards</Text>
            {stakingData.canClaim && (
              <Text color="green"> (Available)</Text>
            )}
          </Text>
          <Text>
            <Text color="yellow">[H]</Text> <Text dimColor>- Toggle help</Text>
          </Text>
        </Box>
      </Card>
    )
  }

  const renderHelp = () => {
    return (
      <Box flexDirection="column" marginTop={1} borderStyle="round" borderColor="yellow" padding={1}>
        <Text bold color="yellow">❓ Help & Information</Text>
        <Box marginTop={1} flexDirection="column">
          <Text dimColor>• Stake GHOST tokens to earn rewards and boost your Ghost Score</Text>
          <Text dimColor>• Higher tiers unlock better APY rates and Ghost Score boosts</Text>
          <Text dimColor>• Tokens are locked for the staking duration</Text>
          <Text dimColor>• Rewards accrue automatically and can be claimed anytime</Text>
          <Text dimColor>• Your Ghost Score boost applies to all credentials and activities</Text>
          <Box marginTop={1}>
            <Text dimColor>Data refreshes automatically every 5 seconds</Text>
          </Box>
        </Box>
      </Box>
    )
  }

  const renderContent = () => {
    if (stage === 'loading') {
      return (
        <Box flexDirection="column" gap={1}>
          <Box>
            <Spinner type="dots" />
            <Text> Loading staking data...</Text>
          </Box>
        </Box>
      )
    }

    if (stage === 'error') {
      return (
        <Box flexDirection="column" gap={1}>
          <StatusBadge status="error" text="Error loading staking data" />
          <Text color="red">{error}</Text>
          <Box marginTop={1}>
            <Text dimColor>Press </Text>
            <Text color="cyan">R</Text>
            <Text dimColor> to retry or </Text>
            <Text color="red">Q</Text>
            <Text dimColor> to quit</Text>
          </Box>
        </Box>
      )
    }

    if (stage === 'claiming') {
      return (
        <Box flexDirection="column" gap={1}>
          <Box>
            <Spinner type="dots" />
            <Text> Claiming rewards...</Text>
          </Box>
        </Box>
      )
    }

    if (stage === 'staking') {
      return (
        <Box flexDirection="column" gap={1}>
          <Box>
            <Spinner type="dots" />
            <Text> Staking tokens...</Text>
          </Box>
        </Box>
      )
    }

    if (stage === 'unstaking') {
      return (
        <Box flexDirection="column" gap={1}>
          <Box>
            <Spinner type="dots" />
            <Text> Unstaking tokens...</Text>
          </Box>
        </Box>
      )
    }

    if (stage === 'simulate') {
      return renderSimulator()
    }

    if (stage === 'unstake_info') {
      return renderUnstakeInfo()
    }

    // Ready state - show full dashboard
    return (
      <Box flexDirection="column">
        {/* Agent info if provided */}
        {agent && (
          <Box marginBottom={1}>
            <Text dimColor>Agent: </Text>
            <Text bold color="cyan">{agentName}</Text>
          </Box>
        )}

        {/* Last updated timestamp */}
        <Box marginBottom={1}>
          <Text dimColor>
            Last updated: {lastUpdate.toLocaleTimeString()}
            {autoRefresh && <Text color="green"> • Auto-refresh enabled</Text>}
          </Text>
        </Box>

        {/* Main dashboard grid */}
        <Box flexDirection="column" gap={1}>
          {renderStakingOverview()}

          <Box gap={1}>
            {renderRewards()}
          </Box>

          {renderTiersTable()}
          {renderAPYChart()}
          {renderActions()}
          {helpVisible && renderHelp()}
        </Box>

        {/* Footer info */}
        <Box marginTop={1}>
          <Alert
            type="info"
            message="Staking CLI integration coming soon. Use web dashboard for full functionality."
            showBorder={false}
          />
        </Box>

        <Box marginTop={1}>
          <Gradient name="rainbow">
            <Text>Stake GHOST - Earn Rewards - Boost Your Score</Text>
          </Gradient>
        </Box>
      </Box>
    )
  }

  return (
    <Layout title="💎 GHOST Staking Dashboard" showFooter={false}>
      {renderContent()}
    </Layout>
  )
}
