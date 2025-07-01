import * as vscode from 'vscode';
import { WijaProjectDetector } from './utils/project-detector';
import { WijaLanguageServer } from './language-server/client';
import { WijaDashboardProvider } from './providers/dashboard-provider';
import { WijaMarketplaceProvider } from './providers/marketplace-provider';
import { WijaAgentProvider } from './providers/agent-provider';
import { WijaChannelProvider } from './providers/channel-provider';
import { WijaNetworkProvider } from './providers/network-provider';
import { WijaWalletProvider } from './providers/wallet-provider';
import { WijaCommandManager } from './commands/command-manager';
import { WijaStatusBar } from './ui/status-bar';
import { WijaConfig } from './config/wija-config';
import { WijaDebugAdapter } from './debug/debug-adapter';
import { WijaTaskProvider } from './tasks/task-provider';

export interface WijaExtensionContext {
    extensionContext: vscode.ExtensionContext;
    projectDetector: WijaProjectDetector;
    languageServer: WijaLanguageServer;
    dashboardProvider: WijaDashboardProvider;
    marketplaceProvider: WijaMarketplaceProvider;
    agentProvider: WijaAgentProvider;
    channelProvider: WijaChannelProvider;
    networkProvider: WijaNetworkProvider;
    walletProvider: WijaWalletProvider;
    commandManager: WijaCommandManager;
    statusBar: WijaStatusBar;
    config: WijaConfig;
}

let wijaContext: WijaExtensionContext | undefined;

export async function activate(context: vscode.ExtensionContext): Promise<WijaExtensionContext> {
    console.log('🔮 Wija Studio extension is activating...');

    try {
        // Initialize configuration
        const config = new WijaConfig();
        
        // Initialize project detection
        const projectDetector = new WijaProjectDetector(context);
        await projectDetector.detectProject();

        // Initialize language server
        const languageServer = new WijaLanguageServer(context, config);
        await languageServer.start();

        // Initialize providers
        const dashboardProvider = new WijaDashboardProvider(context, config);
        const marketplaceProvider = new WijaMarketplaceProvider(context, config);
        const agentProvider = new WijaAgentProvider(context, projectDetector);
        const channelProvider = new WijaChannelProvider(context, projectDetector);
        const networkProvider = new WijaNetworkProvider(context, config);
        const walletProvider = new WijaWalletProvider(context, config);

        // Initialize status bar
        const statusBar = new WijaStatusBar(context, projectDetector, networkProvider, walletProvider);

        // Initialize command manager
        const commandManager = new WijaCommandManager(context, {
            projectDetector,
            dashboardProvider,
            marketplaceProvider,
            agentProvider,
            channelProvider,
            networkProvider,
            walletProvider,
            config
        });

        // Register view providers
        vscode.window.registerTreeDataProvider('wija.agents', agentProvider);
        vscode.window.registerTreeDataProvider('wija.channels', channelProvider);
        vscode.window.registerTreeDataProvider('wija.marketplace', marketplaceProvider);
        vscode.window.registerTreeDataProvider('wija.network', networkProvider);
        vscode.window.registerTreeDataProvider('wija.wallet', walletProvider);

        // Register webview providers
        vscode.window.registerWebviewViewProvider('wija.dashboard', dashboardProvider);
        vscode.window.registerWebviewViewProvider('wija.marketplace', marketplaceProvider);

        // Register debug adapter
        const debugAdapterFactory = new WijaDebugAdapter(context, config);
        context.subscriptions.push(
            vscode.debug.registerDebugAdapterDescriptorFactory('wija-anchor', debugAdapterFactory)
        );

        // Register task provider
        const taskProvider = new WijaTaskProvider(context, config);
        context.subscriptions.push(
            vscode.tasks.registerTaskProvider('wija', taskProvider)
        );

        // Set up context values based on project detection
        await updateContextValues(projectDetector);

        // Watch for workspace changes
        const workspaceWatcher = vscode.workspace.onDidChangeWorkspaceFolders(async () => {
            await projectDetector.detectProject();
            await updateContextValues(projectDetector);
        });
        context.subscriptions.push(workspaceWatcher);

        // Watch for file changes that might affect project detection
        const fileWatcher = vscode.workspace.createFileSystemWatcher('**/{Anchor.toml,Cargo.toml,package.json,.wija,.ghostspeak}');
        fileWatcher.onDidCreate(async () => {
            await projectDetector.detectProject();
            await updateContextValues(projectDetector);
        });
        fileWatcher.onDidDelete(async () => {
            await projectDetector.detectProject();
            await updateContextValues(projectDetector);
        });
        context.subscriptions.push(fileWatcher);

        // Create the extension context
        wijaContext = {
            extensionContext: context,
            projectDetector,
            languageServer,
            dashboardProvider,
            marketplaceProvider,
            agentProvider,
            channelProvider,
            networkProvider,
            walletProvider,
            commandManager,
            statusBar,
            config
        };

        // Initialize status bar
        statusBar.initialize();

        console.log('✨ Wija Studio extension activated successfully!');
        
        // Show welcome message for first-time users
        await showWelcomeMessage(context, projectDetector);

        return wijaContext;

    } catch (error) {
        console.error('❌ Failed to activate Wija Studio extension:', error);
        vscode.window.showErrorMessage(`Failed to activate Wija Studio: ${error}`);
        throw error;
    }
}

export function deactivate(): Thenable<void> | undefined {
    console.log('🔮 Wija Studio extension is deactivating...');
    
    if (wijaContext) {
        // Clean up language server
        return wijaContext.languageServer.stop();
    }
    
    return undefined;
}

async function updateContextValues(projectDetector: WijaProjectDetector): Promise<void> {
    const context = projectDetector.getProjectContext();
    
    // Set context values for conditional UI display
    await vscode.commands.executeCommand('setContext', 'wija.projectDetected', context !== null);
    await vscode.commands.executeCommand('setContext', 'wija.projectType', context?.type || 'none');
    await vscode.commands.executeCommand('setContext', 'wija.hasAnchor', context?.hasAnchor || false);
    await vscode.commands.executeCommand('setContext', 'wija.hasTypeScript', context?.hasTypeScript || false);
    await vscode.commands.executeCommand('setContext', 'wija.hasRust', context?.hasRust || false);
    await vscode.commands.executeCommand('setContext', 'wija.anchorIDL', context?.anchorIDL !== undefined);
    
    // Update status bar and providers
    if (wijaContext) {
        await wijaContext.agentProvider.refresh();
        await wijaContext.channelProvider.refresh();
        wijaContext.statusBar.updateProjectStatus(context);
    }
}

async function showWelcomeMessage(context: vscode.ExtensionContext, projectDetector: WijaProjectDetector): Promise<void> {
    const isFirstRun = context.globalState.get('wija.firstRun', true);
    
    if (isFirstRun) {
        const projectContext = projectDetector.getProjectContext();
        
        if (!projectContext) {
            const choice = await vscode.window.showInformationMessage(
                '🔮 Welcome to Wija Studio! Would you like to initialize a new Wija project or open the dashboard?',
                'Initialize Project',
                'Open Dashboard',
                'Learn More'
            );
            
            switch (choice) {
                case 'Initialize Project':
                    await vscode.commands.executeCommand('wija.initialize');
                    break;
                case 'Open Dashboard':
                    await vscode.commands.executeCommand('wija.openDashboard');
                    break;
                case 'Learn More':
                    await vscode.env.openExternal(vscode.Uri.parse('https://wija.io/docs'));
                    break;
            }
        } else {
            vscode.window.showInformationMessage(
                `🔮 Welcome to Wija Studio! Detected ${projectContext.type} project. Use the Wija panel to manage your agents.`,
                'Open Dashboard'
            ).then(choice => {
                if (choice === 'Open Dashboard') {
                    vscode.commands.executeCommand('wija.openDashboard');
                }
            });
        }
        
        await context.globalState.update('wija.firstRun', false);
    }
}

// Export the current extension context for use by other modules
export function getWijaContext(): WijaExtensionContext | undefined {
    return wijaContext;
} 