import * as vscode from 'vscode';
import * as cp from 'child_process';
import * as path from 'path';
import { WijaProjectDetector } from '../utils/project-detector';

export interface WijaChannel {
  id: string;
  name: string;
  address: string;
  visibility: 'public' | 'private' | 'encrypted';
  memberCount: number;
  messageCount: number;
  status: 'active' | 'inactive' | 'archived' | 'local';
  network: string;
  owner: string;
  description?: string;
  created: string;
  lastActivity?: string;
  encryption: boolean;
  moderators: string[];
  tags: string[];
  metadata?: {
    purpose?: string;
    rules?: string[];
    avatar?: string;
    settings?: Record<string, any>;
  };
}

export interface ChannelTreeItem {
  type: 'channel' | 'message' | 'member' | 'action' | 'group' | 'info';
  channel?: WijaChannel;
  label: string;
  description?: string;
  iconPath?: vscode.ThemeIcon | vscode.Uri | { light: vscode.Uri; dark: vscode.Uri };
  command?: vscode.Command;
  contextValue?: string;
}

export class WijaChannelProvider implements vscode.TreeDataProvider<ChannelTreeItem> {
  private _onDidChangeTreeData: vscode.EventEmitter<ChannelTreeItem | undefined | null | void> = new vscode.EventEmitter<ChannelTreeItem | undefined | null | void>();
  readonly onDidChangeTreeData: vscode.Event<ChannelTreeItem | undefined | null | void> = this._onDidChangeTreeData.event;

  private channels: WijaChannel[] = [];
  private isLoading = false;

  constructor(
    private readonly context: vscode.ExtensionContext,
    private readonly projectDetector: WijaProjectDetector
  ) {}

  getTreeItem(element: ChannelTreeItem): vscode.TreeItem {
    const item = new vscode.TreeItem(
      element.label,
      element.type === 'channel' ? vscode.TreeItemCollapsibleState.Collapsed : 
      element.type === 'group' ? vscode.TreeItemCollapsibleState.Collapsed :
      vscode.TreeItemCollapsibleState.None
    );

    item.description = element.description;
    item.tooltip = this.getTooltip(element);
    item.contextValue = element.contextValue || element.type;
    item.command = element.command;

    // Set icons based on type
    switch (element.type) {
      case 'channel':
        item.iconPath = this.getChannelIcon(element.channel?.visibility || 'public', element.channel?.status || 'local');
        break;
      case 'message':
        item.iconPath = new vscode.ThemeIcon('comment');
        break;
      case 'member':
        item.iconPath = new vscode.ThemeIcon('person');
        break;
      case 'action':
        item.iconPath = new vscode.ThemeIcon('play');
        break;
      case 'group':
        item.iconPath = new vscode.ThemeIcon('folder');
        break;
      case 'info':
        item.iconPath = new vscode.ThemeIcon('info');
        break;
    }

    return item;
  }

  getChildren(element?: ChannelTreeItem): Thenable<ChannelTreeItem[]> {
    if (!element) {
      // Root level - show channels and groups
      return this.getRootItems();
    }

    if (element.type === 'channel' && element.channel) {
      // Channel children - show info, messages, members, actions
      return this.getChannelChildren(element.channel);
    }

    if (element.type === 'group') {
      // Group children
      return this.getGroupChildren(element.label);
    }

    return Promise.resolve([]);
  }

  private async getRootItems(): Promise<ChannelTreeItem[]> {
    if (this.isLoading) {
      return [{
        type: 'group',
        label: 'Loading channels...',
        description: '',
        iconPath: new vscode.ThemeIcon('loading~spin')
      }];
    }

    if (this.channels.length === 0) {
      return [
        {
          type: 'action',
          label: 'Create New Channel',
          description: 'Create a new communication channel',
          iconPath: new vscode.ThemeIcon('add'),
          command: {
            command: 'wija.createChannel',
            title: 'Create Channel'
          }
        },
        {
          type: 'action',
          label: 'Join Channel',
          description: 'Join an existing channel by address',
          iconPath: new vscode.ThemeIcon('sign-in'),
          command: {
            command: 'wija.joinChannel',
            title: 'Join Channel'
          }
        }
      ];
    }

    const items: ChannelTreeItem[] = [];

    // Group by status
    const activeChannels = this.channels.filter(c => c.status === 'active');
    const localChannels = this.channels.filter(c => c.status === 'local');

    if (activeChannels.length > 0) {
      items.push({
        type: 'group',
        label: `Active Channels (${activeChannels.length})`,
        iconPath: new vscode.ThemeIcon('broadcast')
      });
    }

    if (localChannels.length > 0) {
      items.push({
        type: 'group',
        label: `Local Channels (${localChannels.length})`,
        iconPath: new vscode.ThemeIcon('home')
      });
    }

    // Add individual channels
    for (const channel of this.channels) {
      items.push({
        type: 'channel',
        channel,
        label: channel.name,
        description: `${channel.memberCount} members`,
        command: {
          command: 'wija.openChannel',
          title: 'Open Channel',
          arguments: [channel]
        }
      });
    }

    return items;
  }

  private async getChannelChildren(channel: WijaChannel): Promise<ChannelTreeItem[]> {
    const items: ChannelTreeItem[] = [];

    // Channel actions
    items.push({
      type: 'action',
      label: 'Send Message',
      description: 'Send a message to this channel',
      iconPath: new vscode.ThemeIcon('edit'),
      command: {
        command: 'wija.sendMessage',
        title: 'Send Message',
        arguments: [channel]
      }
    });

    items.push({
      type: 'action',
      label: 'View on Explorer',
      description: 'Open channel on Solana Explorer',
      iconPath: new vscode.ThemeIcon('link-external'),
      command: {
        command: 'wija.viewOnExplorer',
        title: 'View on Explorer',
        arguments: [channel.address]
      }
    });

    return items;
  }

  private async getGroupChildren(groupLabel: string): Promise<ChannelTreeItem[]> {
    const [groupType] = groupLabel.split(' ');
    
    switch (groupType.toLowerCase()) {
      case 'active':
        return this.channels
          .filter(c => c.status === 'active')
          .map(channel => ({
            type: 'channel' as const,
            channel,
            label: channel.name,
            description: `${channel.memberCount} members`
          }));
      
      case 'local':
        return this.channels
          .filter(c => c.status === 'local')
          .map(channel => ({
            type: 'channel' as const,
            channel,
            label: channel.name,
            description: 'Local development'
          }));
      
      default:
        return [];
    }
  }

  private getChannelIcon(visibility: string, status: string): vscode.ThemeIcon {
    let iconName = 'broadcast';
    let color: vscode.ThemeColor | undefined;

    switch (visibility) {
      case 'private':
        iconName = 'lock';
        break;
      case 'encrypted':
        iconName = 'key';
        break;
      case 'public':
      default:
        iconName = 'broadcast';
        break;
    }

    switch (status) {
      case 'active':
        color = new vscode.ThemeColor('testing.iconPassed');
        break;
      case 'local':
      default:
        color = new vscode.ThemeColor('editorInfo.foreground');
        break;
    }

    return new vscode.ThemeIcon(iconName, color);
  }

  private getTooltip(element: ChannelTreeItem): vscode.MarkdownString {
    if (element.type === 'channel' && element.channel) {
      const channel = element.channel;
      const tooltip = new vscode.MarkdownString();
      tooltip.appendMarkdown(`**${channel.name}**\n\n`);
      tooltip.appendMarkdown(`**Address:** \`${channel.address}\`\n\n`);
      tooltip.appendMarkdown(`**Visibility:** ${channel.visibility}\n\n`);
      tooltip.appendMarkdown(`**Status:** ${channel.status}\n\n`);
      tooltip.appendMarkdown(`**Members:** ${channel.memberCount}\n\n`);
      if (channel.description) {
        tooltip.appendMarkdown(`**Description:** ${channel.description}\n\n`);
      }
      return tooltip;
    }

    return new vscode.MarkdownString(element.description || element.label);
  }

  async refresh(): Promise<void> {
    this.isLoading = true;
    this._onDidChangeTreeData.fire();

    try {
      await this.loadChannels();
    } catch (error) {
      console.error('Failed to refresh channels:', error);
      vscode.window.showErrorMessage(`Failed to refresh channels: ${error}`);
    } finally {
      this.isLoading = false;
      this._onDidChangeTreeData.fire();
    }
  }

  private async loadChannels(): Promise<void> {
    const projectContext = this.projectDetector.getProjectContext();
    if (!projectContext) {
      this.channels = [];
      return;
    }

    try {
      // Try to load channels from Wija CLI
      const cliChannels = await this.loadChannelsFromCLI();
      if (cliChannels.length > 0) {
        this.channels = cliChannels;
        return;
      }

      // Fallback to mock data for demonstration
      this.channels = await this.getMockChannels();
    } catch (error) {
      console.error('Error loading channels:', error);
      this.channels = await this.getMockChannels();
    }
  }

  private async loadChannelsFromCLI(): Promise<WijaChannel[]> {
    return new Promise((resolve, reject) => {
      const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
      if (!workspaceFolder) {
        resolve([]);
        return;
      }

      // Try to execute `wija channel list --json`
      cp.exec(
        'wija channel list --json',
        { cwd: workspaceFolder.uri.fsPath, timeout: 10000 },
        (error, stdout, stderr) => {
          if (error) {
            console.log('Wija CLI not available, using mock data');
            resolve([]);
            return;
          }

          try {
            const result = JSON.parse(stdout);
            const channels: WijaChannel[] = result.channels?.map((channel: any) => ({
              id: channel.id || channel.address,
              name: channel.name || `Channel ${channel.address.slice(0, 8)}`,
              address: channel.address,
              visibility: channel.visibility || 'public',
              memberCount: channel.memberCount || 0,
              messageCount: channel.messageCount || 0,
              status: channel.status || 'active',
              network: channel.network || 'devnet',
              owner: channel.owner || '',
              description: channel.description,
              created: channel.created || new Date().toISOString(),
              lastActivity: channel.lastActivity,
              encryption: channel.encryption || false,
              moderators: channel.moderators || [],
              tags: channel.tags || [],
              metadata: channel.metadata
            })) || [];

            resolve(channels);
          } catch (parseError) {
            console.error('Failed to parse CLI output:', parseError);
            resolve([]);
          }
        }
      );
    });
  }

  private async getMockChannels(): Promise<WijaChannel[]> {
    // Mock data for demonstration purposes
    return [
      {
        id: 'channel-1',
        name: 'General Discussion',
        address: 'Ch1GeneralDiscussion123456789ABCDEF',
        visibility: 'public',
        memberCount: 42,
        messageCount: 1337,
        status: 'active',
        network: 'devnet',
        owner: 'user-wallet-address',
        description: 'General discussion channel for the community',
        created: '2024-01-01T00:00:00Z',
        lastActivity: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        encryption: false,
        moderators: ['mod1', 'mod2'],
        tags: ['general', 'community'],
        metadata: {
          purpose: 'Community discussion',
          rules: ['Be respectful', 'Stay on topic', 'No spam']
        }
      },
      {
        id: 'channel-2',
        name: 'Trading Signals',
        address: 'Ch2TradingSignals987654321FEDCBA',
        visibility: 'private',
        memberCount: 15,
        messageCount: 256,
        status: 'active',
        network: 'devnet',
        owner: 'user-wallet-address',
        description: 'Private channel for trading signals',
        created: '2024-01-15T00:00:00Z',
        lastActivity: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
        encryption: true,
        moderators: ['trader1'],
        tags: ['trading', 'signals', 'private'],
        metadata: {
          purpose: 'Trading coordination',
          rules: ['No financial advice', 'Data only']
        }
      }
    ];
  }

  // Public methods for channel management
  addChannel(channel: WijaChannel): void {
    this.channels.push(channel);
    this._onDidChangeTreeData.fire();
  }

  removeChannel(channelId: string): void {
    this.channels = this.channels.filter(c => c.id !== channelId);
    this._onDidChangeTreeData.fire();
  }

  getChannel(channelId: string): WijaChannel | undefined {
    return this.channels.find(c => c.id === channelId);
  }

  getAllChannels(): WijaChannel[] {
    return [...this.channels];
  }
} 