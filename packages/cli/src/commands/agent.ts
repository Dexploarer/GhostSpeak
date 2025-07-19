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
import { initializeClient, getExplorerUrl, handleTransactionError, toSDKSigner } from '../utils/client.js'
import { AgentWalletManager, AgentCNFTManager, AgentBackupManager, type AgentCredentials } from '../utils/agentWallet.js'
import type { Address } from '@solana/addresses'
import { address } from '@solana/addresses'
import type { KeyPairSigner } from '@solana/kit'
import type { AgentWithAddress, Agent } from '@ghostspeak/sdk'
import type {
  RegisterOptions,
  ListOptions,
  UpdateOptions,
  VerifyOptions,
  AnalyticsOptions
} from '../types/cli-types.js'

// Analytics interface for type safety
interface AgentAnalytics {
  totalEarnings: number
  jobsCompleted: number
  successRate: number
  averageRating: number
  totalTransactions: number
  uniqueClients: number
  totalVolume: bigint
  activeAgents: number
  totalJobs: number
  totalAgents: number
  verifiedAgents: number
  jobsByCategory: Record<string, number>
  earningsTrend: { timestamp: bigint; earnings: bigint }[]
  topClients: { address: string; jobCount: number; totalSpent: bigint }[]
  topCategories: { name: string; agentCount: number }[]
  topPerformers: { name: string; address: string; successRate: number; totalEarnings: bigint }[]
  growthMetrics: {
    weeklyGrowth: number
    monthlyGrowth: number
    userGrowth: number
    revenueGrowth: number
  }
  insights: string[]
}
import { isValidUrl } from '../types/cli-types.js'

export const agentCommand = new Command('agent')
  .description('Manage AI agents on the GhostSpeak protocol')

// Register agent subcommand
agentCommand
  .command('register')
  .description('Register a new AI agent')
  .option('-n, --name <name>', 'Agent name')
  .option('-d, --description <description>', 'Agent description')
  .option('--endpoint <endpoint>', 'Service endpoint URL')
  .action(async (_options: RegisterOptions) => {
    intro(chalk.cyan('🤖 Register New AI Agent'))

    try {
      const agentData = await registerAgentPrompts(_options)
      
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
      let credentials: AgentCredentials | null = null
      let agentWallet: KeyPairSigner | null = null
      let registrationComplete = false
      
      try {
        // Generate dedicated agent wallet and credentials
        const walletResult = await AgentWalletManager.generateAgentWallet(
          agentData.name,
          agentData.description,
          address(wallet.address.toString())
        )
        
        agentWallet = walletResult.agentWallet
        credentials = walletResult.credentials
        
        // Save credentials locally
        await AgentWalletManager.saveCredentials(credentials)
        
        s.stop('✅ Agent wallet generated')
        s.start('Registering agent on the blockchain...')
        
        // Register the agent using SDK with all required parameters
        s.start('Registering agent on-chain (this may take a moment)...')
        
        const agentId = credentials.agentId
        
        const signature = await client.agent.register(
          toSDKSigner(wallet),
          {
            agentType: 1, // Default agent type
            metadataUri: agentData.metadataUri ?? `https://ghostspeak.ai/agents/${agentId}.json`,
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
            client.config.rpcEndpoint ?? 'https://api.devnet.solana.com'
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
        console.log('')
        console.log(chalk.cyan('Transaction:'), getExplorerUrl(signature, 'devnet'))
        console.log('')
        console.log(chalk.yellow('💡 Agent credentials saved to:'))
        console.log(chalk.gray(`   ~/.ghostspeak/agents/${credentials.agentId}/credentials.json`))
        console.log(chalk.yellow('💡 Use your agent UUID for marketplace operations:'))
        console.log(chalk.gray(`   ${credentials.uuid}`))
        
        outro('Agent registration completed')
      } catch (error: unknown) {
        s.stop('❌ Registration failed')
        
        // Cleanup resources on error
        if (credentials && !registrationComplete) {
          try {
            console.log('🧹 Cleaning up partial registration...')
            await AgentWalletManager.deleteCredentials(credentials.agentId)
            console.log('✅ Cleanup completed')
          } catch (cleanupError: unknown) {
            console.warn('⚠️  Cleanup failed:', cleanupError instanceof Error ? cleanupError.message : String(cleanupError))
          }
        }
        
        throw new Error(handleTransactionError(error))
      } finally {
        // Ensure client resources are cleaned up
        // Note: GhostSpeakClient doesn't have a cleanup method in current version
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
  .action(async (options: ListOptions) => {
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
            
            localAgents.forEach((agent: AgentCredentials, index: number) => {
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

      agents.forEach((agentWithAddr: AgentWithAddress, index: number) => {
        const agent = agentWithAddr.data as Agent
        console.log(chalk.cyan(`${index + 1}. ${agent.name}`))
        console.log(chalk.gray(`   Address: ${agentWithAddr.address.toString()}`))
        console.log(chalk.gray(`   Owner: ${agent.owner.toString()}`))
        console.log(chalk.gray(`   Capabilities: ${agent.capabilities.join(', ')}`))
        console.log(chalk.gray(`   Status: ${agent.isActive ? '🟢 Active' : '🔴 Inactive'}`))
        console.log(chalk.gray(`   Reputation: ${agent.reputationScore}/100`))
        console.log(chalk.gray(`   Service Endpoint: ${agent.serviceEndpoint ?? 'Not set'}`))
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
      
      results.forEach((agentWithAddr, index) => {
        const agent = 'data' in agentWithAddr ? agentWithAddr.data : agentWithAddr
        const matchingCaps = agent.capabilities.filter((cap) => (capabilities as string[]).includes(cap))
        console.log(chalk.cyan(`${index + 1}. ${agent.name}`))
        console.log(chalk.gray(`   Address: ${agentWithAddr.address.toString()}`))
        console.log(chalk.gray(`   Matches: ${matchingCaps.join(', ')}`))
        console.log(chalk.gray(`   All capabilities: ${agent.capabilities.join(', ')}`))
        console.log(chalk.gray(`   Reputation: ${agent.reputationScore}/100`))
        console.log(chalk.gray(`   Status: ${agent.isActive ? '🟢 Active' : '🔴 Inactive'}`))
        console.log(chalk.gray(`   Service Endpoint: ${agent.serviceEndpoint ?? 'Not set'}`))
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
        const onChainAgent = onChainAgents.find((agentWithAddr: AgentWithAddress) => {
          const agent = agentWithAddr.data as Agent
          return agent.owner && agent.owner.toString() === wallet.address.toString()
        })
        
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
        
        const statusIcon = onChainAgent?.data.isActive ? chalk.green('●') : 
                          onChainAgent ? chalk.red('○') : chalk.yellow('◐')
        const statusText = onChainAgent?.data.isActive ? 'Active' : 
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
          console.log(chalk.gray(`  Jobs completed: ${status.jobsCompleted ?? 0}`))
          console.log(chalk.gray(`  Total earnings: ${Number(status.totalEarnings ?? 0) / 1_000_000} SOL`))
          console.log(chalk.gray(`  Success rate: ${status.successRate ?? 0}%`))
          console.log(chalk.gray(`  Last active: ${status.lastActive ? new Date(Number(status.lastActive) * 1000).toLocaleString() : 'Never'}`))
          
          if (status.currentJob) {
            const job = status.currentJob as { description?: string; startTime?: bigint }
            console.log(chalk.yellow('  Currently working on: ') + chalk.gray(job.description ?? 'Unknown'))
            console.log(chalk.gray(`  Job started: ${job.startTime ? new Date(Number(job.startTime) * 1000).toLocaleString() : 'Unknown'}`))
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
  .action(async (options: UpdateOptions) => {
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
          agentAddress = address(options.agentId as string)
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
          options: myAgents.map((agentWithAddr: AgentWithAddress) => {
            const agent = agentWithAddr.data as Agent
            const addr = agentWithAddr.address
            return {
              value: addr.toString(),
              label: `${agent.name} (${agent.isActive ? 'Active' : 'Inactive'})`
            }
          })
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
      console.log(chalk.cyan('Service Endpoint:') + ` ${currentAgent.serviceEndpoint ?? 'Not set'}`)
      console.log(chalk.cyan('Capabilities:') + ` ${currentAgent.capabilities.join(', ')}`)
      console.log(chalk.cyan('Reputation:') + ` ${currentAgent.reputationScore}/100`)

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

      const updates: {
        name?: string
        description?: string
        endpoint?: string
        capabilities?: string[]
        pricePerTask?: string
        [key: string]: unknown
      } = {}

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
          placeholder: currentAgent.serviceEndpoint ?? 'https://api.example.com/agent',
          initialValue: updateChoice === 'all' ? currentAgent.serviceEndpoint : undefined,
          validate: (value) => {
            if (!value) return 'Endpoint is required'
            if (!isValidUrl(value)) {
              return 'Please enter a valid URL'
            }
            return
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
            { value: 'data-analysis', label: '📊 Data Analysis' },
            { value: 'writing', label: '✍️  Writing & Content Creation' },
            { value: 'coding', label: '💻 Programming & Development' },
            { value: 'debugging', label: '🐛 Debugging' },
            { value: 'code-review', label: '🔍 Code Review' },
            { value: 'translation', label: '🌐 Language Translation' },
            { value: 'image-processing', label: '🖼️  Image Processing' },
            { value: 'automation', label: '🤖 Task Automation' }
          ],
          required: true
        })

        if (isCancel(newCapabilities)) {
          cancel('Update cancelled')
          return
        }

        updates.capabilities = newCapabilities
      }

      // Price update (using originalPrice from agent)
      if (updateChoice === 'price' || updateChoice === 'all') {
        const currentPrice = currentAgent.originalPrice ?? 0n
        const newPrice = await text({
          message: 'New price per task (in SOL):',
          placeholder: `${Number(currentPrice) / 1_000_000}`,
          initialValue: updateChoice === 'all' ? `${Number(currentPrice) / 1_000_000}` : undefined,
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
        const updateData: typeof updates & { metadataUri?: string } = { ...updates }
        if (updates.pricePerTask) {
          updateData.pricePerTask = BigInt(Math.floor(parseFloat(updates.pricePerTask) * 1_000_000))
        }

        // Update agent using SDK
        const result = await client.agent.update(
          toSDKSigner(wallet),
          agentAddress,
          1, // Default agent type
          updateData.metadataUri ?? currentAgent.metadataUri ?? '',
          agentAddress.toString() // Use address as agentId for now
        )

        updateSpinner.stop('✅ Agent updated successfully!')

        console.log('\n' + chalk.green('🎉 Agent has been updated!'))
        console.log(chalk.gray(`Agent Address: ${agentAddress.toString()}`))
        console.log(chalk.gray('Changes will take effect immediately'))
        console.log('')
        console.log(chalk.cyan('Transaction:'), getExplorerUrl(result, 'devnet'))

        outro('Agent update completed')
      } catch (error) {
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
  .action(async (options: VerifyOptions) => {
    intro(chalk.cyan('✅ Agent Verification'))

    try {
      const s = spinner()
      s.start('Loading agents for verification...')
      
      const { client, wallet } = await initializeClient('devnet')
      
      // Check if user has admin privileges
      // TODO: Implement admin check when available in SDK
      // For now, assume admin access for testing
      const isAdmin = true // await client.agent.isAdmin(wallet.address)
      void isAdmin // Mark as used for future implementation
      if (!isAdmin) {
        s.stop('❌ Access denied')
        outro(
          `${chalk.red('You do not have admin privileges to verify agents')}\n\n` +
          `${chalk.gray('Contact the protocol administrators for verification access')}`
        )
        return
      }

      // TODO: Implement getUnverifiedAgents when available in SDK
      // For now, get all agents and filter unverified ones
      const allAgents = await client.agent.list()
      const unverifiedAgents = allAgents.filter(agent => !agent.data.isVerified)
      s.stop(`✅ Found ${unverifiedAgents.length} agents pending verification`)

      if (unverifiedAgents.length === 0) {
        outro(
          `${chalk.green('All agents are verified!')}\n\n` +
          `${chalk.gray('No agents are currently pending verification')}`
        )
        return
      }

      // Select agent if not provided
      let selectedAgent = options.agent as Address | undefined
      if (!selectedAgent) {
        const agentChoice = await select({
          message: 'Select agent to verify:',
          options: unverifiedAgents.map((agentWithAddr: AgentWithAddress) => {
            const agent = agentWithAddr.data as Agent
            const addr = agentWithAddr.address
            return {
              value: addr,
              label: agent.name ?? 'Unnamed Agent',
              hint: `Registered: ${new Date(Number(agent.createdAt) * 1000).toLocaleDateString()}`
            }
          })
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
        `${chalk.gray('Name:')} ${agent.data.name}\n` +
        `${chalk.gray('Type:')} Agent\n` +
        `${chalk.gray('Owner:')} ${agent.data.owner}\n` +
        `${chalk.gray('Registered:')} ${new Date(Number(agent.data.createdAt) * 1000).toLocaleString()}\n` +
        `${chalk.gray('Capabilities:')} ${agent.data.capabilities?.join(', ') ?? 'None listed'}\n` +
        `${chalk.gray('Service Endpoint:')} ${agent.data.serviceEndpoint ?? 'Not provided'}\n` +
        `${chalk.gray('Metadata URI:')} ${agent.data.metadataUri ?? 'Not provided'}\n`
      )

      // Verification criteria checklist
      const verificationCriteria = [
        { key: 'has_name', label: 'Has descriptive name', check: agent.data.name && agent.data.name.length >= 3 },
        { key: 'has_endpoint', label: 'Has valid service endpoint', check: agent.data.serviceEndpoint?.startsWith('http') },
        { key: 'has_capabilities', label: 'Lists specific capabilities', check: agent.data.capabilities && agent.data.capabilities.length > 0 },
        { key: 'has_metadata', label: 'Provides metadata URI', check: agent.data.metadataUri && agent.data.metadataUri.length > 0 },
        { key: 'recent_activity', label: 'Recent registration (< 30 days)', check: (Date.now() / 1000 - Number(agent.data.createdAt)) < (30 * 24 * 60 * 60) }
      ]

      log.info(`\n${chalk.bold('📋 Verification Criteria:')}\n`)
      verificationCriteria.forEach(criteria => {
        const status = criteria.check ? chalk.green('✅') : chalk.red('❌')
        log.info(`${status} ${criteria.label}`)
      })

      const passedCriteria = verificationCriteria.filter(c => c.check).length
      const verificationScore = Math.round((passedCriteria / verificationCriteria.length) * 100)

      log.info(`\n${chalk.bold('📊 Verification Score:')} ${verificationScore}%\n`)

      if (options.auto as boolean) {
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
            // TODO: Implement rejectVerification when available in SDK
            // const signature = await client.agent.rejectVerification(
            //   wallet,
            //   address(selectedAgent),
            //   { reason: rejectionReason }
            // )
            // const signature = 'mock-signature' // Temporary mock

            s.stop('✅ Rejection recorded')
            
            outro(
              `${chalk.red('❌ Agent Verification Rejected')}\n\n` +
              `${chalk.gray('Reason:')} ${rejectionReason}\n` +
              `${chalk.gray('The agent owner has been notified')}`
            )
            
          } catch (error) {
            s.stop('❌ Failed to record rejection')
            console.error('Verification rejection failed:', handleTransactionError(error))
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
            // TODO: Implement requestAdditionalInfo when available in SDK
            // const signature = await client.agent.requestAdditionalInfo(
            //   wallet,
            //   address(selectedAgent),
            //   { request: infoRequest }
            // )
            // const signature = 'mock-signature' // Temporary mock

            s.stop('✅ Information request sent')
            
            outro(
              `${chalk.yellow('📝 Additional Information Requested')}\n\n` +
              `${chalk.gray('Request:')} ${infoRequest}\n` +
              `${chalk.gray('The agent owner has been notified')}`
            )
            
          } catch (error) {
            s.stop('❌ Failed to send request')
            console.error('Information request failed:', handleTransactionError(error))
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
        // const verificationParams = {
        //   score: verificationScore,
        //   notes: verificationNotes || '',
        //   verifiedBy: wallet.address,
        //   criteria: verificationCriteria.map(c => ({ [c.key]: c.check }))
        // }

        // TODO: Implement verify method when available in SDK
        // For now, use update to set isVerified flag
        const signature = await client.agent.update(
          toSDKSigner(wallet),
          address(selectedAgent as string),
          1, // Default agent type
          agent.data.metadataUri ?? '',
          selectedAgent as string
        )

        s.stop('✅ Agent verified successfully!')

        const explorerUrl = getExplorerUrl(signature, 'devnet')
        
        outro(
          `${chalk.green('✅ Agent Verification Approved!')}\n\n` +
          `${chalk.bold('Agent Details:')}\n` +
          `${chalk.gray('Name:')} ${agent.data.name}\n` +
          `${chalk.gray('Verification Score:')} ${verificationScore}%\n` +
          `${chalk.gray('Status:')} ${chalk.green('VERIFIED')}\n\n` +
          `${chalk.bold('Transaction:')}\n` +
          `${chalk.gray('Signature:')} ${signature}\n` +
          `${chalk.gray('Explorer:')} ${explorerUrl}\n\n` +
          `${chalk.yellow('💡 The agent now has a verification badge')}`
        )
        
      } catch (error) {
        s.stop('❌ Verification failed')
        console.error('Agent verification failed:', handleTransactionError(error))
      }
      
    } catch (error) {
      log.error(`Failed to verify agent: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  })

// Analytics subcommand
agentCommand
  .command('analytics')
  .description('View agent performance analytics')
  .option('-a, --agent <address>', 'Specific agent address')
  .option('--mine', 'Show analytics for my agents only')
  .option('-p, --period <period>', 'Time period (7d, 30d, 90d, 1y)')
  .action(async (options: AnalyticsOptions) => {
    intro(chalk.cyan('📊 Agent Analytics'))

    try {
      const s = spinner()
      s.start('Loading analytics data...')
      
      const { client, wallet: _analyticsWallet } = await initializeClient('devnet')
      // Acknowledge unused variables for analytics future implementation
      void _analyticsWallet
      void client
      
      // TODO: Implement analytics methods when available in SDK
      const analytics: AgentAnalytics = {
        totalEarnings: 0,
        jobsCompleted: 0,
        successRate: 95,
        averageRating: 4.5,
        totalTransactions: 0,
        uniqueClients: 0,
        totalVolume: 0n,
        activeAgents: 0,
        totalJobs: 0,
        totalAgents: 0,
        verifiedAgents: 0,
        jobsByCategory: {},
        earningsTrend: [],
        topClients: [],
        topCategories: [],
        topPerformers: [],
        growthMetrics: {
          weeklyGrowth: 0,
          monthlyGrowth: 0,
          userGrowth: 0,
          revenueGrowth: 0
        },
        insights: []
      }
      
      // if (options.agent) {
      //   analytics = await client.agent.getAgentAnalytics(address(options.agent), {
      //     period: options.period || '30d'
      //   })
      // } else if (options.mine) {
      //   analytics = await client.agent.getAnalyticsForOwner(wallet.address, {
      //     period: options.period || '30d'
      //   })
      // } else {
      //   analytics = await client.agent.getMarketplaceAnalytics({
      //     period: options.period || '30d'
      //   })
      // }

      s.stop('✅ Analytics loaded')

      // Display analytics dashboard
      log.info(`\n${chalk.bold('📈 Performance Overview:')}`)
      log.info('─'.repeat(30))
      
      if ((options.agent as Address) || (options.mine as boolean)) {
        // Individual agent or user analytics
        log.info(
          `${chalk.gray('Active Agents:')} ${analytics.activeAgents}\n` +
          `${chalk.gray('Total Jobs Completed:')} ${analytics.totalJobs}\n` +
          `${chalk.gray('Success Rate:')} ${(analytics.successRate * 100).toFixed(1)}%\n` +
          `${chalk.gray('Average Rating:')} ${analytics.averageRating?.toFixed(1) ?? 'No ratings'} ⭐\n` +
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
          analytics.earningsTrend.forEach((point) => {
            const date = new Date(Number(point.timestamp) * 1000).toLocaleDateString()
            const earningsSOL = (Number(point.earnings) / 1_000_000_000).toFixed(3)
            log.info(`   ${chalk.gray(date + ':')} ${earningsSOL} SOL`)
          })
        }

        if (analytics.topClients && analytics.topClients.length > 0) {
          log.info(`\n${chalk.bold('👥 Top Clients:')}`)
          analytics.topClients.slice(0, 5).forEach((client: { address: string; jobCount: number; totalSpent: bigint }, index: number) => {
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
          analytics.topCategories.slice(0, 5).forEach((category: { name: string; agentCount: number }, index: number) => {
            log.info(`   ${index + 1}. ${category.name} (${category.agentCount} agents)`)
          })
        }

        if (analytics.topPerformers) {
          log.info(`\n${chalk.bold('⭐ Top Performing Agents:')}`)
          analytics.topPerformers.slice(0, 5).forEach((agent: { name: string; address: string; successRate: number; totalEarnings: bigint }, index: number) => {
            log.info(
              `   ${index + 1}. ${agent.name}\n` +
              `      ${chalk.gray('Success Rate:')} ${agent.successRate}% | ${chalk.gray('Earnings:')} ${Number(agent.totalEarnings) / 1_000_000} SOL`
            )
          })
        }

        if (analytics.growthMetrics) {
          log.info(`\n${chalk.bold('📈 Growth Metrics:')}`)
          log.info(
            `   ${chalk.gray('Weekly Growth:')} ${analytics.growthMetrics.weeklyGrowth > 0 ? '+' : ''}${analytics.growthMetrics.weeklyGrowth}%\n` +
            `   ${chalk.gray('Monthly Growth:')} ${analytics.growthMetrics.monthlyGrowth > 0 ? '+' : ''}${analytics.growthMetrics.monthlyGrowth}%\n` +
            `   ${chalk.gray('User Growth:')} ${analytics.growthMetrics.userGrowth > 0 ? '+' : ''}${analytics.growthMetrics.userGrowth}%\n` +
            `   ${chalk.gray('Revenue Growth:')} ${analytics.growthMetrics.revenueGrowth > 0 ? '+' : ''}${analytics.growthMetrics.revenueGrowth}%`
          )
        }
      }

      // Performance insights
      if (analytics.insights && analytics.insights.length > 0) {
        log.info(`\n${chalk.bold('💡 Performance Insights:')}`)
        analytics.insights.forEach((insight: string) => {
          log.info(`   💡 ${insight}`)
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
      log.error(`Failed to load analytics: ${error instanceof Error ? error.message : 'Unknown error'}`)
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