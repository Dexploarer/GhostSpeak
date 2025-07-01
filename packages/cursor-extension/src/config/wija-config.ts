import * as vscode from 'vscode';

export interface IWijaConfiguration {
  network: {
    defaultCluster: 'devnet' | 'testnet' | 'mainnet-beta' | 'localhost';
    customEndpoint?: string;
  };
  development: {
    autoSave: boolean;
  };
  debugging: {
    enableTransactionTracing: boolean;
  };
  ui: {
    showAdvancedFeatures: boolean;
  };
  agent: {
    autoDeployOnSave: boolean;
  };
  marketplace: {
    enableBrowsing: boolean;
  };
  wallet: {
    preferredProvider: 'phantom' | 'solflare' | 'backpack' | 'filesystem';
  };
  cli: {
    customPath?: string;
  };
  anchor: {
    customPath?: string;
  };
}

export class WijaConfig {
  private readonly configSection = 'wija';

  get<T extends keyof IWijaConfiguration>(
    section: T
  ): IWijaConfiguration[T] {
    const config = vscode.workspace.getConfiguration(this.configSection);
    return config.get(section) as IWijaConfiguration[T];
  }

  async set<T extends keyof IWijaConfiguration>(
    section: T,
    value: IWijaConfiguration[T],
    scope?: vscode.ConfigurationTarget
  ): Promise<void> {
    const config = vscode.workspace.getConfiguration(this.configSection);
    await config.update(section, value, scope);
  }

  getDefaultCluster(): string {
    return this.get('network').defaultCluster;
  }

  getCustomRpcEndpoint(): string | undefined {
    return this.get('network').customEndpoint;
  }

  getRpcEndpoint(): string {
    const customEndpoint = this.getCustomRpcEndpoint();
    if (customEndpoint) {
      return customEndpoint;
    }

    const cluster = this.getDefaultCluster();
    switch (cluster) {
      case 'devnet':
        return 'https://api.devnet.solana.com';
      case 'testnet':
        return 'https://api.testnet.solana.com';
      case 'mainnet-beta':
        return 'https://api.mainnet-beta.solana.com';
      case 'localhost':
        return 'http://localhost:8899';
      default:
        return 'https://api.devnet.solana.com';
    }
  }

  isAutoSaveEnabled(): boolean {
    return this.get('development').autoSave;
  }

  isTransactionTracingEnabled(): boolean {
    return this.get('debugging').enableTransactionTracing;
  }

  showAdvancedFeatures(): boolean {
    return this.get('ui').showAdvancedFeatures;
  }

  isAutoDeployEnabled(): boolean {
    return this.get('agent').autoDeployOnSave;
  }

  isMarketplaceBrowsingEnabled(): boolean {
    return this.get('marketplace').enableBrowsing;
  }

  getPreferredWalletProvider(): string {
    return this.get('wallet').preferredProvider;
  }

  getCustomCliPath(): string | undefined {
    return this.get('cli').customPath;
  }

  getCustomAnchorPath(): string | undefined {
    return this.get('anchor').customPath;
  }

  onConfigurationChanged(
    listener: (e: vscode.ConfigurationChangeEvent) => void
  ): vscode.Disposable {
    return vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration(this.configSection)) {
        listener(e);
      }
    });
  }
} 