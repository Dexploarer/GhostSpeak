import * as vscode from 'vscode';
import * as https from 'https';
import * as http from 'http';

export interface INetworkStatus {
  cluster: 'devnet' | 'testnet' | 'mainnet-beta' | 'localhost';
  rpcEndpoint: string;
  connected: boolean;
  latency: number;
  blockHeight: number;
  slotHeight: number;
  tps: number;
  epoch: number;
  epochProgress: number;
  health: 'healthy' | 'degraded' | 'offline';
  lastUpdate: Date;
  version?: string;
  fees?: {
    lamportsPerSignature: number;
    estimatedFee: number;
  };
}

export interface IRPCEndpoint {
  name: string;
  url: string;
  cluster: string;
  status: 'online' | 'offline' | 'slow' | 'unknown';
  latency: number;
  lastChecked: Date;
  isCustom: boolean;
  features: string[];
}

export interface INetworkTreeItem {
  type: 'status' | 'cluster' | 'rpc' | 'metric' | 'action' | 'header';
  network?: INetworkStatus;
  rpc?: IRPCEndpoint;
  label: string;
  description?: string;
  iconPath?: vscode.ThemeIcon;
  command?: vscode.Command;
  contextValue?: string;
}

export class WijaNetworkProvider implements vscode.TreeDataProvider<INetworkTreeItem> {
  private _onDidChangeTreeData = new vscode.EventEmitter<INetworkTreeItem | undefined | null | void>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  private currentNetwork: INetworkStatus | null = null;
  private availableRPCs: IRPCEndpoint[] = [];
  private refreshInterval: NodeJS.Timeout | null = null;
  private isMonitoring = true;

  constructor(
    private readonly context: vscode.ExtensionContext,
    private readonly config: any
  ) {
    this.initializeNetworkData();
    this.startMonitoring();
  }

  getTreeItem(element: INetworkTreeItem): vscode.TreeItem {
    const item = new vscode.TreeItem(
      element.label,
      element.type === 'header' ? vscode.TreeItemCollapsibleState.Expanded : vscode.TreeItemCollapsibleState.None
    );

    item.description = element.description;
    item.iconPath = element.iconPath;
    item.command = element.command;
    item.contextValue = element.contextValue || element.type;

    // Add rich tooltips for network info
    if (element.network) {
      const network = element.network;
      const tooltip = new vscode.MarkdownString();
      tooltip.appendMarkdown(`**${network.cluster.toUpperCase()} Network**\n\n`);
      tooltip.appendMarkdown(`**RPC:** ${network.rpcEndpoint}\n\n`);
      tooltip.appendMarkdown(`**Status:** ${network.connected ? '🟢 Connected' : '🔴 Disconnected'}\n\n`);
      tooltip.appendMarkdown(`**Health:** ${this.getHealthIcon(network.health)} ${network.health}\n\n`);
      tooltip.appendMarkdown(`**Latency:** ${network.latency}ms\n\n`);
      tooltip.appendMarkdown(`**Block Height:** ${network.blockHeight.toLocaleString()}\n\n`);
      tooltip.appendMarkdown(`**TPS:** ${network.tps}\n\n`);
      tooltip.appendMarkdown(`**Epoch:** ${network.epoch} (${(network.epochProgress * 100).toFixed(1)}%)\n\n`);
      if (network.fees) {
        tooltip.appendMarkdown(`**Fee:** ${network.fees.lamportsPerSignature} lamports\n\n`);
      }
      tooltip.appendMarkdown(`**Last Update:** ${network.lastUpdate.toLocaleTimeString()}\n\n`);
      item.tooltip = tooltip;
    }

    return item;
  }

  getChildren(element?: INetworkTreeItem): Thenable<INetworkTreeItem[]> {
    if (!element) {
      return this.getRootItems();
    }

    if (element.type === 'header') {
      return this.getHeaderChildren(element.label);
    }

    return Promise.resolve([]);
  }

  private async getRootItems(): Promise<INetworkTreeItem[]> {
    const items: INetworkTreeItem[] = [];

    // Monitoring toggle
    items.push({
      type: 'action',
      label: `${this.isMonitoring ? '⏸️ Stop' : '▶️ Start'} Monitoring`,
      description: `Real-time network monitoring ${this.isMonitoring ? 'active' : 'paused'}`,
      iconPath: new vscode.ThemeIcon(this.isMonitoring ? 'debug-pause' : 'play'),
      command: {
        command: 'wija.network.toggleMonitoring',
        title: 'Toggle Monitoring'
      },
      contextValue: 'monitoring-toggle'
    });

    // Quick actions
    items.push({
      type: 'action',
      label: '🔄 Refresh Status',
      description: 'Update network information',
      iconPath: new vscode.ThemeIcon('refresh'),
      command: {
        command: 'wija.network.refresh',
        title: 'Refresh'
      },
      contextValue: 'action'
    });

    items.push({
      type: 'action',
      label: '🌐 Switch Network',
      description: 'Change active network',
      iconPath: new vscode.ThemeIcon('globe'),
      command: {
        command: 'wija.network.switch',
        title: 'Switch Network'
      },
      contextValue: 'action'
    });

    // Current network status
    if (this.currentNetwork) {
      items.push({
        type: 'status',
        network: this.currentNetwork,
        label: `📡 ${this.currentNetwork.cluster.toUpperCase()}`,
        description: `${this.getHealthIcon(this.currentNetwork.health)} ${this.currentNetwork.latency}ms • Block ${this.currentNetwork.blockHeight.toLocaleString()}`,
        iconPath: this.getNetworkIcon(this.currentNetwork),
        contextValue: 'current-network'
      });
    }

    // Headers for expandable sections
    items.push({
      type: 'header',
      label: '📊 Network Metrics',
      description: 'Real-time blockchain statistics',
      iconPath: new vscode.ThemeIcon('graph'),
      contextValue: 'metrics-header'
    });

    items.push({
      type: 'header',
      label: '🌐 Available Networks',
      description: 'All Solana clusters',
      iconPath: new vscode.ThemeIcon('server-environment'),
      contextValue: 'networks-header'
    });

    items.push({
      type: 'header',
      label: '🔗 RPC Endpoints',
      description: 'Available RPC providers',
      iconPath: new vscode.ThemeIcon('link'),
      contextValue: 'rpc-header'
    });

    return items;
  }

  private async getHeaderChildren(headerLabel: string): Promise<INetworkTreeItem[]> {
    if (headerLabel === '📊 Network Metrics') {
      return this.getMetricItems();
    } else if (headerLabel === '🌐 Available Networks') {
      return this.getNetworkItems();
    } else if (headerLabel === '🔗 RPC Endpoints') {
      return this.getRPCItems();
    }
    return [];
  }

  private async getMetricItems(): Promise<INetworkTreeItem[]> {
    if (!this.currentNetwork) return [];

    const items: INetworkTreeItem[] = [];
    const network = this.currentNetwork;

    items.push({
      type: 'metric',
      label: '🏗️ Block Height',
      description: network.blockHeight.toLocaleString(),
      iconPath: new vscode.ThemeIcon('symbol-structure'),
      contextValue: 'metric'
    });

    items.push({
      type: 'metric',
      label: '🎰 Slot Height',
      description: network.slotHeight.toLocaleString(),
      iconPath: new vscode.ThemeIcon('symbol-numeric'),
      contextValue: 'metric'
    });

    items.push({
      type: 'metric',
      label: '⚡ TPS',
      description: `${network.tps} transactions/sec`,
      iconPath: new vscode.ThemeIcon('dashboard'),
      contextValue: 'metric'
    });

    items.push({
      type: 'metric',
      label: '🕐 Latency',
      description: `${network.latency}ms`,
      iconPath: new vscode.ThemeIcon('clock'),
      contextValue: 'metric'
    });

    items.push({
      type: 'metric',
      label: '📅 Epoch',
      description: `${network.epoch} (${(network.epochProgress * 100).toFixed(1)}% complete)`,
      iconPath: new vscode.ThemeIcon('calendar'),
      contextValue: 'metric'
    });

    if (network.fees) {
      items.push({
        type: 'metric',
        label: '💰 Transaction Fee',
        description: `${network.fees.lamportsPerSignature} lamports`,
        iconPath: new vscode.ThemeIcon('credit-card'),
        contextValue: 'metric'
      });
    }

    if (network.version) {
      items.push({
        type: 'metric',
        label: '🏷️ Version',
        description: network.version,
        iconPath: new vscode.ThemeIcon('tag'),
        contextValue: 'metric'
      });
    }

    return items;
  }

  private async getNetworkItems(): Promise<INetworkTreeItem[]> {
    const networks = [
      { cluster: 'devnet', name: 'Devnet', icon: '🧪', description: 'Development network' },
      { cluster: 'testnet', name: 'Testnet', icon: '🧪', description: 'Testing network' },
      { cluster: 'mainnet-beta', name: 'Mainnet Beta', icon: '🚀', description: 'Production network' },
      { cluster: 'localhost', name: 'Localhost', icon: '🏠', description: 'Local test validator' }
    ];

    return networks.map(net => ({
      type: 'cluster' as const,
      label: `${net.icon} ${net.name}`,
      description: `${net.description}${this.currentNetwork?.cluster === net.cluster ? ' (current)' : ''}`,
      iconPath: new vscode.ThemeIcon(
        this.currentNetwork?.cluster === net.cluster ? 'pass' : 'circle-outline',
        this.currentNetwork?.cluster === net.cluster ? new vscode.ThemeColor('testing.iconPassed') : undefined
      ),
      command: {
        command: 'wija.network.switchTo',
        title: 'Switch to Network',
        arguments: [net.cluster]
      },
      contextValue: 'cluster'
    }));
  }

  private async getRPCItems(): Promise<INetworkTreeItem[]> {
    return this.availableRPCs.map(rpc => ({
      type: 'rpc' as const,
      rpc,
      label: rpc.name,
      description: `${this.getRPCStatusIcon(rpc.status)} ${rpc.latency}ms • ${rpc.cluster}`,
      iconPath: this.getRPCIcon(rpc),
      command: {
        command: 'wija.network.selectRPC',
        title: 'Select RPC',
        arguments: [rpc]
      },
      contextValue: 'rpc'
    }));
  }

  private async initializeNetworkData(): Promise<void> {
    // Initialize with current config
    const cluster = this.config?.getDefaultCluster() || 'devnet';
    const customEndpoint = this.config?.getCustomRpcEndpoint();
    
    this.currentNetwork = {
      cluster: cluster as any,
      rpcEndpoint: customEndpoint || this.getDefaultRPCForCluster(cluster),
      connected: false,
      latency: 0,
      blockHeight: 0,
      slotHeight: 0,
      tps: 0,
      epoch: 0,
      epochProgress: 0,
      health: 'unknown',
      lastUpdate: new Date()
    };

    // Initialize available RPCs
    this.availableRPCs = [
      // Devnet RPCs
      { name: 'Solana Devnet (Official)', url: 'https://api.devnet.solana.com', cluster: 'devnet', status: 'unknown', latency: 0, lastChecked: new Date(), isCustom: false, features: ['websocket', 'getHealth'] },
      { name: 'Alchemy Devnet', url: 'https://solana-devnet.g.alchemy.com/v2/demo', cluster: 'devnet', status: 'unknown', latency: 0, lastChecked: new Date(), isCustom: false, features: ['websocket', 'enhanced'] },
      { name: 'Quicknode Devnet', url: 'https://devnet.quiknode.pro/', cluster: 'devnet', status: 'unknown', latency: 0, lastChecked: new Date(), isCustom: false, features: ['websocket', 'archive'] },
      
      // Mainnet RPCs
      { name: 'Solana Mainnet (Official)', url: 'https://api.mainnet-beta.solana.com', cluster: 'mainnet-beta', status: 'unknown', latency: 0, lastChecked: new Date(), isCustom: false, features: ['websocket', 'getHealth'] },
      { name: 'Alchemy Mainnet', url: 'https://solana-mainnet.g.alchemy.com/v2/demo', cluster: 'mainnet-beta', status: 'unknown', latency: 0, lastChecked: new Date(), isCustom: false, features: ['websocket', 'enhanced'] },
      
      // Testnet RPCs
      { name: 'Solana Testnet (Official)', url: 'https://api.testnet.solana.com', cluster: 'testnet', status: 'unknown', latency: 0, lastChecked: new Date(), isCustom: false, features: ['websocket', 'getHealth'] },
      
      // Local
      { name: 'Local Test Validator', url: 'http://localhost:8899', cluster: 'localhost', status: 'unknown', latency: 0, lastChecked: new Date(), isCustom: false, features: ['websocket', 'development'] }
    ];

    // Add custom RPC if configured
    if (customEndpoint) {
      this.availableRPCs.push({
        name: 'Custom RPC',
        url: customEndpoint,
        cluster: cluster,
        status: 'unknown',
        latency: 0,
        lastChecked: new Date(),
        isCustom: true,
        features: ['custom']
      });
    }

    await this.updateNetworkStatus();
  }

  private async updateNetworkStatus(): Promise<void> {
    if (!this.currentNetwork) return;

    try {
      const startTime = Date.now();
      
      // Make RPC call to get network status
      const response = await this.makeRPCCall(this.currentNetwork.rpcEndpoint, {
        jsonrpc: '2.0',
        id: 1,
        method: 'getHealth'
      });

      const latency = Date.now() - startTime;
      
      if (response.result === 'ok') {
        this.currentNetwork.connected = true;
        this.currentNetwork.health = 'healthy';
        this.currentNetwork.latency = latency;
        
        // Get additional network info
        await this.updateNetworkMetrics();
      } else {
        this.currentNetwork.connected = false;
        this.currentNetwork.health = 'degraded';
      }

    } catch (error) {
      this.currentNetwork.connected = false;
      this.currentNetwork.health = 'offline';
      this.currentNetwork.latency = 9999;
      console.error('Network status update failed:', error);
    }

    this.currentNetwork.lastUpdate = new Date();
    this._onDidChangeTreeData.fire();
  }

  private async updateNetworkMetrics(): Promise<void> {
    if (!this.currentNetwork?.connected) return;

    try {
      // Get block height and slot
      const [blockResponse, slotResponse, epochResponse] = await Promise.all([
        this.makeRPCCall(this.currentNetwork.rpcEndpoint, {
          jsonrpc: '2.0',
          id: 1,
          method: 'getBlockHeight'
        }),
        this.makeRPCCall(this.currentNetwork.rpcEndpoint, {
          jsonrpc: '2.0',
          id: 2,
          method: 'getSlot'
        }),
        this.makeRPCCall(this.currentNetwork.rpcEndpoint, {
          jsonrpc: '2.0',
          id: 3,
          method: 'getEpochInfo'
        })
      ]);

      if (blockResponse.result !== undefined) {
        this.currentNetwork.blockHeight = blockResponse.result;
      }

      if (slotResponse.result !== undefined) {
        this.currentNetwork.slotHeight = slotResponse.result;
      }

      if (epochResponse.result) {
        this.currentNetwork.epoch = epochResponse.result.epoch;
        this.currentNetwork.epochProgress = epochResponse.result.slotIndex / epochResponse.result.slotsInEpoch;
      }

      // Simulate TPS (in real implementation, this would be calculated from recent blocks)
      this.currentNetwork.tps = Math.floor(Math.random() * 3000) + 1000;

      // Get fee information
      try {
        const feeResponse = await this.makeRPCCall(this.currentNetwork.rpcEndpoint, {
          jsonrpc: '2.0',
          id: 4,
          method: 'getRecentBlockhash'
        });

        if (feeResponse.result?.feeCalculator) {
          this.currentNetwork.fees = {
            lamportsPerSignature: feeResponse.result.feeCalculator.lamportsPerSignature,
            estimatedFee: feeResponse.result.feeCalculator.lamportsPerSignature
          };
        }
      } catch (error) {
        // Fee information is optional
      }

    } catch (error) {
      console.error('Failed to update network metrics:', error);
    }
  }

  private async makeRPCCall(endpoint: string, payload: any): Promise<any> {
    return new Promise((resolve, reject) => {
      const url = new URL(endpoint);
      const isHttps = url.protocol === 'https:';
      const httpModule = isHttps ? https : http;
      
      const options = {
        hostname: url.hostname,
        port: url.port || (isHttps ? 443 : 80),
        path: url.pathname,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(JSON.stringify(payload))
        },
        timeout: 10000
      };

      const req = httpModule.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => {
          try {
            resolve(JSON.parse(data));
          } catch (error) {
            reject(new Error('Invalid JSON response'));
          }
        });
      });

      req.on('error', reject);
      req.on('timeout', () => reject(new Error('Request timeout')));
      req.write(JSON.stringify(payload));
      req.end();
    });
  }

  private getDefaultRPCForCluster(cluster: string): string {
    const defaults: Record<string, string> = {
      'devnet': 'https://api.devnet.solana.com',
      'testnet': 'https://api.testnet.solana.com',
      'mainnet-beta': 'https://api.mainnet-beta.solana.com',
      'localhost': 'http://localhost:8899'
    };
    return defaults[cluster] || defaults.devnet;
  }

  private getHealthIcon(health: string): string {
    const icons: Record<string, string> = {
      'healthy': '🟢',
      'degraded': '🟡',
      'offline': '🔴',
      'unknown': '⚪'
    };
    return icons[health] || '⚪';
  }

  private getNetworkIcon(network: INetworkStatus): vscode.ThemeIcon {
    if (!network.connected) {
      return new vscode.ThemeIcon('debug-disconnect', new vscode.ThemeColor('editorError.foreground'));
    }
    
    if (network.health === 'healthy') {
      return new vscode.ThemeIcon('pass', new vscode.ThemeColor('testing.iconPassed'));
    } else if (network.health === 'degraded') {
      return new vscode.ThemeIcon('warning', new vscode.ThemeColor('editorWarning.foreground'));
    } else {
      return new vscode.ThemeIcon('error', new vscode.ThemeColor('editorError.foreground'));
    }
  }

  private getRPCStatusIcon(status: string): string {
    const icons: Record<string, string> = {
      'online': '🟢',
      'offline': '🔴',
      'slow': '🟡',
      'unknown': '⚪'
    };
    return icons[status] || '⚪';
  }

  private getRPCIcon(rpc: IRPCEndpoint): vscode.ThemeIcon {
    if (rpc.isCustom) {
      return new vscode.ThemeIcon('settings', new vscode.ThemeColor('editorInfo.foreground'));
    }
    
    const statusColors = {
      'online': new vscode.ThemeColor('testing.iconPassed'),
      'offline': new vscode.ThemeColor('editorError.foreground'),
      'slow': new vscode.ThemeColor('editorWarning.foreground'),
      'unknown': undefined
    };

    return new vscode.ThemeIcon('link', statusColors[rpc.status]);
  }

  private startMonitoring(): void {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }

    this.refreshInterval = setInterval(() => {
      if (this.isMonitoring) {
        this.updateNetworkStatus();
      }
    }, 15000); // Update every 15 seconds
  }

  private stopMonitoring(): void {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
    }
  }

  // Public methods for command integration
  toggleMonitoring(): void {
    this.isMonitoring = !this.isMonitoring;
    if (this.isMonitoring) {
      this.startMonitoring();
    }
    this._onDidChangeTreeData.fire();
  }

  async refresh(): Promise<void> {
    await this.updateNetworkStatus();
  }

  async switchNetwork(cluster?: string): Promise<void> {
    if (!cluster) {
      const networks = [
        { label: 'Devnet', value: 'devnet' },
        { label: 'Testnet', value: 'testnet' },
        { label: 'Mainnet Beta', value: 'mainnet-beta' },
        { label: 'Localhost', value: 'localhost' }
      ];

      const selected = await vscode.window.showQuickPick(networks, {
        title: 'Switch Network',
        placeHolder: 'Select network to switch to'
      });

      if (!selected) return;
      cluster = selected.value;
    }

    if (this.currentNetwork) {
      this.currentNetwork.cluster = cluster as any;
      this.currentNetwork.rpcEndpoint = this.getDefaultRPCForCluster(cluster);
      await this.updateNetworkStatus();
      
      vscode.window.showInformationMessage(`🌐 Switched to ${cluster.toUpperCase()}`);
    }
  }

  async selectRPC(rpc: IRPCEndpoint): Promise<void> {
    if (this.currentNetwork) {
      this.currentNetwork.rpcEndpoint = rpc.url;
      this.currentNetwork.cluster = rpc.cluster as any;
      await this.updateNetworkStatus();
      
      vscode.window.showInformationMessage(`🔗 Connected to ${rpc.name}`);
    }
  }

  dispose(): void {
    this.stopMonitoring();
  }
} 