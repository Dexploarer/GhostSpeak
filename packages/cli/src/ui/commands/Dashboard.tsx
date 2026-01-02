/**
 * Master Analytics Dashboard (Ink UI)
 * Comprehensive overview of all GhostSpeak metrics
 */

import React, { useState, useEffect } from 'react'
import { Box, Text, useApp, useInput } from 'ink'
import Gradient from 'ink-gradient'
import { Layout } from '../components/Layout.js'
import { InfoRow } from '../components/InfoRow.js'
import { StatusBadge } from '../components/StatusBadge.js'
import { Badge, type TierType } from '../components/Badge.js'
import { Card } from '../components/Card.js'
import { Alert } from '../components/Alert.js'
import { Spinner } from '../components/Spinner.js'
import { Table } from '../components/Table.js'
import { initializeClient } from '../../utils/client.js'
import { createSafeSDKClient } from '../../utils/sdk-helpers.js'
import { address } from '@solana/addresses'
import type { Address } from '@solana/addresses'
import { Reputation } from './Reputation.js'
import { Staking } from './Staking.js'

export interface DashboardProps {
  agent?: string
  autoRefresh?: boolean
}

type DashboardStage = 'loading' | 'ready' | 'error'
type SubView = 'dashboard' | 'reputation' | 'staking' | 'privacy' | 'did' | 'escrow'

interface AgentOverview {
  address: string
  name: string
  ghostScore: number
  tier: TierType
  jobsCompleted: number
  successRate: number
}

interface StakingOverview {
  totalStaked: number
  tier: number
  apy: number
  pendingRewards: number
}

interface EscrowOverview {
  activeCount: number
  totalLocked: number
  urgentAlerts: number
}

interface PrivacyStatus {
  mode: 'public' | 'private' | 'selective'
  visibleFields: string[]
}

interface RecentActivity {
  timestamp: number
  type: string
  description: string
  status: 'success' | 'pending' | 'failed'
}

interface DashboardData {
  agent: AgentOverview
  staking: StakingOverview
  escrow: EscrowOverview
  privacy: PrivacyStatus
  recentActivity: RecentActivity[]
}

export const Dashboard: React.FC<DashboardProps> = ({ agent, autoRefresh = true }) => {
  const { exit } = useApp()
  const [stage, setStage] = useState<DashboardStage>('loading')
  const [currentView, setCurrentView] = useState<SubView>('dashboard')
  const [data, setData] = useState<DashboardData | null>(null)
  const [error, setError] = useState<string>('')
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())
  const [network] = useState<string>('devnet')

  // Keyboard shortcuts
  useInput((input, key) => {
    if (input === 'q' || (key.ctrl && input === 'c') || key.escape) {
      exit()
    }

    if (stage === 'ready' && currentView === 'dashboard') {
      if (input === 'r') {
        setCurrentView('reputation')
      } else if (input === 's') {
        setCurrentView('staking')
      } else if (input === 'p') {
        setCurrentView('privacy')
      } else if (input === 'd') {
        setCurrentView('did')
      } else if (input === 'e') {
        setCurrentView('escrow')
      } else if (input === 'f') {
        refreshData()
      }
    }

    // Back to dashboard from sub-views
    if (currentView !== 'dashboard' && input === 'b') {
      setCurrentView('dashboard')
    }
  })

  // Auto-refresh every 30 seconds
  useEffect(() => {
    if (autoRefresh && currentView === 'dashboard') {
      const interval = setInterval(() => {
        refreshData(true) // silent refresh
      }, 30000)

      return () => clearInterval(interval)
    }
  }, [autoRefresh, currentView])

  // Initial data load
  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    try {
      setStage('loading')

      const { client } = await initializeClient('devnet')
      const safeClient = createSafeSDKClient(client)

      // Get agent data
      let agentOverview: AgentOverview
      if (agent) {
        const agentAddr = address(agent)
        const agentData = await safeClient.agent.getAgentAccount(agentAddr)

        if (!agentData) {
          setError('Agent not found')
          setStage('error')
          return
        }

        const reputationScore = Number(agentData.reputationScore || 0)
        const ghostScore = Math.min(1000, Math.round(reputationScore / 100))
        const totalJobs = Number(agentData.totalJobsCompleted || 0)
        const totalJobsFailed = Number(agentData.totalJobsFailed || 0)
        const totalJobsAll = totalJobs + totalJobsFailed
        const successRate = totalJobsAll > 0 ? Math.round((totalJobs / totalJobsAll) * 100) : 0

        const tier: TierType =
          ghostScore >= 900 ? 'platinum' :
          ghostScore >= 750 ? 'gold' :
          ghostScore >= 500 ? 'silver' :
          ghostScore >= 200 ? 'bronze' : 'newcomer'

        agentOverview = {
          address: agentAddr,
          name: agentData.name || 'Agent',
          ghostScore,
          tier,
          jobsCompleted: totalJobs,
          successRate,
        }
      } else {
        // Mock agent data if no agent specified
        agentOverview = {
          address: 'Not Connected',
          name: 'Guest',
          ghostScore: 0,
          tier: 'newcomer',
          jobsCompleted: 0,
          successRate: 0,
        }
      }

      // Mock staking data (TODO: integrate with actual SDK when available)
      const stakingOverview: StakingOverview = {
        totalStaked: 5000,
        tier: 2,
        apy: 15,
        pendingRewards: 42.5,
      }

      // Mock escrow data (TODO: integrate with actual SDK when available)
      const escrowOverview: EscrowOverview = {
        activeCount: 3,
        totalLocked: 500,
        urgentAlerts: 1,
      }

      // Mock privacy status
      const privacyStatus: PrivacyStatus = {
        mode: 'private',
        visibleFields: ['name', 'ghostScore'],
      }

      // Mock recent activity
      const recentActivity: RecentActivity[] = [
        {
          timestamp: Date.now() - 120000,
          type: 'Escrow',
          description: 'Escrow created for 100 GHOST',
          status: 'success',
        },
        {
          timestamp: Date.now() - 3600000,
          type: 'Rewards',
          description: 'Claimed 10 GHOST rewards',
          status: 'success',
        },
        {
          timestamp: Date.now() - 7200000,
          type: 'Job',
          description: 'Completed job #42',
          status: 'success',
        },
        {
          timestamp: Date.now() - 10800000,
          type: 'Stake',
          description: 'Staked 1000 GHOST tokens',
          status: 'success',
        },
        {
          timestamp: Date.now() - 14400000,
          type: 'Profile',
          description: 'Updated privacy settings',
          status: 'success',
        },
      ]

      setData({
        agent: agentOverview,
        staking: stakingOverview,
        escrow: escrowOverview,
        privacy: privacyStatus,
        recentActivity,
      })

      setStage('ready')
      setLastUpdate(new Date())
    } catch (err: any) {
      setError(err.message || 'Failed to load dashboard data')
      setStage('error')
    }
  }

  const refreshData = async (silent = false) => {
    if (!silent) {
      setStage('loading')
    }

    try {
      await loadDashboardData()
    } catch (err: any) {
      setError(err.message || 'Failed to refresh data')
      setStage('error')
    }
  }

  const formatTimeAgo = (timestamp: number): string => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000)
    if (seconds < 60) return `${seconds}s ago`
    const minutes = Math.floor(seconds / 60)
    if (minutes < 60) return `${minutes}m ago`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours}h ago`
    const days = Math.floor(hours / 24)
    return `${days}d ago`
  }

  const getTierBadgeType = (tier: number): TierType => {
    if (tier === 5) return 'platinum'
    if (tier === 4) return 'gold'
    if (tier >= 2) return 'silver'
    if (tier === 1) return 'bronze'
    return 'newcomer'
  }

  const getPrivacyIcon = (mode: string): string => {
    if (mode === 'private') return '🔒'
    if (mode === 'selective') return '🔐'
    return '🔓'
  }

  const getStatusColor = (status: string): 'green' | 'yellow' | 'red' => {
    if (status === 'success') return 'green'
    if (status === 'pending') return 'yellow'
    return 'red'
  }

  const renderHeader = () => {
    if (!data) return null

    return (
      <Card borderColor="greenBright">
        <Box flexDirection="column">
          <Box justifyContent="space-between">
            <Box>
              <Text bold color="greenBright">GHOST</Text>
            </Box>
            <Box gap={2}>
              <Box>
                <Text dimColor>Network: </Text>
                <StatusBadge status="success" text={network.toUpperCase()} />
              </Box>
              <Box>
                <Text dimColor>Wallet: </Text>
                <Text>{data.agent.address.toString().slice(0, 8)}...</Text>
              </Box>
            </Box>
          </Box>
          <Box marginTop={1}>
            <Text dimColor>Last updated: {lastUpdate.toLocaleTimeString()}</Text>
          </Box>
        </Box>
      </Card>
    )
  }

  const renderAgentOverview = () => {
    if (!data) return null

    const tierColor =
      data.agent.tier === 'platinum' ? 'cyan' :
      data.agent.tier === 'gold' ? 'yellow' :
      data.agent.tier === 'silver' ? 'white' :
      data.agent.tier === 'bronze' ? 'red' : 'gray'

    return (
      <Card title="Agent Overview" borderColor={tierColor}>
        <Box flexDirection="column">
          <InfoRow label="Name" value={data.agent.name} color="cyan" />
          <Box marginTop={1}>
            <Box width={25}>
              <Text dimColor>Ghost Score:</Text>
            </Box>
            <Text bold color={tierColor}>
              {data.agent.ghostScore}/1000
            </Text>
            <Box marginLeft={2}>
              <Badge variant="tier" tier={data.agent.tier} />
            </Box>
          </Box>
          <InfoRow label="Jobs Completed" value={data.agent.jobsCompleted.toString()} color="green" />
          <InfoRow label="Success Rate" value={`${data.agent.successRate}%`} color={data.agent.successRate >= 80 ? 'green' : 'yellow'} />
        </Box>
      </Card>
    )
  }

  const renderStakingOverview = () => {
    if (!data) return null

    return (
      <Card title="Staking" borderColor="green">
        <Box flexDirection="column">
          <Box>
            <Box width={25}>
              <Text dimColor>Staked:</Text>
            </Box>
            <Text bold color="green">
              {data.staking.totalStaked.toLocaleString()} GHOST
            </Text>
          </Box>
          <Box marginTop={1}>
            <Box width={25}>
              <Text dimColor>Tier:</Text>
            </Box>
            <Badge variant="tier" tier={getTierBadgeType(data.staking.tier)} />
          </Box>
          <InfoRow label="APY" value={`${data.staking.apy}%`} color="yellow" />
          <InfoRow label="Pending Rewards" value={`${data.staking.pendingRewards} GHOST`} color="cyan" />
        </Box>
      </Card>
    )
  }

  const renderEscrowOverview = () => {
    if (!data) return null

    return (
      <Card title="Active Escrows" borderColor="magenta">
        <Box flexDirection="column">
          <InfoRow label="Active" value={data.escrow.activeCount.toString()} color="cyan" />
          <InfoRow label="Total Locked" value={`${data.escrow.totalLocked} GHOST`} color="yellow" />
          <Box marginTop={1}>
            <Box width={25}>
              <Text dimColor>Urgent Alerts:</Text>
            </Box>
            {data.escrow.urgentAlerts > 0 ? (
              <Text bold color="red">
                {data.escrow.urgentAlerts} ⚠️
              </Text>
            ) : (
              <Text color="green">None</Text>
            )}
          </Box>
        </Box>
      </Card>
    )
  }

  const renderPrivacyStatus = () => {
    if (!data) return null

    return (
      <Card title="Privacy" borderColor="blue">
        <Box flexDirection="column">
          <Box>
            <Box width={25}>
              <Text dimColor>Mode:</Text>
            </Box>
            <Text>{getPrivacyIcon(data.privacy.mode)} </Text>
            <Text bold color={data.privacy.mode === 'private' ? 'green' : 'yellow'}>
              {data.privacy.mode.toUpperCase()}
            </Text>
          </Box>
          <Box marginTop={1}>
            <Text dimColor>Visible: {data.privacy.visibleFields.join(', ')}</Text>
          </Box>
        </Box>
      </Card>
    )
  }

  const renderRecentActivity = () => {
    if (!data) return null

    return (
      <Card title="Recent Activity" borderColor="yellow">
        <Box flexDirection="column">
          {data.recentActivity.slice(0, 5).map((activity, idx) => (
            <Box key={idx} marginTop={idx > 0 ? 1 : 0}>
              <Box width={12}>
                <Text dimColor>{formatTimeAgo(activity.timestamp)}</Text>
              </Box>
              <Box width={10}>
                <Text color={getStatusColor(activity.status)}>[{activity.type}]</Text>
              </Box>
              <Text>{activity.description}</Text>
            </Box>
          ))}
        </Box>
      </Card>
    )
  }

  const renderQuickActions = () => {
    return (
      <Card title="Quick Actions" borderColor="gray">
        <Box flexDirection="column">
          <Text>
            <Text color="yellow">[R]</Text> <Text dimColor>Reputation Dashboard</Text>
          </Text>
          <Text>
            <Text color="green">[S]</Text> <Text dimColor>Staking Dashboard</Text>
          </Text>
          <Text>
            <Text color="blue">[P]</Text> <Text dimColor>Privacy Settings</Text>
          </Text>
          <Text>
            <Text color="magenta">[D]</Text> <Text dimColor>DID Manager</Text>
          </Text>
          <Text>
            <Text color="cyan">[E]</Text> <Text dimColor>Escrow Monitor</Text>
          </Text>
          <Text>
            <Text color="white">[F]</Text> <Text dimColor>Refresh Data</Text>
          </Text>
          <Text>
            <Text color="red">[Q]</Text> <Text dimColor>Quit</Text>
          </Text>
        </Box>
      </Card>
    )
  }

  const renderDashboardContent = () => {
    if (stage === 'loading') {
      return (
        <Box flexDirection="column" gap={1}>
          <Spinner state="loading" label="Loading dashboard data..." />
        </Box>
      )
    }

    if (stage === 'error') {
      return (
        <Box flexDirection="column" gap={1}>
          <Alert
            type="error"
            title="Failed to Load Dashboard"
            message={error}
            showBorder
          />
          <Box marginTop={1}>
            <Text dimColor>
              Press <Text color="yellow">f</Text> to retry or{' '}
              <Text color="yellow">q</Text> to quit
            </Text>
          </Box>
        </Box>
      )
    }

    if (!data) return null

    return (
      <Box flexDirection="column">
        {renderHeader()}

        {/* Grid layout - Top row */}
        <Box marginTop={1} gap={1}>
          <Box flexDirection="column" flexGrow={1}>
            {renderAgentOverview()}
          </Box>
          <Box flexDirection="column" flexGrow={1}>
            {renderStakingOverview()}
          </Box>
        </Box>

        {/* Grid layout - Middle row */}
        <Box marginTop={1} gap={1}>
          <Box flexDirection="column" flexGrow={1}>
            {renderEscrowOverview()}
          </Box>
          <Box flexDirection="column" flexGrow={1}>
            {renderPrivacyStatus()}
          </Box>
        </Box>

        {/* Recent activity - Full width */}
        <Box marginTop={1}>
          {renderRecentActivity()}
        </Box>

        {/* Quick actions - Full width */}
        <Box marginTop={1}>
          {renderQuickActions()}
        </Box>

        {/* Info footer */}
        <Box marginTop={1}>
          <Alert
            type="info"
            message="Use keyboard shortcuts to navigate to detailed dashboards"
            showBorder={false}
          />
        </Box>
      </Box>
    )
  }

  // Render sub-views
  if (currentView === 'reputation' && agent) {
    return <Reputation agent={agent} detailed={true} />
  }

  if (currentView === 'staking') {
    return <Staking agent={agent} autoRefresh={autoRefresh} />
  }

  if (currentView === 'privacy') {
    return (
      <Layout title="🔒 Privacy Settings" showFooter={false}>
        <Box flexDirection="column">
          <Alert
            type="info"
            title="Privacy Settings"
            message="Privacy management coming soon. Use 'ghost privacy' command for basic settings."
          />
          <Box marginTop={1}>
            <Text dimColor>
              Press <Text color="yellow">b</Text> to return to dashboard
            </Text>
          </Box>
        </Box>
      </Layout>
    )
  }

  if (currentView === 'did') {
    return (
      <Layout title="🆔 DID Manager" showFooter={false}>
        <Box flexDirection="column">
          <Alert
            type="info"
            title="DID Manager"
            message="Decentralized identifier management coming soon. Use 'ghost did' command for basic operations."
          />
          <Box marginTop={1}>
            <Text dimColor>
              Press <Text color="yellow">b</Text> to return to dashboard
            </Text>
          </Box>
        </Box>
      </Layout>
    )
  }

  if (currentView === 'escrow') {
    return (
      <Layout title="💰 Escrow Monitor" showFooter={false}>
        <Box flexDirection="column">
          <Alert
            type="info"
            title="Escrow Monitor"
            message="Escrow monitoring dashboard coming soon. Use 'ghost escrow' command for basic operations."
          />
          <Box marginTop={1}>
            <Text dimColor>
              Press <Text color="yellow">b</Text> to return to dashboard
            </Text>
          </Box>
        </Box>
      </Layout>
    )
  }

  // Main dashboard view
  return (
    <Layout title="📊 Analytics Dashboard" showFooter={false}>
      {renderDashboardContent()}
    </Layout>
  )
}
