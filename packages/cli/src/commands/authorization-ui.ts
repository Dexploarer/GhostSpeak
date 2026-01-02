/**
 * Authorization Command (Ink UI Version)
 * Interactive pre-authorization management dashboard
 */

import { Command } from 'commander'
import React from 'react'
import { render } from 'ink'
import { Authorization } from '../ui/commands/Authorization.js'

export const authorizationUICommand = new Command('authorization-ui')
  .alias('auth-ui')
  .description('🔑 Interactive pre-authorization management dashboard')
  .option('-a, --agent <address>', 'Agent address')
  .option('--auto-refresh', 'Enable auto-refresh (default: true)')
  .action(async (options) => {
    const { waitUntilExit } = render(
      React.createElement(Authorization, {
        agentAddress: options.agent,
        autoRefresh: options.autoRefresh !== false,
      })
    )

    await waitUntilExit()
  })
