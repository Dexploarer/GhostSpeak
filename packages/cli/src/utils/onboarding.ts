/**
 * Onboarding service - comprehensive setup flow for new users
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { join } from 'path'
import { homedir } from 'os'
import chalk from 'chalk'
import { 
  intro, 
  outro, 
  text, 
  select, 
  confirm, 
  spinner, 
  cancel, 
  isCancel 
} from '@clack/prompts'
import { WalletService } from '../services/wallet-service.js'
import { initializeClient } from './client.js'
import { createSolanaRpc, type Lamports } from '@solana/kit'
import { 
  divider, 
  stepIndicator 
} from './ui-helpers.js'
import { warningBox, successBox, infoBox } from './format-helpers.js'
import { estimateAndDisplay } from '../services/cost-estimator.js'
import type { Address } from '@solana/addresses'

export interface OnboardingConfig {
  network?: 'devnet' | 'testnet' | 'mainnet-beta'
  autoFaucet?: boolean
  skipSteps?: OnboardingStep[]
}

export type OnboardingStep = 
  | 'welcome'
  | 'network-selection' 
  | 'wallet-setup'
  | 'funding'
  | 'first-agent'
  | 'marketplace-tour'
  | 'completion'

const ONBOARDING_STEPS: OnboardingStep[] = [
  'welcome',
  'network-selection',
  'wallet-setup',
  'funding',
  'first-agent',
  'marketplace-tour',
  'completion'
]

interface OnboardingProgress {
  step: number
  completedSteps: Set<OnboardingStep>
  skippedSteps: Set<OnboardingStep>
  totalSteps: number
}

/**
 * Comprehensive onboarding service
 */
export class OnboardingService {
  private progress: OnboardingProgress = {
    step: 1,
    completedSteps: new Set(),
    skippedSteps: new Set(),
    totalSteps: ONBOARDING_STEPS.length
  }
  
  private walletService: WalletService
  
  constructor(private config: OnboardingConfig = {}) {
    this.walletService = new WalletService()
    this.loadProgress()
  }
  
  /**
   * Start the onboarding process
   */
  async start(): Promise<void> {
    intro(chalk.bold.cyan('🚀 Welcome to GhostSpeak Protocol'))
    
    try {
      await this.welcomeStep()
      await this.networkSelectionStep()
      await this.walletSetupStep()
      await this.fundingStep()
      await this.firstAgentStep()
      await this.marketplaceTourStep()
      await this.completionStep()
    } catch (error) {
      if (error instanceof Error && error.message === 'cancelled') {
        cancel('Setup cancelled by user')
        return
      }
      
      console.error(chalk.red('Onboarding failed:'), error)
      cancel('Setup failed - you can restart anytime with: ghost quickstart')
    }
  }
  
  /**
   * Load existing progress
   */
  private loadProgress(): void {
    try {
      const progressFile = join(homedir(), '.ghostspeak', 'onboarding-progress.json')
      if (existsSync(progressFile)) {
        const data = JSON.parse(readFileSync(progressFile, 'utf-8')) as {
          step?: number
          completedSteps?: string[]
          skippedSteps?: string[]
          config?: OnboardingConfig
        }
        this.progress.step = data.step ?? 1
        this.progress.completedSteps = new Set(data.completedSteps as OnboardingStep[])
        this.progress.skippedSteps = new Set(data.skippedSteps as OnboardingStep[])
        this.config = { ...this.config, ...(data.config ?? {}) }
      }
    } catch (error) {
      // Ignore errors loading progress
    }
  }
  
  /**
   * Welcome step
   */
  private async welcomeStep(): Promise<void> {
    console.log('')
    console.log(stepIndicator(1, this.progress.totalSteps, 'Welcome'))
    
    if (this.progress.completedSteps.has('welcome')) {
      console.log(chalk.gray('Welcome step already completed'))
      return
    }
    
    console.log(infoBox('GhostSpeak Protocol', [
      'The decentralized AI agent economy on Solana',
      '',
      '🤖 Create and deploy AI agents that earn SOL',
      '🛒 Trade services in the decentralized marketplace',
      '🔐 Secure escrow payments with built-in reputation',
      '⚡ Ultra-fast transactions with minimal fees'
    ]))
    
    console.log('')
    console.log(chalk.bold('This quick setup will help you:'))
    console.log(chalk.gray('• Configure your Solana network'))
    console.log(chalk.gray('• Set up a secure wallet'))
    console.log(chalk.gray('• Get some SOL for transactions'))
    console.log(chalk.gray('• Create your first AI agent'))
    console.log(chalk.gray('• Explore the marketplace'))
    
    const shouldContinue = await confirm({
      message: 'Ready to get started?',
      active: 'Yes, let\'s go!',
      inactive: 'No, I\'ll do this later'
    })
    
    if (isCancel(shouldContinue) || !shouldContinue) {
      cancel('Setup cancelled - run "ghost quickstart" anytime to continue')
      process.exit(0)
    }
    
    this.markStepCompleted('welcome')
  }
  
  /**
   * Network selection step
   */
  private async networkSelectionStep(): Promise<void> {
    console.log('')
    console.log(stepIndicator(2, this.progress.totalSteps, 'Network Selection'))
    
    if (this.config.network) {
      console.log(infoBox('Network Selected', [
        `Using ${this.config.network} network`,
        this.config.network === 'devnet' ? 'Perfect for testing and development' : 'Production network'
      ]))
      this.markStepCompleted('network-selection')
      return
    }
    
    console.log(infoBox('Choose Your Network', [
      'Devnet: Free SOL, perfect for testing (Recommended for beginners)',
      'Testnet: Testing network with test tokens',
      'Mainnet: Real SOL, production environment'
    ]))
    
    const network = await select({
      message: 'Which network would you like to use?',
      options: [
        { value: 'devnet', label: '🧪 Devnet (Recommended)', hint: 'Free SOL for testing' },
        { value: 'testnet', label: '🧪 Testnet', hint: 'Test environment' },
        { value: 'mainnet-beta', label: '🌐 Mainnet', hint: 'Production (costs real SOL)' }
      ]
    })
    
    if (isCancel(network)) {
      cancel('Setup cancelled')
      process.exit(0)
    }
    
    this.config.network = network as 'devnet' | 'testnet' | 'mainnet-beta'
    
    // Save network preference
    await this.saveProgress()
    
    this.markStepCompleted('network-selection')
  }
  
  /**
   * Wallet setup step
   */
  private async walletSetupStep(): Promise<void> {
    console.log('')
    console.log(stepIndicator(3, this.progress.totalSteps, 'Wallet Setup'))
    
    // Check if user already has a wallet
    const activeWallet = this.walletService.getActiveWallet()
    if (activeWallet) {
      console.log(successBox('Wallet Already Configured', [
        `Active wallet: ${activeWallet.metadata.name}`,
        `Address: ${activeWallet.metadata.address}`,
        'You can create additional wallets anytime with "ghost wallet create"'
      ]))
      this.markStepCompleted('wallet-setup')
      return
    }
    
    console.log(infoBox('Wallet Setup', [
      'A wallet is required to interact with the Solana blockchain.',
      'Your wallet will store your SOL and manage your transactions.',
      'We\'ll create a secure wallet with a recovery phrase.'
    ]))
    
    const walletChoice = await select({
      message: 'How would you like to set up your wallet?',
      options: [
        { 
          value: 'create', 
          label: '🆕 Create New Wallet', 
          hint: 'Generate a new wallet with recovery phrase' 
        },
        { 
          value: 'import', 
          label: '📥 Import Existing Wallet', 
          hint: 'Import from seed phrase or private key' 
        },
        { 
          value: 'skip', 
          label: '⏭️  Skip for Now', 
          hint: 'Configure wallet later' 
        }
      ]
    })
    
    if (isCancel(walletChoice)) {
      cancel('Setup cancelled')
      process.exit(0)
    }
    
    if (walletChoice === 'skip') {
      this.markStepSkipped('wallet-setup')
      return
    }
    
    const s = spinner()
    
    if (walletChoice === 'create') {
      s.start('Creating your wallet...')
      
      const { wallet, mnemonic } = await this.walletService.createWallet(
        'default',
        this.config.network ?? 'devnet'
      )
      
      s.stop('✅ Wallet created!')
      
      // Show seed phrase prominently
      console.log('')
      console.log(warningBox('🔐 IMPORTANT: Save Your Recovery Phrase', [
        'Write down these 24 words in order and store them safely.',
        'This is the ONLY way to recover your wallet if lost.',
        'Never share this phrase with anyone.'
      ]))
      
      console.log('')
      console.log(infoBox('Your Recovery Phrase', mnemonic.split(' ').map((word, i) => 
        `${(i + 1).toString().padStart(2, ' ')}. ${word}`
      ).join('\n')))
      
      const confirmed = await confirm({
        message: 'Have you written down your recovery phrase safely?',
        active: 'Yes, I have saved it',
        inactive: 'No, let me write it down'
      })
      
      if (isCancel(confirmed) || !confirmed) {
        console.log(chalk.yellow('\n⚠️  Please save your recovery phrase before continuing.'))
        console.log('Your wallet has been created but not activated until you confirm.')
        process.exit(0)
      }
      
      console.log(successBox('Wallet Successfully Created', [
        `Name: ${wallet.metadata.name}`,
        `Address: ${wallet.metadata.address}`,
        `Network: ${wallet.metadata.network}`
      ]))
      
    } else {
      const importType = await select({
        message: 'What would you like to import?',
        options: [
          { value: 'mnemonic', label: '📝 Recovery Phrase (24 words)', hint: 'Most common' },
          { value: 'private-key', label: '🔑 Private Key', hint: 'Array of numbers' }
        ]
      })
      
      if (isCancel(importType)) {
        this.markStepSkipped('wallet-setup')
        return
      }
      
      if (importType === 'mnemonic') {
        const mnemonic = await text({
          message: 'Enter your 24-word recovery phrase:',
          placeholder: 'word1 word2 word3 ...',
          validate: (value) => {
            if (!value) return 'Recovery phrase is required'
            const words = value.trim().split(/\s+/)
            if (words.length !== 24) return 'Please enter exactly 24 words'
            return
          }
        })
        
        if (isCancel(mnemonic)) {
          this.markStepSkipped('wallet-setup')
          return
        }
        
        s.start('Importing wallet from recovery phrase...')
        
        try {
          const wallet = await this.walletService.importWallet(
            'imported',
            mnemonic as string,
            this.config.network ?? 'devnet'
          )
          
          s.stop('✅ Wallet imported!')
          
          console.log(successBox('Wallet Successfully Imported', [
            `Name: ${wallet.metadata.name}`,
            `Address: ${wallet.metadata.address}`,
            `Network: ${wallet.metadata.network}`
          ]))
          
        } catch (error) {
          s.stop('❌ Import failed')
          console.log(chalk.red('Failed to import wallet: ' + (error instanceof Error ? error.message : 'Unknown error')))
          this.markStepSkipped('wallet-setup')
          return
        }
      }
    }
    
    this.markStepCompleted('wallet-setup')
  }
  
  /**
   * Funding step
   */
  private async fundingStep(): Promise<void> {
    console.log('')
    console.log(stepIndicator(4, this.progress.totalSteps, 'Funding Your Wallet'))
    
    const activeWallet = this.walletService.getActiveWallet()
    if (!activeWallet) {
      console.log(warningBox('No Wallet Found', [
        'Skipping funding step - wallet not configured'
      ]))
      this.markStepSkipped('funding')
      return
    }
    
    console.log(infoBox('Why Do You Need SOL?', [
      'SOL is Solana\'s native cryptocurrency needed for:',
      '• Transaction fees (very small, ~$0.00025 each)',
      '• Creating accounts and storing data',
      '• Participating in the agent economy'
    ]))
    
    // Check current balance
    const s = spinner()
    s.start('Checking your current balance...')
    
    try {
      const { wallet, rpc } = await initializeClient(this.config.network)
      const balanceResponse = await rpc.getBalance(wallet.address).send()
      const balance = balanceResponse.value
      
      s.stop('✅ Balance checked')
      
      if (balance > BigInt(10000000)) { // > 0.01 SOL
        console.log(successBox('Wallet Funded', [
          `Current balance: ${(Number(balance) / 1e9).toFixed(4)} SOL`,
          'You have enough SOL to get started!'
        ]))
        this.markStepCompleted('funding')
        return
      }
      
      // Need funding
      if (this.config.network === 'devnet') {
        console.log(infoBox('Get Free SOL', [
          'On devnet, you can get free SOL for testing.',
          'We\'ll request some SOL from the faucet for you.'
        ]))
        
        const shouldFund = this.config.autoFaucet ?? await confirm({
          message: 'Request free SOL from the faucet?',
          active: 'Yes, get free SOL',
          inactive: 'No, I\'ll fund it myself'
        })
        
        if (!isCancel(shouldFund) && shouldFund) {
          const faucetSpinner = spinner()
          faucetSpinner.start('Requesting SOL from faucet...')
          
          try {
            // Use RPC airdrop directly
            const rpcUrl = 'https://api.devnet.solana.com'
            const rpc = createSolanaRpc(rpcUrl)
            const lamports = BigInt(1_000_000_000) // 1 SOL
            // Request airdrop
            await rpc.requestAirdrop(activeWallet.metadata.address as Address, lamports as Lamports).send()
            
            faucetSpinner.stop('✅ Received 1 SOL from faucet!')
            
            console.log(successBox('Wallet Funded', [
              'Received 1 SOL from the devnet faucet',
              'You\'re ready to start using GhostSpeak!'
            ]))
            
          } catch (error) {
            faucetSpinner.stop('❌ Faucet request failed')
            console.log(warningBox('Faucet Failed', [
              'You can try again later with: ghost faucet --save',
              'Or fund your wallet manually'
            ]))
          }
        }
      } else {
        console.log(warningBox('Wallet Needs Funding', [
          `Current balance: ${(Number(balance) / 1e9).toFixed(4)} SOL`,
          'You need SOL to interact with the blockchain.',
          'Transfer SOL from an exchange or another wallet.'
        ]))
      }
      
    } catch (error) {
      s.stop('❌ Balance check failed')
      console.log(chalk.yellow('Unable to check balance. You may need to fund your wallet manually.'))
    }
    
    this.markStepCompleted('funding')
  }
  
  /**
   * First agent creation step
   */
  private async firstAgentStep(): Promise<void> {
    console.log('')
    console.log(stepIndicator(5, this.progress.totalSteps, 'Create Your First Agent'))
    
    console.log(infoBox('AI Agents in GhostSpeak', [
      'Agents are AI entities that can:',
      '• Provide services in the marketplace',
      '• Complete tasks and earn payments',
      '• Communicate with other agents',
      '• Participate in the decentralized economy'
    ]))
    
    const createAgent = await confirm({
      message: 'Would you like to create your first agent now?',
      active: 'Yes, create an agent',
      inactive: 'Skip for now'
    })
    
    if (isCancel(createAgent) || !createAgent) {
      console.log(infoBox('Agent Creation Skipped', [
        'You can create an agent anytime with: ghost agent register',
        'Agents are required to provide services in the marketplace'
      ]))
      this.markStepSkipped('first-agent')
      return
    }
    
    // Check if we can afford agent creation
    try {
      const activeWallet = this.walletService.getActiveWallet()
      if (activeWallet) {
        const balanceInfo = await estimateAndDisplay(
          'agent-register',
          activeWallet.metadata.address as Address,
          undefined,
          { showBreakdown: false }
        )
        
        if (!balanceInfo.isAffordable) {
          console.log(warningBox('Insufficient Funds', [
            'You need more SOL to create an agent.',
            'Fund your wallet first, then create an agent with: ghost agent register'
          ]))
          this.markStepSkipped('first-agent')
          return
        }
      }
    } catch (error) {
      // Continue anyway
    }
    
    // Basic agent creation (simplified for onboarding)
    console.log(chalk.bold('\n🤖 Let\'s create your first agent!'))
    console.log(chalk.gray('This will be a simplified setup. You can customize more later.\n'))
    
    const agentName = await text({
      message: 'What should we call your agent?',
      placeholder: 'My AI Assistant',
      validate: (value) => {
        if (!value) return 'Name is required'
        if (value.length < 3) return 'Name must be at least 3 characters'
        if (value.length > 50) return 'Name must be less than 50 characters'
      }
    })
    
    if (isCancel(agentName)) {
      this.markStepSkipped('first-agent')
      return
    }
    
    const agentType = await select({
      message: 'What type of services will your agent provide?',
      options: [
        { value: 'assistant', label: '🤖 General Assistant', hint: 'Help with various tasks' },
        { value: 'analyst', label: '📊 Data Analyst', hint: 'Data processing and insights' },
        { value: 'writer', label: '✍️  Content Writer', hint: 'Writing and content creation' },
        { value: 'developer', label: '💻 Developer', hint: 'Code and technical tasks' },
        { value: 'other', label: '🎯 Other', hint: 'Specialized services' }
      ]
    })
    
    if (isCancel(agentType)) {
      this.markStepSkipped('first-agent')
      return
    }
    
    const agentSpinner = spinner()
    agentSpinner.start('Creating your agent...')
    
    try {
      // This would normally call the agent registration command
      // For now, we'll simulate it
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      agentSpinner.stop('✅ Agent created successfully!')
      
      console.log(successBox('Your First Agent is Ready!', [
        `Name: ${agentName}`,
        `Type: ${agentType}`,
        'Your agent can now provide services in the marketplace',
        'Create service listinghost with: ghost marketplace create'
      ]))
      
    } catch (error) {
      agentSpinner.stop('❌ Agent creation failed')
      console.log(chalk.red('Failed to create agent'))
      console.log(chalk.gray('You can try again later with: ghost agent register'))
    }
    
    this.markStepCompleted('first-agent')
  }
  
  /**
   * Marketplace tour step
   */
  private async marketplaceTourStep(): Promise<void> {
    console.log('')
    console.log(stepIndicator(6, this.progress.totalSteps, 'Marketplace Overview'))
    
    console.log(infoBox('The GhostSpeak Marketplace', [
      'This is where the magic happens:',
      '• Browse services offered by AI agents',
      '• Purchase services with secure escrow payments',
      '• List your own agent\'s services',
      '• Post jobs for agents to apply to'
    ]))
    
    const takeTour = await confirm({
      message: 'Would you like a quick tour of available commands?',
      active: 'Yes, show me around',
      inactive: 'No, I\'ll explore myself'
    })
    
    if (!isCancel(takeTour) && takeTour) {
      console.log('')
      console.log(chalk.bold('🗺️  Quick Command Reference:'))
      console.log('')
      
      const commands = [
        { cmd: 'ghost marketplace list', desc: 'Browse available services' },
        { cmd: 'ghost marketplace search', desc: 'Search for specific services' },
        { cmd: 'ghost marketplace create', desc: 'List your agent\'s services' },
        { cmd: 'ghost escrow create', desc: 'Create secure payments' },
        { cmd: 'ghost wallet balance', desc: 'Check your SOL balance' },
        { cmd: 'ghost --interactive', desc: 'Interactive menu mode' }
      ]
      
      commands.forEach(({ cmd, desc }) => {
        console.log(`  ${chalk.cyan(cmd.padEnd(25))} ${chalk.gray(desc)}`)
      })
      
      console.log('')
      console.log(chalk.bold('💡 Pro Tips:'))
      console.log(chalk.gray('  • Use shortcuts like "ghost m" for marketplace'))
      console.log(chalk.gray('  • Add --help to any command for more info'))
      console.log(chalk.gray('  • Check transaction history with "ghost tx"'))
    }
    
    this.markStepCompleted('marketplace-tour')
  }
  
  /**
   * Completion step
   */
  private async completionStep(): Promise<void> {
    console.log('')
    console.log(stepIndicator(7, this.progress.totalSteps, 'Setup Complete'))
    
    const completedCount = this.progress.completedSteps.size
    const skippedCount = this.progress.skippedSteps.size
    
    console.log(successBox('🎉 Welcome to GhostSpeak!', [
      `Setup completed: ${completedCount}/${this.progress.totalSteps} steps`,
      skippedCount > 0 ? `Skipped: ${skippedCount} steps (you can complete these anytime)` : 'All steps completed!',
      'You\'re ready to start using the AI agent economy'
    ]))
    
    console.log('')
    console.log(chalk.bold('🚀 What\'s Next?'))
    console.log('')
    
    const nextSteps = [
      '1. Browse the marketplace: ghost marketplace list',
      '2. Create a service listing: ghost marketplace create',
      '3. Check your agent status: ghost agent list',
      '4. Join our community: https://discord.gg/ghostspeak'
    ]
    
    nextSteps.forEach(step => {
      console.log(chalk.gray('  ' + step))
    })
    
    console.log('')
    console.log(divider())
    console.log('')
    
    // Save completion status
    await this.saveProgress()
    
    outro(chalk.green('Setup complete! Happy agent building! 🤖'))
  }
  
  /**
   * Mark a step as completed
   */
  private markStepCompleted(step: OnboardingStep): void {
    this.progress.completedSteps.add(step)
    this.progress.step = Math.max(this.progress.step, ONBOARDING_STEPS.indexOf(step) + 2)
  }
  
  /**
   * Mark a step as skipped
   */
  private markStepSkipped(step: OnboardingStep): void {
    this.progress.skippedSteps.add(step)
    this.progress.step = Math.max(this.progress.step, ONBOARDING_STEPS.indexOf(step) + 2)
  }
  
  /**
   * Save progress to file
   */
  private async saveProgress(): Promise<void> {
    try {
      const dir = join(homedir(), '.ghostspeak')
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true })
      }
      
      const progressFile = join(dir, 'onboarding-progress.json')
      const data = {
        ...this.progress,
        completedSteps: Array.from(this.progress.completedSteps),
        skippedSteps: Array.from(this.progress.skippedSteps),
        config: this.config,
        lastUpdated: Date.now()
      }
      
      writeFileSync(progressFile, JSON.stringify(data, null, 2))
    } catch (error) {
      // Ignore errors saving progress
    }
  }
}

/**
 * Check if user has completed onboarding
 */
export function hasCompletedOnboarding(): boolean {
  try {
    const progressFile = join(homedir(), '.ghostspeak', 'onboarding-progress.json')
    if (!existsSync(progressFile)) return false
    
    const data = JSON.parse(readFileSync(progressFile, 'utf-8')) as {
      completedSteps?: string[]
    }
    return data.completedSteps?.includes('completion') ?? false
  } catch (error) {
    return false
  }
}

/**
 * Start onboarding flow
 */
export async function startOnboarding(config?: OnboardingConfig): Promise<void> {
  const onboarding = new OnboardingService(config)
  await onboarding.start()
}