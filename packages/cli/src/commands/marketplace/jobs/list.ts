import type { Command } from 'commander'
import chalk from 'chalk'
import { 
  intro, 
  outro, 
  select,
  spinner,
  isCancel,
  cancel,
  log,
  note
} from '@clack/prompts'
import { initializeClient } from '../../../utils/client.js'
import { createSafeSDKClient } from '../../../utils/sdk-helpers.js'
import { type Address } from '@solana/addresses'

// Clean type definitions
interface JobListOptions {
  myJobs?: boolean
  category?: string
  status?: string
  applied?: boolean
  posted?: boolean
}

interface _JobSummary {
  id: string
  title: string
  category: string
  budget: number
  deadline: Date
  poster: Address
  status: string
  applicationsCount: number
  skills: string[]
  description: string
}

export function registerListCommand(parentCommand: Command): void {
  parentCommand
    .command('list')
    .description('Browse and filter job postings')
    .option('--posted', 'Show jobs you posted')
    .option('--applied', 'Show jobs you applied to')
    .option('--category <category>', 'Filter by category')
    .option('--status <status>', 'Filter by status (open, active, completed)')
    .action(async (options: JobListOptions) => {
      intro(chalk.magenta('💼 Browse Job Postings'))

      try {
        const s = spinner()
        s.start('Connecting to network...')
        
        const { client, wallet } = await initializeClient('devnet')
        const safeClient = createSafeSDKClient(client)
        
        s.stop('✅ Connected to devnet')

        s.start('Loading job postings...')
        
        // Prepare filter parameters
        const filterParams: Record<string, unknown> = {}
        
        if (options.category) {
          filterParams.category = options.category
        }
        
        if (options.status) {
          filterParams.status = options.status
        } else {
          filterParams.status = 'open' // Default to open jobs
        }
        
        if (options.applied) {
          filterParams.applicant = wallet.address
        } else if (options.posted) {
          filterParams.poster = wallet.address
        }
        
        const jobs = await safeClient.marketplace.listJobs(filterParams)
        
        s.stop(`✅ Found ${jobs.length} job postings`)

        if (jobs.length === 0) {
          let message = 'No job postings found'
          if (options.applied) {
            message = 'You have not applied to any jobs yet'
          } else if (options.posted) {
            message = 'You have not posted any jobs yet'
          }
          
          outro(
            `${chalk.yellow(message)}\n\n` +
            `${chalk.gray('• Browse available jobs:')} ${chalk.cyan('gs marketplace jobs list')}\n` +
            `${chalk.gray('• Create a job posting:')} ${chalk.cyan('gs marketplace jobs create')}\n` +
            `${chalk.gray('• Apply to jobs:')} ${chalk.cyan('gs marketplace jobs apply')}`
          )
          return
        }

        // Determine list title
        let listTitle = 'Available Job Postings'
        if (options.applied) {
          listTitle = 'Jobs You Applied To'
        } else if (options.posted) {
          listTitle = 'Jobs You Posted'
        } else if (options.category) {
          listTitle = `${options.category.replace('_', ' ').toUpperCase()} Jobs`
        }

        log.info(`\n${chalk.bold(listTitle)} (${jobs.length} jobs)\n`)
        
        jobs.forEach((job, index) => {
          const isOwner = job.poster === wallet.address
          const deadlineDate = job.deadline ? new Date(job.deadline) : null
          const daysLeft = deadlineDate ? Math.ceil((deadlineDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : null
          
          const statusColor = job.status === 'open' ? chalk.green : 
                             job.status === 'active' ? chalk.yellow : 
                             job.status === 'completed' ? chalk.blue : chalk.gray

          const role = isOwner ? chalk.green('POSTED') : chalk.blue('AVAILABLE')
          
          log.info(
            `${chalk.bold(`${index + 1}. ${job.title}`)}\n` +
            `   ${chalk.gray('ID:')} ${job.id.slice(0, 8)}...\n` +
            `   ${chalk.gray('Category:')} ${job.category.replace('_', ' ')}\n` +
            `   ${chalk.gray('Budget:')} ${job.budget.toFixed(4)} SOL\n` +
            `   ${chalk.gray('Status:')} ${statusColor(job.status.toUpperCase())} ${role}\n` +
            `   ${chalk.gray('Applications:')} ${job.applicationsCount || 0}\n` +
            `   ${chalk.gray('Skills:')} ${job.skills.slice(0, 3).join(', ')}${job.skills.length > 3 ? '...' : ''}\n` +
            `   ${chalk.gray('Deadline:')} ${deadlineDate ? `${deadlineDate.toLocaleDateString()} (${daysLeft} days)` : 'Flexible'}\n` +
            `   ${chalk.gray('Description:')} ${job.description.slice(0, 80)}${job.description.length > 80 ? '...' : ''}\n`
          )
        })

        // Show action menu
        const actionOptions = []
        
        if (!options.posted) {
          actionOptions.push({ value: 'apply', label: '📝 Apply to a job', hint: 'Submit application with your agent' })
        }
        
        actionOptions.push(
          { value: 'view', label: '📋 View job details', hint: 'See full job information' },
          { value: 'filter', label: '🔍 Change filters', hint: 'Filter by category or status' },
          { value: 'create', label: '➕ Post new job', hint: 'Create your own job posting' },
          { value: 'exit', label: '✅ Done', hint: 'Exit job browser' }
        )

        const action = await select({
          message: 'What would you like to do?',
          options: actionOptions
        })

        if (isCancel(action)) {
          cancel('Job browsing cancelled')
          return
        }

        switch (action) {
          case 'apply':
            note(
              `To apply to a job, use:\n` +
              `${chalk.cyan('gs marketplace jobs apply [job-id]')}\n\n` +
              `Or apply to any job:\n` +
              `${chalk.cyan('gs marketplace jobs apply')}`
            )
            break
            
          case 'view':
            note(
              'Job details viewer coming soon!\n\n' +
              'For now, you can see basic details in the list above.\n' +
              `Apply to jobs with: ${chalk.cyan('gs marketplace jobs apply')}`
            )
            break
            
          case 'filter':
            note(
              `Available filter options:\n\n` +
              `${chalk.cyan('gs marketplace jobs list --category customer_support')}\n` +
              `${chalk.cyan('gs marketplace jobs list --status open')}\n` +
              `${chalk.cyan('gs marketplace jobs list --posted')} (your posted jobs)\n` +
              `${chalk.cyan('gs marketplace jobs list --applied')} (jobs you applied to)`
            )
            break
            
          case 'create':
            note(
              `Create a new job posting:\n` +
              `${chalk.cyan('gs marketplace jobs create')}`
            )
            break
        }

        outro(
          `${chalk.yellow('Job Marketplace Commands:')}\n` +
          `${chalk.cyan('gs marketplace jobs create')} - Post a new job\n` +
          `${chalk.cyan('gs marketplace jobs apply [job-id]')} - Apply to jobs\n` +
          `${chalk.cyan('gs marketplace jobs list --posted')} - Your posted jobs`
        )

      } catch (_error) {
        log.error(`Failed to load jobs: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    })
}

