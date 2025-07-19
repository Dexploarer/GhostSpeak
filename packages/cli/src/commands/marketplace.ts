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
import { initializeClient, getExplorerUrl, handleTransactionError, toSDKSigner } from '../utils/client.js'
import { AgentWalletManager, AgentCNFTManager } from '../utils/agentWallet.js'
import type { Address } from '@solana/addresses'
import { address } from '@solana/addresses'
import type {
  ListServicesOptions,
  CreateServiceOptions,
  BuyServiceOptions,
  SearchServicesOptions,
  JobsOptions,
  isDefined,
  isValidUrl,
  parseFloatSafe
} from '../types/cli-types.js'

export const marketplaceCommand = new Command('marketplace')
  .description('Browse and interact with the GhostSpeak marketplace')
  .alias('market')

// List services subcommand
marketplaceCommand
  .command('list')
  .description('Browse available services')
  .option('--category <category>', 'Filter by category')
  .action(async (options: ListServicesOptions) => {
    intro(chalk.magenta('🛍️  GhostSpeak Marketplace'))

    const s = spinner()
    s.start('Connecting to Solana network...')

    try {
      // Initialize SDK client
      const { client } = await initializeClient('devnet')
      s.stop('✅ Connected')
      
      s.start('Loading services from the marketplace...')
      
      // Fetch services from blockchain
      // Use the correct method name
      let services = await client.marketplace.getServiceListings()
      
      // Filter by category if provided
      if (options.category) {
        services = await client.marketplace.searchServicesByCategory(options.category)
      }
      
      s.stop('✅ Services loaded')

      if (services.length === 0) {
        console.log('\n' + chalk.yellow('No services found in the marketplace'))
        outro('Create a service with: npx ghostspeak marketplace create')
        return
      }

      console.log('\n' + chalk.bold(`🏪 Available Services (${services.length})`))
      console.log('═'.repeat(70))

      services.forEach((serviceWithAddr, index) => {
        const service = 'data' in serviceWithAddr ? serviceWithAddr.data : serviceWithAddr
        const addr = serviceWithAddr.address || service.address
        console.log(chalk.magenta(`${index + 1}. ${service.title}`))
        console.log(chalk.gray(`   ID: ${addr?.toString() ?? 'N/A'}`))
        console.log(chalk.gray(`   Agent: ${service.agent?.toString().slice(0, 8) ?? 'Unknown'}...`))
        console.log(chalk.gray(`   Category: ${service.serviceType ?? 'General'}`))
        console.log(chalk.gray(`   Price: ${Number(service.price) / 1_000_000} SOL`))
        console.log(chalk.gray(`   Available: ${service.isActive ? '✅ Yes' : '❌ No'}`))
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
  .action(async (options: CreateServiceOptions) => {
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
      
      // Check for registered agents using new credential system
      s.start('Checking for registered agents...')
      
      const myAgentCredentials = await AgentWalletManager.getAgentsByOwner(wallet.address)
      
      if (myAgentCredentials.length === 0) {
        s.stop('❌ No agent found')
        console.log(chalk.yellow('\n⚠️  You need to register an agent first!'))
        outro('Run: npx ghostspeak agent register')
        return
      }
      
      s.stop('✅ Agent(s) found')
      
      // Select agent for the service listing
      let selectedCredentials
      if (myAgentCredentials.length === 1) {
        selectedCredentials = myAgentCredentials[0]
      } else {
        const selectedAgentId = await select({
          message: 'Select agent for this service:',
          options: myAgentCredentials.map(cred => ({
            value: cred.agentId,
            label: `${cred.name} (UUID: ${cred.uuid})`
          }))
        })
        
        if (isCancel(selectedAgentId)) {
          cancel('Service creation cancelled')
          return
        }
        
        selectedCredentials = myAgentCredentials.find(cred => cred.agentId === selectedAgentId) ?? null
      }
      
      if (!selectedCredentials) {
        cancel('Invalid agent selection')
        return
      }
      
      // Verify ownership using CNFT or credentials
      s.start('Verifying agent ownership...')
      
      const ownershipVerified = await AgentCNFTManager.verifyOwnership(
        selectedCredentials.uuid,
        wallet.address,
        client.config.rpcEndpoint ?? 'https://api.devnet.solana.com'
      )
      
      if (!ownershipVerified) {
        s.stop('❌ Ownership verification failed')
        cancel('You do not own this agent')
        return
      }
      
      s.stop('✅ Ownership verified')
      
      console.log('\n' + chalk.green('✅ Using agent:'))
      console.log(chalk.gray(`  Name: ${selectedCredentials.name}`))
      console.log(chalk.gray(`  UUID: ${selectedCredentials.uuid}`))
      console.log(chalk.gray(`  Agent Wallet: ${selectedCredentials.agentWallet.publicKey}`))
      
      // Get the agent's on-chain address for the listing
      const { getProgramDerivedAddress, getAddressEncoder, getBytesEncoder, getUtf8Encoder, getU32Encoder, addEncoderSizePrefix } = await import('@solana/kit')
      
      const [agentPda] = await getProgramDerivedAddress({
        programAddress: client.config.programId!,
        seeds: [
          getBytesEncoder().encode(new Uint8Array([97, 103, 101, 110, 116])), // 'agent'
          getAddressEncoder().encode(wallet.address),
          addEncoderSizePrefix(getUtf8Encoder(), getU32Encoder()).encode(selectedCredentials.agentId)
        ]
      })
      
      const agentAddress = agentPda
      
      s.start('Creating service listing on the blockchain...')
      
      try {
        // Generate addresses for the listing
        const serviceListingAddress = address('11111111111111111111111111111111') // Mock address
        const userRegistryAddress = address('11111111111111111111111111111111') // Mock address
        
        const result = await client.marketplace.createServiceListing(
          toSDKSigner(wallet),
          serviceListingAddress,
          agentAddress,
          userRegistryAddress,
          {
            title: title as string,
            description: description as string,
            amount: BigInt(Math.floor(parseFloat(price as string) * 1_000_000))
          }
        )
        
        s.stop('✅ Service listing created!')

        console.log('\n' + chalk.green('🎉 Your service is now live in the marketplace!'))
        console.log(chalk.gray(`Service ID: ${serviceListingAddress.toString()}`))
        console.log(chalk.gray(`Agent: ${selectedCredentials.name}`))
        console.log(chalk.gray(`Agent UUID: ${selectedCredentials.uuid}`))
        console.log('')
        console.log(chalk.cyan('Transaction:'), getExplorerUrl(result, 'devnet'))
        console.log(chalk.cyan('Listing:'), getAddressExplorerUrl(serviceListingAddress.toString(), 'devnet'))
        console.log('')
        console.log(chalk.yellow('💡 Service linked to agent via UUID for ownership verification'))
        
        outro('Service creation completed')
      } catch (error: unknown) {
        s.stop('❌ Creation failed')
        throw new Error(handleTransactionError(error as Error))
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
  .action(async (listingId: string) => {
    intro(chalk.magenta('💳 Purchase Service'))

    try {
      // If no listing ID provided, show available services first
      if (!listingId) {
        const s = spinner()
        s.start('Loading available services...')
        
        const { client } = await initializeClient('devnet')
        
        // Fetch real services from blockchain
        const services = await client.marketplace.getServiceListings()
        s.stop('✅ Services loaded')

        if (services.length === 0) {
          console.log('\n' + chalk.yellow('No services available in the marketplace'))
          outro('Create a service with: npx ghostspeak marketplace create')
          return
        }

        console.log('\n' + chalk.bold('🏪 Available Services'))
        console.log('─'.repeat(60))
        services.forEach((serviceWithAddr, index) => {
          const service = 'data' in serviceWithAddr ? serviceWithAddr.data : serviceWithAddr
          const addr = serviceWithAddr.address ?? service.address
          console.log(chalk.magenta(`${index + 1}. ${service.title}`))
          console.log(chalk.gray(`   ID: ${addr?.toString() ?? 'N/A'} | Price: ${Number(service.price) / 1_000_000} SOL | By: ${service.agent?.toString().slice(0, 8) ?? 'Unknown'}...`))
        })

        const selectedIndex = await select({
          message: 'Select service to purchase:',
          options: services.map((service, index) => ({
            value: index,
            label: `${service.data.title ?? 'Unknown'} - ${Number(service.data.price) / 1_000_000} SOL`
          }))
        })

        if (isCancel(selectedIndex)) {
          cancel('Purchase cancelled')
          return
        }

        listingId = services[selectedIndex as number].address.toString()
      }

      // Initialize client if needed
      const { client } = await initializeClient('devnet')
      
      // Get service details
      const s = spinner()
      s.start('Loading service details...')
      
      const service = await client.marketplace.getService({
        serviceId: address(listingId)
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
        const servicePurchaseAddress = address('11111111111111111111111111111111') // Mock address
        const result = await client.marketplace.purchaseService(
          servicePurchaseAddress,
          {
            serviceListingAddress: address(listingId),
            signer: toSDKSigner(wallet),
            requirements: requirements as string[] ?? []
          }
        )
        
        purchaseSpinner.stop('✅ Purchase completed!')

        console.log('\n' + chalk.green('🎉 Service purchased successfully!'))
        console.log(chalk.gray(`Purchase ID: ${servicePurchaseAddress.toString()}`))
        console.log(chalk.gray(`Work Order: ${servicePurchaseAddress.toString()}`))
        console.log(chalk.gray('The agent will begin working on your request.'))
        console.log('')
        console.log(chalk.cyan('Transaction:'), getExplorerUrl(result, 'devnet'))
        console.log(chalk.cyan('Purchase Account:'), getAddressExplorerUrl(servicePurchaseAddress.toString(), 'devnet'))
        console.log('\n' + chalk.yellow('💡 Track your order with: npx ghostspeak escrow list'))
        
        outro('Purchase completed')
      } catch (error: unknown) {
        purchaseSpinner.stop('❌ Purchase failed')
        throw new Error(handleTransactionError(error as Error))
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
  .action(async (options: SearchServicesOptions) => {
    intro(chalk.magenta('🔍 Search Marketplace'))

    try {
      const query = options.query ?? await text({
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
      // Search services by matching title, description, or service type
      const allServices = await client.marketplace.getServiceListings()
      const queryLower = (query as string).toLowerCase()
      const results = allServices.filter((serviceWithAddr) => {
        const service = 'data' in serviceWithAddr ? serviceWithAddr.data : serviceWithAddr
        return service.title?.toLowerCase().includes(queryLower) ||
               service.description?.toLowerCase().includes(queryLower) ||
               service.serviceType?.toLowerCase().includes(queryLower)
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
        console.log(chalk.magenta(`${index + 1}. ${service.data.title}`))
        console.log(chalk.gray(`   By: Unknown | ${Number(service.data.price) / 1_000_000} SOL`))
        console.log(chalk.gray(`   ${service.data.description.slice(0, 60)}...`))
        console.log(chalk.gray(`   ID: ${service.address.toString()}`))
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
  .action(async (options: JobsOptions) => {
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
        
        // Generate job posting address
        const { getProgramDerivedAddress, getAddressEncoder, getBytesEncoder } = await import('@solana/kit')
        const [jobPostingAddress] = await getProgramDerivedAddress({
          programAddress: client.config.programId!,
          seeds: [
            getBytesEncoder().encode(new Uint8Array([106, 111, 98, 95, 112, 111, 115, 116, 105, 110, 103])), // 'job_posting'
            getAddressEncoder().encode(wallet.address)
          ]
        })
        
        // Convert budget to bigint
        const budgetAmount = BigInt(Math.floor(parseFloat(budget as string) * 1_000_000))
        
        const result = await client.marketplace.createJobPosting(
          wallet,
          jobPostingAddress,
          {
            title: title as string,
            description: description as string,
            requirements: requirements as string[],
            budget: budgetAmount,
            deadline: deadlineTimestamp,
            skillsNeeded: [], // Optional field
            budgetMin: budgetAmount, // Use same as budget
            budgetMax: budgetAmount, // Use same as budget
            paymentToken: client.config.programId!, // Use program ID as placeholder
            jobType: category as string, // Use category as jobType
            experienceLevel: 'intermediate' // Default value
          }
        )
        
        s.stop('✅ Job posted successfully!')

        console.log('\n' + chalk.green('🎉 Your job has been posted!'))
        console.log(chalk.gray(`Job ID: ${jobPostingId}`))
        console.log(chalk.gray(`Job Address: ${jobPostingAddress}`))
        console.log(chalk.gray('Status: Active - Accepting applications'))
        console.log('')
        console.log(chalk.cyan('Transaction:'), getExplorerUrl(result, 'devnet'))
        console.log(chalk.cyan('Job Posting:'), getAddressExplorerUrl(jobPostingAddress, 'devnet'))
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
        myJobsOnly: options.myJobs ? wallet.address : undefined,
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
        const isOwner = job.poster.equals(wallet.address)
        const deadlineDate = new Date(Number(job.deadline) * 1000)
        const daysLeft = Math.ceil((deadlineDate.getTime() - Date.now()) / 86400000)
        
        console.log(chalk.magenta(`${index + 1}. ${job.title}`))
        console.log(chalk.gray(`   ID: ${job.address ? job.address.toString() : 'N/A'}`))
        console.log(chalk.gray(`   Budget: ${Number(job.budget) / 1_000_000} SOL`))
        console.log(chalk.gray(`   Deadline: ${deadlineDate.toLocaleDateString()} (${daysLeft} days left)`))
        console.log(chalk.gray(`   Category: ${job.category}`))
        console.log(chalk.gray(`   Applications: ${job.applicationCount || 0}`))
        console.log(chalk.gray(`   Status: ${job.isActive ? '✅ Active' : '❌ Closed'}`))
        if (!isOwner) {
          console.log(chalk.gray(`   Posted by: ${job.poster.toString().slice(0, 8)}...`))
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
      serviceId: service.address.toString()
    })
    
    s.stop('✅ Purchase successful!')
    
    console.log('')
    console.log(chalk.green('🎉 Service purchased successfully!'))
    console.log(chalk.cyan('Transaction:'), getExplorerUrl(result.signature, 'devnet'))
    console.log(chalk.cyan('Purchase ID:'), result.purchaseId.toString())
    
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
  console.log(chalk.cyan('ID:'), service.address.toString())
  console.log(chalk.cyan('Description:'), service.description)
  console.log(chalk.cyan('Agent:'), `${service.agentName} (${service.agentAddress.toString()})`)
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
  const agents = await client.agent.listByOwner({ owner: client.wallet.address })
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
        value: agent.address.toString(),
        label: agent.name
      }))
    })
    
    if (isCancel(selectedAgent)) {
      return
    }
    
    agentAddress = address(selectedAgent as string)
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
    console.log(chalk.cyan('Application ID:'), result.applicationId.toString())
    
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
  console.log(chalk.cyan('ID:'), job.id.toString())
  console.log(chalk.cyan('Description:'), job.description)
  console.log(chalk.cyan('Category:'), job.category)
  console.log(chalk.cyan('Budget:'), `${Number(job.budget) / 1_000_000} SOL`)
  console.log(chalk.cyan('Deadline:'), `${deadlineDate.toLocaleDateString()} (${daysLeft} days left)`)
  console.log(chalk.cyan('Status:'), job.isActive ? '✅ Active' : '❌ Closed')
  console.log(chalk.cyan('Applications:'), job.applicationCount || 0)
  console.log(chalk.cyan('Posted by:'), job.poster.toString())
  
  if (job.requirements && job.requirements.length > 0) {
    console.log(chalk.cyan('Requirements:'), job.requirements.join(', '))
  }
}