/**
 * Interactive Authorization Dashboard (Ink UI)
 * Beautiful real-time interface for managing pre-authorizations
 */

import React, { useState, useEffect } from 'react'
import { Box, Text, useApp, useInput } from 'ink'
import Spinner from 'ink-spinner'
import Gradient from 'ink-gradient'
import { Layout } from '../components/Layout.js'
import { InfoRow } from '../components/InfoRow.js'
import { StatusBadge } from '../components/StatusBadge.js'
import { Card } from '../components/Card.js'
import { Badge } from '../components/Badge.js'
import { Alert } from '../components/Alert.js'
import { ProgressBar } from '../components/ProgressBar.js'
import { createSolanaRpc } from '@solana/rpc'
import { address, type Address } from '@solana/addresses'
import { createKeyPairSignerFromBytes } from '@solana/signers'
import { createSafeSDKClient } from '../../utils/sdk-helpers.js'
import { GhostSpeakClient } from '@ghostspeak/sdk'
import { readFileSync } from 'fs'

export interface AuthorizationProps {
  agentAddress?: string
  autoRefresh?: boolean
}

type AuthStage = 'loading' | 'ready' | 'creating' | 'revoking' | 'verifying' | 'error' | 'auth_detail'

interface PreAuthorization {
  address: Address
  agentAddress: Address
  agentName: string
  authorizedSource: Address
  sourceName: string
  indexLimit: bigint
  indexesUsed: bigint
  expiresAt: number
  createdAt: number
  network: string
  status: 'active' | 'expired' | 'exhausted' | 'revoked'
}

export const Authorization: React.FC<AuthorizationProps> = ({ agentAddress, autoRefresh = true }) => {
  const { exit } = useApp()
  const [stage, setStage] = useState<AuthStage>('loading')
  const [authorizations, setAuthorizations] = useState<PreAuthorization[]>([])
  const [selectedAuth, setSelectedAuth] = useState<PreAuthorization | null>(null)
  const [error, setError] = useState<string>('')
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())
  const [helpVisible, setHelpVisible] = useState(false)
  const [userAddress, setUserAddress] = useState<Address | null>(null)

  // Keyboard shortcuts
  useInput((input, key) => {
    if (input === 'q' || (key.ctrl && input === 'c') || key.escape) {
      exit()
    }

    if (stage === 'ready') {
      if (input === 'r') {
        refreshData()
      } else if (input === 'h' || input === '?') {
        setHelpVisible(!helpVisible)
      } else if (input === 'c') {
        setStage('creating')
        // Would open create dialog in full implementation
      }
    }

    if (stage === 'auth_detail') {
      if (input === 'b') {
        setStage('ready')
        setSelectedAuth(null)
      }
    }
  })

  // Auto-refresh every 10 seconds
  useEffect(() => {
    if (autoRefresh && stage === 'ready') {
      const interval = setInterval(() => {
        refreshData(true) // silent refresh
      }, 10000)

      return () => clearInterval(interval)
    }
  }, [autoRefresh, stage])

  // Initial data load
  useEffect(() => {
    loadAuthorizations()
  }, [])

  const loadAuthorizations = async () => {
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

      setUserAddress(wallet.address)

      // Load authorizations using actual SDK
      // Note: Authorization listing by user not yet implemented in SDK
      // Returns empty array for now - users should use CLI commands
      const auths: PreAuthorization[] = []

      setAuthorizations(auths)
      setStage('ready')
      setLastUpdate(new Date())

    } catch (err: any) {
      setError(err.message || 'Failed to load authorizations')
      setStage('error')
    }
  }

  const refreshData = async (silent = false) => {
    if (!silent) {
      setStage('loading')
    }

    try {
      // Reload authorizations from SDK
      await loadAuthorizations()

      setLastUpdate(new Date())
      if (!silent) {
        setStage('ready')
      }
    } catch (err: any) {
      setError(err.message || 'Failed to refresh data')
      setStage('error')
    }
  }

  const getStatusColor = (status: string): 'green' | 'yellow' | 'red' | 'gray' => {
    const colors: Record<string, any> = {
      'active': 'green',
      'expired': 'red',
      'exhausted': 'yellow',
      'revoked': 'gray',
    }
    return colors[status] || 'gray'
  }

  const getStatusIcon = (status: string): string => {
    const icons: Record<string, string> = {
      'active': '✅',
      'expired': '⏰',
      'exhausted': '📊',
      'revoked': '🚫',
    }
    return icons[status] || '❓'
  }

  const calculateUsagePercentage = (used: bigint, limit: bigint): number => {
    if (limit === BigInt(0)) return 0
    return Number((used * BigInt(100)) / limit)
  }

  const formatTimeRemaining = (expiresAt: number): string => {
    const now = Date.now()
    const remaining = expiresAt - now

    if (remaining <= 0) return 'Expired'

    const days = Math.floor(remaining / (1000 * 60 * 60 * 24))
    const hours = Math.floor((remaining % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))

    if (days > 0) return `${days}d ${hours}h`
    return `${hours}h`
  }

  const renderAuthorizationsList = () => {
    if (authorizations.length === 0) {
      return (
        <Box flexDirection="column" gap={1}>
          <Alert
            type="info"
            title="No Pre-Authorizations Found"
            message="You haven't created any pre-authorizations yet. Press C to create your first authorization!"
          />
          <Box marginTop={1}>
            <Text dimColor>What are Pre-Authorizations?</Text>
          </Box>
          <Box marginTop={1} flexDirection="column">
            <Text dimColor>• Pre-authorize trusted sources to update agent reputation</Text>
            <Text dimColor>• Set index limits to cap total updates (prevents abuse)</Text>
            <Text dimColor>• Set expiration dates for time-bound permissions</Text>
            <Text dimColor>• Trustless reputation updates without wallet signatures</Text>
          </Box>
        </Box>
      )
    }

    const activeAuths = authorizations.filter(a => a.status === 'active')
    const inactiveAuths = authorizations.filter(a => a.status !== 'active')

    return (
      <Box flexDirection="column" gap={1}>
        {activeAuths.length > 0 && (
          <Card title={`Active Authorizations (${activeAuths.length})`} borderColor="green">
            <Box flexDirection="column">
              {activeAuths.map((auth, idx) => (
                <Box key={idx} flexDirection="column" marginBottom={idx < activeAuths.length - 1 ? 1 : 0}>
                  <Box alignItems="center" gap={2}>
                    <Text>{getStatusIcon(auth.status)}</Text>
                    <Text bold color="cyan">{auth.agentName}</Text>
                    <Text color="green">→</Text>
                    <Text color="yellow">{auth.sourceName}</Text>
                  </Box>
                  <Box marginTop={1}>
                    <InfoRow
                      label="Network"
                      value={auth.network}
                      color="cyan"
                    />
                  </Box>
                  <Box>
                    <InfoRow
                      label="Expires"
                      value={formatTimeRemaining(auth.expiresAt)}
                      color={Date.now() > auth.expiresAt - (7 * 24 * 60 * 60 * 1000) ? 'yellow' : 'green'}
                    />
                  </Box>
                  <Box marginTop={1}>
                    <ProgressBar
                      value={calculateUsagePercentage(auth.indexesUsed, auth.indexLimit)}
                      label="Index Usage"
                      color={calculateUsagePercentage(auth.indexesUsed, auth.indexLimit) > 90 ? 'yellow' : 'green'}
                      showPercentage={true}
                    />
                  </Box>
                  <Box marginTop={1}>
                    <InfoRow
                      label="Indexes"
                      value={`${auth.indexesUsed.toString()}/${auth.indexLimit.toString()}`}
                      color={auth.indexesUsed >= auth.indexLimit ? 'red' : 'green'}
                    />
                  </Box>
                  <Box marginTop={1}>
                    <Text dimColor>Auth: </Text>
                    <Text dimColor>{auth.address.slice(0, 8)}...{auth.address.slice(-8)}</Text>
                  </Box>
                </Box>
              ))}
            </Box>
          </Card>
        )}

        {inactiveAuths.length > 0 && (
          <Card title={`Inactive Authorizations (${inactiveAuths.length})`} borderColor="gray">
            <Box flexDirection="column">
              {inactiveAuths.map((auth, idx) => (
                <Box key={idx} flexDirection="column" marginBottom={idx < inactiveAuths.length - 1 ? 1 : 0}>
                  <Box alignItems="center" gap={2}>
                    <Text>{getStatusIcon(auth.status)}</Text>
                    <Text bold dimColor>{auth.agentName}</Text>
                    <StatusBadge status="error" text={auth.status.toUpperCase()} />
                  </Box>
                  <Box marginTop={1}>
                    <InfoRow
                      label="Status"
                      value={auth.status}
                      color={getStatusColor(auth.status)}
                    />
                  </Box>
                  {auth.status === 'exhausted' && (
                    <Box>
                      <InfoRow
                        label="Usage"
                        value="100% (Limit reached)"
                        color="yellow"
                      />
                    </Box>
                  )}
                </Box>
              ))}
            </Box>
          </Card>
        )}
      </Box>
    )
  }

  const renderStats = () => {
    const totalActive = authorizations.filter(a => a.status === 'active').length
    const totalIndexLimit = authorizations.reduce((sum, a) => sum + Number(a.indexLimit), 0)
    const totalIndexUsed = authorizations.reduce((sum, a) => sum + Number(a.indexesUsed), 0)
    const avgUsagePercent = totalIndexLimit > 0 ? (totalIndexUsed / totalIndexLimit) * 100 : 0
    const expiringsSoon = authorizations.filter(a =>
      a.status === 'active' && a.expiresAt - Date.now() < (7 * 24 * 60 * 60 * 1000)
    ).length

    return (
      <Card title="Authorization Stats" borderColor="magenta">
        <Box flexDirection="column">
          <InfoRow label="Total Authorizations" value={authorizations.length.toString()} color="cyan" />
          <InfoRow label="Active" value={totalActive.toString()} color="green" />
          <InfoRow label="Expiring Soon (<7d)" value={expiringsSoon.toString()} color={expiringsSoon > 0 ? 'yellow' : 'gray'} />
          <InfoRow label="Avg Usage" value={`${avgUsagePercent.toFixed(1)}%`} color={avgUsagePercent > 80 ? 'yellow' : 'green'} />
          <Box marginTop={1}>
            <Text dimColor>Trustless reputation updates with limits</Text>
          </Box>
        </Box>
      </Card>
    )
  }

  const renderActions = () => {
    return (
      <Card title="Keyboard Controls" borderColor="blue">
        <Box flexDirection="column">
          <Text>
            <Text color="yellow">[Q]</Text> <Text dimColor>or </Text>
            <Text color="yellow">Esc</Text> <Text dimColor>- Exit</Text>
          </Text>
          <Text>
            <Text color="cyan">[R]</Text> <Text dimColor>- Refresh authorization list</Text>
          </Text>
          <Text>
            <Text color="green">[C]</Text> <Text dimColor>- Create new authorization</Text>
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
        <Text bold color="yellow">❓ Pre-Authorization Help</Text>
        <Box marginTop={1} flexDirection="column">
          <Text dimColor>• Pre-authorizations grant limited permissions to update agent reputation</Text>
          <Text dimColor>• Set index limits to cap total reputation updates (prevents spam)</Text>
          <Text dimColor>• Set expiration dates for time-bound permissions</Text>
          <Text dimColor>• Authorized sources can update reputation without wallet signatures</Text>
          <Text dimColor>• Perfect for x402 facilitators, reputation oracles, and trusted services</Text>
          <Text dimColor>• Use CLI commands: ghost auth create, revoke, list, verify</Text>
          <Box marginTop={1}>
            <Text dimColor>Data refreshes automatically every 10 seconds</Text>
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
            <Text> Loading authorizations...</Text>
          </Box>
        </Box>
      )
    }

    if (stage === 'error') {
      return (
        <Box flexDirection="column" gap={1}>
          <StatusBadge status="error" text="Error loading authorizations" />
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

    if (stage === 'creating') {
      return (
        <Box flexDirection="column" gap={1}>
          <Box>
            <Spinner type="dots" />
            <Text> Creating authorization...</Text>
          </Box>
          <Alert
            type="info"
            message="Use 'ghost auth create' command for full creation workflow"
            showBorder={false}
          />
        </Box>
      )
    }

    // Ready state - show full dashboard
    return (
      <Box flexDirection="column">
        {/* User info */}
        {userAddress && (
          <Box marginBottom={1}>
            <Text dimColor>User: </Text>
            <Text bold color="cyan">{userAddress.slice(0, 8)}...{userAddress.slice(-8)}</Text>
          </Box>
        )}

        {/* Last updated timestamp */}
        <Box marginBottom={1}>
          <Text dimColor>
            Last updated: {lastUpdate.toLocaleTimeString()}
            {autoRefresh && <Text color="green"> • Auto-refresh enabled</Text>}
          </Text>
        </Box>

        {/* Main dashboard */}
        <Box flexDirection="column" gap={1}>
          {renderAuthorizationsList()}

          {authorizations.length > 0 && (
            <Box gap={1}>
              {renderStats()}
            </Box>
          )}

          {renderActions()}
          {helpVisible && renderHelp()}
        </Box>

        {/* Footer info */}
        <Box marginTop={1}>
          <Alert
            type="info"
            message="Use CLI commands for full functionality: ghost auth create, revoke, list, verify"
            showBorder={false}
          />
        </Box>

        <Box marginTop={1}>
          <Text bold color="greenBright">Create Authorizations - Limit Access - Enable Trustless Updates</Text>
        </Box>
      </Box>
    )
  }

  return (
    <Layout title="🔑 Pre-Authorization Dashboard" showFooter={false}>
      {renderContent()}
    </Layout>
  )
}
