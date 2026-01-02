/**
 * Multisig Command (Ink UI Version)
 * Interactive multisignature wallet management dashboard
 */

import { Command } from 'commander'
import React from 'react'
import { render } from 'ink'
import { Multisig } from '../ui/commands/Multisig.js'

export const multisigUICommand = new Command('multisig-ui')
  .description('🔐 Interactive multisig wallet management dashboard')
  .option('-m, --multisig <address>', 'Multisig address')
  .option('--auto-refresh', 'Enable auto-refresh (default: true)')
  .action(async (options) => {
    const { waitUntilExit } = render(
      React.createElement(Multisig, {
        multisigAddress: options.multisig,
        autoRefresh: options.autoRefresh !== false,
      })
    )

    await waitUntilExit()
  })
