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
      { command: 'wija.switchNetwork', handler: this.switchNetwork.bind(this) }
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
    // Implementation for showing recent transactions in a webview
    vscode.window.showInformationMessage('Recent transactions view coming soon!');
  }
} 