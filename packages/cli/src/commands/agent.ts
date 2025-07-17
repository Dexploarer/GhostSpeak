import { Command } from 'commander'
import chalk from 'chalk'
import { 
  intro, 
  outro, 
  text, 
  select, 
  multiselect, 
  confirm, 
  spinner,
  isCancel,
  cancel,
  log
} from '@clack/prompts'
import { registerAgentPrompts } from '../prompts/agent.js'
import { initializeClient, getExplorerUrl, getAddressExplorerUrl, handleTransactionError } from '../utils/client.js'
import { AgentWalletManager, AgentCNFTManager, AgentBackupManager } from '../utils/agentWallet.js'
import type { Address } from '@solana/addresses'
import { address } from '@solana/addresses'

export const agentCommand = new Command('agent')
  .description('Manage AI agents on the GhostSpeak protocol')

// Register agent subcommand
agentCommand
  .command('register')
  .description('Register a new AI agent')
  .option('-n, --name <name>', 'Agent name')
  .option('-d, --description <description>', 'Agent description')
  .option('--endpoint <endpoint>', 'Service endpoint URL')
  .action(async (options) => {
    intro(chalk.cyan('🤖 Register New AI Agent'))

    try {
      const agentData = await registerAgentPrompts(options)
      
      if (isCancel(agentData)) {
        cancel('Agent registration cancelled')
        return
      }

      const s = spinner()
      s.start('Connecting to Solana network...')
      
      // Initialize SDK client
      const { client, wallet } = await initializeClient('devnet')
      s.stop('✅ Connected to Solana devnet')
      
      s.start('Generating agent wallet and credentials...')
      
      // Keep track of resources for cleanup
      let credentials: any = null
      let agentWallet: any = null
      let registrationComplete = false
      
      try {
        // Generate dedicated agent wallet and credentials
        const walletResult = await AgentWalletManager.generateAgentWallet(
          agentData.name,
          agentData.description,
          wallet.address
        )
        
        agentWallet = walletResult.agentWallet
        credentials = walletResult.credentials
        
        // Save credentials locally
        await AgentWalletManager.saveCredentials(credentials)
        
        s.stop('✅ Agent wallet generated')
        s.start('Registering agent on the blockchain...')
        
        // Generate PDAs for agent registration
        const { getProgramDerivedAddress, getAddressEncoder, getBytesEncoder, getUtf8Encoder, getU32Encoder, addEncoderSizePrefix } = await import('@solana/kit')
        const agentId = credentials.agentId
        
        // Derive agent PDA using the same pattern as the generated code
        const [agentPda] = await getProgramDerivedAddress({
          programAddress: client.config.programId!,
          seeds: [
            getBytesEncoder().encode(new Uint8Array([97, 103, 101, 110, 116])), // 'agent'
            getAddressEncoder().encode(wallet.address),
            addEncoderSizePrefix(getUtf8Encoder(), getU32Encoder()).encode(agentId)
          ]
        })
        
        // Derive user registry PDA using the same pattern as the generated code
        const [userRegistryPda] = await getProgramDerivedAddress({
          programAddress: client.config.programId!,
          seeds: [
            getBytesEncoder().encode(new Uint8Array([117, 115, 101, 114, 95, 114, 101, 103, 105, 115, 116, 114, 121])), // 'user_registry'
            getAddressEncoder().encode(wallet.address)
          ]
        })
        
        // Register the agent using SDK with all required parameters
        s.start('Registering agent on-chain (this may take a moment)...')
        
        const signature = await client.agent.register(
          wallet,
          agentPda,
          userRegistryPda,
          {
            agentType: 1, // Default agent type
            metadataUri: agentData.metadataUri || `https://ghostspeak.ai/agents/${agentId}.json`,
            agentId: agentId
          }
        )
        
        registrationComplete = true
        s.stop('✅ Agent registered successfully!')
        
        // Mint CNFT ownership token
        s.start('Minting agent ownership token (CNFT)...')
        
        try {
          const { cnftMint, merkleTree } = await AgentCNFTManager.mintOwnershipToken(
            credentials,
            wallet,
            client.config.rpcUrl || 'https://api.devnet.solana.com'
          )
          
          console.log('CNFT Mint:', cnftMint)
          console.log('Merkle Tree:', merkleTree)
          
          s.stop('✅ Ownership token minted')
        } catch (error) {
          console.warn('⚠️  CNFT minting failed (using credentials only):', error)
          s.stop('⚠️  Using credential-based ownership')
        }
        
        console.log('\n' + chalk.green('🎉 Your agent has been registered!'))
        console.log(chalk.gray(`Name: ${agentData.name}`))
        console.log(chalk.gray(`Description: ${agentData.description}`))
        console.log(chalk.gray(`Capabilities: ${agentData.capabilities.join(', ')}`))
        console.log(chalk.gray(`Agent ID: ${credentials.agentId}`))
        console.log(chalk.gray(`Agent UUID: ${credentials.uuid}`))
        console.log(chalk.gray(`Agent Wallet: ${agentWallet.address.toString()}`))
        console.log(chalk.gray(`Agent Address: ${agentPda}`))
        console.log('')
        console.log(chalk.cyan('Transaction:'), getExplorerUrl(signature, 'devnet'))
        console.log(chalk.cyan('Agent Account:'), getAddressExplorerUrl(agentPda, 'devnet'))
        console.log('')
        console.log(chalk.yellow('💡 Agent credentials saved to:'))
        console.log(chalk.gray(`   ~/.ghostspeak/agents/${credentials.agentId}/credentials.json`))
        console.log(chalk.yellow('💡 Use your agent UUID for marketplace operations:'))
        console.log(chalk.gray(`   ${credentials.uuid}`))
        
        outro('Agent registration completed')
      } catch (error: any) {
        s.stop('❌ Registration failed')
        
        // Cleanup resources on error
        if (credentials && !registrationComplete) {
          try {
            console.log('🧹 Cleaning up partial registration...')
            await AgentWalletManager.deleteCredentials(credentials.agentId)
            console.log('✅ Cleanup completed')
          } catch (cleanupError: any) {
            console.warn('⚠️  Cleanup failed:', cleanupError.message)
          }
        }
        
        throw new Error(handleTransactionError(error))
      } finally {
        // Ensure client resources are cleaned up
        try {
          if (client && typeof client.cleanup === 'function') {
            await client.cleanup()
          }
        } catch (cleanupError) {
          // Silent cleanup - don't throw errors during cleanup
        }
      }

    } catch (error) {
      cancel(chalk.red('Failed to register agent: ' + (error instanceof Error ? error.message : 'Unknown error')))
    }
  })

// List agents subcommand
agentCommand
  .command('list')
  .description('List all registered agents')
  .option('--limit <limit>', 'Maximum number of agents to display', '10')
  .action(async (options) => {
    intro(chalk.cyan('📋 List Registered Agents'))

    const s = spinner()
    s.start('Connecting to Solana network...')
    
    try {
      // Initialize SDK client
      const { client } = await initializeClient('devnet')
      s.stop('✅ Connected')
      
      s.start('Fetching agents from the blockchain...')
      
      // Fetch agents using SDK
      const agents = await client.agent.list({
        limit: parseInt(options.limit)
      })
      
      s.stop('✅ Agents loaded')

      // Also check for local agents if no on-chain agents found
      if (agents.length === 0) {
        console.log('\n' + chalk.yellow('No agents found on the network'))
        
        // Check for local agents
        try {
          const { wallet } = await initializeClient('devnet')
          const localAgents = await AgentWalletManager.getAgentsByOwner(wallet.address)
          
          if (localAgents.length > 0) {
            console.log('\n' + chalk.cyan('Local agents found (not yet synchronized with blockchain):'))
            console.log('─'.repeat(60))
            
            localAgents.forEach((agent, index) => {
              console.log(chalk.yellow(`${index + 1}. ${agent.name} (Local)`))
              console.log(chalk.gray(`   Description: ${agent.description}`))
              console.log(chalk.gray(`   UUID: ${agent.uuid}`))
              console.log(chalk.gray(`   Agent ID: ${agent.agentId}`))
              console.log(chalk.gray(`   Status: Pending blockchain sync`))
              console.log('')
            })
          }
        } catch (error) {
          console.log('Error checking local agents:', error)
        }
        
        outro('Try registering an agent with: npx ghostspeak agent register')
        return
      }

      console.log('\n' + chalk.bold(`Available Agents (${agents.length}):`))
      console.log('─'.repeat(60))

      agents.forEach((agent, index) => {
        console.log(chalk.cyan(`${index + 1}. ${agent.name}`))
        console.log(chalk.gray(`   Address: ${agent.address.toString()}`))
        console.log(chalk.gray(`   Capabilities: ${agent.capabilities.join(', ')}`))
        console.log(chalk.gray(`   Status: ${agent.isActive ? '🟢 Active' : '🔴 Inactive'}`))
        console.log(chalk.gray(`   Price: ${Number(agent.pricePerTask) / 1_000_000} SOL per task`))
        console.log(chalk.gray(`   Registered: ${new Date(Number(agent.createdAt) * 1000).toLocaleDateString()}`))
        console.log('')
      })

      outro('Agent listing completed')

    } catch (error) {
      s.stop('❌ Failed to fetch agents')
      cancel(chalk.red('Error: ' + (error instanceof Error ? error.message : 'Unknown error')))
    }
  })

// Search agents subcommand
agentCommand
  .command('search')
  .description('Search agents by capabilities')
  .action(async () => {
    intro(chalk.cyan('🔍 Search AI Agents'))

    try {
      const capabilities = await multiselect({
        message: 'Select capabilities to search for:',
        options: [
          { value: 'data-analysis', label: 'Data Analysis' },
          { value: 'writing', label: 'Writing & Content Creation' },
          { value: 'coding', label: 'Programming & Development' },
          { value: 'translation', label: 'Language Translation' },
          { value: 'image-processing', label: 'Image Processing' },
          { value: 'automation', label: 'Task Automation' },
          { value: 'research', label: 'Research & Information Gathering' }
        ]
      })

      if (isCancel(capabilities)) {
        cancel('Search cancelled')
        return
      }

      const s = spinner()
      s.start('Connecting to Solana network...')
      
      // Initialize SDK client
      const { client } = await initializeClient('devnet')
      s.stop('✅ Connected')
      
      s.start('Searching for agents...')
      
      // Search agents using SDK
      const results = await client.agent.search({
        capabilities: capabilities as string[]
      })
      
      s.stop('✅ Search completed')

      if (results.length === 0) {
        console.log('\n' + chalk.yellow(`No agents found with capabilities: ${capabilities.join(', ')}`))
        outro('Try searching with different capabilities')
        return
      }

      console.log('\n' + chalk.bold(`Found ${results.length} agents with capabilities: ${capabilities.join(', ')}`))
      console.log('─'.repeat(60))
      
      results.forEach((agent, index) => {
        const matchingCaps = agent.capabilities.filter(cap => capabilities.includes(cap))
        console.log(chalk.cyan(`${index + 1}. ${agent.name}`))
        console.log(chalk.gray(`   Address: ${agent.address.toString()}`))
        console.log(chalk.gray(`   Matches: ${matchingCaps.join(', ')}`))
        console.log(chalk.gray(`   All capabilities: ${agent.capabilities.join(', ')}`))
        console.log(chalk.gray(`   Price: ${Number(agent.pricePerTask) / 1_000_000} SOL per task`))
        console.log(chalk.gray(`   Status: ${agent.isActive ? '🟢 Active' : '🔴 Inactive'}`))
        console.log('')
      })
      
      outro('Search completed')

    } catch (error) {
      cancel(chalk.red('Search failed: ' + (error instanceof Error ? error.message : 'Unknown error')))
    }
  })

// Status subcommand
agentCommand
  .command('status')
  .description('Check status of your agents')
  .action(async () => {
    intro(chalk.cyan('📊 Agent Status'))

    try {
      const s = spinner()
      s.start('Connecting to Solana network...')
      
      // Initialize SDK client
      const { client, wallet } = await initializeClient('devnet')
      s.stop('✅ Connected')
      
      s.start('Checking agent status...')
      
      // Get user's agents from credentials
      const myAgentCredentials = await AgentWalletManager.getAgentsByOwner(wallet.address)
      
      // Also get agents from blockchain
      const onChainAgents = await client.agent.listByOwner({
        owner: wallet.address
      })
      
      s.stop('✅ Status updated')
      
      if (myAgentCredentials.length === 0) {
        console.log('\n' + chalk.yellow('You have no registered agents'))
        outro('Register an agent with: npx ghostspeak agent register')
        return
      }

      console.log('\n' + chalk.bold('Your Agents:'))
      console.log('─'.repeat(60))
      
      for (const credentials of myAgentCredentials) {
        // Find matching on-chain agent
        const onChainAgent = onChainAgents.find(agent => 
          agent.address && agent.address.toString() === credentials.agentWallet.publicKey
        )
        
        // Get agent status details
        let status = null
        if (onChainAgent) {
          try {
            status = await client.agent.getStatus({
              agentAddress: onChainAgent.address
            })
          } catch (error) {
            console.warn('Failed to get agent status:', error)
          }
        }
        
        const statusIcon = onChainAgent?.isActive ? chalk.green('●') : 
                          onChainAgent ? chalk.red('○') : chalk.yellow('◐')
        const statusText = onChainAgent?.isActive ? 'Active' : 
                          onChainAgent ? 'Inactive' : 'Pending Sync'
        
        console.log(`${statusIcon} ${credentials.name}` + chalk.gray(` - ${statusText}`))
        console.log(chalk.gray(`  Agent ID: ${credentials.agentId}`))
        console.log(chalk.gray(`  UUID: ${credentials.uuid}`))
        console.log(chalk.gray(`  Agent Wallet: ${credentials.agentWallet.publicKey}`))
        console.log(chalk.gray(`  Owner: ${credentials.ownerWallet}`))
        console.log(chalk.gray(`  Created: ${new Date(credentials.createdAt).toLocaleString()}`))
        
        if (credentials.cnftMint) {
          console.log(chalk.gray(`  CNFT Mint: ${credentials.cnftMint}`))
        }
        
        if (status) {
          console.log(chalk.gray(`  Jobs completed: ${status.jobsCompleted || 0}`))
          console.log(chalk.gray(`  Total earnings: ${Number(status.totalEarnings || 0) / 1_000_000} SOL`))
          console.log(chalk.gray(`  Success rate: ${status.successRate || 0}%`))
          console.log(chalk.gray(`  Last active: ${status.lastActive ? new Date(Number(status.lastActive) * 1000).toLocaleString() : 'Never'}`))
          
          if (status.currentJob) {
            console.log(chalk.yellow('  Currently working on: ') + chalk.gray(status.currentJob.description))
            console.log(chalk.gray(`  Job started: ${new Date(Number(status.currentJob.startTime) * 1000).toLocaleString()}`))
          }
        }
        
        if (!onChainAgent) {
          console.log(chalk.yellow('  ⚠️  Agent not found on blockchain - blockchain sync may be in progress'))
        }
        
        console.log('')
      }

      outro('Status check completed')

    } catch (error) {
      cancel(chalk.red('Status check failed: ' + (error instanceof Error ? error.message : 'Unknown error')))
    }
  })

// Update agent subcommand
agentCommand
  .command('update')
  .description('Update your AI agent details')
  .option('--agent-id <id>', 'Agent ID to update')
  .action(async (options) => {
    intro(chalk.cyan('🔄 Update AI Agent'))

    try {
      const s = spinner()
      s.start('Connecting to Solana network...')
      
      // Initialize SDK client
      const { client, wallet } = await initializeClient('devnet')
      s.stop('✅ Connected')

      // Select agent if not provided
      let agentAddress: Address
      
      if (options.agentId) {
        // Use provided agent ID
        try {
          agentAddress = address(options.agentId)
        } catch {
          cancel('Invalid agent address provided')
          return
        }
      } else {
        const loadSpinner = spinner()
        loadSpinner.start('Loading your agents...')
        
        // Fetch user's agents
        const myAgents = await client.agent.listByOwner({
          owner: wallet.address
        })
        
        loadSpinner.stop('✅ Agents loaded')
        
        if (myAgents.length === 0) {
          cancel('You have no registered agents to update')
          return
        }

        const selectedAgent = await select({
          message: 'Select agent to update:',
          options: myAgents.map(agent => ({
            value: agent.address.toString(),
            label: `${agent.name} (${agent.isActive ? 'Active' : 'Inactive'})`
          }))
        })

        if (isCancel(selectedAgent)) {
          cancel('Update cancelled')
          return
        }

        agentAddress = address(selectedAgent as string)
      }

      // Fetch current agent details
      const fetchSpinner = spinner()
      fetchSpinner.start(`Loading agent details...`)
      
      const currentAgent = await client.agent.get({
        agentAddress
      })
      
      fetchSpinner.stop('✅ Agent details loaded')

      if (!currentAgent) {
        cancel('Agent not found')
        return
      }

      console.log('\n' + chalk.bold('Current Agent Details:'))
      console.log('─'.repeat(40))
      console.log(chalk.cyan('Name:') + ` ${currentAgent.name}`)
      console.log(chalk.cyan('Description:') + ` ${currentAgent.description}`)
      console.log(chalk.cyan('Endpoint:') + ` ${currentAgent.endpoint}`)
      console.log(chalk.cyan('Capabilities:') + ` ${currentAgent.capabilities.join(', ')}`)
      console.log(chalk.cyan('Price per task:') + ` ${Number(currentAgent.pricePerTask) / 1_000_000} SOL`)

      // Update options
      const updateChoice = await select({
        message: 'What would you like to update?',
        options: [
          { value: 'name', label: '📝 Name' },
          { value: 'description', label: '📄 Description' },
          { value: 'endpoint', label: '🔗 Service Endpoint' },
          { value: 'capabilities', label: '🛠️  Capabilities' },
          { value: 'price', label: '💰 Pricing' },
          { value: 'all', label: '📋 Update Everything' }
        ]
      })

      if (isCancel(updateChoice)) {
        cancel('Update cancelled')
        return
      }

      const updates: any = {}

      // Name update
      if (updateChoice === 'name' || updateChoice === 'all') {
        const newName = await text({
          message: 'New agent name:',
          placeholder: currentAgent.name,
          initialValue: updateChoice === 'all' ? currentAgent.name : undefined,
          validate: (value) => {
            if (!value) return 'Name is required'
            if (value.length < 3) return 'Name must be at least 3 characters'
          }
        })

        if (isCancel(newName)) {
          cancel('Update cancelled')
          return
        }

        updates.name = newName
      }

      // Description update
      if (updateChoice === 'description' || updateChoice === 'all') {
        const newDescription = await text({
          message: 'New description:',
          placeholder: currentAgent.description,
          initialValue: updateChoice === 'all' ? currentAgent.description : undefined,
          validate: (value) => {
            if (!value) return 'Description is required'
            if (value.length < 20) return 'Description must be at least 20 characters'
          }
        })

        if (isCancel(newDescription)) {
          cancel('Update cancelled')
          return
        }

        updates.description = newDescription
      }

      // Endpoint update
      if (updateChoice === 'endpoint' || updateChoice === 'all') {
        const newEndpoint = await text({
          message: 'New service endpoint URL:',
          placeholder: currentAgent.endpoint,
          initialValue: updateChoice === 'all' ? currentAgent.endpoint : undefined,
          validate: (value) => {
            if (!value) return 'Endpoint is required'
            try {
              new URL(value)
              return
            } catch {
              return 'Please enter a valid URL'
            }
          }
        })

        if (isCancel(newEndpoint)) {
          cancel('Update cancelled')
          return
        }

        updates.endpoint = newEndpoint
      }

      // Capabilities update
      if (updateChoice === 'capabilities' || updateChoice === 'all') {
        const newCapabilities = await multiselect({
          message: 'Select agent capabilities:',
          options: [
            { value: 'data-analysis', label: '📊 Data Analysis', selected: currentAgent.capabilities.includes('data-analysis') },
            { value: 'writing', label: '✍️  Writing & Content Creation', selected: currentAgent.capabilities.includes('writing') },
            { value: 'coding', label: '💻 Programming & Development', selected: currentAgent.capabilities.includes('coding') },
            { value: 'debugging', label: '🐛 Debugging', selected: currentAgent.capabilities.includes('debugging') },
            { value: 'code-review', label: '🔍 Code Review', selected: currentAgent.capabilities.includes('code-review') },
            { value: 'translation', label: '🌐 Language Translation', selected: currentAgent.capabilities.includes('translation') },
            { value: 'image-processing', label: '🖼️  Image Processing', selected: currentAgent.capabilities.includes('image-processing') },
            { value: 'automation', label: '🤖 Task Automation', selected: currentAgent.capabilities.includes('automation') }
          ],
          required: true
        })

        if (isCancel(newCapabilities)) {
          cancel('Update cancelled')
          return
        }

        updates.capabilities = newCapabilities
      }

      // Price update
      if (updateChoice === 'price' || updateChoice === 'all') {
        const newPrice = await text({
          message: 'New price per task (in SOL):',
          placeholder: `${Number(currentAgent.pricePerTask) / 1_000_000}`,
          initialValue: updateChoice === 'all' ? `${Number(currentAgent.pricePerTask) / 1_000_000}` : undefined,
          validate: (value) => {
            if (!value) return 'Price is required'
            const num = parseFloat(value)
            if (isNaN(num) || num < 0) return 'Please enter a valid positive number'
          }
        })

        if (isCancel(newPrice)) {
          cancel('Update cancelled')
          return
        }

        updates.pricePerTask = newPrice
      }

      // Confirmation
      console.log('\n' + chalk.bold('📋 Update Summary:'))
      console.log('─'.repeat(40))
      
      Object.entries(updates).forEach(([key, value]) => {
        if (Array.isArray(value)) {
          console.log(chalk.cyan(`${key}:`) + ` ${value.join(', ')}`)
        } else {
          console.log(chalk.cyan(`${key}:`) + ` ${value}`)
        }
      })

      const confirmed = await confirm({
        message: 'Apply these updates?'
      })

      if (isCancel(confirmed) || !confirmed) {
        cancel('Update cancelled')
        return
      }

      const updateSpinner = spinner()
      updateSpinner.start('Updating agent on the blockchain...')

      try {
        // Convert price to lamports if updated
        const updateData: any = { ...updates }
        if (updates.pricePerTask) {
          updateData.pricePerTask = BigInt(Math.floor(parseFloat(updates.pricePerTask) * 1_000_000))
        }

        // Update agent using SDK
        const result = await client.agent.update({
          agentAddress,
          ...updateData
        })

        updateSpinner.stop('✅ Agent updated successfully!')

        console.log('\n' + chalk.green('🎉 Agent has been updated!'))
        console.log(chalk.gray(`Agent Address: ${agentAddress.toString()}`))
        console.log(chalk.gray('Changes will take effect immediately'))
        console.log('')
        console.log(chalk.cyan('Transaction:'), getExplorerUrl(result.signature, 'devnet'))

        outro('Agent update completed')
      } catch (error: any) {
        updateSpinner.stop('❌ Update failed')
        throw new Error(handleTransactionError(error))
      }

    } catch (error) {
      cancel(chalk.red('Agent update failed: ' + (error instanceof Error ? error.message : 'Unknown error')))
    }
  })

// Verify agent subcommand (admin only)
agentCommand
  .command('verify')
  .description('Verify an AI agent (admin only)')
  .option('-a, --agent <address>', 'Agent address to verify')
  .option('--auto', 'Auto-verify based on criteria')
  .action(async (options) => {
    intro(chalk.cyan('✅ Agent Verification'))

    try {
      const s = spinner()
      s.start('Loading agents for verification...')
      
      const { client, wallet } = await initializeClient('devnet')
      
      // Check if user has admin privileges
      const isAdmin = await client.agent.isAdmin(wallet.address)
      if (!isAdmin) {
        s.stop('❌ Access denied')
        outro(
          `${chalk.red('You do not have admin privileges to verify agents')}\n\n` +
          `${chalk.gray('Contact the protocol administrators for verification access')}`
        )
        return
      }

      const unverifiedAgents = await client.agent.getUnverifiedAgents()
      s.stop(`✅ Found ${unverifiedAgents.length} agents pending verification`)

      if (unverifiedAgents.length === 0) {
        outro(
          `${chalk.green('All agents are verified!')}\n\n` +
          `${chalk.gray('No agents are currently pending verification')}`
        )
        return
      }

      // Select agent if not provided
      let selectedAgent = options.agent
      if (!selectedAgent) {
        const agentChoice = await select({
          message: 'Select agent to verify:',
          options: unverifiedAgents.map(agent => ({
            value: agent.address,
            label: agent.name || 'Unnamed Agent',
            hint: `${agent.agentType} - ${new Date(Number(agent.registeredAt) * 1000).toLocaleDateString()}`
          }))
        })

        if (isCancel(agentChoice)) {
          cancel('Verification cancelled')
          return
        }

        selectedAgent = agentChoice
      }

      const agent = unverifiedAgents.find(a => a.address === selectedAgent)
      if (!agent) {
        log.error('Agent not found or already verified')
        return
      }

      // Display agent details for review
      log.info(`\n${chalk.bold('🤖 Agent Review:')}\n`)
      log.info(
        `${chalk.gray('Name:')} ${agent.name}\n` +
        `${chalk.gray('Type:')} ${agent.agentType}\n` +
        `${chalk.gray('Owner:')} ${agent.owner}\n` +
        `${chalk.gray('Registered:')} ${new Date(Number(agent.registeredAt) * 1000).toLocaleString()}\n` +
        `${chalk.gray('Capabilities:')} ${agent.capabilities?.join(', ') || 'None listed'}\n` +
        `${chalk.gray('Service Endpoint:')} ${agent.serviceEndpoint || 'Not provided'}\n` +
        `${chalk.gray('Metadata URI:')} ${agent.metadataUri || 'Not provided'}\n`
      )

      // Verification criteria checklist
      const verificationCriteria = [
        { key: 'has_name', label: 'Has descriptive name', check: agent.name && agent.name.length >= 3 },
        { key: 'has_endpoint', label: 'Has valid service endpoint', check: agent.serviceEndpoint && agent.serviceEndpoint.startsWith('http') },
        { key: 'has_capabilities', label: 'Lists specific capabilities', check: agent.capabilities && agent.capabilities.length > 0 },
        { key: 'has_metadata', label: 'Provides metadata URI', check: agent.metadataUri && agent.metadataUri.length > 0 },
        { key: 'recent_activity', label: 'Recent registration (< 30 days)', check: (Date.now() / 1000 - Number(agent.registeredAt)) < (30 * 24 * 60 * 60) }
      ]

      log.info(`\n${chalk.bold('📋 Verification Criteria:')}\n`)
      verificationCriteria.forEach(criteria => {
        const status = criteria.check ? chalk.green('✅') : chalk.red('❌')
        log.info(`${status} ${criteria.label}`)
      })

      const passedCriteria = verificationCriteria.filter(c => c.check).length
      const verificationScore = Math.round((passedCriteria / verificationCriteria.length) * 100)

      log.info(`\n${chalk.bold('📊 Verification Score:')} ${verificationScore}%\n`)

      if (options.auto) {
        // Auto-verify based on score
        if (verificationScore >= 80) {
          log.info(chalk.green('Auto-verification criteria met (≥80%)'))
        } else {
          log.warn(chalk.yellow(`Auto-verification failed (${verificationScore}% < 80%)`))
          outro('Agent requires manual review or improvements')
          return
        }
      } else {
        // Manual verification decision
        const verificationDecision = await select({
          message: `Verify this agent? (Score: ${verificationScore}%)`,
          options: [
            { value: 'approve', label: '✅ APPROVE', hint: 'Grant verification badge' },
            { value: 'reject', label: '❌ REJECT', hint: 'Deny verification with feedback' },
            { value: 'request_info', label: '📝 REQUEST INFO', hint: 'Ask for more information' }
          ]
        })

        if (isCancel(verificationDecision)) {
          cancel('Verification cancelled')
          return
        }

        if (verificationDecision === 'reject') {
          const rejectionReason = await text({
            message: 'Reason for rejection:',
            placeholder: 'Missing service endpoint and capability documentation...',
            validate: (value) => {
              if (!value || value.length < 10) return 'Please provide at least 10 characters explaining the rejection'
            }
          })

          if (isCancel(rejectionReason)) {
            cancel('Verification cancelled')
            return
          }

          s.start('Recording rejection...')
          
          try {
            const signature = await client.agent.rejectVerification(
              wallet,
              address(selectedAgent),
              { reason: rejectionReason }
            )

            s.stop('✅ Rejection recorded')
            
            outro(
              `${chalk.red('❌ Agent Verification Rejected')}\n\n` +
              `${chalk.gray('Reason:')} ${rejectionReason}\n` +
              `${chalk.gray('The agent owner has been notified')}`
            )
            
          } catch (error) {
            s.stop('❌ Failed to record rejection')
            await handleTransactionError(error, 'verification rejection')
          }
          return
        }

        if (verificationDecision === 'request_info') {
          const infoRequest = await text({
            message: 'What additional information is needed?',
            placeholder: 'Please provide a valid HTTPS endpoint for your service...',
            validate: (value) => {
              if (!value || value.length < 10) return 'Please provide at least 10 characters describing what information is needed'
            }
          })

          if (isCancel(infoRequest)) {
            cancel('Verification cancelled')
            return
          }

          s.start('Sending information request...')
          
          try {
            const signature = await client.agent.requestAdditionalInfo(
              wallet,
              address(selectedAgent),
              { request: infoRequest }
            )

            s.stop('✅ Information request sent')
            
            outro(
              `${chalk.yellow('📝 Additional Information Requested')}\n\n` +
              `${chalk.gray('Request:')} ${infoRequest}\n` +
              `${chalk.gray('The agent owner has been notified')}`
            )
            
          } catch (error) {
            s.stop('❌ Failed to send request')
            await handleTransactionError(error, 'information request')
          }
          return
        }
      }

      // Approve verification
      const verificationNotes = await text({
        message: 'Verification notes (optional):',
        placeholder: 'Agent meets all verification criteria and provides clear service description...',
        validate: (value) => {
          if (value && value.length > 300) return 'Notes must be less than 300 characters'
        }
      })

      if (isCancel(verificationNotes)) {
        cancel('Verification cancelled')
        return
      }

      s.start('Granting verification...')
      
      try {
        const verificationParams = {
          score: verificationScore,
          notes: verificationNotes || '',
          verifiedBy: wallet.address,
          criteria: verificationCriteria.map(c => ({ [c.key]: c.check }))
        }

        const signature = await client.agent.verify(
          wallet,
          address(selectedAgent),
          verificationParams
        )

        s.stop('✅ Agent verified successfully!')

        const explorerUrl = getExplorerUrl(signature, 'devnet')
        
        outro(
          `${chalk.green('✅ Agent Verification Approved!')}\n\n` +
          `${chalk.bold('Agent Details:')}\n` +
          `${chalk.gray('Name:')} ${agent.name}\n` +
          `${chalk.gray('Verification Score:')} ${verificationScore}%\n` +
          `${chalk.gray('Status:')} ${chalk.green('VERIFIED')}\n\n` +
          `${chalk.bold('Transaction:')}\n` +
          `${chalk.gray('Signature:')} ${signature}\n` +
          `${chalk.gray('Explorer:')} ${explorerUrl}\n\n` +
          `${chalk.yellow('💡 The agent now has a verification badge')}`
        )
        
      } catch (error) {
        s.stop('❌ Verification failed')
        await handleTransactionError(error, 'agent verification')
      }
      
    } catch (error) {
      log.error(`Failed to verify agent: ${error.message}`)
    }
  })

// Analytics subcommand
agentCommand
  .command('analytics')
  .description('View agent performance analytics')
  .option('-a, --agent <address>', 'Specific agent address')
  .option('--mine', 'Show analytics for my agents only')
  .option('-p, --period <period>', 'Time period (7d, 30d, 90d, 1y)')
  .action(async (options) => {
    intro(chalk.cyan('📊 Agent Analytics'))

    try {
      const s = spinner()
      s.start('Loading analytics data...')
      
      const { client, wallet } = await initializeClient('devnet')
      
      let analytics
      if (options.agent) {
        analytics = await client.agent.getAgentAnalytics(address(options.agent), {
          period: options.period || '30d'
        })
      } else if (options.mine) {
        analytics = await client.agent.getAnalyticsForOwner(wallet.address, {
          period: options.period || '30d'
        })
      } else {
        analytics = await client.agent.getMarketplaceAnalytics({
          period: options.period || '30d'
        })
      }

      s.stop('✅ Analytics loaded')

      // Display analytics dashboard
      log.info(`\n${chalk.bold('📈 Performance Overview:')}`)
      log.info('─'.repeat(30))
      
      if (options.agent || options.mine) {
        // Individual agent or user analytics
        log.info(
          `${chalk.gray('Active Agents:')} ${analytics.activeAgents}\n` +
          `${chalk.gray('Total Jobs Completed:')} ${analytics.totalJobs}\n` +
          `${chalk.gray('Success Rate:')} ${(analytics.successRate * 100).toFixed(1)}%\n` +
          `${chalk.gray('Average Rating:')} ${analytics.averageRating?.toFixed(1) || 'No ratings'} ⭐\n` +
          `${chalk.gray('Total Earnings:')} ${(Number(analytics.totalEarnings) / 1_000_000_000).toFixed(3)} SOL\n`
        )

        if (analytics.jobsByCategory) {
          log.info(`\n${chalk.bold('📋 Jobs by Category:')}`)
          Object.entries(analytics.jobsByCategory).forEach(([category, count]) => {
            log.info(`   ${chalk.gray(category + ':')} ${count}`)
          })
        }

        if (analytics.earningsTrend) {
          log.info(`\n${chalk.bold('💰 Earnings Trend:')}`)
          analytics.earningsTrend.forEach(point => {
            const date = new Date(Number(point.timestamp) * 1000).toLocaleDateString()
            const earningsSOL = (Number(point.earnings) / 1_000_000_000).toFixed(3)
            log.info(`   ${chalk.gray(date + ':')} ${earningsSOL} SOL`)
          })
        }

        if (analytics.topClients && analytics.topClients.length > 0) {
          log.info(`\n${chalk.bold('👥 Top Clients:')}`)
          analytics.topClients.slice(0, 5).forEach((client, index) => {
            log.info(
              `   ${index + 1}. ${client.address}\n` +
              `      ${chalk.gray('Jobs:')} ${client.jobCount} | ${chalk.gray('Spent:')} ${(Number(client.totalSpent) / 1_000_000_000).toFixed(3)} SOL`
            )
          })
        }

      } else {
        // Marketplace-wide analytics
        log.info(
          `${chalk.gray('Total Agents:')} ${analytics.totalAgents}\n` +
          `${chalk.gray('Verified Agents:')} ${analytics.verifiedAgents} (${((analytics.verifiedAgents / analytics.totalAgents) * 100).toFixed(1)}%)\n` +
          `${chalk.gray('Active Agents:')} ${analytics.activeAgents}\n` +
          `${chalk.gray('Total Jobs:')} ${analytics.totalJobs}\n` +
          `${chalk.gray('Marketplace Volume:')} ${(Number(analytics.totalVolume) / 1_000_000_000).toFixed(3)} SOL\n`
        )

        if (analytics.topCategories) {
          log.info(`\n${chalk.bold('🏆 Popular Categories:')}`)
          analytics.topCategories.slice(0, 5).forEach((category, index) => {
            log.info(`   ${index + 1}. ${category.name} (${category.agentCount} agents)`)
          })
        }

        if (analytics.topPerformers) {
          log.info(`\n${chalk.bold('⭐ Top Performing Agents:')}`)
          analytics.topPerformers.slice(0, 5).forEach((agent, index) => {
            log.info(
              `   ${index + 1}. ${agent.name}\n` +
              `      ${chalk.gray('Rating:')} ${agent.rating.toFixed(1)} ⭐ | ${chalk.gray('Jobs:')} ${agent.completedJobs}`
            )
          })
        }

        if (analytics.growthMetrics) {
          log.info(`\n${chalk.bold('📈 Growth Metrics:')}`)
          log.info(
            `   ${chalk.gray('New Agents (30d):')} ${analytics.growthMetrics.newAgents}\n` +
            `   ${chalk.gray('Job Growth:')} ${analytics.growthMetrics.jobGrowthRate > 0 ? '+' : ''}${(analytics.growthMetrics.jobGrowthRate * 100).toFixed(1)}%\n` +
            `   ${chalk.gray('Volume Growth:')} ${analytics.growthMetrics.volumeGrowthRate > 0 ? '+' : ''}${(analytics.growthMetrics.volumeGrowthRate * 100).toFixed(1)}%`
          )
        }
      }

      // Performance insights
      if (analytics.insights && analytics.insights.length > 0) {
        log.info(`\n${chalk.bold('💡 Performance Insights:')}`)
        analytics.insights.forEach(insight => {
          const icon = insight.type === 'positive' ? '📈' : insight.type === 'negative' ? '📉' : '💡'
          log.info(`   ${icon} ${insight.message}`)
        })
      }

      outro(
        `${chalk.yellow('💡 Analytics Tips:')}\n` +
        `• Monitor success rates and ratings regularly\n` +
        `• Focus on high-demand capability categories\n` +
        `• Engage with top clients for repeat business\n\n` +
        `${chalk.cyan('npx ghostspeak agent analytics --mine')} - View your agent analytics`
      )
      
    } catch (error) {
      log.error(`Failed to load analytics: ${error.message}`)
    }
  })

// Agent credential management commands
agentCommand
  .command('credentials')
  .description('Manage agent credentials')
  .action(async () => {
    intro(chalk.cyan('🔐 Agent Credentials Manager'))

    try {
      const { wallet } = await initializeClient('devnet')
      
      const action = await select({
        message: 'What would you like to do?',
        options: [
          { value: 'list', label: '📋 List all agent credentials' },
          { value: 'show', label: '👁️  Show agent details' },
          { value: 'backup', label: '💾 Backup agent credentials' },
          { value: 'restore', label: '📥 Restore agent credentials' },
          { value: 'delete', label: '🗑️  Delete agent credentials' }
        ]
      })

      if (isCancel(action)) {
        cancel('Operation cancelled')
        return
      }

      switch (action) {
        case 'list':
          await listCredentials(wallet.address)
          break
        case 'show':
          await showCredentials(wallet.address)
          break
        case 'backup':
          await backupCredentials(wallet.address)
          break
        case 'restore':
          await restoreCredentials()
          break
        case 'delete':
          await deleteCredentials(wallet.address)
          break
      }

      outro('Credential management completed')
    } catch (error) {
      cancel(chalk.red('Error: ' + (error instanceof Error ? error.message : 'Unknown error')))
    }
  })

// UUID lookup command
agentCommand
  .command('uuid')
  .description('Look up agent by UUID')
  .argument('[uuid]', 'Agent UUID')
  .action(async (uuid) => {
    intro(chalk.cyan('🔍 Agent UUID Lookup'))

    try {
      if (!uuid) {
        uuid = await text({
          message: 'Enter agent UUID:',
          placeholder: 'e.g., 550e8400-e29b-41d4-a716-446655440000',
          validate: (value) => {
            if (!value) return 'UUID is required'
            if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) {
              return 'Invalid UUID format'
            }
          }
        })

        if (isCancel(uuid)) {
          cancel('Lookup cancelled')
          return
        }
      }

      const s = spinner()
      s.start('Looking up agent...')
      
      const credentials = await AgentWalletManager.loadCredentialsByUuid(uuid as string)
      
      if (!credentials) {
        s.stop('❌ Agent not found')
        console.log(chalk.yellow('\nAgent not found for UUID: ' + uuid))
        outro('Make sure the UUID is correct and the agent is registered on this device')
        return
      }

      s.stop('✅ Agent found')

      console.log('\n' + chalk.bold('🤖 Agent Details:'))
      console.log('─'.repeat(50))
      console.log(chalk.cyan('Name:') + ` ${credentials.name}`)
      console.log(chalk.cyan('Agent ID:') + ` ${credentials.agentId}`)
      console.log(chalk.cyan('UUID:') + ` ${credentials.uuid}`)
      console.log(chalk.cyan('Description:') + ` ${credentials.description}`)
      console.log(chalk.cyan('Agent Wallet:') + ` ${credentials.agentWallet.publicKey}`)
      console.log(chalk.cyan('Owner:') + ` ${credentials.ownerWallet}`)
      console.log(chalk.cyan('Created:') + ` ${new Date(credentials.createdAt).toLocaleString()}`)
      console.log(chalk.cyan('Updated:') + ` ${new Date(credentials.updatedAt).toLocaleString()}`)
      
      if (credentials.cnftMint) {
        console.log(chalk.cyan('CNFT Mint:') + ` ${credentials.cnftMint}`)
      }
      
      if (credentials.merkleTree) {
        console.log(chalk.cyan('Merkle Tree:') + ` ${credentials.merkleTree}`)
      }

      outro('Agent lookup completed')
    } catch (error) {
      cancel(chalk.red('Lookup failed: ' + (error instanceof Error ? error.message : 'Unknown error')))
    }
  })

// Helper functions for credential management
async function listCredentials(ownerAddress: Address) {
  const s = spinner()
  s.start('Loading agent credentials...')
  
  const credentials = await AgentWalletManager.getAgentsByOwner(ownerAddress)
  
  s.stop('✅ Credentials loaded')
  
  if (credentials.length === 0) {
    console.log('\n' + chalk.yellow('No agent credentials found'))
    return
  }

  console.log('\n' + chalk.bold(`🔐 Your Agent Credentials (${credentials.length})`))
  console.log('═'.repeat(70))

  credentials.forEach((cred, index) => {
    console.log(chalk.cyan(`${index + 1}. ${cred.name}`))
    console.log(chalk.gray(`   Agent ID: ${cred.agentId}`))
    console.log(chalk.gray(`   UUID: ${cred.uuid}`))
    console.log(chalk.gray(`   Agent Wallet: ${cred.agentWallet.publicKey}`))
    console.log(chalk.gray(`   Created: ${new Date(cred.createdAt).toLocaleString()}`))
    console.log(chalk.gray(`   CNFT: ${cred.cnftMint ? '✅ Yes' : '❌ No'}`))
    console.log('')
  })
}

async function showCredentials(ownerAddress: Address) {
  const credentials = await AgentWalletManager.getAgentsByOwner(ownerAddress)
  
  if (credentials.length === 0) {
    console.log('\n' + chalk.yellow('No agent credentials found'))
    return
  }

  const selectedAgentId = await select({
    message: 'Select agent to view details:',
    options: credentials.map(cred => ({
      value: cred.agentId,
      label: `${cred.name} (${cred.uuid})`
    }))
  })

  if (isCancel(selectedAgentId)) {
    return
  }

  const selectedCredentials = credentials.find(cred => cred.agentId === selectedAgentId)
  
  if (!selectedCredentials) {
    console.log(chalk.red('Agent not found'))
    return
  }

  console.log('\n' + chalk.bold('🔐 Agent Credentials:'))
  console.log('─'.repeat(50))
  console.log(chalk.cyan('Name:') + ` ${selectedCredentials.name}`)
  console.log(chalk.cyan('Agent ID:') + ` ${selectedCredentials.agentId}`)
  console.log(chalk.cyan('UUID:') + ` ${selectedCredentials.uuid}`)
  console.log(chalk.cyan('Description:') + ` ${selectedCredentials.description}`)
  console.log(chalk.cyan('Agent Wallet:') + ` ${selectedCredentials.agentWallet.publicKey}`)
  console.log(chalk.cyan('Owner:') + ` ${selectedCredentials.ownerWallet}`)
  console.log(chalk.cyan('Created:') + ` ${new Date(selectedCredentials.createdAt).toLocaleString()}`)
  console.log(chalk.cyan('Updated:') + ` ${new Date(selectedCredentials.updatedAt).toLocaleString()}`)
  
  if (selectedCredentials.cnftMint) {
    console.log(chalk.cyan('CNFT Mint:') + ` ${selectedCredentials.cnftMint}`)
    console.log(chalk.cyan('Merkle Tree:') + ` ${selectedCredentials.merkleTree}`)
  }
}

async function backupCredentials(ownerAddress: Address) {
  const credentials = await AgentWalletManager.getAgentsByOwner(ownerAddress)
  
  if (credentials.length === 0) {
    console.log('\n' + chalk.yellow('No agent credentials found'))
    return
  }

  const backupType = await select({
    message: 'Backup type:',
    options: [
      { value: 'single', label: '📄 Single agent backup' },
      { value: 'all', label: '📦 Backup all agents' }
    ]
  })

  if (isCancel(backupType)) {
    return
  }

  if (backupType === 'single') {
    const selectedAgentId = await select({
      message: 'Select agent to backup:',
      options: credentials.map(cred => ({
        value: cred.agentId,
        label: `${cred.name} (${cred.uuid})`
      }))
    })

    if (isCancel(selectedAgentId)) {
      return
    }

    const backupPath = await text({
      message: 'Backup file path:',
      placeholder: `./agent-backup-${selectedAgentId}.json`,
      validate: (value) => {
        if (!value) return 'Backup path is required'
      }
    })

    if (isCancel(backupPath)) {
      return
    }

    const s = spinner()
    s.start('Creating backup...')
    
    try {
      await AgentBackupManager.backupAgent(selectedAgentId as string, backupPath as string)
      s.stop('✅ Backup created')
      console.log(chalk.green(`\n✅ Agent backup saved to: ${backupPath}`))
    } catch (error) {
      s.stop('❌ Backup failed')
      console.log(chalk.red('Backup failed: ' + (error instanceof Error ? error.message : 'Unknown error')))
    }
  } else {
    const backupDir = await text({
      message: 'Backup directory:',
      placeholder: './agent-backups',
      validate: (value) => {
        if (!value) return 'Backup directory is required'
      }
    })

    if (isCancel(backupDir)) {
      return
    }

    const s = spinner()
    s.start('Creating backups...')
    
    try {
      await AgentBackupManager.backupAllAgents(ownerAddress, backupDir as string)
      s.stop('✅ Backups created')
      console.log(chalk.green(`\n✅ All agent backups saved to: ${backupDir}`))
    } catch (error) {
      s.stop('❌ Backup failed')
      console.log(chalk.red('Backup failed: ' + (error instanceof Error ? error.message : 'Unknown error')))
    }
  }
}

async function restoreCredentials() {
  const backupPath = await text({
    message: 'Backup file path:',
    placeholder: './agent-backup.json',
    validate: (value) => {
      if (!value) return 'Backup path is required'
    }
  })

  if (isCancel(backupPath)) {
    return
  }

  const s = spinner()
  s.start('Restoring agent...')
  
  try {
    const agentId = await AgentBackupManager.restoreAgent(backupPath as string)
    s.stop('✅ Agent restored')
    console.log(chalk.green(`\n✅ Agent restored: ${agentId}`))
  } catch (error) {
    s.stop('❌ Restore failed')
    console.log(chalk.red('Restore failed: ' + (error instanceof Error ? error.message : 'Unknown error')))
  }
}

async function deleteCredentials(ownerAddress: Address) {
  const credentials = await AgentWalletManager.getAgentsByOwner(ownerAddress)
  
  if (credentials.length === 0) {
    console.log('\n' + chalk.yellow('No agent credentials found'))
    return
  }

  const selectedAgentId = await select({
    message: 'Select agent to delete:',
    options: credentials.map(cred => ({
      value: cred.agentId,
      label: `${cred.name} (${cred.uuid})`
    }))
  })

  if (isCancel(selectedAgentId)) {
    return
  }

  const selectedCredentials = credentials.find(cred => cred.agentId === selectedAgentId)
  
  if (!selectedCredentials) {
    console.log(chalk.red('Agent not found'))
    return
  }

  console.log('\n' + chalk.bold('⚠️  WARNING: This will permanently delete agent credentials'))
  console.log(chalk.red('Agent to delete:') + ` ${selectedCredentials.name}`)
  console.log(chalk.red('UUID:') + ` ${selectedCredentials.uuid}`)
  console.log(chalk.yellow('This action cannot be undone!'))

  const confirmed = await confirm({
    message: 'Are you sure you want to delete these credentials?'
  })

  if (isCancel(confirmed) || !confirmed) {
    console.log(chalk.gray('Deletion cancelled'))
    return
  }

  const s = spinner()
  s.start('Deleting credentials...')
  
  try {
    await AgentWalletManager.deleteCredentials(selectedCredentials.agentId)
    s.stop('✅ Credentials deleted')
    console.log(chalk.green(`\n✅ Agent credentials deleted: ${selectedCredentials.name}`))
  } catch (error) {
    s.stop('❌ Deletion failed')
    console.log(chalk.red('Deletion failed: ' + (error instanceof Error ? error.message : 'Unknown error')))
  }
}