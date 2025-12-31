/**
 * Airdrop Command (Ink UI Version)
 * Beautiful interactive airdrop interface
 */

import { Command } from 'commander'
import React from 'react'
import { render } from 'ink'
import { Airdrop } from '../ui/commands/Airdrop.js'

export const airdropUICommand = new Command('airdrop-ui')
  .description('🪂 Claim devnet GHOST tokens (Interactive UI)')
  .option('-r, --recipient <address>', 'Recipient wallet address')
  .action(async (options) => {
    const { waitUntilExit } = render(
      React.createElement(Airdrop, {
        recipient: options.recipient,
      })
    )

    await waitUntilExit()
  })
