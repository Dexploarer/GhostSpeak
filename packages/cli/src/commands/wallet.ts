/**
 * Wallet Command - Comprehensive wallet management for GhostSpeak CLI
 */

import { Command } from 'commander'
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
import chalk from 'chalk'
import { Table } from 'console-table-printer'
import { WalletService } from '../services/wallet-service.js'
import { getExplorerUrl } from '../utils/client.js'
import { saveConfig, loadConfig } from '../utils/config.js'
import boxen from 'boxen'

export const walletCommand = new Command('wallet')
  .description('Manage GhostSpeak wallets')

// List all wallets
walletCommand
  .command('list')
  .alias('ls')
  .description('List all wallets')
  .option('-b, --balance', 'Show balances (requires network calls)')
  .action(async (options: { balance?: boolean }) => {
    intro(chalk.cyan('💳 GhostSpeak Wallet Manager'))
    
    try {
      const walletService = new WalletService()
      const wallets = walletService.listWallets()
      
      if (wallets.length === 0) {
        log.info('No wallets found. Create one with: gs wallet create')
        outro('No wallets available')
        return
      }
      
      const s = spinner()
      
      // Create table
      const table = new Table({
        title: 'Your Wallets',
        columns: [
          { name: 'name', title: 'Name', alignment: 'left' },
          { name: 'address', title: 'Address', alignment: 'left' },
          { name: 'network', title: 'Network', alignment: 'center' },
          { name: 'status', title: 'Status', alignment: 'center' },
          { name: 'balance', title: 'Balance', alignment: 'right' },
          { name: 'created', title: 'Created', alignment: 'center' }
        ]
      })
      
      // Add wallet data
      for (const wallet of wallets) {
        let balance = '-'
        
        if (options.balance) {
          s.start(`Checking balance for ${wallet.name}...`)
          try {
            const bal = await walletService.getBalance(wallet.address, wallet.network)
            balance = `${bal.toFixed(4)} SOL`
          } catch (error) {
            balance = 'Error'
          }
        }
        
        table.addRow({
          name: wallet.isActive ? chalk.green(`▶ ${wallet.name}`) : `  ${wallet.name}`,
          address: wallet.address.slice(0, 8) + '...' + wallet.address.slice(-8),
          network: wallet.network,
          status: wallet.isActive ? chalk.green('Active') : chalk.gray('Inactive'),
          balance: options.balance ? balance : '-',
          created: new Date(wallet.createdAt).toLocaleDateString()
        })
      }
      
      if (options.balance) {
        s.stop('Balance check complete')
      }
      
      console.log('')
      table.printTable()
      console.log('')
      
      log.info(chalk.gray('Tips:'))
      log.info(chalk.gray('  • Use "gs wallet use <name>" to switch active wallet'))
      log.info(chalk.gray('  • Use "gs wallet show" to see full wallet details'))
      
      outro('Wallet list complete')
      
    } catch (error) {
      cancel(chalk.red('Failed to list wallets: ' + (error instanceof Error ? error.message : 'Unknown error')))
    }
  })

// Create new wallet
walletCommand
  .command('create')
  .alias('new')
  .description('Create a new wallet')
  .option('-n, --name <name>', 'Wallet name')
  .option('--network <network>', 'Network (devnet|testnet|mainnet-beta)', 'devnet')
  .option('--no-backup', 'Skip seed phrase backup confirmation')
  .action(async (options: { name?: string; network?: string; backup?: boolean }) => {
    intro(chalk.cyan('🆕 Create New Wallet'))
    
    try {
      const walletService = new WalletService()
      
      // Get wallet name
      let walletName = options.name
      if (!walletName) {
        const nameInput = await text({
          message: 'Wallet name:',
          placeholder: 'main-wallet',
          validate: (value) => {
            if (!value || value.trim().length === 0) return 'Name is required'
            if (!/^[a-zA-Z0-9-_]+$/.test(value)) return 'Use only letters, numbers, - and _'
            return undefined
          }
        })
        
        if (isCancel(nameInput)) {
          cancel('Wallet creation cancelled')
          return
        }
        
        walletName = nameInput.toString()
      }
      
      // Validate network
      const network = (options.network as 'devnet' | 'testnet' | 'mainnet-beta' | undefined) ?? 'devnet'
      if (!['devnet', 'testnet', 'mainnet-beta'].includes(network)) {
        throw new Error('Invalid network. Use devnet, testnet, or mainnet-beta')
      }
      
      const s = spinner()
      s.start('Generating secure wallet...')
      
      // Create wallet
      const { wallet, mnemonic } = await walletService.createWallet(walletName, network)
      
      s.stop('✅ Wallet created successfully')
      
      // Display seed phrase prominently
      console.log('')
      console.log(boxen(
        chalk.yellow('🔐 SEED PHRASE - WRITE THIS DOWN!\n\n') +
        chalk.white(mnemonic) + '\n\n' +
        chalk.red('⚠️  This is the ONLY way to recover your wallet!\n') +
        chalk.red('Never share this with anyone!'),
        {
          padding: 1,
          margin: 1,
          borderStyle: 'double',
          borderColor: 'yellow'
        }
      ))
      
      // Confirm backup
      if (options.backup !== false) {
        const confirmed = await confirm({
          message: 'Have you written down your seed phrase?',
          initialValue: false
        })
        
        if (isCancel(confirmed) || !confirmed) {
          // Still created, but warn user
          log.warn('⚠️  Please save your seed phrase! Use "gs wallet backup" to see it again.')
        }
      }
      
      // Display wallet info
      console.log('')
      note(
        `Name:     ${wallet.metadata.name}\n` +
        `Address:  ${wallet.metadata.address}\n` +
        `Network:  ${wallet.metadata.network}\n` +
        `Status:   ${wallet.metadata.isActive ? 'Active' : 'Created'}`,
        'Wallet Information'
      )
      
      // Update config if this is the active wallet
      if (wallet.metadata.isActive) {
        const config = loadConfig()
        config.walletPath = `~/.ghostspeak/wallets/${walletName}.json`
        config.network = network as 'devnet' | 'testnet'
        saveConfig(config)
        log.success('✅ Set as active wallet')
      }
      
      console.log('')
      log.info('Next steps:')
      log.info(`  1. Fund your wallet: ${chalk.cyan('gs faucet')}`)
      log.info(`  2. Check balance: ${chalk.cyan('gs wallet balance')}`)
      log.info(`  3. Create an agent: ${chalk.cyan('gs agent register')}`)
      
      outro('Wallet created successfully')
      
    } catch (error) {
      cancel(chalk.red('Failed to create wallet: ' + (error instanceof Error ? error.message : 'Unknown error')))
    }
  })

// Show wallet details
walletCommand
  .command('show')
  .alias('info')
  .description('Show active wallet details')
  .option('-n, --name <name>', 'Show specific wallet')
  .action(async (options: { name?: string }) => {
    intro(chalk.cyan('💳 Wallet Details'))
    
    try {
      const walletService = new WalletService()
      
      let wallet
      if (options.name) {
        wallet = walletService.getWallet(options.name)
        if (!wallet) {
          throw new Error(`Wallet "${options.name}" not found`)
        }
      } else {
        wallet = walletService.getActiveWallet()
        if (!wallet) {
          throw new Error('No active wallet. Create one with: gs wallet create')
        }
      }
      
      const s = spinner()
      s.start('Fetching wallet details...')
      
      // Get balance
      const balance = await walletService.getBalance(
        wallet.metadata.address, 
        wallet.metadata.network
      )
      
      s.stop('✅ Wallet details loaded')
      
      console.log('')
      console.log(boxen(
        chalk.bold('Wallet Information\n\n') +
        `${chalk.gray('Name:')}      ${wallet.metadata.name}\n` +
        `${chalk.gray('Address:')}   ${wallet.metadata.address}\n` +
        `${chalk.gray('Network:')}   ${wallet.metadata.network}\n` +
        `${chalk.gray('Balance:')}   ${balance.toFixed(9)} SOL\n` +
        `${chalk.gray('Status:')}    ${wallet.metadata.isActive ? chalk.green('Active') : 'Inactive'}\n` +
        `${chalk.gray('Created:')}   ${new Date(wallet.metadata.createdAt).toLocaleString()}\n` +
        `${chalk.gray('Last Used:')} ${new Date(wallet.metadata.lastUsed).toLocaleString()}`,
        {
          padding: 1,
          borderStyle: 'round',
          borderColor: 'cyan'
        }
      ))
      
      console.log('')
      log.info(`Explorer: ${getExplorerUrl(wallet.metadata.address, wallet.metadata.network)}`)
      
      outro('Wallet details complete')
      
    } catch (error) {
      cancel(chalk.red('Failed to show wallet: ' + (error instanceof Error ? error.message : 'Unknown error')))
    }
  })

// Switch active wallet
walletCommand
  .command('use')
  .alias('switch')
  .description('Switch to a different wallet')
  .argument('[name]', 'Wallet name to switch to')
  .action(async (name?: string) => {
    intro(chalk.cyan('🔄 Switch Active Wallet'))
    
    try {
      const walletService = new WalletService()
      const wallets = walletService.listWallets()
      
      if (wallets.length === 0) {
        log.error('No wallets found. Create one with: gs wallet create')
        outro('No wallets available')
        return
      }
      
      let selectedName = name
      
      // If no name provided, show selection
      if (!selectedName) {
        const choice = await select({
          message: 'Select wallet to activate:',
          options: wallets.map(w => ({
            value: w.name,
            label: w.name,
            hint: `${w.address.slice(0, 8)}...${w.address.slice(-8)} (${w.network})`
          }))
        })
        
        if (isCancel(choice)) {
          cancel('Wallet switch cancelled')
          return
        }
        
        selectedName = choice.toString()
      }
      
      // Switch wallet
      walletService.setActiveWallet(selectedName)
      
      // Update config
      const config = loadConfig()
      const wallet = walletService.getWallet(selectedName)
      if (wallet) {
        config.walletPath = `~/.ghostspeak/wallets/${selectedName}.json`
        config.network = wallet.metadata.network as 'devnet' | 'testnet'
        saveConfig(config)
      }
      
      log.success(`✅ Switched to wallet: ${selectedName}`)
      
      outro('Active wallet updated')
      
    } catch (error) {
      cancel(chalk.red('Failed to switch wallet: ' + (error instanceof Error ? error.message : 'Unknown error')))
    }
  })

// Show balance
walletCommand
  .command('balance')
  .alias('bal')
  .description('Check wallet balance')
  .option('-n, --name <name>', 'Check specific wallet')
  .option('-a, --all', 'Show all wallet balances')
  .action(async (options: { name?: string; all?: boolean }) => {
    intro(chalk.cyan('💰 Wallet Balance'))
    
    try {
      const walletService = new WalletService()
      
      if (options.all) {
        const wallets = walletService.listWallets()
        if (wallets.length === 0) {
          log.info('No wallets found')
          outro('No wallets available')
          return
        }
        
        const s = spinner()
        s.start('Checking balances...')
        
        const balances: Array<{ name: string; address: string; balance: number; network: string }> = []
        
        for (const wallet of wallets) {
          try {
            const balance = await walletService.getBalance(wallet.address, wallet.network)
            balances.push({
              name: wallet.name,
              address: wallet.address,
              balance,
              network: wallet.network
            })
          } catch (error) {
            balances.push({
              name: wallet.name,
              address: wallet.address,
              balance: -1,
              network: wallet.network
            })
          }
        }
        
        s.stop('✅ Balance check complete')
        
        console.log('')
        balances.forEach(b => {
          const balanceStr = b.balance >= 0 ? `${b.balance.toFixed(9)} SOL` : 'Error'
          console.log(
            `${chalk.bold(b.name).padEnd(20)} ${balanceStr.padEnd(15)} ${chalk.gray(`(${b.network})`)}`
          )
        })
        console.log('')
        
      } else {
        let wallet
        if (options.name) {
          wallet = walletService.getWallet(options.name)
          if (!wallet) {
            throw new Error(`Wallet "${options.name}" not found`)
          }
        } else {
          wallet = walletService.getActiveWallet()
          if (!wallet) {
            throw new Error('No active wallet')
          }
        }
        
        const s = spinner()
        s.start('Checking balance...')
        
        const balance = await walletService.getBalance(
          wallet.metadata.address,
          wallet.metadata.network
        )
        
        s.stop('✅ Balance retrieved')
        
        console.log('')
        console.log(chalk.bold(`Wallet: ${wallet.metadata.name}`))
        console.log(chalk.gray(`Address: ${wallet.metadata.address}`))
        console.log(chalk.gray(`Network: ${wallet.metadata.network}`))
        console.log('')
        console.log(chalk.green(`Balance: ${balance.toFixed(9)} SOL`))
        console.log('')
      }
      
      outro('Balance check complete')
      
    } catch (error) {
      cancel(chalk.red('Failed to check balance: ' + (error instanceof Error ? error.message : 'Unknown error')))
    }
  })

// Import wallet
walletCommand
  .command('import')
  .description('Import wallet from seed phrase or private key')
  .option('-n, --name <name>', 'Wallet name')
  .option('--network <network>', 'Network (devnet|testnet|mainnet-beta)', 'devnet')
  .action(async (options: { name?: string; network?: string }) => {
    intro(chalk.cyan('📥 Import Wallet'))
    
    try {
      const walletService = new WalletService()
      
      // Get wallet name
      let walletName = options.name
      if (!walletName) {
        const nameInput = await text({
          message: 'Wallet name:',
          placeholder: 'imported-wallet',
          validate: (value) => {
            if (!value || value.trim().length === 0) return 'Name is required'
            if (!/^[a-zA-Z0-9-_]+$/.test(value)) return 'Use only letters, numbers, - and _'
            return undefined
          }
        })
        
        if (isCancel(nameInput)) {
          cancel('Import cancelled')
          return
        }
        
        walletName = nameInput.toString()
      }
      
      // Get import method
      const importMethod = await select({
        message: 'Import from:',
        options: [
          { value: 'mnemonic', label: 'Seed phrase (12 or 24 words)' },
          { value: 'privatekey', label: 'Private key (JSON array)' }
        ]
      })
      
      if (isCancel(importMethod)) {
        cancel('Import cancelled')
        return
      }
      
      // Get secret
      const secretInput = await text({
        message: importMethod === 'mnemonic' ? 'Enter seed phrase:' : 'Enter private key:',
        placeholder: importMethod === 'mnemonic' ? 'word1 word2 word3...' : '[1,2,3,...]'
      })
      
      if (isCancel(secretInput)) {
        cancel('Import cancelled')
        return
      }
      
      const network = (options.network as 'devnet' | 'testnet' | 'mainnet-beta' | undefined) ?? 'devnet'
      
      const s = spinner()
      s.start('Importing wallet...')
      
      // Import wallet
      const wallet = await walletService.importWallet(
        walletName,
        secretInput.toString().trim(),
        network
      )
      
      s.stop('✅ Wallet imported successfully')
      
      // Display wallet info
      console.log('')
      note(
        `Name:     ${wallet.metadata.name}\n` +
        `Address:  ${wallet.metadata.address}\n` +
        `Network:  ${wallet.metadata.network}\n` +
        `Status:   ${wallet.metadata.isActive ? 'Active' : 'Imported'}`,
        'Imported Wallet'
      )
      
      // Update config if active
      if (wallet.metadata.isActive) {
        const config = loadConfig()
        config.walletPath = `~/.ghostspeak/wallets/${walletName}.json`
        config.network = network as 'devnet' | 'testnet'
        saveConfig(config)
        log.success('✅ Set as active wallet')
      }
      
      outro('Wallet imported successfully')
      
    } catch (error) {
      cancel(chalk.red('Failed to import wallet: ' + (error instanceof Error ? error.message : 'Unknown error')))
    }
  })

// Backup wallet (show seed phrase)
walletCommand
  .command('backup')
  .description('Show seed phrase for wallet backup')
  .option('-n, --name <name>', 'Wallet to backup')
  .action(async (_options: { name?: string }) => {
    intro(chalk.cyan('🔐 Wallet Backup'))
    
    log.warn('⚠️  This feature shows your seed phrase.')
    log.warn('Make sure no one is looking at your screen!')
    
    const proceed = await confirm({
      message: 'Continue and show seed phrase?',
      initialValue: false
    })
    
    if (isCancel(proceed) || !proceed) {
      cancel('Backup cancelled')
      return
    }
    
    log.error('❌ Seed phrase recovery not yet implemented')
    log.info('Seed phrases are only shown during wallet creation')
    log.info('Keep your original backup safe!')
    
    outro('Backup information')
  })

// Rename wallet
walletCommand
  .command('rename')
  .description('Rename a wallet')
  .argument('[old-name]', 'Current wallet name')
  .argument('[new-name]', 'New wallet name')
  .action(async (oldName?: string, newName?: string) => {
    intro(chalk.cyan('✏️  Rename Wallet'))
    
    try {
      const walletService = new WalletService()
      
      if (!oldName) {
        const wallets = walletService.listWallets()
        if (wallets.length === 0) {
          log.error('No wallets found')
          outro('No wallets available')
          return
        }
        
        const choice = await select({
          message: 'Select wallet to rename:',
          options: wallets.map(w => ({
            value: w.name,
            label: w.name,
            hint: `${w.address.slice(0, 8)}...${w.address.slice(-8)}`
          }))
        })
        
        if (isCancel(choice)) {
          cancel('Rename cancelled')
          return
        }
        
        oldName = choice.toString()
      }
      
      if (!newName) {
        const nameInput = await text({
          message: 'New name:',
          placeholder: 'new-wallet-name',
          validate: (value) => {
            if (!value || value.trim().length === 0) return 'Name is required'
            if (!/^[a-zA-Z0-9-_]+$/.test(value)) return 'Use only letters, numbers, - and _'
            return undefined
          }
        })
        
        if (isCancel(nameInput)) {
          cancel('Rename cancelled')
          return
        }
        
        newName = nameInput.toString()
      }
      
      walletService.renameWallet(oldName, newName)
      
      log.success(`✅ Renamed "${oldName}" to "${newName}"`)
      
      // Update config if this was the active wallet
      const activeWallet = walletService.getActiveWallet()
      if (activeWallet && activeWallet.metadata.name === newName) {
        const config = loadConfig()
        config.walletPath = `~/.ghostspeak/wallets/${newName}.json`
        saveConfig(config)
      }
      
      outro('Wallet renamed successfully')
      
    } catch (error) {
      cancel(chalk.red('Failed to rename wallet: ' + (error instanceof Error ? error.message : 'Unknown error')))
    }
  })

// Delete wallet
walletCommand
  .command('delete')
  .alias('remove')
  .description('Delete a wallet')
  .argument('[name]', 'Wallet name to delete')
  .option('-f, --force', 'Skip confirmation')
  .action(async (name?: string, options?: { force?: boolean }) => {
    intro(chalk.cyan('🗑️  Delete Wallet'))
    
    try {
      const walletService = new WalletService()
      
      if (!name) {
        const wallets = walletService.listWallets()
        if (wallets.length === 0) {
          log.error('No wallets found')
          outro('No wallets available')
          return
        }
        
        const choice = await select({
          message: 'Select wallet to delete:',
          options: wallets.map(w => ({
            value: w.name,
            label: w.name,
            hint: w.isActive ? chalk.yellow('Active wallet') : ''
          }))
        })
        
        if (isCancel(choice)) {
          cancel('Delete cancelled')
          return
        }
        
        name = choice.toString()
      }
      
      // Get wallet details for confirmation
      const wallet = walletService.getWallet(name)
      if (!wallet) {
        throw new Error(`Wallet "${name}" not found`)
      }
      
      // Confirm deletion
      if (!options?.force) {
        log.warn(`⚠️  This will permanently delete wallet: ${name}`)
        log.warn(`Address: ${wallet.metadata.address}`)
        
        const confirmed = await confirm({
          message: 'Are you sure you want to delete this wallet?',
          initialValue: false
        })
        
        if (isCancel(confirmed) || !confirmed) {
          cancel('Delete cancelled')
          return
        }
      }
      
      walletService.deleteWallet(name)
      
      log.success(`✅ Deleted wallet: ${name}`)
      
      outro('Wallet deleted')
      
    } catch (error) {
      cancel(chalk.red('Failed to delete wallet: ' + (error instanceof Error ? error.message : 'Unknown error')))
    }
  })

// Default action - show active wallet
walletCommand
  .action(async () => {
    // Redirect to show command
    await walletCommand.commands.find(cmd => cmd.name() === 'show')?.parseAsync(process.argv)
  })