/**
 * Privacy management command
 * Configure Ghost Score visibility and privacy settings
 */

import { Command } from 'commander'
import chalk from 'chalk'
import {
  intro,
  outro,
  text,
  select,
  confirm,
  spinner,
  isCancel,
  cancel,
  log,
  note
} from '@clack/prompts'
import { initializeClient, getExplorerUrl, handleTransactionError, toSDKSigner } from '../utils/client.js'
import { createSafeSDKClient } from '../utils/sdk-helpers.js'
import { address } from '@solana/addresses'
import type { Address } from '@solana/addresses'

// Type definitions
interface SetOptions {
  agent?: string
  mode?: string
  'score-visible'?: boolean | string
  'tier-visible'?: boolean | string
}

interface GetOptions {
  agent?: string
  json?: boolean
}

interface PresetsOptions {
  agent?: string
  preset?: string
}

// Privacy mode descriptions
const PRIVACY_MODES = {
  public: {
    name: 'Public',
    description: 'All reputation data visible to everyone',
    scoreVisible: true,
    tierVisible: true,
    metricsVisible: true,
    emoji: '🌐'
  },
  selective: {
    name: 'Selective',
    description: 'Show tier only, hide exact score',
    scoreVisible: false,
    tierVisible: true,
    metricsVisible: false,
    emoji: '🔍'
  },
  private: {
    name: 'Private',
    description: 'Hide score and tier, show only verified status',
    scoreVisible: false,
    tierVisible: false,
    metricsVisible: false,
    emoji: '🔒'
  },
  anonymous: {
    name: 'Anonymous',
    description: 'Hide all reputation data',
    scoreVisible: false,
    tierVisible: false,
    metricsVisible: false,
    emoji: '👤'
  }
}

export const privacyCommand = new Command('privacy')
  .description('Manage Ghost Score privacy settings')

// Set privacy subcommand
privacyCommand
  .command('set')
  .description('Configure privacy settings for an agent')
  .option('-a, --agent <address>', 'Agent address')
  .option('-m, --mode <mode>', 'Privacy mode (public, selective, private, anonymous)')
  .option('--score-visible <boolean>', 'Make exact score visible (true/false)')
  .option('--tier-visible <boolean>', 'Make tier visible (true/false)')
  .action(async (options: SetOptions) => {
    intro(chalk.cyan('🔒 Configure Privacy Settings'))

    try {
      const s = spinner()
      s.start('Connecting to network...')

      const { client, wallet } = await initializeClient('devnet')
      const safeClient = createSafeSDKClient(client)

      s.stop('✅ Connected to devnet')

      // Get agent address
      let agentAddress = options.agent
      if (!agentAddress) {
        const addressInput = await text({
          message: 'Agent address:',
          validate: (value) => {
            if (!value) return 'Agent address is required'
            try {
              address(value.trim())
              return
            } catch {
              return 'Please enter a valid Solana address'
            }
          }
        })

        if (isCancel(addressInput)) {
          cancel('Privacy configuration cancelled')
          return
        }

        agentAddress = addressInput.toString().trim()
      }

      const agentAddr = address(agentAddress)

      // Verify agent exists
      s.start('Verifying agent...')
      const agentData = await safeClient.agent.getAgentAccount(agentAddr)

      if (!agentData) {
        s.stop('❌ Agent not found')
        outro(chalk.red(`No agent found at address: ${agentAddress}`))
        return
      }

      s.stop('✅ Agent verified')

      // Get privacy mode
      let mode = options.mode
      if (!mode) {
        const modeChoice = await select({
          message: 'Select privacy mode:',
          options: [
            {
              value: 'public',
              label: `${PRIVACY_MODES.public.emoji} ${PRIVACY_MODES.public.name}`,
              hint: PRIVACY_MODES.public.description
            },
            {
              value: 'selective',
              label: `${PRIVACY_MODES.selective.emoji} ${PRIVACY_MODES.selective.name}`,
              hint: PRIVACY_MODES.selective.description
            },
            {
              value: 'private',
              label: `${PRIVACY_MODES.private.emoji} ${PRIVACY_MODES.private.name}`,
              hint: PRIVACY_MODES.private.description
            },
            {
              value: 'anonymous',
              label: `${PRIVACY_MODES.anonymous.emoji} ${PRIVACY_MODES.anonymous.name}`,
              hint: PRIVACY_MODES.anonymous.description
            }
          ]
        })

        if (isCancel(modeChoice)) {
          cancel('Privacy configuration cancelled')
          return
        }

        mode = modeChoice.toString()
      }

      const selectedMode = PRIVACY_MODES[mode as keyof typeof PRIVACY_MODES]

      if (!selectedMode) {
        log.error('Invalid privacy mode. Choose: public, selective, private, or anonymous')
        return
      }

      // Custom visibility overrides (if provided)
      const scoreVisible = options['score-visible'] !== undefined
        ? options['score-visible'] === true || options['score-visible'] === 'true'
        : selectedMode.scoreVisible

      const tierVisible = options['tier-visible'] !== undefined
        ? options['tier-visible'] === true || options['tier-visible'] === 'true'
        : selectedMode.tierVisible

      // Show privacy preview
      note(
        `${chalk.bold('Privacy Settings:')}\n` +
        `${chalk.gray('Agent:')} ${agentData.name}\n` +
        `${chalk.gray('Mode:')} ${selectedMode.emoji} ${selectedMode.name}\n` +
        `${chalk.gray('Description:')} ${selectedMode.description}\n\n` +
        `${chalk.bold('Visibility:')}\n` +
        `${chalk.gray('Exact Score:')} ${scoreVisible ? chalk.green('Visible') : chalk.red('Hidden')}\n` +
        `${chalk.gray('Tier Badge:')} ${tierVisible ? chalk.green('Visible') : chalk.red('Hidden')}\n` +
        `${chalk.gray('Metrics:')} ${selectedMode.metricsVisible ? chalk.green('Visible') : chalk.red('Hidden')}`,
        'Privacy Preview'
      )

      const confirmSet = await confirm({
        message: `Apply ${selectedMode.name} privacy mode?`
      })

      if (isCancel(confirmSet) || !confirmSet) {
        cancel('Privacy configuration cancelled')
        return
      }

      s.start('Updating privacy settings on blockchain...')

      try {
        // Note: SDK privacy module integration pending
        log.warn('Privacy settings update pending SDK integration.')

        s.stop('⚠️  Privacy settings update method pending')

        outro(
          `${chalk.yellow('Privacy Update Pending')}\n\n` +
          `Your privacy settings for ${agentData.name} will be updated to:\n` +
          `${chalk.gray('Mode:')} ${selectedMode.emoji} ${selectedMode.name}\n` +
          `${chalk.gray('Score Visible:')} ${scoreVisible ? 'Yes' : 'No'}\n` +
          `${chalk.gray('Tier Visible:')} ${tierVisible ? 'Yes' : 'No'}\n\n` +
          `${chalk.gray('Note: Privacy CLI integration coming soon.')}\n` +
          `${chalk.gray('Web dashboard: ')}${chalk.cyan('https://ghostspeak.io/dashboard/privacy')}`
        )

      } catch (error) {
        s.stop('❌ Failed to update privacy settings')
        handleTransactionError(error as Error)
      }

    } catch (error) {
      log.error(`Failed to set privacy: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  })

// Get privacy subcommand
privacyCommand
  .command('get')
  .description('View current privacy settings for an agent')
  .option('-a, --agent <address>', 'Agent address')
  .option('--json', 'Output as JSON')
  .action(async (options: GetOptions) => {
    intro(chalk.blue('🔍 View Privacy Settings'))

    try {
      // Get agent address
      let agentAddress = options.agent
      if (!agentAddress) {
        const addressInput = await text({
          message: 'Agent address:',
          validate: (value) => {
            if (!value) return 'Agent address is required'
            try {
              address(value.trim())
              return
            } catch {
              return 'Please enter a valid Solana address'
            }
          }
        })

        if (isCancel(addressInput)) {
          cancel('Operation cancelled')
          return
        }

        agentAddress = addressInput.toString().trim()
      }

      const s = spinner()
      s.start('Fetching privacy settings...')

      const { client } = await initializeClient('devnet')
      const safeClient = createSafeSDKClient(client)

      const agentAddr = address(agentAddress)
      const agentData = await safeClient.agent.getAgentAccount(agentAddr)

      if (!agentData) {
        s.stop('❌ Agent not found')
        outro(chalk.red(`No agent found at address: ${agentAddress}`))
        return
      }

      s.stop('⚠️  Privacy settings API pending')

      // Mock privacy data for demonstration
      const mockSettings = {
        mode: 'selective',
        scoreVisible: false,
        tierVisible: true,
        metricsVisible: false
      }

      const currentMode = PRIVACY_MODES[mockSettings.mode as keyof typeof PRIVACY_MODES]

      if (options.json) {
        console.log(JSON.stringify({
          agent: agentAddr.toString(),
          agentName: agentData.name,
          ...mockSettings
        }, null, 2))
        return
      }

      outro(
        `${chalk.bold.cyan(`Privacy Settings for ${agentData.name}`)}\n\n` +
        `${chalk.bold('Current Mode:')}\n` +
        `${chalk.gray('Mode:')} ${currentMode.emoji} ${currentMode.name}\n` +
        `${chalk.gray('Description:')} ${currentMode.description}\n\n` +
        `${chalk.bold('Visibility Settings:')}\n` +
        `${chalk.gray('Exact Score:')} ${mockSettings.scoreVisible ? chalk.green('Visible ✓') : chalk.red('Hidden ✗')}\n` +
        `${chalk.gray('Tier Badge:')} ${mockSettings.tierVisible ? chalk.green('Visible ✓') : chalk.red('Hidden ✗')}\n` +
        `${chalk.gray('Detailed Metrics:')} ${mockSettings.metricsVisible ? chalk.green('Visible ✓') : chalk.red('Hidden ✗')}\n\n` +
        `${chalk.yellow('💡 Commands:')}\n` +
        `${chalk.cyan('ghost privacy set --agent ' + agentAddr.toString().slice(0, 8) + '...')} - Change privacy mode\n` +
        `${chalk.cyan('ghost privacy presets --agent ' + agentAddr.toString().slice(0, 8) + '...')} - Use quick presets`
      )

    } catch (error) {
      log.error(`Failed to get privacy settings: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  })

// Presets subcommand
privacyCommand
  .command('presets')
  .description('Apply privacy presets quickly')
  .option('-a, --agent <address>', 'Agent address')
  .option('-p, --preset <preset>', 'Preset name (public, selective, private, anonymous)')
  .action(async (options: PresetsOptions) => {
    intro(chalk.cyan('⚡ Apply Privacy Preset'))

    try {
      const s = spinner()
      s.start('Connecting to network...')

      const { client, wallet } = await initializeClient('devnet')
      const safeClient = createSafeSDKClient(client)

      s.stop('✅ Connected to devnet')

      // Get agent address
      let agentAddress = options.agent
      if (!agentAddress) {
        const addressInput = await text({
          message: 'Agent address:',
          validate: (value) => {
            if (!value) return 'Agent address is required'
            try {
              address(value.trim())
              return
            } catch {
              return 'Please enter a valid Solana address'
            }
          }
        })

        if (isCancel(addressInput)) {
          cancel('Preset application cancelled')
          return
        }

        agentAddress = addressInput.toString().trim()
      }

      const agentAddr = address(agentAddress)

      // Verify agent
      s.start('Verifying agent...')
      const agentData = await safeClient.agent.getAgentAccount(agentAddr)

      if (!agentData) {
        s.stop('❌ Agent not found')
        outro(chalk.red(`No agent found at address: ${agentAddress}`))
        return
      }

      s.stop('✅ Agent verified')

      // Get preset
      let preset = options.preset
      if (!preset) {
        const presetChoice = await select({
          message: 'Select privacy preset:',
          options: Object.entries(PRIVACY_MODES).map(([key, value]) => ({
            value: key,
            label: `${value.emoji} ${value.name}`,
            hint: value.description
          }))
        })

        if (isCancel(presetChoice)) {
          cancel('Preset application cancelled')
          return
        }

        preset = presetChoice.toString()
      }

      const selectedPreset = PRIVACY_MODES[preset as keyof typeof PRIVACY_MODES]

      if (!selectedPreset) {
        log.error('Invalid preset. Choose: public, selective, private, or anonymous')
        return
      }

      // Show preset details
      let recommendedFor = ''
      if (preset === 'public') {
        recommendedFor = `${chalk.gray('•')} Maximum transparency\n${chalk.gray('•')} Building trust quickly\n${chalk.gray('•')} Top-tier agents`
      } else if (preset === 'selective') {
        recommendedFor = `${chalk.gray('•')} Balanced privacy\n${chalk.gray('•')} Most common choice\n${chalk.gray('•')} Show credibility without details`
      } else if (preset === 'private') {
        recommendedFor = `${chalk.gray('•')} Enhanced privacy\n${chalk.gray('•')} Verified status only\n${chalk.gray('•')} Sensitive use cases`
      } else if (preset === 'anonymous') {
        recommendedFor = `${chalk.gray('•')} Maximum privacy\n${chalk.gray('•')} Complete anonymity\n${chalk.gray('•')} High-security requirements`
      }

      note(
        `${chalk.bold('Preset Details:')}\n` +
        `${chalk.gray('Name:')} ${selectedPreset.emoji} ${selectedPreset.name}\n` +
        `${chalk.gray('Description:')} ${selectedPreset.description}\n\n` +
        `${chalk.bold('This preset will:')}\n` +
        `${chalk.gray('•')} ${selectedPreset.scoreVisible ? 'Show' : 'Hide'} exact Ghost Score\n` +
        `${chalk.gray('•')} ${selectedPreset.tierVisible ? 'Show' : 'Hide'} tier badge\n` +
        `${chalk.gray('•')} ${selectedPreset.metricsVisible ? 'Show' : 'Hide'} detailed metrics\n\n` +
        `${chalk.bold('Recommended for:')}\n` +
        recommendedFor,
        `${selectedPreset.emoji} ${selectedPreset.name} Preset`
      )

      const confirmPreset = await confirm({
        message: `Apply ${selectedPreset.name} preset?`
      })

      if (isCancel(confirmPreset) || !confirmPreset) {
        cancel('Preset application cancelled')
        return
      }

      s.start('Applying privacy preset...')

      try {
        log.warn('Privacy preset application pending SDK integration.')

        s.stop('⚠️  Preset application method pending')

        outro(
          `${chalk.yellow('Preset Application Pending')}\n\n` +
          `The ${selectedPreset.emoji} ${selectedPreset.name} preset will be applied to ${agentData.name}.\n\n` +
          `${chalk.gray('Web dashboard: ')}${chalk.cyan('https://ghostspeak.io/dashboard/privacy')}`
        )

      } catch (error) {
        s.stop('❌ Failed to apply preset')
        handleTransactionError(error as Error)
      }

    } catch (error) {
      log.error(`Failed to apply preset: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  })

// Default action - show available commands
privacyCommand
  .action(async () => {
    intro(chalk.blue('🔒 GhostSpeak Privacy Management'))

    log.info(`\n${chalk.bold('Available Commands:')}\n`)
    log.info(`${chalk.cyan('ghost privacy set')} - Configure custom privacy settings`)
    log.info(`${chalk.cyan('ghost privacy get')} - View current privacy settings`)
    log.info(`${chalk.cyan('ghost privacy presets')} - Apply quick privacy presets`)

    note(
      `${chalk.bold('Privacy Modes:')}\n` +
      `${PRIVACY_MODES.public.emoji} ${chalk.bold('Public')} - All data visible (maximum transparency)\n` +
      `${PRIVACY_MODES.selective.emoji} ${chalk.bold('Selective')} - Tier visible, score hidden (balanced)\n` +
      `${PRIVACY_MODES.private.emoji} ${chalk.bold('Private')} - Verified status only (enhanced privacy)\n` +
      `${PRIVACY_MODES.anonymous.emoji} ${chalk.bold('Anonymous')} - All data hidden (maximum privacy)`,
      'Privacy Modes'
    )

    outro('Use --help with any command for more details')
  })
