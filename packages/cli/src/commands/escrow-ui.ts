/**
 * Escrow Command (Ink UI Version)
 * Interactive escrow monitor with live updates
 */

import { Command } from 'commander'
import React from 'react'
import { render } from 'ink'
import { Escrow } from '../ui/commands/Escrow.js'

export const escrowUICommand = new Command('escrow-ui')
  .description('💼 Interactive escrow monitor with live updates')
  .option('-a, --agent <address>', 'Filter by agent address')
  .option('-s, --status <status>', 'Filter by status (pending, completed, disputed, cancelled)')
  .option('-m, --monitor', 'Enable real-time monitoring mode (default: true)')
  .action(async (options) => {
    const { waitUntilExit } = render(
      React.createElement(Escrow, {
        agent: options.agent,
        status: options.status,
        monitor: options.monitor,
      })
    )

    await waitUntilExit()
  })
