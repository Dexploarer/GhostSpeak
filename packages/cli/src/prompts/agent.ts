import { 
  text, 
  multiselect, 
  confirm,
  select,
  isCancel,
  cancel
} from '@clack/prompts'
import chalk from 'chalk'
import { URL } from 'node:url'

export interface AgentData {
  name: string
  description: string
  capabilities: string[]
  metadataUri: string
  serviceEndpoint: string
  merkleTree?: string
}

export async function registerAgentPrompts(options: { name?: string; description?: string; capabilities?: string; category?: string; endpoint?: string; metadata?: boolean; yes?: boolean }): Promise<AgentData> {
  // Agent name
  const name = options.name ?? await text({
    message: 'What is your agent\'s name?',
    placeholder: 'e.g., DataAnalyzer Pro',
    validate: (value) => {
      if (!value) return 'Agent name is required'
      if (value.length < 3) return 'Agent name must be at least 3 characters'
      if (value.length > 50) return 'Agent name must be less than 50 characters'
    }
  })

  if (isCancel(name)) {
    cancel('Agent registration cancelled')
    process.exit(0)
  }

  // Agent description
  const description = options.description ?? await text({
    message: 'Describe what your agent does:',
    placeholder: 'e.g., Analyzes data and generates insights for businesses',
    validate: (value) => {
      if (!value) return 'Description is required'
      if (value.length < 10) return 'Description must be at least 10 characters'
      if (value.length > 500) return 'Description must be less than 500 characters'
    }
  })

  if (isCancel(description)) {
    cancel('Agent registration cancelled')
    process.exit(0)
  }

  // Agent capabilities
  let capabilities: string[]
  if (options.capabilities) {
    capabilities = options.capabilities.split(',').map(c => c.trim())
  } else {
    const result = await multiselect({
      message: 'Select your agent\'s capabilities:',
      options: [
        { value: 'data-analysis', label: '📊 Data Analysis & Insights' },
        { value: 'writing', label: '✍️  Content Writing & Editing' },
        { value: 'coding', label: '💻 Programming & Development' },
        { value: 'translation', label: '🌐 Language Translation' },
        { value: 'image-processing', label: '🖼️  Image Processing & AI Vision' },
        { value: 'automation', label: '🤖 Task Automation & Workflows' },
        { value: 'research', label: '🔍 Research & Information Gathering' },
        { value: 'customer-service', label: '🎧 Customer Service & Support' },
        { value: 'financial-analysis', label: '💰 Financial Analysis & Trading' },
        { value: 'content-moderation', label: '🛡️  Content Moderation' }
      ],
      required: true
    })

    if (isCancel(result)) {
      cancel('Agent registration cancelled')
      process.exit(0)
    }
    
    capabilities = result as string[]
  }

  // Service endpoint
  const serviceEndpoint = options.endpoint ?? await text({
    message: 'Enter your agent\'s service endpoint URL:',
    placeholder: 'https://api.your-agent.com/v1',
    validate: (value) => {
      if (!value) return 'Service endpoint is required'
      try {
        new URL(value)
        return undefined
      } catch {
        return 'Please enter a valid URL'
      }
    }
  })

  if (isCancel(serviceEndpoint)) {
    cancel('Agent registration cancelled')
    process.exit(0)
  }

  // Agent Type Selection
  const agentType = await select({
    message: 'Select Agent Type:',
    options: [
      { value: 'standard', label: 'Standard Agent', hint: 'Best for most use cases (Mutable, On-chain Reputation)' },
      { value: 'compressed', label: 'Compressed Agent', hint: 'Lower cost, requires Merkle Tree (x402 Optimized)' }
    ]
  })

  if (isCancel(agentType)) {
    cancel('Agent registration cancelled')
    process.exit(0)
  }

  // Merkle Tree Address (only if compressed)
  let merkleTree: string | undefined
  if (agentType === 'compressed') {
    merkleTree = await text({
      message: 'Enter Merkle Tree Address:',
      placeholder: 'Base58 address...',
      validate: (value) => {
        if (!value) return 'Merkle Tree address is required for compressed agents'
        if (value.length < 32) return 'Invalid address length'
      }
    }) as string

    if (isCancel(merkleTree)) {
      cancel('Agent registration cancelled')
      process.exit(0)
    }
  }

  // Metadata URI (optional)
  const hasMetadata = options.metadata === false ? false : 
    options.metadata === true ? true :
    await confirm({
      message: 'Do you have additional metadata to link? (JSON file with detailed specs)'
    })

  if (typeof hasMetadata !== 'boolean' && isCancel(hasMetadata)) {
    cancel('Agent registration cancelled')
    process.exit(0)
  }

  let metadataUri = ''
  if (hasMetadata) {
    const uri = await text({
      message: 'Enter metadata URI:',
      placeholder: 'https://your-site.com/agent-metadata.json',
      validate: (value) => {
        if (!value) return 'Metadata URI is required when metadata is enabled'
        try {
          new URL(value)
          return undefined
        } catch {
          return 'Please enter a valid URL'
        }
      }
    })

    if (isCancel(uri)) {
      cancel('Agent registration cancelled')
      process.exit(0)
    }

    metadataUri = uri
  }

  // Confirmation
  console.log('\n' + chalk.bold('📋 Registration Summary:'))
  console.log('─'.repeat(40))
  console.log(chalk.cyan('Name:') + ` ${name}`)
  console.log(chalk.cyan('Description:') + ` ${description}`)
  console.log(chalk.cyan('Capabilities:') + ` ${capabilities.join(', ')}`)
  console.log(chalk.cyan('Endpoint:') + ` ${serviceEndpoint}`)
  if (metadataUri) {
    console.log(chalk.cyan('Metadata:') + ` ${metadataUri}`)
  }

  const confirmed = options.yes ? true : await confirm({
    message: 'Register this agent on the blockchain?'
  })

  if (!options.yes && (isCancel(confirmed) || !confirmed)) {
    cancel('Agent registration cancelled')
    process.exit(0)
  }

  return {
    name,
    description,
    capabilities,
    metadataUri,
    serviceEndpoint,
    merkleTree: merkleTree as string
  }
}