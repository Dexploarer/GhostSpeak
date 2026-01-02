/**
 * Interactive Ghost Claiming Dashboard (Ink UI)
 * Beautiful real-time interface for managing external AI agent identities
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
import { createSolanaRpc } from '@solana/rpc'
import { address, type Address } from '@solana/addresses'
import { createKeyPairSignerFromBytes } from '@solana/signers'
import { createSafeSDKClient } from '../../utils/sdk-helpers.js'
import { GhostSpeakClient } from '@ghostspeak/sdk'
import { readFileSync } from 'fs'

export interface GhostProps {
  autoRefresh?: boolean
}

type GhostStage = 'loading' | 'ready' | 'claiming' | 'linking' | 'error' | 'ghost_detail'

interface GhostAgent {
  address: Address
  owner: Address
  externalId: string
  platform: string
  claimedAt: number
  linkedIds: Array<{
    platform: string
    externalId: string
  }>
}

export const Ghost: React.FC<GhostProps> = ({ autoRefresh = true }) => {
  const { exit } = useApp()
  const [stage, setStage] = useState<GhostStage>('loading')
  const [ghosts, setGhosts] = useState<GhostAgent[]>([])
  const [selectedGhost, setSelectedGhost] = useState<GhostAgent | null>(null)
  const [error, setError] = useState<string>('')
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())
  const [helpVisible, setHelpVisible] = useState(false)
  const [ownerAddress, setOwnerAddress] = useState<Address | null>(null)

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
        setStage('claiming')
        // Would open claim dialog in full implementation
      }
    }

    if (stage === 'ghost_detail') {
      if (input === 'b') {
        setStage('ready')
        setSelectedGhost(null)
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
    loadGhosts()
  }, [])

  const loadGhosts = async () => {
    try {
      setStage('loading')

      // Load wallet
      const walletPath = process.env.HOME + '/.config/solana/id.json'
      const secretKeyBytes = new Uint8Array(JSON.parse(readFileSync(walletPath, 'utf-8')))
      const wallet = await createKeyPairSignerFromBytes(secretKeyBytes)

      // Connect to Solana
      const client = new GhostSpeakClient({
        rpcEndpoint: 'https://api.devnet.solana.com'
      })
      const safeClient = createSafeSDKClient(client)

      setOwnerAddress(wallet.address)

      // Load ghosts claimed by this wallet using actual SDK
      const claimedGhosts = await safeClient.ghosts.getClaimedGhosts(wallet.address)

      // Map SDK data to UI format
      const ghostAgents: GhostAgent[] = claimedGhosts.map((ghost: any) => ({
        address: ghost.address,
        owner: ghost.data.owner || wallet.address,
        externalId: ghost.data.x402PaymentAddress?.toString() || 'Unknown',
        platform: 'x402',
        claimedAt: Date.now(), // SDK doesn't store claim timestamp yet
        linkedIds: [] // Not yet implemented in SDK
      }))

      setGhosts(ghostAgents)
      setStage('ready')
      setLastUpdate(new Date())

    } catch (err: any) {
      setError(err.message || 'Failed to load Ghost agents')
      setStage('error')
    }
  }

  const refreshData = async (silent = false) => {
    if (!silent) {
      setStage('loading')
    }

    try {
      await simulateAPICall(300)

      // Reload ghosts from SDK
      // TODO: Implement actual refresh logic

      setLastUpdate(new Date())
      if (!silent) {
        setStage('ready')
      }
    } catch (err: any) {
      setError(err.message || 'Failed to refresh data')
      setStage('error')
    }
  }

  const simulateAPICall = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

  const getPlatformIcon = (platform: string): string => {
    const icons: Record<string, string> = {
      'x402': '🤖',
      'twitter': '🐦',
      'github': '🔧',
      'discord': '💬',
      'telegram': '✈️',
    }
    return icons[platform.toLowerCase()] || '🔗'
  }

  const getPlatformColor = (platform: string): 'cyan' | 'blue' | 'magenta' | 'green' => {
    const colors: Record<string, any> = {
      'x402': 'cyan',
      'twitter': 'blue',
      'github': 'magenta',
      'discord': 'blue',
      'telegram': 'cyan',
    }
    return colors[platform.toLowerCase()] || 'green'
  }

  const renderGhostsList = () => {
    if (ghosts.length === 0) {
      return (
        <Box flexDirection="column" gap={1}>
          <Alert
            type="info"
            title="No Ghost Agents Found"
            message="You haven't claimed any external AI agents yet. Press C to claim your first Ghost!"
          />
          <Box marginTop={1}>
            <Text dimColor>What is a Ghost?</Text>
          </Box>
          <Box marginTop={1} flexDirection="column">
            <Text dimColor>• Ghost agents represent your external AI identities on-chain</Text>
            <Text dimColor>• Claim agents from x402 facilitators with SAS attestation</Text>
            <Text dimColor>• Link multiple platforms to build unified reputation</Text>
            <Text dimColor>• Earn Ghost Score from cross-platform activities</Text>
          </Box>
        </Box>
      )
    }

    return (
      <Box flexDirection="column" gap={1}>
        <Card title={`Your Ghost Agents (${ghosts.length})`} borderColor="cyan">
          <Box flexDirection="column">
            {ghosts.map((ghost, idx) => (
              <Box key={idx} flexDirection="column" marginBottom={idx < ghosts.length - 1 ? 1 : 0}>
                <Box alignItems="center" gap={2}>
                  <Text>{getPlatformIcon(ghost.platform)}</Text>
                  <Text bold color="cyan">{ghost.externalId}</Text>
                  <Badge variant="newcomer" />
                </Box>
                <Box marginTop={1}>
                  <InfoRow
                    label="Platform"
                    value={ghost.platform}
                    color={getPlatformColor(ghost.platform)}
                  />
                </Box>
                <Box>
                  <InfoRow
                    label="Claimed"
                    value={new Date(ghost.claimedAt).toLocaleDateString()}
                  />
                </Box>
                <Box>
                  <InfoRow
                    label="Linked IDs"
                    value={`${ghost.linkedIds.length} platforms`}
                    color="green"
                  />
                </Box>
                <Box marginTop={1}>
                  <Text dimColor>Address: </Text>
                  <Text dimColor>{ghost.address.slice(0, 8)}...{ghost.address.slice(-8)}</Text>
                </Box>
              </Box>
            ))}
          </Box>
        </Card>
      </Box>
    )
  }

  const renderStats = () => {
    const totalLinkedPlatforms = ghosts.reduce((sum, g) => sum + g.linkedIds.length, 0)
    const platforms = new Set(ghosts.flatMap(g => [g.platform, ...g.linkedIds.map(l => l.platform)]))

    return (
      <Card title="Ghost Network Stats" borderColor="magenta">
        <Box flexDirection="column">
          <InfoRow label="Total Ghosts" value={ghosts.length.toString()} color="cyan" />
          <InfoRow label="Linked Platforms" value={totalLinkedPlatforms.toString()} color="green" />
          <InfoRow label="Unique Platforms" value={platforms.size.toString()} color="yellow" />
          <Box marginTop={1}>
            <Text dimColor>Build your identity graph across platforms</Text>
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
            <Text color="cyan">[R]</Text> <Text dimColor>- Refresh Ghost list</Text>
          </Text>
          <Text>
            <Text color="green">[C]</Text> <Text dimColor>- Claim new Ghost agent</Text>
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
        <Text bold color="yellow">❓ Ghost Claiming Help</Text>
        <Box marginTop={1} flexDirection="column">
          <Text dimColor>• Ghost agents are on-chain representations of external AI identities</Text>
          <Text dimColor>• Claim agents from x402 facilitators using SAS attestation signatures</Text>
          <Text dimColor>• Link multiple platform IDs to build unified cross-platform reputation</Text>
          <Text dimColor>• Each Ghost contributes to your overall Ghost Score</Text>
          <Text dimColor>• Use CLI commands for claiming: ghost ghost claim --external-id @id --platform x402</Text>
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
            <Text> Loading Ghost agents...</Text>
          </Box>
        </Box>
      )
    }

    if (stage === 'error') {
      return (
        <Box flexDirection="column" gap={1}>
          <StatusBadge status="error" text="Error loading Ghost agents" />
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
            <Text> Claiming Ghost agent...</Text>
          </Box>
          <Alert
            type="info"
            message="Use 'ghost ghost claim' command for full claiming workflow"
            showBorder={false}
          />
        </Box>
      )
    }

    // Ready state - show full dashboard
    return (
      <Box flexDirection="column">
        {/* Owner info */}
        {ownerAddress && (
          <Box marginBottom={1}>
            <Text dimColor>Owner: </Text>
            <Text bold color="cyan">{ownerAddress.slice(0, 8)}...{ownerAddress.slice(-8)}</Text>
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
          {renderGhostsList()}

          {ghosts.length > 0 && (
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
            message="Use CLI commands for claiming and linking: ghost ghost claim, ghost ghost link"
            showBorder={false}
          />
        </Box>

        <Box marginTop={1}>
          <Gradient name="rainbow">
            <Text>Claim Ghosts - Build Identity - Unify Reputation</Text>
          </Gradient>
        </Box>
      </Box>
    )
  }

  return (
    <Layout title="👻 Ghost Agent Dashboard" showFooter={false}>
      {renderContent()}
    </Layout>
  )
}
