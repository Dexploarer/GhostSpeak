import * as vscode from 'vscode';
import { exec } from 'child_process';
import { promisify } from 'util';
import { PodAIClientV2, createDevnetClient, createMainnetClient } from '../../../sdk-typescript/src/client-v2';
import { IChannelAccount, ChannelVisibility, Address } from '../../../sdk-typescript/src/types';

const execAsync = promisify(exec);

export interface WijaChannelExtended extends IChannelAccount {
  // UI extensions for VS Code tree view
  status: 'active' | 'inactive' | 'archived';
  lastMessage?: Date;
  participantCount: number;
  messageCount: number;
  isOwner: boolean;
}

export interface IChannelTreeItem {
  type: 'category' | 'channel' | 'action';
  channel?: WijaChannelExtended;
  label: string;
  description?: string;
  iconPath?: vscode.ThemeIcon;
  command?: vscode.Command;
  contextValue?: string;
}

export class WijaChannelProvider implements vscode.TreeDataProvider<IChannelTreeItem> {
  private readonly _onDidChangeTreeData = new vscode.EventEmitter<IChannelTreeItem | undefined | null | void>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  private channels: WijaChannelExtended[] = [];
  private podAIClient: PodAIClientV2;
  private currentNetwork: string = 'devnet';

  constructor(private readonly context: vscode.ExtensionContext) {
    // Initialize with devnet client by default
    this.podAIClient = createDevnetClient();
    this.loadChannelsFromBlockchain();
  }

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
      // Custom RPC endpoint
      this.podAIClient = new PodAIClientV2({
        rpcEndpoint: this.getCustomRpcEndpoint(network)
      });
    }
    
    await this.loadChannelsFromBlockchain();
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

  getTreeItem(element: IChannelTreeItem): vscode.TreeItem {
    const item = new vscode.TreeItem(
      element.label,
      element.type === 'category' ? vscode.TreeItemCollapsibleState.Collapsed : vscode.TreeItemCollapsibleState.None
    );

    item.description = element.description;
    item.iconPath = element.iconPath;
    item.command = element.command;
    item.contextValue = element.contextValue || element.type;

    // Enhanced tooltips with blockchain data
    if (element.channel) {
      const channel = element.channel;
      const tooltip = new vscode.MarkdownString();
      tooltip.appendMarkdown(`**${channel.name}**\n\n`);
      tooltip.appendMarkdown(`**Address:** \`${channel.address}\`\n\n`);
      tooltip.appendMarkdown(`**Visibility:** ${channel.visibility}\n\n`);
      tooltip.appendMarkdown(`**Participants:** ${channel.participantCount}\n\n`);
      tooltip.appendMarkdown(`**Messages:** ${channel.messageCount}\n\n`);
      tooltip.appendMarkdown(`**Created:** ${channel.createdAt.toLocaleString()}\n\n`);
      tooltip.appendMarkdown(`**Network:** ${this.currentNetwork}\n\n`);
      if (channel.description) {
        tooltip.appendMarkdown(`**Description:** ${channel.description}\n\n`);
      }
      item.tooltip = tooltip;
    }

    return item;
  }

  getChildren(element?: IChannelTreeItem): Thenable<IChannelTreeItem[]> {
    if (!element) {
      return this.getRootItems();
    }

    if (element.type === 'category') {
      return this.getCategoryChildren(element.label);
    }

    return Promise.resolve([]);
  }

  private async getRootItems(): Promise<IChannelTreeItem[]> {
    const items: IChannelTreeItem[] = [];

    // Network status indicator
    items.push({
      type: 'action',
      label: `🌐 ${this.currentNetwork.toUpperCase()}`,
      description: `Connected to PodAI on ${this.currentNetwork}`,
      iconPath: new vscode.ThemeIcon('globe'),
      command: {
        command: 'wija.channel.switchNetwork',
        title: 'Switch Network'
      },
      contextValue: 'network-status'
    });

    // Real-time channel categories based on actual blockchain data
    const activeChannels = this.channels.filter(c => c.status === 'active');
    const publicChannels = this.channels.filter(c => c.visibility === ChannelVisibility.PUBLIC);
    const privateChannels = this.channels.filter(c => c.visibility === ChannelVisibility.PRIVATE);
    const ownedChannels = this.channels.filter(c => c.isOwner);

    if (activeChannels.length > 0) {
      items.push({
        type: 'category',
        label: `📡 Active Channels (${activeChannels.length})`,
        description: 'Currently active channels on blockchain',
        iconPath: new vscode.ThemeIcon('radio-tower'),
        contextValue: 'category'
      });
    }

    if (publicChannels.length > 0) {
      items.push({
        type: 'category',
        label: `🌍 Public Channels (${publicChannels.length})`,
        description: 'Discoverable public channels',
        iconPath: new vscode.ThemeIcon('globe'),
        contextValue: 'category'
      });
    }

    if (privateChannels.length > 0) {
      items.push({
        type: 'category',
        label: `🔒 Private Channels (${privateChannels.length})`,
        description: 'Invitation-only private channels',
        iconPath: new vscode.ThemeIcon('lock'),
        contextValue: 'category'
      });
    }

    if (ownedChannels.length > 0) {
      items.push({
        type: 'category',
        label: `👑 My Channels (${ownedChannels.length})`,
        description: 'Channels you own and manage',
        iconPath: new vscode.ThemeIcon('crown'),
        contextValue: 'category'
      });
    }

    // Actions
    items.push({
      type: 'action',
      label: '➕ Create Channel',
      description: 'Create new channel on blockchain',
      iconPath: new vscode.ThemeIcon('add'),
      command: {
        command: 'wija.channel.create',
        title: 'Create Channel'
      },
      contextValue: 'action'
    });

    items.push({
      type: 'action',
      label: '🔄 Refresh from Blockchain',
      description: 'Fetch latest channel data from PodAI',
      iconPath: new vscode.ThemeIcon('refresh'),
      command: {
        command: 'wija.channel.refresh',
        title: 'Refresh'
      },
      contextValue: 'action'
    });

    return items;
  }

  private async getCategoryChildren(category: string): Promise<IChannelTreeItem[]> {
    let filteredChannels: WijaChannelExtended[] = [];

    switch (category) {
      case 'Active Channels':
        filteredChannels = this.channels.filter(c => c.status === 'active');
        break;
      case 'Public Channels':
        filteredChannels = this.channels.filter(c => c.visibility === ChannelVisibility.PUBLIC);
        break;
      case 'Private Channels':
        filteredChannels = this.channels.filter(c => c.visibility === ChannelVisibility.PRIVATE);
        break;
      case 'My Channels':
        filteredChannels = this.channels.filter(c => c.isOwner);
        break;
      default:
        filteredChannels = this.channels;
    }

    return filteredChannels.map(channel => ({
      type: 'channel' as const,
      channel,
      label: channel.name,
      description: `${channel.participantCount} participants • ${channel.messageCount} messages`,
      iconPath: this.getChannelIcon(channel),
      command: {
        command: 'wija.channel.view',
        title: 'View Channel',
        arguments: [channel]
      },
      contextValue: 'channel'
    }));
  }

  private getChannelIcon(channel: WijaChannelExtended): vscode.ThemeIcon {
    if (channel.isOwner) {
      return new vscode.ThemeIcon('crown', new vscode.ThemeColor('testing.iconPassed'));
    } else if (channel.visibility === ChannelVisibility.PRIVATE) {
      return new vscode.ThemeIcon('lock', new vscode.ThemeColor('editorWarning.foreground'));
    } else if (channel.status === 'active') {
      return new vscode.ThemeIcon('radio-tower', new vscode.ThemeColor('testing.iconPassed'));
    } else {
      return new vscode.ThemeIcon('comment');
    }
  }

  /**
   * Load channels from blockchain using real PodAI client - NO MOCK DATA
   */
  private async loadChannelsFromBlockchain(): Promise<void> {
    try {
      console.log(`🔗 Loading channels from PodAI blockchain (${this.currentNetwork})...`);
      
      // Verify PodAI client connection first
      const healthCheck = await this.podAIClient.healthCheck();
      if (!healthCheck.rpcConnection) {
        throw new Error(`Cannot connect to PodAI on ${this.currentNetwork}`);
      }

      console.log(`✅ PodAI connection verified on ${this.currentNetwork}`);

      // Get all channels from blockchain using PodAI client
      const channelAccounts = await this.podAIClient.channels.getAllChannels();
      
      console.log(`📡 Found ${channelAccounts.length} channels on blockchain`);

      // Convert to our extended format with real blockchain data
      this.channels = await Promise.all(
        channelAccounts.map(async (account) => {
          // Get additional data from blockchain
          const messageCount = await this.podAIClient.channels.getMessageCount(account.address);
          const participantCount = await this.podAIClient.channels.getParticipantCount(account.address);
          
          // Get last message timestamp
          const messages = await this.podAIClient.messages.getChannelMessages(account.address, { limit: 1 });
          const lastMessage = messages.length > 0 ? messages[0].timestamp : undefined;

          // Determine ownership (this would need wallet integration)
          const isOwner = false; // TODO: Check if current wallet owns this channel

          const extended: WijaChannelExtended = {
            ...account,
            status: this.determineChannelStatus(account, lastMessage),
            lastMessage,
            participantCount,
            messageCount,
            isOwner
          };

          return extended;
        })
      );

      console.log(`✅ Loaded ${this.channels.length} channels with real blockchain data`);

    } catch (error) {
      console.error('❌ Failed to load channels from blockchain:', error);
      
      // Show error to user
      vscode.window.showErrorMessage(
        `Failed to load channels from PodAI blockchain: ${error.message}`,
        'Retry'
      ).then(selection => {
        if (selection === 'Retry') {
          this.loadChannelsFromBlockchain();
        }
      });
      
      // Clear channels on error - NO FALLBACK TO MOCK DATA
      this.channels = [];
    }
  }

  private determineChannelStatus(
    account: IChannelAccount, 
    lastMessage?: Date
  ): 'active' | 'inactive' | 'archived' {
    if (!lastMessage) return 'inactive';
    
    const hoursSinceLastMessage = (Date.now() - lastMessage.getTime()) / (1000 * 60 * 60);
    
    if (hoursSinceLastMessage < 24) return 'active';
    if (hoursSinceLastMessage < 168) return 'inactive'; // 1 week
    return 'archived';
  }

  /**
   * Create a new channel on the blockchain
   */
  public async createChannel(name: string, visibility: ChannelVisibility, description?: string): Promise<void> {
    try {
      console.log(`🔗 Creating channel "${name}" on PodAI blockchain...`);
      
      // This would require wallet integration for signing
      throw new Error('Channel creation requires wallet integration. Please connect a wallet first.');
      
      // Real implementation:
      // const result = await this.podAIClient.channels.createChannel({
      //   name,
      //   visibility,
      //   description
      // });
      
      // await this.loadChannelsFromBlockchain();
      // this._onDidChangeTreeData.fire();
      
    } catch (error) {
      console.error('❌ Failed to create channel:', error);
      vscode.window.showErrorMessage(`Failed to create channel: ${error.message}`);
    }
  }

  /**
   * Join a channel on the blockchain
   */
  public async joinChannel(channelAddress: string): Promise<void> {
    try {
      console.log(`🔗 Joining channel ${channelAddress} on PodAI blockchain...`);
      
      // This would require wallet integration for signing
      throw new Error('Joining channels requires wallet integration. Please connect a wallet first.');
      
      // Real implementation:
      // await this.podAIClient.channels.joinChannel(channelAddress);
      // await this.loadChannelsFromBlockchain();
      // this._onDidChangeTreeData.fire();
      
    } catch (error) {
      console.error('❌ Failed to join channel:', error);
      vscode.window.showErrorMessage(`Failed to join channel: ${error.message}`);
    }
  }

  /**
   * Get channel details with real blockchain data
   */
  public async getChannelDetails(channelAddress: string): Promise<WijaChannelExtended | null> {
    try {
      const channel = await this.podAIClient.channels.getChannel(channelAddress);
      if (!channel) return null;

      // Get real-time data from blockchain
      const messageCount = await this.podAIClient.channels.getMessageCount(channelAddress);
      const participantCount = await this.podAIClient.channels.getParticipantCount(channelAddress);
      const messages = await this.podAIClient.messages.getChannelMessages(channelAddress, { limit: 1 });
      const lastMessage = messages.length > 0 ? messages[0].timestamp : undefined;

      return {
        ...channel,
        status: this.determineChannelStatus(channel, lastMessage),
        lastMessage,
        participantCount,
        messageCount,
        isOwner: false // TODO: Check ownership
      };

    } catch (error) {
      console.error('❌ Failed to get channel details:', error);
      return null;
    }
  }

  /**
   * Refresh channels from blockchain
   */
  public async refresh(): Promise<void> {
    await this.loadChannelsFromBlockchain();
    this._onDidChangeTreeData.fire();
  }

  /**
   * Get current PodAI client for other services
   */
  public getPodAIClient(): PodAIClientV2 {
    return this.podAIClient;
  }

  /**
   * Get network connection status with real blockchain verification
   */
  public async getNetworkStatus(): Promise<{
    connected: boolean;
    network: string;
    blockHeight: number;
    health: string;
  }> {
    try {
      const healthCheck = await this.podAIClient.healthCheck();
      return {
        connected: healthCheck.rpcConnection,
        network: this.currentNetwork,
        blockHeight: healthCheck.blockHeight,
        health: healthCheck.rpcConnection ? 'healthy' : 'unhealthy'
      };
    } catch (error) {
      return {
        connected: false,
        network: this.currentNetwork,
        blockHeight: 0,
        health: 'error'
      };
    }
  }
} 