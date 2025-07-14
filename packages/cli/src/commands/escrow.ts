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
import { initializeClient, getExplorerUrl, getAddressExplorerUrl, handleTransactionError } from '../utils/client.js'
import { PublicKey } from '@solana/web3.js'

export const escrowCommand = new Command('escrow')
  .description('Manage escrow payments and transactions')

escrowCommand
  .command('create')
  .description('Create a new escrow payment')
  .action(async () => {
    intro(chalk.yellow('🔒 Create Escrow Payment'))

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
            new PublicKey(value)
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
      
      s.start('Creating escrow contract...')

      try {
        const result = await client.escrow.create({
          amount: BigInt(Math.floor(parseFloat(amount as string) * 1_000_000)), // Convert SOL to lamports
          recipient: new PublicKey(recipient as string),
          description: workDescription as string
        })

        s.stop('✅ Escrow created successfully!')

        console.log('\n' + chalk.green('🎉 Escrow payment created!'))
        console.log(chalk.gray(`Escrow ID: ${result.escrowId.toBase58()}`))
        console.log(chalk.gray(`Amount: ${amount} SOL`))
        console.log(chalk.gray(`Recipient: ${recipient}`))
        console.log(chalk.gray(`Description: ${workDescription}`))
        console.log(chalk.gray(`Status: Active - Awaiting completion`))
        console.log('')
        console.log(chalk.cyan('Transaction:'), getExplorerUrl(result.signature, 'devnet'))
        console.log(chalk.cyan('Escrow Account:'), getAddressExplorerUrl(result.escrowId.toBase58(), 'devnet'))

        outro('Escrow creation completed')
      } catch (error: any) {
        s.stop('❌ Creation failed')
        throw new Error(handleTransactionError(error))
      }

    } catch (error) {
      cancel(chalk.red('Escrow creation failed: ' + (error instanceof Error ? error.message : 'Unknown error')))
    }
  })

escrowCommand
  .command('list')
  .description('List your escrow payments')
  .action(async () => {
    intro(chalk.yellow('📋 Your Escrow Payments'))

    const s = spinner()
    s.start('Connecting to Solana network...')

    try {
      // Initialize SDK client
      const { client, wallet } = await initializeClient('devnet')
      s.stop('✅ Connected')
      
      s.start('Loading escrow payments...')
      
      // Fetch user's escrows
      const escrows = await client.escrow.listByUser({
        user: wallet.publicKey
      })
      
      s.stop('✅ Escrows loaded')

      if (escrows.length === 0) {
        console.log('\n' + chalk.yellow('No escrow payments found'))
        outro('Create an escrow with: npx ghostspeak escrow create')
        return
      }

      console.log('\n' + chalk.bold(`💰 Your Escrows (${escrows.length})`))
      console.log('─'.repeat(70))
      
      escrows.forEach((escrow, index) => {
        const statusIcon = escrow.isReleased ? '✅' : 
                          escrow.isDisputed ? '⚠️' : 
                          escrow.workSubmitted ? '📝' : '⏳'
        const status = escrow.isReleased ? 'Released' : 
                      escrow.isDisputed ? 'Disputed' : 
                      escrow.workSubmitted ? 'Work Submitted' : 'Awaiting Work'
        
        console.log(chalk.yellow(`${index + 1}. ${escrow.description}`))
        console.log(chalk.gray(`   ID: ${escrow.id.toBase58()}`))
        console.log(chalk.gray(`   Amount: ${Number(escrow.amount) / 1_000_000} SOL`))
        console.log(chalk.gray(`   Status: ${statusIcon} ${status}`))
        console.log(chalk.gray(`   Sender: ${escrow.sender.toBase58().slice(0, 8)}...`))
        console.log(chalk.gray(`   Recipient: ${escrow.recipient.toBase58().slice(0, 8)}...`))
        console.log(chalk.gray(`   Created: ${new Date(Number(escrow.createdAt) * 1000).toLocaleString()}`))
        if (escrow.workSubmitted && escrow.workSubmissionTime) {
          console.log(chalk.gray(`   Work Submitted: ${new Date(Number(escrow.workSubmissionTime) * 1000).toLocaleString()}`))
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
  .action(async (escrowId) => {
    intro(chalk.yellow('💸 Release Escrow Payment'))

    try {
      // Fetch escrow details
      const s = spinner()
      s.start('Connecting to Solana network...')
      
      // Initialize SDK client
      const { client, wallet } = await initializeClient('devnet')
      s.stop('✅ Connected')
      
      s.start(`Loading escrow ${escrowId}...`)

      let escrowPubkey: PublicKey
      try {
        escrowPubkey = new PublicKey(escrowId)
      } catch {
        s.stop('❌ Invalid escrow ID')
        cancel('Invalid escrow ID format')
        return
      }

      const escrow = await client.escrow.get({
        escrowId: escrowPubkey
      })

      s.stop('✅ Escrow loaded')

      if (!escrow) {
        cancel('Escrow not found')
        return
      }

      // Check if user is the sender
      if (!escrow.sender.equals(wallet.publicKey)) {
        cancel('You are not the sender of this escrow')
        return
      }

      // Check escrow status
      if (escrow.isReleased) {
        cancel('This escrow has already been released')
        return
      }

      if (escrow.isDisputed) {
        cancel('This escrow is currently disputed and cannot be released')
        return
      }

      if (!escrow.workSubmitted) {
        console.log('\n' + chalk.yellow('⚠️  Work has not been submitted yet'))
      }

      console.log('\n' + chalk.bold('🔒 Escrow Details'))
      console.log('─'.repeat(40))
      console.log(chalk.yellow('Description:') + ` ${escrow.description}`)
      console.log(chalk.yellow('Amount:') + ` ${Number(escrow.amount) / 1_000_000} SOL`)
      console.log(chalk.yellow('Recipient:') + ` ${escrow.recipient.toBase58()}`)
      console.log(chalk.yellow('Status:') + ` ${escrow.workSubmitted ? 'Work Submitted' : 'Awaiting Work'}`)
      console.log(chalk.yellow('Created:') + ` ${new Date(Number(escrow.createdAt) * 1000).toLocaleString()}`)

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

        review = reviewText || ''
      }

      // Final confirmation
      console.log('\n' + chalk.bold('📋 Release Summary'))
      console.log('─'.repeat(40))
      console.log(chalk.yellow('Amount to release:') + ` ${Number(escrow.amount) / 1_000_000} SOL`)
      console.log(chalk.yellow('To:') + ` ${escrow.recipient.toBase58()}`)
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
        const result = await client.escrow.release({
          escrowId: escrowPubkey,
          rating: rating !== 'skip' ? parseInt(rating) : undefined,
          review: review || undefined
        })

        releaseSpinner.stop('✅ Funds released successfully!')

        console.log('\n' + chalk.green('🎉 Payment released!'))
        console.log(chalk.gray(`Amount: ${Number(escrow.amount) / 1_000_000} SOL`))
        console.log(chalk.gray(`To: ${escrow.recipient.toBase58()}`))
        console.log(chalk.gray('Status: Completed'))
        console.log('')
        console.log(chalk.cyan('Transaction:'), getExplorerUrl(result.signature, 'devnet'))
        
        if (rating !== 'skip') {
          console.log('\n' + chalk.green('⭐ Thank you for rating the service!'))
        }

        outro('Escrow release completed')
      } catch (error: any) {
        releaseSpinner.stop('❌ Release failed')
        throw new Error(handleTransactionError(error))
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
  .action(async (escrowId) => {
    intro(chalk.red('⚠️  Open Escrow Dispute'))

    try {
      // Fetch escrow details
      const s = spinner()
      s.start('Connecting to Solana network...')
      
      // Initialize SDK client
      const { client, wallet } = await initializeClient('devnet')
      s.stop('✅ Connected')
      
      s.start(`Loading escrow ${escrowId}...`)

      let escrowPubkey: PublicKey
      try {
        escrowPubkey = new PublicKey(escrowId)
      } catch {
        s.stop('❌ Invalid escrow ID')
        cancel('Invalid escrow ID format')
        return
      }

      const escrow = await client.escrow.get({
        escrowId: escrowPubkey
      })

      s.stop('✅ Escrow loaded')

      if (!escrow) {
        cancel('Escrow not found')
        return
      }

      // Check if user is the sender
      if (!escrow.sender.equals(wallet.publicKey)) {
        cancel('You are not the sender of this escrow')
        return
      }

      // Check escrow status
      if (escrow.isReleased) {
        cancel('This escrow has already been released')
        return
      }

      if (escrow.isDisputed) {
        cancel('This escrow is already disputed')
        return
      }

      console.log('\n' + chalk.bold('🔒 Escrow Details'))
      console.log('─'.repeat(40))
      console.log(chalk.yellow('Description:') + ` ${escrow.description}`)
      console.log(chalk.yellow('Amount:') + ` ${Number(escrow.amount) / 1_000_000} SOL`)
      console.log(chalk.yellow('Provider:') + ` ${escrow.recipient.toBase58()}`)
      console.log(chalk.yellow('Status:') + ` ${escrow.workSubmitted ? 'Work Submitted' : 'Awaiting Work'}`)
      console.log(chalk.yellow('Created:') + ` ${new Date(Number(escrow.createdAt) * 1000).toLocaleString()}`)

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

      let evidenceFiles = []
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
      console.log(chalk.red('Amount:') + ` ${Number(escrow.amount) / 1_000_000} SOL`)
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
        const result = await client.escrow.dispute({
          escrowId: escrowPubkey,
          reason: reason as string,
          description: description as string,
          evidence: evidenceFiles.join(','),
          desiredResolution: resolution as string
        })

        disputeSpinner.stop('✅ Dispute opened successfully!')

        console.log('\n' + chalk.red('⚠️  Dispute Opened'))
        console.log(chalk.gray(`Dispute ID: ${result.disputeId.toBase58()}`))
        console.log(chalk.gray('Status: Under Review'))
        console.log(chalk.gray('Escrow Status: Frozen'))
        console.log('')
        console.log(chalk.cyan('Transaction:'), getExplorerUrl(result.signature, 'devnet'))
        console.log(chalk.cyan('Dispute Account:'), getAddressExplorerUrl(result.disputeId.toBase58(), 'devnet'))
        
        console.log('\n' + chalk.yellow('💡 Next steps:'))
        console.log(chalk.gray('1. The provider will be notified of the dispute'))
        console.log(chalk.gray('2. Both parties can submit additional evidence'))
        console.log(chalk.gray('3. A mediator will review the case within 48 hours'))
        console.log(chalk.gray('4. You will be notified of the resolution'))

        outro('Dispute opened')
      } catch (error: any) {
        disputeSpinner.stop('❌ Dispute creation failed')
        throw new Error(handleTransactionError(error))
      }

    } catch (error) {
      cancel(chalk.red('Dispute creation failed: ' + (error instanceof Error ? error.message : 'Unknown error')))
    }
  })