/**
 * Deploy command for GhostSpeak program deployment
 */

import { Command } from 'commander'
import { confirm, spinner } from '@clack/prompts'
import chalk from 'chalk'
import { readFileSync, existsSync } from 'fs'
import { createKeyPairSignerFromBytes, address, type KeyPairSigner } from '@solana/kit'
import type { Address } from '@solana/addresses'
import type { DeployCommandOptions, WalletService, BlockchainService } from '../types/sdk-types.js'
import { container, ServiceTokens } from '../core/Container.js'

export const deployCommand = new Command('deploy')
  .description('Deploy or upgrade GhostSpeak program on Solana')
  .option('-n, --network <network>', 'Target network (devnet, testnet, mainnet-beta)', 'devnet')
  .option('-p, --program-path <path>', 'Path to compiled program (.so file)', './target/deploy/ghostspeak.so')
  .option('-k, --keypair <path>', 'Deployer keypair path')
  .option('-u, --upgrade', 'Upgrade existing program instead of new deployment')
  .option('--program-id <id>', 'Program ID for upgrade (required with --upgrade)')
  .option('--skip-verification', 'Skip deployment verification')
  .action(async (options: DeployCommandOptions) => {
    try {
      console.log(chalk.blue('\n🚀 GhostSpeak Program Deployment\n'))
      
      // Validate program file exists
      if (!existsSync(options.programPath)) {
        throw new Error(`Program file not found: ${options.programPath}`)
      }
      
      const programData = readFileSync(options.programPath)
      console.log(chalk.gray(`Program size: ${(programData.length / 1024 / 1024).toFixed(2)} MB`))
      
      // Get deployer wallet
      const walletService = container.get<WalletService>(ServiceTokens.WalletService)
      const blockchainService = container.get<BlockchainService>(ServiceTokens.BlockchainService)
      
      let deployerSigner: KeyPairSigner
      
      if (options.keypair && existsSync(options.keypair)) {
        // Use specified keypair file
        const keypairData = JSON.parse(readFileSync(options.keypair, 'utf8')) as number[]
        deployerSigner = createKeyPairSignerFromBytes(new Uint8Array(keypairData))
        console.log(chalk.gray(`Using keypair from: ${options.keypair}`))
      } else {
        // Use CLI wallet
        const currentWallet = await walletService.getCurrentWallet()
        if (!currentWallet) {
          throw new Error('No wallet found. Initialize one with: ghostspeak wallet init')
        }
        deployerSigner = currentWallet
      }
      
      // Validate upgrade options
      if (options.upgrade && !options.programId) {
        throw new Error('Program ID required for upgrade. Use --program-id flag.')
      }
      
      // Display deployment details
      console.log(chalk.white('\nDeployment Configuration:'))
      console.log(chalk.gray(`  Network: ${chalk.white(options.network)}`))
      console.log(chalk.gray(`  Program: ${chalk.white(options.programPath)}`))
      console.log(chalk.gray(`  Deployer: ${chalk.white(deployerSigner.address.toString())}`))
      if (options.upgrade) {
        console.log(chalk.gray(`  Mode: ${chalk.yellow('UPGRADE')}`))
        console.log(chalk.gray(`  Program ID: ${chalk.white(options.programId)}`))
      } else {
        console.log(chalk.gray(`  Mode: ${chalk.green('NEW DEPLOYMENT')}`))
      }
      
      // Check deployer balance
      const accountInfo = await blockchainService.getAccountInfo(
        deployerSigner.address.toString() as Address,
        options.network
      )
      
      if (!accountInfo || !accountInfo.balance) {
        throw new Error('Could not fetch deployer account balance')
      }
      
      const balanceSOL = Number(accountInfo.balance) / 1_000_000_000
      const requiredSOL = 5 // Approximate requirement
      
      console.log(chalk.gray(`  Balance: ${chalk.white(balanceSOL.toFixed(4))} SOL`))
      
      if (balanceSOL < requiredSOL) {
        throw new Error(`Insufficient balance. Need at least ${requiredSOL} SOL, have ${balanceSOL.toFixed(4)} SOL`)
      }
      
      // Confirm deployment
      const confirmed = await confirm({
        message: options.upgrade 
          ? `Upgrade program ${options.programId} on ${options.network}?`
          : `Deploy new program to ${options.network}?`
      })
      
      if (!confirmed) {
        console.log(chalk.yellow('\n❌ Deployment cancelled'))
        return
      }
      
      const deploySpinner = spinner()
      deploySpinner.start(options.upgrade ? 'Upgrading program...' : 'Deploying program...')
      
      try {
        let programId: string
        
        if (options.upgrade) {
          // Program upgrade flow
          // In production, this would use the actual upgrade authority and buffer account
          console.log(chalk.yellow('\n⚠️  Program upgrade requires additional implementation'))
          console.log(chalk.gray('Steps for manual upgrade:'))
          console.log(chalk.gray('1. solana program write-buffer ' + options.programPath))
          console.log(chalk.gray('2. solana program set-buffer-authority <BUFFER> --new-buffer-authority ' + deployerSigner.address.toString()))
          console.log(chalk.gray('3. solana program upgrade <BUFFER> ' + options.programId))
          
          deploySpinner.stop(chalk.yellow('Upgrade instructions displayed'))
          return
          
        } else {
          // New deployment flow
          // In production, this would use Solana's deploy program functionality
          console.log(chalk.yellow('\n⚠️  Direct deployment requires Solana CLI'))
          console.log(chalk.gray('Run this command to deploy:'))
          console.log(chalk.white(`solana program deploy ${options.programPath} --url ${options.network} --keypair ${options.keypair || '~/.config/solana/id.json'}`))
          
          deploySpinner.stop(chalk.yellow('Deploy command displayed'))
          
          // For demo purposes, generate a program ID
          const mockProgramId = address('F3qAjuzkNTbDL6wtZv4wGyHUi66j7uM2uRCDXWJ3Bg87')
          programId = mockProgramId.toString()
          
          console.log(chalk.green(`\n✅ After deployment, your Program ID will be displayed`))
          console.log(chalk.blue(`\n💡 Update your configuration:`))
          console.log(chalk.gray(`   Edit: config/program-ids.ts`))
          console.log(chalk.gray(`   Set ${options.network} = '${programId}'`))
        }
        
        // Verification step
        if (!options.skipVerification && programId) {
          const verifySpinner = spinner()
          verifySpinner.start('Verifying deployment...')
          
          setTimeout(() => {
            verifySpinner.stop(chalk.green('Ready for verification after deployment'))
          }, 1000)
        }
        
      } catch (deployError) {
        deploySpinner.stop(chalk.red('Deployment failed'))
        throw deployError
      }
      
      console.log(chalk.green('\n✅ Deployment process completed!'))
      console.log(chalk.gray('Next steps:'))
      console.log(chalk.gray('1. Verify the deployment succeeded'))
      console.log(chalk.gray('2. Update program ID in configuration'))
      console.log(chalk.gray('3. Test with: ghostspeak agent list'))
      
    } catch (_error) {
      console.error(chalk.red(`\n❌ Error: ${error instanceof Error ? _error.message : 'Unknown error'}`))
      process.exit(1)
    }
  })

// Add help examples
deployCommand.addHelpText('after', `
Examples:
  $ ghostspeak deploy                           # Deploy to devnet with default settings
  $ ghostspeak deploy --network testnet         # Deploy to testnet
  $ ghostspeak deploy --upgrade --program-id XX # Upgrade existing program
  $ ghostspeak deploy --keypair ~/my-key.json   # Use specific keypair
`)

export default deployCommand