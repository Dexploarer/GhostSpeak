/**
 * DID Command (Ink UI Version)
 * Interactive DID document manager
 */

import { Command } from 'commander'
import React from 'react'
import { render } from 'ink'
import { DID } from '../ui/commands/DID.js'

export const didUICommand = new Command('did-ui')
  .description('🆔 Interactive DID document manager')
  .option('-a, --agent <address>', 'Agent address')
  .option('-d, --did <did>', 'DID identifier to resolve')
  .action(async (options) => {
    const { waitUntilExit } = render(
      React.createElement(DID, {
        agent: options.agent,
        did: options.did,
      })
    )

    await waitUntilExit()
  })
