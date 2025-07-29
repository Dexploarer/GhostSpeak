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
import { COMMAND_ALIASES, getSuggestions } from './command-aliases.js'
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
      'Check your setup status anytime with \"gs status\"'
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
        example: 'gs marketplace search \"data analysis\"',
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
    title: '🔧 Troubleshooting',\n    description: 'Common issues and solutions',\n    commands: [\n      {\n        command: 'gs diagnose',\n        description: 'Diagnose common issues',\n        example: 'gs diagnose'\n      },\n      {\n        command: 'gs config show',\n        description: 'Show current configuration',\n        example: 'gs config show'\n      },\n      {\n        command: 'gs update',\n        description: 'Update to latest version',\n        example: 'gs update'\n      }\n    ],\n    tips: [\n      'Check your internet connection for network errors',\n      'Ensure you have sufficient SOL for transactions',\n      'Verify wallet configuration if commands fail',\n      'Use DEBUG=1 for detailed error information'\n    ]\n  }\n}\n\nexport class HelpSystem {\n  private context: HelpContext\n  \n  constructor() {\n    this.context = this.buildContext()\n  }\n  \n  /**\n   * Show contextual help based on user state\n   */\n  showContextualHelp(): void {\n    console.log(chalk.cyan.bold('\\n📚 GhostSpeak CLI Help\\n'))\n    \n    // Show different help based on user state\n    if (this.context.isFirstRun) {\n      this.showFirstRunHelp()\n    } else if (!this.context.hasWallet) {\n      this.showWalletSetupHelp()\n    } else if (!this.context.hasFunding) {\n      this.showFundingHelp()\n    } else if (!this.context.hasAgent) {\n      this.showAgentSetupHelp()\n    } else {\n      this.showGeneralHelp()\n    }\n    \n    // Show recent command suggestions\n    if (this.context.recentCommands.length > 0) {\n      this.showRecentCommandHelp()\n    }\n    \n    // Show error-based suggestions\n    if (this.context.errorHistory.length > 0) {\n      this.showErrorBasedHelp()\n    }\n    \n    this.showQuickReference()\n  }\n  \n  /**\n   * Show help for a specific topic\n   */\n  showTopicHelp(topic: string): void {\n    const helpTopic = HELP_TOPICS[topic]\n    if (!helpTopic) {\n      console.log(chalk.red(`Unknown help topic: ${topic}`))\n      this.showAvailableTopics()\n      return\n    }\n    \n    console.log(infoBox(helpTopic.title, helpTopic.description))\n    console.log('')\n    \n    if (helpTopic.commands.length > 0) {\n      console.log(chalk.bold('Commands:'))\n      console.log('')\n      \n      helpTopic.commands.forEach(cmd => {\n        console.log(`  ${chalk.cyan(cmd.command.padEnd(30))} ${cmd.description}`)\n        if (cmd.example) {\n          console.log(`  ${' '.repeat(30)} ${chalk.gray('Example: ' + cmd.example)}`)\n        }\n        if (cmd.aliases && cmd.aliases.length > 0) {\n          console.log(`  ${' '.repeat(30)} ${chalk.gray('Aliases: ' + cmd.aliases.join(', '))}`)\n        }\n        console.log('')\n      })\n    }\n    \n    if (helpTopic.tips && helpTopic.tips.length > 0) {\n      console.log(chalk.bold('💡 Tips:'))\n      console.log(bulletList(helpTopic.tips))\n      console.log('')\n    }\n    \n    if (helpTopic.relatedTopics && helpTopic.relatedTopics.length > 0) {\n      console.log(chalk.bold('🔗 Related Topics:'))\n      const related = helpTopic.relatedTopics.map(t => `gs help ${t}`).join(', ')\n      console.log(chalk.gray(`  ${related}`))\n      console.log('')\n    }\n  }\n  \n  /**\n   * Show available help topics\n   */\n  showAvailableTopics(): void {\n    console.log(chalk.bold('\\n📋 Available Help Topics:\\n'))\n    \n    Object.entries(HELP_TOPICS).forEach(([key, topic]) => {\n      console.log(`  ${chalk.cyan(('gs help ' + key).padEnd(25))} ${topic.description}`)\n    })\n    \n    console.log('')\n    console.log(chalk.gray('Example: gs help wallet'))\n  }\n  \n  /**\n   * Search help content\n   */\n  searchHelp(query: string): void {\n    const results = this.findHelpContent(query)\n    \n    if (results.length === 0) {\n      console.log(chalk.yellow(`No help found for \"${query}\"`))  \n      this.showSuggestions(query)\n      return\n    }\n    \n    console.log(chalk.bold(`\\n🔍 Help results for \"${query}\":\\n`))\n    \n    results.forEach(result => {\n      console.log(chalk.cyan(`${result.topic}: ${result.title}`))\n      console.log(chalk.gray(`  ${result.description}`))\n      console.log(chalk.gray(`  Command: gs help ${result.topic}`))\n      console.log('')\n    })\n  }\n  \n  /**\n   * Show command suggestions based on partial input\n   */\n  showSuggestions(partial: string): void {\n    const suggestions = getSuggestions(partial)\n    \n    if (suggestions.length > 0) {\n      console.log(chalk.bold('\\n💡 Did you mean:'))\n      suggestions.forEach(suggestion => {\n        console.log(`  ${chalk.cyan(suggestion.aliases[0].padEnd(15))} ${suggestion.description}`)\n      })\n      console.log('')\n    }\n  }\n  \n  /**\n   * Build user context for personalized help\n   */\n  private buildContext(): HelpContext {\n    const walletService = new WalletService()\n    \n    return {\n      hasWallet: walletService.getActiveWallet() !== null,\n      hasFunding: false, // Would check balance\n      hasAgent: false,   // Would check for registered agents\n      recentCommands: this.getRecentCommands(),\n      errorHistory: this.getErrorHistory(),\n      networkStatus: 'unknown',\n      isFirstRun: !hasCompletedOnboarding()\n    }\n  }\n  \n  /**\n   * Show help for first-time users\n   */\n  private showFirstRunHelp(): void {\n    console.log(infoBox('👋 Welcome to GhostSpeak!', [\n      'It looks like this is your first time using GhostSpeak.',\n      'Let\\'s get you started with the essential commands.'\n    ]))\n    \n    console.log('')\n    console.log(chalk.bold('🚀 Quick Start:'))\n    console.log('')\n    console.log(`  ${chalk.cyan('gs quickstart'.padEnd(20))} Complete guided setup`)\n    console.log(`  ${chalk.cyan('gs --interactive'.padEnd(20))} Interactive menu mode`)\n    console.log(`  ${chalk.cyan('gs help getting-started'.padEnd(20))} Detailed getting started guide`)\n    console.log('')\n  }\n  \n  /**\n   * Show wallet setup help\n   */\n  private showWalletSetupHelp(): void {\n    console.log(infoBox('💳 Wallet Setup Required', [\n      'You need a wallet to interact with the Solana blockchain.',\n      'Your wallet stores SOL and manages transactions.'\n    ]))\n    \n    console.log('')\n    console.log(chalk.bold('Wallet Commands:'))\n    console.log('')\n    console.log(`  ${chalk.cyan('gs wallet create'.padEnd(20))} Create a new wallet`)\n    console.log(`  ${chalk.cyan('gs wallet import'.padEnd(20))} Import existing wallet`)\n    console.log(`  ${chalk.cyan('gs help wallet'.padEnd(20))} Complete wallet guide`)\n    console.log('')\n  }\n  \n  /**\n   * Show funding help\n   */\n  private showFundingHelp(): void {\n    console.log(infoBox('💰 Wallet Funding', [\n      'Your wallet needs SOL for transactions.',\n      'On devnet, you can get free SOL from the faucet.'\n    ]))\n    \n    console.log('')\n    console.log(chalk.bold('Funding Commands:'))\n    console.log('')\n    console.log(`  ${chalk.cyan('gs faucet --save'.padEnd(20))} Get free SOL (devnet)`)\n    console.log(`  ${chalk.cyan('gs wallet balance'.padEnd(20))} Check current balance`)\n    console.log('')\n  }\n  \n  /**\n   * Show agent setup help\n   */\n  private showAgentSetupHelp(): void {\n    console.log(infoBox('🤖 Agent Registration', [\n      'Register an AI agent to provide services.',\n      'Agents can earn SOL by completing tasks.'\n    ]))\n    \n    console.log('')\n    console.log(chalk.bold('Agent Commands:'))\n    console.log('')\n    console.log(`  ${chalk.cyan('gs agent register'.padEnd(20))} Register new agent`)\n    console.log(`  ${chalk.cyan('gs agent list'.padEnd(20))} List your agents`)\n    console.log(`  ${chalk.cyan('gs help agent'.padEnd(20))} Complete agent guide`)\n    console.log('')\n  }\n  \n  /**\n   * Show general help for experienced users\n   */\n  private showGeneralHelp(): void {\n    console.log(chalk.bold('📋 Common Commands:'))\n    console.log('')\n    \n    const commonCommands = [\n      { cmd: 'gs marketplace list', desc: 'Browse services' },\n      { cmd: 'gs escrow create', desc: 'Create secure payment' },\n      { cmd: 'gs agent status', desc: 'Check agent performance' },\n      { cmd: 'gs wallet balance', desc: 'Check SOL balance' },\n      { cmd: 'gs --interactive', desc: 'Interactive menu' }\n    ]\n    \n    commonCommands.forEach(({ cmd, desc }) => {\n      console.log(`  ${chalk.cyan(cmd.padEnd(25))} ${desc}`)\n    })\n    \n    console.log('')\n  }\n  \n  /**\n   * Show help based on recent commands\n   */\n  private showRecentCommandHelp(): void {\n    console.log(chalk.bold('⏱️  Recent Activity:'))\n    console.log('')\n    console.log(chalk.gray('Based on your recent commands, you might want to:'))\n    \n    const suggestions = this.getContextualSuggestions()\n    suggestions.forEach(suggestion => {\n      console.log(`  ${chalk.cyan('•')} ${suggestion}`)\n    })\n    \n    console.log('')\n  }\n  \n  /**\n   * Show help based on error history\n   */\n  private showErrorBasedHelp(): void {\n    console.log(chalk.bold('🔧 Troubleshooting:'))\n    console.log('')\n    console.log(chalk.gray('If you\\'re experiencing issues, try:'))\n    console.log('')\n    console.log(`  ${chalk.cyan('gs diagnose'.padEnd(20))} Run diagnostic checks`)\n    console.log(`  ${chalk.cyan('gs config show'.padEnd(20))} Verify configuration`)\n    console.log(`  ${chalk.cyan('gs help troubleshooting'.padEnd(20))} Troubleshooting guide`)\n    console.log('')\n  }\n  \n  /**\n   * Show quick reference\n   */\n  private showQuickReference(): void {\n    console.log(divider())\n    console.log('')\n    console.log(chalk.bold('⚡ Quick Reference:'))\n    console.log('')\n    console.log(`  ${chalk.gray('Get help for any command:')} ${chalk.cyan('gs <command> --help')}`)\n    console.log(`  ${chalk.gray('Interactive mode:')} ${chalk.cyan('gs --interactive')}`)\n    console.log(`  ${chalk.gray('View all help topics:')} ${chalk.cyan('gs help')}`)\n    console.log(`  ${chalk.gray('Search help:')} ${chalk.cyan('gs help search <query>')}`)\n    console.log('')\n    console.log(chalk.gray('💡 Tip: Use tab completion and command shortcuts to work faster!'))\n    console.log('')\n  }\n  \n  /**\n   * Get recent commands from history\n   */\n  private getRecentCommands(): string[] {\n    try {\n      const historyFile = join(homedir(), '.ghostspeak', 'recent-commands.json')\n      if (existsSync(historyFile)) {\n        const data = JSON.parse(readFileSync(historyFile, 'utf-8'))\n        return data.map((item: any) => item.command).slice(0, 5)\n      }\n    } catch {\n      // Ignore errors\n    }\n    return []\n  }\n  \n  /**\n   * Get error history for better suggestions\n   */\n  private getErrorHistory(): string[] {\n    // This would read from error logs if implemented\n    return []\n  }\n  \n  /**\n   * Get contextual suggestions based on recent activity\n   */\n  private getContextualSuggestions(): string[] {\n    const suggestions = []\n    \n    if (this.context.recentCommands.includes('agent register')) {\n      suggestions.push('Create a service listing: gs marketplace create')\n    }\n    \n    if (this.context.recentCommands.includes('marketplace create')) {\n      suggestions.push('Check your listings: gs marketplace list --mine')\n    }\n    \n    if (this.context.recentCommands.includes('escrow create')) {\n      suggestions.push('Monitor escrow status: gs escrow list')\n    }\n    \n    if (suggestions.length === 0) {\n      suggestions.push('Explore the marketplace: gs marketplace list')\n      suggestions.push('Check your agent status: gs agent list')\n    }\n    \n    return suggestions\n  }\n  \n  /**\n   * Find help content matching query\n   */\n  private findHelpContent(query: string): Array<{\n    topic: string\n    title: string\n    description: string\n  }> {\n    const results: Array<{ topic: string; title: string; description: string }> = []\n    const lowerQuery = query.toLowerCase()\n    \n    Object.entries(HELP_TOPICS).forEach(([key, topic]) => {\n      const searchText = `${topic.title} ${topic.description} ${topic.commands.map(c => c.command + ' ' + c.description).join(' ')}`.toLowerCase()\n      \n      if (searchText.includes(lowerQuery)) {\n        results.push({\n          topic: key,\n          title: topic.title,\n          description: topic.description\n        })\n      }\n    })\n    \n    return results\n  }\n}\n\n/**\n * Show contextual help\n */\nexport function showContextualHelp(): void {\n  const helpSystem = new HelpSystem()\n  helpSystem.showContextualHelp()\n}\n\n/**\n * Show help for specific topic\n */\nexport function showTopicHelp(topic: string): void {\n  const helpSystem = new HelpSystem()\n  helpSystem.showTopicHelp(topic)\n}\n\n/**\n * Search help content\n */\nexport function searchHelp(query: string): void {\n  const helpSystem = new HelpSystem()\n  helpSystem.searchHelp(query)\n}\n\n/**\n * Show available help topics\n */\nexport function showAvailableTopics(): void {\n  const helpSystem = new HelpSystem()\n  helpSystem.showAvailableTopics()\n}"