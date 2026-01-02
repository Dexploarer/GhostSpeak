/**
 * Ghost Command (Ink UI Version)
 * Interactive Ghost agent claiming and management dashboard
 */

import { Command } from 'commander'
import React from 'react'
import { render } from 'ink'
import { Ghost } from '../ui/commands/Ghost.js'

export const ghostUICommand = new Command('ghost-ui')
  .description('👻 Interactive Ghost agent claiming dashboard')
  .option('--auto-refresh', 'Enable auto-refresh (default: true)')
  .action(async (options) => {
    const { waitUntilExit } = render(
      React.createElement(Ghost, {
        autoRefresh: options.autoRefresh !== false,
      })
    )

    await waitUntilExit()
  })
