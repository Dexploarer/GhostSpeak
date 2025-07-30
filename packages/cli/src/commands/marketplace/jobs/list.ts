/**
 * Marketplace jobs list command
 */

import type { Command } from 'commander'
import chalk from 'chalk'
import { 
  intro, 
  outro, 
  select,
  spinner,
  isCancel,
  cancel
} from '@clack/prompts'
import { initializeClient } from '../../../utils/client.js'
import type { JobPosting } from '@ghostspeak/sdk'
import type { KeyPairSigner } from '@solana/kit'

export function registerListCommand(parentCommand: Command): void {
  parentCommand
    .command('list')
    .description('Browse available job postings')
    .option('--my-jobs', 'Show only your job postings')
    .option('--category <category>', 'Filter by category')
    .action(async (options: { myJobs?: boolean; category?: string }) => {
      intro(chalk.magenta('💼 Job Postings'))

      const s = spinner()
      s.start('Connecting to Solana network...')
      
      try {
        // Initialize SDK client
        const { client, wallet } = await initializeClient('devnet')
        s.stop('✅ Connected')
        
        s.start('Loading job postings...')
        
        // Fetch jobs using SDK
        const jobs = await client.marketplace.getJobPostings()
        
        s.stop('✅ Jobs loaded')

        if (jobs.length === 0) {
          console.log('\n' + chalk.yellow('No job postings found'))
          outro('Create a job with: npx ghostspeak marketplace jobs create')
          return
        }

        console.log('\n' + chalk.bold(options.myJobs ? `💼 Your Job Postings (${jobs.length})` : `💼 Available Jobs (${jobs.length})`))
        console.log('═'.repeat(70))

        // Using a flexible type for jobs that may have different properties than the SDK type
        interface FlexibleJob {
          title?: string
          poster?: string | { toString(): string }
          deadline?: number | bigint
          address?: { toString(): string }
          id?: string
          budget?: number | bigint
          category?: string
          applicationsCount?: number
          isActive?: boolean
        }
        
        jobs.forEach((job: FlexibleJob, index: number) => {
          const posterStr = typeof job.poster === 'string' ? job.poster : job.poster?.toString()
          const isOwner = posterStr === wallet.address.toString()
          const deadlineDate = new Date(Number(job.deadline ?? 0) * 1000)
          const daysLeft = Math.ceil((deadlineDate.getTime() - Date.now()) / 86400000)
          
          console.log(chalk.magenta(`${index + 1}. ${job.title ?? 'Untitled'}`))
          console.log(chalk.gray(`   ID: ${job.address?.toString() ?? job.id ?? 'N/A'}`))
          console.log(chalk.gray(`   Budget: ${Number(job.budget) / 1_000_000} SOL`))
          console.log(chalk.gray(`   Deadline: ${deadlineDate.toLocaleDateString()} (${daysLeft} days left)`))
          console.log(chalk.gray(`   Category: ${job.category ?? 'General'}`))
          console.log(chalk.gray(`   Applications: ${job.applicationsCount ?? 0}`))
          console.log(chalk.gray(`   Status: ${job.isActive ? '✅ Active' : '❌ Closed'}`))
          if (!isOwner) {
            const posterDisplay = typeof job.poster === 'string' ? job.poster.slice(0, 8) : job.poster?.toString()?.slice(0, 8) ?? 'Unknown'
            console.log(chalk.gray(`   Posted by: ${posterDisplay}...`))
          }
          console.log('')
        })

        const action = await select({
          message: 'What would you like to do?',
          options: [
            { value: 'apply', label: '📝 Apply to a job' },
            { value: 'details', label: '📋 View job details' },
            { value: 'create', label: '➕ Create new job' },
            { value: 'exit', label: '🚪 Exit' }
          ]
        })

        if (isCancel(action)) {
          cancel('Job browsing cancelled')
          return
        }

        switch (action) {
          case 'apply':
            await applyToJob(jobs as unknown as JobPosting[], client, wallet)
            break
          case 'details':
            await viewJobDetails(jobs as unknown as JobPosting[])
            break
          case 'create':
            console.log(chalk.yellow('➕ Use "ghostspeak marketplace jobs create" to post a job'))
            break
        }

        outro('Job listing completed')

      } catch (error) {
        s.stop('❌ Failed to load jobs')
        cancel(chalk.red('Error: ' + (error instanceof Error ? error.message : 'Unknown error')))
      }
    })
}

// Helper functions (will be properly implemented when apply command is extracted)
async function applyToJob(jobs: JobPosting[], client: any, wallet: KeyPairSigner) {
  console.log(chalk.yellow('Apply functionality will be available when apply command is extracted'))
  console.log(chalk.gray('Available jobs:'), jobs.length)
  console.log(chalk.gray('Client:'), Boolean(client))
  console.log(chalk.gray('Wallet:'), wallet.address.toString().slice(0, 8) + '...')
}

async function viewJobDetails(jobs: JobPosting[]) {
  console.log(chalk.yellow('Job details view will be enhanced when UI helpers are available'))
  console.log(chalk.gray('Available jobs:'), jobs.length)
}