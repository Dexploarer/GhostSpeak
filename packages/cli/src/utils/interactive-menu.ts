import { select, intro, outro, confirm, cancel, isCancel, log, spinner } from '@clack/prompts'
import chalk from 'chalk'
import { Command } from 'commander'
import { readFileSync, writeFileSync, existsSync } from 'fs'
import { join } from 'path'
import { homedir } from 'os'
import { initializeClient } from './client.js'

interface MenuOption {
  value: string
  label: string
  hint?: string
}

interface CategoryOption extends MenuOption {
  icon: string
  description: string
}

interface CommandOption extends MenuOption {
  command: string
  args?: string[]
}

const RECENT_COMMANDS_FILE = join(homedir(), '.ghostspeak', 'recent-commands.json')
const MAX_RECENT_COMMANDS = 5

export class InteractiveMenu {
  private program: Command
  
  constructor(program: Command) {
    this.program = program
  }

  async showMainMenu(): Promise<void> {
    intro(chalk.cyan('🚀 Welcome to GhostSpeak Interactive Mode'))
    
    while (true) {
      const categories: CategoryOption[] = [
        {
          value: 'creation',
          label: 'Creation',
          icon: '🎨',
          description: 'Create agents, listings, and configure settings',
          hint: 'Start here if you\'re new'
        },
        {
          value: 'management',
          label: 'Management',
          icon: '📊',
          description: 'Manage agents, view analytics, and handle operations',
          hint: 'Admin and monitoring tools'
        },
        {
          value: 'development',
          label: 'Development',
          icon: '🛠️',
          description: 'SDK tools, testing utilities, and developer resources',
          hint: 'For developers and testing'
        },
        {
          value: 'recent',
          label: 'Recent Commands',
          icon: '⏱️',
          description: 'Quickly access your recently used commands',
          hint: this.getRecentCommandsHint()
        },
        {
          value: 'help',
          label: 'Help & Documentation',
          icon: '📚',
          description: 'View help, examples, and documentation',
          hint: 'Learn more about GhostSpeak'
        },
        {
          value: 'exit',
          label: 'Exit',
          icon: '👋',
          description: 'Exit interactive mode',
          hint: 'Use CLI commands directly next time'
        }
      ]

      const choice = await select({
        message: 'What would you like to do?',
        options: categories.map(cat => ({
          value: cat.value,
          label: `${cat.icon} ${cat.label}`,
          hint: cat.hint
        }))
      })

      if (isCancel(choice)) {
        cancel('Interactive mode cancelled')
        process.exit(0)
      }

      switch (choice) {
        case 'creation':
          await this.showCreationMenu()
          break
        case 'management':
          await this.showManagementMenu()
          break
        case 'development':
          await this.showDevelopmentMenu()
          break
        case 'recent':
          await this.showRecentCommands()
          break
        case 'help':
          await this.showHelp()
          break
        case 'exit':
          outro(chalk.green('Thanks for using GhostSpeak! 👋'))
          process.exit(0)
      }
    }
  }

  private async showCreationMenu(): Promise<void> {
    const commands: CommandOption[] = [
      { value: 'agent-register', label: 'Register AI Agent', command: 'agent register', hint: 'Create a new AI agent on-chain' },
      { value: 'marketplace-create', label: 'Create Service Listing', command: 'marketplace create', hint: 'List a service in the marketplace' },
      { value: 'job-create', label: 'Post a Job', command: 'marketplace jobs create', hint: 'Create a job posting' },
      { value: 'escrow-create', label: 'Create Escrow Payment', command: 'escrow create', hint: 'Set up secure payment' },
      { value: 'channel-create', label: 'Create A2A Channel', command: 'channel create', hint: 'Agent-to-agent communication' },
      { value: 'auction-create', label: 'Create Auction', command: 'auction create', hint: 'Auction your services' },
      { value: 'multisig-create', label: 'Create Multisig Wallet', command: 'governance multisig create', hint: 'Multi-signature wallet' },
      { value: 'wallet-generate', label: 'Generate New Wallet', command: 'faucet generate --save', hint: 'Create development wallet' },
      { value: 'config-setup', label: 'Initial Setup', command: 'config setup', hint: 'Configure CLI settings' },
      { value: 'back', label: '← Back to Main Menu', command: '', hint: '' }
    ]

    const choice = await select({
      message: chalk.cyan('🎨 Creation Menu - What would you like to create?'),
      options: commands.map(cmd => ({
        value: cmd.value,
        label: cmd.label,
        hint: cmd.hint
      }))
    })

    if (isCancel(choice) || choice === 'back') {
      return
    }

    const selected = commands.find(cmd => cmd.value === choice)
    if (selected && selected.command) {
      await this.executeCommand(selected.command)
      this.saveRecentCommand(selected.command, selected.label)
    }
  }

  private async showManagementMenu(): Promise<void> {
    const subCategories = [
      { value: 'agents', label: 'Agent Management', icon: '🤖', hint: 'View and manage your agents' },
      { value: 'marketplace', label: 'Marketplace', icon: '🛍️', hint: 'Browse and purchase services' },
      { value: 'payments', label: 'Payments & Escrow', icon: '💰', hint: 'Manage payments and escrows' },
      { value: 'auctions', label: 'Auctions', icon: '🔨', hint: 'Monitor and bid on auctions' },
      { value: 'disputes', label: 'Disputes', icon: '⚖️', hint: 'Handle disputes and conflicts' },
      { value: 'governance', label: 'Governance', icon: '🏛️', hint: 'Voting and protocol governance' },
      { value: 'analytics', label: 'Analytics', icon: '📈', hint: 'View performance metrics' },
      { value: 'back', label: '← Back to Main Menu', icon: '', hint: '' }
    ]

    const choice = await select({
      message: chalk.cyan('📊 Management Menu - Select a category:'),
      options: subCategories.map(cat => ({
        value: cat.value,
        label: cat.icon ? `${cat.icon} ${cat.label}` : cat.label,
        hint: cat.hint
      }))
    })

    if (isCancel(choice) || choice === 'back') {
      return
    }

    switch (choice) {
      case 'agents':
        await this.showAgentManagementMenu()
        break
      case 'marketplace':
        await this.showMarketplaceMenu()
        break
      case 'payments':
        await this.showPaymentMenu()
        break
      case 'auctions':
        await this.showAuctionMenu()
        break
      case 'disputes':
        await this.showDisputeMenu()
        break
      case 'governance':
        await this.showGovernanceMenu()
        break
      case 'analytics':
        await this.showAnalyticsMenu()
        break
    }
  }

  private async showDevelopmentMenu(): Promise<void> {
    const commands: CommandOption[] = [
      { value: 'sdk-install', label: 'Install SDK', command: 'sdk install', hint: 'Install GhostSpeak SDK locally' },
      { value: 'sdk-info', label: 'SDK Information', command: 'sdk info', hint: 'Check SDK installation status' },
      { value: 'faucet', label: 'Get Development SOL', command: 'faucet', hint: 'Request SOL from faucet' },
      { value: 'balance', label: 'Check Balance', command: 'faucet balance', hint: 'View wallet balance' },
      { value: 'update', label: 'Update CLI', command: 'update', hint: 'Update to latest version' },
      { value: 'example-agent', label: 'Generate Agent Example', command: '', hint: 'Create example agent code' },
      { value: 'example-sdk', label: 'Generate SDK Example', command: '', hint: 'Create example SDK usage' },
      { value: 'test-connection', label: 'Test Network Connection', command: '', hint: 'Verify RPC connection' },
      { value: 'back', label: '← Back to Main Menu', command: '', hint: '' }
    ]

    const choice = await select({
      message: chalk.cyan('🛠️ Development Menu - Select a tool:'),
      options: commands.map(cmd => ({
        value: cmd.value,
        label: cmd.label,
        hint: cmd.hint
      }))
    })

    if (isCancel(choice) || choice === 'back') {
      return
    }

    const selected = commands.find(cmd => cmd.value === choice)
    if (selected && selected.command) {
      await this.executeCommand(selected.command)
      this.saveRecentCommand(selected.command, selected.label)
    } else if (choice === 'example-agent') {
      await this.generateAgentExample()
    } else if (choice === 'example-sdk') {
      await this.generateSDKExample()
    } else if (choice === 'test-connection') {
      await this.testConnection()
    }
  }

  private async showAgentManagementMenu(): Promise<void> {
    const commands: CommandOption[] = [
      { value: 'list', label: 'List My Agents', command: 'agent list', hint: 'View all your registered agents' },
      { value: 'search', label: 'Search Agents', command: 'agent search', hint: 'Find agents by capabilities' },
      { value: 'status', label: 'Agent Status', command: 'agent status', hint: 'Check agent health and metrics' },
      { value: 'update', label: 'Update Agent', command: 'agent update', hint: 'Modify agent details' },
      { value: 'credentials', label: 'Manage Credentials', command: 'agent credentials', hint: 'View and backup credentials' },
      { value: 'analytics', label: 'Agent Analytics', command: 'agent analytics', hint: 'Performance metrics' },
      { value: 'verify', label: 'Verify Agent (Admin)', command: 'agent verify', hint: 'Admin verification' },
      { value: 'uuid', label: 'Lookup by UUID', command: 'agent uuid', hint: 'Find agent by UUID' },
      { value: 'back', label: '← Back', command: '', hint: '' }
    ]

    const choice = await select({
      message: chalk.cyan('🤖 Agent Management:'),
      options: commands.map(cmd => ({
        value: cmd.value,
        label: cmd.label,
        hint: cmd.hint
      }))
    })

    if (isCancel(choice) || choice === 'back') {
      return
    }

    const selected = commands.find(cmd => cmd.value === choice)
    if (selected && selected.command) {
      await this.executeCommand(selected.command)
      this.saveRecentCommand(selected.command, selected.label)
    }
  }

  private async showMarketplaceMenu(): Promise<void> {
    const commands: CommandOption[] = [
      { value: 'browse', label: 'Browse Services', command: 'marketplace list', hint: 'View available services' },
      { value: 'search', label: 'Search Services', command: 'marketplace search', hint: 'Find specific services' },
      { value: 'purchase', label: 'Purchase Service', command: 'marketplace purchase', hint: 'Buy a service' },
      { value: 'jobs-list', label: 'Browse Jobs', command: 'marketplace jobs list', hint: 'View job postings' },
      { value: 'my-listings', label: 'My Listings', command: 'marketplace list --mine', hint: 'View your listings' },
      { value: 'back', label: '← Back', command: '', hint: '' }
    ]

    const choice = await select({
      message: chalk.cyan('🛍️ Marketplace:'),
      options: commands.map(cmd => ({
        value: cmd.value,
        label: cmd.label,
        hint: cmd.hint
      }))
    })

    if (isCancel(choice) || choice === 'back') {
      return
    }

    const selected = commands.find(cmd => cmd.value === choice)
    if (selected && selected.command) {
      await this.executeCommand(selected.command)
      this.saveRecentCommand(selected.command, selected.label)
    }
  }

  private async showPaymentMenu(): Promise<void> {
    const commands: CommandOption[] = [
      { value: 'list', label: 'List Escrows', command: 'escrow list', hint: 'View your escrow payments' },
      { value: 'release', label: 'Release Escrow', command: 'escrow release', hint: 'Release funds from escrow' },
      { value: 'dispute', label: 'Dispute Escrow', command: 'escrow dispute', hint: 'Open a dispute' },
      { value: 'channels', label: 'A2A Channels', command: 'channel list', hint: 'View communication channels' },
      { value: 'send', label: 'Send Message', command: 'channel send', hint: 'Send A2A message' },
      { value: 'back', label: '← Back', command: '', hint: '' }
    ]

    const choice = await select({
      message: chalk.cyan('💰 Payments & Communication:'),
      options: commands.map(cmd => ({
        value: cmd.value,
        label: cmd.label,
        hint: cmd.hint
      }))
    })

    if (isCancel(choice) || choice === 'back') {
      return
    }

    const selected = commands.find(cmd => cmd.value === choice)
    if (selected && selected.command) {
      await this.executeCommand(selected.command)
      this.saveRecentCommand(selected.command, selected.label)
    }
  }

  private async showAuctionMenu(): Promise<void> {
    const commands: CommandOption[] = [
      { value: 'list', label: 'Browse Auctions', command: 'auction list', hint: 'View active auctions' },
      { value: 'bid', label: 'Place Bid', command: 'auction bid', hint: 'Bid on an auction' },
      { value: 'monitor', label: 'Monitor Auctions', command: 'auction monitor', hint: 'Real-time monitoring' },
      { value: 'finalize', label: 'Finalize Auction', command: 'auction finalize', hint: 'Complete auction' },
      { value: 'analytics', label: 'Auction Analytics', command: 'auction analytics', hint: 'View insights' },
      { value: 'back', label: '← Back', command: '', hint: '' }
    ]

    const choice = await select({
      message: chalk.cyan('🔨 Auctions:'),
      options: commands.map(cmd => ({
        value: cmd.value,
        label: cmd.label,
        hint: cmd.hint
      }))
    })

    if (isCancel(choice) || choice === 'back') {
      return
    }

    const selected = commands.find(cmd => cmd.value === choice)
    if (selected && selected.command) {
      await this.executeCommand(selected.command)
      this.saveRecentCommand(selected.command, selected.label)
    }
  }

  private async showDisputeMenu(): Promise<void> {
    const commands: CommandOption[] = [
      { value: 'list', label: 'View Disputes', command: 'dispute list', hint: 'List all disputes' },
      { value: 'evidence', label: 'Submit Evidence', command: 'dispute evidence', hint: 'Add to dispute' },
      { value: 'resolve', label: 'Resolve Dispute', command: 'dispute resolve', hint: 'Arbitrator only' },
      { value: 'escalate', label: 'Escalate Dispute', command: 'dispute escalate', hint: 'Human review' },
      { value: 'back', label: '← Back', command: '', hint: '' }
    ]

    const choice = await select({
      message: chalk.cyan('⚖️ Disputes:'),
      options: commands.map(cmd => ({
        value: cmd.value,
        label: cmd.label,
        hint: cmd.hint
      }))
    })

    if (isCancel(choice) || choice === 'back') {
      return
    }

    const selected = commands.find(cmd => cmd.value === choice)
    if (selected && selected.command) {
      await this.executeCommand(selected.command)
      this.saveRecentCommand(selected.command, selected.label)
    }
  }

  private async showGovernanceMenu(): Promise<void> {
    const commands: CommandOption[] = [
      { value: 'proposals', label: 'View Proposals', command: 'governance proposal list', hint: 'Active proposals' },
      { value: 'vote', label: 'Vote on Proposal', command: 'governance vote', hint: 'Cast your vote' },
      { value: 'multisig-list', label: 'List Multisigs', command: 'governance multisig list', hint: 'View wallets' },
      { value: 'rbac', label: 'Access Control', command: 'governance rbac', hint: 'Manage roles' },
      { value: 'back', label: '← Back', command: '', hint: '' }
    ]

    const choice = await select({
      message: chalk.cyan('🏛️ Governance:'),
      options: commands.map(cmd => ({
        value: cmd.value,
        label: cmd.label,
        hint: cmd.hint
      }))
    })

    if (isCancel(choice) || choice === 'back') {
      return
    }

    const selected = commands.find(cmd => cmd.value === choice)
    if (selected && selected.command) {
      await this.executeCommand(selected.command)
      this.saveRecentCommand(selected.command, selected.label)
    }
  }

  private async showAnalyticsMenu(): Promise<void> {
    const commands: CommandOption[] = [
      { value: 'agent', label: 'Agent Analytics', command: 'agent analytics', hint: 'Agent performance' },
      { value: 'auction', label: 'Auction Analytics', command: 'auction analytics', hint: 'Market insights' },
      { value: 'marketplace', label: 'Marketplace Stats', command: '', hint: 'Coming soon' },
      { value: 'back', label: '← Back', command: '', hint: '' }
    ]

    const choice = await select({
      message: chalk.cyan('📈 Analytics:'),
      options: commands.map(cmd => ({
        value: cmd.value,
        label: cmd.label,
        hint: cmd.hint
      }))
    })

    if (isCancel(choice) || choice === 'back') {
      return
    }

    const selected = commands.find(cmd => cmd.value === choice)
    if (selected && selected.command) {
      await this.executeCommand(selected.command)
      this.saveRecentCommand(selected.command, selected.label)
    } else if (choice === 'marketplace') {
      log.info('Marketplace analytics coming soon!')
      await this.waitForKeyPress()
    }
  }

  private async showRecentCommands(): Promise<void> {
    const recentCommands = this.getRecentCommands()
    
    if (recentCommands.length === 0) {
      log.info('No recent commands yet. Start using GhostSpeak to build your history!')
      await this.waitForKeyPress()
      return
    }

    const options = recentCommands.map((cmd, index) => ({
      value: cmd.command,
      label: `${index + 1}. ${cmd.label}`,
      hint: cmd.command
    }))
    
    options.push({ value: 'back', label: '← Back to Main Menu', hint: '' })

    const choice = await select({
      message: chalk.cyan('⏱️ Recent Commands:'),
      options
    })

    if (isCancel(choice) || choice === 'back') {
      return
    }

    await this.executeCommand(choice as string)
  }

  private async showHelp(): Promise<void> {
    console.log(chalk.cyan('\n📚 GhostSpeak Help & Documentation\n'))
    console.log(chalk.bold('Quick Start:'))
    console.log('  1. Use "Creation" to register agents and create listings')
    console.log('  2. Use "Management" to monitor and control your operations')
    console.log('  3. Use "Development" for SDK tools and testing\n')
    
    console.log(chalk.bold('Useful Commands:'))
    console.log(chalk.gray('  gs agent register') + ' - Register a new AI agent')
    console.log(chalk.gray('  gs marketplace list') + ' - Browse available services')
    console.log(chalk.gray('  gs faucet') + ' - Get SOL for development')
    console.log(chalk.gray('  gs --help') + ' - Show all CLI commands\n')
    
    console.log(chalk.bold('Resources:'))
    console.log('  Documentation: https://docs.ghostspeak.ai')
    console.log('  GitHub: https://github.com/Prompt-or-Die/ghostspeak')
    console.log('  Discord: https://discord.gg/ghostspeak\n')
    
    console.log(chalk.bold('Tips:'))
    console.log('  • Use direct commands for scripts: ' + chalk.gray('gs agent list'))
    console.log('  • Add ' + chalk.gray('--interactive') + ' to force menu mode')
    console.log('  • Your recent commands are saved for quick access')
    
    await this.waitForKeyPress()
  }

  private async executeCommand(command: string): Promise<void> {
    outro(chalk.gray(`Executing: ${command}`))
    
    // Exit interactive mode and run the command
    const args = command.split(' ')
    process.argv = [process.argv[0], process.argv[1], ...args]
    
    // Re-parse with the new arguments
    await this.program.parseAsync(process.argv)
  }

  private saveRecentCommand(command: string, label: string): void {
    try {
      const recentCommands = this.getRecentCommands()
      
      // Remove duplicate if exists
      const filtered = recentCommands.filter(cmd => cmd.command !== command)
      
      // Add to beginning
      filtered.unshift({ command, label, timestamp: Date.now() })
      
      // Keep only recent commands
      const toSave = filtered.slice(0, MAX_RECENT_COMMANDS)
      
      // Ensure directory exists
      const dir = join(homedir(), '.ghostspeak')
      if (!existsSync(dir)) {
        require('fs').mkdirSync(dir, { recursive: true })
      }
      
      writeFileSync(RECENT_COMMANDS_FILE, JSON.stringify(toSave, null, 2))
    } catch (error) {
      // Silently ignore errors saving recent commands
    }
  }

  private getRecentCommands(): Array<{ command: string; label: string; timestamp: number }> {
    try {
      if (existsSync(RECENT_COMMANDS_FILE)) {
        return JSON.parse(readFileSync(RECENT_COMMANDS_FILE, 'utf-8'))
      }
    } catch (error) {
      // Ignore errors reading recent commands
    }
    return []
  }

  private getRecentCommandsHint(): string {
    const count = this.getRecentCommands().length
    return count > 0 ? `${count} recent command${count > 1 ? 's' : ''}` : 'No recent commands'
  }

  private async waitForKeyPress(): Promise<void> {
    await confirm({
      message: 'Press Enter to continue...',
      active: 'Continue',
      inactive: 'Continue'
    })
  }

  private async generateAgentExample(): Promise<void> {
    log.info(chalk.bold('\n🤖 Example Agent Registration Code:\n'))
    console.log(chalk.gray(`
import { GhostSpeakClient } from '@ghostspeak/sdk'
import { createKeyPairSignerFromBytes } from '@solana/kit'

// Initialize client
const signer = await createKeyPairSignerFromBytes(walletBytes)
const client = new GhostSpeakClient(connection, signer)

// Register an agent
const result = await client.agents.register({
  name: 'My AI Assistant',
  description: 'Specialized in data analysis',
  capabilities: ['data-analysis', 'reporting'],
  serviceEndpoint: 'https://my-agent.example.com',
  agentType: 1 // SERVICE_AGENT
})

console.log('Agent registered:', result.agent)
console.log('Credentials:', result.credentials)
`))
    
    await this.waitForKeyPress()
  }

  private async generateSDKExample(): Promise<void> {
    log.info(chalk.bold('\n📦 Example SDK Usage:\n'))
    console.log(chalk.gray(`
// 1. Install the SDK
npm install @ghostspeak/sdk

// 2. Basic marketplace interaction
import { GhostSpeakClient } from '@ghostspeak/sdk'
import { createSolanaRpc } from '@solana/kit'

const rpc = createSolanaRpc('https://api.devnet.solana.com')
const client = new GhostSpeakClient(rpc, signer)

// List marketplace services
const listings = await client.marketplace.list({ limit: 10 })

// Create a work order
const workOrder = await client.marketplace.purchase({
  listing: listingAddress,
  requirements: 'Process this dataset...'
})

// Check escrow status
const escrow = await client.escrow.get(workOrder.escrow)
console.log('Payment status:', escrow.status)
`))
    
    await this.waitForKeyPress()
  }

  private async testConnection(): Promise<void> {
    const s = spinner()
    s.start('Testing network connection...')
    
    try {
      const { client } = await initializeClient('devnet')
      const slot = await client.rpc.getSlot().send()
      s.stop(`✅ Connected to Solana devnet (slot: ${slot})`)
    } catch (error) {
      s.stop('❌ Connection failed')
      log.error(error instanceof Error ? error.message : 'Unknown error')
    }
    
    await this.waitForKeyPress()
  }
}

// Helper function to check if running in interactive mode
export function shouldRunInteractive(argv: string[]): boolean {
  // Run interactive if:
  // 1. No command provided (just 'ghostspeak' or 'gs')
  // 2. --interactive flag is present
  // But NOT if help or version flags are present
  
  const hasInteractiveFlag = argv.includes('--interactive') || argv.includes('-i')
  const hasHelpFlag = argv.includes('--help') || argv.includes('-h')
  const hasVersionFlag = argv.includes('--version') || argv.includes('-v')
  
  // Don't run interactive if help or version requested
  if (hasHelpFlag || hasVersionFlag) {
    return false
  }
  
  // Force interactive if flag is present
  if (hasInteractiveFlag) {
    return true
  }
  
  // Check if a command was provided (not just flags)
  const hasCommand = argv.length > 2 && !argv[2].startsWith('-')
  
  return !hasCommand
}