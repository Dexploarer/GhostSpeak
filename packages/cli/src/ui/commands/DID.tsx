/**
 * Interactive DID Management Command (Ink UI)
 * Create, resolve, update, and manage W3C Decentralized Identifiers
 */

import React, { useState, useEffect } from 'react'
import { Box, Text, useInput, useApp } from 'ink'
import SelectInput from 'ink-select-input'
import TextInput from 'ink-text-input'
import { Layout } from '../components/Layout.js'
import { Card } from '../components/Card.js'
import { Table } from '../components/Table.js'
import { Alert } from '../components/Alert.js'
import { Spinner } from '../components/Spinner.js'
import { Badge } from '../components/Badge.js'
import { createCustomClient } from '../../core/solana-client.js'
import { address } from '@solana/addresses'
import type { Address } from '@solana/addresses'
import { createKeyPairSignerFromBytes } from '@solana/signers'
import { readFileSync } from 'fs'

interface DIDProps {
  agent?: string
  did?: string // Optional DID to resolve
}

type Stage =
  | 'loading'
  | 'overview'
  | 'create_wizard'
  | 'create_step1'
  | 'create_step2'
  | 'create_step3'
  | 'create_confirm'
  | 'creating'
  | 'resolving'
  | 'resolved'
  | 'update_menu'
  | 'updating'
  | 'deactivate_confirm'
  | 'deactivating'
  | 'success'
  | 'error'

type VerificationMethodType = 'ed25519' | 'secp256k1' | 'rsa'
type ServiceType = 'messaging' | 'credential' | 'hub' | 'agent'

interface VerificationMethod {
  id: string
  type: string
  controller: string
  publicKeyMultibase?: string
}

interface Service {
  id: string
  type: string
  serviceEndpoint: string
  description?: string
}

interface DIDDocument {
  '@context': string[]
  id: string
  controller: string
  verificationMethod: VerificationMethod[]
  authentication: string[]
  assertionMethod: string[]
  service: Service[]
  metadata?: {
    agentName?: string
    created?: string
    updated?: string
  }
}

const VERIFICATION_METHOD_TYPES: Record<
  VerificationMethodType,
  { name: string; description: string; icon: string }
> = {
  ed25519: {
    name: 'Ed25519VerificationKey2020',
    description: 'Default Solana keypair signature verification',
    icon: '🔑',
  },
  secp256k1: {
    name: 'EcdsaSecp256k1VerificationKey2019',
    description: 'Ethereum-compatible signature verification',
    icon: '⚡',
  },
  rsa: {
    name: 'RsaVerificationKey2018',
    description: 'RSA signature verification',
    icon: '🔐',
  },
}

const SERVICE_TYPES: Record<
  ServiceType,
  { name: string; description: string; icon: string }
> = {
  messaging: {
    name: 'MessagingService',
    description: 'Decentralized messaging endpoint',
    icon: '💬',
  },
  credential: {
    name: 'CredentialRegistryService',
    description: 'Verifiable credential issuance',
    icon: '📜',
  },
  hub: {
    name: 'IdentityHub',
    description: 'Decentralized identity storage',
    icon: '🏠',
  },
  agent: {
    name: 'AgentService',
    description: 'AI agent interaction endpoint',
    icon: '🤖',
  },
}

export const DID: React.FC<DIDProps> = ({ agent, did: providedDid }) => {
  const { exit } = useApp()
  const [stage, setStage] = useState<Stage>('loading')
  const [agentAddress, setAgentAddress] = useState<string>('')
  const [agentName, setAgentName] = useState<string>('')
  const [didIdentifier, setDidIdentifier] = useState<string>('')
  const [didDocument, setDidDocument] = useState<DIDDocument | null>(null)
  const [error, setError] = useState<string>('')
  const [hasDID, setHasDID] = useState(false)

  // Wizard state
  const [selectedVerificationMethod, setSelectedVerificationMethod] =
    useState<VerificationMethodType>('ed25519')
  const [selectedServiceType, setSelectedServiceType] = useState<ServiceType>('agent')
  const [serviceEndpoint, setServiceEndpoint] = useState<string>('')
  const [addService, setAddService] = useState(false)
  const [showVerificationMethods, setShowVerificationMethods] = useState(false)
  const [showServices, setShowServices] = useState(false)

  useEffect(() => {
    loadDIDData()
  }, [])

  const loadDIDData = async () => {
    try {
      setStage('loading')

      // Load wallet
      const walletPath = process.env.HOME + '/.config/solana/id.json'
      const secretKeyBytes = new Uint8Array(JSON.parse(readFileSync(walletPath, 'utf-8')))
      const wallet = await createKeyPairSignerFromBytes(secretKeyBytes)

      const agentAddr = agent ? address(agent) : wallet.address
      setAgentAddress(agentAddr)

      // Connect to network using Gill
      const solanaClient = createCustomClient('https://api.devnet.solana.com')

      // Generate DID identifier
      const did = providedDid || `did:ghostspeak:devnet:${agentAddr.toString()}`
      setDidIdentifier(did)

      // Load agent data from SDK
      // Note: DID document queries not yet fully implemented in SDK
      // For now, check if agent exists and show create wizard
      setAgentName('Agent')

      // Check if DID exists (SDK integration pending)
      const didExists = false // No DIDs created yet - SDK integration pending
      setHasDID(didExists)

      if (didExists) {
        // DID document would be loaded from SDK here
        setStage('overview')
      } else {
        // Show create wizard for DID creation
        setStage('create_wizard')
      }
    } catch (err: any) {
      setError(err.message)
      setStage('error')
    }
  }

  const createDID = async () => {
    setStage('creating')

    // DID creation via SDK (integration pending)
    // Would call: await client.did.create({ ... })
    await new Promise((resolve) => setTimeout(resolve, 2000))

    // For now, show success message but don't create mock document
    // In production, this would create the DID on-chain and return the document
    setStage('success')

    setTimeout(() => setStage('overview'), 2000)
  }

  // Keyboard controls
  useInput((input, key) => {
    if (input === 'q' && stage !== 'creating' && stage !== 'updating') {
      exit()
    }

    if (input === 'n' && stage === 'overview' && !hasDID) {
      setStage('create_wizard')
    }

    if (input === 'r' && stage === 'overview') {
      setStage('resolving')
      loadDIDData()
    }

    if (input === 'v' && stage === 'overview') {
      setShowVerificationMethods(!showVerificationMethods)
    }

    if (input === 's' && stage === 'overview') {
      setShowServices(!showServices)
    }

    if (input === 'u' && stage === 'overview' && hasDID) {
      setStage('update_menu')
    }

    if (key.escape) {
      if (stage === 'update_menu' || stage === 'deactivate_confirm') {
        setStage('overview')
      } else if (stage !== 'creating' && stage !== 'updating') {
        exit()
      }
    }
  })

  const renderStage = () => {
    switch (stage) {
      case 'loading':
        return (
          <Box flexDirection="column" gap={1}>
            <Spinner label="Loading DID document..." />
          </Box>
        )

      case 'overview':
        if (!didDocument) {
          return (
            <Box flexDirection="column" gap={1}>
              <Alert
                type="info"
                title="DID Not Found"
                message="No DID document found for this agent. Create one to enable W3C-compliant decentralized identity."
                showBorder={true}
              />
              <Box marginTop={1}>
                <Text dimColor>What is a DID?</Text>
              </Box>
              <Box marginTop={1} flexDirection="column">
                <Text dimColor>• W3C Decentralized Identifier for agents</Text>
                <Text dimColor>• Self-sovereign identity without central authority</Text>
                <Text dimColor>• Cryptographic verification methods</Text>
                <Text dimColor>• Service endpoints for agent interactions</Text>
              </Box>
              <Box marginTop={2}>
                <Text dimColor>Press </Text>
                <Text color="yellow">N</Text>
                <Text dimColor> to create DID or </Text>
                <Text color="yellow">Q</Text>
                <Text dimColor> to exit</Text>
              </Box>
            </Box>
          )
        }

        return (
          <Box flexDirection="column" gap={1}>
            {/* DID Overview Card */}
            <Card title="🆔 DID Overview" borderColor="cyan">
              <Box flexDirection="column" gap={1}>
                <Box>
                  <Text dimColor>DID: </Text>
                  <Text color="cyan">{didDocument.id}</Text>
                </Box>
                <Box>
                  <Text dimColor>Agent: </Text>
                  <Text>{didDocument.metadata?.agentName || 'Unknown'}</Text>
                </Box>
                <Box>
                  <Text dimColor>Status: </Text>
                  <Badge variant="custom" text="ACTIVE" color="green" icon="✅" />
                </Box>
                <Box>
                  <Text dimColor>Created: </Text>
                  <Text>
                    {didDocument.metadata?.created
                      ? new Date(didDocument.metadata.created).toLocaleDateString()
                      : 'Unknown'}
                  </Text>
                </Box>
                <Box>
                  <Text dimColor>Network: </Text>
                  <Text>Devnet</Text>
                </Box>
              </Box>
            </Card>

            {/* Verification Methods */}
            <Card
              title={`🔑 Verification Methods (${didDocument.verificationMethod.length})`}
              borderColor="green"
              marginTop={1}
            >
              {didDocument.verificationMethod.map((vm, index) => (
                <Box key={index} flexDirection="column" marginBottom={1}>
                  <Box>
                    <Text dimColor>Type: </Text>
                    <Text color="green">{vm.type}</Text>
                  </Box>
                  <Box>
                    <Text dimColor>ID: </Text>
                    <Text>{vm.id}</Text>
                  </Box>
                  <Box>
                    <Text dimColor>Controller: </Text>
                    <Text>{vm.controller.slice(0, 40)}...</Text>
                  </Box>
                </Box>
              ))}
              {showVerificationMethods && (
                <Box marginTop={1}>
                  <Alert
                    type="info"
                    message="Primary verification method: Ed25519 - Default Solana keypair"
                    showBorder={false}
                  />
                </Box>
              )}
            </Card>

            {/* Services */}
            <Card
              title={`${SERVICE_TYPES.agent.icon} Services (${didDocument.service.length})`}
              borderColor="yellow"
              marginTop={1}
            >
              {didDocument.service.length > 0 ? (
                didDocument.service.map((service, index) => (
                  <Box key={index} flexDirection="column" marginBottom={1}>
                    <Box>
                      <Text dimColor>Type: </Text>
                      <Text color="yellow">{service.type}</Text>
                    </Box>
                    <Box>
                      <Text dimColor>Endpoint: </Text>
                      <Text color="cyan">{service.serviceEndpoint}</Text>
                    </Box>
                    {service.description && (
                      <Box>
                        <Text dimColor>{service.description}</Text>
                      </Box>
                    )}
                  </Box>
                ))
              ) : (
                <Text dimColor>No services configured</Text>
              )}
            </Card>

            {/* DID Document JSON Preview */}
            <Card title="📄 DID Document" borderColor="magenta" marginTop={1}>
              <Box flexDirection="column">
                <Text dimColor>{JSON.stringify(didDocument, null, 2).slice(0, 300)}...</Text>
                <Box marginTop={1}>
                  <Text dimColor>
                    Use <Text color="cyan">--json</Text> flag for full document
                  </Text>
                </Box>
              </Box>
            </Card>

            {/* Actions Menu */}
            <Box marginTop={1} flexDirection="column">
              <Text dimColor>{'─'.repeat(60)}</Text>
              <Box marginTop={1} flexDirection="column" gap={1}>
                <Text bold color="cyan">
                  Actions:
                </Text>
                {!hasDID && (
                  <Text dimColor>
                    <Text color="yellow">[n]</Text> Create DID
                  </Text>
                )}
                {hasDID && (
                  <Text dimColor>
                    <Text color="yellow">[u]</Text> Update DID
                  </Text>
                )}
                <Text dimColor>
                  <Text color="yellow">[r]</Text> Resolve DID
                </Text>
                <Text dimColor>
                  <Text color="yellow">[v]</Text> Toggle Verification Methods
                </Text>
                <Text dimColor>
                  <Text color="yellow">[s]</Text> Toggle Services
                </Text>
                <Text dimColor>
                  <Text color="yellow">[q]</Text> Exit
                </Text>
              </Box>
            </Box>
          </Box>
        )

      case 'create_wizard':
        return (
          <Box flexDirection="column" gap={1}>
            <Alert
              type="info"
              title="Create New DID Document"
              message="Follow the wizard to create a W3C-compliant DID document for your agent."
            />

            <Card title="Step 1: Select Verification Method" borderColor="cyan" marginTop={1}>
              <SelectInput
                items={Object.entries(VERIFICATION_METHOD_TYPES).map(([key, value]) => ({
                  label: `${value.icon} ${value.name} - ${value.description}`,
                  value: key as VerificationMethodType,
                }))}
                onSelect={(item) => {
                  setSelectedVerificationMethod(item.value)
                  setStage('create_step2')
                }}
              />
            </Card>

            <Box marginTop={1}>
              <Text dimColor>
                Press <Text color="yellow">Enter</Text> to select • <Text color="yellow">Esc</Text> to cancel
              </Text>
            </Box>
          </Box>
        )

      case 'create_step2':
        return (
          <Box flexDirection="column" gap={1}>
            <Card title="Step 2: Add Service Endpoint (Optional)" borderColor="yellow">
              <Box flexDirection="column" gap={1}>
                <Text>Would you like to add a service endpoint?</Text>
                <SelectInput
                  items={[
                    { label: 'Yes - Add service endpoint', value: 'yes' },
                    { label: 'No - Skip this step', value: 'no' },
                  ]}
                  onSelect={(item) => {
                    if (item.value === 'yes') {
                      setAddService(true)
                      setStage('create_step3')
                    } else {
                      setAddService(false)
                      setStage('create_confirm')
                    }
                  }}
                />
              </Box>
            </Card>
          </Box>
        )

      case 'create_step3':
        return (
          <Box flexDirection="column" gap={1}>
            <Card title="Step 3: Configure Service" borderColor="green">
              <Box flexDirection="column" gap={1}>
                <Text>Select service type:</Text>
                <SelectInput
                  items={Object.entries(SERVICE_TYPES).map(([key, value]) => ({
                    label: `${value.icon} ${value.name} - ${value.description}`,
                    value: key as ServiceType,
                  }))}
                  onSelect={(item) => {
                    setSelectedServiceType(item.value)
                    // Automatically set endpoint based on type
                    setServiceEndpoint(
                      `https://api.ghostspeak.io/${item.value}/${agentAddress}`
                    )
                    setStage('create_confirm')
                  }}
                />
              </Box>
            </Card>
          </Box>
        )

      case 'create_confirm':
        return (
          <Box flexDirection="column" gap={1}>
            <Card title="Review & Confirm" borderColor="magenta">
              <Box flexDirection="column" gap={1}>
                <Text bold color="cyan">
                  DID Document Preview:
                </Text>
                <Box marginTop={1}>
                  <Text dimColor>DID: </Text>
                  <Text>{didIdentifier}</Text>
                </Box>
                <Box>
                  <Text dimColor>Agent: </Text>
                  <Text>{agentName}</Text>
                </Box>
                <Box>
                  <Text dimColor>Verification Method: </Text>
                  <Text color="green">
                    {VERIFICATION_METHOD_TYPES[selectedVerificationMethod].icon}{' '}
                    {VERIFICATION_METHOD_TYPES[selectedVerificationMethod].name}
                  </Text>
                </Box>
                {addService && (
                  <>
                    <Box>
                      <Text dimColor>Service Type: </Text>
                      <Text color="yellow">
                        {SERVICE_TYPES[selectedServiceType].icon}{' '}
                        {SERVICE_TYPES[selectedServiceType].name}
                      </Text>
                    </Box>
                    <Box>
                      <Text dimColor>Endpoint: </Text>
                      <Text color="cyan">{serviceEndpoint}</Text>
                    </Box>
                  </>
                )}

                <Box marginTop={1}>
                  <SelectInput
                    items={[
                      { label: '✅ Create DID Document', value: 'confirm' },
                      { label: '❌ Cancel', value: 'cancel' },
                    ]}
                    onSelect={(item) => {
                      if (item.value === 'confirm') {
                        createDID()
                      } else {
                        setStage('overview')
                      }
                    }}
                  />
                </Box>
              </Box>
            </Card>
          </Box>
        )

      case 'creating':
        return (
          <Box flexDirection="column" gap={1}>
            <Spinner label="Creating DID document on blockchain..." />
            <Alert
              type="warning"
              message="SDK integration pending. DID creation is simulated."
              showBorder={true}
            />
          </Box>
        )

      case 'resolving':
        return (
          <Box flexDirection="column" gap={1}>
            <Spinner label="Resolving DID document..." />
            <Box marginTop={1}>
              <Text dimColor>DID: {didIdentifier}</Text>
            </Box>
          </Box>
        )

      case 'update_menu':
        return (
          <Box flexDirection="column" gap={1}>
            <Card title="Update DID Document" borderColor="yellow">
              <SelectInput
                items={[
                  { label: '➕ Add Service Endpoint', value: 'add-service' },
                  { label: '➖ Remove Service Endpoint', value: 'remove-service' },
                  { label: '🔑 Add Verification Method', value: 'add-vm' },
                  { label: '🗑️  Remove Verification Method', value: 'remove-vm' },
                  { label: '❌ Cancel', value: 'cancel' },
                ]}
                onSelect={(item) => {
                  if (item.value === 'cancel') {
                    setStage('overview')
                  } else {
                    // Handle update action (not fully implemented)
                    setStage('updating')
                    setTimeout(() => {
                      setStage('success')
                      setTimeout(() => setStage('overview'), 1500)
                    }, 1500)
                  }
                }}
              />
            </Card>

            <Box marginTop={1}>
              <Text dimColor>
                Press <Text color="yellow">Esc</Text> to go back
              </Text>
            </Box>
          </Box>
        )

      case 'updating':
        return (
          <Box flexDirection="column" gap={1}>
            <Spinner label="Updating DID document..." />
            <Alert
              type="warning"
              message="SDK integration pending. DID update is simulated."
              showBorder={true}
            />
          </Box>
        )

      case 'success':
        return (
          <Box flexDirection="column" gap={1}>
            <Spinner state="success" label="DID operation completed successfully!" />
            <Box marginTop={1}>
              <Text color="green">DID: {didIdentifier}</Text>
            </Box>
            <Box marginTop={1}>
              <Text color="cyan">View at: https://ghostspeak.io/dashboard/did</Text>
            </Box>
          </Box>
        )

      case 'error':
        return (
          <Box flexDirection="column" gap={1}>
            <Spinner state="error" label="Failed to load DID" />
            <Alert type="error" message={error} />
          </Box>
        )
    }
  }

  return (
    <Layout title="🆔 DID Management" showFooter={stage === 'overview'}>
      {renderStage()}
    </Layout>
  )
}
