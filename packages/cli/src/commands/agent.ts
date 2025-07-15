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
      
      s.start('Registering agent on the blockchain...')
      
      try {
        // Register the agent using SDK
        const result = await client.agent.register({
          name: agentData.name,
          description: agentData.description,
          endpoint: agentData.endpoint,
          capabilities: agentData.capabilities,
          pricePerTask: BigInt(Math.floor(parseFloat(agentData.pricePerTask) * 1_000_000)) // Convert SOL to lamports
        })
        
        s.stop('✅ Agent registered successfully!')
        
        console.log('\n' + chalk.green('🎉 Your agent has been registered!'))
        console.log(chalk.gray(`Name: ${agentData.name}`))
        console.log(chalk.gray(`Description: ${agentData.description}`))
        console.log(chalk.gray(`Capabilities: ${agentData.capabilities.join(', ')}`))
        console.log(chalk.gray(`Agent Address: ${result.agentAddress.toString()}`))
        console.log('')
        console.log(chalk.cyan('Transaction:'), getExplorerUrl(result.signature, 'devnet'))
        console.log(chalk.cyan('Agent Account:'), getAddressExplorerUrl(result.agentAddress.toString(), 'devnet'))
        
        outro('Agent registration completed')
      } catch (error: any) {
        s.stop('❌ Registration failed')
        throw new Error(handleTransactionError(error))
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

      if (agents.length === 0) {
        console.log('\n' + chalk.yellow('No agents found on the network'))
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
      
      // Get user's agents
      const myAgents = await client.agent.listByOwner({
        owner: wallet.address
      })
      
      s.stop('✅ Status updated')
      
      if (myAgents.length === 0) {
        console.log('\n' + chalk.yellow('You have no registered agents'))
        outro('Register an agent with: npx ghostspeak agent register')
        return
      }

      console.log('\n' + chalk.bold('Your Agents:'))
      console.log('─'.repeat(50))
      
      for (const agent of myAgents) {
        // Get agent status details
        const status = await client.agent.getStatus({
          agentAddress: agent.address
        })
        
        const statusIcon = agent.isActive ? chalk.green('●') : chalk.red('○')
        const statusText = agent.isActive ? 'Active' : 'Inactive'
        
        console.log(`${statusIcon} ${agent.name}` + chalk.gray(` - ${statusText}`))
        console.log(chalk.gray(`  Address: ${agent.address.toString()}`))
        console.log(chalk.gray(`  Jobs completed: ${status.jobsCompleted || 0}`))
        console.log(chalk.gray(`  Total earnings: ${Number(status.totalEarnings || 0) / 1_000_000} SOL`))
        console.log(chalk.gray(`  Success rate: ${status.successRate || 0}%`))
        console.log(chalk.gray(`  Last active: ${status.lastActive ? new Date(Number(status.lastActive) * 1000).toLocaleString() : 'Never'}`))
        
        if (status.currentJob) {
          console.log(chalk.yellow('  Currently working on: ') + chalk.gray(status.currentJob.description))
          console.log(chalk.gray(`  Job started: ${new Date(Number(status.currentJob.startTime) * 1000).toLocaleString()}`))
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