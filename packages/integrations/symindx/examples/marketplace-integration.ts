/**
 * @fileoverview Marketplace Integration Example
 * @description Shows how SyminDx agents can create service listings and manage orders
 */

import { createSyminDxExtension, Constants } from '../src/index';
import type { Address } from '@solana/addresses';

/**
 * Service listing creation example
 */
async function createServiceListing() {
  console.log('🛍️ Starting service listing creation example...');
  
  try {
    const extension = await createSyminDxExtension({
      network: 'devnet',
      programId: '367WUUpQTxXYUZqFyo9rDpgfJtH7mfGxX9twahdUmaEK' as Address,
      agentName: 'MarketplaceAgent',
      agentDescription: 'An AI agent providing marketplace services',
      agentCapabilities: ['text_generation', 'data_processing', 'code_analysis'],
      enableDebugLogging: true,
    });
    
    await extension.initialize();
    console.log('✅ Extension initialized');
    
    // Set up event listeners for marketplace events
    extension.events.subscribe('service:listed', (event) => {
      console.log('🎯 Service listed:', event.listingId);
      console.log('📋 Listing details:', event.listing);
    });
    
    extension.events.subscribe('order:created', (event) => {
      console.log('📦 Order created:', event.orderId);
      console.log('💼 Order details:', event.order);
    });
    
    // Simulate agent registration first
    const agentId = 'marketplace_agent_456';
    extension.events.simulateAgentRegistered(agentId, {
      id: agentId,
      name: 'MarketplaceAgent',
      owner: '11111111111111111111111111111112' as Address,
      capabilities: ['text_generation', 'data_processing', 'code_analysis'],
      reputation: 85,
      isActive: true,
      lastActivity: Date.now(),
      metadata: {
        specialization: 'AI Services',
        experience: '2 years',
      },
    });
    
    // Create service listings
    const listings = [
      {
        title: 'AI Text Generation Service',
        description: 'High-quality text generation for various purposes including articles, summaries, and creative content.',
        price: BigInt(1000000), // 0.001 SOL in lamports
        category: 'ai_services',
        tags: ['text', 'generation', 'ai', 'content'],
        deliveryTimeHours: 24,
        requirements: ['Clear instructions', 'Target audience specification'],
        metadata: {
          quality: 'premium',
          turnaround: 'fast',
        },
      },
      {
        title: 'Data Analysis & Insights',
        description: 'Comprehensive data analysis with actionable insights and visualizations.',
        price: BigInt(2500000), // 0.0025 SOL in lamports
        category: 'data_analysis',
        tags: ['data', 'analysis', 'insights', 'visualization'],
        deliveryTimeHours: 48,
        requirements: ['Clean dataset', 'Analysis objectives'],
        metadata: {
          formats: ['CSV', 'JSON', 'Excel'],
          tools: ['Python', 'R', 'SQL'],
        },
      },
      {
        title: 'Code Review & Optimization',
        description: 'Professional code review with optimization recommendations and best practices.',
        price: BigInt(1500000), // 0.0015 SOL in lamports
        category: 'development',
        tags: ['code', 'review', 'optimization', 'best-practices'],
        deliveryTimeHours: 12,
        requirements: ['Source code access', 'Programming language specification'],
        metadata: {
          languages: ['JavaScript', 'TypeScript', 'Python', 'Rust'],
          focus: ['performance', 'security', 'maintainability'],
        },
      },
    ];
    
    // Create the service listings
    for (const listing of listings) {
      console.log(`📝 Creating service: ${listing.title}`);
      
      // Simulate service listing creation
      const listingId = `listing_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      extension.events.simulateServiceListed(listingId, agentId, {
        id: listingId,
        agentId,
        title: listing.title,
        description: listing.description,
        price: listing.price,
        category: listing.category,
        isActive: true,
        tags: listing.tags,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      
      // Store in memory
      await extension.memory.setServiceListing(listingId, {
        id: listingId,
        agentId,
        title: listing.title,
        description: listing.description,
        price: listing.price,
        category: listing.category,
        isActive: true,
        tags: listing.tags,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    }
    
    // Get all service listings for the agent
    const agentListings = await extension.memory.getAgentServiceListings(agentId);
    console.log(`📊 Agent has ${agentListings.length} service listings`);
    
    for (const listing of agentListings) {
      console.log(`  - ${listing.title}: ${listing.price} lamports`);
    }
    
    console.log('✅ Service listing creation example completed');
    
  } catch (error) {
    console.error('❌ Error in service listing creation:', error);
  }
}

/**
 * Work order management example
 */
async function workOrderManagement() {
  console.log('📋 Starting work order management example...');
  
  try {
    const extension = await createSyminDxExtension({
      network: 'devnet',
      programId: '367WUUpQTxXYUZqFyo9rDpgfJtH7mfGxX9twahdUmaEK' as Address,
      agentName: 'OrderAgent',
      agentDescription: 'An AI agent managing work orders',
      agentCapabilities: ['project_management', 'task_automation'],
      enableDebugLogging: true,
    });
    
    await extension.initialize();
    console.log('✅ Extension initialized');
    
    // Set up event listeners
    extension.events.subscribe('order:created', (event) => {
      console.log('📦 New order received:', event.orderId);
    });
    
    extension.events.subscribe('order:updated', (event) => {
      console.log('🔄 Order updated:', event.orderId);
    });
    
    extension.events.subscribe('payment:processed', (event) => {
      console.log('💰 Payment processed for order:', event.workOrderId);
    });
    
    // Create a work order with milestones
    const orderId = 'order_' + Date.now();
    const clientAddress = '22222222222222222222222222222222' as Address;
    const agentAddress = '33333333333333333333333333333333' as Address;
    
    const workOrder = {
      id: orderId,
      serviceListingId: 'listing_123',
      client: clientAddress,
      agent: agentAddress,
      status: 'pending' as const,
      totalAmount: BigInt(5000000), // 0.005 SOL
      escrowAmount: BigInt(5000000),
      deadline: Date.now() + (7 * 24 * 60 * 60 * 1000), // 7 days
      milestones: [
        {
          description: 'Initial research and planning',
          amount: BigInt(1500000),
          completed: false,
        },
        {
          description: 'Development and implementation',
          amount: BigInt(2500000),
          completed: false,
        },
        {
          description: 'Testing and final delivery',
          amount: BigInt(1000000),
          completed: false,
        },
      ],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    
    // Simulate order creation
    extension.events.simulateOrderCreated(orderId, workOrder);
    
    // Store in memory
    await extension.memory.setWorkOrder(orderId, workOrder);
    
    // Simulate milestone completion
    console.log('🎯 Completing milestones...');
    
    for (let i = 0; i < workOrder.milestones.length; i++) {
      const milestone = workOrder.milestones[i];
      
      setTimeout(() => {
        console.log(`✅ Milestone ${i + 1} completed: ${milestone.description}`);
        
        // Update milestone status
        milestone.completed = true;
        workOrder.updatedAt = Date.now();
        
        // Simulate payment processing
        extension.events.simulatePaymentProcessed(orderId, milestone.amount, i);
        
        // Update in memory
        extension.memory.setWorkOrder(orderId, workOrder);
      }, (i + 1) * 1000); // Stagger completions
    }
    
    // Check all work orders after completion
    setTimeout(async () => {
      const allOrders = await extension.memory.getAllWorkOrders();
      console.log(`📊 Total work orders: ${allOrders.length}`);
      
      for (const order of allOrders) {
        const completedMilestones = order.milestones?.filter(m => m.completed).length || 0;
        const totalMilestones = order.milestones?.length || 0;
        console.log(`  - Order ${order.id}: ${completedMilestones}/${totalMilestones} milestones completed`);
      }
      
      console.log('✅ Work order management example completed');
    }, 4000);
    
  } catch (error) {
    console.error('❌ Error in work order management:', error);
  }
}

/**
 * Marketplace analytics example
 */
async function marketplaceAnalytics() {
  console.log('📈 Starting marketplace analytics example...');
  
  try {
    const extension = await createSyminDxExtension({
      network: 'devnet',
      programId: '367WUUpQTxXYUZqFyo9rDpgfJtH7mfGxX9twahdUmaEK' as Address,
      agentName: 'AnalyticsAgent',
      agentDescription: 'An AI agent providing marketplace analytics',
      agentCapabilities: ['data_analysis', 'recommendation'],
      enableDebugLogging: true,
    });
    
    await extension.initialize();
    console.log('✅ Extension initialized');
    
    // Generate sample data
    const sampleAgents = [
      { id: 'agent_1', name: 'TextGen Pro', category: 'ai_services', reputation: 95 },
      { id: 'agent_2', name: 'Data Wizard', category: 'data_analysis', reputation: 88 },
      { id: 'agent_3', name: 'Code Master', category: 'development', reputation: 92 },
      { id: 'agent_4', name: 'Design AI', category: 'design', reputation: 85 },
    ];
    
    const sampleListings = [
      { agentId: 'agent_1', category: 'ai_services', price: BigInt(1000000), active: true },
      { agentId: 'agent_1', category: 'ai_services', price: BigInt(1500000), active: true },
      { agentId: 'agent_2', category: 'data_analysis', price: BigInt(2500000), active: true },
      { agentId: 'agent_3', category: 'development', price: BigInt(3000000), active: false },
      { agentId: 'agent_4', category: 'design', price: BigInt(2000000), active: true },
    ];
    
    const sampleOrders = [
      { agentId: 'agent_1', amount: BigInt(1000000), status: 'completed' },
      { agentId: 'agent_2', amount: BigInt(2500000), status: 'active' },
      { agentId: 'agent_3', amount: BigInt(3000000), status: 'completed' },
      { agentId: 'agent_1', amount: BigInt(1500000), status: 'pending' },
    ];
    
    // Populate memory with sample data
    for (const agent of sampleAgents) {
      await extension.memory.setAgent(agent.id, {
        id: agent.id,
        name: agent.name,
        owner: '11111111111111111111111111111112' as Address,
        capabilities: [agent.category],
        reputation: agent.reputation,
        isActive: true,
        lastActivity: Date.now(),
        metadata: { category: agent.category },
      });
    }
    
    // Generate analytics
    console.log('📊 Generating marketplace analytics...');
    
    // Agent performance metrics
    const allAgents = await extension.memory.getAllAgents();
    const avgReputation = allAgents.reduce((sum, agent) => sum + agent.reputation, 0) / allAgents.length;
    console.log(`👥 Total agents: ${allAgents.length}`);
    console.log(`⭐ Average reputation: ${avgReputation.toFixed(1)}`);
    
    // Category distribution
    const categoryCount: Record<string, number> = {};
    allAgents.forEach(agent => {
      const category = agent.metadata?.category || 'unknown';
      categoryCount[category] = (categoryCount[category] || 0) + 1;
    });
    
    console.log('📋 Category distribution:');
    Object.entries(categoryCount).forEach(([category, count]) => {
      console.log(`  - ${category}: ${count} agents`);
    });
    
    // Price analysis
    console.log('💰 Price analysis:');
    const prices = sampleListings.filter(l => l.active).map(l => Number(l.price));
    const avgPrice = prices.reduce((sum, price) => sum + price, 0) / prices.length;
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    
    console.log(`  - Average price: ${(avgPrice / 1e9).toFixed(6)} SOL`);
    console.log(`  - Price range: ${(minPrice / 1e9).toFixed(6)} - ${(maxPrice / 1e9).toFixed(6)} SOL`);
    
    // Memory statistics
    const memStats = extension.memory.getStatistics();
    console.log('🧠 Memory statistics:', memStats);
    
    console.log('✅ Marketplace analytics example completed');
    
  } catch (error) {
    console.error('❌ Error in marketplace analytics:', error);
  }
}

/**
 * Run all marketplace examples
 */
async function runMarketplaceExamples() {
  console.log('🛍️ Running marketplace integration examples...\n');
  
  await createServiceListing();
  console.log('\n' + '='.repeat(50) + '\n');
  
  await workOrderManagement();
  console.log('\n' + '='.repeat(50) + '\n');
  
  await marketplaceAnalytics();
  
  console.log('\n🎉 All marketplace examples completed successfully!');
}

// Run examples if this file is executed directly
if (require.main === module) {
  runMarketplaceExamples().catch(console.error);
}

export {
  createServiceListing,
  workOrderManagement,
  marketplaceAnalytics,
  runMarketplaceExamples,
};