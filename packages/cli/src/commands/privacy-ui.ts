/**
 * Privacy Command (Ink UI Version)
 * Interactive privacy settings manager
 */

import { Command } from 'commander'
import React from 'react'
import { render } from 'ink'
import { Privacy } from '../ui/commands/Privacy.js'

export const privacyUICommand = new Command('privacy-ui')
  .description('🔒 Interactive privacy settings manager')
  .option('-a, --agent <address>', 'Agent address')
  .action(async (options) => {
    const { waitUntilExit } = render(
      React.createElement(Privacy, {
        agent: options.agent,
      })
    )

    await waitUntilExit()
  })
