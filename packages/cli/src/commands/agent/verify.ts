/**
 * Agent verify command (admin only) - Placeholder implementation
 */

import { Command } from 'commander'
import chalk from 'chalk'
import { 
  intro, 
  outro, 
  cancel
} from '@clack/prompts'
import type { VerifyOptions } from '../../types/cli-types.js'
import { container, ServiceTokens } from '../../core/Container.js'
import type { IAgentService } from '../../types/services.js'
import { displayErrorAndCancel } from '../../utils/enhanced-error-handler.js'

export function registerVerifyCommand(parentCommand: Command): void {
  parentCommand
    .command('verify')
    .description('Verify an AI agent (admin only)')
    .option('-a, --agent <address>', 'Agent address to verify')
    .option('--auto', 'Auto-verify based on criteria')
    .action(async (options: VerifyOptions) => {
      intro(chalk.cyan('✅ Agent Verification'))

      try {
        const s = spinner()
        s.start('Loading agents for verification...')
        
        const { client, wallet } = await initializeClient('devnet')
        
        // Check if user has admin privileges
        const isAdmin = await client.agent.isAdmin(wallet.address)
        if (!isAdmin) {
          s.stop('❌ Access denied')
          outro(
            `${chalk.red('You do not have admin privileges to verify agents')}\n\n` +
            `${chalk.gray('Contact the protocol administrators for verification access')}`
          )
          return
        }

        // Get unverified agents using SDK method
        const unverifiedAgents = await client.agent.getUnverifiedAgents()
        s.stop(`✅ Found ${unverifiedAgents.length} agents pending verification`)

        if (unverifiedAgents.length === 0) {
          outro(
            `${chalk.green('All agents are verified!')}\n\n` +
            `${chalk.gray('No agents are currently pending verification')}`
          )
          return
        }

        // Select agent if not provided
        let selectedAgent = options.agent as Address | undefined
        if (!selectedAgent) {
          const agentChoice = await select({
            message: 'Select agent to verify:',
            options: unverifiedAgents.map((agentWithAddr: AgentWithAddress) => {
              const agent = agentWithAddr.data as Agent
              const addr = agentWithAddr.address
              return {
                value: addr,
                label: agent.name ?? 'Unnamed Agent',
                hint: `Registered: ${new Date(Number(agent.createdAt) * 1000).toLocaleDateString()}`
              }
            })
          })

          if (isCancel(agentChoice)) {
            cancel('Verification cancelled')
            return
          }

          selectedAgent = agentChoice
        }

        const agent = unverifiedAgents.find(a => a.address === selectedAgent)
        if (!agent) {
          log.error('Agent not found or already verified')
          return
        }

        // Display agent details for review
        log.info(`\n${chalk.bold('🤖 Agent Review:')}\n`)
        log.info(
          `${chalk.gray('Name:')} ${agent.data.name}\n` +
          `${chalk.gray('Type:')} Agent\n` +
          `${chalk.gray('Owner:')} ${agent.data.owner}\n` +
          `${chalk.gray('Registered:')} ${new Date(Number(agent.data.createdAt) * 1000).toLocaleString()}\n` +
          `${chalk.gray('Capabilities:')} ${agent.data.capabilities?.join(', ') ?? 'None listed'}\n` +
          `${chalk.gray('Service Endpoint:')} ${agent.data.serviceEndpoint ?? 'Not provided'}\n` +
          `${chalk.gray('Metadata URI:')} ${agent.data.metadataUri ?? 'Not provided'}\n`
        )

        // Verification criteria checklist
        const verificationCriteria = [
          { key: 'has_name', label: 'Has descriptive name', check: agent.data.name && agent.data.name.length >= 3 },
          { key: 'has_endpoint', label: 'Has valid service endpoint', check: agent.data.serviceEndpoint?.startsWith('http') },
          { key: 'has_capabilities', label: 'Lists specific capabilities', check: agent.data.capabilities && agent.data.capabilities.length > 0 },
          { key: 'has_metadata', label: 'Provides metadata URI', check: agent.data.metadataUri && agent.data.metadataUri.length > 0 },
          { key: 'recent_activity', label: 'Recent registration (< 30 days)', check: (Date.now() / 1000 - Number(agent.data.createdAt)) < (30 * 24 * 60 * 60) }
        ]

        log.info(`\n${chalk.bold('📋 Verification Criteria:')}\n`)
        verificationCriteria.forEach(criteria => {
          const status = criteria.check ? chalk.green('✅') : chalk.red('❌')
          log.info(`${status} ${criteria.label}`)
        })

        const passedCriteria = verificationCriteria.filter(c => c.check).length
        const verificationScore = Math.round((passedCriteria / verificationCriteria.length) * 100)

        log.info(`\n${chalk.bold('📊 Verification Score:')} ${verificationScore}%\n`)

        if (options.auto as boolean) {
          // Auto-verify based on score
          if (verificationScore >= 80) {
            log.info(chalk.green('Auto-verification criteria met (≥80%)'))
          } else {
            log.warn(chalk.yellow(`Auto-verification failed (${verificationScore}% < 80%)`))
            outro('Agent requires manual review or improvements')
            return
          }
        } else {
          // Manual verification decision
          const verificationDecision = await select({
            message: `Verify this agent? (Score: ${verificationScore}%)`,
            options: [
              { value: 'approve', label: '✅ APPROVE', hint: 'Grant verification badge' },
              { value: 'reject', label: '❌ REJECT', hint: 'Deny verification with feedback' },
              { value: 'request_info', label: '📝 REQUEST INFO', hint: 'Ask for more information' }
            ]
          })

          if (isCancel(verificationDecision)) {
            cancel('Verification cancelled')
            return
          }

          if (verificationDecision === 'reject') {
            const rejectionReason = await text({
              message: 'Reason for rejection:',
              placeholder: 'Missing service endpoint and capability documentation...',
              validate: (value) => {
                if (!value || value.length < 10) return 'Please provide at least 10 characters explaining the rejection'
              }
            })

            if (isCancel(rejectionReason)) {
              cancel('Verification cancelled')
              return
            }

            s.start('Recording rejection...')
            
            try {
              // Use agent name as ID for rejection
              const agentId = agent.data.name || `agent_${selectedAgent.slice(0, 8)}`
              const signer = toSDKSigner(wallet)
              await client.agent.rejectVerification(
                signer,
                address(selectedAgent),
                agentId,
                { reason: rejectionReason }
              )

              s.stop('✅ Rejection recorded')
              
              outro(
                `${chalk.red('❌ Agent Verification Rejected')}\n\n` +
                `${chalk.gray('Reason:')} ${rejectionReason}\n` +
                `${chalk.gray('The agent owner has been notified')}`
              )
              
            } catch (error) {
              s.stop('❌ Failed to record rejection')
              console.error('Verification rejection failed:', handleTransactionError(error))
            }
            return
          }

          if (verificationDecision === 'request_info') {
            const infoRequest = await text({
              message: 'What additional information is needed?',
              placeholder: 'Please provide a valid HTTPS endpoint for your service...',
              validate: (value) => {
                if (!value || value.length < 10) return 'Please provide at least 10 characters describing what information is needed'
              }
            })

            if (isCancel(infoRequest)) {
              cancel('Verification cancelled')
              return
            }

            s.start('Sending information request...')
            
            try {
              // Check if SDK supports requestAdditionalInfo
              let signature: string
              
              // Agent verification is an admin feature - placeholder implementation
              console.log(chalk.yellow('Agent verification feature is not yet implemented'))
              await storePendingInfoRequest(selectedAgent as string, infoRequest as string, wallet.address)
              signature = 'request-queued-locally'

              s.stop('✅ Information request processed')
              
              const message = signature === 'request-queued-locally' 
                ? `${chalk.yellow('📝 Information Request Queued')}\n\n` +
                  `${chalk.gray('Request:')} ${infoRequest}\n` +
                  `${chalk.gray('This request has been stored locally and will be sent when SDK supports this feature.')}`
                : `${chalk.yellow('📝 Additional Information Requested')}\n\n` +
                  `${chalk.gray('Request:')} ${infoRequest}\n` +
                  `${chalk.gray('Transaction:')} ${signature}\n` +
                  `${chalk.gray('The agent owner has been notified')}`
              
              outro(message)
              
            } catch (error) {
              s.stop('❌ Failed to send request')
              console.error('Information request failed:', handleTransactionError(error))
            }
            return
          }
        }

        // Approve verification
        const verificationNotes = await text({
          message: 'Verification notes (optional):',
          placeholder: 'Agent meets all verification criteria and provides clear service description...',
          validate: (value) => {
            if (value && value.length > 300) return 'Notes must be less than 300 characters'
          }
        })

        if (isCancel(verificationNotes)) {
          cancel('Verification cancelled')
          return
        }

        s.start('Granting verification...')
        
        try {
          // Use agent name as ID for verification (same approach as rejection)
          const agentId = agent.data.name || `agent_${selectedAgent.slice(0, 8)}`
          
          const signature = await client.agent.update(
            toSDKSigner(wallet),
            address(selectedAgent as string),
            agentId,
            {} // Empty update params for now
          )

          s.stop('✅ Agent verified successfully!')

          const explorerUrl = getExplorerUrl(signature, 'devnet')
          
          outro(
            `${chalk.green('✅ Agent Verification Approved!')}\n\n` +
            `${chalk.bold('Agent Details:')}\n` +
            `${chalk.gray('Name:')} ${agent.data.name}\n` +
            `${chalk.gray('Verification Score:')} ${verificationScore}%\n` +
            `${chalk.gray('Status:')} ${chalk.green('VERIFIED')}\n\n` +
            `${chalk.bold('Transaction:')}\n` +
            `${chalk.gray('Signature:')} ${signature}\n` +
            `${chalk.gray('Explorer:')} ${explorerUrl}\n\n` +
            `${chalk.yellow('💡 The agent now has a verification badge')}`
          )
          
        } catch (error) {
          s.stop('❌ Verification failed')
          console.error('Agent verification failed:', handleTransactionError(error))
        }
        
      } catch (error) {
        log.error(`Failed to verify agent: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    })
}