/**
 * Command aliases for improved UX
 * Provides short forms and natural language command mapping
 */

export interface CommandAlias {
  aliases: string[]
  command: string
  description: string
}

export const COMMAND_ALIASES: CommandAlias[] = [
  // Agent commands
  {
    aliases: ['a r', 'ar', 'register'],
    command: 'agent register',
    description: 'Register a new agent'
  },
  {
    aliases: ['a l', 'al', 'agents'],
    command: 'agent list',
    description: 'List your agents'
  },
  {
    aliases: ['a s', 'as'],
    command: 'agent status',
    description: 'Check agent status'
  },
  
  // Wallet commands
  {
    aliases: ['w', 'balance', 'bal'],
    command: 'wallet balance',
    description: 'Check wallet balance'
  },
  {
    aliases: ['wl', 'wallets'],
    command: 'wallet list',
    description: 'List all wallets'
  },
  {
    aliases: ['wc', 'new-wallet'],
    command: 'wallet create',
    description: 'Create new wallet'
  },

  // Quick actions
  {
    aliases: ['f', 'fund', 'airdrop'],
    command: 'faucet --save',
    description: 'Get SOL from faucet'
  },
  {
    aliases: ['qs', 'quick', 'start'],
    command: 'quickstart',
    description: 'Quick start setup'
  },
  {
    aliases: ['i', 'menu'],
    command: '--interactive',
    description: 'Interactive menu mode'
  },
  {
    aliases: ['cfg', 'configure'],
    command: 'config setup',
    description: 'Configure CLI'
  },
  {
    aliases: ['h', '?'],
    command: '--help',
    description: 'Show help'
  },
  
  // Common workflows
  {
    aliases: ['setup-agent'],
    command: 'quickstart new',
    description: 'Complete agent setup'
  },
  // my-services, my-jobs REMOVED
  {
    aliases: ['transactions'],
    command: 'tx',
    description: 'View transaction history'
  }
]

/**
 * Natural language command mappings
 */
export const NATURAL_LANGUAGE_PATTERNS: Array<{
  patterns: RegExp[]
  command: string
  extractor?: (match: RegExpMatchArray) => Record<string, string>
}> = [
  // Agent operations
  {
    patterns: [
      /create.*(agent|ai)/i,
      /register.*(agent|ai)/i,
      /new.*(agent|ai)/i
    ],
    command: 'agent register'
  },
  {
    patterns: [
      /list.*agents?/i,
      /show.*agents?/i,
      /my agents?/i
    ],
    command: 'agent list'
  },
  
  // Wallet operations
  {
    patterns: [
      /check.*balance/i,
      /wallet.*balance/i,
      /how much.*sol/i,
      /show.*balance/i
    ],
    command: 'wallet balance'
  },
  {
    patterns: [
      /get.*sol/i,
      /need.*sol/i,
      /fund.*wallet/i,
      /faucet/i
    ],
    command: 'faucet --save'
  },
  {
    patterns: [
      /create.*wallet/i,
      /new.*wallet/i,
      /generate.*wallet/i
    ],
    command: 'wallet create'
  },

  // General operations
  {
    patterns: [
      /help/i,
      /what.*can.*do/i,
      /show.*commands?/i
    ],
    command: '--help'
  },
  {
    patterns: [
      /setup/i,
      /configure/i,
      /get.*started/i,
      /quick.*start/i
    ],
    command: 'quickstart'
  }
]

/**
 * Resolve an alias to its full command
 */
export function resolveAlias(input: string): string | null {
  const normalized = input.toLowerCase().trim()
  
  // Check exact aliases first
  for (const alias of COMMAND_ALIASES) {
    if (alias.aliases.includes(normalized)) {
      return alias.command
    }
  }
  
  // Don't resolve aliases when the input already contains proper commands
  // This prevents "agent register --help" from being resolved to "--help"
  const firstWord = normalized.split(' ')[0]
  const knownCommands = ['agent', 'governance', 'wallet', 'config', 'faucet',
                         'sdk', 'update', 'quickstart', 'onboard', 'help', 'aliases', 'tx']
  
  if (knownCommands.includes(firstWord)) {
    return null // Let commander handle it normally
  }
  
  // Check natural language patterns only for non-command inputs
  for (const pattern of NATURAL_LANGUAGE_PATTERNS) {
    for (const regex of pattern.patterns) {
      const match = normalized.match(regex)
      if (match) {
        let command = pattern.command
        
        // Extract parameters if available
        if (pattern.extractor) {
          const params = pattern.extractor(match)
          for (const [key, value] of Object.entries(params)) {
            if (value) {
              command += ` --${key} "${value}"`
            }
          }
        }
        
        return command
      }
    }
  }
  
  return null
}

/**
 * Get suggestions for a partial command
 */
export function getSuggestions(partial: string): CommandAlias[] {
  const normalized = partial.toLowerCase().trim()
  
  return COMMAND_ALIASES.filter(alias => 
    alias.aliases.some(a => a.startsWith(normalized)) ||
    alias.command.toLowerCase().includes(normalized) ||
    alias.description.toLowerCase().includes(normalized)
  ).slice(0, 5)
}

/**
 * Show available aliases
 */
export function showAliases(): void {
  console.log('\n📝 Command Shortcuts:\n')
  
  const categories = [
    { name: 'Agent', filter: (cmd: CommandAlias) => cmd.command.startsWith('agent') },
    { name: 'Wallet', filter: (cmd: CommandAlias) => cmd.command.startsWith('wallet') },
    { name: 'Quick Actions', filter: (cmd: CommandAlias) => !cmd.command.includes(' ') || cmd.aliases.includes('f') }
  ]
  
  for (const category of categories) {
    const commands = COMMAND_ALIASES.filter(category.filter)
    if (commands.length > 0) {
      console.log(`${category.name}:`)
      commands.forEach(cmd => {
        const mainAlias = cmd.aliases[0]
        const otherAliases = cmd.aliases.slice(1).join(', ')
        const aliasText = otherAliases ? ` (also: ${otherAliases})` : ''
        console.log(`  ${mainAlias.padEnd(15)} → ${cmd.command.padEnd(25)} ${cmd.description}${aliasText}`)
      })
      console.log('')
    }
  }
  
  console.log('💡 Tip: You can also use natural language like "create agent" or "check balance"\n')
}