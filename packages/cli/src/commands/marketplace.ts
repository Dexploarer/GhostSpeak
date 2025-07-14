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
  multiselect,
  log
} from '@clack/prompts'
import { initializeClient, getExplorerUrl, getAddressExplorerUrl, handleTransactionError } from '../utils/client.js'
import { PublicKey } from '@solana/web3.js'

export const marketplaceCommand = new Command('marketplace')
  .description('Browse and interact with the GhostSpeak marketplace')
  .alias('market')

// List services subcommand
marketplaceCommand
  .command('list')
  .description('Browse available services')
  .option('--category <category>', 'Filter by category')
  .action(async (options) => {
    intro(chalk.magenta('🛍️  GhostSpeak Marketplace'))

    const s = spinner()
    s.start('Connecting to Solana network...')

    try {
      // Initialize SDK client
      const { client } = await initializeClient('devnet')
      s.stop('✅ Connected')
      
      s.start('Loading services from the marketplace...')
      
      // Fetch services from blockchain
      const services = await client.marketplace.listServices({
        category: options.category
      })
      
      s.stop('✅ Services loaded')

      if (services.length === 0) {
        console.log('\n' + chalk.yellow('No services found in the marketplace'))
        outro('Create a service with: npx ghostspeak marketplace create')
        return
      }

      console.log('\n' + chalk.bold(`🏪 Available Services (${services.length})`))
      console.log('═'.repeat(70))

      services.forEach((service, index) => {
        console.log(chalk.magenta(`${index + 1}. ${service.title}`))
        console.log(chalk.gray(`   ID: ${service.id.toBase58()}`))
        console.log(chalk.gray(`   Agent: ${service.agentName} (${service.agentAddress.toBase58().slice(0, 8)}...)`))
        console.log(chalk.gray(`   Category: ${service.category}`))
        console.log(chalk.gray(`   Price: ${Number(service.price) / 1_000_000} SOL`))
        console.log(chalk.gray(`   Available: ${service.isAvailable ? '✅ Yes' : '❌ No'}`))
        console.log(chalk.gray(`   ${service.description}`))
        console.log('')
      })

      const action = await select({
        message: 'What would you like to do?',
        options: [
          { value: 'purchase', label: '💳 Purchase a service' },
          { value: 'details', label: '📋 View service details' },
          { value: 'filter', label: '🔍 Filter services' },
          { value: 'exit', label: '🚪 Exit' }
        ]
      })

      if (isCancel(action)) {
        cancel('Marketplace browsing cancelled')
        return
      }

      switch (action) {
        case 'purchase':
          await purchaseService(services)
          break
        case 'details':
          await viewServiceDetails(services)
          break
        case 'filter':
          console.log(chalk.yellow('🔍 Use --category flag to filter by category'))
          break
      }

      outro('Marketplace session completed')

    } catch (error) {
      s.stop('❌ Failed to load marketplace')
      cancel(chalk.red('Error: ' + (error instanceof Error ? error.message : 'Unknown error')))
    }
  })

// Create service listing
marketplaceCommand
  .command('create')
  .description('Create a new service listing')
  .action(async () => {
    intro(chalk.magenta('📝 Create Service Listing'))

    try {
      const title = await text({
        message: 'Service title:',
        placeholder: 'e.g., Professional Data Analysis',
        validate: (value) => {
          if (!value) return 'Title is required'
          if (value.length < 5) return 'Title must be at least 5 characters'
        }
      })

      if (isCancel(title)) {
        cancel('Service creation cancelled')
        return
      }

      const description = await text({
        message: 'Service description:',
        placeholder: 'Detailed description of what you offer...',
        validate: (value) => {
          if (!value) return 'Description is required'
          if (value.length < 20) return 'Description must be at least 20 characters'
        }
      })

      if (isCancel(description)) {
        cancel('Service creation cancelled')
        return
      }

      const category = await select({
        message: 'Select service category:',
        options: [
          { value: 'analytics', label: '📊 Analytics & Data Science' },
          { value: 'content', label: '✍️  Content & Writing' },
          { value: 'development', label: '💻 Development & Programming' },
          { value: 'design', label: '🎨 Design & Creative' },
          { value: 'automation', label: '🤖 Automation & Workflows' },
          { value: 'consulting', label: '💼 Consulting & Strategy' }
        ]
      })

      if (isCancel(category)) {
        cancel('Service creation cancelled')
        return
      }

      const price = await text({
        message: 'Service price (in SOL):',
        placeholder: '0.5',
        validate: (value) => {
          if (!value) return 'Price is required'
          const num = parseFloat(value)
          if (isNaN(num) || num <= 0) return 'Please enter a valid positive number'
        }
      })

      if (isCancel(price)) {
        cancel('Service creation cancelled')
        return
      }

      // Confirmation
      console.log('\n' + chalk.bold('📋 Service Listing Summary:'))
      console.log('─'.repeat(40))
      console.log(chalk.magenta('Title:') + ` ${title}`)
      console.log(chalk.magenta('Category:') + ` ${category}`)
      console.log(chalk.magenta('Price:') + ` ${price} SOL`)
      console.log(chalk.magenta('Description:') + ` ${description}`)

      const confirmed = await confirm({
        message: 'Create this service listing?'
      })

      if (isCancel(confirmed) || !confirmed) {
        cancel('Service creation cancelled')
        return
      }

      const s = spinner()
      s.start('Connecting to Solana network...')
      
      // Initialize SDK client
      const { client, wallet } = await initializeClient('devnet')
      s.stop('✅ Connected')
      
      // First check if user has a registered agent
      s.start('Checking for registered agent...')
      const agents = await client.agent.listByOwner({ owner: wallet.publicKey })
      
      if (agents.length === 0) {
        s.stop('❌ No agent found')
        console.log(chalk.yellow('\n⚠️  You need to register an agent first!'))
        outro('Run: npx ghostspeak agent register')
        return
      }
      
      s.stop('✅ Agent found')
      
      // Select agent if multiple
      let agentAddress = agents[0].address
      if (agents.length > 1) {
        const selectedAgent = await select({
          message: 'Select agent for this service:',
          options: agents.map(agent => ({
            value: agent.address.toBase58(),
            label: agent.name
          }))
        })
        
        if (isCancel(selectedAgent)) {
          cancel('Service creation cancelled')
          return
        }
        
        agentAddress = new PublicKey(selectedAgent as string)
      }
      
      s.start('Creating service listing on the blockchain...')
      
      try {
        const result = await client.marketplace.createListing({
          agentAddress,
          title: title as string,
          description: description as string,
          category: category as string,
          price: BigInt(Math.floor(parseFloat(price as string) * 1_000_000))
        })
        
        s.stop('✅ Service listing created!')

        console.log('\n' + chalk.green('🎉 Your service is now live in the marketplace!'))
        console.log(chalk.gray(`Service ID: ${result.listingId.toBase58()}`))
        console.log('')
        console.log(chalk.cyan('Transaction:'), getExplorerUrl(result.signature, 'devnet'))
        console.log(chalk.cyan('Listing:'), getAddressExplorerUrl(result.listingId.toBase58(), 'devnet'))
        
        outro('Service creation completed')
      } catch (error: any) {
        s.stop('❌ Creation failed')
        throw new Error(handleTransactionError(error))
      }

    } catch (error) {
      cancel(chalk.red('Failed to create service: ' + (error instanceof Error ? error.message : 'Unknown error')))
    }
  })

// Purchase service
marketplaceCommand
  .command('purchase')
  .description('Purchase a service from the marketplace')
  .argument('[listing-id]', 'Service listing ID')
  .action(async (listingId) => {
    intro(chalk.magenta('💳 Purchase Service'))

    try {
      // If no listing ID provided, show available services first
      if (!listingId) {
        const s = spinner()
        s.start('Loading available services...')
        
        const { client } = await initializeClient('devnet')
        
        // Fetch real services from blockchain
        const services = await client.marketplace.listServices({})
        s.stop('✅ Services loaded')

        if (services.length === 0) {
          console.log('\n' + chalk.yellow('No services available in the marketplace'))
          outro('Create a service with: npx ghostspeak marketplace create')
          return
        }

        console.log('\n' + chalk.bold('🏪 Available Services'))
        console.log('─'.repeat(60))
        services.forEach((service, index) => {
          console.log(chalk.magenta(`${index + 1}. ${service.title}`))
          console.log(chalk.gray(`   ID: ${service.id.toBase58()} | Price: ${Number(service.price) / 1_000_000} SOL | By: ${service.agentName}`))
        })

        const selectedIndex = await select({
          message: 'Select service to purchase:',
          options: services.map((service, index) => ({
            value: index,
            label: `${service.title} - ${Number(service.price) / 1_000_000} SOL`
          }))
        })

        if (isCancel(selectedIndex)) {
          cancel('Purchase cancelled')
          return
        }

        listingId = services[selectedIndex as number].id.toBase58()
      }

      // Initialize client if needed
      const { client } = await initializeClient('devnet')
      
      // Get service details
      const s = spinner()
      s.start('Loading service details...')
      
      const service = await client.marketplace.getService({
        serviceId: new PublicKey(listingId)
      })
      
      s.stop('✅ Service loaded')
      
      if (!service) {
        cancel('Service not found')
        return
      }

      console.log('\n' + chalk.bold('📋 Service Details'))
      console.log('─'.repeat(40))
      console.log(chalk.magenta('Service:') + ` ${service.title}`)
      console.log(chalk.magenta('Price:') + ` ${Number(service.price) / 1_000_000} SOL`)
      console.log(chalk.magenta('Agent:') + ` ${service.agentName}`)
      console.log(chalk.magenta('Description:') + ` ${service.description}`)

      // Additional requirements
      const requirements = await text({
        message: 'Any special requirements? (optional)',
        placeholder: 'e.g., Need visualization in Tableau format'
      })

      if (isCancel(requirements)) {
        cancel('Purchase cancelled')
        return
      }

      // Confirmation
      console.log('\n' + chalk.bold('💳 Purchase Summary'))
      console.log('─'.repeat(40))
      console.log(chalk.magenta('Service:') + ` ${service.title}`)
      console.log(chalk.magenta('Price:') + ` ${Number(service.price) / 1_000_000} SOL`)
      if (requirements) {
        console.log(chalk.magenta('Requirements:') + ` ${requirements}`)
      }

      const confirmed = await confirm({
        message: `Proceed with purchase for ${Number(service.price) / 1_000_000} SOL?`
      })

      if (isCancel(confirmed) || !confirmed) {
        cancel('Purchase cancelled')
        return
      }

      const purchaseSpinner = spinner()
      purchaseSpinner.start('Processing payment and creating work order...')

      try {
        const result = await client.marketplace.purchaseService({
          serviceId: new PublicKey(listingId),
          requirements: requirements || undefined
        })
        
        purchaseSpinner.stop('✅ Purchase completed!')

        console.log('\n' + chalk.green('🎉 Service purchased successfully!'))
        console.log(chalk.gray(`Purchase ID: ${result.purchaseId.toBase58()}`))
        console.log(chalk.gray(`Work Order: ${result.workOrderId.toBase58()}`))
        console.log(chalk.gray('The agent will begin working on your request.'))
        console.log('')
        console.log(chalk.cyan('Transaction:'), getExplorerUrl(result.signature, 'devnet'))
        console.log(chalk.cyan('Purchase Account:'), getAddressExplorerUrl(result.purchaseId.toBase58(), 'devnet'))
        console.log('\n' + chalk.yellow('💡 Track your order with: npx ghostspeak escrow list'))
        
        outro('Purchase completed')
      } catch (error: any) {
        purchaseSpinner.stop('❌ Purchase failed')
        throw new Error(handleTransactionError(error))
      }

    } catch (error) {
      cancel(chalk.red('Purchase failed: ' + (error instanceof Error ? error.message : 'Unknown error')))
    }
  })

// Search marketplace
marketplaceCommand
  .command('search')
  .description('Search marketplace services')
  .option('-q, --query <query>', 'Search query')
  .action(async (options) => {
    intro(chalk.magenta('🔍 Search Marketplace'))

    try {
      const query = options.query || await text({
        message: 'What are you looking for?',
        placeholder: 'e.g., data analysis, content writing, smart contracts'
      })

      if (isCancel(query)) {
        cancel('Search cancelled')
        return
      }

      const s = spinner()
      s.start('Connecting to Solana network...')
      
      // Initialize SDK client
      const { client } = await initializeClient('devnet')
      s.stop('✅ Connected')
      
      s.start(`Searching for "${query}"...`)
      
      // Search services using SDK
      const results = await client.marketplace.searchServices({
        query: query as string
      })
      
      s.stop('✅ Search completed')

      if (results.length === 0) {
        console.log('\n' + chalk.yellow(`No services found matching "${query}"`))
        outro('Try different search terms')
        return
      }

      console.log('\n' + chalk.bold(`🔍 Found ${results.length} services matching "${query}"`))
      console.log('─'.repeat(50))

      results.forEach((service, index) => {
        console.log(chalk.magenta(`${index + 1}. ${service.title}`))
        console.log(chalk.gray(`   By: ${service.agentName} | ${Number(service.price) / 1_000_000} SOL`))
        console.log(chalk.gray(`   ${service.description.slice(0, 60)}...`))
        console.log(chalk.gray(`   ID: ${service.id.toBase58()}`))
        console.log('')
      })

      outro('Search completed')

    } catch (error) {
      cancel(chalk.red('Search failed: ' + (error instanceof Error ? error.message : 'Unknown error')))
    }
  })

// Jobs subcommand group
const jobsCommand = marketplaceCommand
  .command('jobs')
  .description('Manage job postings')

// Create job posting
jobsCommand
  .command('create')
  .description('Create a new job posting')
  .action(async () => {
    intro(chalk.magenta('💼 Create Job Posting'))

    try {
      const title = await text({
        message: 'Job title:',
        placeholder: 'e.g., Need AI agent for customer support',
        validate: (value) => {
          if (!value) return 'Title is required'
          if (value.length < 10) return 'Title must be at least 10 characters'
        }
      })

      if (isCancel(title)) {
        cancel('Job creation cancelled')
        return
      }

      const description = await text({
        message: 'Job description:',
        placeholder: 'Detailed description of the work required...',
        validate: (value) => {
          if (!value) return 'Description is required'
          if (value.length < 50) return 'Description must be at least 50 characters'
        }
      })

      if (isCancel(description)) {
        cancel('Job creation cancelled')
        return
      }

      const category = await select({
        message: 'Select job category:',
        options: [
          { value: 'development', label: '💻 Development & Programming' },
          { value: 'content', label: '✍️  Content & Writing' },
          { value: 'data', label: '📊 Data Analysis & Science' },
          { value: 'support', label: '🎧 Customer Support' },
          { value: 'automation', label: '🤖 Automation & Integration' },
          { value: 'research', label: '🔍 Research & Analysis' }
        ]
      })

      if (isCancel(category)) {
        cancel('Job creation cancelled')
        return
      }

      const requirements = await multiselect({
        message: 'Select required capabilities:',
        options: [
          { value: 'fast-response', label: '⚡ Fast response time' },
          { value: 'high-accuracy', label: '🎯 High accuracy required' },
          { value: '24-7-availability', label: '🕐 24/7 availability' },
          { value: 'multilingual', label: '🌐 Multilingual support' },
          { value: 'api-integration', label: '🔌 API integration capability' },
          { value: 'data-privacy', label: '🔒 Data privacy compliance' }
        ],
        required: false
      })

      if (isCancel(requirements)) {
        cancel('Job creation cancelled')
        return
      }

      const budget = await text({
        message: 'Budget (in SOL):',
        placeholder: '1.0',
        validate: (value) => {
          if (!value) return 'Budget is required'
          const num = parseFloat(value)
          if (isNaN(num) || num <= 0) return 'Please enter a valid positive number'
        }
      })

      if (isCancel(budget)) {
        cancel('Job creation cancelled')
        return
      }

      const deadline = await select({
        message: 'Deadline:',
        options: [
          { value: '1d', label: '1 day' },
          { value: '3d', label: '3 days' },
          { value: '1w', label: '1 week' },
          { value: '2w', label: '2 weeks' },
          { value: '1m', label: '1 month' }
        ]
      })

      if (isCancel(deadline)) {
        cancel('Job creation cancelled')
        return
      }

      // Confirmation
      console.log('\n' + chalk.bold('💼 Job Posting Summary'))
      console.log('─'.repeat(50))
      console.log(chalk.magenta('Title:') + ` ${title}`)
      console.log(chalk.magenta('Category:') + ` ${category}`)
      console.log(chalk.magenta('Budget:') + ` ${budget} SOL`)
      console.log(chalk.magenta('Deadline:') + ` ${deadline}`)
      console.log(chalk.magenta('Requirements:') + ` ${requirements.length > 0 ? requirements.join(', ') : 'None specified'}`)
      console.log('\n' + chalk.gray(description))

      const confirmed = await confirm({
        message: 'Post this job?'
      })

      if (isCancel(confirmed) || !confirmed) {
        cancel('Job posting cancelled')
        return
      }

      const s = spinner()
      s.start('Connecting to Solana network...')
      
      // Initialize SDK client
      const { client, wallet } = await initializeClient('devnet')
      s.stop('✅ Connected')
      
      s.start('Creating job posting on the blockchain...')
      
      try {
        // Convert deadline to timestamp
        const deadlineMs = deadline === '1d' ? 86400000 :
                          deadline === '3d' ? 259200000 :
                          deadline === '1w' ? 604800000 : 2592000000
        const deadlineTimestamp = BigInt(Date.now() + deadlineMs) / 1000n
        
        const result = await client.marketplace.createJobPosting({
          title: title as string,
          description: description as string,
          category: category as string,
          requirements: requirements as string[],
          budget: BigInt(Math.floor(parseFloat(budget as string) * 1_000_000)),
          deadline: deadlineTimestamp
        })
        
        s.stop('✅ Job posted successfully!')

        console.log('\n' + chalk.green('🎉 Your job has been posted!'))
        console.log(chalk.gray(`Job ID: ${result.jobId.toBase58()}`))
        console.log(chalk.gray('Status: Active - Accepting applications'))
        console.log('')
        console.log(chalk.cyan('Transaction:'), getExplorerUrl(result.signature, 'devnet'))
        console.log(chalk.cyan('Job Posting:'), getAddressExplorerUrl(result.jobId.toBase58(), 'devnet'))
      } catch (error: any) {
        s.stop('❌ Job posting failed')
        throw new Error(handleTransactionError(error))
      }
      console.log('\n' + chalk.yellow('💡 AI agents matching your requirements will be notified.'))

      outro('Job posting completed')

    } catch (error) {
      cancel(chalk.red('Job posting failed: ' + (error instanceof Error ? error.message : 'Unknown error')))
    }
  })

// List job postings
jobsCommand
  .command('list')
  .description('Browse available job postings')
  .option('--my-jobs', 'Show only your job postings')
  .option('--category <category>', 'Filter by category')
  .action(async (options) => {
    intro(chalk.magenta('💼 Job Postings'))

    const s = spinner()
    s.start('Connecting to Solana network...')
    
    try {
      // Initialize SDK client
      const { client, wallet } = await initializeClient('devnet')
      s.stop('✅ Connected')
      
      s.start('Loading job postings...')
      
      // Fetch jobs using SDK
      const jobs = await client.marketplace.listJobs({
        myJobsOnly: options.myJobs ? wallet.publicKey : undefined,
        category: options.category
      })
      
      s.stop('✅ Jobs loaded')

      if (jobs.length === 0) {
        console.log('\n' + chalk.yellow('No job postings found'))
        outro('Create a job with: npx ghostspeak marketplace jobs create')
        return
      }

      console.log('\n' + chalk.bold(options.myJobs ? `💼 Your Job Postings (${jobs.length})` : `💼 Available Jobs (${jobs.length})`))
      console.log('═'.repeat(70))

      jobs.forEach((job, index) => {
        const isOwner = job.poster.equals(wallet.publicKey)
        const deadlineDate = new Date(Number(job.deadline) * 1000)
        const daysLeft = Math.ceil((deadlineDate.getTime() - Date.now()) / 86400000)
        
        console.log(chalk.magenta(`${index + 1}. ${job.title}`))
        console.log(chalk.gray(`   ID: ${job.id.toBase58()}`))
        console.log(chalk.gray(`   Budget: ${Number(job.budget) / 1_000_000} SOL`))
        console.log(chalk.gray(`   Deadline: ${deadlineDate.toLocaleDateString()} (${daysLeft} days left)`))
        console.log(chalk.gray(`   Category: ${job.category}`))
        console.log(chalk.gray(`   Applications: ${job.applicationCount || 0}`))
        console.log(chalk.gray(`   Status: ${job.isActive ? '✅ Active' : '❌ Closed'}`))
        if (!isOwner) {
          console.log(chalk.gray(`   Posted by: ${job.poster.toBase58().slice(0, 8)}...`))
        }
        console.log('')
      })

      const action = await select({
        message: 'What would you like to do?',
        options: [
          { value: 'apply', label: '📝 Apply to a job' },
          { value: 'details', label: '📋 View job details' },
          { value: 'create', label: '➕ Create new job' },
          { value: 'exit', label: '🚪 Exit' }
        ]
      })

      if (isCancel(action)) {
        cancel('Job browsing cancelled')
        return
      }

      switch (action) {
        case 'apply':
          await applyToJob(jobs, client)
          break
        case 'details':
          await viewJobDetails(jobs)
          break
        case 'create':
          console.log(chalk.yellow('➕ Use "ghostspeak marketplace jobs create" to post a job'))
          break
      }

      outro('Job listing completed')

    } catch (error) {
      s.stop('❌ Failed to load jobs')
      cancel(chalk.red('Error: ' + (error instanceof Error ? error.message : 'Unknown error')))
    }
  })

// Helper function to purchase a service
async function purchaseService(services: any[]) {
  if (services.length === 0) {
    cancel('No services available to purchase')
    return
  }

  const selectedService = await select({
    message: 'Select service to purchase:',
    options: services.map((service, index) => ({
      value: index,
      label: `${service.title} - ${Number(service.price) / 1_000_000} SOL`
    }))
  })

  if (isCancel(selectedService)) {
    return
  }

  const service = services[selectedService as number]
  
  const confirmed = await confirm({
    message: `Purchase "${service.title}" for ${Number(service.price) / 1_000_000} SOL?`
  })

  if (isCancel(confirmed) || !confirmed) {
    return
  }

  const s = spinner()
  s.start('Processing purchase...')

  try {
    const { client } = await initializeClient('devnet')
    
    const result = await client.marketplace.purchaseService({
      serviceId: service.id
    })
    
    s.stop('✅ Purchase successful!')
    
    console.log('')
    console.log(chalk.green('🎉 Service purchased successfully!'))
    console.log(chalk.cyan('Transaction:'), getExplorerUrl(result.signature, 'devnet'))
    console.log(chalk.cyan('Purchase ID:'), result.purchaseId.toBase58())
    
  } catch (error: any) {
    s.stop('❌ Purchase failed')
    log.error(handleTransactionError(error))
  }
}

// Helper function to view service details
async function viewServiceDetails(services: any[]) {
  if (services.length === 0) {
    cancel('No services available')
    return
  }

  const selectedService = await select({
    message: 'Select service to view details:',
    options: services.map((service, index) => ({
      value: index,
      label: service.title
    }))
  })

  if (isCancel(selectedService)) {
    return
  }

  const service = services[selectedService as number]
  
  console.log('')
  console.log(chalk.bold('📋 Service Details'))
  console.log('─'.repeat(50))
  console.log(chalk.cyan('Title:'), service.title)
  console.log(chalk.cyan('ID:'), service.id.toBase58())
  console.log(chalk.cyan('Description:'), service.description)
  console.log(chalk.cyan('Agent:'), `${service.agentName} (${service.agentAddress.toBase58()})`)
  console.log(chalk.cyan('Category:'), service.category)
  console.log(chalk.cyan('Price:'), `${Number(service.price) / 1_000_000} SOL`)
  console.log(chalk.cyan('Status:'), service.isAvailable ? '✅ Available' : '❌ Not Available')
  console.log(chalk.cyan('Created:'), new Date(Number(service.createdAt) * 1000).toLocaleString())
  
  if (service.metadata) {
    console.log(chalk.cyan('Delivery Time:'), service.metadata.deliveryTime || 'Not specified')
    console.log(chalk.cyan('Requirements:'), service.metadata.requirements || 'None')
  }
}

// Helper function to apply to a job
async function applyToJob(jobs: any[], client: any) {
  if (jobs.length === 0) {
    cancel('No jobs available')
    return
  }

  const selectedJob = await select({
    message: 'Select job to apply to:',
    options: jobs.map((job, index) => ({
      value: index,
      label: `${job.title} - ${Number(job.budget) / 1_000_000} SOL`
    }))
  })

  if (isCancel(selectedJob)) {
    return
  }

  const job = jobs[selectedJob as number]
  
  // Check if user has an agent
  const agents = await client.agent.listByOwner({ owner: client.wallet.publicKey })
  if (agents.length === 0) {
    console.log(chalk.yellow('\n⚠️  You need a registered agent to apply for jobs'))
    console.log('Run: npx ghostspeak agent register')
    return
  }
  
  // Select agent if multiple
  let agentAddress = agents[0].address
  if (agents.length > 1) {
    const selectedAgent = await select({
      message: 'Select agent to apply with:',
      options: agents.map(agent => ({
        value: agent.address.toBase58(),
        label: agent.name
      }))
    })
    
    if (isCancel(selectedAgent)) {
      return
    }
    
    agentAddress = new PublicKey(selectedAgent as string)
  }
  
  const proposal = await text({
    message: 'Your proposal:',
    placeholder: 'Explain why you\'re the best fit for this job...',
    validate: (value) => {
      if (!value) return 'Proposal is required'
      if (value.length < 50) return 'Proposal must be at least 50 characters'
    }
  })
  
  if (isCancel(proposal)) {
    return
  }
  
  const confirmed = await confirm({
    message: 'Submit application?'
  })
  
  if (isCancel(confirmed) || !confirmed) {
    return
  }
  
  const s = spinner()
  s.start('Submitting application...')
  
  try {
    const result = await client.marketplace.applyToJob({
      jobId: job.id,
      agentAddress,
      proposal: proposal as string
    })
    
    s.stop('✅ Application submitted!')
    
    console.log('')
    console.log(chalk.green('🎉 Application submitted successfully!'))
    console.log(chalk.cyan('Transaction:'), getExplorerUrl(result.signature, 'devnet'))
    console.log(chalk.cyan('Application ID:'), result.applicationId.toBase58())
    
  } catch (error: any) {
    s.stop('❌ Application failed')
    log.error(handleTransactionError(error))
  }
}

// Helper function to view job details
async function viewJobDetails(jobs: any[]) {
  if (jobs.length === 0) {
    cancel('No jobs available')
    return
  }

  const selectedJob = await select({
    message: 'Select job to view details:',
    options: jobs.map((job, index) => ({
      value: index,
      label: job.title
    }))
  })

  if (isCancel(selectedJob)) {
    return
  }

  const job = jobs[selectedJob as number]
  const deadlineDate = new Date(Number(job.deadline) * 1000)
  const daysLeft = Math.ceil((deadlineDate.getTime() - Date.now()) / 86400000)
  
  console.log('')
  console.log(chalk.bold('💼 Job Details'))
  console.log('─'.repeat(50))
  console.log(chalk.cyan('Title:'), job.title)
  console.log(chalk.cyan('ID:'), job.id.toBase58())
  console.log(chalk.cyan('Description:'), job.description)
  console.log(chalk.cyan('Category:'), job.category)
  console.log(chalk.cyan('Budget:'), `${Number(job.budget) / 1_000_000} SOL`)
  console.log(chalk.cyan('Deadline:'), `${deadlineDate.toLocaleDateString()} (${daysLeft} days left)`)
  console.log(chalk.cyan('Status:'), job.isActive ? '✅ Active' : '❌ Closed')
  console.log(chalk.cyan('Applications:'), job.applicationCount || 0)
  console.log(chalk.cyan('Posted by:'), job.poster.toBase58())
  
  if (job.requirements && job.requirements.length > 0) {
    console.log(chalk.cyan('Requirements:'), job.requirements.join(', '))
  }
}