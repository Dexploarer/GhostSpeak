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
import { initializeClient, getExplorerUrl, handleTransactionError, toSDKSigner } from '../utils/client.js'
import { createSafeSDKClient } from '../utils/sdk-helpers.js'
import { address } from '@solana/addresses'

// Clean type definitions
interface FileDisputeOptions {
  workOrder?: string
  reason?: string
}

interface ListDisputeOptions {
  asArbitrator?: boolean
  mine?: boolean
  status?: string
}

interface EvidenceOptions {
  dispute?: string
}

interface ResolveOptions {
  dispute?: string
  decision?: string
  reason?: string
}

interface EscalateOptions {
  dispute?: string
  reason?: string
}

export const disputeCommand = new Command('dispute')
  .description('Manage disputes and conflict resolution')

// File dispute subcommand
disputeCommand
  .command('file')
  .description('File a new dispute')
  .option('-w, --work-order <address>', 'Work order address')
  .option('-r, --reason <reason>', 'Dispute reason')
  .action(async (options: FileDisputeOptions) => {
    intro(chalk.cyan('⚖️ File Dispute'))

    try {
      const s = spinner()
      s.start('Connecting to network...')
      
      const { client, wallet } = await initializeClient('devnet')
      const safeClient = createSafeSDKClient(client)
      
      s.stop('✅ Connected to devnet')

      // Get work order address
      let workOrderAddress = options.workOrder
      if (!workOrderAddress) {
        // List user's work orders for selection
        s.start('Loading your work orders...')
        const workOrders = await safeClient.escrow.getEscrowsForUser(wallet.address)
        s.stop(`✅ Found ${workOrders.length} work orders`)

        if (workOrders.length === 0) {
          cancel('No work orders found. You need an active work order to file a dispute.')
          return
        }

        const workOrderChoice = await select({
          message: 'Select work order to dispute:',
          options: workOrders.map(order => ({
            value: order.address,
            label: `${order.title} - ${(Number(order.paymentAmount) / 1_000_000_000).toFixed(3)} SOL`,
            hint: `Status: ${order.status}`
          }))
        })

        if (isCancel(workOrderChoice)) {
          cancel('Dispute filing cancelled')
          return
        }

        workOrderAddress = workOrderChoice.toString()
      }

      // Get dispute reason
      let reason = options.reason
      if (!reason) {
        const reasonChoice = await select({
          message: 'Select dispute reason:',
          options: [
            { value: 'non_delivery', label: 'Service not delivered', hint: 'Provider failed to deliver service' },
            { value: 'poor_quality', label: 'Poor service quality', hint: 'Service quality below expectations' },
            { value: 'non_payment', label: 'Payment not received', hint: 'Client has not paid for completed service' },
            { value: 'scope_change', label: 'Scope change dispute', hint: 'Disagreement about service scope' },
            { value: 'other', label: 'Other reason', hint: 'Custom dispute reason' }
          ]
        })

        if (isCancel(reasonChoice)) {
          cancel('Dispute filing cancelled')
          return
        }

        reason = reasonChoice.toString()

        if (reason === 'other') {
          const customReason = await text({
            message: 'Describe the dispute:',
            placeholder: 'Explain the issue in detail...',
            validate: (value) => {
              if (!value || value.trim().length < 10) {
                return 'Please provide at least 10 characters describing the dispute'
              }
              if (value.length > 500) {
                return 'Description must be less than 500 characters'
              }
            }
          })

          if (isCancel(customReason)) {
            cancel('Dispute filing cancelled')
            return
          }

          reason = customReason.toString()
        }
      }

      // Get additional details
      const description = await text({
        message: 'Additional details (optional):',
        placeholder: 'Provide any additional context...'
      })

      if (isCancel(description)) {
        cancel('Dispute filing cancelled')
        return
      }

      // Show dispute preview
      note(
        `${chalk.bold('Dispute Details:')}\n` +
        `${chalk.gray('Work Order:')} ${workOrderAddress}\n` +
        `${chalk.gray('Reason:')} ${reason}\n` +
        `${chalk.gray('Description:')} ${description || 'None provided'}\n` +
        `${chalk.gray('Filing Fee:')} 0.01 SOL (refunded if dispute is upheld)`,
        'Review Dispute'
      )

      const confirmFile = await confirm({
        message: 'File this dispute?'
      })

      if (isCancel(confirmFile) || !confirmFile) {
        cancel('Dispute filing cancelled')
        return
      }

      s.start('Filing dispute on blockchain...')

      try {
        // Note: PDA derivation commented out as it's not used in current SDK call
        // const { getProgramDerivedAddress, getBytesEncoder, getAddressEncoder } = await import('@solana/kit')
        // const [_disputePda] = await getProgramDerivedAddress({
        //   programAddress: client.config.programId!,
        //   seeds: [
        //     getBytesEncoder().encode(new TextEncoder().encode('dispute')),
        //     getAddressEncoder().encode(address(workOrderAddress))
        //   ]
        // })

        const signature = await safeClient.dispute.fileDispute(
          toSDKSigner(wallet),
          {
            escrowAddress: address(workOrderAddress),
            reason,
            severity: 'medium',
            description: description || ''
          }
        )

        if (!signature) {
          throw new Error('Failed to get transaction signature')
        }

        s.stop('✅ Dispute filed successfully!')

        const explorerUrl = getExplorerUrl(signature, 'devnet')
        
        outro(
          `${chalk.green('⚖️ Dispute Filed Successfully!')}\n\n` +
          `${chalk.bold('Dispute Details:')}\n` +
          `${chalk.gray('Work Order:')} ${workOrderAddress}\n` +
          `${chalk.gray('Reason:')} ${reason}\n` +
          `${chalk.gray('Status:')} Open\n\n` +
          `${chalk.bold('Transaction:')}\n` +
          `${chalk.gray('Signature:')} ${signature}\n` +
          `${chalk.gray('Explorer:')} ${explorerUrl}\n\n` +
          `${chalk.yellow('Next Steps:')}\n` +
          `• Submit evidence: ${chalk.cyan('gs dispute evidence')}\n` +
          `• Check status: ${chalk.cyan('gs dispute list --mine')}`
        )

      } catch {
        s.stop('❌ Failed to file dispute')
        handleTransactionError(_error as Error)
      }

    } catch (_error) {
      log.error(`Failed to file dispute: ${error instanceof Error ? _error.message : 'Unknown error'}`)
    }
  })

// List disputes subcommand
disputeCommand
  .command('list')
  .description('List disputes')
  .option('--as-arbitrator', 'Show disputes where you are the arbitrator')
  .option('--mine', 'Show only your disputes')
  .option('-s, --status <status>', 'Filter by status (open, resolved, escalated)')
  .action(async (options: ListDisputeOptions) => {
    intro(chalk.cyan('📋 Dispute List'))

    try {
      const s = spinner()
      s.start('Loading disputes...')
      
      const { client, wallet: _wallet } = await initializeClient('devnet')
      const safeClient = createSafeSDKClient(client)

      let disputes = []
      
      if (options.mine || options.asArbitrator) {
        // Note: SDK doesn't support filtering by participant/arbitrator, so we get all and filter later
        disputes = await safeClient.dispute.listDisputes({ status: options.status })
      } else {
        disputes = await safeClient.dispute.listDisputes({ status: options.status })
      }

      s.stop(`✅ Found ${disputes.length} disputes`)

      if (disputes.length === 0) {
        outro(
          `${chalk.yellow('No disputes found')}\n\n` +
          `${chalk.gray('• File a dispute:')} ${chalk.cyan('gs dispute file')}\n` +
          `${chalk.gray('• Check all disputes:')} ${chalk.cyan('gs dispute list')}`
        )
        return
      }

      // Display disputes
      log.info(`\n${chalk.bold('Disputes:')}\n`)
      
      disputes.forEach((dispute, index) => {
        const status = dispute.status.toLowerCase()
        const statusColor = status === 'open' ? chalk.yellow : 
                           status === 'resolved' ? chalk.green : 
                           status === 'escalated' ? chalk.red : chalk.gray

        const timeAgo = Math.floor((Date.now() - Number(dispute.createdAt) * 1000) / (1000 * 60 * 60 * 24))
        
        log.info(
          `${chalk.bold(`${index + 1}. Dispute`)}\n` +
          `   ${chalk.gray('Address:')} ${dispute.dispute.slice(0, 8)}...${dispute.dispute.slice(-8)}\n` +
          `   ${chalk.gray('Status:')} ${statusColor(status.toUpperCase())}\n` +
          `   ${chalk.gray('Claimant:')} ${dispute.claimant.slice(0, 8)}...${dispute.claimant.slice(-8)}\n` +
          `   ${chalk.gray('Respondent:')} ${dispute.respondent.slice(0, 8)}...${dispute.respondent.slice(-8)}\n` +
          `   ${chalk.gray('Evidence:')} ${dispute.evidenceCount} items\n` +
          `   ${chalk.gray('Created:')} ${timeAgo} days ago\n`
        )
      })

      outro(
        `${chalk.yellow('💡 Commands:')}\n` +
        `${chalk.cyan('gs dispute evidence')} - Submit evidence\n` +
        `${chalk.cyan('gs dispute resolve')} - Resolve dispute (arbitrators)\n` +
        `${chalk.cyan('gs dispute escalate')} - Escalate dispute`
      )

    } catch (_error) {
      log.error(`Failed to load disputes: ${error instanceof Error ? _error.message : 'Unknown error'}`)
    }
  })

// Submit evidence subcommand
disputeCommand
  .command('evidence')
  .description('Submit evidence for a dispute')
  .option('-d, --dispute <address>', 'Dispute address')
  .action(async (options: EvidenceOptions) => {
    intro(chalk.cyan('📋 Submit Evidence'))

    try {
      const s = spinner()
      s.start('Loading your disputes...')
      
      const { client, wallet } = await initializeClient('devnet')
      const safeClient = createSafeSDKClient(client)

      // Get user's disputes (SDK doesn't support participant filter, so we get all)
      const disputes = await safeClient.dispute.listDisputes()
      const openDisputes = disputes.filter(d => d.status.toLowerCase() === 'open')
      
      s.stop(`✅ Found ${openDisputes.length} open disputes`)

      if (openDisputes.length === 0) {
        outro('No open disputes found where you can submit evidence')
        return
      }

      // Select dispute
      let selectedDispute = options.dispute
      if (!selectedDispute) {
        const disputeChoice = await select({
          message: 'Select dispute to submit evidence for:',
          options: openDisputes.map(dispute => ({
            value: dispute.dispute,
            label: `Dispute ${dispute.dispute.slice(0, 8)}...`,
            hint: `${dispute.evidenceCount} evidence items, created ${Math.floor((Date.now() - Number(dispute.createdAt) * 1000) / (1000 * 60 * 60 * 24))} days ago`
          }))
        })

        if (isCancel(disputeChoice)) {
          cancel('Evidence submission cancelled')
          return
        }

        selectedDispute = disputeChoice.toString()
      }

      // Get evidence type
      const evidenceType = await select({
        message: 'Type of evidence:',
        options: [
          { value: 'text', label: 'Text Description', hint: 'Written explanation or statement' },
          { value: 'link', label: 'External Link', hint: 'Link to documentation or proof' },
          { value: 'hash', label: 'File Hash', hint: 'Hash of uploaded file' }
        ]
      })

      if (isCancel(evidenceType)) {
        cancel('Evidence submission cancelled')
        return
      }

      // Get evidence content
      let evidenceContent = ''
      if (evidenceType === 'text') {
        const textEvidence = await text({
          message: 'Describe your evidence:',
          placeholder: 'Provide detailed explanation...',
          validate: (value) => {
            if (!value || value.trim().length < 10) {
              return 'Please provide at least 10 characters'
            }
            if (value.length > 1000) {
              return 'Evidence must be less than 1000 characters'
            }
          }
        })

        if (isCancel(textEvidence)) {
          cancel('Evidence submission cancelled')
          return
        }

        evidenceContent = textEvidence.toString()
      } else if (evidenceType === 'link') {
        const linkEvidence = await text({
          message: 'Enter link to evidence:',
          placeholder: 'https://...',
          validate: (value) => {
            if (!value) {
              return 'Please provide a URL'
            }
            if (!value.startsWith('http')) {
              return 'Please provide a valid URL starting with http:// or https://'
            }
          }
        })

        if (isCancel(linkEvidence)) {
          cancel('Evidence submission cancelled')
          return
        }

        evidenceContent = linkEvidence.toString()
      } else {
        const hashEvidence = await text({
          message: 'Enter file hash:',
          placeholder: 'SHA256 hash of your evidence file',
          validate: (value) => {
            if (!value || value.length !== 64) {
              return 'Please provide a valid 64-character SHA256 hash'
            }
          }
        })

        if (isCancel(hashEvidence)) {
          cancel('Evidence submission cancelled')
          return
        }

        evidenceContent = hashEvidence.toString()
      }

      // Show evidence preview
      note(
        `${chalk.bold('Evidence Details:')}\n` +
        `${chalk.gray('Dispute:')} ${selectedDispute}\n` +
        `${chalk.gray('Type:')} ${evidenceType}\n` +
        `${chalk.gray('Content:')} ${evidenceContent.length > 100 ? evidenceContent.slice(0, 100) + '...' : evidenceContent}`,
        'Evidence Preview'
      )

      const confirmSubmit = await confirm({
        message: 'Submit this evidence?'
      })

      if (isCancel(confirmSubmit) || !confirmSubmit) {
        cancel('Evidence submission cancelled')
        return
      }

      s.start('Submitting evidence to blockchain...')

      try {
        const signature = await safeClient.dispute.submitEvidence(
          toSDKSigner(wallet),
          {
            disputeAddress: address(selectedDispute),
            evidenceType,
            evidenceData: evidenceContent,
            description: `Evidence submitted via CLI on ${new Date().toISOString()}`
          }
        )

        if (!signature) {
          throw new Error('Failed to get transaction signature')
        }

        s.stop('✅ Evidence submitted successfully!')

        const explorerUrl = getExplorerUrl(signature, 'devnet')
        
        outro(
          `${chalk.green('📋 Evidence Submitted!')}\n\n` +
          `${chalk.bold('Evidence Details:')}\n` +
          `${chalk.gray('Dispute:')} ${selectedDispute}\n` +
          `${chalk.gray('Type:')} ${evidenceType}\n` +
          `${chalk.gray('Status:')} Submitted\n\n` +
          `${chalk.bold('Transaction:')}\n` +
          `${chalk.gray('Signature:')} ${signature}\n` +
          `${chalk.gray('Explorer:')} ${explorerUrl}`
        )

      } catch {
        s.stop('❌ Failed to submit evidence')
        handleTransactionError(_error as Error)
      }

    } catch (_error) {
      log.error(`Failed to submit evidence: ${error instanceof Error ? _error.message : 'Unknown error'}`)
    }
  })

// Resolve dispute subcommand (for arbitrators)
disputeCommand
  .command('resolve')
  .description('Resolve a dispute (arbitrators only)')
  .option('-d, --dispute <address>', 'Dispute address')
  .option('--decision <decision>', 'Resolution decision (favor_claimant, favor_respondent)')
  .option('-r, --reason <reason>', 'Resolution reason')
  .action(async (options: ResolveOptions) => {
    intro(chalk.cyan('⚖️ Resolve Dispute'))

    try {
      const s = spinner()
      s.start('Loading disputes for arbitration...')
      
      const { client, wallet } = await initializeClient('devnet')
      const safeClient = createSafeSDKClient(client)

      // Get disputes where user is arbitrator (SDK doesn't support arbitrator filter, so we get all)
      const disputes = await safeClient.dispute.listDisputes()
      const openDisputes = disputes.filter(d => d.status.toLowerCase() === 'open')
      
      s.stop(`✅ Found ${openDisputes.length} disputes for arbitration`)

      if (openDisputes.length === 0) {
        outro('No open disputes found where you are the arbitrator')
        return
      }

      // Select dispute
      let selectedDispute = options.dispute
      if (!selectedDispute) {
        const disputeChoice = await select({
          message: 'Select dispute to resolve:',
          options: openDisputes.map(dispute => ({
            value: dispute.dispute,
            label: `Dispute ${dispute.dispute.slice(0, 8)}...`,
            hint: `${dispute.evidenceCount} evidence items`
          }))
        })

        if (isCancel(disputeChoice)) {
          cancel('Dispute resolution cancelled')
          return
        }

        selectedDispute = disputeChoice.toString()
      }

      // Get evidence history first
      s.start('Loading evidence...')
      const evidence = await safeClient.dispute.getEvidenceHistory(address(selectedDispute))
      s.stop(`✅ Found ${evidence.length} evidence items`)

      // Show evidence summary
      if (evidence.length > 0) {
        log.info(`\n${chalk.bold('Evidence Summary:')}\n`)
        evidence.forEach((item, index) => {
          const validItem = item as unknown as { type?: string; content?: string } // Type assertion for SDK compatibility
          const typeStr = typeof validItem.type === 'string' ? validItem.type : 'Unknown'
          const contentStr = validItem.content ? String(validItem.content).slice(0, 100) : ''
          log.info(`${index + 1}. ${chalk.gray('Type:')} ${typeStr} ${chalk.gray('Content:')} ${contentStr}...`)
        })
        log.info('')
      }

      // Get decision
      let decision = options.decision
      if (!decision) {
        const decisionChoice = await select({
          message: 'What is your decision?',
          options: [
            { value: 'favor_claimant', label: 'Favor Claimant', hint: 'Rule in favor of the dispute filer' },
            { value: 'favor_respondent', label: 'Favor Respondent', hint: 'Rule in favor of the respondent' },
            { value: 'partial_refund', label: 'Partial Resolution', hint: 'Split the difference' }
          ]
        })

        if (isCancel(decisionChoice)) {
          cancel('Dispute resolution cancelled')
          return
        }

        decision = decisionChoice.toString()
      }

      // Get reasoning
      let reason = options.reason
      if (!reason) {
        const reasonInput = await text({
          message: 'Explain your decision:',
          placeholder: 'Based on the evidence provided...',
          validate: (value) => {
            if (!value || value.trim().length < 20) {
              return 'Please provide at least 20 characters explaining your decision'
            }
          }
        })

        if (isCancel(reasonInput)) {
          cancel('Dispute resolution cancelled')
          return
        }

        reason = reasonInput.toString()
      }

      // Show resolution preview
      note(
        `${chalk.bold('Resolution Details:')}\n` +
        `${chalk.gray('Dispute:')} ${selectedDispute}\n` +
        `${chalk.gray('Decision:')} ${decision.replace('_', ' ').toUpperCase()}\n` +
        `${chalk.gray('Reasoning:')} ${reason.slice(0, 100)}${reason.length > 100 ? '...' : ''}`,
        'Resolution Preview'
      )

      const confirmResolve = await confirm({
        message: 'Submit this resolution? (This action cannot be undone)'
      })

      if (isCancel(confirmResolve) || !confirmResolve) {
        cancel('Dispute resolution cancelled')
        return
      }

      s.start('Submitting resolution to blockchain...')

      try {
        const signature = await safeClient.dispute.resolveDispute(
          toSDKSigner(wallet),
          {
            dispute: address(selectedDispute),
            resolution: reason,
            rulingInFavorOfComplainant: decision === 'favor_claimant'
          }
        )

        if (!signature) {
          throw new Error('Failed to get transaction signature')
        }

        s.stop('✅ Dispute resolved successfully!')

        const explorerUrl = getExplorerUrl(signature, 'devnet')
        
        outro(
          `${chalk.green('⚖️ Dispute Resolved!')}\n\n` +
          `${chalk.bold('Resolution Details:')}\n` +
          `${chalk.gray('Dispute:')} ${selectedDispute}\n` +
          `${chalk.gray('Decision:')} ${decision.replace('_', ' ').toUpperCase()}\n` +
          `${chalk.gray('Status:')} Resolved\n\n` +
          `${chalk.bold('Transaction:')}\n` +
          `${chalk.gray('Signature:')} ${signature}\n` +
          `${chalk.gray('Explorer:')} ${explorerUrl}`
        )

      } catch {
        s.stop('❌ Failed to resolve dispute')
        handleTransactionError(_error as Error)
      }

    } catch (_error) {
      log.error(`Failed to resolve dispute: ${error instanceof Error ? _error.message : 'Unknown error'}`)
    }
  })

// Escalate dispute subcommand
disputeCommand
  .command('escalate')
  .description('Escalate dispute to higher authority')
  .option('-d, --dispute <address>', 'Dispute address')
  .option('-r, --reason <reason>', 'Escalation reason')
  .action(async (options: EscalateOptions) => {
    intro(chalk.cyan('🔺 Escalate Dispute'))

    try {
      const s = spinner()
      s.start('Loading your disputes...')
      
      const { client, wallet } = await initializeClient('devnet')
      const safeClient = createSafeSDKClient(client)

      // Get user's disputes that can be escalated (SDK doesn't support participant filter, so we get all)
      const disputes = await safeClient.dispute.listDisputes()
      const escalatableDisputes = disputes.filter(d => 
        d.status.toLowerCase() === 'open' || d.status.toLowerCase() === 'resolved'
      )
      
      s.stop(`✅ Found ${escalatableDisputes.length} disputes that can be escalated`)

      if (escalatableDisputes.length === 0) {
        outro('No disputes found that can be escalated')
        return
      }

      // Select dispute
      let selectedDispute = options.dispute
      if (!selectedDispute) {
        const disputeChoice = await select({
          message: 'Select dispute to escalate:',
          options: escalatableDisputes.map(dispute => ({
            value: dispute.dispute,
            label: `Dispute ${dispute.dispute.slice(0, 8)}... (${dispute.status})`,
            hint: `${dispute.evidenceCount} evidence items`
          }))
        })

        if (isCancel(disputeChoice)) {
          cancel('Dispute escalation cancelled')
          return
        }

        selectedDispute = disputeChoice.toString()
      }

      // Get escalation reason
      let reason = options.reason
      if (!reason) {
        const reasonChoice = await select({
          message: 'Reason for escalation:',
          options: [
            { value: 'bias', label: 'Arbitrator Bias', hint: 'Suspect arbitrator bias or conflict of interest' },
            { value: 'incorrect', label: 'Incorrect Decision', hint: 'Believe the decision was factually incorrect' },
            { value: 'new_evidence', label: 'New Evidence', hint: 'New evidence has become available' },
            { value: 'procedural', label: 'Procedural Error', hint: 'Process was not followed correctly' },
            { value: 'other', label: 'Other Reason', hint: 'Custom escalation reason' }
          ]
        })

        if (isCancel(reasonChoice)) {
          cancel('Dispute escalation cancelled')
          return
        }

        reason = reasonChoice.toString()

        if (reason === 'other') {
          const customReason = await text({
            message: 'Explain why you are escalating:',
            placeholder: 'Provide detailed explanation...',
            validate: (value) => {
              if (!value || value.trim().length < 20) {
                return 'Please provide at least 20 characters explaining the escalation'
              }
            }
          })

          if (isCancel(customReason)) {
            cancel('Dispute escalation cancelled')
            return
          }

          reason = customReason.toString()
        }
      }

      // Show escalation preview
      note(
        `${chalk.bold('Escalation Details:')}\n` +
        `${chalk.gray('Dispute:')} ${selectedDispute}\n` +
        `${chalk.gray('Reason:')} ${reason}\n` +
        `${chalk.gray('Fee:')} 0.05 SOL (refunded if escalation is justified)\n` +
        `${chalk.gray('Authority:')} Higher-tier arbitrator panel`,
        'Escalation Preview'
      )

      const confirmEscalate = await confirm({
        message: 'Escalate this dispute?'
      })

      if (isCancel(confirmEscalate) || !confirmEscalate) {
        cancel('Dispute escalation cancelled')
        return
      }

      s.start('Escalating dispute on blockchain...')

      try {
        const signature = await safeClient.dispute.escalateDispute(
          toSDKSigner(wallet),
          address(selectedDispute),
          reason
        )

        if (!signature) {
          throw new Error('Failed to get transaction signature')
        }

        s.stop('✅ Dispute escalated successfully!')

        const explorerUrl = getExplorerUrl(signature, 'devnet')
        
        outro(
          `${chalk.green('🔺 Dispute Escalated!')}\n\n` +
          `${chalk.bold('Escalation Details:')}\n` +
          `${chalk.gray('Dispute:')} ${selectedDispute}\n` +
          `${chalk.gray('Reason:')} ${reason}\n` +
          `${chalk.gray('Status:')} Escalated\n\n` +
          `${chalk.bold('Transaction:')}\n` +
          `${chalk.gray('Signature:')} ${signature}\n` +
          `${chalk.gray('Explorer:')} ${explorerUrl}\n\n` +
          `${chalk.yellow('Next Steps:')}\n` +
          `• Higher-tier arbitrators will review the case\n` +
          `• You will be notified of the final decision\n` +
          `• Check status: ${chalk.cyan('gs dispute list --mine')}`
        )

      } catch {
        s.stop('❌ Failed to escalate dispute')
        handleTransactionError(_error as Error)
      }

    } catch (_error) {
      log.error(`Failed to escalate dispute: ${error instanceof Error ? _error.message : 'Unknown error'}`)
    }
  })