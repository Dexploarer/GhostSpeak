/**
 * Dashboard command
 * Master analytics dashboard with overview of all metrics
 */

import { Command } from 'commander'
import React from 'react'
import { render } from 'ink'
import { Dashboard } from '../ui/commands/Dashboard.js'

export const dashboardCommand = new Command('dashboard')
  .description('📊 Analytics dashboard with overview of all metrics')
  .option('-a, --agent <address>', 'Agent address')
  .option('--no-auto-refresh', 'Disable auto-refresh')
  .action(async (options) => {
    const { waitUntilExit } = render(
      React.createElement(Dashboard, {
        agent: options.agent,
        autoRefresh: options.autoRefresh
      })
    )
    await waitUntilExit()
  })
