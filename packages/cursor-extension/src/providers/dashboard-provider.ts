import * as vscode from 'vscode';
import * as path from 'path';
import { WijaConfig } from '../config/wija-config';

export class WijaDashboardProvider implements vscode.WebviewViewProvider {
  private context: vscode.ExtensionContext;
  private config: WijaConfig;
  private _view?: vscode.WebviewView;

  constructor(context: vscode.ExtensionContext, config: WijaConfig) {
    this.context = context;
    this.config = config;
  }

  resolveWebviewView(webviewView: vscode.WebviewView): void {
    this._view = webviewView;
    
    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [
        this.context.extensionUri,
        vscode.Uri.joinPath(this.context.extensionUri, 'assets'),
        vscode.Uri.joinPath(this.context.extensionUri, 'media')
      ]
    };

    webviewView.webview.html = this.getHtmlContent(webviewView.webview);
    
    // Handle messages from the webview
    webviewView.webview.onDidReceiveMessage(async (message) => {
      await this.handleMessage(message);
    });

    // Update content when configuration changes
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration('wija')) {
        this.refresh();
      }
    });
  }

  async show(): Promise<void> {
    await vscode.commands.executeCommand('workbench.view.extension.wija-studio');
  }

  public refresh(): void {
    if (this._view) {
      this._view.webview.html = this.getHtmlContent(this._view.webview);
    }
  }

  private async handleMessage(message: any): Promise<void> {
    switch (message.command) {
      case 'initialize':
        await vscode.commands.executeCommand('wija.initialize');
        break;
      case 'openMarketplace':
        await vscode.commands.executeCommand('wija.openMarketplace');
        break;
      case 'connectWallet':
        await vscode.commands.executeCommand('wija.connectWallet');
        break;
      case 'switchNetwork':
        await vscode.commands.executeCommand('wija.switchNetwork');
        break;
      case 'deployAgent':
        await vscode.commands.executeCommand('wija.deployAgent');
        break;
      case 'createChannel':
        await vscode.commands.executeCommand('wija.createChannel');
        break;
      case 'getProjectInfo':
        await this.sendProjectInfo();
        break;
      case 'getNetworkStatus':
        await this.sendNetworkStatus();
        break;
      case 'getWalletInfo':
        await this.sendWalletInfo();
        break;
    }
  }

  private async sendProjectInfo(): Promise<void> {
    if (!this._view) return;

    const workspaceFolders = vscode.workspace.workspaceFolders;
    const projectInfo = {
      hasProject: !!workspaceFolders && workspaceFolders.length > 0,
      projectName: workspaceFolders?.[0]?.name || 'No Project',
      projectPath: workspaceFolders?.[0]?.uri.fsPath || '',
      hasAnchor: false,
      hasTypeScript: false,
      hasRust: false
    };

    // Check for project files
    if (workspaceFolders) {
      for (const folder of workspaceFolders) {
        try {
          const anchorToml = vscode.Uri.joinPath(folder.uri, 'Anchor.toml');
          const packageJson = vscode.Uri.joinPath(folder.uri, 'package.json');
          const cargoToml = vscode.Uri.joinPath(folder.uri, 'Cargo.toml');

          const [anchorExists, packageExists, cargoExists] = await Promise.all([
            vscode.workspace.fs.stat(anchorToml).then(() => true, () => false),
            vscode.workspace.fs.stat(packageJson).then(() => true, () => false),
            vscode.workspace.fs.stat(cargoToml).then(() => true, () => false)
          ]);

          projectInfo.hasAnchor = anchorExists;
          projectInfo.hasTypeScript = packageExists;
          projectInfo.hasRust = cargoExists;
        } catch (error) {
          console.error('Error checking project files:', error);
        }
      }
    }

    this._view.webview.postMessage({
      command: 'updateProjectInfo',
      data: projectInfo
    });
  }

  private async sendNetworkStatus(): Promise<void> {
    if (!this._view) return;

    const networkConfig = this.config.getDefaultCluster();
    const rpcEndpoint = this.config.getRpcEndpoint();
    
    // Simulate network status check (in real implementation, this would ping the RPC)
    const networkStatus = {
      cluster: networkConfig || 'devnet',
      rpcEndpoint: rpcEndpoint || 'https://api.devnet.solana.com',
      connected: true,
      blockHeight: Math.floor(Math.random() * 1000000) + 200000000,
      tps: Math.floor(Math.random() * 3000) + 1000
    };

    this._view.webview.postMessage({
      command: 'updateNetworkStatus',
      data: networkStatus
    });
  }

  private async sendWalletInfo(): Promise<void> {
    if (!this._view) return;

    const walletProvider = this.config.getPreferredWalletProvider();
    
    // Simulate wallet info (in real implementation, this would check actual wallet)
    const walletInfo = {
      provider: walletProvider || 'phantom',
      connected: false,
      address: null,
      balance: 0
    };

    this._view.webview.postMessage({
      command: 'updateWalletInfo',
      data: walletInfo
    });
  }

  private getHtmlContent(webview: vscode.Webview): string {
    const nonce = this.getNonce();
    
    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <meta http-equiv="Content-Security-Policy" content="default-src 'none'; 
              style-src ${webview.cspSource} 'unsafe-inline'; 
              script-src 'nonce-${nonce}'; 
              font-src ${webview.cspSource};">
        <title>Wija Dashboard</title>
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          
          body {
            font-family: var(--vscode-font-family);
            font-size: var(--vscode-font-size);
            color: var(--vscode-foreground);
            background: var(--vscode-editor-background);
            line-height: 1.4;
          }
          
          .container {
            padding: 16px;
            display: flex;
            flex-direction: column;
            gap: 16px;
          }
          
          .header {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 12px 16px;
            background: var(--vscode-badge-background);
            color: var(--vscode-badge-foreground);
            border-radius: 6px;
            margin-bottom: 8px;
          }
          
          .header h2 {
            font-size: 18px;
            font-weight: 600;
          }
          
          .card {
            background: var(--vscode-editor-background);
            border: 1px solid var(--vscode-panel-border);
            border-radius: 8px;
            padding: 16px;
            margin-bottom: 12px;
          }
          
          .card h3 {
            color: var(--vscode-textLink-foreground);
            margin-bottom: 12px;
            font-size: 14px;
            font-weight: 600;
            display: flex;
            align-items: center;
            gap: 6px;
          }
          
          .status-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 12px;
            margin-bottom: 16px;
          }
          
          .status-item {
            background: var(--vscode-input-background);
            border: 1px solid var(--vscode-input-border);
            border-radius: 6px;
            padding: 12px;
            text-align: center;
          }
          
          .status-value {
            font-size: 18px;
            font-weight: 600;
            color: var(--vscode-textLink-foreground);
            margin-bottom: 4px;
          }
          
          .status-label {
            font-size: 12px;
            color: var(--vscode-descriptionForeground);
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          
          .action-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: 8px;
          }
          
          .btn {
            background: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            padding: 10px 16px;
            border-radius: 6px;
            cursor: pointer;
            font-size: 13px;
            font-weight: 500;
            transition: background-color 0.2s;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 6px;
          }
          
          .btn:hover {
            background: var(--vscode-button-hoverBackground);
          }
          
          .btn:disabled {
            background: var(--vscode-button-secondaryBackground);
            color: var(--vscode-button-secondaryForeground);
            cursor: not-allowed;
          }
          
          .btn-secondary {
            background: var(--vscode-button-secondaryBackground);
            color: var(--vscode-button-secondaryForeground);
          }
          
          .btn-secondary:hover {
            background: var(--vscode-button-secondaryHoverBackground);
          }
          
          .info-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 8px 0;
            border-bottom: 1px solid var(--vscode-panel-border);
          }
          
          .info-row:last-child {
            border-bottom: none;
          }
          
          .info-label {
            font-weight: 500;
            color: var(--vscode-foreground);
          }
          
          .info-value {
            color: var(--vscode-descriptionForeground);
            font-family: var(--vscode-editor-font-family);
            font-size: 12px;
          }
          
          .success { color: var(--vscode-testing-iconPassed); }
          .warning { color: var(--vscode-editorWarning-foreground); }
          .error { color: var(--vscode-editorError-foreground); }
          
          .loading {
            display: inline-block;
            width: 12px;
            height: 12px;
            border: 2px solid var(--vscode-progressBar-background);
            border-radius: 50%;
            border-top-color: var(--vscode-progressBar-foreground);
            animation: spin 1s ease-in-out infinite;
          }
          
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
          
          .quick-actions {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
            margin-top: 8px;
          }
          
          .quick-action {
            background: var(--vscode-input-background);
            border: 1px solid var(--vscode-input-border);
            color: var(--vscode-input-foreground);
            padding: 6px 12px;
            border-radius: 4px;
            font-size: 12px;
            cursor: pointer;
            transition: all 0.2s;
          }
          
          .quick-action:hover {
            background: var(--vscode-list-hoverBackground);
            border-color: var(--vscode-textLink-foreground);
          }

          .welcome-section {
            text-align: center;
            padding: 24px;
            background: var(--vscode-welcomePage-background);
            border-radius: 8px;
            margin-bottom: 16px;
          }

          .welcome-section h3 {
            color: var(--vscode-textLink-foreground);
            margin-bottom: 8px;
          }

          .welcome-section p {
            color: var(--vscode-descriptionForeground);
            margin-bottom: 16px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <span>🔮</span>
            <h2>Wija Studio</h2>
            <div class="loading" id="loadingSpinner" style="display: none;"></div>
          </div>

          <div id="welcomeSection" class="welcome-section" style="display: none;">
            <h3>Welcome to Wija Studio!</h3>
            <p>Your mystical portal for AI agent development on Solana</p>
            <button class="btn" onclick="initializeProject()">
              ✨ Initialize New Project
            </button>
          </div>

          <div id="projectInfo" class="card">
            <h3>📁 Project Information</h3>
            <div id="projectDetails">
              <div class="loading"></div>
              <span style="margin-left: 8px;">Loading project information...</span>
            </div>
          </div>

          <div id="networkStatus" class="card">
            <h3>🌐 Network Status</h3>
            <div class="status-grid">
              <div class="status-item">
                <div class="status-value" id="networkCluster">--</div>
                <div class="status-label">Cluster</div>
              </div>
              <div class="status-item">
                <div class="status-value" id="blockHeight">--</div>
                <div class="status-label">Block Height</div>
              </div>
              <div class="status-item">
                <div class="status-value" id="networkTps">--</div>
                <div class="status-label">TPS</div>
              </div>
            </div>
            <div class="quick-actions">
              <div class="quick-action" onclick="switchNetwork()">Switch Network</div>
              <div class="quick-action" onclick="refreshNetwork()">Refresh</div>
            </div>
          </div>

          <div id="walletStatus" class="card">
            <h3>👛 Wallet Status</h3>
            <div id="walletDetails">
              <div class="info-row">
                <span class="info-label">Provider:</span>
                <span class="info-value" id="walletProvider">--</span>
              </div>
              <div class="info-row">
                <span class="info-label">Status:</span>
                <span class="info-value" id="walletStatus">Disconnected</span>
              </div>
              <div class="info-row">
                <span class="info-label">Balance:</span>
                <span class="info-value" id="walletBalance">-- SOL</span>
              </div>
            </div>
            <div style="margin-top: 12px;">
              <button class="btn btn-secondary" onclick="connectWallet()">
                🔗 Connect Wallet
              </button>
            </div>
          </div>

          <div class="card">
            <h3>⚡ Quick Actions</h3>
            <div class="action-grid">
              <button class="btn" onclick="deployAgent()" id="deployBtn" disabled>
                🚀 Deploy Agent
              </button>
              <button class="btn" onclick="createChannel()" id="channelBtn" disabled>
                📡 Create Channel
              </button>
              <button class="btn btn-secondary" onclick="openMarketplace()">
                🏪 Marketplace
              </button>
              <button class="btn btn-secondary" onclick="viewTransactions()">
                📋 Transactions
              </button>
            </div>
          </div>
        </div>

        <script nonce="${nonce}">
          const vscode = acquireVsCodeApi();
          
          let projectInfo = null;
          let networkStatus = null;
          let walletInfo = null;

          // Initialize dashboard
          window.addEventListener('load', () => {
            requestProjectInfo();
            requestNetworkStatus();
            requestWalletInfo();
          });

          // Message handling
          window.addEventListener('message', event => {
            const message = event.data;
            
            switch (message.command) {
              case 'updateProjectInfo':
                updateProjectInfo(message.data);
                break;
              case 'updateNetworkStatus':
                updateNetworkStatus(message.data);
                break;
              case 'updateWalletInfo':
                updateWalletInfo(message.data);
                break;
            }
          });

          function requestProjectInfo() {
            vscode.postMessage({ command: 'getProjectInfo' });
          }

          function requestNetworkStatus() {
            vscode.postMessage({ command: 'getNetworkStatus' });
          }

          function requestWalletInfo() {
            vscode.postMessage({ command: 'getWalletInfo' });
          }

          function updateProjectInfo(data) {
            projectInfo = data;
            const projectDetails = document.getElementById('projectDetails');
            const welcomeSection = document.getElementById('welcomeSection');
            
            if (!data.hasProject) {
              welcomeSection.style.display = 'block';
              projectDetails.innerHTML = '<div class="info-value warning">No project detected</div>';
              return;
            }

            welcomeSection.style.display = 'none';
            
            projectDetails.innerHTML = \`
              <div class="info-row">
                <span class="info-label">Name:</span>
                <span class="info-value">\${data.projectName}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Anchor:</span>
                <span class="info-value \${data.hasAnchor ? 'success' : 'warning'}">
                  \${data.hasAnchor ? '✅ Available' : '⚠️ Not found'}
                </span>
              </div>
              <div class="info-row">
                <span class="info-label">TypeScript:</span>
                <span class="info-value \${data.hasTypeScript ? 'success' : 'warning'}">
                  \${data.hasTypeScript ? '✅ Available' : '⚠️ Not found'}
                </span>
              </div>
              <div class="info-row">
                <span class="info-label">Rust:</span>
                <span class="info-value \${data.hasRust ? 'success' : 'warning'}">
                  \${data.hasRust ? '✅ Available' : '⚠️ Not found'}
                </span>
              </div>
            \`;
            
            updateActionButtons();
          }

          function updateNetworkStatus(data) {
            networkStatus = data;
            document.getElementById('networkCluster').textContent = data.cluster.toUpperCase();
            document.getElementById('blockHeight').textContent = data.blockHeight.toLocaleString();
            document.getElementById('networkTps').textContent = data.tps.toLocaleString();
          }

          function updateWalletInfo(data) {
            walletInfo = data;
            document.getElementById('walletProvider').textContent = data.provider || 'None';
            document.getElementById('walletStatus').textContent = data.connected ? 'Connected' : 'Disconnected';
            document.getElementById('walletStatus').className = \`info-value \${data.connected ? 'success' : 'warning'}\`;
            document.getElementById('walletBalance').textContent = data.connected ? \`\${data.balance} SOL\` : '-- SOL';
            
            updateActionButtons();
          }

          function updateActionButtons() {
            const deployBtn = document.getElementById('deployBtn');
            const channelBtn = document.getElementById('channelBtn');
            
            const hasProject = projectInfo && projectInfo.hasProject;
            const isConnected = walletInfo && walletInfo.connected;
            
            deployBtn.disabled = !hasProject || !isConnected;
            channelBtn.disabled = !hasProject || !isConnected;
          }

          // Action functions
          function initializeProject() {
            vscode.postMessage({ command: 'initialize' });
          }

          function deployAgent() {
            vscode.postMessage({ command: 'deployAgent' });
          }

          function createChannel() {
            vscode.postMessage({ command: 'createChannel' });
          }

          function openMarketplace() {
            vscode.postMessage({ command: 'openMarketplace' });
          }

          function connectWallet() {
            vscode.postMessage({ command: 'connectWallet' });
          }

          function switchNetwork() {
            vscode.postMessage({ command: 'switchNetwork' });
          }

          function viewTransactions() {
            vscode.postMessage({ command: 'viewTransactions' });
          }

          function refreshNetwork() {
            requestNetworkStatus();
          }
        </script>
      </body>
      </html>
    `;
  }

  private getNonce(): string {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < 32; i++) {
      text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
  }
} 