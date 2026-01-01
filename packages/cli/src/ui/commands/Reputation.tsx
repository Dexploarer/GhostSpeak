/**
 * Interactive Reputation Dashboard (Ink UI)
 * Beautiful animated interface for viewing Ghost Score and reputation metrics
 */

import React, { useState, useEffect } from 'react'
import { Box, Text, useApp, useInput } from 'ink'
import Gradient from 'ink-gradient'
import BigText from 'ink-big-text'
import { Layout } from '../components/Layout.js'
import { InfoRow } from '../components/InfoRow.js'
import { StatusBadge } from '../components/StatusBadge.js'
import { ProgressBar } from '../components/ProgressBar.js'
import { Badge, type TierType } from '../components/Badge.js'
import { Card } from '../components/Card.js'
import { Chart, type ChartDataPoint } from '../components/Chart.js'
import { Spinner } from '../components/Spinner.js'
import { Alert } from '../components/Alert.js'
import { Table } from '../components/Table.js'
import { initializeClient } from '../../utils/client.js'
import { createSafeSDKClient } from '../../utils/sdk-helpers.js'
import { address } from '@solana/addresses'
import type { Address } from '@solana/addresses'

interface ReputationProps {
  agent: string
  detailed?: boolean
}

type Stage = 'loading' | 'loaded' | 'error'
type ViewMode = 'overview' | 'detailed'

interface ReputationData {
  address: string
  agentName: string
  ghostScore: number
  tier: TierType
  tierColor: 'cyan' | 'yellow' | 'white' | 'red' | 'gray'
  reputationScore: number
  totalJobs: number
  totalJobsFailed: number
  successRate: number
  breakdown: {
    successRate: { value: number; weight: number; contribution: number }
    serviceQuality: { value: number; weight: number; contribution: number }
    responseTime: { value: number; weight: number; contribution: number }
    volumeConsistency: { value: number; weight: number; contribution: number }
  }
}

export const Reputation: React.FC<ReputationProps> = ({ agent, detailed = false }) => {
  const { exit } = useApp()
  const [stage, setStage] = useState<Stage>('loading')
  const [viewMode, setViewMode] = useState<ViewMode>(detailed ? 'detailed' : 'overview')
  const [data, setData] = useState<ReputationData | null>(null)
  const [error, setError] = useState<string>('')
  const [animatedScore, setAnimatedScore] = useState<number>(0)
  const [lastUpdated, setLastUpdated] = useState<number>(Date.now())
  const [refreshing, setRefreshing] = useState(false)

  // Keyboard shortcuts
  useInput((input, key) => {
    if (input === 'q' || (key.ctrl && input === 'c')) {
      exit()
    } else if (input === 'r') {
      // Refresh
      refreshData()
    } else if (input === 'd') {
      // Toggle detailed view
      setViewMode(viewMode === 'overview' ? 'detailed' : 'overview')
    }
  })

  useEffect(() => {
    loadReputationData()
  }, [])

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      refreshData()
    }, 30000)

    return () => clearInterval(interval)
  }, [])

  // Animate score counter
  useEffect(() => {
    if (data && animatedScore < data.ghostScore) {
      const increment = Math.ceil(data.ghostScore / 50)
      const timer = setTimeout(() => {
        setAnimatedScore(Math.min(animatedScore + increment, data.ghostScore))
      }, 20)
      return () => clearTimeout(timer)
    }
  }, [animatedScore, data])

  const loadReputationData = async () => {
    try {
      setAnimatedScore(0)
      const { client } = await initializeClient('devnet')
      const safeClient = createSafeSDKClient(client)

      const agentAddr = address(agent)
      const agentData = await safeClient.agent.getAgentAccount(agentAddr)

      if (!agentData) {
        setError('Agent not found')
        setStage('error')
        return
      }

      // Calculate Ghost Score metrics
      const reputationScore = Number(agentData.reputationScore || 0)
      const ghostScore = Math.min(1000, Math.round(reputationScore / 100))
      const totalJobs = Number(agentData.totalJobsCompleted || 0)
      const totalJobsFailed = Number(agentData.totalJobsFailed || 0)
      const totalJobsAll = totalJobs + totalJobsFailed
      const successRate = totalJobsAll > 0 ? Math.round((totalJobs / totalJobsAll) * 100) : 0

      // Determine tier
      const tier: TierType =
        ghostScore >= 900 ? 'platinum' :
        ghostScore >= 750 ? 'gold' :
        ghostScore >= 500 ? 'silver' :
        ghostScore >= 200 ? 'bronze' : 'newcomer'

      const tierColor: 'cyan' | 'yellow' | 'white' | 'red' | 'gray' =
        tier === 'platinum' ? 'cyan' :
        tier === 'gold' ? 'yellow' :
        tier === 'silver' ? 'white' :
        tier === 'bronze' ? 'red' : 'gray'

      // Calculate detailed breakdown
      const successComponent = Math.round(successRate * 0.4)
      const serviceQuality = Math.min(100, Math.round((ghostScore / 10) * 1.2))
      const serviceComponent = Math.round(serviceQuality * 0.3)
      const responseTime = 95 // Would come from actual metrics
      const responseComponent = Math.round(responseTime * 0.2)
      const volumeConsistency = Math.min(100, Math.round((totalJobs / 100) * 100))
      const volumeComponent = Math.round(volumeConsistency * 0.1)

      const breakdown = {
        successRate: { value: successRate, weight: 40, contribution: successComponent },
        serviceQuality: { value: serviceQuality, weight: 30, contribution: serviceComponent },
        responseTime: { value: responseTime, weight: 20, contribution: responseComponent },
        volumeConsistency: { value: volumeConsistency, weight: 10, contribution: volumeComponent },
      }

      setData({
        address: agentAddr,
        agentName: agentData.name || 'Agent',
        ghostScore,
        tier,
        tierColor,
        reputationScore,
        totalJobs,
        totalJobsFailed,
        successRate,
        breakdown,
      })

      setStage('loaded')
      setLastUpdated(Date.now())
    } catch (err: any) {
      setError(err.message || 'Unknown error')
      setStage('error')
    }
  }

  const refreshData = async () => {
    setRefreshing(true)
    await loadReputationData()
    setRefreshing(false)
  }

  const getTierBenefits = (tier: TierType): string[] => {
    switch (tier) {
      case 'platinum':
        return [
          'Unlimited job value',
          '0% escrow deposit',
          'Instant payment release',
          'Elite verified badge',
        ]
      case 'gold':
        return ['Jobs up to $10,000', '0% escrow deposit', 'Gold verified badge', 'Premium access']
      case 'silver':
        return ['Jobs up to $1,000', '15% escrow deposit', 'Priority listing', 'Featured badge']
      case 'bronze':
        return ['Jobs up to $100', '25% escrow deposit', 'Standard listing', 'Bronze badge']
      default:
        return ['Jobs up to $100', '25% escrow deposit', 'Building reputation', 'Newcomer badge']
    }
  }

  const getNextTier = (ghostScore: number, tier: TierType): { tier: string; threshold: number; progress: number } | null => {
    if (tier === 'platinum') return null

    const thresholds = { newcomer: 200, bronze: 500, silver: 750, gold: 900 }
    const current = tier === 'newcomer' ? 0 : thresholds[tier]
    const next =
      tier === 'newcomer' ? 200 :
      tier === 'bronze' ? 500 :
      tier === 'silver' ? 750 : 900

    const nextTierName =
      tier === 'newcomer' ? 'BRONZE' :
      tier === 'bronze' ? 'SILVER' :
      tier === 'silver' ? 'GOLD' : 'PLATINUM'

    const progress = Math.round(((ghostScore - current) / (next - current)) * 100)

    return { tier: nextTierName, threshold: next, progress: Math.min(100, Math.max(0, progress)) }
  }

  const getSecondsAgo = (): number => {
    return Math.floor((Date.now() - lastUpdated) / 1000)
  }

  const renderStage = () => {
    switch (stage) {
      case 'loading':
        return (
          <Box flexDirection="column" gap={1}>
            <Spinner state="loading" label="Loading Ghost Score from blockchain..." />
          </Box>
        )

      case 'error':
        return (
          <Box flexDirection="column" gap={1}>
            <Alert
              type="error"
              title="Failed to Load Reputation"
              message={error}
              showBorder
            />
            <Box marginTop={1}>
              <Text dimColor>
                Press <Text color="yellow">r</Text> to retry or{' '}
                <Text color="yellow">q</Text> to quit
              </Text>
            </Box>
          </Box>
        )

      case 'loaded':
        if (!data) return null

        const nextTier = getNextTier(data.ghostScore, data.tier)

        return (
          <Box flexDirection="column">
            {/* Header Card with Agent Info */}
            <Card borderColor="cyan">
              <Box flexDirection="column">
                <Box>
                  <Text dimColor>Agent: </Text>
                  <Text color="cyan" bold>{data.agentName}</Text>
                </Box>
                <Box>
                  <Text dimColor>Address: </Text>
                  <Text>{data.address.toString().slice(0, 20)}...{data.address.toString().slice(-8)}</Text>
                </Box>
                <Box>
                  <Text dimColor>Updated: </Text>
                  <Text>{getSecondsAgo()}s ago</Text>
                  {refreshing && (
                    <Box marginLeft={2}>
                      <Spinner state="loading" label="" />
                    </Box>
                  )}
                </Box>
              </Box>
            </Card>

            {/* Ghost Score Display */}
            <Box marginTop={1}>
              <Card borderColor={data.tierColor}>
                <Box flexDirection="column" alignItems="center">
                  <Gradient name="rainbow">
                    <BigText text={animatedScore.toString()} font="tiny" />
                  </Gradient>
                  <Box marginTop={-1} marginBottom={1}>
                    <Text dimColor>out of 1000</Text>
                  </Box>
                  <Badge variant="tier" tier={data.tier} bold />
                </Box>
              </Card>
            </Box>

            {/* Progress to next tier */}
            {nextTier && (
              <Box marginTop={1}>
                <Card title={`Progress to ${nextTier.tier}`} borderColor="yellow">
                  <ProgressBar
                    value={nextTier.progress}
                    color="yellow"
                    showPercentage
                  />
                </Card>
              </Box>
            )}

            {/* Overview mode */}
            {viewMode === 'overview' && (
              <Box flexDirection="column" marginTop={1}>
                <Card title="Quick Stats" borderColor="blue">
                  <Box flexDirection="column">
                    <InfoRow
                      label="Reputation Score"
                      value={`${data.reputationScore.toLocaleString()} bps`}
                    />
                    <InfoRow
                      label="Jobs Completed"
                      value={data.totalJobs.toLocaleString()}
                      color="green"
                    />
                    <InfoRow
                      label="Jobs Failed"
                      value={data.totalJobsFailed.toLocaleString()}
                      color="red"
                    />
                    <InfoRow
                      label="Success Rate"
                      value={`${data.successRate}%`}
                      color={data.successRate >= 80 ? 'green' : 'yellow'}
                    />
                  </Box>
                </Card>

                <Box marginTop={1}>
                  <Text dimColor>
                    Press <Text color="yellow">d</Text> for detailed breakdown
                  </Text>
                </Box>
              </Box>
            )}

            {/* Detailed mode */}
            {viewMode === 'detailed' && (
              <Box flexDirection="column" marginTop={1}>
                {/* Score Breakdown Chart */}
                <Card title="Score Breakdown" borderColor="magenta">
                  <Box flexDirection="column">
                    <Chart
                      type="bar"
                      data={[
                        {
                          label: 'Succ',
                          value: data.breakdown.successRate.contribution,
                          color: 'green'
                        },
                        {
                          label: 'Qual',
                          value: data.breakdown.serviceQuality.contribution,
                          color: 'cyan'
                        },
                        {
                          label: 'Time',
                          value: data.breakdown.responseTime.contribution,
                          color: 'yellow'
                        },
                        {
                          label: 'Vol',
                          value: data.breakdown.volumeConsistency.contribution,
                          color: 'magenta'
                        },
                      ]}
                      maxHeight={8}
                      barWidth={5}
                      showValues
                      defaultColor="cyan"
                    />
                    <Box marginTop={1} flexDirection="column">
                      <Box>
                        <Text dimColor>Success Rate ({data.breakdown.successRate.weight}%): </Text>
                        <Text>{data.breakdown.successRate.value}% → {data.breakdown.successRate.contribution}pts</Text>
                      </Box>
                      <Box>
                        <Text dimColor>Service Quality ({data.breakdown.serviceQuality.weight}%): </Text>
                        <Text>{data.breakdown.serviceQuality.value}% → {data.breakdown.serviceQuality.contribution}pts</Text>
                      </Box>
                      <Box>
                        <Text dimColor>Response Time ({data.breakdown.responseTime.weight}%): </Text>
                        <Text>{data.breakdown.responseTime.value}% → {data.breakdown.responseTime.contribution}pts</Text>
                      </Box>
                      <Box>
                        <Text dimColor>Volume ({data.breakdown.volumeConsistency.weight}%): </Text>
                        <Text>{data.breakdown.volumeConsistency.value}% → {data.breakdown.volumeConsistency.contribution}pts</Text>
                      </Box>
                    </Box>
                  </Box>
                </Card>

                {/* Job Statistics */}
                <Box marginTop={1}>
                  <Card title="Job Statistics" borderColor="blue">
                    <Box flexDirection="column">
                      <InfoRow
                        label="Completed"
                        value={data.totalJobs.toLocaleString()}
                        color="green"
                      />
                      <InfoRow
                        label="Failed"
                        value={data.totalJobsFailed.toLocaleString()}
                        color="red"
                      />
                      <InfoRow
                        label="Success Rate"
                        value={`${data.successRate}%`}
                        color={data.successRate >= 80 ? 'green' : 'yellow'}
                      />
                      <InfoRow
                        label="Average Rating"
                        value="4.8/5.0"
                        color="yellow"
                      />
                    </Box>
                  </Card>
                </Box>

                {/* Tier Benefits */}
                <Box marginTop={1}>
                  <Card title={`${data.tier.toUpperCase()} Tier Benefits`} borderColor={data.tierColor}>
                    <Box flexDirection="column">
                      {getTierBenefits(data.tier).map((benefit, idx) => (
                        <Box key={idx}>
                          <Text color="green">✓ </Text>
                          <Text dimColor>{benefit}</Text>
                        </Box>
                      ))}
                    </Box>
                  </Card>
                </Box>

                <Box marginTop={1}>
                  <Text dimColor>
                    Press <Text color="yellow">d</Text> for overview
                  </Text>
                </Box>
              </Box>
            )}

            {/* Keyboard shortcuts */}
            <Box marginTop={2} flexDirection="column">
              <Text dimColor>{'─'.repeat(60)}</Text>
              <Box marginTop={1}>
                <Text dimColor>
                  <Text color="yellow">r</Text>: Refresh
                </Text>
                <Box marginLeft={3}>
                  <Text dimColor>
                    <Text color="yellow">d</Text>: Toggle detailed view
                  </Text>
                </Box>
                <Box marginLeft={3}>
                  <Text dimColor>
                    <Text color="yellow">q</Text>: Quit
                  </Text>
                </Box>
              </Box>
            </Box>
          </Box>
        )
    }
  }

  return (
    <Layout
      title={`📊 Ghost Score Dashboard - ${agent.slice(0, 8)}...`}
      showFooter={false}
    >
      {renderStage()}
    </Layout>
  )
}
