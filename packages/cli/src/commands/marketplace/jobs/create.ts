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
  cancel,
  log,
  note
} from '@clack/prompts'
import { initializeClient, getExplorerUrl, handleTransactionError, toSDKSigner } from '../../../utils/client.js'
import { createSafeSDKClient } from '../../../utils/sdk-helpers.js'

// Clean type definitions
interface _JobCreation {
  title: string
  description: string
  category: string
  budget: number
  deadline: string
  requirements: string[]
}

interface CreateJobOptions {
  title?: string
  budget?: string
  category?: string
}

export function registerCreateCommand(parentCommand: Command): void {
  parentCommand
    .command('create')
    .description('Create a new job posting on the marketplace')
    .option('-t, --title <title>', 'Job title')
    .option('-b, --budget <budget>', 'Job budget in SOL')
    .option('-c, --category <category>', 'Job category')
    .action(async (options: CreateJobOptions) => {
      intro(chalk.magenta('💼 Create Job Posting'))

      try {
        const s = spinner()
        s.start('Connecting to network...')
        
        const { client, wallet } = await initializeClient('devnet')
        const safeClient = createSafeSDKClient(client) 
        
        s.stop('✅ Connected to devnet')

        // Get job title
        let title = options.title
        if (!title) {
          const titleInput = await text({
            message: 'Job title:',
            placeholder: 'AI Agent for Customer Support Automation',
            validate: (value) => {
              if (!value || value.trim().length === 0) {
                return 'Job title is required'
              }
              if (value.length < 10) {
                return 'Title must be at least 10 characters'
              }
              if (value.length > 100) {
                return 'Title must be less than 100 characters'
              }
            }
          })

          if (isCancel(titleInput)) {
            cancel('Job creation cancelled')
            return
          }

          title = titleInput.toString()
        }

        // Get job description
        const description = await text({
          message: 'Detailed job description:',
          placeholder: 'Looking for an AI agent to handle customer inquiries, process orders, and provide 24/7 support...',
          validate: (value) => {
            if (!value || value.trim().length === 0) {
              return 'Job description is required'
            }
            if (value.length < 50) {
              return 'Description must be at least 50 characters'
            }
            if (value.length > 2000) {
              return 'Description must be less than 2000 characters'
            }
          }
        })

        if (isCancel(description)) {
          cancel('Job creation cancelled')
          return
        }

        // Get job category
        let category = options.category
        if (!category) {
          const categoryChoice = await select({
            message: 'Select job category:',
            options: [
              { value: 'customer_support', label: '🎧 Customer Support', hint: 'Help desk, chat support, FAQ assistance' },
              { value: 'content_creation', label: '✍️ Content Creation', hint: 'Writing, blogging, copywriting' },
              { value: 'data_analysis', label: '📊 Data Analysis', hint: 'Research, analytics, reporting' },
              { value: 'development', label: '💻 Development', hint: 'Coding, automation, integration' },
              { value: 'marketing', label: '📈 Marketing', hint: 'Social media, advertising, outreach' },
              { value: 'translation', label: '🌐 Translation', hint: 'Language translation and localization' },
              { value: 'other', label: '🔧 Other', hint: 'Custom or specialized tasks' }
            ]
          })

          if (isCancel(categoryChoice)) {
            cancel('Job creation cancelled')
            return
          }

          category = categoryChoice.toString()
        }

        // Get required skills/capabilities
        const skills = await multiselect({
          message: 'Required agent capabilities (optional):',
          options: [
            { value: 'fast_response', label: '⚡ Fast Response Time', hint: 'Under 1 minute response' },
            { value: 'high_accuracy', label: '🎯 High Accuracy', hint: '95%+ accuracy required' },
            { value: 'multilingual', label: '🌐 Multilingual', hint: 'Multiple language support' },
            { value: 'api_integration', label: '🔌 API Integration', hint: 'Can work with external APIs' },
            { value: 'data_privacy', label: '🔒 Data Privacy', hint: 'GDPR/privacy compliant' },
            { value: 'available_24_7', label: '🕐 24/7 Availability', hint: 'Round-the-clock operation' },
            { value: 'specialized_knowledge', label: '📚 Domain Expertise', hint: 'Specialized industry knowledge' }
          ],
          required: false
        })

        if (isCancel(skills)) {
          cancel('Job creation cancelled')
          return
        }

        // Get job budget
        let budget = options.budget
        if (!budget) {
          const budgetInput = await text({
            message: 'Job budget (SOL):',
            placeholder: '1.5',
            validate: (value) => {
              const num = parseFloat(value)
              if (isNaN(num) || num <= 0) {
                return 'Please enter a valid positive number'
              }
              if (num < 0.01) {
                return 'Minimum budget is 0.01 SOL'
              }
              if (num > 1000) {
                return 'Maximum budget is 1000 SOL'
              }
            }
          })

          if (isCancel(budgetInput)) {
            cancel('Job creation cancelled')
            return
          }

          budget = budgetInput.toString()
        }

        const budgetNum = parseFloat(budget)

        // Get deadline
        const deadline = await select({
          message: 'Job completion deadline:',
          options: [
            { value: '24', label: '24 hours', hint: 'Urgent task' },
            { value: '72', label: '3 days', hint: 'Quick delivery' },
            { value: '168', label: '1 week', hint: 'Standard timeline' },
            { value: '336', label: '2 weeks', hint: 'Complex project' },
            { value: '720', label: '1 month', hint: 'Long-term engagement' },
            { value: 'custom', label: 'Custom deadline', hint: 'Specify custom timeframe' }
          ]
        })

        if (isCancel(deadline)) {
          cancel('Job creation cancelled')
          return
        }

        let deadlineHours: string = deadline
        if (deadline === 'custom') {
          const customDeadline = await text({
            message: 'Deadline (hours from now):',
            placeholder: '240',
            validate: (value) => {
              const num = parseInt(value)
              if (isNaN(num) || num <= 0) {
                return 'Please enter a valid number of hours'
              }
              if (num > 8760) {
                return 'Deadline cannot exceed 1 year'
              }
            }
          })

          if (isCancel(customDeadline)) {
            cancel('Job creation cancelled')
            return
          }

          deadlineHours = customDeadline.toString()
        }

        // Get experience level
        const experienceLevel = await select({
          message: 'Required experience level:',
          options: [
            { value: 'beginner', label: '🌱 Beginner', hint: 'Basic tasks, simple requirements' },
            { value: 'intermediate', label: '🚀 Intermediate', hint: 'Moderate complexity, some experience needed' },
            { value: 'expert', label: '⭐ Expert', hint: 'Complex tasks, high expertise required' }
          ]
        })

        if (isCancel(experienceLevel)) {
          cancel('Job creation cancelled')
          return
        }

        // Show job preview
        const skillsList = Array.isArray(skills) ? skills.join(', ') : 'None specified'
        note(
          `${chalk.bold('Job Posting Preview:')}\n` +
          `${chalk.gray('Title:')} ${title}\n` +
          `${chalk.gray('Category:')} ${category.replace('_', ' ').toUpperCase()}\n` +
          `${chalk.gray('Budget:')} ${budgetNum.toFixed(4)} SOL\n` +
          `${chalk.gray('Deadline:')} ${deadlineHours} hours from now\n` +
          `${chalk.gray('Experience:')} ${experienceLevel.toUpperCase()}\n` +
          `${chalk.gray('Skills:')} ${skillsList}\n` +
          `${chalk.gray('Posted by:')} ${wallet.address.slice(0, 8)}...${wallet.address.slice(-8)}\n` +
          `${chalk.gray('Description:')} ${description.toString().slice(0, 100)}${description.toString().length > 100 ? '...' : ''}`,
          'Job Summary'
        )

        const confirmCreate = await confirm({
          message: 'Create this job posting?'
        })

        if (isCancel(confirmCreate) || !confirmCreate) {
          cancel('Job creation cancelled')
          return
        }

        s.start('Creating job posting on blockchain...')

        try {
          // Convert hours to timestamp
          const deadlineTimestamp = Date.now() + (parseInt(deadlineHours) * 3600 * 1000)

          const signature = await safeClient.marketplace.createJob(toSDKSigner(wallet), {
            title,
            description: description.toString(),
            budget: BigInt(Math.floor(budgetNum * 1_000_000_000)), // Convert SOL to lamports
            deadline: deadlineTimestamp,
            category
          })

          if (!signature) {
            throw new Error('Failed to get transaction signature')
          }

          s.stop('✅ Job posting created successfully!')

          const explorerUrl = getExplorerUrl(signature, 'devnet')
          
          outro(
            `${chalk.green('💼 Job Posted Successfully!')}\n\n` +
            `${chalk.bold('Job Details:')}\n` +
            `${chalk.gray('Title:')} ${title}\n` +
            `${chalk.gray('Category:')} ${category.replace('_', ' ').toUpperCase()}\n` +
            `${chalk.gray('Budget:')} ${budgetNum.toFixed(4)} SOL\n` +
            `${chalk.gray('Deadline:')} ${Math.floor(parseInt(deadlineHours) / 24)} days\n` +
            `${chalk.gray('Status:')} Active - Accepting Applications\n\n` +
            `${chalk.bold('Transaction:')}\n` +
            `${chalk.gray('Signature:')} ${signature}\n` +
            `${chalk.gray('Explorer:')} ${explorerUrl}\n\n` +
            `${chalk.yellow('Next Steps:')}\n` +
            `• AI agents will see your job posting\n` +
            `• Review applications: ${chalk.cyan('gs marketplace jobs list --posted')}\n` +
            `• Select the best agent for your needs`
          )

        } catch {
          s.stop('❌ Failed to create job posting')
          handleTransactionError(error as Error)
        }

      } catch (error) {
        log.error(`Failed to create job: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    })
}