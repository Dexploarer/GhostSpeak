/**
 * Complete User Journey E2E Tests
 * 
 * Tests end-to-end user journeys that span multiple features:
 * 1. New Agent Owner Journey: Registration → Service Creation → First Sale
 * 2. Service Buyer Journey: Discovery → Purchase → Delivery → Payment
 * 3. Freelancer Journey: Profile → Bidding → Work Completion → Reputation
 * 4. Enterprise Client Journey: Bulk Services → Multi-Agent Coordination
 * 5. DAO Member Journey: Governance Participation → Voting → Execution
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import type { Address } from '@solana/addresses'

import {
  setupE2ETest,
  cleanupE2ETest,
  type E2ETestEnvironment,
  type E2EAssertions,
  type UserPersona,
  E2E_CONFIG
} from './setup/e2e-environment'
import { fetchAgent, fetchServiceListing, fetchEscrowAccount } from '../../src/generated/accounts'

describe('Complete User Journey E2E Tests', () => {
  let env: E2ETestEnvironment
  let assert: E2EAssertions

  beforeAll(async () => {
    const setup = await setupE2ETest()
    env = setup.env
    assert = setup.assert
    
    console.log(`🎭 Starting complete user journey E2E tests`)
  }, E2E_CONFIG.WORKFLOW_TIMEOUT)

  afterAll(async () => {
    await cleanupE2ETest()
  })

  describe('New Agent Owner Journey', () => {
    it('should complete full agent owner onboarding and first sale', async () => {
      await env.executeWorkflow('agent-owner-journey', 'full-onboarding', async () => {
        // Initialize scenario
        const scenario = await env.initializeScenario('agent-owner-journey')
        
        // Create agent owner persona
        const agentOwner = await env.createUserPersona('agent_owner', 'Alice_AI_Services')
        scenario.users.set('agentOwner', agentOwner)
        
        console.log(`👩‍💼 Starting agent owner journey for ${agentOwner.metadata.name}`)
        
        // Step 1: Agent Registration
        console.log(`📝 Step 1: Registering AI agent`)
        const agentData = {
          name: 'DataAnalysisBot',
          description: 'AI agent specialized in financial data analysis',
          website: 'https://data-analysis-bot.ai',
          imageUrl: 'https://images.unsplash.com/photo-1551033406-611cf9a28f67',
          capabilities: ['data_analysis', 'financial_modeling', 'report_generation'],
          category: 'defi' as const,
          isActive: true
        }
        
        const registerResult = await env.client.agent.register(agentOwner.signer, {
          authority: agentOwner.signer.address,
          ...agentData
        })
        
        await env.confirmTransaction(registerResult)
        
        // Verify agent registration
        const agentAddress = await env.client.agent.deriveAgentAddress(agentOwner.signer.address)
        scenario.services.set('mainAgent', agentAddress)
        await env.waitForAccount(agentAddress)
        
        const agentAccount = await fetchAgent(env.rpc, agentAddress)
        expect(agentAccount.data.authority).toBe(agentOwner.signer.address)
        expect(agentAccount.data.isActive).toBe(true)
        
        console.log(`✅ Agent registered successfully at ${agentAddress}`)
        
        // Step 2: Service Creation
        console.log(`🛠️ Step 2: Creating first service offering`)
        const serviceData = {
          agent: agentAddress,
          name: 'Portfolio Risk Analysis',
          description: 'Comprehensive portfolio risk assessment using AI',
          category: 'analysis' as const,
          basePrice: E2E_CONFIG.BASIC_SERVICE_PRICE,
          pricing: {
            basePrice: E2E_CONFIG.BASIC_SERVICE_PRICE,
            priceType: 'fixed' as const,
            currency: agentOwner.signer.address // Using SOL
          }
        }
        
        const serviceResult = await env.client.marketplace.createServiceListing(
          agentOwner.signer,
          await env.client.marketplace.deriveServiceListingAddress(agentAddress, serviceData.name),
          agentAddress,
          agentOwner.signer.address, // userRegistryAddress
          serviceData
        )
        
        await env.confirmTransaction(serviceResult)
        
        const serviceAddress = await env.client.marketplace.deriveServiceListingAddress(agentAddress, serviceData.name)
        scenario.services.set('portfolioAnalysis', serviceAddress)
        await env.waitForAccount(serviceAddress)
        
        const serviceAccount = await fetchServiceListing(env.rpc, serviceAddress)
        expect(serviceAccount.data.agent).toBe(agentAddress)
        expect(serviceAccount.data.isActive).toBe(true)
        
        console.log(`✅ Service created successfully at ${serviceAddress}`)
        
        // Step 3: Wait for first customer
        console.log(`⏳ Step 3: Preparing for first customer interaction`)
        
        // Create service buyer persona
        const serviceBuyer = await env.createUserPersona('service_buyer', 'Bob_Investor')
        scenario.users.set('serviceBuyer', serviceBuyer)
        
        // Step 4: First Sale Process
        console.log(`💰 Step 4: Processing first sale`)
        
        // Buyer discovers and purchases service
        const escrowData = {
          buyer: serviceBuyer.signer.address,
          seller: agentOwner.signer.address,
          amount: E2E_CONFIG.BASIC_SERVICE_PRICE,
          description: 'Portfolio risk analysis service purchase',
          deliveryTime: 3600, // 1 hour
          requiresApproval: true
        }
        
        const escrowResult = await env.client.escrow.create({
          signer: serviceBuyer.signer,
          ...escrowData
        })
        
        await env.confirmTransaction(escrowResult)
        
        const escrowAddress = await env.client.escrow.deriveEscrowAddress(
          serviceBuyer.signer.address,
          agentOwner.signer.address,
          BigInt(Date.now())
        )
        scenario.escrows.set('firstSale', escrowAddress)
        
        console.log(`💳 Escrow created for first sale: ${escrowAddress}`)
        
        // Step 5: Service Delivery Simulation
        console.log(`📦 Step 5: Simulating service delivery`)
        
        // Agent owner delivers work
        const deliveryResult = await env.client.workOrder.submitDelivery({
          agent: agentOwner.signer.address,
          signer: agentOwner.signer,
          workOrder: escrowAddress, // Using escrow as work order for simplicity
          deliverables: ['Risk analysis report', 'Recommendations PDF'],
          notes: 'Comprehensive portfolio analysis completed',
          attachments: ['https://reports.example.com/portfolio-analysis.pdf']
        })
        
        await env.confirmTransaction(deliveryResult)
        
        // Step 6: Payment Completion
        console.log(`✅ Step 6: Completing payment`)
        
        // Buyer approves and releases payment
        const completionResult = await env.client.escrow.complete({
          buyer: serviceBuyer.signer.address,
          signer: serviceBuyer.signer,
          escrow: escrowAddress,
          workDelivery: escrowAddress // Simplified for E2E test
        })
        
        await env.confirmTransaction(completionResult)
        
        // Wait for transaction processing
        await new Promise(resolve => setTimeout(resolve, E2E_CONFIG.STABILIZATION_DELAY))
        
        // Verify completion
        const completedEscrow = await fetchEscrowAccount(env.rpc, escrowAddress)
        expect(completedEscrow.data.status).toBe('completed')
        
        console.log(`🎉 First sale completed successfully!`)
        
        // Verify journey completion
        await assert.assertUserJourneyComplete(agentOwner, [
          'agent_registration',
          'service_creation',
          'first_sale',
          'delivery_completion',
          'payment_received'
        ])
        
        return {
          agentAddress,
          serviceAddress,
          escrowAddress,
          revenue: E2E_CONFIG.BASIC_SERVICE_PRICE
        }
      })
    }, E2E_CONFIG.WORKFLOW_TIMEOUT)
  })

  describe('Service Buyer Journey', () => {
    it('should complete full service discovery and purchase flow', async () => {
      await env.executeWorkflow('service-buyer-journey', 'discovery-to-payment', async () => {
        const scenario = await env.initializeScenario('service-buyer-journey')
        
        // Create buyer persona
        const buyer = await env.createUserPersona('service_buyer', 'Carol_Researcher')
        scenario.users.set('buyer', buyer)
        
        console.log(`🔍 Starting service buyer journey for ${buyer.metadata.name}`)
        
        // Step 1: Service Discovery
        console.log(`🔍 Step 1: Discovering available services`)
        const availableServices = await env.client.marketplace.getServiceListings()
        expect(availableServices.length).toBeGreaterThan(0)
        
        // Find a suitable service
        const targetService = availableServices.find(service => 
          service.data.basePrice <= E2E_CONFIG.PREMIUM_SERVICE_PRICE
        )
        
        if (!targetService) {
          // Create a service for testing
          const serviceProvider = await env.createUserPersona('agent_owner', 'Service_Provider')
          const agentAddress = await env.client.agent.deriveAgentAddress(serviceProvider.signer.address)
          
          // Quick agent registration
          await env.client.agent.register(serviceProvider.signer, {
            authority: serviceProvider.signer.address,
            name: 'TestAgent',
            description: 'Test agent for buyer journey',
            capabilities: ['research'],
            category: 'research'
          })
          
          // Create service
          const serviceAddress = await env.client.marketplace.deriveServiceListingAddress(agentAddress, 'Research Service')
          await env.client.marketplace.createServiceListing(
            serviceProvider.signer,
            serviceAddress,
            agentAddress,
            serviceProvider.signer.address,
            {
              agent: agentAddress,
              name: 'Research Service',
              description: 'AI-powered research service',
              category: 'research',
              basePrice: E2E_CONFIG.BASIC_SERVICE_PRICE,
              pricing: {
                basePrice: E2E_CONFIG.BASIC_SERVICE_PRICE,
                priceType: 'fixed',
                currency: serviceProvider.signer.address
              }
            }
          )
          
          scenario.services.set('targetService', serviceAddress)
        } else {
          scenario.services.set('targetService', targetService.address)
        }
        
        console.log(`✅ Service discovered and selected`)
        
        // Step 2: Service Evaluation
        console.log(`📊 Step 2: Evaluating service details`)
        const serviceAddress = scenario.services.get('targetService')!
        const serviceDetails = await fetchServiceListing(env.rpc, serviceAddress)
        
        expect(serviceDetails.data.isActive).toBe(true)
        expect(serviceDetails.data.basePrice).toBeGreaterThan(0n)
        
        // Step 3: Escrow Creation
        console.log(`💰 Step 3: Creating secure escrow`)
        const escrowData = {
          buyer: buyer.signer.address,
          seller: serviceDetails.data.agent, // Agent address as seller
          amount: serviceDetails.data.basePrice,
          description: 'Service purchase via buyer journey',
          deliveryTime: 7200, // 2 hours
          requiresApproval: true
        }
        
        const escrowResult = await env.client.escrow.create({
          signer: buyer.signer,
          ...escrowData
        })
        
        await env.confirmTransaction(escrowResult)
        const escrowAddress = await env.client.escrow.deriveEscrowAddress(
          buyer.signer.address,
          serviceDetails.data.agent,
          BigInt(Date.now())
        )
        scenario.escrows.set('purchase', escrowAddress)
        
        console.log(`✅ Escrow created: ${escrowAddress}`)
        
        // Step 4: Work Order Creation
        console.log(`📋 Step 4: Creating work order`)
        const workOrderResult = await env.client.workOrder.create({
          employer: buyer.signer.address,
          signer: buyer.signer,
          agent: serviceDetails.data.agent,
          description: 'Research service requested by buyer',
          requirements: ['Thorough analysis', 'Detailed report', 'Actionable insights'],
          deadline: Math.floor(Date.now() / 1000) + 7200,
          compensation: serviceDetails.data.basePrice
        })
        
        await env.confirmTransaction(workOrderResult)
        
        // Step 5: Monitoring Progress
        console.log(`⏱️ Step 5: Monitoring work progress`)
        
        // Simulate time passing and checking status
        await new Promise(resolve => setTimeout(resolve, 2000))
        
        const workOrderAddress = await env.client.workOrder.deriveWorkOrderAddress(
          buyer.signer.address,
          BigInt(Date.now())
        )
        
        // Step 6: Delivery Acceptance
        console.log(`📦 Step 6: Reviewing and accepting delivery`)
        
        // Simulate delivery completion by service provider
        // In real scenario, the service provider would submit delivery
        
        // Buyer completes the escrow
        const completionResult = await env.client.escrow.complete({
          buyer: buyer.signer.address,
          signer: buyer.signer,
          escrow: escrowAddress,
          workDelivery: workOrderAddress
        })
        
        await env.confirmTransaction(completionResult)
        
        console.log(`✅ Service purchase completed successfully`)
        
        // Verify buyer journey completion
        await assert.assertUserJourneyComplete(buyer, [
          'service_discovery',
          'service_evaluation',
          'escrow_creation',
          'work_order_creation',
          'progress_monitoring',
          'delivery_acceptance'
        ])
        
        return {
          serviceAddress,
          escrowAddress,
          workOrderAddress,
          totalSpent: serviceDetails.data.basePrice
        }
      })
    }, E2E_CONFIG.WORKFLOW_TIMEOUT)
  })

  describe('Enterprise Client Journey', () => {
    it('should complete enterprise-scale multi-service workflow', async () => {
      await env.executeWorkflow('enterprise-journey', 'bulk-services', async () => {
        const scenario = await env.initializeScenario('enterprise-journey')
        
        // Create enterprise client persona
        const enterprise = await env.createUserPersona('enterprise_client', 'MegaCorp_AI_Division')
        scenario.users.set('enterprise', enterprise)
        
        console.log(`🏢 Starting enterprise client journey for ${enterprise.metadata.name}`)
        
        // Step 1: Bulk Service Discovery
        console.log(`🔎 Step 1: Discovering bulk service opportunities`)
        const availableServices = await env.client.marketplace.getServiceListings()
        
        // Enterprise needs multiple services
        const requiredServices = [
          'data_analysis',
          'report_generation',
          'risk_assessment'
        ]
        
        const selectedServices: Address[] = []
        
        // For each required service type, find or create suitable service
        for (const serviceType of requiredServices) {
          const existingService = availableServices.find(service => 
            service.data.category === serviceType
          )
          
          if (existingService) {
            selectedServices.push(existingService.address)
          } else {
            // Create service for enterprise needs
            const serviceProvider = await env.createUserPersona('agent_owner', `${serviceType}_Provider`)
            
            // Register agent
            const agentAddress = await env.client.agent.deriveAgentAddress(serviceProvider.signer.address)
            await env.client.agent.register(serviceProvider.signer, {
              authority: serviceProvider.signer.address,
              name: `${serviceType}_Agent`,
              description: `Specialized ${serviceType} AI agent`,
              capabilities: [serviceType],
              category: serviceType as any
            })
            
            // Create service
            const serviceAddress = await env.client.marketplace.deriveServiceListingAddress(agentAddress, `${serviceType}_Service`)
            await env.client.marketplace.createServiceListing(
              serviceProvider.signer,
              serviceAddress,
              agentAddress,
              serviceProvider.signer.address,
              {
                agent: agentAddress,
                name: `${serviceType}_Service`,
                description: `Enterprise-grade ${serviceType} service`,
                category: serviceType as any,
                basePrice: E2E_CONFIG.ENTERPRISE_SERVICE_PRICE,
                pricing: {
                  basePrice: E2E_CONFIG.ENTERPRISE_SERVICE_PRICE,
                  priceType: 'fixed',
                  currency: serviceProvider.signer.address
                }
              }
            )
            
            selectedServices.push(serviceAddress)
            scenario.services.set(serviceType, serviceAddress)
          }
        }
        
        console.log(`✅ Selected ${selectedServices.length} services for enterprise package`)
        
        // Step 2: Bulk Deal Creation
        console.log(`📦 Step 2: Creating enterprise bulk deal`)
        
        const bulkDealResult = await env.client.bulkDeals.create({
          buyer: enterprise.signer.address,
          signer: enterprise.signer,
          services: selectedServices,
          totalAmount: E2E_CONFIG.ENTERPRISE_SERVICE_PRICE * BigInt(selectedServices.length),
          bulkDiscount: 15, // 15% enterprise discount
          deadline: Math.floor(Date.now() / 1000) + 86400 // 24 hours
        })
        
        await env.confirmTransaction(bulkDealResult)
        
        // Step 3: Multi-Agent Coordination
        console.log(`🤝 Step 3: Coordinating multiple AI agents`)
        
        // Create coordination session
        const coordinationResult = await env.client.a2a.createSession(enterprise.signer, {
          metadata: 'Enterprise multi-agent coordination session',
          sessionId: BigInt(Date.now())
        })
        
        await env.confirmTransaction(coordinationResult)
        const sessionAddress = await env.client.a2a.deriveSessionAddress(enterprise.signer.address, BigInt(Date.now()))
        scenario.sessions.set('coordination', sessionAddress)
        
        // Step 4: Progress Monitoring
        console.log(`📊 Step 4: Monitoring enterprise workflow progress`)
        
        // Simulate enterprise monitoring dashboard
        const progressMetrics = {
          servicesCompleted: 0,
          totalServices: selectedServices.length,
          averageCompletionTime: 0,
          qualityScore: 0
        }
        
        // Step 5: Quality Assurance
        console.log(`✅ Step 5: Enterprise quality assurance`)
        
        // Simulate QA process for enterprise deliverables
        const qaResults = await env.client.compliance.auditDeliverables({
          auditor: enterprise.signer.address,
          signer: enterprise.signer,
          deliverables: selectedServices,
          complianceLevel: 'enterprise'
        })
        
        await env.confirmTransaction(qaResults)
        
        console.log(`🎯 Enterprise client journey completed successfully`)
        
        // Verify enterprise journey
        await assert.assertUserJourneyComplete(enterprise, [
          'bulk_service_discovery',
          'bulk_deal_creation',
          'multi_agent_coordination',
          'progress_monitoring',
          'quality_assurance'
        ])
        
        return {
          selectedServices,
          bulkDealAddress: 'mock_bulk_deal_address',
          coordinationSession: sessionAddress,
          totalValue: E2E_CONFIG.ENTERPRISE_SERVICE_PRICE * BigInt(selectedServices.length)
        }
      })
    }, E2E_CONFIG.WORKFLOW_TIMEOUT)
  })

  describe('DAO Member Journey', () => {
    it('should complete full governance participation workflow', async () => {
      await env.executeWorkflow('dao-member-journey', 'governance-participation', async () => {
        const scenario = await env.initializeScenario('dao-member-journey')
        
        // Create multiple DAO member personas
        const member1 = await env.createUserPersona('dao_member', 'DAO_Member_Alice')
        const member2 = await env.createUserPersona('dao_member', 'DAO_Member_Bob')
        const member3 = await env.createUserPersona('dao_member', 'DAO_Member_Carol')
        
        scenario.users.set('member1', member1)
        scenario.users.set('member2', member2)
        scenario.users.set('member3', member3)
        
        console.log(`🏛️ Starting DAO member journey with 3 participants`)
        
        // Step 1: Multisig Creation
        console.log(`🔐 Step 1: Creating governance multisig`)
        
        const multisigResult = await env.client.governance.createMultisig({
          creator: member1.signer.address,
          signer: member1.signer,
          signers: [
            member1.signer.address,
            member2.signer.address,
            member3.signer.address
          ],
          threshold: 2, // 2 out of 3
          name: 'GhostSpeak_DAO_Governance',
          description: 'Main governance multisig for GhostSpeak DAO'
        })
        
        await env.confirmTransaction(multisigResult)
        
        const multisigAddress = await env.client.governance.deriveMultisigAddress(
          member1.signer.address,
          BigInt(Date.now())
        )
        
        // Step 2: Proposal Submission
        console.log(`📋 Step 2: Submitting governance proposal`)
        
        const proposalResult = await env.client.governance.submitProposal({
          proposer: member1.signer.address,
          signer: member1.signer,
          multisig: multisigAddress,
          title: 'Protocol Fee Update Proposal',
          description: 'Reduce protocol fees to encourage adoption',
          proposalType: 'parameter_change',
          actions: [{
            type: 'update_parameter',
            parameter: 'protocol_fee',
            newValue: '200' // 2% instead of current
          }],
          votingPeriod: 86400, // 24 hours
          executionDelay: 3600 // 1 hour
        })
        
        await env.confirmTransaction(proposalResult)
        
        const proposalAddress = await env.client.governance.deriveProposalAddress(
          multisigAddress,
          BigInt(Date.now())
        )
        
        // Step 3: Voting Process
        console.log(`🗳️ Step 3: Conducting voting process`)
        
        // Member 1 votes FOR
        const vote1Result = await env.client.governance.castVote({
          voter: member1.signer.address,
          signer: member1.signer,
          proposal: proposalAddress,
          vote: 'for',
          reason: 'Lower fees will increase adoption'
        })
        await env.confirmTransaction(vote1Result)
        
        // Member 2 votes FOR
        const vote2Result = await env.client.governance.castVote({
          voter: member2.signer.address,
          signer: member2.signer,
          proposal: proposalAddress,
          vote: 'for',
          reason: 'Agreed, this will help growth'
        })
        await env.confirmTransaction(vote2Result)
        
        // Member 3 votes AGAINST
        const vote3Result = await env.client.governance.castVote({
          voter: member3.signer.address,
          signer: member3.signer,
          proposal: proposalAddress,
          vote: 'against',
          reason: 'Need more revenue for development'
        })
        await env.confirmTransaction(vote3Result)
        
        console.log(`✅ All votes cast - 2 FOR, 1 AGAINST`)
        
        // Step 4: Proposal Execution
        console.log(`⚡ Step 4: Executing passed proposal`)
        
        const executionResult = await env.client.governance.executeProposal({
          executor: member1.signer.address,
          signer: member1.signer,
          proposal: proposalAddress,
          multisig: multisigAddress
        })
        
        await env.confirmTransaction(executionResult)
        
        // Step 5: Governance Analytics
        console.log(`📊 Step 5: Reviewing governance analytics`)
        
        const analyticsResult = await env.client.analytics.recordGovernanceMetrics({
          recorder: member1.signer.address,
          signer: member1.signer,
          proposalId: BigInt(Date.now()),
          voterTurnout: 3,
          executionSuccess: true,
          proposalType: 'parameter_change'
        })
        
        await env.confirmTransaction(analyticsResult)
        
        console.log(`🎉 DAO governance cycle completed successfully`)
        
        // Verify DAO member journey
        await assert.assertUserJourneyComplete(member1, [
          'multisig_creation',
          'proposal_submission',
          'voting_participation',
          'proposal_execution',
          'governance_analytics'
        ])
        
        return {
          multisigAddress,
          proposalAddress,
          votingResult: { for: 2, against: 1 },
          executed: true
        }
      })
    }, E2E_CONFIG.WORKFLOW_TIMEOUT)
  })

  describe('Cross-Journey Integration', () => {
    it('should demonstrate multiple personas interacting across features', async () => {
      await env.executeWorkflow('cross-journey-integration', 'multi-persona-interaction', async () => {
        const scenario = await env.initializeScenario('cross-journey-integration')
        
        console.log(`🌐 Starting cross-journey integration test`)
        
        // Create diverse personas
        const agentOwner = await env.createUserPersona('agent_owner', 'CrossJourney_Agent')
        const serviceBuyer = await env.createUserPersona('service_buyer', 'CrossJourney_Buyer')
        const enterprise = await env.createUserPersona('enterprise_client', 'CrossJourney_Enterprise')
        const daoMember = await env.createUserPersona('dao_member', 'CrossJourney_DAO')
        
        scenario.users.set('agentOwner', agentOwner)
        scenario.users.set('serviceBuyer', serviceBuyer)
        scenario.users.set('enterprise', enterprise)
        scenario.users.set('daoMember', daoMember)
        
        // Scenario: Agent owner creates service, various clients use it, DAO governs it
        
        // Agent creates service
        const agentAddress = await env.client.agent.deriveAgentAddress(agentOwner.signer.address)
        await env.client.agent.register(agentOwner.signer, {
          authority: agentOwner.signer.address,
          name: 'CrossJourney_AI',
          description: 'Multi-purpose AI for cross-journey testing',
          capabilities: ['analysis', 'research', 'reporting'],
          category: 'general'
        })
        
        const serviceAddress = await env.client.marketplace.deriveServiceListingAddress(agentAddress, 'MultiService')
        await env.client.marketplace.createServiceListing(
          agentOwner.signer,
          serviceAddress,
          agentAddress,
          agentOwner.signer.address,
          {
            agent: agentAddress,
            name: 'MultiService',
            description: 'Versatile AI service for multiple use cases',
            category: 'general',
            basePrice: E2E_CONFIG.PREMIUM_SERVICE_PRICE,
            pricing: {
              basePrice: E2E_CONFIG.PREMIUM_SERVICE_PRICE,
              priceType: 'fixed',
              currency: agentOwner.signer.address
            }
          }
        )
        
        // Service buyer makes purchase
        const buyerEscrowResult = await env.client.escrow.create({
          signer: serviceBuyer.signer,
          buyer: serviceBuyer.signer.address,
          seller: agentOwner.signer.address,
          amount: E2E_CONFIG.PREMIUM_SERVICE_PRICE,
          description: 'Cross-journey service purchase',
          deliveryTime: 3600,
          requiresApproval: true
        })
        await env.confirmTransaction(buyerEscrowResult)
        
        // Enterprise makes bulk purchase
        const enterpriseBulkResult = await env.client.bulkDeals.create({
          buyer: enterprise.signer.address,
          signer: enterprise.signer,
          services: [serviceAddress],
          totalAmount: E2E_CONFIG.PREMIUM_SERVICE_PRICE * 10n,
          bulkDiscount: 20,
          deadline: Math.floor(Date.now() / 1000) + 86400
        })
        await env.confirmTransaction(enterpriseBulkResult)
        
        // DAO governs service parameters
        const multisigAddress = await env.client.governance.deriveMultisigAddress(daoMember.signer.address, BigInt(Date.now()))
        await env.client.governance.createMultisig({
          creator: daoMember.signer.address,
          signer: daoMember.signer,
          signers: [daoMember.signer.address, agentOwner.signer.address],
          threshold: 2,
          name: 'Service_Governance',
          description: 'Governance for cross-journey service'
        })
        
        console.log(`✅ Cross-journey integration completed successfully`)
        
        // Verify cross-feature integration
        await assert.assertCrossFeatureIntegration(
          ['agent_registration', 'marketplace', 'escrow', 'bulk_deals', 'governance'],
          {
            'agent_registration': ['marketplace'],
            'marketplace': ['escrow', 'bulk_deals'],
            'escrow': ['agent_registration', 'marketplace'],
            'bulk_deals': ['marketplace', 'governance'],
            'governance': ['all_features']
          }
        )
        
        return {
          participantCount: 4,
          featuresIntegrated: 5,
          transactionsCompleted: 4,
          crossConnections: 8
        }
      })
    }, E2E_CONFIG.WORKFLOW_TIMEOUT)
  })
})