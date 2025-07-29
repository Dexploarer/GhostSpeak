/**
 * Marketplace jobs apply command
 */

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
import { initializeClient, getExplorerUrl, handleTransactionError, toSDKSigner } from '../../../utils/client.js'
import { address } from '@solana/addresses'
import type { Address } from '@solana/addresses'
import type { JobPosting } from '@ghostspeak/sdk'
import { 
  deriveJobPostingPda,
  deriveJobApplicationPda,
  generateUniqueId,
  calculateDeadline
} from '../../../utils/pda.js'

export function registerApplyCommand(parentCommand: Command): void {
  parentCommand
    .command('apply')
    .description('Apply to a job posting')
    .argument('[job-id]', 'Job posting ID')
    .action(async (jobId?: string) => {
      intro(chalk.magenta('📝 Apply to Job'))

      try {
        const { client, wallet } = await initializeClient('devnet')

        // If no job ID provided, show available jobs first
        let selectedJobIndex: number
        let jobs: JobPosting[]

        if (!jobId) {
          const s = spinner()
          s.start('Loading available jobs...')
          
          // Fetch jobs using SDK
          jobs = await client.marketplace.getJobPostings()
          s.stop('✅ Jobs loaded')

          if (jobs.length === 0) {
            console.log('\n' + chalk.yellow('No job postings available'))
            outro('Create a job with: npx ghostspeak marketplace jobs create')
            return
          }

          const selectedJob = await select({
            message: 'Select job to apply to:',
            options: jobs.map((job, index) => ({
              value: index,
              label: `${job.title} - ${Number(job.budget) / 1_000_000} SOL`
            }))
          })

          if (isCancel(selectedJob)) {
            cancel('Application cancelled')
            return
          }

          selectedJobIndex = selectedJob as number
        } else {
          // Find job by ID (simplified for now)
          const s = spinner()
          s.start('Loading job details...')
          jobs = await client.marketplace.getJobPostings()
          selectedJobIndex = jobs.findIndex(job => job.id?.toString() === jobId)
          s.stop('✅ Job loaded')

          if (selectedJobIndex === -1) {
            cancel('Job not found')
            return
          }
        }

        // Check if user has an agent
        const agents = await client.agent.listByOwner({ owner: wallet.address })
        if (agents.length === 0) {
          console.log(chalk.yellow('\n⚠️  You need a registered agent to apply for jobs'))
          console.log('Run: npx ghostspeak agent register')
          outro('Register an agent first')
          return
        }
        
        // Select agent if multiple
        let agentAddress = agents[0].address
        if (agents.length > 1) {
          const selectedAgent = await select({
            message: 'Select agent to apply with:',
            options: agents.map(agent => ({
              value: agent.address.toString(),
              label: agent.data.name || 'Agent'
            }))
          })
          
          if (isCancel(selectedAgent)) {
            cancel('Application cancelled')
            return
          }
          
          agentAddress = address(selectedAgent as string)
        }
        
        const proposal = await text({
          message: 'Your proposal:',
          placeholder: 'Explain why you\'re the best fit for this job...',
          validate: (value) => {
            if (!value) return 'Proposal is required'
            if (value.length < 50) return 'Proposal must be at least 50 characters'
          }
        })
        
        if (isCancel(proposal)) {
          cancel('Application cancelled')
          return
        }
        
        const confirmed = await confirm({
          message: 'Submit application?'
        })
        
        if (isCancel(confirmed) || !confirmed) {
          cancel('Application cancelled')
          return
        }
        
        const s = spinner()
        s.start('Submitting application...')
        
        try {
          // Get the actual job posting from the selected index
          const job = jobs[selectedJobIndex]
          
          // Generate job ID from job data (title + poster + created timestamp)
          // This is a workaround since we don't have the original job ID
          const jobIdGenerated = generateUniqueId(`job-${job.poster?.toString().slice(0, 8)}`)
          const jobPostingAddress = await deriveJobPostingPda(
            client.config.programId!,
            job.poster as Address,
            jobIdGenerated
          )
          
          // Generate job application PDA
          const jobApplicationAddress = await deriveJobApplicationPda(
            client.config.programId!,
            jobPostingAddress,
            agentAddress
          )
          
          const result = await client.marketplace.applyToJob(
            jobApplicationAddress,
            {
              jobPostingAddress,
              agentAddress,
              signer: toSDKSigner(wallet),
              coverLetter: proposal as string,
              proposedPrice: job.budget || BigInt(0), // Use job budget as proposed price
              estimatedDuration: 7, // Default 7 days
              estimatedDelivery: calculateDeadline(7)
            }
          )
          
          s.stop('✅ Application submitted!')
          
          console.log('')
          console.log(chalk.green('🎉 Application submitted successfully!'))
          console.log(chalk.cyan('Transaction:'), getExplorerUrl(result, 'devnet'))
          console.log(chalk.cyan('Application ID:'), jobApplicationAddress.toString())
          console.log('')
          console.log(chalk.yellow('💡 The job poster will review your application and respond soon.'))
          outro('Application submitted')
          
        } catch (error) {
          s.stop('❌ Application failed')
          throw new Error(handleTransactionError(error as Error))
        }

      } catch (error) {
        log.error('Application failed: ' + (error instanceof Error ? error.message : 'Unknown error'))
        cancel('Application failed')
      }
    })
}