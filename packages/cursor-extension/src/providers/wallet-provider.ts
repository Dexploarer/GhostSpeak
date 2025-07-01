import * as vscode from 'vscode';
import * as path from 'path';

export interface IWalletAccount {
  address: string;
  publicKey: string;
  name: string;
  balance: number;
  currency: 'SOL' | 'USDC';
  isConnected: boolean;
  provider: 'phantom' | 'solflare' | 'backpack' | 'filesystem' | 'ledger';
  type: 'hardware' | 'browser' | 'filesystem' | 'mobile';
  lastActive: Date;
  nfts?: INFTCollection[];
  tokens?: ITokenBalance[];
}

export interface ITokenBalance {
  mint: string;
  symbol: string;
  name: string;
  balance: number;
  decimals: number;
  uiAmount: number;
  logoUri?: string;
  priceUsd?: number;
  valueUsd?: number;
}

export interface INFTCollection {
  address: string;
  name: string;
  symbol: string;
  image?: string;
  collectionSize: number;
  ownedCount: number;
  floorPrice?: number;
  nfts: INFT[];
}

export interface INFT {
  address: string;
  name: string;
  image?: string;
  attributes?: Array<{ trait_type: string; value: string }>;
  collectionAddress?: string;
}

export interface IWalletTransaction {
  signature: string;
  blockTime: Date;
  slot: number;
  type: 'send' | 'receive' | 'swap' | 'nft' | 'program' | 'vote' | 'unknown';
  amount?: number;
  currency?: string;
  fee: number;
  status: 'confirmed' | 'finalized' | 'failed';
  from?: string;
  to?: string;
  description: string;
  programIds: string[];
  accounts: string[];
}

export interface IWalletTreeItem {
  type: 'wallet' | 'balance' | 'token' | 'nft' | 'transaction' | 'collection' | 'action' | 'header';
  wallet?: IWalletAccount;
  token?: ITokenBalance;
  nft?: INFT;
  transaction?: IWalletTransaction;
  collection?: INFTCollection;
  label: string;
  description?: string;
  iconPath?: vscode.ThemeIcon | string;
  command?: vscode.Command;
  contextValue?: string;
}

export class WijaWalletProvider implements vscode.TreeDataProvider<IWalletTreeItem> {
  private _onDidChangeTreeData = new vscode.EventEmitter<IWalletTreeItem | undefined | null | void>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  private connectedWallets: IWalletAccount[] = [];
  private recentTransactions: IWalletTransaction[] = [];
  private viewMode: 'overview' | 'tokens' | 'nfts' | 'transactions' = 'overview';
  private selectedWallet: IWalletAccount | null = null;

  constructor(
    private readonly context: vscode.ExtensionContext,
    private readonly config: any
  ) {
    this.initializeWalletData();
  }

  getTreeItem(element: IWalletTreeItem): vscode.TreeItem {
    const item = new vscode.TreeItem(
      element.label,
      element.type === 'header' ? vscode.TreeItemCollapsibleState.Expanded : 
      (element.type === 'wallet' || element.type === 'collection') ? vscode.TreeItemCollapsibleState.Collapsed : 
      vscode.TreeItemCollapsibleState.None
    );

    item.description = element.description;
    item.iconPath = element.iconPath;
    item.command = element.command;
    item.contextValue = element.contextValue || element.type;

    // Add rich tooltips
    if (element.wallet) {
      const wallet = element.wallet;
      const tooltip = new vscode.MarkdownString();
      tooltip.appendMarkdown(`**${wallet.name}**\n\n`);
      tooltip.appendMarkdown(`**Address:** \`${wallet.address}\`\n\n`);
      tooltip.appendMarkdown(`**Provider:** ${wallet.provider}\n\n`);
      tooltip.appendMarkdown(`**Balance:** ${wallet.balance} ${wallet.currency}\n\n`);
      tooltip.appendMarkdown(`**Status:** ${wallet.isConnected ? '🟢 Connected' : '🔴 Disconnected'}\n\n`);
      tooltip.appendMarkdown(`**Type:** ${wallet.type}\n\n`);
      tooltip.appendMarkdown(`**Last Active:** ${wallet.lastActive.toLocaleString()}\n\n`);
      if (wallet.tokens && wallet.tokens.length > 0) {
        tooltip.appendMarkdown(`**Tokens:** ${wallet.tokens.length} different tokens\n\n`);
      }
      if (wallet.nfts && wallet.nfts.length > 0) {
        const totalNFTs = wallet.nfts.reduce((sum, collection) => sum + collection.ownedCount, 0);
        tooltip.appendMarkdown(`**NFTs:** ${totalNFTs} NFTs in ${wallet.nfts.length} collections\n\n`);
      }
      item.tooltip = tooltip;
    }

    return item;
  }

  getChildren(element?: IWalletTreeItem): Thenable<IWalletTreeItem[]> {
    if (!element) {
      return this.getRootItems();
    }

    if (element.type === 'header') {
      return this.getHeaderChildren(element.label);
    }

    if (element.type === 'wallet') {
      return this.getWalletChildren(element.wallet!);
    }

    if (element.type === 'collection') {
      return this.getCollectionChildren(element.collection!);
    }

    return Promise.resolve([]);
  }

  private async getRootItems(): Promise<IWalletTreeItem[]> {
    const items: IWalletTreeItem[] = [];

    // View mode toggle
    items.push({
      type: 'action',
      label: `🔄 View: ${this.viewMode.charAt(0).toUpperCase() + this.viewMode.slice(1)}`,
      description: 'Switch between overview, tokens, NFTs, transactions',
      iconPath: new vscode.ThemeIcon('arrow-swap'),
      command: {
        command: 'wija.wallet.toggleView',
        title: 'Toggle View'
      },
      contextValue: 'view-toggle'
    });

    // Quick actions
    items.push({
      type: 'action',
      label: '🔗 Connect Wallet',
      description: 'Connect a new wallet',
      iconPath: new vscode.ThemeIcon('plug'),
      command: {
        command: 'wija.wallet.connect',
        title: 'Connect Wallet'
      },
      contextValue: 'action'
    });

    items.push({
      type: 'action',
      label: '💸 Send Transaction',
      description: 'Send SOL or tokens',
      iconPath: new vscode.ThemeIcon('arrow-up'),
      command: {
        command: 'wija.wallet.send',
        title: 'Send Transaction'
      },
      contextValue: 'action'
    });

    if (this.connectedWallets.length === 0) {
      items.push({
        type: 'action',
        label: '👛 No wallets connected',
        description: 'Connect your first wallet to get started',
        iconPath: new vscode.ThemeIcon('info'),
        command: {
          command: 'wija.wallet.connect',
          title: 'Connect Wallet'
        },
        contextValue: 'empty-state'
      });
      return items;
    }

    // Connected wallets
    if (this.viewMode === 'overview') {
      items.push({
        type: 'header',
        label: '👛 Connected Wallets',
        description: `${this.connectedWallets.length} wallet${this.connectedWallets.length === 1 ? '' : 's'}`,
        iconPath: new vscode.ThemeIcon('account'),
        contextValue: 'wallets-header'
      });

      for (const wallet of this.connectedWallets) {
        items.push({
          type: 'wallet',
          wallet,
          label: wallet.name,
          description: `${wallet.balance} ${wallet.currency} • ${wallet.provider}`,
          iconPath: this.getWalletIcon(wallet),
          command: {
            command: 'wija.wallet.select',
            title: 'Select Wallet',
            arguments: [wallet]
          },
          contextValue: 'wallet'
        });
      }

      // Recent transactions
      if (this.recentTransactions.length > 0) {
        items.push({
          type: 'header',
          label: '📋 Recent Transactions',
          description: `Last ${Math.min(5, this.recentTransactions.length)} transactions`,
          iconPath: new vscode.ThemeIcon('history'),
          contextValue: 'transactions-header'
        });

        for (const tx of this.recentTransactions.slice(0, 5)) {
          items.push({
            type: 'transaction',
            transaction: tx,
            label: tx.description,
            description: `${tx.amount || 0} ${tx.currency || 'SOL'} • ${tx.status}`,
            iconPath: this.getTransactionIcon(tx),
            command: {
              command: 'wija.wallet.viewTransaction',
              title: 'View Transaction',
              arguments: [tx]
            },
            contextValue: 'transaction'
          });
        }
      }

    } else if (this.viewMode === 'tokens') {
      return [...items, ...(await this.getTokenItems())];
    } else if (this.viewMode === 'nfts') {
      return [...items, ...(await this.getNFTItems())];
    } else if (this.viewMode === 'transactions') {
      return [...items, ...(await this.getTransactionItems())];
    }

    return items;
  }

  private async getHeaderChildren(headerLabel: string): Promise<IWalletTreeItem[]> {
    // Headers are already expanded in getRootItems
    return [];
  }

  private async getWalletChildren(wallet: IWalletAccount): Promise<IWalletTreeItem[]> {
    const items: IWalletTreeItem[] = [];

    // Wallet balance
    items.push({
      type: 'balance',
      label: `💰 ${wallet.balance} ${wallet.currency}`,
      description: 'Primary balance',
      iconPath: new vscode.ThemeIcon('symbol-numeric'),
      contextValue: 'balance'
    });

    // Tokens
    if (wallet.tokens && wallet.tokens.length > 0) {
      items.push({
        type: 'header',
        label: `🪙 Tokens (${wallet.tokens.length})`,
        description: 'Token balances',
        iconPath: new vscode.ThemeIcon('symbol-currency'),
        contextValue: 'tokens-header'
      });

      for (const token of wallet.tokens.slice(0, 5)) {
        items.push({
          type: 'token',
          token,
          label: `${token.symbol} - ${token.uiAmount}`,
          description: token.valueUsd ? `$${token.valueUsd.toFixed(2)}` : token.name,
          iconPath: new vscode.ThemeIcon('circle'),
          contextValue: 'token'
        });
      }
    }

    // NFTs
    if (wallet.nfts && wallet.nfts.length > 0) {
      items.push({
        type: 'header',
        label: `🖼️ NFT Collections (${wallet.nfts.length})`,
        description: 'NFT collections',
        iconPath: new vscode.ThemeIcon('symbol-color'),
        contextValue: 'nfts-header'
      });

      for (const collection of wallet.nfts.slice(0, 3)) {
        items.push({
          type: 'collection',
          collection,
          label: `${collection.name} (${collection.ownedCount})`,
          description: collection.floorPrice ? `Floor: ${collection.floorPrice} SOL` : `${collection.ownedCount} NFTs`,
          iconPath: new vscode.ThemeIcon('symbol-color'),
          contextValue: 'collection'
        });
      }
    }

    // Wallet actions
    items.push({
      type: 'action',
      label: '📤 Send from Wallet',
      description: 'Send SOL or tokens',
      iconPath: new vscode.ThemeIcon('arrow-up'),
      command: {
        command: 'wija.wallet.sendFrom',
        title: 'Send from Wallet',
        arguments: [wallet]
      },
      contextValue: 'wallet-action'
    });

    items.push({
      type: 'action',
      label: '📊 View Analytics',
      description: 'Wallet performance and history',
      iconPath: new vscode.ThemeIcon('graph'),
      command: {
        command: 'wija.wallet.analytics',
        title: 'View Analytics',
        arguments: [wallet]
      },
      contextValue: 'wallet-action'
    });

    return items;
  }

  private async getCollectionChildren(collection: INFTCollection): Promise<IWalletTreeItem[]> {
    return collection.nfts.map(nft => ({
      type: 'nft' as const,
      nft,
      label: nft.name,
      description: nft.attributes ? `${nft.attributes.length} traits` : 'NFT',
      iconPath: nft.image || new vscode.ThemeIcon('symbol-color'),
      command: {
        command: 'wija.wallet.viewNFT',
        title: 'View NFT',
        arguments: [nft]
      },
      contextValue: 'nft'
    }));
  }

  private async getTokenItems(): Promise<IWalletTreeItem[]> {
    const items: IWalletTreeItem[] = [];
    
    for (const wallet of this.connectedWallets) {
      if (wallet.tokens && wallet.tokens.length > 0) {
        for (const token of wallet.tokens) {
          items.push({
            type: 'token',
            token,
            label: `${token.symbol} - ${token.uiAmount}`,
            description: `${wallet.name} • ${token.valueUsd ? `$${token.valueUsd.toFixed(2)}` : token.name}`,
            iconPath: new vscode.ThemeIcon('circle'),
            contextValue: 'token'
          });
        }
      }
    }

    return items;
  }

  private async getNFTItems(): Promise<IWalletTreeItem[]> {
    const items: IWalletTreeItem[] = [];
    
    for (const wallet of this.connectedWallets) {
      if (wallet.nfts && wallet.nfts.length > 0) {
        for (const collection of wallet.nfts) {
          items.push({
            type: 'collection',
            collection,
            label: `${collection.name} (${collection.ownedCount})`,
            description: `${wallet.name} • ${collection.floorPrice ? `Floor: ${collection.floorPrice} SOL` : 'Collection'}`,
            iconPath: new vscode.ThemeIcon('symbol-color'),
            contextValue: 'collection'
          });
        }
      }
    }

    return items;
  }

  private async getTransactionItems(): Promise<IWalletTreeItem[]> {
    return this.recentTransactions.map(tx => ({
      type: 'transaction' as const,
      transaction: tx,
      label: tx.description,
      description: `${tx.amount || 0} ${tx.currency || 'SOL'} • ${tx.status} • ${tx.blockTime.toLocaleDateString()}`,
      iconPath: this.getTransactionIcon(tx),
      command: {
        command: 'wija.wallet.viewTransaction',
        title: 'View Transaction',
        arguments: [tx]
      },
      contextValue: 'transaction'
    }));
  }

  private async initializeWalletData(): Promise<void> {
    // Load mock wallet data - in real implementation, this would connect to actual wallets
    this.connectedWallets = [
      {
        address: 'A7X8EZrqwKQzJnGYSzKDaJ9mN5vQ2bLx8Hy6Vt4KjRzW',
        publicKey: 'A7X8EZrqwKQzJnGYSzKDaJ9mN5vQ2bLx8Hy6Vt4KjRzW',
        name: 'Main Wallet',
        balance: 12.56,
        currency: 'SOL',
        isConnected: true,
        provider: 'phantom',
        type: 'browser',
        lastActive: new Date(),
        tokens: [
          {
            mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
            symbol: 'USDC',
            name: 'USD Coin',
            balance: 1000000000,
            decimals: 6,
            uiAmount: 1000,
            priceUsd: 1.00,
            valueUsd: 1000
          },
          {
            mint: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB',
            symbol: 'USDT',
            name: 'Tether USD',
            balance: 500000000,
            decimals: 6,
            uiAmount: 500,
            priceUsd: 1.00,
            valueUsd: 500
          }
        ],
        nfts: [
          {
            address: 'NFTCollection1',
            name: 'Solana Monkeys',
            symbol: 'SMB',
            collectionSize: 5000,
            ownedCount: 3,
            floorPrice: 2.5,
            nfts: [
              {
                address: 'NFT1',
                name: 'Solana Monkey #1234',
                attributes: [
                  { trait_type: 'Background', value: 'Blue' },
                  { trait_type: 'Hat', value: 'Cap' }
                ]
              }
            ]
          }
        ]
      }
    ];

    this.recentTransactions = [
      {
        signature: '3Kx8mY7Nz9QpVr2Bs1Dt6Gn4Jm5Xw8Cv7Lq9Rs2Fp1Xt5Nm6Hz8Qy4Vb3Fg9Kj2Mp7Rs4Zt6',
        blockTime: new Date(Date.now() - 3600000),
        slot: 150000000,
        type: 'send',
        amount: 2.5,
        currency: 'SOL',
        fee: 0.000005,
        status: 'finalized',
        from: this.connectedWallets[0].address,
        to: '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM',
        description: 'Sent SOL to Alice',
        programIds: ['11111111111111111111111111111111'],
        accounts: []
      },
      {
        signature: '8Fx2nK5Yz1QmPt4Xs7Cr9Gv3Jk6Nw2Bv5Lp8Rs4Mp9Ht2Qz7Kx5Yb4Fg6Nj3Cv8Rs1Xt9',
        blockTime: new Date(Date.now() - 7200000),
        slot: 149999000,
        type: 'receive',
        amount: 5.0,
        currency: 'SOL',
        fee: 0,
        status: 'finalized',
        from: '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM',
        to: this.connectedWallets[0].address,
        description: 'Received SOL from Bob',
        programIds: ['11111111111111111111111111111111'],
        accounts: []
      }
    ];

    this.selectedWallet = this.connectedWallets[0];
  }

  private getWalletIcon(wallet: IWalletAccount): vscode.ThemeIcon {
    if (!wallet.isConnected) {
      return new vscode.ThemeIcon('debug-disconnect', new vscode.ThemeColor('editorError.foreground'));
    }

    const providerIcons = {
      'phantom': new vscode.ThemeIcon('symbol-color', new vscode.ThemeColor('editorInfo.foreground')),
      'solflare': new vscode.ThemeIcon('flame', new vscode.ThemeColor('editorWarning.foreground')),
      'backpack': new vscode.ThemeIcon('package', new vscode.ThemeColor('testing.iconPassed')),
      'filesystem': new vscode.ThemeIcon('file', new vscode.ThemeColor('editorInfo.foreground')),
      'ledger': new vscode.ThemeIcon('shield', new vscode.ThemeColor('testing.iconPassed'))
    };

    return providerIcons[wallet.provider] || new vscode.ThemeIcon('account');
  }

  private getTransactionIcon(tx: IWalletTransaction): vscode.ThemeIcon {
    const typeIcons = {
      'send': 'arrow-up',
      'receive': 'arrow-down',
      'swap': 'arrow-swap',
      'nft': 'symbol-color',
      'program': 'gear',
      'vote': 'thumbsup',
      'unknown': 'circle'
    };

    const statusColors = {
      'confirmed': new vscode.ThemeColor('testing.iconPassed'),
      'finalized': new vscode.ThemeColor('testing.iconPassed'),
      'failed': new vscode.ThemeColor('editorError.foreground')
    };

    return new vscode.ThemeIcon(
      typeIcons[tx.type] || 'circle',
      statusColors[tx.status]
    );
  }

  // Public methods for command integration
  toggleView(): void {
    const views: Array<typeof this.viewMode> = ['overview', 'tokens', 'nfts', 'transactions'];
    const currentIndex = views.indexOf(this.viewMode);
    this.viewMode = views[(currentIndex + 1) % views.length];
    this._onDidChangeTreeData.fire();
  }

  async connectWallet(): Promise<void> {
    const providers = [
      { label: 'Phantom', value: 'phantom' },
      { label: 'Solflare', value: 'solflare' },
      { label: 'Backpack', value: 'backpack' },
      { label: 'Filesystem Wallet', value: 'filesystem' },
      { label: 'Ledger Hardware', value: 'ledger' }
    ];

    const selected = await vscode.window.showQuickPick(providers, {
      title: 'Connect Wallet',
      placeHolder: 'Choose wallet provider'
    });

    if (selected) {
      vscode.window.showInformationMessage(`🔗 Connecting to ${selected.label}...`);
      // TODO: Implement actual wallet connection
    }
  }

  async sendTransaction(): Promise<void> {
    if (this.connectedWallets.length === 0) {
      vscode.window.showWarningMessage('Please connect a wallet first');
      return;
    }

    const recipient = await vscode.window.showInputBox({
      prompt: 'Recipient address',
      placeHolder: 'Enter Solana address'
    });

    if (!recipient) return;

    const amount = await vscode.window.showInputBox({
      prompt: 'Amount to send',
      placeHolder: 'Enter amount in SOL'
    });

    if (!amount) return;

    vscode.window.showInformationMessage(`💸 Sending ${amount} SOL to ${recipient.slice(0, 8)}...`);
    // TODO: Implement actual transaction sending
  }

  async selectWallet(wallet: IWalletAccount): Promise<void> {
    this.selectedWallet = wallet;
    vscode.window.showInformationMessage(`👛 Selected wallet: ${wallet.name}`);
    this._onDidChangeTreeData.fire();
  }

  refresh(): void {
    this.initializeWalletData();
    this._onDidChangeTreeData.fire();
  }
} 