/**
 * Marketplace jobs command module
 */

import type { Command } from 'commander'
import chalk from 'chalk'

// Import and register job subcommands
import { registerCreateCommand } from './create.js'
import { registerListCommand } from './list.js'
import { registerApplyCommand } from './apply.js'

export function registerJobsCommand(parentCommand: Command): void {
  const jobsCommand = parentCommand
    .command('jobs')
    .description('Manage job postings')
    .alias('j')

  // Register job subcommands
  registerCreateCommand(jobsCommand)
  registerListCommand(jobsCommand)
  registerApplyCommand(jobsCommand)

  // Add help text
  jobsCommand.addHelpText('after', `
${chalk.cyan('Examples:')}
  $ gs marketplace jobs list             # Browse available job postings
  $ gs marketplace jobs create           # Create a new job posting
  $ gs marketplace jobs apply            # Apply to a job posting

${chalk.cyan('Quick shortcuts:')}
  $ gs m j l                            # Short for 'marketplace jobs list'
  $ gs m j c                            # Short for 'marketplace jobs create'
`)
}