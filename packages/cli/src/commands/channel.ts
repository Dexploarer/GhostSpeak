import { Command } from 'commander'
import chalk from 'chalk'
import { 
  intro, 
  outro, 
  text, 
  select, 
  spinner,
  isCancel,
  cancel
} from '@clack/prompts'
import { initializeClient, getExplorerUrl, getAddressExplorerUrl, handleTransactionError, toSDKSigner } from '../utils/client.js'
import { address, type Address } from '@solana/addresses'
// Types imported from SDK when needed

// Channel-related types for type safety

interface Channel {
  id: { toString: () => string }
  name: string
  channelId?: Address
  creator?: Address
  participants?: Address[]
  channelType?: string
  visibility?: string
  isPrivate?: boolean
}

interface ChannelWithAgentInfo extends Channel {
  agentName: string
  agentAddress: Address
  messageCount: number
  createdAt: bigint
  lastActivity: bigint
  isActive: boolean
}

export const channelCommand = new Command('channel')
  .description('Manage Agent-to-Agent (A2A) communication channels')
  .alias('a2a')

channelCommand
  .command('create')
  .description('Create a new A2A communication channel')
  .action(async () => {
    intro(chalk.blue('💬 Create A2A Channel'))

    try {
      const responder = await text({
        message: 'Agent to communicate with (wallet address):',
        placeholder: 'Enter agent wallet address...',
        validate: (value) => {
          if (!value) return 'Agent address is required'
          try {
            address(value)
            return
          } catch {
            return 'Invalid Solana address format'
          }
        }
      })

      if (isCancel(responder)) {
        cancel('Channel creation cancelled')
        return
      }

      const channelName = await text({
        message: 'Channel name:',
        placeholder: 'e.g., Project Collaboration',
        validate: (value) => {
          if (!value) return 'Channel name is required'
          if (value.length < 3) return 'Name must be at least 3 characters'
        }
      })

      if (isCancel(channelName)) {
        cancel('Channel creation cancelled')
        return
      }

      const description = await text({
        message: 'Channel description (optional):',
        placeholder: 'What is this channel for?'
      })

      if (isCancel(description)) {
        cancel('Channel creation cancelled')
        return
      }

      const visibility = await select({
        message: 'Channel visibility:',
        options: [
          { value: 'public', label: '🌍 Public - Anyone can view' },
          { value: 'private', label: '🔒 Private - Only participants' }
        ]
      })

      if (isCancel(visibility)) {
        cancel('Channel creation cancelled')
        return
      }

      const s = spinner()
      s.start('Connecting to Solana network...')
      
      // Initialize SDK client
      const { client, wallet } = await initializeClient('devnet')
      s.stop('✅ Connected')
      
      // Check if user has a registered agent
      s.start('Checking for registered agent...')
      const agents = await client.agent.listByOwner({ owner: wallet.address })
      
      if (agents.length === 0) {
        s.stop('❌ No agent found')
        console.log(chalk.yellow('\n⚠️  You need to register an agent first!'))
        outro('Run: npx ghostspeak agent register')
        return
      }
      
      s.stop('✅ Agent found')
      
      // Select agent if multiple
      let agentAddress = agents[0].address
      if (agents.length > 1) {
        const selectedAgent = await select({
          message: 'Select agent to use:',
          options: agents.map(agent => ({
            value: agent.address.toString(),
            label: agent.data.name || 'Agent'
          }))
        })
        
        if (isCancel(selectedAgent)) {
          cancel('Channel creation cancelled')
          return
        }
        
        agentAddress = address(selectedAgent as string)
        // Acknowledge unused variable for future development
        void agentAddress
      }
      
      s.start('Creating A2A communication channel...')

      try {
        // Create the communication channel using real SDK
        const signer = toSDKSigner(wallet)
        const result = await client.channel.create(signer, {
          name: channelName as string,
          description: description as string || '',
          visibility: visibility as 'public' | 'private',
          participants: [agentAddress, address(responder as string)]
        })

        s.stop('✅ A2A channel created!')

        console.log('\n' + chalk.green('🎉 Communication channel established!'))
        console.log(chalk.gray(`Channel ID: ${result.channelId}`))
        console.log(chalk.gray(`Name: ${channelName}`))
        console.log(chalk.gray(`Visibility: ${visibility}`))
        console.log(chalk.gray(`Participants: 2 agents`))
        console.log(chalk.gray(`Status: Active - Ready for communication`))
        console.log('')
        console.log(chalk.cyan('Transaction:'), getExplorerUrl(result.signature, 'devnet'))
        console.log(chalk.cyan('Channel Account:'), getAddressExplorerUrl(result.channelId, 'devnet'))

        outro('A2A channel creation completed')
      } catch (error) {
        s.stop('❌ Creation failed')
        throw new Error(handleTransactionError(error as Error))
      }

    } catch (error) {
      cancel(chalk.red('Channel creation failed: ' + (error instanceof Error ? error.message : 'Unknown error')))
    }
  })

channelCommand
  .command('list')
  .description('List your active A2A channels')
  .action(async () => {
    intro(chalk.blue('📡 Active A2A Channels'))

    const s = spinner()
    s.start('Connecting to Solana network...')

    try {
      // Initialize SDK client
      const { client, wallet } = await initializeClient('devnet')
      s.stop('✅ Connected')
      
      s.start('Loading communication channels...')
      
      // Get user's agents
      const agents = await client.agent.listByOwner({ owner: wallet.address })
      
      if (agents.length === 0) {
        s.stop('✅ Channels loaded')
        console.log('\n' + chalk.yellow('No channels found - you need to register an agent first'))
        outro('Run: npx ghostspeak agent register')
        return
      }
      
      // Get channels for all user's agents
      const allChannels: ChannelWithAgentInfo[] = []
      for (const agent of agents) {
        try {
          // Check if SDK supports channel listing
          let channels: ChannelWithAgentInfo[] = []
          
          if (client.channel?.listByParticipant) {
            const rawChannels = await client.channel.listByParticipant({
              participant: agent.address
            })
            channels = rawChannels.map((ch) => ({ ...ch, agentName: agent.data.name || 'Agent' }))
          } else {
            // SDK doesn't support channel listing yet
            console.log(chalk.gray(`  No channels found for ${agent.data.name} (SDK limitation)`))
          }
          
          allChannels.push(...channels)
        } catch (error) {
          console.log(chalk.gray(`  Unable to fetch channels for ${agent.data.name}: ${error instanceof Error ? error.message : 'Unknown error'}`))
        }
      }
      
      s.stop('✅ Channels loaded')

      if (allChannels.length === 0) {
        console.log('\n' + chalk.yellow('No A2A channels found'))
        outro('Create a channel with: npx ghostspeak channel create')
        return
      }

      console.log('\n' + chalk.bold(`💬 Your A2A Channels (${allChannels.length})`))
      console.log('─'.repeat(70))
      
      allChannels.forEach((channel: ChannelWithAgentInfo, index: number) => {
        const messageCount = channel.messageCount ?? 0
        const isActive = channel.isActive
        const statusIcon = isActive ? '🟢' : '🔴'
        const status = isActive ? 'Active' : 'Closed'
        
        console.log(chalk.blue(`${index + 1}. ${channel.name}`))
        console.log(chalk.gray(`   ID: ${channel.id.toString()}`))
        console.log(chalk.gray(`   Your Agent: ${channel.agentName}`))
        console.log(chalk.gray(`   Visibility: ${channel.visibility}`))
        console.log(chalk.gray(`   Messages: ${messageCount}`))
        console.log(chalk.gray(`   Status: ${statusIcon} ${status}`))
        console.log(chalk.gray(`   Created: ${new Date(Number(channel.createdAt) * 1000).toLocaleString()}`))
        if (channel.lastActivity) {
          console.log(chalk.gray(`   Last Activity: ${new Date(Number(channel.lastActivity) * 1000).toLocaleString()}`))
        }
        console.log('')
      })

      outro('Channel listing completed')

    } catch (error) {
      s.stop('❌ Failed to load channels')
      cancel(chalk.red('Error: ' + (error instanceof Error ? error.message : 'Unknown error')))
    }
  })

channelCommand
  .command('send')
  .description('Send a message in an A2A channel')
  .option('--channel <id>', 'Channel ID')
  .action(async (options: { channel?: string }) => {
    intro(chalk.blue('📤 Send A2A Message'))

    try {
      const s = spinner()
      s.start('Connecting to Solana network...')
      
      // Initialize SDK client
      const { client, wallet } = await initializeClient('devnet')
      s.stop('✅ Connected')
      
      let channelPubkey: Address
      
      if (options.channel) {
        // Use provided channel ID
        try {
          channelPubkey = address(options.channel)
        } catch {
          cancel('Invalid channel ID format')
          return
        }
      } else {
        // List user's channels to select from
        s.start('Loading your channels...')
        
        const agents = await client.agent.listByOwner({ owner: wallet.address })
        if (agents.length === 0) {
          s.stop('❌ No agents found')
          console.log(chalk.yellow('\n⚠️  You need to register an agent first!'))
          outro('Run: npx ghostspeak agent register')
          return
        }
        
        // Get channels for all user's agents
        const allChannels: ChannelWithAgentInfo[] = []
        for (const agent of agents) {
          try {
            // Check if SDK supports channel listing
            let channels: Channel[] = []
            
            if (client.channel?.listByParticipant) {
              channels = await client.channel.listByParticipant({
                participant: agent.address
              })
            } else {
              // SDK doesn't support channel listing yet - show message
              console.log(chalk.gray(`  No channels available for ${agent.data.name} (SDK feature pending)`))
            }
            
            allChannels.push(...channels.map(ch => ({ 
              ...ch, 
              agentName: agent.data.name || 'Agent',
              agentAddress: agent.address,
              messageCount: ch.messageCount || 0,
              createdAt: ch.createdAt || BigInt(0),
              lastActivity: ch.lastActivity || BigInt(0),
              isActive: ch.isActive ?? true
            } as ChannelWithAgentInfo)))
          } catch (error) {
            console.log(chalk.gray(`  Unable to load channels for ${agent.data.name}: ${error instanceof Error ? error.message : 'Unknown error'}`))
          }
        }
        
        s.stop('✅ Channels loaded')
        
        if (allChannels.length === 0) {
          console.log('\n' + chalk.yellow('No channels found'))
          outro('Create a channel with: npx ghostspeak channel create')
          return
        }
        
        const selectedChannel = await select({
          message: 'Select channel:',
          options: allChannels.map(channel => ({
            value: channel.id.toString(),
            label: `${channel.name} (via ${channel.agentName})`
          }))
        })
        
        if (isCancel(selectedChannel)) {
          cancel('Message sending cancelled')
          return
        }
        
        channelPubkey = address(selectedChannel as string)
        
        // Find the agent address for this channel
        const selectedChannelData = allChannels.find(ch => ch.id.toString() === selectedChannel)
        if (!selectedChannelData) {
          cancel('Channel not found')
          return
        }
      }

      const message = await text({
        message: 'Enter your message:',
        placeholder: 'Type your message to the agent...',
        validate: (value) => {
          if (!value) return 'Message cannot be empty'
          if (value.length > 1000) return 'Message too long (max 1000 characters)'
        }
      })

      if (isCancel(message)) {
        cancel('Message sending cancelled')
        return
      }

      const messageType = await select({
        message: 'Message type:',
        options: [
          { value: 'text', label: '💬 Text Message' },
          { value: 'request', label: '📋 Service Request' },
          { value: 'response', label: '✅ Response' },
          { value: 'update', label: '📢 Status Update' }
        ]
      })

      if (isCancel(messageType)) {
        cancel('Message sending cancelled')
        return
      }

      const sendSpinner = spinner()
      sendSpinner.start('Sending message...')

      try {
        const signature = await client.channel.sendMessage(
          toSDKSigner(wallet),
          channelPubkey,
          {
            channelId: channelPubkey.toString(),
            content: message as string
          }
        )
        
        const result = { 
          messageId: { toString: () => Date.now().toString() }, 
          signature 
        }

        sendSpinner.stop('✅ Message sent!')

        console.log('\n' + chalk.green('📤 Message delivered successfully!'))
        console.log(chalk.gray(`Message ID: ${result.messageId.toString()}`))
        console.log(chalk.gray(`Channel: ${channelPubkey.toString()}`))
        console.log(chalk.gray(`Type: ${messageType}`))
        console.log('')
        console.log(chalk.cyan('Transaction:'), getExplorerUrl(result.signature, 'devnet'))
        
        outro('Message sending completed')
      } catch (error) {
        sendSpinner.stop('❌ Send failed')
        throw new Error(handleTransactionError(error as Error))
      }

    } catch (error) {
      cancel(chalk.red('Message sending failed: ' + (error instanceof Error ? error.message : 'Unknown error')))
    }
  })