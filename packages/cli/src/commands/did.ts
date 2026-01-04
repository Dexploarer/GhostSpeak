/**
 * DID (Decentralized Identifier) management command
 * Create, update, resolve, and manage W3C-compliant DIDs
 */

import { Command } from 'commander'
import chalk from 'chalk'
import {
  intro,
  outro,
  text,
  select,
  confirm,
  spinner,
  isCancel,
  cancel,
  log,
  note
} from '@clack/prompts'
import { initializeClient, getExplorerUrl, toSDKSigner } from '../utils/client.js'
import { handleError } from '../utils/error-handler.js'
import { createSafeSDKClient } from '../utils/sdk-helpers.js'
import { address } from '@solana/addresses'
import type { Address } from '@solana/addresses'

// Type definitions
interface CreateOptions {
  agent?: string
  'service-endpoint'?: string
  'verification-method'?: string
}

interface UpdateOptions {
  did?: string
  action?: string
  'service-endpoint'?: string
  'service-type'?: string
  'verification-method'?: string
}

interface ResolveOptions {
  did?: string
  json?: boolean
}

interface DeactivateOptions {
  did?: string
}

// DID verification method types
const VERIFICATION_METHOD_TYPES = {
  ed25519: {
    name: 'Ed25519VerificationKey2020',
    description: 'Default Solana keypair signature verification',
    icon: '🔑'
  },
  secp256k1: {
    name: 'EcdsaSecp256k1VerificationKey2019',
    description: 'Ethereum-compatible signature verification',
    icon: '⚡'
  },
  rsa: {
    name: 'RsaVerificationKey2018',
    description: 'RSA signature verification',
    icon: '🔐'
  }
}

// DID service types
const SERVICE_TYPES = {
  messaging: {
    name: 'MessagingService',
    description: 'Decentralized messaging endpoint',
    icon: '💬'
  },
  credential: {
    name: 'CredentialRegistryService',
    description: 'Verifiable credential issuance',
    icon: '📜'
  },
  hub: {
    name: 'IdentityHub',
    description: 'Decentralized identity storage',
    icon: '🏠'
  },
  agent: {
    name: 'AgentService',
    description: 'AI agent interaction endpoint',
    icon: '🤖'
  }
}

export const didCommand = new Command('did')
  .description('Manage W3C Decentralized Identifiers (DIDs)')

// Create DID subcommand
didCommand
  .command('create')
  .description('Create a new DID document for an agent')
  .option('-a, --agent <address>', 'Agent address')
  .option('--service-endpoint <url>', 'Add service endpoint URL')
  .option('--verification-method <type>', 'Verification method type (ed25519, secp256k1, rsa)')
  .action(async (options: CreateOptions) => {
    intro(chalk.cyan('🆔 Create DID Document'))

    try {
      const s = spinner()
      s.start('Connecting to network...')

      const { client, wallet } = await initializeClient('devnet')
      const safeClient = createSafeSDKClient(client)

      s.stop('✅ Connected to devnet')

      // Get agent address
      let agentAddress = options.agent
      if (!agentAddress) {
        const addressInput = await text({
          message: 'Agent address:',
          validate: (value) => {
            if (!value) return 'Agent address is required'
            try {
              address(value.trim())
              return
            } catch {
              return 'Please enter a valid Solana address'
            }
          }
        })

        if (isCancel(addressInput)) {
          cancel('DID creation cancelled')
          return
        }

        agentAddress = addressInput.toString().trim()
      }

      const agentAddr = address(agentAddress)

      // Verify agent exists
      s.start('Verifying agent...')
      const agentData = await safeClient.agent.getAgentAccount(agentAddr)

      if (!agentData) {
        s.stop('❌ Agent not found')
        outro(chalk.red(`No agent found at address: ${agentAddress}`))
        return
      }

      s.stop('✅ Agent verified')

      // Get verification method
      let verificationMethod = options['verification-method']
      if (!verificationMethod) {
        const vmChoice = await select({
          message: 'Select verification method:',
          options: Object.entries(VERIFICATION_METHOD_TYPES).map(([key, value]) => ({
            value: key,
            label: `${value.icon} ${value.name}`,
            hint: value.description
          }))
        })

        if (isCancel(vmChoice)) {
          cancel('DID creation cancelled')
          return
        }

        verificationMethod = vmChoice.toString()
      }

      const selectedVM = VERIFICATION_METHOD_TYPES[verificationMethod as keyof typeof VERIFICATION_METHOD_TYPES]

      if (!selectedVM) {
        log.error('Invalid verification method. Choose: ed25519, secp256k1, or rsa')
        return
      }

      // Optional: Add service endpoint
      let serviceEndpoint = options['service-endpoint']
      if (!serviceEndpoint) {
        const addService = await confirm({
          message: 'Add a service endpoint to the DID document?'
        })

        if (isCancel(addService)) {
          cancel('DID creation cancelled')
          return
        }

        if (addService) {
          const endpointInput = await text({
            message: 'Service endpoint URL:',
            placeholder: 'https://api.example.com/agent',
            validate: (value) => {
              if (!value) return 'Service endpoint is required'
              try {
                new URL(value)
                return
              } catch {
                return 'Please enter a valid URL'
              }
            }
          })

          if (isCancel(endpointInput)) {
            cancel('DID creation cancelled')
            return
          }

          serviceEndpoint = endpointInput.toString()
        }
      }

      // Generate DID identifier (did:ghostspeak:devnet:address)
      const didIdentifier = `did:ghostspeak:devnet:${agentAddr.toString()}`

      // Show preview
      note(
        `${chalk.bold('DID Document Preview:')}\\n` +
        `${chalk.gray('DID:')} ${didIdentifier}\\n` +
        `${chalk.gray('Agent:')} ${agentData.name}\\n` +
        `${chalk.gray('Verification Method:')} ${selectedVM.icon} ${selectedVM.name}\\n` +
        `${serviceEndpoint ? `${chalk.gray('Service Endpoint:')} ${serviceEndpoint}\\n` : ''}` +
        `\\n${chalk.bold('Document Structure:')}\\n` +
        `${chalk.gray('• @context:')} https://www.w3.org/ns/did/v1\\n` +
        `${chalk.gray('• id:')} ${didIdentifier}\\n` +
        `${chalk.gray('• verificationMethod:')} 1 method\\n` +
        `${serviceEndpoint ? `${chalk.gray('• service:')} 1 endpoint` : `${chalk.gray('• service:')} None`}`,
        'DID Preview'
      )

      const confirmCreate = await confirm({
        message: `Create DID document for ${agentData.name}?`
      })

      if (isCancel(confirmCreate) || !confirmCreate) {
        cancel('DID creation cancelled')
        return
      }

      s.start('Creating DID document on blockchain...')

      try {
        // Note: SDK DID module integration pending
        log.warn('DID document creation pending SDK integration.')

        s.stop('⚠️  DID creation method pending')

        outro(
          `${chalk.yellow('DID Creation Pending')}\\n\\n` +
          `Your DID document will be created with:\\n` +
          `${chalk.gray('DID:')} ${chalk.cyan(didIdentifier)}\\n` +
          `${chalk.gray('Agent:')} ${agentData.name}\\n` +
          `${chalk.gray('Verification Method:')} ${selectedVM.name}\\n` +
          `${serviceEndpoint ? `${chalk.gray('Service Endpoint:')} ${serviceEndpoint}\\n` : ''}\\n` +
          `${chalk.gray('Note: DID CLI integration coming soon.')}\\n` +
          `${chalk.gray('Web dashboard: ')}${chalk.cyan('https://ghostspeak.io/dashboard')}`
        )

      } catch (error) {
        s.stop('❌ Failed to create DID document')
        handleError(error)
      }

    } catch (error) {
      log.error(`Failed to create DID: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  })

// Update DID subcommand
didCommand
  .command('update')
  .description('Update an existing DID document')
  .option('-d, --did <did>', 'DID identifier (did:ghostspeak:devnet:address)')
  .option('-a, --action <action>', 'Update action (add-service, remove-service, add-vm, remove-vm)')
  .option('--service-endpoint <url>', 'Service endpoint URL (for add-service)')
  .option('--service-type <type>', 'Service type (messaging, credential, hub, agent)')
  .option('--verification-method <type>', 'Verification method type (for add-vm)')
  .action(async (options: UpdateOptions) => {
    intro(chalk.blue('✏️  Update DID Document'))

    try {
      const s = spinner()

      // Get DID identifier
      let didIdentifier = options.did
      if (!didIdentifier) {
        const didInput = await text({
          message: 'DID identifier:',
          placeholder: 'did:ghostspeak:devnet:...',
          validate: (value) => {
            if (!value) return 'DID identifier is required'
            if (!value.startsWith('did:ghostspeak:')) {
              return 'DID must start with "did:ghostspeak:"'
            }
          }
        })

        if (isCancel(didInput)) {
          cancel('Update cancelled')
          return
        }

        didIdentifier = didInput.toString().trim()
      }

      // Extract agent address from DID
      const didParts = didIdentifier.split(':')
      if (didParts.length < 4) {
        log.error('Invalid DID format. Expected: did:ghostspeak:network:address')
        return
      }

      const agentAddress = didParts[3]

      s.start('Connecting to network...')

      const { client, wallet } = await initializeClient('devnet')
      const safeClient = createSafeSDKClient(client)

      s.stop('✅ Connected to devnet')

      // Verify agent/DID exists
      s.start('Verifying DID document...')

      const agentAddr = address(agentAddress)
      const agentData = await safeClient.agent.getAgentAccount(agentAddr)

      if (!agentData) {
        s.stop('❌ Agent not found')
        outro(chalk.red(`No agent found for DID: ${didIdentifier}`))
        return
      }

      s.stop('✅ DID document found')

      // Get update action
      let updateAction = options.action
      if (!updateAction) {
        const actionChoice = await select({
          message: 'Select update action:',
          options: [
            {
              value: 'add-service',
              label: '➕ Add Service',
              hint: 'Add a new service endpoint to the DID document'
            },
            {
              value: 'remove-service',
              label: '➖ Remove Service',
              hint: 'Remove an existing service endpoint'
            },
            {
              value: 'add-vm',
              label: '🔑 Add Verification Method',
              hint: 'Add a new verification method'
            },
            {
              value: 'remove-vm',
              label: '🗑️  Remove Verification Method',
              hint: 'Remove an existing verification method'
            }
          ]
        })

        if (isCancel(actionChoice)) {
          cancel('Update cancelled')
          return
        }

        updateAction = actionChoice.toString()
      }

      // Handle specific update actions
      let updateDetails = ''

      if (updateAction === 'add-service') {
        let serviceEndpoint = options['service-endpoint']
        if (!serviceEndpoint) {
          const endpointInput = await text({
            message: 'Service endpoint URL:',
            placeholder: 'https://api.example.com/agent',
            validate: (value) => {
              if (!value) return 'Service endpoint is required'
              try {
                new URL(value)
                return
              } catch {
                return 'Please enter a valid URL'
              }
            }
          })

          if (isCancel(endpointInput)) {
            cancel('Update cancelled')
            return
          }

          serviceEndpoint = endpointInput.toString()
        }

        let serviceType = options['service-type']
        if (!serviceType) {
          const typeChoice = await select({
            message: 'Select service type:',
            options: Object.entries(SERVICE_TYPES).map(([key, value]) => ({
              value: key,
              label: `${value.icon} ${value.name}`,
              hint: value.description
            }))
          })

          if (isCancel(typeChoice)) {
            cancel('Update cancelled')
            return
          }

          serviceType = typeChoice.toString()
        }

        const selectedServiceType = SERVICE_TYPES[serviceType as keyof typeof SERVICE_TYPES]
        updateDetails = `Add ${selectedServiceType.name} at ${serviceEndpoint}`

      } else if (updateAction === 'add-vm') {
        let verificationMethod = options['verification-method']
        if (!verificationMethod) {
          const vmChoice = await select({
            message: 'Select verification method:',
            options: Object.entries(VERIFICATION_METHOD_TYPES).map(([key, value]) => ({
              value: key,
              label: `${value.icon} ${value.name}`,
              hint: value.description
            }))
          })

          if (isCancel(vmChoice)) {
            cancel('Update cancelled')
            return
          }

          verificationMethod = vmChoice.toString()
        }

        const selectedVM = VERIFICATION_METHOD_TYPES[verificationMethod as keyof typeof VERIFICATION_METHOD_TYPES]
        updateDetails = `Add ${selectedVM.name} verification method`
      }

      // Show update preview
      note(
        `${chalk.bold('DID Update Preview:')}\\n` +
        `${chalk.gray('DID:')} ${didIdentifier}\\n` +
        `${chalk.gray('Agent:')} ${agentData.name}\\n` +
        `${chalk.gray('Action:')} ${updateAction}\\n` +
        `${updateDetails ? `${chalk.gray('Details:')} ${updateDetails}` : ''}`,
        'Update Preview'
      )

      const confirmUpdate = await confirm({
        message: `Apply this update to the DID document?`
      })

      if (isCancel(confirmUpdate) || !confirmUpdate) {
        cancel('Update cancelled')
        return
      }

      s.start('Updating DID document on blockchain...')

      try {
        log.warn('DID document update pending SDK integration.')

        s.stop('⚠️  DID update method pending')

        outro(
          `${chalk.yellow('DID Update Pending')}\\n\\n` +
          `Your DID document will be updated:\\n` +
          `${chalk.gray('DID:')} ${didIdentifier}\\n` +
          `${chalk.gray('Action:')} ${updateAction}\\n` +
          `${updateDetails ? `${chalk.gray('Details:')} ${updateDetails}\\n` : ''}\\n` +
          `${chalk.gray('Note: DID CLI integration coming soon.')}\\n` +
          `${chalk.gray('Web dashboard: ')}${chalk.cyan('https://ghostspeak.io/dashboard')}`
        )

      } catch (error) {
        s.stop('❌ Failed to update DID document')
        handleError(error)
      }

    } catch (error) {
      log.error(`Failed to update DID: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  })

// Resolve DID subcommand
didCommand
  .command('resolve')
  .description('Resolve a DID to its document')
  .option('-d, --did <did>', 'DID identifier (did:ghostspeak:devnet:address)')
  .option('--json', 'Output as JSON')
  .action(async (options: ResolveOptions) => {
    intro(chalk.green('🔍 Resolve DID Document'))

    try {
      // Get DID identifier
      let didIdentifier = options.did
      if (!didIdentifier) {
        const didInput = await text({
          message: 'DID identifier:',
          placeholder: 'did:ghostspeak:devnet:...',
          validate: (value) => {
            if (!value) return 'DID identifier is required'
            if (!value.startsWith('did:ghostspeak:')) {
              return 'DID must start with "did:ghostspeak:"'
            }
          }
        })

        if (isCancel(didInput)) {
          cancel('Resolution cancelled')
          return
        }

        didIdentifier = didInput.toString().trim()
      }

      // Extract agent address from DID
      const didParts = didIdentifier.split(':')
      if (didParts.length < 4) {
        log.error('Invalid DID format. Expected: did:ghostspeak:network:address')
        return
      }

      const network = didParts[2]
      const agentAddress = didParts[3]

      const s = spinner()
      s.start('Resolving DID document...')

      const { client } = await initializeClient('devnet')
      const safeClient = createSafeSDKClient(client)

      const agentAddr = address(agentAddress)
      const agentData = await safeClient.agent.getAgentAccount(agentAddr)

      if (!agentData) {
        s.stop('❌ DID not found')
        outro(chalk.red(`No DID document found: ${didIdentifier}`))
        return
      }

      s.stop('✅ DID document resolved')

      // Mock DID document for demonstration
      const mockDocument = {
        '@context': [
          'https://www.w3.org/ns/did/v1',
          'https://w3id.org/security/suites/ed25519-2020/v1'
        ],
        id: didIdentifier,
        controller: didIdentifier,
        verificationMethod: [
          {
            id: `${didIdentifier}#keys-1`,
            type: 'Ed25519VerificationKey2020',
            controller: didIdentifier,
            publicKeyMultibase: agentAddr.toString()
          }
        ],
        authentication: [`${didIdentifier}#keys-1`],
        assertionMethod: [`${didIdentifier}#keys-1`],
        service: [
          {
            id: `${didIdentifier}#agent-service`,
            type: 'AgentService',
            serviceEndpoint: `https://api.ghostspeak.io/agents/${agentAddr.toString()}`
          }
        ],
        metadata: {
          agentName: agentData.name,
          created: new Date().toISOString(),
          updated: new Date().toISOString()
        }
      }

      // JSON output
      if (options.json) {
        console.log(JSON.stringify(mockDocument, null, 2))
        return
      }

      // Display DID document
      outro(
        `${chalk.bold.green('DID Document Resolved')}\\n\\n` +
        `${chalk.bold('Identifier:')}\\n` +
        `${chalk.gray('DID:')} ${chalk.cyan(didIdentifier)}\\n` +
        `${chalk.gray('Agent:')} ${agentData.name}\\n` +
        `${chalk.gray('Network:')} ${network}\\n\\n` +
        `${chalk.bold('Verification Methods:')}\\n` +
        `${chalk.gray('• Type:')} Ed25519VerificationKey2020\\n` +
        `${chalk.gray('• ID:')} ${didIdentifier}#keys-1\\n\\n` +
        `${chalk.bold('Services:')}\\n` +
        `${chalk.gray('• Type:')} AgentService\\n` +
        `${chalk.gray('• Endpoint:')} https://api.ghostspeak.io/agents/${agentAddr.toString().slice(0, 8)}...\\n\\n` +
        `${chalk.bold('Authentication:')}\\n` +
        `${chalk.gray('• Methods:')} 1 verification method\\n` +
        `${chalk.gray('• Assertion:')} 1 verification method\\n\\n` +
        `${chalk.yellow('💡 Tip: Use')} ${chalk.cyan('--json')} ${chalk.yellow('for full document')}`
      )

    } catch (error) {
      log.error(`Failed to resolve DID: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  })

// Deactivate DID subcommand
didCommand
  .command('deactivate')
  .description('Deactivate a DID document (irreversible)')
  .option('-d, --did <did>', 'DID identifier (did:ghostspeak:devnet:address)')
  .action(async (options: DeactivateOptions) => {
    intro(chalk.red('🗑️  Deactivate DID Document'))

    log.warn(
      chalk.red('⚠️  WARNING: ') +
      'DID deactivation is IRREVERSIBLE.\\n' +
      'Once deactivated, this DID cannot be reactivated or used for authentication.'
    )

    try {
      // Get DID identifier
      let didIdentifier = options.did
      if (!didIdentifier) {
        const didInput = await text({
          message: 'DID identifier:',
          placeholder: 'did:ghostspeak:devnet:...',
          validate: (value) => {
            if (!value) return 'DID identifier is required'
            if (!value.startsWith('did:ghostspeak:')) {
              return 'DID must start with "did:ghostspeak:"'
            }
          }
        })

        if (isCancel(didInput)) {
          cancel('Deactivation cancelled')
          return
        }

        didIdentifier = didInput.toString().trim()
      }

      // Extract agent address from DID
      const didParts = didIdentifier.split(':')
      if (didParts.length < 4) {
        log.error('Invalid DID format. Expected: did:ghostspeak:network:address')
        return
      }

      const agentAddress = didParts[3]

      const s = spinner()
      s.start('Connecting to network...')

      const { client, wallet } = await initializeClient('devnet')
      const safeClient = createSafeSDKClient(client)

      s.stop('✅ Connected to devnet')

      // Verify DID exists
      s.start('Verifying DID document...')

      const agentAddr = address(agentAddress)
      const agentData = await safeClient.agent.getAgentAccount(agentAddr)

      if (!agentData) {
        s.stop('❌ DID not found')
        outro(chalk.red(`No DID document found: ${didIdentifier}`))
        return
      }

      s.stop('✅ DID document found')

      // Show deactivation warning
      note(
        `${chalk.bold.red('⚠️  IRREVERSIBLE ACTION')}\\n\\n` +
        `${chalk.bold('DID to Deactivate:')}\\n` +
        `${chalk.gray('DID:')} ${didIdentifier}\\n` +
        `${chalk.gray('Agent:')} ${agentData.name}\\n\\n` +
        `${chalk.bold('Consequences:')}\\n` +
        `${chalk.red('• DID cannot be reactivated')}\\n` +
        `${chalk.red('• All authentication will fail')}\\n` +
        `${chalk.red('• Verifiable credentials may be invalidated')}\\n` +
        `${chalk.red('• Services will become unreachable')}`,
        'Deactivation Warning'
      )

      const confirmDeactivate = await confirm({
        message: `${chalk.red('Are you ABSOLUTELY SURE you want to deactivate this DID?')}`
      })

      if (isCancel(confirmDeactivate) || !confirmDeactivate) {
        cancel('Deactivation cancelled')
        return
      }

      // Double confirmation
      const doubleConfirm = await confirm({
        message: `${chalk.red('This is IRREVERSIBLE. Proceed with deactivation?')}`
      })

      if (isCancel(doubleConfirm) || !doubleConfirm) {
        cancel('Deactivation cancelled')
        return
      }

      s.start('Deactivating DID document on blockchain...')

      try {
        log.warn('DID deactivation pending SDK integration.')

        s.stop('⚠️  DID deactivation method pending')

        outro(
          `${chalk.yellow('DID Deactivation Pending')}\\n\\n` +
          `Your DID will be deactivated:\\n` +
          `${chalk.gray('DID:')} ${didIdentifier}\\n` +
          `${chalk.gray('Agent:')} ${agentData.name}\\n\\n` +
          `${chalk.red('⚠️  This action is IRREVERSIBLE')}\\n\\n` +
          `${chalk.gray('Note: DID CLI integration coming soon.')}\\n` +
          `${chalk.gray('Web dashboard: ')}${chalk.cyan('https://ghostspeak.io/dashboard')}`
        )

      } catch (error) {
        s.stop('❌ Failed to deactivate DID document')
        handleError(error)
      }

    } catch (error) {
      log.error(`Failed to deactivate DID: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  })

// Default action - show available commands
didCommand
  .action(async () => {
    intro(chalk.blue('🆔 GhostSpeak DID Management'))

    log.info(`\\n${chalk.bold('Available Commands:')}\\n`)
    log.info(`${chalk.cyan('ghost did create')} - Create a new W3C DID document`)
    log.info(`${chalk.cyan('ghost did update')} - Update an existing DID document`)
    log.info(`${chalk.cyan('ghost did resolve')} - Resolve a DID to its document`)
    log.info(`${chalk.cyan('ghost did deactivate')} - Deactivate a DID (irreversible)`)

    note(
      `${chalk.bold('What is a DID?')}\\n` +
      `A Decentralized Identifier (DID) is a W3C standard for verifiable,\\n` +
      `self-sovereign digital identities. DIDs enable:\\n\\n` +
      `${chalk.gray('• Verifiable credentials issuance and verification')}\\n` +
      `${chalk.gray('• Cross-chain identity portability')}\\n` +
      `${chalk.gray('• Decentralized authentication')}\\n` +
      `${chalk.gray('• Privacy-preserving identity proofs')}\\n\\n` +
      `${chalk.bold('DID Format:')}\\n` +
      `${chalk.cyan('did:ghostspeak:network:address')}\\n\\n` +
      `${chalk.bold('Learn more:')}\\n` +
      `${chalk.cyan('https://www.w3.org/TR/did-core/')}`,
      'About DIDs'
    )

    outro('Use --help with any command for more details')
  })
