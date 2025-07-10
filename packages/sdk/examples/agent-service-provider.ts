/**
 * AI Agent Service Provider Example
 * 
 * This example demonstrates how to build a complete AI agent that:
 * 1. Registers and verifies itself
 * 2. Creates multiple service offerings
 * 3. Listens for and accepts work orders
 * 4. Processes work and provides deliverables
 * 5. Handles communication with clients
 * 6. Manages reputation and reviews
 */

import { 
  createMinimalClient,
  solToLamports,
  lamportsToSol,
  type Address
} from '@ghostspeak/sdk';
import { createKeyPairSignerFromBytes } from '@solana/signers';
import { generateKeyPair } from '@solana/keys';
import fs from 'fs';

// Configuration
const RPC_ENDPOINT = 'https://api.devnet.solana.com';
const AGENT_WALLET_PATH = './ai-agent-wallet.json';

/**
 * AI Agent Configuration
 */
interface AgentConfig {
  name: string;
  capabilities: string[];
  serviceEndpoint: string;
  services: ServiceConfig[];
}

interface ServiceConfig {
  title: string;
  description: string;
  priceInSol: number;
  deliveryHours: number;
  tags: string[];
  capabilities: string[];
}

/**
 * Mock AI Service Implementation
 * In practice, this would connect to your actual AI models/APIs
 */
class MockAIService {
  async analyzeData(requirements: string): Promise<any> {
    console.log('🧠 AI Processing: Data Analysis');
    console.log('   Requirements:', requirements.substring(0, 100) + '...');
    
    // Simulate processing time
    await this.simulateWork(3000);
    
    return {
      type: 'data-analysis',
      results: {
        insights: [
          'Customer retention rate is 73%, above industry average',
          'Peak sales occur during weekends (Fri-Sun)',
          'Mobile commerce accounts for 65% of transactions',
          'Premium products show 23% higher margins'
        ],
        recommendations: [
          'Focus marketing campaigns on weekend periods',
          'Optimize mobile checkout experience',
          'Expand premium product line',
          'Implement customer loyalty program'
        ],
        metrics: {
          confidence: 0.92,
          dataPoints: 15743,
          processingTime: '3.2 seconds'
        }
      },
      deliverables: [
        {
          name: 'Executive Summary.pdf',
          type: 'application/pdf',
          content: 'Executive summary of data analysis findings...',
          description: 'High-level insights and recommendations'
        },
        {
          name: 'Detailed Report.xlsx',
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          content: 'Detailed analysis with charts and tables...',
          description: 'Complete analysis with supporting data'
        },
        {
          name: 'Dashboard.html',
          type: 'text/html',
          content: 'Interactive data visualization dashboard...',
          description: 'Interactive dashboard for ongoing monitoring'
        }
      ]
    };
  }

  async generateContent(requirements: string): Promise<any> {
    console.log('✍️  AI Processing: Content Generation');
    console.log('   Requirements:', requirements.substring(0, 100) + '...');
    
    await this.simulateWork(2000);
    
    return {
      type: 'content-generation',
      results: {
        content: `# The Future of Decentralized AI

The intersection of artificial intelligence and blockchain technology represents one of the most exciting frontiers in modern computing. As we move towards a more decentralized future, AI agents are becoming autonomous economic participants...

[Full article would continue here with 1000+ words of high-quality content]`,
        wordCount: 1247,
        readingTime: '5 minutes'
      },
      deliverables: [
        {
          name: 'Article.md',
          type: 'text/markdown',
          content: 'Complete article in Markdown format...',
          description: 'Professional article ready for publication'
        },
        {
          name: 'SEO Keywords.txt',
          type: 'text/plain',
          content: 'decentralized AI, blockchain, autonomous agents...',
          description: 'Recommended SEO keywords and phrases'
        }
      ]
    };
  }

  async codeReview(requirements: string): Promise<any> {
    console.log('🔍 AI Processing: Code Review');
    console.log('   Requirements:', requirements.substring(0, 100) + '...');
    
    await this.simulateWork(4000);
    
    return {
      type: 'code-review',
      results: {
        summary: 'Code review completed with 3 issues found',
        issues: [
          {
            severity: 'medium',
            type: 'security',
            description: 'Potential SQL injection vulnerability',
            line: 42,
            recommendation: 'Use parameterized queries'
          },
          {
            severity: 'low',
            type: 'performance',
            description: 'Inefficient database query',
            line: 78,
            recommendation: 'Add database index'
          },
          {
            severity: 'low',
            type: 'style',
            description: 'Variable naming convention',
            line: 156,
            recommendation: 'Use camelCase naming'
          }
        ],
        metrics: {
          linesReviewed: 342,
          securityScore: 8.5,
          maintainabilityScore: 9.2
        }
      },
      deliverables: [
        {
          name: 'Code Review Report.md',
          type: 'text/markdown',
          content: 'Detailed code review findings...',
          description: 'Complete code review with recommendations'
        },
        {
          name: 'Fixed Code.zip',
          type: 'application/zip',
          content: 'Archive with suggested fixes...',
          description: 'Code with applied recommendations'
        }
      ]
    };
  }

  private async simulateWork(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * AI Agent Service Provider Class
 */
class AIAgentServiceProvider {
  private client: any;
  private wallet: any;
  private config: AgentConfig;
  private aiService: MockAIService;
  private isRunning: boolean = false;
  private activeOrders: Set<string> = new Set();

  constructor(client: any, wallet: any, config: AgentConfig) {
    this.client = client;
    this.wallet = wallet;
    this.config = config;
    this.aiService = new MockAIService();
  }

  /**
   * Initialize the agent
   */
  async initialize(): Promise<void> {
    console.log(`🤖 Initializing ${this.config.name}...\n`);

    // 1. Verify agent
    await this.verifyAgent();

    // 2. Create service listings
    await this.createServiceListings();

    // 3. Start listening for orders
    this.startOrderListener();

    console.log('✅ Agent initialization complete!\n');
  }

  /**
   * Verify agent on-chain
   */
  private async verifyAgent(): Promise<void> {
    console.log('🔐 Verifying agent identity...');

    try {
      // Check if already verified
      const existing = await this.client.getAgent(this.wallet.address);
      if (existing) {
        console.log('✅ Agent already verified');
        return;
      }
    } catch (error) {
      // Not verified yet, proceed with verification
    }

    const verification = await this.client.verifyAgent({
      signer: this.wallet,
      name: this.config.name,
      capabilities: this.config.capabilities,
      serviceEndpoint: this.config.serviceEndpoint
    });

    console.log('✅ Agent verified successfully');
    console.log('   Transaction:', verification.signature);
  }

  /**
   * Create service listings
   */
  private async createServiceListings(): Promise<void> {
    console.log('📝 Creating service listings...');

    for (const service of this.config.services) {
      try {
        const listing = await this.client.createServiceListing({
          signer: this.wallet,
          title: service.title,
          description: service.description,
          price: solToLamports(service.priceInSol),
          deliveryTime: service.deliveryHours,
          tags: service.tags
        });

        console.log(`✅ Created: ${service.title}`);
        console.log(`   Price: ${service.priceInSol} SOL`);
        console.log(`   Delivery: ${service.deliveryHours}h`);

      } catch (error) {
        console.error(`❌ Failed to create ${service.title}:`, error);
      }
    }

    console.log('');
  }

  /**
   * Start listening for work orders
   */
  private startOrderListener(): void {
    console.log('👂 Starting work order listener...');
    this.isRunning = true;

    this.client.onNewWorkOrder(async (order: any) => {
      if (!this.isRunning) return;

      try {
        await this.handleNewWorkOrder(order);
      } catch (error) {
        console.error('❌ Error handling work order:', error);
      }
    });

    console.log('✅ Now listening for work orders\n');
  }

  /**
   * Handle incoming work order
   */
  private async handleNewWorkOrder(order: any): Promise<void> {
    console.log(`📨 New work order received!`);
    console.log(`   Order ID: ${order.address}`);
    console.log(`   Service: ${order.serviceTitle}`);
    console.log(`   Payment: ${lamportsToSol(order.paymentAmount)} SOL`);
    console.log(`   Deadline: ${new Date(order.deadline).toLocaleString()}`);
    console.log('');

    // Check if we can handle this order
    const canHandle = this.analyzeWorkOrder(order);
    
    if (!canHandle.canAccept) {
      console.log('❌ Declining order:', canHandle.reason);
      await this.declineOrder(order, canHandle.reason);
      return;
    }

    // Accept the order
    await this.acceptOrder(order, canHandle.estimatedCompletion);

    // Process the work
    await this.processWorkOrder(order);
  }

  /**
   * Analyze if we can handle the work order
   */
  private analyzeWorkOrder(order: any): { canAccept: boolean; reason?: string; estimatedCompletion?: number } {
    // Check if already handling too many orders
    if (this.activeOrders.size >= 3) {
      return { canAccept: false, reason: 'Currently at capacity (3 concurrent orders max)' };
    }

    // Check deadline feasibility
    const timeAvailable = order.deadline - Date.now();
    const requiredTime = 4 * 60 * 60 * 1000; // 4 hours minimum
    
    if (timeAvailable < requiredTime) {
      return { canAccept: false, reason: 'Insufficient time to complete quality work' };
    }

    // Check if we have capabilities for this work
    const requirements = order.requirements.toLowerCase();
    const hasCapability = this.config.capabilities.some(cap => 
      requirements.includes(cap.toLowerCase())
    );

    if (!hasCapability) {
      return { 
        canAccept: false, 
        reason: 'Work outside our stated capabilities' 
      };
    }

    // Estimate completion time (with buffer)
    const estimatedCompletion = Date.now() + (2 * 60 * 60 * 1000); // 2 hours

    return { canAccept: true, estimatedCompletion };
  }

  /**
   * Accept a work order
   */
  private async acceptOrder(order: any, estimatedCompletion: number): Promise<void> {
    console.log('✅ Accepting work order...');

    await this.client.acceptWorkOrder({
      signer: this.wallet,
      orderId: order.address,
      estimatedCompletion,
      message: `Accepted! I'll complete this ${this.determineWorkType(order.requirements)} work within the estimated timeframe.`
    });

    this.activeOrders.add(order.address);
    console.log('✅ Order accepted successfully\n');
  }

  /**
   * Decline a work order
   */
  private async declineOrder(order: any, reason: string): Promise<void> {
    await this.client.declineWorkOrder({
      orderId: order.address,
      reason,
      suggestions: this.getSuggestions(order)
    });
  }

  /**
   * Process the work order
   */
  private async processWorkOrder(order: any): Promise<void> {
    console.log('🔄 Starting work processing...\n');

    try {
      // Send initial progress update
      await this.updateProgress(order.address, 10, 'Work started - analyzing requirements');

      // Determine work type and delegate to appropriate AI service
      const workType = this.determineWorkType(order.requirements);
      let result;

      await this.updateProgress(order.address, 25, 'Requirements analysis complete');

      switch (workType) {
        case 'data-analysis':
          result = await this.aiService.analyzeData(order.requirements);
          break;
        case 'content-creation':
          result = await this.aiService.generateContent(order.requirements);
          break;
        case 'code-review':
          result = await this.aiService.codeReview(order.requirements);
          break;
        default:
          throw new Error(`Unsupported work type: ${workType}`);
      }

      await this.updateProgress(order.address, 75, 'AI processing complete');

      // Prepare deliverables
      await this.updateProgress(order.address, 90, 'Preparing deliverables');

      // Submit completed work
      await this.submitWork(order, result);

      // Clean up
      this.activeOrders.delete(order.address);

      console.log('🎉 Work order completed successfully!\n');

    } catch (error) {
      console.error('❌ Error processing work:', error);
      
      // Report issue to client
      await this.reportIssue(order.address, error);
      this.activeOrders.delete(order.address);
    }
  }

  /**
   * Update work progress
   */
  private async updateProgress(orderId: string, progress: number, message: string): Promise<void> {
    console.log(`📊 Progress: ${progress}% - ${message}`);
    
    try {
      await this.client.updateWorkProgress({
        signer: this.wallet,
        orderId,
        progress,
        message
      });
    } catch (error) {
      console.log('⚠️  Progress update failed (non-critical)');
    }
  }

  /**
   * Submit completed work
   */
  private async submitWork(order: any, result: any): Promise<void> {
    console.log('📤 Submitting completed work...');

    const deliveryData = {
      signer: this.wallet,
      orderId: order.address,
      deliverables: result.deliverables,
      summary: `Work completed successfully! ${result.type} finished with high quality results.`,
      metadata: {
        workType: result.type,
        processingTime: result.results.metrics?.processingTime || 'Unknown',
        qualityScore: result.results.metrics?.confidence || 0.95,
        agent: this.config.name,
        completedAt: new Date().toISOString()
      }
    };

    await this.client.submitDelivery(deliveryData);
    console.log('✅ Work submitted successfully');
  }

  /**
   * Report an issue
   */
  private async reportIssue(orderId: string, error: any): Promise<void> {
    await this.client.reportIssue({
      orderId,
      issue: error.message,
      proposedSolution: 'Investigating issue and will provide updates shortly'
    });
  }

  /**
   * Determine work type from requirements
   */
  private determineWorkType(requirements: string): string {
    const req = requirements.toLowerCase();
    
    if (req.includes('data') && (req.includes('analysis') || req.includes('analytics'))) {
      return 'data-analysis';
    } else if (req.includes('content') || req.includes('writing') || req.includes('article')) {
      return 'content-creation';
    } else if (req.includes('code') && req.includes('review')) {
      return 'code-review';
    }
    
    return 'data-analysis'; // Default
  }

  /**
   * Get suggestions for declined orders
   */
  private getSuggestions(order: any): string[] {
    return [
      'Consider extending the deadline',
      'Break down into smaller tasks',
      'Look for agents specializing in this domain'
    ];
  }

  /**
   * Stop the agent
   */
  stop(): void {
    console.log('🛑 Stopping agent...');
    this.isRunning = false;
    console.log('✅ Agent stopped');
  }

  /**
   * Get agent status
   */
  getStatus() {
    return {
      running: this.isRunning,
      activeOrders: this.activeOrders.size,
      agentAddress: this.wallet.address,
      services: this.config.services.length
    };
  }
}

/**
 * Load or create agent wallet
 */
async function loadOrCreateAgentWallet() {
  try {
    if (fs.existsSync(AGENT_WALLET_PATH)) {
      const walletData = JSON.parse(fs.readFileSync(AGENT_WALLET_PATH, 'utf-8'));
      return await createKeyPairSignerFromBytes(new Uint8Array(walletData));
    }
  } catch (error) {
    console.log('Creating new agent wallet...');
  }

  const keyPair = await generateKeyPair();
  const walletData = Array.from(keyPair.privateKey);
  
  fs.writeFileSync(AGENT_WALLET_PATH, JSON.stringify(walletData, null, 2));
  console.log('✅ New agent wallet created:', AGENT_WALLET_PATH);
  
  return await createKeyPairSignerFromBytes(keyPair.privateKey);
}

/**
 * Main function
 */
async function runAgentServiceProvider() {
  console.log('🤖 Starting AI Agent Service Provider Example\n');

  try {
    // Create client
    const client = createMinimalClient({
      rpcEndpoint: RPC_ENDPOINT,
      commitment: 'confirmed'
    });

    // Load wallet
    const agentWallet = await loadOrCreateAgentWallet();
    console.log('Agent address:', agentWallet.address);

    // Check balance
    const balance = await client.getBalance(agentWallet.address);
    const solBalance = lamportsToSol(balance);
    
    if (solBalance < 0.05) {
      console.log(`⚠️  Low balance: ${solBalance.toFixed(4)} SOL`);
      console.log(`💡 Run: solana airdrop 1 ${agentWallet.address}`);
    }

    // Agent configuration
    const agentConfig: AgentConfig = {
      name: 'AI Analysis Pro',
      capabilities: [
        'data-analysis',
        'content-creation',
        'code-review',
        'statistical-modeling',
        'machine-learning'
      ],
      serviceEndpoint: 'https://ai-analysis-pro.example.com/api/v1',
      services: [
        {
          title: 'Professional Data Analysis',
          description: 'Comprehensive data analysis with ML insights, statistical modeling, and interactive visualizations. Perfect for business intelligence and decision making.',
          priceInSol: 0.05,
          deliveryHours: 24,
          tags: ['data', 'analysis', 'ml', 'business', 'insights'],
          capabilities: ['data-analysis', 'statistical-modeling']
        },
        {
          title: 'Technical Content Writing',
          description: 'High-quality technical articles, documentation, and educational content. Specialized in blockchain, AI, and software development topics.',
          priceInSol: 0.03,
          deliveryHours: 12,
          tags: ['content', 'writing', 'technical', 'documentation'],
          capabilities: ['content-creation']
        },
        {
          title: 'Expert Code Review',
          description: 'Thorough code review focusing on security, performance, and best practices. Includes detailed recommendations and fixed code samples.',
          priceInSol: 0.04,
          deliveryHours: 8,
          tags: ['code', 'review', 'security', 'performance'],
          capabilities: ['code-review']
        }
      ]
    };

    // Create and initialize agent
    const agent = new AIAgentServiceProvider(client, agentWallet, agentConfig);
    await agent.initialize();

    // Display status
    console.log('📊 Agent Status:');
    const status = agent.getStatus();
    console.log(`   Running: ${status.running}`);
    console.log(`   Services: ${status.services}`);
    console.log(`   Active Orders: ${status.activeOrders}`);
    console.log(`   Address: ${status.agentAddress}`);
    console.log('');

    console.log('🚀 Agent is now running and ready for work orders!');
    console.log('💡 Run the marketplace-integration example to test purchasing services');
    console.log('');

    // Keep running for demo (in production, this would run indefinitely)
    console.log('⏰ Demo will run for 5 minutes...');
    console.log('   During this time, the agent will:');
    console.log('   - Listen for incoming work orders');
    console.log('   - Process any received orders');
    console.log('   - Provide progress updates');
    console.log('   - Submit completed work');
    console.log('');

    // Run for 5 minutes in demo mode
    await new Promise(resolve => {
      setTimeout(() => {
        console.log('\n⏰ Demo time completed');
        agent.stop();
        resolve(void 0);
      }, 5 * 60 * 1000); // 5 minutes

      // Show periodic status updates
      const statusInterval = setInterval(() => {
        const currentStatus = agent.getStatus();
        if (currentStatus.activeOrders > 0) {
          console.log(`📊 Status Update: ${currentStatus.activeOrders} active orders`);
        }
      }, 30000); // Every 30 seconds

      // Clean up interval when demo ends
      setTimeout(() => clearInterval(statusInterval), 5 * 60 * 1000);
    });

    console.log('\n🎉 Agent service provider example completed!');
    console.log('\n📋 Summary:');
    console.log('   ✅ Agent registered and verified');
    console.log('   ✅ Multiple services created');
    console.log('   ✅ Work order processing system active');
    console.log('   ✅ AI service integrations working');
    console.log('   ✅ Progress tracking implemented');

  } catch (error: any) {
    console.error('\n❌ Example failed:', error.message);
    process.exit(1);
  }
}

/**
 * Run the example if this file is executed directly
 */
if (require.main === module) {
  runAgentServiceProvider()
    .then(() => {
      console.log('\n✨ Example completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Example failed:', error);
      process.exit(1);
    });
}

export { runAgentServiceProvider, AIAgentServiceProvider };