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
    } else if (input === 'h' || input === '?') {
      setShowHelp(!showHelp)
    } else if (input === 'r') {
      refreshData()
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

      // Load escrow data using SDK
      // Note: Escrow queries not yet fully implemented in SDK
      // Returns empty array for now - users should use CLI commands
      const escrowData: EscrowData[] = []

      setEscrows(escrowData)
      setStage('ready')
      setLastUpdate(new Date())

    } catch (err: any) {
      setError(err.message || 'Failed to load escrow data')
      setStage('error')
    }
  }

  const refreshData = async (silent = false) => {
    if (!silent) {
      setStage('loading')
    }

    try {
      // Reload escrow data from SDK
      await loadEscrowData()

      setLastUpdate(new Date())
      if (!silent) {
        setStage('ready')
      }
    } catch (err: any) {
      setError(err.message || 'Failed to refresh data')
      setStage('error')
    }
  }

  const renderListView = () => {
    return (
      <Box flexDirection="column">
        <Alert
          type="info"
          title="Escrow Feature Coming Soon"
          message="x402 marketplace escrow monitoring will be available in a future release. Use 'ghost escrow' commands for escrow management."
          showBorder={true}
        />
        <Box marginTop={1}>
          <Text dimColor>What is Escrow?</Text>
        </Box>
        <Box marginTop={1} flexDirection="column">
          <Text dimColor>• Secure transactions between clients and AI agents</Text>
          <Text dimColor>• Milestone-based payments with dispute resolution</Text>
          <Text dimColor>• Agent deposits ensure commitment to work quality</Text>
          <Text dimColor>• Decentralized arbitration protects both parties</Text>
        </Box>
        <Box marginTop={2}>
          <Text dimColor>Press </Text>
          <Text color="cyan">Q</Text>
          <Text dimColor> to exit or </Text>
          <Text color="yellow">H</Text>
          <Text dimColor> for help</Text>
        </Box>
      </Box>
    )
  }

  const renderHelp = () => {
    return (
      <Card title="❓ Keyboard Controls" borderColor="yellow">
        <Box flexDirection="column">
          <Text><Text color="cyan">R</Text> <Text dimColor>- Refresh (check for updates)</Text></Text>
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
            <Text> Loading escrow data...</Text>
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
        </Box>

        {/* Main content */}
        {renderListView()}

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
