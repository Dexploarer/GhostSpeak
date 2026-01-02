/**
 * Interactive Multisig Dashboard (Ink UI)
 * Beautiful real-time interface for managing multisignature wallets
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

export interface MultisigProps {
  multisigAddress?: string
  autoRefresh?: boolean
}

type MultisigStage = 'loading' | 'ready' | 'creating' | 'proposing' | 'approving' | 'executing' | 'error' | 'multisig_detail' | 'proposal_detail'

interface MultisigWallet {
  address: Address
  name: string
  threshold: number
  signers: Address[]
  pendingProposals: number
  executedProposals: number
  createdAt: number
}

interface Proposal {
  address: Address
  multisigAddress: Address
  title: string
  description: string
  proposer: Address
  approvals: number
  threshold: number
  status: 'pending' | 'approved' | 'executed' | 'rejected'
  createdAt: number
  targetProgram?: Address
}

export const Multisig: React.FC<MultisigProps> = ({ multisigAddress, autoRefresh = true }) => {
  const { exit } = useApp()
  const [stage, setStage] = useState<MultisigStage>('loading')
  const [multisigs, setMultisigs] = useState<MultisigWallet[]>([])
  const [proposals, setProposals] = useState<Proposal[]>([])
  const [selectedMultisig, setSelectedMultisig] = useState<MultisigWallet | null>(null)
  const [selectedProposal, setSelectedProposal] = useState<Proposal | null>(null)
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

    if (stage === 'multisig_detail' || stage === 'proposal_detail') {
      if (input === 'b') {
        setStage('ready')
        setSelectedMultisig(null)
        setSelectedProposal(null)
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
    loadMultisigs()
  }, [])

  const loadMultisigs = async () => {
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

      // Load multisigs where user is a signer using actual SDK
      const userMultisigs = await safeClient.governance.listMultisigs({ creator: wallet.address })
      const multisigWallets: MultisigWallet[] = userMultisigs.map((m: any) => ({
        address: m.address,
        name: m.name,
        threshold: m.threshold,
        signers: m.members,
        pendingProposals: m.pendingProposals || 0,
        executedProposals: 0, // Not tracked in current SDK
        createdAt: Date.now() // SDK doesn't store creation timestamp yet
      }))

      // Load proposals for all multisigs
      const allProposals: Proposal[] = []
      for (const multisig of multisigWallets) {
        const proposals = await safeClient.governance.listProposals({ multisigAddress: multisig.address })
        allProposals.push(...proposals.map((p: any) => ({
          address: p.address,
          multisigAddress: multisig.address,
          title: p.title,
          description: p.description,
          proposer: p.creator,
          approvals: p.votesFor || 0,
          threshold: p.threshold,
          status: p.status,
          createdAt: Number(p.deadline) || Date.now()
        })))
      }

      setMultisigs(multisigWallets)
      setProposals(allProposals)
      setStage('ready')
      setLastUpdate(new Date())

    } catch (err: any) {
      setError(err.message || 'Failed to load multisig wallets')
      setStage('error')
    }
  }

  const refreshData = async (silent = false) => {
    if (!silent) {
      setStage('loading')
    }

    try {
      // Reload multisigs and proposals from SDK
      await loadMultisigs()

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
      'pending': 'yellow',
      'approved': 'green',
      'executed': 'gray',
      'rejected': 'red',
    }
    return colors[status] || 'gray'
  }

  const getStatusBadge = (status: string): React.ReactNode => {
    return <StatusBadge status={status as any} text={status.toUpperCase()} />
  }

  const renderMultisigsList = () => {
    if (multisigs.length === 0) {
      return (
        <Box flexDirection="column" gap={1}>
          <Alert
            type="info"
            title="No Multisig Wallets Found"
            message="You haven't created or joined any multisig wallets yet. Press C to create your first multisig!"
          />
          <Box marginTop={1}>
            <Text dimColor>What is a Multisig?</Text>
          </Box>
          <Box marginTop={1} flexDirection="column">
            <Text dimColor>• Multisig wallets require multiple signatures for transactions</Text>
            <Text dimColor>• Set threshold (e.g., 2-of-3) for approval requirements</Text>
            <Text dimColor>• Create proposals for agent actions that require approval</Text>
            <Text dimColor>• Enhanced security for high-value agent operations</Text>
          </Box>
        </Box>
      )
    }

    return (
      <Box flexDirection="column" gap={1}>
        <Card title={`Your Multisig Wallets (${multisigs.length})`} borderColor="greenBright">
          <Box flexDirection="column">
            {multisigs.map((multisig, idx) => (
              <Box key={idx} flexDirection="column" marginBottom={idx < multisigs.length - 1 ? 1 : 0}>
                <Box alignItems="center" gap={2}>
                  <Text>🔐</Text>
                  <Text bold color="cyan">{multisig.name}</Text>
                  {multisig.pendingProposals > 0 && (
                    <Badge variant="newcomer" />
                  )}
                </Box>
                <Box marginTop={1}>
                  <InfoRow
                    label="Threshold"
                    value={`${multisig.threshold}/${multisig.signers.length} signatures`}
                    color="yellow"
                  />
                </Box>
                <Box>
                  <InfoRow
                    label="Pending Proposals"
                    value={multisig.pendingProposals.toString()}
                    color={multisig.pendingProposals > 0 ? 'yellow' : 'gray'}
                  />
                </Box>
                <Box>
                  <InfoRow
                    label="Executed Proposals"
                    value={multisig.executedProposals.toString()}
                    color="green"
                  />
                </Box>
                <Box marginTop={1}>
                  <ProgressBar
                    value={(multisig.threshold / multisig.signers.length) * 100}
                    label="Approval Threshold"
                    color="cyan"
                    showPercentage={false}
                  />
                </Box>
                <Box marginTop={1}>
                  <Text dimColor>Address: </Text>
                  <Text dimColor>{multisig.address.slice(0, 8)}...{multisig.address.slice(-8)}</Text>
                </Box>
              </Box>
            ))}
          </Box>
        </Card>
      </Box>
    )
  }

  const renderProposals = () => {
    if (proposals.length === 0) {
      return null
    }

    const pendingProposals = proposals.filter(p => p.status === 'pending')
    const approvedProposals = proposals.filter(p => p.status === 'approved')

    return (
      <Box flexDirection="column" gap={1}>
        {pendingProposals.length > 0 && (
          <Card title={`Pending Proposals (${pendingProposals.length})`} borderColor="yellow">
            <Box flexDirection="column">
              {pendingProposals.map((proposal, idx) => (
                <Box key={idx} flexDirection="column" marginBottom={idx < pendingProposals.length - 1 ? 1 : 0}>
                  <Box alignItems="center" gap={2}>
                    <Text>📋</Text>
                    <Text bold color="yellow">{proposal.title}</Text>
                  </Box>
                  <Box marginTop={1}>
                    <Text dimColor>{proposal.description}</Text>
                  </Box>
                  <Box marginTop={1}>
                    <ProgressBar
                      value={(proposal.approvals / proposal.threshold) * 100}
                      label="Approval Progress"
                      color="yellow"
                      showPercentage={true}
                    />
                  </Box>
                  <Box marginTop={1}>
                    <InfoRow
                      label="Approvals"
                      value={`${proposal.approvals}/${proposal.threshold}`}
                      color={proposal.approvals >= proposal.threshold ? 'green' : 'yellow'}
                    />
                  </Box>
                  <Box>
                    <InfoRow
                      label="Created"
                      value={new Date(proposal.createdAt).toLocaleDateString()}
                    />
                  </Box>
                </Box>
              ))}
            </Box>
          </Card>
        )}

        {approvedProposals.length > 0 && (
          <Card title={`Ready to Execute (${approvedProposals.length})`} borderColor="green">
            <Box flexDirection="column">
              {approvedProposals.map((proposal, idx) => (
                <Box key={idx} flexDirection="column" marginBottom={idx < approvedProposals.length - 1 ? 1 : 0}>
                  <Box alignItems="center" gap={2}>
                    <Text>✅</Text>
                    <Text bold color="green">{proposal.title}</Text>
                  </Box>
                  <Box marginTop={1}>
                    <Text dimColor>{proposal.description}</Text>
                  </Box>
                  <Box marginTop={1}>
                    <InfoRow
                      label="Status"
                      value="Ready for execution"
                      color="green"
                    />
                  </Box>
                </Box>
              ))}
            </Box>
          </Card>
        )}
      </Box>
    )
  }

  const renderStats = () => {
    const totalSigners = new Set(multisigs.flatMap(m => m.signers)).size
    const totalProposals = multisigs.reduce((sum, m) => sum + m.pendingProposals + m.executedProposals, 0)
    const avgThreshold = multisigs.reduce((sum, m) => sum + (m.threshold / m.signers.length), 0) / multisigs.length

    return (
      <Card title="Multisig Network Stats" borderColor="magenta">
        <Box flexDirection="column">
          <InfoRow label="Total Multisigs" value={multisigs.length.toString()} color="cyan" />
          <InfoRow label="Unique Signers" value={totalSigners.toString()} color="green" />
          <InfoRow label="Total Proposals" value={totalProposals.toString()} color="yellow" />
          <InfoRow label="Avg Threshold" value={`${(avgThreshold * 100).toFixed(0)}%`} color="magenta" />
          <Box marginTop={1}>
            <Text dimColor>Shared control for enhanced security</Text>
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
            <Text color="cyan">[R]</Text> <Text dimColor>- Refresh multisig list</Text>
          </Text>
          <Text>
            <Text color="green">[C]</Text> <Text dimColor>- Create new multisig</Text>
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
        <Text bold color="yellow">❓ Multisig Help</Text>
        <Box marginTop={1} flexDirection="column">
          <Text dimColor>• Multisig wallets require multiple signatures for transactions</Text>
          <Text dimColor>• Set threshold (e.g., 2-of-3 means 2 signatures required out of 3 total)</Text>
          <Text dimColor>• Create proposals for actions that need group approval</Text>
          <Text dimColor>• Signers can approve proposals until threshold is met</Text>
          <Text dimColor>• Use CLI commands: ghost multisig create, propose, approve, execute</Text>
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
            <Text> Loading multisig wallets...</Text>
          </Box>
        </Box>
      )
    }

    if (stage === 'error') {
      return (
        <Box flexDirection="column" gap={1}>
          <StatusBadge status="error" text="Error loading multisig wallets" />
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
            <Text> Creating multisig wallet...</Text>
          </Box>
          <Alert
            type="info"
            message="Use 'ghost multisig create' command for full creation workflow"
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
          {renderMultisigsList()}

          {multisigs.length > 0 && renderProposals()}

          {multisigs.length > 0 && (
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
            message="Use CLI commands for full functionality: ghost multisig create, propose, approve, execute"
            showBorder={false}
          />
        </Box>

        <Box marginTop={1}>
          <Text bold color="greenBright">Create Multisigs - Share Control - Enhance Security</Text>
        </Box>
      </Box>
    )
  }

  return (
    <Layout title="🔐 Multisig Wallet Dashboard" showFooter={false}>
      {renderContent()}
    </Layout>
  )
}
