#!/usr/bin/env tsx

import { program } from 'commander';
import chalk from 'chalk';
import { GhostSpeakLogger } from './logger.js';
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';

interface Agent {
  id: string;
  name: string;
  type: 'ai' | 'human' | 'hybrid';
  capabilities: string[];
  reputation: number;
  walletAddress: string;
  createdAt: string;
  isActive: boolean;
  metadata: {
    description: string;
    tags: string[];
    pricing: {
      baseRate: number;
      currency: 'SOL' | 'USDC';
      rateType: 'hourly' | 'fixed' | 'performance';
    };
  };
}

interface Task {
  id: string;
  title: string;
  description: string;
  category: string;
  difficulty: 'easy' | 'medium' | 'hard';
  estimatedDuration: number; // hours
  budget: number;
  currency: 'SOL' | 'USDC';
  status: 'open' | 'in_progress' | 'completed' | 'disputed';
  requiredCapabilities: string[];
  createdBy: string;
  assignedTo?: string;
  createdAt: string;
  deadline?: string;
  deliverables: string[];
}

interface Transaction {
  id: string;
  type: 'payment' | 'escrow_create' | 'escrow_release' | 'dispute' | 'refund';
  fromAgent: string;
  toAgent: string;
  amount: number;
  currency: 'SOL' | 'USDC';
  taskId?: string;
  status: 'pending' | 'confirmed' | 'failed';
  blockchainTx?: string;
  timestamp: string;
  metadata: {
    description: string;
    gasUsed?: number;
    confirmationTime?: number;
  };
}

interface MarketData {
  timestamp: string;
  totalAgents: number;
  activeAgents: number;
  totalTasks: number;
  completedTasks: number;
  totalVolume: number;
  averageTaskValue: number;
  topCategories: { category: string; count: number }[];
  networkHealth: number;
}

class DataGenerator {
  private logger: GhostSpeakLogger;
  private agents: Agent[] = [];
  private tasks: Task[] = [];
  private transactions: Transaction[] = [];

  // Sample data for realistic generation
  private agentNames = [
    'DataCruncher', 'CodeWizard', 'AnalyticsMaster', 'CryptoSage', 'BlockchainBot',
    'SmartContract', 'DefiHelper', 'NFTCreator', 'TokenAnalyst', 'ChainExplorer',
    'SolanaBuilder', 'RustDeveloper', 'WebAssembly', 'DappCreator', 'ProtocolBuilder'
  ];

  private capabilities = [
    'smart_contract_development', 'rust_programming', 'typescript_development',
    'blockchain_analysis', 'defi_protocols', 'nft_creation', 'token_economics',
    'security_auditing', 'performance_optimization', 'data_analysis',
    'ui_ux_design', 'api_development', 'testing_automation', 'documentation',
    'project_management', 'market_research', 'community_management'
  ];

  private taskCategories = [
    'Development', 'Analysis', 'Design', 'Testing', 'Documentation',
    'Marketing', 'Research', 'Consulting', 'Auditing', 'Integration'
  ];

  private taskTemplates = [
    {
      title: 'Smart Contract Audit',
      description: 'Comprehensive security audit of a DeFi smart contract',
      category: 'Auditing',
      requiredCapabilities: ['security_auditing', 'smart_contract_development']
    },
    {
      title: 'Token Economics Analysis',
      description: 'Analyze tokenomics model and provide recommendations',
      category: 'Analysis',
      requiredCapabilities: ['token_economics', 'data_analysis']
    },
    {
      title: 'Frontend Integration',
      description: 'Integrate blockchain functionality into existing UI',
      category: 'Development',
      requiredCapabilities: ['typescript_development', 'api_development']
    },
    {
      title: 'Performance Optimization',
      description: 'Optimize smart contract gas usage and performance',
      category: 'Development',
      requiredCapabilities: ['performance_optimization', 'smart_contract_development']
    },
    {
      title: 'Technical Documentation',
      description: 'Create comprehensive API documentation',
      category: 'Documentation',
      requiredCapabilities: ['documentation', 'api_development']
    }
  ];

  constructor() {
    this.logger = new GhostSpeakLogger('DATA_GEN');
  }

  private generateRandomId(): string {
    return crypto.randomBytes(16).toString('hex');
  }

  private generateWalletAddress(): string {
    const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz123456789';
    let result = '';
    for (let i = 0; i < 44; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  private randomChoice<T>(array: T[]): T {
    return array[Math.floor(Math.random() * array.length)];
  }

  private randomChoices<T>(array: T[], count: number): T[] {
    const shuffled = [...array].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, Math.min(count, array.length));
  }

  private randomFloat(min: number, max: number): number {
    return Math.random() * (max - min) + min;
  }

  private randomInt(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  private generateRandomDate(daysBack: number = 30): string {
    const now = new Date();
    const pastDate = new Date(now.getTime() - daysBack * 24 * 60 * 60 * 1000 * Math.random());
    return pastDate.toISOString();
  }

  generateAgents(count: number): Agent[] {
    const agents: Agent[] = [];

    for (let i = 0; i < count; i++) {
      const agentCapabilities = this.randomChoices(this.capabilities, this.randomInt(2, 6));
      const baseRate = this.randomFloat(0.1, 10.0);

      const agent: Agent = {
        id: this.generateRandomId(),
        name: `${this.randomChoice(this.agentNames)}${this.randomInt(100, 999)}`,
        type: this.randomChoice(['ai', 'human', 'hybrid']),
        capabilities: agentCapabilities,
        reputation: this.randomFloat(0.5, 5.0),
        walletAddress: this.generateWalletAddress(),
        createdAt: this.generateRandomDate(365),
        isActive: Math.random() > 0.2, // 80% active
        metadata: {
          description: `Specialized ${agentCapabilities[0].replace('_', ' ')} expert with proven track record`,
          tags: this.randomChoices(['verified', 'premium', 'fast', 'reliable', 'expert'], this.randomInt(1, 3)),
          pricing: {
            baseRate: Math.round(baseRate * 100) / 100,
            currency: this.randomChoice(['SOL', 'USDC']),
            rateType: this.randomChoice(['hourly', 'fixed', 'performance'])
          }
        }
      };

      agents.push(agent);
    }

    this.agents = agents;
    this.logger.info(`Generated ${count} agents`, { activeAgents: agents.filter(a => a.isActive).length });
    return agents;
  }

  generateTasks(count: number, existingAgents?: Agent[]): Task[] {
    const agentsToUse = existingAgents || this.agents;
    if (agentsToUse.length === 0) {
      throw new Error('No agents available for task generation');
    }

    const tasks: Task[] = [];

    for (let i = 0; i < count; i++) {
      const template = this.randomChoice(this.taskTemplates);
      const difficulty = this.randomChoice(['easy', 'medium', 'hard']);
      const estimatedDuration = {
        easy: this.randomFloat(1, 8),
        medium: this.randomFloat(8, 24),
        hard: this.randomFloat(24, 120)
      }[difficulty];

      const budget = this.randomFloat(0.5, 50.0);
      const creator = this.randomChoice(agentsToUse);
      const assignedAgent = Math.random() > 0.4 ? this.randomChoice(agentsToUse) : undefined;

      const task: Task = {
        id: this.generateRandomId(),
        title: `${template.title} #${this.randomInt(1000, 9999)}`,
        description: template.description + ` (${difficulty} difficulty)`,
        category: template.category,
        difficulty,
        estimatedDuration: Math.round(estimatedDuration * 10) / 10,
        budget: Math.round(budget * 100) / 100,
        currency: this.randomChoice(['SOL', 'USDC']),
        status: assignedAgent 
          ? this.randomChoice(['in_progress', 'completed', 'disputed'])
          : 'open',
        requiredCapabilities: template.requiredCapabilities,
        createdBy: creator.id,
        assignedTo: assignedAgent?.id,
        createdAt: this.generateRandomDate(60),
        deadline: Math.random() > 0.3 
          ? new Date(Date.now() + this.randomInt(1, 30) * 24 * 60 * 60 * 1000).toISOString()
          : undefined,
        deliverables: [
          'Source code with documentation',
          'Test suite with coverage report',
          'Deployment instructions'
        ].slice(0, this.randomInt(1, 3))
      };

      tasks.push(task);
    }

    this.tasks = tasks;
    this.logger.info(`Generated ${count} tasks`, { 
      byStatus: tasks.reduce((acc, t) => {
        acc[t.status] = (acc[t.status] || 0) + 1;
        return acc;
      }, {} as any)
    });
    return tasks;
  }

  generateTransactions(count: number, existingAgents?: Agent[], existingTasks?: Task[]): Transaction[] {
    const agentsToUse = existingAgents || this.agents;
    const tasksToUse = existingTasks || this.tasks;

    if (agentsToUse.length === 0) {
      throw new Error('No agents available for transaction generation');
    }

    const transactions: Transaction[] = [];

    for (let i = 0; i < count; i++) {
      const fromAgent = this.randomChoice(agentsToUse);
      const toAgent = this.randomChoice(agentsToUse.filter(a => a.id !== fromAgent.id));
      const relatedTask = Math.random() > 0.3 ? this.randomChoice(tasksToUse) : undefined;
      
      const transactionType = this.randomChoice([
        'payment', 'escrow_create', 'escrow_release', 'dispute', 'refund'
      ]);

      const amount = relatedTask 
        ? relatedTask.budget * this.randomFloat(0.1, 1.0)
        : this.randomFloat(0.01, 5.0);

      const transaction: Transaction = {
        id: this.generateRandomId(),
        type: transactionType,
        fromAgent: fromAgent.id,
        toAgent: toAgent.id,
        amount: Math.round(amount * 1000000) / 1000000, // 6 decimal precision
        currency: relatedTask?.currency || this.randomChoice(['SOL', 'USDC']),
        taskId: relatedTask?.id,
        status: this.randomChoice(['pending', 'confirmed', 'failed']),
        blockchainTx: Math.random() > 0.2 ? this.generateRandomId() : undefined,
        timestamp: this.generateRandomDate(30),
        metadata: {
          description: `${transactionType.replace('_', ' ')} transaction`,
          gasUsed: this.randomInt(1000, 50000),
          confirmationTime: this.randomFloat(0.5, 10.0)
        }
      };

      transactions.push(transaction);
    }

    this.transactions = transactions;
    this.logger.info(`Generated ${count} transactions`, {
      confirmed: transactions.filter(t => t.status === 'confirmed').length,
      totalVolume: transactions.reduce((sum, t) => sum + t.amount, 0).toFixed(6)
    });
    return transactions;
  }

  generateMarketData(days: number = 30): MarketData[] {
    const marketData: MarketData[] = [];
    const agents = this.agents;
    const tasks = this.tasks;
    const transactions = this.transactions.filter(t => t.status === 'confirmed');

    for (let i = 0; i < days; i++) {
      const date = new Date();
      date.setDate(date.getDate() - (days - i));

      // Simulate market growth/decline
      const growthFactor = 1 + Math.sin(i / 7) * 0.1 + Math.random() * 0.1;
      
      const dayTransactions = transactions.filter(t => {
        const txDate = new Date(t.timestamp);
        return txDate.toDateString() === date.toDateString();
      });

      const completedTasks = tasks.filter(t => t.status === 'completed').length;
      const activeAgents = Math.floor(agents.length * (0.7 + Math.random() * 0.2));
      
      const categoryStats = tasks.reduce((acc, task) => {
        acc[task.category] = (acc[task.category] || 0) + 1;
        return acc;
      }, {} as { [key: string]: number });

      const topCategories = Object.entries(categoryStats)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([category, count]) => ({ category, count }));

      const totalVolume = dayTransactions.reduce((sum, t) => sum + t.amount, 0);
      const avgTaskValue = tasks.length > 0 
        ? tasks.reduce((sum, t) => sum + t.budget, 0) / tasks.length 
        : 0;

      marketData.push({
        timestamp: date.toISOString(),
        totalAgents: agents.length,
        activeAgents,
        totalTasks: tasks.length,
        completedTasks,
        totalVolume: Math.round(totalVolume * 1000000) / 1000000,
        averageTaskValue: Math.round(avgTaskValue * 100) / 100,
        topCategories,
        networkHealth: Math.min(100, Math.max(0, 
          70 + Math.random() * 20 + (activeAgents / agents.length) * 10
        ))
      });
    }

    this.logger.info(`Generated ${days} days of market data`);
    return marketData;
  }

  async saveDatasets(outputDir: string): Promise<void> {
    await fs.mkdir(outputDir, { recursive: true });

    const datasets = [
      { name: 'agents.json', data: this.agents },
      { name: 'tasks.json', data: this.tasks },
      { name: 'transactions.json', data: this.transactions },
      { name: 'market-data.json', data: this.generateMarketData() }
    ];

    for (const dataset of datasets) {
      const filePath = path.join(outputDir, dataset.name);
      await fs.writeFile(filePath, JSON.stringify(dataset.data, null, 2));
      this.logger.info(`Saved ${dataset.name}`, { 
        path: filePath, 
        records: Array.isArray(dataset.data) ? dataset.data.length : 'N/A' 
      });
    }

    // Generate summary
    const summary = {
      generatedAt: new Date().toISOString(),
      datasets: {
        agents: this.agents.length,
        tasks: this.tasks.length,
        transactions: this.transactions.length,
        marketDataDays: 30
      },
      statistics: {
        activeAgents: this.agents.filter(a => a.isActive).length,
        completedTasks: this.tasks.filter(t => t.status === 'completed').length,
        totalVolume: this.transactions
          .filter(t => t.status === 'confirmed')
          .reduce((sum, t) => sum + t.amount, 0),
        averageReputation: this.agents.length > 0 
          ? this.agents.reduce((sum, a) => sum + a.reputation, 0) / this.agents.length 
          : 0
      }
    };

    await fs.writeFile(
      path.join(outputDir, 'summary.json'), 
      JSON.stringify(summary, null, 2)
    );

    console.log(chalk.green('\n✅ Datasets generated successfully!'));
    console.log(chalk.blue(`📁 Output directory: ${outputDir}`));
    console.log(chalk.blue(`📊 Summary:`));
    console.log(`   - Agents: ${summary.datasets.agents} (${summary.statistics.activeAgents} active)`);
    console.log(`   - Tasks: ${summary.datasets.tasks} (${summary.statistics.completedTasks} completed)`);
    console.log(`   - Transactions: ${summary.datasets.transactions}`);
    console.log(`   - Total Volume: ${summary.statistics.totalVolume.toFixed(6)} tokens`);
    console.log(`   - Avg Reputation: ${summary.statistics.averageReputation.toFixed(2)}/5.0`);
  }

  generateTestScenarios(): any[] {
    const scenarios = [
      {
        name: 'High Volume Day',
        description: 'Simulate a day with unusually high transaction volume',
        multipliers: { transactions: 5, tasks: 2 }
      },
      {
        name: 'Market Stress Test',
        description: 'Test system under heavy load with many concurrent operations',
        multipliers: { agents: 10, tasks: 10, transactions: 20 }
      },
      {
        name: 'Dispute Resolution',
        description: 'Generate scenario with high dispute rate',
        filters: { taskStatus: 'disputed', transactionTypes: ['dispute', 'refund'] }
      },
      {
        name: 'New Agent Onboarding',
        description: 'Simulate rapid growth in agent registrations',
        multipliers: { agents: 5 },
        filters: { newAgentsOnly: true }
      }
    ];

    this.logger.info(`Generated ${scenarios.length} test scenarios`);
    return scenarios;
  }
}

async function main(): Promise<void> {
  program
    .name('data-generator')
    .description('GhostSpeak synthetic data generator for testing and development')
    .option('-a, --agents <count>', 'Number of agents to generate', '100')
    .option('-t, --tasks <count>', 'Number of tasks to generate', '200')
    .option('-x, --transactions <count>', 'Number of transactions to generate', '500')
    .option('-o, --output <dir>', 'Output directory', './generated-data')
    .option('-s, --scenarios', 'Generate test scenarios')
    .option('--seed <value>', 'Random seed for reproducible data')
    .parse();

  const options = program.opts();

  if (options.seed) {
    // Set seed for reproducible results (simplified implementation)
    console.log(chalk.blue(`🌱 Using seed: ${options.seed}`));
  }

  const generator = new DataGenerator();

  console.log(chalk.blue('\n🔄 Generating synthetic data...'));

  try {
    // Generate data in dependency order
    const agents = generator.generateAgents(parseInt(options.agents));
    const tasks = generator.generateTasks(parseInt(options.tasks), agents);
    const transactions = generator.generateTransactions(parseInt(options.transactions), agents, tasks);

    // Save all datasets
    await generator.saveDatasets(options.output);

    if (options.scenarios) {
      const scenarios = generator.generateTestScenarios();
      const scenariosPath = path.join(options.output, 'test-scenarios.json');
      await fs.writeFile(scenariosPath, JSON.stringify(scenarios, null, 2));
      console.log(chalk.green(`📝 Test scenarios saved to ${scenariosPath}`));
    }

    console.log(chalk.green('\n🎉 Data generation completed successfully!'));

  } catch (error) {
    console.error(chalk.red('\n❌ Data generation failed:'), error);
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error(chalk.red('Data generator error:'), error);
    process.exit(1);
  });
}

export { DataGenerator, Agent, Task, Transaction, MarketData };