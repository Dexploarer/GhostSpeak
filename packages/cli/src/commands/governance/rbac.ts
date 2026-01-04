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
  log
} from '@clack/prompts'
import { initializeClient, getExplorerUrl, toSDKSigner } from '../../utils/client.js'
import { handleError } from '../../utils/error-handler.js'
import { createSafeSDKClient } from '../../utils/sdk-helpers.js'
import { address } from '@solana/addresses'
import type { RBACOptions } from './types.js'

export const rbacCommand = new Command('rbac')
  .description('Manage role-based access control')

rbacCommand
  .command('grant')
  .description('Grant role to user')
  .option('-u, --user <address>', 'User address')
  .option('-r, --role <role>', 'Role to grant')
  .action(async (options: RBACOptions) => {
    intro(chalk.green('Grant Role'))

    try {
      const { client, wallet } = await initializeClient('devnet')
      const safeClient = createSafeSDKClient(client)

      // Get user address
      let userAddress = options.user
      if (!userAddress) {
        const userInput = await text({
          message: 'User address to grant role to:',
          validate: (value) => {
            if (!value) return 'User address is required'
            try {
              address(value.trim())
              return
            } catch {
              return 'Please enter a valid Solana address'
            }
          }
        })

        if (isCancel(userInput)) {
          cancel('Role grant cancelled')
          return
        }

        userAddress = userInput.toString().trim()
      }

      // Get role
      let role = options.role
      if (!role) {
        const roleChoice = await select({
          message: 'Select role to grant:',
          options: [
            { value: 'admin', label: 'Admin', hint: 'Full system access' },
            { value: 'moderator', label: 'Moderator', hint: 'Moderation privileges' },
            { value: 'arbitrator', label: 'Arbitrator', hint: 'Dispute resolution' },
            { value: 'operator', label: 'Operator', hint: 'System operations' }
          ]
        })

        if (isCancel(roleChoice)) {
          cancel('Role grant cancelled')
          return
        }

        role = roleChoice.toString()
      }

      const confirmGrant = await confirm({
        message: `Grant ${role} role to ${userAddress}?`
      })

      if (isCancel(confirmGrant) || !confirmGrant) {
        cancel('Role grant cancelled')
        return
      }

      const s = spinner()
      s.start('Granting role on blockchain...')

      try {
        const signature = await safeClient.governance.grantRole({
          user: address(userAddress),
          role,
          granter: wallet.address,
          signer: toSDKSigner(wallet)
        })

        if (!signature) {
          throw new Error('Failed to get transaction signature')
        }

        s.stop('Role granted successfully!')

        const explorerUrl = getExplorerUrl(signature, 'devnet')

        outro(
          `${chalk.green('Role Granted!')}\n\n` +
          `${chalk.gray('User:')} ${userAddress}\n` +
          `${chalk.gray('Role:')} ${role.toUpperCase()}\n` +
          `${chalk.gray('Explorer:')} ${explorerUrl}`
        )

      } catch (error) {
        s.stop('Failed to grant role')
        handleError(error)
      }

    } catch (error) {
      log.error(`Failed to grant role: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  })

rbacCommand
  .command('revoke')
  .description('Revoke role from user')
  .option('-u, --user <address>', 'User address')
  .option('-r, --role <role>', 'Role to revoke')
  .action(async (options: RBACOptions) => {
    intro(chalk.red('Revoke Role'))

    try {
      const { client, wallet } = await initializeClient('devnet')
      const safeClient = createSafeSDKClient(client)

      // Get user address
      let userAddress = options.user
      if (!userAddress) {
        const userInput = await text({
          message: 'User address to revoke role from:',
          validate: (value) => {
            if (!value) return 'User address is required'
            try {
              address(value.trim())
              return
            } catch {
              return 'Please enter a valid Solana address'
            }
          }
        })

        if (isCancel(userInput)) {
          cancel('Role revoke cancelled')
          return
        }

        userAddress = userInput.toString().trim()
      }

      // Get role
      let role = options.role
      if (!role) {
        const roleChoice = await select({
          message: 'Select role to revoke:',
          options: [
            { value: 'admin', label: 'Admin', hint: 'Remove admin access' },
            { value: 'moderator', label: 'Moderator', hint: 'Remove moderation privileges' },
            { value: 'arbitrator', label: 'Arbitrator', hint: 'Remove arbitration rights' },
            { value: 'operator', label: 'Operator', hint: 'Remove operation access' }
          ]
        })

        if (isCancel(roleChoice)) {
          cancel('Role revoke cancelled')
          return
        }

        role = roleChoice.toString()
      }

      const confirmRevoke = await confirm({
        message: `Revoke ${role} role from ${userAddress}?`
      })

      if (isCancel(confirmRevoke) || !confirmRevoke) {
        cancel('Role revoke cancelled')
        return
      }

      const s = spinner()
      s.start('Revoking role on blockchain...')

      try {
        const signature = await safeClient.governance.revokeRole({
          user: address(userAddress),
          role,
          revoker: wallet.address,
          signer: toSDKSigner(wallet)
        })

        if (!signature) {
          throw new Error('Failed to get transaction signature')
        }

        s.stop('Role revoked successfully!')

        const explorerUrl = getExplorerUrl(signature, 'devnet')

        outro(
          `${chalk.red('Role Revoked!')}\n\n` +
          `${chalk.gray('User:')} ${userAddress}\n` +
          `${chalk.gray('Role:')} ${role.toUpperCase()}\n` +
          `${chalk.gray('Explorer:')} ${explorerUrl}`
        )

      } catch (error) {
        s.stop('Failed to revoke role')
        handleError(error)
      }

    } catch (error) {
      log.error(`Failed to revoke role: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  })
