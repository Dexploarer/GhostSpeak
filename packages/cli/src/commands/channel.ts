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
import { initializeClient, getExplorerUrl, getAddressExplorerUrl, handleTransactionError, toSDKSigner } from '../utils/client.js'
import { createSafeSDKClient } from '../utils/sdk-helpers.js'
import { address } from '@solana/addresses'

// Clean type definitions
interface CreateChannelOptions {
  name?: string
  visibility?: 'public' | 'private'
  description?: string
}

interface ListChannelOptions {
  mine?: boolean
  public?: boolean
}

interface SendMessageOptions {
  channel?: string
  message?: string
}

export const channelCommand = new Command('channel')
  .description('Manage Agent-to-Agent (A2A) communication channels')
  .alias('a2a')

// Create channel subcommand
channelCommand
  .command('create')
  .description('Create a new A2A communication channel')
  .option('-n, --name <name>', 'Channel name')
  .option('-v, --visibility <visibility>', 'Channel visibility (public|private)', 'public')
  .option('-d, --description <description>', 'Channel description')
  .action(async (options: CreateChannelOptions) => {
    intro(chalk.blue('💬 Create A2A Channel'))

    try {
      const s = spinner()
      s.start('Connecting to network...')
      
      const { client, wallet } = await initializeClient('devnet')
      const safeClient = createSafeSDKClient(client)
      
      s.stop('✅ Connected to devnet')

      // Get channel name
      let channelName = options.name
      if (!channelName) {
        const nameInput = await text({
          message: 'Channel name:',
          placeholder: 'AI Collaboration Hub',
          validate: (value) => {
            if (!value || value.trim().length === 0) {
              return 'Channel name is required'
            }
            if (value.length < 3) {
              return 'Channel name must be at least 3 characters'
            }
            if (value.length > 50) {
              return 'Channel name must be less than 50 characters'
            }
          }
        })

        if (isCancel(nameInput)) {
          cancel('Channel creation cancelled')
          return
        }

        channelName = nameInput.toString()
      }

      // Get channel visibility
      let visibility = (options.visibility as 'public' | 'private' | undefined) ?? 'public'
      if (!options.visibility) {
        const visibilityChoice = await select({
          message: 'Channel visibility:',
          options: [
            { value: 'public', label: '🌐 Public Channel', hint: 'Anyone can join and see messages' },
            { value: 'private', label: '🔒 Private Channel', hint: 'Invite-only, encrypted messages' }
          ]
        })

        if (isCancel(visibilityChoice)) {
          cancel('Channel creation cancelled')
          return
        }

        visibility = visibilityChoice as 'public' | 'private'
      }

      // Get channel description
      let description = options.description
      if (!description) {
        const descInput = await text({
          message: 'Channel description (optional):',
          placeholder: 'A space for AI agents to collaborate and share insights...'
        })

        if (isCancel(descInput)) {
          cancel('Channel creation cancelled')
          return
        }

        description = descInput.toString() || ''
      }

      // Show channel preview
      note(
        `${chalk.bold('Channel Details:')}\n` +
        `${chalk.gray('Name:')} ${channelName}\n` +
        `${chalk.gray('Visibility:')} ${visibility.toUpperCase()}\n` +
        `${chalk.gray('Description:')} ${description || 'None provided'}\n` +
        `${chalk.gray('Creator:')} ${wallet.address.slice(0, 8)}...${wallet.address.slice(-8)}`,
        'Channel Preview'
      )

      const confirmCreate = await confirm({
        message: 'Create this channel?'
      })

      if (isCancel(confirmCreate) || !confirmCreate) {
        cancel('Channel creation cancelled')
        return
      }

      s.start('Creating channel on blockchain...')

      try {
        const signature = await safeClient.channel.create(
          toSDKSigner(wallet),
          {
            name: channelName,
            description,
            visibility,
            participants: [wallet.address]
          }
        )

        if (!signature) {
          throw new Error('Failed to get transaction signature')
        }

        s.stop('✅ Channel created successfully!')

        const explorerUrl = getExplorerUrl(signature, 'devnet')
        
        outro(
          `${chalk.green('💬 Channel Created Successfully!')}\n\n` +
          `${chalk.bold('Channel Details:')}\n` +
          `${chalk.gray('Name:')} ${channelName}\n` +
          `${chalk.gray('Visibility:')} ${visibility.toUpperCase()}\n` +
          `${chalk.gray('Creator:')} ${wallet.address}\n\n` +
          `${chalk.bold('Transaction:')}\n` +
          `${chalk.gray('Signature:')} ${signature}\n` +
          `${chalk.gray('Explorer:')} ${explorerUrl}\n\n` +
          `${chalk.yellow('Next Steps:')}\n` +
          `• View your channels: ${chalk.cyan('gs channel list --mine')}\n` +
          `• Send a message: ${chalk.cyan('gs channel send')}\n` +
          `• Share channel with agents for collaboration`
        )

      } catch (error) {
        s.stop('❌ Failed to create channel')
        handleTransactionError(error as Error)
      }

    } catch (error) {
      log.error(`Failed to create channel: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  })

// List channels subcommand
channelCommand
  .command('list')
  .description('List A2A communication channels')
  .option('--mine', 'Show only channels you created or participate in')
  .option('--public', 'Show only public channels')
  .action(async (options: ListChannelOptions) => {
    intro(chalk.blue('📋 A2A Channels'))

    try {
      const s = spinner()
      s.start('Loading channels...')
      
      const { client, wallet } = await initializeClient('devnet')
      const safeClient = createSafeSDKClient(client)

      let channels = []

      if (options.mine) {
        channels = await safeClient.channel.listByParticipant({ participant: wallet.address })
      } else {
        // Get all public channels by default
        channels = await safeClient.channel.listByParticipant({ participant: wallet.address })
      }

      s.stop(`✅ Found ${channels.length} channels`)

      if (channels.length === 0) {
        outro(
          `${chalk.yellow('No channels found')}\n\n` +
          `${chalk.gray('• Create a channel:')} ${chalk.cyan('gs channel create')}\n` +
          `${chalk.gray('• Join public channels:')} ${chalk.cyan('gs channel list --public')}`
        )
        return
      }

      // Display channels
      log.info(`\n${chalk.bold('Available Channels:')}\n`)
      
      channels.forEach((channel, index) => {
        const isCreator = channel.participants.includes(wallet.address)
        const participantCount = channel.participants.length
        const visibility = channel.visibility === 'private' ? 
          chalk.red('🔒 PRIVATE') : 
          chalk.green('🌐 PUBLIC')

        const status = isCreator ? chalk.green('▶ JOINED') : chalk.gray('Available')
        
        log.info(
          `${chalk.bold(`${index + 1}. ${channel.name}`)}\n` +
          `   ${chalk.gray('Address:')} ${channel.address.slice(0, 8)}...${channel.address.slice(-8)}\n` +
          `   ${chalk.gray('Visibility:')} ${visibility}\n` +
          `   ${chalk.gray('Participants:')} ${participantCount}\n` +
          `   ${chalk.gray('Status:')} ${status}\n`
        )
      })

      outro(
        `${chalk.yellow('💡 Commands:')}\n` +
        `${chalk.cyan('gs channel send')} - Send a message to a channel\n` +
        `${chalk.cyan('gs channel create')} - Create a new channel\n` +
        `${chalk.cyan('gs channel list --mine')} - Show your channels`
      )

    } catch (error) {
      log.error(`Failed to load channels: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  })

// Send message subcommand
channelCommand
  .command('send')
  .description('Send a message to an A2A channel')
  .option('-c, --channel <address>', 'Channel address')
  .option('-m, --message <message>', 'Message content')
  .action(async (options: SendMessageOptions) => {
    intro(chalk.blue('💬 Send Channel Message'))

    try {
      const s = spinner()
      s.start('Loading your channels...')
      
      const { client, wallet } = await initializeClient('devnet')
      const safeClient = createSafeSDKClient(client)

      // Get channels user participates in
      const channels = await safeClient.channel.listByParticipant({ participant: wallet.address })
      
      s.stop(`✅ Found ${channels.length} channels`)

      if (channels.length === 0) {
        outro(
          `${chalk.yellow('No channels found')}\n\n` +
          `${chalk.gray('• Create a channel:')} ${chalk.cyan('gs channel create')}\n` +
          `${chalk.gray('• Join public channels:')} ${chalk.cyan('gs channel list --public')}`
        )
        return
      }

      // Select channel
      let selectedChannel = options.channel
      if (!selectedChannel) {
        const channelChoice = await select({
          message: 'Select channel to send message to:',
          options: channels.map(channel => ({
            value: channel.address,
            label: channel.name,
            hint: `${channel.visibility} • ${channel.participants.length} participants`
          }))
        })

        if (isCancel(channelChoice)) {
          cancel('Message sending cancelled')
          return
        }

        selectedChannel = channelChoice.toString()
      }

      const channel = channels.find(c => c.address === selectedChannel)
      if (!channel) {
        log.error('Channel not found or you do not have access')
        return
      }

      // Get message content
      let messageContent = options.message
      if (!messageContent) {
        const messageInput = await text({
          message: 'Enter your message:',
          placeholder: 'Hello agents! Ready to collaborate...',
          validate: (value) => {
            if (!value || value.trim().length === 0) {
              return 'Message content is required'
            }
            if (value.length > 1000) {
              return 'Message must be less than 1000 characters'
            }
          }
        })

        if (isCancel(messageInput)) {
          cancel('Message sending cancelled')
          return
        }

        messageContent = messageInput.toString()
      }

      // Get message type/metadata
      const messageType = await select({
        message: 'Message type:',
        options: [
          { value: 'text', label: '💬 Text Message', hint: 'Regular text message' },
          { value: 'announcement', label: '📢 Announcement', hint: 'Important announcement' },
          { value: 'question', label: '❓ Question', hint: 'Question for other agents' },
          { value: 'update', label: '📊 Status Update', hint: 'Progress or status update' }
        ]
      })

      if (isCancel(messageType)) {
        cancel('Message sending cancelled')
        return
      }

      // Show message preview
      note(
        `${chalk.bold('Message Details:')}\n` +
        `${chalk.gray('Channel:')} ${channel.name}\n` +
        `${chalk.gray('Type:')} ${messageType}\n` +
        `${chalk.gray('Content:')} ${messageContent.length > 100 ? messageContent.slice(0, 100) + '...' : messageContent}\n` +
        `${chalk.gray('Recipients:')} ${channel.participants.length} participants`,
        'Message Preview'
      )

      const confirmSend = await confirm({
        message: 'Send this message?'
      })

      if (isCancel(confirmSend) || !confirmSend) {
        cancel('Message sending cancelled')
        return
      }

      s.start('Sending message to channel...')

      try {
        const signature = await safeClient.channel.sendMessage(
          toSDKSigner(wallet),
          address(selectedChannel),
          {
            channelId: selectedChannel,
            content: messageContent,
            messageType
          }
        )

        if (!signature) {
          throw new Error('Failed to get transaction signature')
        }

        s.stop('✅ Message sent successfully!')

        const explorerUrl = getExplorerUrl(signature, 'devnet')
        const channelUrl = getAddressExplorerUrl(selectedChannel, 'devnet')
        
        outro(
          `${chalk.green('💬 Message Sent!')}\n\n` +
          `${chalk.bold('Message Details:')}\n` +
          `${chalk.gray('Channel:')} ${channel.name}\n` +
          `${chalk.gray('Type:')} ${messageType}\n` +
          `${chalk.gray('Recipients:')} ${channel.participants.length} agents\n\n` +
          `${chalk.bold('Transaction:')}\n` +
          `${chalk.gray('Signature:')} ${signature}\n` +
          `${chalk.gray('Explorer:')} ${explorerUrl}\n` +
          `${chalk.gray('Channel:')} ${channelUrl}\n\n` +
          `${chalk.yellow('💡 Tip:')} Other agents in the channel will see your message and can respond`
        )

      } catch (error) {
        s.stop('❌ Failed to send message')
        handleTransactionError(error as Error)
      }

    } catch (error) {
      log.error(`Failed to send message: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  })

// Default action - show channel list
channelCommand
  .action(async () => {
    // Redirect to list command
    await channelCommand.commands.find(cmd => cmd.name() === 'list')?.parseAsync(process.argv)
  })