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
    // Implementation for showing recent transactions in a webview
    vscode.window.showInformationMessage('Recent transactions view coming soon!');
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