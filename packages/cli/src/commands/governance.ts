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
import type { Address } from '@solana/addresses'
import { address } from '@solana/addresses'
import type {
  CreateMultisigOptions
} from '../types/cli-types.js'

export const governanceCommand = new Command('governance')
  .description('Participate in protocol governance')

// Multisig subcommand
governanceCommand
  .command('multisig')
  .description('Manage multi-signature wallets')
  .addCommand(
    new Command('create')
      .description('Create a new multisig wallet')
      .option('-n, --name <name>', 'Multisig name')
      .option('-t, --threshold <number>', 'Required signatures')
      .action(async (_options: CreateMultisigOptions) => {
        intro(chalk.cyan('🔐 Create Multisig Wallet'))

        try {
          const multisigName = _options.name ?? await text({
            message: 'Multisig wallet name:',
            placeholder: 'GhostSpeak Treasury',
            validate: (value) => {
              if (!value || value.trim().length < 3) return 'Name must be at least 3 characters'
              if (value.length > 50) return 'Name must be less than 50 characters'
            }
          })

          if (isCancel(multisigName)) {
            cancel('Multisig creation cancelled')
            return
          }

          const description = await text({
            message: 'Multisig description:',
            placeholder: 'Treasury for managing protocol funds and major decisions',
            validate: (value) => {
              if (!value || value.trim().length < 10) return 'Description must be at least 10 characters'
              if (value.length > 200) return 'Description must be less than 200 characters'
            }
          })

          if (isCancel(description)) {
            cancel('Multisig creation cancelled')
            return
          }

          // Collect signers
          log.info('\n📝 Add signers to the multisig wallet:')
          const signers: Address[] = []
          let addingSigners = true

          while (addingSigners) {
            const signerAddress = await text({
              message: `Signer ${signers.length + 1} address:`,
              placeholder: 'FfGhMd5nwQB5dL1kMfKKo1vdpme83JMHChgSNvhiYBZ7',
              validate: (value) => {
                if (!value || value.trim().length === 0) return 'Signer address is required'
                if (value.length < 32 || value.length > 44) return 'Invalid Solana address format'
                if (signers.includes(address(value))) return 'This signer is already added'
              }
            })

            if (isCancel(signerAddress)) {
              break
            }

            signers.push(address(signerAddress))
            log.success(`✅ Added signer ${signers.length}: ${signerAddress}`)

            if (signers.length >= 10) {
              log.warn('Maximum 10 signers reached')
              addingSigners = false
            } else {
              const addMore = await confirm({
                message: 'Add another signer?'
              })

              if (isCancel(addMore) || !addMore) {
                addingSigners = false
              }
            }
          }

          if (signers.length < 2) {
            log.error('At least 2 signers are required for a multisig wallet')
            return
          }

          const threshold = _options.threshold ?? await select({
            message: 'Required signatures (threshold):',
            options: Array.from({ length: signers.length }, (_, i) => ({
              value: (i + 1).toString(),
              label: `${i + 1} of ${signers.length}`,
              hint: i + 1 === 1 ? 'Any signer can execute' : 
                    i + 1 === signers.length ? 'All signers required' :
                    `Majority of ${Math.ceil(signers.length / 2)}${i + 1 === Math.ceil(signers.length / 2) ? ' (recommended)' : ''}`
            }))
          })

          if (isCancel(threshold)) {
            cancel('Multisig creation cancelled')
            return
          }

          const thresholdNum = parseInt(threshold)

          // Multisig configuration
          const multisigType = await select({
            message: 'Multisig type:',
            options: [
              { value: 'standard', label: '🏛️ Standard Multisig', hint: 'General purpose multisig wallet' },
              { value: 'treasury', label: '💰 Treasury Multisig', hint: 'For managing protocol funds' },
              { value: 'governance', label: '⚖️ Governance Multisig', hint: 'For protocol decision making' },
              { value: 'emergency', label: '🚨 Emergency Multisig', hint: 'For emergency protocol actions' }
            ]
          })

          if (isCancel(multisigType)) {
            cancel('Multisig creation cancelled')
            return
          }

          // Time lock configuration
          const hasTimelock = await confirm({
            message: 'Enable time lock for transactions?'
          })

          let timelockDuration = 0
          if (!isCancel(hasTimelock) && hasTimelock) {
            const timelockChoice = await select({
              message: 'Time lock duration:',
              options: [
                { value: '3600', label: '1 hour', hint: 'Short delay for routine operations' },
                { value: '86400', label: '1 day', hint: 'Standard delay for most actions' },
                { value: '259200', label: '3 days', hint: 'Extended delay for major changes' },
                { value: '604800', label: '1 week', hint: 'Maximum security for critical operations' }
              ]
            })

            if (!isCancel(timelockChoice)) {
              timelockDuration = parseInt(timelockChoice)
            }
          }

          // Preview multisig configuration
          note(
            `${chalk.bold('Multisig Configuration:')}\n` +
            `${chalk.gray('Name:')} ${multisigName}\n` +
            `${chalk.gray('Type:')} ${multisigType}\n` +
            `${chalk.gray('Signers:')} ${signers.length}\n` +
            `${chalk.gray('Threshold:')} ${thresholdNum} of ${signers.length}\n` +
            `${chalk.gray('Time Lock:')} ${timelockDuration > 0 ? `${timelockDuration / 3600}h` : 'None'}\n` +
            `${chalk.gray('Description:')} ${description.substring(0, 50)}${description.length > 50 ? '...' : ''}`,
            'Multisig Preview'
          )

          const confirmCreate = await confirm({
            message: 'Create this multisig wallet?'
          })

          if (isCancel(confirmCreate) || !confirmCreate) {
            cancel('Multisig creation cancelled')
            return
          }

          const s = spinner()
          s.start('Creating multisig wallet...')
          
          const { client, wallet } = await initializeClient('devnet')
          
          try {
            const multisigParams = {
              name: multisigName,
              description,
              signers,
              threshold: thresholdNum,
              multisigType,
              timelockDuration: BigInt(timelockDuration)
            }

            // TODO: Generate proper multisig PDA
            const multisigPda = address('11111111111111111111111111111111')
            const userRegistryPda = address('11111111111111111111111111111111')
            // Acknowledge unused variables for future implementation
            void userRegistryPda
            
            const signature = await client.governance.createMultisig(
              toSDKSigner(wallet),
              multisigPda,
              multisigParams
            )

            s.stop('✅ Multisig wallet created successfully!')

            const explorerUrl = getExplorerUrl(signature, 'devnet')
            
            outro(
              `${chalk.green('🔐 Multisig Wallet Created!')}\n\n` +
              `${chalk.bold('Wallet Details:')}\n` +
              `${chalk.gray('Name:')} ${multisigName}\n` +
              `${chalk.gray('Type:')} ${multisigType}\n` +
              `${chalk.gray('Threshold:')} ${thresholdNum} of ${signers.length} signatures\n` +
              `${chalk.gray('Time Lock:')} ${timelockDuration > 0 ? `${timelockDuration / 3600} hours` : 'None'}\n\n` +
              `${chalk.bold('Transaction:')}\n` +
              `${chalk.gray('Signature:')} ${signature}\n` +
              `${chalk.gray('Explorer:')} ${explorerUrl}\n\n` +
              `${chalk.yellow('💡 Use')} ${chalk.cyan('npx ghostspeak governance multisig list')} ${chalk.yellow('to view your multisig wallets')}`
            )
            
          } catch (error) {
            s.stop('❌ Multisig creation failed')
            await handleTransactionError(error as Error)
          }
          
        } catch (error) {
          log.error(`Failed to create multisig: ${error instanceof Error ? error.message : 'Unknown error'}`)
        }
      })
  )
  .addCommand(
    new Command('list')
      .description('List multisig wallets')
      .option('--mine', 'Show only multisigs where I am a signer')
      .action(async (_options: { mine?: boolean }) => {
        intro(chalk.cyan('📋 Multisig Wallets'))

        try {
          const s = spinner()
          s.start('Loading multisig wallets...')
          
          const { client, wallet } = await initializeClient('devnet')
          
          const multisigs = _options.mine ? 
            // Filter multisigs where user is a signer (client-side filtering)
            (await client.governance.listMultisigs()).filter(m => 
              m.signers.includes(wallet.address)
            ) :
            await client.governance.listMultisigs()

          s.stop(`✅ Found ${multisigs.length} multisig wallets`)

          if (multisigs.length === 0) {
            outro(
              `${chalk.yellow('No multisig wallets found')}\n\n` +
              `${chalk.gray('Use')} ${chalk.cyan('npx ghostspeak governance multisig create')} ${chalk.gray('to create one')}`
            )
            return
          }

          log.info(`\n${chalk.bold('Multisig Wallets:')}\n`)
          
          multisigs.forEach((multisig, index) => {
            const balanceSOL = (Number(multisig.balance ?? 0) / 1_000_000_000).toFixed(3)
            const isSigner = multisig.signers.includes(wallet.address)
            
            log.info(
              `${chalk.bold(`${index + 1}. ${multisig.name}`)} ${isSigner ? '👤' : ''}\n` +
              `   ${chalk.gray('Type:')} ${multisig.multisigType}\n` +
              `   ${chalk.gray('Threshold:')} ${multisig.threshold} of ${multisig.signers.length}\n` +
              `   ${chalk.gray('Balance:')} ${balanceSOL} SOL\n` +
              `   ${chalk.gray('Pending Transactions:')} ${multisig.pendingTransactions ?? 0}\n` +
              `   ${chalk.gray('Time Lock:')} ${multisig.timelockDuration && Number(multisig.timelockDuration) > 0 ? `${Number(multisig.timelockDuration) / 3600}h` : 'None'}\n`
            )
          })

          outro(
            `${chalk.yellow('💡 Commands:')}\n` +
            `${chalk.cyan('npx ghostspeak governance proposal create')} - Create governance proposal\n` +
            `${chalk.cyan('npx ghostspeak governance vote')} - Vote on proposals`
          )
          
        } catch (error) {
          log.error(`Failed to load multisig wallets: ${error instanceof Error ? error.message : 'Unknown error'}`)
        }
      })
  )

// Proposal subcommand
governanceCommand
  .command('proposal')
  .description('Manage governance proposals')
  .addCommand(
    new Command('create')
      .description('Create a governance proposal')
      .option('-t, --title <title>', 'Proposal title')
      .option('-c, --category <category>', 'Proposal category')
      .action(async (_options) => {
        intro(chalk.cyan('📝 Create Governance Proposal'))

        try {
          const proposalTitle = _options.title ?? await text({
            message: 'Proposal title:',
            placeholder: 'Increase marketplace fee to 2.5%',
            validate: (value) => {
              if (!value || value.trim().length < 10) return 'Title must be at least 10 characters'
              if (value.length > 100) return 'Title must be less than 100 characters'
            }
          })

          if (isCancel(proposalTitle)) {
            cancel('Proposal creation cancelled')
            return
          }

          const proposalCategory = _options.category ?? await select({
            message: 'Proposal category:',
            options: [
              { value: 'parameter', label: '⚙️ Parameter Change', hint: 'Modify protocol parameters' },
              { value: 'feature', label: '✨ New Feature', hint: 'Add new protocol functionality' },
              { value: 'treasury', label: '💰 Treasury Management', hint: 'Manage protocol funds' },
              { value: 'emergency', label: '🚨 Emergency Action', hint: 'Urgent protocol fix' },
              { value: 'upgrade', label: '🔄 Protocol Upgrade', hint: 'Smart contract upgrades' },
              { value: 'policy', label: '📋 Policy Change', hint: 'Governance policy updates' }
            ]
          })

          if (isCancel(proposalCategory)) {
            cancel('Proposal creation cancelled')
            return
          }

          const proposalDescription = await text({
            message: 'Detailed proposal description:',
            placeholder: 'This proposal aims to increase the marketplace fee from 2% to 2.5% to better fund protocol development...',
            validate: (value) => {
              if (!value || value.trim().length < 50) return 'Description must be at least 50 characters'
              if (value.length > 2000) return 'Description must be less than 2000 characters'
            }
          })

          if (isCancel(proposalDescription)) {
            cancel('Proposal creation cancelled')
            return
          }

          // Rationale
          const proposalRationale = await text({
            message: 'Rationale (why is this change needed?):',
            placeholder: 'Current fees are insufficient to cover development costs and infrastructure...',
            validate: (value) => {
              if (!value || value.trim().length < 30) return 'Rationale must be at least 30 characters'
              if (value.length > 1000) return 'Rationale must be less than 1000 characters'
            }
          })

          if (isCancel(proposalRationale)) {
            cancel('Proposal creation cancelled')
            return
          }

          // Voting duration
          const votingDuration = await select({
            message: 'Voting duration:',
            options: [
              { value: '259200', label: '3 days', hint: 'Quick decisions' },
              { value: '604800', label: '1 week', hint: 'Standard voting period' },
              { value: '1209600', label: '2 weeks', hint: 'Extended discussion time' },
              { value: '2592000', label: '1 month', hint: 'Major protocol changes' }
            ]
          })

          if (isCancel(votingDuration)) {
            cancel('Proposal creation cancelled')
            return
          }

          // Execution parameters
          const requiresExecution = await confirm({
            message: 'Does this proposal require automatic execution after passing?'
          })

          let executionDelay = 0
          if (!isCancel(requiresExecution) && requiresExecution) {
            const delayChoice = await select({
              message: 'Execution delay after voting ends:',
              options: [
                { value: '0', label: 'Immediate', hint: 'Execute immediately after voting' },
                { value: '86400', label: '1 day', hint: 'Allow time for final review' },
                { value: '259200', label: '3 days', hint: 'Extended delay for major changes' },
                { value: '604800', label: '1 week', hint: 'Maximum security delay' }
              ]
            })

            if (!isCancel(delayChoice)) {
              executionDelay = parseInt(delayChoice)
            }
          }

          // Quorum requirement
          const quorumThreshold = await select({
            message: 'Minimum participation (quorum):',
            options: [
              { value: '10', label: '10%', hint: 'Low participation requirement' },
              { value: '25', label: '25%', hint: 'Standard quorum' },
              { value: '50', label: '50%', hint: 'High participation requirement' },
              { value: '67', label: '67%', hint: 'Supermajority quorum' }
            ]
          })

          if (isCancel(quorumThreshold)) {
            cancel('Proposal creation cancelled')
            return
          }

          // Approval threshold
          const approvalThreshold = await select({
            message: 'Approval threshold:',
            options: [
              { value: '50', label: 'Simple Majority (>50%)', hint: 'Standard democratic vote' },
              { value: '60', label: 'Qualified Majority (60%)', hint: 'Enhanced consensus' },
              { value: '67', label: 'Supermajority (67%)', hint: 'Strong consensus required' },
              { value: '75', label: 'Three-quarters (75%)', hint: 'Very high consensus' }
            ]
          })

          if (isCancel(approvalThreshold)) {
            cancel('Proposal creation cancelled')
            return
          }

          // Supporting documentation
          const hasDocumentation = await confirm({
            message: 'Do you have supporting documentation (links, research, specs)?'
          })

          let documentation = []
          if (!isCancel(hasDocumentation) && hasDocumentation) {
            let addingDocs = true
            while (addingDocs && documentation.length < 5) {
              const docItem = await text({
                message: `Documentation ${documentation.length + 1} (URL or description):`,
                placeholder: 'https://research.ghostspeak.com/fee-analysis.pdf',
                validate: (value) => {
                  if (!value || value.trim().length < 10) return 'Please provide at least 10 characters'
                  if (value.length > 200) return 'Documentation link must be less than 200 characters'
                }
              })

              if (isCancel(docItem)) {
                break
              }

              documentation.push(docItem)

              const addMore = await confirm({
                message: 'Add more documentation?'
              })

              if (isCancel(addMore) || !addMore) {
                addingDocs = false
              }
            }
          }

          // Preview proposal
          note(
            `${chalk.bold('Proposal Preview:')}\n` +
            `${chalk.gray('Title:')} ${proposalTitle}\n` +
            `${chalk.gray('Category:')} ${proposalCategory}\n` +
            `${chalk.gray('Voting Duration:')} ${parseInt(votingDuration) / 86400} days\n` +
            `${chalk.gray('Quorum:')} ${quorumThreshold}%\n` +
            `${chalk.gray('Approval:')} ${approvalThreshold}%\n` +
            `${chalk.gray('Auto-execute:')} ${requiresExecution ? 'Yes' : 'No'}\n` +
            `${chalk.gray('Documentation:')} ${documentation.length} items\n` +
            `${chalk.gray('Description:')} ${proposalDescription.substring(0, 100)}${proposalDescription.length > 100 ? '...' : ''}`,
            'Proposal Details'
          )

          const confirmCreate = await confirm({
            message: 'Submit this proposal for voting?'
          })

          if (isCancel(confirmCreate) || !confirmCreate) {
            cancel('Proposal creation cancelled')
            return
          }

          const s = spinner()
          s.start('Creating governance proposal...')
          
          const { client, wallet } = await initializeClient('devnet')
          
          try {
            const proposalParams = {
              title: proposalTitle,
              description: proposalDescription,
              category: proposalCategory,
              rationale: proposalRationale,
              votingDuration: BigInt(parseInt(votingDuration)),
              executionDelay: BigInt(executionDelay),
              quorumThreshold: parseInt(quorumThreshold),
              approvalThreshold: parseInt(approvalThreshold),
              requiresExecution,
              documentation
            }

            // TODO: Generate proper proposal PDA
            const proposalPda = address('11111111111111111111111111111111')
            const multisigPda = address('11111111111111111111111111111111')
            // Acknowledge unused variable for future implementation
            void multisigPda
            
            const signature = await client.governance.createProposal(
              toSDKSigner(wallet),
              proposalPda,
              proposalParams
            )

            s.stop('✅ Proposal created successfully!')

            const explorerUrl = getExplorerUrl(signature, 'devnet')
            
            outro(
              `${chalk.green('📝 Governance Proposal Created!')}\n\n` +
              `${chalk.bold('Proposal Details:')}\n` +
              `${chalk.gray('Title:')} ${proposalTitle}\n` +
              `${chalk.gray('Category:')} ${proposalCategory}\n` +
              `${chalk.gray('Voting Period:')} ${parseInt(votingDuration) / 86400} days\n` +
              `${chalk.gray('Status:')} ${chalk.yellow('Active Voting')}\n\n` +
              `${chalk.bold('Transaction:')}\n` +
              `${chalk.gray('Signature:')} ${signature}\n` +
              `${chalk.gray('Explorer:')} ${explorerUrl}\n\n` +
              `${chalk.yellow('💡 Share your proposal with the community!')}\n` +
              `${chalk.cyan('npx ghostspeak governance proposal list')} - View all proposals\n` +
              `${chalk.cyan('npx ghostspeak governance vote')} - Cast your vote`
            )
            
          } catch (error) {
            s.stop('❌ Proposal creation failed')
            await handleTransactionError(error as Error)
          }
          
        } catch (error) {
          log.error(`Failed to create proposal: ${error instanceof Error ? error.message : 'Unknown error'}`)
        }
      })
  )
  .addCommand(
    new Command('list')
      .description('List governance proposals')
      .option('-s, --status <status>', 'Filter by status (active, passed, failed, executed)')
      .option('-c, --category <category>', 'Filter by category')
      .action(async (options) => {
        intro(chalk.cyan('📋 Governance Proposals'))

        try {
          const s = spinner()
          s.start('Loading proposals...')
          
          const { client, wallet } = await initializeClient('devnet')
          // Acknowledge unused wallet for future implementation  
          void wallet
          
          const proposals = await client.governance.listProposals({
            status: options.status,
            category: options.category
          })

          s.stop(`✅ Found ${proposals.length} proposals`)

          if (proposals.length === 0) {
            outro(
              `${chalk.yellow('No proposals found')}\n\n` +
              `${chalk.gray('Use')} ${chalk.cyan('npx ghostspeak governance proposal create')} ${chalk.gray('to create one')}`
            )
            return
          }

          log.info(`\n${chalk.bold('Governance Proposals:')}\n`)
          
          proposals.forEach((proposal, index) => {
            const statusColor = 
              proposal.status.toString() === 'passed' ? chalk.green :
              proposal.status.toString() === 'failed' ? chalk.red :
              proposal.status.toString() === 'executed' ? chalk.blue :
              chalk.yellow

            const timeLeft = Number(proposal.votingEndsAt ?? 0) - Math.floor(Date.now() / 1000)
            const daysLeft = Math.max(0, Math.floor(timeLeft / 86400))
            const hoursLeft = Math.max(0, Math.floor((timeLeft % 86400) / 3600))

            const participation = proposal.totalVotes > 0 ? 
              ((Number(proposal.totalVotes) / Number(proposal.eligibleVoters ?? 1)) * 100).toFixed(1) : '0'

            const approval = proposal.totalVotes > 0 ? 
              ((Number(proposal.yesVotes ?? 0) / Number(proposal.totalVotes)) * 100).toFixed(1) : '0'

            log.info(
              `${chalk.bold(`${index + 1}. ${proposal.title}`)} [${(proposal.category ?? 'general').toUpperCase()}]\n` +
              `   ${chalk.gray('Status:')} ${statusColor(proposal.status.toString().toUpperCase())}\n` +
              `   ${chalk.gray('Participation:')} ${participation}% (${proposal.totalVotes} votes)\n` +
              `   ${chalk.gray('Approval:')} ${approval}% yes votes\n` +
              `   ${chalk.gray('Time Left:')} ${timeLeft > 0 ? `${daysLeft}d ${hoursLeft}h` : 'Voting ended'}\n` +
              `   ${chalk.gray('Proposer:')} ${proposal.proposer}\n`
            )
          })

          outro(
            `${chalk.yellow('💡 Commands:')}\n` +
            `${chalk.cyan('npx ghostspeak governance vote')} - Vote on proposals\n` +
            `${chalk.cyan('npx ghostspeak governance proposal create')} - Create new proposal`
          )
          
        } catch (error) {
          log.error(`Failed to load proposals: ${error instanceof Error ? error.message : 'Unknown error'}`)
        }
      })
  )

// Vote subcommand
governanceCommand
  .command('vote')
  .description('Vote on governance proposals')
  .option('-p, --proposal <id>', 'Proposal ID to vote on')
  .action(async (options) => {
    intro(chalk.cyan('🗳️ Cast Vote'))

    try {
      const s = spinner()
      s.start('Loading active proposals...')
      
      const { client, wallet } = await initializeClient('devnet')
      // Acknowledge unused wallet for future implementation
      void wallet
      
      const proposals = await client.governance.listProposals({ status: 'active' })
      s.stop(`✅ Found ${proposals.length} active proposals`)

      if (proposals.length === 0) {
        outro(
          `${chalk.yellow('No active proposals to vote on')}\n\n` +
          `${chalk.gray('Check back later or create a proposal with')}\n` +
          `${chalk.cyan('npx ghostspeak governance proposal create')}`
        )
        return
      }

      // Select proposal if not provided
      let selectedProposal = options.proposal
      if (!selectedProposal) {
        const proposalChoice = await select({
          message: 'Select proposal to vote on:',
          options: proposals.map(proposal => {
            const timeLeft = Number(proposal.votingEndsAt ?? 0) - Math.floor(Date.now() / 1000)
            const daysLeft = Math.floor(timeLeft / 86400)
            const participation = proposal.totalVotes > 0 ? 
              ((Number(proposal.totalVotes) / Number(proposal.eligibleVoters ?? 1)) * 100).toFixed(1) : '0'
            
            return {
              value: proposal.id,
              label: `${proposal.title}`,
              hint: `${daysLeft}d left, ${participation}% participation`
            }
          })
        })

        if (isCancel(proposalChoice)) {
          cancel('Voting cancelled')
          return
        }

        selectedProposal = proposalChoice
      }

      const proposal = proposals.find(p => p.id === selectedProposal)
      if (!proposal) {
        log.error('Proposal not found or not active')
        return
      }

      // Note: Voting status check not implemented in SDK yet
      // In production, this would check if user has already voted

      // Display proposal details
      log.info(`\n${chalk.bold('📋 Proposal Details:')}\n`)
      log.info(
        `${chalk.gray('Title:')} ${proposal.title}\n` +
        `${chalk.gray('Category:')} ${proposal.category}\n` +
        `${chalk.gray('Proposer:')} ${proposal.proposer}\n` +
        `${chalk.gray('Description:')} ${proposal.description}\n` +
        `${chalk.gray('Rationale:')} ${proposal.rationale}\n`
      )

      // Current voting statistics
      const participation = proposal.totalVotes > 0 ? 
        ((proposal.totalVotes / proposal.eligibleVoters) * 100).toFixed(1) : '0'
      const approval = proposal.totalVotes > 0 ? 
        ((proposal.yesVotes / proposal.totalVotes) * 100).toFixed(1) : '0'

      log.info(`\n${chalk.bold('📊 Current Results:')}\n`)
      log.info(
        `${chalk.gray('Yes Votes:')} ${proposal.yesVotes} (${approval}%)\n` +
        `${chalk.gray('No Votes:')} ${proposal.noVotes}\n` +
        `${chalk.gray('Abstain:')} ${proposal.abstainVotes}\n` +
        `${chalk.gray('Participation:')} ${participation}% (${proposal.totalVotes}/${proposal.eligibleVoters})\n` +
        `${chalk.gray('Quorum Required:')} ${proposal.quorumThreshold}%\n` +
        `${chalk.gray('Approval Required:')} ${proposal.approvalThreshold}%\n`
      )

      // Voting power information (simplified for now)
      const votingPower = {
        tokenBalance: 1000000000n, // 1 SOL equivalent for demo
        delegated: 0n,
        total: 1000000000n
      }
      log.info(`\n${chalk.bold('🗳️ Your Voting Power:')}\n`)
      log.info(
        `${chalk.gray('Token Balance:')} ${(Number(votingPower.tokenBalance) / 1_000_000_000).toFixed(3)}\n` +
        `${chalk.gray('Delegated to You:')} ${(Number(votingPower.delegated) / 1_000_000_000).toFixed(3)}\n` +
        `${chalk.gray('Total Voting Power:')} ${(Number(votingPower.total) / 1_000_000_000).toFixed(3)}\n`
      )

      // Cast vote
      const vote = await select({
        message: 'How do you vote on this proposal?',
        options: [
          { value: 'yes', label: '✅ YES', hint: 'Vote in favor of the proposal' },
          { value: 'no', label: '❌ NO', hint: 'Vote against the proposal' },
          { value: 'abstain', label: '🤷 ABSTAIN', hint: 'Participate without taking a position' }
        ]
      })

      if (isCancel(vote)) {
        cancel('Voting cancelled')
        return
      }

      // Optional voting comment
      const addComment = await confirm({
        message: 'Would you like to add a comment explaining your vote?'
      })

      let voteComment = ''
      if (!isCancel(addComment) && addComment) {
        const comment = await text({
          message: 'Vote comment (optional):',
          placeholder: 'I support this proposal because...',
          validate: (value) => {
            if (value && value.length > 300) return 'Comment must be less than 300 characters'
          }
        })

        if (isCancel(comment)) {
          voteComment = ''
        } else {
          voteComment = comment as string
        }
      }

      // Confirm vote
      const voteColor = vote === 'yes' ? chalk.green : vote === 'no' ? chalk.red : chalk.yellow
      
      note(
        `${chalk.bold('Vote Confirmation:')}\n` +
        `${chalk.gray('Proposal:')} ${proposal.title}\n` +
        `${chalk.gray('Your Vote:')} ${voteColor(vote.toUpperCase())}\n` +
        `${chalk.gray('Voting Power:')} ${(Number(votingPower.total) / 1_000_000_000).toFixed(3)}\n` +
        `${chalk.gray('Comment:')} ${voteComment ?? 'None'}`,
        'Confirm Vote'
      )

      const confirmVote = await confirm({
        message: `Cast ${vote.toUpperCase()} vote?`
      })

      if (isCancel(confirmVote) || !confirmVote) {
        cancel('Voting cancelled')
        return
      }

      s.start('Submitting vote to blockchain...')
      
      try {
        const voteParams = {
          vote,
          comment: voteComment,
          votingPower: votingPower.total
        }
        // Acknowledge voteParams for future implementation
        void voteParams

        // Note: Voting functionality not implemented in SDK yet
        // This would call the vote instruction on the governance program
        throw new Error('Voting functionality is not yet implemented in the SDK. This will be available in a future release.')

        s.stop('✅ Vote cast successfully!')

        const explorerUrl = getExplorerUrl(signature, 'devnet')
        
        outro(
          `${chalk.green('🗳️ Vote Cast Successfully!')}\n\n` +
          `${chalk.bold('Vote Details:')}\n` +
          `${chalk.gray('Proposal:')} ${proposal.title}\n` +
          `${chalk.gray('Your Vote:')} ${voteColor(vote.toUpperCase())}\n` +
          `${chalk.gray('Voting Power:')} ${(Number(votingPower.total) / 1_000_000_000).toFixed(3)}\n\n` +
          `${chalk.bold('Transaction:')}\n` +
          `${chalk.gray('Signature:')} ${signature}\n` +
          `${chalk.gray('Explorer:')} ${explorerUrl}\n\n` +
          `${chalk.yellow('💡 Thank you for participating in governance!')}\n` +
          `${chalk.cyan('npx ghostspeak governance proposal list')} - View voting results`
        )
        
      } catch (error) {
        s.stop('❌ Vote submission failed')
        await handleTransactionError(error as Error)
      }
      
    } catch (error) {
      log.error(`Failed to cast vote: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  })

// RBAC subcommand
governanceCommand
  .command('rbac')
  .description('Manage role-based access control')
  .addCommand(
    new Command('init')
      .description('Initialize RBAC system')
      .action(async () => {
        intro(chalk.cyan('🔐 Initialize RBAC'))

        try {
          const s = spinner()
          s.start('Initializing role-based access control...')
          
          const { client, wallet } = await initializeClient('devnet')
          
          const signature = await client.governance.initializeRbac(wallet)

          s.stop('✅ RBAC initialized successfully!')

          const explorerUrl = getExplorerUrl(signature, 'devnet')
          
          outro(
            `${chalk.green('🔐 RBAC System Initialized!')}\n\n` +
            `${chalk.bold('Transaction:')}\n` +
            `${chalk.gray('Signature:')} ${signature}\n` +
            `${chalk.gray('Explorer:')} ${explorerUrl}\n\n` +
            `${chalk.yellow('💡 You can now assign roles and permissions')}`
          )
          
        } catch (error) {
          log.error(`Failed to initialize RBAC: ${error instanceof Error ? error.message : 'Unknown error'}`)
        }
      })
  )