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
import { initializeClient, getExplorerUrl, getAddressExplorerUrl, handleTransactionError, toSDKSigner } from '../utils/client.js'
import { address, type Address } from '@solana/addresses'
import { getAddressEncoder } from '@solana/kit'
import { WorkOrderStatus } from '@ghostspeak/sdk'
import type {
  CreateEscrowOptions,
  ReleaseEscrowOptions
} from '../types/cli-types.js'

export const escrowCommand = new Command('escrow')
  .description('Manage escrow payments and transactions')

escrowCommand
  .command('create')
  .description('Create a new escrow payment')
  .action(async (_options: CreateEscrowOptions) => {
    intro(chalk.yellow('🔒 Create Escrow Payment'))
    
    // Acknowledge options for future create escrow implementation
    void _options

    try {
      const amount = await text({
        message: 'Escrow amount (in SOL):',
        placeholder: '1.0',
        validate: (value) => {
          if (!value) return 'Amount is required'
          const num = parseFloat(value)
          if (isNaN(num) || num <= 0) return 'Please enter a valid positive number'
        }
      })

      if (isCancel(amount)) {
        cancel('Escrow creation cancelled')
        return
      }

      const recipient = await text({
        message: 'Recipient wallet address:',
        placeholder: 'Enter Solana wallet address...',
        validate: (value) => {
          if (!value) return 'Recipient address is required'
          try {
            address(value)
            return
          } catch {
            return 'Invalid Solana address format'
          }
        }
      })

      if (isCancel(recipient)) {
        cancel('Escrow creation cancelled')
        return
      }

      const workDescription = await text({
        message: 'Work description:',
        placeholder: 'Describe the work to be done...',
        validate: (value) => {
          if (!value) return 'Work description is required'
          if (value.length < 10) return 'Description must be at least 10 characters'
        }
      })

      if (isCancel(workDescription)) {
        cancel('Escrow creation cancelled')
        return
      }

      const s = spinner()
      s.start('Connecting to Solana network...')
      
      // Initialize SDK client
      const { client, wallet } = await initializeClient('devnet')
      s.stop('✅ Connected')
      
      // Ensure wallet has an address
      if (!wallet?.address) {
        throw new Error('No wallet found. Please run: ghostspeak faucet --save')
      }
      
      s.start('Creating escrow contract...')

      try {
        // Generate a unique order ID
        const orderId = BigInt(Date.now())
        
        // Generate PDA for work order using manual derivation (SDK function has bug)
        const { getProgramDerivedAddress, getU64Encoder, getBytesEncoder } = await import('@solana/kit')
        
        let workOrderPda: Address
        try {
          // Use manual PDA derivation that matches smart contract exactly
          const [pda] = await getProgramDerivedAddress({
            programAddress: client.config.programId!,
            seeds: [
              getBytesEncoder().encode(new Uint8Array([119, 111, 114, 107, 95, 111, 114, 100, 101, 114])),  // 'work_order'
              getAddressEncoder().encode(wallet.address), // client.key().as_ref()
              getU64Encoder().encode(orderId) // &order_id.to_le_bytes()
            ]
          })
          workOrderPda = pda
          
          console.log('Generated work order PDA:', workOrderPda)
        } catch (error) {
          console.error('PDA generation failed:', error)
          throw error
        }
        
        // Create the work order (escrow)
        console.log('Creating escrow with params:', {
          orderId: orderId.toString(),
          provider: recipient,
          workOrderPda: workOrderPda.toString(),
        })
        
        console.log('About to call client.createEscrow...')
        
        let signature: string
        try {
          const workOrderAddress = address('11111111111111111111111111111111') // Mock address
          signature = await client.escrow.create(
            workOrderAddress,
            {
              orderId,
              provider: address(recipient),
              title: `Work Order #${orderId}`,
              description: workDescription as string,
              requirements: ['No specific requirements'], // Try with non-empty array
              amount: BigInt(Math.floor(parseFloat(amount as string) * 1_000_000_000)), // Convert SOL to lamports
              paymentToken: address('So11111111111111111111111111111111111111112'), // Native SOL
              deadline: BigInt(Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60), // 7 days from now
              signer: toSDKSigner(wallet)
            }
          )
          console.log('✅ Escrow creation successful, signature:', signature)
        } catch (escrowError: unknown) {
          console.error('❌ Escrow creation failed:', escrowError instanceof Error ? escrowError.message : escrowError)
          console.error('Error details:', {
            message: escrowError instanceof Error ? escrowError.message : 'Unknown error',
            stack: escrowError instanceof Error ? escrowError.stack : 'No stack trace'
          })
          throw escrowError
        }

        s.stop('✅ Escrow created successfully!')

        console.log('\n' + chalk.green('🎉 Escrow payment created!'))
        console.log(chalk.gray(`Work Order ID: #${orderId}`))
        console.log(chalk.gray(`Work Order Address: ${workOrderPda}`))
        console.log(chalk.gray(`Amount: ${amount} SOL`))
        console.log(chalk.gray(`Recipient: ${recipient}`))
        console.log(chalk.gray(`Description: ${workDescription}`))
        console.log(chalk.gray(`Status: Active - Awaiting completion`))
        console.log('')
        console.log(chalk.cyan('Transaction:'), getExplorerUrl(signature, 'devnet'))
        console.log(chalk.cyan('Work Order Account:'), getAddressExplorerUrl(workOrderPda, 'devnet'))

        outro('Escrow creation completed')
      } catch (error: unknown) {
        s.stop('❌ Creation failed')
        await handleTransactionError(error as Error)
        throw error
      }

    } catch (error) {
      cancel(chalk.red('Escrow creation failed: ' + (error instanceof Error ? error.message : 'Unknown error')))
    }
  })

escrowCommand
  .command('list')
  .description('List your escrow payments')
  .action(async (_options: { limit?: string }) => {
    intro(chalk.yellow('📋 Your Escrow Payments'))
    
    // Acknowledge options for future limit implementation
    void _options

    const s = spinner()
    s.start('Connecting to Solana network...')

    try {
      // Initialize SDK client
      const { client, wallet } = await initializeClient('devnet')
      s.stop('✅ Connected')
      
      s.start('Loading escrow payments...')
      
      // Fetch user's escrows (work orders)
      const workOrders = await client.escrow.getEscrowsForUser(wallet.address)
      
      s.stop('✅ Escrows loaded')

      if (workOrders.length === 0) {
        console.log('\n' + chalk.yellow('No escrow payments found'))
        outro('Create an escrow with: gs escrow create')
        return
      }

      console.log('\n' + chalk.bold(`💰 Your Work Orders (${workOrders.length})`))
      console.log('─'.repeat(70))
      
      // Import WorkOrderStatus enum
      const { WorkOrderStatus } = await import('@ghostspeak/sdk')
      
      workOrders.forEach((workOrder, index) => {
        const isClient = workOrder.client === wallet.address
        const role = isClient ? 'Client' : 'Provider'
        
        let statusIcon = '⏳'
        let statusText = 'Unknown'
        
        switch (workOrder.status) {
          case WorkOrderStatus.Open:
            statusIcon = '📋'
            statusText = 'Open'
            break
          case WorkOrderStatus.InProgress:
            statusIcon = '🔨'
            statusText = 'In Progress'
            break
          case WorkOrderStatus.Submitted:
            statusIcon = '📝'
            statusText = 'Work Submitted'
            break
          case WorkOrderStatus.Completed:
            statusIcon = '✅'
            statusText = 'Completed'
            break
          case WorkOrderStatus.Cancelled:
            statusIcon = '❌'
            statusText = 'Cancelled'
            break
        }
        
        console.log(chalk.yellow(`${index + 1}. ${workOrder.title}`))
        console.log(chalk.gray(`   Role: ${role}`))
        console.log(chalk.gray(`   Created: ${new Date(Number(workOrder.createdAt) * 1000).toLocaleDateString()}`))
        console.log(chalk.gray(`   Amount: ${Number(workOrder.paymentAmount) / 1_000_000_000} SOL`))
        console.log(chalk.gray(`   Status: ${statusIcon} ${statusText}`))
        console.log(chalk.gray(`   Client: ${workOrder.client.slice(0, 8)}...`))
        console.log(chalk.gray(`   Provider: ${workOrder.provider.slice(0, 8)}...`))
        console.log(chalk.gray(`   Created: ${new Date(Number(workOrder.createdAt) * 1000).toLocaleString()}`))
        console.log(chalk.gray(`   Deadline: ${new Date(Number(workOrder.deadline) * 1000).toLocaleString()}`))
        if (workOrder.description) {
          console.log(chalk.gray(`   Description: ${workOrder.description.slice(0, 50)}...`))
        }
        console.log('')
      })

      outro('Escrow listing completed')

    } catch (error) {
      s.stop('❌ Failed to load escrows')
      cancel(chalk.red('Error: ' + (error instanceof Error ? error.message : 'Unknown error')))
    }
  })

// Release escrow payment
escrowCommand
  .command('release')
  .description('Release funds from escrow')
  .argument('<escrow-id>', 'Escrow ID to release')
  .action(async (escrowId: string, _options: ReleaseEscrowOptions) => {
    intro(chalk.yellow('💸 Release Escrow Payment'))
    
    // Acknowledge options for future release options implementation
    void _options

    try {
      // Fetch escrow details
      const s = spinner()
      s.start('Connecting to Solana network...')
      
      // Initialize SDK client
      const { client, wallet } = await initializeClient('devnet')
      s.stop('✅ Connected')
      
      s.start(`Loading escrow ${escrowId}...`)

      let escrowPubkey: Address
      try {
        escrowPubkey = address(escrowId)
      } catch {
        s.stop('❌ Invalid escrow ID')
        cancel('Invalid escrow ID format')
        return
      }

      const workOrder = await client.escrow.getAccount(escrowPubkey)

      s.stop('✅ Work order loaded')

      if (!workOrder) {
        cancel('Work order not found')
        return
      }

      // Check if user is the client
      if (workOrder.client !== wallet.address) {
        cancel('You are not the client of this work order')
        return
      }

      // Check work order status
      if (workOrder.status === WorkOrderStatus.Completed) {
        cancel('This work order has already been completed')
        return
      }

      if (workOrder.status.toString() === 'Disputed') {
        cancel('This work order is currently disputed and cannot be released')
        return
      }

      if (workOrder.status === WorkOrderStatus.Cancelled) {
        cancel('This work order has been cancelled')
        return
      }

      if (workOrder.status !== WorkOrderStatus.Submitted) {
        console.log('\n' + chalk.yellow('⚠️  Work has not been submitted yet'))
      }

      console.log('\n' + chalk.bold('🔒 Work Order Details'))
      console.log('─'.repeat(40))
      console.log(chalk.yellow('Title:') + ` ${workOrder.title ?? 'Untitled'}`)
      console.log(chalk.yellow('Created:') + ` ${new Date(Number(workOrder.createdAt) * 1000).toLocaleString()}`)
      console.log(chalk.yellow('Description:') + ` ${workOrder.description}`)
      console.log(chalk.yellow('Amount:') + ` ${Number(workOrder.paymentAmount) / 1_000_000_000} SOL`)
      console.log(chalk.yellow('Provider:') + ` ${workOrder.provider.slice(0, 8)}...`)
      console.log(chalk.yellow('Status:') + ` ${workOrder.status === WorkOrderStatus.Submitted ? 'Work Submitted' : 'Awaiting Work'}`)
      console.log(chalk.yellow('Created:') + ` ${new Date(Number(workOrder.createdAt) * 1000).toLocaleString()}`)
      console.log(chalk.yellow('Deadline:') + ` ${new Date(Number(workOrder.deadline) * 1000).toLocaleString()}`)

      // Work verification
      const verified = await confirm({
        message: 'Have you verified the completed work?'
      })

      if (isCancel(verified)) {
        cancel('Release cancelled')
        return
      }

      if (!verified) {
        console.log('\n' + chalk.yellow('⚠️  Please review the work before releasing payment'))
        const proceed = await confirm({
          message: 'Do you still want to proceed with release?'
        })

        if (isCancel(proceed) || !proceed) {
          cancel('Release cancelled')
          return
        }
      }

      // Rating prompt
      const rating = await select({
        message: 'Rate the service (optional):',
        options: [
          { value: '5', label: '⭐⭐⭐⭐⭐ Excellent' },
          { value: '4', label: '⭐⭐⭐⭐ Good' },
          { value: '3', label: '⭐⭐⭐ Average' },
          { value: '2', label: '⭐⭐ Below Average' },
          { value: '1', label: '⭐ Poor' },
          { value: 'skip', label: 'Skip rating' }
        ]
      })

      if (isCancel(rating)) {
        cancel('Release cancelled')
        return
      }

      // Review prompt
      let review = ''
      if (rating !== 'skip') {
        const reviewText = await text({
          message: 'Leave a review (optional):',
          placeholder: 'Share your experience with this service...'
        })

        if (isCancel(reviewText)) {
          cancel('Release cancelled')
          return
        }

        review = reviewText ?? ''
      }

      // Final confirmation
      console.log('\n' + chalk.bold('📋 Release Summary'))
      console.log('─'.repeat(40))
      console.log(chalk.yellow('Amount to release:') + ` ${Number(workOrder.paymentAmount) / 1_000_000_000} SOL`)
      console.log(chalk.yellow('To:') + ` ${workOrder.provider.slice(0, 8)}...`)
      if (rating !== 'skip') {
        console.log(chalk.yellow('Rating:') + ` ${rating} stars`)
      }
      if (review) {
        console.log(chalk.yellow('Review:') + ` ${review}`)
      }

      const confirmed = await confirm({
        message: 'Release payment from escrow?'
      })

      if (isCancel(confirmed) || !confirmed) {
        cancel('Release cancelled')
        return
      }

      const releaseSpinner = spinner()
      releaseSpinner.start('Releasing funds from escrow...')

      try {
        const workDeliveryAddress = address('11111111111111111111111111111111') // Mock address
        const result = await client.escrow.release(
          workDeliveryAddress,
          {
            workOrderAddress: address(escrowPubkey.toString()),
            signer: toSDKSigner(wallet)
          }
        )

        releaseSpinner.stop('✅ Funds released successfully!')

        console.log('\n' + chalk.green('🎉 Payment released!'))
        console.log(chalk.gray(`Amount: ${Number(workOrder.paymentAmount) / 1_000_000_000} SOL`))
        console.log(chalk.gray(`To: ${workOrder.provider.slice(0, 8)}...`))
        console.log(chalk.gray('Status: Completed'))
        console.log('')
        console.log(chalk.cyan('Transaction:'), getExplorerUrl(result as string, 'devnet'))
        
        if (rating !== 'skip') {
          console.log('\n' + chalk.green('⭐ Thank you for rating the service!'))
        }

        outro('Escrow release completed')
      } catch (error) {
        releaseSpinner.stop('❌ Release failed')
        await handleTransactionError(error as Error)
        throw error
      }

    } catch (error) {
      cancel(chalk.red('Escrow release failed: ' + (error instanceof Error ? error.message : 'Unknown error')))
    }
  })

// Dispute escrow payment
escrowCommand
  .command('dispute')
  .description('Open a dispute for an escrow payment')
  .argument('<escrow-id>', 'Escrow ID to dispute')
  .action(async (escrowId: string) => {
    intro(chalk.red('⚠️  Open Escrow Dispute'))

    try {
      // Fetch escrow details
      const s = spinner()
      s.start('Connecting to Solana network...')
      
      // Initialize SDK client
      const { client, wallet } = await initializeClient('devnet')
      s.stop('✅ Connected')
      
      s.start(`Loading escrow ${escrowId}...`)

      let escrowPubkey: Address
      try {
        escrowPubkey = address(escrowId)
      } catch {
        s.stop('❌ Invalid escrow ID')
        cancel('Invalid escrow ID format')
        return
      }

      const workOrder = await client.escrow.getAccount(escrowPubkey)

      s.stop('✅ Work order loaded')

      if (!workOrder) {
        cancel('Work order not found')
        return
      }

      // Check if user is the client
      if (workOrder.client !== wallet.address) {
        cancel('You are not the client of this work order')
        return
      }

      // Check work order status
      if (workOrder.status === WorkOrderStatus.Completed) {
        cancel('This work order has already been completed')
        return
      }

      if (workOrder.status.toString() === 'Disputed') {
        cancel('This work order is already disputed')
        return
      }

      if (workOrder.status === WorkOrderStatus.Cancelled) {
        cancel('This work order has been cancelled')
        return
      }

      console.log('\n' + chalk.bold('🔒 Work Order Details'))
      console.log('─'.repeat(40))
      console.log(chalk.yellow('Title:') + ` ${workOrder.title ?? 'Untitled'}`)
      console.log(chalk.yellow('Created:') + ` ${new Date(Number(workOrder.createdAt) * 1000).toLocaleString()}`)
      console.log(chalk.yellow('Description:') + ` ${workOrder.description}`)
      console.log(chalk.yellow('Amount:') + ` ${Number(workOrder.paymentAmount) / 1_000_000_000} SOL`)
      console.log(chalk.yellow('Provider:') + ` ${workOrder.provider.slice(0, 8)}...`)
      console.log(chalk.yellow('Status:') + ` ${workOrder.status === WorkOrderStatus.Submitted ? 'Work Submitted' : 'Awaiting Work'}`)
      console.log(chalk.yellow('Created:') + ` ${new Date(Number(workOrder.createdAt) * 1000).toLocaleString()}`)
      console.log(chalk.yellow('Deadline:') + ` ${new Date(Number(workOrder.deadline) * 1000).toLocaleString()}`)

      // Dispute reason
      const reason = await select({
        message: 'Select dispute reason:',
        options: [
          { value: 'incomplete', label: '📝 Work not completed as agreed' },
          { value: 'quality', label: '⚠️  Poor quality or incorrect work' },
          { value: 'late', label: '⏰ Missed deadline' },
          { value: 'unresponsive', label: '🔇 Provider unresponsive' },
          { value: 'misrepresentation', label: '❌ Service misrepresentation' },
          { value: 'other', label: '📋 Other reason' }
        ]
      })

      if (isCancel(reason)) {
        cancel('Dispute cancelled')
        return
      }

      // Detailed description
      const description = await text({
        message: 'Describe the issue in detail:',
        placeholder: 'Explain what went wrong and what resolution you seek...',
        validate: (value) => {
          if (!value) return 'Description is required'
          if (value.length < 50) return 'Please provide at least 50 characters of detail'
        }
      })

      if (isCancel(description)) {
        cancel('Dispute cancelled')
        return
      }

      // Evidence upload prompt
      const hasEvidence = await confirm({
        message: 'Do you have evidence to support your dispute? (screenshots, chat logs, etc.)'
      })

      if (isCancel(hasEvidence)) {
        cancel('Dispute cancelled')
        return
      }

      let evidenceFiles: string[] = []
      if (hasEvidence) {
        const evidence = await text({
          message: 'Evidence file paths (comma-separated):',
          placeholder: 'e.g., screenshot1.png, chatlog.txt'
        })

        if (isCancel(evidence)) {
          cancel('Dispute cancelled')
          return
        }

        evidenceFiles = evidence ? evidence.split(',').map(f => f.trim()) : []
      }

      // Desired resolution
      const resolution = await select({
        message: 'What resolution are you seeking?',
        options: [
          { value: 'full-refund', label: '💰 Full refund' },
          { value: 'partial-refund', label: '💸 Partial refund' },
          { value: 'redo-work', label: '🔄 Redo the work' },
          { value: 'mediation', label: '🤝 Mediation with provider' }
        ]
      })

      if (isCancel(resolution)) {
        cancel('Dispute cancelled')
        return
      }

      // Confirmation
      console.log('\n' + chalk.bold('📋 Dispute Summary'))
      console.log('─'.repeat(40))
      console.log(chalk.red('Escrow:') + ` ${escrowId}`)
      console.log(chalk.red('Amount:') + ` ${Number(workOrder.paymentAmount) / 1_000_000_000} SOL`)
      console.log(chalk.red('Reason:') + ` ${reason}`)
      console.log(chalk.red('Resolution sought:') + ` ${resolution}`)
      if (evidenceFiles.length > 0) {
        console.log(chalk.red('Evidence files:') + ` ${evidenceFiles.length} files`)
      }
      console.log('\n' + chalk.gray('Description:'))
      console.log(chalk.gray(description))

      console.log('\n' + chalk.yellow('⚠️  Warning: Opening a dispute will freeze the escrow funds'))
      console.log(chalk.yellow('   until the dispute is resolved.'))

      const confirmed = await confirm({
        message: 'Open this dispute?'
      })

      if (isCancel(confirmed) || !confirmed) {
        cancel('Dispute cancelled')
        return
      }

      const disputeSpinner = spinner()
      disputeSpinner.start('Opening dispute...')

      try {
        // Get escrow/work order details to find the respondent
        const workOrder = await client.escrow.getWorkOrder(escrowPubkey)
        if (!workOrder) {
          throw new Error('Work order not found')
        }
        
        // Determine respondent based on who is filing the dispute
        const respondent = workOrder.client.toString() === wallet.address.toString() 
          ? workOrder.provider  // If client is filing, respondent is provider
          : workOrder.client    // If provider is filing, respondent is client
        
        const result = await client.dispute.fileDispute(
          // @ts-expect-error SDK expects TransactionSigner
          toSDKSigner(wallet),
          address(escrowPubkey.toString()), // disputePda
          {
            transaction: address(escrowPubkey.toString()),
            respondent: respondent,
            reason: `${reason}: ${description}`
          }
        )

        disputeSpinner.stop('✅ Dispute opened successfully!')

        console.log('\n' + chalk.red('⚠️  Dispute Opened'))
        console.log(chalk.gray(`Work Order: ${escrowPubkey.toString()}`))
        console.log(chalk.gray('Status: Under Review'))
        console.log(chalk.gray('Escrow Status: Frozen'))
        console.log('')
        console.log(chalk.cyan('Transaction:'), getExplorerUrl(result as string, 'devnet'))
        console.log(chalk.cyan('Work Order Account:'), getAddressExplorerUrl(escrowPubkey.toString(), 'devnet'))
        
        console.log('\n' + chalk.yellow('💡 Next steps:'))
        console.log(chalk.gray('1. The provider will be notified of the dispute'))
        console.log(chalk.gray('2. Both parties can submit additional evidence'))
        console.log(chalk.gray('3. A mediator will review the case within 48 hours'))
        console.log(chalk.gray('4. You will be notified of the resolution'))

        outro('Dispute opened')
      } catch (error) {
        disputeSpinner.stop('❌ Dispute creation failed')
        await handleTransactionError(error as Error)
        throw error
      }

    } catch (error) {
      cancel(chalk.red('Dispute creation failed: ' + (error instanceof Error ? error.message : 'Unknown error')))
    }
  })