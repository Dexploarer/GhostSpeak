/**
 * GhostSpeak CLI Quick Start Command
 * Provides streamlined setup flows for new and existing users
 */

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
import { existsSync } from 'fs'
import { join } from 'path'
import { homedir } from 'os'
import { GhostSpeakClient } from '@ghostspeak/sdk'
import { createSolanaRpc } from '@solana/kit'
import {
  showProgress,
  generateNewWallet,
  loadExistingWallet,
  checkWalletBalance,
  fundWallet,
  saveWallet,
  createMultisigWrapper,
  showSetupSummary,
  validateNetwork,
  type SetupResult,
  type WalletInfo
} from '../utils/setup-helpers.js'
import { saveConfig, getConfigPath } from '../utils/config.js'
import { getExplorerUrl } from '../utils/client.js'

export const quickstartCommand = new Command('quickstart')
  .description('Quick setup for new and existing users')

// New user flow
quickstartCommand
  .command('new')
  .description('Complete setup for new users (creates wallet)')
  .option('-n, --network <network>', 'Network to use (devnet|testnet)', 'devnet')
  .option('--skip-agent', 'Skip agent creation')
  .option('--skip-multisig', 'Skip multisig wallet creation')
  .action(async (options: { network?: string; skipAgent?: boolean; skipMultisig?: boolean }) => {
    intro(chalk.cyan('🚀 GhostSpeak Quick Start - New User Setup'))
    
    const progress = { step: 0, totalSteps: 7, currentTask: '' }
    const errors: string[] = []
    let wallet: WalletInfo | undefined
    let multisigAddress: string | undefined
    let agentCreated = false
    
    try {
      // Step 1: Network selection
      progress.step = 1
      progress.currentTask = 'Selecting network'
      showProgress(progress)
      
      const network = validateNetwork(options.network ?? 'devnet')
      log.success(`✅ Network: ${network}`)
      
      // Step 2: Generate wallet
      progress.step = 2
      progress.currentTask = 'Generating new wallet'
      showProgress(progress)
      
      const s = spinner()
      s.start('Generating secure wallet...')
      
      wallet = await generateNewWallet()
      const walletPath = await saveWallet(wallet.signer)
      
      s.stop('✅ Wallet generated and saved')
      log.info(`💳 Wallet Address: ${chalk.white(wallet.address)}`)
      log.info(`📁 Saved to: ${chalk.gray(walletPath)}`)
      
      // Step 3: Fund wallet
      progress.step = 3
      progress.currentTask = 'Funding wallet from faucets'
      showProgress(progress)
      
      const fundingResult = await fundWallet(wallet.address, network)
      if (fundingResult.success) {
        wallet.balance = await checkWalletBalance(wallet.address, network)
        log.success(`✅ Wallet funded with ${fundingResult.amount} SOL`)
      } else {
        errors.push('Failed to get SOL from faucets - you may need to fund manually')
        log.warn('⚠️  Could not automatically fund wallet')
      }
      
      // Step 4: Save configuration
      progress.step = 4
      progress.currentTask = 'Saving CLI configuration'
      showProgress(progress)
      
      saveConfig({
        network: network as 'devnet' | 'testnet',
        walletPath,
        rpcUrl: network === 'devnet' 
          ? 'https://api.devnet.solana.com'
          : 'https://api.testnet.solana.com'
      })
      
      log.success('✅ Configuration saved')
      
      // Step 5: Create multisig (optional)
      if (!options.skipMultisig && wallet.balance > 0.01) {
        progress.step = 5
        progress.currentTask = 'Creating multisig wallet for enhanced security'
        showProgress(progress)
        
        const createMultisig = await confirm({
          message: 'Create a multisig wallet for enhanced security?',
          initialValue: true
        })
        
        if (!isCancel(createMultisig) && createMultisig) {
          try {
            const rpc = createSolanaRpc(
              network === 'devnet' 
                ? 'https://api.devnet.solana.com'
                : 'https://api.testnet.solana.com'
            )
            
            const client = new GhostSpeakClient(rpc, wallet.signer)
            
            const multisigName = await text({
              message: 'Multisig wallet name:',
              placeholder: 'My GhostSpeak Wallet',
              defaultValue: 'Quick Start Wallet'
            })
            
            if (!isCancel(multisigName)) {
              s.start('Creating multisig wallet...')
              
              const multisig = await createMultisigWrapper(
                client,
                wallet.signer,
                multisigName.toString()
              )
              
              multisigAddress = multisig.address
              s.stop('✅ Multisig wallet created')
              
              log.info(`🔐 Multisig Address: ${chalk.white(multisigAddress)}`)
              log.info(`🔗 Explorer: ${getExplorerUrl(multisig.signature, network)}`)
            }
          } catch (error) {
            errors.push(`Multisig creation failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
            log.warn('⚠️  Could not create multisig wallet')
          }
        }
      }
      
      // Step 6: Register first agent (optional)
      if (!options.skipAgent && wallet.balance > 0.01) {
        progress.step = 6
        progress.currentTask = 'Optional: Register your first AI agent'
        showProgress(progress)
        
        const registerAgent = await confirm({
          message: 'Would you like to register your first AI agent now?'
        })
        
        if (!isCancel(registerAgent) && registerAgent) {
          log.info(chalk.yellow('\n💡 Launching agent registration...\n'))
          
          // Execute agent register command
          const { spawn } = await import('child_process')
          const child = spawn(process.argv[0], [process.argv[1], 'agent', 'register'], {
            stdio: 'inherit',
            env: process.env
          })
          
          await new Promise<void>((resolve) => {
            child.on('close', (code) => {
              if (code === 0) {
                agentCreated = true
                log.success('✅ Agent registration completed')
              } else {
                errors.push('Agent registration was cancelled or failed')
              }
              resolve()
            })
          })
        }
      }
      
      // Step 7: Setup complete
      progress.step = 7
      progress.currentTask = 'Setup complete!'
      showProgress(progress)
      
      const result: SetupResult = {
        success: true,
        wallet: wallet!,
        multisigAddress,
        network,
        configPath: getConfigPath(),
        agentCreated,
        errors
      }
      
      showSetupSummary(result)
      outro(chalk.green('🎉 Quick start setup completed!'))
      
    } catch (error) {
      cancel(chalk.red('Setup failed: ' + (error instanceof Error ? error.message : 'Unknown error')))
      process.exit(1)
    }
  })

// Existing wallet flow
quickstartCommand
  .command('existing')
  .description('Setup for users with existing Solana wallets')
  .option('-n, --network <network>', 'Network to use (devnet|testnet)', 'devnet')
  .option('-w, --wallet <path>', 'Path to existing wallet file')
  .option('--skip-multisig', 'Skip multisig wallet creation')
  .action(async (options: { network?: string; wallet?: string; skipMultisig?: boolean }) => {
    intro(chalk.cyan('🚀 GhostSpeak Quick Start - Existing Wallet Setup'))
    
    const progress = { step: 0, totalSteps: 6, currentTask: '' }
    const errors: string[] = []
    let wallet: WalletInfo | undefined
    let multisigAddress: string | undefined
    
    try {
      // Step 1: Network selection
      progress.step = 1
      progress.currentTask = 'Selecting network'
      showProgress(progress)
      
      const network = validateNetwork(options.network ?? 'devnet')
      log.success(`✅ Network: ${network}`)
      
      // Step 2: Import wallet
      progress.step = 2
      progress.currentTask = 'Importing existing wallet'
      showProgress(progress)
      
      let walletPath = options.wallet
      if (!walletPath) {
        const pathInput = await text({
          message: 'Path to your Solana wallet file:',
          placeholder: '~/.config/solana/id.json',
          validate: (value) => {
            if (!value) return 'Wallet path is required'
            const expandedPath = value.replace('~', homedir())
            if (!existsSync(expandedPath)) {
              return `Wallet file not found at: ${expandedPath}`
            }
            return undefined
          }
        })
        
        if (isCancel(pathInput)) {
          cancel('Setup cancelled')
          return
        }
        
        walletPath = pathInput.toString()
      }
      
      const s = spinner()
      s.start('Loading wallet...')
      
      wallet = await loadExistingWallet(walletPath)
      wallet.balance = await checkWalletBalance(wallet.address, network)
      
      s.stop('✅ Wallet imported successfully')
      log.info(`💳 Wallet Address: ${chalk.white(wallet.address)}`)
      log.info(`💰 Current Balance: ${chalk.white(`${wallet.balance.toFixed(4)} SOL`)}`)
      
      // Step 3: Check and fund if needed
      if (wallet.balance < 0.1) {
        progress.step = 3
        progress.currentTask = 'Checking wallet balance'
        showProgress(progress)
        
        log.warn('⚠️  Low balance detected')
        
        const requestFunding = await confirm({
          message: 'Would you like to request testnet SOL from faucets?'
        })
        
        if (!isCancel(requestFunding) && requestFunding) {
          const fundingResult = await fundWallet(wallet.address, network, 2)
          if (fundingResult.success) {
            wallet.balance = await checkWalletBalance(wallet.address, network)
            log.success(`✅ Wallet funded with ${fundingResult.amount} SOL`)
          } else {
            errors.push('Failed to get SOL from faucets - you may need to fund manually')
            log.warn('⚠️  Could not automatically fund wallet')
          }
        }
      } else {
        progress.step = 3
        progress.currentTask = 'Wallet balance verified'
        showProgress(progress)
        log.success('✅ Wallet has sufficient balance')
      }
      
      // Step 4: Save configuration
      progress.step = 4
      progress.currentTask = 'Saving CLI configuration'
      showProgress(progress)
      
      const expandedWalletPath = walletPath.replace('~', homedir())
      saveConfig({
        network: network as 'devnet' | 'testnet',
        walletPath: expandedWalletPath,
        rpcUrl: network === 'devnet' 
          ? 'https://api.devnet.solana.com'
          : 'https://api.testnet.solana.com'
      })
      
      log.success('✅ Configuration saved')
      
      // Step 5: Create multisig wrapper (optional)
      if (!options.skipMultisig && wallet.balance > 0.01) {
        progress.step = 5
        progress.currentTask = 'Optional: Create multisig wallet wrapper'
        showProgress(progress)
        
        note(
          'A multisig wallet adds an extra layer of security by requiring multiple signatures ' +
          'for transactions. This is recommended for production use.\n\n' +
          'You can still use your existing wallet directly if you prefer.',
          'About Multisig Wallets'
        )
        
        const createMultisig = await confirm({
          message: 'Create a multisig wrapper for your wallet?'
        })
        
        if (!isCancel(createMultisig) && createMultisig) {
          try {
            const rpc = createSolanaRpc(
              network === 'devnet' 
                ? 'https://api.devnet.solana.com'
                : 'https://api.testnet.solana.com'
            )
            
            const client = new GhostSpeakClient(rpc, wallet.signer)
            
            const multisigName = await text({
              message: 'Multisig wallet name:',
              placeholder: 'My Secure Wallet',
              defaultValue: 'GhostSpeak Multisig'
            })
            
            if (!isCancel(multisigName)) {
              s.start('Creating multisig wrapper...')
              
              const multisig = await createMultisigWrapper(
                client,
                wallet.signer,
                multisigName.toString()
              )
              
              multisigAddress = multisig.address
              s.stop('✅ Multisig wallet created')
              
              log.info(`🔐 Multisig Address: ${chalk.white(multisigAddress)}`)
              log.info(`🔗 Explorer: ${getExplorerUrl(multisig.signature, network)}`)
            }
          } catch (error) {
            errors.push(`Multisig creation failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
            log.warn('⚠️  Could not create multisig wallet')
          }
        }
      }
      
      // Step 6: Setup complete
      progress.step = 6
      progress.currentTask = 'Setup complete!'
      showProgress(progress)
      
      const result: SetupResult = {
        success: true,
        wallet: wallet!,
        multisigAddress,
        network,
        configPath: getConfigPath(),
        agentCreated: false,
        errors
      }
      
      showSetupSummary(result)
      outro(chalk.green('🎉 Quick start setup completed!'))
      
    } catch (error) {
      cancel(chalk.red('Setup failed: ' + (error instanceof Error ? error.message : 'Unknown error')))
      process.exit(1)
    }
  })

// Default action - show options
quickstartCommand
  .action(async () => {
    intro(chalk.cyan('🚀 GhostSpeak Quick Start'))
    
    const choice = await select({
      message: 'How would you like to get started?',
      options: [
        {
          value: 'new',
          label: '🆕 I\'m new - create everything for me',
          hint: 'Generate wallet, get SOL, full setup'
        },
        {
          value: 'existing',
          label: '💳 I have a Solana wallet',
          hint: 'Import existing wallet and configure'
        },
        {
          value: 'manual',
          label: '🛠️  Manual setup',
          hint: 'Step-by-step configuration'
        }
      ]
    })
    
    if (isCancel(choice)) {
      cancel('Quick start cancelled')
      return
    }
    
    if (choice === 'new') {
      // Execute quickstart new
      const { spawn } = await import('child_process')
      const child = spawn(process.argv[0], [process.argv[1], 'quickstart', 'new'], {
        stdio: 'inherit',
        env: process.env
      })
      
      await new Promise<void>((resolve) => {
        child.on('close', () => resolve())
      })
    } else if (choice === 'existing') {
      // Execute quickstart existing
      const { spawn } = await import('child_process')
      const child = spawn(process.argv[0], [process.argv[1], 'quickstart', 'existing'], {
        stdio: 'inherit',
        env: process.env
      })
      
      await new Promise<void>((resolve) => {
        child.on('close', () => resolve())
      })
    } else {
      // Manual setup - use existing config setup
      const { spawn } = await import('child_process')
      const child = spawn(process.argv[0], [process.argv[1], 'config', 'setup'], {
        stdio: 'inherit',
        env: process.env
      })
      
      await new Promise<void>((resolve) => {
        child.on('close', () => resolve())
      })
    }
  })