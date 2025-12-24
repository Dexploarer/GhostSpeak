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
  cancel
} from '@clack/prompts'
import { loadConfig, saveConfig, resetConfig, getConfigPath } from '../utils/config.js'
import { existsSync, readFileSync } from 'fs'
import { createSolanaRpc, createKeyPairSignerFromBytes } from '@solana/kit'
import { lamportsToSol } from '../utils/helpers.js'
import { homedir } from 'os'

export const configCommand = new Command('config')
  .description('Configure GhostSpeak CLI settinghost')

configCommand
  .command('setup')
  .description('Initial setup and wallet configuration')
  .action(async () => {
    intro(chalk.green('⚙️  GhostSpeak CLI Setup'))

    try {
      const network = await select({
        message: 'Select Solana network:',
        options: [
          { value: 'devnet', label: '🧪 Devnet (Development)' },
          { value: 'testnet', label: '🧪 Testnet (Testing)' },
          { value: 'mainnet', label: '🌐 Mainnet (Production)' }
        ]
      })

      if (isCancel(network)) {
        cancel('Setup cancelled')
        return
      }

      const walletPath = await text({
        message: 'Path to your Solana wallet:',
        placeholder: '~/.config/solana/id.json',
        validate: (value) => {
          if (!value) return 'Wallet path is required'
          // Expand ~ to home directory
          const expandedPath = value.replace('~', homedir())
          if (!existsSync(expandedPath)) {
            return `Wallet file not found at: ${expandedPath}`
          }
          return undefined
        }
      })

      if (isCancel(walletPath)) {
        cancel('Setup cancelled')
        return
      }

      const rpcUrl = await text({
        message: 'Custom RPC URL (optional):',
        placeholder: 'Leave empty for default RPC endpoints'
      })

      if (isCancel(rpcUrl)) {
        cancel('Setup cancelled')
        return
      }

      // Configuration summary
      console.log('\n' + chalk.bold('📋 Configuration Summary:'))
      console.log('─'.repeat(40))
      console.log(chalk.green('Network:') + ` ${network}`)
      console.log(chalk.green('Wallet:') + ` ${walletPath}`)
      if (rpcUrl) {
        console.log(chalk.green('RPC URL:') + ` ${rpcUrl}`)
      }

      const confirmed = await confirm({
        message: 'Save this configuration?'
      })

      if (isCancel(confirmed) || !confirmed) {
        cancel('Setup cancelled')
        return
      }

      const s = spinner()
      s.start('Saving configuration...')

      // Save the actual configuration
      const expandedWalletPath = walletPath.toString().replace('~', homedir())
      saveConfig({
        network: network as 'devnet' | 'testnet' | 'mainnet-beta' | 'localnet',
        walletPath: expandedWalletPath,
        rpcUrl: rpcUrl ? rpcUrl.toString() : undefined
      })

      s.stop('✅ Configuration saved!')

      console.log('\n' + chalk.green('🎉 GhostSpeak CLI is now configured!'))
      console.log(chalk.gray('You can now use all CLI commands.'))

      outro('Setup completed successfully')

    } catch (error) {
      cancel(chalk.red('Setup failed: ' + (error instanceof Error ? error.message : 'Unknown error')))
    }
  })

configCommand
  .command('show')
  .description('Show current configuration')
  .action(async () => {
    intro(chalk.green('📋 Current Configuration'))

    try {
      const config = loadConfig()
      
      console.log('\n' + chalk.bold('⚙️  GhostSpeak CLI Settinghost'))
      console.log('═'.repeat(50))
      console.log(chalk.green('Network:') + ` ${config.network}`)
      console.log(chalk.green('RPC URL:') + ` ${config.rpcUrl ?? `Default ${config.network} RPC`}`)
      console.log(chalk.green('Wallet:') + ` ${config.walletPath}`)
      console.log(chalk.green('Program ID:') + ` ${config.programId}`)
      console.log(chalk.gray('Config File:') + ` ${getConfigPath()}`)
      
      // Try to load wallet balance if wallet exists
      if (existsSync(config.walletPath)) {
        const s = spinner()
        s.start('Checking wallet balance...')
        
        try {
          const rpc = createSolanaRpc(
            config.rpcUrl ?? 
            (config.network === 'devnet' ? 'https://api.devnet.solana.com' : 
             config.network === 'testnet' ? 'https://api.testnet.solana.com' : 
             'https://api.mainnet-beta.solana.com')
          )
          
          const walletData = readFileSync(config.walletPath, 'utf-8')
          const signer = await createKeyPairSignerFromBytes(new Uint8Array(JSON.parse(walletData)))
          const balanceResponse = await rpc.getBalance(signer.address).send()
          const balance = balanceResponse.value
          
          s.stop('')
          console.log('')
          console.log(chalk.gray('💰 Wallet Address:') + ` ${signer.address}`)
          console.log(chalk.gray('💰 Wallet Balance:') + ` ${lamportsToSol(balance)} SOL`)
        } catch (error) {
          s.stop('')
          console.log('')
          console.log(chalk.yellow('⚠️  Could not fetch wallet balance'))
        }
      } else {
        console.log('')
        console.log(chalk.yellow('⚠️  Wallet file not found'))
      }

      outro('Configuration displayed')
    } catch (error) {
      cancel(chalk.red('Failed to load configuration: ' + (error instanceof Error ? error.message : 'Unknown error')))
    }
  })

configCommand
  .command('reset')
  .description('Reset CLI configuration')
  .action(async () => {
    intro(chalk.yellow('🔄 Reset Configuration'))

    const confirmed = await confirm({
      message: 'Are you sure you want to reset all settings?'
    })

    if (isCancel(confirmed) || !confirmed) {
      cancel('Reset cancelled')
      return
    }

    const s = spinner()
    s.start('Resetting configuration...')

    resetConfig()

    s.stop('✅ Configuration reset!')

    console.log('\n' + chalk.yellow('🔄 All settinghost have been reset to defaults.'))
    console.log(chalk.gray('Run "ghostspeak config setup" to reconfigure.'))

    outro('Reset completed')
  })