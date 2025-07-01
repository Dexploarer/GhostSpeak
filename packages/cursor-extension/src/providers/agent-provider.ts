import * as cp from 'child_process';
import * as vscode from 'vscode';
import * as path from 'path';
import { PodAIClientV2, createDevnetClient, createMainnetClient } from '../../../sdk-typescript/src/client-v2';
import { IAgentAccount } from '../../../sdk-typescript/src/types';
import { WijaProjectDetector } from '../utils/project-detector';

export interface WijaAgent {
  id: string;
  name: string;
  address: string;
  capabilities: string[];
  status: 'deployed' | 'pending' | 'error' | 'local';
  version: string;
  network: string;
  owner: string;
  metadata?: {
    description?: string;
    image?: string;
    attributes?: Record<string, any>;
  };
}

export interface AgentTreeItem {
  type: 'agent' | 'capability' | 'action' | 'group';
  agent?: WijaAgent;
  capability?: string;
  label: string;
  description?: string;
  iconPath?: vscode.ThemeIcon | vscode.Uri | { light: vscode.Uri; dark: vscode.Uri };
  command?: vscode.Command;
}

export class WijaAgentProvider implements vscode.TreeDataProvider<AgentTreeItem> {
  private _onDidChangeTreeData: vscode.EventEmitter<AgentTreeItem | undefined | null | void> = new vscode.EventEmitter<AgentTreeItem | undefined | null | void>();
  readonly onDidChangeTreeData: vscode.Event<AgentTreeItem | undefined | null | void> = this._onDidChangeTreeData.event;

  private agents: WijaAgent[] = [];
  private isLoading = false;

  constructor(
    private readonly context: vscode.ExtensionContext,
    private readonly projectDetector: WijaProjectDetector
  ) {
    // Initialize PodAI client for real blockchain connections
    this.podAIClient = createDevnetClient();
    this.currentNetwork = 'devnet';
  }

  private podAIClient: PodAIClientV2;
  private currentNetwork: string;

  /**
   * Switch network and reinitialize PodAI client
   */
  public async switchNetwork(network: string): Promise<void> {
    this.currentNetwork = network;
    
    if (network === 'mainnet-beta') {
      this.podAIClient = createMainnetClient();
    } else if (network === 'devnet') {
      this.podAIClient = createDevnetClient();
    } else {
      this.podAIClient = new PodAIClientV2({
        rpcEndpoint: this.getCustomRpcEndpoint(network)
      });
    }
    
    await this.loadAgents();
    this._onDidChangeTreeData.fire();
  }

  private getCustomRpcEndpoint(network: string): string {
    switch (network) {
      case 'testnet':
        return 'https://api.testnet.solana.com';
      case 'localhost':
        return 'http://localhost:8899';
      default:
        return 'https://api.devnet.solana.com';
    }
  }

  getTreeItem(element: AgentTreeItem): vscode.TreeItem {
    const item = new vscode.TreeItem(
      element.label,
      element.type === 'agent' ? vscode.TreeItemCollapsibleState.Collapsed : vscode.TreeItemCollapsibleState.None
    );

    item.description = element.description;
    item.tooltip = this.getTooltip(element);
    item.contextValue = element.type;
    item.command = element.command;

    // Set icons based on type
    switch (element.type) {
      case 'agent':
        item.iconPath = this.getAgentIcon(element.agent?.status || 'local');
        break;
      case 'capability':
        item.iconPath = new vscode.ThemeIcon('symbol-method');
        break;
      case 'action':
        item.iconPath = new vscode.ThemeIcon('play');
        break;
      case 'group':
        item.iconPath = new vscode.ThemeIcon('folder');
        break;
    }

    return item;
  }

  getChildren(element?: AgentTreeItem): Thenable<AgentTreeItem[]> {
    if (!element) {
      // Root level - show agents and groups
      return this.getRootItems();
    }

    if (element.type === 'agent' && element.agent) {
      // Agent children - show capabilities and actions
      return this.getAgentChildren(element.agent);
    }

    if (element.type === 'group') {
      // Group children
      return this.getGroupChildren(element.label);
    }

    return Promise.resolve([]);
  }

  private async getRootItems(): Promise<AgentTreeItem[]> {
    if (this.isLoading) {
      return [{
        type: 'group',
        label: 'Loading agents...',
        description: '',
        iconPath: new vscode.ThemeIcon('loading~spin')
      }];
    }

    if (this.agents.length === 0) {
      return [
        {
          type: 'action',
          label: 'Deploy New Agent',
          description: 'Create and deploy a new AI agent',
          iconPath: new vscode.ThemeIcon('add'),
          command: {
            command: 'wija.deployAgent',
            title: 'Deploy Agent'
          }
        },
        {
          type: 'action',
          label: 'Import Agent',
          description: 'Import an existing agent from address',
          iconPath: new vscode.ThemeIcon('cloud-download'),
          command: {
            command: 'wija.importAgent',
            title: 'Import Agent'
          }
        }
      ];
    }

    const items: AgentTreeItem[] = [];

    // Group by status
    const deployedAgents = this.agents.filter(a => a.status === 'deployed');
    const localAgents = this.agents.filter(a => a.status === 'local');
    const pendingAgents = this.agents.filter(a => a.status === 'pending');

    if (deployedAgents.length > 0) {
      items.push({
        type: 'group',
        label: `Deployed (${deployedAgents.length})`,
        iconPath: new vscode.ThemeIcon('cloud')
      });
    }

    if (localAgents.length > 0) {
      items.push({
        type: 'group',
        label: `Local (${localAgents.length})`,
        iconPath: new vscode.ThemeIcon('home')
      });
    }

    if (pendingAgents.length > 0) {
      items.push({
        type: 'group',
        label: `Pending (${pendingAgents.length})`,
        iconPath: new vscode.ThemeIcon('clock')
      });
    }

    // Add individual agents
    for (const agent of this.agents) {
      items.push({
        type: 'agent',
        agent,
        label: agent.name,
        description: `${agent.capabilities.length} capabilities`,
        command: {
          command: 'wija.openAgent',
          title: 'Open Agent',
          arguments: [agent]
        }
      });
    }

    return items;
  }

  private async getAgentChildren(agent: WijaAgent): Promise<AgentTreeItem[]> {
    const items: AgentTreeItem[] = [];

    // Agent info
    items.push({
      type: 'group',
      label: 'Information',
      description: agent.address.slice(0, 8) + '...',
      iconPath: new vscode.ThemeIcon('info')
    });

    // Capabilities
    if (agent.capabilities.length > 0) {
      items.push({
        type: 'group',
        label: `Capabilities (${agent.capabilities.length})`,
        iconPath: new vscode.ThemeIcon('symbol-interface')
      });

      for (const capability of agent.capabilities) {
        items.push({
          type: 'capability',
          capability,
          label: capability,
          description: 'Agent capability'
        });
      }
    }

    // Actions
    items.push({
      type: 'action',
      label: 'View on Explorer',
      description: 'Open agent on Solana Explorer',
      iconPath: new vscode.ThemeIcon('link-external'),
      command: {
        command: 'wija.viewOnExplorer',
        title: 'View on Explorer',
        arguments: [agent.address]
      }
    });

    items.push({
      type: 'action',
      label: 'Test Agent',
      description: 'Send test message to agent',
      iconPath: new vscode.ThemeIcon('debug-alt'),
      command: {
        command: 'wija.testAgent',
        title: 'Test Agent',
        arguments: [agent]
      }
    });

    return items;
  }

  private async getGroupChildren(groupLabel: string): Promise<AgentTreeItem[]> {
    const [groupType] = groupLabel.split(' ');
    
    switch (groupType.toLowerCase()) {
      case 'deployed':
        return this.agents
          .filter(a => a.status === 'deployed')
          .map(agent => ({
            type: 'agent' as const,
            agent,
            label: agent.name,
            description: `${agent.capabilities.length} capabilities`
          }));
      
      case 'local':
        return this.agents
          .filter(a => a.status === 'local')
          .map(agent => ({
            type: 'agent' as const,
            agent,
            label: agent.name,
            description: `${agent.capabilities.length} capabilities`
          }));
      
      case 'pending':
        return this.agents
          .filter(a => a.status === 'pending')
          .map(agent => ({
            type: 'agent' as const,
            agent,
            label: agent.name,
            description: 'Deployment pending...'
          }));
      
      default:
        return [];
    }
  }

  private getAgentIcon(status: string): vscode.ThemeIcon {
    switch (status) {
      case 'deployed':
        return new vscode.ThemeIcon('globe', new vscode.ThemeColor('testing.iconPassed'));
      case 'pending':
        return new vscode.ThemeIcon('sync~spin', new vscode.ThemeColor('editorWarning.foreground'));
      case 'error':
        return new vscode.ThemeIcon('error', new vscode.ThemeColor('editorError.foreground'));
      case 'local':
      default:
        return new vscode.ThemeIcon('home', new vscode.ThemeColor('editorInfo.foreground'));
    }
  }

  private getTooltip(element: AgentTreeItem): vscode.MarkdownString {
    if (element.type === 'agent' && element.agent) {
      const agent = element.agent;
      const tooltip = new vscode.MarkdownString();
      tooltip.appendMarkdown(`**${agent.name}**\n\n`);
      tooltip.appendMarkdown(`**Address:** \`${agent.address}\`\n\n`);
      tooltip.appendMarkdown(`**Status:** ${agent.status}\n\n`);
      tooltip.appendMarkdown(`**Network:** ${agent.network}\n\n`);
      tooltip.appendMarkdown(`**Capabilities:** ${agent.capabilities.join(', ')}\n\n`);
      if (agent.metadata?.description) {
        tooltip.appendMarkdown(`**Description:** ${agent.metadata.description}\n\n`);
      }
      return tooltip;
    }

    return new vscode.MarkdownString(element.description || element.label);
  }

  async refresh(): Promise<void> {
    this.isLoading = true;
    this._onDidChangeTreeData.fire();

    try {
      await this.loadAgents();
    } catch (error) {
      console.error('Failed to refresh agents:', error);
      vscode.window.showErrorMessage(`Failed to refresh agents: ${error}`);
    } finally {
      this.isLoading = false;
      this._onDidChangeTreeData.fire();
    }
  }

  private async loadAgents(): Promise<void> {
    try {
      console.log(`🔗 Loading agents from PodAI blockchain (${this.currentNetwork})...`);
      
      // Verify PodAI client connection first
      const healthCheck = await this.podAIClient.healthCheck();
      if (!healthCheck.rpcConnection) {
        throw new Error(`Cannot connect to PodAI on ${this.currentNetwork}`);
      }

      console.log(`✅ PodAI connection verified on ${this.currentNetwork}`);

      // Get all agents from blockchain using PodAI client
      const agentAccounts = await this.podAIClient.agents.getAllAgents();
      
      console.log(`🤖 Found ${agentAccounts.length} agents on blockchain`);

      // Convert blockchain data to our WijaAgent format
      this.agents = agentAccounts.map((account: IAgentAccount) => {
        const agent: WijaAgent = {
          id: account.address,
          name: account.name || `Agent ${account.address.slice(0, 8)}`,
          address: account.address,
          capabilities: account.capabilities || [],
          status: 'deployed', // All agents from blockchain are deployed
          version: account.version || '1.0.0',
          network: this.currentNetwork,
          owner: account.owner || '',
          metadata: {
            description: account.metadata?.description,
            image: account.metadata?.image,
            attributes: account.metadata?.attributes
          }
        };
        return agent;
      });

      console.log(`✅ Loaded ${this.agents.length} agents with real blockchain data`);

    } catch (error) {
      console.error('❌ Failed to load agents from blockchain:', error);
      
      // Show error to user
      vscode.window.showErrorMessage(
        `Failed to load agents from PodAI blockchain: ${error.message}`,
        'Retry'
      ).then(selection => {
        if (selection === 'Retry') {
          this.loadAgents();
        }
      });
      
      // Clear agents on error - NO FALLBACK TO MOCK DATA
      this.agents = [];
    }
  }

  /**
   * Deploy a new agent to the blockchain
   */
  public async deployAgent(agentData: {
    name: string;
    capabilities: string[];
    metadata?: any;
  }): Promise<void> {
    try {
      console.log(`🚀 Deploying agent "${agentData.name}" to PodAI blockchain...`);
      
      // This would require wallet integration for signing
      throw new Error('Agent deployment requires wallet integration. Please connect a wallet first.');
      
      // Real implementation:
      // const result = await this.podAIClient.agents.registerAgent(wallet, {
      //   name: agentData.name,
      //   capabilities: agentData.capabilities,
      //   metadata: agentData.metadata
      // });
      
      // await this.loadAgents();
      // this._onDidChangeTreeData.fire();
      
    } catch (error) {
      console.error('❌ Failed to deploy agent:', error);
      vscode.window.showErrorMessage(`Failed to deploy agent: ${error.message}`);
    }
  }

  /**
   * Get agent details with real blockchain data
   */
  public async getAgentDetails(agentAddress: string): Promise<WijaAgent | null> {
    try {
      const account = await this.podAIClient.agents.getAgent(agentAddress);
      if (!account) return null;

      return {
        id: account.address,
        name: account.name || `Agent ${account.address.slice(0, 8)}`,
        address: account.address,
        capabilities: account.capabilities || [],
        status: 'deployed',
        version: account.version || '1.0.0',
        network: this.currentNetwork,
        owner: account.owner || '',
        metadata: {
          description: account.metadata?.description,
          image: account.metadata?.image,
          attributes: account.metadata?.attributes
        }
      };

    } catch (error) {
      console.error('❌ Failed to get agent details:', error);
      return null;
    }
  }

  /**
   * Get current PodAI client for other services
   */
  public getPodAIClient(): PodAIClientV2 {
    return this.podAIClient;
  }

  // Public method to add a new agent
  addAgent(agent: WijaAgent): void {
    this.agents.push(agent);
    this._onDidChangeTreeData.fire();
  }

  // Public method to remove an agent
  removeAgent(agentId: string): void {
    this.agents = this.agents.filter(a => a.id !== agentId);
    this._onDidChangeTreeData.fire();
  }

  // Public method to get agent by ID
  getAgent(agentId: string): WijaAgent | undefined {
    return this.agents.find(a => a.id === agentId);
  }

  // Public method to get all agents
  getAllAgents(): WijaAgent[] {
    return [...this.agents];
  }
} 