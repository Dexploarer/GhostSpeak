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
  cancel,
  log,
  note
} from '@clack/prompts'
import { initializeClient, getExplorerUrl, handleTransactionError, toSDKSigner } from '../../../utils/client.js'
import { createSafeSDKClient } from '../../../utils/sdk-helpers.js'
import { type Address } from '@solana/addresses'

// Clean type definitions
interface _JobApplication {
  jobId: string
  agentAddress: Address
  proposal: string
  proposedBudget?: number
  estimatedDays?: number
}

interface _JobListing {
  id: string
  title: string
  description: string
  budget: number
  poster: Address
  skills: string[]
  deadline?: Date
  status: string
}

export function registerApplyCommand(parentCommand: Command): void {
  parentCommand
    .command('apply')
    .description('Apply to a job posting with your agent')
    .argument('[job-id]', 'Job posting ID (optional)')
    .action(async (jobId?: string) => {
      intro(chalk.magenta('📝 Apply to Job Posting'))

      try {
        const s = spinner()
        s.start('Connecting to network...')
        
        const { client, wallet } = await initializeClient('devnet')
        const safeClient = createSafeSDKClient(client)
        
        s.stop('✅ Connected to devnet')

        // Check if user has agents
        s.start('Loading your agents...')
        const agents = await safeClient.agent.listByOwner({ owner: wallet.address })
        s.stop(`✅ Found ${agents.length} agents`)

        if (agents.length === 0) {
          outro(
            `${chalk.yellow('No agents found')}\n\n` +
            `${chalk.gray('• Register an agent first:')} ${chalk.cyan('gs agent register')}\n` +
            `${chalk.gray('• Then apply to jobs with your agent')}`
          )
          return
        }

        // Select agent
        let selectedAgent = agents[0]
        if (agents.length > 1) {
          const agentChoice = await select({
            message: 'Select agent to apply with:',
            options: agents.map(agent => {
              return {
                value: agent.address,
                label: agent.data.name || 'Unnamed Agent',
                hint: `Skills: ${agent.data.capabilities?.join(', ') ?? 'None specified'}`
              }
            })
          })

          if (isCancel(agentChoice)) {
            cancel('Job application cancelled')
            return
          }

          selectedAgent = agents.find(a => a.address === agentChoice) ?? agents[0]
        }

        // Load available jobs
        s.start('Loading available job postings...')
        const jobs = await safeClient.marketplace.listJobs()
        s.stop(`✅ Found ${jobs.length} open jobs`)

        if (jobs.length === 0) {
          outro(
            `${chalk.yellow('No open job postings found')}\n\n` +
            `${chalk.gray('• Check back later for new opportunities')}\n` +
            `${chalk.gray('• Create your own job:')} ${chalk.cyan('gs marketplace jobs create')}`
          )
          return
        }

        // Select job (either by ID or from list)
        let selectedJob
        if (jobId) {
          selectedJob = jobs.find(job => job.id === jobId)
          if (!selectedJob) {
            cancel(`Job with ID '${jobId}' not found`)
            return
          }
        } else {
          const jobChoice = await select({
            message: 'Select job to apply to:',
            options: jobs.map(job => ({
              value: job.id,
              label: `${job.title} - ${job.budget.toFixed(2)} SOL`,
              hint: `${job.skills.join(', ')} • Deadline: ${job.deadline ? new Date(job.deadline).toLocaleDateString() : 'Flexible'}`
            }))
          })

          if (isCancel(jobChoice)) {
            cancel('Job application cancelled')
            return
          }

          selectedJob = jobs.find(job => job.id === jobChoice)!
        }

        // Show job details
        note(
          `${chalk.bold('Job Details:')}\n` +
          `${chalk.gray('Title:')} ${selectedJob.title}\n` +
          `${chalk.gray('Budget:')} ${selectedJob.budget.toFixed(4)} SOL\n` +
          `${chalk.gray('Posted by:')} ${selectedJob.poster.slice(0, 8)}...${selectedJob.poster.slice(-8)}\n` +
          `${chalk.gray('Skills:')} ${selectedJob.skills.join(', ')}\n` +
          `${chalk.gray('Description:')} ${selectedJob.description.slice(0, 100)}${selectedJob.description.length > 100 ? '...' : ''}`,
          'Job Overview'
        )

        // Get application proposal
        const proposal = await text({
          message: 'Your proposal and cover letter:',
          placeholder: 'Explain why your agent is perfect for this job, relevant experience, and approach...',
          validate: (value) => {
            if (!value || value.trim().length === 0) {
              return 'Proposal is required'
            }
            if (value.length < 50) {
              return 'Proposal must be at least 50 characters'
            }
            if (value.length > 2000) {
              return 'Proposal must be less than 2000 characters'
            }
          }
        })

        if (isCancel(proposal)) {
          cancel('Job application cancelled')
          return
        }

        // Get proposed budget (optional)
        const customBudget = await select({
          message: 'Proposed budget:',
          options: [
            { value: 'job_budget', label: `Accept job budget (${selectedJob.budget.toFixed(4)} SOL)`, hint: 'Use the posted budget' },
            { value: 'custom', label: 'Propose custom budget', hint: 'Negotiate a different rate' }
          ]
        })

        if (isCancel(customBudget)) {
          cancel('Job application cancelled')
          return
        }

        let proposedBudget = selectedJob.budget
        if (customBudget === 'custom') {
          const budgetInput = await text({
            message: `Proposed budget (SOL, max ${selectedJob.budget.toFixed(4)}):`,
            placeholder: (selectedJob.budget * 0.9).toFixed(4),
            validate: (value) => {
              const num = parseFloat(value)
              if (isNaN(num) || num <= 0) {
                return 'Please enter a valid positive number'
              }
              if (num > selectedJob.budget) {
                return `Budget cannot exceed ${selectedJob.budget.toFixed(4)} SOL`
              }
            }
          })

          if (isCancel(budgetInput)) {
            cancel('Job application cancelled')
            return
          }

          proposedBudget = parseFloat(budgetInput.toString())
        }

        // Get estimated timeline
        const timeline = await select({
          message: 'Estimated completion time:',
          options: [
            { value: '24', label: '24 hours', hint: 'Rush delivery' },
            { value: '72', label: '3 days', hint: 'Quick turnaround' },
            { value: '168', label: '1 week', hint: 'Standard timeline' },
            { value: '336', label: '2 weeks', hint: 'Complex work' },
            { value: 'custom', label: 'Custom timeline', hint: 'Specify custom timeframe' }
          ]
        })

        if (isCancel(timeline)) {
          cancel('Job application cancelled')
          return
        }

        let estimatedHours: string = timeline
        if (timeline === 'custom') {
          const customTimeline = await text({
            message: 'Estimated hours to complete:',
            placeholder: '120',
            validate: (value) => {
              const num = parseInt(value)
              if (isNaN(num) || num <= 0) {
                return 'Please enter a valid number of hours'
              }
              if (num > 8760) {
                return 'Timeline cannot exceed 1 year'
              }
            }
          })

          if (isCancel(customTimeline)) {
            cancel('Job application cancelled')
            return
          }

          estimatedHours = customTimeline.toString()
        }

        // Show application preview
        note(
          `${chalk.bold('Application Preview:')}\n` +
          `${chalk.gray('Job:')} ${selectedJob.title}\n` +
          `${chalk.gray('Your Agent:')} ${selectedAgent.data.name}\n` +
          `${chalk.gray('Proposed Budget:')} ${proposedBudget.toFixed(4)} SOL\n` +
          `${chalk.gray('Timeline:')} ${estimatedHours} hours\n` +
          `${chalk.gray('Proposal:')} ${proposal.toString().slice(0, 100)}${proposal.toString().length > 100 ? '...' : ''}`,
          'Application Summary'
        )

        const confirmApplication = await confirm({
          message: 'Submit this job application?'
        })

        if (isCancel(confirmApplication) || !confirmApplication) {
          cancel('Job application cancelled')
          return
        }

        s.start('Submitting application on blockchain...')

        try {
          const signature = await safeClient.marketplace.applyToJob(toSDKSigner(wallet), {
            jobId: selectedJob.id,
            agentAddress: selectedAgent.address,
            proposedPrice: BigInt(Math.floor(proposedBudget * 1_000_000_000)), // Convert SOL to lamports
            message: proposal.toString()
          })

          if (!signature) {
            throw new Error('Failed to get transaction signature')
          }

          s.stop('✅ Application submitted successfully!')

          const explorerUrl = getExplorerUrl(signature, 'devnet')
          
          outro(
            `${chalk.green('📝 Job Application Submitted!')}\n\n` +
            `${chalk.bold('Application Details:')}\n` +
            `${chalk.gray('Job:')} ${selectedJob.title}\n` +
            `${chalk.gray('Agent:')} ${selectedAgent.data.name}\n` +
            `${chalk.gray('Proposed Budget:')} ${proposedBudget.toFixed(4)} SOL\n` +
            `${chalk.gray('Timeline:')} ${estimatedHours} hours\n\n` +
            `${chalk.bold('Transaction:')}\n` +
            `${chalk.gray('Signature:')} ${signature}\n` +
            `${chalk.gray('Explorer:')} ${explorerUrl}\n\n` +
            `${chalk.yellow('Next Steps:')}\n` +
            `• The job poster will review your application\n` +
            `• You'll be notified if selected\n` +
            `• Check status: ${chalk.cyan('gs marketplace jobs list --applied')}`
          )

        } catch (error) {
          s.stop('❌ Failed to submit application')
          handleTransactionError(error as Error)
        }

      } catch (error) {
        log.error(`Failed to apply to job: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    })
}