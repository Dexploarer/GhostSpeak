/**
 * Marketplace jobs create command
 */

import type { Command } from 'commander'
import chalk from 'chalk'
import { 
  intro, 
  outro, 
  text, 
  select,
  multiselect,
  confirm,
  spinner,
  isCancel,
  cancel
} from '@clack/prompts'
import { initializeClient, getExplorerUrl, getAddressExplorerUrl, handleTransactionError, toSDKSigner } from '../../../utils/client.js'
import type { JobsOptions } from '../../../types/cli-types.js'
import { 
  deriveJobPostingPda,
  generateUniqueId,
  solToLamports,
  calculateDeadline,
  getDefaultPaymentToken
} from '../../../utils/pda.js'

export function registerCreateCommand(parentCommand: Command): void {
  parentCommand
    .command('create')
    .description('Create a new job posting')
    .action(async (options: JobsOptions) => {
      intro(chalk.magenta('💼 Create Job Posting'))
      
      // Acknowledge options for future implementation
      void options

      try {
        const title = await text({
          message: 'Job title:',
          placeholder: 'e.g., Need AI agent for customer support',
          validate: (value) => {
            if (!value) return 'Title is required'
            if (value.length < 10) return 'Title must be at least 10 characters'
          }
        })

        if (isCancel(title)) {
          cancel('Job creation cancelled')
          return
        }

        const description = await text({
          message: 'Job description:',
          placeholder: 'Detailed description of the work required...',
          validate: (value) => {
            if (!value) return 'Description is required'
            if (value.length < 50) return 'Description must be at least 50 characters'
          }
        })

        if (isCancel(description)) {
          cancel('Job creation cancelled')
          return
        }

        const category = await select({
          message: 'Select job category:',
          options: [
            { value: 'development', label: '💻 Development & Programming' },
            { value: 'content', label: '✍️  Content & Writing' },
            { value: 'data', label: '📊 Data Analysis & Science' },
            { value: 'support', label: '🎧 Customer Support' },
            { value: 'automation', label: '🤖 Automation & Integration' },
            { value: 'research', label: '🔍 Research & Analysis' }
          ]
        })

        if (isCancel(category)) {
          cancel('Job creation cancelled')
          return
        }

        const requirements = await multiselect({
          message: 'Select required capabilities:',
          options: [
            { value: 'fast-response', label: '⚡ Fast response time' },
            { value: 'high-accuracy', label: '🎯 High accuracy required' },
            { value: '24-7-availability', label: '🕐 24/7 availability' },
            { value: 'multilingual', label: '🌐 Multilingual support' },
            { value: 'api-integration', label: '🔌 API integration capability' },
            { value: 'data-privacy', label: '🔒 Data privacy compliance' }
          ],
          required: false
        })

        if (isCancel(requirements)) {
          cancel('Job creation cancelled')
          return
        }

        const budget = await text({
          message: 'Budget (in SOL):',
          placeholder: '1.0',
          validate: (value) => {
            if (!value) return 'Budget is required'
            const num = parseFloat(value)
            if (isNaN(num) || num <= 0) return 'Please enter a valid positive number'
          }
        })

        if (isCancel(budget)) {
          cancel('Job creation cancelled')
          return
        }

        const deadline = await select({
          message: 'Deadline:',
          options: [
            { value: '1d', label: '1 day' },
            { value: '3d', label: '3 days' },
            { value: '1w', label: '1 week' },
            { value: '2w', label: '2 weeks' },
            { value: '1m', label: '1 month' }
          ]
        })

        if (isCancel(deadline)) {
          cancel('Job creation cancelled')
          return
        }

        // Confirmation
        console.log('\n' + chalk.bold('💼 Job Posting Summary'))
        console.log('─'.repeat(50))
        console.log(chalk.magenta('Title:') + ` ${title}`)
        console.log(chalk.magenta('Category:') + ` ${category}`)
        console.log(chalk.magenta('Budget:') + ` ${budget} SOL`)
        console.log(chalk.magenta('Deadline:') + ` ${deadline}`)
        console.log(chalk.magenta('Requirements:') + ` ${requirements.length > 0 ? requirements.join(', ') : 'None specified'}`)
        console.log('\n' + chalk.gray(description))

        const confirmed = await confirm({
          message: 'Post this job?'
        })

        if (isCancel(confirmed) || !confirmed) {
          cancel('Job posting cancelled')
          return
        }

        const s = spinner()
        s.start('Connecting to Solana network...')
        
        // Initialize SDK client
        const { client, wallet } = await initializeClient('devnet')
        s.stop('✅ Connected')
        
        s.start('Creating job posting on the blockchain...')
        
        try {
          // Convert deadline to timestamp
          const deadlineDays = deadline === '1d' ? 1 :
                              deadline === '3d' ? 3 :
                              deadline === '1w' ? 7 : 
                              deadline === '2w' ? 14 : 30
          const deadlineTimestamp = calculateDeadline(deadlineDays)
          
          // Generate unique job ID and derive PDA
          const jobId = generateUniqueId('job')
          const jobPostingAddress = await deriveJobPostingPda(
            client.config.programId!,
            wallet.address,
            jobId
          )
          
          // Convert budget to bigint
          const budgetAmount = solToLamports(budget as string)
          
          const result = await client.marketplace.createJobPosting(
            jobPostingAddress,
            {
              title: title as string,
              description: description as string,
              amount: budgetAmount,
              signer: toSDKSigner(wallet),
              requirements: requirements as string[],
              deadline: deadlineTimestamp,
              skillsNeeded: requirements as string[], // Use requirements as skills
              budgetMin: budgetAmount, // Use same as budget
              budgetMax: budgetAmount, // Use same as budget
              paymentToken: getDefaultPaymentToken(), // Use native SOL
              jobType: category as string, // Use category as jobType
              experienceLevel: 'intermediate' // Default value
            }
          )
          
          s.stop('✅ Job posted successfully!')

          console.log('\n' + chalk.green('🎉 Your job has been posted!'))
          console.log(chalk.gray(`Job ID: ${jobPostingAddress.toString()}`))
          console.log(chalk.gray(`Job Address: ${jobPostingAddress}`))
          console.log(chalk.gray('Status: Active - Accepting applications'))
          console.log('')
          console.log(chalk.cyan('Transaction:'), getExplorerUrl(result, 'devnet'))
          console.log(chalk.cyan('Job Posting:'), getAddressExplorerUrl(jobPostingAddress.toString(), 'devnet'))
        } catch (error) {
          s.stop('❌ Job posting failed')
          throw new Error(handleTransactionError(error))
        }
        console.log('\n' + chalk.yellow('💡 AI agents matching your requirements will be notified.'))

        outro('Job posting completed')

      } catch (error) {
        cancel(chalk.red('Job posting failed: ' + (error instanceof Error ? error.message : 'Unknown error')))
      }
    })
}