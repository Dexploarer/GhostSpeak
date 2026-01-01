/**
 * Interactive Escrow Monitor (Ink UI)
 * Beautiful real-time interface for x402 marketplace escrow monitoring
 */

import React, { useState, useEffect } from 'react'
import { Box, Text, useApp, useInput } from 'ink'
import Spinner from 'ink-spinner'
import Gradient from 'ink-gradient'
import { Layout } from '../components/Layout.js'
import { InfoRow } from '../components/InfoRow.js'
import { StatusBadge } from '../components/StatusBadge.js'
import { ProgressBar } from '../components/ProgressBar.js'
import { Badge } from '../components/Badge.js'
import { Card } from '../components/Card.js'
import { Alert } from '../components/Alert.js'
import { Table } from '../components/Table.js'

// Escrow statuses
type EscrowStatus = 'pending' | 'completed' | 'disputed' | 'cancelled'
type MilestoneStatus = 'pending' | 'in-progress' | 'completed'
type SortBy = 'deadline' | 'amount' | 'status' | 'created'
type ViewMode = 'list' | 'detail' | 'summary'

interface Milestone {
  name: string
  status: MilestoneStatus
  paid: number
  description?: string
}

interface EscrowData {
  address: string
  job: string
  jobDescription?: string
  agent: string
  agentAddress?: string
  creator?: string
  amount: number
  deposit: number
  status: EscrowStatus
  created: number
  deadline: number
  milestones?: Milestone[]
  dispute?: {
    reason: string
    evidence?: string
    submittedBy?: string
    submittedAt?: number
    responseDeadline?: number
  }
  rating?: number
  completedAt?: number
}

export interface EscrowProps {
  agent?: string
  status?: EscrowStatus
  monitor?: boolean
}

type Stage = 'loading' | 'ready' | 'error' | 'refreshing'

export const Escrow: React.FC<EscrowProps> = ({ agent, status, monitor = false }) => {
  const { exit } = useApp()
  const [stage, setStage] = useState<Stage>('loading')
  const [escrows, setEscrows] = useState<EscrowData[]>([])
  const [filteredEscrows, setFilteredEscrows] = useState<EscrowData[]>([])
  const [error, setError] = useState<string>('')
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [filterStatus, setFilterStatus] = useState<EscrowStatus | 'all'>(status || 'all')
  const [sortBy, setSortBy] = useState<SortBy>('deadline')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  const [autoRefresh, setAutoRefresh] = useState(monitor)
  const [showHelp, setShowHelp] = useState(false)
  const [currentTime, setCurrentTime] = useState(Date.now())
  const [hasChanges, setHasChanges] = useState(false)

  // Keyboard controls
  useInput((input, key) => {
    if (input === 'q' || (key.ctrl && input === 'c')) {
      exit()
    } else if (key.upArrow && viewMode === 'list') {
      setSelectedIndex(Math.max(0, selectedIndex - 1))
    } else if (key.downArrow && viewMode === 'list') {
      setSelectedIndex(Math.min(filteredEscrows.length - 1, selectedIndex + 1))
    } else if (key.return && viewMode === 'list') {
      setViewMode('detail')
    } else if (input === 'v' && viewMode === 'list') {
      setViewMode('detail')
    } else if (input === 'b' && viewMode === 'detail') {
      setViewMode('list')
    } else if (input === 's' && viewMode === 'list') {
      setViewMode('summary')
    } else if (input === 'r') {
      refreshData()
    } else if (input === 'f') {
      cycleFilter()
    } else if (input === 'm') {
      setAutoRefresh(!autoRefresh)
    } else if (input === 'h' || input === '?') {
      setShowHelp(!showHelp)
    } else if (input === 'o' && viewMode !== 'list') {
      setViewMode('list')
    } else if (input === 't') {
      cycleSortBy()
    }
  })

  // Update current time every second for countdown timers
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(Date.now())
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  // Auto-refresh every 10 seconds
  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(() => {
        refreshData(true)
      }, 10000)
      return () => clearInterval(interval)
    }
  }, [autoRefresh])

  // Initial data load
  useEffect(() => {
    loadEscrowData()
  }, [])

  // Filter and sort escrows
  useEffect(() => {
    let filtered = [...escrows]

    // Filter by status
    if (filterStatus !== 'all') {
      filtered = filtered.filter(e => e.status === filterStatus)
    }

    // Filter by agent
    if (agent) {
      filtered = filtered.filter(e => e.agentAddress === agent || e.agent.toLowerCase().includes(agent.toLowerCase()))
    }

    // Sort
    filtered.sort((a, b) => {
      let comparison = 0
      switch (sortBy) {
        case 'deadline':
          comparison = a.deadline - b.deadline
          break
        case 'amount':
          comparison = a.amount - b.amount
          break
        case 'status':
          comparison = a.status.localeCompare(b.status)
          break
        case 'created':
          comparison = a.created - b.created
          break
      }
      return sortDirection === 'asc' ? comparison : -comparison
    })

    setFilteredEscrows(filtered)

    // Adjust selected index if needed
    if (selectedIndex >= filtered.length) {
      setSelectedIndex(Math.max(0, filtered.length - 1))
    }
  }, [escrows, filterStatus, sortBy, sortDirection, agent])

  const loadEscrowData = async () => {
    try {
      setStage('loading')

      // TODO: Replace with actual SDK calls when available
      await simulateAPICall(800)

      // Mock data - comprehensive set of escrows
      const mockData: EscrowData[] = [
        {
          address: 'Esc1row...abc123',
          job: 'Sentiment analysis API',
          jobDescription: 'Integrate sentiment analysis API with error handling, rate limiting, and comprehensive testing',
          agent: 'SentimentBot',
          agentAddress: 'Sent1ment...xyz789',
          creator: 'Creator...def456',
          amount: 100,
          deposit: 25,
          status: 'pending',
          created: Date.now() - 3 * 24 * 60 * 60 * 1000,
          deadline: Date.now() + 2 * 24 * 60 * 60 * 1000,
          milestones: [
            { name: 'API integration', status: 'completed', paid: 30, description: 'Basic API integration complete' },
            { name: 'Error handling', status: 'completed', paid: 30, description: 'Comprehensive error handling added' },
            { name: 'Rate limiting', status: 'in-progress', paid: 0, description: 'Implementing rate limiting logic' },
            { name: 'Testing & docs', status: 'pending', paid: 0, description: 'Unit tests and documentation' }
          ]
        },
        {
          address: 'Esc1row...def456',
          job: 'NFT metadata parser',
          jobDescription: 'Parse and validate NFT metadata from multiple sources',
          agent: 'MetadataAgent',
          agentAddress: 'Meta...uvw123',
          creator: 'Creator...ghi789',
          amount: 250,
          deposit: 0,
          status: 'completed',
          created: Date.now() - 10 * 24 * 60 * 60 * 1000,
          deadline: Date.now() - 5 * 24 * 60 * 60 * 1000,
          completedAt: Date.now() - 5 * 24 * 60 * 60 * 1000,
          rating: 5,
          milestones: [
            { name: 'Parser implementation', status: 'completed', paid: 150, description: 'Core parsing logic' },
            { name: 'Validation layer', status: 'completed', paid: 100, description: 'Schema validation' }
          ]
        },
        {
          address: 'Esc1row...ghi789',
          job: 'Token swap integration',
          jobDescription: 'Integrate token swap functionality with Orca and Raydium',
          agent: 'SwapBot',
          agentAddress: 'Swap...rst456',
          creator: 'Creator...jkl012',
          amount: 500,
          deposit: 75,
          status: 'disputed',
          created: Date.now() - 7 * 24 * 60 * 60 * 1000,
          deadline: Date.now() - 1 * 24 * 60 * 60 * 1000,
          dispute: {
            reason: 'Incomplete work - Raydium integration missing',
            evidence: 'https://example.com/evidence/missing-raydium.png',
            submittedBy: 'creator',
            submittedAt: Date.now() - 12 * 60 * 60 * 1000,
            responseDeadline: Date.now() + 36 * 60 * 60 * 1000
          },
          milestones: [
            { name: 'Orca integration', status: 'completed', paid: 250, description: 'Orca DEX integration complete' },
            { name: 'Raydium integration', status: 'in-progress', paid: 0, description: 'Raydium DEX integration incomplete' }
          ]
        },
        {
          address: 'Esc1row...jkl012',
          job: 'Data aggregation service',
          jobDescription: 'Aggregate on-chain data from multiple sources',
          agent: 'DataBot',
          agentAddress: 'Data...mno789',
          creator: 'Creator...pqr345',
          amount: 150,
          deposit: 37.5,
          status: 'cancelled',
          created: Date.now() - 15 * 24 * 60 * 60 * 1000,
          deadline: Date.now() - 10 * 24 * 60 * 60 * 1000,
          completedAt: Date.now() - 10 * 24 * 60 * 60 * 1000
        },
        {
          address: 'Esc1row...mno345',
          job: 'Price oracle updates',
          jobDescription: 'Real-time price oracle with multi-source validation',
          agent: 'OracleBot',
          agentAddress: 'Oracle...abc987',
          creator: 'Creator...stu678',
          amount: 300,
          deposit: 45,
          status: 'pending',
          created: Date.now() - 1 * 24 * 60 * 60 * 1000,
          deadline: Date.now() + 6 * 24 * 60 * 60 * 1000,
          milestones: [
            { name: 'Oracle setup', status: 'completed', paid: 100, description: 'Initial oracle configuration' },
            { name: 'Multi-source integration', status: 'in-progress', paid: 0, description: 'Integrating multiple price sources' },
            { name: 'Validation logic', status: 'pending', paid: 0, description: 'Price validation and anomaly detection' }
          ]
        },
        {
          address: 'Esc1row...pqr678',
          job: 'Smart contract audit',
          jobDescription: 'Security audit of escrow smart contract',
          agent: 'AuditAgent',
          agentAddress: 'Audit...def321',
          creator: 'Creator...vwx901',
          amount: 1000,
          deposit: 0,
          status: 'pending',
          created: Date.now() - 30 * 60 * 1000,
          deadline: Date.now() + 14 * 24 * 60 * 60 * 1000
        }
      ]

      setEscrows(mockData)
      setStage('ready')
      setLastUpdate(new Date())

    } catch (err: any) {
      setError(err.message || 'Failed to load escrow data')
      setStage('error')
    }
  }

  const refreshData = async (silent = false) => {
    if (!silent) {
      setStage('refreshing')
    }

    try {
      await simulateAPICall(300)

      // Simulate status changes
      const previousEscrows = JSON.stringify(escrows)
      // In real implementation, fetch fresh data here
      setLastUpdate(new Date())

      const newEscrows = JSON.stringify(escrows)
      if (previousEscrows !== newEscrows) {
        setHasChanges(true)
        setTimeout(() => setHasChanges(false), 2000)
      }

      if (!silent) {
        setStage('ready')
      }
    } catch (err: any) {
      setError(err.message || 'Failed to refresh data')
      setStage('error')
    }
  }

  const cycleFilter = () => {
    const filters: Array<EscrowStatus | 'all'> = ['all', 'pending', 'completed', 'disputed', 'cancelled']
    const currentIndex = filters.indexOf(filterStatus)
    const nextIndex = (currentIndex + 1) % filters.length
    setFilterStatus(filters[nextIndex])
  }

  const cycleSortBy = () => {
    const sortOptions: SortBy[] = ['deadline', 'amount', 'status', 'created']
    const currentIndex = sortOptions.indexOf(sortBy)
    const nextIndex = (currentIndex + 1) % sortOptions.length

    if (currentIndex === sortOptions.length - 1) {
      setSortBy(sortOptions[nextIndex])
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(sortOptions[nextIndex])
    }
  }

  const simulateAPICall = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

  const getTimeRemaining = (deadline: number): { text: string; isOverdue: boolean; isUrgent: boolean } => {
    const diff = deadline - currentTime

    if (diff <= 0) {
      return { text: 'OVERDUE', isOverdue: true, isUrgent: true }
    }

    const days = Math.floor(diff / (24 * 60 * 60 * 1000))
    const hours = Math.floor((diff % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000))
    const minutes = Math.floor((diff % (60 * 60 * 1000)) / (60 * 1000))

    const isUrgent = diff < 60 * 60 * 1000 // Less than 1 hour

    if (days > 0) return { text: `${days}d ${hours}h`, isOverdue: false, isUrgent: false }
    if (hours > 0) return { text: `${hours}h ${minutes}m`, isOverdue: false, isUrgent }
    return { text: `${minutes}m`, isOverdue: false, isUrgent }
  }

  const getStatusBadge = (status: EscrowStatus) => {
    const config = {
      pending: { text: 'PENDING', color: 'yellow' as const, icon: '📋' },
      completed: { text: 'COMPLETED', color: 'green' as const, icon: '✅' },
      disputed: { text: 'DISPUTED', color: 'red' as const, icon: '⚠️' },
      cancelled: { text: 'CANCELLED', color: 'gray' as const, icon: '❌' }
    }
    return config[status]
  }

  const getMilestoneStatusIcon = (status: MilestoneStatus): { icon: string; color: string } => {
    switch (status) {
      case 'completed': return { icon: '✓', color: 'green' }
      case 'in-progress': return { icon: '⏳', color: 'yellow' }
      case 'pending': return { icon: '⏸', color: 'gray' }
    }
  }

  const getSummaryStats = () => {
    const activeEscrows = escrows.filter(e => e.status === 'pending')
    const totalLocked = escrows
      .filter(e => e.status === 'pending')
      .reduce((sum, e) => sum + e.amount + e.deposit, 0)
    const pendingApproval = escrows.filter(e => e.status === 'pending' && e.deadline < currentTime).length
    const inDispute = escrows.filter(e => e.status === 'disputed').length

    return { activeEscrows: activeEscrows.length, totalLocked, pendingApproval, inDispute }
  }

  const renderListView = () => {
    if (filteredEscrows.length === 0) {
      return (
        <Box flexDirection="column">
          <Alert
            type="info"
            message={filterStatus === 'all' ? 'No escrows found' : `No ${filterStatus} escrows found`}
            showBorder={true}
          />
          <Box marginTop={1}>
            <Text dimColor>Press </Text>
            <Text color="cyan">F</Text>
            <Text dimColor> to change filter or </Text>
            <Text color="cyan">R</Text>
            <Text dimColor> to refresh</Text>
          </Box>
        </Box>
      )
    }

    return (
      <Box flexDirection="column">
        {/* Filter and sort info */}
        <Box marginBottom={1}>
          <Text dimColor>Filter: </Text>
          <Text bold color="cyan">{filterStatus.toUpperCase()}</Text>
          <Box marginLeft={3}>
            <Text dimColor>Sort by: </Text>
            <Text bold color="cyan">{sortBy} ({sortDirection})</Text>
          </Box>
          <Box marginLeft={3}>
            <Text dimColor>Showing: </Text>
            <Text bold>{filteredEscrows.length}</Text>
          </Box>
        </Box>

        {/* Escrow list */}
        <Box flexDirection="column">
          {filteredEscrows.map((escrow, index) => {
            const isSelected = index === selectedIndex
            const statusBadge = getStatusBadge(escrow.status)
            const timeInfo = escrow.status === 'pending' ? getTimeRemaining(escrow.deadline) : null

            return (
              <Box
                key={escrow.address}
                flexDirection="column"
                borderStyle={isSelected ? 'round' : undefined}
                borderColor={isSelected ? 'cyan' : undefined}
                paddingX={isSelected ? 1 : 0}
                marginBottom={1}
              >
                {/* Row 1: Job title and status */}
                <Box>
                  <Box width={3}>
                    <Text bold color={isSelected ? 'cyan' : 'white'}>
                      {isSelected ? '►' : ' '}
                    </Text>
                  </Box>
                  <Box width={40}>
                    <Text bold color={isSelected ? 'cyan' : 'white'}>
                      {escrow.job}
                    </Text>
                  </Box>
                  <Box marginLeft={2}>
                    <Text color={statusBadge.color}>{statusBadge.icon} </Text>
                    <Text bold color={statusBadge.color}>{statusBadge.text}</Text>
                  </Box>
                </Box>

                {/* Row 2: Details */}
                <Box marginTop={0} marginLeft={3}>
                  <Box width={25}>
                    <Text dimColor>Agent: </Text>
                    <Text>{escrow.agent}</Text>
                  </Box>
                  <Box width={20}>
                    <Text dimColor>Amount: </Text>
                    <Text bold color="yellow">{escrow.amount} GHOST</Text>
                  </Box>
                  <Box width={25}>
                    {timeInfo && (
                      <>
                        <Text dimColor>Deadline: </Text>
                        <Text
                          bold
                          color={timeInfo.isOverdue ? 'red' : timeInfo.isUrgent ? 'yellow' : 'white'}
                        >
                          {timeInfo.text}
                        </Text>
                        {timeInfo.isUrgent && !timeInfo.isOverdue && <Text color="yellow"> 🔥</Text>}
                        {timeInfo.isOverdue && <Text color="red"> ⚠️</Text>}
                      </>
                    )}
                    {escrow.status === 'completed' && (
                      <>
                        <Text dimColor>Completed: </Text>
                        <Text color="green">✓</Text>
                      </>
                    )}
                    {escrow.status === 'disputed' && (
                      <>
                        <Text color="red">⚠️ IN DISPUTE</Text>
                      </>
                    )}
                  </Box>
                </Box>

                {/* Row 3: Address */}
                <Box marginTop={0} marginLeft={3}>
                  <Text dimColor>{escrow.address}</Text>
                </Box>
              </Box>
            )
          })}
        </Box>
      </Box>
    )
  }

  const renderDetailView = () => {
    const escrow = filteredEscrows[selectedIndex]
    if (!escrow) {
      return (
        <Alert type="error" message="No escrow selected" />
      )
    }

    const statusBadge = getStatusBadge(escrow.status)
    const timeInfo = escrow.status === 'pending' ? getTimeRemaining(escrow.deadline) : null
    const totalLocked = escrow.amount + escrow.deposit

    return (
      <Box flexDirection="column">
        {/* Title and status */}
        <Card title={escrow.job} borderColor="cyan">
          <Box flexDirection="column">
            <Box>
              <Text color={statusBadge.color}>{statusBadge.icon} </Text>
              <Text bold color={statusBadge.color}>{statusBadge.text}</Text>
            </Box>

            {escrow.jobDescription && (
              <Box marginTop={1}>
                <Text dimColor>{escrow.jobDescription}</Text>
              </Box>
            )}
          </Box>
        </Card>

        {/* Parties */}
        <Box marginTop={1}>
          <Card title="Parties" borderColor="blue">
            <Box flexDirection="column">
              <InfoRow label="Creator" value={escrow.creator || 'N/A'} />
              <InfoRow label="Agent" value={escrow.agent} color="cyan" />
              <InfoRow label="Agent Address" value={escrow.agentAddress || 'N/A'} />
            </Box>
          </Card>
        </Box>

        {/* Payment breakdown */}
        <Box marginTop={1}>
          <Card title="Payment Breakdown" borderColor="yellow">
            <Box flexDirection="column">
              <InfoRow label="Job Value" value={`${escrow.amount} GHOST`} color="yellow" />
              <InfoRow
                label="Agent Deposit"
                value={`${escrow.deposit} GHOST (${((escrow.deposit / escrow.amount) * 100).toFixed(0)}%)`}
                color={escrow.deposit > 0 ? 'cyan' : 'gray'}
              />
              <InfoRow label="Total Locked" value={`${totalLocked} GHOST`} color="white" />
            </Box>
          </Card>
        </Box>

        {/* Timeline */}
        <Box marginTop={1}>
          <Card title="Timeline" borderColor="magenta">
            <Box flexDirection="column">
              <InfoRow
                label="Created"
                value={new Date(escrow.created).toLocaleDateString()}
              />
              <InfoRow
                label="Deadline"
                value={new Date(escrow.deadline).toLocaleDateString()}
                color={timeInfo?.isOverdue ? 'red' : undefined}
              />
              {timeInfo && (
                <InfoRow
                  label="Time Remaining"
                  value={timeInfo.text}
                  color={timeInfo.isOverdue ? 'red' : timeInfo.isUrgent ? 'yellow' : 'green'}
                />
              )}
              {escrow.completedAt && (
                <InfoRow
                  label="Completed"
                  value={new Date(escrow.completedAt).toLocaleDateString()}
                  color="green"
                />
              )}
              {escrow.rating && (
                <InfoRow
                  label="Rating"
                  value={'⭐'.repeat(escrow.rating)}
                  color="yellow"
                />
              )}
            </Box>
          </Card>
        </Box>

        {/* Milestones */}
        {escrow.milestones && escrow.milestones.length > 0 && (
          <Box marginTop={1}>
            <Card title="Milestones" borderColor="green">
              <Box flexDirection="column">
                {escrow.milestones.map((milestone, idx) => {
                  const statusIcon = getMilestoneStatusIcon(milestone.status)
                  const progress = escrow.milestones
                    ? (escrow.milestones.filter(m => m.status === 'completed').length / escrow.milestones.length) * 100
                    : 0

                  return (
                    <Box key={idx} flexDirection="column" marginBottom={1}>
                      <Box>
                        <Text color={statusIcon.color}>{statusIcon.icon} </Text>
                        <Box width={25}>
                          <Text bold>{milestone.name}</Text>
                        </Box>
                        <Text dimColor> - </Text>
                        <Text color={milestone.paid > 0 ? 'green' : 'gray'}>
                          {milestone.paid > 0 ? `${milestone.paid} GHOST paid` : 'Unpaid'}
                        </Text>
                      </Box>
                      {milestone.description && (
                        <Box marginLeft={2}>
                          <Text dimColor>{milestone.description}</Text>
                        </Box>
                      )}
                    </Box>
                  )
                })}
                <Box marginTop={1}>
                  <ProgressBar
                    value={escrow.milestones.filter(m => m.status === 'completed').length / escrow.milestones.length * 100}
                    label="Overall Progress"
                    color="green"
                  />
                </Box>
              </Box>
            </Card>
          </Box>
        )}

        {/* Dispute details */}
        {escrow.dispute && (
          <Box marginTop={1}>
            <Alert
              type="error"
              title="⚠️ Escrow Disputed"
              message={escrow.dispute.reason}
              showBorder={true}
            >
              <Box flexDirection="column" marginTop={1}>
                {escrow.dispute.evidence && (
                  <Box>
                    <Text dimColor>Evidence: </Text>
                    <Text color="blue">{escrow.dispute.evidence}</Text>
                  </Box>
                )}
                {escrow.dispute.submittedAt && (
                  <Box marginTop={1}>
                    <Text dimColor>Submitted: </Text>
                    <Text>{new Date(escrow.dispute.submittedAt).toLocaleString()}</Text>
                  </Box>
                )}
                {escrow.dispute.responseDeadline && (
                  <Box marginTop={1}>
                    <Text dimColor>Response due: </Text>
                    <Text color="yellow">
                      {getTimeRemaining(escrow.dispute.responseDeadline).text}
                    </Text>
                  </Box>
                )}
              </Box>
            </Alert>
          </Box>
        )}

        {/* Quick actions hint */}
        <Box marginTop={1}>
          <Text dimColor>Press </Text>
          <Text color="cyan">B</Text>
          <Text dimColor> to go back or </Text>
          <Text color="cyan">Arrow keys</Text>
          <Text dimColor> to navigate</Text>
        </Box>
      </Box>
    )
  }

  const renderSummaryView = () => {
    const stats = getSummaryStats()

    return (
      <Box flexDirection="column">
        {/* Summary cards */}
        <Box flexDirection="column">
          <Card title="📊 Escrow Summary" borderColor="cyan">
            <Box flexDirection="column">
              <InfoRow
                label="Total Active Escrows"
                value={stats.activeEscrows.toString()}
                color="cyan"
              />
              <InfoRow
                label="Total Locked Value"
                value={`${stats.totalLocked.toFixed(2)} GHOST`}
                color="yellow"
              />
              <InfoRow
                label="Pending Approval"
                value={stats.pendingApproval.toString()}
                color={stats.pendingApproval > 0 ? 'red' : 'green'}
              />
              <InfoRow
                label="In Dispute"
                value={stats.inDispute.toString()}
                color={stats.inDispute > 0 ? 'red' : 'green'}
              />
            </Box>
          </Card>
        </Box>

        {/* Status breakdown */}
        <Box marginTop={1}>
          <Card title="Status Breakdown" borderColor="magenta">
            <Box flexDirection="column">
              {(['pending', 'completed', 'disputed', 'cancelled'] as EscrowStatus[]).map(status => {
                const count = escrows.filter(e => e.status === status).length
                const statusBadge = getStatusBadge(status)

                return (
                  <Box key={status} marginBottom={1}>
                    <Box width={20}>
                      <Text color={statusBadge.color}>{statusBadge.icon} </Text>
                      <Text bold color={statusBadge.color}>{statusBadge.text}</Text>
                    </Box>
                    <Text bold>{count}</Text>
                    <Box marginLeft={2}>
                      <Text dimColor>({((count / escrows.length) * 100).toFixed(0)}%)</Text>
                    </Box>
                  </Box>
                )
              })}
            </Box>
          </Card>
        </Box>

        {/* Urgent items */}
        {stats.pendingApproval > 0 && (
          <Box marginTop={1}>
            <Alert
              type="warning"
              title="⚠️ Attention Required"
              message={`${stats.pendingApproval} escrow(s) past deadline and awaiting action`}
              showBorder={true}
            />
          </Box>
        )}

        {stats.inDispute > 0 && (
          <Box marginTop={1}>
            <Alert
              type="error"
              title="⚠️ Active Disputes"
              message={`${stats.inDispute} escrow(s) currently in dispute - requires resolution`}
              showBorder={true}
            />
          </Box>
        )}

        <Box marginTop={1}>
          <Text dimColor>Press </Text>
          <Text color="cyan">O</Text>
          <Text dimColor> to view escrow list</Text>
        </Box>
      </Box>
    )
  }

  const renderHelp = () => {
    return (
      <Card title="❓ Keyboard Controls" borderColor="yellow">
        <Box flexDirection="column">
          <Text><Text color="cyan">↑/↓</Text> <Text dimColor>- Navigate escrows</Text></Text>
          <Text><Text color="cyan">Enter/V</Text> <Text dimColor>- View details</Text></Text>
          <Text><Text color="cyan">B</Text> <Text dimColor>- Back to list</Text></Text>
          <Text><Text color="cyan">S</Text> <Text dimColor>- Summary view</Text></Text>
          <Text><Text color="cyan">F</Text> <Text dimColor>- Cycle filter ({filterStatus})</Text></Text>
          <Text><Text color="cyan">T</Text> <Text dimColor>- Toggle sort ({sortBy} {sortDirection})</Text></Text>
          <Text><Text color="cyan">R</Text> <Text dimColor>- Refresh now</Text></Text>
          <Text><Text color="cyan">M</Text> <Text dimColor>- Toggle monitor mode ({autoRefresh ? 'ON' : 'OFF'})</Text></Text>
          <Text><Text color="cyan">H/?</Text> <Text dimColor>- Toggle this help</Text></Text>
          <Text><Text color="cyan">Q</Text> <Text dimColor>- Quit</Text></Text>
        </Box>
      </Card>
    )
  }

  const renderContent = () => {
    if (stage === 'loading') {
      return (
        <Box flexDirection="column">
          <Box>
            <Spinner type="dots" />
            <Text> Loading escrow data from blockchain...</Text>
          </Box>
        </Box>
      )
    }

    if (stage === 'error') {
      return (
        <Box flexDirection="column">
          <Alert type="error" message={error} showBorder={true} />
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

    return (
      <Box flexDirection="column">
        {/* Status bar */}
        <Box marginBottom={1}>
          <Text dimColor>Last updated: </Text>
          <Text>{lastUpdate.toLocaleTimeString()}</Text>
          <Box marginLeft={2}>
            {autoRefresh && <Text color="green">• Auto-refresh ON (10s)</Text>}
            {!autoRefresh && <Text dimColor>• Auto-refresh OFF</Text>}
          </Box>
          {hasChanges && (
            <Box marginLeft={2}>
              <Text color="yellow">🔔 Changes detected</Text>
            </Box>
          )}
          {stage === 'refreshing' && (
            <Box marginLeft={2}>
              <Spinner type="dots" />
              <Text dimColor> Refreshing...</Text>
            </Box>
          )}
        </Box>

        {/* Main content based on view mode */}
        {viewMode === 'list' && renderListView()}
        {viewMode === 'detail' && renderDetailView()}
        {viewMode === 'summary' && renderSummaryView()}

        {/* Help panel */}
        {showHelp && (
          <Box marginTop={1}>
            {renderHelp()}
          </Box>
        )}

        {/* Footer */}
        <Box marginTop={1}>
          <Gradient name="rainbow">
            <Text>✨ x402 Marketplace Escrow Monitor ✨</Text>
          </Gradient>
        </Box>
      </Box>
    )
  }

  return (
    <Layout title="💰 Escrow Monitor" showFooter={false}>
      {renderContent()}
    </Layout>
  )
}
