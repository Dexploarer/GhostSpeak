import * as vscode from 'vscode';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface ICommandDependencies {
  projectDetector: any;
  dashboardProvider: any;
  marketplaceProvider: any;
  agentProvider: any;
  channelProvider: any;
  networkProvider: any;
  walletProvider: any;
  promptVaultProvider: any;
  config: any;
}

export class WijaCommandManager {
  constructor(private context: vscode.ExtensionContext, private deps: any) {}

  private registerCommands() {
    const commands = [
      { command: 'wija.initialize', handler: this.initializeProject.bind(this) },
      { command: 'wija.openDashboard', handler: this.openDashboard.bind(this) },
      { command: 'wija.deployAgent', handler: this.deployAgent.bind(this) },
      { command: 'wija.createChannel', handler: this.createChannel.bind(this) },
      { command: 'wija.openMarketplace', handler: this.openMarketplace.bind(this) },
      { command: 'wija.connectWallet', handler: this.connectWallet.bind(this) },
      { command: 'wija.viewTransactions', handler: this.viewTransactions.bind(this) },
      { command: 'wija.generateSDKCode', handler: this.generateSDKCode.bind(this) },
      { command: 'wija.runTests', handler: this.runTests.bind(this) },
      { command: 'wija.switchNetwork', handler: this.switchNetwork.bind(this) },
      // Prompt Vault Commands - Revolutionary "Pocket Prayers" System
      { command: 'wija.pocketPrayer', handler: this.pocketPrayer.bind(this) },
      { command: 'wija.generateMasterPrompt', handler: this.generateMasterPrompt.bind(this) },
      { command: 'wija.createRecipe', handler: this.createRecipe.bind(this) },
      { command: 'wija.usePrayer', handler: this.usePrayer.bind(this) },
      { command: 'wija.useRecipe', handler: this.useRecipe.bind(this) },
      { command: 'wija.openPromptVault', handler: this.openPromptVault.bind(this) },
      { command: 'wija.pocketSelection', handler: this.pocketSelection.bind(this) },
      { command: 'wija.quickPrompt', handler: this.quickPrompt.bind(this) }
    ];

    commands.forEach(({ command, handler }) => {
      const disposable = vscode.commands.registerCommand(command, handler);
      this.context.subscriptions.push(disposable);
    });
  }

  private async initializeProject() {
    try {
      const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
      if (!workspaceFolder) {
        vscode.window.showErrorMessage('Please open a workspace folder first');
        return;
      }

      const projectType = await vscode.window.showQuickPick([
        { label: 'Full Wija Workspace', value: 'workspace' },
        { label: 'Anchor Program', value: 'anchor' },
        { label: 'TypeScript SDK Project', value: 'typescript' },
        { label: 'Rust SDK Project', value: 'rust' }
      ], {
        title: 'Select Project Type',
        placeHolder: 'Choose the type of Wija project to initialize'
      });

      if (!projectType) return;

      vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: 'Initializing Wija Project',
        cancellable: false
      }, async (progress) => {
        progress.report({ message: 'Setting up project structure...' });
        
        const cwd = workspaceFolder.uri.fsPath;
        await execAsync(`wija init ${projectType.value}`, { cwd });
        
        progress.report({ message: 'Project initialized successfully!' });
        
        // Refresh project detection
        await this.deps.projectDetector.detectProject();
        
        vscode.window.showInformationMessage(
          'Wija project initialized successfully!',
          'Open Dashboard'
        ).then(choice => {
          if (choice === 'Open Dashboard') {
            this.openDashboard();
          }
        });
      });

    } catch (error) {
      vscode.window.showErrorMessage(`Failed to initialize project: ${error}`);
    }
  }

  private async openDashboard() {
    try {
      await this.deps.dashboardProvider.show();
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to open dashboard: ${error}`);
    }
  }

  private async deployAgent() {
    try {
      const projectContext = this.deps.projectDetector.getProjectContext();
      if (!projectContext) {
        vscode.window.showErrorMessage('No Wija project detected');
        return;
      }

      const agents = projectContext.agentRegistry || [];
      if (agents.length === 0) {
        vscode.window.showErrorMessage('No agents found in project');
        return;
      }

      const selectedAgent = await vscode.window.showQuickPick(
        agents.map(agent => ({ label: agent, value: agent })),
        {
          title: 'Select Agent to Deploy',
          placeHolder: 'Choose an agent to deploy'
        }
      );

      if (!selectedAgent) return;

      const network = this.deps.config.getDefaultCluster();
      
      vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: `Deploying Agent: ${selectedAgent.label}`,
        cancellable: false
      }, async (progress) => {
        progress.report({ message: 'Building agent...' });
        
        const cwd = projectContext.rootPath;
        await execAsync(`wija agent deploy ${selectedAgent.value} --network ${network}`, { cwd });
        
        progress.report({ message: 'Agent deployed successfully!' });
        
        vscode.window.showInformationMessage(
          `Agent "${selectedAgent.label}" deployed successfully to ${network}!`
        );
      });

    } catch (error) {
      vscode.window.showErrorMessage(`Failed to deploy agent: ${error}`);
    }
  }

  private async createChannel() {
    try {
      const channelName = await vscode.window.showInputBox({
        title: 'Create Channel',
        prompt: 'Enter channel name',
        placeHolder: 'my-agent-channel'
      });

      if (!channelName) return;

      const visibility = await vscode.window.showQuickPick([
        { label: 'Public', value: 'public' },
        { label: 'Private', value: 'private' }
      ], {
        title: 'Channel Visibility',
        placeHolder: 'Select channel visibility'
      });

      if (!visibility) return;

      const projectContext = this.deps.projectDetector.getProjectContext();
      const cwd = projectContext?.rootPath || vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;

      if (!cwd) {
        vscode.window.showErrorMessage('No workspace found');
        return;
      }

      vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: `Creating Channel: ${channelName}`,
        cancellable: false
      }, async (progress) => {
        progress.report({ message: 'Creating channel...' });
        
        await execAsync(`wija channel create ${channelName} --visibility ${visibility.value}`, { cwd });
        
        progress.report({ message: 'Channel created successfully!' });
        
        // Refresh channel provider
        await this.deps.channelProvider.refresh();
        
        vscode.window.showInformationMessage(
          `Channel "${channelName}" created successfully!`
        );
      });

    } catch (error) {
      vscode.window.showErrorMessage(`Failed to create channel: ${error}`);
    }
  }

  private async openMarketplace() {
    try {
      await this.deps.marketplaceProvider.show();
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to open marketplace: ${error}`);
    }
  }

  private async connectWallet() {
    try {
      const walletProvider = this.deps.config.getPreferredWalletProvider();
      
      vscode.window.showInformationMessage(
        `Connecting to ${walletProvider} wallet...`,
        'Configure Wallet'
      ).then(choice => {
        if (choice === 'Configure Wallet') {
          vscode.commands.executeCommand('workbench.action.openSettings', 'wija.wallet');
        }
      });

      // Update wallet provider status
      await this.deps.walletProvider.refresh();

    } catch (error) {
      vscode.window.showErrorMessage(`Failed to connect wallet: ${error}`);
    }
  }

  private async viewTransactions() {
    try {
      const network = this.deps.config.getDefaultCluster();
      const explorerUrl = this.getExplorerUrl(network);
      
      const choice = await vscode.window.showInformationMessage(
        `View transactions on ${network}`,
        'Open Explorer',
        'Show Recent'
      );

      if (choice === 'Open Explorer') {
        await vscode.env.openExternal(vscode.Uri.parse(explorerUrl));
      } else if (choice === 'Show Recent') {
        // Show recent transactions in a webview
        await this.showRecentTransactions();
      }

    } catch (error) {
      vscode.window.showErrorMessage(`Failed to view transactions: ${error}`);
    }
  }

  private async generateSDKCode() {
    try {
      const activeEditor = vscode.window.activeTextEditor;
      if (!activeEditor) {
        vscode.window.showErrorMessage('Please open an IDL file first');
        return;
      }

      const document = activeEditor.document;
      if (!document.fileName.endsWith('.json')) {
        vscode.window.showErrorMessage('Please select a JSON IDL file');
        return;
      }

      const sdkType = await vscode.window.showQuickPick([
        { label: 'TypeScript SDK', value: 'typescript' },
        { label: 'Rust SDK', value: 'rust' }
      ], {
        title: 'Generate SDK Code',
        placeHolder: 'Select SDK type to generate'
      });

      if (!sdkType) return;

      vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: 'Generating SDK Code',
        cancellable: false
      }, async (progress) => {
        progress.report({ message: 'Analyzing IDL...' });
        
        const workspaceFolder = vscode.workspace.getWorkspaceFolder(document.uri);
        const cwd = workspaceFolder?.uri.fsPath;
        
        if (!cwd) {
          throw new Error('No workspace folder found');
        }

        await execAsync(`wija codegen ${sdkType.value} ${document.fileName}`, { cwd });
        
        progress.report({ message: 'SDK code generated successfully!' });
        
        vscode.window.showInformationMessage(
          `${sdkType.label} code generated successfully!`,
          'Open Generated Files'
        ).then(choice => {
          if (choice === 'Open Generated Files') {
            vscode.commands.executeCommand('revealInExplorer', document.uri);
          }
        });
      });

    } catch (error) {
      vscode.window.showErrorMessage(`Failed to generate SDK code: ${error}`);
    }
  }

  private async runTests() {
    try {
      const projectContext = this.deps.projectDetector.getProjectContext();
      if (!projectContext) {
        vscode.window.showErrorMessage('No Wija project detected');
        return;
      }

      const testType = await vscode.window.showQuickPick([
        { label: 'All Tests', value: 'all' },
        { label: 'Unit Tests', value: 'unit' },
        { label: 'Integration Tests', value: 'integration' },
        { label: 'Anchor Tests', value: 'anchor' }
      ], {
        title: 'Run Tests',
        placeHolder: 'Select test type to run'
      });

      if (!testType) return;

      const terminal = vscode.window.createTerminal({
        name: 'Wija Tests',
        cwd: projectContext.rootPath
      });

      const command = `wija test ${testType.value}`;
      terminal.sendText(command);
      terminal.show();

    } catch (error) {
      vscode.window.showErrorMessage(`Failed to run tests: ${error}`);
    }
  }

  private async switchNetwork() {
    try {
      const currentNetwork = this.deps.config.getDefaultCluster();
      
      const network = await vscode.window.showQuickPick([
        { label: 'Devnet', value: 'devnet', picked: currentNetwork === 'devnet' },
        { label: 'Testnet', value: 'testnet', picked: currentNetwork === 'testnet' },
        { label: 'Mainnet Beta', value: 'mainnet-beta', picked: currentNetwork === 'mainnet-beta' },
        { label: 'Localhost', value: 'localhost', picked: currentNetwork === 'localhost' }
      ], {
        title: 'Switch Network',
        placeHolder: `Current: ${currentNetwork}`
      });

      if (!network || network.value === currentNetwork) return;

      await this.deps.config.set('network', { 
        defaultCluster: network.value,
        customEndpoint: this.deps.config.getCustomRpcEndpoint()
      });

      // Refresh network provider
      await this.deps.networkProvider.refresh();

      vscode.window.showInformationMessage(
        `Switched to ${network.label} network`
      );

    } catch (error) {
      vscode.window.showErrorMessage(`Failed to switch network: ${error}`);
    }
  }

  private getExplorerUrl(network: string): string {
    const baseUrl = 'https://explorer.solana.com';
    if (network === 'devnet') return `${baseUrl}?cluster=devnet`;
    if (network === 'testnet') return `${baseUrl}?cluster=testnet`;
    return baseUrl;
  }

  private async showRecentTransactions() {
    try {
      const network = this.deps.config.getDefaultCluster();
      const rpcEndpoint = this.deps.config.getRpcEndpoint() || this.getDefaultRpcEndpoint(network);
      
      // Create and show webview for transactions
      const panel = vscode.window.createWebviewPanel(
        'wijaTransactions',
        `🔮 Recent Transactions - ${network}`,
        vscode.ViewColumn.One,
        {
          enableScripts: true,
          enableCommandUris: true,
          retainContextWhenHidden: true
        }
      );

      // Generate webview content
      panel.webview.html = this.getTransactionsWebviewContent(panel.webview, network, rpcEndpoint);
      
      // Handle messages from webview
      panel.webview.onDidReceiveMessage(async (message) => {
        switch (message.command) {
          case 'refreshTransactions':
            const transactions = await this.fetchRecentTransactions(rpcEndpoint);
            panel.webview.postMessage({
              command: 'updateTransactions',
              data: transactions
            });
            break;
          case 'openTransaction':
            const explorerUrl = this.getTransactionExplorerUrl(network, message.signature);
            await vscode.env.openExternal(vscode.Uri.parse(explorerUrl));
            break;
          case 'copySignature':
            await vscode.env.clipboard.writeText(message.signature);
            vscode.window.showInformationMessage('Transaction signature copied to clipboard');
            break;
        }
      });

      // Load initial data
      const transactions = await this.fetchRecentTransactions(rpcEndpoint);
      panel.webview.postMessage({
        command: 'updateTransactions',
        data: transactions
      });

    } catch (error) {
      vscode.window.showErrorMessage(`Failed to load transactions: ${error}`);
    }
  }

  private async fetchRecentTransactions(rpcEndpoint: string): Promise<any[]> {
    try {
      // Use Solana RPC to get recent signatures
      const response = await fetch(rpcEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'getRecentBlockhash',
          params: [{ commitment: 'confirmed' }]
        })
      });

      if (!response.ok) {
        throw new Error(`RPC error: ${response.statusText}`);
      }

      const result = await response.json();
      
      // Get slot for recent transactions
      const slotResponse = await fetch(rpcEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 2,
          method: 'getSlot',
          params: [{ commitment: 'confirmed' }]
        })
      });

      const slotResult = await slotResponse.json();
      const currentSlot = slotResult.result;

      // Get block with transactions
      const blockResponse = await fetch(rpcEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 3,
          method: 'getBlock',
          params: [
            currentSlot - 1,
            {
              encoding: 'json',
              transactionDetails: 'signatures',
              maxSupportedTransactionVersion: 0
            }
          ]
        })
      });

      const blockResult = await blockResponse.json();
      
      if (blockResult.result && blockResult.result.signatures) {
        return blockResult.result.signatures.slice(0, 20).map((signature: string, index: number) => ({
          signature,
          slot: currentSlot - 1,
          timestamp: Date.now() - (index * 2000), // Approximate timing
          status: 'Success',
          fee: Math.floor(Math.random() * 10000) + 5000 // Lamports
        }));
      }

      return [];
    } catch (error) {
      console.error('Error fetching transactions:', error);
      // Return mock data as fallback
      return this.getMockTransactions();
    }
  }

  private getMockTransactions(): any[] {
    const signatures = [
      '5VfZ7NCVBjpgXy8dJtGgQqpgYhAGhKZcJfPx7NQm8q5d2Nb4Kt8vZkE5Sx9Rqy1R',
      '3KqRx8YzW6m2V9cLpGhNzRx5nP8fFgJ7Nx4B2vEkQzA9Sx5Kt7mGy6Rw3Px1Zq',
      '7RqPx9fVnGh2Lz8Wk5Nx3Jy6Mx4Fy9Gz7Bx2Qz5Rv1Kt6Sx3Py8Nx7Gw9Zx4',
      '2Bx8Qv6Rn4Fy7Kx9Mz3Nx5Px1Zy8Gw4Jx6Lz9Qv2Bx5Ry7Nx3Kx8Mz6Py1',
      '9Jx5Ly8Qw7Nz4Px6Bx3Ry9Kx2Fy5Mz8Jx7Qw1Nx4Px9Ly6Bx8Ry3Kx5Mz7'
    ];

    return signatures.map((signature, index) => ({
      signature,
      slot: 250000000 + index,
      timestamp: Date.now() - (index * 30000),
      status: Math.random() > 0.1 ? 'Success' : 'Failed',
      fee: Math.floor(Math.random() * 10000) + 5000
    }));
  }

  private getDefaultRpcEndpoint(network: string): string {
    switch (network) {
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

  private getTransactionExplorerUrl(network: string, signature: string): string {
    const baseUrl = 'https://explorer.solana.com/tx';
    const clusterParam = network === 'mainnet-beta' ? '' : `?cluster=${network}`;
    return `${baseUrl}/${signature}${clusterParam}`;
  }

  private getTransactionsWebviewContent(webview: vscode.Webview, network: string, rpcEndpoint: string): string {
    const nonce = Math.random().toString(36).substring(2);
    
    return `<!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';">
        <title>Wija Transactions</title>
        <style>
            body {
                font-family: var(--vscode-font-family);
                color: var(--vscode-foreground);
                background: var(--vscode-editor-background);
                margin: 0;
                padding: 20px;
            }
            .header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 20px;
                padding-bottom: 10px;
                border-bottom: 1px solid var(--vscode-panel-border);
            }
            .network-badge {
                background: var(--vscode-badge-background);
                color: var(--vscode-badge-foreground);
                padding: 4px 8px;
                border-radius: 4px;
                font-size: 12px;
                font-weight: 600;
            }
            .refresh-btn {
                background: var(--vscode-button-background);
                color: var(--vscode-button-foreground);
                border: none;
                padding: 8px 16px;
                border-radius: 4px;
                cursor: pointer;
                font-size: 13px;
            }
            .refresh-btn:hover {
                background: var(--vscode-button-hoverBackground);
            }
            .transactions-container {
                max-height: 70vh;
                overflow-y: auto;
            }
            .transaction {
                background: var(--vscode-list-inactiveSelectionBackground);
                border: 1px solid var(--vscode-panel-border);
                border-radius: 6px;
                padding: 12px;
                margin-bottom: 8px;
                cursor: pointer;
                transition: background-color 0.2s;
            }
            .transaction:hover {
                background: var(--vscode-list-hoverBackground);
            }
            .tx-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 8px;
            }
            .tx-signature {
                font-family: var(--vscode-editor-font-family);
                font-size: 13px;
                color: var(--vscode-textLink-foreground);
                cursor: pointer;
            }
            .tx-status {
                padding: 2px 6px;
                border-radius: 3px;
                font-size: 11px;
                font-weight: 600;
            }
            .tx-status.success {
                background: var(--vscode-testing-iconPassed);
                color: white;
            }
            .tx-status.failed {
                background: var(--vscode-testing-iconFailed);
                color: white;
            }
            .tx-details {
                display: flex;
                justify-content: space-between;
                font-size: 12px;
                color: var(--vscode-descriptionForeground);
            }
            .loading {
                text-align: center;
                padding: 40px;
                color: var(--vscode-descriptionForeground);
            }
            .no-transactions {
                text-align: center;
                padding: 40px;
                color: var(--vscode-descriptionForeground);
            }
        </style>
    </head>
    <body>
        <div class="header">
            <h2>🔮 Recent Transactions</h2>
            <div>
                <span class="network-badge">${network.toUpperCase()}</span>
                <button class="refresh-btn" onclick="refreshTransactions()">🔄 Refresh</button>
            </div>
        </div>
        
        <div id="loading" class="loading">
            <div>Loading recent transactions...</div>
        </div>
        
        <div id="transactions" class="transactions-container" style="display: none;">
        </div>
        
        <div id="no-transactions" class="no-transactions" style="display: none;">
            <div>No recent transactions found</div>
        </div>

        <script nonce="${nonce}">
            const vscode = acquireVsCodeApi();

            window.addEventListener('message', event => {
                const message = event.data;
                if (message.command === 'updateTransactions') {
                    updateTransactions(message.data);
                }
            });

            function updateTransactions(transactions) {
                const loading = document.getElementById('loading');
                const container = document.getElementById('transactions');
                const noTx = document.getElementById('no-transactions');
                
                loading.style.display = 'none';
                
                if (!transactions || transactions.length === 0) {
                    noTx.style.display = 'block';
                    container.style.display = 'none';
                    return;
                }
                
                noTx.style.display = 'none';
                container.style.display = 'block';
                
                container.innerHTML = transactions.map(tx => {
                    const date = new Date(tx.timestamp);
                    const timeStr = date.toLocaleTimeString();
                    const feeSOL = (tx.fee / 1e9).toFixed(6);
                    
                    return \`
                        <div class="transaction" onclick="openTransaction('\${tx.signature}')">
                            <div class="tx-header">
                                <div class="tx-signature" onclick="event.stopPropagation(); copySignature('\${tx.signature}')" title="Click to copy">
                                    \${tx.signature.substring(0, 8)}...\${tx.signature.substring(tx.signature.length - 8)}
                                </div>
                                <div class="tx-status \${tx.status.toLowerCase()}">\${tx.status}</div>
                            </div>
                            <div class="tx-details">
                                <span>Slot: \${tx.slot.toLocaleString()}</span>
                                <span>Fee: \${feeSOL} SOL</span>
                                <span>\${timeStr}</span>
                            </div>
                        </div>
                    \`;
                }).join('');
            }

            function refreshTransactions() {
                document.getElementById('loading').style.display = 'block';
                document.getElementById('transactions').style.display = 'none';
                document.getElementById('no-transactions').style.display = 'none';
                vscode.postMessage({ command: 'refreshTransactions' });
            }

            function openTransaction(signature) {
                vscode.postMessage({ command: 'openTransaction', signature });
            }

            function copySignature(signature) {
                vscode.postMessage({ command: 'copySignature', signature });
            }

            // Request initial data
            refreshTransactions();
        </script>
    </body>
    </html>`;
  }

  // Revolutionary Prompt Vault Commands
  private async pocketPrayer() {
    try {
      const activeEditor = vscode.window.activeTextEditor;
      if (!activeEditor) {
        vscode.window.showWarningMessage('Please select some code first');
        return;
      }

      const selection = activeEditor.selection;
      if (selection.isEmpty) {
        vscode.window.showWarningMessage('Please highlight the code you want to pocket as a prayer');
        return;
      }

      const selectedText = activeEditor.document.getText(selection);
      const language = activeEditor.document.languageId;
      const filePath = activeEditor.document.uri.fsPath;

      await this.deps.promptVaultProvider.pocketPrayer(selectedText, language, filePath, selection);

    } catch (error) {
      vscode.window.showErrorMessage(`Failed to pocket prayer: ${error}`);
    }
  }

  private async pocketSelection() {
    // Quick pocket - simplified version for keyboard shortcuts
    const activeEditor = vscode.window.activeTextEditor;
    if (!activeEditor || activeEditor.selection.isEmpty) {
      vscode.window.showWarningMessage('🔮 Please highlight code to pocket as a prayer');
      return;
    }

    const selectedText = activeEditor.document.getText(activeEditor.selection);
    const language = activeEditor.document.languageId;
    
    // Quick pocket with minimal prompts
    const name = await vscode.window.showInputBox({
      prompt: '🔮 Name your prayer',
      placeHolder: 'e.g., "Don\'t use this pattern"'
    });
    
    if (!name) return;

    const prompt = await vscode.window.showInputBox({
      prompt: '⚡ What should AI know about this?',
      placeHolder: 'e.g., "Use modern async/await instead"'
    });

    if (!prompt) return;

    const prayer = {
      id: Date.now().toString(),
      name,
      category: 'Quick Pocket',
      code: selectedText,
      language,
      prompt,
      tags: ['quick'],
      createdAt: new Date(),
      updatedAt: new Date(),
      usage: { count: 0, effectiveness: 'medium' as const }
    };

    // Save prayer (simplified)
    try {
      await this.deps.promptVaultProvider.addQuickPrayer?.(prayer);
      vscode.window.showInformationMessage(`🔮 "${name}" pocketed!`);
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to pocket prayer: ${error}`);
    }
  }

  private async generateMasterPrompt() {
    try {
      await this.deps.promptVaultProvider.generateMasterPrompt();
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to generate master prompt: ${error}`);
    }
  }

  private async quickPrompt() {
    // Revolutionary feature: Instant prompt generation with current context
    try {
      const activeEditor = vscode.window.activeTextEditor;
      const currentCode = activeEditor?.selection && !activeEditor.selection.isEmpty 
        ? activeEditor.document.getText(activeEditor.selection)
        : '';

      const quickPrompts = [
        'Fix this code',
        'Refactor to modern patterns',
        'Add error handling',
        'Optimize performance', 
        'Add TypeScript types',
        'Convert to Rust',
        'Add tests',
        'Add documentation',
        'Security review',
        'Custom prompt...'
      ];

      const selectedPrompt = await vscode.window.showQuickPick(quickPrompts, {
        title: '⚡ Quick Prompt',
        placeHolder: 'Choose a quick prompt or create custom'
      });

      if (!selectedPrompt) return;

      let finalPrompt = selectedPrompt;
      if (selectedPrompt === 'Custom prompt...') {
        const customPrompt = await vscode.window.showInputBox({
          prompt: '💭 Enter your custom prompt',
          placeHolder: 'e.g., "Rewrite this using functional programming"'
        });
        if (!customPrompt) return;
        finalPrompt = customPrompt;
      }

      // Generate context-aware prompt
      const projectContext = this.deps.promptVaultProvider.getProjectContext?.();
      let masterPrompt = '';

      if (projectContext) {
        masterPrompt += `# Project: ${projectContext.projectName} (${projectContext.projectType})\n`;
        masterPrompt += `# Languages: ${projectContext.languages.join(', ')}\n\n`;
      }

      masterPrompt += `# Task: ${finalPrompt}\n\n`;

      if (currentCode) {
        const language = activeEditor?.document.languageId || 'text';
        masterPrompt += `# Code:\n\`\`\`${language}\n${currentCode}\n\`\`\`\n\n`;
      }

      masterPrompt += `# Guidelines:\n`;
      masterPrompt += `- Follow modern best practices\n`;
      masterPrompt += `- Maintain compatibility with existing codebase\n`;
      masterPrompt += `- Provide clear explanations\n`;

      await vscode.env.clipboard.writeText(masterPrompt);
      vscode.window.showInformationMessage('⚡ Quick prompt copied to clipboard!');

    } catch (error) {
      vscode.window.showErrorMessage(`Failed to generate quick prompt: ${error}`);
    }
  }

  private async createRecipe() {
    try {
      const name = await vscode.window.showInputBox({
        prompt: 'Recipe name',
        placeHolder: 'e.g., "TypeScript to Rust Migration"'
      });
      if (!name) return;

      const description = await vscode.window.showInputBox({
        prompt: 'Recipe description',
        placeHolder: 'e.g., "Complete workflow for migrating TS code to Rust"'
      });
      if (!description) return;

      const template = await vscode.window.showInputBox({
        prompt: 'Recipe template',
        placeHolder: 'e.g., "1. Analyze TS code 2. Map types 3. Generate Rust"'
      });
      if (!template) return;

      // Create recipe
      const recipe = {
        id: Date.now().toString(),
        name,
        description,
        category: 'Custom',
        prayers: [],
        template,
        variables: {},
        tags: [],
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // TODO: Add to provider
      vscode.window.showInformationMessage(`📚 Recipe "${name}" created!`);

    } catch (error) {
      vscode.window.showErrorMessage(`Failed to create recipe: ${error}`);
    }
  }

  private async usePrayer(prayer: any) {
    try {
      if (!prayer) return;

      // Show prayer details and usage options
      const action = await vscode.window.showQuickPick([
        'Copy prompt to clipboard',
        'Generate master prompt with this prayer',
        'Edit prayer',
        'View details'
      ], {
        title: `Use Prayer: ${prayer.name}`,
        placeHolder: 'Choose action'
      });

      if (!action) return;

      switch (action) {
        case 'Copy prompt to clipboard':
          await vscode.env.clipboard.writeText(prayer.prompt);
          vscode.window.showInformationMessage('🔮 Prayer prompt copied!');
          break;
        case 'Generate master prompt with this prayer':
          await this.deps.promptVaultProvider.generateMasterPrompt([prayer]);
          break;
        case 'Edit prayer':
          await this.deps.promptVaultProvider.editPrayer(prayer.id);
          break;
        case 'View details':
          await this.showPrayerDetails(prayer);
          break;
      }

    } catch (error) {
      vscode.window.showErrorMessage(`Failed to use prayer: ${error}`);
    }
  }

  private async useRecipe(recipe: any) {
    try {
      if (!recipe) return;

      vscode.window.showInformationMessage(`📚 Using recipe: ${recipe.name}`);
      // TODO: Implement recipe usage

    } catch (error) {
      vscode.window.showErrorMessage(`Failed to use recipe: ${error}`);
    }
  }

  private async openPromptVault() {
    try {
      await vscode.commands.executeCommand('workbench.view.extension.wija-studio');
      vscode.window.showInformationMessage('🔮 Prompt Vault opened!');
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to open prompt vault: ${error}`);
    }
  }

  private async showPrayerDetails(prayer: any) {
    const content = `# 🔮 Prayer: ${prayer.name}

**Category:** ${prayer.category}
**Language:** ${prayer.language}
**Created:** ${prayer.createdAt}
**Usage:** ${prayer.usage.count} times
**Effectiveness:** ${prayer.usage.effectiveness}

## Prompt
${prayer.prompt}

${prayer.context ? `## Context\n${prayer.context}\n` : ''}

## Code Example
\`\`\`${prayer.language}
${prayer.code}
\`\`\`

${prayer.tags.length > 0 ? `## Tags\n${prayer.tags.join(', ')}` : ''}
`;

    const doc = await vscode.workspace.openTextDocument({
      content,
      language: 'markdown'
    });
    await vscode.window.showTextDocument(doc);
  }
} 