import { Command } from 'commander'
import chalk from 'chalk'
import {
  intro,
  outro,
  select,
  confirm,
  spinner,
  isCancel,
  cancel,
  log,
  note
} from '@clack/prompts'
import { initializeClient, getExplorerUrl, toSDKSigner } from '../../utils/client.js'
import { handleError } from '../../utils/error-handler.js'
import { createSafeSDKClient } from '../../utils/sdk-helpers.js'
import { address } from '@solana/addresses'
import type { VoteOptions } from './types.js'

export const voteCommand = new Command('vote')
  .description('Vote on governance proposals')
  .option('-p, --proposal <address>', 'Proposal address')
  .option('-c, --choice <choice>', 'Vote choice (yes, no, abstain)')
  .action(async (options: VoteOptions) => {
    intro(chalk.yellow('Vote on Proposal'))

    try {
      const s = spinner()
      s.start('Loading active proposals...')

      const { client, wallet } = await initializeClient('devnet')
      const safeClient = createSafeSDKClient(client)

      // Get all proposals (SDK doesn't support filtering by participant)
      const proposals = await safeClient.governance.listProposals()

      s.stop(`Found ${proposals.length} active proposals`)

      if (proposals.length === 0) {
        outro('No active proposals found to vote on')
        return
      }

      // Select proposal
      let selectedProposal = options.proposal
      if (!selectedProposal) {
        const proposalChoice = await select({
          message: 'Select proposal to vote on:',
          options: proposals.map(proposal => ({
            value: proposal.address,
            label: proposal.title,
            hint: `${proposal.type} - ${proposal.votesFor ?? 0} yes, ${proposal.votesAgainst ?? 0} no`
          }))
        })

        if (isCancel(proposalChoice)) {
          cancel('Voting cancelled')
          return
        }

        selectedProposal = proposalChoice.toString()
      }

      const proposal = proposals.find(p => p.address === selectedProposal)
      if (!proposal) {
        log.error('Proposal not found or not active')
        return
      }

      // Get vote choice
      let choice = options.choice
      if (!choice) {
        const voteChoice = await select({
          message: 'How do you vote?',
          options: [
            { value: 'yes', label: 'Yes (Approve)', hint: 'Vote in favor of the proposal' },
            { value: 'no', label: 'No (Reject)', hint: 'Vote against the proposal' },
            { value: 'abstain', label: 'Abstain', hint: 'Do not vote either way' }
          ]
        })

        if (isCancel(voteChoice)) {
          cancel('Voting cancelled')
          return
        }

        choice = voteChoice as 'yes' | 'no' | 'abstain'
      }

      // Show voting preview
      note(
        `${chalk.bold('Vote Details:')}\n` +
        `${chalk.gray('Proposal:')} ${proposal.title}\n` +
        `${chalk.gray('Type:')} ${proposal.type.toUpperCase()}\n` +
        `${chalk.gray('Your Vote:')} ${choice.toUpperCase()}\n` +
        `${chalk.gray('Current Votes:')} ${proposal.votesFor ?? 0} yes, ${proposal.votesAgainst ?? 0} no\n` +
        `${chalk.gray('Required:')} ${proposal.threshold} votes to pass`,
        'Vote Confirmation'
      )

      const confirmVote = await confirm({
        message: `Cast your vote as "${choice.toUpperCase()}"?`
      })

      if (isCancel(confirmVote) || !confirmVote) {
        cancel('Voting cancelled')
        return
      }

      s.start('Casting vote on blockchain...')

      try {
        const signature = await safeClient.governance.vote(toSDKSigner(wallet), {
          proposal: address(selectedProposal!),
          vote: choice as 'yes' | 'no' | 'abstain'
        })

        if (!signature) {
          throw new Error('Failed to get transaction signature')
        }

        s.stop('Vote cast successfully!')

        const explorerUrl = getExplorerUrl(signature, 'devnet')

        outro(
          `${chalk.green('Vote Cast Successfully!')}\n\n` +
          `${chalk.bold('Vote Details:')}\n` +
          `${chalk.gray('Proposal:')} ${proposal.title}\n` +
          `${chalk.gray('Your Vote:')} ${choice.toUpperCase()}\n` +
          `${chalk.gray('Status:')} Recorded on blockchain\n\n` +
          `${chalk.bold('Transaction:')}\n` +
          `${chalk.gray('Signature:')} ${signature}\n` +
          `${chalk.gray('Explorer:')} ${explorerUrl}\n\n` +
          `${chalk.yellow('Your vote is now part of the governance process!')}`
        )

      } catch (error) {
        s.stop('Failed to cast vote')
        handleError(error)
      }

    } catch (error) {
      log.error(`Failed to vote: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  })
