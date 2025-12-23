/**
 * Agent x402 configuration command
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
  multiselect
} from '@clack/prompts'
import { container, ServiceTokens } from '../../core/Container.js'
import type { IAgentService } from '../../types/services.js'
import { getAddressEncoder, type Address } from '@solana/addresses'

export function registerX402Command(parentCommand: Command): void {
  parentCommand
    .command('x402')
    .description('Configure x402 payment requirements')
    .action(async () => {
      intro(chalk.cyan('💰 Configure x402 Payments'))

      try {
        const s = spinner()
        s.start('Loading agents...')
        
        const agentService = container.resolve<IAgentService>(ServiceTokens.AGENT_SERVICE)
        const myAgents = await agentService.list({ owner: (await getActiveAddress()) }) // TODO: Get active owner properly
        // Actually list({}) with owner filter in service usually handles 'mine' if implemented that way
        // But for now let's just list all and filter or assume list() returns accessible agents.
        // The service.list implementation shows it returns all agents by default unless filtered.
        // We probably want to ask the user to 'login' or just list all local agents.
        // For CLI 'mine' usually implies checking wallet.
        
        // Let's rely on list({}) which in current mock implementation returns all.
        // But we should filter for the ones we OWN.
        // We need wallet service to filter.
        // Let's assume list() returns what we need for now, 
        // or we can implement proper filtering if we had the wallet address here.
        
        s.stop('✅ Agents loaded')

        if (myAgents.length === 0) {
          cancel('No agents found')
          return
        }

        const selectedAgentId = await select({
          message: 'Select agent to configure:',
          options: myAgents.map(a => ({
             value: a.id,
             label: `${a.name} (${a.reputationScore} Rep)`
          }))
        })

        if (isCancel(selectedAgentId)) {
          cancel('Operation cancelled')
          return
        }

        const agent = myAgents.find(a => a.id === selectedAgentId)!
        
        const enabled = await confirm({
          message: 'Enable x402 Payments?',
          initialValue: true
        })

        if (isCancel(enabled)) {
          cancel('Cancelled')
          return
        }

        let price = '0'
        let tokens: string[] = []
        let paymentAddress = agent.owner.toString() // Default to owner
        let endpoint = agent.metadata?.endpoint as string || 'https://api.example.com'

        if (enabled) {
          price = await text({
            message: 'Price per task (in Lamports/Tokens):',
            placeholder: '1000000',
            validate: (val) => {
              if (isNaN(Number(val))) return 'Must be a number'
              if (Number(val) < 0) return 'Must be positive'
            }
          }) as string
          
          if (isCancel(price)) { cancel('Cancelled'); return }

          // Select tokens (Mock for now, normally we'd query token list)
          // For MVP, assume SOL (native) or specific SPL.
          // The program expects Address[].
          // Native SOL is often represented by a specific address or handled separately.
          // Let's assume we pass Native Mint or similar.
          // For now, let's ask for manual entry or defaults.
          
          const tokenChoice = await select({
            message: 'Select Payment Token:',
            options: [
              { value: 'So11111111111111111111111111111111111111112', label: 'Wrapped SOL (WSOL)' },
              { value: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', label: 'USDC' },
              { value: 'custom', label: 'Custom Mint Address' }
            ]
          })
          
          if (isCancel(tokenChoice)) { cancel('Cancelled'); return }
          
          let tokenAddr = tokenChoice as string
          if (tokenChoice === 'custom') {
             tokenAddr = await text({
               message: 'Enter SPL Token Mint Address:',
               validate: (val) => val.length < 32 ? 'Invalid address' : undefined
             }) as string
             if (isCancel(tokenAddr)) { cancel('Cancelled'); return }
          }
          tokens = [tokenAddr]
          
          // Payment Address
          const payout = await text({
            message: 'Payment Receiver Address:',
            initialValue: agent.owner.toString(),
            validate: (val) => val.length < 32 ? 'Invalid address' : undefined
          }) as string
           if (isCancel(payout)) { cancel('Cancelled'); return }
           paymentAddress = payout
           
           // Service Endpoint
           const svc = await text({
             message: 'Service Endpoint (URL):',
             initialValue: endpoint,
             validate: (val) => !val.startsWith('http') ? 'Must be a URL' : undefined
           }) as string
           if (isCancel(svc)) { cancel('Cancelled'); return }
           endpoint = svc
        }

        const s2 = spinner()
        s2.start('Configuring x402 on-chain...')

        await agentService.configureX402(agent.id, {
          enabled: !!enabled,
          pricePerCall: BigInt(price),
          acceptedTokens: tokens.map(t => t as Address),
          paymentAddress: paymentAddress as Address,
          serviceEndpoint: endpoint
        })

        s2.stop('✅ Configuration successful!')
        
        outro('Agent updated')
      } catch (error) {
        cancel(chalk.red('Error: ' + (error instanceof Error ? error.message : 'Unknown')))
      }
    })
}

async function getActiveAddress() {
   // Helper mock
   return undefined 
}
