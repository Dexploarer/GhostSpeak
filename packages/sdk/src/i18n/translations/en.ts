/**
 * English (US) translations for GhostSpeak Protocol
 */

export const enTranslations = {
  // Common terms
  common: {
    agent: 'Agent',
    agents: 'Agents',
    message: 'Message',
    messages: 'Messages',
    channel: 'Channel',
    channels: 'Channels',
    escrow: 'Escrow',
    transaction: 'Transaction',
    transactions: 'Transactions',
    marketplace: 'Marketplace',
    service: 'Service',
    services: 'Services',
    payment: 'Payment',
    payments: 'Payments',
    reputation: 'Reputation',
    verification: 'Verification',
    created: 'Created',
    updated: 'Updated',
    cancelled: 'Cancelled',
    completed: 'Completed',
    pending: 'Pending',
    failed: 'Failed',
    success: 'Success',
    error: 'Error',
    warning: 'Warning',
    info: 'Information',
    loading: 'Loading...',
    retry: 'Retry',
    cancel: 'Cancel',
    confirm: 'Confirm',
    submit: 'Submit',
    save: 'Save',
    delete: 'Delete',
    edit: 'Edit',
    view: 'View',
    back: 'Back',
    next: 'Next',
    previous: 'Previous',
    close: 'Close'
  },

  // CLI Messages
  cli: {
    welcome: 'GhostSpeak Protocol CLI - Autonomous Agent Commerce',
    version: 'Version {{version}}',
    help: 'Use --help for command information',
    networkConnected: 'Connected to {{network}} network',
    walletConnected: 'Wallet connected: {{address}}',
    configLoaded: 'Configuration loaded from {{path}}',
    
    // CLI Options
    options: {
      verbose: 'Enable verbose logging',
      quiet: 'Suppress non-essential output',
      noColor: 'Disable colored output',
      config: 'Path to configuration file',
      locale: 'Set CLI language locale',
      network: 'Solana network (devnet, testnet, mainnet-beta)',
      help: 'Display help information'
    },
    
    // Commands
    commands: {
      config: {
        description: 'Manage CLI configuration',
        show: 'Show current configuration',
        reset: 'Reset configuration to defaults'
      },
      
      locale: {
        description: 'Manage CLI language settings',
        list: 'List available languages',
        set: 'Set CLI language'
      },
      
      agent: {
        create: 'Creating new agent...',
        created: 'Agent created successfully with ID: {{id}}',
        verify: 'Verifying agent...',
        verified: 'Agent verified successfully',
        list: 'Listing agents...',
        found: 'Found {{count}} agent(s)',
        notFound: 'No agents found'
      },
      
      channel: {
        create: 'Creating channel...',
        created: 'Channel created: {{name}}',
        join: 'Joining channel...',
        joined: 'Successfully joined channel: {{name}}',
        leave: 'Leaving channel...',
        left: 'Left channel: {{name}}',
        list: 'Available channels:'
      },
      
      message: {
        send: 'Sending message...',
        sent: 'Message sent successfully',
        receive: 'New message from {{sender}}: {{content}}',
        broadcast: 'Broadcasting message to {{channel}}...',
        broadcasted: 'Message broadcasted successfully'
      },
      
      escrow: {
        create: 'Creating escrow transaction...',
        created: 'Escrow created with ID: {{id}}',
        deposit: 'Depositing {{amount}} tokens...',
        deposited: 'Deposit successful',
        release: 'Releasing escrow funds...',
        released: 'Funds released successfully',
        dispute: 'Dispute raised for escrow {{id}}'
      },
      
      marketplace: {
        list: 'Listing services...',
        create: 'Creating service listing...',
        created: 'Service listed successfully',
        purchase: 'Purchasing service...',
        purchased: 'Service purchased successfully'
      }
    },

    // Errors
    errors: {
      invalidCommand: 'Invalid command: {{command}}',
      missingArgument: 'Missing required argument: {{argument}}',
      invalidArgument: 'Invalid argument value: {{value}}',
      networkError: 'Network connection error',
      walletError: 'Wallet connection error',
      insufficientFunds: 'Insufficient funds for transaction',
      transactionFailed: 'Transaction failed: {{reason}}',
      agentNotFound: 'Agent not found: {{id}}',
      channelNotFound: 'Channel not found: {{name}}',
      escrowNotFound: 'Escrow not found: {{id}}',
      serviceNotFound: 'Service not found: {{id}}',
      unauthorized: 'Unauthorized access',
      rateLimited: 'Rate limit exceeded. Please try again later.',
      invalidAddress: 'Invalid wallet address: {{address}}',
      configError: 'Configuration error: {{message}}',
      localeError: 'Locale error: {{message}}'
    }
  },

  // CLI-specific messages
  cliSpecific: {
    availableLocales: 'Available languages:',
    currentLocale: 'Current language: {{locale}} ({{name}})',
    localeSet: 'Language set to: {{locale}}',
    invalidLocale: 'Unsupported language: {{locale}}'
  },

  // SDK Messages
  sdk: {
    initialization: {
      starting: 'Initializing GhostSpeak SDK...',
      complete: 'SDK initialization complete',
      failed: 'SDK initialization failed: {{reason}}',
      connecting: 'Connecting to Solana network...',
      connected: 'Connected to {{cluster}} cluster'
    },

    agent: {
      creating: 'Creating agent...',
      created: 'Agent created successfully',
      verifying: 'Verifying agent credentials...',
      verified: 'Agent verification complete',
      updating: 'Updating agent profile...',
      updated: 'Agent profile updated',
      deleting: 'Removing agent...',
      deleted: 'Agent removed successfully'
    },

    messaging: {
      sending: 'Sending message...',
      sent: 'Message sent',
      receiving: 'Listening for messages...',
      received: 'Message received',
      encrypting: 'Encrypting message...',
      encrypted: 'Message encrypted',
      decrypting: 'Decrypting message...',
      decrypted: 'Message decrypted'
    },

    escrow: {
      initializing: 'Initializing escrow...',
      initialized: 'Escrow initialized',
      depositing: 'Depositing funds...',
      deposited: 'Funds deposited',
      releasing: 'Releasing funds...',
      released: 'Funds released',
      disputing: 'Raising dispute...',
      disputed: 'Dispute raised'
    },

    marketplace: {
      listing: 'Creating service listing...',
      listed: 'Service listed',
      purchasing: 'Processing purchase...',
      purchased: 'Purchase complete',
      searching: 'Searching services...',
      found: 'Found {{count}} service(s)'
    },

    errors: {
      networkUnavailable: 'Network unavailable',
      walletNotConnected: 'Wallet not connected',
      insufficientBalance: 'Insufficient balance',
      transactionTimeout: 'Transaction timeout',
      invalidSignature: 'Invalid signature',
      accountNotFound: 'Account not found',
      programError: 'Smart contract error: {{code}}',
      rpcError: 'RPC error: {{message}}'
    }
  },

  // Developer Experience
  devex: {
    setup: {
      welcome: 'Welcome to GhostSpeak Development',
      installing: 'Installing dependencies...',
      installed: 'Dependencies installed successfully',
      configuring: 'Configuring development environment...',
      configured: 'Development environment ready',
      starting: 'Starting development server...',
      started: 'Development server running on {{url}}'
    },

    templates: {
      creating: 'Creating project from template...',
      created: 'Project created: {{name}}',
      available: 'Available templates:',
      basic: 'Basic Agent - Simple agent with messaging',
      marketplace: 'Marketplace Service - Agent with service offerings',
      chat: 'Chat Bot - Conversational agent',
      escrow: 'Escrow Service - Payment processing agent',
      custom: 'Custom - Start from scratch'
    },

    debugging: {
      starting: 'Starting debug session...',
      connected: 'Debugger connected',
      breakpoint: 'Breakpoint hit at {{location}}',
      step: 'Stepping through code...',
      inspect: 'Inspecting variable: {{name}} = {{value}}',
      stack: 'Call stack:',
      logs: 'Debug logs:'
    },

    testing: {
      running: 'Running tests...',
      passed: '{{count}} test(s) passed',
      failed: '{{count}} test(s) failed',
      coverage: 'Test coverage: {{percentage}}%',
      performance: 'Performance benchmark: {{time}}ms'
    }
  },

  // Documentation
  docs: {
    gettingStarted: 'Getting Started',
    quickStart: 'Quick Start Guide',
    apiReference: 'API Reference',
    examples: 'Code Examples',
    tutorials: 'Tutorials',
    troubleshooting: 'Troubleshooting',
    faq: 'Frequently Asked Questions',
    community: 'Community',
    contributing: 'Contributing Guide',
    changelog: 'Changelog',
    
    sections: {
      overview: 'Protocol Overview',
      installation: 'Installation',
      configuration: 'Configuration',
      agents: 'Agent Management',
      messaging: 'Messaging System',
      escrow: 'Escrow Transactions',
      marketplace: 'Marketplace Services',
      security: 'Security Best Practices',
      deployment: 'Deployment Guide'
    }
  },

  // Time and dates
  time: {
    now: 'just now',
    minutesAgo: {
      one: '{{count}} minute ago',
      other: '{{count}} minutes ago'
    },
    hoursAgo: {
      one: '{{count}} hour ago',
      other: '{{count}} hours ago'
    },
    daysAgo: {
      one: '{{count}} day ago',
      other: '{{count}} days ago'
    },
    weeksAgo: {
      one: '{{count}} week ago',
      other: '{{count}} weeks ago'
    },
    monthsAgo: {
      one: '{{count}} month ago',
      other: '{{count}} months ago'
    },
    yearsAgo: {
      one: '{{count}} year ago',
      other: '{{count}} years ago'
    }
  },

  // Validation messages
  validation: {
    required: 'This field is required',
    invalid: 'Invalid value',
    tooShort: 'Value must be at least {{min}} characters',
    tooLong: 'Value must be no more than {{max}} characters',
    invalidEmail: 'Invalid email address',
    invalidUrl: 'Invalid URL',
    invalidAddress: 'Invalid Solana address',
    invalidAmount: 'Invalid amount',
    minimumAmount: 'Minimum amount is {{min}}',
    maximumAmount: 'Maximum amount is {{max}}'
  }
};