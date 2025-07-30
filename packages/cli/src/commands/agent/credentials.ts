/**
 * Agent credentials management command
 */

import type { Command } from 'commander'
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
import { AgentWalletManager, AgentBackupManager } from '../../utils/agentWallet.js'
import { container, ServiceTokens } from '../../core/Container.js'
import type { IWalletService } from '../../types/services.js'
import type { Address } from '@solana/addresses'

export function registerCredentialsCommand(parentCommand: Command): void {
  parentCommand
    .command('credentials')
    .description('Manage agent credentials')
    .action(async () => {
      intro(chalk.cyan('🔐 Agent Credentials Manager'))

      try {
        // Get WalletService from container
        const walletService = container.resolve<IWalletService>(ServiceTokens.WALLET_SERVICE)
        const wallet = walletService.getActiveWalletInterface()
        
        if (!wallet) {
          cancel(chalk.red('No active wallet found. Please select a wallet first.'))
          return
        }
        
        const action = await select({
          message: 'What would you like to do?',
          options: [
            { value: 'list', label: '📋 List all agent credentials' },
            { value: 'show', label: '👁️  Show agent details' },
            { value: 'backup', label: '💾 Backup agent credentials' },
            { value: 'restore', label: '📥 Restore agent credentials' },
            { value: 'delete', label: '🗑️  Delete agent credentials' }
          ]
        })

        if (isCancel(action)) {
          cancel('Operation cancelled')
          return
        }

        switch (action) {
          case 'list':
            await listCredentials(wallet.address)
            break
          case 'show':
            await showCredentials(wallet.address)
            break
          case 'backup':
            await backupCredentials(wallet.address)
            break
          case 'restore':
            await restoreCredentials()
            break
          case 'delete':
            await deleteCredentials(wallet.address)
            break
        }

        outro('Credential management completed')
      } catch (error) {
        cancel(chalk.red('Error: ' + (error instanceof Error ? error.message : 'Unknown error')))
      }
    })
}

// Helper functions for credential management
async function listCredentials(ownerAddress: Address) {
  const s = spinner()
  s.start('Loading agent credentials...')
  
  const credentials = await AgentWalletManager.getAgentsByOwner(ownerAddress)
  
  s.stop('✅ Credentials loaded')
  
  if (credentials.length === 0) {
    console.log('\n' + chalk.yellow('No agent credentials found'))
    return
  }

  console.log('\n' + chalk.bold(`🔐 Your Agent Credentials (${credentials.length})`))
  console.log('═'.repeat(70))

  credentials.forEach((cred, index) => {
    console.log(chalk.cyan(`${index + 1}. ${cred.name}`))
    console.log(chalk.gray(`   Agent ID: ${cred.agentId}`))
    console.log(chalk.gray(`   UUID: ${cred.uuid}`))
    console.log(chalk.gray(`   Agent Wallet: ${cred.agentWallet.publicKey}`))
    console.log(chalk.gray(`   Created: ${new Date(cred.createdAt).toLocaleString()}`))
    console.log(chalk.gray(`   CNFT: ${cred.cnftMint ? '✅ Yes' : '❌ No'}`))
    console.log('')
  })
}

async function showCredentials(ownerAddress: Address) {
  const credentials = await AgentWalletManager.getAgentsByOwner(ownerAddress)
  
  if (credentials.length === 0) {
    console.log('\n' + chalk.yellow('No agent credentials found'))
    return
  }

  const selectedAgentId = await select({
    message: 'Select agent to view details:',
    options: credentials.map(cred => ({
      value: cred.agentId,
      label: `${cred.name} (${cred.uuid})`
    }))
  })

  if (isCancel(selectedAgentId)) {
    return
  }

  const selectedCredentials = credentials.find(cred => cred.agentId === selectedAgentId)
  
  if (!selectedCredentials) {
    console.log(chalk.red('Agent not found'))
    return
  }

  console.log('\n' + chalk.bold('🔐 Agent Credentials:'))
  console.log('─'.repeat(50))
  console.log(chalk.cyan('Name:') + ` ${selectedCredentials.name}`)
  console.log(chalk.cyan('Agent ID:') + ` ${selectedCredentials.agentId}`)
  console.log(chalk.cyan('UUID:') + ` ${selectedCredentials.uuid}`)
  console.log(chalk.cyan('Description:') + ` ${selectedCredentials.description}`)
  console.log(chalk.cyan('Agent Wallet:') + ` ${selectedCredentials.agentWallet.publicKey}`)
  console.log(chalk.cyan('Owner:') + ` ${selectedCredentials.ownerWallet}`)
  console.log(chalk.cyan('Created:') + ` ${new Date(selectedCredentials.createdAt).toLocaleString()}`)
  console.log(chalk.cyan('Updated:') + ` ${new Date(selectedCredentials.updatedAt).toLocaleString()}`)
  
  if (selectedCredentials.cnftMint) {
    console.log(chalk.cyan('CNFT Mint:') + ` ${selectedCredentials.cnftMint}`)
    console.log(chalk.cyan('Merkle Tree:') + ` ${selectedCredentials.merkleTree}`)
  }
}

async function backupCredentials(ownerAddress: Address) {
  const credentials = await AgentWalletManager.getAgentsByOwner(ownerAddress)
  
  if (credentials.length === 0) {
    console.log('\n' + chalk.yellow('No agent credentials found'))
    return
  }

  const backupType = await select({
    message: 'Backup type:',
    options: [
      { value: 'single', label: '📄 Single agent backup' },
      { value: 'all', label: '📦 Backup all agents' }
    ]
  })

  if (isCancel(backupType)) {
    return
  }

  if (backupType === 'single') {
    const selectedAgentId = await select({
      message: 'Select agent to backup:',
      options: credentials.map(cred => ({
        value: cred.agentId,
        label: `${cred.name} (${cred.uuid})`
      }))
    })

    if (isCancel(selectedAgentId)) {
      return
    }

    const backupPath = await text({
      message: 'Backup file path:',
      placeholder: `./agent-backup-${selectedAgentId}.json`,
      validate: (value) => {
        if (!value) return 'Backup path is required'
      }
    })

    if (isCancel(backupPath)) {
      return
    }

    const s = spinner()
    s.start('Creating backup...')
    
    try {
      await AgentBackupManager.backupAgent(selectedAgentId as string, backupPath as string)
      s.stop('✅ Backup created')
      console.log(chalk.green(`\n✅ Agent backup saved to: ${backupPath}`))
    } catch (error) {
      s.stop('❌ Backup failed')
      console.log(chalk.red('Backup failed: ' + (error instanceof Error ? error.message : 'Unknown error')))
    }
  } else {
    const backupDir = await text({
      message: 'Backup directory:',
      placeholder: './agent-backups',
      validate: (value) => {
        if (!value) return 'Backup directory is required'
      }
    })

    if (isCancel(backupDir)) {
      return
    }

    const s = spinner()
    s.start('Creating backups...')
    
    try {
      await AgentBackupManager.backupAllAgents(ownerAddress, backupDir as string)
      s.stop('✅ Backups created')
      console.log(chalk.green(`\n✅ All agent backups saved to: ${backupDir}`))
    } catch (error) {
      s.stop('❌ Backup failed')
      console.log(chalk.red('Backup failed: ' + (error instanceof Error ? error.message : 'Unknown error')))
    }
  }
}

async function restoreCredentials() {
  const backupPath = await text({
    message: 'Backup file path:',
    placeholder: './agent-backup.json',
    validate: (value) => {
      if (!value) return 'Backup path is required'
    }
  })

  if (isCancel(backupPath)) {
    return
  }

  const s = spinner()
  s.start('Restoring agent...')
  
  try {
    const agentId = await AgentBackupManager.restoreAgent(backupPath as string)
    s.stop('✅ Agent restored')
    console.log(chalk.green(`\n✅ Agent restored: ${agentId}`))
  } catch (error) {
    s.stop('❌ Restore failed')
    console.log(chalk.red('Restore failed: ' + (error instanceof Error ? error.message : 'Unknown error')))
  }
}

async function deleteCredentials(ownerAddress: Address) {
  const credentials = await AgentWalletManager.getAgentsByOwner(ownerAddress)
  
  if (credentials.length === 0) {
    console.log('\n' + chalk.yellow('No agent credentials found'))
    return
  }

  const selectedAgentId = await select({
    message: 'Select agent to delete:',
    options: credentials.map(cred => ({
      value: cred.agentId,
      label: `${cred.name} (${cred.uuid})`
    }))
  })

  if (isCancel(selectedAgentId)) {
    return
  }

  const selectedCredentials = credentials.find(cred => cred.agentId === selectedAgentId)
  
  if (!selectedCredentials) {
    console.log(chalk.red('Agent not found'))
    return
  }

  console.log('\n' + chalk.bold('⚠️  WARNING: This will permanently delete agent credentials'))
  console.log(chalk.red('Agent to delete:') + ` ${selectedCredentials.name}`)
  console.log(chalk.red('UUID:') + ` ${selectedCredentials.uuid}`)
  console.log(chalk.yellow('This action cannot be undone!'))

  const confirmed = await confirm({
    message: 'Are you sure you want to delete these credentials?'
  })

  if (isCancel(confirmed) || !confirmed) {
    console.log(chalk.gray('Deletion cancelled'))
    return
  }

  const s = spinner()
  s.start('Deleting credentials...')
  
  try {
    await AgentWalletManager.deleteCredentials(selectedCredentials.agentId)
    s.stop('✅ Credentials deleted')
    console.log(chalk.green(`\n✅ Agent credentials deleted: ${selectedCredentials.name}`))
  } catch (error) {
    s.stop('❌ Deletion failed')
    console.log(chalk.red('Deletion failed: ' + (error instanceof Error ? error.message : 'Unknown error')))
  }
}