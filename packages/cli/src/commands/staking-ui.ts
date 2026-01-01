/**
 * Staking Command (Ink UI Version)
 * Interactive GHOST token staking dashboard
 */

import { Command } from 'commander'
import React from 'react'
import { render } from 'ink'
import { Staking } from '../ui/commands/Staking.js'

export const stakingUICommand = new Command('staking-ui')
  .description('💰 Interactive GHOST token staking dashboard')
  .option('-a, --agent <address>', 'Agent address')
  .option('--auto-refresh', 'Enable auto-refresh (default: true)')
  .action(async (options) => {
    const { waitUntilExit } = render(
      React.createElement(Staking, {
        agent: options.agent,
        autoRefresh: options.autoRefresh,
      })
    )

    await waitUntilExit()
  })
