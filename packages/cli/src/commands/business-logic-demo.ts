import { select, input, confirm } from '@inquirer/prompts';
import { generateKeyPairSigner } from '@solana/signers';
import type { KeyPairSigner } from '@solana/signers';
import chalk from 'chalk';

import { UIManager } from '../ui/ui-manager.js';
import { NetworkManager } from '../utils/network-manager.js';
import { ConfigManager } from '../utils/config-manager.js';

/**
 * Business Logic Integration Demo
 * 
 * This demonstrates connecting CLI commands to the existing sophisticated
 * BusinessLogicService without waiting for SDK to be published.
 */

// Mock interfaces matching the real BusinessLogicService
interface SubscriptionPlan {
  name: string;
  description: string;
  price: number;
  features: string[];
  estimatedMonthlyUsage: number;
  payPerUseRate: number;
}

interface RevenueSharingRules {
  agentPercentage: number;
  platformPercentage: number;
  referralPercentage?: number;
}

// Mock BusinessLogicService that shows the integration pattern
class MockBusinessLogicService {
  constructor(private connection: any, private programId: string) {}

  async createSubscriptionPlan(params: {
    payer: KeyPairSigner;
    agentId: any;
    planDetails: SubscriptionPlan;
    billingCycle: string;
    autoRenewal: boolean;
  }) {
    // Simulate the real BusinessLogicService call
    console.log(chalk.gray('  📅 Calling BusinessLogicService.createSubscriptionPlan()...'));
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    console.log(chalk.gray('  💰 Calculating subscription savings...'));
    await new Promise(resolve => setTimeout(resolve, 500));
    
    console.log(chalk.gray('  🔗 Creating on-chain subscription account...'));
    await new Promise(resolve => setTimeout(resolve, 800));

    const savings = params.planDetails.estimatedMonthlyUsage * params.planDetails.payPerUseRate - params.planDetails.price;
    
    return {
      subscriptionId: `sub_${Date.now()}`,
      agentId: params.agentId,
      subscriber: params.payer.address,
      planDetails: params.planDetails,
      nextBillingDate: Date.now() + (30 * 24 * 60 * 60 * 1000), // 30 days from now
      signature: `tx_${Date.now()}_subscription`,
      status: 'active',
      savings
    };
  }

  async processRevenueSharing(params: {
    workOrderId: any;
    totalAmount: number;
    sharingRules: RevenueSharingRules;
  }) {
    console.log(chalk.gray('  💰 Calling BusinessLogicService.processRevenueSharing()...'));
    await new Promise(resolve => setTimeout(resolve, 800));
    
    console.log(chalk.gray('  📊 Calculating revenue splits...'));
    const agentShare = params.totalAmount * (params.sharingRules.agentPercentage / 100);
    const platformFee = params.totalAmount * (params.sharingRules.platformPercentage / 100);
    const referralBonus = params.sharingRules.referralPercentage ? 
      params.totalAmount * (params.sharingRules.referralPercentage / 100) : 0;
    
    await new Promise(resolve => setTimeout(resolve, 600));
    console.log(chalk.gray('  🔗 Executing on-chain revenue distribution...'));
    
    return {
      workOrderId: params.workOrderId,
      totalAmount: params.totalAmount,
      distributions: [
        { recipient: 'agent', amount: agentShare, type: 'agent_earnings' },
        { recipient: 'platform', amount: platformFee, type: 'platform_fee' },
        ...(referralBonus > 0 ? [{ recipient: 'referrer', amount: referralBonus, type: 'referral_bonus' }] : [])
      ],
      signature: `tx_${Date.now()}_revenue_share`,
      timestamp: Date.now()
    };
  }

  async generatePerformanceAnalytics(params: {
    agentId: any;
    timeframe: string;
    metrics: string[];
  }) {
    console.log(chalk.gray('  📊 Calling BusinessLogicService.generatePerformanceAnalytics()...'));
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    console.log(chalk.gray('  📈 Analyzing historical performance data...'));
    await new Promise(resolve => setTimeout(resolve, 800));
    
    console.log(chalk.gray('  🎯 Generating insights and recommendations...'));
    await new Promise(resolve => setTimeout(resolve, 600));

    return {
      agentId: params.agentId,
      timeframe: params.timeframe,
      analytics: {
        earnings: { value: 45.7, trend: 'increasing', change: 12.3 },
        completion_rate: { value: 98.5, trend: 'stable', change: 0.2 },
        client_satisfaction: { value: 4.8, trend: 'increasing', change: 0.1 }
      },
      insights: [
        'Revenue increased 12.3% this month',
        'Client satisfaction trending upward',
        'Completion rate maintains excellent standard'
      ],
      recommendations: [
        'Consider premium pricing for high-demand services',
        'Expand service offerings in data analysis',
        'Implement client feedback automation'
      ],
      overallScore: 94,
      generatedAt: Date.now(),
      dataPoints: 247
    };
  }
}

// Detect test mode
const TEST_MODE = process.argv.includes('--test-mode') || process.env.GHOSTSPEAK_TEST_MODE === 'true';

export class BusinessLogicDemoCommand {
  private ui: UIManager;
  private network: NetworkManager;
  private config: ConfigManager;
  private businessLogic: MockBusinessLogicService | null = null;

  constructor() {
    this.ui = new UIManager();
    this.network = new NetworkManager();
    this.config = new ConfigManager();
  }

  async execute(): Promise<void> {
    try {
      this.ui.clear();
      this.ui.bigTitle('Business Logic Integration', 'Connect CLI to sophisticated backend services');
      
      // Initialize business logic service
      await this.initializeBusinessLogic();
      
      // Show demo menu
      await this.showDemoMenu();
      
    } catch (error) {
      this.ui.error(
        'Business logic demo failed',
        error instanceof Error ? error.message : String(error)
      );
    }
  }

  private async initializeBusinessLogic(): Promise<void> {
    const spinner = this.ui.spinner('Connecting to business logic services...');
    spinner.start();

    try {
      const rpcEndpoint = await this.network.getRpcEndpoint();
      
      // In real implementation, this would be:
      // this.businessLogic = new BusinessLogicService(connection, PODAI_PROGRAM_ID);
      this.businessLogic = new MockBusinessLogicService(
        { rpcEndpoint }, 
        'HEpGLgYsE1kP8aoYKyLFc3JVVrofS7T4zEA6fWBJsZps'
      );

      spinner.success({ text: 'Business logic services connected' });
    } catch (error) {
      spinner.error({ text: 'Failed to connect to business logic services' });
      throw error;
    }
  }

  private async showDemoMenu(): Promise<void> {
    console.log();
    console.log(chalk.yellow('🎯 This demonstrates connecting CLI to existing BusinessLogicService'));
    console.log();

    const action = await select({
      message: 'Which business logic feature would you like to test?',
      choices: [
        { name: '📅 Subscription Management', value: 'subscription' },
        { name: '💰 Revenue Sharing', value: 'revenue' },
        { name: '📊 Performance Analytics', value: 'analytics' },
        { name: '⚖️  Dispute Resolution (Service Available)', value: 'dispute' },
        { name: '🔍 Quality Assurance (Service Available)', value: 'quality' },
        { name: '🔙 Back to main menu', value: 'back' }
      ]
    });

    switch (action) {
      case 'subscription':
        await this.demoSubscriptionManagement();
        break;
      case 'revenue':
        await this.demoRevenueSharing();
        break;
      case 'analytics':
        await this.demoPerformanceAnalytics();
        break;
      case 'dispute':
        await this.showDisputeResolutionInfo();
        break;
      case 'quality':
        await this.showQualityAssuranceInfo();
        break;
      case 'back':
        return;
    }

    // Ask to continue
    const continueChoice = await confirm({
      message: 'Would you like to test another feature?',
      default: true
    });

    if (continueChoice) {
      await this.showDemoMenu();
    }
  }

  private async demoSubscriptionManagement(): Promise<void> {
    console.log();
    console.log(chalk.bold.cyan('📅 Subscription Management Demo'));
    console.log(chalk.gray('═══════════════════════════════════'));
    console.log();

    // Gather subscription details
    let planName: string;
    if (TEST_MODE) {
      console.log('[TEST MODE] Subscription plan name: TestPlan');
      planName = 'TestPlan';
    } else {
      planName = await input({
        message: 'Subscription plan name:',
        default: 'Premium Data Analysis Package'
      });
    }

    const monthlyPrice = await input({
      message: 'Monthly price (USD):',
      default: '99.99',
      validate: (value) => {
        const price = parseFloat(value);
        return (!isNaN(price) && price > 0) ? true : 'Enter a valid price';
      }
    });

    const autoRenewal = await confirm({
      message: 'Enable auto-renewal (7% discount)?',
      default: true
    });

    // Create subscription plan
    const planDetails: SubscriptionPlan = {
      name: planName,
      description: 'Premium data analysis with priority support',
      price: parseFloat(monthlyPrice),
      features: ['Priority support', 'Advanced analytics', 'Custom reports'],
      estimatedMonthlyUsage: 50,
      payPerUseRate: 2.99
    };

    console.log();
    console.log(chalk.bold('🚀 Creating Subscription Plan...'));
    console.log();

    try {
      if (!this.businessLogic) {
        throw new Error('Business logic service not connected');
      }

      const payer = await generateKeyPairSigner();
      const mockAgentId = 'agent_' + Date.now();

      // Call the BusinessLogicService method
      const result = await this.businessLogic.createSubscriptionPlan({
        payer,
        agentId: mockAgentId,
        planDetails,
        billingCycle: 'monthly',
        autoRenewal
      });

      // Show success
      console.log();
      console.log(chalk.green.bold('🎉 Subscription Plan Created Successfully!'));
      console.log();
      console.log(chalk.yellow('📋 Subscription Details:'));
      console.log(chalk.gray(`   Plan: ${result.planDetails.name}`));
      console.log(chalk.gray(`   Price: $${result.planDetails.price}/month`));
      console.log(chalk.gray(`   Savings: $${result.savings}/month vs pay-per-use`));
      console.log(chalk.gray(`   Next Billing: ${new Date(result.nextBillingDate).toLocaleDateString()}`));
      console.log(chalk.gray(`   Status: ${result.status.toUpperCase()}`));
      console.log();
      console.log(chalk.cyan('💡 Real Implementation: CLI → BusinessLogicService.createSubscriptionPlan() ✅'));

    } catch (error) {
      console.log();
      console.log(chalk.red.bold('❌ Subscription Creation Failed'));
      console.log(chalk.red(`Error: ${error instanceof Error ? error.message : String(error)}`));
    }
  }

  private async demoRevenueSharing(): Promise<void> {
    console.log();
    console.log(chalk.bold.yellow('💰 Revenue Sharing Demo'));
    console.log(chalk.gray('═══════════════════════════'));
    console.log();

    const totalAmount = await input({
      message: 'Total revenue amount (SOL):',
      default: '10.5',
      validate: (value) => {
        const amount = parseFloat(value);
        return (!isNaN(amount) && amount > 0) ? true : 'Enter a valid amount';
      }
    });

    const agentPercentage = await input({
      message: 'Agent percentage (default 70%):',
      default: '70',
      validate: (value) => {
        const pct = parseFloat(value);
        return (!isNaN(pct) && pct > 0 && pct <= 100) ? true : 'Enter a valid percentage';
      }
    });

    const hasReferral = await confirm({
      message: 'Include referral bonus (5%)?',
      default: false
    });

    const sharingRules: RevenueSharingRules = {
      agentPercentage: parseFloat(agentPercentage),
      platformPercentage: 100 - parseFloat(agentPercentage) - (hasReferral ? 5 : 0),
      ...(hasReferral && { referralPercentage: 5 })
    };

    console.log();
    console.log(chalk.bold('💰 Processing Revenue Distribution...'));
    console.log();

    try {
      if (!this.businessLogic) {
        throw new Error('Business logic service not connected');
      }

      const result = await this.businessLogic.processRevenueSharing({
        workOrderId: 'work_' + Date.now(),
        totalAmount: parseFloat(totalAmount),
        sharingRules
      });

      // Show results
      console.log();
      console.log(chalk.green.bold('🎉 Revenue Sharing Completed!'));
      console.log();
      console.log(chalk.yellow('💰 Distribution Summary:'));
      result.distributions.forEach(dist => {
        console.log(chalk.gray(`   ${dist.type}: ${dist.amount.toFixed(2)} SOL → ${dist.recipient}`));
      });
      console.log();
      console.log(chalk.gray(`Transaction: ${result.signature}`));
      console.log();
      console.log(chalk.cyan('💡 Real Implementation: CLI → BusinessLogicService.processRevenueSharing() ✅'));

    } catch (error) {
      console.log();
      console.log(chalk.red.bold('❌ Revenue Sharing Failed'));
      console.log(chalk.red(`Error: ${error instanceof Error ? error.message : String(error)}`));
    }
  }

  private async demoPerformanceAnalytics(): Promise<void> {
    console.log();
    console.log(chalk.bold.blue('📊 Performance Analytics Demo'));
    console.log(chalk.gray('════════════════════════════════'));
    console.log();

    const timeframe = await select({
      message: 'Select analytics timeframe:',
      choices: [
        { name: '📅 Last 7 days', value: 'week' },
        { name: '📅 Last 30 days', value: 'month' },
        { name: '📅 Last 90 days', value: 'quarter' },
        { name: '📅 Last 365 days', value: 'year' }
      ]
    });

    console.log();
    console.log(chalk.bold('📊 Generating Performance Analytics...'));
    console.log();

    try {
      if (!this.businessLogic) {
        throw new Error('Business logic service not connected');
      }

      const result = await this.businessLogic.generatePerformanceAnalytics({
        agentId: 'agent_demo',
        timeframe,
        metrics: ['earnings', 'completion_rate', 'client_satisfaction']
      });

      // Show analytics results
      console.log();
      console.log(chalk.green.bold('📈 Analytics Generated Successfully!'));
      console.log();
      console.log(chalk.yellow('📊 Performance Metrics:'));
      Object.entries(result.analytics).forEach(([metric, data]) => {
        const trendIcon = data.trend === 'increasing' ? '📈' : data.trend === 'decreasing' ? '📉' : '➡️';
        console.log(chalk.gray(`   ${metric}: ${data.value} ${trendIcon} ${data.change > 0 ? '+' : ''}${data.change}%`));
      });
      
      console.log();
      console.log(chalk.yellow('💡 Key Insights:'));
      result.insights.forEach(insight => {
        console.log(chalk.gray(`   • ${insight}`));
      });
      
      console.log();
      console.log(chalk.yellow('🎯 Recommendations:'));
      result.recommendations.forEach(rec => {
        console.log(chalk.gray(`   • ${rec}`));
      });
      
      console.log();
      console.log(chalk.green(`Overall Performance Score: ${result.overallScore}/100`));
      console.log(chalk.gray(`Based on ${result.dataPoints} data points`));
      console.log();
      console.log(chalk.cyan('💡 Real Implementation: CLI → BusinessLogicService.generatePerformanceAnalytics() ✅'));

    } catch (error) {
      console.log();
      console.log(chalk.red.bold('❌ Analytics Generation Failed'));
      console.log(chalk.red(`Error: ${error instanceof Error ? error.message : String(error)}`));
    }
  }

  private async showDisputeResolutionInfo(): Promise<void> {
    console.log();
    console.log(chalk.bold.magenta('⚖️  Dispute Resolution Service'));
    console.log(chalk.gray('═══════════════════════════════'));
    console.log();
    console.log(chalk.green('✅ BusinessLogicService.createDispute() - Ready'));
    console.log(chalk.gray('   • Evidence collection system'));
    console.log(chalk.gray('   • Automated mediation process'));
    console.log(chalk.gray('   • 7-day resolution timeline'));
    console.log(chalk.gray('   • Case number generation'));
    console.log();
    console.log(chalk.yellow('🚧 Next: Create CLI command → BusinessLogicService.createDispute()'));
  }

  private async showQualityAssuranceInfo(): Promise<void> {
    console.log();
    console.log(chalk.bold.cyan('🔍 Quality Assurance Service'));
    console.log(chalk.gray('══════════════════════════════'));
    console.log();
    console.log(chalk.green('✅ BusinessLogicService.processQualityAssurance() - Ready'));
    console.log(chalk.gray('   • Automated quality scoring'));
    console.log(chalk.gray('   • Deliverable assessment'));
    console.log(chalk.gray('   • Performance recommendations'));
    console.log(chalk.gray('   • Quality report generation'));
    console.log();
    console.log(chalk.yellow('🚧 Next: Create CLI command → BusinessLogicService.processQualityAssurance()'));
  }
} 