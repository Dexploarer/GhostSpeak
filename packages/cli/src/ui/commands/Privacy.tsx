/**
 * Interactive Privacy Settings Command (Ink UI)
 * Configure Ghost Score visibility and privacy modes
 */

import React, { useState, useEffect } from 'react'
import { Box, Text, useInput, useApp } from 'ink'
import SelectInput from 'ink-select-input'
import { Layout } from '../components/Layout.js'
import { Card } from '../components/Card.js'
import { Table } from '../components/Table.js'
import { Alert } from '../components/Alert.js'
import { Spinner } from '../components/Spinner.js'
import { Badge } from '../components/Badge.js'
import { createSolanaRpc } from '@solana/rpc'
import { address } from '@solana/addresses'
import type { Address } from '@solana/addresses'
import { createKeyPairSignerFromBytes } from '@solana/signers'
import { readFileSync } from 'fs'

interface PrivacyProps {
  agent?: string
}

type PrivacyMode = 'public' | 'selective' | 'private' | 'anonymous'
type Stage = 'loading' | 'select' | 'preview' | 'applying' | 'success' | 'error'

interface PrivacyModeConfig {
  name: string
  description: string
  scoreVisible: boolean
  tierVisible: boolean
  metricsVisible: boolean
  emoji: string
  recommendedFor: string[]
}

const PRIVACY_MODES: Record<PrivacyMode, PrivacyModeConfig> = {
  public: {
    name: 'Public',
    description: 'Full transparency - All reputation data visible',
    scoreVisible: true,
    tierVisible: true,
    metricsVisible: true,
    emoji: '🌐',
    recommendedFor: ['Maximum transparency', 'Building trust quickly', 'Top-tier agents'],
  },
  selective: {
    name: 'Selective',
    description: 'Balanced privacy - Show tier, hide exact score',
    scoreVisible: false,
    tierVisible: true,
    metricsVisible: false,
    emoji: '🔍',
    recommendedFor: ['Balanced privacy', 'Most common choice', 'Show credibility without details'],
  },
  private: {
    name: 'Private',
    description: 'Enhanced privacy - Verified status only',
    scoreVisible: false,
    tierVisible: false,
    metricsVisible: false,
    emoji: '🔒',
    recommendedFor: ['Enhanced privacy', 'Verified status only', 'Sensitive use cases'],
  },
  anonymous: {
    name: 'Anonymous',
    description: 'Maximum privacy - Hide all reputation data',
    scoreVisible: false,
    tierVisible: false,
    metricsVisible: false,
    emoji: '👤',
    recommendedFor: ['Maximum privacy', 'Complete anonymity', 'High-security requirements'],
  },
}

export const Privacy: React.FC<PrivacyProps> = ({ agent }) => {
  const { exit } = useApp()
  const [stage, setStage] = useState<Stage>('loading')
  const [agentAddress, setAgentAddress] = useState<string>('')
  const [agentName, setAgentName] = useState<string>('')
  const [currentMode, setCurrentMode] = useState<PrivacyMode>('selective')
  const [selectedMode, setSelectedMode] = useState<PrivacyMode>('selective')
  const [showPreview, setShowPreview] = useState(false)
  const [error, setError] = useState<string>('')
  const [showCustomize, setShowCustomize] = useState(false)

  useEffect(() => {
    loadAgentData()
  }, [])

  const loadAgentData = async () => {
    try {
      setStage('loading')

      // Load wallet
      const walletPath = process.env.HOME + '/.config/solana/id.json'
      const secretKeyBytes = new Uint8Array(JSON.parse(readFileSync(walletPath, 'utf-8')))
      const wallet = await createKeyPairSignerFromBytes(secretKeyBytes)

      const agentAddr = agent ? address(agent) : wallet.address
      setAgentAddress(agentAddr)

      // Connect to network
      const rpc = createSolanaRpc('https://api.devnet.solana.com')

      // Mock agent data (SDK integration pending)
      setAgentName('Ghost Agent')
      setCurrentMode('selective')
      setSelectedMode('selective')
      setStage('select')
    } catch (err: any) {
      setError(err.message)
      setStage('error')
    }
  }

  const applyPrivacyMode = async (mode: PrivacyMode) => {
    setStage('applying')
    setSelectedMode(mode)

    // Simulate API call (SDK integration pending)
    await new Promise((resolve) => setTimeout(resolve, 1500))

    setCurrentMode(mode)
    setStage('success')

    // Auto-exit after 2 seconds
    setTimeout(() => exit(), 2000)
  }

  // Keyboard controls
  useInput((input, key) => {
    if (input === 'q' && stage !== 'applying') {
      exit()
    }

    if (input === 'c' && stage === 'select') {
      setShowCustomize(!showCustomize)
    }

    if (input === 'p' && stage === 'select') {
      setShowPreview(!showPreview)
    }

    if (key.escape && stage !== 'applying') {
      if (showPreview || showCustomize) {
        setShowPreview(false)
        setShowCustomize(false)
      } else {
        exit()
      }
    }
  })

  const renderStage = () => {
    switch (stage) {
      case 'loading':
        return (
          <Box flexDirection="column" gap={1}>
            <Spinner label="Loading privacy settings..." />
            {agentAddress && (
              <Box marginTop={1}>
                <Text dimColor>Agent: {agentAddress}</Text>
              </Box>
            )}
          </Box>
        )

      case 'select':
        return (
          <Box flexDirection="column" gap={1}>
            {/* Current Settings Card */}
            <Card title="Current Privacy Settings" borderColor="cyan">
              <Box flexDirection="column" gap={1}>
                <Box>
                  <Text dimColor>Agent: </Text>
                  <Text color="cyan">{agentName}</Text>
                </Box>
                <Box>
                  <Text dimColor>Address: </Text>
                  <Text>{agentAddress.toString().slice(0, 20)}...</Text>
                </Box>
                <Box marginTop={1}>
                  <Text dimColor>Mode: </Text>
                  <Text>
                    {PRIVACY_MODES[currentMode].emoji} {PRIVACY_MODES[currentMode].name}
                  </Text>
                </Box>
              </Box>
            </Card>

            {/* Current Visibility Table */}
            <Card title="Current Visibility" borderColor="blue" marginTop={1}>
              <Box flexDirection="column" gap={1}>
                <Box>
                  <Text dimColor>Ghost Score: </Text>
                  <Text color={PRIVACY_MODES[currentMode].scoreVisible ? 'green' : 'red'}>
                    {PRIVACY_MODES[currentMode].scoreVisible ? '✓ Visible' : '✗ Hidden'}
                  </Text>
                </Box>
                <Box>
                  <Text dimColor>Tier Badge: </Text>
                  <Text color={PRIVACY_MODES[currentMode].tierVisible ? 'green' : 'red'}>
                    {PRIVACY_MODES[currentMode].tierVisible ? '✓ Visible' : '✗ Hidden'}
                  </Text>
                </Box>
                <Box>
                  <Text dimColor>Detailed Metrics: </Text>
                  <Text color={PRIVACY_MODES[currentMode].metricsVisible ? 'green' : 'red'}>
                    {PRIVACY_MODES[currentMode].metricsVisible ? '✓ Visible' : '✗ Hidden'}
                  </Text>
                </Box>
              </Box>
            </Card>

            {/* Privacy Mode Selector */}
            <Card title="Select Privacy Mode" borderColor="yellow" marginTop={1}>
              <SelectInput
                items={Object.entries(PRIVACY_MODES).map(([key, config]) => ({
                  label: `${config.emoji} ${config.name} - ${config.description}`,
                  value: key as PrivacyMode,
                }))}
                onSelect={(item) => {
                  setSelectedMode(item.value)
                  setShowPreview(true)
                }}
              />
            </Card>

            {/* Preview Card */}
            {showPreview && (
              <Card title={`${PRIVACY_MODES[selectedMode].emoji} ${PRIVACY_MODES[selectedMode].name} Mode Preview`} borderColor="magenta" marginTop={1}>
                <Box flexDirection="column" gap={1}>
                  <Text>{PRIVACY_MODES[selectedMode].description}</Text>

                  <Box marginTop={1} flexDirection="column">
                    <Text bold color="yellow">
                      What Others Will See:
                    </Text>
                    <Box marginLeft={2} flexDirection="column">
                      <Text>
                        {PRIVACY_MODES[selectedMode].scoreVisible ? '✓' : '✗'} Exact Ghost Score
                      </Text>
                      <Text>
                        {PRIVACY_MODES[selectedMode].tierVisible ? '✓' : '✗'} Tier Badge
                      </Text>
                      <Text>
                        {PRIVACY_MODES[selectedMode].metricsVisible ? '✓' : '✗'} Detailed Metrics
                      </Text>
                    </Box>
                  </Box>

                  <Box marginTop={1} flexDirection="column">
                    <Text bold color="cyan">
                      Recommended For:
                    </Text>
                    {PRIVACY_MODES[selectedMode].recommendedFor.map((rec, i) => (
                      <Text key={i} dimColor>
                        • {rec}
                      </Text>
                    ))}
                  </Box>

                  <Box marginTop={1}>
                    <Alert
                      type="info"
                      message={`Press Enter to apply ${PRIVACY_MODES[selectedMode].name} mode, or select a different option.`}
                      showBorder={false}
                    />
                  </Box>

                  <Box marginTop={1}>
                    <Text dimColor>
                      Press <Text color="yellow">Enter</Text> to apply • <Text color="yellow">Esc</Text> to cancel
                    </Text>
                  </Box>
                </Box>
              </Card>
            )}

            {/* Keyboard Shortcuts */}
            <Box marginTop={1} flexDirection="column">
              <Text dimColor>{'─'.repeat(60)}</Text>
              <Box marginTop={1} gap={2}>
                <Text dimColor>
                  <Text color="yellow">↑↓</Text> Navigate
                </Text>
                <Text dimColor>
                  <Text color="yellow">Enter</Text> Apply
                </Text>
                <Text dimColor>
                  <Text color="yellow">p</Text> Preview
                </Text>
                <Text dimColor>
                  <Text color="yellow">c</Text> Customize
                </Text>
                <Text dimColor>
                  <Text color="yellow">q</Text> Exit
                </Text>
              </Box>
            </Box>
          </Box>
        )

      case 'applying':
        return (
          <Box flexDirection="column" gap={1}>
            <Spinner label={`Applying ${PRIVACY_MODES[selectedMode].name} mode...`} />
            <Box marginTop={1}>
              <Text dimColor>Updating privacy settings on blockchain...</Text>
            </Box>
            <Alert
              type="warning"
              message="SDK integration pending. Privacy settings update is simulated."
              showBorder={true}
            />
          </Box>
        )

      case 'success':
        return (
          <Box flexDirection="column" gap={1}>
            <Spinner state="success" label="Privacy mode updated successfully!" />
            <Card title="New Privacy Settings" borderColor="green" marginTop={1}>
              <Box flexDirection="column" gap={1}>
                <Box>
                  <Text dimColor>Mode: </Text>
                  <Text color="green">
                    {PRIVACY_MODES[currentMode].emoji} {PRIVACY_MODES[currentMode].name}
                  </Text>
                </Box>
                <Box>
                  <Text dimColor>Ghost Score: </Text>
                  <Text color={PRIVACY_MODES[currentMode].scoreVisible ? 'green' : 'red'}>
                    {PRIVACY_MODES[currentMode].scoreVisible ? 'Visible' : 'Hidden'}
                  </Text>
                </Box>
                <Box>
                  <Text dimColor>Tier Badge: </Text>
                  <Text color={PRIVACY_MODES[currentMode].tierVisible ? 'green' : 'red'}>
                    {PRIVACY_MODES[currentMode].tierVisible ? 'Visible' : 'Hidden'}
                  </Text>
                </Box>
                <Box>
                  <Text dimColor>Metrics: </Text>
                  <Text color={PRIVACY_MODES[currentMode].metricsVisible ? 'green' : 'red'}>
                    {PRIVACY_MODES[currentMode].metricsVisible ? 'Visible' : 'Hidden'}
                  </Text>
                </Box>
              </Box>
            </Card>
            <Box marginTop={1}>
              <Text color="cyan">View changes at: https://ghostspeak.io/dashboard/privacy</Text>
            </Box>
          </Box>
        )

      case 'error':
        return (
          <Box flexDirection="column" gap={1}>
            <Spinner state="error" label="Failed to load privacy settings" />
            <Alert type="error" message={error} />
          </Box>
        )
    }
  }

  return (
    <Layout
      title={`${PRIVACY_MODES[currentMode].emoji} Privacy Settings`}
      showFooter={stage === 'select'}
    >
      {renderStage()}
    </Layout>
  )
}
