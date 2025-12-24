import { select, intro, outro, confirm, cancel, isCancel, log, spinner } from '@clack/prompts'
import chalk from 'chalk'
import type { Command } from 'commander'
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { join } from 'path'
import { homedir } from 'os'
import { initializeClient } from './client.js'
import { createSolanaRpc } from '@solana/kit'
import { address } from '@solana/addresses'
import { container, ServiceTokens } from '../core/Container.js'
import { type IAgentService } from '../types/services.js'
import { createSafeSDKClient } from './sdk-helpers.js'

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
    
    // Check if first run
    const configPath = join(homedir(), '.ghostspeak', 'config.json')
    const isFirstRun = !existsSync(configPath)
    
    // Interactive menu loop
    for (;;) {
      const categories: CategoryOption[] = [
        {
          value: 'quickstart',
          label: 'Quick Start',
          icon: '🚀',
          description: 'Get started with GhostSpeak - setup and first steps',
          hint: isFirstRun ? '⭐ Start here!' : 'Guided setup'
        },
        {
          value: 'creation',
          label: 'Creation',
          icon: '🎨',
          description: 'Create agents, listings, and configure settinghost',
          hint: 'Build your agent ecosystem'
        },
        {
          value: 'management',
          label: 'Management',
          icon: '📊',
          description: 'Manage agents, view analytics, and handle operations',
          hint: 'Monitor and control'
        },
        {
          value: 'transactions',
          label: 'Transactions',
          icon: '💰',
          description: 'Payments, escrows, auctions, and financial operations',
          hint: 'Handle money flows'
        },
        {
          value: 'development',
          label: 'Development',
          icon: '🛠️',
          description: 'SDK tools, testing utilities, and developer resources',
          hint: 'Advanced tools'
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
          label: 'Help & Support',
          icon: '📚',
          description: 'Documentation, examples, and troubleshooting',
          hint: 'Get assistance'
        },
        {
          value: 'exit',
          label: 'Exit',
          icon: '👋',
          description: 'Exit interactive mode',
          hint: 'Return to terminal'
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
        case 'quickstart':
          await this.showQuickStartMenu()
          break
        case 'creation':
          await this.showCreationMenu()
          break
        case 'management':
          await this.showManagementMenu()
          break
        case 'transactions':
          await this.showTransactionsMenu()
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

  private async showQuickStartMenu(): Promise<void> {
    const options: CommandOption[] = [
      { value: 'one-click', label: '🚀 One-Click Setup', command: 'quickstart new', hint: '⭐ Complete automatic setup' },
      { value: 'import', label: '💳 Import Existing Wallet', command: 'quickstart existing', hint: 'Use your Solana wallet' },
      { value: 'guided', label: '📋 Guided Setup Wizard', command: 'quickstart', hint: 'Step-by-step assistance' },
      { value: 'status', label: '📊 Check Setup Status', command: '', hint: 'See what\'s configured' },
      { value: 'tutorial', label: '📖 View Tutorial', command: 'help quickstart', hint: 'Learn the basics' },
      { value: 'back', label: '← Back to Main Menu', command: '', hint: '' }
    ]
    
    const choice = await select({
      message: chalk.cyan('🚀 Quick Start - Get up and running with GhostSpeak'),
      options: options.map(opt => ({
        value: opt.value,
        label: opt.label,
        hint: opt.hint
      }))
    })
    
    if (isCancel(choice) || choice === 'back') {
      return
    }
    
    if (choice === 'status') {
      await this.showSetupStatus()
      return
    }
    
    const selected = options.find(opt => opt.value === choice)
    if (selected?.command) {
      await this.executeCommand(selected.command)
      this.saveRecentCommand(selected.command, selected.label)
    }
  }
  
  private async showSetupStatus(): Promise<void> {
    const s = spinner()
    s.start('Checking your setup status...')
    
    const status = {
      config: existsSync(join(homedir(), '.ghostspeak', 'config.json')),
      wallet: false,
      balance: '0 SOL',
      agents: 0,
      multisig: false
    }
    
    try {
      const { wallet } = await initializeClient()
      status.wallet = true
      
      // Check balance - use the RPC from config
      const { loadConfig } = await import('./config.js')
      const cfg = loadConfig()
      const rpcUrl = cfg.rpcUrl ?? 'https://api.devnet.solana.com'
      const rpc = createSolanaRpc(rpcUrl)
      const { value: balance } = await rpc.getBalance(address(wallet.address)).send()
      status.balance = `${(Number(balance) / 1e9).toFixed(4)} SOL`
      
      // Check for agents using AgentService
      try {
        const agentService = container.resolve<IAgentService>(ServiceTokens.AGENT_SERVICE)
        const agents = await agentService.list({ owner: address(wallet.address) })
        status.agents = agents.length
      } catch {
        // Fallback or just keep 0 if service fails (e.g. offline)
        status.agents = 0
      }

      // Check for multisigs
      try {
        const { client } = await initializeClient()
        const safeSdk = createSafeSDKClient(client)
        const multisighost = await safeSdk.governance.listMultisigs({ creator: address(wallet.address) })
        status.multisig = multisigs.length > 0
      } catch {
        // Fallback
        status.multisig = false
      }
    } catch {
      // Wallet not configured
    }
    
    s.stop('Setup status:')
    
    console.log('\n' + chalk.bold('📊 GhostSpeak Setup Status:\n'))
    console.log(`  Configuration: ${status.config ? chalk.green('✅ Configured') : chalk.red('❌ Not configured')}`)
    console.log(`  Wallet:        ${status.wallet ? chalk.green('✅ Created') : chalk.red('❌ Not created')}`)
    console.log(`  Balance:       ${status.balance}`)
    console.log(`  Agents:        ${status.agents} registered`)
    console.log(`  Multisig:      ${status.multisig ? chalk.green('✅ Created') : chalk.gray('Not created')}`)
    console.log('')
    
    if (!status.config || !status.wallet) {
      console.log(chalk.yellow('💡 Run "One-Click Setup" to complete your configuration!\n'))
    } else if (parseFloat(status.balance) === 0) {
      console.log(chalk.yellow('💡 You need SOL to interact with the blockchain. Use the faucet command!\n'))
    } else {
      console.log(chalk.green('🎉 You\'re all set! Create your first agent or explore the marketplace.\n'))
    }
    
    await confirm({ message: 'Press enter to continue...', initialValue: true })
  }
  
  private async showCreationMenu(): Promise<void> {
    const commands: CommandOption[] = [
      { value: 'agent-register', label: '🤖 Register AI Agent', command: 'agent register', hint: 'Create your AI agent' },
      { value: 'marketplace-create', label: '🛍️ Create Service Listing', command: 'marketplace create', hint: 'List agent services' },
      { value: 'job-create', label: '💼 Post a Job', command: 'marketplace jobs create', hint: 'Create job posting' },
      { value: 'escrow-create', label: '🔒 Create Escrow Payment', command: 'escrow create', hint: 'Secure payment setup' },
      { value: 'channel-create', label: '📡 Create A2A Channel', command: 'channel create', hint: 'Agent communication' },
      { value: 'auction-create', label: '🔨 Create Auction', command: 'auction create', hint: 'Auction services' },
      { value: 'multisig-create', label: '🔐 Create Multisig Wallet', command: 'governance multisig create', hint: 'Multi-signature wallet' },
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
    if (selected?.command) {
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

  private async showTransactionsMenu(): Promise<void> {
    const subCategories = [
      { value: 'escrow', label: 'Escrow Payments', icon: '🔒', hint: 'Secure payment handling' },
      { value: 'auctions', label: 'Auctions', icon: '🔨', hint: 'Bid and monitor auctions' },
      { value: 'channels', label: 'A2A Channels', icon: '📡', hint: 'Agent communication' },
      { value: 'disputes', label: 'Disputes', icon: '⚖️', hint: 'Resolve conflicts' },
      { value: 'balance', label: 'Check Balance', icon: '💳', hint: 'View wallet balance' },
      { value: 'back', label: '← Back to Main Menu', icon: '', hint: '' }
    ]

    const choice = await select({
      message: chalk.cyan('💰 Transactions & Payments - Select a category:'),
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
      case 'escrow':
        await this.showPaymentMenu()
        break
      case 'auctions':
        await this.showAuctionMenu()
        break
      case 'channels':
        await this.showChannelMenu()
        break
      case 'disputes':
        await this.showDisputeMenu()
        break
      case 'balance':
        await this.executeCommand('wallet balance')
        break
    }
  }

  private async showChannelMenu(): Promise<void> {
    const commands: CommandOption[] = [
      { value: 'list', label: 'List Channels', command: 'channel list', hint: 'View your A2A channels' },
      { value: 'create', label: 'Create Channel', command: 'channel create', hint: 'New communication channel' },
      { value: 'send', label: 'Send Message', command: 'channel send', hint: 'Send A2A message' },
      { value: 'messages', label: 'View Messages', command: 'channel messages', hint: 'Read channel messages' },
      { value: 'back', label: '← Back', command: '', hint: '' }
    ]

    const choice = await select({
      message: chalk.cyan('📡 A2A Channels:'),
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
    if (selected?.command) {
      await this.executeCommand(selected.command)
      this.saveRecentCommand(selected.command, selected.label)
    }
  }

  private async showDevelopmentMenu(): Promise<void> {
    const commands: CommandOption[] = [
      { value: 'wallet-manage', label: '💳 Wallet Manager', command: '', hint: 'Manage your wallets' },
      { value: 'sdk-install', label: 'Install SDK', command: 'sdk install', hint: 'Install GhostSpeak SDK locally' },
      { value: 'sdk-info', label: 'SDK Information', command: 'sdk info', hint: 'Check SDK installation status' },
      { value: 'faucet', label: 'Get Development SOL', command: 'faucet', hint: 'Request SOL from faucet' },
      { value: 'balance', label: 'Check Balance', command: 'wallet balance', hint: 'View wallet balance' },
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
    if (selected?.command) {
      await this.executeCommand(selected.command)
      this.saveRecentCommand(selected.command, selected.label)
    } else if (choice === 'wallet-manage') {
      await this.showWalletMenu()
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
    if (selected?.command) {
      await this.executeCommand(selected.command)
      this.saveRecentCommand(selected.command, selected.label)
    }
  }

  private async showMarketplaceMenu(): Promise<void> {
    const commands: CommandOption[] = [
      { value: 'browse', label: 'Browse Services', command: 'marketplace list', hint: 'View available services' },
      { value: 'search', label: 'Search Services', command: 'marketplace search', hint: 'Find specific services' },
      { value: 'purchase', label: 'Purchase Service', command: 'marketplace purchase', hint: 'Buy a service' },
      { value: 'jobs-list', label: 'Browse Jobs', command: 'marketplace jobs list', hint: 'View job postinghost' },
      { value: 'my-listinghost', label: 'My Listinghost', command: 'marketplace list --mine', hint: 'View your listinghost' },
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
    if (selected?.command) {
      await this.executeCommand(selected.command)
      this.saveRecentCommand(selected.command, selected.label)
    }
  }

  private async showPaymentMenu(): Promise<void> {
    const commands: CommandOption[] = [
      { value: 'create', label: 'Create Escrow', command: 'escrow create', hint: 'Set up secure payment' },
      { value: 'list', label: 'List Escrows', command: 'escrow list', hint: 'View your escrow payments' },
      { value: 'release', label: 'Release Escrow', command: 'escrow release', hint: 'Release funds from escrow' },
      { value: 'refund', label: 'Refund Escrow', command: 'escrow refund', hint: 'Request refund' },
      { value: 'dispute', label: 'Dispute Escrow', command: 'escrow dispute', hint: 'Open a dispute' },
      { value: 'back', label: '← Back', command: '', hint: '' }
    ]

    const choice = await select({
      message: chalk.cyan('🔒 Escrow Payments:'),
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
    if (selected?.command) {
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
    if (selected?.command) {
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
    if (selected?.command) {
      await this.executeCommand(selected.command)
      this.saveRecentCommand(selected.command, selected.label)
    }
  }

  private async showGovernanceMenu(): Promise<void> {
    const commands: CommandOption[] = [
      { value: 'proposals', label: 'View Proposals', command: 'governance proposal list', hint: 'Active proposals' },
      { value: 'vote', label: 'Vote on Proposal', command: 'governance vote', hint: 'Cast your vote' },
      { value: 'multisig-list', label: 'List Multisighost', command: 'governance multisig list', hint: 'View wallets' },
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
    if (selected?.command) {
      await this.executeCommand(selected.command)
      this.saveRecentCommand(selected.command, selected.label)
    }
  }

  private async showWalletMenu(): Promise<void> {
    const commands: CommandOption[] = [
      { value: 'list', label: '📋 List Wallets', command: 'wallet list', hint: 'View all your wallets' },
      { value: 'create', label: '🆕 Create Wallet', command: 'wallet create', hint: 'Create a new wallet' },
      { value: 'import', label: '📥 Import Wallet', command: 'wallet import', hint: 'Import from seed phrase' },
      { value: 'show', label: '💳 Show Active Wallet', command: 'wallet show', hint: 'View current wallet details' },
      { value: 'use', label: '🔄 Switch Wallet', command: 'wallet use', hint: 'Change active wallet' },
      { value: 'balance', label: '💰 Check Balance', command: 'wallet balance', hint: 'View wallet balance' },
      { value: 'rename', label: '✏️  Rename Wallet', command: 'wallet rename', hint: 'Change wallet name' },
      { value: 'delete', label: '🗑️  Delete Wallet', command: 'wallet delete', hint: 'Remove a wallet' },
      { value: 'back', label: '← Back', command: '', hint: '' }
    ]

    const choice = await select({
      message: chalk.cyan('💳 Wallet Manager - Select an action:'),
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
    if (selected?.command) {
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
    if (selected?.command) {
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
    console.log('  1. Use "Creation" to register AI agents, listings, and auctions')
    console.log('  2. Use "Management" to oversee your agents and marketplace activity')
    console.log('  3. Use "Transactions" for payments, escrows, and A2A channels')
    console.log('  4. Use "Development" for wallet tools and SDK integration\n')
    
    console.log(chalk.bold('Key Features:'))
    console.log(chalk.gray('  🤖 Agents') + '      - Register and manage autonomous AI agents')
    console.log(chalk.gray('  🛍️ Marketplace') + ' - Buy and sell agent services instantly')
    console.log(chalk.gray('  🔐 Security') + '    - Built-in multisig and escrow protection')
    console.log(chalk.gray('  📡 Channels') + '    - Agent-to-Agent (A2A) encrypted comms\n')
    
    console.log(chalk.bold('Resources:'))
    console.log('  Documentation: https://docs.ghostspeak.io')
    console.log('  GitHub: https://github.com/ghostspeak/ghostspeak')
    console.log('  Email: team@ghostspeak.io')
    console.log('  Discord: https://discord.gg/ghostspeak\n')
    
    console.log(chalk.bold('Tips:'))
    console.log('  • Use direct commands for scripts: ' + chalk.gray('ghost agent list'))
    console.log('  • Add ' + chalk.gray('--interactive') + ' to force menu mode')
    console.log('  • Your recent commands are saved for quick access')
    
    await this.waitForKeyPress()
  }

  private async executeCommand(command: string): Promise<void> {
    console.log(chalk.gray(`\n└  Executing: ${command}\n`))
    
    try {
      // Parse and execute the command
      const arghost = command.split(' ')
      
      // Create a new program instance to avoid conflicts
      const { spawn } = await import('child_process')
      
      // Determine the correct way to invoke the CLI
      let cliCommand: string
      let cliArgs: string[]
      
      // Check if we're running via npx or direct node
      if (process.argv[1]?.endsWith('.js')) {
        // Running with node directly
        cliCommand = process.argv[0]
        cliArghost = [process.argv[1], ...args]
      } else {
        // Running via global install or npx - use 'ghost' or 'ghostspeak'
        cliCommand = 'ghost'
        cliArghost = args
      }
      
      // Execute command in a child process to avoid exit issues
      const child = spawn(cliCommand, cliArgs, {
        stdio: 'inherit',
        env: process.env,
        shell: true // Use shell to handle command resolution
      })
      
      // Wait for command to complete
      await new Promise<void>((resolve) => {
        child.on('close', (code) => {
          if (code === 0) {
            resolve()
          } else {
            // Don't reject on non-zero exit, just resolve
            // This prevents the interactive mode from crashing
            resolve()
          }
        })
        
        child.on('error', (err) => {
          console.error(`Failed to execute command: ${err.message}`)
          resolve() // Don't crash interactive mode
        })
      })
      
      // Add a small delay to ensure output is flushed
      await new Promise(resolve => setTimeout(resolve, 100))
      
    } catch (error) {
      console.error(chalk.red(`\n❌ Error executing command: ${error instanceof Error ? error.message : 'Unknown error'}`))
    }
    
    console.log('') // Add spacing after command execution
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
        mkdirSync(dir, { recursive: true })
      }
      
      writeFileSync(RECENT_COMMANDS_FILE, JSON.stringify(toSave, null, 2))
    } catch (error) {
      // Silently ignore errors saving recent commands
    }
  }

  private getRecentCommands(): { command: string; label: string; timestamp: number }[] {
    try {
      if (existsSync(RECENT_COMMANDS_FILE)) {
        return JSON.parse(readFileSync(RECENT_COMMANDS_FILE, 'utf-8')) as { command: string; label: string; timestamp: number }[]
      }
    } catch (error) {
      // Ignore errors reading recent commands
      void error
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
const client = new GhostSpeakClient({ rpcEndpoint: 'https://api.devnet.solana.com' })
const signer = await createKeyPairSignerFromBytes(walletBytes)

// Register an agent (Fluent API)
const { address, signature } = await client.agent()
  .create({
    name: 'My AI Assistant',
    capabilities: ['data-analysis', 'reporting']
  })
  .withDescription('Specialized in data analysis')
  .withType(1) // SERVICE_AGENT
  .withSigner(signer)
  .execute()

console.log('Agent registered:', address)
console.log('Signature:', signature)
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
// Initialize with just config (signer passed to builders via withSigner)
const client = new GhostSpeakClient({ rpcEndpoint: 'https://api.devnet.solana.com' })

// List marketplace services (Fluent API Query)
const listinghost = await client.marketplace().query().serviceListings()

// Create a work order
const { address, signature } = await client.marketplace()
  .service() // Create service purchase builder
  .pricePerHour(100n) // Example configuration
  // ... other configuration ...
  .withSigner(signer)
  // Note: Actual purchase would use 'purchase()' builder if available
  // This is illustrative of the fluent pattern
  // For buying: client.marketplace().purchase().listing(addr).withSigner(s).execute()
  .execute() 
  
console.log('Transaction signature:', signature)
`))
    
    await this.waitForKeyPress()
  }

  private async testConnection(): Promise<void> {
    const s = spinner()
    s.start('Testing network connection...')
    
    try {
      const { rpc } = await initializeClient('devnet')
      const response = await rpc.getSlot().send()
      const slot = response
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
  // 1. No command provided (just 'ghostspeak' or 'ghost')
  // 2. --interactive flag is present
  // But NOT if help or version flaghost are present
  
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