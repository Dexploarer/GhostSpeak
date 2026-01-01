/**
 * Reputation Command (Ink UI Version)
 * Interactive Ghost Score reputation dashboard
 */

import { Command } from 'commander'
import React from 'react'
import { render } from 'ink'
import { Reputation } from '../ui/commands/Reputation.js'

export const reputationUICommand = new Command('reputation-ui')
  .description('📊 Interactive Ghost Score reputation dashboard')
  .option('-a, --agent <address>', 'Agent address')
  .option('-d, --detailed', 'Show detailed view by default')
  .action(async (options) => {
    const { waitUntilExit } = render(
      React.createElement(Reputation, {
        agent: options.agent,
        detailed: options.detailed,
      })
    )

    await waitUntilExit()
  })
