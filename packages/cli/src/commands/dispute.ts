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
import { address } from '@solana/addresses'
import type { DisputeSummary } from '@ghostspeak/sdk'
import { DisputeStatus } from '@ghostspeak/sdk'

// Define basic work order interface for type safety
interface WorkOrder {
  client: { toString: () => string }
  provider: { toString: () => string }
  address?: string
  orderId?: string
  title?: string
  paymentAmount?: bigint | number
}

import type {
  FileDisputeOptions
} from '../types/cli-types.js'

export const disputeCommand = new Command('dispute')
  .description('Manage disputes and conflict resolution')

// File dispute subcommand
disputeCommand
  .command('file')
  .description('File a new dispute')
  .option('-w, --work-order <address>', 'Work order address')
  .option('-r, --reason <reason>', 'Dispute reason')
  .action(async (_options: FileDisputeOptions) => {
    intro(chalk.cyan('⚖️ File Dispute'))

    try {
      // Get work order if not provided
      let workOrderAddress = _options.workOrder
      if (!workOrderAddress) {
        const s = spinner()
        s.start('Loading your work orders...')
        
        const { client, wallet } = await initializeClient('devnet')
        
        const workOrders = await client.escrow.getEscrowsForUser(wallet.address) as WorkOrder[]
        s.stop(`✅ Found ${workOrders.length} work orders`)

        if (workOrders.length === 0) {
          outro(
            `${chalk.yellow('No work orders found')}\n\n` +
            `${chalk.gray('You need active work orders to file disputes')}`
          )
          return
        }

        const workOrderChoice = await select({
          message: 'Select work order to dispute:',
          options: workOrders.map((order) => ({
            value: order.address?.toString() ?? order.orderId?.toString() ?? 'unknown',
            label: order.title ?? 'Untitled Work Order',
            hint: `${(Number(order.paymentAmount ?? 0) / 1_000_000_000).toFixed(3)} SOL`
          }))
        })

        if (isCancel(workOrderChoice)) {
          cancel('Dispute filing cancelled')
          return
        }

        workOrderAddress = workOrderChoice
      }

      const disputeReason = _options.reason ?? await select({
        message: 'Select dispute reason:',
        options: [
          { value: 'quality', label: '🎯 Quality Issues', hint: 'Work quality below expectations' },
          { value: 'delivery', label: '📅 Delivery Issues', hint: 'Late or non-delivery' },
          { value: 'scope', label: '📋 Scope Disagreement', hint: 'Work scope misalignment' },
          { value: 'communication', label: '💬 Communication Issues', hint: 'Poor communication' },
          { value: 'payment', label: '💰 Payment Dispute', hint: 'Payment-related issues' },
          { value: 'breach', label: '⚠️ Contract Breach', hint: 'Terms of service violation' },
          { value: 'other', label: '📝 Other', hint: 'Custom dispute reason' }
        ]
      })

      if (isCancel(disputeReason)) {
        cancel('Dispute filing cancelled')
        return
      }

      const disputeDescription = await text({
        message: 'Describe the dispute in detail:',
        placeholder: 'Please provide specific details about the issue, including what was expected vs what was delivered...',
        validate: (value) => {
          if (!value || value.trim().length < 20) return 'Please provide at least 20 characters describing the dispute'
          if (value.length > 2000) return 'Description must be less than 2000 characters'
        }
      })

      if (isCancel(disputeDescription)) {
        cancel('Dispute filing cancelled')
        return
      }

      // Evidence collection
      const hasEvidence = await confirm({
        message: 'Do you have evidence to support your dispute (links, screenshots, documents)?'
      })

      if (isCancel(hasEvidence)) {
        cancel('Dispute filing cancelled')
        return
      }

      let evidenceList = []
      if (hasEvidence) {
        let addingEvidence = true
        while (addingEvidence) {
          const evidenceItem = await text({
            message: `Evidence item ${evidenceList.length + 1} (URL or description):`,
            placeholder: 'https://example.com/screenshot.png or "Email conversation on 2025-01-15"',
            validate: (value) => {
              if (!value || value.trim().length < 10) return 'Please provide at least 10 characters'
              if (value.length > 500) return 'Evidence description must be less than 500 characters'
            }
          })

          if (isCancel(evidenceItem)) {
            break
          }

          evidenceList.push(evidenceItem)

          const addMore = await confirm({
            message: 'Add another piece of evidence?'
          })

          if (isCancel(addMore) || !addMore) {
            addingEvidence = false
          }
        }
      }

      // Severity assessment
      const disputeSeverity = await select({
        message: 'Rate the severity of this dispute:',
        options: [
          { value: 'low', label: '🟢 Low Severity', hint: 'Minor issues, easy resolution' },
          { value: 'medium', label: '🟡 Medium Severity', hint: 'Significant issues requiring attention' },
          { value: 'high', label: '🟠 High Severity', hint: 'Major issues affecting project outcome' },
          { value: 'critical', label: '🔴 Critical Severity', hint: 'Severe breach, immediate action needed' }
        ]
      })

      if (isCancel(disputeSeverity)) {
        cancel('Dispute filing cancelled')
        return
      }

      // Preferred resolution
      const preferredResolution = await select({
        message: 'What resolution are you seeking?',
        options: [
          { value: 'revision', label: '🔄 Work Revision', hint: 'Request improvements to the work' },
          { value: 'partial_refund', label: '💰 Partial Refund', hint: 'Partial payment refund' },
          { value: 'full_refund', label: '💸 Full Refund', hint: 'Complete payment refund' },
          { value: 'deadline_extension', label: '⏰ Deadline Extension', hint: 'More time for completion' },
          { value: 'renegotiation', label: '📋 Scope Renegotiation', hint: 'Adjust work requirements' },
          { value: 'mediation', label: '⚖️ Third-party Mediation', hint: 'External dispute resolution' }
        ]
      })

      if (isCancel(preferredResolution)) {
        cancel('Dispute filing cancelled')
        return
      }

      // Preview dispute
      note(
        `${chalk.bold('Dispute Preview:')}\n` +
        `${chalk.gray('Work Order:')} ${workOrderAddress}\n` +
        `${chalk.gray('Reason:')} ${disputeReason}\n` +
        `${chalk.gray('Severity:')} ${disputeSeverity.toUpperCase()}\n` +
        `${chalk.gray('Evidence Items:')} ${evidenceList.length}\n` +
        `${chalk.gray('Preferred Resolution:')} ${preferredResolution}\n` +
        `${chalk.gray('Description:')} ${disputeDescription.substring(0, 100)}${disputeDescription.length > 100 ? '...' : ''}`,
        'Dispute Details'
      )

      const confirmFile = await confirm({
        message: 'File this dispute? (This action cannot be undone)'
      })

      if (isCancel(confirmFile) || !confirmFile) {
        cancel('Dispute filing cancelled')
        return
      }

      const s = spinner()
      s.start('Filing dispute on blockchain...')
      
      const { client, wallet } = await initializeClient('devnet')
      
      try {
        // Get work order details to find the respondent
        let workOrder
        try {
          workOrder = await client.escrow.getWorkOrder(address(workOrderAddress))
        } catch (error) {
          throw new Error(`Failed to fetch work order: ${error instanceof Error ? error.message : 'Unknown error'}`)
        }
        
        if (!workOrder) {
          throw new Error('Work order not found')
        }
        
        // Determine respondent based on who is filing the dispute
        const typedWorkOrder = workOrder as WorkOrder
        const respondent = typedWorkOrder.client.toString() === wallet.address.toString() 
          ? typedWorkOrder.provider  // If client is filing, respondent is provider
          : typedWorkOrder.client    // If provider is filing, respondent is client
        
        const disputeParams = {
          transaction: address(workOrderAddress),
          respondent: respondent,
          reason: `${disputeReason}: ${disputeDescription}`
        }

        // Generate dispute PDA
        const { getProgramDerivedAddress, getBytesEncoder, getAddressEncoder } = await import('@solana/kit')
        const [disputePda] = await getProgramDerivedAddress({
          programAddress: client.config.programId!,
          seeds: [
            getBytesEncoder().encode(new Uint8Array([100, 105, 115, 112, 117, 116, 101])), // 'dispute'
            getAddressEncoder().encode(wallet.address)
          ]
        })
        
        const signature = await client.dispute.fileDispute(
          wallet,
          disputePda,
          disputeParams
        )

        s.stop('✅ Dispute filed successfully!')

        const explorerUrl = getExplorerUrl(signature, 'devnet')
        
        // Store evidence separately if provided
        if (evidenceList.length > 0) {
          s.start('Submitting evidence...')
          
          try {
            for (const evidence of evidenceList) {
              await client.dispute.submitEvidence(
                wallet,
                {
                  dispute: disputePda,
                  evidenceType: 'document',
                  evidenceData: evidence
                }
              )
            }
            s.stop('✅ Evidence submitted!')
          } catch (evidenceError) {
            // Acknowledge error for future error handling enhancement
            void evidenceError
            s.stop('⚠️ Evidence submission partially failed')
            log.warn('Some evidence items may not have been submitted properly')
          }
        }

        outro(
          `${chalk.green('⚖️ Dispute Filed Successfully!')}\n\n` +
          `${chalk.bold('Dispute Details:')}\n` +
          `${chalk.gray('Reason:')} ${disputeReason}\n` +
          `${chalk.gray('Severity:')} ${disputeSeverity.toUpperCase()}\n` +
          `${chalk.gray('Evidence Items:')} ${evidenceList.length}\n` +
          `${chalk.gray('Status:')} ${chalk.yellow('Under Review')}\n\n` +
          `${chalk.bold('Transaction:')}\n` +
          `${chalk.gray('Signature:')} ${signature}\n` +
          `${chalk.gray('Explorer:')} ${explorerUrl}\n\n` +
          `${chalk.yellow('💡 Next Steps:')}\n` +
          `• The other party will be notified\n` +
          `• You can add more evidence with ${chalk.cyan('npx ghostspeak dispute evidence')}\n` +
          `• Monitor progress with ${chalk.cyan('npx ghostspeak dispute list')}`
        )
        
      } catch (error) {
        s.stop('❌ Dispute filing failed')
        await handleTransactionError(error as Error)
      }
      
    } catch (error) {
      log.error(`Failed to file dispute: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  })

// List disputes subcommand
disputeCommand
  .command('list')
  .description('List disputes')
  .option('-s, --status <status>', 'Filter by status (pending, under_review, resolved, escalated)')
  .option('--mine', 'Show only disputes where I am involved')
  .option('--as-arbitrator', 'Show disputes I can arbitrate')
  .action(async (_options: { asArbitrator?: boolean; mine?: boolean; status?: string }) => {
    intro(chalk.cyan('📋 Dispute List'))

    try {
      const s = spinner()
      s.start('Loading disputes...')
      
      const { client, wallet } = await initializeClient('devnet')
      
      let disputes: DisputeSummary[]
      if (_options.asArbitrator) {
        // Use listDisputes with moderator filter
        disputes = await client.dispute.getActiveDisputes(wallet.address)
      } else if (_options.mine) {
        // Use listDisputes without filter and filter client-side by user involvement
        const allDisputes = await client.dispute.listDisputes()
        disputes = allDisputes.filter((d: DisputeSummary) => 
          d.claimant === wallet.address.toString() || d.respondent === wallet.address.toString()
        )
      } else {
        disputes = await client.dispute.listDisputes({
          status: _options.status ? DisputeStatus[_options.status as keyof typeof DisputeStatus] : undefined
        })
      }

      s.stop(`✅ Found ${disputes.length} disputes`)

      if (disputes.length === 0) {
        outro(
          `${chalk.yellow('No disputes found')}\n\n` +
          `${chalk.gray('Use')} ${chalk.cyan('npx ghostspeak dispute file')} ${chalk.gray('to file a dispute')}`
        )
        return
      }

      // Display disputes
      log.info(`\n${chalk.bold('Disputes:')}\n`)
      
      disputes.forEach((dispute, index) => {
        const statusColor = 
          dispute.status.toString() === 'resolved' ? chalk.green :
          dispute.status.toString() === 'escalated' ? chalk.red :
          dispute.status.toString() === 'under_review' ? chalk.yellow :
          chalk.blue

        const severityIcon =
          dispute.severity === 'critical' ? '🔴' :
          dispute.severity === 'high' ? '🟠' :
          dispute.severity === 'medium' ? '🟡' : '🟢'

        const timeElapsed = Math.floor((Date.now() / 1000) - Number(dispute.createdAt))
        const daysElapsed = Math.floor(timeElapsed / 86400)
        const hoursElapsed = Math.floor((timeElapsed % 86400) / 3600)

        log.info(
          `${chalk.bold(`${index + 1}. ${dispute.reason.toUpperCase()} DISPUTE`)} ${severityIcon}\n` +
          `   ${chalk.gray('Status:')} ${statusColor(dispute.status.toString().toUpperCase())}\n` +
          `   ${chalk.gray('Severity:')} ${dispute.severity ?? 'unknown'}\n` +
          `   ${chalk.gray('Filed:')} ${daysElapsed}d ${hoursElapsed}h ago\n` +
          `   ${chalk.gray('Evidence:')} ${dispute.evidenceCount} items\n` +
          `   ${chalk.gray('Work Order:')} ${dispute.workOrder ?? dispute.transaction ?? 'N/A'}\n` +
          `   ${chalk.gray('Description:')} ${dispute.description ? dispute.description.substring(0, 80) + (dispute.description.length > 80 ? '...' : '') : dispute.reason}\n`
        )
      })

      outro(
        `${chalk.yellow('💡 Commands:')}\n` +
        `${chalk.cyan('npx ghostspeak dispute evidence')} - Add evidence\n` +
        `${chalk.cyan('npx ghostspeak dispute resolve')} - Resolve disputes (arbitrators)\n` +
        `${chalk.cyan('npx ghostspeak dispute escalate')} - Escalate to human review`
      )
      
    } catch (error) {
      log.error(`Failed to load disputes: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  })

// Submit evidence subcommand
disputeCommand
  .command('evidence')
  .description('Submit additional evidence for a dispute')
  .option('-d, --dispute <id>', 'Dispute ID')
  .action(async (_options: { dispute?: string }) => {
    intro(chalk.cyan('📄 Submit Evidence'))

    try {
      const s = spinner()
      s.start('Loading your disputes...')
      
      const { client, wallet } = await initializeClient('devnet')
      
      // Get all disputes and filter by user involvement
      const allDisputes = await client.dispute.listDisputes()
      const disputes = allDisputes.filter((d: DisputeSummary) => 
        (d.claimant === wallet.address.toString()) || 
        (d.respondent === wallet.address.toString())
      )
      const activeDisputes = disputes.filter((d: DisputeSummary) => 
        d.status.toString() === 'pending' || 
        d.status.toString() === 'under_review' ||
        d.status.toString() === 'Filed' || 
        d.status.toString() === 'UnderReview'
      )
      
      s.stop(`✅ Found ${activeDisputes.length} active disputes`)

      if (activeDisputes.length === 0) {
        outro(
          `${chalk.yellow('No active disputes found')}\n\n` +
          `${chalk.gray('Evidence can only be added to pending or under-review disputes')}`
        )
        return
      }

      // Select dispute if not provided
      let selectedDispute = _options.dispute
      if (!selectedDispute) {
        const disputeChoice = await select({
          message: 'Select dispute to add evidence to:',
          options: activeDisputes.map((dispute: DisputeSummary) => ({
            value: dispute.id ?? dispute.dispute.toString(),
            label: `${dispute.reason.toUpperCase()} - ${dispute.severity ?? 'unknown'}`,
            hint: `${dispute.evidenceCount} evidence items`
          }))
        })

        if (isCancel(disputeChoice)) {
          cancel('Evidence submission cancelled')
          return
        }

        selectedDispute = disputeChoice
      }

      const dispute = activeDisputes.find((d: DisputeSummary) => 
        (d.id?.toString() === selectedDispute) || 
        d.dispute?.toString() === selectedDispute
      )
      if (!dispute) {
        log.error('Dispute not found or not accessible')
        return
      }

      // Evidence type selection
      const evidenceType = await select({
        message: 'Select evidence type:',
        options: [
          { value: 'document', label: '📄 Document/Link', hint: 'URL to document, screenshot, or file' },
          { value: 'communication', label: '💬 Communication Log', hint: 'Email, chat, or message thread' },
          { value: 'technical', label: '🔧 Technical Evidence', hint: 'Code, logs, or technical data' },
          { value: 'financial', label: '💰 Financial Evidence', hint: 'Invoices, payments, receipts' },
          { value: 'witness', label: '👥 Witness Statement', hint: 'Third-party testimony' },
          { value: 'multimedia', label: '🎥 Multimedia', hint: 'Video, audio, or image evidence' }
        ]
      })

      if (isCancel(evidenceType)) {
        cancel('Evidence submission cancelled')
        return
      }

      const evidenceData = await text({
        message: 'Enter evidence data (URL, description, or content):',
        placeholder: evidenceType === 'document' ? 'https://example.com/evidence.pdf' : 
                    evidenceType === 'communication' ? 'Email thread from john@example.com on 2025-01-15...' :
                    'Detailed evidence description...',
        validate: (value) => {
          if (!value || value.trim().length < 10) return 'Please provide at least 10 characters'
          if (value.length > 1000) return 'Evidence data must be less than 1000 characters'
        }
      })

      if (isCancel(evidenceData)) {
        cancel('Evidence submission cancelled')
        return
      }

      const evidenceDescription = await text({
        message: 'Brief description of this evidence:',
        placeholder: 'This evidence shows that the work was submitted 3 days late...',
        validate: (value) => {
          if (!value || value.trim().length < 10) return 'Please provide at least 10 characters'
          if (value.length > 200) return 'Description must be less than 200 characters'
        }
      })

      if (isCancel(evidenceDescription)) {
        cancel('Evidence submission cancelled')
        return
      }

      // Credibility verification
      const isVerified = await confirm({
        message: 'Do you swear that this evidence is authentic and unmodified?'
      })

      if (isCancel(isVerified) || !isVerified) {
        cancel('Evidence submission cancelled - authentication required')
        return
      }

      // Preview evidence
      note(
        `${chalk.bold('Evidence Preview:')}\n` +
        `${chalk.gray('Dispute:')} ${dispute.reason.toUpperCase()}\n` +
        `${chalk.gray('Type:')} ${evidenceType}\n` +
        `${chalk.gray('Description:')} ${evidenceDescription}\n` +
        `${chalk.gray('Data:')} ${evidenceData.substring(0, 100)}${evidenceData.length > 100 ? '...' : ''}\n` +
        `${chalk.gray('Verified:')} ${chalk.green('Yes')}`,
        'Evidence Details'
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
        const evidenceParams = {
          evidenceType,
          evidenceData,
          description: evidenceDescription,
          timestamp: BigInt(Math.floor(Date.now() / 1000)),
          isVerified: true
        }

        const signature = await client.dispute.submitEvidence(
          wallet,
          {
            dispute: address(selectedDispute),
            evidenceType: evidenceParams.evidenceType,
            evidenceData: evidenceParams.evidenceData
          }
        )

        s.stop('✅ Evidence submitted successfully!')

        const explorerUrl = getExplorerUrl(signature, 'devnet')
        
        outro(
          `${chalk.green('📄 Evidence Submitted!')}\n\n` +
          `${chalk.bold('Evidence Details:')}\n` +
          `${chalk.gray('Type:')} ${evidenceType}\n` +
          `${chalk.gray('Description:')} ${evidenceDescription}\n` +
          `${chalk.gray('Timestamp:')} ${new Date().toLocaleString()}\n\n` +
          `${chalk.bold('Transaction:')}\n` +
          `${chalk.gray('Signature:')} ${signature}\n` +
          `${chalk.gray('Explorer:')} ${explorerUrl}\n\n` +
          `${chalk.yellow('💡 The arbitrator has been notified of the new evidence')}`
        )
        
      } catch (error) {
        s.stop('❌ Evidence submission failed')
        await handleTransactionError(error as Error)
      }
      
    } catch (error) {
      log.error(`Failed to submit evidence: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  })

// Resolve dispute subcommand (for arbitrators)
disputeCommand
  .command('resolve')
  .description('Resolve a dispute (arbitrators only)')
  .option('-d, --dispute <id>', 'Dispute ID to resolve')
  .action(async (_options: { dispute?: string }) => {
    intro(chalk.cyan('⚖️ Resolve Dispute'))

    try {
      const s = spinner()
      s.start('Loading arbitration queue...')
      
      const { client, wallet } = await initializeClient('devnet')
      
      const disputes = await client.dispute.getActiveDisputes(wallet.address)
      const pendingDisputes = disputes.filter((d: DisputeSummary) => 
        d.status.toString() === 'under_review' || 
        d.status.toString() === 'UnderReview'
      )
      
      s.stop(`✅ Found ${pendingDisputes.length} disputes awaiting arbitration`)

      if (pendingDisputes.length === 0) {
        outro(
          `${chalk.yellow('No disputes in arbitration queue')}\n\n` +
          `${chalk.gray('Check back later or contact admin for arbitrator access')}`
        )
        return
      }

      // Select dispute if not provided
      let selectedDispute = _options.dispute
      if (!selectedDispute) {
        const disputeChoice = await select({
          message: 'Select dispute to resolve:',
          options: pendingDisputes.map((dispute: DisputeSummary) => {
            const timeElapsed = Math.floor((Date.now() / 1000) - Number(dispute.createdAt))
            const daysElapsed = Math.floor(timeElapsed / 86400)
            
            return {
              value: dispute.id ?? dispute.dispute.toString(),
              label: `${dispute.reason.toUpperCase()} - ${dispute.severity ?? 'unknown'}`,
              hint: `${daysElapsed}d old, ${dispute.evidenceCount} evidence items`
            }
          })
        })

        if (isCancel(disputeChoice)) {
          cancel('Dispute resolution cancelled')
          return
        }

        selectedDispute = disputeChoice
      }

      const dispute = pendingDisputes.find((d: DisputeSummary) => 
        (d.id?.toString() === selectedDispute) || 
        d.dispute?.toString() === selectedDispute
      )
      if (!dispute) {
        log.error('Dispute not found or not available for arbitration')
        return
      }

      // Display dispute details for review
      log.info(`\n${chalk.bold('📋 Dispute Review:')}\n`)
      log.info(
        `${chalk.gray('Reason:')} ${dispute.reason}\n` +
        `${chalk.gray('Severity:')} ${dispute.severity}\n` +
        `${chalk.gray('Filed by:')} ${dispute.claimant ?? dispute.complainant}\n` +
        `${chalk.gray('Against:')} ${dispute.respondent}\n` +
        `${chalk.gray('Work Order:')} ${dispute.workOrder ?? dispute.transaction ?? 'N/A'}\n` +
        `${chalk.gray('Description:')} ${dispute.description ?? dispute.reason}\n` +
        `${chalk.gray('Evidence Items:')} ${dispute.evidenceCount}\n` +
        `${chalk.gray('Preferred Resolution:')} ${dispute.preferredResolution ?? 'None specified'}\n`
      )

      // Load and display evidence
      if (dispute.evidenceCount > 0) {
        s.start('Loading evidence...')
        const evidence = await client.dispute.getEvidenceHistory(address(selectedDispute))
        s.stop(`✅ Loaded ${evidence.length} evidence items`)

        log.info(`\n${chalk.bold('📄 Evidence Review:')}\n`)
        evidence.forEach((item, index) => {
          log.info(
            `${chalk.bold(`${index + 1}. ${item.evidenceType.toUpperCase()}`)}\n` +
            `   ${chalk.gray('Description:')} ${'description' in item && typeof item.description === 'string' ? item.description : 'No description'}\n` +
            `   ${chalk.gray('Data:')} ${item.evidenceData.substring(0, 100)}${item.evidenceData.length > 100 ? '...' : ''}\n` +
            `   ${chalk.gray('Submitted:')} ${new Date(Number(item.timestamp) * 1000).toLocaleString()}\n`
          )
        })
      }

      // Arbitration decision
      const ruling = await select({
        message: 'Select your ruling on this dispute:',
        options: [
          { value: 'favor_claimant', label: '✅ Rule in favor of claimant', hint: 'Claimant wins the dispute' },
          { value: 'favor_respondent', label: '❌ Rule in favor of respondent', hint: 'Respondent wins the dispute' },
          { value: 'partial_claimant', label: '⚖️ Partial ruling for claimant', hint: 'Split decision favoring claimant' },
          { value: 'partial_respondent', label: '⚖️ Partial ruling for respondent', hint: 'Split decision favoring respondent' },
          { value: 'no_fault', label: '🤝 No fault found', hint: 'Mutual resolution without blame' },
          { value: 'escalate', label: '🆙 Escalate to senior arbitrator', hint: 'Case requires higher authority' }
        ]
      })

      if (isCancel(ruling)) {
        cancel('Dispute resolution cancelled')
        return
      }

      const resolutionDetails = await text({
        message: 'Provide detailed reasoning for your decision:',
        placeholder: 'Based on the evidence provided, the claimant has demonstrated that...',
        validate: (value) => {
          if (!value || value.trim().length < 50) return 'Please provide at least 50 characters explaining your decision'
          if (value.length > 1000) return 'Resolution details must be less than 1000 characters'
        }
      })

      if (isCancel(resolutionDetails)) {
        cancel('Dispute resolution cancelled')
        return
      }

      // Financial resolution if applicable
      let compensationAmount = null
      if (['favor_claimant', 'partial_claimant', 'partial_respondent'].includes(ruling)) {
        const needsCompensation = await confirm({
          message: 'Does this resolution involve financial compensation?'
        })

        if (!isCancel(needsCompensation) && needsCompensation) {
          const compensation = await text({
            message: 'Enter compensation amount (SOL):',
            placeholder: '0.1',
            validate: (value) => {
              const num = parseFloat(value)
              if (isNaN(num) || num < 0) return 'Please enter a valid positive number or 0'
              if (num > 100) return 'Compensation amount seems too high'
            }
          })

          if (!isCancel(compensation)) {
            compensationAmount = parseFloat(compensation)
          }
        }
      }

      // Preview resolution
      note(
        `${chalk.bold('Resolution Preview:')}\n` +
        `${chalk.gray('Ruling:')} ${ruling.replace('_', ' ').toUpperCase()}\n` +
        `${chalk.gray('Compensation:')} ${compensationAmount ? `${compensationAmount} SOL` : 'None'}\n` +
        `${chalk.gray('Reasoning:')} ${resolutionDetails.substring(0, 100)}${resolutionDetails.length > 100 ? '...' : ''}`,
        'Arbitration Decision'
      )

      const confirmResolve = await confirm({
        message: 'Finalize this arbitration decision? (This action cannot be undone)'
      })

      if (isCancel(confirmResolve) || !confirmResolve) {
        cancel('Dispute resolution cancelled')
        return
      }

      s.start('Recording resolution on blockchain...')
      
      try {
        const signature = await client.dispute.resolveDispute(
          wallet,
          {
            dispute: address(selectedDispute),
            resolution: resolutionDetails,
            rulingInFavorOfComplainant: ruling === 'favor_claimant' || ruling === 'partial_claimant'
          }
        )

        s.stop('✅ Dispute resolved successfully!')

        const explorerUrl = getExplorerUrl(signature, 'devnet')
        
        outro(
          `${chalk.green('⚖️ Dispute Resolved!')}\n\n` +
          `${chalk.bold('Resolution Details:')}\n` +
          `${chalk.gray('Ruling:')} ${ruling.replace('_', ' ').toUpperCase()}\n` +
          `${chalk.gray('Compensation:')} ${compensationAmount ? `${compensationAmount} SOL` : 'None'}\n` +
          `${chalk.gray('Status:')} ${chalk.green('RESOLVED')}\n\n` +
          `${chalk.bold('Transaction:')}\n` +
          `${chalk.gray('Signature:')} ${signature}\n` +
          `${chalk.gray('Explorer:')} ${explorerUrl}\n\n` +
          `${chalk.yellow('💡 Both parties have been notified of the resolution')}`
        )
        
      } catch (error) {
        s.stop('❌ Dispute resolution failed')
        await handleTransactionError(error as Error)
      }
      
    } catch (error) {
      log.error(`Failed to resolve dispute: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  })

// Escalate dispute subcommand
disputeCommand
  .command('escalate')
  .description('Escalate dispute to human review')
  .option('-d, --dispute <id>', 'Dispute ID to escalate')
  .action(async (_options: { dispute?: string }) => {
    intro(chalk.cyan('🆙 Escalate Dispute'))

    try {
      const s = spinner()
      s.start('Loading your disputes...')
      
      const { client, wallet } = await initializeClient('devnet')
      
      // Get all disputes and filter by user involvement
      const allDisputes = await client.dispute.listDisputes()
      const disputes = allDisputes.filter((d: DisputeSummary) => 
        (d.claimant === wallet.address.toString()) || 
        (d.respondent === wallet.address.toString())
      )
      const escalatableDisputes = disputes.filter((d: DisputeSummary) => 
        (d.status.toString() === 'under_review' || d.status.toString() === 'UnderReview') && 
        !('escalated' in d && d.escalated)
      )
      
      s.stop(`✅ Found ${escalatableDisputes.length} disputes eligible for escalation`)

      if (escalatableDisputes.length === 0) {
        outro(
          `${chalk.yellow('No disputes eligible for escalation')}\n\n` +
          `${chalk.gray('Only disputes under review can be escalated to human arbitrators')}`
        )
        return
      }

      // Select dispute if not provided
      let selectedDispute = _options.dispute
      if (!selectedDispute) {
        const disputeChoice = await select({
          message: 'Select dispute to escalate:',
          options: escalatableDisputes.map((dispute: DisputeSummary) => {
            const timeElapsed = Math.floor((Date.now() / 1000) - Number(dispute.createdAt))
            const daysElapsed = Math.floor(timeElapsed / 86400)
            
            return {
              value: dispute.id ?? dispute.dispute.toString(),
              label: `${dispute.reason.toUpperCase()} - ${dispute.severity ?? 'unknown'}`,
              hint: `${daysElapsed}d under review`
            }
          })
        })

        if (isCancel(disputeChoice)) {
          cancel('Escalation cancelled')
          return
        }

        selectedDispute = disputeChoice
      }

      const dispute = escalatableDisputes.find((d: DisputeSummary) => 
        (d.id?.toString() === selectedDispute) || 
        d.dispute?.toString() === selectedDispute
      )
      if (!dispute) {
        log.error('Dispute not found or not eligible for escalation')
        return
      }

      // Escalation reason
      const escalationReason = await select({
        message: 'Why are you escalating this dispute?',
        options: [
          { value: 'complexity', label: '🧩 Complex Case', hint: 'Requires expert human judgment' },
          { value: 'bias', label: '⚖️ Potential Bias', hint: 'Concerned about arbitrator bias' },
          { value: 'precedent', label: '📚 Sets Precedent', hint: 'Important case for future reference' },
          { value: 'high_value', label: '💰 High Value', hint: 'Significant financial impact' },
          { value: 'technical', label: '🔧 Technical Complexity', hint: 'Requires specialized knowledge' },
          { value: 'unsatisfied', label: '😞 Unsatisfied with Process', hint: 'Current process inadequate' }
        ]
      })

      if (isCancel(escalationReason)) {
        cancel('Escalation cancelled')
        return
      }

      const escalationDetails = await text({
        message: 'Provide detailed justification for escalation:',
        placeholder: 'This case requires human review because...',
        validate: (value) => {
          if (!value || value.trim().length < 30) return 'Please provide at least 30 characters explaining why escalation is needed'
          if (value.length > 500) return 'Escalation details must be less than 500 characters'
        }
      })

      if (isCancel(escalationDetails)) {
        cancel('Escalation cancelled')
        return
      }

      // Escalation fee warning
      const understandsFee = await confirm({
        message: 'Escalation may involve additional fees. Do you wish to proceed?'
      })

      if (isCancel(understandsFee) || !understandsFee) {
        cancel('Escalation cancelled')
        return
      }

      // Preview escalation
      note(
        `${chalk.bold('Escalation Preview:')}\n` +
        `${chalk.gray('Dispute:')} ${dispute.reason.toUpperCase()}\n` +
        `${chalk.gray('Reason:')} ${escalationReason}\n` +
        `${chalk.gray('Justification:')} ${escalationDetails.substring(0, 100)}${escalationDetails.length > 100 ? '...' : ''}\n` +
        `${chalk.gray('Current Status:')} Under Review\n` +
        `${chalk.gray('New Status:')} Human Review Queue`,
        'Escalation Details'
      )

      const confirmEscalate = await confirm({
        message: 'Escalate this dispute to human review?'
      })

      if (isCancel(confirmEscalate) || !confirmEscalate) {
        cancel('Escalation cancelled')
        return
      }

      s.start('Escalating dispute...')
      
      try {
        const signature = await client.dispute.escalateDispute(
          toSDKSigner(wallet),
          address(selectedDispute as string),
          `${escalationReason}: ${escalationDetails}`
        )
        
        s.stop('✅ Dispute escalated successfully!')
        
        const explorerUrl = getExplorerUrl(signature, 'devnet')
        
        outro(
          `${chalk.yellow('🆙 Dispute Escalated to Human Review')}\n\n` +
          `${chalk.bold('Escalation Details:')}\n` +
          `${chalk.gray('Dispute ID:')} ${selectedDispute}\n` +
          `${chalk.gray('Reason:')} ${escalationReason}\n` +
          `${chalk.gray('Status:')} Human Review Queue\n` +
          `${chalk.gray('Response Time:')} Within 24 hours\n\n` +
          `${chalk.bold('Next Steps:')}\n` +
          `${chalk.gray('• A human moderator will review your case')}\n` +
          `${chalk.gray('• You will be notified of the decision')}\n` +
          `${chalk.gray('• Additional evidence may be requested')}\n\n` +
          `${chalk.cyan('Transaction:')} ${explorerUrl}`
        )
        
      } catch (error) {
        s.stop('❌ Escalation failed')
        await handleTransactionError(error as Error)
      }
      
    } catch (error) {
      log.error(`Failed to escalate dispute: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  })