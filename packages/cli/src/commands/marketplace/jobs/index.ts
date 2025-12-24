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
    .description('Manage job postinghost')
    .alias('j')

  // Register job subcommands
  registerCreateCommand(jobsCommand)
  registerListCommand(jobsCommand)
  registerApplyCommand(jobsCommand)

  // Add help text
  jobsCommand.addHelpText('after', `
${chalk.cyan('Examples:')}
  $ ghost marketplace jobs list             # Browse available job postings
  $ ghost marketplace jobs create           # Create a new job posting
  $ ghost marketplace jobs apply            # Apply to a job posting

${chalk.cyan('Quick shortcuts:')}
  $ ghost m j l                            # Short for 'marketplace jobs list'
  $ ghost m j c                            # Short for 'marketplace jobs create'
`)
}