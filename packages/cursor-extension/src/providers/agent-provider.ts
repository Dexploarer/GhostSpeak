import * as vscode from 'vscode';
import * as cp from 'child_process';
import * as path from 'path';
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
  ) {}

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
    const projectContext = this.projectDetector.getProjectContext();
    if (!projectContext) {
      this.agents = [];
      return;
    }

    try {
      // Try to load agents from Wija CLI
      const cliAgents = await this.loadAgentsFromCLI();
      if (cliAgents.length > 0) {
        this.agents = cliAgents;
        return;
      }

      // Fallback to mock data for demonstration
      this.agents = await this.getMockAgents();
    } catch (error) {
      console.error('Error loading agents:', error);
      this.agents = await this.getMockAgents();
    }
  }

  private async loadAgentsFromCLI(): Promise<WijaAgent[]> {
    return new Promise((resolve, reject) => {
      const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
      if (!workspaceFolder) {
        resolve([]);
        return;
      }

      // Try to execute `wija agent list --json`
      cp.exec(
        'wija agent list --json',
        { cwd: workspaceFolder.uri.fsPath, timeout: 10000 },
        (error, stdout, stderr) => {
          if (error) {
            console.log('Wija CLI not available, using mock data');
            resolve([]);
            return;
          }

          try {
            const result = JSON.parse(stdout);
            const agents: WijaAgent[] = result.agents?.map((agent: any) => ({
              id: agent.id || agent.address,
              name: agent.name || `Agent ${agent.address.slice(0, 8)}`,
              address: agent.address,
              capabilities: agent.capabilities || [],
              status: agent.status || 'deployed',
              version: agent.version || '1.0.0',
              network: agent.network || 'devnet',
              owner: agent.owner || '',
              metadata: agent.metadata
            })) || [];

            resolve(agents);
          } catch (parseError) {
            console.error('Failed to parse CLI output:', parseError);
            resolve([]);
          }
        }
      );
    });
  }

  private async getMockAgents(): Promise<WijaAgent[]> {
    // Mock data for demonstration purposes
    return [
      {
        id: 'agent-1',
        name: 'Alice AI Assistant',
        address: '6NhXmaGa8NqFnkBuZATBzV2AqzSTTcTt6fEENtxf5sZz',
        capabilities: ['chat', 'analysis', 'research'],
        status: 'deployed',
        version: '1.2.0',
        network: 'devnet',
        owner: 'user-wallet-address',
        metadata: {
          description: 'AI assistant specialized in research and analysis',
          attributes: { specialization: 'research' }
        }
      },
      {
        id: 'agent-2',
        name: 'Bob Trading Bot',
        address: 'VStZBVvj6MTXmnfNE1aNPjm2ExsJPoATPkGBitrhskB',
        capabilities: ['trading', 'market-analysis', 'portfolio-management'],
        status: 'deployed',
        version: '2.1.0',
        network: 'devnet',
        owner: 'user-wallet-address',
        metadata: {
          description: 'Automated trading bot for DeFi operations',
          attributes: { strategy: 'momentum' }
        }
      },
      {
        id: 'agent-3',
        name: 'Charlie Analytics',
        address: 'GkFegD4VjvjCzTQqLJJVVb4QijdnrD5f6zUKHNHgHXTg',
        capabilities: ['analytics', 'reporting', 'visualization'],
        status: 'local',
        version: '1.0.0',
        network: 'localhost',
        owner: 'user-wallet-address',
        metadata: {
          description: 'Analytics agent for data processing and visualization',
          attributes: { focus: 'business-intelligence' }
        }
      }
    ];
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