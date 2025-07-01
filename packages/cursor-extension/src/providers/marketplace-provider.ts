import * as path from 'path';

import * as vscode from 'vscode';

export interface IMarketplaceAgent {
  id: string;
  name: string;
  address: string;
  description: string;
  category: string;
  capabilities: string[];
  rating: number;
  reviewCount: number;
  price: {
    base: number;
    currency: 'SOL' | 'USDC';
    paymentType: 'per-task' | 'hourly' | 'subscription';
  };
  owner: string;
  verified: boolean;
  featured: boolean;
  tags: string[];
  metrics: {
    totalJobs: number;
    successRate: number;
    averageResponseTime: number;
    lastActive: Date;
  };
  services: IAgentService[];
}

export interface IAgentService {
  id: string;
  name: string;
  description: string;
  category: string;
  price: number;
  estimatedTime: string;
  requirements: string[];
  deliverables: string[];
  examples: string[];
  tags: string[];
}

export interface IMarketplaceTransaction {
  id: string;
  type: 'purchase' | 'sale' | 'escrow' | 'payment';
  agentId: string;
  agentName: string;
  serviceId?: string;
  serviceName?: string;
  amount: number;
  currency: 'SOL' | 'USDC';
  status: 'pending' | 'completed' | 'failed' | 'disputed';
  timestamp: Date;
  buyer: string;
  seller: string;
  escrowAddress?: string;
  transactionHash: string;
  metadata?: Record<string, any>;
}

export interface IMarketplaceTreeItem {
  type: 'category' | 'agent' | 'service' | 'transaction' | 'action' | 'filter';
  agent?: IMarketplaceAgent;
  service?: IAgentService;
  transaction?: IMarketplaceTransaction;
  category?: string;
  label: string;
  description?: string;
  iconPath?: vscode.ThemeIcon;
  command?: vscode.Command;
  contextValue?: string;
}

export class WijaMarketplaceProvider
  implements vscode.TreeDataProvider<IMarketplaceTreeItem>
{
  private readonly _onDidChangeTreeData = new vscode.EventEmitter<
    IMarketplaceTreeItem | undefined | null | void
  >();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  private agents: IMarketplaceAgent[] = [];
  private transactions: IMarketplaceTransaction[] = [];
  private currentFilter: string = 'all';
  private readonly currentCategory: string = 'all';
  private viewMode: 'browse' | 'history' | 'my-services' = 'browse';

  constructor(private readonly context: vscode.ExtensionContext) {
    this.loadMarketplaceData();
  }

  getTreeItem(element: IMarketplaceTreeItem): vscode.TreeItem {
    const item = new vscode.TreeItem(
      element.label,
      element.type === 'category'
        ? vscode.TreeItemCollapsibleState.Collapsed
        : vscode.TreeItemCollapsibleState.None
    );

    item.description = element.description;
    item.iconPath = element.iconPath;
    item.command = element.command;
    item.contextValue = element.contextValue || element.type;

    // Add rich tooltips
    if (element.agent) {
      const agent = element.agent;
      const tooltip = new vscode.MarkdownString();
      tooltip.appendMarkdown(
        `**${agent.name}**${agent.verified ? ' ✅' : ''}\n\n`
      );
      tooltip.appendMarkdown(`**Category:** ${agent.category}\n\n`);
      tooltip.appendMarkdown(
        `**Rating:** ${'⭐'.repeat(Math.floor(agent.rating))} (${agent.rating}/5 - ${agent.reviewCount} reviews)\n\n`
      );
      tooltip.appendMarkdown(
        `**Price:** ${agent.price.base} ${agent.price.currency} ${agent.price.paymentType}\n\n`
      );
      tooltip.appendMarkdown(
        `**Success Rate:** ${agent.metrics.successRate}%\n\n`
      );
      tooltip.appendMarkdown(
        `**Capabilities:** ${agent.capabilities.join(', ')}\n\n`
      );
      tooltip.appendMarkdown(`${agent.description}\n\n`);
      item.tooltip = tooltip;
    }

    return item;
  }

  getChildren(
    element?: IMarketplaceTreeItem
  ): Thenable<IMarketplaceTreeItem[]> {
    if (!element) {
      return this.getRootItems();
    }

    if (element.type === 'category') {
      return this.getCategoryChildren(element.category!);
    }

    if (element.type === 'agent') {
      return this.getAgentChildren(element.agent!);
    }

    return Promise.resolve([]);
  }

  private async getRootItems(): Promise<IMarketplaceTreeItem[]> {
    const items: IMarketplaceTreeItem[] = [];

    // View Mode Toggle
    items.push({
      type: 'action',
      label: `🔄 Switch to ${this.viewMode === 'browse' ? 'History' : this.viewMode === 'history' ? 'My Services' : 'Browse'}`,
      description: `Currently viewing: ${this.viewMode}`,
      iconPath: new vscode.ThemeIcon('arrow-swap'),
      command: {
        command: 'wija.marketplace.toggleView',
        title: 'Toggle View',
      },
      contextValue: 'action',
    });

    // Search and Filters
    items.push({
      type: 'action',
      label: '🔍 Search Agents',
      description: 'Find agents by name, capability, or category',
      iconPath: new vscode.ThemeIcon('search'),
      command: {
        command: 'wija.marketplace.search',
        title: 'Search Agents',
      },
      contextValue: 'action',
    });

    items.push({
      type: 'filter',
      label: `🎯 Filter: ${this.currentCategory} (${this.currentFilter})`,
      description: 'Change filters and sorting',
      iconPath: new vscode.ThemeIcon('filter'),
      command: {
        command: 'wija.marketplace.filter',
        title: 'Filter',
      },
      contextValue: 'filter',
    });

    if (this.viewMode === 'browse') {
      return [...items, ...(await this.getBrowseItems())];
    } else if (this.viewMode === 'history') {
      return [...items, ...(await this.getHistoryItems())];
    } else {
      return [...items, ...(await this.getMyServicesItems())];
    }
  }

  private async getBrowseItems(): Promise<IMarketplaceTreeItem[]> {
    const items: IMarketplaceTreeItem[] = [];

    // Featured Agents
    const featuredAgents = this.agents.filter(a => a.featured);
    if (featuredAgents.length > 0) {
      items.push({
        type: 'category',
        category: 'featured',
        label: `⭐ Featured Agents (${featuredAgents.length})`,
        description: 'Hand-picked premium agents',
        iconPath: new vscode.ThemeIcon('star'),
        contextValue: 'category',
      });
    }

    // Categories
    const categories = this.getAgentCategories();
    for (const category of categories) {
      const count = this.agents.filter(a => a.category === category).length;
      items.push({
        type: 'category',
        category,
        label: `${this.getCategoryIcon(category)} ${category} (${count})`,
        description: `${count} agents available`,
        iconPath: new vscode.ThemeIcon('folder'),
        contextValue: 'category',
      });
    }

    return items;
  }

  private async getHistoryItems(): Promise<IMarketplaceTreeItem[]> {
    const items: IMarketplaceTreeItem[] = [];

    // Transaction filters
    const statuses = ['pending', 'completed', 'failed', 'disputed'];
    for (const status of statuses) {
      const count = this.transactions.filter(t => t.status === status).length;
      if (count > 0) {
        items.push({
          type: 'category',
          category: status,
          label: `${this.getStatusIcon(status)} ${status.charAt(0).toUpperCase() + status.slice(1)} (${count})`,
          description: `${count} transactions`,
          iconPath: new vscode.ThemeIcon('history'),
          contextValue: 'transaction-category',
        });
      }
    }

    // Recent transactions (last 10)
    const recentTransactions = this.transactions
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, 10);

    for (const transaction of recentTransactions) {
      items.push({
        type: 'transaction',
        transaction,
        label: `${transaction.agentName} - ${transaction.amount} ${transaction.currency}`,
        description: `${transaction.type} • ${transaction.status} • ${this.formatDate(transaction.timestamp)}`,
        iconPath: this.getTransactionIcon(transaction),
        command: {
          command: 'wija.marketplace.viewTransaction',
          title: 'View Transaction',
          arguments: [transaction],
        },
        contextValue: 'transaction',
      });
    }

    return items;
  }

  private async getMyServicesItems(): Promise<IMarketplaceTreeItem[]> {
    const items: IMarketplaceTreeItem[] = [];

    items.push({
      type: 'action',
      label: '➕ Create New Service',
      description: 'List a new service in the marketplace',
      iconPath: new vscode.ThemeIcon('add'),
      command: {
        command: 'wija.marketplace.createService',
        title: 'Create Service',
      },
      contextValue: 'action',
    });

    // TODO: Add user's services when wallet integration is complete
    items.push({
      type: 'action',
      label: '📊 View Analytics',
      description: 'View your service performance',
      iconPath: new vscode.ThemeIcon('graph'),
      command: {
        command: 'wija.marketplace.analytics',
        title: 'View Analytics',
      },
      contextValue: 'action',
    });

    return items;
  }

  private async getCategoryChildren(
    category: string
  ): Promise<IMarketplaceTreeItem[]> {
    let agents: IMarketplaceAgent[] = [];

    if (category === 'featured') {
      agents = this.agents.filter(a => a.featured);
    } else {
      agents = this.agents.filter(a => a.category === category);
    }

    // Apply current filter
    if (this.currentFilter === 'verified') {
      agents = agents.filter(a => a.verified);
    } else if (this.currentFilter === 'top-rated') {
      agents = agents.filter(a => a.rating >= 4.5);
    }

    // Sort agents
    agents.sort((a, b) => {
      if (this.currentFilter === 'price-low')
        return a.price.base - b.price.base;
      if (this.currentFilter === 'price-high')
        return b.price.base - a.price.base;
      return b.rating - a.rating; // Default: sort by rating
    });

    return agents.map(agent => ({
      type: 'agent' as const,
      agent,
      label: agent.name,
      description: `${agent.rating}⭐ • ${agent.price.base} ${agent.price.currency}`,
      iconPath: this.getAgentIcon(agent),
      command: {
        command: 'wija.marketplace.viewAgent',
        title: 'View Agent',
        arguments: [agent],
      },
      contextValue: 'agent',
    }));
  }

  private async getAgentChildren(
    agent: IMarketplaceAgent
  ): Promise<IMarketplaceTreeItem[]> {
    const items: IMarketplaceTreeItem[] = [];

    // Agent actions
    items.push({
      type: 'action',
      label: '💬 Start Conversation',
      description: 'Begin chat with this agent',
      iconPath: new vscode.ThemeIcon('comment'),
      command: {
        command: 'wija.marketplace.startChat',
        title: 'Start Chat',
        arguments: [agent],
      },
      contextValue: 'action',
    });

    items.push({
      type: 'action',
      label: '📋 View Profile',
      description: 'View complete agent profile',
      iconPath: new vscode.ThemeIcon('person'),
      command: {
        command: 'wija.marketplace.viewProfile',
        title: 'View Profile',
        arguments: [agent],
      },
      contextValue: 'action',
    });

    // Services
    for (const service of agent.services) {
      items.push({
        type: 'service',
        service,
        label: service.name,
        description: `${service.price} SOL • ${service.estimatedTime}`,
        iconPath: new vscode.ThemeIcon('tools'),
        command: {
          command: 'wija.marketplace.purchaseService',
          title: 'Purchase Service',
          arguments: [agent, service],
        },
        contextValue: 'service',
      });
    }

    return items;
  }

  private getAgentCategories(): string[] {
    const categories = new Set<string>();
    this.agents.forEach(a => categories.add(a.category));
    return Array.from(categories).sort();
  }

  private getCategoryIcon(category: string): string {
    const icons: Record<string, string> = {
      'AI Assistant': '🤖',
      'Trading Bot': '📈',
      Analytics: '📊',
      Development: '💻',
      'Content Creation': '✍️',
      Research: '🔬',
      Security: '🔒',
      Gaming: '🎮',
      NFT: '🖼️',
      DeFi: '💰',
    };
    return icons[category] || '🤖';
  }

  private getStatusIcon(status: string): string {
    const icons: Record<string, string> = {
      pending: '⏳',
      completed: '✅',
      failed: '❌',
      disputed: '⚠️',
    };
    return icons[status] || '📄';
  }

  private getAgentIcon(agent: IMarketplaceAgent): vscode.ThemeIcon {
    if (agent.verified && agent.featured) {
      return new vscode.ThemeIcon(
        'verified',
        new vscode.ThemeColor('testing.iconPassed')
      );
    } else if (agent.verified) {
      return new vscode.ThemeIcon(
        'check',
        new vscode.ThemeColor('testing.iconPassed')
      );
    } else if (agent.featured) {
      return new vscode.ThemeIcon(
        'star',
        new vscode.ThemeColor('editorWarning.foreground')
      );
    } else {
      return new vscode.ThemeIcon('person');
    }
  }

  private getTransactionIcon(
    transaction: IMarketplaceTransaction
  ): vscode.ThemeIcon {
    const statusColors = {
      pending: new vscode.ThemeColor('editorWarning.foreground'),
      completed: new vscode.ThemeColor('testing.iconPassed'),
      failed: new vscode.ThemeColor('editorError.foreground'),
      disputed: new vscode.ThemeColor('editorWarning.foreground'),
    };

    const typeIcons = {
      purchase: 'arrow-down',
      sale: 'arrow-up',
      escrow: 'lock',
      payment: 'credit-card',
    };

    return new vscode.ThemeIcon(
      typeIcons[transaction.type] || 'circle',
      statusColors[transaction.status]
    );
  }

  private formatDate(date: Date): string {
    return (
      date.toLocaleDateString() +
      ' ' +
      date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    );
  }

  private async loadMarketplaceData(): Promise<void> {
    // Load mock data - in real implementation, this would fetch from blockchain
    this.agents = [
      {
        id: 'agent-1',
        name: 'Alice Trading Expert',
        address: '6NhXmaGa8NqFnkBuZATBzV2AqzSTTcTt6fEENtxf5sZz',
        description:
          'Advanced trading bot specializing in DeFi yield optimization and risk management.',
        category: 'Trading Bot',
        capabilities: [
          'DeFi Trading',
          'Yield Farming',
          'Risk Assessment',
          'Portfolio Management',
        ],
        rating: 4.8,
        reviewCount: 127,
        price: { base: 0.5, currency: 'SOL', paymentType: 'per-task' },
        owner: 'trader-wallet-address',
        verified: true,
        featured: true,
        tags: ['defi', 'trading', 'yield', 'premium'],
        metrics: {
          totalJobs: 1247,
          successRate: 96.8,
          averageResponseTime: 0.3,
          lastActive: new Date(),
        },
        services: [
          {
            id: 'service-1',
            name: 'Portfolio Optimization',
            description:
              'Analyze and optimize your DeFi portfolio for maximum yield with minimal risk.',
            category: 'Analysis',
            price: 0.8,
            estimatedTime: '2-4 hours',
            requirements: ['Portfolio data', 'Risk tolerance'],
            deliverables: [
              'Optimization report',
              'Strategy recommendations',
              'Implementation guide',
            ],
            examples: ['Previous optimization results', 'Sample reports'],
            tags: ['portfolio', 'optimization', 'yield'],
          },
        ],
      },
      {
        id: 'agent-2',
        name: 'Bob Content Creator',
        address: 'VStZBVvj6MTXmnfNE1aNPjm2ExsJPoATPkGBitrhskB',
        description:
          'Creative AI agent for generating technical documentation, blog posts, and marketing content.',
        category: 'Content Creation',
        capabilities: [
          'Technical Writing',
          'Blog Posts',
          'Marketing Copy',
          'Documentation',
        ],
        rating: 4.6,
        reviewCount: 89,
        price: { base: 0.3, currency: 'SOL', paymentType: 'per-task' },
        owner: 'content-creator-address',
        verified: true,
        featured: false,
        tags: ['content', 'writing', 'documentation'],
        metrics: {
          totalJobs: 445,
          successRate: 94.2,
          averageResponseTime: 1.2,
          lastActive: new Date(Date.now() - 3600000), // 1 hour ago
        },
        services: [
          {
            id: 'service-2',
            name: 'Technical Documentation',
            description:
              'Create comprehensive technical documentation for your project.',
            category: 'Documentation',
            price: 0.5,
            estimatedTime: '1-2 days',
            requirements: ['Project specifications', 'Code access'],
            deliverables: [
              'Complete documentation',
              'API guides',
              'User manuals',
            ],
            examples: ['Previous documentation samples'],
            tags: ['documentation', 'technical', 'writing'],
          },
        ],
      },
    ];

    this.transactions = [
      {
        id: 'tx-1',
        type: 'purchase',
        agentId: 'agent-1',
        agentName: 'Alice Trading Expert',
        serviceId: 'service-1',
        serviceName: 'Portfolio Optimization',
        amount: 0.8,
        currency: 'SOL',
        status: 'completed',
        timestamp: new Date(Date.now() - 86400000), // 1 day ago
        buyer: 'user-wallet',
        seller: 'trader-wallet-address',
        transactionHash: '3Kx8mY7Nz9QpVr2Bs1Dt6Gn4Jm5Xw8Cv7Lq9Rs2Fp1',
      },
      {
        id: 'tx-2',
        type: 'purchase',
        agentId: 'agent-2',
        agentName: 'Bob Content Creator',
        amount: 0.3,
        currency: 'SOL',
        status: 'pending',
        timestamp: new Date(Date.now() - 3600000), // 1 hour ago
        buyer: 'user-wallet',
        seller: 'content-creator-address',
        transactionHash: '8Fx2nK5Yz1QmPt4Xs7Cr9Gv3Jk6Nw2Bv5Lp8Rs4Mp9',
      },
    ];
  }

  // Public methods for command integration
  toggleView(): void {
    if (this.viewMode === 'browse') {
      this.viewMode = 'history';
    } else if (this.viewMode === 'history') {
      this.viewMode = 'my-services';
    } else {
      this.viewMode = 'browse';
    }
    this._onDidChangeTreeData.fire();
  }

  async searchAgents(): Promise<void> {
    const query = await vscode.window.showInputBox({
      prompt: 'Search agents',
      placeHolder: 'Enter agent name, capability, or keyword',
    });

    if (query) {
      // TODO: Implement search functionality
      vscode.window.showInformationMessage(`Searching for: ${query}`);
    }
  }

  async filterAgents(): Promise<void> {
    const filters = [
      { label: 'All Agents', value: 'all' },
      { label: 'Verified Only', value: 'verified' },
      { label: 'Top Rated (4.5+)', value: 'top-rated' },
      { label: 'Price: Low to High', value: 'price-low' },
      { label: 'Price: High to Low', value: 'price-high' },
    ];

    const selected = await vscode.window.showQuickPick(filters, {
      title: 'Filter Agents',
      placeHolder: 'Choose filter criteria',
    });

    if (selected) {
      this.currentFilter = selected.value;
      this._onDidChangeTreeData.fire();
    }
  }

  refresh(): void {
    this.loadMarketplaceData();
    this._onDidChangeTreeData.fire();
  }
}
