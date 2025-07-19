import { 
  text, 
  multiselect, 
  confirm,
  isCancel,
  cancel
} from '@clack/prompts'
import chalk from 'chalk'

export interface AgentData {
  name: string
  description: string
  capabilities: string[]
  metadataUri: string
  serviceEndpoint: string
}

export async function registerAgentPrompts(options: any): Promise<AgentData> {
  // Agent name
  const name = options.name || await text({
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
  const description = options.description || await text({
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
  const capabilities = await multiselect({
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

  if (isCancel(capabilities)) {
    cancel('Agent registration cancelled')
    process.exit(0)
  }

  // Service endpoint
  const serviceEndpoint = options.endpoint || await text({
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

  // Metadata URI (optional)
  const hasMetadata = await confirm({
    message: 'Do you have additional metadata to link? (JSON file with detailed specs)'
  })

  if (isCancel(hasMetadata)) {
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

  const confirmed = await confirm({
    message: 'Register this agent on the blockchain?'
  })

  if (isCancel(confirmed) || !confirmed) {
    cancel('Agent registration cancelled')
    process.exit(0)
  }

  return {
    name,
    description,
    capabilities,
    metadataUri,
    serviceEndpoint
  }
}