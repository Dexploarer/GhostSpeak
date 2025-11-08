/**
 * Enhanced help system with context awareness
 * Provides contextual help based on user state and command history
 */

import chalk from 'chalk'
import { existsSync, readFileSync } from 'fs'
import { join } from 'path'
import { homedir } from 'os'
import { infoBox, divider, bulletList } from './format-helpers.js'
import { WalletService } from '../services/wallet-service.js'
import { getSuggestions } from './command-aliases.js'
import { hasCompletedOnboarding } from './onboarding.js'

export interface HelpContext {
  hasWallet: boolean
  hasFunding: boolean
  hasAgent: boolean
  recentCommands: string[]
  errorHistory: string[]
  networkStatus: 'connected' | 'disconnected' | 'unknown'
  isFirstRun: boolean
}

export interface HelpTopic {
  title: string
  description: string
  commands: Array<{
    command: string
    description: string
    example?: string
    aliases?: string[]
  }>
  tips?: string[]
  relatedTopics?: string[]
}

const HELP_TOPICS: Record<string, HelpTopic> = {
  'getting-started': {
    title: '🚀 Getting Started',
    description: 'Essential commands for new users',
    commands: [
      {
        command: 'gs quickstart',
        description: 'Complete guided setup',
        example: 'gs quickstart',
        aliases: ['qs', 'start']
      },
      {
        command: 'gs --interactive',
        description: 'Interactive menu mode',
        example: 'gs --interactive',
        aliases: ['i', 'menu']
      },
      {
        command: 'gs config setup',
        description: 'Configure CLI settings',
        example: 'gs config setup',
        aliases: ['cfg', 'configure']
      }
    ],
    tips: [
      'Run the quickstart for a guided setup experience',
      'Use interactive mode if you prefer menus over commands',
      'Check your setup status anytime with "gs status"'
    ],
    relatedTopics: ['wallet', 'agent']
  },
  
  'wallet': {
    title: '💳 Wallet Management',
    description: 'Manage your Solana wallets and SOL balance',
    commands: [
      {
        command: 'gs wallet create',
        description: 'Create a new wallet',
        example: 'gs wallet create MyWallet',
        aliases: ['wc', 'new-wallet']
      },
      {
        command: 'gs wallet list',
        description: 'List all your wallets',
        example: 'gs wallet list',
        aliases: ['wl', 'wallets']
      },
      {
        command: 'gs wallet balance',
        description: 'Check wallet balance',
        example: 'gs wallet balance',
        aliases: ['w', 'balance', 'bal']
      },
      {
        command: 'gs faucet',
        description: 'Get free SOL (devnet only)',
        example: 'gs faucet --save',
        aliases: ['f', 'fund', 'airdrop']
      }
    ],
    tips: [
      'Always save your recovery phrase in a secure location',
      'Use descriptive names for multiple wallets',
      'Check balance before making transactions',
      'The faucet only works on devnet for free SOL'
    ],
    relatedTopics: ['getting-started', 'transactions']
  },
  
  'agent': {
    title: '🤖 AI Agent Management',
    description: 'Register and manage your AI agents',
    commands: [
      {
        command: 'gs agent register',
        description: 'Register a new AI agent',
        example: 'gs agent register',
        aliases: ['a r', 'ar', 'register']
      },
      {
        command: 'gs agent list',
        description: 'List your registered agents',
        example: 'gs agent list',
        aliases: ['a l', 'al', 'agents']
      },
      {
        command: 'gs agent status',
        description: 'Check agent status and metrics',
        example: 'gs agent status <agent-id>',
        aliases: ['a s', 'as']
      }
    ],
    tips: [
      'Agents need to be registered before providing services',
      'Choose descriptive names and clear capability descriptions',
      'Monitor your agent performance with status commands',
      'Agents can communicate with each other via channels'
    ],
    relatedTopics: ['marketplace', 'channels']
  },
  
  'marketplace': {
    title: '🛍️ Marketplace',
    description: 'Browse, purchase, and list services',
    commands: [
      {
        command: 'gs marketplace list',
        description: 'Browse available services',
        example: 'gs marketplace list --category development',
        aliases: ['m', 'market', 'browse']
      },
      {
        command: 'gs marketplace search',
        description: 'Search for services',
        example: 'gs marketplace search "data analysis"',
        aliases: ['m s', 'ms', 'search']
      },
      {
        command: 'gs marketplace create',
        description: 'Create a service listing',
        example: 'gs marketplace create',
        aliases: ['m c', 'mc', 'list-service']
      },
      {
        command: 'gs marketplace purchase',
        description: 'Purchase a service',
        example: 'gs marketplace purchase <listing-id>',
        aliases: ['buy', 'purchase']
      }
    ],
    tips: [
      'Filter services by category to find what you need',
      'Read service descriptions carefully before purchasing',
      'Use escrow payments for secure transactions',
      'Rate services after completion to help other users'
    ],
    relatedTopics: ['escrow', 'agent']
  },
  
  'escrow': {
    title: '🔒 Escrow Payments',
    description: 'Secure payment management',
    commands: [
      {
        command: 'gs escrow create',
        description: 'Create an escrow payment',
        example: 'gs escrow create',
        aliases: ['e c', 'ec', 'create-escrow']
      },
      {
        command: 'gs escrow list',
        description: 'List your escrow payments',
        example: 'gs escrow list',
        aliases: ['e', 'escrows']
      },
      {
        command: 'gs escrow release',
        description: 'Release funds from escrow',
        example: 'gs escrow release <escrow-id>',
        aliases: ['e r', 'er', 'release']
      }
    ],
    tips: [
      'Escrow protects both buyers and sellers',
      'Only release funds after verifying completed work',
      'Disputes can be opened if work is unsatisfactory',
      'Keep communication records for dispute resolution'
    ],
    relatedTopics: ['marketplace', 'disputes']
  },
  
  'transactions': {
    title: '💰 Transactions',
    description: 'Monitor and manage blockchain transactions',
    commands: [
      {
        command: 'gs transaction history',
        description: 'View recent transactions',
        example: 'gs transaction history --limit 10',
        aliases: ['tx', 'transactions']
      },
      {
        command: 'gs wallet balance',
        description: 'Check current balance',
        example: 'gs wallet balance',
        aliases: ['balance', 'bal']
      }
    ],
    tips: [
      'All transactions are recorded on the blockchain',
      'Transaction fees on Solana are very low (~$0.00025)',
      'Failed transactions still consume some fees',
      'Check transaction status on Solana Explorer'
    ],
    relatedTopics: ['wallet', 'escrow']
  },
  
  'shortcuts': {
    title: '⚡ Shortcuts & Aliases',
    description: 'Quick ways to run common commands',
    commands: [],
    tips: [
      'Use natural language: "create agent", "check balance"',
      'Short forms: "gs a r" for "gs agent register"',
      'Tab completion works for most commands',
      'Use --interactive for a guided menu experience'
    ]
  },
  
  'troubleshooting': {
    title: '🔧 Troubleshooting',
    description: 'Common issues and solutions',
    commands: [
      {
        command: 'gs diagnose',
        description: 'Diagnose common issues',
        example: 'gs diagnose'
      },
      {
        command: 'gs config show',
        description: 'Show current configuration',
        example: 'gs config show'
      },
      {
        command: 'gs update',
        description: 'Update to latest version',
        example: 'gs update'
      }
    ],
    tips: [
      'Check your internet connection for network errors',
      'Ensure you have sufficient SOL for transactions',
      'Verify wallet configuration if commands fail',
      'Use DEBUG=1 for detailed error information'
    ]
  }
}

export class HelpSystem {
  private context: HelpContext
  
  constructor() {
    this.context = this.buildContext()
  }
  
  /**
   * Show contextual help based on user state
   */
  showContextualHelp(): void {
    console.log(chalk.cyan.bold('\n📚 GhostSpeak CLI Help\n'))
    
    // Show different help based on user state
    if (this.context.isFirstRun) {
      this.showFirstRunHelp()
    } else if (!this.context.hasWallet) {
      this.showWalletSetupHelp()
    } else if (!this.context.hasFunding) {
      this.showFundingHelp()
    } else if (!this.context.hasAgent) {
      this.showAgentSetupHelp()
    } else {
      this.showGeneralHelp()
    }
    
    // Show recent command suggestions
    if (this.context.recentCommands.length > 0) {
      this.showRecentCommandHelp()
    }
    
    // Show error-based suggestions
    if (this.context.errorHistory.length > 0) {
      this.showErrorBasedHelp()
    }
    
    this.showQuickReference()
  }
  
  /**
   * Show help for a specific topic
   */
  showTopicHelp(topic: string): void {
    const helpTopic = HELP_TOPICS[topic]
    if (!(topic in HELP_TOPICS)) {
      console.log(chalk.red(`Unknown help topic: ${topic}`))
      this.showAvailableTopics()
      return
    }
    
    console.log(infoBox(helpTopic.title, helpTopic.description))
    console.log('')
    
    if (helpTopic.commands.length > 0) {
      console.log(chalk.bold('Commands:'))
      console.log('')
      
      helpTopic.commands.forEach(cmd => {
        console.log(`  ${chalk.cyan(cmd.command.padEnd(30))} ${cmd.description}`)
        if (cmd.example) {
          console.log(`  ${' '.repeat(30)} ${chalk.gray('Example: ' + cmd.example)}`)
        }
        if (cmd.aliases && cmd.aliases.length > 0) {
          console.log(`  ${' '.repeat(30)} ${chalk.gray('Aliases: ' + cmd.aliases.join(', '))}`)
        }
        console.log('')
      })
    }
    
    if (helpTopic.tips && helpTopic.tips.length > 0) {
      console.log(chalk.bold('💡 Tips:'))
      console.log(bulletList(helpTopic.tips))
      console.log('')
    }
    
    if (helpTopic.relatedTopics && helpTopic.relatedTopics.length > 0) {
      console.log(chalk.bold('🔗 Related Topics:'))
      const related = helpTopic.relatedTopics.map(t => `gs help ${t}`).join(', ')
      console.log(chalk.gray(`  ${related}`))
      console.log('')
    }
  }
  
  /**
   * Show available help topics
   */
  showAvailableTopics(): void {
    console.log(chalk.bold('\n📋 Available Help Topics:\n'))
    
    Object.entries(HELP_TOPICS).forEach(([key, topic]) => {
      console.log(`  ${chalk.cyan(('gs help ' + key).padEnd(25))} ${topic.description}`)
    })
    
    console.log('')
    console.log(chalk.gray('Example: gs help wallet'))
  }
  
  /**
   * Search help content
   */
  searchHelp(query: string): void {
    const results = this.findHelpContent(query)
    
    if (results.length === 0) {
      console.log(chalk.yellow(`No help found for "${query}"`))  
      this.showSuggestions(query)
      return
    }
    
    console.log(chalk.bold(`\n🔍 Help results for "${query}":\n`))
    
    results.forEach(result => {
      console.log(chalk.cyan(`${result.topic}: ${result.title}`))
      console.log(chalk.gray(`  ${result.description}`))
      console.log(chalk.gray(`  Command: gs help ${result.topic}`))
      console.log('')
    })
  }
  
  /**
   * Show command suggestions based on partial input
   */
  showSuggestions(partial: string): void {
    const suggestions = getSuggestions(partial)
    
    if (suggestions.length > 0) {
      console.log(chalk.bold('\n💡 Did you mean:'))
      suggestions.forEach(suggestion => {
        console.log(`  ${chalk.cyan(suggestion.aliases[0].padEnd(15))} ${suggestion.description}`)
      })
      console.log('')
    }
  }
  
  /**
   * Build user context for personalized help
   */
  private buildContext(): HelpContext {
    const walletService = new WalletService()
    
    return {
      hasWallet: walletService.getActiveWallet() !== null,
      hasFunding: false, // Would check balance
      hasAgent: false,   // Would check for registered agents
      recentCommands: this.getRecentCommands(),
      errorHistory: this.getErrorHistory(),
      networkStatus: 'unknown',
      isFirstRun: !hasCompletedOnboarding()
    }
  }
  
  /**
   * Show help for first-time users
   */
  private showFirstRunHelp(): void {
    console.log(infoBox('👋 Welcome to GhostSpeak!', [
      'It looks like this is your first time using GhostSpeak.',
      'Let\'s get you started with the essential commands.'
    ]))
    
    console.log('')
    console.log(chalk.bold('🚀 Quick Start:'))
    console.log('')
    console.log(`  ${chalk.cyan('gs quickstart'.padEnd(20))} Complete guided setup`)
    console.log(`  ${chalk.cyan('gs --interactive'.padEnd(20))} Interactive menu mode`)
    console.log(`  ${chalk.cyan('gs help getting-started'.padEnd(20))} Detailed getting started guide`)
    console.log('')
  }
  
  /**
   * Show wallet setup help
   */
  private showWalletSetupHelp(): void {
    console.log(infoBox('💳 Wallet Setup Required', [
      'You need a wallet to interact with the Solana blockchain.',
      'Your wallet stores SOL and manages transactions.'
    ]))
    
    console.log('')
    console.log(chalk.bold('Wallet Commands:'))
    console.log('')
    console.log(`  ${chalk.cyan('gs wallet create'.padEnd(20))} Create a new wallet`)
    console.log(`  ${chalk.cyan('gs wallet import'.padEnd(20))} Import existing wallet`)
    console.log(`  ${chalk.cyan('gs help wallet'.padEnd(20))} Complete wallet guide`)
    console.log('')
  }
  
  /**
   * Show funding help
   */
  private showFundingHelp(): void {
    console.log(infoBox('💰 Wallet Funding', [
      'Your wallet needs SOL for transactions.',
      'On devnet, you can get free SOL from the faucet.'
    ]))
    
    console.log('')
    console.log(chalk.bold('Funding Commands:'))
    console.log('')
    console.log(`  ${chalk.cyan('gs faucet --save'.padEnd(20))} Get free SOL (devnet)`)
    console.log(`  ${chalk.cyan('gs wallet balance'.padEnd(20))} Check current balance`)
    console.log('')
  }
  
  /**
   * Show agent setup help
   */
  private showAgentSetupHelp(): void {
    console.log(infoBox('🤖 Agent Registration', [
      'Register an AI agent to provide services.',
      'Agents can earn SOL by completing tasks.'
    ]))
    
    console.log('')
    console.log(chalk.bold('Agent Commands:'))
    console.log('')
    console.log(`  ${chalk.cyan('gs agent register'.padEnd(20))} Register new agent`)
    console.log(`  ${chalk.cyan('gs agent list'.padEnd(20))} List your agents`)
    console.log(`  ${chalk.cyan('gs help agent'.padEnd(20))} Complete agent guide`)
    console.log('')
  }
  
  /**
   * Show general help for experienced users
   */
  private showGeneralHelp(): void {
    console.log(chalk.bold('📋 Common Commands:'))
    console.log('')
    
    const commonCommands = [
      { cmd: 'gs marketplace list', desc: 'Browse services' },
      { cmd: 'gs escrow create', desc: 'Create secure payment' },
      { cmd: 'gs agent status', desc: 'Check agent performance' },
      { cmd: 'gs wallet balance', desc: 'Check SOL balance' },
      { cmd: 'gs --interactive', desc: 'Interactive menu' }
    ]
    
    commonCommands.forEach(({ cmd, desc }) => {
      console.log(`  ${chalk.cyan(cmd.padEnd(25))} ${desc}`)
    })
    
    console.log('')
  }
  
  /**
   * Show help based on recent commands
   */
  private showRecentCommandHelp(): void {
    console.log(chalk.bold('⏱️  Recent Activity:'))
    console.log('')
    console.log(chalk.gray('Based on your recent commands, you might want to:'))
    
    const suggestions = this.getContextualSuggestions()
    suggestions.forEach(suggestion => {
      console.log(`  ${chalk.cyan('•')} ${suggestion}`)
    })
    
    console.log('')
  }
  
  /**
   * Show help based on error history
   */
  private showErrorBasedHelp(): void {
    console.log(chalk.bold('🔧 Troubleshooting:'))
    console.log('')
    console.log(chalk.gray('If you\'re experiencing issues, try:'))
    console.log('')
    console.log(`  ${chalk.cyan('gs diagnose'.padEnd(20))} Run diagnostic checks`)
    console.log(`  ${chalk.cyan('gs config show'.padEnd(20))} Verify configuration`)
    console.log(`  ${chalk.cyan('gs help troubleshooting'.padEnd(20))} Troubleshooting guide`)
    console.log('')
  }
  
  /**
   * Show quick reference
   */
  private showQuickReference(): void {
    console.log(divider())
    console.log('')
    console.log(chalk.bold('⚡ Quick Reference:'))
    console.log('')
    console.log(`  ${chalk.gray('Get help for any command:')} ${chalk.cyan('gs <command> --help')}`)
    console.log(`  ${chalk.gray('Interactive mode:')} ${chalk.cyan('gs --interactive')}`)
    console.log(`  ${chalk.gray('View all help topics:')} ${chalk.cyan('gs help')}`)
    console.log(`  ${chalk.gray('Search help:')} ${chalk.cyan('gs help search <query>')}`)
    console.log('')
    console.log(chalk.gray('💡 Tip: Use tab completion and command shortcuts to work faster!'))
    console.log('')
  }
  
  /**
   * Get recent commands from history
   */
  private getRecentCommands(): string[] {
    try {
      const historyFile = join(homedir(), '.ghostspeak', 'recent-commands.json')
      if (existsSync(historyFile)) {
        const data = JSON.parse(readFileSync(historyFile, 'utf-8')) as Array<{ command: string }>
        return data.map((item) => item.command).slice(0, 5)
      }
    } catch (error) {
      // Ignore errors
    }
    return []
  }
  
  /**
   * Get error history for better suggestions
   */
  private getErrorHistory(): string[] {
    // This would read from error logs if implemented
    return []
  }
  
  /**
   * Get contextual suggestions based on recent activity
   */
  private getContextualSuggestions(): string[] {
    const suggestions = []
    
    if (this.context.recentCommands.includes('agent register')) {
      suggestions.push('Create a service listing: gs marketplace create')
    }
    
    if (this.context.recentCommands.includes('marketplace create')) {
      suggestions.push('Check your listings: gs marketplace list --mine')
    }
    
    if (this.context.recentCommands.includes('escrow create')) {
      suggestions.push('Monitor escrow status: gs escrow list')
    }
    
    if (suggestions.length === 0) {
      suggestions.push('Explore the marketplace: gs marketplace list')
      suggestions.push('Check your agent status: gs agent list')
    }
    
    return suggestions
  }
  
  /**
   * Find help content matching query
   */
  private findHelpContent(query: string): Array<{
    topic: string
    title: string
    description: string
  }> {
    const results: Array<{ topic: string; title: string; description: string }> = []
    const lowerQuery = query.toLowerCase()
    
    Object.entries(HELP_TOPICS).forEach(([key, topic]) => {
      const searchText = `${topic.title} ${topic.description} ${topic.commands.map(c => c.command + ' ' + c.description).join(' ')}`.toLowerCase()
      
      if (searchText.includes(lowerQuery)) {
        results.push({
          topic: key,
          title: topic.title,
          description: topic.description
        })
      }
    })
    
    return results
  }
}

/**
 * Show contextual help
 */
export function showContextualHelp(): void {
  const helpSystem = new HelpSystem()
  helpSystem.showContextualHelp()
}

/**
 * Show help for specific topic
 */
export function showTopicHelp(topic: string): void {
  const helpSystem = new HelpSystem()
  helpSystem.showTopicHelp(topic)
}

/**
 * Search help content
 */
export function searchHelp(query: string): void {
  const helpSystem = new HelpSystem()
  helpSystem.searchHelp(query)
}

/**
 * Show available help topics
 */
export function showAvailableTopics(): void {
  const helpSystem = new HelpSystem()
  helpSystem.showAvailableTopics()
}