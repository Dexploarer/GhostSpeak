/**
 * Interactive Menu System - Regenerated for Current Architecture
 * Only includes features that actually exist in the codebase
 */

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
          value: 'agents',
          label: 'AI Agents',
          icon: '🤖',
          description: 'Register and manage your AI agents',
          hint: 'Create, list, update agents'
        },
        {
          value: 'ghosts',
          label: 'Ghost Agents',
          icon: '👻',
          description: 'Claim external AI agents and build identity',
          hint: 'x402, Twitter, GitHub agents'
        },
        {
          value: 'reputation',
          label: 'Reputation & Staking',
          icon: '⭐',
          description: 'Ghost Score, GHOST staking, and privacy',
          hint: 'Build trustworthiness'
        },
        {
          value: 'multisig',
          label: 'Multisig Wallets',
          icon: '🔐',
          description: 'Shared control wallets with threshold approvals',
          hint: 'Secure agent management'
        },
        {
          value: 'authorization',
          label: 'Pre-Authorizations',
          icon: '🔑',
          description: 'Trustless reputation update permissions',
          hint: 'Limit access, grant trust'
        },
        {
          value: 'did',
          label: 'Decentralized Identity',
          icon: '🆔',
          description: 'Create and manage DID documents',
          hint: 'Verifiable identities'
        },
        {
          value: 'credentials',
          label: 'Credentials',
          icon: '🔐',
          description: 'Verifiable credentials management',
          hint: 'Issue, verify, sync'
        },
        {
          value: 'escrow',
          label: 'Escrow',
          icon: '💼',
          description: 'x402 marketplace escrow transactions',
          hint: 'Secure payments'
        },
        {
          value: 'wallet',
          label: 'Wallet',
          icon: '💳',
          description: 'Manage wallets and check balances',
          hint: 'Wallet operations'
        },
        {
          value: 'governance',
          label: 'Governance',
          icon: '🏛️',
          description: 'Protocol governance and voting',
          hint: 'DAO operations'
        },
        {
          value: 'development',
          label: 'Development',
          icon: '🛠️',
          description: 'Airdrops, faucets, and dev tools',
          hint: 'Developer resources'
        },
        {
          value: 'dashboards',
          label: 'Interactive Dashboards',
          icon: '📊',
          description: 'Beautiful real-time monitoring interfaces',
          hint: 'Visual monitoring'
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
        case 'agents':
          await this.showAgentMenu()
          break
        case 'ghosts':
          await this.showGhostMenu()
          break
        case 'reputation':
          await this.showReputationMenu()
          break
        case 'multisig':
          await this.showMultisigMenu()
          break
        case 'authorization':
          await this.showAuthorizationMenu()
          break
        case 'did':
          await this.showDIDMenu()
          break
        case 'credentials':
          await this.showCredentialsMenu()
          break
        case 'escrow':
          await this.showEscrowMenu()
          break
        case 'wallet':
          await this.showWalletMenu()
          break
        case 'governance':
          await this.showGovernanceMenu()
          break
        case 'dashboards':
          await this.showDashboardsMenu()
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
      agents: 0
    }

    try {
      const { wallet } = await initializeClient()
      status.wallet = true

      const { loadConfig } = await import('./config.js')
      const cfg = loadConfig()
      const rpcUrl = cfg.rpcUrl ?? 'https://api.devnet.solana.com'
      const rpc = createSolanaRpc(rpcUrl)
      const { value: balance } = await rpc.getBalance(address(wallet.address)).send()
      status.balance = `${(Number(balance) / 1e9).toFixed(4)} SOL`

      try {
        const agentService = container.resolve<IAgentService>(ServiceTokens.AGENT_SERVICE)
        const agents = await agentService.list({ owner: address(wallet.address) })
        status.agents = agents.length
      } catch {
        status.agents = 0
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
    console.log('')

    if (!status.config || !status.wallet) {
      console.log(chalk.yellow('💡 Run "One-Click Setup" to complete your configuration!\n'))
    } else if (parseFloat(status.balance) === 0) {
      console.log(chalk.yellow('💡 Use the faucet or airdrop command to get test tokens!\n'))
    } else {
      console.log(chalk.green('🎉 You\'re all set! Register your first agent.\n'))
    }

    await confirm({ message: 'Press enter to continue...', initialValue: true })
  }

  private async showAgentMenu(): Promise<void> {
    const commands: CommandOption[] = [
      { value: 'register', label: '🤖 Register New Agent', command: 'agent register', hint: 'Create your AI agent' },
      { value: 'list', label: '📋 List My Agents', command: 'agent list', hint: 'View all your agents' },
      { value: 'status', label: '📊 Agent Status', command: 'agent status', hint: 'Check agent health' },
      { value: 'update', label: '✏️ Update Agent', command: 'agent update', hint: 'Modify agent details' },
      { value: 'analytics', label: '📈 Agent Analytics', command: 'agent analytics', hint: 'Performance metrics' },
      { value: 'search', label: '🔍 Search Agents', command: 'agent search', hint: 'Find agents by capability' },
      { value: 'credentials', label: '🔐 Manage Credentials', command: 'agent credentials', hint: 'View and backup' },
      { value: 'back', label: '← Back', command: '', hint: '' }
    ]

    const choice = await select({
      message: chalk.cyan('🤖 AI Agent Management:'),
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

  private async showGhostMenu(): Promise<void> {
    const commands: CommandOption[] = [
      { value: 'dashboard', label: '👻 Ghost Dashboard', command: 'ghost-ui', hint: 'Interactive monitoring' },
      { value: 'claim', label: '🆕 Claim Ghost Agent', command: 'ghost claim', hint: 'Claim external AI agent' },
      { value: 'link', label: '🔗 Link External ID', command: 'ghost link', hint: 'Link Twitter, GitHub, etc.' },
      { value: 'list', label: '📋 List My Ghosts', command: 'ghost list', hint: 'View claimed agents' },
      { value: 'back', label: '← Back', command: '', hint: '' }
    ]

    const choice = await select({
      message: chalk.cyan('👻 Ghost Agent Management:'),
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

  private async showReputationMenu(): Promise<void> {
    const commands: CommandOption[] = [
      { value: 'reputation-ui', label: '📊 Reputation Dashboard', command: 'reputation-ui', hint: 'Ghost Score monitoring' },
      { value: 'staking-ui', label: '💎 Staking Dashboard', command: 'staking-ui', hint: 'GHOST token staking' },
      { value: 'check', label: '⭐ Check Ghost Score', command: 'reputation check', hint: 'View current score' },
      { value: 'stake', label: '💰 Stake GHOST', command: 'staking stake', hint: 'Stake tokens for tier' },
      { value: 'privacy', label: '🔒 Privacy Settings', command: 'privacy', hint: 'Control visibility' },
      { value: 'back', label: '← Back', command: '', hint: '' }
    ]

    const choice = await select({
      message: chalk.cyan('⭐ Reputation & Staking:'),
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

  private async showMultisigMenu(): Promise<void> {
    const commands: CommandOption[] = [
      { value: 'dashboard', label: '🔐 Multisig Dashboard', command: 'multisig-ui', hint: 'Interactive monitoring' },
      { value: 'create', label: '🆕 Create Multisig', command: 'multisig create', hint: 'New shared wallet' },
      { value: 'propose', label: '📝 Create Proposal', command: 'multisig propose', hint: 'Propose action' },
      { value: 'approve', label: '✅ Approve Proposal', command: 'multisig approve', hint: 'Sign proposal' },
      { value: 'execute', label: '⚡ Execute Proposal', command: 'multisig execute', hint: 'Run approved action' },
      { value: 'list', label: '📋 List Multisigs', command: 'multisig list', hint: 'View your multisigs' },
      { value: 'back', label: '← Back', command: '', hint: '' }
    ]

    const choice = await select({
      message: chalk.cyan('🔐 Multisig Wallet Management:'),
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

  private async showAuthorizationMenu(): Promise<void> {
    const commands: CommandOption[] = [
      { value: 'dashboard', label: '🔑 Authorization Dashboard', command: 'auth-ui', hint: 'Interactive monitoring' },
      { value: 'create', label: '🆕 Create Authorization', command: 'auth create', hint: 'Grant limited access' },
      { value: 'revoke', label: '❌ Revoke Authorization', command: 'auth revoke', hint: 'Cancel permission' },
      { value: 'verify', label: '✅ Verify Authorization', command: 'auth verify', hint: 'Check validity' },
      { value: 'list', label: '📋 List Authorizations', command: 'auth list', hint: 'View permissions' },
      { value: 'back', label: '← Back', command: '', hint: '' }
    ]

    const choice = await select({
      message: chalk.cyan('🔑 Pre-Authorization Management:'),
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

  private async showDIDMenu(): Promise<void> {
    const commands: CommandOption[] = [
      { value: 'dashboard', label: '🆔 DID Dashboard', command: 'did-ui', hint: 'Interactive DID manager' },
      { value: 'create', label: '🆕 Create DID', command: 'did create', hint: 'New decentralized identifier' },
      { value: 'update', label: '✏️ Update DID', command: 'did update', hint: 'Modify DID document' },
      { value: 'resolve', label: '🔍 Resolve DID', command: 'did resolve', hint: 'Look up DID document' },
      { value: 'deactivate', label: '❌ Deactivate DID', command: 'did deactivate', hint: 'Revoke identifier' },
      { value: 'back', label: '← Back', command: '', hint: '' }
    ]

    const choice = await select({
      message: chalk.cyan('🆔 Decentralized Identity (DID):'),
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

  private async showCredentialsMenu(): Promise<void> {
    const commands: CommandOption[] = [
      { value: 'sync', label: '🔄 Sync Credentials', command: 'credentials sync', hint: 'Sync verifiable credentials' },
      { value: 'back', label: '← Back', command: '', hint: '' }
    ]

    const choice = await select({
      message: chalk.cyan('🔐 Verifiable Credentials:'),
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

  private async showEscrowMenu(): Promise<void> {
    const commands: CommandOption[] = [
      { value: 'dashboard', label: '💼 Escrow Dashboard', command: 'escrow-ui', hint: 'Interactive escrow monitor' },
      { value: 'create', label: '🆕 Create Escrow', command: 'escrow create', hint: 'New secure transaction' },
      { value: 'approve', label: '✅ Approve Escrow', command: 'escrow approve', hint: 'Confirm completion' },
      { value: 'dispute', label: '⚖️ File Dispute', command: 'escrow dispute', hint: 'Contest transaction' },
      { value: 'list', label: '📋 List Escrows', command: 'escrow list', hint: 'View all escrows' },
      { value: 'get', label: '🔍 Get Escrow Details', command: 'escrow get', hint: 'View specific escrow' },
      { value: 'back', label: '← Back', command: '', hint: '' }
    ]

    const choice = await select({
      message: chalk.cyan('💼 Escrow Management:'),
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

  private async showDashboardsMenu(): Promise<void> {
    const commands: CommandOption[] = [
      { value: 'main', label: '📊 Main Dashboard', command: 'dashboard', hint: 'Overview of all metrics' },
      { value: 'reputation', label: '⭐ Reputation Dashboard', command: 'reputation-ui', hint: 'Ghost Score tracking' },
      { value: 'staking', label: '💎 Staking Dashboard', command: 'staking-ui', hint: 'GHOST token staking' },
      { value: 'ghost', label: '👻 Ghost Dashboard', command: 'ghost-ui', hint: 'Claimed agents' },
      { value: 'multisig', label: '🔐 Multisig Dashboard', command: 'multisig-ui', hint: 'Shared wallets' },
      { value: 'auth', label: '🔑 Authorization Dashboard', command: 'auth-ui', hint: 'Pre-authorizations' },
      { value: 'did', label: '🆔 DID Dashboard', command: 'did-ui', hint: 'Decentralized identity' },
      { value: 'escrow', label: '💼 Escrow Dashboard', command: 'escrow-ui', hint: 'Transaction monitoring' },
      { value: 'privacy', label: '🔒 Privacy Dashboard', command: 'privacy-ui', hint: 'Privacy settings' },
      { value: 'airdrop', label: '🪂 Airdrop Dashboard', command: 'airdrop-ui', hint: 'GHOST token claims' },
      { value: 'back', label: '← Back', command: '', hint: '' }
    ]

    const choice = await select({
      message: chalk.cyan('📊 Interactive Dashboards:'),
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
      { value: 'balance', label: '💰 Check Balance', command: 'wallet balance', hint: 'View wallet balance' },
      { value: 'use', label: '🔄 Switch Wallet', command: 'wallet use', hint: 'Change active wallet' },
      { value: 'back', label: '← Back', command: '', hint: '' }
    ]

    const choice = await select({
      message: chalk.cyan('💳 Wallet Manager:'),
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
      { value: 'proposal-create', label: '📝 Create Proposal', command: 'governance proposal create', hint: 'DAO governance proposal' },
      { value: 'proposal-list', label: '📜 View Proposals', command: 'governance proposal list', hint: 'Active proposals' },
      { value: 'vote', label: '🗳️ Vote on Proposal', command: 'governance vote', hint: 'Cast your vote' },
      { value: 'rbac-grant', label: '🛡️ Grant Role', command: 'governance rbac grant', hint: 'Grant permissions' },
      { value: 'rbac-revoke', label: '🚫 Revoke Role', command: 'governance rbac revoke', hint: 'Remove permissions' },
      { value: 'back', label: '← Back', command: '', hint: '' }
    ]

    const choice = await select({
      message: chalk.cyan('🏛️ DAO Governance:'),
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
      { value: 'airdrop', label: '🪂 Get GHOST Tokens', command: 'airdrop', hint: 'Devnet GHOST airdrop' },
      { value: 'faucet', label: '💧 Get SOL', command: 'faucet', hint: 'Request SOL from faucet' },
      { value: 'sdk-info', label: '📦 SDK Information', command: 'sdk info', hint: 'Check SDK installation' },
      { value: 'diagnose', label: '🔍 Diagnose Issues', command: 'diagnose', hint: 'Run diagnostics' },
      { value: 'update', label: '⬆️ Update CLI', command: 'update', hint: 'Update to latest version' },
      { value: 'back', label: '← Back to Main Menu', command: '', hint: '' }
    ]

    const choice = await select({
      message: chalk.cyan('🛠️ Development Menu:'),
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
    console.log('  1. Use "Quick Start" to set up your wallet and configuration')
    console.log('  2. Use "AI Agents" to register and manage your agents')
    console.log('  3. Use "Development" for airdrops and testing tools\n')

    console.log(chalk.bold('Key Features:'))
    console.log(chalk.gray('  🤖 AI Agents') + '       - Register and manage autonomous AI agents')
    console.log(chalk.gray('  💳 Wallets') + '         - Multi-wallet management with HD derivation')
    console.log(chalk.gray('  🏛️ Governance') + '      - Multisig wallets and DAO voting')
    console.log(chalk.gray('  📡 A2A') + '             - Agent-to-Agent communication protocol\n')

    console.log(chalk.bold('Resources:'))
    console.log('  Documentation: https://docs.ghostspeak.io')
    console.log('  GitHub: https://github.com/ghostspeak/ghostspeak')
    console.log('  Discord: https://discord.gg/ghostspeak\n')

    console.log(chalk.bold('Tips:'))
    console.log('  • Use direct commands for scripts: ' + chalk.gray('ghost agent list'))
    console.log('  • Add ' + chalk.gray('--interactive') + ' to force menu mode')
    console.log('  • Recent commands are saved for quick access\n')

    await this.waitForKeyPress()
  }

  private async executeCommand(command: string): Promise<void> {
    console.log(chalk.gray(`\n└─ Executing: ${command}\n`))

    try {
      const args = command.split(' ')
      const { spawn } = await import('child_process')

      let cliCommand: string
      let cliArgs: string[]

      if (process.argv[1]?.endsWith('.js')) {
        cliCommand = process.argv[0]
        cliArgs = [process.argv[1], ...args]
      } else {
        cliCommand = 'ghost'
        cliArgs = args
      }

      const child = spawn(cliCommand, cliArgs, {
        stdio: 'inherit',
        env: process.env,
        shell: true
      })

      await new Promise<void>((resolve) => {
        child.on('close', () => resolve())
        child.on('error', (err) => {
          console.error(`Failed to execute command: ${err.message}`)
          resolve()
        })
      })

      await new Promise(resolve => setTimeout(resolve, 100))

    } catch (error) {
      console.error(chalk.red(`\n❌ Error executing command: ${error instanceof Error ? error.message : 'Unknown error'}`))
    }

    console.log('')
  }

  private saveRecentCommand(command: string, label: string): void {
    try {
      const recentCommands = this.getRecentCommands()
      const filtered = recentCommands.filter(cmd => cmd.command !== command)
      filtered.unshift({ command, label, timestamp: Date.now() })
      const toSave = filtered.slice(0, MAX_RECENT_COMMANDS)

      const dir = join(homedir(), '.ghostspeak')
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true })
      }

      writeFileSync(RECENT_COMMANDS_FILE, JSON.stringify(toSave, null, 2))
    } catch (error) {
      // Silently ignore errors
    }
  }

  private getRecentCommands(): { command: string; label: string; timestamp: number }[] {
    try {
      if (existsSync(RECENT_COMMANDS_FILE)) {
        return JSON.parse(readFileSync(RECENT_COMMANDS_FILE, 'utf-8')) as { command: string; label: string; timestamp: number }[]
      }
    } catch (error) {
      // Ignore errors
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
}

// Helper function to check if running in interactive mode
export function shouldRunInteractive(argv: string[]): boolean {
  const hasInteractiveFlag = argv.includes('--interactive') || argv.includes('-i')
  const hasHelpFlag = argv.includes('--help') || argv.includes('-h')
  const hasVersionFlag = argv.includes('--version') || argv.includes('-v')

  if (hasHelpFlag || hasVersionFlag) {
    return false
  }

  if (hasInteractiveFlag) {
    return true
  }

  const hasCommand = argv.length > 2 && !argv[2].startsWith('-')
  return !hasCommand
}
